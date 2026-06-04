// ==UserScript==
// @name         [HV] 自动战斗 · 盾战大脑
// @namespace    https://github.com/local/hv-autobattle
// @version      0.1.0
// @author       local
// @description  HV 单手盾战现代化半自动辅助(独立重写,忠实翻写 dodying 引擎)
// @match        *://hentaiverse.org/*
// @match        *://alt.hentaiverse.org/*
// @match        *://e-hentai.org/*
// @connect      hentaiverse.org
// @connect      e-hentai.org
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const CSS = `
#hvab-root{position:fixed;right:10px;bottom:10px;z-index:99999;width:204px;font:12px/1.4 system-ui,-apple-system,sans-serif;color:#dce3f0}
#hvab-hud{background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;box-shadow:0 6px 22px rgba(0,0,0,.5)}
#hvab-hud .hvab-top{display:flex;align-items:center;gap:7px;margin-bottom:6px}
#hvab-hud .hvab-name{flex:1;font-size:12px;opacity:.92}
#hvab-sw{cursor:pointer;border:0;border-radius:6px;padding:3px 10px;font:bold 12px system-ui;color:#fff;background:#a55}
#hvab-gear{cursor:pointer;border:0;background:none;color:#9aa;font-size:14px;padding:0}
.hvab-bar{position:relative;height:14px;background:rgba(255,255,255,.08);border-radius:7px;margin:3px 0;overflow:hidden}
.hvab-bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:7px;transition:width .25s}
#hvab-hp{background:#4caf50}#hvab-mp{background:#3b82f6}#hvab-sp{background:#ef4444}#hvab-oc{background:#f59e0b}
.hvab-bar span{position:absolute;inset:0;text-align:center;font:10px/14px monospace;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.7)}
#hvab-panel{margin-top:8px;background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;display:none}
#hvab-panel.open{display:block}
.hvab-tabs{display:flex;gap:4px;margin-bottom:8px}
.hvab-tab{flex:1;cursor:pointer;border:0;border-radius:6px;padding:4px 0;font-size:11px;background:rgba(255,255,255,.08);color:#bcd}
.hvab-tab.active{background:#3a7;color:#fff}
.hvab-tabpane{display:none}
.hvab-tabpane.active{display:block}
.hvab-empty{opacity:.5;font-size:11px;padding:10px 0;text-align:center}
`;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  function el(tag, attrs = {}, html = "") {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html) e.innerHTML = html;
    return e;
  }
  function onReady(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }
  class Bus {
    constructor() {
      this.map = /* @__PURE__ */ new Map();
    }
    on(type, fn) {
      let set = this.map.get(type);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        this.map.set(type, set);
      }
      set.add(fn);
      return () => {
        var _a;
        (_a = this.map.get(type)) == null ? void 0 : _a.delete(fn);
      };
    }
    emit(type, payload) {
      var _a;
      (_a = this.map.get(type)) == null ? void 0 : _a.forEach((fn) => {
        try {
          fn(payload);
        } catch {
        }
      });
    }
  }
  const bus = new Bus();
  const PREFIX = "hvab_";
  const Store = {
    get(key, def) {
      try {
        if (typeof GM_getValue === "function") return GM_getValue(PREFIX + key, def);
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? def : JSON.parse(raw);
      } catch {
        return def;
      }
    },
    set(key, val) {
      try {
        if (typeof GM_setValue === "function") GM_setValue(PREFIX + key, val);
        else localStorage.setItem(PREFIX + key, JSON.stringify(val));
      } catch {
      }
    }
  };
  const DEFAULT_CONFIG = {
    // ── M1 界面态 ──
    enabled: false,
    // B大脑总开关 (🧠自动 / ⏸暂停)
    panelOpen: false,
    // 抽屉是否展开
    activeTab: "battle",
    // ── M2 战斗常量(玩家实测换算; 动态满值会自适应覆盖) ──
    HPMAX: 24232,
    MPMAX: 2002,
    SPMAX: 1470,
    OCMAX: 250,
    SPARK_RESERVE: 340,
    // ① 永久预留可放 Spark 的 MP
    BURST_EST: 0.45,
    // ② 满暴击连击波(占血池)
    PANIC_RED: 0.5,
    PANIC_NORM: 0.25,
    MP_FUSE: 0.3,
    // ④ MP 熔断阈值
    HP_HEAL: 0.6,
    MP_LOW: 0.35,
    SP_LOW: 0.3,
    OC_ON: 0.4,
    OC_OFF: 0.22,
    HS_MIN_ENEMIES: 2,
    CANNON_MIN_ENEMIES: 4,
    // ── M2 开关/节奏 ──
    useCannon: true,
    cannonCdMs: 22e3,
    // 小马炮冷却节流(放完 22s 内不重放防卡)
    scrollFirst: true,
    // 起手/2墙缺优先卷轴(关=法术逐个补省卷轴)
    delayMin: 160,
    delayMax: 400,
    // 动作间随机延迟范围(ms)
    useWeaken: true,
    useImperil: true,
    // 红怪减益序列开关
    useChanneling: true
    // Channeling 主动利用
  };
  let current = { ...DEFAULT_CONFIG, ...Store.get("config", {}) };
  const config = {
    get(key) {
      return current[key];
    },
    set(key, val) {
      const next = { ...current };
      next[key] = val;
      current = next;
      Store.set("config", current);
    },
    all() {
      return current;
    }
  };
  function createHud(onToggle, onGear) {
    const hud = el("div", { id: "hvab-hud" });
    const bar = (id, name) => `<div class="hvab-bar"><i id="hvab-${id}"></i><span id="hvab-${id}t">${name} -</span></div>`;
    hud.innerHTML = `
    <div class="hvab-top">
      <button id="hvab-sw"></button>
      <b class="hvab-name">🛡 盾战大脑</b>
      <button id="hvab-gear">⚙</button>
    </div>
    ${bar("hp", "HP")}${bar("mp", "MP")}${bar("sp", "SP")}${bar("oc", "OC")}
    <div id="hvab-meta" style="font-size:10px;opacity:.7;margin-top:4px">怪 - · 待战斗</div>`;
    const sw = hud.querySelector("#hvab-sw");
    const refresh = () => {
      const on = config.get("enabled");
      sw.textContent = on ? "🧠 自动" : "⏸ 暂停";
      sw.style.background = on ? "#3a7" : "#a55";
    };
    sw.onclick = () => {
      onToggle();
      refresh();
    };
    hud.querySelector("#hvab-gear").onclick = onGear;
    refresh();
    bus.on("hud:update", (d) => {
      const setBar = (key, v, m, name) => {
        const i = document.getElementById("hvab-" + key);
        const t = document.getElementById("hvab-" + key + "t");
        const p = isNaN(v) || !m ? 0 : Math.min(100, Math.round(v / m * 100));
        if (i) i.style.width = p + "%";
        if (t) t.textContent = `${name} ${p}%`;
      };
      setBar("hp", d.hp, d.maxHp, "HP");
      setBar("mp", d.mp, d.maxMp, "MP");
      setBar("sp", d.sp, d.maxSp, "SP");
      setBar("oc", d.oc, config.get("OCMAX"), "OC");
      const meta = document.getElementById("hvab-meta");
      if (meta) meta.textContent = `怪 ${d.alive}  ▶ ${d.action || "-"}`;
    });
    return hud;
  }
  function section(title) {
    return el("div", { class: "hvab-section" }, `<div class="hvab-empty">${title} · 待 M2+ 接入配置项</div>`);
  }
  const TABS = [
    { key: "battle", label: "战斗" },
    { key: "farm", label: "连刷" },
    { key: "guard", label: "保护" },
    { key: "notify", label: "提醒" }
  ];
  function createPanel() {
    const panel = el("div", { id: "hvab-panel" });
    const tabs = el("div", { class: "hvab-tabs" });
    const panes = el("div", { class: "hvab-panes" });
    let active = config.get("activeTab");
    const render = () => {
      tabs.querySelectorAll(".hvab-tab").forEach(
        (b) => b.classList.toggle("active", b.dataset.tab === active)
      );
      panes.querySelectorAll(".hvab-tabpane").forEach(
        (p) => p.classList.toggle("active", p.dataset.pane === active)
      );
    };
    for (const t of TABS) {
      const btn = el("button", { class: "hvab-tab", "data-tab": t.key }, t.label);
      btn.onclick = () => {
        active = t.key;
        config.set("activeTab", t.key);
        render();
      };
      tabs.appendChild(btn);
      const pane = el("div", { class: "hvab-tabpane", "data-pane": t.key });
      pane.appendChild(section(t.label));
      panes.appendChild(pane);
    }
    panel.appendChild(tabs);
    panel.appendChild(panes);
    render();
    return panel;
  }
  function togglePanel(panel, open) {
    panel.classList.toggle("open", open);
  }
  const SK = {
    Weaken: 212,
    Imperil: 213,
    Regen: 312,
    FullCure: 313,
    Protection: 411,
    Haste: 412,
    Spark: 422,
    SpiritShield: 423,
    Heartseeker: 431
  };
  const IT = {
    hDraught: 11191,
    hElixir: 11199,
    mDraught: 11291,
    mElixir: 11299,
    sDraught: 11391,
    scrollProt: 13111,
    manaGem: 10006
  };
  const BUFF_IMG = {
    spark: "sparklife",
    spiritShield: "spiritshield",
    protection: "protection",
    absorb: "absorb",
    haste: "haste",
    regen: "regen",
    heartseeker: "heartseeker",
    channeling: "channeling",
    blessing: "riddlemaster",
    // 御谜士的祝福(Blessing of the RiddleMaster); 匹配 onmouseover buff 名里的 'RiddleMaster', 不再依赖图标文件名
    hpot: "healthpot",
    mpot: "manapot",
    spot: "spiritpot"
  };
  const DEBUFFS = [
    { key: "weaken", id: SK.Weaken, cfg: "useWeaken", img: /weaken/i },
    { key: "imperil", id: SK.Imperil, cfg: "useImperil", img: /imperil/i }
  ];
  const CHANNEL_Q = [
    { id: SK.Spark, need: (b) => !b.spark.active || b.spark.turns <= 2 },
    { id: SK.SpiritShield, need: (b) => !b.spiritShield.active || b.spiritShield.turns <= 1 },
    { id: SK.Protection, need: (b) => !b.protection.active || b.protection.turns <= 1 },
    {
      id: SK.Imperil,
      hostile: true,
      need: (_b, S) => {
        const t = S.enemies.find((e) => e.is_red_boss && e.alive);
        return !!t && !t.debuff.imperil;
      }
    },
    {
      id: SK.Heartseeker,
      need: (b, S) => (!b.heartseeker.active || b.heartseeker.turns <= 1) && S.alive >= config.get("HS_MIN_ENEMIES")
    }
  ];
  const cannonBtn = () => [...document.querySelectorAll("#pane_skill [onmouseover]")].find(
    (e) => /Friendship|Cannon/i.test(e.getAttribute("onmouseover") || "")
  );
  class StateReader {
    constructor() {
      this.prev = {};
      this.maxHp = 0;
      this.maxMp = 0;
      this.maxSp = 0;
    }
    /** 取元素第一个数字组, 无视百分比插件注入的 [88%] 等 */
    _num(id) {
      const e = document.getElementById(id);
      const m = e && (e.textContent || "").match(/\d+/);
      return m ? parseInt(m[0]) : NaN;
    }
    /** buff 剩余回合(【待 GF 实测核对读法】) */
    _expire(img) {
      var _a, _b;
      const ex = (_a = img.parentElement) == null ? void 0 : _a.querySelector('[id*="expire"]');
      const n = ex ? parseInt(((_b = (ex.textContent || "").match(/\d+/)) == null ? void 0 : _b[0]) ?? "") : NaN;
      return isNaN(n) ? 99 : n;
    }
    /** 解析所有 buff 图标(含 channeling) */
    _buffs() {
      const imgs = $$("#pane_effects>img");
      const out = {};
      for (const k in BUFF_IMG) {
        const kw = BUFF_IMG[k].toLowerCase();
        const im = imgs.find((i) => {
          var _a;
          const src = (i.getAttribute("src") || "").toLowerCase();
          const name = (((_a = (i.getAttribute("onmouseover") || "").match(/set_infopane_effect\('([^']*)'/)) == null ? void 0 : _a[1]) || "").toLowerCase();
          return src.includes(kw) || name.includes(kw);
        });
        out[k] = im ? { active: true, turns: this._expire(im) } : { active: false, turns: 0 };
      }
      return out;
    }
    read() {
      const C = config.all();
      const hp = this._num("vrhd"), mp = this._num("vrm"), sp = this._num("vrs");
      if (hp) this.maxHp = Math.max(this.maxHp || C.HPMAX, hp);
      if (mp) this.maxMp = Math.max(this.maxMp || C.MPMAX, mp);
      if (sp) this.maxSp = Math.max(this.maxSp || C.SPMAX, sp);
      const vcp = document.getElementById("vcp"), barEl = vcp == null ? void 0 : vcp.firstElementChild;
      const oc = vcp && barEl && vcp.offsetWidth ? Math.round(barEl.offsetWidth / vcp.offsetWidth * C.OCMAX) : 0;
      const B = this._buffs();
      const stance = document.getElementById("ckey_spirit");
      const enemies = $$('[id^="mkey_"]').map((m) => {
        const eid = +m.id.split("_")[1];
        const dimg = $$(".btm6 img", m).map((i) => i.getAttribute("src") || "");
        const debuff = {};
        for (const d of DEBUFFS) debuff[d.key] = dimg.some((s) => d.img.test(s));
        return {
          eid,
          alive: !/opacity/.test(m.getAttribute("style") || ""),
          is_red_boss: !!$('.btm2[style*="background"]', m),
          debuff,
          penArmor: dimg.some((s) => /penetrat|bleed/i.test(s))
        };
      }).filter((e) => e.alive);
      const lastDmg = typeof this.prev.hp === "number" && this.prev.hp > hp ? this.prev.hp - hp : 0;
      const buff = {
        spark: B.spark,
        spiritShield: B.spiritShield,
        protection: B.protection,
        absorb: B.absorb,
        haste: B.haste,
        regen: B.regen,
        heartseeker: B.heartseeker,
        blessing: B.blessing,
        hpot: B.hpot,
        mpot: B.mpot,
        spot: B.spot
      };
      return {
        hp,
        mp,
        sp,
        overcharge: oc,
        lastDmg,
        enemies,
        alive: enemies.length,
        maxHp: this.maxHp,
        maxMp: this.maxMp,
        maxSp: this.maxSp,
        buff,
        channeling: B.channeling.active,
        stanceOn: !!(stance && /spirit_a/.test(stance.getAttribute("src") || "")),
        riddle: !!document.getElementById("riddlecounter"),
        canContinue: !!document.getElementById("btcp"),
        gemReady: !!$(`.bti3>div[onmouseover*="set_infopane_item(${IT.manaGem})"]`),
        cannonReady: !!$$("#pane_skill [onmouseover]").find(
          (e) => /Friendship|Cannon/i.test(e.getAttribute("onmouseover") || "")
        ),
        scrollReady: !!$(`.bti3>div[onmouseover*="set_infopane_item(${IT.scrollProt})"]`),
        firstRound: this.prev._started !== true,
        lockedRedId: this.prev.lockedRedId,
        _started: true
      };
    }
  }
  const reader = new StateReader();
  let _lastCannon = 0;
  const lastCannon = () => _lastCannon;
  const Exec = {
    /** 通用法术: 读 onclick 自动区分 friendly(touch_and_go 自动)/hostile(选中后对第一个活怪 commit) */
    skill(id) {
      const e = document.getElementById(String(id));
      if (!e) return false;
      const oc = e.getAttribute("onclick") || "";
      e.click();
      if (/set_hostile_skill/.test(oc)) {
        const m = document.querySelector('[id^="mkey_"]:not([style*="opacity"])');
        if (m) return Exec.attack(parseInt(m.id.split("_")[1]));
      }
      return true;
    },
    /** 用物品(quickbar 物品悬浮触发器) */
    item(db) {
      const e = document.querySelector(`.bti3>div[onmouseover*="set_infopane_item(${db})"]`);
      return e ? (e.click(), true) : false;
    },
    /** 平砍指定怪: 优先页面 battle.commit_target(unsafeWindow), 退回点 mkey 元素 */
    attack(n) {
      var _a;
      const w = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      if ((_a = w.battle) == null ? void 0 : _a.commit_target) {
        w.battle.commit_target(n);
        return true;
      }
      const e = document.getElementById("mkey_" + n);
      return e ? (e.click(), true) : false;
    },
    /** 切换灵动架式 */
    stance() {
      const e = document.getElementById("ckey_spirit");
      return e ? (e.click(), true) : false;
    },
    /** 防御 */
    defend() {
      const e = document.getElementById("ckey_defend");
      return e ? (e.click(), true) : false;
    },
    /** 小马炮(hostile AOE): 记时间用于冷却节流 */
    cannon() {
      const c = cannonBtn();
      if (!c) return false;
      const id = parseInt(c.id);
      const r = Number.isNaN(id) ? (c.click(), true) : Exec.skill(id);
      if (r) _lastCannon = Date.now();
      return r;
    },
    /** hostile 定向: 选中技能后 commit 指定红怪 eid(修"打第一个怪"); 找不到 eid 退回通用 skill */
    castHostileOn(id, eid) {
      const e = document.getElementById(String(id));
      if (!e) return false;
      e.click();
      const m = document.getElementById("mkey_" + eid);
      return m ? Exec.attack(eid) : Exec.skill(id);
    },
    /** 胜利后继续下一波(GF/Arena 波次推进): battle.battle_continue() 优先, 退回点 #btcp */
    continueBattle() {
      var _a;
      const w = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      if ((_a = w.battle) == null ? void 0 : _a.battle_continue) {
        w.battle.battle_continue();
        return true;
      }
      const e = document.getElementById("btcp");
      return e ? (e.click(), true) : false;
    }
  };
  class Brain {
    decide(S) {
      const C = config.all();
      const { hp, mp, sp } = S, oc = S.overcharge, ch = S.channeling, b = S.buff;
      const HM = S.maxHp || C.HPMAX, MM = S.maxMp || C.MPMAX, SM = S.maxSp || C.SPMAX;
      const hasRed = S.enemies.some((e) => e.is_red_boss);
      const danger = Math.max(S.lastDmg, hasRed ? C.BURST_EST * HM : 0.3 * HM);
      const predicted = hp - danger, PANIC = (hasRed ? C.PANIC_RED : C.PANIC_NORM) * HM;
      const mpFree = Math.max(0, mp - C.SPARK_RESERVE);
      const heavy = S.lastDmg > 0.3 * HM, sparkCost = ch ? C.SPARK_RESERVE * 0.5 : C.SPARK_RESERVE;
      const A = (t, id) => ({
        type: t,
        id,
        exec: t === "spell" ? () => Exec.skill(id) : t === "item" ? () => Exec.item(id) : () => Exec.attack(id)
      });
      if (S.riddle) {
        const r = this.riddle();
        return r ? { type: "riddle", option: r.option, exec: () => {
          var _a;
          return (_a = document.querySelector(r.option)) == null ? void 0 : _a.click();
        } } : { type: "skip", note: "riddle留人工" };
      }
      if (S.canContinue) return { type: "continue", exec: () => Exec.continueBattle() };
      if (!b.spark.active || b.spark.turns <= 2) {
        if (mp >= sparkCost) return A("spell", SK.Spark);
        if (!b.spark.active)
          return hp < 0.6 * HM ? A("item", IT.hElixir) : { type: "defend", exec: Exec.defend, note: "Spark真空+缺MP硬抗" };
        return S.gemReady ? A("item", IT.manaGem) : A("item", IT.mElixir);
      }
      if (hp < PANIC || predicted < PANIC)
        return mp >= C.MP_LOW * MM || ch ? A("spell", SK.FullCure) : A("item", IT.hElixir);
      if (ch && C.useChanneling !== false) {
        for (const q of CHANNEL_Q) {
          if (!q.need(b, S)) continue;
          if (q.hostile) {
            const t = this.lockTarget(S);
            if (t) return this.castOnRed(q.id, t, S);
            continue;
          }
          return A("spell", q.id);
        }
      }
      if (mp < C.MP_FUSE * MM && !ch && (b.spark.turns <= 2 || b.spiritShield.turns <= 2 || b.protection.turns <= 2))
        return S.gemReady ? A("item", IT.manaGem) : !b.mpot.active ? A("item", IT.mDraught) : A("item", IT.mElixir);
      const ssDown = !b.spiritShield.active || b.spiritShield.turns <= 1;
      const prDown = !b.protection.active || b.protection.turns <= 1;
      if (C.scrollFirst && S.scrollReady && ssDown && prDown)
        return A("item", IT.scrollProt);
      if (prDown)
        return mp >= sparkCost ? A("spell", SK.Protection) : S.gemReady ? A("item", IT.manaGem) : A("item", IT.mElixir);
      if (ssDown)
        return mp >= sparkCost ? A("spell", SK.SpiritShield) : S.gemReady ? A("item", IT.manaGem) : A("item", IT.mElixir);
      if (!b.haste.active || b.haste.turns <= 1) return A("spell", SK.Haste);
      if (heavy && hp < C.HP_HEAL * HM && !b.hpot.active) return A("item", IT.hDraught);
      if (!b.blessing.active && (!b.regen.active || b.regen.turns <= 1)) return A("spell", SK.Regen);
      if (mpFree < C.MP_LOW * MM) {
        if (S.gemReady) return A("item", IT.manaGem);
        if (!b.mpot.active) return A("item", IT.mDraught);
      }
      if (hp < C.HP_HEAL * HM && !b.hpot.active) return A("item", IT.hDraught);
      if (sp < C.SP_LOW * SM && S.stanceOn && !b.spot.active) return A("item", IT.sDraught);
      if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn) return { type: "stance", exec: Exec.stance };
      if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: "stance", exec: Exec.stance };
      const tgt = this.lockTarget(S);
      if (tgt == null ? void 0 : tgt.is_red_boss) {
        for (const d of DEBUFFS) {
          if (C[d.cfg] === false) continue;
          if (tgt.debuff[d.key]) continue;
          if (!(ch || mpFree >= C.MP_LOW * MM)) break;
          return this.castOnRed(d.id, tgt, S);
        }
      }
      if ((!b.heartseeker.active || b.heartseeker.turns <= 1) && S.alive >= C.HS_MIN_ENEMIES && (ch || mpFree >= 0.4 * MM))
        return A("spell", SK.Heartseeker);
      if (C.useCannon && S.alive >= C.CANNON_MIN_ENEMIES && S.cannonReady && Date.now() - lastCannon() > C.cannonCdMs)
        return { type: "cannon", exec: Exec.cannon };
      const trash = S.enemies.filter((e) => !e.is_red_boss && e.alive);
      if (trash.length) return A("attack", trash.sort((a, c) => a.eid - c.eid)[0].eid);
      if (tgt) {
        S.lockedRedId = tgt.eid;
        return A("attack", tgt.eid);
      }
      return { type: "defend", exec: Exec.defend };
    }
    /** 锁定红怪(记忆目标优先, 否则首个活红怪) */
    lockTarget(S) {
      const live = S.enemies.filter((e) => e.is_red_boss && e.alive);
      return S.lockedRedId !== void 0 && live.find((e) => e.eid === S.lockedRedId) || live[0] || null;
    }
    /** 定向红怪释放 hostile 减益 */
    castOnRed(id, tgt, S) {
      S.lockedRedId = tgt.eid;
      return { type: "spell", id, exec: () => Exec.castHostileOn(id, tgt.eid) };
    }
    /** 小马图: 默认留人工(接图像识别后返回 {confident, option}) */
    riddle() {
      return null;
    }
  }
  const brain = new Brain();
  let lastFp = "";
  let actedAt = 0;
  let busyUntil = 0;
  let timer = null;
  function inBattle() {
    return !!document.getElementById("vrhd");
  }
  function fingerprint(S) {
    const buffs = Object.entries(S.buff).filter(([, v]) => v.active).map(([k]) => k).join(",");
    const foes = S.enemies.map((e) => `${e.eid}:${Object.keys(e.debuff).filter((k) => e.debuff[k]).join("")}`).join(",");
    return [S.hp, S.mp, S.sp, S.overcharge, S.alive, foes, buffs, S.channeling ? "ch" : ""].join("|");
  }
  function tick() {
    try {
      if (config.get("enabled") && inBattle() && Date.now() >= busyUntil) {
        const S = reader.read();
        const fp = fingerprint(S);
        const changed = fp !== lastFp;
        const stalled = Date.now() - actedAt > 2500;
        if (changed || stalled) {
          const a = brain.decide(S);
          const action = a ? `${a.type}${a.id ? ":" + a.id : ""}` : "";
          bus.emit("hud:update", {
            hp: S.hp,
            mp: S.mp,
            sp: S.sp,
            oc: S.overcharge,
            maxHp: S.maxHp,
            maxMp: S.maxMp,
            maxSp: S.maxSp,
            alive: S.alive,
            action
          });
          if (a == null ? void 0 : a.exec) {
            const dMin = config.get("delayMin"), dMax = config.get("delayMax");
            const delay = dMin + Math.random() * Math.max(1, dMax - dMin);
            const fn = a.exec;
            setTimeout(() => {
              try {
                fn();
              } catch {
              }
            }, delay);
            busyUntil = Date.now() + delay + 600;
            actedAt = Date.now();
          }
          lastFp = fp;
          reader.prev = S;
        }
      }
    } catch {
    }
    timer = setTimeout(tick, 500);
  }
  function startLoop() {
    if (timer === null) {
      actedAt = Date.now();
      tick();
    }
  }
  let lastBattleResponse = null;
  function hookNet() {
    const xo = XMLHttpRequest.prototype.open;
    const xs = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(_method, url) {
      this.__url = String(url);
      return xo.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
      this.addEventListener("load", () => {
        if (/Battle|api/i.test(this.__url || "")) lastBattleResponse = this.responseText;
      });
      return xs.call(this, body);
    };
    const f = window.fetch;
    if (f) {
      window.fetch = function(...args) {
        const first = args[0];
        const url = typeof first === "string" ? first : first instanceof Request ? first.url : String(first);
        return f.apply(window, args).then((rp) => {
          if (/Battle|api/i.test(url)) {
            rp.clone().text().then((t) => {
              lastBattleResponse = t;
            }).catch(() => {
            });
          }
          return rp;
        });
      };
    }
  }
  function mountUI() {
    if (document.getElementById("hvab-root")) return;
    const root = el("div", { id: "hvab-root" });
    const style = el("style");
    style.textContent = CSS;
    root.appendChild(style);
    const panel = createPanel();
    const hud = createHud(
      () => {
        config.set("enabled", !config.get("enabled"));
      },
      () => {
        const open = !panel.classList.contains("open");
        togglePanel(panel, open);
        config.set("panelOpen", open);
      }
    );
    root.appendChild(hud);
    root.appendChild(panel);
    document.body.appendChild(root);
    if (config.get("panelOpen")) togglePanel(panel, true);
  }
  window.__hvab = {
    getLastBattle: () => lastBattleResponse,
    config
  };
  hookNet();
  onReady(() => {
    mountUI();
    startLoop();
  });

})();