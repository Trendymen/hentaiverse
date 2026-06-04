// weld.mjs — 把 dodying 原版 hvAutoAttack 与「B大脑」模块焊接成可安装的合体脚本
// 用法: 在 autobattle/ 目录下执行  node weld.mjs
// 输入: ./hvAutoAttack.user.js (原版基底) + ./hv_brain_modern.user.js (B大脑源, 手改这个)
// 输出: ./dist/hvAutoAttack_BRAIN.user.js (装进 Tampermonkey 的合体产物)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(here, rel), 'utf8');

let dod = read('hvAutoAttack.user.js');          // 原版 dodying（基底, 只读, 不手改）
const brain = read('hv_brain_modern.user.js');   // B大脑模块（演进只改这个文件）

// 1) onBattle 焊接: taskList 决策分发前插开关分支 —— 开启则接管出招并 return(跳过 dodying 原决策)
const anchor = "    var taskList = {\n      'Pause': autoPause,";
if (!dod.includes(anchor)) { console.error('ERR: taskList anchor 未找到'); process.exit(1); }
const weld =
  '    // === [B大脑] 焊接点: 开启则接管出招并return(跳过下面dodying原决策); 关闭则照走原逻辑 ===\n' +
  '    if (window.HVShieldBrain) { window.HVShieldBrain.step(); return; }\n';
dod = dod.replace(anchor, () => weld + anchor);            // 函数形式 → 不触发 $$ 特殊替换

// 1b) 关掉 dodying 歪的血条百分比 (改由 B大脑居中渲染整齐百分比)
const pctCall = '    displayPlayStatePercentage();';
if (dod.includes(pctCall)) {
  dod = dod.replace(pctCall, () => '    /* displayPlayStatePercentage() 已关 — B大脑居中渲染整齐百分比 */');
}

// 2) 内联 B 模块 (==/UserScript== 头之后)
const head = '// ==/UserScript==';
if (!dod.includes(head)) { console.error('ERR: UserScript 头未找到'); process.exit(1); }
dod = dod.replace(head, () => head + '\n\n/* ===== B大脑模块 (内联, 现代化) ===== */\n' + brain + '\n/* ===== B大脑模块 结束 ===== */\n');

const outDir = path.join(here, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'hvAutoAttack_BRAIN.user.js');
fs.writeFileSync(out, dod);
console.log('合体完成:', dod.split('\n').length, '行 →', path.relative(here, out));
