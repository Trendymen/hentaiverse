// monsterDB upsert(纯函数). 翻写 dodying hvAutoAttack.user.js:3200-3238(同名异 MID 备份/恢复).
// 喂 /json textlog 行(英文 'Spawned Monster X: MID=N (Name) LV=N HP=N'; 非汉化 DOM '生成怪物').
import type { MonsterDB, MonsterMID } from '../types';

export interface SpawnInfo { mid: number; name: string; lv: number; hp: number; }

/** 从 textlog 行解析 Spawned 怪物(reader.parseSpawnHp 同源正则, 但取 MID/Name/LV/HP). */
export function parseSpawns(lines: string[]): SpawnInfo[] {
  const out: SpawnInfo[] = [];
  const re = /Spawned Monster [A-Z]:\s*MID=(\d+)\s*\(([^)]+)\)\s*LV=(\d+)\s*HP=(\d+)/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) out.push({ mid: +m[1], name: m[2].trim(), lv: +m[3], hp: +m[4] });
  }
  return out;
}

/** upsert 一只怪到 db(同名异 MID → 旧数据备份到 midMap; midMap 有本 MID 备份 → 恢复). 原地改 db/midMap. */
export function upsertMonster(db: MonsterDB, midMap: MonsterMID, s: SpawnInfo): void {
  const cur = db[s.name];
  if (cur && cur.mid !== s.mid) {
    midMap[cur.mid] = cur;            // 名字被别的怪占用 → 备份旧
    delete db[s.name];
  }
  if (midMap[s.mid]) {                // 本 MID 有旧备份 → 恢复
    db[s.name] = midMap[s.mid];
    delete midMap[s.mid];
  }
  const rec = db[s.name] ?? { mid: s.mid };
  rec.mid = s.mid;
  (rec as Record<number, number>)[s.lv] = s.hp;
  db[s.name] = rec;
}
