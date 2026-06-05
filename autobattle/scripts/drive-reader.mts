// Reader textlog regression checks that do not need a browser.
// Run: cd autobattle && npx tsx scripts/drive-reader.mts
import assert from 'node:assert/strict';
import { parseLatestEnemyMagic, parseLatestRound, parseSpawnHp } from '../src/battle/reader';

const mixedDamageLog = [
  'Monster A hits you for 432 fire damage.',
  'Monster B hits you for 321 slashing damage.',
].join('\n');
assert.equal(
  parseLatestEnemyMagic(mixedDamageLog),
  true,
  'top/newest magic damage should win over older physical damage',
);

const mixedRoundLog = [
  'Initializing arena challenge #16 (Round 4 / 10) ...',
  'Initializing arena challenge #16 (Round 3 / 10) ...',
].join('\n');
assert.deepEqual(
  parseLatestRound(mixedRoundLog),
  { roundNow: 4, roundAll: 10 },
  'top/newest round should win over older round',
);

const mixedSpawnLog = [
  'Spawned Monster A: MID=2 (New A) LV=398 HP=200',
  'Spawned Monster B: MID=3 (New B) LV=398 HP=300',
  'Spawned Monster A: MID=1 (Old A) LV=398 HP=100',
].join('\n');
assert.deepEqual(
  parseSpawnHp(mixedSpawnLog),
  { A: 200, B: 300 },
  'newest Spawned Monster row per letter should win',
);

console.log('drive-reader ok');
