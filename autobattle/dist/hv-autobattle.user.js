// ==UserScript==
// @name         [HV] 自动战斗 · 盾战大脑
// @namespace    https://github.com/local/hv-autobattle
// @version      0.1.0
// @author       local
// @description  HV 单手盾战现代化半自动辅助(独立重写,忠实翻写 dodying 引擎)
// @match        *://hentaiverse.org/*
// @match        *://alt.hentaiverse.org/*
// @match        *://e-hentai.org/*
// @exclude      *://hentaiverse.org/equip/*
// @exclude      *://alt.hentaiverse.org/equip/*
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
#hvab-root{position:fixed;right:10px;bottom:10px;z-index:99999;width:240px;font:14px/1.4 system-ui,-apple-system,sans-serif;color:#dce3f0}
#hvab-hud{background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;box-shadow:0 6px 22px rgba(0,0,0,.5)}
#hvab-hud .hvab-top{display:flex;align-items:center;gap:7px;margin-bottom:6px}
#hvab-hud .hvab-name{flex:1;font-size:14px;opacity:.92}
#hvab-sw{cursor:pointer;border:0;border-radius:6px;padding:3px 10px;font:bold 14px system-ui;color:#fff;background:#a55}
#hvab-gear{cursor:pointer;border:0;background:none;color:#9aa;font-size:14px;padding:0}
.hvab-bar{position:relative;height:18px;background:rgba(255,255,255,.08);border-radius:7px;margin:3px 0;overflow:hidden}
.hvab-bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:7px;transition:width .25s}
#hvab-hp{background:#4caf50}#hvab-mp{background:#3b82f6}#hvab-sp{background:#ef4444}#hvab-oc{background:#f59e0b}
.hvab-bar span{position:absolute;inset:0;text-align:center;font:14px/18px monospace;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.7)}
#hvab-panel{margin-top:8px;background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;display:none;height:min(540px,calc(100vh - 180px));overflow-y:auto;overscroll-behavior:contain}
#hvab-panel{scrollbar-width:thin;scrollbar-color:rgba(140,160,220,.5) transparent}
#hvab-panel::-webkit-scrollbar{width:8px}
#hvab-panel::-webkit-scrollbar-track{background:transparent;margin:6px 0}
#hvab-panel::-webkit-scrollbar-thumb{background:rgba(140,160,220,.4);border-radius:10px;border:2px solid transparent;background-clip:padding-box;transition:background .2s}
#hvab-panel::-webkit-scrollbar-thumb:hover{background:rgba(165,185,240,.7);background-clip:padding-box}
#hvab-panel.open{display:block}
.hvab-tabs{display:flex;gap:4px;position:sticky;top:0;z-index:5;margin:0 0 8px;padding-bottom:8px;background:rgba(22,24,36,.98)}
.hvab-tab{flex:1;cursor:pointer;border:0;border-radius:6px;padding:4px 0;font-size:14px;background:rgba(255,255,255,.08);color:#bcd}
.hvab-tab.active{background:#3a7;color:#fff}
.hvab-tabpane{display:none}
.hvab-tabpane.active{display:block}
.hvab-empty{opacity:.5;font-size:14px;padding:10px 0;text-align:center}
.hvab-info{margin-top:5px;font-size:14px;line-height:1.5;opacity:.82;text-align:center}
#hvab-meta1{opacity:.75;letter-spacing:.3px}
#hvab-meta2{font-weight:600}
.hvab-grp{margin-bottom:8px}
.hvab-gh{font-size:14px;letter-spacing:.5px;opacity:.5;margin:4px 0 3px}
.hvab-row{display:flex;align-items:center;justify-content:space-between;font-size:14px;padding:2px 0;gap:6px}
.hvab-row>span:first-child{flex:1;opacity:.85}
.hvab-in{opacity:.8;display:inline-flex;align-items:center;gap:2px}
.hvab-in em{font-style:normal;opacity:.55;font-size:14px}
.hvab-row input[type=number]{width:46px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#fff;font:14px monospace;padding:1px 4px;text-align:right}
/* 提权压过 HV hvg.css 的 input[type=number]:hover/:focus(米白底→白字看不清), 保持深色主题深底白字+蓝边 */
#hvab-panel .hvab-row input[type=number]:hover,#hvab-panel .hvab-row input[type=number]:focus{background:rgba(255,255,255,.18);color:#fff;border-color:rgba(140,160,220,.7);outline:none}
.hvab-row input[type=checkbox]{accent-color:#3a7;width:15px;height:15px;cursor:pointer}
#hvab-logbtn{cursor:pointer;border:0;background:none;color:#9aa;font-size:14px;padding:0}
#hvab-log{position:fixed;right:10px;bottom:10px;z-index:100000;width:min(480px,92vw);max-height:74vh;flex-direction:column;background:rgba(16,18,28,.975);backdrop-filter:blur(9px);border:1px solid rgba(120,140,200,.38);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.6);display:none;color:#dce3f0}
.hvab-log-hd{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.1);flex:0 0 auto;font-size:14px}
.hvab-log-btns button{cursor:pointer;border:0;border-radius:5px;margin-left:4px;padding:3px 8px;font-size:14px;background:rgba(255,255,255,.12);color:#cde}
.hvab-log-btns #hvab-log-clr{background:#a55;color:#fff}
.hvab-log-btns #hvab-log-x{background:none;color:#9aa;font-size:14px;padding:2px 4px}
.hvab-log-body{flex:1 1 auto;overflow:auto;padding:6px 10px;white-space:pre-wrap;word-break:break-word;font:14px/1.5 ui-monospace,Consolas,monospace;color:#bcd}
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
    logOpen: false,
    // 战斗日志窗口是否打开(持久化记忆; 进战斗自动恢复, 手动✕关或退出战斗清)
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
    STRUGGLE_HP: 0.5,
    // 放弃攒炮的血线阈值(hp 跌破此比例 = 血线下降, 转单体技减压)
    STRUGGLE_STREAK: 2,
    // 连续几次决策跌破 STRUGGLE_HP 才放弃攒炮(去抖, 防单次瞬掉误触发)
    MP_LOW: 0.35,
    SP_LOW: 0.3,
    SP_RESERVE_RATIO: 0.45,
    // 高压/灵力盾场景的 SP 预留线: 不要求开架式也会补灵力
    OC_ON: 0.5,
    // 灵动架式开启阈值: 游戏要 ≥50% 斗气才能开(原 0.4 → OC 40~50% 点架式是空操作 bug)
    OC_OFF: 0.22,
    HS_MIN_ENEMIES: 2,
    CANNON_MIN_ENEMIES: 6,
    // 攒炮最少怪(原4→6): 4-5只小局清场太快、OC攒不满200就清完=攒炮空转还压住近战技; 提到6让小局直接放近战技/平砍, 6+大局才攒炮(能攒满)
    CANNON_MIN_OC: 200,
    // 小马炮需 200 斗气(满 250); 不够则游戏把按钮置灰(opacity:0.5)
    CANNON_CD_TURNS: 50,
    // 小马炮放完后 50 回合冷却(实测确认, 跨波/轮持续). loop 用 Store 持久化追踪(跨 reload 保留)
    CANNON_YIELD_OC: 175,
    // 架式让位阈值: 仅 OC≥此值(接近200)才关架式冲刺; OC<此值架式常驻(ehwiki:+100%物理伤害+OC净涨)
    // ── M2 开关/节奏 ──
    useCannon: true,
    cannonYieldStance: true,
    // 架式临门让位(仅 OC≥CANNON_YIELD_OC): 架式烧10%OC但反击产更多→常驻净涨, 只在冲200那1-2回合关架式, 不全程压
    cannonCdMs: 1500,
    // 仅防"同回合重复点"的短保护; 真冷却(50回合)与 OC 门控靠按钮置灰检测, 不再用墙钟节流
    scrollFirst: true,
    // 起手/2墙缺优先卷轴(关=法术逐个补省卷轴)
    delayMin: 160,
    delayMax: 400,
    // 动作间随机延迟范围(ms)
    STUCK_PAUSE: 12,
    // 连续放不出达此次数 → 疑似网络卡/无响应 → 自动暂停告警(退避减速后仍不通才暂停, 防死循环刷屏)
    useWeaken: true,
    useImperil: true,
    // 红怪减益序列开关
    useChanneling: true,
    // Channeling 主动利用
    useAbsorb: false,
    // 法系怪吸收墙(默认关; 盾战物防为主, 遇法系怪再开)
    useShadowVeil: true,
    // 高压影纱: 默认只在压力场景维护, 低压保留反击/OC收益
    shadowVeilPressureOnly: true,
    usePressureControl: true,
    // 高压控制层: Weaken -> Silence -> 高价值 Imperil
    CONTROL_MIN_ENEMIES: 4,
    useSilence: true,
    useBlind: false,
    useSlow: false,
    useSleep: false,
    // 本轮只保留配置/ID, 不进默认自动链
    useVitalStrike: true,
    // 要害强击(实测 onclick=set_hostile_skill, castHostileOn 释放机制确认; 连招打已晕眩目标)
    useShieldBash: true,
    // 盾击(同上; 连招给未晕眩目标铺垫, 已晕眩不重复)
    useMercifulBlow: true,
    // 最后的慈悲(红名怪 25%+流血 处决; castHostileOn 已验证; 须配要害产流血→连招末步)
    // ── 目标权重系统(翻写 dodying finWeight; 详见 specs/2026-06-05-autobattle-target-weight-design.md)──
    useTargetWeight: true,
    // 总开关; 只控制 P16 是否按权重排序. 血条 bug 修复不受此控制. 2026-06-06 GF/竞技场真机核对通过(切换即时生效·血量+破甲滚雪球排序·无死磕)→ 脱离灰度转默认开
    baseHpRatio: 1,
    // 关键可调: >0 低血优先 / <0 高血优先
    yggdrasilExtraWeight: -1e3,
    // 内置: 世界树 boss 绝对优先
    unreachableWeight: 1e3,
    // 内置: 死怪垫底
    // 内置 13 状态权重(reference 1067-1079 实测默认值). statusWeight 是 record, 将来若做面板可调需注意整体覆盖语义
    statusWeight: { We: 12, Bl: 10, Slo: 15, Si: 10, Sle: 100, Im: -15, PA: -12, BW: -10, Co: -109, Dr: 2, MN: 7, Stun: 290, CM: -20 },
    // ── 要害延迟喂流血(BleedTimer; 详见 specs/2026-06-06-autobattle-delayed-bleed-design.md)──
    useDelayedBleed: true,
    // 延迟逻辑开关; false 退回旧"红名一晕就喂"(灰度可一键回滚)
    BLEED_DURATION: 5,
    // 流血持续回合 B(要害产的 DoT 覆盖窗口)
    BLEED_SAFETY: 1,
    // 安全余量; 要求 T ≤ B-safety(=4) 才喂, 留 1 回合冗余防 DoT 先过期
    BLEED_FALLBACK_HP: 30,
    // 无主动速率样本/速率太小时的兜底血量窗口(hpPct ≤ 此值就喂)
    BLEED_RATE_WINDOW: 3,
    // 速率移动平均窗口(最近 2-3 个主动样本)
    BLEED_MIN_SAMPLES: 1,
    // 走速率主路最少样本数, 不足走兜底
    BLEED_MIN_RATE: 1
    // 速率有效下限(%/回合); ≤ 此值视为无效走兜底
  };
  let current = { ...DEFAULT_CONFIG, ...Store.get("config", {}) };
  const CONFIG_VERSION = 3;
  if (Store.get("configVersion", 0) < CONFIG_VERSION) {
    current.cannonCdMs = DEFAULT_CONFIG.cannonCdMs;
    current.OC_ON = DEFAULT_CONFIG.OC_ON;
    current.CANNON_MIN_ENEMIES = DEFAULT_CONFIG.CANNON_MIN_ENEMIES;
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
    p.appendChild(group("开关", swRow("useCannon", "自动小马炮"), swRow("scrollFirst", "起手用卷轴"), swRow("useWeaken", "红怪铺虚弱"), swRow("useImperil", "红怪铺陷危"), swRow("useChanneling", "Channeling 增益"), swRow("useAbsorb", "法系怪吸收墙"), swRow("useTargetWeight", "权重选怪")));
    p.appendChild(group("高压/SP", swRow("usePressureControl", "高压控制"), swRow("useSilence", "沉默"), swRow("useShadowVeil", "影纱"), pctRow("SP_RESERVE_RATIO", "SP预留")));
    p.appendChild(group("OC 近战技(非炮场景)", swRow("useVitalStrike", "要害强击"), swRow("useShieldBash", "盾击晕眩"), swRow("useMercifulBlow", "慈悲处决")));
    p.appendChild(group("节奏", numRow("delayMin", "延迟下限", "ms"), numRow("delayMax", "延迟上限", "ms")));
    p.appendChild(group("进阶(谨慎改)", numRow("SPARK_RESERVE", "Spark预留MP"), pctRow("BURST_EST", "暴击波预估"), pctRow("MP_FUSE", "MP熔断线"), numRow("HS_MIN_ENEMIES", "穿心最少怪"), numRow("CANNON_MIN_ENEMIES", "炮最少怪")));
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
    /** 立即落盘(清防抖 timer): 用于 reload 前(如 continueBattle 下一波会刷新页面)保住缓冲, 防丢最后几条 */
    flush() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      Store.set(KEY, buf);
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
    box.querySelector("#hvab-log-x").onclick = () => {
      config.set("logOpen", false);
      toggleLog(box, false);
    };
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
    Slow: 221,
    Blind: 231,
    Silence: 232,
    Cure: 311,
    Regen: 312,
    FullCure: 313,
    Protection: 411,
    Haste: 412,
    ShadowVeil: 413,
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
    // 神秘宝石 → Channeling
  };
  const BUFF_IMG = {
    spark: "sparklife",
    spiritShield: "spiritshield",
    protection: "protection",
    shadowVeil: "shadowveil",
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
  const CONTROL_DEBUFFS = [
    { key: "weaken", status: "We", id: SK.Weaken, cfg: "useWeaken" },
    { key: "silence", status: "Si", id: SK.Silence, cfg: "useSilence" },
    { key: "imperil", status: "Im", id: SK.Imperil, cfg: "useImperil" },
    { key: "blind", status: "Bl", id: SK.Blind, cfg: "useBlind" },
    { key: "slow", status: "Slo", id: SK.Slow, cfg: "useSlow" }
  ];
  const STATUS_LIB = {
    We: { cn: "虚弱", img: "weaken", name: "Weaken" },
    Bl: { cn: "致盲", img: "blind", name: "Blind" },
    Slo: { cn: "缓慢", img: "slow", name: "Slow" },
    Si: { cn: "沉默", img: "silence", name: "Silence" },
    Sle: { cn: "沉眠", img: "sleep", name: "Sleep" },
    Im: { cn: "陷危", img: "imperil", name: "Imperil" },
    PA: { cn: "破甲", img: "wpn_ap", name: "Penetrated Armor" },
    BW: { cn: "流血", img: "wpn_bleed", name: "Bleeding Wound" },
    Co: { cn: "混乱", img: "confuse", name: "Confuse" },
    Dr: { cn: "枯竭", img: "drainhp", name: "Drain" },
    MN: { cn: "魔磁网", img: "magnet", name: "MagNet" },
    Stun: { cn: "眩晕", img: "wpn_stun", name: "Stunned" },
    CM: { cn: "魔力合流", img: "coalescemana", name: "Coalesced Mana" }
  };
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
      need: (b, S) => (!b.heartseeker.active || b.heartseeker.turns <= 1) && (S.alive >= config.get("HS_MIN_ENEMIES") || S.enemies.some((e) => e.is_red_boss))
    }
  ];
  const cannonBtn = () => [...document.querySelectorAll("#pane_skill [onmouseover]")].find(
    (e) => /Friendship|Cannon/i.test(e.getAttribute("onmouseover") || "")
  );
  const SK_CN = {
    212: "虚弱",
    213: "陷危",
    221: "缓慢",
    222: "沉眠",
    231: "致盲",
    232: "沉默",
    311: "治疗",
    312: "细胞活化",
    313: "完全治愈",
    411: "守护",
    412: "急速",
    413: "影纱",
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
  function asGlobal(re) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    return new RegExp(re.source, flags);
  }
  function textlogMatchesNewestFirst(text, re) {
    return [...text.matchAll(asGlobal(re))];
  }
  function latestTextlogMatch(text, re) {
    return textlogMatchesNewestFirst(text, re)[0];
  }
  function parseLatestRound(text) {
    let m = latestTextlogMatch(text, /Round\s*(\d+)\s*\/\s*(\d+)/i);
    if (!m) m = latestTextlogMatch(text, /[(（][^)）]{0,8}?(\d+)\s*\/\s*(\d+)[^)）]{0,8}?[)）]/);
    return m ? { roundNow: +m[1], roundAll: +m[2] } : null;
  }
  function parseLatestEnemyMagic(text) {
    const m = latestTextlogMatch(text, /you for \d+ ([a-zA-Z]+) damage/i);
    if (!m) return null;
    const type = m[1].replace(/ing$/i, "").toLowerCase();
    return !/pierc|crush|slash/.test(type);
  }
  function parseSpawnHp(text) {
    const out = {};
    const re = /Spawned Monster ([A-Z]):\s*MID=\d+\s*\([^)]+\)\s*LV=\d+\s*HP=(\d+)/g;
    for (const m of textlogMatchesNewestFirst(text, re)) {
      if (out[m[1]] === void 0) out[m[1]] = +m[2];
    }
    return out;
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
      this.initHp = {};
    }
    // 缓存: 怪初始 HP(键=字母 A-E, 对应 mkey/DOM idx; Spawned 行解析)
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
    /** buff 剩余回合: onmouseover set_infopane_effect('名','描述',第三参数) — 数字=回合, 'autocast'/字符串=游戏自动维持(常驻).
     *  XHR /json 响应实测确认(pane_effects 字段, 也在 DOM): Regen 21 / Heartseeker 326 / Spark等 autocast. 原读 [id*=expire] 读不到才兜底 99. */
    _expire(img) {
      var _a;
      const mo2 = img.getAttribute("onmouseover") || "";
      const p = (((_a = mo2.match(/set_infopane_effect\('[^']*',\s*'[^']*',\s*([^)]+)\)/)) == null ? void 0 : _a[1]) || "").trim();
      return /^\d+$/.test(p) ? parseInt(p) : 99;
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
      const parsed = parseLatestRound(tl.textContent || "");
      if (parsed) {
        this.roundNow = parsed.roundNow;
        this.roundAll = parsed.roundAll;
      }
    }
    /** 从 #textlog 最新一条"敌方对我伤害"判物理/魔法(物理 pierc/crush/slash, 否则魔法).
     *  翻写自 dodying:4264-4280; GF 实测 textlog 顶新底旧, 故取第一个匹配; 读不到保留上次缓存. */
    _enemyMagic() {
      const tl = document.getElementById("textlog");
      if (!tl) return;
      const takesMagic = parseLatestEnemyMagic(tl.textContent || "");
      if (takesMagic !== null) this.takesMagic = takesMagic;
    }
    /** 从 #textlog 解析 "Spawned Monster X: MID=N (Name) LV=N HP=N" 行 → 缓存每怪初始 HP.
     *  GF 实测格式(2026-06-05): "Spawned Monster A: MID=325614 (Halo Effect) LV=398 HP=105710".
     *  字母 A→mkey_1/idx0, B→mkey_2/idx1 …(letter=String.fromCharCode(65+idx)).
     *  textlog 每波给一次且最新在顶部, 长回合可能被挤出末尾 → 解析到就更新, 没有则沿用; 新波同字母覆盖. */
    _spawnHp() {
      const tl = document.getElementById("textlog");
      if (!tl) return;
      Object.assign(this.initHp, parseSpawnHp(tl.textContent || ""));
    }
    read() {
      var _a;
      const C = config.all();
      this._round();
      this._enemyMagic();
      this._spawnHp();
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
      const enemies = allMkey.map((m, idx) => {
        var _a2;
        const eid = +m.id.split("_")[1];
        const dimgEl = $$(".btm6 img", m);
        const dimg = dimgEl.map((i) => i.getAttribute("src") || "");
        const debuff = {};
        for (const d of DEBUFFS) debuff[d.key] = dimg.some((s) => d.img.test(s));
        const status = {};
        for (const k in STATUS_LIB) {
          const sd = STATUS_LIB[k];
          status[k] = dimg.some((s) => s.includes(sd.img)) || dimgEl.some((i) => (i.getAttribute("onmouseover") || "").includes(`set_infopane_effect('${sd.name}`));
        }
        const bImg = m.querySelector(".btm4 > .btm5:nth-child(1) img");
        const bw = bImg ? parseFloat(bImg.style.width || "120") : 120;
        const hpPct = isNaN(bw) ? 100 : Math.round(bw / 120 * 100);
        const dead = /opacity/.test(m.getAttribute("style") || "");
        const init = this.initHp[String.fromCharCode(65 + idx)];
        const hpNow = dead ? Infinity : init ? Math.floor(init * bw / 120 + 1) : hpPct;
        return {
          eid,
          alive: !dead,
          is_red_boss: !!$('.btm2[style*="background"]', m),
          debuff,
          penArmor: dimg.some((s) => /penetrat|bleed/i.test(s)),
          hpPct,
          bleeding: $$("img", m).some((i) => /wpn_bleed/i.test(i.getAttribute("src") || "")),
          stunned: $$("img", m).some((i) => /stun/i.test(i.getAttribute("src") || "")),
          hpNow,
          name: (((_a2 = $(".btm3", m)) == null ? void 0 : _a2.textContent) || "").trim(),
          status
        };
      }).filter((e) => e.alive);
      const lastDmg = typeof this.prev.hp === "number" && this.prev.hp > hp ? this.prev.hp - hp : 0;
      const cannonEl = $$("#pane_skill [onmouseover]").find(
        (e) => /Friendship|Cannon/i.test(e.getAttribute("onmouseover") || "")
      );
      const buff = {
        spark: B.spark,
        spiritShield: B.spiritShield,
        protection: B.protection,
        shadowVeil: B.shadowVeil,
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
      const pickGem = (own) => gemAvail(own) ? own : 0;
      const battleType = SS_CN[new URLSearchParams(location.search).get("ss") || ""] || "战斗";
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
        battleType,
        gems: { hp: pickGem(GEM.health), mp: pickGem(GEM.mana), sp: pickGem(GEM.spirit), mystic: gemAvail(GEM.mystic) ? GEM.mystic : 0 },
        cannonExists: !!cannonEl,
        // 炮在技能栏(攒炮/放炮/OC技能让路共用)
        cannonOnCd: false,
        // 50 回合冷却由 loop 按回合追踪注入(reader 读不到冷却)
        scrollReady: !!$(`.bti3>div[onmouseover*="set_infopane_item(${IT.scrollProt})"]`),
        firstRound: this.prev._started !== true,
        lockedRedId: this.prev.lockedRedId,
        _started: true
      };
    }
  }
  const reader = new StateReader();
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
    /** 平砍指定怪: n≥1 先 hover_target(元素) 再 battle.commit_target(此时 eid==位置, 已验证); 第10只 mkey_0 的 commit_target 参数是 10(位置)
     *  不是 mkey 编号 0, 故 n===0 改点 #mkey_0 DOM 触发完整 onclick(hover_target+commit_target(10)).
     *  真机坐实: 裸调 commit_target(0) 参数错(应10)+缺前置 hover_target 撞 r 残留守卫 → 打不到第10只、目标乱跳到 3/5/7.
     *  hover 只改 l/v 的 style(attribute), 不触发 observer(只听 childList/characterData), 安全. */
    attack(n) {
      var _a, _b, _c;
      const w = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      if (n === 0) {
        const el2 = document.getElementById("mkey_0");
        const bw = ((_a = el2 == null ? void 0 : el2.querySelector(".btm4 > .btm5:nth-child(1) img")) == null ? void 0 : _a.style.width) || "?";
        console.warn(
          `[HVAB:eid0] attack(0)→点#mkey_0 DOM mkey_0存在=${!!el2} 血条w=${bw} onclick=${(el2 == null ? void 0 : el2.getAttribute("onclick")) || "null"}`
        );
        return el2 ? (el2.click(), true) : false;
      }
      const e = document.getElementById("mkey_" + n);
      if (e && ((_b = w.battle) == null ? void 0 : _b.hover_target)) w.battle.hover_target(e);
      if ((_c = w.battle) == null ? void 0 : _c.commit_target) {
        w.battle.commit_target(n);
        return true;
      }
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
      return r;
    },
    /** hostile 定向: 选中技能后 commit 指定红怪 eid(修"打第一个怪"); 找不到 eid 退回通用 skill.
     *  GF 实测确认: 技能元素 id=DBID(2201/2202/2203), onclick=lock_action+set_hostile_skill(无 touch_and_go),
     *  靠 commit_target 释放 → 真出招+真消耗 OC(盾击 crit 102413 秒杂兵, OC 138→100). 同红怪减益机制. */
    castHostileOn(id, eid) {
      const e = document.getElementById(String(id));
      if (!e || e.style.opacity === "0.5") return false;
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
  function computeFinWeight(e, hpMin, cfg) {
    if (!e.alive || !isFinite(e.hpNow)) return cfg.unreachableWeight;
    let w = cfg.baseHpRatio * Math.log10(e.hpNow / hpMin);
    if (e.name.includes("Yggdrasil")) w += cfg.yggdrasilExtraWeight;
    for (const k in cfg.statusWeight) if (e.status[k]) w += cfg.statusWeight[k];
    return w;
  }
  function rankTargets(enemies, cfg) {
    if (!cfg.enabled) {
      return [...enemies].map((e) => ({ ...e, finWeight: e.eid === 0 ? 10 : e.eid })).sort((a, b) => a.finWeight - b.finWeight);
    }
    const liveHp = enemies.filter((e) => e.alive && isFinite(e.hpNow)).map((e) => e.hpNow);
    const hpMin = liveHp.length ? Math.max(1, Math.min(...liveHp)) : 1;
    return enemies.map((e) => ({ ...e, finWeight: computeFinWeight(e, hpMin, cfg) })).sort((a, b) => a.finWeight - b.finWeight);
  }
  const SAMPLE_CAP = 8;
  const EXECUTE_HP = 25;
  class BleedTimer {
    constructor() {
      this.reds = /* @__PURE__ */ new Map();
      this.pendingActiveEid = null;
    }
    // 上回合主动攻击登记的红名 eid
    /** 每回合 decide 开头无条件调一次. 兑现上回合主动样本 + cleanup 死红名 + 更新血量基线.
     *  @param reds 当前所有活红名快照(已由 brain filter(is_red_boss)) */
    observe(reds) {
      const aliveEids = new Set(reds.map((e) => e.eid));
      const stale = [];
      for (const eid of this.reds.keys()) if (!aliveEids.has(eid)) stale.push(eid);
      for (const eid of stale) this.reds.delete(eid);
      for (const red of reds) {
        const rec = this.reds.get(red.eid) ?? { lastHpPct: red.hpPct, activeDeltas: [] };
        if (this.pendingActiveEid === red.eid) {
          const drop = rec.lastHpPct - red.hpPct;
          if (drop > 0) {
            rec.activeDeltas.push(drop);
            while (rec.activeDeltas.length > SAMPLE_CAP) rec.activeDeltas.shift();
          }
        }
        rec.lastHpPct = red.hpPct;
        this.reds.set(red.eid, rec);
      }
      this.pendingActiveEid = null;
    }
    /** brain 在"本回合决策 = 主动攻击该红名"的 return 分支(经 hitRed)登记归因.
     *  下一回合 observe 时该 eid 的掉血才算主动样本. */
    noteActiveAttack(eid) {
      this.pendingActiveEid = eid;
    }
    /** 是否该现在喂要害. 只看血量/速率时机; stunned/!bleeding/oc 由 brain 外层守卫. */
    shouldFeed(execRed, cfg) {
      var _a;
      if (!cfg.enabled) return true;
      const hp = execRed.hpPct;
      let path = "fallback";
      let r = NaN;
      let T = NaN;
      let feed;
      if (hp <= EXECUTE_HP) {
        path = "execLine";
        feed = true;
      } else {
        const samples = ((_a = this.reds.get(execRed.eid)) == null ? void 0 : _a.activeDeltas) ?? [];
        if (samples.length >= cfg.minSamples) {
          const win = samples.slice(-cfg.rateWindow);
          r = win.reduce((a, b) => a + b, 0) / win.length;
          if (r > cfg.minRate) {
            path = "rate";
            T = Math.ceil((hp - EXECUTE_HP) / r);
            feed = T <= cfg.bleedTurns - cfg.safety;
          } else {
            feed = hp <= cfg.fallbackHpPct;
          }
        } else {
          feed = hp <= cfg.fallbackHpPct;
        }
      }
      console.log("[HVAB:bleed]", { eid: execRed.eid, hpPct: hp, r: Math.round(r * 10) / 10, T, path, feed });
      return feed;
    }
  }
  function isYggdrasil(e) {
    return (e.name || "").includes("Yggdrasil");
  }
  function hasDebuff(e, key, status) {
    var _a, _b;
    return Boolean(((_a = e.debuff) == null ? void 0 : _a[key]) || ((_b = e.status) == null ? void 0 : _b[status]));
  }
  function hasFutureRound(S) {
    return S.roundAll === 0 || S.roundNow === 0 || S.roundNow < S.roundAll;
  }
  function assessPressure(S, C, memory) {
    const HM = S.maxHp || C.HPMAX;
    const SM = S.maxSp || C.SPMAX;
    const spRatio = SM ? S.sp / SM : 1;
    const hasRed = S.enemies.some((e) => e.alive && e.is_red_boss);
    const spReserveLow = spRatio < C.SP_RESERVE_RATIO;
    const spCritical = spRatio < C.SP_LOW;
    const heavy = S.lastDmg > 0.3 * HM;
    const lowHp = memory.lowHpStreak >= C.STRUGGLE_STREAK;
    const high = spCritical || heavy || lowHp;
    const medium = high || hasRed || spReserveLow;
    return {
      level: high ? "high" : medium ? "medium" : "low",
      spReserveLow,
      spCritical,
      hasRed
    };
  }
  function selectRedTarget(S, ranked = [], need = "damage") {
    const live = S.enemies.filter((e) => e.alive && e.is_red_boss);
    if (!live.length) return null;
    const ygg = live.find(isYggdrasil);
    if (ygg) return ygg;
    if (need === "execute") {
      const ex = live.find((e) => e.hpPct < 25 && e.bleeding);
      if (ex) return ex;
    }
    if (need === "control") {
      const gap = live.find((e) => !hasDebuff(e, "weaken", "We") || !hasDebuff(e, "imperil", "Im"));
      if (gap) return gap;
    }
    const locked = S.lockedRedId !== void 0 ? live.find((e) => e.eid === S.lockedRedId) : void 0;
    if (locked) return locked;
    return ranked.find((e) => e.alive && e.is_red_boss) || live.sort((a, b) => a.eid - b.eid)[0] || null;
  }
  function selectControlDebuff(S, C, ranked, pressure) {
    if (!C.usePressureControl || pressure.level === "low") return null;
    if (!pressure.hasRed && S.alive < C.CONTROL_MIN_ENEMIES) return null;
    const live = ranked.filter((e) => e.alive);
    if (!live.length) return null;
    const highValue = live.filter((e) => e.is_red_boss || isYggdrasil(e));
    const scope = pressure.level === "high" ? live : highValue.length ? highValue : live.slice(0, 1);
    for (const d of CONTROL_DEBUFFS) {
      if (!C[d.cfg]) continue;
      if (d.key === "silence" && !(pressure.spReserveLow || pressure.level === "high")) continue;
      if ((d.key === "blind" || d.key === "slow") && pressure.level !== "high") continue;
      if (d.key === "imperil") {
        const target2 = (highValue.length ? highValue : scope).find((e) => !hasDebuff(e, d.key, d.status));
        if (target2) return { id: d.id, key: d.key, target: target2, note: `控:高价值陷危#${target2.eid}` };
        continue;
      }
      const target = scope.find((e) => !hasDebuff(e, d.key, d.status));
      if (!target) continue;
      const label = d.key === "weaken" ? "全体虚弱" : d.key === "silence" ? "SP压沉默" : d.key;
      return { id: d.id, key: d.key, target, note: `控:${label}#${target.eid}` };
    }
    return null;
  }
  function shouldSaveOcForCannon(S, C, pressure, struggling) {
    if (!C.useCannon || !S.cannonExists || S.cannonOnCd || struggling) return false;
    if (pressure.level === "high" || pressure.spReserveLow) return false;
    if (S.alive >= C.CANNON_MIN_ENEMIES) return true;
    return hasFutureRound(S) && S.monsterTotal >= C.CANNON_MIN_ENEMIES;
  }
  function weightCfg(C) {
    return {
      baseHpRatio: C.baseHpRatio,
      yggdrasilExtraWeight: C.yggdrasilExtraWeight,
      unreachableWeight: C.unreachableWeight,
      statusWeight: C.statusWeight,
      enabled: C.useTargetWeight
    };
  }
  function bleedCfg(C) {
    return {
      enabled: C.useDelayedBleed,
      bleedTurns: C.BLEED_DURATION,
      safety: C.BLEED_SAFETY,
      fallbackHpPct: C.BLEED_FALLBACK_HP,
      rateWindow: C.BLEED_RATE_WINDOW,
      minSamples: C.BLEED_MIN_SAMPLES,
      minRate: C.BLEED_MIN_RATE
    };
  }
  class Brain {
    constructor() {
      this.lowHpStreak = 0;
      this.charging = false;
      this.mercifulTry = null;
      this.mercifulBlockEid = -1;
      this.bleedTimer = new BleedTimer();
    }
    // 要害延迟喂流血: 红名掉血速率追踪 + 喂血时机判定(跨回合状态)
    /** 登记"本回合主动攻击了红名 eid"(供下回合算掉血样本)后原样返回 action. 只用于真造成主动掉血的红名 return. */
    hitRed(eid, a) {
      this.bleedTimer.noteActiveAttack(eid);
      return a;
    }
    decide(S) {
      var _a;
      const C = config.all();
      const { hp, mp, sp } = S, oc = S.overcharge, ch = S.channeling, b = S.buff;
      const HM = S.maxHp || C.HPMAX, MM = S.maxMp || C.MPMAX, SM = S.maxSp || C.SPMAX;
      const hasRed = S.enemies.some((e) => e.is_red_boss);
      if (hp < C.STRUGGLE_HP * HM) this.lowHpStreak++;
      else this.lowHpStreak = 0;
      if (this.mercifulTry) {
        const mt = this.mercifulTry;
        this.mercifulBlockEid = S.enemies.some((e) => e.eid === mt.eid && e.alive) && oc >= mt.oc ? mt.eid : -1;
        this.mercifulTry = null;
      }
      if (this.mercifulBlockEid >= 0 && !S.enemies.some((e) => e.eid === this.mercifulBlockEid && e.alive)) this.mercifulBlockEid = -1;
      const ranked = rankTargets(S.enemies, weightCfg(C));
      this.bleedTimer.observe(S.enemies.filter((e) => e.is_red_boss && e.alive));
      const pressure = assessPressure(S, C, { lowHpStreak: this.lowHpStreak });
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
      const pickMana = () => S.gems.mp ? A("item", S.gems.mp) : !b.mpot.active ? A("item", IT.mDraught) : A("item", IT.mElixir);
      const pickSpirit = () => S.gems.sp ? A("item", S.gems.sp) : A("item", IT.sDraught);
      if (S.riddle) {
        const r = this.riddle();
        return r ? { type: "riddle", option: r.option, exec: () => {
          var _a2;
          return (_a2 = document.querySelector(r.option)) == null ? void 0 : _a2.click();
        } } : { type: "skip", note: "riddle留人工" };
      }
      if (S.canContinue) return { type: "continue", exec: () => Exec.continueBattle() };
      if (!b.spark.active || b.spark.turns <= 2) {
        if (mp >= sparkCost && Exec.skillReady(SK.Spark)) return A("spell", SK.Spark);
        if (b.spark.active && S.gems.mystic && !ch && C.useChanneling !== false)
          return { type: "item", id: S.gems.mystic, note: "Mystic:开Channeling补Spark", exec: () => Exec.item(S.gems.mystic) };
        if (!b.spark.active)
          return hp < 0.6 * HM ? pickHeal() ?? { type: "defend", exec: Exec.defend, note: "Spark真空+急救药耗尽硬抗" } : { type: "defend", exec: Exec.defend, note: "Spark真空+缺MP硬抗" };
        return pickMana();
      }
      if (hp < PANIC || predicted < PANIC && hp < C.HP_HEAL * HM) {
        const canCure = mp >= C.MP_LOW * MM || ch;
        if (canCure && Exec.skillReady(SK.FullCure)) return A("spell", SK.FullCure);
        if (canCure && Exec.skillReady(SK.Cure)) return A("spell", SK.Cure);
        return pickHeal() ?? (Exec.skillReady(SK.Spark) && mp >= sparkCost ? A("spell", SK.Spark) : { type: "defend", exec: Exec.defend, note: "治疗冷却+急救药耗尽硬抗" });
      }
      const shadowDown = !b.shadowVeil.active || b.shadowVeil.turns <= 1;
      const ssDown = !b.spiritShield.active || b.spiritShield.turns <= 1;
      const prDown = !b.protection.active || b.protection.turns <= 1;
      const scrollCanCoverWalls = C.scrollFirst && S.scrollReady && ssDown && prDown;
      if (ch && C.useChanneling !== false) {
        const channelFriendly = [
          { id: SK.Spark, need: !b.spark.active || b.spark.turns <= 2 },
          { id: SK.SpiritShield, need: !b.spiritShield.active || b.spiritShield.turns <= 1 },
          { id: SK.Protection, need: !b.protection.active || b.protection.turns <= 1 },
          { id: SK.ShadowVeil, need: C.useShadowVeil && shadowDown && !pressure.spReserveLow && (!C.shadowVeilPressureOnly || pressure.level !== "low") }
        ];
        for (const q of channelFriendly) {
          if (q.need && Exec.skillReady(q.id)) return A("spell", q.id);
        }
        const control2 = selectControlDebuff(S, C, ranked, pressure);
        if (control2 && Exec.skillReady(control2.id)) {
          if (control2.target.is_red_boss) S.lockedRedId = control2.target.eid;
          return { type: "spell", id: control2.id, note: `${control2.note}(Channeling)`, exec: () => Exec.castHostileOn(control2.id, control2.target.eid) };
        }
        for (const q of CHANNEL_Q) {
          if (!q.need(b, S)) continue;
          if (!Exec.skillReady(q.id)) continue;
          if (q.hostile) {
            const t = this.lockTarget(S);
            if (t) return this.castOnRed(q.id, t, S);
            continue;
          }
          return A("spell", q.id);
        }
      }
      if (scrollCanCoverWalls) return A("item", IT.scrollProt);
      const mysticControl = selectControlDebuff(S, C, ranked, pressure);
      const mysticDefenseNeed = !scrollCanCoverWalls && (ssDown || prDown) && mp < sparkCost || C.useShadowVeil && shadowDown && !pressure.spReserveLow && pressure.level !== "low" && mpFree < C.MP_LOW * MM;
      const mysticControlNeed = mysticControl && pressure.level !== "low" && (!pressure.spReserveLow || mysticControl.key !== "imperil");
      if (S.gems.mystic && !ch && C.useChanneling !== false && (mysticDefenseNeed || mysticControlNeed))
        return { type: "item", id: S.gems.mystic, note: mysticDefenseNeed ? "Mystic:开Channeling补防御" : "Mystic:开Channeling控压", exec: () => Exec.item(S.gems.mystic) };
      if (mp < C.MP_FUSE * MM && !ch && (b.spark.turns <= 2 || b.spiritShield.turns <= 2 || b.protection.turns <= 2))
        return pickMana();
      if (prDown)
        return mp >= sparkCost && Exec.skillReady(SK.Protection) ? A("spell", SK.Protection) : pickMana();
      if (ssDown)
        return mp >= sparkCost && Exec.skillReady(SK.SpiritShield) ? A("spell", SK.SpiritShield) : pickMana();
      if (C.useAbsorb && S.tookMagicDmg && !b.absorb.active && Exec.skillReady(SK.Absorb)) return A("spell", SK.Absorb);
      if (C.useShadowVeil && shadowDown && !pressure.spReserveLow && (!C.shadowVeilPressureOnly || pressure.level !== "low") && (ch || mpFree >= C.MP_LOW * MM) && Exec.skillReady(SK.ShadowVeil))
        return { type: "spell", id: SK.ShadowVeil, note: `压:${pressure.level} 影纱`, exec: () => Exec.skill(SK.ShadowVeil) };
      if ((!b.haste.active || b.haste.turns <= 1) && Exec.skillReady(SK.Haste)) return A("spell", SK.Haste);
      if (heavy && hp < C.HP_HEAL * HM && !b.hpot.active) return A("item", IT.hDraught);
      if ((!b.regen.active || b.regen.turns <= 1) && Exec.skillReady(SK.Regen)) return A("spell", SK.Regen);
      if (mpFree < C.MP_LOW * MM) {
        if (S.gems.mp) return A("item", S.gems.mp);
        if (!b.mpot.active) return A("item", IT.mDraught);
      }
      if (hp < C.HP_HEAL * HM && !b.hpot.active) return S.gems.hp ? A("item", S.gems.hp) : A("item", IT.hDraught);
      const control = selectControlDebuff(S, C, ranked, pressure);
      if (control && (ch || mpFree >= C.MP_LOW * MM) && Exec.skillReady(control.id)) {
        if (control.target.is_red_boss) S.lockedRedId = control.target.eid;
        return { type: "spell", id: control.id, note: `${control.note} 压:${pressure.level}`, exec: () => Exec.castHostileOn(control.id, control.target.eid) };
      }
      const spReserveNeed = sp < C.SP_RESERVE_RATIO * SM && (b.spiritShield.active || pressure.level !== "low");
      if ((sp < C.SP_LOW * SM || spReserveNeed || sp < C.SP_LOW * SM && S.stanceOn) && !b.spot.active)
        return { ...pickSpirit(), note: spReserveNeed ? "SP:预留不足" : "SP:低线" };
      if (C.useCannon && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES && oc >= C.CANNON_MIN_OC)
        return { type: "cannon", exec: Exec.cannon };
      const cannonCtx = C.useCannon && C.cannonYieldStance && S.cannonExists && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES;
      if (cannonCtx && oc >= C.CANNON_YIELD_OC && oc < C.CANNON_MIN_OC) this.charging = true;
      if (!cannonCtx || oc < C.OC_OFF * C.OCMAX || oc >= C.CANNON_MIN_OC) this.charging = false;
      if (this.charging) {
        if (S.stanceOn) return { type: "stance", exec: Exec.stance };
      } else {
        if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn && !pressure.spReserveLow) return { type: "stance", exec: Exec.stance };
        if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: "stance", exec: Exec.stance };
      }
      const tgt = selectRedTarget(S, ranked, "control");
      if (tgt == null ? void 0 : tgt.is_red_boss) {
        for (const d of DEBUFFS) {
          if (C[d.cfg] === false) continue;
          if (tgt.debuff[d.key]) continue;
          if (!(ch || mpFree >= C.MP_LOW * MM)) break;
          if (!Exec.skillReady(d.id)) continue;
          return this.castOnRed(d.id, tgt, S);
        }
      }
      if ((!b.heartseeker.active || b.heartseeker.turns <= 1) && (S.alive >= C.HS_MIN_ENEMIES || hasRed) && (ch || mpFree >= 0.4 * MM) && Exec.skillReady(SK.Heartseeker))
        return A("spell", SK.Heartseeker);
      const struggling = this.lowHpStreak >= C.STRUGGLE_STREAK;
      const finalRound = !hasFutureRound(S);
      const saveOcForCannon = shouldSaveOcForCannon(S, C, pressure, struggling);
      const execRed = selectRedTarget(S, ranked, "execute");
      if (execRed) {
        if (C.useMercifulBlow && execRed.eid !== this.mercifulBlockEid && execRed.hpPct < 25 && execRed.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
          this.mercifulTry = { eid: execRed.eid, oc };
          return this.hitRed(execRed.eid, { type: "spell", id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${execRed.eid}(${execRed.hpPct}%+流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, execRed.eid) });
        }
        if (C.useVitalStrike && execRed.stunned && !execRed.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(execRed, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
          return this.hitRed(execRed.eid, { type: "spell", id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${execRed.eid}(${execRed.hpPct}%·延迟喂流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, execRed.eid) });
      }
      if (!saveOcForCannon) {
        const tgtSp = selectRedTarget(S, ranked, "execute");
        if (tgtSp) {
          if (C.useMercifulBlow && tgtSp.eid !== this.mercifulBlockEid && tgtSp.hpPct < 25 && tgtSp.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
            this.mercifulTry = { eid: tgtSp.eid, oc };
            return this.hitRed(tgtSp.eid, { type: "spell", id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${tgtSp.eid}(${tgtSp.hpPct}%+流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, tgtSp.eid) });
          }
          if (C.useVitalStrike && S.stanceOn && tgtSp.stunned && !tgtSp.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
            return this.hitRed(tgtSp.eid, { type: "spell", id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${tgtSp.eid}(${tgtSp.hpPct}%·延迟喂流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, tgtSp.eid) });
          if (C.useShieldBash && S.stanceOn && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
            return this.hitRed(tgtSp.eid, { type: "spell", id: SK_SPECIAL.shieldBash, note: `盾击晕红名#${tgtSp.eid}(连招1步)`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, tgtSp.eid) });
        }
        if (C.useVitalStrike && (hasRed || struggling || finalRound || pressure.level !== "low") && oc >= 50) {
          const stunTrash = ranked.find((e) => e.alive && e.stunned && !e.is_red_boss);
          if (stunTrash && Exec.skillReady(SK_SPECIAL.vitalStrike)) {
            const why = struggling ? "力不从心" : hasRed ? "红名在场" : finalRound ? "最终波" : "高压";
            return { type: "spell", id: SK_SPECIAL.vitalStrike, note: `要害秒杂兵#${stunTrash.eid}(${why}减压)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, stunTrash.eid) };
          }
        }
        if (C.useShieldBash && oc >= 25) {
          const toStun = ranked.find((e) => e.alive && !e.is_red_boss && !e.stunned);
          if (toStun && Exec.skillReady(SK_SPECIAL.shieldBash))
            return { type: "spell", id: SK_SPECIAL.shieldBash, note: `盾击晕杂兵#${toStun.eid}`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, toStun.eid) };
        }
      }
      const trash = ranked.filter((e) => !e.is_red_boss && e.alive);
      if (trash.length) {
        const t = trash[0];
        const why = saveOcForCannon ? "攒炮中" : C.useTargetWeight ? "finWeight最优" : "最低eid";
        return { type: "attack", id: t.eid, note: `平砍杂兵#${t.eid}(${why},${t.hpPct}%${((_a = t.status) == null ? void 0 : _a.PA) ? "·破甲" : ""})`, exec: () => Exec.attack(t.eid) };
      }
      if (tgt) {
        S.lockedRedId = tgt.eid;
        return this.hitRed(tgt.eid, { type: "attack", id: tgt.eid, note: `平砍红名#${tgt.eid}(仅剩红怪,${tgt.hpPct}%)`, exec: () => Exec.attack(tgt.eid) });
      }
      return { type: "defend", exec: Exec.defend };
    }
    /** 锁定红怪(记忆目标优先, 否则首个活红怪) */
    lockTarget(S) {
      return selectRedTarget(S, rankTargets(S.enemies, weightCfg(config.all())), "damage");
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
  let lastInBattle = null;
  let inBattleFalseStreak = 0;
  const EXIT_FALSE_STREAK = 4;
  let stuckN = 0;
  let cannonCd = Store.get("cannonCd", 0);
  let cannonRoundSeen = Store.get("cannonRound", -1);
  function nextCannonCooldown(actionType, execResult, currentCd, cooldownTurns) {
    return actionType === "cannon" && execResult === true ? cooldownTurns : currentCd;
  }
  function inBattle() {
    return !!document.getElementById("pane_vitals") || !!document.querySelector('[id^="vrh"],[id^="dvrh"]');
  }
  function fingerprint(S) {
    const buffs = Object.entries(S.buff).filter(([, v]) => v.active).map(([k]) => k).join(",");
    const foes = S.enemies.map((e) => `${e.eid}:${Object.keys(e.debuff).filter((k) => e.debuff[k]).join("")}`).join(",");
    return [S.hp, S.mp, S.sp, S.overcharge, S.alive, foes, buffs, S.channeling ? "ch" : ""].join("|");
  }
  function tick() {
    var _a;
    const nowIn = inBattle();
    if (nowIn) {
      inBattleFalseStreak = 0;
      if (lastInBattle !== true) {
        bus.emit("battle:active", true);
        lastInBattle = true;
      }
    } else if (lastInBattle !== false && ++inBattleFalseStreak >= EXIT_FALSE_STREAK) {
      bus.emit("battle:active", false);
      lastInBattle = false;
    }
    try {
      if (config.get("enabled") && nowIn && Date.now() >= busyUntil) {
        const S = reader.read();
        const fp = fingerprint(S);
        const changed = fp !== lastFp;
        const stalled = Date.now() - actedAt > 2500;
        if (changed || stalled) {
          if (changed) {
            if (S.roundNow > 0 && cannonRoundSeen > 0 && S.roundNow < cannonRoundSeen) cannonCd = 0;
            cannonRoundSeen = S.roundNow;
            if (cannonCd > 0) cannonCd--;
            Store.set("cannonCd", cannonCd);
            Store.set("cannonRound", cannonRoundSeen);
          }
          S.cannonOnCd = cannonCd > 0;
          let a = brain.decide(S);
          const sig = `${a.type}:${a.id ?? ""}`;
          if (!changed && sig === lastSig) stuckN++;
          else stuckN = 0;
          lastSig = sig;
          if (stuckN >= 2) {
            if (stuckN >= config.get("STUCK_PAUSE")) {
              a = { type: "skip", note: `⚠连续${stuckN}次放不出, 疑似网络卡/无响应 → 自动暂停, 检查网络后手动▶恢复` };
              config.set("enabled", false);
            } else {
              const live = S.enemies.filter((e) => e.alive);
              const t = live.length ? live[stuckN % live.length] : null;
              a = t ? { type: "attack", id: t.eid, exec: () => Exec.attack(t.eid), note: `安全网:换目标#${t.eid}(连续${stuckN}次放不出·退避重试)` } : { type: "defend", exec: () => Exec.defend(), note: "安全网:无活怪→防御" };
            }
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
          let note = a.note || "";
          if (a.type === "attack" && a.id === 0) {
            const oc0 = ((_a = document.getElementById("mkey_0")) == null ? void 0 : _a.getAttribute("onclick")) || "null";
            note = `⚠️mkey_0(第10只·疑似打不动)[oc=${oc0.slice(0, 70)}] ${note}`;
          }
          if (!note && a.type !== "cannon" && C.useCannon && S.alive >= C.CANNON_MIN_ENEMIES) {
            if (S.cannonOnCd) note = `炮:冷却剩${cannonCd}回合`;
            else if (S.overcharge < C.CANNON_MIN_OC) note = `炮:攒OC ${S.overcharge}/${C.CANNON_MIN_OC}`;
          }
          {
            const foes = S.enemies.filter((e) => e.alive);
            const reds = foes.filter((e) => e.is_red_boss);
            if (foes.length)
              console.log(
                `[HVAB:foes] ▶${actionLabel(a)} | 活${foes.length} 红${reds.length} | ` + foes.map((e) => `#${e.eid}${e.is_red_boss ? "红" : ""}${e.stunned ? "晕" : ""}${e.bleeding ? "血" : ""}:${e.hpPct}%`).join(" ") + (reds.length ? " || " + reds.map((e) => `红名#${e.eid}(${e.name || "?"}) ${e.hpPct}% ${e.stunned ? "已晕" : "未晕"} ${e.bleeding ? "流血" : "无血"} [${Object.keys(e.debuff || {}).filter((k) => e.debuff[k]).join(",") || "无减益"}]`).join(" / ") : "")
              );
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
            cannon: S.cannonOnCd ? `冷却${cannonCd}` : S.overcharge >= C.CANNON_MIN_OC ? "可放" : "攒OC",
            stance: S.stanceOn,
            action: actionLabel(a),
            note
          });
          if (a.type === "continue") logger.flush();
          if (a == null ? void 0 : a.exec) {
            const dMin = config.get("delayMin"), dMax = config.get("delayMax");
            const delay = dMin + Math.random() * Math.max(1, dMax - dMin);
            const fn = a.exec;
            setTimeout(() => {
              let result = void 0;
              try {
                result = fn();
              } catch {
              }
              const nextCd = nextCannonCooldown(a.type, result, cannonCd, config.get("CANNON_CD_TURNS"));
              if (nextCd !== cannonCd) {
                cannonCd = nextCd;
                Store.set("cannonCd", cannonCd);
              }
            }, delay);
            busyUntil = Date.now() + delay + 150 + (stuckN > 1 ? Math.min(stuckN * 500, 5e3) : 0);
            actedAt = Date.now();
          }
          lastFp = fp;
          reader.prev = S;
        }
      }
    } catch {
    }
  }
  let mo = null;
  let debTimer = null;
  function scheduleTick() {
    if (debTimer) clearTimeout(debTimer);
    debTimer = setTimeout(tick, 80);
  }
  function ensureObserver() {
    const root = document.getElementById("battle_main");
    if (root && !mo) {
      mo = new MutationObserver(scheduleTick);
      mo.observe(root, { childList: true, subtree: true, characterData: true });
    } else if (!root && mo) {
      mo.disconnect();
      mo = null;
    }
  }
  function slowPoll() {
    ensureObserver();
    tick();
    timer = setTimeout(slowPoll, mo ? 2e3 : 300);
  }
  function startLoop() {
    if (timer === null) {
      actedAt = Date.now();
      slowPoll();
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
        if (/\/json|Battle|api/i.test(this.__url || "")) lastBattleResponse = this.responseText;
      });
      return xs.call(this, body);
    };
    const f = window.fetch;
    if (f) {
      window.fetch = function(...args) {
        const first = args[0];
        const url = typeof first === "string" ? first : first instanceof Request ? first.url : String(first);
        return f.apply(window, args).then((rp) => {
          if (/\/json|Battle|api/i.test(url)) {
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
      () => {
        const open = logView.style.display !== "flex";
        toggleLog(logView, open);
        config.set("logOpen", open);
      }
    );
    root.appendChild(hud);
    root.appendChild(panel);
    root.appendChild(logView);
    document.body.appendChild(root);
    if (config.get("panelOpen")) togglePanel(panel, true);
    if (config.get("logOpen")) toggleLog(logView, true);
    bus.on("battle:active", (active) => {
      if (active) {
        if (config.get("logOpen")) toggleLog(logView, true);
      } else {
        toggleLog(logView, false);
        config.set("logOpen", false);
      }
    });
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
  window.addEventListener("beforeunload", () => logger.flush());
  onReady(() => {
    mountUI();
    startLoop();
  });

})();