# autobattle M3 增量设计 — 异世界续刷 + 战败退出

> 日期: 2026-06-07 · 状态: 设计已确认, 待实现
> 关联: M3 主体 `specs/2026-06-06-autobattle-m3-farm-design.md`(已合入 feat/auto) · 翻写底本 `autobattle/reference/hvAutoAttack.user.js`

## 1. 背景

M3 主体连刷已合入 feat/auto。final review 后核对 dodying `idleArena` 连刷闭环, 补两个缺口(聚焦"连续/自动开战"):

1. **异世界续刷**: dodying `idleArena` 待战表清空时 `setTimeout(autoSwitchIsekai)` —— 一个世界(恒定/异世界)刷完自动切到另一个继续刷(L2563-2566)。M3 现状: 待战表空 → `COOLDOWN(次日)`, 不切世界。
2. **战败退出**: dodying 战斗结束时 `monsterAlive > 0`(怪还活=玩家败) → `autoSkipDefeated` 开则像胜利一样回前页续刷(不告警), 关则告警停下(L3058-3059)。M3 现状: `POST_BATTLE` 不区分胜败都续刷。

> 注: IW(道具界)/TW(塔楼)/BA(遭遇) 经核对**不属连刷范畴**——dodying `idleArena` 自动开战只 ar/rb/gr, IW/TW 手动进, BA 即遭遇(已覆盖)。故本增量不涉及。

## 2. 用户已锁定的决策

| # | 决策 | 取值 |
|---|---|---|
| ① | `autoSkipDefeated` 默认 | **false**(战败停机等人工, 防连续送死白耗精力/耐久) |
| ② | 实现流程 | worktree + subagent(同 M3 主体) |
| ③ | 异世界死循环防护 | 时间窗 `lastIsekaiSwitch` + `ISEKAI_SWITCH_GUARD_MIN`(默认 10 分钟) |

## 3. A — 异世界续刷

**dodying 事实**: `isIsekai = href.indexOf('isekai') !== -1`(L37); `autoSwitchIsekai` = `window.location.href = origin + (isIsekai ? '' : 'isekai/')`(L2238)。

**改动**:
- config: `autoSwitchIsekai`(bool, false) + `ISEKAI_SWITCH_GUARD_MIN`(number, 10)
- Store: `lastIsekaiSwitch`(number, ms)
- types: `FarmContext` +`isIsekai: boolean` +`lastIsekaiSwitch: number`; `FarmAction` +`{type:'switch-isekai'; url:string; note?}`; `FarmReducerCfg` +`autoSwitchIsekai: boolean` +`isekaiGuardMs: number`
- reader: `isIsekai = location.href.includes('isekai')`; 读 `lastIsekaiSwitch`
- reducer 待战表空(CHECK_STAMINA/PICK_NEXT 的 `empty`)抽 helper `onWaitlistEmpty(ctx, cfg)`:
  - `autoSwitchIsekai && (nowMs - lastIsekaiSwitch > isekaiGuardMs)` → `{next:'IDLE', action:{type:'switch-isekai', url:`${hvOrigin}/${isIsekai?'':'isekai/'}`}}`
  - 否则 → `COOLDOWN(nextMidnight)`(现状)
- executor `switch-isekai`: `Store.set('lastIsekaiSwitch', Date.now()); window.open(url, '_self')`
- starter `farmCfg`: +`autoSwitchIsekai` +`isekaiGuardMs: C.ISEKAI_SWITCH_GUARD_MIN * 60_000`

**防死循环**: 两世界都空时, 切一次后 `lastIsekaiSwitch` 记时戳; guard 窗口(10min)内再遇空 → 不切(COOLDOWN), 避免恒定↔异世界无限弹。正常续刷(切后世界有活, 开战间隔远 > guard)不受影响。

## 4. B — 战败退出

**dodying 事实**: 战斗结束 `monsterAlive>0` = 战败(L3058); `autoSkipDefeated`(L838) 开=回前页续刷不告警, 关=`SetExitBattleTimeout('Defeat')` 告警停。战败文本 `'You have been defeated.'`(L1926)。

**改动**:
- config: `autoSkipDefeated`(bool, **false**)
- types: `FarmContext` +`defeated: boolean`; `FarmAction` +`{type:'stop-farm'; note?}`; `FarmReducerCfg` +`autoSkipDefeated: boolean`
- reader: 仅 `hv-battle-end` 页检测 `defeated = /You have been defeated/i.test(document.body?.textContent ?? '')`(原版用 `monsterAlive>0`, 但结束页读不到, 改用结束页战败文本; **精确形态待 GF 真机核对**)
- reducer `POST_BATTLE`:
  - `ctx.defeated && !cfg.autoSkipDefeated` → `{next:'STOPPED', action:{type:'stop-farm', note:'战败停机等人工'}}`
  - 否则 → `{next:'RETURN', action:{type:'none', note: ctx.defeated ? '战败→续刷' : '战斗结束'}}`(现状)
- executor `stop-farm`: `config.set('farmEnabled', false)`(关连刷开关; STOPPED 因 farmEnabled=false 不自动回 IDLE, 等人工重开)
- starter `farmCfg`: +`autoSkipDefeated: C.autoSkipDefeated`

> `stop-farm` 让 executor 首次 import config 单例(写 farmEnabled)。executor 仍只执行不决策(关开关是 reducer 决定的 action)。

## 5. 文件改动清单

| 文件 | 改动 |
|---|---|
| `src/types.ts` | FarmContext +3 字段 / FarmAction +2 variant / FarmReducerCfg +3 字段 |
| `src/core/config.ts` | +3 键(autoSwitchIsekai/ISEKAI_SWITCH_GUARD_MIN/autoSkipDefeated) + CONFIG_VERSION bump |
| `src/engine/farm-reader.ts` | 填 isIsekai/lastIsekaiSwitch/defeated |
| `src/engine/farm-reducer.ts` | onWaitlistEmpty helper(empty 切世界) + POST_BATTLE 战败分支 |
| `src/engine/farm-executor.ts` | switch-isekai + stop-farm(import config) |
| `src/engine/starter.ts` | farmCfg 装配 +3 字段 |
| `src/ui/panel.ts` | (可选)连刷 tab 加 autoSwitchIsekai/autoSkipDefeated 开关 |
| `dist/` | rebuild |

## 6. 验证

- typecheck + build + node-check; 纯函数(reducer onWaitlistEmpty/POST_BATTLE)控制台喂数据验证。
- GF 真机: ① 待战表刷完 + autoSwitchIsekai 开 → 切世界续刷; 两世界都空 → guard 后 COOLDOWN 不死循环。② 战败(autoSkipDefeated 关)→ STOPPED 停机 + farmEnabled 关; (开)→ 续刷。**战败文本检测需真机核对结束页实际形态**。
- 零回归: autoSwitchIsekai/autoSkipDefeated 默认关 → 行为同当前 M3。
