# 单红收尾关架式攒 OC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 单红收尾(只剩 1 红名)时关架式攒 OC,并解除连招盾击/要害的架式门槛 + 强制不攒炮,让「盾击→要害→慈悲」处决链在关架式下跑起来。

**Architecture:** `strategy.ts` 加纯判定 `endgameSoloRed`;`brain.ts` 在 P12 前算一次 `soloRed`,三处配合——A 强制不攒炮、B 关架式不自动开、C 连招盾击/要害 `stanceOn||soloRed`。灰度开关 `useEndgameStanceOff` 默认开可回退。

**Tech Stack:** TypeScript 5.6,Vite,`tsc --noEmit` + `npx tsx scripts/drive-brain.mts`(无 vitest)。

参考 spec:`docs/superpowers/specs/2026-06-06-autobattle-endgame-stance-off-design.md`

---

## File Structure

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `autobattle/src/core/config.ts` | 修改 | 加 `useEndgameStanceOff: true` 灰度开关 |
| `autobattle/src/battle/strategy.ts` | 修改 | 加 `endgameSoloRed(S,C)` 判定(零新增 import) |
| `autobattle/src/battle/brain.ts` | 修改 | import + 算 `soloRed` + 改动 A(不攒炮)/B(关架式)/C(连招解除 stanceOn) |
| `autobattle/scripts/drive-brain.mts` | 修改 | 加 3 个单红收尾对比观察场景 |

---

## Task 1: config 新增灰度开关

**Files:** Modify `autobattle/src/core/config.ts`(`useShieldBashOcFloor` 之后)

- [ ] **Step 1: 加配置键** —— 定位:
```ts
  useShieldBashOcFloor: true, // 无压力(level==='low')盾击晕杂兵需放完 OC 仍≥地板(炮可用→CANNON_YIELD_OC 175, 否则开架式线 OC_ON*OCMAX 125), 把 OC 留给架式/攒炮; false 退回旧"oc≥25 即晕"(灰度可一键回滚)
```
在其**下一行**插入:
```ts
  useEndgameStanceOff: true, // 单红收尾(只剩1红名)关架式攒OC, 让盾击→要害→慈悲处决链在关架式下跑(解除连招stanceOn门槛+强制不攒炮); false 退回旧"架式常开磨"(灰度回退)
```

- [ ] **Step 2: typecheck** —— Run: `cd autobattle ; npm run typecheck` ,Expected: exit 0。

- [ ] **Step 3: Commit**
```bash
git add autobattle/src/core/config.ts
git commit -m "feat(autobattle): config 新增 useEndgameStanceOff 灰度开关" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: strategy 新增 endgameSoloRed

**Files:** Modify `autobattle/src/battle/strategy.ts`(`ocFloorOk` 之后)

- [ ] **Step 1: 实现 endgameSoloRed** —— 在 `ocFloorOk` 函数结尾的 `}`(`return oc - cost >= floor;` 下一行)之后追加:
```ts

/** 单红收尾(灰度): 活怪只剩 1 个且是红名 → 关架式攒 OC、处决链解除架式门槛.
 *  开关关 / ≥2 活怪 / 非红名 → false(维持现状). */
export function endgameSoloRed(S: BattleState, C: Config): boolean {
  if (!C.useEndgameStanceOff) return false;
  const live = S.enemies.filter((e) => e.alive);
  return live.length === 1 && live[0].is_red_boss;
}
```

- [ ] **Step 2: typecheck** —— Run: `cd autobattle ; npm run typecheck` ,Expected: exit 0(`Config`/`BattleState`/`EnemyState` 均已 import)。

- [ ] **Step 3: Commit**
```bash
git add autobattle/src/battle/strategy.ts
git commit -m "feat(autobattle): strategy 新增 endgameSoloRed 判定" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: brain 接入 A/B/C + 集成观察(TDD)

**Files:**
- Modify `autobattle/src/battle/brain.ts`(import + P12 + saveOcForCannon + 连招 286/289)
- Modify `autobattle/scripts/drive-brain.mts`(末尾加场景)

- [ ] **Step 1: drive-brain.mts 末尾追加 3 个单红收尾对比场景** —— 在文件**最末尾**追加:
```ts

// ── 单红收尾关架式攒OC观察(endgameSoloRed)── 红名带减益跳过P13, 聚焦架式/连招
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, hpPct: 80, hpNow: 8000, debuff: { weaken: true, imperil: true } })]; s.alive = 1; s.monsterTotal = 1; s.overcharge = 150; s.stanceOn = true; run('㉔单红+架开+OC150+开关on[应切架式关]', { state: s }); }
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, hpPct: 80, hpNow: 8000, debuff: { weaken: true, imperil: true } })]; s.alive = 1; s.monsterTotal = 1; s.overcharge = 50; s.stanceOn = false; run('㉕单红+架关+OC50+开关on[应盾击晕红名]', { state: s }); }
{ const s = base(); s.enemies = [enemy(1, { is_red_boss: true, hpPct: 80, hpNow: 8000, debuff: { weaken: true, imperil: true } })]; s.alive = 1; s.monsterTotal = 1; s.overcharge = 50; s.stanceOn = false; run('㉖单红+架关+OC50+开关off[现状→平砍]', { cfg: { useEndgameStanceOff: false }, state: s }); }
```

- [ ] **Step 2: 跑 drive-brain 看实现前(红)** —— Run: `cd autobattle ; npx --yes tsx scripts/drive-brain.mts | Select-Object -Last 3`
Expected(实现前,brain 还没接 soloRed):㉔→盾击(stanceOn=true 满足旧连招)、㉕→平砍(旧连招盾击需 stanceOn)。与目标(㉔切架式、㉕盾击)**不符** = 红。

- [ ] **Step 3: import 加 endgameSoloRed** —— `brain.ts` 第 9 行:
```ts
import { assessPressure, hasFutureRound, ocFloorOk, selectControlDebuff, selectRedTarget, shouldSaveOcForCannon } from './strategy';
```
改为(按字母序在 `assessPressure` 后插入 `endgameSoloRed`):
```ts
import { assessPressure, endgameSoloRed, hasFutureRound, ocFloorOk, selectControlDebuff, selectRedTarget, shouldSaveOcForCannon } from './strategy';
```

- [ ] **Step 4: 改动 B —— P12 加 soloRed 关架式分支** —— 定位整块:
```ts
    const cannonCtx = C.useCannon && C.cannonYieldStance && S.cannonExists && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES;
    if (cannonCtx && oc >= C.CANNON_YIELD_OC && oc < C.CANNON_MIN_OC) this.charging = true;
    if (!cannonCtx || oc < C.OC_OFF * C.OCMAX || oc >= C.CANNON_MIN_OC) this.charging = false;
    if (this.charging) {
      if (S.stanceOn) return { type: 'stance', exec: Exec.stance }; // 冲刺期关架式(只切一次, 之后保持关攒到 200)
    } else {
      if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn && !pressure.spReserveLow) return { type: 'stance', exec: Exec.stance };
      if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: 'stance', exec: Exec.stance };
    }
```
整块替换为(前加 `soloRed` 声明 + 关架式分支,原逻辑包进 else):
```ts
    // 单红收尾(灰度): 关架式攒 OC, 让处决链在关架式下跑(供 A/C 引用)
    const soloRed = endgameSoloRed(S, C);
    if (soloRed) {
      if (S.stanceOn) return { type: 'stance', exec: Exec.stance }; // 关架式攒OC; 不自动开(落到 P13+)
    } else {
      const cannonCtx = C.useCannon && C.cannonYieldStance && S.cannonExists && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES;
      if (cannonCtx && oc >= C.CANNON_YIELD_OC && oc < C.CANNON_MIN_OC) this.charging = true;
      if (!cannonCtx || oc < C.OC_OFF * C.OCMAX || oc >= C.CANNON_MIN_OC) this.charging = false;
      if (this.charging) {
        if (S.stanceOn) return { type: 'stance', exec: Exec.stance }; // 冲刺期关架式(只切一次, 之后保持关攒到 200)
      } else {
        if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn && !pressure.spReserveLow) return { type: 'stance', exec: Exec.stance };
        if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: 'stance', exec: Exec.stance };
      }
    }
```

- [ ] **Step 5: 改动 A —— 单红收尾强制不攒炮** —— 定位:
```ts
    const saveOcForCannon = shouldSaveOcForCannon(S, C, pressure, struggling);
```
改为:
```ts
    const saveOcForCannon = !soloRed && shouldSaveOcForCannon(S, C, pressure, struggling);
```

- [ ] **Step 6: 改动 C(要害)—— 连招要害解除 stanceOn** —— 定位:
```ts
        if (C.useVitalStrike && S.stanceOn && tgtSp.stunned && !tgtSp.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
```
改为(`S.stanceOn` → `(S.stanceOn || soloRed)`):
```ts
        if (C.useVitalStrike && (S.stanceOn || soloRed) && tgtSp.stunned && !tgtSp.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
```

- [ ] **Step 7: 改动 C(盾击)—— 连招盾击解除 stanceOn** —— 定位:
```ts
        if (C.useShieldBash && S.stanceOn && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
```
改为:
```ts
        if (C.useShieldBash && (S.stanceOn || soloRed) && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
```

- [ ] **Step 8: typecheck** —— Run: `cd autobattle ; npm run typecheck` ,Expected: exit 0。

- [ ] **Step 9: 跑 drive-brain 看实现后(绿)** —— Run: `cd autobattle ; npx --yes tsx scripts/drive-brain.mts | Select-Object -Last 3`
Expected:
- ㉔单红+架开+开关on → **切架式**(`[stance]`,改 B:关架式攒 OC);
- ㉕单红+架关+OC50+开关on → **盾击晕红名#1(连招1步)**(`[spell:2201]`,改 C+A:关架式下放盾击);
- ㉖单红+架关+OC50+开关off → **平砍红名**(`[attack]`,soloRed=false 维持现状)。
若不符,如实报告,不强行通过。

- [ ] **Step 10: diagnostics** —— `vscode-mcp-server` 可用则查 `brain.ts` 并修复本次报错;不可用则跳过并说明(typecheck 已替代)。

- [ ] **Step 11: Commit**
```bash
git add autobattle/src/battle/brain.ts autobattle/scripts/drive-brain.mts
git commit -m "feat(autobattle): brain 单红收尾接入 endgameSoloRed(关架式攒OC+解除连招stanceOn+不攒炮)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 最终验证

**Files:** 无改动,仅验证。

- [ ] **Step 1: 全量 typecheck** —— Run: `cd autobattle ; npm run typecheck` ,Expected: exit 0。
- [ ] **Step 2: 构建 sanity** —— Run: `cd autobattle ; npm run build` ,Expected: 生成 `dist/hv-autobattle.user.js`,无错误。
- [ ] **Step 3: 第一特性回归** —— Run: `cd autobattle ; npx --yes tsx scripts/drive-ocfloor.mts` ,Expected: `✅ ocFloorOk 全部 7 用例通过`(确认未碰坏 ocFloorOk)。
- [ ] **Step 4: drive-brain 复跑** —— Run: `cd autobattle ; npx --yes tsx scripts/drive-brain.mts | Select-Object -Last 3` ,Expected: ㉔切架式 / ㉕盾击 / ㉖平砍。

---

## Self-Review(已执行)

**1. Spec 覆盖**
- `endgameSoloRed` 判定 → Task 2 ✓
- 改动 A 不攒炮 → Task 3 Step 5(`!soloRed && shouldSaveOcForCannon`)✓
- 改动 B 关架式 → Task 3 Step 4(soloRed 分支:架开则切关、不自动开)✓
- 改动 C 解除 stanceOn → Task 3 Step 6/7(要害 286、盾击 289)✓
- 灰度开关默认开 → Task 1 ✓
- 回归(非单红短路) → soloRed=false 时 A/B/C 全维持现状 + Task4 Step3 ocFloorOk 回归 ✓
- 测试(集成对比) → Task 3 Step1/2/9 三场景 ✓

**2. 占位符扫描:** 无 TBD/TODO;每步含完整代码与确切命令/预期。

**3. 类型/签名一致性:** `endgameSoloRed(S, C)` 定义(T2)、import(T3S3)、调用(T3S4 `const soloRed = endgameSoloRed(S, C)`)一致;`soloRed` 在 P12(声明)→ saveOcForCannon(262)→ 连招(286/289)作用域内可见,声明在所有引用之前 ✓;config 键 `useEndgameStanceOff` 三处(定义/读/场景㉖)拼写一致 ✓
