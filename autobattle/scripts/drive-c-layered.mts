// C-layered strategy regression checks.
// Run: cd autobattle && npx tsx scripts/drive-c-layered.mts
import assert from 'node:assert/strict';

const mockEl = (opacity = '') => ({ style: { opacity }, click() {}, getAttribute: () => '' });
let COOLDOWN = new Set<string>();
let STOCK = new Set<string>();

(globalThis as Record<string, unknown>).document = {
  getElementById: (id: string) => mockEl(COOLDOWN.has(id) ? '0.5' : ''),
  querySelector: (sel: string) => {
    const m = sel.match(/set_infopane_item\((\d+)\)/);
    return m ? (STOCK.has(m[1]) ? {} : null) : null;
  },
  querySelectorAll: () => [],
  body: {},
};
(globalThis as Record<string, unknown>).window = globalThis;

const { Brain } = await import('../src/battle/brain');
const { config } = await import('../src/core/config');
const { IT, SK, GEM } = await import('../src/battle/tables');

const b = (active = true, turns = 99) => ({ active, turns });
const enemy = (eid: number, o: Record<string, unknown> = {}) => ({
  eid,
  alive: true,
  is_red_boss: false,
  debuff: {},
  penArmor: false,
  hpPct: 100,
  bleeding: false,
  stunned: false,
  hpNow: 10000,
  name: `Monster ${eid}`,
  status: {},
  ...o,
});
const walls = (o: Record<string, unknown> = {}) => ({
  spark: b(),
  spiritShield: b(),
  protection: b(),
  shadowVeil: b(false, 0),
  absorb: b(false, 0),
  haste: b(),
  regen: b(),
  heartseeker: b(),
  blessing: b(false, 0),
  hpot: b(false, 0),
  mpot: b(false, 0),
  spot: b(false, 0),
  ...o,
});
const many = (n: number, o: Record<string, unknown> = {}) => Array.from({ length: n }, (_, i) => enemy(i + 1, o));
const base = (): Record<string, unknown> => ({
  hp: 24232,
  mp: 2002,
  sp: 1470,
  overcharge: 0,
  lastDmg: 0,
  enemies: [enemy(1)],
  alive: 1,
  maxHp: 24232,
  maxMp: 2002,
  maxSp: 1470,
  buff: walls(),
  channeling: false,
  stanceOn: false,
  riddle: false,
  canContinue: false,
  tookMagicDmg: false,
  roundNow: 1,
  roundAll: 10,
  monsterTotal: 1,
  battleType: '竞技场',
  gems: { hp: 0, mp: 0, sp: 0, mystic: 0 },
  cannonExists: true,
  cannonOnCd: false,
  scrollReady: false,
  firstRound: false,
  lockedRedId: undefined,
  _started: true,
});

function reset(cfg: Record<string, unknown> = {}, stock: number[] = [], cd: number[] = []) {
  COOLDOWN = new Set(cd.map(String));
  STOCK = new Set(stock.map(String));
  for (const [k, v] of Object.entries({
    useCannon: true,
    useChanneling: true,
    usePressureControl: true,
    useShadowVeil: true,
    shadowVeilPressureOnly: true,
    useSilence: true,
    useBlind: false,
    useSlow: false,
    useMercifulBlow: true,
    useVitalStrike: true,
    useShieldBash: true,
    useTargetWeight: true,
    ...cfg,
  })) config.set(k as never, v as never);
}

function decide(state: Record<string, unknown>, cfg: Record<string, unknown> = {}, stock: number[] = [], cd: number[] = []) {
  reset(cfg, stock, cd);
  return new Brain().decide(state as never);
}

{
  const s = base();
  s.mp = 120;
  s.gems = { hp: 0, mp: 0, sp: 0, mystic: GEM.mystic };
  s.buff = walls({ spark: b(true, 1) });
  const a = decide(s);
  assert.equal(a.type, 'item', 'Spark is near expiry and MP is short, so Mystic should open Channeling');
  assert.equal(a.id, GEM.mystic);
}

{
  const s = base();
  s.mp = 500;
  s.gems = { hp: 0, mp: 0, sp: 0, mystic: GEM.mystic };
  const a = decide(s);
  assert.equal(a.type, 'item', 'Mystic must not be used as a plain MP recovery fallback');
  assert.equal(a.id, IT.mDraught);
}

{
  const s = base();
  s.battleType = '塔楼';
  s.enemies = many(4, { status: { We: true } });
  s.alive = 4;
  s.monsterTotal = 4;
  s.buff = walls({ shadowVeil: b(false, 0) });
  const a = decide(s);
  assert.equal(a.type, 'spell', 'tower pressure should maintain Shadow Veil before control/output');
  assert.equal(a.id, SK.ShadowVeil);
}

{
  const s = base();
  s.battleType = '塔楼';
  s.sp = 430;
  s.enemies = many(4, { debuff: { weaken: true }, status: { We: true } });
  s.alive = 4;
  s.monsterTotal = 4;
  s.buff = walls({ shadowVeil: b(true, 5) });
  const a = decide(s);
  assert.equal(a.type, 'spell', 'SP pressure should apply Silence after Weaken coverage');
  assert.equal(a.id, SK.Silence);
}

{
  const s = base();
  s.enemies = many(5);
  s.alive = 5;
  s.monsterTotal = 5;
  const a = decide(s);
  assert.equal(a.type, 'attack', 'plain dense non-red waves should save OC and attack instead of spending MP on pressure control');
  assert.equal(a.id, 1);
}

{
  const s = base();
  s.battleType = '塔楼';
  s.enemies = many(4);
  s.alive = 4;
  s.monsterTotal = 4;
  s.buff = walls({ shadowVeil: b(true, 5) });
  const a = decide(s);
  assert.equal(a.type, 'spell', 'high pressure should apply Weaken before Silence/Imperil');
  assert.equal(a.id, SK.Weaken);
}

{
  const s = base();
  s.battleType = '塔楼';
  s.mp = 120;
  s.gems = { hp: 0, mp: 0, sp: 0, mystic: GEM.mystic };
  s.enemies = many(4);
  s.alive = 4;
  s.monsterTotal = 4;
  s.buff = walls({ shadowVeil: b(true, 5) });
  const a = decide(s);
  assert.equal(a.type, 'item', 'high pressure control should use Mystic to open Channeling when MP is short');
  assert.equal(a.id, GEM.mystic);
}

{
  const s = base();
  s.battleType = '塔楼';
  s.mp = 120;
  s.sp = 620;
  s.gems = { hp: 0, mp: 0, sp: GEM.spirit, mystic: GEM.mystic };
  s.enemies = many(4, { status: { We: true, Si: true } });
  s.alive = 4;
  s.monsterTotal = 4;
  s.buff = walls({ shadowVeil: b(false, 0) });
  const a = decide(s);
  assert.notEqual(a.id, GEM.mystic, 'SP reserve low must not spend Mystic for Shadow Veil or Imperil');
}

{
  const s = base();
  s.mp = 120;
  s.scrollReady = true;
  s.gems = { hp: 0, mp: 0, sp: 0, mystic: GEM.mystic };
  s.buff = walls({ spiritShield: b(false, 0), protection: b(false, 0) });
  const a = decide(s, {}, [IT.scrollProt]);
  assert.equal(a.type, 'item', 'scroll should still cover both walls before Mystic tries to open Channeling');
  assert.equal(a.id, IT.scrollProt);
}

{
  const s = base();
  s.roundNow = 10;
  s.roundAll = 10;
  s.enemies = [enemy(1, { stunned: true, hpNow: 5000 }), enemy(2, { stunned: true, hpNow: 1000 })];
  s.alive = 2;
  s.monsterTotal = 4;
  s.overcharge = 50;
  const a = decide(s);
  assert.equal(a.type, 'spell', 'final round must not save OC for a future cannon wave');
  assert.equal(a.id, 2202);
  assert.match(a.note || '', /#2/, 'Vital Strike should use ranked non-red target');
}

{
  const s = base();
  s.stanceOn = false;
  s.sp = 620;
  s.buff = walls({ spiritShield: b(true, 2) });
  s.gems = { hp: 0, mp: 0, sp: GEM.spirit, mystic: GEM.mystic };
  const a = decide(s);
  assert.equal(a.type, 'item', 'SP reserve should be protected even when spirit stance is off');
  assert.equal(a.id, GEM.spirit);
}

{
  const s = base();
  s.stanceOn = false;
  s.sp = 620;
  s.overcharge = 150;
  s.buff = walls({ spot: b(true, 5) });
  const a = decide(s, { useCannon: false, usePressureControl: false, useShadowVeil: false });
  assert.notEqual(a.type, 'stance', 'SP reserve low must not open spirit stance when spirit draught is already active');
}

console.log('drive-c-layered ok');
