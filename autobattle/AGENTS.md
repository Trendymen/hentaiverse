# autobattle 项目规则

HentaiVerse 单手盾战自动战斗 userscript。TypeScript + Vite(vite-plugin-monkey),**无 vitest** —— 验证靠 `npm run typecheck`(tsc --noEmit)+ `scripts/drive-*.mts`(`npx --yes tsx` 跑真实 `brain.decide`)。

## 改完即 build

每次改 autobattle 代码,主动 `npm run build`(产物 `dist/hv-autobattle.user.js`),不用用户催。提交按本仓库惯例代码与 dist 分两条 commit。

## chrome-devtools MCP 自动调试(读实战日志,免手动导出)

战斗日志不需要用户手动复制粘贴 —— 脚本把调试接口挂在**页面世界** `unsafeWindow.__hvab`(`src/main.ts`),chrome-devtools MCP 的 `evaluate_script` 跑在主世界,可直接读。**已实测可用**。

### 步骤

1. `mcp__chrome-devtools__list_pages` → 找 `hentaiverse.org` 那个标签页(战斗页 URL 形如 `hentaiverse.org/?s=Battle&ss=ar`)。
2. `mcp__chrome-devtools__select_page`(pageId)。
3. `mcp__chrome-devtools__evaluate_script` 调 `window.__hvab.*` 取数据。

### `__hvab` 接口(src/main.ts:99)

| 方法 | 返回 |
| --- | --- |
| `__hvab.logText()` | 格式化多行日志(`fmtLine`),**和用户贴的那种一模一样**;红名在场的回合行尾带 `‖ 红#4 40% 未晕 无血` 敌情段 |
| `__hvab.log()` | 结构化 `LogRecord[]`(环形 5000 条,跨场累积),字段含 `round/turn/oc/hp/mp/sp/alive/total/cannon/stance/action/note/foe` |
| `__hvab.getLastBattle()` | 最近一次战斗的网络响应原文 |
| `__hvab.config` | 运行态 config(可读当前开关/阈值) |
| `__hvab.clearLog()` | 清空 battlelog |

### 常用片段

```js
// 拉最近 60 行格式化日志(evaluate_script 的 function 体)
() => window.__hvab.logText().split('\n').slice(-60).join('\n')

// 只挑"有红名在场"的回合(诊断单红收尾/反击晕/喂血时机最有用)
() => window.__hvab.log().filter(r => r.foe).slice(-80)
       .map(r => `${r.round} T${r.turn} OC${r.oc} 架${r.stance?'开':'关'} ▶${r.action} ‖${r.foe}`).join('\n')

// 自动统计:红名"已晕"回合占比(反击晕频率粗估)
() => { const reds = window.__hvab.log().filter(r => r.foe);
        const st = reds.filter(r => r.foe.includes('已晕')).length;
        return { 红名回合: reds.length, 已晕回合: st, 占比: (st/reds.length*100).toFixed(1)+'%' }; }
```

### console 埋点(配合 `list_console_messages` 读)

- `[HVAB:bleed]`(`src/battle/bleed-timing.ts`):每次要害喂血判定打 `{eid,hpPct,r,T,path,feed}` —— 看延迟喂血到底在几 % 喂、速率 r 多少、走 rate/fallback/execLine 哪条。
- 注:旧的 `[HVAB:foes]` 全怪 console 埋点**已废弃**,信息并进了 `__hvab.log()` 的 `foe` 字段(日志从两套合一套,别再加平行 console 埋点)。

### 注意

- **新字段/新逻辑要生效**:`npm run build` 后,用户需在油猴里更新脚本(或脚本走本地 @require/自动更新)。MCP 读到的是**当前页面已注入的那版**;`logText()` 没有预期新字段(如 `foe`)多半是页面还跑旧 dist 或当前波无红名。
- `__hvab` 在 `unsafeWindow`(页面世界);`evaluate_script` 默认主世界可读。读不到先确认脚本已启用、战斗页已注入。
- `battlelog` 跨场环形累积(5000 条),分析特定一局先认准 `round` 段(如 `R65/65`)或先 `clearLog()` 再跑。
