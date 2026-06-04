import { Store } from './store';

/** 默认配置. M1 仅放总开关与界面态; 战斗/连刷/保护项随里程碑加入. */
export const DEFAULT_CONFIG = {
  enabled: false, // B大脑总开关 (🧠自动 / ⏸暂停)
  panelOpen: false, // 抽屉是否展开
  activeTab: 'battle' as 'battle' | 'farm' | 'guard' | 'notify',
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
