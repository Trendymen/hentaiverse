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
  OC_ON: 0.4,
  OC_OFF: 0.22,
  HS_MIN_ENEMIES: 2,
  CANNON_MIN_ENEMIES: 4,
  // ── M2 开关/节奏 ──
  useCannon: true,
  cannonCdMs: 22000, // 小马炮冷却节流(放完 22s 内不重放防卡)
  scrollFirst: true, // 起手/2墙缺优先卷轴(关=法术逐个补省卷轴)
  delayMin: 160,
  delayMax: 400, // 动作间随机延迟范围(ms)
  useWeaken: true,
  useImperil: true, // 红怪减益序列开关
  useChanneling: true, // Channeling 主动利用
};

export type Config = typeof DEFAULT_CONFIG;

// 单一真相: 模块加载时合并默认值 + 持久化覆盖; 之后所有读写统一走 config.get/set, 落盘到 Store 'config' 键.
let current: Config = { ...DEFAULT_CONFIG, ...Store.get<Partial<Config>>('config', {}) };

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
