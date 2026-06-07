// ==UserScript==
// @name         [HV] 自动战斗 · 盾战大脑
// @namespace    https://github.com/local/hv-autobattle
// @version      0.1.1
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
.hvab-row input[type=text]{width:92px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#fff;font:14px monospace;padding:1px 4px}
/* 提权压过 HV hvg.css 的 input[type=number]:hover/:focus(米白底→白字看不清), 保持深色主题深底白字+蓝边 */
#hvab-panel .hvab-row input[type=number]:hover,#hvab-panel .hvab-row input[type=number]:focus,#hvab-panel .hvab-row input[type=text]:hover,#hvab-panel .hvab-row input[type=text]:focus{background:rgba(255,255,255,.18);color:#fff;border-color:rgba(140,160,220,.7);outline:none}
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
    PANIC_RED: 0.35,
    PANIC_NORM: 0.25,
    MP_FUSE: 0.3,
    // ④ MP 熔断阈值
    HP_HEAL: 0.55,
    // ③ 常规喝血线
    STRUGGLE_HP: 0.5,
    // 放弃攒炮的血线阈值(hp 跌破此比例 = 血线下降, 转单体技减压)
    STRUGGLE_STREAK: 2,
    // 连续几次决策跌破 STRUGGLE_HP 才放弃攒炮(去抖, 防单次瞬掉误触发)
    MP_LOW: 0.45,
    // 常规回蓝线(HUD「回蓝」滑块): P9 现按 mp/maxMp 直接算(不扣预留), 设多少=HUD多少; mp<45% 就用药水/长效补, 绝不碰终极
    SP_LOW: 0.3,
    MAINTAIN_LINE: 0.75,
    // 长效药主动维持线(硬编码, 不上面板): HP/MP/SP 任一<此值且对应长效药可点 → 喝长效药养生(便宜+持续回, 趁早补满少掉低线/急救); 排在平砍前不抢核心输出, 长效药独立冷却天然限频
    SP_RESERVE_RATIO: 0.45,
    // 高压/灵力盾场景的 SP 预留线: 不要求开架式也会补灵力
    OC_ON: 0.5,
    // 灵动架式开启阈值: 游戏要 ≥50% 斗气才能开(原 0.4 → OC 40~50% 点架式是空操作 bug)
    OC_OFF: 0.22,
    HS_MIN_ENEMIES: 2,
    CANNON_MIN_ENEMIES: 5,
    // 攒炮最少怪: 活怪≥此值才攒炮/放炮 AOE(曾 4→6 挡小局空转, 现按需改回 5 放宽)
    CANNON_MIN_OC: 200,
    // 小马炮需 200 斗气(满 250); 不够则游戏把按钮置灰(opacity:0.5)
    CANNON_CD_TURNS: 50,
    // 小马炮放完后 50 回合冷却(实测确认, 跨波/轮持续). loop 用 Store 持久化追踪(跨 reload 保留)
    CANNON_OC_GAIN_EST: 20,
    // 关架式平砍攒OC的每回合估值: 仅用于冷却尾段预判窗口 turnsToReady=ceil((200-oc)/此值). 估高→攒得晚(更防250溢出但可能没攒满), 估低→攒得早(更易及时但易溢出). 按实战日志可调
    REGEN_HOLD: 12,
    // 细胞活化放出后多少回合不重放: 覆盖 reader 的 DOM 检测空窗(放出后图标短暂读不到→连放烧蓝); 过窗后仍由 buff 检测主导, reader 失灵也最多每 12 回合放一次
    MANAPOT_HOLD: 3,
    // 回蓝药喝后多少回合常规线(P9)不重复喝: 防长效药慢回看不到效果→同波连喝长效/药水/终极; 急救线(P1/P3/墙倒)不受限
    CANNON_YIELD_OC: 175,
    // 接近200的线: 现仅用作 ocFloorOk 炮可用时的盾击地板(为炮预留); P12 攒炮冲刺起始已改用开架式线 OC_ON×OCMAX(50%=125)
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
    useShieldBashOcFloor: true,
    // 无压力(level==='low')盾击晕杂兵需放完 OC 仍≥地板(炮可用→CANNON_YIELD_OC 175, 否则开架式线 OC_ON*OCMAX 125), 把 OC 留给架式/攒炮; false 退回旧"oc≥25 即晕"(灰度可一键回滚)
    useEndgameStanceOff: true,
    // 单红收尾(只剩1红名)关架式攒OC, 让盾击→要害→慈悲处决链在关架式下跑(解除连招stanceOn门槛+强制不攒炮); false 退回旧"架式常开磨"(灰度回退)
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
    BLEED_MIN_RATE: 1,
    // 速率有效下限(%/回合); ≤ 此值视为无效走兜底
    // ── M3 连刷(farm; 详见 specs/2026-06-06-autobattle-m3-farm-design.md)──
    farmEnabled: false,
    // 连刷独立开关(与 enabled 解耦; 二者同开才连刷)
    autoEncounter: false,
    // 自动接受遭遇战(跨站 e-hentai; 默认关需主动开)
    restoreStamina: false,
    // 战前精力不足喝药恢复(消耗道具; 默认关; M3 盲发, 库存检测留 M4)
    farmTickMs: 1500,
    // 连刷 tick 节奏(≥300ms 服务器红线, 留余量)
    grPerDay: 3,
    // GF 每日开场数(arena.gr 初值, 跨日重置)
    arenaLevels: "",
    // 待战等级/RB 逗号串(逆序消费); 可含 'gr' 代表 GF
    staminaLow: 60,
    // 开战精力下限
    staminaEncounter: 60,
    // 遭遇战精力下限
    staminaLowWithNat: 0,
    // 含 24h 自然恢复的下限
    encounterCdMin: 30,
    // 遭遇常规冷却(分钟)
    staminaHathperk: false,
    // 精力 hathperk(影响盲发恢复量预估 +20/+10)
    // ── M3 增量: 异世界续刷 + 战败退出 ──
    autoSwitchIsekai: false,
    // 异世界自动续刷(本世界刷完后切异世界; 默认关)
    ISEKAI_SWITCH_GUARD_MIN: 10,
    // 切换异世界最小间隔(分钟; 防频繁切换)
    autoSkipDefeated: false,
    // 战败后跳过该靶继续连刷(false=停刷)
    // ── 记录与分析里程碑(详见 specs/2026-06-07-autobattle-record-analysis-design.md)──
    recordEnabled: true,
    // A 收益统计总开关
    recordArchive: false,
    // B 调优日志总开关(阶段2; 重存储默认关)
    cacheMonsterHP: true,
    // monsterDB 落盘
    dropQuality: 6,
    // 装备品质门槛(0Crude..7Peerless; 默认6=Legendary起记)
    archiveMaxBattles: 200,
    // B 最多留几场(阶段2)
    archiveKeepPerLevel: 20,
    // 每准入等级最多留几场(阶段2)
    statsRateMode: "session",
    // 速率口径(阶段3)
    showPlayerLevel: true,
    // 显示玩家角色等级(阶段3)
    // 竞技场准入等级映射(截图底本, 覆盖 Lv.80~300; 失配→level=null+AR-R${roundAll})
    arenaTiers: [
      { roundAll: 25, level: 80, name: "力量流失" },
      { roundAll: 30, level: 90, name: "杀戮地带" },
      { roundAll: 35, level: 100, name: "最终阶段" },
      { roundAll: 40, level: 110, name: "无尽旅程" },
      { roundAll: 45, level: 120, name: "梦陨之时" },
      { roundAll: 50, level: 130, name: "流亡之途" },
      { roundAll: 55, level: 140, name: "封印之力" },
      { roundAll: 60, level: 150, name: "崭新之翼" },
      { roundAll: 65, level: 165, name: "弑神之路" },
      { roundAll: 70, level: 180, name: "死亡前夜" },
      { roundAll: 75, level: 200, name: "命运三女神与树" },
      { roundAll: 80, level: 225, name: "世界末日" },
      { roundAll: 85, level: 250, name: "永恒黑暗" },
      { roundAll: 90, level: 300, name: "与龙共舞" }
    ],
    // ── 小马题自动答题(riddle; 详见 specs/2026-06-07-autobattle-riddle-design.md)──
    useRiddleAssist: true,
    // 小马题辅助总开关
    riddlePopup: true,
    // 弹窗模式(独立窗答, 绕后台标签节流)
    riddleHotkeys: true,
    // 数字 1-6 / Enter / Esc 快捷键
    riddleAlarm: true,
    // 音频警报
    riddleNotify: true,
    // 桌面通知 GM_notification
    riddleChartOverlay: true,
    // PONY CHART 图鉴浮层
    riddleCollect: true,
    // 数据采集(IndexedDB, 铺路 CNN)
    riddleUrgentSec: 10,
    // 剩此秒数(默认10): 有已勾选→超时自动提交已勾的; 一只没勾→加急催答提醒
    riddleAutoRecognize: false
    // 自动识别(CNN; 现 stub 无效, 未来接入后生效)
  };
  const FARM_WAKE_KEYS = /* @__PURE__ */ new Set([
    "farmEnabled",
    "autoEncounter",
    "restoreStamina",
    "grPerDay",
    "arenaLevels",
    "staminaLow",
    "staminaEncounter",
    "staminaLowWithNat",
    "autoSwitchIsekai",
    "autoSkipDefeated"
  ]);
  let current = { ...DEFAULT_CONFIG, ...Store.get("config", {}) };
  const CONFIG_VERSION = 6;
  if (Store.get("configVersion", 0) < CONFIG_VERSION) {
    current.cannonCdMs = DEFAULT_CONFIG.cannonCdMs;
    current.OC_ON = DEFAULT_CONFIG.OC_ON;
    current.CANNON_MIN_ENEMIES = DEFAULT_CONFIG.CANNON_MIN_ENEMIES;
    current.MP_LOW = DEFAULT_CONFIG.MP_LOW;
    Store.set("config", current);
    Store.set("configVersion", CONFIG_VERSION);
  }
  const config = {
    get(key) {
      return current[key];
    },
    set(key, val) {
      const changed = !Object.is(current[key], val);
      const next = { ...current };
      next[key] = val;
      current = next;
      Store.set("config", current);
      if (changed && FARM_WAKE_KEYS.has(key)) {
        Store.set("farmState", "IDLE");
        Store.set("farmCooldownUntil", 0);
      }
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
    bus.on("farm:state", (f) => {
      const m1 = document.getElementById("hvab-meta1");
      if (!m1) return;
      const cd = f.cdRemainMs && f.cdRemainMs > 0 ? ` · cd ${Math.ceil(f.cdRemainMs / 6e4)}分` : "";
      m1.textContent = `连刷:${f.state}${f.note ? " · " + f.note : ""}${cd}`;
    });
    return hud;
  }
  function writeCfg(key, val) {
    config.set(key, val);
  }
  function group(title, ...rows2) {
    const g = el("div", { class: "hvab-grp" });
    g.appendChild(el("div", { class: "hvab-gh" }, title));
    rows2.forEach((r) => g.appendChild(r));
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
  function textRow(key, label, hint = "") {
    const row = el("label", { class: "hvab-row" }, `<span>${label}</span><span class="hvab-in"><input type="text"><em>${hint}</em></span>`);
    const input = row.querySelector("input");
    input.value = String(config.get(key) ?? "");
    input.onchange = () => writeCfg(key, input.value.trim());
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
  function rows(title, obj) {
    const items = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    if (!items.length) return "";
    return `<div class="hvab-gh">${title}</div>` + items.map(([k, v]) => `<div class="hvab-row"><span>${k}</span><span>${v}</span></div>`).join("");
  }
  function statsPane() {
    const p = el("div", { id: "hvab-stats-pane" });
    const render = () => {
      const s = Store.get("stats", null);
      if (!s) {
        p.innerHTML = '<div class="hvab-empty">暂无记录 · 打一场即出</div>';
        return;
      }
      const h = Math.max(1e-3, (Date.now() - s.startTime) / 36e5);
      p.innerHTML = `<div class="hvab-gh">收益(本会话)</div><div class="hvab-row"><span>EXP</span><span>${s.exp} (${Math.round(s.exp / h)}/h)</span></div><div class="hvab-row"><span>Credit</span><span>${s.credit} (${Math.round(s.credit / h)}/h)</span></div><div class="hvab-row"><span>场次/回合/怪</span><span>${s.battles}/${s.rounds}/${s.monsters}</span></div>` + rows("掉落", s.drops) + rows("技能次数", s.magic) + rows("物品次数", s.items) + rows("伤害", s.damage) + rows("回复", s.restore) + `<div class="hvab-gh">受伤</div><div class="hvab-row"><span>总/物理均/魔法均</span><span>${s.hurt.total}/${Math.round(s.hurt.pavg)}/${Math.round(s.hurt.mavg)}</span></div>`;
    };
    render();
    bus.on("battle:end", () => {
      if (p.offsetParent) render();
    });
    return p;
  }
  let _ctx = null;
  function getCtx() {
    try {
      if (!_ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        _ctx = new Ctor();
      }
      return _ctx;
    } catch {
      return null;
    }
  }
  function unlockAudio() {
    try {
      const ctx = getCtx();
      if (!ctx) return;
      const resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
      resume.then(() => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 1e-3;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
        } catch {
        }
      }).catch(() => {
      });
    } catch {
    }
  }
  function playAlarm(times = 2) {
    try {
      const ctx = getCtx();
      if (!ctx) return;
      const doPlay = () => {
        try {
          for (let i = 0; i < times; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = 880;
            gain.gain.value = 0.2;
            osc.connect(gain);
            gain.connect(ctx.destination);
            const t = ctx.currentTime + i * 0.35;
            osc.start(t);
            osc.stop(t + 0.2);
          }
        } catch {
        }
      };
      if (ctx.state === "suspended") {
        ctx.resume().then(doPlay).catch(() => {
        });
      } else {
        doPlay();
      }
    } catch {
    }
  }
  function requestNotifyPermission() {
    try {
      if (typeof GM_notification === "function") return;
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {
        });
      }
    } catch {
    }
  }
  function sendDesktop(title, text) {
    try {
      if (typeof GM_notification === "function") {
        GM_notification({ title, text, timeout: 5e3 });
        return;
      }
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: text });
      }
    } catch {
    }
  }
  function submitRiddle(state, selected) {
    if (!state.present) return;
    const selectedSet = new Set(selected);
    for (const option of state.options) {
      const shouldCheck = selectedSet.has(option.name);
      if (option.el.checked !== shouldCheck) {
        option.el.checked = shouldCheck;
        try {
          option.el.dispatchEvent(new Event("change", { bubbles: true }));
        } catch {
        }
      }
    }
    if (state.submitEl) {
      try {
        state.submitEl.click();
      } catch {
      }
    }
  }
  function openRiddleWindow() {
    try {
      window.open(
        location.href,
        "riddleWindow",
        "resizable,scrollbars,width=1241,height=707"
      );
    } catch {
    }
  }
  function preloadRiddleWindow() {
    try {
      const win = window.open(
        location.href,
        "riddleWindow",
        "resizable,scrollbars,width=1241,height=707"
      );
      if (win) {
        setTimeout(() => {
          try {
            win.close();
          } catch {
          }
        }, 200);
      }
    } catch {
    }
  }
  const TABS = [
    { key: "battle", label: "战斗" },
    { key: "farm", label: "连刷" },
    { key: "guard", label: "保护" },
    { key: "notify", label: "提醒" },
    { key: "stats", label: "收益" }
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
  function farmPane() {
    const p = el("div");
    p.appendChild(group("连刷总控", swRow("farmEnabled", "启用连刷(需同时开战斗🧠)"), swRow("autoSwitchIsekai", "刷完切异世界续刷"), swRow("autoSkipDefeated", "战败也续刷(默认关=停机)"), numRow("ISEKAI_SWITCH_GUARD_MIN", "切世界防抖", "分")));
    p.appendChild(group("竞技场/GF", textRow("arenaLevels", "待刷列表", "gr,5,105"), numRow("grPerDay", "GF每日场数")));
    p.appendChild(group("精力(战前门)", swRow("restoreStamina", "不足喝药恢复"), numRow("staminaLow", "开战精力下限"), numRow("staminaEncounter", "遭遇精力下限"), numRow("staminaLowWithNat", "含自然恢复下限")));
    p.appendChild(group("遭遇战", swRow("autoEncounter", "自动接受遭遇"), numRow("encounterCdMin", "遭遇冷却", "分")));
    p.appendChild(group("节奏", numRow("farmTickMs", "连刷tick", "ms")));
    return p;
  }
  function notifyPane() {
    const p = el("div");
    p.appendChild(group("小马题辅助", swRow("useRiddleAssist", "启用辅助"), swRow("riddlePopup", "弹窗答题"), swRow("riddleHotkeys", "数字快捷键"), swRow("riddleChartOverlay", "图鉴浮层")));
    p.appendChild(group("提醒", swRow("riddleAlarm", "音频警报"), swRow("riddleNotify", "桌面通知"), numRow("riddleUrgentSec", "催答秒数", "s")));
    p.appendChild(group("采集/识别", swRow("riddleCollect", "采集训练样本"), swRow("riddleAutoRecognize", "自动识别(CNN未来)")));
    const preBtn = el("button");
    preBtn.textContent = "🔊 测试/预处理";
    preBtn.onclick = () => {
      try {
        unlockAudio();
      } catch {
      }
      try {
        playAlarm();
      } catch {
      }
      try {
        requestNotifyPermission();
      } catch {
      }
      try {
        sendDesktop("小马题辅助", "预处理完成: 音频/通知/弹窗已就绪");
      } catch {
      }
      try {
        preloadRiddleWindow();
      } catch {
      }
    };
    p.appendChild(group("预处理/测试", preBtn));
    return p;
  }
  function paneFor(key) {
    switch (key) {
      case "battle":
        return battlePane();
      case "farm":
        return farmPane();
      case "guard":
        return section("保护后勤(精力 / 无响应 / 修复 / 库存) · 待 M4 接入");
      case "notify":
        return notifyPane();
      case "stats":
        return statsPane();
      default:
        return section("提醒杂项 · 待接入");
    }
  }
  function createPanel() {
    const panel = el("div", { id: "hvab-panel" });
    const tabs = el("div", { class: "hvab-tabs" });
    const panes = el("div", { class: "hvab-panes" });
    let active2 = config.get("activeTab");
    const render = () => {
      tabs.querySelectorAll(".hvab-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === active2));
      panes.querySelectorAll(".hvab-tabpane").forEach((p) => p.classList.toggle("active", p.dataset.pane === active2));
    };
    for (const t of TABS) {
      const btn = el("button", { class: "hvab-tab", "data-tab": t.key }, t.label);
      btn.onclick = () => {
        active2 = t.key;
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
    return `${r.round.padEnd(7)} T${p(r.turn, 2)} | OC ${p(r.oc, 3)} ${r.cannon} | 怪${r.alive}/${r.total} | HP${p(r.hp, 3)} MP${p(r.mp, 3)} SP${p(r.sp, 3)} | 架${r.stance ? "开" : "关"} | ▶ ${r.action}${r.note ? "  « " + r.note : ""}${r.foe ? "  ‖ " + r.foe : ""}`;
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
    Sleep: 222,
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
    mPotion: 11295,
    mElixir: 11299,
    sDraught: 11391,
    sPotion: 11395,
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
  function ocFloorOk(S, C, pressure, oc, cost) {
    if (!C.useShieldBashOcFloor) return true;
    if (pressure.level !== "low") return true;
    const cannonReady = C.useCannon && S.cannonExists && !S.cannonOnCd;
    const floor = cannonReady ? C.CANNON_YIELD_OC : C.OC_ON * C.OCMAX;
    return oc - cost >= floor;
  }
  function endgameSoloRed(S, C) {
    if (!C.useEndgameStanceOff) return false;
    const live = S.enemies.filter((e) => e.alive);
    return live.length === 1 && live[0].is_red_boss && hasFutureRound(S);
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
        for (const id of [IT.hElixir, IT.hPotion, IT.hDraught]) {
          if (Exec.itemAvailable(id)) return A("item", id);
        }
        return null;
      };
      const pickMana = () => {
        if (S.gems.mp) return A("item", S.gems.mp);
        for (const id of [IT.mPotion, IT.mElixir]) if (Exec.itemAvailable(id)) return A("item", id);
        return { type: "defend", exec: Exec.defend, note: "回蓝药耗尽硬抗" };
      };
      const pickSpirit = () => {
        if (S.gems.sp) return A("item", S.gems.sp);
        for (const id of [IT.sDraught, IT.sPotion]) if (Exec.itemAvailable(id)) return A("item", id);
        return null;
      };
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
      if (heavy && hp < C.HP_HEAL * HM && Exec.itemAvailable(IT.hDraught)) return A("item", IT.hDraught);
      if ((!b.regen.active || b.regen.turns <= 1) && !S.regenOnCd && Exec.skillReady(SK.Regen)) return A("spell", SK.Regen);
      if (mp < C.MP_LOW * MM && !S.manaPotOnCd) {
        if (S.gems.mp) return A("item", S.gems.mp);
        for (const id of [IT.mPotion, IT.mDraught]) if (Exec.itemAvailable(id)) return A("item", id);
      }
      if (hp < C.HP_HEAL * HM) {
        if (S.gems.hp) return A("item", S.gems.hp);
        for (const id of [IT.hDraught, IT.hPotion, IT.hElixir]) if (Exec.itemAvailable(id)) return A("item", id);
      }
      const control = selectControlDebuff(S, C, ranked, pressure);
      if (control && (ch || mpFree >= C.MP_LOW * MM) && Exec.skillReady(control.id)) {
        if (control.target.is_red_boss) S.lockedRedId = control.target.eid;
        return { type: "spell", id: control.id, note: `${control.note} 压:${pressure.level}`, exec: () => Exec.castHostileOn(control.id, control.target.eid) };
      }
      const spReserveNeed = sp < C.SP_RESERVE_RATIO * SM && (b.spiritShield.active || pressure.level !== "low");
      if (sp < C.SP_LOW * SM || spReserveNeed || sp < C.SP_LOW * SM && S.stanceOn) {
        const s = pickSpirit();
        if (s) return { ...s, note: spReserveNeed ? "SP:预留不足" : "SP:低线" };
      }
      if (C.useCannon && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES && oc >= C.CANNON_MIN_OC)
        return { type: "cannon", exec: Exec.cannon };
      const soloRed = endgameSoloRed(S, C);
      if (soloRed) {
        this.charging = false;
        if (S.stanceOn) return { type: "stance", exec: Exec.stance };
      } else {
        const enemyOk = S.alive >= C.CANNON_MIN_ENEMIES || hasFutureRound(S) && S.monsterTotal >= C.CANNON_MIN_ENEMIES;
        const turnsToReady = Math.max(1, Math.ceil((C.CANNON_MIN_OC - oc) / C.CANNON_OC_GAIN_EST));
        const cannonComing = !S.cannonOnCd || (S.cannonCdLeft ?? 0) > 0 && (S.cannonCdLeft ?? 0) <= turnsToReady;
        const cannonCtx = C.useCannon && C.cannonYieldStance && S.cannonExists && enemyOk && cannonComing;
        if (cannonCtx && oc >= C.OC_ON * C.OCMAX && oc < C.CANNON_MIN_OC) this.charging = true;
        if (!cannonCtx || oc < C.OC_OFF * C.OCMAX || oc >= C.CANNON_MIN_OC) this.charging = false;
        if (this.charging) {
          if (S.stanceOn) return { type: "stance", exec: Exec.stance };
        } else {
          if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn && !pressure.spReserveLow) return { type: "stance", exec: Exec.stance };
          if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: "stance", exec: Exec.stance };
        }
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
      const saveOcForCannon = !soloRed && shouldSaveOcForCannon(S, C, pressure, struggling);
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
          if (C.useVitalStrike && (S.stanceOn || soloRed) && tgtSp.stunned && !tgtSp.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
            return this.hitRed(tgtSp.eid, { type: "spell", id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${tgtSp.eid}(${tgtSp.hpPct}%·延迟喂流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, tgtSp.eid) });
          if (C.useShieldBash && (S.stanceOn || soloRed) && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
            return this.hitRed(tgtSp.eid, { type: "spell", id: SK_SPECIAL.shieldBash, note: `盾击晕红名#${tgtSp.eid}(连招1步)`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, tgtSp.eid) });
        }
        if (C.useVitalStrike && (hasRed || struggling || finalRound || pressure.level !== "low") && oc >= 50) {
          const stunTrash = ranked.find((e) => e.alive && e.stunned && !e.is_red_boss);
          if (stunTrash && Exec.skillReady(SK_SPECIAL.vitalStrike)) {
            const why = struggling ? "力不从心" : hasRed ? "红名在场" : finalRound ? "最终波" : "高压";
            return { type: "spell", id: SK_SPECIAL.vitalStrike, note: `要害秒杂兵#${stunTrash.eid}(${why}减压)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, stunTrash.eid) };
          }
        }
        if (C.useShieldBash && oc >= 25 && ocFloorOk(S, C, pressure, oc, 25)) {
          const toStun = ranked.find((e) => e.alive && !e.is_red_boss && !e.stunned);
          if (toStun && Exec.skillReady(SK_SPECIAL.shieldBash))
            return { type: "spell", id: SK_SPECIAL.shieldBash, note: `盾击晕杂兵#${toStun.eid}`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, toStun.eid) };
        }
      }
      if (hp < C.MAINTAIN_LINE * HM && Exec.itemAvailable(IT.hDraught)) return A("item", IT.hDraught);
      if (mp < C.MAINTAIN_LINE * MM && !S.manaPotOnCd && Exec.itemAvailable(IT.mDraught)) return A("item", IT.mDraught);
      if (sp < C.MAINTAIN_LINE * SM && Exec.itemAvailable(IT.sDraught)) return A("item", IT.sDraught);
      const trash = ranked.filter((e) => !e.is_red_boss && e.alive);
      if (trash.length) {
        const t = trash[0];
        const why = saveOcForCannon ? "攒炮中" : soloRed ? "单红收尾" : C.useTargetWeight ? "finWeight最优" : "最低eid";
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
  let last = null;
  function setLastBattle(text) {
    last = text;
  }
  function getLastBattle() {
    return last;
  }
  function extractTextlog(rawJson) {
    if (!rawJson) return [];
    try {
      const d = JSON.parse(rawJson);
      return Array.isArray(d.textlog) ? d.textlog.map((e) => e.t ?? "") : [];
    } catch {
      return [];
    }
  }
  function parseRoundFromJson(rawJson) {
    const text = extractTextlog(rawJson).join("\n");
    const m = text.match(/Round\s*(\d+)\s*\/\s*(\d+)/i);
    return m ? { roundNow: +m[1], roundAll: +m[2] } : null;
  }
  function resolveArenaTier(roundAll, tiers) {
    return tiers.find((t) => t.roundAll === roundAll) ?? null;
  }
  function deriveBattleCode(battleType, roundAll, tiers) {
    if (battleType === "竞技场") {
      const tier = resolveArenaTier(roundAll, tiers);
      return tier ? { battleCode: `AR-Lv${tier.level}-${tier.name}`, level: tier.level } : { battleCode: `AR-R${roundAll}`, level: null };
    }
    if (battleType === "压榨界") return { battleCode: "GF", level: null };
    const kind = battleType === "浴血擂台" ? "RB" : battleType === "遭遇战" ? "BA" : "BT";
    return { battleCode: roundAll ? `${kind}-${roundAll}` : kind, level: null };
  }
  const MS_PER_DAY$2 = 24 * 36e5;
  function isNewDay(arena, nowMs) {
    if (!arena.date) return true;
    return Math.floor(arena.date / MS_PER_DAY$2) !== Math.floor(nowMs / MS_PER_DAY$2);
  }
  function initArenaCtx(prev, arenaLevels, grPerDay, nowMs) {
    const array = arenaLevels ? arenaLevels.split(",").map((s) => s.trim()).filter(Boolean) : [];
    array.reverse();
    return { array, arrayDone: [], token: (prev == null ? void 0 : prev.token) ?? {}, gr: grPerDay, date: nowMs };
  }
  function mapHref(key) {
    if (key === "gr") return "gr";
    const n = Number(key);
    if (n >= 105) return "rb";
    if (n >= 19) return "ar&page=2";
    return "ar";
  }
  function parseGrToken(onclick) {
    const m = onclick.match(/init_battle\(1, *'(.*?)'\)/);
    return m ? m[1] : null;
  }
  function parseArenaToken(onclick) {
    const m = onclick.match(/init_battle\((\d+),\d+,'(.*?)'\)/);
    return m ? { id: m[1], token: m[2] } : null;
  }
  function pickNextArena(input) {
    const arena = {
      ...input,
      array: [...input.array],
      arrayDone: [...input.arrayDone],
      token: { ...input.token }
    };
    const arr = [...arena.array];
    while (arr.length > 0) {
      const raw = arr.pop();
      const num = Number(raw);
      const id = isNaN(num) ? "gr" : String(num);
      if (arena.arrayDone.includes(id) || arena.arrayDone.includes(num)) continue;
      if (id === "gr") {
        if (arena.gr <= 0) {
          if (!arena.arrayDone.includes("gr")) arena.arrayDone.push("gr");
          continue;
        }
        const token2 = arena.token.gr;
        if (!token2) return { kind: "need-token", key: "gr", href: "gr", arena };
        arena.gr--;
        return { kind: "battle", key: "gr", href: "gr", initid: "1", token: token2, arena };
      }
      const token = arena.token[id];
      if (!token) return { kind: "need-token", key: id, href: mapHref(id), arena };
      arena.arrayDone.push(num);
      return { kind: "battle", key: id, href: mapHref(id), initid: id, token, arena };
    }
    return { kind: "empty", arena };
  }
  const MS_PER_HOUR$1 = 36e5;
  const MS_PER_DAY$1 = 24 * MS_PER_HOUR$1;
  function isSameUtcDay(aMs, bMs) {
    return Math.floor(aMs / MS_PER_DAY$1) === Math.floor(bMs / MS_PER_DAY$1);
  }
  function filterToday(recs, nowMs) {
    return recs.filter((e) => isSameUtcDay(e.time, nowMs));
  }
  function computeCooldown(recs, nowMs, lastEH, cdMs) {
    var _a;
    const encountered = recs.filter((e) => e.encountered && e.href);
    const last2 = ((_a = recs[0]) == null ? void 0 : _a.time) ?? lastEH ?? 0;
    let cd;
    if (encountered.length >= 24) cd = Math.floor(recs[0].time / MS_PER_DAY$1 + 1) * MS_PER_DAY$1 - nowMs;
    else if (!last2) cd = 0;
    else cd = cdMs + last2 - nowMs;
    return Math.max(0, cd);
  }
  function pickEngageable(recs) {
    for (const e of recs) {
      if (e.encountered) continue;
      if (e.href) return e.href;
    }
    return void 0;
  }
  const MS_PER_HOUR = 36e5;
  function emptyArena(nowMs) {
    return { array: [], arrayDone: [], token: {}, gr: 0, date: nowMs };
  }
  function parseStaminaReadout(root = document) {
    const el2 = $("#stamina_readout", root);
    if (!el2) return null;
    const m = (el2.textContent || "").match(/\d+/);
    return m ? Number(m[0]) : null;
  }
  function isBattleEnd(url) {
    return url.endsWith("?s=Battle");
  }
  function collectTokens(arena) {
    const next = { ...arena, token: { ...arena.token } };
    const gf = $('img[src*="startgrindfest.png"]');
    if (gf) {
      const t = parseGrToken(gf.getAttribute("onclick") || "");
      if (t) next.token.gr = t;
    }
    $$('img[src*="startchallenge.png"]').forEach((img) => {
      const p = parseArenaToken(img.getAttribute("onclick") || "");
      if (p) next.token[p.id] = p.token;
    });
    return next;
  }
  function readFarm() {
    var _a;
    const url = location.href;
    const host = location.host;
    const nowMs = Date.now();
    const nowHour = Math.floor(nowMs / MS_PER_HOUR);
    const storedState = Store.get("farmState", "IDLE");
    const lastHref = Store.get("lastHref", "");
    const lastEH = Store.get("lastEH", 0);
    const cooldownUntil = Store.get("farmCooldownUntil", 0);
    const readout = parseStaminaReadout();
    if (readout !== null) {
      Store.set("stamina", readout);
      Store.set("staminaTime", nowHour);
    }
    const stamina = {
      cached: Store.get("stamina", 0),
      lastTimeHour: Store.get("staminaTime", 0),
      hathperk: Store.get("staminaHathperk", false)
    };
    let arena = Store.get("arena", emptyArena(nowMs));
    let encounter = filterToday(Store.get("encounter", []), nowMs);
    let eventHref;
    let hvOrigin = Store.get("hvUrl", "https://hentaiverse.org");
    let page;
    if (host === "e-hentai.org") {
      page = "eh-encounter";
      Store.set("lastEH", nowMs);
      const eventpane = $("#eventpane");
      if (eventpane) {
        const a = $("#eventpane>div>a");
        const seg = a == null ? void 0 : a.href.split("/")[3];
        if (seg === void 0) {
          encounter = [];
          eventHref = void 0;
        } else {
          encounter.unshift({ href: seg, time: nowMs });
          encounter = filterToday(encounter, nowMs);
          Store.set("encounter", encounter);
          eventHref = seg;
        }
      } else {
        for (const e of encounter) {
          if (e.encountered) continue;
          if (e.href) {
            eventHref = e.href;
            break;
          }
        }
      }
    } else {
      hvOrigin = location.origin;
      Store.set("hvUrl", hvOrigin);
      if (!url.endsWith("?s=Battle")) Store.set("lastHref", url);
      if (/\?s=Battle&ss=(ar|gr|rb)/.test(url)) {
        arena = collectTokens(arena);
        Store.set("arena", arena);
      }
      page = isBattleEnd(url) ? "hv-battle-end" : "hv-out";
    }
    const isIsekai = url.includes("isekai");
    const lastIsekaiSwitch = Store.get("lastIsekaiSwitch", 0);
    const defeated = page === "hv-battle-end" && /You have been defeated/i.test(((_a = document.body) == null ? void 0 : _a.textContent) ?? "");
    return { page, url, host, hvOrigin, nowMs, nowHour, storedState, arena, stamina, encounter, lastEH, lastHref, eventHref, cooldownUntil, isIsekai, lastIsekaiSwitch, defeated };
  }
  const STAMINA_COST = {
    1: 2,
    3: 4,
    5: 6,
    8: 8,
    9: 10,
    11: 12,
    12: 15,
    13: 20,
    15: 25,
    16: 30,
    17: 35,
    19: 40,
    20: 45,
    21: 50,
    23: 55,
    24: 60,
    26: 65,
    27: 70,
    28: 75,
    29: 80,
    32: 85,
    33: 90,
    34: 95,
    35: 100,
    105: 1,
    106: 1,
    107: 1,
    108: 1,
    109: 1,
    110: 1,
    111: 1,
    112: 1
  };
  function computeStamina(snap, nowHour) {
    return snap.cached + (snap.lastTimeHour ? nowHour - snap.lastTimeHour : 0);
  }
  function predictNatural(stamina, nowHour) {
    return stamina + 24 - nowHour % 24;
  }
  function computeCost(key, stamina, grCount, isIsekai) {
    const base = key === "gr" ? grCount : STAMINA_COST[key] ?? 0;
    const cost = base * 1 * (stamina >= 60 ? 0.03 : 0.02);
    return key === "gr" ? cost + 1 : cost;
  }
  function gate(stamina, cost, low, lowWithNat, nowHour) {
    const stmNR = predictNatural(stamina, nowHour);
    const nrOk = !cost || stmNR - cost >= lowWithNat;
    if (stamina - cost >= low && nrOk) return 1;
    if (!nrOk) return -1;
    return 0;
  }
  function shouldRecover(_snap, stamina, cfg) {
    if (!cfg.restoreStamina) return false;
    const recover = cfg.staminaHathperk ? 20 : 10;
    return stamina <= 100 - recover;
  }
  const MS_PER_DAY = 24 * 36e5;
  const MS_30MIN = 30 * 6e4;
  function nextMidnight(nowMs) {
    return (Math.floor(nowMs / MS_PER_DAY) + 1) * MS_PER_DAY;
  }
  function onWaitlistEmpty(ctx, cfg) {
    if (cfg.autoSwitchIsekai && ctx.nowMs - ctx.lastIsekaiSwitch > cfg.isekaiGuardMs) {
      const url = `${ctx.hvOrigin}/${ctx.isIsekai ? "" : "isekai/"}`;
      return { next: "IDLE", action: { type: "switch-isekai", url, note: `切${ctx.isIsekai ? "恒定" : "异"}世界续刷` } };
    }
    return { next: "COOLDOWN", action: { type: "set-cooldown", untilMs: nextMidnight(ctx.nowMs), note: "今日全清" } };
  }
  function farmReducer(state, ctx, cfg) {
    switch (state) {
      case "IDLE":
        if (!cfg.farmEnabled) return { next: "STOPPED", action: { type: "none", note: "连刷关" } };
        return { next: "CHECK_ENCOUNTER", action: { type: "none" } };
      case "CHECK_ENCOUNTER": {
        if (cfg.autoEncounter) {
          const cd = computeCooldown(ctx.encounter, ctx.nowMs, ctx.lastEH, cfg.encounterCdMs);
          const href = pickEngageable(ctx.encounter);
          const stamina = computeStamina(ctx.stamina, ctx.nowHour);
          if (cd === 0 && href && stamina >= cfg.staminaEncounter) {
            return { next: "ENCOUNTER_ENGAGE", action: { type: "none", note: "有可接遭遇" } };
          }
        }
        return { next: "CHECK_STAMINA", action: { type: "none" } };
      }
      case "ENCOUNTER_ENGAGE":
        return { next: "ENCOUNTER_WAIT", action: { type: "navigate", url: "https://e-hentai.org/news.php?encounter", note: "跳遭遇页" } };
      case "ENCOUNTER_WAIT": {
        if (ctx.eventHref) return { next: "IN_BATTLE", action: { type: "navigate", url: `${ctx.hvOrigin}/${ctx.eventHref}`, note: "接受遭遇→跳回HV" } };
        return { next: "IDLE", action: { type: "navigate", url: ctx.lastHref, note: "无遭遇/过期→回HV" } };
      }
      case "CHECK_STAMINA": {
        const stamina = computeStamina(ctx.stamina, ctx.nowHour);
        const pick = pickNextArena(ctx.arena);
        if (pick.kind === "empty") return onWaitlistEmpty(ctx, cfg);
        const cost = computeCost(pick.key, stamina, ctx.arena.gr);
        const g = gate(stamina, cost, cfg.staminaLow, cfg.staminaLowWithNat, ctx.nowHour);
        if (g === 1) return { next: "PICK_NEXT", action: { type: "none" } };
        if (shouldRecover(ctx.stamina, stamina, cfg)) return { next: "RECOVER_STAMINA", action: { type: "none" } };
        const until = g === 0 ? nextMidnight(ctx.nowMs) : ctx.nowMs + MS_30MIN;
        return { next: "COOLDOWN", action: { type: "set-cooldown", untilMs: until, note: g === 0 ? "今日精力耗尽" : "等自然恢复" } };
      }
      case "RECOVER_STAMINA":
        return { next: "CHECK_STAMINA", action: { type: "recover-stamina", note: "喝药恢复精力" } };
      case "PICK_NEXT": {
        const pick = pickNextArena(ctx.arena);
        if (pick.kind === "empty") return onWaitlistEmpty(ctx, cfg);
        if (pick.kind === "need-token") return { next: "PICK_NEXT", action: { type: "navigate", url: `?s=Battle&ss=${pick.href}`, note: `收集 ${pick.href} token` }, arena: pick.arena };
        return { next: "STARTING", action: { type: "start-battle", href: pick.href, initid: pick.initid, token: pick.token, note: `开战 ${pick.href}#${pick.key}` }, arena: pick.arena };
      }
      case "STARTING":
        return { next: "PICK_NEXT", action: { type: "none", note: "STARTING 兜底重选" } };
      case "IN_BATTLE":
        return { next: "POST_BATTLE", action: { type: "none" } };
      case "POST_BATTLE":
        if (ctx.defeated && !cfg.autoSkipDefeated) return { next: "STOPPED", action: { type: "stop-farm", note: "战败停机等人工" } };
        return { next: "RETURN", action: { type: "none", note: ctx.defeated ? "战败→续刷" : "战斗结束" } };
      case "RETURN":
        return { next: "IDLE", action: { type: "navigate", url: ctx.lastHref, note: "回前页" } };
      case "COOLDOWN":
        if (!cfg.farmEnabled) return { next: "STOPPED", action: { type: "none" } };
        if (ctx.nowMs >= ctx.cooldownUntil) return { next: "IDLE", action: { type: "none", note: "冷却结束" } };
        return { next: "COOLDOWN", action: { type: "none" } };
      case "STOPPED":
        if (cfg.farmEnabled) return { next: "IDLE", action: { type: "none", note: "重新开" } };
        return { next: "STOPPED", action: { type: "none" } };
      default:
        return { next: "IDLE", action: { type: "none" } };
    }
  }
  const MIN_INTERVAL = 300;
  let lastPost = 0;
  function gmPost(url, body) {
    return new Promise((resolve, reject) => {
      const send = () => {
        if (typeof GM_xmlhttpRequest !== "function") {
          reject(new Error("GM_xmlhttpRequest unavailable"));
          return;
        }
        lastPost = Date.now();
        GM_xmlhttpRequest({
          method: "POST",
          url,
          data: body,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          onload: (r) => r.status === 200 ? resolve() : reject(new Error(`HTTP ${r.status}`)),
          onerror: () => reject(new Error("xhr error"))
        });
      };
      const wait = Math.max(0, MIN_INTERVAL - (Date.now() - lastPost));
      if (wait > 0) setTimeout(send, wait);
      else send();
    });
  }
  function navigate(url) {
    window.open(url, "_self");
  }
  function startBattle(href, initid, token) {
    gmPost(`?s=Battle&ss=${href}`, `initid=${initid}&inittoken=${token}`).then(() => {
      window.location.href = location.href;
    }).catch((e) => console.error("[HVAB:farm] startBattle 失败", e));
  }
  function recoverStamina() {
    gmPost(location.href, "recover=stamina").then(() => {
      window.location.href = location.href;
    }).catch((e) => console.error("[HVAB:farm] recoverStamina 失败", e));
  }
  function execFarm(action) {
    switch (action.type) {
      case "none":
        return;
      case "navigate":
        navigate(action.url);
        return;
      case "start-battle":
        startBattle(action.href, action.initid, action.token);
        return;
      case "recover-stamina":
        recoverStamina();
        return;
      case "set-cooldown":
        Store.set("farmCooldownUntil", action.untilMs);
        return;
      case "switch-isekai":
        Store.set("lastIsekaiSwitch", Date.now());
        window.open(action.url, "_self");
        return;
      case "stop-farm":
        config.set("farmEnabled", false);
        return;
    }
  }
  let farmBusyUntil = 0;
  function farmCfg(C) {
    return {
      farmEnabled: C.farmEnabled,
      autoEncounter: C.autoEncounter,
      restoreStamina: C.restoreStamina,
      staminaLow: C.staminaLow,
      staminaLowWithNat: C.staminaLowWithNat,
      staminaEncounter: C.staminaEncounter,
      encounterCdMs: C.encounterCdMin * 6e4,
      grPerDay: C.grPerDay,
      arenaLevels: C.arenaLevels,
      staminaHathperk: C.staminaHathperk,
      // ── M3 增量: 异世界续刷 + 战败退出 ──
      autoSwitchIsekai: C.autoSwitchIsekai,
      isekaiGuardMs: C.ISEKAI_SWITCH_GUARD_MIN * 6e4,
      autoSkipDefeated: C.autoSkipDefeated
    };
  }
  function routeStartup(ctx) {
    if (ctx.page === "eh-encounter") return "ENCOUNTER_WAIT";
    if (ctx.page === "in-battle") return "IN_BATTLE";
    if (ctx.page === "hv-battle-end") return "POST_BATTLE";
    return ctx.storedState;
  }
  function ensureArena(ctx, C) {
    if (isNewDay(ctx.arena, ctx.nowMs) || ctx.arena.array.length === 0 && C.arenaLevels) {
      const arena = initArenaCtx(ctx.arena, C.arenaLevels, C.grPerDay, ctx.nowMs);
      Store.set("arena", arena);
      if (ctx.storedState === "COOLDOWN" && arena.array.length > 0) {
        Store.set("farmState", "IDLE");
        Store.set("farmCooldownUntil", 0);
      }
      return arena;
    }
    return ctx.arena;
  }
  function farmTick() {
    if (Date.now() < farmBusyUntil) return;
    try {
      const C = config.all();
      const ctx = readFarm();
      ctx.arena = ensureArena(ctx, C);
      const state = routeStartup(ctx);
      const step = farmReducer(state, ctx, farmCfg(C));
      Store.set("farmState", step.next);
      if (step.arena) Store.set("arena", step.arena);
      const cdRemainMs = step.next === "COOLDOWN" ? Math.max(0, ctx.cooldownUntil - ctx.nowMs) : void 0;
      bus.emit("farm:state", { state: step.next, note: step.action.note, cdRemainMs });
      execFarm(step.action);
      farmBusyUntil = Date.now() + C.farmTickMs;
    } catch (e) {
      console.error("[HVAB:farm] farmTick", e);
    }
  }
  const MANE6 = [
    "Twilight Sparkle",
    "Rarity",
    "Fluttershy",
    "Rainbow Dash",
    "Pinkie Pie",
    "Applejack"
  ];
  const RIDDLE_SIGNALS = ["Submit Answer", "Select ALL ponies", "PONY CHART"];
  function hasText(root, needle) {
    var _a;
    try {
      return ((_a = root.textContent) == null ? void 0 : _a.includes(needle)) ?? false;
    } catch {
      return false;
    }
  }
  function labelText(box) {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
      const viaApi = (_c = (_b = (_a = box.labels) == null ? void 0 : _a[0]) == null ? void 0 : _b.textContent) == null ? void 0 : _c.trim();
      if (viaApi) return viaApi;
      const viaClosest = (_e = (_d = box.closest("label")) == null ? void 0 : _d.textContent) == null ? void 0 : _e.trim();
      if (viaClosest) return viaClosest;
      const viaParent = (_g = (_f = box.parentElement) == null ? void 0 : _f.textContent) == null ? void 0 : _g.trim();
      if (viaParent) return viaParent;
    } catch {
    }
    return "";
  }
  function parseFirstDigits(text) {
    const m = text.match(/\d+/);
    return m ? Number(m[0]) : null;
  }
  function pickLargestMedia(container) {
    if (!container) return null;
    let best = null;
    let bestArea = -1;
    try {
      container.querySelectorAll("img, canvas").forEach((el2) => {
        let area = 0;
        if (el2 instanceof HTMLImageElement) {
          area = (el2.naturalWidth || el2.width) * (el2.naturalHeight || el2.height);
        } else if (el2 instanceof HTMLCanvasElement) {
          area = el2.width * el2.height;
        }
        if (area > bestArea) {
          bestArea = area;
          best = el2;
        }
      });
    } catch {
    }
    return best;
  }
  function ancestorUpBy(el2, steps) {
    let cur2 = el2;
    for (let i = 0; i < steps; i++) {
      if (!cur2.parentElement || cur2.parentElement === document.body) break;
      cur2 = cur2.parentElement;
    }
    return cur2;
  }
  function detectRiddle(root = document) {
    var _a, _b;
    const absent = {
      present: false,
      options: [],
      submitEl: null,
      imageEl: null,
      secondsLeft: null
    };
    try {
      const options = [];
      const checkboxes = root.querySelectorAll("input[type=checkbox]");
      checkboxes.forEach((box) => {
        const text = labelText(box);
        const matched = MANE6.find((n) => text.includes(n));
        if (matched) {
          options.push({ name: matched, el: box });
        }
      });
      const present = options.length >= 1 && RIDDLE_SIGNALS.some((sig) => hasText(root, sig));
      if (!present) return absent;
      let submitEl = null;
      const candidates = root.querySelectorAll(
        "button, input[type=button], input[type=submit], a, div, span"
      );
      for (const el2 of candidates) {
        const label = (el2 instanceof HTMLInputElement ? el2.value : el2.textContent) ?? "";
        if (label.trim() === "Submit Answer") {
          submitEl = el2;
          break;
        }
      }
      let imageEl = null;
      if (options.length > 0) {
        const container = ancestorUpBy(options[0].el, 4);
        imageEl = pickLargestMedia(container);
      }
      if (!imageEl) {
        imageEl = pickLargestMedia(root);
      }
      let secondsLeft = null;
      const counterEl = (_a = root.querySelector) == null ? void 0 : _a.call(root, "#riddlecounter");
      if (counterEl == null ? void 0 : counterEl.textContent) {
        secondsLeft = parseFirstDigits(counterEl.textContent.trim());
      }
      if (secondsLeft === null && (submitEl == null ? void 0 : submitEl.parentElement)) {
        const siblings = Array.from(submitEl.parentElement.childNodes);
        for (const node of siblings) {
          const t = ((_b = node.textContent) == null ? void 0 : _b.trim()) ?? "";
          if (/^\d+$/.test(t)) {
            secondsLeft = Number(t);
            break;
          }
        }
      }
      return { present, options, submitEl, imageEl, secondsLeft };
    } catch {
      return absent;
    }
  }
  function mapRiddleKey(key, count) {
    if (/^[1-9]$/.test(key)) {
      const index = Number(key) - 1;
      return index < count ? { kind: "toggle", index } : { kind: "none" };
    }
    if (key === "Enter") return { kind: "submit" };
    if (key === "Escape") return { kind: "mute" };
    return { kind: "none" };
  }
  const ROOT_ID = "hvab-riddle-ui";
  const CHART_ID = "hvab-riddle-chart";
  const STYLES = `
#${ROOT_ID} {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font: 14px/1.4 system-ui, -apple-system, sans-serif;
  color: #dce3f0;
  pointer-events: auto;
  /* 防止意外拉伸, 最大宽度 600px */
  max-width: 600px;
  width: max-content;
}
#${ROOT_ID} .rui-header {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(22, 24, 36, .94);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(120, 140, 200, .3);
  border-radius: 10px;
  padding: 5px 14px;
  font-size: 14px;
  min-width: 160px;
  justify-content: space-between;
}
#${ROOT_ID} .rui-title {
  font-weight: 600;
  letter-spacing: .5px;
  opacity: .85;
}
#${ROOT_ID} .rui-timer {
  font: bold 20px monospace;
  min-width: 2.5ch;
  text-align: right;
  color: #7ce;
  transition: color .3s;
}
#${ROOT_ID} .rui-timer.urgent {
  color: #f66;
  animation: rui-blink .6s step-end infinite;
}
@keyframes rui-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: .3; }
}
#${ROOT_ID} .rui-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
/* 大按钮: 每个约 90x56px */
#${ROOT_ID} .rui-pony-btn {
  position: relative;
  width: 90px;
  min-height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(32, 36, 52, .95);
  border: 2px solid rgba(100, 120, 180, .35);
  border-radius: 10px;
  cursor: pointer;
  transition: background .15s, border-color .15s, transform .08s;
  box-shadow: 0 3px 10px rgba(0,0,0,.4);
  padding: 6px 4px;
  user-select: none;
}
#${ROOT_ID} .rui-pony-btn:hover {
  background: rgba(44, 50, 72, .98);
  border-color: rgba(140, 160, 220, .6);
  transform: translateY(-1px);
}
#${ROOT_ID} .rui-pony-btn.selected {
  background: rgba(30, 100, 60, .9);
  border-color: #3d9;
  box-shadow: 0 0 12px rgba(50, 200, 120, .45);
}
#${ROOT_ID} .rui-pony-btn .rui-seq {
  font-size: 11px;
  opacity: .55;
  position: absolute;
  top: 4px;
  left: 7px;
}
#${ROOT_ID} .rui-pony-btn .rui-name {
  font-size: 11px;
  text-align: center;
  line-height: 1.3;
  word-break: break-word;
  max-width: 82px;
}
#${ROOT_ID} .rui-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
#${ROOT_ID} .rui-submit-btn {
  padding: 8px 28px;
  background: #2a6;
  border: 0;
  border-radius: 8px;
  color: #fff;
  font: bold 15px system-ui;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0,0,0,.4);
  transition: background .15s, transform .08s;
}
#${ROOT_ID} .rui-submit-btn:hover {
  background: #3b8;
  transform: translateY(-1px);
}
#${ROOT_ID} .rui-chart-btn {
  padding: 8px 14px;
  background: rgba(60, 70, 100, .9);
  border: 1px solid rgba(120, 140, 200, .35);
  border-radius: 8px;
  color: #bcd;
  font: 14px system-ui;
  cursor: pointer;
  transition: background .15s;
}
#${ROOT_ID} .rui-chart-btn:hover {
  background: rgba(70, 82, 120, .95);
}
#${ROOT_ID} .rui-close-btn {
  padding: 4px 8px;
  background: rgba(100, 30, 30, .7);
  border: 0;
  border-radius: 6px;
  color: #faa;
  font: 14px system-ui;
  cursor: pointer;
  opacity: .7;
  transition: opacity .15s;
}
#${ROOT_ID} .rui-close-btn:hover {
  opacity: 1;
}
/* 图鉴浮层 */
#${CHART_ID} {
  position: fixed;
  bottom: 110px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999998;
  background: rgba(16, 18, 28, .97);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(120, 140, 200, .35);
  border-radius: 12px;
  padding: 12px 16px;
  color: #dce3f0;
  font: 14px/1.5 system-ui;
  max-width: 520px;
  width: max-content;
  box-shadow: 0 8px 28px rgba(0,0,0,.6);
}
#${CHART_ID} .rchart-title {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: .5px;
  margin-bottom: 8px;
  opacity: .9;
}
#${CHART_ID} .rchart-img-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
#${CHART_ID} .rchart-img-wrap img {
  max-width: 200px;
  max-height: 160px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.1);
  cursor: pointer;
}
#${CHART_ID} .rchart-hint {
  margin-top: 8px;
  font-size: 13px;
  opacity: .55;
  text-align: center;
}
`;
  function ensureStyle() {
    const styleId = "hvab-riddle-style";
    if (document.getElementById(styleId)) return;
    try {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = STYLES;
      (document.head || document.documentElement).appendChild(s);
    } catch {
    }
  }
  function collectSelected(state) {
    const result = [];
    for (const opt of state.options) {
      try {
        if (opt.el.checked) result.push(opt.name);
      } catch {
      }
    }
    return result;
  }
  function toggleOption(opt, btn) {
    try {
      opt.el.checked = !opt.el.checked;
      opt.el.dispatchEvent(new Event("change", { bubbles: true }));
      btn.classList.toggle("selected", opt.el.checked);
    } catch {
    }
  }
  function syncBtnHighlights(options, btnEls) {
    options.forEach((opt, i) => {
      try {
        const btn = btnEls[i];
        if (btn) btn.classList.toggle("selected", opt.el.checked);
      } catch {
      }
    });
  }
  function buildChartOverlay() {
    const overlay = document.createElement("div");
    overlay.id = CHART_ID;
    const title = document.createElement("div");
    title.className = "rchart-title";
    title.textContent = "📖 PONY CHART — 小马图鉴";
    overlay.appendChild(title);
    const imgWrap = document.createElement("div");
    imgWrap.className = "rchart-img-wrap";
    const chartImgs = [];
    try {
      document.querySelectorAll("img").forEach((img) => {
        const src = (img.src || img.getAttribute("src") || "").toLowerCase();
        const alt = (img.alt || "").toLowerCase();
        if (/pony|chart|riddle|mane|sparkle|rarity|fluttershy|rainbow|pinkie|applejack/i.test(src + alt)) {
          chartImgs.push(img);
        }
      });
    } catch {
    }
    if (chartImgs.length > 0) {
      const sorted = chartImgs.slice().sort(
        (a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight
      ).slice(0, 3);
      for (const img of sorted) {
        const clone = document.createElement("img");
        clone.src = img.src;
        clone.alt = img.alt || "pony chart";
        clone.title = "点击在新标签页打开大图";
        clone.onclick = () => {
          try {
            window.open(img.src, "_blank");
          } catch {
          }
        };
        imgWrap.appendChild(clone);
      }
    } else {
      const placeholder = document.createElement("div");
      placeholder.style.cssText = "padding:16px 20px;opacity:.55;font-size:13px;text-align:center";
      placeholder.textContent = "页面内未检测到 PONY CHART 图片。\n请参考 HV Wiki 或截图备忘。\n(后续版本将内置参考图)";
      placeholder.style.whiteSpace = "pre-line";
      imgWrap.appendChild(placeholder);
    }
    overlay.appendChild(imgWrap);
    const hint = document.createElement("div");
    hint.className = "rchart-hint";
    hint.textContent = "点击图片可在新标签页查看大图";
    overlay.appendChild(hint);
    return overlay;
  }
  function mountRiddleUI(state, cfg) {
    const existingRoot = document.getElementById(ROOT_ID);
    if (existingRoot) {
      try {
        existingRoot.dispatchEvent(new CustomEvent("hvab-unmount"));
      } catch {
      }
      existingRoot.remove();
    }
    const existingChart = document.getElementById(CHART_ID);
    if (existingChart) existingChart.remove();
    if (!state.present || state.options.length === 0) {
      return () => {
      };
    }
    ensureStyle();
    const root = document.createElement("div");
    root.id = ROOT_ID;
    const header = document.createElement("div");
    header.className = "rui-header";
    const titleEl = document.createElement("span");
    titleEl.className = "rui-title";
    titleEl.textContent = "🐴 小马题";
    header.appendChild(titleEl);
    const timerEl = document.createElement("span");
    timerEl.className = "rui-timer";
    timerEl.style.display = state.secondsLeft === null ? "none" : "";
    timerEl.textContent = state.secondsLeft !== null ? String(state.secondsLeft) : "";
    header.appendChild(timerEl);
    const closeBtn = document.createElement("button");
    closeBtn.className = "rui-close-btn";
    closeBtn.type = "button";
    closeBtn.textContent = "✕";
    closeBtn.title = "隐藏辅助浮层(快捷键不受影响)";
    header.appendChild(closeBtn);
    root.appendChild(header);
    let timerInterval = null;
    if (state.secondsLeft !== null) {
      timerInterval = setInterval(() => {
        try {
          const fresh = detectRiddle();
          if (!fresh.present) {
            if (timerInterval !== null) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
            return;
          }
          const secs = fresh.secondsLeft;
          if (secs !== null) {
            timerEl.style.display = "";
            timerEl.textContent = String(secs);
            timerEl.classList.toggle("urgent", secs <= cfg.riddleUrgentSec);
          } else {
            timerEl.style.display = "none";
          }
        } catch {
        }
      }, 1e3);
    }
    const btnsArea = document.createElement("div");
    btnsArea.className = "rui-btns";
    const ponyBtns = [];
    state.options.forEach((opt, i) => {
      const btn = document.createElement("div");
      btn.className = "rui-pony-btn";
      btn.setAttribute("role", "checkbox");
      btn.setAttribute("aria-label", opt.name);
      btn.title = `${opt.name}（快捷键 ${i + 1}）`;
      const seqEl = document.createElement("span");
      seqEl.className = "rui-seq";
      seqEl.textContent = String(i + 1);
      btn.appendChild(seqEl);
      const nameEl = document.createElement("span");
      nameEl.className = "rui-name";
      nameEl.textContent = opt.name;
      btn.appendChild(nameEl);
      try {
        btn.classList.toggle("selected", opt.el.checked);
      } catch {
      }
      btn.addEventListener("click", () => toggleOption(opt, btn));
      ponyBtns.push(btn);
      btnsArea.appendChild(btn);
    });
    root.appendChild(btnsArea);
    const actionsArea = document.createElement("div");
    actionsArea.className = "rui-actions";
    let chartOverlay = null;
    let chartVisible = false;
    if (cfg.riddleChartOverlay) {
      const chartBtn = document.createElement("button");
      chartBtn.className = "rui-chart-btn";
      chartBtn.type = "button";
      chartBtn.textContent = "📖 图鉴";
      chartBtn.title = "切换 PONY CHART 参考图鉴";
      chartBtn.addEventListener("click", () => {
        if (!chartVisible) {
          if (!chartOverlay) {
            chartOverlay = buildChartOverlay();
            try {
              (document.body || document.documentElement).appendChild(chartOverlay);
            } catch {
            }
          }
          chartOverlay.style.display = "";
          chartVisible = true;
          chartBtn.textContent = "📕 关闭图鉴";
        } else {
          if (chartOverlay) chartOverlay.style.display = "none";
          chartVisible = false;
          chartBtn.textContent = "📖 图鉴";
        }
      });
      actionsArea.appendChild(chartBtn);
    }
    const submitBtn = document.createElement("button");
    submitBtn.className = "rui-submit-btn";
    submitBtn.type = "button";
    submitBtn.textContent = "✔ 提交答案";
    submitBtn.title = "提交已选中的小马（快捷键 Enter）";
    submitBtn.addEventListener("click", () => {
      const selected = collectSelected(state);
      submitRiddle(state, selected);
    });
    actionsArea.appendChild(submitBtn);
    root.appendChild(actionsArea);
    closeBtn.addEventListener("click", () => {
      btnsArea.style.display = btnsArea.style.display === "none" ? "" : "none";
      actionsArea.style.display = actionsArea.style.display === "none" ? "" : "none";
      closeBtn.textContent = btnsArea.style.display === "none" ? "⬜" : "✕";
    });
    try {
      (document.body || document.documentElement).appendChild(root);
    } catch {
      if (timerInterval !== null) clearInterval(timerInterval);
      return () => {
      };
    }
    const keydownHandler = (e) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      const action = mapRiddleKey(e.key, state.options.length);
      switch (action.kind) {
        case "toggle": {
          const idx = action.index;
          const opt = state.options[idx];
          const btn = ponyBtns[idx];
          if (opt && btn) {
            toggleOption(opt, btn);
            e.preventDefault();
          }
          break;
        }
        case "submit": {
          syncBtnHighlights(state.options, ponyBtns);
          const selected = collectSelected(state);
          submitRiddle(state, selected);
          e.preventDefault();
          break;
        }
        case "mute": {
          try {
            const isVisible = root.style.display !== "none";
            root.style.display = isVisible ? "none" : "";
          } catch {
          }
          e.preventDefault();
          break;
        }
      }
    };
    if (cfg.riddleHotkeys) {
      try {
        document.addEventListener("keydown", keydownHandler);
      } catch {
      }
    }
    root.addEventListener(
      "hvab-unmount",
      () => {
        if (timerInterval !== null) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        if (cfg.riddleHotkeys) {
          try {
            document.removeEventListener("keydown", keydownHandler);
          } catch {
          }
        }
      },
      { once: true }
    );
    return function unmount2() {
      if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      if (cfg.riddleHotkeys) {
        try {
          document.removeEventListener("keydown", keydownHandler);
        } catch {
        }
      }
      try {
        root.remove();
      } catch {
      }
      if (chartOverlay) {
        try {
          chartOverlay.remove();
        } catch {
        }
        chartOverlay = null;
      }
      const orphanChart = document.getElementById(CHART_ID);
      if (orphanChart) {
        try {
          orphanChart.remove();
        } catch {
        }
      }
    };
  }
  (function registerAudioUnlock() {
    try {
      document.addEventListener("click", unlockAudio, { once: true });
      document.addEventListener("keydown", unlockAudio, { once: true });
    } catch {
    }
  })();
  let active = false;
  let submitted = false;
  let unmount = null;
  function riddleCfg(C) {
    return {
      useRiddleAssist: C.useRiddleAssist,
      riddlePopup: C.riddlePopup,
      riddleHotkeys: C.riddleHotkeys,
      riddleAlarm: C.riddleAlarm,
      riddleNotify: C.riddleNotify,
      riddleChartOverlay: C.riddleChartOverlay,
      riddleCollect: C.riddleCollect,
      riddleUrgentSec: C.riddleUrgentSec,
      riddleAutoRecognize: C.riddleAutoRecognize
    };
  }
  function tickRiddle() {
    try {
      const cfg = riddleCfg(config.all());
      if (!cfg.useRiddleAssist) {
        if (active) {
          unmount == null ? void 0 : unmount();
          unmount = null;
          active = false;
          submitted = false;
        }
        return;
      }
      const rs = detectRiddle();
      if (!rs.present) {
        if (active) {
          unmount == null ? void 0 : unmount();
          unmount = null;
          active = false;
          submitted = false;
        }
        return;
      }
      if (!active) {
        active = true;
        submitted = false;
        if (cfg.riddleAlarm) {
          try {
            playAlarm();
          } catch {
          }
        }
        if (cfg.riddleNotify) {
          try {
            sendDesktop("小马题!", `剩 ${rs.secondsLeft ?? "?"} 秒, 快答`);
          } catch {
          }
        }
        try {
          unmount = mountRiddleUI(rs, cfg);
        } catch {
          unmount = null;
        }
        if (cfg.riddlePopup) {
          try {
            openRiddleWindow();
          } catch {
          }
        }
      }
      if (!submitted && rs.secondsLeft != null && rs.secondsLeft <= cfg.riddleUrgentSec) {
        const selected = rs.options.filter((o) => o.el.checked).map((o) => o.name);
        if (selected.length > 0) {
          try {
            submitRiddle(rs, selected);
          } catch {
          }
          submitted = true;
        } else {
          if (cfg.riddleAlarm) {
            try {
              playAlarm(1);
            } catch {
            }
          }
        }
      }
    } catch {
    }
  }
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
  let regenCd = 0;
  let manaPotCd = 0;
  const MANA_POT_IDS = /* @__PURE__ */ new Set([IT.mDraught, IT.mPotion, IT.mElixir]);
  let cannonRoundSeen = Store.get("cannonRound", -1);
  let curBattleId = Store.get("curBattleId", "");
  let battleStartTs = Store.get("curBattleStart", 0);
  function nextCannonCooldown(actionType, execResult, currentCd, cooldownTurns) {
    return actionType === "cannon" && execResult === true ? cooldownTurns : currentCd;
  }
  function inBattle() {
    return !!document.getElementById("pane_vitals") || !!document.querySelector('[id^="vrh"],[id^="dvrh"]');
  }
  function fingerprint(S) {
    const buffs = Object.entries(S.buff).filter(([, v]) => v.active).map(([k]) => k).join(",");
    const foes = S.enemies.map((e) => `${e.eid}:${e.hpNow}:${Object.keys(e.debuff).filter((k) => e.debuff[k]).join("")}`).join(",");
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
      if (config.get("useRiddleAssist")) {
        try {
          tickRiddle();
        } catch {
        }
      }
      if (config.get("enabled") && nowIn && Date.now() >= busyUntil) {
        const S = reader.read();
        const fp = fingerprint(S);
        const changed = fp !== lastFp;
        const stalled = Date.now() - actedAt > 2500;
        if (changed || stalled) {
          if (changed) {
            const raw = getLastBattle();
            const rj = parseRoundFromJson(raw);
            const rNow = (rj == null ? void 0 : rj.roundNow) ?? S.roundNow;
            const rAll = (rj == null ? void 0 : rj.roundAll) ?? S.roundAll;
            const isNewBattle = !curBattleId || rNow > 0 && cannonRoundSeen > 0 && rNow < cannonRoundSeen;
            if (isNewBattle) {
              if (curBattleId) {
                const victorious = /You are Victorious/i.test(raw || "");
                bus.emit("battle:end", {
                  battleId: curBattleId,
                  battleCode: Store.get("curBattleCode", ""),
                  level: Store.get("curLevel", null),
                  roundAll: Store.get("curRoundAll", 0),
                  victorious,
                  finalRawJson: raw,
                  startedAt: battleStartTs,
                  endedAt: Date.now()
                });
              }
              const meta = deriveBattleCode(S.battleType, rAll, config.get("arenaTiers"));
              curBattleId = `${meta.battleCode}@${Date.now()}`;
              battleStartTs = Date.now();
              Store.set("curBattleId", curBattleId);
              Store.set("curBattleStart", battleStartTs);
              Store.set("curBattleCode", meta.battleCode);
              Store.set("curLevel", meta.level);
              Store.set("curRoundAll", rAll);
            }
            if (S.roundNow > 0 && cannonRoundSeen > 0 && S.roundNow < cannonRoundSeen) cannonCd = 0;
            cannonRoundSeen = S.roundNow;
            if (cannonCd > 0) cannonCd--;
            if (regenCd > 0) regenCd--;
            if (manaPotCd > 0) manaPotCd--;
            Store.set("cannonCd", cannonCd);
            Store.set("cannonRound", cannonRoundSeen);
          }
          S.cannonOnCd = cannonCd > 0;
          S.cannonCdLeft = cannonCd;
          S.regenOnCd = regenCd > 0;
          S.manaPotOnCd = manaPotCd > 0;
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
          const reds = S.enemies.filter((e) => e.alive && e.is_red_boss);
          const foe = reds.length ? reds.map((e) => `红#${e.eid} ${e.hpPct}% ${e.stunned ? "已晕" : "未晕"} ${e.bleeding ? "流血" : "无血"}`).join(" ") : void 0;
          const rec = {
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
            note,
            foe
          };
          logger.push(rec);
          bus.emit("battle:round", {
            battleId: curBattleId,
            battleCode: Store.get("curBattleCode", ""),
            level: Store.get("curLevel", null),
            roundNow: S.roundNow,
            roundAll: S.roundAll,
            turn,
            action: { type: a.type, id: a.id },
            actionLabel: actionLabel(a),
            record: rec,
            rawJson: getLastBattle(),
            bossThisWave: S.enemies.filter((e) => e.alive && e.is_red_boss).length,
            isRetry: !changed || stuckN >= 2
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
              if (a.type === "spell" && a.id === SK.Regen && result === true) regenCd = config.get("REGEN_HOLD");
              if (a.type === "item" && a.id !== void 0 && MANA_POT_IDS.has(a.id) && result === true) manaPotCd = config.get("MANAPOT_HOLD");
            }, delay);
            busyUntil = Date.now() + delay + 150 + (stuckN > 1 ? Math.min(stuckN * 500, 5e3) : 0);
            actedAt = Date.now();
          }
          lastFp = fp;
          reader.prev = S;
        }
      } else if (config.get("enabled") && config.get("farmEnabled") && !nowIn && lastInBattle === false) {
        farmTick();
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
  const QUALITIES = ["Crude", "Fair", "Average", "Superior", "Exquisite", "Magnificent", "Legendary", "Peerless"];
  function parseDrops(lines, dropQuality) {
    const out = { exp: 0, credit: 0, drops: {} };
    for (const line of lines) {
      if (/You are Victorious/i.test(line)) break;
      const eg = line.match(/You gain (\d+) (EXP|Credit)/i);
      if (eg) {
        if (/exp/i.test(eg[2])) out.exp += +eg[1];
        else out.credit += +eg[1];
        continue;
      }
      const sm = line.match(/color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)[^>]*>([^<]+)</i);
      if (!sm) continue;
      const r = sm[1], g = sm[2], b = sm[3], name = sm[4].trim();
      if (r === "255" && g === "0" && b === "0") {
        const q = QUALITIES.findIndex((x) => name.includes(x));
        if (q === -1 || q >= dropQuality) {
          const type = name.split(/\s+/).pop() || name;
          const key = `Equipment of ${type}`;
          out.drops[key] = (out.drops[key] || 0) + 1;
        }
      } else if (r === "186" && g === "5" && b === "180") {
        const cm = name.match(/(\d+)x (Crystal of \w+)/);
        if (cm) out.drops[cm[2]] = (out.drops[cm[2]] || 0) + +cm[1];
        else out.drops[name] = (out.drops[name] || 0) + 1;
      } else if (r === "168" && g === "144" && b === "0") {
        const nm = name.match(/\d+/);
        if (nm) out.credit += +nm[0];
      } else {
        out.drops[name] = (out.drops[name] || 0) + 1;
      }
    }
    return out;
  }
  function emptyStats(nowMs) {
    return {
      startTime: nowMs,
      activeMs: 0,
      exp: 0,
      credit: 0,
      battles: 0,
      rounds: 0,
      turns: 0,
      monsters: 0,
      bosses: 0,
      drops: {},
      restore: {},
      items: {},
      magic: {},
      damage: {},
      proficiency: {},
      hurt: { avg: 0, pavg: 0, mavg: 0, total: 0, count: 0, mp: 0, oc: 0 },
      self: { evade: 0, miss: 0, focus: 0 }
    };
  }
  function accumulateUsage(s, action, lines) {
    if (action.type === "spell" && action.id !== void 0) s.magic["#" + action.id] = (s.magic["#" + action.id] || 0) + 1;
    else if (action.type === "item" && action.id !== void 0) s.items["#" + action.id] = (s.items["#" + action.id] || 0) + 1;
    for (const line of lines) {
      let m = line.match(/you for (\d+) ([a-zA-Z]+) damage/i);
      if (m) {
        const n = +m[1], type = m[2].toLowerCase();
        s.hurt.total += n;
        s.hurt.count++;
        if (/pierc|crush|slash/.test(type)) {
          s.hurt.pavg = (s.hurt.pavg * (s.hurt.count - 1) + n) / s.hurt.count;
        } else {
          s.hurt.mavg = (s.hurt.mavg * (s.hurt.count - 1) + n) / s.hurt.count;
        }
        s.hurt.avg = s.hurt.total / s.hurt.count;
        continue;
      }
      m = line.match(/hits .+ for (\d+) (\w+) damage/i);
      if (m) {
        s.damage[m[2].toLowerCase()] = (s.damage[m[2].toLowerCase()] || 0) + +m[1];
        continue;
      }
      if (/\bevade/i.test(line)) s.self.evade++;
      else if (/\bmiss/i.test(line)) s.self.miss++;
      else if (/\bfocus/i.test(line)) s.self.focus++;
      m = line.match(/restores? (\d+) points? of (\w+)/i);
      if (m) s.restore[m[2].toLowerCase()] = (s.restore[m[2].toLowerCase()] || 0) + +m[1];
    }
  }
  function parseSpawns(lines) {
    const out = [];
    const re = /Spawned Monster [A-Z]:\s*MID=(\d+)\s*\(([^)]+)\)\s*LV=(\d+)\s*HP=(\d+)/;
    for (const line of lines) {
      const m = line.match(re);
      if (m) out.push({ mid: +m[1], name: m[2].trim(), lv: +m[3], hp: +m[4] });
    }
    return out;
  }
  function upsertMonster(db, midMap, s) {
    const cur2 = db[s.name];
    if (cur2 && cur2.mid !== s.mid) {
      midMap[cur2.mid] = cur2;
      delete db[s.name];
    }
    if (midMap[s.mid]) {
      db[s.name] = midMap[s.mid];
      delete midMap[s.mid];
    }
    const rec = db[s.name] ?? { mid: s.mid };
    rec.mid = s.mid;
    rec[s.lv] = s.hp;
    db[s.name] = rec;
  }
  const STATS_KEY = "stats";
  const STATS_OLD_KEY = "statsOld";
  const MDB_KEY = "monsterDB";
  const MMID_KEY = "monsterMID";
  let cur = null;
  let lastRoundSeen = -1;
  function loadStats(nowMs) {
    return Store.get(STATS_KEY, emptyStats(nowMs));
  }
  function initStatsCollector() {
    bus.on("battle:round", (r) => {
      try {
        if (r.isRetry) return;
        if (!config.get("recordEnabled")) return;
        if (!cur) cur = loadStats(Date.now());
        const lines = extractTextlog(r.rawJson);
        accumulateUsage(cur, r.action, lines);
        if (config.get("cacheMonsterHP")) {
          const db = Store.get(MDB_KEY, {});
          const mid = Store.get(MMID_KEY, {});
          let changed = false;
          for (const sp of parseSpawns(lines)) {
            upsertMonster(db, mid, sp);
            changed = true;
          }
          if (changed) {
            Store.set(MDB_KEY, db);
            Store.set(MMID_KEY, mid);
          }
        }
        cur.turns += 1;
        if (r.roundNow !== lastRoundSeen) {
          cur.rounds += 1;
          cur.bosses += r.bossThisWave;
          cur.monsters += r.record.total;
          lastRoundSeen = r.roundNow;
        }
        Store.set(STATS_KEY, cur);
      } catch {
      }
    });
    bus.on("battle:end", (e) => {
      try {
        if (!config.get("recordEnabled")) return;
        if (!cur) cur = loadStats(Date.now());
        const lines = extractTextlog(e.finalRawJson);
        const d = parseDrops(lines, config.get("dropQuality"));
        cur.exp += d.exp;
        cur.credit += d.credit;
        for (const k in d.drops) cur.drops[k] = (cur.drops[k] || 0) + d.drops[k];
        cur.battles += 1;
        lastRoundSeen = -1;
        cur.activeMs += Math.max(0, e.endedAt - e.startedAt);
        Store.set(STATS_KEY, cur);
        const old = Store.get(STATS_OLD_KEY, []);
        old.push({ battleCode: e.battleCode, level: e.level, exp: d.exp, credit: d.credit, endedAt: e.endedAt });
        const keep = config.get("archiveMaxBattles");
        Store.set(STATS_OLD_KEY, old.slice(-keep));
        void e.battleId;
      } catch {
      }
    });
  }
  function hookNet() {
    const xo = XMLHttpRequest.prototype.open;
    const xs = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(_method, url) {
      this.__url = String(url);
      return xo.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
      this.addEventListener("load", () => {
        if (/\/json|Battle|api/i.test(this.__url || "")) setLastBattle(this.responseText);
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
              setLastBattle(t);
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
    bus.on("battle:active", (active2) => {
      if (active2) {
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
      getLastBattle,
      config,
      log: () => logger.all(),
      logText: () => logger.toText(),
      clearLog: () => logger.clear()
    };
  }
  hookNet();
  initStatsCollector();
  window.addEventListener("beforeunload", () => logger.flush());
  onReady(() => {
    mountUI();
    startLoop();
  });

})();