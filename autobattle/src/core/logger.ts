// 战斗日志: 环形缓冲 + GM 落盘(跨刷新可查). 每决策一条, 供场中/场后诊断.
import { Store } from './store';
import { bus } from './bus';
import type { LogRecord } from '../types';

const MAX = 5000; // 最多留最近 5000 条决策(跨多场)
const KEY = 'battlelog';

let buf: LogRecord[] = (() => {
  const saved = Store.get<LogRecord[]>(KEY, []);
  return Array.isArray(saved) ? saved.slice(-MAX) : [];
})();

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    Store.set(KEY, buf);
  }, 3000); // 防抖落盘, 最多每 3s 写一次(5000 条 JSON 较大, 降低 GM 写频率)
}

/** 一条记录 → 可读行(等宽对齐) */
export function fmtLine(r: LogRecord): string {
  const p = (n: number, w: number) => String(n).padStart(w);
  return `${r.round.padEnd(7)} T${p(r.turn, 2)} | OC ${p(r.oc, 3)} ${r.cannon} | 怪${r.alive}/${r.total} | HP${p(r.hp, 3)} MP${p(r.mp, 3)} SP${p(r.sp, 3)} | 架${r.stance ? '开' : '关'} | ▶ ${r.action}${r.note ? '  « ' + r.note : ''}`;
}

export const logger = {
  push(r: LogRecord): void {
    buf.push(r);
    if (buf.length > MAX) buf.splice(0, buf.length - MAX);
    scheduleSave();
    bus.emit('log:update', r);
  },
  all(): LogRecord[] {
    return buf;
  },
  count(): number {
    return buf.length;
  },
  toText(): string {
    return buf.map(fmtLine).join('\n');
  },
  clear(): void {
    buf = [];
    Store.set(KEY, []);
    bus.emit('log:update', null);
  },
};
