// 逐回合 usage 累加(纯函数). 翻写 dodying recordUsage hvAutoAttack.user.js:4244-4318.
// 技能/物品次数从【结构化 action】累加(非中文串); damage/hurt/restore/proficiency/evade/miss/focus 从 textlog 文本.
import type { StatsAccum } from '../types';

/** 空累计(stats-collector 初始化用) */
export function emptyStats(nowMs: number): StatsAccum {
  return {
    startTime: nowMs, activeMs: 0,
    exp: 0, credit: 0, battles: 0, rounds: 0, turns: 0, monsters: 0, bosses: 0,
    drops: {}, restore: {}, items: {}, magic: {}, damage: {}, proficiency: {},
    hurt: { avg: 0, pavg: 0, mavg: 0, total: 0, count: 0, mp: 0, oc: 0 },
    self: { evade: 0, miss: 0, focus: 0 },
  };
}

/** 累加一回合: 技能/物品次数(结构化 action) + 文本统计(damage/hurt/restore/proficiency/evade/miss/focus). 原地改 s. */
export function accumulateUsage(s: StatsAccum, action: { type: string; id?: number }, lines: string[]): void {
  // 技能/物品次数(结构化, 不解析中文)
  if (action.type === 'spell' && action.id !== undefined) s.magic['#' + action.id] = (s.magic['#' + action.id] || 0) + 1;
  else if (action.type === 'item' && action.id !== undefined) s.items['#' + action.id] = (s.items['#' + action.id] || 0) + 1;
  for (const line of lines) {
    // 受到伤害: 'hits you for N <type> damage' (物理 pierc/crush/slash, 否则魔法)
    let m = line.match(/you for (\d+) ([a-zA-Z]+) damage/i);
    if (m) {
      const n = +m[1], type = m[2].toLowerCase();
      s.hurt.total += n; s.hurt.count++;
      if (/pierc|crush|slash/.test(type)) { s.hurt.pavg = (s.hurt.pavg * (s.hurt.count - 1) + n) / s.hurt.count; }
      else { s.hurt.mavg = (s.hurt.mavg * (s.hurt.count - 1) + n) / s.hurt.count; }
      s.hurt.avg = s.hurt.total / s.hurt.count;
      continue;
    }
    // 造成伤害: 'hits <foe> for N <type> damage' (我方输出)
    m = line.match(/hits .+ for (\d+) (\w+) damage/i);
    if (m) { s.damage[m[2].toLowerCase()] = (s.damage[m[2].toLowerCase()] || 0) + +m[1]; continue; }
    // 闪避/未命中/集中
    if (/\bevade/i.test(line)) s.self.evade++;
    else if (/\bmiss/i.test(line)) s.self.miss++;
    else if (/\bfocus/i.test(line)) s.self.focus++;
    // 回复: 'restores N points of (Health|Magic|Spirit)'
    m = line.match(/restores? (\d+) points? of (\w+)/i);
    if (m) s.restore[m[2].toLowerCase()] = (s.restore[m[2].toLowerCase()] || 0) + +m[1];
  }
}
