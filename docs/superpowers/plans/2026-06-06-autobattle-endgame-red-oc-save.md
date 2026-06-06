# 残局红名 OC 省留 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 残局(仅剩 ≤2 红名 + 至少 1 个 <50% 血、无杂兵)且血稳(非 struggling)时,对红名的盾击/要害/慈悲设 175 OC 地板(放完仍 ≥ `CANNON_YIELD_OC`),改平砍磨、攒 OC 留下轮开局炮。

**Architecture:** `strategy.ts` 新增纯函数 `endgameRedHold(S,C,oc,cost,struggling)`(返回 true=应暂缓该技);`brain.ts` 5 处红名 OC 技分支加 `&& !endgameRedHold(...)`;`config.ts` 加灰度开关 `useEndgameRedOcSave`。与上一特性的 `ocFloorOk` 相互独立。

**Tech Stack:** TypeScript 5.6,Vite,`tsc --noEmit` typecheck + `npx tsx scripts/drive-*.mts` 驱动脚本(无 vitest,沿用 `node:assert` 脚本 pattern)。

参考 spec:`docs/superpowers/specs/2026-06-06-autobattle-endgame-red-oc-save-design.md`

---

## File Structure

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `autobattle/src/core/config.ts` | 修改 | 加 `useEndgameRedOcSave: true` 灰度开关(全新键,无需 bump CONFIG_VERSION) |
| `autobattle/src/battle/strategy.ts` | 修改 | 在 `ocFloorOk` 后新增 `endgameRedHold`(`Config`/`BattleState`/`EnemyState.hpPct` 现成,零新增 import) |
| `autobattle/src/battle/brain.ts` | 修改 | 第9行 import 加 `endgameRedHold`;5 处红名 OC 技分支加 gate |
| `autobattle/scripts/drive-endgame.mts` | 新建 | `node:assert` 断言 9 用例 |
| `autobattle/scripts/drive-brain.mts` | 修改 | 末尾加残局集成观察场景 |

---

## Task 1: config 新增灰度开关

**Files:** Modify `autobattle/src/core/config.ts`(`useShieldBashOcFloor` 之后)

- [ ] **Step 1: 加配置键**

定位(上一特性已加的那行):
```ts
  useShieldBashOcFloor: true, // 无压力(level==='low')盾击晕杂兵需放完 OC 仍≥地板(炮可用→CANNON_YIELD_OC 175, 否则开架式线 OC_ON*OCMAX 125), 把 OC 留给架式/攒炮; false 退回旧"oc≥25 即晕"(灰度可一键回滚)
```
在其**下一行**插入:
```ts
  useEndgameRedOcSave: true, // 残局(仅剩≤2红名+至少1个<50%血)血稳时, 红名OC单体技设175地板(放完仍≥CANNON_YIELD_OC)攒OC留下轮炮; struggling 则正常斩杀链; false 退回旧行为(灰度回退)
```

- [ ] **Step 2: typecheck**

Run: `cd autobattle ; npm run typecheck`
Expected: exit 0,无报错。

- [ ] **Step 3: Commit**

```bash
git add autobattle/src/core/config.ts
git commit -m "feat(autobattle): config 新增 useEndgameRedOcSave 灰度开关" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: strategy 新增 endgameRedHold(TDD)

**Files:**
- Create `autobattle/scripts/drive-endgame.mts`
- Modify `autobattle/src/battle/strategy.ts`(`ocFloorOk` 之后)

- [ ] **Step 1: 写断言脚本(失败测试)** —— 创建 `autobattle/scripts/drive-endgame.mts`:

```ts
// 断言 endgameRedHold: 残局红名 OC 省留地板.
// 跑: cd autobattle && npx --yes tsx scripts/drive-endgame.mts
import assert from 'node:assert/strict';
import { endgameRedHold } from '../src/battle/strategy';
import { DEFAULT_CONFIG } from '../src/core/config';
import type { BattleState, EnemyState } from '../src/types';

const C = { ...DEFAULT_CONFIG };
const e = (o: Partial<EnemyState>): EnemyState => ({ alive: true, is_red_boss: true, hpPct: 100, ...o } as EnemyState);
const St = (enemies: EnemyState[]) => ({ enemies } as unknown as BattleState);

let pass = 0;
const check = (name: string, actual: boolean, expected: boolean) => {
  assert.equal(actual, expected, `${name}: 期望 ${expected} 实得 ${actual}`);
  console.log('  ✓', name);
  pass++;
};

const endgame = [e({ hpPct: 40 }), e({ hpPct: 80 })]; // 残局: 2红名, 其一<50%

// 1. 残局+血稳+盾击oc190 → true(190-25=165<175 暂缓)
check('残局·血稳·盾击oc190→暂缓', endgameRedHold(St(endgame), C, 190, 25, false), true);
// 2. 残局+血稳+盾击oc200 → false(200-25=175≥175 放行消化溢出)
check('残局·血稳·盾击oc200→放行', endgameRedHold(St(endgame), C, 200, 25, false), false);
// 3. 残局+血稳+要害oc200 → true(200-50=150<175)
check('残局·血稳·要害oc200→暂缓', endgameRedHold(St(endgame), C, 200, 50, false), true);
// 4. 残局+血稳+慈悲oc250 → true(250-100=150<175 慈悲恒暂缓)
check('残局·血稳·慈悲oc250→暂缓', endgameRedHold(St(endgame), C, 250, 100, false), true);
// 5. 残局+struggling+慈悲oc120 → false(血连降正常斩杀)
check('残局·struggling·慈悲→放行', endgameRedHold(St(endgame), C, 120, 100, true), false);
// 6. 非残局(有杂兵)+血稳 → false
check('有杂兵·非残局→放行', endgameRedHold(St([e({ hpPct: 40 }), e({ is_red_boss: false, hpPct: 40 })]), C, 120, 100, false), false);
// 7. 红名都≥50%+血稳 → false(还没收尾)
check('红名都≥50%→放行', endgameRedHold(St([e({ hpPct: 80 }), e({ hpPct: 60 })]), C, 120, 100, false), false);
// 8. 红名数>2(3红名)+血稳 → false
check('红名>2→放行', endgameRedHold(St([e({ hpPct: 40 }), e({ hpPct: 80 }), e({ hpPct: 90 })]), C, 120, 100, false), false);
// 9. 开关关+残局+血稳 → false
const Coff = { ...DEFAULT_CONFIG, useEndgameRedOcSave: false };
check('开关关→放行', endgameRedHold(St(endgame), Coff, 120, 100, false), false);

console.log(`\n✅ endgameRedHold 全部 ${pass} 用例通过`);
```

- [ ] **Step 2: 跑脚本验证它失败(红)**

Run: `cd autobattle ; npx --yes tsx scripts/drive-endgame.mts`
Expected: FAIL —— `endgameRedHold` 不是 `'../src/battle/strategy'` 的导出成员(非零退出)。

- [ ] **Step 3: 实现 endgameRedHold** —— 在 `autobattle/src/battle/strategy.ts` 定位 `ocFloorOk` 函数结尾的 `}`(`return oc - cost >= floor;` 下一行),在其后追加:

```ts

/** 残局红名 OC 省留: 仅剩≤2红名(无杂兵)且至少1个<50%血、且血稳(非struggling)时,
 *  对红名 OC 单体技设175地板(放完仍≥CANNON_YIELD_OC), 攒OC留下轮开局炮.
 *  返回 true = 应暂缓该技、改平砍磨; struggling/非残局/开关关 → false(正常出手). */
export function endgameRedHold(S: BattleState, C: Config, oc: number, cost: number, struggling: boolean): boolean {
  if (!C.useEndgameRedOcSave) return false; // 开关关 → 不暂缓
  if (struggling) return false; // 血连降 → 正常斩杀链
  const live = S.enemies.filter((e) => e.alive);
  if (live.length === 0 || live.length > 2) return false; // 残局红名数上限 2
  if (!live.every((e) => e.is_red_boss)) return false; // 有杂兵 → 非残局
  if (!live.some((e) => e.hpPct < 50)) return false; // 没有红名<50% → 还没到收尾
  return oc - cost < C.CANNON_YIELD_OC; // 放完<175 → 暂缓攒OC; 放完≥175 → 不暂缓(消化溢出)
}
```

- [ ] **Step 4: 跑脚本验证它通过(绿)**

Run: `cd autobattle ; npx --yes tsx scripts/drive-endgame.mts`
Expected: PASS —— 9 行 `✓` + `✅ endgameRedHold 全部 9 用例通过`,exit 0。

- [ ] **Step 5: typecheck**

Run: `cd autobattle ; npm run typecheck`
Expected: exit 0。

- [ ] **Step 6: Commit**

```bash
git add autobattle/src/battle/strategy.ts autobattle/scripts/drive-endgame.mts
git commit -m "feat(autobattle): strategy 新增 endgameRedHold(残局红名 OC 省留地板)+ 断言脚本" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: brain 5 处红名 OC 技加 gate + 集成观察

**Files:**
- Modify `autobattle/src/battle/brain.ts`(第9行 import + 5 处分支)
- Modify `autobattle/scripts/drive-brain.mts`(末尾)

- [ ] **Step 1: import 加 endgameRedHold**

定位第 9 行:
```ts
import { assessPressure, hasFutureRound, ocFloorOk, selectControlDebuff, selectRedTarget, shouldSaveOcForCannon } from './strategy';
```
改为(按字母序在 `assessPressure` 后插入 `endgameRedHold`):
```ts
import { assessPressure, endgameRedHold, hasFutureRound, ocFloorOk, selectControlDebuff, selectRedTarget, shouldSaveOcForCannon } from './strategy';
```

- [ ] **Step 2: execRed 慈悲分支加 gate**

定位:
```ts
      if (C.useMercifulBlow && execRed.eid !== this.mercifulBlockEid && execRed.hpPct < 25 && execRed.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
```
改为(在 `oc >= 100 &&` 后插入 gate):
```ts
      if (C.useMercifulBlow && execRed.eid !== this.mercifulBlockEid && execRed.hpPct < 25 && execRed.bleeding && oc >= 100 && !endgameRedHold(S, C, oc, 100, struggling) && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
```

- [ ] **Step 3: execRed 要害分支加 gate**

定位:
```ts
      if (C.useVitalStrike && execRed.stunned && !execRed.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(execRed, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
```
改为(在 `oc >= 50 &&` 后插入 gate):
```ts
      if (C.useVitalStrike && execRed.stunned && !execRed.bleeding && oc >= 50 && !endgameRedHold(S, C, oc, 50, struggling) && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(execRed, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
```

- [ ] **Step 4: 连招慈悲分支加 gate**

定位:
```ts
        if (C.useMercifulBlow && tgtSp.eid !== this.mercifulBlockEid && tgtSp.hpPct < 25 && tgtSp.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
```
改为:
```ts
        if (C.useMercifulBlow && tgtSp.eid !== this.mercifulBlockEid && tgtSp.hpPct < 25 && tgtSp.bleeding && oc >= 100 && !endgameRedHold(S, C, oc, 100, struggling) && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
```

- [ ] **Step 5: 连招要害分支加 gate**

定位:
```ts
        if (C.useVitalStrike && S.stanceOn && tgtSp.stunned && !tgtSp.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
```
改为:
```ts
        if (C.useVitalStrike && S.stanceOn && tgtSp.stunned && !tgtSp.bleeding && oc >= 50 && !endgameRedHold(S, C, oc, 50, struggling) && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
```

- [ ] **Step 6: 连招盾击分支加 gate**

定位:
```ts
        if (C.useShieldBash && S.stanceOn && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
```
改为:
```ts
        if (C.useShieldBash && S.stanceOn && !tgtSp.stunned && oc >= 25 && !endgameRedHold(S, C, oc, 25, struggling) && Exec.skillReady(SK_SPECIAL.shieldBash))
```

> ⚠ 杂兵盾击分支(走 `ocFloorOk`、`note: 盾击晕杂兵`)、杂兵要害分支(`note: 要害秒杂兵`)、平砍分支均不动。上面 5 处都是对红名的(走 `this.hitRed` / `note` 含「红名」)。

- [ ] **Step 7: typecheck**

Run: `cd autobattle ; npm run typecheck`
Expected: exit 0。`S`/`C`/`oc`/`struggling` 在这 5 处作用域均已存在(`struggling` 定义在 `saveOcForCannon` 上方)。

- [ ] **Step 8: drive-brain.mts 末尾追加残局集成场景**

在 `autobattle/scripts/drive-brain.mts` **文件最末尾**追加:
```ts

// ── 残局红名 OC 省留观察(endgameRedHold)── 2红名其一40%、都未晕、架式开、血稳
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, hpPct: 40, hpNow: 4000 }), enemy(2, { is_red_boss: true, hpPct: 80, hpNow: 8000 })]; s.alive = 2; s.monsterTotal = 2; s.overcharge = 150; s.stanceOn = true; run('㉔残局2红名(其一40%)血稳OC150架开[红名OC技hold→平砍红名]', { state: s }); }
```

- [ ] **Step 9: 跑 drive-brain 肉眼确认**

Run: `cd autobattle ; npx --yes tsx scripts/drive-brain.mts`
Expected: 场景 `㉔残局2红名...` 决策为 **平砍红名**(`[attack]`,note 含「仅剩红怪」),而非盾击/要害/慈悲(150-25=125<175,盾击被 `endgameRedHold` 暂缓)。其余既有场景决策不变。

- [ ] **Step 10: diagnostics**

若 `vscode-mcp-server` 可用,检查 `config.ts`/`strategy.ts`/`brain.ts` 的 diagnostics 并修复本次引入的报错;不可用则跳过并说明(typecheck 已替代验证)。

- [ ] **Step 11: Commit**

```bash
git add autobattle/src/battle/brain.ts autobattle/scripts/drive-brain.mts
git commit -m "feat(autobattle): brain 红名 OC 技接入 endgameRedHold(残局省留)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 最终验证

**Files:** 无改动,仅验证。

- [ ] **Step 1: 全量 typecheck**

Run: `cd autobattle ; npm run typecheck`
Expected: exit 0。

- [ ] **Step 2: 构建 sanity**

Run: `cd autobattle ; npm run build`
Expected: Vite 构建成功,生成 `dist/hv-autobattle.user.js`,无错误。

- [ ] **Step 3: 复跑驱动脚本**

Run: `cd autobattle ; npx --yes tsx scripts/drive-endgame.mts ; npx --yes tsx scripts/drive-brain.mts`
Expected: `drive-endgame` 输出 `✅ 全部 9 用例通过`;`drive-brain` 场景 ㉔ 为平砍红名。

---

## Self-Review(已执行)

**1. Spec 覆盖**
- 触发条件(≤2红名+无杂兵+至少1个<50%) → `endgameRedHold` 的 `live.length>2` / `every(is_red_boss)` / `some(hpPct<50)` 三判 ✓
- 决策信号 struggling → 入参 + 用例5 ✓
- 175 地板(放完仍≥CANNON_YIELD_OC) → `oc - cost < C.CANNON_YIELD_OC` + 用例1-4 ✓
- 5 处红名 OC 技 gate → Task3 Step2-6 ✓
- struggling/非残局/开关关维持现状 → 早返回 false + 用例5-9 + `&& !false` ✓
- 慈悲恒 hold → 用例4 ✓
- 不写死阈值(复用 CANNON_YIELD_OC) → ✓;红名数2、血量50% 函数内常量 ✓
- 灰度开关无需 bump 版本 → Task1 ✓
- 残局后续平砍红名不死锁 → Task3 Step9 集成验证 ✓

**2. 占位符扫描:** 无 TBD/TODO;每步含完整代码与确切命令/预期。

**3. 类型/签名一致性:** `endgameRedHold(S, C, oc, cost, struggling)` —— 定义(T2S3)、单测调用(T2S1)、brain 5 处调用(T3S2-6)签名/实参一致;cost 取值 100/50/25 与各分支 OC 门槛对应;config 键 `useEndgameRedOcSave` 三处(定义/读/用例9)拼写一致 ✓
