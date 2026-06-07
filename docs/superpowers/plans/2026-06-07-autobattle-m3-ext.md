# M3 增量实现计划 — 异世界续刷 + 战败退出

> **For agentic workers:** 用 subagent-driven-development 逐 task 实现。无 vitest, 验证用 `npm run typecheck` + `npm run build` + 控制台喂数据。

**Goal:** 给已合入的 M3 连刷补两个闭环缺口——待战表清空时切异世界续刷、战败时按 `autoSkipDefeated` 停机/续刷。

**Architecture:** 沿用 M3 的 FSM(read→decide→exec)。新增 2 个 FarmAction(switch-isekai/stop-farm)、3 个 ctx 字段(isIsekai/lastIsekaiSwitch/defeated)、3 个 config 键。reducer 改 2 处(empty 分支抽 helper 切世界 / POST_BATTLE 战败分支)。默认开关全关 → 零回归。

**关联:** 设计 `specs/2026-06-07-autobattle-m3-ext-design.md`。底本 `reference/hvAutoAttack.user.js`(isIsekai L37 / autoSwitchIsekai L2233 / autoSkipDefeated L838,L3058)。

---

## Task 1: types + config 契约

**Files:** `src/types.ts` · `src/core/config.ts`

- [ ] **Step 1: types.ts 加字段**

`FarmContext` 接口加 3 字段(在 cooldownUntil 附近)：
```typescript
  isIsekai: boolean;        // location.href 含 'isekai'(异世界)
  lastIsekaiSwitch: number; // 上次切世界时戳(ms; 防死循环)
  defeated: boolean;        // hv-battle-end 页检测到玩家战败
```

`FarmAction` 联合加 2 variant：
```typescript
  | { type: 'switch-isekai'; url: string; note?: string }
  | { type: 'stop-farm'; note?: string }
```

`FarmReducerCfg` 接口加 3 字段：
```typescript
  autoSwitchIsekai: boolean;
  isekaiGuardMs: number;
  autoSkipDefeated: boolean;
```

- [ ] **Step 2: config.ts 加键 + bump**

`DEFAULT_CONFIG` 连刷区追加：
```typescript
  autoSwitchIsekai: false, // 待战表刷完切恒定↔异世界续刷
  ISEKAI_SWITCH_GUARD_MIN: 10, // 异世界切换防死循环窗口(分钟; 两世界都空时切一次后此窗内不再切)
  autoSkipDefeated: false, // 战败是否自动续刷(默认关=战败停机等人工)
```
**先读实际 CONFIG_VERSION 当前值 N(M3 合入后是 5, 但并发会话可能已 bump), 改成 N+1**。新键纯增量, 迁移块不加 force 行。

- [ ] **Step 3: 验证** `cd autobattle && npm run typecheck`(PASS)
- [ ] **Step 4: Commit** `git add autobattle/src/types.ts autobattle/src/core/config.ts && git commit -m "feat(autobattle): M3 增量契约(异世界续刷+战败退出 types/config)"`

---

## Task 2: farm-reader 填 isIsekai/lastIsekaiSwitch/defeated

**Files:** `src/engine/farm-reader.ts`

- [ ] **Step 1: 读新字段**

在 readFarm() 内, 现有 `const url = location.href` 等之后加：
```typescript
  const isIsekai = url.includes('isekai');
  const lastIsekaiSwitch = Store.get<number>('lastIsekaiSwitch', 0);
```
战败检测——仅 hv-battle-end 页(page 已算出后)：
```typescript
  const defeated = page === 'hv-battle-end' && /You have been defeated/i.test(document.body?.textContent ?? '');
```
> 原版用 `monsterAlive>0` 判战败, 但结束页读不到怪 DOM, 改用结束页战败文本 `'You have been defeated.'`(底本 L1926)。精确形态待真机核对; 非结束页 defeated 恒 false。

- [ ] **Step 2: 填进返回的 FarmContext**

return 对象加 `isIsekai, lastIsekaiSwitch, defeated`(与现有字段并列)。

- [ ] **Step 3: 验证** `npm run typecheck`(PASS) — 若 FarmContext 缺字段会在此报错
- [ ] **Step 4: Commit** `git add autobattle/src/engine/farm-reader.ts && git commit -m "feat(autobattle): farm-reader 读 isIsekai/lastIsekaiSwitch/defeated"`

---

## Task 3: farm-reducer — empty 切世界 + POST_BATTLE 战败

**Files:** `src/engine/farm-reducer.ts`

- [ ] **Step 1: 加 onWaitlistEmpty helper**

在 nextMidnight 函数附近加(纯函数)：
```typescript
/** 待战表清空时的去向: 异世界续刷(防死循环窗内不切) 或 COOLDOWN 等次日 */
function onWaitlistEmpty(ctx: FarmContext, cfg: FarmReducerCfg): FarmStep {
  if (cfg.autoSwitchIsekai && ctx.nowMs - ctx.lastIsekaiSwitch > cfg.isekaiGuardMs) {
    const url = `${ctx.hvOrigin}/${ctx.isIsekai ? '' : 'isekai/'}`;
    return { next: 'IDLE', action: { type: 'switch-isekai', url, note: `切${ctx.isIsekai ? '恒定' : '异'}世界续刷` } };
  }
  return { next: 'COOLDOWN', action: { type: 'set-cooldown', untilMs: nextMidnight(ctx.nowMs), note: '今日全清' } };
}
```

- [ ] **Step 2: 替换两处 empty 分支**

`CHECK_STAMINA` 里 `if (pick.kind === 'empty') return {...COOLDOWN...}` 改为 `if (pick.kind === 'empty') return onWaitlistEmpty(ctx, cfg);`
`PICK_NEXT` 里同样的 empty 分支也改为 `return onWaitlistEmpty(ctx, cfg);`

- [ ] **Step 3: 改 POST_BATTLE 战败分支**

```typescript
    case 'POST_BATTLE':
      if (ctx.defeated && !cfg.autoSkipDefeated) return { next: 'STOPPED', action: { type: 'stop-farm', note: '战败停机等人工' } };
      return { next: 'RETURN', action: { type: 'none', note: ctx.defeated ? '战败→续刷' : '战斗结束' } };
```

- [ ] **Step 4: 验证** `npm run typecheck`(PASS)
- [ ] **Step 5: 控制台验证(可选)**
```js
// autoSwitchIsekai 开 + 距上次切 > guard → switch-isekai
m.farmReducer('PICK_NEXT', {...emptyArenaCtx, isIsekai:false, lastIsekaiSwitch:0, nowMs:1e12, hvOrigin:'https://hentaiverse.org'}, {...cfg, autoSwitchIsekai:true, isekaiGuardMs:6e5})
// → {next:'IDLE', action:{type:'switch-isekai', url:'https://hentaiverse.org/isekai/'}}
// 战败 + autoSkipDefeated 关 → STOPPED
m.farmReducer('POST_BATTLE', {...ctx, defeated:true}, {...cfg, autoSkipDefeated:false}) // → {next:'STOPPED', action:{type:'stop-farm'}}
```
- [ ] **Step 6: Commit** `git add autobattle/src/engine/farm-reducer.ts && git commit -m "feat(autobattle): farm-reducer 异世界续刷(empty 切世界) + 战败退出(POST_BATTLE)"`

---

## Task 4: farm-executor(switch-isekai/stop-farm) + starter(farmCfg)

**Files:** `src/engine/farm-executor.ts` · `src/engine/starter.ts`

- [ ] **Step 1: farm-executor 加 2 action**

顶部加 `import { config } from '../core/config';`(executor 首次用 config, 仅 stop-farm 写开关)。
execFarm switch 加 2 case：
```typescript
    case 'switch-isekai':
      Store.set('lastIsekaiSwitch', Date.now());
      window.open(action.url, '_self');
      return;
    case 'stop-farm':
      config.set('farmEnabled', false); // 关连刷开关; STOPPED 因 farmEnabled=false 不自动回 IDLE, 等人工重开
      return;
```

- [ ] **Step 2: starter farmCfg 装配新键**

`farmCfg(C)` 返回对象加 3 字段：
```typescript
    autoSwitchIsekai: C.autoSwitchIsekai,
    isekaiGuardMs: C.ISEKAI_SWITCH_GUARD_MIN * 60_000,
    autoSkipDefeated: C.autoSkipDefeated,
```

- [ ] **Step 3: 验证** `npm run typecheck`(PASS) — FarmReducerCfg 字段齐全才过
- [ ] **Step 4: Commit** `git add autobattle/src/engine/farm-executor.ts autobattle/src/engine/starter.ts && git commit -m "feat(autobattle): farm-executor switch-isekai/stop-farm + starter farmCfg 装配"`

---

## Task 5: 连刷 tab UI + 构建验收

**Files:** `src/ui/panel.ts` · `dist/`

- [ ] **Step 1: panel.ts farmPane 加 2 开关**

在 farmPane() 的「连刷总控」组加 `swRow('autoSwitchIsekai', '刷完切异世界续刷')`；「遭遇战」或新「战败」组加 `swRow('autoSkipDefeated', '战败也续刷(默认关=停机)')`。可选 `numRow('ISEKAI_SWITCH_GUARD_MIN', '切世界防抖', '分')`。

- [ ] **Step 2: typecheck + build + node-check**
`cd autobattle && npm run typecheck && npm run build && node --check dist/hv-autobattle.user.js`(全 PASS)

- [ ] **Step 3: Commit** `git add autobattle/src/ui/panel.ts autobattle/dist/hv-autobattle.user.js && git commit -m "feat(autobattle): 连刷 tab 加异世界续刷/战败续刷开关 + 构建"`

---

## 验收

- typecheck + build + node-check 全绿; reducer 纯函数控制台验证。
- 零回归: autoSwitchIsekai/autoSkipDefeated 默认关 → 同当前 M3。
- GF 真机: 待战表刷完切世界续刷(两世界空 guard 防死循环) + 战败停机(autoSkipDefeated 关)。战败文本检测真机核对。
