// 遭遇战(Encounter)纯函数. 翻写 dodying getEncounter hvAutoAttack.user.js:2195-2212 + updateEncounter 冷却 L2429-2438.
// 零 DOM/零 Store: now/recs 传入, 可控制台喂数据验证.
import type { EncounterRec } from '../types';

const MS_PER_HOUR = 3600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** UTC 同日判定(dodying time(2) 等价). */
export function isSameUtcDay(aMs: number, bMs: number): boolean {
  return Math.floor(aMs / MS_PER_DAY) === Math.floor(bMs / MS_PER_DAY);
}

/** 只保留当日记录(getToday, 翻写 L2196). */
export function filterToday(recs: EncounterRec[], nowMs: number): EncounterRec[] {
  return recs.filter((e) => isSameUtcDay(e.time, nowMs));
}

/** 合并 current+stored 去重(getEncounter, 翻写 L2195-2212): 按 href 取 max time/encountered, 当日过滤, time 降序. */
export function mergeEncounters(current: EncounterRec[], stored: EncounterRec[], nowMs: number): EncounterRec[] {
  const dict: Record<string, EncounterRec> = {};
  for (const e of current) dict[e.href ?? 'newDawn'] = { ...e };
  for (const e of stored) {
    const key = e.href ?? 'newDawn';
    if (!dict[key]) dict[key] = { ...e };
    dict[key].time = Math.max(dict[key].time, e.time);
    dict[key].encountered = e.encountered || dict[key].encountered ? Math.max(dict[key].encountered ?? 0, e.encountered ?? 0) : undefined;
  }
  return filterToday(Object.values(dict), nowMs).sort((x, y) => y.time - x.time);
}

/** 冷却(翻写 updateEncounter L2429-2438): 满24→次日UTC / 从未→0 / 否则→cdMs(30min). */
export function computeCooldown(recs: EncounterRec[], nowMs: number, lastEH: number, cdMs: number): number {
  const encountered = recs.filter((e) => e.encountered && e.href);
  const last = recs[0]?.time ?? lastEH ?? 0;
  let cd: number;
  if (encountered.length >= 24) cd = Math.floor(recs[0].time / MS_PER_DAY + 1) * MS_PER_DAY - nowMs;
  else if (!last) cd = 0;
  else cd = cdMs + last - nowMs;
  return Math.max(0, cd);
}

/** 选第一个未接受的遭遇 href(翻写 checkIsHV L2168-2173). */
export function pickEngageable(recs: EncounterRec[]): string | undefined {
  for (const e of recs) {
    if (e.encountered) continue;
    if (e.href) return e.href;
  }
  return undefined;
}
