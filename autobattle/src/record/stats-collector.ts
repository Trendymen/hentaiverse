// A 收益统计订阅者(副作用壳). 订阅 bus → 调纯函数 → 落 Store. 跳过 isRetry. battle:end 结算掉落.
import { bus } from '../core/bus';
import { Store } from '../core/store';
import { config } from '../core/config';
import { extractTextlog } from './battle-code';
import { parseDrops } from './drop-parse';
import { emptyStats, accumulateUsage } from './usage-parse';
import { parseSpawns, upsertMonster } from './monster-db';
import type { StatsAccum, MonsterDB, MonsterMID } from '../types';

const STATS_KEY = 'stats';
const STATS_OLD_KEY = 'statsOld';
const MDB_KEY = 'monsterDB';
const MMID_KEY = 'monsterMID';

let cur: StatsAccum | null = null;      // 当前累计(in-progress)
let curBattleId = '';                   // 本场 id
let lastRoundSeen = -1;                 // 上次记录的 roundNow(检测新波累计 rounds/bosses/monsters)

function loadStats(nowMs: number): StatsAccum {
  return Store.get<StatsAccum>(STATS_KEY, emptyStats(nowMs));
}

export function initStatsCollector(): void {
  bus.on('battle:round', (r) => {
    try {
      if (r.isRetry) return;                 // 安全网重试/stalled → 不计入
      if (!config.get('recordEnabled')) return;
      if (!cur) cur = loadStats(Date.now());
      const lines = extractTextlog(r.rawJson);
      // usage(技能从结构化 action; damage/hurt 等从 textlog)
      accumulateUsage(cur, r.action, lines);
      // monsterDB(开关控落盘)
      if (config.get('cacheMonsterHP')) {
        const db = Store.get<MonsterDB>(MDB_KEY, {});
        const mid = Store.get<MonsterMID>(MMID_KEY, {});
        let changed = false;
        for (const sp of parseSpawns(lines)) { upsertMonster(db, mid, sp); changed = true; }
        if (changed) { Store.set(MDB_KEY, db); Store.set(MMID_KEY, mid); }
      }
      // 每真实回合 +turns; 新波(roundNow 变)累计 rounds/bosses/monsters
      cur.turns += 1;
      if (r.roundNow !== lastRoundSeen) {
        cur.rounds += 1;
        cur.bosses += r.bossThisWave;     // boss 口径 = is_red_boss(reader.ts:188), 每波聚合
        cur.monsters += r.record.total;   // 本波总怪数(LogRecord.total = monsterTotal)
        lastRoundSeen = r.roundNow;
      }
      Store.set(STATS_KEY, cur);
    } catch { /* 采集不能崩 */ }
  });

  bus.on('battle:end', (e) => {
    try {
      if (!config.get('recordEnabled')) return;
      if (!cur) cur = loadStats(Date.now());
      // 掉落 + EXP/Credit(末回合 /json)
      const lines = extractTextlog(e.finalRawJson);
      const d = parseDrops(lines, config.get('dropQuality'));
      cur.exp += d.exp; cur.credit += d.credit;
      for (const k in d.drops) cur.drops[k] = (cur.drops[k] || 0) + d.drops[k];
      cur.battles += 1;
      cur.activeMs += Math.max(0, e.endedAt - e.startedAt);
      Store.set(STATS_KEY, cur);
      // 归档单场聚合摘要(玩家向多场对比; 限 archiveMaxBattles)
      const old = Store.get<({ battleCode: string; level: number | null; exp: number; credit: number; endedAt: number })[]>(STATS_OLD_KEY, []);
      old.push({ battleCode: e.battleCode, level: e.level, exp: d.exp, credit: d.credit, endedAt: e.endedAt });
      const keep = config.get('archiveMaxBattles');
      Store.set(STATS_OLD_KEY, old.slice(-keep));
      void curBattleId; void e.battleId;   // ui/stats(Task 11)订阅 battle:end 自刷, collector 不直接 emit
    } catch { /* 采集不能崩 */ }
  });
}
