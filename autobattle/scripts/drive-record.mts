// 纯函数回归: 喂样本 textlog 断言 drop/usage/monster/battle-code.
// Run: cd autobattle && npx tsx scripts/drive-record.mts
import { parseRoundFromJson, deriveBattleCode } from '../src/record/battle-code';
import { parseDrops } from '../src/record/drop-parse';
import { parseSpawns, upsertMonster } from '../src/record/monster-db';
import { emptyStats, accumulateUsage } from '../src/record/usage-parse';
import type { MonsterDB, MonsterMID } from '../src/types';

let fail = 0;
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    console.error('FAIL', msg, a, '!=', b);
    fail++;
  } else {
    console.log('ok', msg);
  }
};

// battle-code
eq(
  parseRoundFromJson('{"textlog":[{"t":"Initializing Grindfest (Round 2 / 1000) ...","c":""}]}'),
  { roundNow: 2, roundAll: 1000 },
  'parseRound GF',
);
const TIERS = [{ roundAll: 50, level: 130, name: '流亡之途' }];
eq(deriveBattleCode('竞技场', 50, TIERS), { battleCode: 'AR-Lv130-流亡之途', level: 130 }, 'arena tier');
eq(deriveBattleCode('竞技场', 99, TIERS), { battleCode: 'AR-R99', level: null }, 'arena 失配');
eq(deriveBattleCode('压榨界', 1000, TIERS), { battleCode: 'GF', level: null }, 'GF');

// drop-parse
eq(
  parseDrops(
    [
      'You gain 1234 EXP',
      'You gain 56 Credit',
      '<span style="color:rgb(186, 5, 180)">3x Crystal of Power</span>',
    ],
    6,
  ),
  { exp: 1234, credit: 56, drops: { 'Crystal of Power': 3 } },
  'drop crystal+exp',
);

// monster-db
const db: MonsterDB = {};
const mid: MonsterMID = {};
for (const s of parseSpawns(['Spawned Monster A: MID=194290 (Use) LV=398 HP=144152'])) {
  upsertMonster(db, mid, s);
}
eq(db['Use']?.mid, 194290, 'monsterDB mid');
eq((db['Use'] as Record<number, number>)[398], 144152, 'monsterDB hp');

// usage
const st = emptyStats(0);
accumulateUsage(st, { type: 'spell', id: 1080 }, ['hits you for 257 wind damage']);
eq(st.magic['#1080'], 1, 'usage skill count');
eq(st.hurt.total, 257, 'usage hurt');

console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
