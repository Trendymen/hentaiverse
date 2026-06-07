// Farm FSM regression checks that do not need a browser.
// Run: cd autobattle && npx tsx scripts/drive-farm.mts
import assert from 'node:assert/strict';

class FakeLocalStorage {
  data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

(globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();

const { DEFAULT_CONFIG } = await import('../src/core/config');
const { ensureArena } = await import('../src/engine/starter');

const nowMs = Date.now();
localStorage.setItem('hvab_farmState', JSON.stringify('COOLDOWN'));
localStorage.setItem('hvab_farmCooldownUntil', JSON.stringify(nowMs + 12 * 3600_000));

const arena = ensureArena(
  {
    arena: { array: [], arrayDone: [], token: {}, gr: 0, date: nowMs },
    nowMs,
    storedState: 'COOLDOWN',
  },
  { ...DEFAULT_CONFIG, arenaLevels: 'gr', grPerDay: 3 },
);

assert.deepEqual(arena.array, ['gr'], 'ensureArena should initialize a newly configured farm queue');
assert.equal(localStorage.getItem('hvab_farmState'), JSON.stringify('IDLE'), 'initializing a non-empty queue should wake COOLDOWN');
assert.equal(localStorage.getItem('hvab_farmCooldownUntil'), JSON.stringify(0), 'initializing a non-empty queue should clear stale cooldown');

console.log('drive-farm ok');
