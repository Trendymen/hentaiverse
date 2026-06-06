# 无压力时盾击杂兵的 OC 预留地板设计

- 日期: 2026-06-06
- 状态: 设计待审
- 范围: `autobattle/src/battle/strategy.ts`、`autobattle/src/battle/brain.ts`、`autobattle/src/core/config.ts`

## 背景与问题

灵动架式提供 +100% 物理伤害,开启需 `OC ≥ OC_ON × OCMAX = 0.5 × 250 = 125`(`brain.ts` P12,关架式线 `OC_OFF × OCMAX = 55`)。小马炮 AOE 需 `OC ≥ CANNON_MIN_OC = 200`。OC 是跨波保留的稀缺资源。

当前对非红名杂兵的盾击分支(`brain.ts`,`if (C.useShieldBash && oc >= 25)` 那处)**完全不看压力**:只要不在攒炮模式(整块包在 `if (!saveOcForCannon)` 内)、`OC ≥ 25` 且有未晕杂兵就晕。后果:在**无压力的轻松杂兵波**,盾击每回合 -25 OC 无脑晕场,把 OC 长期压在开架式线 125 以下,导致:

1. 架式攒不到 125、开不起来,或在 125 上下被盾击拽到 55 以下反复开关;
2. OC 被零碎花掉,攒不向炮线 200。

对比:要害杂兵分支已有压力门槛 `hasRed || struggling || finalRound || pressure.level !== 'low'`,在 `level==='low'` 时只剩 `finalRound`(最终波)能触发,**无压力时几乎不打杂兵**。所以本次问题集中在盾击。

## 目标

无压力时让盾击对杂兵"克制用 OC",把 OC 优先留给开/维持架式与攒炮;有压力时维持现状不变。

## 非目标(YAGNI)

- 不改要害分支(无压力时它仅最终波打杂兵,影响极小)。
- 不改有压力(medium/high,含有红名场)下的任何行为。
- 不改红名处决连招(锁红怪的盾击/要害/慈悲)。
- 不调 `shouldSaveOcForCannon` / `CANNON_MIN_ENEMIES`(本次不碰攒炮 gate 本身)。

## "无压力"的精确定义

复用现有 `assessPressure`(`strategy.ts`):`pressure.level === 'low'` 等价于 **SP 充足 + 上次未受重击(≤30% maxHp)+ 血线未连降(< STRUGGLE_STREAK)+ 无红名在场**(`hasRed` 会把等级强制抬到 ≥ medium)。无需新定义。

## 设计

### 核心规则

无压力时,盾击晕杂兵需满足 **OC 预留地板**:放完盾击(扣 `cost = 25`)后 OC 仍 ≥ 地板。地板**动态**取值:

| 场景 | 地板 | 触发线(放完仍 ≥ 地板) |
| --- | --- | --- |
| 无压力 + 炮可用 | `CANNON_YIELD_OC`(175) | `oc ≥ 200` |
| 无压力 + 炮不可用 | `OC_ON × OCMAX`(125) | `oc ≥ 150` |
| 有压力(medium/high) | 不设地板 | 维持现状 `oc ≥ 25` |
| 灰度开关关闭 | 不设地板 | 旧行为 `oc ≥ 25` |

"炮可用"口径与 `shouldSaveOcForCannon` 一致:`C.useCannon && S.cannonExists && !S.cannonOnCd`。

### 改动 1:`strategy.ts` 新增 `ocFloorOk`

在 `shouldSaveOcForCannon` 之后新增(`Config`/`BattleState`/`Pressure` 均已在本文件作用域,零新增 import):

```ts
/** 无压力时盾击晕杂兵的 OC 经济地板: 放完(扣 cost)后 OC 仍需 ≥ 地板, 把 OC 留给开/维持架式 + 攒炮.
 *  炮可用时地板抬到攒炮让位线 CANNON_YIELD_OC(为炮跨波预留), 否则用开架式线 OC_ON×OCMAX.
 *  有压力(level≠'low', 含红名场) 或灰度开关关闭则不设地板, 维持旧行为. */
export function ocFloorOk(S: BattleState, C: Config, pressure: Pressure, oc: number, cost: number): boolean {
  if (!C.useShieldBashOcFloor) return true;            // 灰度开关关 → 旧行为
  if (pressure.level !== 'low') return true;           // 有压力 → 维持现状
  const cannonReady = C.useCannon && S.cannonExists && !S.cannonOnCd;
  const floor = cannonReady ? C.CANNON_YIELD_OC : C.OC_ON * C.OCMAX;
  return oc - cost >= floor;
}
```

`cost` 入参为将来要害复用预留:未来给要害加 `&& ocFloorOk(S, C, pressure, oc, 50)` 即可,零签名改动。

### 改动 2:`brain.ts` 盾击杂兵分支加地板判断 + import

- import(第 9 行,按字母序):在 `hasFutureRound` 之后插入 `ocFloorOk`。
- 盾击杂兵分支(`if (C.useShieldBash && oc >= 25)` 那处,即**非红名连招、无 `stanceOn`/`hitRed` 的那一处**):

```ts
// 改前
if (C.useShieldBash && oc >= 25) {
// 改后
if (C.useShieldBash && oc >= 25 && ocFloorOk(S, C, pressure, oc, 25)) {
```

保留 `oc >= 25` 作为游戏硬门槛并短路前置;`ocFloorOk` 是额外的无压力经济地板。**仅此一处**,红名连招盾击、要害分支、平砍全不动。

### 改动 3:`config.ts` 新增灰度开关

在 `useShieldBash` 之后新增:

```ts
useShieldBashOcFloor: true, // 无压力(level==='low')盾击晕杂兵需放完 OC 仍≥地板(炮可用→CANNON_YIELD_OC 175, 否则开架式线 OC_ON×OCMAX 125), 把 OC 留给架式/攒炮; false 退回旧"oc≥25 即晕"(灰度可一键回滚)
```

地板复用 `OC_ON×OCMAX` 与 `CANNON_YIELD_OC`,**无需新数字常量**;全新布尔键经 `{...DEFAULT_CONFIG, ...存档}` 合并自动取 `true`,**无需 bump CONFIG_VERSION**。

## 地板取值决策与已知 trade-off

Review 推荐**固定地板 125**(不为炮抬高),论证:低密度波(活怪 < `CANNON_MIN_ENEMIES`=6)是 `shouldSaveOcForCannon` **故意放行不攒炮**的区域(`config.ts` 注释:`CANNON_MIN_ENEMIES` 4→6 就是为砍掉小局攒炮空转),且低密度波本回合活怪 < 6 **根本放不出炮**,抬高地板只禁盾击、换不到本波炮收益。

**用户决策:采用动态地板(炮可用抬到 175)**,理由是跨波为炮预留 OC 的价值高于"不复活小局攒炮"的代价。已知 trade-off 与缓解:

- 代价:无压力 + 炮可用的低密度波,OC 在 175–199 区间时不再盾击,可能多挨几下杂兵平砍;且本波放不出炮、OC 留待下波。
- 缓解:`useShieldBashOcFloor` 灰度开关默认开,实测不理想可一键回退;若低密度波 OC 空转明显,优先回退开关或改 `shouldSaveOcForCannon`,**不**删动态地板逻辑。

## 回归风险

| 风险 | 缓解 |
| --- | --- |
| `S.cannonOnCd` 仅由 `loop` 按回合注入,reader 读不到默认 false。brain 脱离 loop(单测)调用时"炮可用"判定偏乐观 | 生产环境 brain 由 loop 驱动,正常注入;单测构造"炮可用"场景需显式设置 `S.cannonExists`/`S.cannonOnCd` |
| 误改红名连招盾击(同在 `if(!saveOcForCannon)` 块内,文本相似) | 红名连招盾击有独立 gate `S.stanceOn && !tgtSp.stunned` 且走 `this.hitRed`;只改唯一无 `stanceOn`/无 `hitRed` 的杂兵盾击那处,Edit 用整句精确匹配 |
| 影响有压力路径 | `pressure.level !== 'low'` 直接 `return true`,medium/high 完全维持现状 |
| 与攒炮 gate 冲突 | 正式攒炮模式由 `if(!saveOcForCannon)` 在外层已挡住整块;`ocFloorOk` 是块内的额外地板,语义不重叠 |
| 破坏架式开关滞回 | P12 架式开关在盾击分支之前执行;放完仍 ≥ 125 远高于关线 55,不触发来回开关;`ocFloorOk` 不读 `S.stanceOn`,故"架式已开也遵守地板"天然满足 |

## 测试要点

针对 `ocFloorOk` 的单元用例(`cost = 25`):

1. 无压力 + 炮不可用 + `oc=140` → `false`(140-25=115 < 125)
2. 无压力 + 炮不可用 + `oc=150` → `true`(150-25=125 ≥ 125)
3. 无压力 + 炮可用 + `oc=190` → `false`(190-25=165 < 175)
4. 无压力 + 炮可用 + `oc=200` → `true`(200-25=175 ≥ 175)
5. 有压力(medium,有红名) + `oc=30` → `true`(维持现状)
6. `useShieldBashOcFloor=false` + 无压力 + `oc=30` → `true`(旧行为)

集成层面:复用现有 brain 驱动脚本,确认无压力低 OC 波不再出现"盾击晕杂兵"日志、且架式能正常开启。

## 待实现清单

1. `strategy.ts` 新增 `ocFloorOk`
2. `brain.ts` import 加 `ocFloorOk` + 盾击杂兵分支加 `&& ocFloorOk(S, C, pressure, oc, 25)`
3. `config.ts` 新增 `useShieldBashOcFloor: true`
4. 补 `ocFloorOk` 单测(上述 6 用例)
5. diagnostics 校验改动文件
