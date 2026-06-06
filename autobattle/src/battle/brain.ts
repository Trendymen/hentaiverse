// 决策大脑: 16 级联 + 4 致命加固. 翻写自 reference/hv_brain_modern.user.js:128-187
import { config } from '../core/config';
import type { Config } from '../core/config';
import { SK, SK_SPECIAL, IT, DEBUFFS, CHANNEL_Q } from './tables';
import { Exec } from './executor';
import { rankTargets } from './target-weight';
import { BleedTimer } from './bleed-timing';
import type { Action, ActionType, BattleState, EnemyState, WeightConfig, BleedTimerConfig } from '../types';
import { assessPressure, hasFutureRound, selectControlDebuff, selectRedTarget, shouldSaveOcForCannon } from './strategy';

/** 从 config 装配 target-weight 所需的 WeightConfig(模块只认参数, 不碰单例) */
function weightCfg(C: Config): WeightConfig {
  return {
    baseHpRatio: C.baseHpRatio,
    yggdrasilExtraWeight: C.yggdrasilExtraWeight,
    unreachableWeight: C.unreachableWeight,
    statusWeight: C.statusWeight,
    enabled: C.useTargetWeight,
  };
}

/** 从 config 装配 BleedTimer 所需的 BleedTimerConfig(模块只认参数, 不碰单例) */
function bleedCfg(C: Config): BleedTimerConfig {
  return {
    enabled: C.useDelayedBleed,
    bleedTurns: C.BLEED_DURATION,
    safety: C.BLEED_SAFETY,
    fallbackHpPct: C.BLEED_FALLBACK_HP,
    rateWindow: C.BLEED_RATE_WINDOW,
    minSamples: C.BLEED_MIN_SAMPLES,
    minRate: C.BLEED_MIN_RATE,
  };
}

export class Brain {
  private lowHpStreak = 0; // 连续 hp<STRUGGLE_HP 的决策次数(达 STRUGGLE_STREAK 才判血线下降, 防单次瞬掉误触发)
  private charging = false; // 攒炮冲刺态(滞回): OC≥YIELD 进入关架式并保持, 放炮归0/跌破OC_OFF/炮不可用才退出 — 防架式在 YIELD 上下抖动
  private mercifulTry: { eid: number; oc: number } | null = null; // 上次慈悲尝试(目标 eid + 当时 OC); 下回合验证有没有真放出(OC 降没降)
  private mercifulBlockEid = -1; // 慈悲拉黑目标: 上次慈悲 OC 没降=没放出(HV 拒绝处决, 如世界树 boss 免疫处决) → 本段不再对它空点慈悲, 改要害磨; 目标死/不在则解除
  private bleedTimer = new BleedTimer(); // 要害延迟喂流血: 红名掉血速率追踪 + 喂血时机判定(跨回合状态)

  /** 登记"本回合主动攻击了红名 eid"(供下回合算掉血样本)后原样返回 action. 只用于真造成主动掉血的红名 return. */
  private hitRed<A extends Action>(eid: number, a: A): A {
    this.bleedTimer.noteActiveAttack(eid);
    return a;
  }

  decide(S: BattleState): Action {
    const C = config.all();
    const { hp, mp, sp } = S,
      oc = S.overcharge,
      ch = S.channeling,
      b = S.buff;
    const HM = S.maxHp || C.HPMAX,
      MM = S.maxMp || C.MPMAX,
      SM = S.maxSp || C.SPMAX; // 动态满值(自适应)
    const hasRed = S.enemies.some((e) => e.is_red_boss);
    // 血线下降去抖: 连续 STRUGGLE_STREAK 次 hp<STRUGGLE_HP 才判撑不住(放弃攒炮), 防单次瞬掉(挨发暴击又被拉回)误触发
    if (hp < C.STRUGGLE_HP * HM) this.lowHpStreak++;
    else this.lowHpStreak = 0;
    // 慈悲去重退避: 上回合决策的慈悲若没真放出(目标还活 + OC 没降, 慈悲应耗100) → 拉黑该目标慈悲、改要害磨; 目标死/不在则解除. 治"对处决免疫的怪(如世界树boss)每回合空点刷屏".
    if (this.mercifulTry) {
      const mt = this.mercifulTry;
      this.mercifulBlockEid = S.enemies.some((e) => e.eid === mt.eid && e.alive) && oc >= mt.oc ? mt.eid : -1;
      this.mercifulTry = null;
    }
    if (this.mercifulBlockEid >= 0 && !S.enemies.some((e) => e.eid === this.mercifulBlockEid && e.alive)) this.mercifulBlockEid = -1;
    const ranked = rankTargets(S.enemies, weightCfg(C));
    // 要害延迟喂血: 每回合无条件喂入活红名快照(兑现上回合主动样本 + cleanup 死红名 + 更新血量基线)
    this.bleedTimer.observe(S.enemies.filter((e) => e.is_red_boss && e.alive));
    const pressure = assessPressure(S, C, { lowHpStreak: this.lowHpStreak });
    const danger = Math.max(S.lastDmg, hasRed ? C.BURST_EST * HM : 0.3 * HM); // ②
    const predicted = hp - danger,
      PANIC = (hasRed ? C.PANIC_RED : C.PANIC_NORM) * HM;
    const mpFree = Math.max(0, mp - C.SPARK_RESERVE); // ①
    const heavy = S.lastDmg > 0.3 * HM,
      sparkCost = ch ? C.SPARK_RESERVE * 0.5 : C.SPARK_RESERVE;
    const A = (t: ActionType, id: number): Action => ({
      type: t,
      id,
      exec:
        t === 'spell'
          ? () => Exec.skill(id)
          : t === 'item'
            ? () => Exec.item(id)
            : () => Exec.attack(id),
    });
    // 体力急救药降级链(急救即时优先: 长效药是"每回合慢回"救不了急, 故药水排在长效前):
    //   终极体力药(即时回满) → 体力药水(即时) → 体力长效药(慢回垫底), 取背包里第一个"可点"的;
    // 各药不共享冷却, itemAvailable 精确查每种药可点; 全部没货/冷却 → 返回 null, 交上层降级(火花/防御).
    const pickHeal = (): Action | null => {
      for (const id of [IT.hElixir, IT.hPotion, IT.hDraught]) {
        if (Exec.itemAvailable(id)) return A('item', id);
      }
      return null;
    };
    // 急救回蓝(P1真空/P3熔断/墙倒调用): 省终极优先 —— 魔力宝石(免费) → 法力药水(即时回一截, 够放Spark/脱熔断就行) → 终极法力药(回满兜底);
    //   长效药慢回救不了急, 不进急救链; 各药独立冷却 itemAvailable 查; 全耗尽 → 防御硬抗.
    const pickMana = (): Action => {
      if (S.gems.mp) return A('item', S.gems.mp);
      for (const id of [IT.mPotion, IT.mElixir]) if (Exec.itemAvailable(id)) return A('item', id);
      return { type: 'defend', exec: Exec.defend, note: '回蓝药耗尽硬抗' };
    };
    // 回灵长效优先(养斗气非急救, 省钱为主): 灵力宝石 → 灵力长效药 → 灵力药水(灵力无终极药); 全耗尽 → null 交上层跳过.
    const pickSpirit = (): Action | null => {
      if (S.gems.sp) return A('item', S.gems.sp);
      for (const id of [IT.sDraught, IT.sPotion]) if (Exec.itemAvailable(id)) return A('item', id);
      return null;
    };

    // P0 小马图: 留人工
    if (S.riddle) {
      const r = this.riddle();
      return r ? { type: 'riddle', option: r.option, exec: () => document.querySelector<HTMLElement>(r.option)?.click() } : { type: 'skip', note: 'riddle留人工' };
    }
    // P0.5 胜利继续下一波: 清完怪后 HV 弹 #btcp("You are victorious"), 点它进下一波 → 连续刷(GF 波次推进)
    if (S.canContinue) return { type: 'continue', exec: () => Exec.continueBattle() };
    // P1 Spark 零空窗(防一击致死) ①③
    if (!b.spark.active || b.spark.turns <= 2) {
      if (mp >= sparkCost && Exec.skillReady(SK.Spark)) return A('spell', SK.Spark);
      if (b.spark.active && S.gems.mystic && !ch && C.useChanneling !== false)
        return { type: 'item', id: S.gems.mystic, note: 'Mystic:开Channeling补Spark', exec: () => Exec.item(S.gems.mystic) };
      if (!b.spark.active)
        return hp < 0.6 * HM
          ? (pickHeal() ?? { type: 'defend', exec: Exec.defend, note: 'Spark真空+急救药耗尽硬抗' })
          : { type: 'defend', exec: Exec.defend, note: 'Spark真空+缺MP硬抗' };
      return pickMana();
    }
    // P2 承伤预测式急救: 仅"当前血已破红线(hp<PANIC)" 或 "预测下一发致命且当前血本就不健康(hp<HP_HEAL)" 才救.
    // 血量健康(≥HP_HEAL)即便有红怪也不急救 —— 红怪单发 ≤BURST_EST, 健康血挨一发死不了, 不浪费顶级药.
    // (修: 91%血+红怪误触发 → 喝终极体力药; 且 Elixir 耗尽点不动 → 空转死循环. 喝药改降级链, 没货则火花/防御兜底)
    if (hp < PANIC || (predicted < PANIC && hp < C.HP_HEAL * HM)) {
      const canCure = mp >= C.MP_LOW * MM || ch;
      // 完全治疗术冷却(opacity:0.5)→ 退普通治疗术 → 喝药 → 火花(可放才放)→ 防御; 不再死盯放不出的法术空转(对齐原版 isOn 可放性门)
      if (canCure && Exec.skillReady(SK.FullCure)) return A('spell', SK.FullCure);
      if (canCure && Exec.skillReady(SK.Cure)) return A('spell', SK.Cure);
      return pickHeal() ?? (Exec.skillReady(SK.Spark) && mp >= sparkCost ? A('spell', SK.Spark) : { type: 'defend', exec: Exec.defend, note: '治疗冷却+急救药耗尽硬抗' });
    }
    const shadowDown = !b.shadowVeil.active || b.shadowVeil.turns <= 1;
    const ssDown = !b.spiritShield.active || b.spiritShield.turns <= 1;
    const prDown = !b.protection.active || b.protection.turns <= 1;
    const scrollCanCoverWalls = C.scrollFirst && S.scrollReady && ssDown && prDown;
    // P2.5 Channeling 主动利用: 折扣窗口补最贵(保命已在前, 不抢)
    if (ch && C.useChanneling !== false) {
      const channelFriendly: { id: number; need: boolean }[] = [
        { id: SK.Spark, need: !b.spark.active || b.spark.turns <= 2 },
        { id: SK.SpiritShield, need: !b.spiritShield.active || b.spiritShield.turns <= 1 },
        { id: SK.Protection, need: !b.protection.active || b.protection.turns <= 1 },
        { id: SK.ShadowVeil, need: C.useShadowVeil && shadowDown && !pressure.spReserveLow && (!C.shadowVeilPressureOnly || pressure.level !== 'low') },
      ];
      for (const q of channelFriendly) {
        if (q.need && Exec.skillReady(q.id)) return A('spell', q.id);
      }
      const control = selectControlDebuff(S, C, ranked, pressure);
      if (control && Exec.skillReady(control.id)) {
        if (control.target.is_red_boss) S.lockedRedId = control.target.eid;
        return { type: 'spell', id: control.id, note: `${control.note}(Channeling)`, exec: () => Exec.castHostileOn(control.id, control.target.eid) };
      }
      for (const q of CHANNEL_Q) {
        if (!q.need(b, S)) continue;
        if (!Exec.skillReady(q.id)) continue; // 耗蓝技能统一守卫: 置灰(冷却)跳过试队列下一个
        if (q.hostile) {
          const t = this.lockTarget(S);
          if (t) return this.castOnRed(q.id, t, S);
          continue;
        }
        return A('spell', q.id);
      }
    }
    // 双墙都缺且有卷轴: 卷轴不耗 MP, 先于 Mystic/MP 熔断, 一键补两墙.
    if (scrollCanCoverWalls) return A('item', IT.scrollProt);
    const mysticControl = selectControlDebuff(S, C, ranked, pressure);
    const mysticDefenseNeed =
      (!scrollCanCoverWalls && (ssDown || prDown) && mp < sparkCost) ||
      (C.useShadowVeil && shadowDown && !pressure.spReserveLow && pressure.level !== 'low' && mpFree < C.MP_LOW * MM);
    const mysticControlNeed = mysticControl && pressure.level !== 'low' && (!pressure.spReserveLow || mysticControl.key !== 'imperil');
    if (S.gems.mystic && !ch && C.useChanneling !== false && (mysticDefenseNeed || mysticControlNeed))
      return { type: 'item', id: S.gems.mystic, note: mysticDefenseNeed ? 'Mystic:开Channeling补防御' : 'Mystic:开Channeling控压', exec: () => Exec.item(S.gems.mystic) };
    // P3 MP 熔断 ④(节流: 长效药冷却中改秘药)
    if (mp < C.MP_FUSE * MM && !ch && (b.spark.turns <= 2 || b.spiritShield.turns <= 2 || b.protection.turns <= 2))
      return pickMana();
    // 单墙法术补(MP 不足: Gem 回蓝 → 秘药兜底)
    if (prDown)
      return mp >= sparkCost && Exec.skillReady(SK.Protection) ? A('spell', SK.Protection) : pickMana();
    if (ssDown)
      return mp >= sparkCost && Exec.skillReady(SK.SpiritShield) ? A('spell', SK.SpiritShield) : pickMana();
    // P5 Absorb(仅法系怪): 最近敌方对我造成魔法伤害 → 上吸收墙. useAbsorb 默认关(盾战物防为主).
    if (C.useAbsorb && S.tookMagicDmg && !b.absorb.active && Exec.skillReady(SK.Absorb)) return A('spell', SK.Absorb); // 加 skillReady(冷却检测): Absorb 放了进冷却就别反复决策(根治法吸死循环)
    // P6 Shadow Veil: 仅高压/显式开启维护, 低压不主动牺牲反击与 OC 收益.
    if (C.useShadowVeil && shadowDown && !pressure.spReserveLow && (!C.shadowVeilPressureOnly || pressure.level !== 'low') && (ch || mpFree >= C.MP_LOW * MM) && Exec.skillReady(SK.ShadowVeil))
      return { type: 'spell', id: SK.ShadowVeil, note: `压:${pressure.level} 影纱`, exec: () => Exec.skill(SK.ShadowVeil) };
    // P7 Haste(加 skillReady 守卫: MP不够/冷却时别硬决策放不出的法术→死磕安全网)
    if ((!b.haste.active || b.haste.turns <= 1) && Exec.skillReady(SK.Haste)) return A('spell', SK.Haste);
    // 重击波垫血(预防性, 长效药便宜慢回正合适): 长效药可点才垫, 否则跳过交 P10 降级链(避免点没货的药空转)
    if (heavy && hp < C.HP_HEAL * HM && Exec.itemAvailable(IT.hDraught)) return A('item', IT.hDraught);
    // P8 Regen(细胞活化, 持续回血). 祝福只增伤不持续回血→祝福期仍需 Regen. 加 skillReady 守卫: MP不够别硬放(GF日志R28: 反复硬放Regen→烧光MP→Spark真空瘫痪10回合)
    if ((!b.regen.active || b.regen.turns <= 1) && !S.regenOnCd && Exec.skillReady(SK.Regen)) return A('spell', SK.Regen);
    // P9 回 MP(常规省终极, HUD口径直接按 mp/maxMp): 魔力宝石 → 法力药水(50%即时, 主力) → 法力长效药(慢回兜底); 绝不碰终极(终极只留 P3熔断/P1真空);
    //   mp < MP_LOW 触发(不扣 SPARK_RESERVE, 与 HUD「回蓝」线一致, 所见即所得); 各药独立冷却 itemAvailable 查; manaPotOnCd 冷静期防连喝.
    if (mp < C.MP_LOW * MM && !S.manaPotOnCd) {
      if (S.gems.mp) return A('item', S.gems.mp);
      for (const id of [IT.mPotion, IT.mDraught]) if (Exec.itemAvailable(id)) return A('item', id);
    }
    // P10 回 HP(常规长效优先省钱: 生命宝石 → 长效药 → 体力药水 → 终极兜底; itemAvailable 查可点, 长效药冷却中降级到即时药顶上)
    if (hp < C.HP_HEAL * HM) {
      if (S.gems.hp) return A('item', S.gems.hp);
      for (const id of [IT.hDraught, IT.hPotion, IT.hElixir]) if (Exec.itemAvailable(id)) return A('item', id);
    }
    // P10.5 高压控制: Weaken → Silence → 高价值 Imperil, 用 SP 压力本身触发沉默减压.
    const control = selectControlDebuff(S, C, ranked, pressure);
    if (control && (ch || mpFree >= C.MP_LOW * MM) && Exec.skillReady(control.id)) {
      if (control.target.is_red_boss) S.lockedRedId = control.target.eid;
      return { type: 'spell', id: control.id, note: `${control.note} 压:${pressure.level}`, exec: () => Exec.castHostileOn(control.id, control.target.eid) };
    }
    // P11 回 SP 喂斗气(长效优先, itemAvailable 查可点; 长效药冷却中降级到灵力药水顶上, 不再干等; 药耗尽则跳过继续后续决策)
    const spReserveNeed = sp < C.SP_RESERVE_RATIO * SM && (b.spiritShield.active || pressure.level !== 'low');
    if (sp < C.SP_LOW * SM || spReserveNeed || (sp < C.SP_LOW * SM && S.stanceOn)) {
      const s = pickSpirit();
      if (s) return { ...s, note: spReserveNeed ? 'SP:预留不足' : 'SP:低线' };
    }
    // P11.5 小马炮 AOE(攒满即放, 必须排在架式之上): 不在 50 回合冷却(loop 按回合追踪 cannonOnCd) + OC≥200(炮耗8点斗气).
    //   弃用 opacity 判: OC<200 与冷却同为 opacity:0.5 无法区分(炮死锁根因), 改用回合冷却 + OC 数值.
    //   排在架式之上: 否则 OC 攒到 200 那刻被 P12"开架式"抢走 → 架式烧回<200 → 炮放不出+架式来回开关.
    if (C.useCannon && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES && oc >= C.CANNON_MIN_OC)
      return { type: 'cannon', exec: Exec.cannon };
    // P12 灵动架式开关(滞回) + 临门让位
    //   架式常驻为主(ehwiki:+100%物理伤害; 平砍+反击产OC > 架式烧10% → 净涨); 仅"临门一脚"让位:
    //   炮在栏+不冷却+够怪+OC接近200(≥CANNON_YIELD_OC 且 <200) → 关架式冲刺1-2回合让 OC 冲到 200 放炮.
    //   OC<CANNON_YIELD_OC 架式照常滞回常驻(不再全程压架式攒炮 — 日志实测全程架关=丢光+100%伤害).
    //   ⚠滞回防抖(GF 实测 66 次切架式 bug): 原 chargingCannon 每回合按 oc≥YIELD 重算 → 关架式后 OC 烧到<YIELD 又满足常驻开架式 → 175 上下反复横跳.
    //   改 charging 状态滞回: OC≥YIELD 进入冲刺(关架式并保持), 放炮归0 / 跌破 OC_OFF / 炮不可用 才退出, 冲刺期只切一次架式.
    const cannonCtx = C.useCannon && C.cannonYieldStance && S.cannonExists && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES;
    if (cannonCtx && oc >= C.CANNON_YIELD_OC && oc < C.CANNON_MIN_OC) this.charging = true;
    if (!cannonCtx || oc < C.OC_OFF * C.OCMAX || oc >= C.CANNON_MIN_OC) this.charging = false;
    if (this.charging) {
      if (S.stanceOn) return { type: 'stance', exec: Exec.stance }; // 冲刺期关架式(只切一次, 之后保持关攒到 200)
    } else {
      if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn && !pressure.spReserveLow) return { type: 'stance', exec: Exec.stance };
      if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: 'stance', exec: Exec.stance };
    }
    // P13 红怪减益序列(表驱动 Weaken→Imperil; 定向 commit 红怪)
    const tgt = selectRedTarget(S, ranked, 'control');
    if (tgt?.is_red_boss) {
      for (const d of DEBUFFS) {
        if (C[d.cfg] === false) continue; // 控制台开关
        if (tgt.debuff[d.key]) continue; // 已挂该减益
        if (!(ch || mpFree >= C.MP_LOW * MM)) break; // MP 不够: 整块让位给输出
        if (!Exec.skillReady(d.id)) continue; // 耗蓝技能统一守卫: 减益置灰(冷却)跳过试下一个
        return this.castOnRed(d.id, tgt, S);
      }
    }
    // P14 Heartseeker(持久战提暴; 多怪 或 有红名boss 都放 — 单 boss 血厚打最久最该提暴, HS_MIN_ENEMIES 只挡纯杂兵速清波)
    if ((!b.heartseeker.active || b.heartseeker.turns <= 1) && (S.alive >= C.HS_MIN_ENEMIES || hasRed) && (ch || mpFree >= 0.4 * MM) && Exec.skillReady(SK.Heartseeker))
      return A('spell', SK.Heartseeker);
    // P15 OC 近战技 + 跨波攒炮预算(OC 跨波保留, 是稀缺资源, 要花在刀刃上).
    //   攒炮模式 saveOcForCannon: 炮在栏不冷却 + 血线健康 + (本波怪还多≥4 OR 本波高密度) → 攒 OC 不花单体技.
    //     有红名也攒: 怪多时炮 AOE 清场+削红名最值(red boss 也吃炮伤), 总是先尝试攒炮.
    //     高密度波(monsterTotal≥CANNON_MIN_ENEMIES)即使清到剩 2-3 杂兵也攒: 杂兵平砍清, OC 留给(本/下)波开炮 AOE.
    //   放弃攒炮(血线下降 struggling / 低密度波 / 炮冷却) → 单体技减压: 慈悲处决红名, 要害秒怪降围殴, 盾击晕眩.
    const struggling = this.lowHpStreak >= C.STRUGGLE_STREAK; // 血线下降去抖: 连续 STRUGGLE_STREAK 次跌破 STRUGGLE_HP(默认 50%×2 次)才放弃攒炮
    const finalRound = !hasFutureRound(S);
    const saveOcForCannon = shouldSaveOcForCannon(S, C, pressure, struggling);
    // 红名"要害+慈悲"破例(无视攒炮): 慈悲处决须先有要害产的流血(武器无流血附魔), 故两步绑定提到攒炮 gate 之前;
    //   盾击不破例(攒炮期红名靠盾战反击概率晕, 省 25 OC). 慈悲(斩杀线<25%+流血)优先于要害(已晕→喂流血), 都锁同一红怪.
    const execRed = selectRedTarget(S, ranked, 'execute');
    if (execRed) {
      // 慈悲(斩杀线处决, 不受架式门槛限制): 加去重拉黑(放不出/处决免疫就不再空点) + 记录尝试供下回合验证 OC 降没降
      if (C.useMercifulBlow && execRed.eid !== this.mercifulBlockEid && execRed.hpPct < 25 && execRed.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
        this.mercifulTry = { eid: execRed.eid, oc };
        return this.hitRed(execRed.eid, { type: 'spell', id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${execRed.eid}(${execRed.hpPct}%+流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, execRed.eid) });
      }
      // 要害(延迟喂流血): 未流血 + 血量时机到(速率预测/兜底)才喂 — 让 5 道 DoT 刚好覆盖斩杀窗口, 不再一晕就喂
      if (C.useVitalStrike && execRed.stunned && !execRed.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(execRed, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
        return this.hitRed(execRed.eid, { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${execRed.eid}(${execRed.hpPct}%·延迟喂流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, execRed.eid) });
    }
    if (!saveOcForCannon) {
      const tgtSp = selectRedTarget(S, ranked, 'execute'); // 锁定红怪(连招与处决都对它)
      // ── 红名处决连招(锁同一红怪串联, 优先于杂兵): 盾击晕 → 要害收割+5流血 → 慈悲25%处决 ──
      if (tgtSp) {
        // 慈悲(连招终点, 100 OC): 红名 25%+流血 → 处决. 同破例: 去重拉黑 + 记录尝试(防对处决免疫的怪空点)
        if (C.useMercifulBlow && tgtSp.eid !== this.mercifulBlockEid && tgtSp.hpPct < 25 && tgtSp.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
          this.mercifulTry = { eid: tgtSp.eid, oc };
          return this.hitRed(tgtSp.eid, { type: 'spell', id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${tgtSp.eid}(${tgtSp.hpPct}%+流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, tgtSp.eid) });
        }
        // 要害(连招第2步, 延迟喂流血): 已晕 + 未流血 + 血量时机到才喂. 补 !bleeding 防喂完未到25%又重复喂; 让位架式同前
        if (C.useVitalStrike && S.stanceOn && tgtSp.stunned && !tgtSp.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
          return this.hitRed(tgtSp.eid, { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${tgtSp.eid}(${tgtSp.hpPct}%·延迟喂流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, tgtSp.eid) });
        // 盾击(连招第1步, 25 OC): 红名未晕 → 上晕眩. 让位架式: 架式未开先攒OC开架式(架式开后靠反击+主动盾击晕)
        if (C.useShieldBash && S.stanceOn && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
          return this.hitRed(tgtSp.eid, { type: 'spell', id: SK_SPECIAL.shieldBash, note: `盾击晕红名#${tgtSp.eid}(连招1步)`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, tgtSp.eid) });
      }
      // ── 杂兵减压(红名连招本回合无事 / 无红名): 红名在场或力不从心 → 要害秒已晕杂兵降围殴; 盾击晕杂兵减伤 ──
      if (C.useVitalStrike && (hasRed || struggling || finalRound || pressure.level !== 'low') && oc >= 50) {
        const stunTrash = ranked.find((e) => e.alive && e.stunned && !e.is_red_boss);
        if (stunTrash && Exec.skillReady(SK_SPECIAL.vitalStrike)) {
          const why = struggling ? '力不从心' : hasRed ? '红名在场' : finalRound ? '最终波' : '高压';
          return { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害秒杂兵#${stunTrash.eid}(${why}减压)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, stunTrash.eid) };
        }
      }
      if (C.useShieldBash && oc >= 25) {
        const toStun = ranked.find((e) => e.alive && !e.is_red_boss && !e.stunned);
        if (toStun && Exec.skillReady(SK_SPECIAL.shieldBash))
          return { type: 'spell', id: SK_SPECIAL.shieldBash, note: `盾击晕杂兵#${toStun.eid}`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, toStun.eid) };
      }
    }
    // P15.5 长效药主动维持(MAINTAIN_LINE=75% 硬编码养生): HP/MP/SP 在「低线~75%」区间 → 喝对应长效药(便宜+持续回, 趁早补满少掉低线/急救);
    //   排平砍前不抢核心输出(炮/控制/红怪处决都在前); 长效药独立冷却天然限频, 蓝药额外受 manaPotOnCd 冷静期防连喝.
    if (hp < C.MAINTAIN_LINE * HM && Exec.itemAvailable(IT.hDraught)) return A('item', IT.hDraught);
    if (mp < C.MAINTAIN_LINE * MM && !S.manaPotOnCd && Exec.itemAvailable(IT.mDraught)) return A('item', IT.mDraught);
    if (sp < C.MAINTAIN_LINE * SM && Exec.itemAvailable(IT.sDraught)) return A('item', IT.sDraught);
    // P16 破甲滚雪球平砍: 杂兵按 finWeight 选最优(血量+13状态+Yggdrasil); 仅剩红怪锁定持续平砍.
    //   红怪线(lockTarget/P13/P15/下方尾部锁定)全不动 —— 权重只接管杂兵选谁(守半自动红线).
    //   useTargetWeight=false → rankTargets 退回 eid 升序 = 现状, 零回归.
    const trash = ranked.filter((e) => !e.is_red_boss && e.alive);
    if (trash.length) {
      const t = trash[0];
      const why = saveOcForCannon ? '攒炮中' : C.useTargetWeight ? 'finWeight最优' : '最低eid';
      return { type: 'attack', id: t.eid, note: `平砍杂兵#${t.eid}(${why},${t.hpPct}%${t.status?.PA ? '·破甲' : ''})`, exec: () => Exec.attack(t.eid) };
    }
    if (tgt) {
      S.lockedRedId = tgt.eid;
      return this.hitRed(tgt.eid, { type: 'attack', id: tgt.eid, note: `平砍红名#${tgt.eid}(仅剩红怪,${tgt.hpPct}%)`, exec: () => Exec.attack(tgt.eid) });
    }
    return { type: 'defend', exec: Exec.defend };
  }

  /** 锁定红怪(记忆目标优先, 否则首个活红怪) */
  lockTarget(S: BattleState): EnemyState | null {
    return selectRedTarget(S, rankTargets(S.enemies, weightCfg(config.all())), 'damage');
  }

  /** 定向红怪释放 hostile 减益 */
  castOnRed(id: number, tgt: EnemyState, S: BattleState): Action {
    S.lockedRedId = tgt.eid;
    return { type: 'spell', id, exec: () => Exec.castHostileOn(id, tgt.eid) };
  }

  /** 小马图: 默认留人工(接图像识别后返回 {confident, option}) */
  riddle(): { confident: boolean; option: string } | null {
    return null;
  }
}

export const brain = new Brain();
