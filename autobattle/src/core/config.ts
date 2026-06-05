import { Store } from './store';

/** 默认配置. M1 界面态 + M2 战斗常量/开关. 战斗外(连刷/保护)项 M3+ 加入. */
export const DEFAULT_CONFIG = {
  // ── M1 界面态 ──
  enabled: false, // B大脑总开关 (🧠自动 / ⏸暂停)
  panelOpen: false, // 抽屉是否展开
  activeTab: 'battle' as 'battle' | 'farm' | 'guard' | 'notify',
  // ── M2 战斗常量(玩家实测换算; 动态满值会自适应覆盖) ──
  HPMAX: 24232,
  MPMAX: 2002,
  SPMAX: 1470,
  OCMAX: 250,
  SPARK_RESERVE: 340, // ① 永久预留可放 Spark 的 MP
  BURST_EST: 0.45, // ② 满暴击连击波(占血池)
  PANIC_RED: 0.5,
  PANIC_NORM: 0.25,
  MP_FUSE: 0.3, // ④ MP 熔断阈值
  HP_HEAL: 0.6,
  MP_LOW: 0.35,
  SP_LOW: 0.3,
  OC_ON: 0.5, // 灵动架式开启阈值: 游戏要 ≥50% 斗气才能开(原 0.4 → OC 40~50% 点架式是空操作 bug)
  OC_OFF: 0.22,
  HS_MIN_ENEMIES: 2,
  CANNON_MIN_ENEMIES: 4,
  CANNON_MIN_OC: 200, // 小马炮需 200 斗气(满 250); 不够则游戏把按钮置灰(opacity:0.5)
  CANNON_CD_TURNS: 50, // 小马炮放完后 50 回合冷却(实测确认). loop 按回合追踪, 弃用 opacity 判冷却(OC<200 与冷却同为 opacity:0.5 无法区分)
  // ── M2 开关/节奏 ──
  useCannon: true,
  cannonYieldStance: true, // 攒炮时架式让路: 架式每回合烧 10%OC, 一开就永远攒不到 200; 关掉它让 OC 爬满放炮
  cannonCdMs: 1500, // 仅防"同回合重复点"的短保护; 真冷却(50回合)与 OC 门控靠按钮置灰检测, 不再用墙钟节流
  scrollFirst: true, // 起手/2墙缺优先卷轴(关=法术逐个补省卷轴)
  delayMin: 160,
  delayMax: 400, // 动作间随机延迟范围(ms)
  useWeaken: true,
  useImperil: true, // 红怪减益序列开关
  useChanneling: true, // Channeling 主动利用
  useAbsorb: false, // 法系怪吸收墙(默认关; 盾战物防为主, 遇法系怪再开)
  useVitalStrike: true, // 要害强击(实测 onclick=set_hostile_skill, castHostileOn 释放机制确认; 连招打已晕眩目标)
  useShieldBash: true, // 盾击(同上; 连招给未晕眩目标铺垫, 已晕眩不重复)
  useMercifulBlow: false, // 最后的慈悲(残血处决; 待怪 HP% 读法, 默认关)
  // ── 目标权重系统(翻写 dodying finWeight; 详见 specs/2026-06-05-autobattle-target-weight-design.md)──
  useTargetWeight: false, // 总开关(默认关·灰度); 只控制 P16 是否按权重排序. 血条 bug 修复不受此控制
  baseHpRatio: 1, // 关键可调: >0 低血优先 / <0 高血优先
  yggdrasilExtraWeight: -1000, // 内置: 世界树 boss 绝对优先
  unreachableWeight: 1000, // 内置: 死怪垫底
  // 内置 13 状态权重(reference 1067-1079 实测默认值). statusWeight 是 record, 将来若做面板可调需注意整体覆盖语义
  statusWeight: { We: 12, Bl: 10, Slo: 15, Si: 10, Sle: 100, Im: -15, PA: -12, BW: -10, Co: -109, Dr: 2, MN: 7, Stun: 290, CM: -20 } as Record<string, number>,
};

export type Config = typeof DEFAULT_CONFIG;

// 单一真相: 模块加载时合并默认值 + 持久化覆盖; 之后所有读写统一走 config.get/set, 落盘到 Store 'config' 键.
let current: Config = { ...DEFAULT_CONFIG, ...Store.get<Partial<Config>>('config', {}) };

// 配置迁移: 旧存档里"后来改过默认值"的键会用旧值盖住新默认(根因: config = {...新默认, ...旧存档}).
// 版本升级时, 对这些键强制采用新默认(一次性; 之后仍尊重用户面板改动).
const CONFIG_VERSION = 2;
if (Store.get<number>('configVersion', 0) < CONFIG_VERSION) {
  current.cannonCdMs = DEFAULT_CONFIG.cannonCdMs; // 旧存档 22000(22s) → 1500: 根治"炮放一次后整轮不再放"
  current.OC_ON = DEFAULT_CONFIG.OC_ON; // 0.4 → 0.5: 架式开启对齐游戏 ≥50% 要求, 去掉无效空点
  Store.set('config', current);
  Store.set('configVersion', CONFIG_VERSION);
}

export const config = {
  get<K extends keyof Config>(key: K): Config[K] {
    return current[key];
  },
  set<K extends keyof Config>(key: K, val: Config[K]): void {
    const next: Config = { ...current };
    next[key] = val;
    current = next;
    Store.set('config', current);
  },
  all(): Config {
    return current;
  },
};
