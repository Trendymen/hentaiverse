// 决策驱动器: 在 Node 里用真实 brain.decide 跑多种典型战斗状态, 观察出招.
// mock 浏览器环境(executor 只用到 document.getElementById/querySelector; store 走 try/catch 兜底默认 config).
// 跑: cd autobattle && npx --yes tsx scripts/drive-brain.mts
const mockEl = (opacity = '') => ({ style: { opacity }, click() {}, getAttribute: () => '' });
let COOLDOWN = new Set<string>(); // 技能 id → 置灰(opacity:0.5=冷却/不可放)
let STOCK = new Set<string>(); // 物品 db → 背包可点
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

const { brain } = await import('../src/battle/brain');
const { config } = await import('../src/core/config');
const { actionLabel } = await import('../src/battle/tables');

// ── 状态构造器 ──
const b = (active = true, turns = 99) => ({ active, turns });
const enemy = (eid: number, o: Record<string, unknown> = {}) => ({
  eid, alive: true, is_red_boss: false, debuff: {}, penArmor: false, hpPct: 100, bleeding: false, stunned: false,
  hpNow: 10000, name: `Monster ${eid}`, status: {}, ...o,
});
const walls = (o: Record<string, unknown> = {}) => ({
  spark: b(), spiritShield: b(), protection: b(), shadowVeil: b(false, 0), absorb: b(false, 0), haste: b(), regen: b(),
  heartseeker: b(), blessing: b(false, 0), hpot: b(false, 0), mpot: b(false, 0), spot: b(false, 0), ...o,
});
const many = (n: number, o: Record<string, unknown> = {}) => Array.from({ length: n }, (_, i) => enemy(i + 1, o));
// 满状态/全墙在/单怪/无 OC 基线 (动态满值: HP24232 MP2002 SP1470 OC250)
const base = (): Record<string, unknown> => ({
  hp: 24232, mp: 2002, sp: 1470, overcharge: 0, lastDmg: 0,
  enemies: [enemy(1)], alive: 1, maxHp: 24232, maxMp: 2002, maxSp: 1470,
  buff: walls(), channeling: false, stanceOn: false, riddle: false, canContinue: false, tookMagicDmg: false,
  roundNow: 1, roundAll: 10, monsterTotal: 1, battleType: '竞技场',
  gems: { hp: 0, mp: 0, sp: 0, mystic: 0 }, cannonExists: true, cannonOnCd: false, scrollReady: false,
  firstRound: false, lockedRedId: undefined, _started: true,
});

const SCROLL = 13111, H_ELIXIR = 11199;

// ── 驱动器 ──
function run(name: string, opts: { cd?: number[]; stock?: number[]; cfg?: Record<string, unknown>; state: Record<string, unknown> }) {
  COOLDOWN = new Set((opts.cd || []).map(String));
  STOCK = new Set((opts.stock || []).map(String));
  config.set('useMercifulBlow', false); // 每轮先复位易污染的开关
  config.set('useAbsorb', false);
  config.set('usePressureControl', false);
  config.set('useShadowVeil', false);
  config.set('useSilence', true);
  for (const [k, v] of Object.entries(opts.cfg || {})) config.set(k as never, v as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = brain.decide(opts.state as any);
  const tag = `[${a.type}${a.id ? ':' + a.id : ''}]`;
  console.log(name.padEnd(30), '→ ' + actionLabel(a).padEnd(8), (a.note ? `(${a.note}) ` : '') + tag);
}

console.log('状态'.padEnd(28), '   决策');
console.log('─'.repeat(64));

run('①满状态/单怪/全墙/无OC', { state: base() });
{ const s = base(); (s.buff as Record<string, unknown>).spark = { active: false, turns: 0 }; run('②Spark真空(spark没了)', { state: s }); }
{ const s = base(); s.hp = 4300; run('③危急 hp18%(治疗可放)', { stock: [H_ELIXIR], state: s }); }
{ const s = base(); const w = s.buff as Record<string, unknown>; w.spiritShield = { active: false, turns: 0 }; w.protection = { active: false, turns: 0 }; s.scrollReady = true; run('④缺双墙+有卷轴', { stock: [SCROLL], state: s }); }
{ const s = base(); s.enemies = many(4); s.alive = 4; s.monsterTotal = 4; s.overcharge = 200; run('⑤4怪+OC200+炮可放', { state: s }); }
{ const s = base(); s.enemies = many(4); s.alive = 4; s.monsterTotal = 4; s.overcharge = 125; s.cannonExists = true; s.stanceOn = true; run('⑥4怪+OC125架开[常驻不让位]', { state: s }); }
{ const s = base(); s.enemies = many(4); s.alive = 4; s.monsterTotal = 4; s.overcharge = 180; s.cannonExists = true; s.stanceOn = true; run('⑮4怪+OC180架开[临门让位]', { state: s }); }
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true })]; run('⑦红怪+未减益+MP够', { state: s }); }
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, stunned: true, debuff: { weaken: true, imperil: true } })]; s.overcharge = 50; run('⑧晕眩红怪+OC50[要害]', { state: s }); }
{ const s = base(); s.enemies = many(2); s.alive = 2; s.monsterTotal = 2; s.overcharge = 25; run('⑨未晕眩2怪+OC25[盾击]', { state: s }); }
{ const s = base(); s.enemies = [enemy(1, { hpPct: 20, bleeding: true })]; s.overcharge = 100; run('⑩非红残血+流血[不慈悲]', { cfg: { useMercifulBlow: true }, state: s }); }
{ const s = base(); s.tookMagicDmg = true; run('⑪法系伤害+Absorb开', { cfg: { useAbsorb: true }, state: s }); }
{ const s = base(); s.channeling = true; s.enemies = [enemy(1, { is_red_boss: true, debuff: { weaken: true } })]; run('⑫Channeling+红怪缺陷危', { state: s }); }
{ const s = base(); s.enemies = many(4); s.alive = 4; s.monsterTotal = 4; s.overcharge = 200; s.cannonOnCd = true; s.stanceOn = true; (s.enemies as Record<string, unknown>[])[0].stunned = true; run('⑬4怪+OC200+炮冷却中(架开)', { state: s }); }
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, debuff: { weaken: true, imperil: true } })]; s.overcharge = 50; run('⑭已减益未晕眩红怪+OC50[应盾击]', { state: s }); }
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, hpPct: 20, bleeding: true, debuff: { weaken: true, imperil: true } })]; s.overcharge = 100; run('⑯红名残血+流血+OC100[慈悲]', { cfg: { useMercifulBlow: true }, state: s }); }
{ const s = base(); s.mp = 120; (s.buff as Record<string, unknown>).spark = { active: true, turns: 1 }; s.gems = { hp: 0, mp: 0, sp: 0, mystic: 10008 }; run('⑰Spark快断+缺MP+Mystic', { cfg: { useChanneling: true }, state: s }); }
{ const s = base(); s.lastDmg = 8000; s.enemies = many(4, { status: { We: true } }); s.alive = 4; s.monsterTotal = 4; run('⑱高伤压力+缺影纱', { cfg: { usePressureControl: true, useShadowVeil: true }, state: s }); }
{ const s = base(); s.lastDmg = 8000; s.enemies = many(4); s.alive = 4; s.monsterTotal = 4; (s.buff as Record<string, unknown>).shadowVeil = { active: true, turns: 5 }; run('⑲高伤压力[先虚弱]', { cfg: { usePressureControl: true, useShadowVeil: true }, state: s }); }
{ const s = base(); s.roundNow = 10; s.roundAll = 10; s.enemies = [enemy(1, { stunned: true, hpNow: 5000 }), enemy(2, { stunned: true, hpNow: 1000 })]; s.alive = 2; s.monsterTotal = 4; s.overcharge = 50; run('⑳最终波2怪+OC50[不攒炮]', { state: s }); }

// ── 无压力盾击 OC 预留地板观察(ocFloorOk)── stanceOn=true 绕过架式切换层, 直接观察盾击分支
{ const s = base(); s.enemies = many(3); s.alive = 3; s.monsterTotal = 3; s.overcharge = 140; s.cannonExists = false; s.stanceOn = true; run('㉑无压力3杂兵OC140炮不可用架已开[盾击应抑制→平砍]', { state: s }); }
{ const s = base(); s.enemies = many(3); s.alive = 3; s.monsterTotal = 3; s.overcharge = 150; s.cannonExists = false; s.stanceOn = true; run('㉒无压力3杂兵OC150炮不可用架已开[盾击放行]', { state: s }); }
{ const s = base(); s.enemies = many(3); s.alive = 3; s.monsterTotal = 3; s.overcharge = 190; s.cannonExists = true; s.cannonOnCd = false; s.stanceOn = true; run('㉓无压力3杂兵OC190炮可用架已开[盾击应抑制→平砍]', { state: s }); }

// ── 攒炮冲刺起始线观察(开架式线 OC_ON×OCMAX 50%=125)── 6杂兵炮可用、架已开
{ const s = base(); s.enemies = many(6); s.alive = 6; s.monsterTotal = 6; s.overcharge = 100; s.stanceOn = true; run('㉔6杂兵OC100(40%)架开炮可用[<50%不冲刺→平砍攒炮]', { state: s }); }
{ const s = base(); s.enemies = many(6); s.alive = 6; s.monsterTotal = 6; s.overcharge = 125; s.stanceOn = true; run('㉕6杂兵OC125(50%)架开炮可用[≥50%关架式冲刺攒炮]', { state: s }); }

// ── 单红收尾关架式攒OC观察(endgameSoloRed)── 红名带减益跳过P13, 聚焦架式/连招
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, hpPct: 80, hpNow: 8000, debuff: { weaken: true, imperil: true } })]; s.alive = 1; s.monsterTotal = 1; s.overcharge = 150; s.stanceOn = true; run('㉖单红+架开+OC150+开关on[应切架式关]', { state: s }); }
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, hpPct: 80, hpNow: 8000, debuff: { weaken: true, imperil: true } })]; s.alive = 1; s.monsterTotal = 1; s.overcharge = 50; s.stanceOn = false; run('㉗单红+架关+OC50+开关on[应盾击晕红名]', { state: s }); }
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, hpPct: 80, hpNow: 8000, debuff: { weaken: true, imperil: true } })]; s.alive = 1; s.monsterTotal = 1; s.overcharge = 50; s.stanceOn = false; run('㉘单红+架关+OC50+开关off[现状→平砍]', { cfg: { useEndgameStanceOff: false }, state: s }); }

// ── 跨波预判攒炮观察 ── 当前波剩2杂兵但本波大波(monsterTotal8)+有下一波: 放宽 cannonCtx 应关架式冲刺
{ const s = base(); s.enemies = many(2); s.alive = 2; s.monsterTotal = 8; s.overcharge = 125; s.stanceOn = true; run('㉙当前波剩2杂兵+本波8怪+有下一波OC125架开[跨波预判→切架式攒炮]', { state: s }); }

// ── 冷却尾段预判攒炮观察 ── turnsToReady=ceil((200-oc)/CANNON_OC_GAIN_EST 20); 冷却剩余≤turnsToReady 才提前关架式(防溢出)
{ const s = base(); s.enemies = many(6); s.alive = 6; s.monsterTotal = 6; s.overcharge = 150; s.cannonOnCd = true; s.cannonCdLeft = 3; s.stanceOn = true; run('㉚6杂兵OC150炮冷却剩3(需3)架开[尾段预判→切架式攒炮]', { state: s }); }
{ const s = base(); s.enemies = many(6); s.alive = 6; s.monsterTotal = 6; s.overcharge = 150; s.cannonOnCd = true; s.cannonCdLeft = 20; s.stanceOn = true; run('㉛6杂兵OC150炮冷却剩20(需3)架开[远冷却→不切架式·盾击控场]', { state: s }); }
{ const s = base(); s.enemies = many(6); s.alive = 6; s.monsterTotal = 6; s.overcharge = 190; s.cannonOnCd = true; s.cannonCdLeft = 2; s.stanceOn = true; run('㉜6杂兵OC190炮冷却剩2(需1)架开[高OC防溢出→不切架式·盾击控场]', { state: s }); }
