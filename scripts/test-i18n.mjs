// 验证 $i18n.equipName 的正则拆段+拼接逻辑(复制自 hvUtils.js $equip.reg.name 与 $i18n)
const quality = 'Flimsy|Crude|Fair|Average|Fine|Superior|Exquisite|Magnificent|Legendary|Peerless';
const prefix = 'Ethereal|Fiery|Arctic|Shocking|Tempestuous|Hallowed|Demonic|Ruby|Cobalt|Amber|Jade|Zircon|Onyx|Charged|Frugal|Radiant|Mystic|Agile|Reinforced|Savage|Shielding|Mithril';
const slot = 'Cap|Robe|Gloves|Pants|Shoes|Helmet|Breastplate|Gauntlets|Leggings|Boots|Cuirass|Armor|Greaves|Sabatons|Coif|Hauberk|Mitons|Chausses|Boots';
const onehanded = 'Axe|Club|Rapier|Shortsword|Wakizashi|Dagger|Sword Chucks';
const twohanded = 'Estoc|Longsword|Mace|Katana|Scythe';
const staff = 'Oak Staff|Willow Staff|Katalox Staff|Redwood Staff|Ebony Staff';
const shield = 'Buckler|Kite Shield|Force Shield|Tower Shield';
const acloth = 'Cotton|Phase|Gossamer|Silk';
const alight = 'Leather|Shade|Kevlar|Dragon Hide';
const aheavy = 'Plate|Power|Shield|Chainmail';
const RE = new RegExp(`^(${quality})(?: (?:(${prefix})|(.+?)))? (?:(${onehanded})|(${twohanded})|(${staff})|(${shield})|(?:(?:(${acloth})|(${alight})|(${aheavy})) (${slot})))(?: of (.+))?$`, 'i');

const T = {
  quality: { Peerless: '无双', Legendary: '传奇' },
  prefix: { Shocking: '闪电之', Fiery: '灼热之', Onyx: '缟玛瑙(暗抗)', Jade: '翡翠(风抗)' },
  type: { Rapier: '西洋剑', Longsword: '长剑', 'Force Shield': '力场盾', Power: '动力' },
  slot: { Helmet: '头盔', Armor: '盔甲' },
  suffix: { Slaughter: '杀戮', Stoneskin: '石肤', Warding: '魔防', Protection: '物防' },
  items: { 'Health Draught': '体力长效药', "Voidseeker's Blessing": '虚空探索者的祝福', 'Scrap Metal': '废金属' },
};
const equipName = (str) => {
  const e = RE.exec(str);
  if (!e) return str;
  const i = { quality: e[1], prefix: e[2] || e[3], type: e[4] || e[5] || e[6] || e[7] || e[8] || e[9] || e[10], slot: e[11], suffix: e[12] };
  const q = T.quality[i.quality] || i.quality || '';
  const pre = i.prefix ? (T.prefix[i.prefix] || i.prefix) : '';
  const t = i.type ? (T.type[i.type] || i.type) : '';
  const sl = i.slot ? (T.slot[i.slot] || i.slot) : '';
  const su = i.suffix ? (T.suffix[i.suffix] || i.suffix) : '';
  return [q, pre, t, sl, su].filter(Boolean).join(' ');
};
const itemName = (n) => T.items[n] || n;

const cases = [
  ['Legendary Shocking Rapier of Slaughter', '传奇 闪电之 西洋剑 杀戮'],
  ['Legendary Onyx Force Shield of Stoneskin', '传奇 缟玛瑙(暗抗) 力场盾 石肤'],
  ['Legendary Onyx Power Helmet of Warding', '传奇 缟玛瑙(暗抗) 动力 头盔 魔防'],
  ['Peerless Jade Power Armor of Protection', '无双 翡翠(风抗) 动力 盔甲 物防'],
  ['Peerless Fiery Longsword of Slaughter', '无双 灼热之 长剑 杀戮'],
];
let pass = 0;
for (const [en, want] of cases) {
  const got = equipName(en);
  const ok = got === want;
  pass += ok;
  console.log((ok ? 'PASS' : 'FAIL') + `  ${en}\n      => ${got}` + (ok ? '' : `  (期望 ${want})`));
}
console.log('\n物品:', itemName('Health Draught'), '|', itemName("Voidseeker's Blessing"), '|', itemName('Scrap Metal'));
console.log(`\n装备名 ${pass}/${cases.length} 通过`);

// 富文本配色输出测试
const colors = { Legendary: ['#ffbbff'], Shocking: ['#f4f375'], Slaughter: ['#FF0000', '#fff'], Peerless: ['#ffd760'], Fiery: ['#f97c7c'] };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const equipNameHtml = (str) => {
  const e = RE.exec(str);
  if (!e) return esc(str);
  const segs = [[e[1], T.quality], [e[2] || e[3], T.prefix], [e[4] || e[5] || e[6] || e[7] || e[8] || e[9] || e[10], T.type], [e[11], T.slot], [e[12], T.suffix]];
  return segs.filter((s) => s[0]).map(([v, m]) => { const zh = m[v] || esc(v); const c = colors[v]; return c ? `<span style="background:${c[0]};color:${c[1] || '#000'}">${zh}</span>` : zh; }).join(' ');
};
console.log('\n富文本配色输出:');
console.log('  ' + equipNameHtml('Legendary Shocking Rapier of Slaughter'));
console.log('  ' + equipNameHtml('Peerless Fiery Longsword of Slaughter'));
