import { Store } from './store';

/** 默认配置. M1 界面态 + M2 战斗常量/开关. 战斗外(连刷/保护)项 M3+ 加入. */
export const DEFAULT_CONFIG = {
  // ── M1 界面态 ──
  enabled: false, // B大脑总开关 (🧠自动 / ⏸暂停)
  panelOpen: false, // 抽屉是否展开
  logOpen: false, // 战斗日志窗口是否打开(持久化记忆; 进战斗自动恢复, 手动✕关或退出战斗清)
  activeTab: 'battle' as 'battle' | 'farm' | 'guard' | 'notify' | 'stats',
  // ── M2 战斗常量(玩家实测换算; 动态满值会自适应覆盖) ──
  HPMAX: 24232,
  MPMAX: 2002,
  SPMAX: 1470,
  OCMAX: 250,
  SPARK_RESERVE: 340, // ① 永久预留可放 Spark 的 MP
  BURST_EST: 0.45, // ② 满暴击连击波(占血池)
  PANIC_RED: 0.35,
  PANIC_NORM: 0.25,
  MP_FUSE: 0.3, // ④ MP 熔断阈值
  HP_HEAL: 0.55, // ③ 常规喝血线
  STRUGGLE_HP: 0.5, // 放弃攒炮的血线阈值(hp 跌破此比例 = 血线下降, 转单体技减压)
  STRUGGLE_STREAK: 2, // 连续几次决策跌破 STRUGGLE_HP 才放弃攒炮(去抖, 防单次瞬掉误触发)
  MP_LOW: 0.45, // 常规回蓝线(HUD「回蓝」滑块): P9 现按 mp/maxMp 直接算(不扣预留), 设多少=HUD多少; mp<45% 就用药水/长效补, 绝不碰终极
  SP_LOW: 0.3,
  MAINTAIN_LINE: 0.75, // 长效药主动维持线(硬编码, 不上面板): HP/MP/SP 任一<此值且对应长效药可点 → 喝长效药养生(便宜+持续回, 趁早补满少掉低线/急救); 排在平砍前不抢核心输出, 长效药独立冷却天然限频
  SP_RESERVE_RATIO: 0.45, // 高压/灵力盾场景的 SP 预留线: 不要求开架式也会补灵力
  OC_ON: 0.5, // 灵动架式开启阈值: 游戏要 ≥50% 斗气才能开(原 0.4 → OC 40~50% 点架式是空操作 bug)
  OC_OFF: 0.22,
  HS_MIN_ENEMIES: 2,
  CANNON_MIN_ENEMIES: 5, // 攒炮最少怪: 活怪≥此值才攒炮/放炮 AOE(曾 4→6 挡小局空转, 现按需改回 5 放宽)
  CANNON_MIN_OC: 200, // 小马炮需 200 斗气(满 250); 不够则游戏把按钮置灰(opacity:0.5)
  CANNON_CD_TURNS: 50, // 小马炮放完后 50 回合冷却(实测确认, 跨波/轮持续). loop 用 Store 持久化追踪(跨 reload 保留)
  CANNON_OC_GAIN_EST: 20, // 关架式平砍攒OC的每回合估值: 仅用于冷却尾段预判窗口 turnsToReady=ceil((200-oc)/此值). 估高→攒得晚(更防250溢出但可能没攒满), 估低→攒得早(更易及时但易溢出). 按实战日志可调
  REGEN_HOLD: 12, // 细胞活化放出后多少回合不重放: 覆盖 reader 的 DOM 检测空窗(放出后图标短暂读不到→连放烧蓝); 过窗后仍由 buff 检测主导, reader 失灵也最多每 12 回合放一次
  MANAPOT_HOLD: 3, // 回蓝药喝后多少回合常规线(P9)不重复喝: 防长效药慢回看不到效果→同波连喝长效/药水/终极; 急救线(P1/P3/墙倒)不受限
  CANNON_YIELD_OC: 175, // 接近200的线: 现仅用作 ocFloorOk 炮可用时的盾击地板(为炮预留); P12 攒炮冲刺起始已改用开架式线 OC_ON×OCMAX(50%=125)
  // ── M2 开关/节奏 ──
  useCannon: true,
  cannonYieldStance: true, // 架式临门让位(仅 OC≥CANNON_YIELD_OC): 架式烧10%OC但反击产更多→常驻净涨, 只在冲200那1-2回合关架式, 不全程压
  cannonCdMs: 1500, // 仅防"同回合重复点"的短保护; 真冷却(50回合)与 OC 门控靠按钮置灰检测, 不再用墙钟节流
  scrollFirst: true, // 起手/2墙缺优先卷轴(关=法术逐个补省卷轴)
  delayMin: 160,
  delayMax: 400, // 动作间随机延迟范围(ms)
  STUCK_PAUSE: 12, // 连续放不出达此次数 → 疑似网络卡/无响应 → 自动暂停告警(退避减速后仍不通才暂停, 防死循环刷屏)
  useWeaken: true,
  useImperil: true, // 红怪减益序列开关
  useChanneling: true, // Channeling 主动利用
  useAbsorb: false, // 法系怪吸收墙(默认关; 盾战物防为主, 遇法系怪再开)
  useShadowVeil: true, // 高压影纱: 默认只在压力场景维护, 低压保留反击/OC收益
  shadowVeilPressureOnly: true,
  usePressureControl: true, // 高压控制层: Weaken -> Silence -> 高价值 Imperil
  CONTROL_MIN_ENEMIES: 4,
  useSilence: true,
  useBlind: false,
  useSlow: false,
  useSleep: false, // 本轮只保留配置/ID, 不进默认自动链
  useVitalStrike: true, // 要害强击(实测 onclick=set_hostile_skill, castHostileOn 释放机制确认; 连招打已晕眩目标)
  useShieldBash: true, // 盾击(同上; 连招给未晕眩目标铺垫, 已晕眩不重复)
  useShieldBashOcFloor: true, // 无压力(level==='low')盾击晕杂兵需放完 OC 仍≥地板(炮可用→CANNON_YIELD_OC 175, 否则开架式线 OC_ON*OCMAX 125), 把 OC 留给架式/攒炮; false 退回旧"oc≥25 即晕"(灰度可一键回滚)
  useEndgameStanceOff: true, // 单红收尾(只剩1红名)关架式攒OC, 让盾击→要害→慈悲处决链在关架式下跑(解除连招stanceOn门槛+强制不攒炮); false 退回旧"架式常开磨"(灰度回退)
  useMercifulBlow: true, // 最后的慈悲(红名怪 25%+流血 处决; castHostileOn 已验证; 须配要害产流血→连招末步)
  // ── 目标权重系统(翻写 dodying finWeight; 详见 specs/2026-06-05-autobattle-target-weight-design.md)──
  useTargetWeight: true, // 总开关; 只控制 P16 是否按权重排序. 血条 bug 修复不受此控制. 2026-06-06 GF/竞技场真机核对通过(切换即时生效·血量+破甲滚雪球排序·无死磕)→ 脱离灰度转默认开
  baseHpRatio: 1, // 关键可调: >0 低血优先 / <0 高血优先
  yggdrasilExtraWeight: -1000, // 内置: 世界树 boss 绝对优先
  unreachableWeight: 1000, // 内置: 死怪垫底
  // 内置 13 状态权重(reference 1067-1079 实测默认值). statusWeight 是 record, 将来若做面板可调需注意整体覆盖语义
  statusWeight: { We: 12, Bl: 10, Slo: 15, Si: 10, Sle: 100, Im: -15, PA: -12, BW: -10, Co: -109, Dr: 2, MN: 7, Stun: 290, CM: -20 } as Record<string, number>,
  // ── 要害延迟喂流血(BleedTimer; 详见 specs/2026-06-06-autobattle-delayed-bleed-design.md)──
  useDelayedBleed: true, // 延迟逻辑开关; false 退回旧"红名一晕就喂"(灰度可一键回滚)
  BLEED_DURATION: 5, // 流血持续回合 B(要害产的 DoT 覆盖窗口)
  BLEED_SAFETY: 1, // 安全余量; 要求 T ≤ B-safety(=4) 才喂, 留 1 回合冗余防 DoT 先过期
  BLEED_FALLBACK_HP: 30, // 无主动速率样本/速率太小时的兜底血量窗口(hpPct ≤ 此值就喂)
  BLEED_RATE_WINDOW: 3, // 速率移动平均窗口(最近 2-3 个主动样本)
  BLEED_MIN_SAMPLES: 1, // 走速率主路最少样本数, 不足走兜底
  BLEED_MIN_RATE: 1, // 速率有效下限(%/回合); ≤ 此值视为无效走兜底
  // ── M3 连刷(farm; 详见 specs/2026-06-06-autobattle-m3-farm-design.md)──
  farmEnabled: false, // 连刷独立开关(与 enabled 解耦; 二者同开才连刷)
  autoEncounter: false, // 自动接受遭遇战(跨站 e-hentai; 默认关需主动开)
  restoreStamina: false, // 战前精力不足喝药恢复(消耗道具; 默认关; M3 盲发, 库存检测留 M4)
  farmTickMs: 1500, // 连刷 tick 节奏(≥300ms 服务器红线, 留余量)
  grPerDay: 3, // GF 每日开场数(arena.gr 初值, 跨日重置)
  arenaLevels: '', // 待战等级/RB 逗号串(逆序消费); 可含 'gr' 代表 GF
  staminaLow: 60, // 开战精力下限
  staminaEncounter: 60, // 遭遇战精力下限
  staminaLowWithNat: 0, // 含 24h 自然恢复的下限
  encounterCdMin: 30, // 遭遇常规冷却(分钟)
  staminaHathperk: false, // 精力 hathperk(影响盲发恢复量预估 +20/+10)
  // ── M3 增量: 异世界续刷 + 战败退出 ──
  autoSwitchIsekai: false, // 异世界自动续刷(本世界刷完后切异世界; 默认关)
  ISEKAI_SWITCH_GUARD_MIN: 10, // 切换异世界最小间隔(分钟; 防频繁切换)
  autoSkipDefeated: false, // 战败后跳过该靶继续连刷(false=停刷)
  // ── 记录与分析里程碑(详见 specs/2026-06-07-autobattle-record-analysis-design.md)──
  recordEnabled: true,        // A 收益统计总开关
  recordArchive: false,       // B 调优日志总开关(阶段2; 重存储默认关)
  cacheMonsterHP: true,       // monsterDB 落盘
  dropQuality: 6,             // 装备品质门槛(0Crude..7Peerless; 默认6=Legendary起记)
  archiveMaxBattles: 200,     // B 最多留几场(阶段2)
  archiveKeepPerLevel: 20,    // 每准入等级最多留几场(阶段2)
  statsRateMode: 'session' as 'session' | 'active',  // 速率口径(阶段3)
  showPlayerLevel: true,      // 显示玩家角色等级(阶段3)
  // 竞技场准入等级映射(截图底本, 覆盖 Lv.80~300; 失配→level=null+AR-R${roundAll})
  arenaTiers: [
    { roundAll: 25, level: 80, name: '力量流失' }, { roundAll: 30, level: 90, name: '杀戮地带' },
    { roundAll: 35, level: 100, name: '最终阶段' }, { roundAll: 40, level: 110, name: '无尽旅程' },
    { roundAll: 45, level: 120, name: '梦陨之时' }, { roundAll: 50, level: 130, name: '流亡之途' },
    { roundAll: 55, level: 140, name: '封印之力' }, { roundAll: 60, level: 150, name: '崭新之翼' },
    { roundAll: 65, level: 165, name: '弑神之路' }, { roundAll: 70, level: 180, name: '死亡前夜' },
    { roundAll: 75, level: 200, name: '命运三女神与树' }, { roundAll: 80, level: 225, name: '世界末日' },
    { roundAll: 85, level: 250, name: '永恒黑暗' }, { roundAll: 90, level: 300, name: '与龙共舞' },
  ] as { roundAll: number; level: number; name: string }[],
  // ── 小马题自动答题(riddle; 详见 specs/2026-06-07-autobattle-riddle-design.md)──
  useRiddleAssist: true, // 小马题辅助总开关
  riddlePopup: true, // 弹窗模式(独立窗答, 绕后台标签节流)
  riddleHotkeys: true, // 数字 1-6 / Enter / Esc 快捷键
  riddleAlarm: true, // 音频警报
  riddleNotify: true, // 桌面通知 GM_notification
  riddleChartOverlay: true, // PONY CHART 图鉴浮层
  riddleCollect: true, // 数据采集(IndexedDB, 铺路 CNN)
  riddleUrgentSec: 10, // 剩此秒数(默认10): 有已勾选→超时自动提交已勾的; 一只没勾→加急催答提醒
  riddleAutoRecognize: false, // 自动识别(CNN; 现 stub 无效, 未来接入后生效)
};

export type Config = typeof DEFAULT_CONFIG;

const FARM_WAKE_KEYS = new Set<keyof Config>([
  'farmEnabled',
  'autoEncounter',
  'restoreStamina',
  'grPerDay',
  'arenaLevels',
  'staminaLow',
  'staminaEncounter',
  'staminaLowWithNat',
  'autoSwitchIsekai',
  'autoSkipDefeated',
]);

// 单一真相: 模块加载时合并默认值 + 持久化覆盖; 之后所有读写统一走 config.get/set, 落盘到 Store 'config' 键.
let current: Config = { ...DEFAULT_CONFIG, ...Store.get<Partial<Config>>('config', {}) };

// 配置迁移: 旧存档里"后来改过默认值"的键会用旧值盖住新默认(根因: config = {...新默认, ...旧存档}).
// 版本升级时, 对这些键强制采用新默认(一次性; 之后仍尊重用户面板改动).
const CONFIG_VERSION = 6;
if (Store.get<number>('configVersion', 0) < CONFIG_VERSION) {
  current.cannonCdMs = DEFAULT_CONFIG.cannonCdMs; // 旧存档 22000(22s) → 1500: 根治"炮放一次后整轮不再放"
  current.OC_ON = DEFAULT_CONFIG.OC_ON; // 0.4 → 0.5: 架式开启对齐游戏 ≥50% 要求, 去掉无效空点
  current.CANNON_MIN_ENEMIES = DEFAULT_CONFIG.CANNON_MIN_ENEMIES; // v5: 6→5 放宽; 旧存档强制刷新为当前默认(5)
  current.MP_LOW = DEFAULT_CONFIG.MP_LOW; // v4: P9 回蓝口径从 mpFree(扣340预留) 改 mp 直算, 旧存档 0.35 语义失效 → 强制刷新默认 0.45(HUD<45%补); 之后仍尊重面板改动
  Store.set('config', current);
  Store.set('configVersion', CONFIG_VERSION);
}

export const config = {
  get<K extends keyof Config>(key: K): Config[K] {
    return current[key];
  },
  set<K extends keyof Config>(key: K, val: Config[K]): void {
    const changed = !Object.is(current[key], val);
    const next: Config = { ...current };
    next[key] = val;
    current = next;
    Store.set('config', current);
    if (changed && FARM_WAKE_KEYS.has(key)) {
      Store.set('farmState', 'IDLE');
      Store.set('farmCooldownUntil', 0);
    }
  },
  all(): Config {
    return current;
  },
};
