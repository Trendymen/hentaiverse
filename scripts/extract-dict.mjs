// 从 equip_chinese_2.js 提取四个字典(loadItems/loadEquipsInfo/loadEquips/loadExtra)
// 清洗 HTML 标记、* 前缀,输出干净的英文→中文对照表
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = '/Users/liuzhuo/webstorm_project/hentaiverse';
const src = readFileSync(`${DIR}/equip_chinese_2.js`, 'utf8');

// 取某个 load 函数的函数体(到下一个 function loadXxx 之前)
function bodyOf(name) {
  const i = src.indexOf('function ' + name);
  if (i < 0) return '';
  const rest = src.slice(i + 1);
  const n = rest.search(/\nfunction load/);
  return n < 0 ? src.slice(i) : src.slice(i, i + 1 + n);
}

const sections = {
  items: bodyOf('loadItems'),
  equipsInfo: bodyOf('loadEquipsInfo'),
  equips: bodyOf('loadEquips'),
  extra: bodyOf('loadExtra'),
};

const clean = (v) =>
  v.replace(/<[^>]+>/g, '')   // 去 HTML 标签
    .replace(/\\"/g, '"')      // 反转义双引号
    .replace(/^\*+/, '')       // 去开头 * 标记
    .trim();

// 匹配 'k' : 'v'(支持值内转义)
const pairRe = /'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;

let md = '# equip_chinese 字典提取(原始,供建术语表用)\n';
const all = {};
for (const [sec, body] of Object.entries(sections)) {
  const map = new Map();
  pairRe.lastIndex = 0;
  let m;
  while ((m = pairRe.exec(body))) {
    const k = m[1].replace(/\\'/g, "'");
    const v = clean(m[2]);
    if (k && !map.has(k)) map.set(k, v);
  }
  md += `\n## ${sec} (${map.size})\n\n| 英文 | 中文 |\n|---|---|\n`;
  for (const [k, v] of map) md += `| ${k} | ${v} |\n`;
  all[sec] = Object.fromEntries(map);
}

writeFileSync(`${DIR}/docs/_equip_chinese_terms.md`, md);
writeFileSync(`${DIR}/docs/_equip_chinese_terms.json`, JSON.stringify(all, null, 2));
console.log('counts:', Object.fromEntries(Object.entries(all).map(([k, v]) => [k, Object.keys(v).length])));
