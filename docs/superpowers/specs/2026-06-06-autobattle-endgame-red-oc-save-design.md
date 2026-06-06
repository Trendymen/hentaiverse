# 残局红名 OC 省留设计

- 日期: 2026-06-06
- 状态: 设计待审
- 分支: feat/auto
- 范围: `autobattle/src/battle/strategy.ts`、`autobattle/src/battle/brain.ts`、`autobattle/src/core/config.ts`

## 背景与问题

战斗收尾常出现"只剩 1-2 个红名 boss、杂兵已清空"的残局。此时现有逻辑仍会用 OC 单体技处决红名:

- `execRed` 块(`brain.ts`,排在攒炮 gate 之前的"破攒炮"红名斩杀两步):慈悲处决(`hpPct<25 && bleeding && oc>=100`)、要害收割(`stunned && !bleeding && 喂血时机 && oc>=50`);
- 红名连招块(`if (!saveOcForCannon)` 内):慈悲(`oc>=100`)、要害(`stanceOn && stunned && oc>=50`)、盾击(`stanceOn && !stunned && oc>=25`)。

残局只剩 ≤2 红名时 `shouldSaveOcForCannon` 返回 false(活怪 < `CANNON_MIN_ENEMIES`=6),所以这两块都会执行,把 OC 花在处决红名上。但红名 boss 血厚、平砍也能磨死;若此时自身血量安全,把 OC 攒着跨轮、留给**下一轮开局直接放炮(AOE 清场)** 的价值更高。

## 目标

残局收尾、自身血量未持续下降时,克制对红名用 OC 单体技,改平砍磨、把 OC 攒着留给下轮开局炮。血量在掉时仍正常斩杀链快速降险。

## 非目标(YAGNI)

- 不改非触发局面(本轮 ≤6 怪 / 还剩 >1 只活怪)的任何行为。
- 不改 `struggling` 时的斩杀链。
- 不动上一特性的 `ocFloorOk`(杂兵盾击地板)——两者独立。
- 不改攒炮 gate `shouldSaveOcForCannon` 本身。
- 不新增数字常量到 config(地板复用 `CANNON_YIELD_OC`;本轮怪数阈值 6 作函数内常量)。

## 触发条件(全满足)

1. 本轮怪物总数 > 6(`S.monsterTotal > 6`,大波);
2. 打到只剩 1 只红名(`live.length === 1 && live[0].is_red_boss`,无其他活怪);
3. 有下一轮波(`hasFutureRound(S)`,非最终波)——最终波没有下一波可攒,省 OC 无意义,应无脑 OC 斩杀。

即"大波清场到只剩最后一只红名 boss、且后面还有波次"这一收尾局面才启用省 OC,不看红名血量阈值。

> 交互说明:满足条件时(`monsterTotal>6 && hasFutureRound`),`shouldSaveOcForCannon` 本就为 true(攒炮模式),连招块被跳过——`endgameRedHold` 的实际作用是 hold 住 `execRed` 块的"破攒炮"慈悲/要害,让大波收尾不破攒炮、继续攒 OC。连招块 3 处 gate 在当前 `saveOcForCannon` 逻辑下成为防御性冗余(有下一波时攒炮跳过连招;最终波时 `endgameRedHold` 因条件 3 返回 false),保留以防 gate 逻辑变化。

## 设计

### 决策信号
复用 `brain.ts` 既有局部变量 `struggling = this.lowHpStreak >= C.STRUGGLE_STREAK`(连续 `STRUGGLE_STREAK`=2 次决策 HP 跌破 `STRUGGLE_HP`=50%,即"最近血量持续下降")。

### 地板取值
放完该技后 OC 仍需 ≥ `CANNON_YIELD_OC`(175,接近炮线 200)。各技触发线:

| 技 | OC 消耗 | 残局血稳时放行需 |
| --- | --- | --- |
| 盾击 | 25 | `OC ≥ 200` |
| 要害 | 50 | `OC ≥ 225` |
| 慈悲 | 100 | `OC ≥ 275`(>250 不可能 → **永不放**) |

效果:残局血稳时基本纯平砍磨;OC 顶到 200/225 时放盾击/要害消化溢出,始终保留 ≥175 给下轮开局炮。

### 改动 1:`strategy.ts` 新增 `endgameRedHold`
`Config`/`BattleState` 已在本文件 import,`EnemyState.hpPct` 现成,零新增 import。在 `ocFloorOk` 之后新增:

```ts
/** 残局红名 OC 省留: 本轮怪总数>6 的大波、打到只剩 1 只红名、有下一轮波、且血稳(非struggling)时,
 *  对红名 OC 单体技设175地板(放完仍≥CANNON_YIELD_OC), 攒OC留下轮开局炮.
 *  最终波(无下一轮波) → 无脑OC斩杀; struggling/非触发/开关关 → false(正常出手). */
export function endgameRedHold(S: BattleState, C: Config, oc: number, cost: number, struggling: boolean): boolean {
  if (!C.useEndgameRedOcSave) return false;          // 开关关 → 不暂缓
  if (struggling) return false;                      // 血连降 → 正常斩杀链
  if (!hasFutureRound(S)) return false;              // 最终波(无下一轮波) → 无脑OC斩杀, 不省
  if (S.monsterTotal <= 6) return false;             // 本轮怪总数≤6(非大波) → 不进入
  const live = S.enemies.filter((e) => e.alive);
  if (live.length !== 1 || !live[0].is_red_boss) return false; // 非"只剩1红名" → 不进入
  return oc - cost < C.CANNON_YIELD_OC;              // 放完<175 → 暂缓攒OC; 放完≥175 → 不暂缓(消化溢出)
}
```

语义:返回 `true` = 应暂缓(hold)该红名 OC 技。

### 改动 2:`brain.ts` 5 处红名 OC 技分支加 gate
在每处红名 OC 技的条件尾部加 `&& !endgameRedHold(S, C, oc, <cost>, struggling)`(`struggling` 已在 `saveOcForCannon` 上方定义,5 处均可访问):

| # | 分支(字符串锚点) | cost |
| --- | --- | --- |
| 1 | execRed 慈悲(`note: 慈悲处决红名...破攒炮`,`oc >= 100`) | 100 |
| 2 | execRed 要害(`note: 要害收割红名...破攒炮`,`oc >= 50`) | 50 |
| 3 | 连招慈悲(`note: 慈悲处决红名#${tgtSp.eid}(...+流血)`,`oc >= 100`) | 100 |
| 4 | 连招要害(`note: 要害收割红名#${tgtSp.eid}(...延迟喂流血)`,`oc >= 50`) | 50 |
| 5 | 连招盾击(`note: 盾击晕红名#${tgtSp.eid}(连招1步)`,`oc >= 25`) | 25 |

实施以字符串/note 精确匹配定位,不依赖行号(外部 commit 可能位移行号,当前约值 268/273/281/286/289)。杂兵盾击/要害分支(走 `ocFloorOk`、不走 `hitRed`)、平砍分支均不动。

### 改动 3:`config.ts` 新增灰度开关
`useShieldBash` 区域附近新增:

```ts
useEndgameRedOcSave: true, // 残局(本轮>6怪打到只剩1红名)血稳时, 红名OC单体技设175地板(放完仍≥CANNON_YIELD_OC)攒OC留下轮炮; struggling 则正常斩杀链; false 退回旧行为(灰度回退)
```

全新布尔键,经 `{...DEFAULT_CONFIG, ...存档}` 自动取默认 true,**无需 bump `CONFIG_VERSION`**。

## 残局收尾后续路径(确认无死锁)

残局血稳、5 处红名 OC 技全被 hold 后,decide 落到 P16 尾部:`trash = ranked.filter(!is_red_boss && alive)` 为空 → `if (tgt)` 命中(`selectRedTarget` 返回的红名)→ 平砍红名(`仅剩红怪`)。即正常磨红名,不会 defend 空转。

## 回归风险

| 风险 | 缓解 |
| --- | --- |
| 误伤非触发局面红名处决 | `endgameRedHold` 在非触发(本轮≤6怪/还剩>1活怪)直接 return false,`&& !false` 不改原条件 |
| 误伤 struggling 时的斩杀链 | `struggling` 时 return false,维持现状 |
| 大波只剩1红名血稳、磨太久 | 设计预期:大波收尾该红名通常已被前面削软;OC 攒到 200 可放盾击辅助。若实测嫌慢,关 `useEndgameRedOcSave` 即回退 |
| 与 `ocFloorOk` 冲突 | 两函数独立,作用分支不同(杂兵盾击 vs 红名5处);残局无杂兵,`ocFloorOk` 的杂兵分支本就不触发 |
| `struggling` 在 execRed 块不可访问 | 已确认 `struggling` 定义在 `saveOcForCannon` 上方,execRed 块(其后)可访问 |

## 测试要点

新增 `autobattle/scripts/drive-endgame.mts` 断言 `endgameRedHold`(`St(enemies, monsterTotal=10, roundNow=1, roundAll=10)`,默认有下一波;`cost` 取 25/50/100):

1. 大波(mt=10)+只剩1红名+血稳+盾击oc190 → true(165<175,暂缓)
2. 大波+只剩1红名+血稳+盾击oc200 → false(175≥175,放行消化溢出)
3. 大波+只剩1红名+血稳+要害oc200 → true(150<175)
4. 大波+只剩1红名+血稳+慈悲oc250 → true(150<175,慈悲恒 hold)
5. 大波+只剩1红名+`struggling=true` → false(血连降,正常斩杀)
6. 小波(mt=6,非>6)+只剩1红名+血稳 → false(本轮怪≤6)
7. 大波+剩2红名+血稳 → false(非"只剩1红名")
8. 大波+只剩1只杂兵(非red)+血稳 → false
9. 大波+只剩1红名(80%血)+血稳 → true(不看血量阈值)
10. 开关关(`useEndgameRedOcSave=false`)+大波+只剩1红名 → false
11. 最终波(`roundNow==roundAll`,无下一波)+大波+只剩1红名 → false(最终波无脑 OC,不省)
12. 6 怪波(mt=6,非>6)+剩2红名 → false(两条件都不满足,会用 OC 单体)

集成:`drive-brain.mts` 最终波(㉔)与有下一波(㉕)对比——㉔最终波大波只剩1红名 → 盾击晕红名(无脑 OC);㉕有下一波大波只剩1红名 → 平砍红名(攒炮省 OC)。

## 待实现清单

1. `config.ts` 新增 `useEndgameRedOcSave: true`
2. `strategy.ts` 新增 `endgameRedHold` + `drive-endgame.mts` 断言(TDD)
3. `brain.ts` 5 处红名 OC 技加 `&& !endgameRedHold(...)`
4. `drive-brain.mts` 加残局集成场景
5. diagnostics 校验改动文件(vscode-mcp-server 不可用则说明跳过)
