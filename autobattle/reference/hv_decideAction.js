// decideAction(S): 盾战统一自动战斗决策, 每回合返回1个动作并交给执行层 gE(selector).click()
// S = 当前状态快照: { hp, mp, sp, overcharge, last_round_damage, riddle_active, channeling:{active},
//   buff:{ spark_of_life:{active,turns}, spirit_shield, protection, absorb, haste, regen, heartseeker },
//   spirit_stance:{active}, enemy_damage_type, alive_enemy_count, enemies[], target,
//   mana_gem:{ready}, cannon:{skill_available}, is_first_round, just_dispelled }
// 常量(由玩家实测换算): HPMAX=24232, MPMAX=2002, SPMAX=1470, OCMAX=250
const HPMAX=24232, MPMAX=2002, SPMAX=1470, OCMAX=250;

// 执行层适配: 把决策映射到 dodying 脚本的 DOM 点击
function cast(skillId){ return { kind:'spell', exec:()=>gE(`#skill_${skillId}`).click() }; }       // 法术
function item(slot){    return { kind:'item',  exec:()=>gE(`#quickbar_${slot}`).click() }; }          // quickbar物品
function manaGem(){      return { kind:'item',  exec:()=>gE('#mana_gem').click() }; }
function attack(eid){   return { kind:'melee', exec:()=>gE(`#mkey_${eid}`).click() }; }                // 平砍指定怪
function stance(on){    return { kind:'stance',exec:()=>gE('#ckey_spirit').click() }; }                 // 灵动架式切换
function answerRiddle(opt){ return { kind:'riddle', exec:()=>gE(opt).click() }; }
function defend(){      return { kind:'defend',exec:()=>gE('#ckey_defend').click() }; }

function decideAction(S){
  const hp=S.hp, mp=S.mp, sp=S.sp, oc=S.overcharge;
  const ch=S.channeling.active;
  const predictedHp = hp - S.last_round_damage*1.2;      // 承伤预测
  const heavyHit = S.last_round_damage > 0.30*HPMAX;     // 重击波识别

  // ---- P0 小马图: 凌驾一切 ----
  if(S.riddle_active){
    const r = resolveRiddle(S);                          // 高置信度才答; 不确定返回null=跳过本回合
    if(r && r.confident){
      if(r.timeLeftPct>0.50) return { wait:true };       // 时间过半再答拿治疗奖励
      return answerRiddle(r.option);
    }
    return { skip:true };                                // 不确定不瞎猜(选错扣×10精力)
  }

  // ---- P1 Spark of Life 零空窗(防一击致死, 压倒一切) ----
  if(!S.buff.spark_of_life.active || S.buff.spark_of_life.turns<=1){
    if(mp < spellCost(422, ch)){                         // MP不够放Spark → 先回蓝
      if(S.mana_gem.ready) return manaGem();
      return item(8);                                    // Mana Elixir 终极保命
    }
    return cast(422);                                    // SparkOfLife
  }

  // ---- P2 承伤预测式HP急救 ----
  if(hp < 0.25*HPMAX || predictedHp < 0.25*HPMAX){
    if(mp >= 0.35*MPMAX || ch) return cast(313);         // FullCure(Better Cure满级)
    return item(7);                                      // Health Elixir 瞬回(库存仅63)
  }

  // ---- P3 MP死亡螺旋熔断(保命buff将因低MP断档) ----
  if(mp < 0.15*MPMAX &&
     (S.buff.spark_of_life.turns<=2 || S.buff.spirit_shield.turns<=2) && !ch){
    if(S.mana_gem.ready) return manaGem();
    return item(8);                                      // Mana Elixir
  }

  // ---- P4 物理减伤双墙(到期预补, 卡Channeling) ----
  const ssDown = !S.buff.spirit_shield.active || S.buff.spirit_shield.turns<=1;
  const prDown = !S.buff.protection.active   || S.buff.protection.turns<=1;
  // P6 卷轴应急: 2墙以上同缺 / 起手 / 被dispel
  if((!S.buff.spirit_shield.active && !S.buff.protection.active) || S.is_first_round || S.just_dispelled){
    return item('S1');                                   // Scroll of Protection 一动作铺多墙
  }
  if(prDown){                                            // 两墙都缺先补Protection(Better Protection满级)
    if(mp < 0.35*MPMAX) return item('S1');               // MP紧张走卷轴兜底不丢墙
    return cast(411);
  }
  if(ssDown) return cast(423);                           // SpiritShield

  // ---- P5 Absorb(仅魔法怪条件触发) ----
  const isMagic = S.enemy_damage_type && S.enemy_damage_type.includes('magic');
  if(isMagic && (!S.buff.absorb.active || S.buff.absorb.turns<=1)) return cast(421);

  // ---- P7 Haste(攻速=源头减伤, 重击波时本应已上调) ----
  if(!S.buff.haste.active || S.buff.haste.turns<=1) return cast(412);

  // ---- 重击波兜底: 当前血安全但怪进入爆发, 把闲回合转维稳 ----
  if(heavyHit){
    if(S.buff.haste.turns<=2)  return cast(412);
    if(hp < 0.60*HPMAX)        return item(1);           // Health Draught 垫血
    // 无墙可补且预测仍危 → Defend 硬抗一回合
    if(predictedHp < 0.35*HPMAX) return defend();
  }

  // ---- P8 Regen(低耗持续回血) ----
  if(!S.buff.regen.active || S.buff.regen.turns<=1) return cast(312);

  // ---- P9 回MP: Gem优先 > Draught ----
  if(mp < 0.35*MPMAX){
    if(S.mana_gem.ready) return manaGem();
    return item(3);                                      // Mana Draught(库存3634)
  }

  // ---- P10 常规HP维持(60%档, 长效药主力) ----
  if(hp < 0.60*HPMAX){
    if(!justDrankDraught('hp')) return item(1);          // Health Draught(库存5675)
    return item(2);                                      // Draught节流中走Potion补位
  }

  // ---- P11 SP喂鬥气(防灵动架式断档) ----
  const spThresh = buffSpamLastTwoTurns(S) ? 0.40 : 0.30;
  if(sp < spThresh*SPMAX && S.spirit_stance.active) return item(5);  // Spirit Draught

  // ---- P12 灵动架式开关(滞回 40%开/15%关) ----
  if(oc >= 0.40*OCMAX && !S.spirit_stance.active) return stance(true);
  if(oc <  0.15*OCMAX &&  S.spirit_stance.active) return stance(false);

  // ---- 增伤投资回报预判: 估目标剩余回合 ----
  const tgt = S.target;
  const remTurns = tgt ? Math.ceil(tgt.hp / expectedDmgPerTurn(S)) : 0;

  // ---- P13 Imperil(仅红怪, >=4回合, 卡Channeling) ----
  if(tgt && tgt.is_red_boss && !tgt.debuff.imperil && remTurns>=4 && (ch || mp>=0.35*MPMAX))
    return cast(213);

  // ---- P14 Heartseeker(持久战提暴, 卡Channeling) ----
  const battleTurns = estimateBattleTurns(S);
  if((!S.buff.heartseeker.active || S.buff.heartseeker.turns<=1) &&
     battleTurns>=4 && (ch || mp>=0.40*MPMAX))
    return cast(431);

  // ---- P15 小马炮AOE清场(多怪, 技能可用) ----
  if(S.alive_enemy_count>=4 && S.cannon.skill_available)
    return cast('OrbitalFriendshipCannon');             // 不可用则落到P16降级平砍

  // ---- P16 破甲滚雪球平砍(默认输出引擎) ----
  // ① 优先清最弱普通杂兵(减进攻面 + 同动作攒鬥气/counter)
  const trash = S.enemies.filter(e=>!e.is_red_boss && e.alive);
  if(trash.length){
    // 例外分散: 某杂兵下回合放高威胁技能/即将自爆 → 先点它
    const threat = trash.find(e=>e.casting_high_threat || e.about_to_explode);
    const t = threat || trash.sort((a,b)=>a.hp-b.hp)[0];  // 否则点最低血一刀秒
    return attack(t.eid);
  }
  // ② 仅剩红怪: 锁定记忆目标持续平砍叠破甲, 满3层前不换目标
  let lock = S.lockedRedId && getEnemy(S, S.lockedRedId);
  if(!lock || !lock.alive){                               // 旧目标死/无 → 重选血量·威胁最高红怪
    lock = S.enemies.filter(e=>e.is_red_boss && e.alive)
                    .sort((a,b)=>b.threat-a.threat || b.hp-a.hp)[0];
    if(lock){ S.lockedRedId = lock.eid; S.penArmor = 0; } // 重建破甲计数器
  }
  if(lock) return attack(lock.eid);                       // 濒死(<15%)同样纯平砍收尾, 不投资增伤

  return defend();                                        // 极端兜底: 无可打目标
}