/* ============================================================================
 * HV 盾战 · 智能自动战斗决策核心 (加固版 v1)  —— "换大脑"方案(B)
 * 适配: L398 PFUDOR 单手虚空盾战 (雷·西洋剑 / 力场盾 / 动力重甲)
 * 对接: 当前 HentaiVerse 战斗页真实 DOM + dodying hvAutoAttack 执行层
 *
 * 已整合对抗审查的 4 项【致命】加固:
 *   ① Spark 预算锁     —— 永久预留放 Spark 的 MP, 杜绝"已空窗+没蓝"裸奔
 *   ② 满暴击波承伤预测 —— 用 max(上回合伤害, 血池45%) 估危, 有红怪安全线抬到50%
 *   ③ 保命墙解除Channeling依赖 —— Spark/SS/Protection 无论MP多少必放, 不足先回蓝
 *   ④ MP 熔断阈值 15%→30% —— 消除 15%~35% 死锁盲区
 *
 * 半自动定位: 算法跑常规回合; 小马图识别/附魔/精力撤退 留人工(见 resolveRiddle)
 * 阈值集中在 CFG, 想调直接改这里, 不必碰 dodying 配置面板
 * ========================================================================== */
(function () {
  'use strict';

  // ---------- 玩家实测常量 (按你的面板换算; 换号/成长后改这里) ----------
  const CFG = {
    HPMAX: 24232, MPMAX: 2002, SPMAX: 1470, OCMAX: 250,
    SPARK_RESERVE: 340,          // ① Spark预算锁: 永久预留可放Spark的MP(放Spark约吃15%)
    BURST_EST: 0.45,             // ② 满暴击连击波估计(占血池比例)
    PANIC_RED: 0.50,             // ② 场上有红怪时的急救安全血线
    PANIC_NORM: 0.25,            // 无红怪时急救线
    MP_FUSE: 0.30,               // ④ MP熔断阈值
    HP_HEAL: 0.60, MP_LOW: 0.35, SP_LOW: 0.30,
    OC_ON: 0.40, OC_OFF: 0.22,   // 灵动架式滞回(关闭线15%→22%留缓冲)
    HEARTSEEKER_MIN_ENEMIES: 2, CANNON_MIN_ENEMIES: 4,
  };

  // ---------- 法术 ID / 物品 DBID (DBID按"当前HV实际"标注, 非dodying错位标签) ----------
  const SK = { Imperil: 213, Cure: 311, Regen: 312, FullCure: 313, Protection: 411,
    Haste: 412, Absorb: 421, Spark: 422, SpiritShield: 423, Heartseeker: 431 };
  const IT = { // ⚠ 实际HV: 91=长效Draught 95=药水Potion 99=秘药Elixir (dodying标签把91/95对调了)
    hDraught: 11191, hPotion: 11195, hElixir: 11199,
    mDraught: 11291, mPotion: 11295, mElixir: 11299,
    sDraught: 11391, sPotion: 11395,
    scrollProt: 13111, infDark: 12601, infHoly: 12501, manaGem: 10006 };

  // ---------- 执行层 (对接已验证的真实 HV DOM) ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const itemBtn = dbid => $(`.bti3>div[onmouseover*="set_infopane_item(${dbid})"]`);
  function castSpell(id) { const e = document.getElementById(String(id)); if (e) { e.click(); return true; } return false; }
  function useItem(dbid) { const e = itemBtn(dbid); if (e) { e.click(); return true; } return false; }
  function attackMonster(n) { if (window.battle && battle.commit_target) { battle.commit_target(n); return true; } const e = document.getElementById('mkey_' + n); if (e) { e.click(); return true; } return false; }
  function toggleStance() { const e = document.getElementById('ckey_spirit'); if (e) { e.click(); return true; } return false; }
  function doDefend() { const e = document.getElementById('ckey_defend'); if (e) { e.click(); return true; } return false; }
  function cannonBtn() { return [...document.querySelectorAll('#pane_skill [onmouseover]')].find(e => /Friendship|Cannon/i.test(e.getAttribute('onmouseover') || '')); }

  // ---------- 状态读取 (对接 #vrhd/vbh/vcp/pane_effects/mkey/btm6) ----------
  const BUFF_IMG = { spark: 'sparklife', spiritShield: 'spiritshield', protection: 'protection',
    absorb: 'absorb', haste: 'haste', regen: 'regen', heartseeker: 'heartseeker', channeling: 'channeling' };

  function readBuffs() {
    const imgs = [...document.querySelectorAll('#pane_effects>img')];
    const out = {};
    for (const k in BUFF_IMG) {
      const im = imgs.find(i => (i.src || '').includes(BUFF_IMG[k]));
      out[k] = im ? { active: true, turns: parseExpire(im) } : { active: false, turns: 0 };
    }
    return out;
  }
  function parseExpire(img) { // 剩余回合: HV版本相关, 读不到给99(视为充足) —— 【需实战核对】
    const ex = img.parentElement && img.parentElement.querySelector('[id*="expire"]');
    const n = ex ? parseInt(((ex.textContent || '').match(/\d+/) || [])[0]) : NaN;
    return isNaN(n) ? 99 : n;
  }
  function num(id) { const e = document.getElementById(id); return e ? parseInt((e.textContent || '').replace(/\D/g, '')) : NaN; }

  function readState(prev) {
    prev = prev || {};
    const hp = num('vrhd'), mp = num('vrm'), sp = num('vrs');
    const vcp = document.getElementById('vcp'), bar = vcp && vcp.firstElementChild;
    const oc = (vcp && bar && vcp.offsetWidth) ? Math.round(bar.offsetWidth / vcp.offsetWidth * CFG.OCMAX) : 0;
    const B = readBuffs();
    const stance = document.getElementById('ckey_spirit');
    const enemies = [...document.querySelectorAll('[id^="mkey_"]')].map(m => {
      const eid = parseInt(m.id.split('_')[1]);
      const dead = /opacity/.test(m.getAttribute('style') || '');
      const isBoss = !!m.querySelector('.btm2[style*="background"]');
      const dimg = [...m.querySelectorAll('.btm6 img')].map(i => i.src || '');
      return { eid, alive: !dead, is_red_boss: isBoss,
        debuff: { imperil: dimg.some(s => /imperil/i.test(s)) },
        penArmor: dimg.some(s => /penetrat|wpn_bleed/i.test(s)) };
    }).filter(e => e.alive);
    const lastDmg = (typeof prev.hp === 'number' && prev.hp > hp) ? prev.hp - hp : 0;
    return {
      hp, mp, sp, overcharge: oc,
      buff: { spark_of_life: B.spark, spirit_shield: B.spiritShield, protection: B.protection,
        absorb: B.absorb, haste: B.haste, regen: B.regen, heartseeker: B.heartseeker },
      channeling: { active: B.channeling.active },
      spirit_stance: { active: !!(stance && /spirit_a/.test(stance.src || '')) },
      last_round_damage: lastDmg,
      enemies, alive_enemy_count: enemies.length,
      riddle_active: !!document.getElementById('riddlecounter'),
      mana_gem: { ready: !!itemBtn(IT.manaGem) },
      cannon: { skill_available: !!cannonBtn() },
      is_first_round: prev._started !== true,
      lockedRedId: prev.lockedRedId, _started: true,
    };
  }

  // ---------- 加固后的决策核心 ----------
  const sparkCost = ch => Math.round(CFG.SPARK_RESERVE * (ch ? 0.5 : 1));
  function decideAction(S) {
    const { hp, mp, sp } = S, oc = S.overcharge, ch = S.channeling.active;
    const hasRed = S.enemies.some(e => e.is_red_boss);
    // ② 承伤预测: 满暴击波下界
    const danger = Math.max(S.last_round_damage, hasRed ? CFG.BURST_EST * CFG.HPMAX : 0.30 * CFG.HPMAX);
    const predictedHp = hp - danger;
    const PANIC = (hasRed ? CFG.PANIC_RED : CFG.PANIC_NORM) * CFG.HPMAX;
    // ① Spark预算锁: 常规消耗只能动用预留之外的MP
    const mpFree = Math.max(0, mp - CFG.SPARK_RESERVE);
    const heavy = S.last_round_damage > 0.30 * CFG.HPMAX;
    const A = (kind, id) => ({ type: kind, id,
      exec: kind === 'spell' ? () => castSpell(id) : kind === 'item' ? () => useItem(id) : () => attackMonster(id) });

    // P0 小马图: 凌驾一切 (置信即交, 不赌治疗奖励)
    if (S.riddle_active) {
      const r = resolveRiddle(S);
      if (r && r.confident) return { type: 'riddle', option: r.option, exec: () => $(r.option) && $(r.option).click() };
      return { type: 'skip', note: 'riddle不确定→留人工(选错×10精力)' };
    }

    // P1 Spark零空窗 (①③: turns<=2预补; 真空+缺MP→垫血硬抗, 绝不裸站回蓝)
    if (!S.buff.spark_of_life.active || S.buff.spark_of_life.turns <= 2) {
      if (mp >= sparkCost(ch)) return A('spell', SK.Spark);
      if (!S.buff.spark_of_life.active) {            // 已真空且没蓝 = 最危险
        if (hp < 0.6 * CFG.HPMAX) return A('item', IT.hElixir); // 先垫满血
        return { type: 'defend', exec: doDefend, note: 'Spark真空+缺MP→Defend硬抗1回合' };
      }
      return S.mana_gem.ready ? A('item', IT.manaGem) : A('item', IT.mElixir); // 未真空→抢回蓝
    }

    // P2 承伤预测急救 (②)
    if (hp < PANIC || predictedHp < PANIC) {
      if (mp >= CFG.MP_LOW * CFG.MPMAX || ch) return A('spell', SK.FullCure);
      return A('item', IT.hElixir);                  // 秘药瞬回(库存63, 仅急救线动用)
    }

    // P3 MP熔断 (④: 30%, 任一保命墙turns<=2)
    if (mp < CFG.MP_FUSE * CFG.MPMAX && !ch &&
      (S.buff.spark_of_life.turns <= 2 || S.buff.spirit_shield.turns <= 2 || S.buff.protection.turns <= 2)) {
      return S.mana_gem.ready ? A('item', IT.manaGem) : A('item', IT.mDraught);
    }

    // P4 物理墙 (③: 保命墙不依赖Channeling/高MP; 2墙同缺或起手用卷轴一键铺)
    if ((!S.buff.spirit_shield.active && !S.buff.protection.active) || S.is_first_round) return A('item', IT.scrollProt);
    const prDown = !S.buff.protection.active || S.buff.protection.turns <= 1;
    const ssDown = !S.buff.spirit_shield.active || S.buff.spirit_shield.turns <= 1;
    if (prDown) return mp >= sparkCost(ch) ? A('spell', SK.Protection) : (S.mana_gem.ready ? A('item', IT.manaGem) : A('item', IT.scrollProt));
    if (ssDown) return mp >= sparkCost(ch) ? A('spell', SK.SpiritShield) : (S.mana_gem.ready ? A('item', IT.manaGem) : A('item', IT.scrollProt));

    // P5 Absorb (仅魔法怪 —— enemy_damage_type 需对接, 默认关)
    const isMagic = false; // TODO: 接入"当前怪是否法系"后置 true
    if (isMagic && (!S.buff.absorb.active || S.buff.absorb.turns <= 1)) return A('spell', SK.Absorb);

    // P7 Haste
    if (!S.buff.haste.active || S.buff.haste.turns <= 1) return A('spell', SK.Haste);

    // 重击波兜底
    if (heavy) {
      if (hp < CFG.HP_HEAL * CFG.HPMAX) return A('item', IT.hDraught);
      if (predictedHp < 0.40 * CFG.HPMAX) return { type: 'defend', exec: doDefend };
    }

    // P8 Regen
    if (!S.buff.regen.active || S.buff.regen.turns <= 1) return A('spell', SK.Regen);

    // P9 回MP (用mpFree, 不动Spark预算)
    if (mpFree < CFG.MP_LOW * CFG.MPMAX) return S.mana_gem.ready ? A('item', IT.manaGem) : A('item', IT.mDraught);

    // P10 常规HP (60%档长效药)
    if (hp < CFG.HP_HEAL * CFG.HPMAX) return A('item', IT.hDraught);

    // P11 SP喂鬥气
    if (sp < CFG.SP_LOW * CFG.SPMAX && S.spirit_stance.active) return A('item', IT.sDraught);

    // P12 灵动架式 (滞回 40%开 / 22%关)
    if (oc >= CFG.OC_ON * CFG.OCMAX && !S.spirit_stance.active) return { type: 'stance', exec: toggleStance };
    if (oc < CFG.OC_OFF * CFG.OCMAX && S.spirit_stance.active) return { type: 'stance', exec: toggleStance };

    // P13 Imperil (仅红怪; 增伤保留Channeling/MP门槛)
    const tgt = pickLockTarget(S);
    if (tgt && tgt.is_red_boss && !tgt.debuff.imperil && (ch || mpFree >= CFG.MP_LOW * CFG.MPMAX)) return A('spell', SK.Imperil);

    // P14 Heartseeker
    if ((!S.buff.heartseeker.active || S.buff.heartseeker.turns <= 1) &&
      S.alive_enemy_count >= CFG.HEARTSEEKER_MIN_ENEMIES && (ch || mpFree >= 0.40 * CFG.MPMAX)) return A('spell', SK.Heartseeker);

    // P15 小马炮 (多怪 + 技能栏已出现)
    if (S.alive_enemy_count >= CFG.CANNON_MIN_ENEMIES && S.cannon.skill_available) {
      const c = cannonBtn(); if (c) return { type: 'cannon', exec: () => c.click() };
    }

    // P16 破甲滚雪球平砍
    const trash = S.enemies.filter(e => !e.is_red_boss && e.alive);
    if (trash.length) return A('attack', trash.sort((a, b) => a.eid - b.eid)[0].eid); // 杂兵优先(最低血需HP数据, 暂按序)
    if (tgt) { S.lockedRedId = tgt.eid; return A('attack', tgt.eid); }                 // 锁红怪叠破甲
    return { type: 'defend', exec: doDefend };
  }

  // 破甲锁定: 旧锁存活继续, 否则重选血/威胁最高红怪 (满层前不换→保持滚雪球)
  function pickLockTarget(S) {
    const live = S.enemies.filter(e => e.is_red_boss && e.alive);
    let lock = S.lockedRedId && live.find(e => e.eid === S.lockedRedId);
    return lock || live[0] || null;
  }

  // ---------- 需你对接/验证的高风险桩 (审查标注) ----------
  function resolveRiddle() { return null; } // 小马图: 默认留人工(null=跳过)。接图像识别后返回{confident,option}

  // ---------- 主循环钩子 ----------
  // 接 dodying: 把它每回合决策点替换为 step(); 或独立用:
  let _prev = {};
  function step() {
    if (!document.getElementById('vrhd')) return;          // 不在战斗页就不动
    const S = readState(_prev);
    const a = decideAction(S);
    if (a && a.exec) a.exec();
    _prev = S;
    return a;
  }
  // 触发: 建议监听 #textlog 变化或 battle 完成后调用 step(), 不要无脑 setInterval
  // 例: new MutationObserver(()=>setTimeout(step,250)).observe(document.getElementById('textlog'),{childList:true,subtree:true});
  window.HVShieldBrain = { readState, decideAction, step, CFG };
})();
