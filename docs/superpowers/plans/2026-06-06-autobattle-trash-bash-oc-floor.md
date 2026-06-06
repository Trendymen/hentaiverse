# 无压力盾击 OC 预留地板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让自动战斗在无压力(`pressure.level==='low'`)时,盾击晕杂兵需满足"放完后 OC 仍 ≥ 动态地板",把 OC 留给开/维持架式与攒炮,避免架式开不起来。

**Architecture:** 新增纯函数 `ocFloorOk(S,C,pressure,oc,cost)` 到 `strategy.ts`,封装"无压力 OC 预留地板(炮可用→`CANNON_YIELD_OC`,否则开架式线 `OC_ON×OCMAX`)";`brain.ts` 杂兵盾击分支加 `&& ocFloorOk(...)`;`config.ts` 加灰度开关 `useShieldBashOcFloor`(默认开,可一键回退)。只改盾击,要害/红名连招/有压力路径全不动。

**Tech Stack:** TypeScript 5.6,Vite 构建,验证用 `tsc --noEmit` typecheck + `npx tsx scripts/drive-*.mts` 驱动脚本(项目无 vitest,沿用现有 `node:assert` 脚本 pattern)。

参考 spec:`docs/superpowers/specs/2026-06-06-autobattle-trash-bash-oc-floor-design.md`

---

## File Structure

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `autobattle/src/core/config.ts` | 修改 | DEFAULT_CONFIG 加 `useShieldBashOcFloor: true` 灰度开关(`Config = typeof DEFAULT_CONFIG`,自动入类型;全新键经 spread 取默认,无需 bump `CONFIG_VERSION`) |
| `autobattle/src/battle/strategy.ts` | 修改 | 在 `shouldSaveOcForCannon` 后新增 `ocFloorOk`(`Config`/`BattleState`/`Pressure` 均已在作用域,零新增 import) |
| `autobattle/src/battle/brain.ts` | 修改 | 第 9 行 import 加 `ocFloorOk`;杂兵盾击分支 `if (C.useShieldBash && oc >= 25)` 加 `&& ocFloorOk(S, C, pressure, oc, 25)` |
| `autobattle/scripts/drive-ocfloor.mts` | 新建 | `node:assert` 断言 6 用例,纯函数单元验证(红/绿 TDD 信号) |
| `autobattle/scripts/drive-brain.mts` | 修改 | 末尾追加 2 个无压力低 OC 集成观察场景 |

---

## Task 1: config 新增灰度开关

**Files:**
- Modify: `autobattle/src/core/config.ts`(`useShieldBash` 之后,约第 54 行)

- [ ] **Step 1: 加配置键**

在 `autobattle/src/core/config.ts` 中,定位:

```ts
  useShieldBash: true, // 盾击(同上; 连招给未晕眩目标铺垫, 已晕眩不重复)
```

在其**下一行**插入:

```ts
  useShieldBashOcFloor: true, // 无压力(level==='low')盾击晕杂兵需放完 OC 仍≥地板(炮可用→CANNON_YIELD_OC 175, 否则开架式线 OC_ON*OCMAX 125), 把 OC 留给架式/攒炮; false 退回旧"oc≥25 即晕"(灰度可一键回滚)
```

- [ ] **Step 2: typecheck 验证编译通过**

Run: `cd autobattle && npm run typecheck`
Expected: 无报错退出(exit 0)。`Config` 类型现已含 `useShieldBashOcFloor: boolean`。

- [ ] **Step 3: Commit**

```bash
git add autobattle/src/core/config.ts
git commit -m "feat(autobattle): config 新增 useShieldBashOcFloor 灰度开关" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: strategy 新增 ocFloorOk(TDD)

**Files:**
- Create: `autobattle/scripts/drive-ocfloor.mts`
- Modify: `autobattle/src/battle/strategy.ts`(`shouldSaveOcForCannon` 之后,约第 117 行 `}` 后)

- [ ] **Step 1: 写断言脚本(失败测试)**

创建 `autobattle/scripts/drive-ocfloor.mts`:

```ts
// 断言 ocFloorOk: 无压力时盾击晕杂兵的 OC 预留地板.
// 跑: cd autobattle && npx --yes tsx scripts/drive-ocfloor.mts
import assert from 'node:assert/strict';
import { ocFloorOk, type Pressure } from '../src/battle/strategy';
import { DEFAULT_CONFIG } from '../src/core/config';
import type { BattleState } from '../src/types';

const C = { ...DEFAULT_CONFIG };
const COST = 25;
const P = (level: 'low' | 'medium' | 'high'): Pressure => ({ level, spReserveLow: false, spCritical: false, hasRed: level !== 'low' });
const S = (cannonExists: boolean, cannonOnCd: boolean) => ({ cannonExists, cannonOnCd } as unknown as BattleState);

let pass = 0;
const check = (name: string, actual: boolean, expected: boolean) => {
  assert.equal(actual, expected, `${name}: 期望 ${expected} 实得 ${actual}`);
  console.log('  ✓', name);
  pass++;
};

// 1. 无压力 + 炮不可用 + oc=140 → false (140-25=115 < 开架式线125)
check('无压力·炮不可用·oc140→抑制', ocFloorOk(S(false, false), C, P('low'), 140, COST), false);
// 2. 无压力 + 炮不可用 + oc=150 → true  (150-25=125 ≥ 125)
check('无压力·炮不可用·oc150→放行', ocFloorOk(S(false, false), C, P('low'), 150, COST), true);
// 3. 无压力 + 炮可用 + oc=190 → false (190-25=165 < 炮线175)
check('无压力·炮可用·oc190→抑制', ocFloorOk(S(true, false), C, P('low'), 190, COST), false);
// 4. 无压力 + 炮可用 + oc=200 → true  (200-25=175 ≥ 175)
check('无压力·炮可用·oc200→放行', ocFloorOk(S(true, false), C, P('low'), 200, COST), true);
// 5. 有压力(medium) + oc=30 → true (level≠low, 维持现状)
check('有压力·oc30→维持现状', ocFloorOk(S(true, false), C, P('medium'), 30, COST), true);
// 6. 开关关 + 无压力 + oc=30 → true (旧行为)
const Coff = { ...DEFAULT_CONFIG, useShieldBashOcFloor: false };
check('开关关·无压力·oc30→旧行为', ocFloorOk(S(false, false), Coff, P('low'), 30, COST), true);

console.log(`\n✅ ocFloorOk 全部 ${pass} 用例通过`);
```

- [ ] **Step 2: 跑脚本验证它失败**

Run: `cd autobattle && npx --yes tsx scripts/drive-ocfloor.mts`
Expected: FAIL —— 报错 `ocFloorOk` 不是 `'../src/battle/strategy'` 的导出成员(模块解析/运行时错误,非零退出)。

- [ ] **Step 3: 实现 ocFloorOk**

在 `autobattle/src/battle/strategy.ts` 中,定位 `shouldSaveOcForCannon` 函数结尾(`return hasFutureRound(S) && S.monsterTotal >= C.CANNON_MIN_ENEMIES;` 的下一行 `}`)。在该 `}` 之后追加:

```ts

/** 无压力时盾击晕杂兵的 OC 经济地板: 放完(扣 cost)后 OC 仍需 ≥ 地板, 把 OC 留给开/维持架式 + 攒炮.
 *  炮可用时地板抬到攒炮让位线 CANNON_YIELD_OC(为炮跨波预留), 否则用开架式线 OC_ON*OCMAX.
 *  有压力(level≠'low', 含红名场) 或灰度开关关闭则不设地板, 维持旧行为. */
export function ocFloorOk(S: BattleState, C: Config, pressure: Pressure, oc: number, cost: number): boolean {
  if (!C.useShieldBashOcFloor) return true; // 灰度开关关 → 旧行为
  if (pressure.level !== 'low') return true; // 有压力(hasRed 已强制 medium) → 维持现状
  const cannonReady = C.useCannon && S.cannonExists && !S.cannonOnCd;
  const floor = cannonReady ? C.CANNON_YIELD_OC : C.OC_ON * C.OCMAX;
  return oc - cost >= floor;
}
```

- [ ] **Step 4: 跑脚本验证它通过**

Run: `cd autobattle && npx --yes tsx scripts/drive-ocfloor.mts`
Expected: PASS —— 6 行 `✓` + 末行 `✅ ocFloorOk 全部 6 用例通过`,退出码 0。

- [ ] **Step 5: typecheck**

Run: `cd autobattle && npm run typecheck`
Expected: 无报错(exit 0)。

- [ ] **Step 6: Commit**

```bash
git add autobattle/src/battle/strategy.ts autobattle/scripts/drive-ocfloor.mts
git commit -m "feat(autobattle): strategy 新增 ocFloorOk(无压力盾击 OC 预留地板)+ 断言脚本" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: brain 接入 ocFloorOk + 集成观察

**Files:**
- Modify: `autobattle/src/battle/brain.ts`(第 9 行 import;杂兵盾击分支 `if (C.useShieldBash && oc >= 25)`)
- Modify: `autobattle/scripts/drive-brain.mts`(末尾追加场景)

- [ ] **Step 1: import 加 ocFloorOk**

在 `autobattle/src/battle/brain.ts` 第 9 行,定位:

```ts
import { assessPressure, hasFutureRound, selectControlDebuff, selectRedTarget, shouldSaveOcForCannon } from './strategy';
```

改为(按字母序在 `hasFutureRound` 后插入 `ocFloorOk`):

```ts
import { assessPressure, hasFutureRound, ocFloorOk, selectControlDebuff, selectRedTarget, shouldSaveOcForCannon } from './strategy';
```

- [ ] **Step 2: 杂兵盾击分支加地板判断**

在 `autobattle/src/battle/brain.ts` 定位杂兵盾击分支(注释 `// ── 杂兵减压` 之下、走 `SK_SPECIAL.shieldBash` 且**不含** `S.stanceOn`/`this.hitRed` 的那一处):

```ts
      if (C.useShieldBash && oc >= 25) {
```

改为:

```ts
      if (C.useShieldBash && oc >= 25 && ocFloorOk(S, C, pressure, oc, 25)) {
```

> ⚠ 唯一改这一处。红名连招盾击(带 `S.stanceOn && !tgtSp.stunned` 且走 `this.hitRed`)、要害分支、平砍均不动。Edit 用整行精确匹配避免误伤。

- [ ] **Step 3: typecheck**

Run: `cd autobattle && npm run typecheck`
Expected: 无报错(exit 0)。`S`/`C`/`pressure`/`oc` 在该分支作用域内均已存在。

- [ ] **Step 4: drive-brain.mts 末尾追加集成观察场景**

在 `autobattle/scripts/drive-brain.mts` **文件末尾**追加:

```ts

// ── 无压力盾击 OC 预留地板观察(ocFloorOk)──
{ const s = base(); s.enemies = many(3); s.alive = 3; s.monsterTotal = 3; s.overcharge = 140; s.cannonExists = false; run('㉑无压力3杂兵OC140炮不可用[盾击应抑制→平砍]', { state: s }); }
{ const s = base(); s.enemies = many(3); s.alive = 3; s.monsterTotal = 3; s.overcharge = 150; s.cannonExists = false; run('㉒无压力3杂兵OC150炮不可用[盾击放行]', { state: s }); }
{ const s = base(); s.enemies = many(3); s.alive = 3; s.monsterTotal = 3; s.overcharge = 190; s.cannonExists = true; s.cannonOnCd = false; run('㉓无压力3杂兵OC190炮可用[盾击应抑制→平砍]', { state: s }); }
```

- [ ] **Step 5: 跑 drive-brain 肉眼对比**

Run: `cd autobattle && npx --yes tsx scripts/drive-brain.mts`
Expected:
- `㉑无压力3杂兵OC140炮不可用` → 决策为**平砍杂兵**(`[attack]`),不是盾击(140-25=115<125 被地板抑制);
- `㉒无压力3杂兵OC150炮不可用` → 决策为**盾击晕杂兵**(`[spell:...]`,note 含"盾击晕杂兵";150-25=125≥125 放行);
- `㉓无压力3杂兵OC190炮可用` → 决策为**平砍杂兵**(`[attack]`,190-25=165<炮线175 被抑制)。

- [ ] **Step 6: diagnostics 校验改动文件**

用 `vscode-mcp-server` 检查 `config.ts`、`strategy.ts`、`brain.ts` 的 diagnostics。若 MCP 不可用则跳过并在汇报中说明。修复本次改动引入的任何报错。

- [ ] **Step 7: Commit**

```bash
git add autobattle/src/battle/brain.ts autobattle/scripts/drive-brain.mts
git commit -m "feat(autobattle): brain 杂兵盾击接入 ocFloorOk(无压力 OC 预留地板)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 最终验证

**Files:** 无改动,仅验证。

- [ ] **Step 1: 全量 typecheck**

Run: `cd autobattle && npm run typecheck`
Expected: exit 0,无报错。

- [ ] **Step 2: 构建产物 sanity（确认未破坏打包）**

Run: `cd autobattle && npm run build`
Expected: Vite 构建成功,生成 `dist/hv-autobattle.user.js`,无错误。

- [ ] **Step 3: 复跑两个驱动脚本确认绿**

Run: `cd autobattle && npx --yes tsx scripts/drive-ocfloor.mts && npx --yes tsx scripts/drive-brain.mts`
Expected: `drive-ocfloor` 输出 `✅ 全部 6 用例通过`;`drive-brain` 三个新场景符合 Task 3 Step 5 预期。

---

## Self-Review(已执行)

**1. Spec 覆盖**
- 核心规则(无压力 OC 预留地板) → Task 2 `ocFloorOk` + Task 3 接入 ✓
- 动态地板(炮可用 175 / 不可用 125) → `ocFloorOk` 的 `cannonReady ? CANNON_YIELD_OC : OC_ON*OCMAX` ✓
- 只改盾击、要害/红名连招不动 → Task 3 Step 2 单点修改 + 警示 ✓
- 有压力维持现状 → `pressure.level !== 'low'` 早返回 + 用例 5 ✓
- 灰度开关默认开可回退 → Task 1 + 用例 6 ✓
- 不写死阈值(复用 config) → `C.CANNON_YIELD_OC` / `C.OC_ON*C.OCMAX` ✓
- 无需 bump CONFIG_VERSION → Task 1 说明(全新键 spread 取默认)✓
- 单测 6 用例 → Task 2 全覆盖 spec 测试要点 ✓
- diagnostics → Task 3 Step 6 ✓

**2. 占位符扫描:** 无 TBD/TODO;每个代码步骤含完整代码;每个命令含确切 Run + Expected。

**3. 类型/签名一致性:**
- `ocFloorOk(S, C, pressure, oc, cost)` —— 定义(Task 2 Step 3)、单测调用(Task 2 Step 1)、brain 调用(Task 3 Step 2)三处签名/实参顺序一致 ✓
- `Pressure` 从 `strategy.ts` 导出并在单测 import ✓
- config 键名 `useShieldBashOcFloor` 三处(config 定义 / `ocFloorOk` 读 / 用例 6)拼写一致 ✓
- `cost` 实参恒为 `25`(brain 调用 + 单测)与 brain 既有硬门槛 `oc >= 25` 一致 ✓
