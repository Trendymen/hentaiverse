/* ============================================================================
 * HV 盾战 · 智能大脑 (现代化 B 模块) —— 焊进 dodying 当一键可切的"出招大脑"
 * 适配: L398 PFUDOR 单手虚空盾战 (雷剑/力场盾/动力甲)
 *
 * 现代化要点:
 *   · 分层: Store / Config / StateReader / Brain / Exec / UI 各司其职
 *   · hook XHR 旁路读战斗响应(只读不改, 比纯DOM解析更稳; 解析待GF实测填)
 *   · 一键开关 UI(🧠按钮) + HUD; 开关状态持久化, 不依赖 dodying 存储
 *   · 现代 JS: class / 箭头 / 解构 / 可选链 / Map-Set
 *
 * 焊接(改 dodying onBattle line 2840, taskList 之前插一行):
 *   if (window.HVShieldBrain?.enabled()) { window.HVShieldBrain.step(); return; }
 * 其余 onBattle(统计/换图/继续回合) 与整个 dodying 框架一行不改、全程照跑。
 *
 * 已内置对抗审查 4 项致命加固: ①Spark预算锁 ②满暴击波承伤预测
 *   ③保命墙脱离Channeling依赖 ④MP熔断阈值30%
 * 半自动: 小马图识别留人工(Brain.riddle 返回 null = 跳过)
 * ========================================================================== */
(() => {
  'use strict';

  // ── 0. 持久化 (GM 优先, 退回 localStorage) ──────────────────────────────
  const Store = {
    get: (k, d) => { try { return typeof GM_getValue === 'function' ? GM_getValue('hvsb_' + k, d) : (JSON.parse(localStorage.getItem('hvsb_' + k) ?? 'null') ?? d); } catch { return d; } },
    set: (k, v) => { try { typeof GM_setValue === 'function' ? GM_setValue('hvsb_' + k, v) : localStorage.setItem('hvsb_' + k, JSON.stringify(v)); } catch {} },
  };

  // ── 1. 配置 (可被持久化的自定义值覆盖; 玩家实测常量) ─────────────────────
  const CFG = {
    HPMAX: 24232, MPMAX: 2002, SPMAX: 1470, OCMAX: 250,
    SPARK_RESERVE: 340,   // ① 永久预留可放 Spark 的 MP
    BURST_EST: 0.45,      // ② 满暴击连击波(占血池)
    PANIC_RED: 0.50, PANIC_NORM: 0.25,
    MP_FUSE: 0.30,        // ④ MP 熔断阈值
    HP_HEAL: 0.60, MP_LOW: 0.35, SP_LOW: 0.30,
    OC_ON: 0.40, OC_OFF: 0.22,
    HS_MIN_ENEMIES: 2, CANNON_MIN_ENEMIES: 4,
    useCannon: true, cannonCdMs: 22000, // 小马炮: 默认开 + 冷却节流(放完22s内不重放防卡)
    scrollFirst: true,                  // 起手/2墙缺优先卷轴(关=用法术逐个补, 省卷轴)
    delayMin: 160, delayMax: 400,       // 动作间随机延迟范围(ms)
    useWeaken: true, useImperil: true,  // 红怪减益序列开关(对应 DEBUFFS 表)
    useChanneling: true,                // Channeling 主动利用(折扣窗口补最贵)
    ...Store.get('cfg', {}),
  };

  // ── 2. ID 表 (DBID 按"当前 HV 实际"; 91=长效Draught 95=药水 99=秘药) ──────
  const SK = { Weaken: 212, Imperil: 213, Cure: 311, Regen: 312, FullCure: 313, Protection: 411, Haste: 412, Absorb: 421, Spark: 422, SpiritShield: 423, Heartseeker: 431 };
  const IT = { hDraught: 11191, hPotion: 11195, hElixir: 11199, mDraught: 11291, mPotion: 11295, mElixir: 11299, sDraught: 11391, sPotion: 11395, scrollProt: 13111, infDark: 12601, infHoly: 12501, manaGem: 10006 };
  const BUFF_IMG = { spark: 'sparklife', spiritShield: 'spiritshield', protection: 'protection', absorb: 'absorb', haste: 'haste', regen: 'regen', heartseeker: 'heartseeker', channeling: 'channeling', hpot: 'healthpot', mpot: 'manapot', spot: 'spiritpot' };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // 红怪定向减益序列(顺序=优先级; Weaken减伤先于Imperil破抗 → survival-first)。key 与 enemy.debuff 字段一致, 加 Blind/Slow 只改此表
  const DEBUFFS = [
    { key: 'weaken', id: SK.Weaken, cfg: 'useWeaken', img: /weaken/i },
    { key: 'imperil', id: SK.Imperil, cfg: 'useImperil', img: /imperil/i },
  ];
  // Channeling 折扣窗口(1MP+50%)待补贵技能优先队列(贵→便宜)
  const CHANNEL_Q = [
    { id: SK.Spark, need: b => !b.spark.active || b.spark.turns <= 2 },
    { id: SK.SpiritShield, need: b => !b.spiritShield.active || b.spiritShield.turns <= 1 },
    { id: SK.Protection, need: b => !b.protection.active || b.protection.turns <= 1 },
    { id: SK.Imperil, hostile: true, need: (b, S) => { const t = S.enemies.find(e => e.is_red_boss && e.alive); return t && !t.debuff.imperil; } },
    { id: SK.Heartseeker, need: (b, S) => (!b.heartseeker.active || b.heartseeker.turns <= 1) && S.alive >= CFG.HS_MIN_ENEMIES },
  ];
  const cannonBtn = () => $$('#pane_skill [onmouseover]').find(e => /Friendship|Cannon/i.test(e.getAttribute('onmouseover') || ''));
  let _lastCannon = 0; // 小马炮上次释放时间戳(冷却节流用)

  // ── 3. 执行层 (对接已验证的真实 HV DOM) ─────────────────────────────────
  const Exec = {
    skill: id => { const e = document.getElementById(String(id)); if (!e) return false; const oc = e.getAttribute('onclick') || ''; e.click(); if (/set_hostile_skill/.test(oc)) { const m = document.querySelector('[id^="mkey_"]:not([style*="opacity"])'); if (m) return Exec.attack(parseInt(m.id.split('_')[1])); } return true; }, // 通用: 读onclick自动区分 friendly(touch_and_go自动)/hostile(选中后对第一个活怪commit释放) —— 一次覆盖所有技能, 不再逐个踩坑
    item: db => { const e = $(`.bti3>div[onmouseover*="set_infopane_item(${db})"]`); return e ? (e.click(), true) : false; },
    attack: n => { if (window.battle?.commit_target) { window.battle.commit_target(n); return true; } const e = document.getElementById('mkey_' + n); return e ? (e.click(), true) : false; },
    stance: () => { const e = document.getElementById('ckey_spirit'); return e ? (e.click(), true) : false; },
    defend: () => { const e = document.getElementById('ckey_defend'); return e ? (e.click(), true) : false; },
    cannon: () => { const c = cannonBtn(); if (!c) return false; const r = Exec.skill(c.id); if (r) _lastCannon = Date.now(); return r; }, // 小马炮(hostile): 通用skill选目标释放(AOE); 记时间用于冷却节流
    castHostileOn: (id, eid) => { const e = document.getElementById(String(id)); if (!e) return false; e.click(); const m = document.getElementById('mkey_' + eid); return m ? Exec.attack(eid) : Exec.skill(id); }, // hostile定向: 选中后commit指定红怪eid(修"打第一个怪"); 找不到eid退回通用skill
  };

  // ── 4. 状态读取 (hook XHR 旁路捕获 + DOM 解析) ──────────────────────────
  class StateReader {
    constructor() { this.prev = {}; this.lastXHR = null; this._hookNet(); }
    _hookNet() { // 尽力而为: 同时 hook XHR + fetch 旁路读响应(只读不改).
      // ⚠实测(GF): 战斗"中途"注入抓不到(battle 早已绑定发送引用); 需油猴 @run-at document-start 最早期注入才可能生效.
      // 故本模块以 DOM 解析为主数据源, XHR/fetch 捕获仅作锦上添花(早注入时可补 buff剩余回合/精确鬥气等 DOM 拿不到的数据).
      const self = this;
      const _xo = XMLHttpRequest.prototype.open, _xs = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (m, u, ...r) { this._url = u; return _xo.call(this, m, u, ...r); };
      XMLHttpRequest.prototype.send = function (...a) { this.addEventListener('load', () => { if (/Battle|api/i.test(this._url || '')) self.lastXHR = this.responseText; }); return _xs.apply(this, a); };
      const _f = window.fetch;
      if (_f) window.fetch = function (...a) { const u = (typeof a[0] === 'string' ? a[0] : a[0]?.url) || ''; return _f.apply(this, a).then(rp => { if (/Battle|api/i.test(u)) rp.clone().text().then(t => { self.lastXHR = t; }).catch(() => {}); return rp; }); };
    }
    _num(id) { const e = document.getElementById(id); const m = e && (e.textContent || '').match(/\d+/); return m ? parseInt(m[0]) : NaN; } // 取第一个数字组, 无视百分比插件注入的 [88%] 等
    _expire(img) { const ex = img.parentElement?.querySelector('[id*="expire"]'); const n = ex ? parseInt((ex.textContent || '').match(/\d+/)?.[0]) : NaN; return isNaN(n) ? 99 : n; } // 【待 GF 实测核对回合数读法】
    _buffs() {
      const imgs = $$('#pane_effects>img'), out = {};
      for (const k in BUFF_IMG) { const im = imgs.find(i => (i.src || '').includes(BUFF_IMG[k])); out[k] = im ? { active: true, turns: this._expire(im) } : { active: false, turns: 0 }; }
      return out;
    }
    read() {
      const hp = this._num('vrhd'), mp = this._num('vrm'), sp = this._num('vrs');
      if (hp) this.maxHp = Math.max(this.maxHp || CFG.HPMAX, hp);  // 动态识别满值(自适应成长/插件), 解决>100%
      if (mp) this.maxMp = Math.max(this.maxMp || CFG.MPMAX, mp);
      if (sp) this.maxSp = Math.max(this.maxSp || CFG.SPMAX, sp);
      const vcp = document.getElementById('vcp'), bar = vcp?.firstElementChild;
      const oc = (vcp && bar && vcp.offsetWidth) ? Math.round(bar.offsetWidth / vcp.offsetWidth * CFG.OCMAX) : 0;
      const B = this._buffs(), stance = document.getElementById('ckey_spirit');
      const enemies = $$('[id^="mkey_"]').map(m => {
        const eid = +m.id.split('_')[1], dimg = $$('.btm6 img', m).map(i => i.src || '');
        const debuff = {}; for (const d of DEBUFFS) debuff[d.key] = dimg.some(s => d.img.test(s)); // 表驱动: imperil+weaken+未来
        return { eid, alive: !/opacity/.test(m.getAttribute('style') || ''), is_red_boss: !!$('.btm2[style*="background"]', m), debuff, penArmor: dimg.some(s => /penetrat|bleed/i.test(s)) };
      }).filter(e => e.alive);
      const lastDmg = (typeof this.prev.hp === 'number' && this.prev.hp > hp) ? this.prev.hp - hp : 0;
      return {
        hp, mp, sp, overcharge: oc, lastDmg, enemies, alive: enemies.length,
        maxHp: this.maxHp, maxMp: this.maxMp, maxSp: this.maxSp,
        buff: { spark: B.spark, spiritShield: B.spiritShield, protection: B.protection, absorb: B.absorb, haste: B.haste, regen: B.regen, heartseeker: B.heartseeker, hpot: B.hpot, mpot: B.mpot, spot: B.spot },
        channeling: B.channeling.active, stanceOn: !!(stance && /spirit_a/.test(stance.src || '')),
        riddle: !!document.getElementById('riddlecounter'),
        gemReady: !!$(`.bti3>div[onmouseover*="set_infopane_item(${IT.manaGem})"]`),
        cannonReady: !!cannonBtn(), firstRound: this.prev._started !== true, lockedRedId: this.prev.lockedRedId, _started: true,
      };
    }
  }

  // ── 5. 决策大脑 (16 级联 + 4 致命加固) ──────────────────────────────────
  class Brain {
    decide(S) {
      const C = CFG, { hp, mp, sp } = S, oc = S.overcharge, ch = S.channeling, b = S.buff;
      const HM = S.maxHp || CFG.HPMAX, MM = S.maxMp || CFG.MPMAX, SM = S.maxSp || CFG.SPMAX; // 动态满值(自适应)
      const hasRed = S.enemies.some(e => e.is_red_boss);
      const danger = Math.max(S.lastDmg, hasRed ? C.BURST_EST * HM : 0.30 * HM); // ②
      const predicted = hp - danger, PANIC = (hasRed ? C.PANIC_RED : C.PANIC_NORM) * HM;
      const mpFree = Math.max(0, mp - C.SPARK_RESERVE); // ①
      const heavy = S.lastDmg > 0.30 * HM, sparkCost = ch ? C.SPARK_RESERVE * 0.5 : C.SPARK_RESERVE;
      const A = (t, id) => ({ type: t, id, exec: t === 'spell' ? () => Exec.skill(id) : t === 'item' ? () => Exec.item(id) : () => Exec.attack(id) });

      if (S.riddle) { const r = this.riddle(S); return r?.confident ? { type: 'riddle', option: r.option, exec: () => $(r.option)?.click() } : { type: 'skip', note: 'riddle留人工' }; } // P0
      if (!b.spark.active || b.spark.turns <= 2) { // P1 ①③
        if (mp >= sparkCost) return A('spell', SK.Spark);
        if (!b.spark.active) return hp < 0.6 * HM ? A('item', IT.hElixir) : { type: 'defend', exec: Exec.defend, note: 'Spark真空+缺MP硬抗' };
        return S.gemReady ? A('item', IT.manaGem) : A('item', IT.mElixir);
      }
      if (hp < PANIC || predicted < PANIC) return (mp >= C.MP_LOW * MM || ch) ? A('spell', SK.FullCure) : A('item', IT.hElixir); // P2 ②
      // P2.5 Channeling主动利用: 折扣窗口(1MP+50%)挑队列里最该补的最贵技能(保命已在P0-P2之前, 不抢)
      if (ch && C.useChanneling !== false) {
        for (const q of CHANNEL_Q) {
          if (!q.need(b, S)) continue;
          if (q.hostile) { const t = this.lockTarget(S); if (t) return this.castOnRed(q.id, t, S); continue; }
          return A('spell', q.id);
        }
      }
      if (mp < C.MP_FUSE * MM && !ch && (b.spark.turns <= 2 || b.spiritShield.turns <= 2 || b.protection.turns <= 2)) return S.gemReady ? A('item', IT.manaGem) : (!b.mpot.active ? A('item', IT.mDraught) : A('item', IT.mElixir)); // P3 ④(节流:长效药冷却中改秘药)
      if (C.scrollFirst && ((!b.spiritShield.active && !b.protection.active) || S.firstRound)) return A('item', IT.scrollProt); // P4 卷轴一键铺墙(scrollFirst关→走下面法术逐个补,省卷轴)
      if (!b.protection.active || b.protection.turns <= 1) return mp >= sparkCost ? A('spell', SK.Protection) : (S.gemReady ? A('item', IT.manaGem) : A('item', IT.scrollProt)); // ③
      if (!b.spiritShield.active || b.spiritShield.turns <= 1) return mp >= sparkCost ? A('spell', SK.SpiritShield) : (S.gemReady ? A('item', IT.manaGem) : A('item', IT.scrollProt));
      const isMagic = false; // P5 TODO: 接入"当前怪是否法系"
      if (isMagic && (!b.absorb.active || b.absorb.turns <= 1)) return A('spell', SK.Absorb);
      if (!b.haste.active || b.haste.turns <= 1) return A('spell', SK.Haste); // P7
      if (heavy && hp < C.HP_HEAL * HM && !b.hpot.active) return A('item', IT.hDraught); // 重击波垫血(节流)
      if (!b.regen.active || b.regen.turns <= 1) return A('spell', SK.Regen); // P8
      if (mpFree < C.MP_LOW * MM) { if (S.gemReady) return A('item', IT.manaGem); if (!b.mpot.active) return A('item', IT.mDraught); } // P9 回MP(节流:manapot在=刚喝长效药冷却中,不重复喝→改去攻击防卡死; Gem不受冷却)
      if (hp < C.HP_HEAL * HM && !b.hpot.active) return A('item', IT.hDraught); // P10 回HP(节流)
      if (sp < C.SP_LOW * SM && S.stanceOn && !b.spot.active) return A('item', IT.sDraught); // P11 回SP(节流)
      if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn) return { type: 'stance', exec: Exec.stance }; // P12
      if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: 'stance', exec: Exec.stance };
      const tgt = this.lockTarget(S);
      if (tgt?.is_red_boss) { // P13 红怪减益序列(表驱动: Weaken→Imperil; 定向commit红怪, 修打错目标)
        for (const d of DEBUFFS) {
          if (C[d.cfg] === false) continue;          // 控制台开关
          if (tgt.debuff[d.key]) continue;           // 已挂该减益
          if (!(ch || mpFree >= C.MP_LOW * MM)) break; // MP不够: 整块让位给后续输出
          return this.castOnRed(d.id, tgt, S);
        }
      }
      if ((!b.heartseeker.active || b.heartseeker.turns <= 1) && S.alive >= C.HS_MIN_ENEMIES && (ch || mpFree >= 0.40 * MM)) return A('spell', SK.Heartseeker); // P14
      if (C.useCannon && S.alive >= C.CANNON_MIN_ENEMIES && S.cannonReady && Date.now() - _lastCannon > C.cannonCdMs) return { type: 'cannon', exec: Exec.cannon }; // P15 (开 + 冷却节流防卡)
      const trash = S.enemies.filter(e => !e.is_red_boss && e.alive); // P16 破甲滚雪球
      if (trash.length) return A('attack', trash.sort((a, c) => a.eid - c.eid)[0].eid);
      if (tgt) { S.lockedRedId = tgt.eid; return A('attack', tgt.eid); }
      return { type: 'defend', exec: Exec.defend };
    }
    lockTarget(S) { const live = S.enemies.filter(e => e.is_red_boss && e.alive); return (S.lockedRedId && live.find(e => e.eid === S.lockedRedId)) || live[0] || null; }
    castOnRed(id, tgt, S) { S.lockedRedId = tgt.eid; return { type: 'spell', id, exec: () => Exec.castHostileOn(id, tgt.eid) }; } // 定向红怪释放 hostile 减益
    riddle() { return null; } // 小马图: 默认留人工(接图像识别后返回 {confident, option})
  }

  // ── 6. UI (一键开关 + HUD) ──────────────────────────────────────────────
  class UI {
    constructor() { this.last = ''; this.panelOpen = Store.get('panelOpen', false); }
    mount() {
      if (document.getElementById('hvsb-ui') || !document.body) return;
      const box = document.createElement('div'); box.id = 'hvsb-ui';
      box.innerHTML = this._html();
      document.body.appendChild(box);
      box.querySelector('#hb-toggle').onclick = () => this.toggle();
      box.querySelector('#hb-gear').onclick = () => { this.panelOpen = !this.panelOpen; Store.set('panelOpen', this.panelOpen); this._applyPanel(); };
      box.querySelectorAll('[data-k]').forEach(el => el.onchange = () => {
        const k = el.dataset.k, v = el.type === 'checkbox' ? el.checked : (el.dataset.pct ? (parseFloat(el.value) || 0) / 100 : parseFloat(el.value) || 0);
        CFG[k] = v; const saved = Store.get('cfg', {}); saved[k] = v; Store.set('cfg', saved);
      });
      this._applyPanel(); this.refresh();
      this._vitalTimer = setInterval(() => this.paintVitalPct(), 300); // 血条居中百分比
      this._hideDodying();
    }
    _hideDodying() { // 藏掉 dodying 面板里 B 已接管的失效标签页(恢复/引导/BUFF/DEBUFF/卷轴/其他技能)
      if (document.getElementById('hb-hide')) return;
      const s = document.createElement('style'); s.id = 'hb-hide';
      s.textContent = '.hvAATabmenu>span[name="Recovery"],.hvAATabmenu>span[name="Channel"],.hvAATabmenu>span[name="Buff"],.hvAATabmenu>span[name="Debuff"],.hvAATabmenu>span[name="Scroll"],.hvAATabmenu>span[name="Skill"]{display:none!important}';
      (document.head || document.documentElement).appendChild(s);
    }
    _html() {
      const bar = id => `<div class="hb-bar"><i id="${id}"></i><span id="${id}t"></span></div>`;
      const grp = (t, r) => `<div class="hb-grp"><div class="hb-gh">${t}</div>${r}</div>`;
      const pctRow = (k, l) => `<label class="hb-row"><span>${l}</span><span class="hb-in"><input type="number" data-k="${k}" data-pct="1" min="0" max="100" value="${Math.round((CFG[k] || 0) * 100)}">%</span></label>`;
      const numRow = (k, l) => `<label class="hb-row"><span>${l}</span><input type="number" data-k="${k}" value="${CFG[k]}"></label>`;
      const swRow = (k, l) => `<label class="hb-row"><span>${l}</span><input type="checkbox" data-k="${k}" ${CFG[k] ? 'checked' : ''}></label>`;
      return `<style>${this._css()}</style>
        <div class="hb-top"><button id="hb-toggle" class="hb-sw"></button><b class="hb-name">🛡 盾战大脑</b><button id="hb-gear" class="hb-gear">⚙</button></div>
        <div class="hb-hud">${bar('hb-hp')}${bar('hb-mp')}${bar('hb-sp')}${bar('hb-oc')}<div class="hb-meta"><span id="hb-mon">怪 -</span><span id="hb-act">-</span></div></div>
        <div id="hb-panel" class="hb-panel">
          ${grp('喝药线', pctRow('PANIC_RED', '急救血') + pctRow('HP_HEAL', '常规喝血') + pctRow('MP_LOW', '回蓝') + pctRow('SP_LOW', '喝灵力'))}
          ${grp('灵动架式', pctRow('OC_ON', '鬥气开') + pctRow('OC_OFF', '鬥气关'))}
          ${grp('开关', swRow('useCannon', '自动小马炮') + swRow('scrollFirst', '起手用卷轴(关=省卷轴)') + swRow('useWeaken', '红怪铺Weaken') + swRow('useImperil', '红怪铺Imperil') + swRow('useChanneling', 'Channeling增益'))}
          ${grp('节奏', numRow('delayMin', '延迟min(ms)') + numRow('delayMax', '延迟max(ms)'))}
        </div>`;
    }
    _applyPanel() { const p = document.getElementById('hb-panel'); if (p) p.style.display = this.panelOpen ? 'block' : 'none'; }
    _css() {
      return `#hvsb-ui{position:fixed;right:10px;bottom:10px;z-index:99999;width:192px;font:12px/1.4 system-ui,-apple-system,sans-serif;color:#dce3f0;background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;box-shadow:0 6px 22px rgba(0,0,0,.5)}
#hvsb-ui .hb-top{display:flex;align-items:center;gap:7px;margin-bottom:7px}
#hvsb-ui .hb-name{flex:1;font-size:12px;opacity:.92}
#hvsb-ui .hb-sw{cursor:pointer;border:0;border-radius:6px;padding:3px 10px;font:bold 12px system-ui;color:#fff}
#hvsb-ui .hb-gear{cursor:pointer;border:0;background:none;color:#9aa;font-size:14px;padding:0}
#hvsb-ui .hb-bar{position:relative;height:14px;background:rgba(255,255,255,.08);border-radius:7px;margin:3px 0;overflow:hidden}
#hvsb-ui .hb-bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:7px;transition:width .25s}
#hvsb-ui #hb-hp{background:#4caf50}#hvsb-ui #hb-mp{background:#3b82f6}#hvsb-ui #hb-sp{background:#ef4444}#hvsb-ui #hb-oc{background:#f59e0b}
#hvsb-ui .hb-bar span{position:absolute;inset:0;text-align:center;font:10px/14px monospace;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.7)}
#hvsb-ui .hb-meta{display:flex;justify-content:space-between;font-size:10px;opacity:.7;margin-top:4px}
#hvsb-ui .hb-panel{margin-top:8px;border-top:1px solid rgba(255,255,255,.1);padding-top:6px;max-height:46vh;overflow:auto}
#hvsb-ui .hb-grp{margin-bottom:8px}
#hvsb-ui .hb-gh{font-size:9px;letter-spacing:.5px;opacity:.5;text-transform:uppercase;margin:2px 0 3px}
#hvsb-ui .hb-row{display:flex;align-items:center;justify-content:space-between;font-size:11px;padding:2px 0;gap:6px}
#hvsb-ui .hb-row>span:first-child{flex:1;opacity:.85}
#hvsb-ui .hb-in{opacity:.75}
#hvsb-ui .hb-row input[type=number]{width:44px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#fff;font:11px monospace;padding:1px 4px;text-align:right}
#hvsb-ui .hb-row input[type=checkbox]{accent-color:#3a7;width:15px;height:15px;cursor:pointer}`;
    }
    paintVitalPct() { // 在 HP/MP/SP 条上居中显示整齐百分比
      for (const id of ['vbh', 'vbm', 'vbs']) {
        const bar = document.getElementById(id); if (!bar || !bar.offsetWidth) continue;
        const img = bar.querySelector('div>img'); if (!img) continue;
        const pct = Math.round(img.offsetWidth / bar.offsetWidth * 100);
        let lbl = bar.querySelector('.hvsb-pct');
        if (!lbl) {
          lbl = document.createElement('div'); lbl.className = 'hvsb-pct';
          lbl.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;font:bold 12px/1 sans-serif;color:rgba(0,0,0,.5);pointer-events:none;z-index:2';
          if (getComputedStyle(bar).position === 'static') bar.style.position = 'relative';
          bar.appendChild(lbl);
        }
        lbl.textContent = pct + '%';
      }
    }
    toggle() { Store.set('on', !Store.get('on', false)); this.refresh(); }
    refresh() { const on = Store.get('on', false), b = document.getElementById('hb-toggle'); if (b) { b.textContent = on ? '🧠 自动' : '⏸ 暂停'; b.style.background = on ? '#3a7' : '#a55'; b.style.color = '#fff'; } }
    update(S, a) {
      this.last = a ? `${a.type}${a.id ? ':' + a.id : ''}` : '';
      if (!S) return;
      const pct = (v, m) => isNaN(v) ? 0 : Math.min(100, Math.round(v / m * 100));
      const set = (id, v, m, name) => { const i = document.getElementById(id), t = document.getElementById(id + 't'); const p = pct(v, m); if (i) i.style.width = p + '%'; if (t) t.textContent = `${name} ${p}%`; };
      set('hb-hp', S.hp, S.maxHp || CFG.HPMAX, 'HP'); set('hb-mp', S.mp, S.maxMp || CFG.MPMAX, 'MP');
      set('hb-sp', S.sp, S.maxSp || CFG.SPMAX, 'SP'); set('hb-oc', S.overcharge, CFG.OCMAX, 'OC');
      const mon = document.getElementById('hb-mon'), act = document.getElementById('hb-act');
      if (mon) mon.textContent = '怪 ' + S.alive; if (act) act.textContent = this.last;
    }
  }

  // ── 7. 组装 + 主循环钩子 ────────────────────────────────────────────────
  const reader = new StateReader(), brain = new Brain(), ui = new UI();
  const enabled = () => Store.get('on', false);
  let _wd = null;
  function step() {
    if (_wd) { clearTimeout(_wd); _wd = null; }
    if (!enabled() || !document.getElementById('vrhd')) return null; // B关 或 不在战斗页
    const S = reader.read(), a = brain.decide(S);
    if (a?.exec) setTimeout(() => { try { a.exec(); } catch (e) {} }, CFG.delayMin + Math.floor(Math.random() * Math.max(1, CFG.delayMax - CFG.delayMin))); // 动作间随机延迟(CFG.delayMin~Max): 拟人+防过快+等DOM
    reader.prev = S; ui.update(S, a);
    _wd = setTimeout(step, 1500); // 看门狗(>动作延迟上限): 动作未推进战斗时自补一拍防卡死
    return a;
  }
  if (document.body) ui.mount(); else addEventListener('DOMContentLoaded', () => ui.mount());

  // 暴露: dodying 焊接点调用 step(); enabled() 决定是否接管
  window.HVShieldBrain = {
    step, enabled, toggle: () => ui.toggle(), mountUI: () => ui.mount(),
    read: () => reader.read(), decide: S => brain.decide(S),
    get lastXHR() { return reader.lastXHR; }, CFG,
    setCfg: (k, v) => { CFG[k] = v; const s = Store.get('cfg', {}); s[k] = v; Store.set('cfg', s); }, // 控制台持久化调参

  };
})();
