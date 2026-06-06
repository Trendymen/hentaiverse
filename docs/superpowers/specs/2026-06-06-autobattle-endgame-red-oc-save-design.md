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

- 不改非残局(有杂兵 / 红名>2 / 红名都还 ≥50% 血)的任何行为。
- 不改 `struggling` 时的斩杀链。
- 不动上一特性的 `ocFloorOk`(杂兵盾击地板)——两者独立。
- 不改攒炮 gate `shouldSaveOcForCannon` 本身。
- 不新增数字常量到 config(地板复用 `CANNON_YIELD_OC`;红名数 2、血量 50% 作函数内常量)。

## 触发条件(三者全满足)

1. 活怪全是红名(`live.every(is_red_boss)`,即无活着的杂兵);
2. 红名数量 ≤ 2(`live.length` ∈ {1, 2});
3. 至少 1 个红名 `hpPct < 50%`(已进入收尾、接近可处决)。

加条件 3 是为了只在**收尾阶段**启用省 OC——红名都还满血时不傻磨,正常斩杀链快速削血。

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
/** 残局红名 OC 省留: 仅剩≤2红名(无杂兵)且至少1个<50%血、且血稳(非struggling)时,
 *  对红名 OC 单体技设175地板(放完仍≥CANNON_YIELD_OC), 攒OC留下轮开局炮.
 *  返回 true = 应暂缓该技、改平砍磨; struggling/非残局/开关关 → false(正常出手). */
export function endgameRedHold(S: BattleState, C: Config, oc: number, cost: number, struggling: boolean): boolean {
  if (!C.useEndgameRedOcSave) return false;          // 开关关 → 不暂缓
  if (struggling) return false;                      // 血连降 → 正常斩杀链
  const live = S.enemies.filter((e) => e.alive);
  if (live.length === 0 || live.length > 2) return false;     // 残局红名数上限 2
  if (!live.every((e) => e.is_red_boss)) return false;        // 有杂兵 → 非残局
  if (!live.some((e) => e.hpPct < 50)) return false;          // 没有红名<50% → 还没到收尾
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
useEndgameRedOcSave: true, // 残局(仅剩≤2红名+至少1个<50%血)血稳时, 红名OC单体技设175地板(放完仍≥CANNON_YIELD_OC)攒OC留下轮炮; struggling 则正常斩杀链; false 退回旧行为(灰度回退)
```

全新布尔键,经 `{...DEFAULT_CONFIG, ...存档}` 自动取默认 true,**无需 bump `CONFIG_VERSION`**。

## 残局收尾后续路径(确认无死锁)

残局血稳、5 处红名 OC 技全被 hold 后,decide 落到 P16 尾部:`trash = ranked.filter(!is_red_boss && alive)` 为空 → `if (tgt)` 命中(`selectRedTarget` 返回的红名)→ 平砍红名(`仅剩红怪`)。即正常磨红名,不会 defend 空转。

## 回归风险

| 风险 | 缓解 |
| --- | --- |
| 误伤非残局红名处决 | `endgameRedHold` 在非残局(有杂兵/红名>2/红名都≥50%)直接 return false,`&& !false` 不改原条件 |
| 误伤 struggling 时的斩杀链 | `struggling` 时 return false,维持现状 |
| 残局血稳但红名 <25% 仍不处决、磨太久 | 设计预期:<25% 红名平砍很快磨死;且 OC 攒到 200 可放盾击辅助。若实测嫌慢,关 `useEndgameRedOcSave` 即回退 |
| 与 `ocFloorOk` 冲突 | 两函数独立,作用分支不同(杂兵盾击 vs 红名5处);残局无杂兵,`ocFloorOk` 的杂兵分支本就不触发 |
| `struggling` 在 execRed 块不可访问 | 已确认 `struggling` 定义在 `saveOcForCannon` 上方,execRed 块(其后)可访问 |

## 测试要点

新增 `autobattle/scripts/drive-endgame.mts` 断言 `endgameRedHold`(构造 `live` 数组,`cost` 分别取 25/50/100):

1. 残局(2红名,1个<50%)+血稳+oc=190,cost=25 → true(190-25=165<175,暂缓)
2. 残局+血稳+oc=200,cost=25 → false(200-25=175≥175,放盾击消化溢出)
3. 残局+血稳+oc=200,cost=50 → true(200-50=150<175)
4. 残局+血稳+oc=250,cost=100 → true(250-100=150<175,慈悲恒 hold)
5. 残局+`struggling=true`+oc=120,cost=100 → false(血连降,正常斩杀)
6. 非残局(2怪中1个非红名)+血稳+oc=120 → false
7. 红名都≥50%(无<50%)+血稳+oc=120 → false(还没到收尾)
8. 红名数>2(3红名)+血稳 → false
9. 开关关(`useEndgameRedOcSave=false`)+残局+血稳+oc=120 → false

集成:`drive-brain.mts` 加残局场景(2红名其一<50%、血稳、OC 中等),确认决策为平砍红名而非慈悲/要害;再加 struggling 版确认仍走斩杀链。

## 待实现清单

1. `config.ts` 新增 `useEndgameRedOcSave: true`
2. `strategy.ts` 新增 `endgameRedHold` + `drive-endgame.mts` 断言(TDD)
3. `brain.ts` 5 处红名 OC 技加 `&& !endgameRedHold(...)`
4. `drive-brain.mts` 加残局集成场景
5. diagnostics 校验改动文件(vscode-mcp-server 不可用则说明跳过)
