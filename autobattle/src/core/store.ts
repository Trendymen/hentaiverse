// 持久化: GM 优先, localStorage 兜底. 全新工程键前缀 hvab_.
const PREFIX = 'hvab_';

export const Store = {
  get<T>(key: string, def: T): T {
    try {
      if (typeof GM_getValue === 'function') return GM_getValue(PREFIX + key, def) as T;
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? def : (JSON.parse(raw) as T);
    } catch {
      return def;
    }
  },
  set<T>(key: string, val: T): void {
    try {
      if (typeof GM_setValue === 'function') GM_setValue(PREFIX + key, val);
      else localStorage.setItem(PREFIX + key, JSON.stringify(val));
    } catch {
      /* 持久化失败不致命, 忽略 */
    }
  },
};
