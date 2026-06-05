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
.hvab-info{margin-top:5px;font-size:10px;line-height:1.5;opacity:.82;text-align:center}
#hvab-meta1{opacity:.75;letter-spacing:.3px}
#hvab-meta2{font-weight:600}
.hvab-grp{margin-bottom:8px}
.hvab-gh{font-size:9px;letter-spacing:.5px;opacity:.5;margin:4px 0 3px}
.hvab-row{display:flex;align-items:center;justify-content:space-between;font-size:11px;padding:2px 0;gap:6px}
.hvab-row>span:first-child{flex:1;opacity:.85}
.hvab-in{opacity:.8;display:inline-flex;align-items:center;gap:2px}
.hvab-in em{font-style:normal;opacity:.55;font-size:10px}
.hvab-row input[type=number]{width:46px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#fff;font:11px monospace;padding:1px 4px;text-align:right}
.hvab-row input[type=checkbox]{accent-color:#3a7;width:15px;height:15px;cursor:pointer}
#hvab-logbtn{cursor:pointer;border:0;background:none;color:#9aa;font-size:13px;padding:0}
#hvab-log{position:fixed;right:10px;bottom:10px;z-index:100000;width:min(480px,92vw);max-height:74vh;flex-direction:column;background:rgba(16,18,28,.975);backdrop-filter:blur(9px);border:1px solid rgba(120,140,200,.38);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.6);display:none;color:#dce3f0}
.hvab-log-hd{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.1);flex:0 0 auto;font-size:12px}
.hvab-log-btns button{cursor:pointer;border:0;border-radius:5px;margin-left:4px;padding:3px 8px;font-size:11px;background:rgba(255,255,255,.12);color:#cde}
.hvab-log-btns #hvab-log-clr{background:#a55;color:#fff}
.hvab-log-btns #hvab-log-x{background:none;color:#9aa;font-size:13px;padding:2px 4px}
.hvab-log-body{flex:1 1 auto;overflow:auto;padding:6px 10px;white-space:pre-wrap;word-break:break-word;font:10px/1.5 ui-monospace,Consolas,monospace;color:#bcd}
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
    OC_ON: 0.5,
    // 灵动架式开启阈值: 游戏要 ≥50% 斗气才能开(原 0.4 → OC 40~50% 点架式是空操作 bug)
    OC_OFF: 0.22,
    HS_MIN_ENEMIES: 2,
    CANNON_MIN_ENEMIES: 4,
    CANNON_MIN_OC: 200,
    // 小马炮需 200 斗气(满 250); 不够则游戏把按钮置灰(opacity:0.5)
    // ── M2 开关/节奏 ──
    useCannon: true,
    cannonYieldStance: true,
    // 攒炮时架式让路: 架式每回合烧 10%OC, 一开就永远攒不到 200; 关掉它让 OC 爬满放炮
    cannonCdMs: 1500,
    // 仅防"同回合重复点"的短保护; 真冷却(50回合)与 OC 门控靠按钮置灰检测, 不再用墙钟节流
    scrollFirst: true,
    // 起手/2墙缺优先卷轴(关=法术逐个补省卷轴)
    delayMin: 160,
    delayMax: 400,
    // 动作间随机延迟范围(ms)
    useWeaken: true,
    useImperil: true,
    // 红怪减益序列开关
    useChanneling: true,
    // Channeling 主动利用
    useAbsorb: false,
    // 法系怪吸收墙(默认关; 盾战物防为主, 遇法系怪再开)
    useVitalStrike: true,
    // 要害强击(实测 onclick=set_hostile_skill, castHostileOn 释放机制确认; 连招打已晕眩目标)
    useShieldBash: true,
    // 盾击(同上; 连招给未晕眩目标铺垫, 已晕眩不重复)
    useMercifulBlow: false
    // 最后的慈悲(残血处决; 待怪 HP% 读法, 默认关)
  };
  let current = { ...DEFAULT_CONFIG, ...Store.get("config", {}) };
  const CONFIG_VERSION = 2;
  if (Store.get("configVersion", 0) < CONFIG_VERSION) {
    current.cannonCdMs = DEFAULT_CONFIG.cannonCdMs;
    current.OC_ON = DEFAULT_CONFIG.OC_ON;
    Store.set("config", current);
    Store.set("configVersion", CONFIG_VERSION);
  }
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
  function createHud(onToggle, onGear, onLog) {
    const hud = el("div", { id: "hvab-hud" });
    const bar = (id, name) => `<div class="hvab-bar"><i id="hvab-${id}"></i><span id="hvab-${id}t">${name} -</span></div>`;
    hud.innerHTML = `
    <div class="hvab-top">
      <button id="hvab-sw"></button>
      <b class="hvab-name">🛡 盾战大脑</b>
      <button id="hvab-logbtn" title="战斗日志">📋</button>
      <button id="hvab-gear">⚙</button>
    </div>
    ${bar("hp", "HP")}${bar("mp", "MP")}${bar("sp", "SP")}${bar("oc", "OC")}
    <div class="hvab-info">
      <div id="hvab-meta1">待战斗</div>
      <div id="hvab-meta2">怪 - · ▶ -</div>
    </div>`;
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
    hud.querySelector("#hvab-logbtn").onclick = onLog;
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
      const m1 = document.getElementById("hvab-meta1");
      const m2 = document.getElementById("hvab-meta2");
      const round = d.roundAll ? ` R${d.roundNow}/${d.roundAll}` : "";
      if (m1) m1.textContent = `${d.battleType}${round} · T${d.turn}`;
      if (m2) m2.textContent = `怪 ${d.alive}/${d.monsterTotal} · ▶ ${d.action}`;
    });
    return hud;
  }
  function writeCfg(key, val) {
    config.set(key, val);
  }
  function group(title, ...rows) {
    const g = el("div", { class: "hvab-grp" });
    g.appendChild(el("div", { class: "hvab-gh" }, title));
    rows.forEach((r) => g.appendChild(r));
    return g;
  }
  function pctRow(key, label) {
    const row = el("label", { class: "hvab-row" }, `<span>${label}</span><span class="hvab-in"><input type="number" min="0" max="100" step="1"><em>%</em></span>`);
    const input = row.querySelector("input");
    input.value = String(Math.round(Number(config.get(key)) * 100));
    input.onchange = () => writeCfg(key, (parseFloat(input.value) || 0) / 100);
    return row;
  }
  function numRow(key, label, unit = "") {
    const row = el("label", { class: "hvab-row" }, `<span>${label}</span><span class="hvab-in"><input type="number" step="1"><em>${unit}</em></span>`);
    const input = row.querySelector("input");
    input.value = String(Number(config.get(key)));
    input.onchange = () => writeCfg(key, parseFloat(input.value) || 0);
    return row;
  }
  function swRow(key, label) {
    const row = el("label", { class: "hvab-row" }, `<span>${label}</span><input type="checkbox">`);
    const input = row.querySelector("input");
    input.checked = Boolean(config.get(key));
    input.onchange = () => writeCfg(key, input.checked);
    return row;
  }
  function section(title) {
    return el("div", { class: "hvab-section" }, `<div class="hvab-empty">${title}</div>`);
  }
  const TABS = [
    { key: "battle", label: "战斗" },
    { key: "farm", label: "连刷" },
    { key: "guard", label: "保护" },
    { key: "notify", label: "提醒" }
  ];
  function battlePane() {
    const p = el("div");
    p.appendChild(group("喝药线(低于即补)", pctRow("PANIC_RED", "急救血"), pctRow("HP_HEAL", "常规喝血"), pctRow("MP_LOW", "回蓝"), pctRow("SP_LOW", "喝灵力")));
    p.appendChild(group("灵动架式(斗气)", pctRow("OC_ON", "≥ 开"), pctRow("OC_OFF", "< 关")));
    p.appendChild(group("开关", swRow("useCannon", "自动小马炮"), swRow("scrollFirst", "起手用卷轴"), swRow("useWeaken", "红怪铺虚弱"), swRow("useImperil", "红怪铺陷危"), swRow("useChanneling", "Channeling 增益"), swRow("useAbsorb", "法系怪吸收墙")));
    p.appendChild(group("OC 近战技(非炮场景)", swRow("useVitalStrike", "要害强击"), swRow("useShieldBash", "盾击晕眩"), swRow("useMercifulBlow", "慈悲处决(待HP%)")));
    p.appendChild(group("节奏", numRow("delayMin", "延迟下限", "ms"), numRow("delayMax", "延迟上限", "ms")));
    p.appendChild(group("进阶(谨慎改)", numRow("SPARK_RESERVE", "Spark预留MP"), pctRow("BURST_EST", "暴击波预估"), pctRow("MP_FUSE", "MP熔断线"), numRow("HS_MIN_ENEMIES", "觅心最少怪"), numRow("CANNON_MIN_ENEMIES", "炮最少怪")));
    return p;
  }
  function paneFor(key) {
    switch (key) {
      case "battle":
        return battlePane();
      case "farm":
        return section("连刷(遭遇 / 竞技场 / GF) · 待 M3 接入");
      case "guard":
        return section("保护后勤(精力 / 无响应 / 修复 / 库存) · 待 M4 接入");
      default:
        return section("提醒杂项(告警 / 异世界 / 小马) · 待 M5 接入");
    }
  }
  function createPanel() {
    const panel = el("div", { id: "hvab-panel" });
    const tabs = el("div", { class: "hvab-tabs" });
    const panes = el("div", { class: "hvab-panes" });
    let active = config.get("activeTab");
    const render = () => {
      tabs.querySelectorAll(".hvab-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === active));
      panes.querySelectorAll(".hvab-tabpane").forEach((p) => p.classList.toggle("active", p.dataset.pane === active));
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
      pane.appendChild(paneFor(t.key));
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
  const MAX = 5e3;
  const KEY = "battlelog";
  let buf = (() => {
    const saved = Store.get(KEY, []);
    return Array.isArray(saved) ? saved.slice(-MAX) : [];
  })();
  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      Store.set(KEY, buf);
    }, 3e3);
  }
  function fmtLine(r) {
    const p = (n, w) => String(n).padStart(w);
    return `${r.round.padEnd(7)} T${p(r.turn, 2)} | OC ${p(r.oc, 3)} ${r.cannon} | 怪${r.alive}/${r.total} | HP${p(r.hp, 3)} MP${p(r.mp, 3)} SP${p(r.sp, 3)} | 架${r.stance ? "开" : "关"} | ▶ ${r.action}${r.note ? "  « " + r.note : ""}`;
  }
  const logger = {
    push(r) {
      buf.push(r);
      if (buf.length > MAX) buf.splice(0, buf.length - MAX);
      scheduleSave();
      bus.emit("log:update", r);
    },
    all() {
      return buf;
    },
    count() {
      return buf.length;
    },
    toText() {
      return buf.map(fmtLine).join("\n");
    },
    clear() {
      buf = [];
      Store.set(KEY, []);
      bus.emit("log:update", null);
    }
  };
  function copyText(t) {
    var _a;
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
      }
      ta.remove();
    };
    try {
      if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) navigator.clipboard.writeText(t).catch(fallback);
      else fallback();
    } catch {
      fallback();
    }
  }
  function downloadText(t) {
    const blob = new Blob([t], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hv-battlelog.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function createLogView() {
    const box = el("div", { id: "hvab-log" });
    box.innerHTML = `
    <div class="hvab-log-hd">
      <b>📋 战斗日志 <span id="hvab-log-n">0</span></b>
      <span class="hvab-log-btns">
        <button id="hvab-log-copy" title="整段复制到剪贴板">复制</button>
        <button id="hvab-log-exp" title="导出为 .txt">导出</button>
        <button id="hvab-log-clr" title="清空日志">清空</button>
        <button id="hvab-log-x" title="关闭">✕</button>
      </span>
    </div>
    <div class="hvab-log-body" id="hvab-log-body"></div>`;
    const body = box.querySelector("#hvab-log-body");
    const nEl = box.querySelector("#hvab-log-n");
    const renderAll = () => {
      body.textContent = logger.toText();
      nEl.textContent = String(logger.count());
      body.scrollTop = body.scrollHeight;
    };
    bus.on("log:update", (r) => {
      if (box.style.display !== "flex") return;
      if (r === null) {
        renderAll();
        return;
      }
      const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
      body.appendChild(document.createTextNode(fmtLine(r) + "\n"));
      nEl.textContent = String(logger.count());
      if (atBottom) body.scrollTop = body.scrollHeight;
    });
    box.querySelector("#hvab-log-copy").onclick = () => copyText(logger.toText());
    box.querySelector("#hvab-log-exp").onclick = () => downloadText(logger.toText());
    box.querySelector("#hvab-log-clr").onclick = () => {
      logger.clear();
      renderAll();
    };
    box.querySelector("#hvab-log-x").onclick = () => toggleLog(box, false);
    box._renderAll = renderAll;
    return box;
  }
  function toggleLog(box, open) {
    var _a;
    const show = open ?? box.style.display !== "flex";
    box.style.display = show ? "flex" : "none";
    if (show) (_a = box._renderAll) == null ? void 0 : _a.call(box);
  }
  const SK = {
    Weaken: 212,
    Imperil: 213,
    Cure: 311,
    Regen: 312,
    FullCure: 313,
    Protection: 411,
    Haste: 412,
    Absorb: 421,
    Spark: 422,
    SpiritShield: 423,
    Heartseeker: 431
  };
  const SK_SPECIAL = {
    shieldBash: 2201,
    // 25 OC(1点), 单体+晕眩
    vitalStrike: 2202,
    // 50 OC(2点), 单体高伤
    mercifulBlow: 2203
    // 100 OC(4点), 残血处决
  };
  const IT = {
    hDraught: 11191,
    hPotion: 11195,
    hElixir: 11199,
    mDraught: 11291,
    mElixir: 11299,
    sDraught: 11391,
    scrollProt: 13111
  };
  const GEM = {
    health: 10005,
    // 生命宝石 → HP
    mana: 10006,
    // 魔力宝石 → MP
    spirit: 10007,
    // 灵力宝石 → SP
    mystic: 10008
    // 神秘宝石 → HP/MP/SP
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
  const SK_CN = {
    212: "虚弱",
    213: "陷危",
    311: "治疗",
    312: "细胞活化",
    313: "完全治愈",
    411: "守护",
    412: "急速",
    421: "吸收",
    422: "生命火花",
    423: "灵力盾",
    431: "穿心",
    2201: "盾击",
    2202: "要害强击",
    2203: "最后的慈悲"
  };
  const IT_CN = {
    11191: "体力长效药",
    11195: "体力药水",
    11199: "终极体力药",
    11291: "法力长效药",
    11295: "法力药水",
    11299: "终极法力药",
    11391: "灵力长效药",
    11395: "灵力药水",
    13111: "保护卷轴",
    12601: "黑暗魔药",
    12501: "神圣魔药",
    10005: "生命宝石",
    10006: "魔力宝石",
    10007: "灵力宝石",
    10008: "神秘宝石"
  };
  const SS_CN = {
    gr: "压榨界",
    ar: "竞技场",
    rb: "浴血擂台",
    iw: "道具界",
    tw: "塔楼",
    ba: "遭遇战"
  };
  function actionLabel(a) {
    if (!a) return "-";
    switch (a.type) {
      case "attack":
        return `平砍 ${a.id ?? ""}号`;
      case "spell":
        return SK_CN[a.id ?? 0] || `法术#${a.id ?? ""}`;
      case "item":
        return IT_CN[a.id ?? 0] || `用#${a.id ?? ""}`;
      case "cannon":
        return "小马炮";
      case "stance":
        return "切架式";
      case "defend":
        return "防御";
      case "continue":
        return "继续下一波";
      case "riddle":
        return "小马图(人工)";
      case "skip":
        return "跳过";
      default:
        return a.type;
    }
  }
  class StateReader {
    constructor() {
      this.prev = {};
      this.maxHp = 0;
      this.maxMp = 0;
      this.maxSp = 0;
      this.roundNow = 0;
      this.roundAll = 0;
      this.takesMagic = false;
    }
    // 缓存: 最近敌方对我是否魔法伤害(读不到保留)
    /** 读 vital 数值(HP/MP/SP): HV 会按状态换数值元素 id 后缀(实测 HP 在 vrhd↔vrhb 间切)+ 宽屏版加前缀 dvr*.
     *  故在 #pane_vitals 内按 id 前缀匹配, 不写死全名 —— 一次覆盖所有后缀/前缀变体(连原版都只认 vrhd、漏了 vrhb). */
    _vital(...prefixes) {
      const scope = document.getElementById("pane_vitals") ?? document.body;
      for (const p of prefixes) {
        for (const e of Array.from(scope.querySelectorAll(`[id^="${p}"]`))) {
          const m = (e.textContent || "").match(/\d+/);
          if (m) return parseInt(m[0]);
        }
      }
      return NaN;
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
    /** 从战斗日志 #textlog 解析轮数(取最新); 读不到则保留上次缓存.
     *  英文优先(精确); 汉化/通用兜底: 括号内 "N / M"(防某些汉化把 Round 译成中文改了 textContent). */
    _round() {
      const tl = document.getElementById("textlog");
      if (!tl) return;
      const txt = tl.textContent || "";
      let ms = [...txt.matchAll(/Round\s*(\d+)\s*\/\s*(\d+)/gi)];
      if (!ms.length) ms = [...txt.matchAll(/[(（][^)）]{0,8}?(\d+)\s*\/\s*(\d+)[^)）]{0,8}?[)）]/g)];
      const last = ms[ms.length - 1];
      if (last) {
        this.roundNow = +last[1];
        this.roundAll = +last[2];
      }
    }
    /** 从 #textlog 最新一条"敌方对我伤害"判物理/魔法(物理 pierc/crush/slash, 否则魔法).
     *  翻写自 dodying:4264-4280; 日志最新在末尾(与 _round 一致)故取最后一个匹配; 读不到保留上次缓存. */
    _enemyMagic() {
      const tl = document.getElementById("textlog");
      if (!tl) return;
      const ms = [...(tl.textContent || "").matchAll(/you for \d+ ([a-zA-Z]+) damage/g)];
      const last = ms[ms.length - 1];
      if (!last) return;
      const type = last[1].replace(/ing$/i, "").toLowerCase();
      this.takesMagic = !/pierc|crush|slash/.test(type);
    }
    read() {
      var _a;
      const C = config.all();
      this._round();
      this._enemyMagic();
      const hp = this._vital("vrh", "dvrh"), mp = this._vital("vrm", "dvrm"), sp = this._vital("vrs", "dvrs");
      if (hp) this.maxHp = Math.max(this.maxHp || C.HPMAX, hp);
      if (mp) this.maxMp = Math.max(this.maxMp || C.MPMAX, mp);
      if (sp) this.maxSp = Math.max(this.maxSp || C.SPMAX, sp);
      const ocDots = $$("#vcp>div>div");
      let oc;
      if (ocDots.length) {
        const ocVcr = ocDots.filter((d) => d.id === "vcr").length;
        oc = Math.round((ocDots.length - ocVcr) * 25 + ocVcr * 12.5);
      } else {
        const dvrc = document.getElementById("dvrc");
        oc = dvrc ? parseInt(((_a = (dvrc.textContent || "").match(/\d+/)) == null ? void 0 : _a[0]) ?? "0") || 0 : 0;
      }
      const B = this._buffs();
      const stance = document.getElementById("ckey_spirit");
      const allMkey = $$('[id^="mkey_"]');
      const bloodImgs = $$(".btm4 > .btm5:nth-child(1) img");
      const enemies = allMkey.map((m, idx) => {
        const eid = +m.id.split("_")[1];
        const dimg = $$(".btm6 img", m).map((i) => i.getAttribute("src") || "");
        const debuff = {};
        for (const d of DEBUFFS) debuff[d.key] = dimg.some((s) => d.img.test(s));
        const bw = bloodImgs[idx] ? parseFloat(bloodImgs[idx].style.width || "120") : 120;
        return {
          eid,
          alive: !/opacity/.test(m.getAttribute("style") || ""),
          is_red_boss: !!$('.btm2[style*="background"]', m),
          debuff,
          penArmor: dimg.some((s) => /penetrat|bleed/i.test(s)),
          hpPct: isNaN(bw) ? 100 : Math.round(bw / 120 * 100),
          // 当前 HP%(满血条 width=120)
          bleeding: $$("img", m).some((i) => /wpn_bleed/i.test(i.getAttribute("src") || "")),
          // 流血图标(慈悲处决判据)
          stunned: $$("img", m).some((i) => /stun/i.test(i.getAttribute("src") || ""))
          // 晕眩图标(要害连招判据: 盾击晕眩→要害高伤)【src 待实测核对】
        };
      }).filter((e) => e.alive);
      const lastDmg = typeof this.prev.hp === "number" && this.prev.hp > hp ? this.prev.hp - hp : 0;
      const cannonEl = $$("#pane_skill [onmouseover]").find(
        (e) => /Friendship|Cannon/i.test(e.getAttribute("onmouseover") || "")
      );
      const cannonDimmed = /opacity\s*:\s*0?\.\d/.test((cannonEl == null ? void 0 : cannonEl.getAttribute("style")) || "");
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
      const gemAvail = (db) => !!$(`.bti3>div[onmouseover*="set_infopane_item(${db})"]`);
      const pickGem = (own) => gemAvail(own) ? own : gemAvail(GEM.mystic) ? GEM.mystic : 0;
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
        tookMagicDmg: this.takesMagic,
        roundNow: this.roundNow,
        roundAll: this.roundAll,
        monsterTotal: allMkey.length,
        battleType: SS_CN[new URLSearchParams(location.search).get("ss") || ""] || "战斗",
        gems: { hp: pickGem(GEM.health), mp: pickGem(GEM.mana), sp: pickGem(GEM.spirit) },
        cannonReady: !!cannonEl && !cannonDimmed,
        // 未置灰 = OC≥200 且不冷却(实测: OC<200 也 opacity0.5+onclick=null, 与冷却无法区分) → 仅用于 OC≥200 时放炮判定
        cannonExists: !!cannonEl,
        // 炮在技能栏(不管置灰): 攒炮判定用此(OC<200 必置灰, 用 cannonReady 会攒炮死锁)
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
      if (!e || e.style.opacity === "0.5") return false;
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
    /** 物品当前是否可点: 没货/冷却时 HV 不渲染该悬浮触发器. 用于决策前查库存, 避免选中点不出的药而空转(死循环根因之一) */
    itemAvailable(db) {
      return !!document.querySelector(`.bti3>div[onmouseover*="set_infopane_item(${db})"]`);
    },
    /** 法术当前是否可放: 对齐原版 hvAutoAttack isOn() — 冷却时 HV 把技能图标设 opacity:0.5(置灰), 非 0.5 即可放 */
    skillReady(id) {
      const e = document.getElementById(String(id));
      if (!e) return false;
      return e.style.opacity !== "0.5";
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
      if (/opacity\s*:\s*0?\.\d/.test(c.getAttribute("style") || "")) return false;
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
      const pickHeal = () => {
        for (const id of [IT.hElixir, IT.hDraught, IT.hPotion]) {
          if (Exec.itemAvailable(id)) return A("item", id);
        }
        return null;
      };
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
          return hp < 0.6 * HM ? pickHeal() ?? { type: "defend", exec: Exec.defend, note: "Spark真空+急救药耗尽硬抗" } : { type: "defend", exec: Exec.defend, note: "Spark真空+缺MP硬抗" };
        return S.gems.mp ? A("item", S.gems.mp) : A("item", IT.mElixir);
      }
      if (hp < PANIC || predicted < PANIC && hp < C.HP_HEAL * HM) {
        const canCure = mp >= C.MP_LOW * MM || ch;
        if (canCure && Exec.skillReady(SK.FullCure)) return A("spell", SK.FullCure);
        if (canCure && Exec.skillReady(SK.Cure)) return A("spell", SK.Cure);
        return pickHeal() ?? (Exec.skillReady(SK.Spark) && mp >= sparkCost ? A("spell", SK.Spark) : { type: "defend", exec: Exec.defend, note: "治疗冷却+急救药耗尽硬抗" });
      }
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
        return S.gems.mp ? A("item", S.gems.mp) : !b.mpot.active ? A("item", IT.mDraught) : A("item", IT.mElixir);
      const ssDown = !b.spiritShield.active || b.spiritShield.turns <= 1;
      const prDown = !b.protection.active || b.protection.turns <= 1;
      if (C.scrollFirst && S.scrollReady && ssDown && prDown)
        return A("item", IT.scrollProt);
      if (prDown)
        return mp >= sparkCost ? A("spell", SK.Protection) : S.gems.mp ? A("item", S.gems.mp) : A("item", IT.mElixir);
      if (ssDown)
        return mp >= sparkCost ? A("spell", SK.SpiritShield) : S.gems.mp ? A("item", S.gems.mp) : A("item", IT.mElixir);
      if (C.useAbsorb && S.tookMagicDmg && !b.absorb.active && Exec.skillReady(SK.Absorb)) return A("spell", SK.Absorb);
      if (!b.haste.active || b.haste.turns <= 1) return A("spell", SK.Haste);
      if (heavy && hp < C.HP_HEAL * HM && !b.hpot.active) return A("item", IT.hDraught);
      if (!b.blessing.active && (!b.regen.active || b.regen.turns <= 1)) return A("spell", SK.Regen);
      if (mpFree < C.MP_LOW * MM) {
        if (S.gems.mp) return A("item", S.gems.mp);
        if (!b.mpot.active) return A("item", IT.mDraught);
      }
      if (hp < C.HP_HEAL * HM && !b.hpot.active) return S.gems.hp ? A("item", S.gems.hp) : A("item", IT.hDraught);
      if (sp < C.SP_LOW * SM && S.stanceOn && !b.spot.active) return S.gems.sp ? A("item", S.gems.sp) : A("item", IT.sDraught);
      if (C.useCannon && S.cannonReady && S.alive >= C.CANNON_MIN_ENEMIES && oc >= C.CANNON_MIN_OC && Date.now() - lastCannon() > C.cannonCdMs)
        return { type: "cannon", exec: Exec.cannon };
      const chargingCannon = C.useCannon && C.cannonYieldStance && S.cannonExists && S.alive >= C.CANNON_MIN_ENEMIES && oc < C.CANNON_MIN_OC;
      if (chargingCannon) {
        if (S.stanceOn) return { type: "stance", exec: Exec.stance };
      } else {
        if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn) return { type: "stance", exec: Exec.stance };
        if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: "stance", exec: Exec.stance };
      }
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
      if (!(C.useCannon && S.cannonExists && S.alive >= C.CANNON_MIN_ENEMIES)) {
        const dying = S.enemies.find((e) => e.alive && e.hpPct < 25 && e.bleeding);
        if (C.useMercifulBlow && dying && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow))
          return { type: "spell", id: SK_SPECIAL.mercifulBlow, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, dying.eid) };
        const tgtSp = this.lockTarget(S);
        const stunnedTgt = tgtSp && tgtSp.stunned ? tgtSp : S.enemies.find((e) => e.alive && e.stunned);
        if (C.useVitalStrike && stunnedTgt && oc >= 50 && Exec.skillReady(SK_SPECIAL.vitalStrike))
          return { type: "spell", id: SK_SPECIAL.vitalStrike, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, stunnedTgt.eid) };
        const toStun = tgtSp && !tgtSp.stunned ? tgtSp : S.enemies.find((e) => e.alive && !e.is_red_boss && !e.stunned);
        if (C.useShieldBash && toStun && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
          return { type: "spell", id: SK_SPECIAL.shieldBash, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, toStun.eid) };
      }
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
  let turn = 0;
  let lastRound = -1;
  let timer = null;
  let lastSig = "";
  let stuckN = 0;
  function inBattle() {
    return !!document.getElementById("pane_vitals") || !!document.querySelector('[id^="vrh"],[id^="dvrh"]');
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
          let a = brain.decide(S);
          const sig = `${a.type}:${a.id ?? ""}`;
          if (!changed && sig === lastSig) stuckN++;
          else stuckN = 0;
          lastSig = sig;
          if (stuckN >= 2) {
            const t = S.enemies.find((e) => e.alive);
            a = t ? { type: "attack", id: t.eid, exec: () => Exec.attack(t.eid), note: "安全网:上招放不出→强制平砍" } : { type: "defend", exec: () => Exec.defend(), note: "安全网:上招放不出→防御" };
            stuckN = 0;
          }
          if (S.roundNow !== lastRound) {
            turn = 0;
            lastRound = S.roundNow;
          }
          turn++;
          bus.emit("hud:update", {
            hp: S.hp,
            mp: S.mp,
            sp: S.sp,
            oc: S.overcharge,
            maxHp: S.maxHp,
            maxMp: S.maxMp,
            maxSp: S.maxSp,
            alive: S.alive,
            monsterTotal: S.monsterTotal,
            roundNow: S.roundNow,
            roundAll: S.roundAll,
            turn,
            battleType: S.battleType,
            action: actionLabel(a)
          });
          const C = config.all();
          const pct = (v, m) => m ? Math.min(100, Math.round(v / m * 100)) : 0;
          let note = "";
          if (a.type !== "cannon" && C.useCannon && S.alive >= C.CANNON_MIN_ENEMIES) {
            if (!S.cannonReady) note = "炮:冷却";
            else if (S.overcharge < C.CANNON_MIN_OC) note = `炮:OC ${S.overcharge}/${C.CANNON_MIN_OC}`;
          }
          logger.push({
            round: S.roundAll ? `R${S.roundNow}/${S.roundAll}` : S.battleType,
            turn,
            oc: S.overcharge,
            hp: pct(S.hp, S.maxHp || C.HPMAX),
            mp: pct(S.mp, S.maxMp || C.MPMAX),
            sp: pct(S.sp, S.maxSp || C.SPMAX),
            alive: S.alive,
            total: S.monsterTotal,
            cannon: S.cannonReady ? "可用" : "冷却",
            stance: S.stanceOn,
            action: actionLabel(a),
            note
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
            busyUntil = Date.now() + delay + 150;
            actedAt = Date.now();
          }
          lastFp = fp;
          reader.prev = S;
        }
      }
    } catch {
    }
    timer = setTimeout(tick, 300);
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
    const logView = createLogView();
    const hud = createHud(
      () => {
        config.set("enabled", !config.get("enabled"));
      },
      () => {
        const open = !panel.classList.contains("open");
        togglePanel(panel, open);
        config.set("panelOpen", open);
      },
      () => toggleLog(logView)
    );
    root.appendChild(hud);
    root.appendChild(panel);
    root.appendChild(logView);
    document.body.appendChild(root);
    if (config.get("panelOpen")) togglePanel(panel, true);
  }
  {
    const w = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    w.__hvab = {
      getLastBattle: () => lastBattleResponse,
      config,
      log: () => logger.all(),
      logText: () => logger.toText(),
      clearLog: () => logger.clear()
    };
  }
  hookNet();
  onReady(() => {
    mountUI();
    startLoop();
  });

})();