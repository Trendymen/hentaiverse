// 按批对 hvUtils.js 做精确字符串替换(翻译)。
import { readFileSync, writeFileSync } from 'node:fs';
const F = '/Users/liuzhuo/webstorm_project/hentaiverse/hvUtils.js';

// 当前批:其余 E(模拟器/列头 innerHTML 遗漏)
const RULES = [
  [`<span>Empty</span>`, `<span>空</span>`],
  [`<span>MENU</span>`, `<span>菜单</span>`],
  [`<span>Persona</span>`, `<span>形象</span>`],
  [`<span>Magic Score</span>`, `<span>法术评分</span>`],
  [`<span>Arcane Score</span>`, `<span>奥术评分</span>`],
  [`<span>Proficiency Factor</span>`, `<span>熟练度系数</span>`, 'all'],
  [`<span>Mitigation Reduction</span>`, `<span>减伤削减</span>`, 'all'],
  [`<span>Cure Bonus</span>`, `<span>治疗加成</span>`],
  [`<span>Total Proficiency</span>`, `<span>总熟练度</span>`],
  [`<span>Level</span>`, `<span>等级</span>`],
  [`<span>Base Proficiency</span>`, `<span>基础熟练度</span>`],
  [`<td></td><td>type</td><td>soulbound</td><td>level</td><td>pxp</td><td>max</td><td>base</td><td>max</td><td>upgrade</td><td>scaled</td>`, `<td></td><td>类型</td><td>灵魂绑定</td><td>等级</td><td>pxp</td><td>max</td><td>base</td><td>max</td><td>升级</td><td>缩放</td>`],
  [`<td>Crystal Pack</td>`, `<td>水晶包</td>`],
  [`<p>The file has been saved.</p>`, `<p>文件已保存。</p>`],
  ["<td>Search</td><td>${results.length} mail(s)</td><td>Attachment</td><td>CoD</td><td>Sent</td><td>Read</td>", "<td>搜索</td><td>${results.length} 封邮件</td><td>附件</td><td>货到付款</td><td>发送时间</td><td>已读</td>"],
];

let src = readFileSync(F, 'utf8');
const ok = [], warn = [];
for (const [from, to, mode] of RULES) {
  const n = src.split(from).length - 1;
  if (mode === 'all' && n >= 1) { src = src.split(from).join(to); ok.push(`x${n} ${from.slice(0, 38)}`); }
  else if (n === 1) { src = src.replace(from, to); ok.push(from.slice(0, 46)); }
  else warn.push(`[命中 ${n}] ${from.slice(0, 70)}`);
}
writeFileSync(F, src);
console.log(`规则 ${RULES.length} | 已应用 ${ok.length} | 警告 ${warn.length}`);
if (warn.length) console.log('--- 未替换 ---\n' + warn.join('\n'));
