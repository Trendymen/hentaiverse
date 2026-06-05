# autobattle C-layered 盾战决策大脑设计

> 日期: 2026-06-05
> 状态: P0 前置清理已完成;C-layered 主体(Mystic split / Shadow Veil / Silence / 压力层 / OC预算)已接入, 待真机观察微调
> 前置: `docs/superpowers/specs/2026-06-05-autobattle-target-weight-design.md` 已实现到当前源码

## 1. 目标

当前 `Brain.decide()` 已经有 16 级顺序链, 并接入了 `target-weight.ts` 的杂兵平砍权重。下一阶段的目标不是重写成全新 AI, 而是在现有链条上做一层更清楚的战斗策略分层, 让单手盾战在高压塔楼/多红怪/长回合战斗里更像人工玩家:

- 资源语义正确: Mystic Gem 不再伪装成 HP/MP/SP 恢复宝石, 而是作为 Channeling 触发器使用。
- 生存套更完整: 加入 Shadow Veil 读取与可选维护, 但避免日常低压刷场无脑降低反击和 OC 收益。
- 高压减益更像攻略: 先 Weaken, SP 压力明显时铺 Silence, 再对高价值目标 Imperil; Sleep 不做默认策略。
- SP/OC 预算更稳: SP 不只在架式开启时才补; OC 不在最终波盲目跨波攒炮, 非红 OC 技也按权重选目标。
- 多红怪更可控: 红怪不再只取第一个活怪, 以 Yggdrasil、减益缺口、处决窗口、血量/权重选择, 同时保留锁定防抖。


## 2. 资料与代码证据

### 2.1 外部资料

- 主中文指引帖 `showtopic=189266` 已通过用户主 Chrome 的 `chrome-devtools` 抽取。实际有价值内容集中在第 1 页; 后续第 2/3 页主要是交易与回复噪声。缓存位于 `/tmp/hvforum-read/`。
- `2022第二季異世界爬塔攻略` 明确给出塔楼高层打法方向: 开场先给怪铺 Weaken, SP 下降明显时再加 Silence, 之后使用 Imperil 开始击杀, 血变厚后用单手技能 T1/T2/T3 按情况减压。来源: https://forums.e-hentai.org/index.php?s=&showtopic=257252&view=findpost&p=6214811
- `為何用沉默(Silence)取代睡眠(Asleep)` 的要点: 高防盾战真正压 SP 的常是怪物技能/灵力攻击; Silence 会封这些能力, 不会因攻击而解除, 且沉默怪仍会普攻, 可以继续触发反击和 OC。来源: https://forums.e-hentai.org/index.php?s=&showtopic=257252&view=findpost&p=6215153
- `減益魔法基本使用方式` 给出的保守顺序是 `Weaken -> Silence -> Sleep`: 全体 Weaken 后仍撑不住 SP 波动才上 Silence; 两者都不够且仍频繁触发 Spark 时才考虑 Sleep。重甲/高干扰下 Silence/Sleep 命中不足是正常风险。来源: https://forums.e-hentai.org/index.php?s=&showtopic=257252&view=findpost&p=6496841
- 文1-文6 对高塔共同指向: 高层生存更依赖魔法命中与减益, SP 可能被魔力/灵力攻击迅速压空, 装备/卷轴/减益优先于省消耗。来源: https://forums.e-hentai.org/index.php?s=&showtopic=201268&view=findpost&p=6087352 , https://forums.e-hentai.org/index.php?s=&showtopic=201268&view=findpost&p=6087461 , https://forums.e-hentai.org/index.php?s=&showtopic=201268&view=findpost&p=6087735 , https://forums.e-hentai.org/index.php?s=&showtopic=201268&view=findpost&p=6087767 , https://forums.e-hentai.org/index.php?s=&showtopic=257252&view=findpost&p=6108289 , https://forums.e-hentai.org/index.php?s=&showtopic=257252&view=findpost&p=6144618
- HentaiVerse WikiWiki 的战斗说明记录了 Channeling 效果: 下一次魔法 MP 消耗变 1, 持续回合变 1.5 倍, 妨害/攻击魔法必定命中; Mystic Gem 是触发来源之一。其 Spells 页也列出 Shadow Veil、Weaken、Sleep、Blind、Silence、Imperil 等效果与相对冷却。来源: https://wikiwiki.jp/hentaiverse/%E6%88%A6%E9%97%98%E6%89%8B%E9%A0%86 , https://wikiwiki.jp/hentaiverse/Spells

### 2.2 老脚本参考

`autobattle/reference/hvAutoAttack.user.js` 可参考的部分:

- `Shadow Veil` 在 buff 维护与 Channeling 队列中都有配置入口。
- 减益系统覆盖 Weaken、Imperil、Silence、Sleep, 也提供"先给所有敌人上 Weaken/Imperil"的概念。
- `finWeight`、Yggdrasil 额外权重、范围中心选择体现了"目标排序先算分, 再由动作消费"的分层思路。

不直接照搬的部分:

- 老脚本的 DOM 与状态结构过重, 与当前 TypeScript 分层不匹配。
- `getRangeCenterID()` 适合旧范围技/脚本大系统, 当前只保留"按排序挑目标"的思想。
- Sleep 不作为默认高压策略, 因为本项目目标是高防单手盾战, 需要保留反击和 OC。

### 2.3 设计前源码事实

- 本节记录设计时的源码起点;当前实现状态见 §16。
- `brain.ts` 已有 P0-P16 线性优先级, 且 `target-weight.ts` 已接入 P16 杂兵平砍。
- `reader.ts` 当前仍把 Mystic Gem 当成 HP/MP/SP 的兜底恢复宝石: `pickGem(own) ? own : GEM.mystic`。
- `tables.ts` 当前缺 `ShadowVeil=413`, 缺 `Slow=221`、`Blind=231`、`Silence=232`, `BUFF_IMG` 也没有 `shadowVeil`。
- `CHANNEL_Q` 当前只覆盖 Spark、Spirit Shield、Protection、红怪 Imperil、Heartseeker, 没有 Shadow Veil 和高压 Weaken/Silence。
- P11 回 SP 目前要求 `S.stanceOn`, 但高塔里 Spirit Shield/Spark 本身也需要 SP 储备。
- P15 非红 OC 技仍用 `S.enemies.find(...)`, 没有消费 `rankTargets()` 的排序。
- P15 `saveOcForCannon` 会因 `monsterTotal >= CANNON_MIN_ENEMIES` 在清到剩少数怪时继续跨波攒炮, 但最终波没有下一波。
- `loop.ts` 当前在 `a.type === 'cannon'` 决策阶段就把 `cannonCd` 置为 50, 但真正 `Exec.cannon()` 是延迟执行; 若按钮变灰、页面卡住或执行返回 false, 会误盖 50 回合冷却。
- `reader.ts` 的 `_spawnHp()` 已按 GF 实测"战斗日志顶新底旧"处理, 但 `_round()` / `_enemyMagic()` 仍取最后一个匹配, textlog 最新行读取口径不统一。
- `autobattle/scripts/drive-brain.mts` 的慈悲样本仍写"残血+流血+慈悲开", 但当前策略已把 Merciful Blow 限定红名, 样本命名与预期落后。
- `docs/superpowers/plans/2026-06-05-autobattle-remaining-tasks.md` 仍包含已完成或已关闭的阻塞项, 如 castHostileOn、XHR 解析、`_expire` 读取。
- `autobattle/docs/battle-mechanics.md` 还记录 Mystic Gem "回三样"的旧结论, 需要同步修正。

## 3. 非目标

- 不做 M3/M4/M5 连刷后勤、库存采购、修装、通知等大功能。
- 不做小马图识别。
- 不预测敌方 MP/SP 精确值, 只用已读状态、最近伤害、SP/HP 走势做压力判断。
- 不把所有动作改成通用规则引擎; 本轮保持现有 `Brain.decide()` 可读的优先级结构, 只抽出必要 helper。
- 不默认启用 Sleep。Sleep 可作为将来手动高危开关, 但本轮只预留类型与状态识别, 不进默认自动策略。

## 4. C-layered 架构

继续沿用现有三层代码边界:

```text
reader.ts     -> 只读 DOM 和缓存, 输出 BattleState
tables.ts     -> 技能/物品/buff/debuff/status 常量
brain.ts      -> 消费 BattleState, 按策略层输出一个 Action
target-weight -> 纯函数排序, 不碰 DOM/config/store
executor.ts   -> 执行动作, 不做策略
```

进入 C-layered 主体前先做 P0 前置清理, 让现有战斗循环和回归样本稳定, 避免把旧问题带进 Mystic/Shadow Veil/Silence 改造:

1. 小马炮冷却只在 `Exec.cannon()` 实际执行成功后落点, 决策阶段不预写 `cannonCd`。
2. `reader.ts` 提供统一的"取最新 textlog 匹配" helper, 默认按 GF 实测顶新底旧取第一条; `_round()` / `_enemyMagic()` / `_spawnHp()` 共享该口径。
3. `drive-brain` 更新慈悲红名样本, 并新增最终波/炮执行成功类场景的离线覆盖。
4. `remaining-tasks` 同步最新事实, 把已完成项从"阻塞"降为已验证/观察项。

P0 完成后, `Brain.decide()` 内部按 C-layered 重新组织为 6 层, 每层仍是确定性短路:

1. `L0 Interrupt`: 小马图、胜利继续、无法战斗等即时中断。
2. `L1 Lethal Survival`: Spark 零空窗、预测急救、治疗/体力药降级。
3. `L2 Resource Catalyst`: Mystic Gem/Channeling/MP fuse/SP reserve, 专门处理"先触发资源窗口再施法"。
4. `L3 Sustained Defense`: Protection、Spirit Shield、Shadow Veil、Absorb、Haste、Regen。
5. `L4 Pressure Control`: 高压 Weaken/Silence/Imperil/可选 Blind/Slow, 用目标选择器逐只铺。
6. `L5 Damage and Budget`: 小马炮、架式、OC 技、平砍目标。

这样做的边界很清楚: 前层负责活下来和资源窗口, 中层负责减压, 后层才花 OC/平砍输出。实现上可以先用 helper 函数拆分, 不强迫一次性把 `decide()` 拆成多个类。

## 5. 数据层设计

### 5.1 Mystic Gem

`BattleState.gems` 改为:

```ts
gems: { hp: number; mp: number; sp: number; mystic: number }
```

`reader.ts` 的宝石选择改为:

- `hp/mp/sp` 只返回对应专用宝石 id, 没有就为 0。
- `mystic` 单独返回 `GEM.mystic` 是否可用。
- 删除 Mystic 作为恢复兜底的 `pickGem()` 语义。

对应策略:

- HP/MP/SP 低线只使用专用宝石、药水/长效药/秘药。
- Mystic 只由 L2 消费, 目标是制造 Channeling 窗口, 不再当回三样急救。
- 文档 `battle-mechanics.md` 同步改成 "Mystic Gem -> Channeling"。

### 5.2 Shadow Veil

新增常量:

```ts
SK.ShadowVeil = 413
BUFF_IMG.shadowVeil = 'shadowveil'
BuffMap.shadowVeil: BuffState
```

维护原则:

- 常规 GF/arena 低压不主动维护 Shadow Veil, 以免减少反击和 OC。
- 高压模式或用户显式开关开启时, Shadow Veil 作为 L3 防御套的一部分, 优先级低于 Spark/Spirit Shield/Protection, 高于输出 buff。
- Channeling 窗口可用时, Shadow Veil 可以进入队列, 因为它成本高且持续较短。

### 5.3 减益技能表

`SK` 增加:

```ts
Slow: 221
Sleep: 222
Blind: 231
Silence: 232
```

保留 `STATUS_LIB` 的现有 13 状态读取。新增两个表, 避免把红怪破防和高压控制混在一个 `DEBUFFS` 里:

```ts
RED_DEBUFFS: Weaken -> Imperil
CONTROL_DEBUFFS: Weaken -> Silence -> optional Blind/Slow
```

说明:

- `Weaken` 是基线控制, 对红怪和高压多怪都可用。
- `Silence` 是高压核心控制, 在 SP 压力或塔楼高层场景才铺。
- `Imperil` 是击杀加速, 放在基础控制之后, 优先对红怪/Yggdrasil/高 HP 目标。
- `Blind`、`Slow` 默认不开, 作为二级控制开关保留。
- `Sleep` 本轮不进默认自动链, 只保留 id/status, 方便之后人工高危模式扩展。

## 6. 压力判定

新增一个纯 helper:

```ts
type PressureLevel = 'low' | 'medium' | 'high'
function assessPressure(S: BattleState, C: Config, memory: BrainMemory): Pressure
```

压力信号:

- `S.battleType === '塔楼'` 提升基础压力。
- `S.alive >= C.CONTROL_MIN_ENEMIES` 或存在红怪/Yggdrasil。
- `sp / maxSp < SP_RESERVE_RATIO`, 或连续数次 SP 下降。
- `S.lastDmg > 0.3 * maxHp`, 或 Spark 近期触发记录。
- `hp < STRUGGLE_HP * maxHp` 的既有 `lowHpStreak`。

压力等级用途:

- `low`: 维持现有节奏, 不额外铺 Silence/Shadow Veil。
- `medium`: 可补 Shadow Veil, 对红怪/高价值目标补 Weaken/Imperil。
- `high`: 进入高压控制, 先铺 Weaken, 再在 SP 压力下铺 Silence, 暂停非必要 OC 消耗和跨波攒炮。

本轮不读取塔楼楼层数字。攻略中的 50/60/80/90 层建议只转化为"压力和 SP 走势"规则, 避免依赖当前 DOM 尚未确认的楼层文本。

## 7. Channeling 与 Mystic 使用

L2 的核心问题是: Channeling 不是"有了就随便用", Mystic 也不是"缺资源就吃"。它们应服务下一发高价值法术。

### 7.1 Channeling 队列

推荐顺序:

1. Spark, 当未激活或即将断档。
2. Spirit Shield, 当未激活或即将断档。
3. Protection, 当未激活或即将断档。
4. Shadow Veil, 仅高压/开关允许且即将断档。
5. Weaken/Silence/Imperil, 仅高压控制或红怪高价值目标。
6. Heartseeker, 长战斗或红怪存在。
7. Regen/Haste, 作为低风险补充。

理由:

- Channeling 对妨害魔法有命中价值, 高干扰盾战尤其应该把它留给 Silence/Imperil 这种关键控制。
- Heartseeker 很贵, 但不应抢在 Spark/双墙/高压控制之前。
- Haste/Regen 重要, 但在资源窗口里不是最稀缺动作。

### 7.2 Mystic 触发条件

`S.gems.mystic` 可用且当前没有 Channeling 时, 只有满足以下之一才吃:

- Spark/Spirit Shield/Protection 即将断档且 MP 不足或希望延长持续。
- 高压模式下存在关键 Weaken/Silence/Imperil 目标, 且普通施法命中/MP 风险高。
- Heartseeker/Shadow Veil 在长战斗中缺失, 且生存层已经安全。

不吃 Mystic 的情况:

- 只是 HP/MP/SP 低, 但没有下一发高价值法术。
- 低压小怪快清完。
- 小马图或胜利继续等 L0 中断场景。

实现上 Mystic 使用后仍只返回一个 `Action`, 等下一 tick 读到 `channeling=true` 后再走 Channeling 队列。这样最稳, 不需要在同一 tick 连点两次。

## 8. 高压控制策略

### 8.1 目标集合

高压控制不等于"所有怪全套 debuff"。目标集合按压力裁剪:

- `high`: 所有活怪先补 Weaken; SP 仍压或塔楼高压时补 Silence。
- `medium`: 红怪、Yggdrasil、高 HP 或高权重目标优先补 Weaken/Silence。
- `low`: 只走现有红怪 Weaken/Imperil, 不铺全场。

目标排序复用 `rankTargets()`:

- 非红控制目标从 ranked 活怪里挑缺状态者。
- 红怪控制目标走 `selectRedTarget()`, 不只取第一个 live red。
- Yggdrasil 无论红/非红都提升优先级。

### 8.2 顺序

高压控制顺序:

```text
所有目标 Weaken 缺口 -> SP 压力下 Silence 缺口 -> 高价值目标 Imperil -> 可选 Blind/Slow
```

细节:

- Weaken 是减伤底座, 比 Imperil 更符合 survival-first。
- Silence 只有在压力达到阈值时铺, 因为低压刷场铺满会浪费回合。
- Imperil 只对准备击杀的目标优先, 不做全场默认铺满。
- Blind/Slow 有开关, 默认关闭; 它们用于"仍扛不住但不想上 Sleep"的二级减压。
- Sleep 不自动进入链路。若未来加入, 也必须作为明确高危模式, 且需要避免攻击睡眠目标导致控制失效。

## 9. SP 策略

现状 `sp < SP_LOW && S.stanceOn` 才补 SP, 对高塔不够。新策略:

- 增加 `SP_RESERVE_RATIO`, 默认建议 0.45。
- 当 `sp < SP_RESERVE_RATIO * maxSp` 且 Spirit Shield 激活/高压模式/最近 SP 下降时, 即使架式没开也允许补 SP。
- 当 `sp < SP_LOW * maxSp` 时, 暂停非必要输出 buff、Shadow Veil 之外的可选减益、架式开启和 OC 技。
- 专用 Spirit Gem 优先, 其次 Spirit Draught/Elixir; Mystic 不作为 SP 恢复兜底。
- 如果 Spark 未激活且 SP 太低, 生存层应优先治疗/防御, 不用错误的 Mystic 试图救 SP。

日志需补充 SP 决策原因:

- `SP:预留不足`
- `SP:SpiritShield风险`
- `SP:高压连续下降`

## 10. OC 与小马炮策略

### 10.1 最终波

现有 `highDensity = S.monsterTotal >= C.CANNON_MIN_ENEMIES` 会导致清到剩 2-3 怪时继续为下一波攒炮。新规则加入:

```ts
const hasFutureRound = S.roundAll === 0 || S.roundNow < S.roundAll;
```

- 有下一波: 可以保留现有跨波攒炮。
- 最终波: 不为不存在的下一波保存 OC; 如果当前怪数不足放炮, OC 可转为红怪连招、要害秒杂兵、盾击减压。
- 如果 round 读不到, 保守按有下一波处理, 避免误花 OC。

### 10.2 OC 技预算

新增 helper:

```ts
function shouldSaveOcForCannon(S, C, pressure): boolean
function selectOcSkillTarget(S, C, ranked, pressure): EnemyState | null
```

原则:

- 高压、低 HP streak、低 SP reserve 时, 放弃攒炮, 用 OC 技减压。
- 炮冷却中不攒炮。
- 最终波不跨波攒炮。
- 红怪连招仍优先: 慈悲 -> 要害 -> 盾击。
- 非红要害/盾击目标改用 ranked 结果:
  - 要害选 ranked 中已晕且非红的最优目标。
  - 盾击选 ranked 中未晕且非红的最优目标。

### 10.3 架式

保留当前 charging 滞回修复。新增约束:

- SP reserve 低或高压 SP 连降时, 不主动开架式。
- 最终波如果不攒炮, 架式按常规输出/生存滞回处理。
- Shadow Veil 与架式存在取舍: 高压开 Shadow Veil 保命; 低压不维护 Shadow Veil, 让反击/OC 更顺。

## 11. 多红怪目标选择

新增:

```ts
function selectRedTarget(S: BattleState, need?: 'control' | 'damage' | 'execute'): EnemyState | null
```

排序层级:

1. Yggdrasil 红怪。
2. 当前动作需要的状态缺口, 如 control 需要缺 Weaken/Silence 的红怪。
3. 可处决或连招窗口, 如 `hpPct < 25 && bleeding`。
4. 既有 `lockedRedId` 且仍存活, 防止每回合乱跳。
5. `rankTargets()` 中权重最低的红怪。
6. eid 最低的红怪作为兜底。

这个选择器替换 `lockTarget()` 内部策略, 但保留 `lockedRedId`。只有更高层级目标出现时才切锁, 例如 Yggdrasil 或处决窗口。

## 12. 配置与 UI

新增配置建议:

```ts
useShadowVeil: true
shadowVeilPressureOnly: true
usePressureControl: true
CONTROL_MIN_ENEMIES: 4
SP_RESERVE_RATIO: 0.45
useSilence: true
useBlind: false
useSlow: false
useSleep: false
```

面板最小改动:

- 战斗页新增一组 "高压/塔楼":
  - 高压控制
  - 沉默
  - 影纱
  - SP 预留
- Blind/Slow/Sleep 暂不进主面板, 可先只在 config 中保留, 避免 UI 太拥挤。

日志新增:

- 当前压力: `压:low|medium|high`
- 控制原因: `控:全体虚弱`, `控:SP压沉默`, `控:红怪陷危`
- 资源原因: `Mystic:开Channeling`, `SP:预留不足`
- OC 原因: `OC:最终波不攒`, `OC:高压减压`

## 13. 测试与验证

### 13.0 P0 前置清理回归

前置清理必须先红后绿验证:

- `drive-loop.mts` 或等价脚本覆盖 cannon 冷却落点:
  - `Action(type='cannon')` 但执行函数返回 `false` 时, `cannonCd` 不得变成 50。
  - 执行函数返回 `true` 时, 才写入 `CANNON_CD_TURNS`。
- `drive-reader.mts` 或等价脚本覆盖 textlog 最新行:
  - 两条伤害日志同在时, 顶部最新魔法伤害应让 `tookMagicDmg=true`, 底部旧物理伤害不应覆盖它。
  - 两条 Round 行同在时, 顶部最新 round 应覆盖底部旧 round。
- `drive-brain.mts` 更新样本:
  - 非红残血+流血不触发慈悲。
  - 红名残血+流血触发慈悲。
  - 最终波/炮冷却相关样本要与当前策略名一致。

### 13.1 纯函数/脚本回归

优先给 helper 做可离线验证:

- `assessPressure()`:
  - 低压竞技场
  - 塔楼多怪
  - SP 连续下降
  - 红怪/高伤害
- `selectControlDebuff()`:
  - all Weaken first
  - SP 压力后 Silence
  - Imperil 只对高价值目标
  - Sleep 默认不返回
- `selectRedTarget()`:
  - Yggdrasil 优先
  - 状态缺口优先
  - 锁定防抖
  - 处决窗口切换
- `shouldSaveOcForCannon()`:
  - 有下一波攒炮
  - 最终波不攒
  - 炮冷却不攒
  - 高压不攒

扩展 `autobattle/scripts/drive-brain.mts` 场景:

- Mystic 可用且 Spark/SS 即将断档 -> 先吃 Mystic, 下一 tick 用 Channeling 补。
- Mystic 可用但只是缺 MP -> 不吃 Mystic, 走 MP 药链。
- 高压多怪 -> Weaken 缺口优先。
- 高压 SP 下降 -> Silence 缺口优先。
- 最终波剩 2 怪且 OC 150 -> 不再为炮保留 OC。
- 已晕杂兵多个 -> 要害按 ranked 选。

### 13.2 构建与诊断

实现后验证顺序:

```bash
cd autobattle && npx tsx scripts/drive-loop.mts
cd autobattle && npx tsx scripts/drive-reader.mts
cd autobattle && npx tsx scripts/drive-brain.mts
cd autobattle && npm run typecheck
cd autobattle && npm run build
```

如修改 TypeScript 源码, 结束前按项目规则对本次改动文件跑 `vscode_mcp_server` diagnostics; 若 MCP 不可用, 最终回复说明跳过原因。

### 13.3 真机观察

需要在实际战斗日志里确认:

- Mystic Gem 使用后 `channeling` buff 是否稳定被 reader 读到。
- Shadow Veil 图标关键字是否为 `shadowveil`, 剩余回合读取是否与其他 buff 一致。
- Silence/Blind/Slow 的技能 id 与 opacity 冷却判断是否正确。
- 高压控制不会在低压 GF/arena 明显拖慢。
- 最终波 OC 不攒炮后, 红怪/杂兵减压动作符合日志预期。

## 14. 实施边界

建议分 5 个提交或至少 5 个实施 checkpoint:

1. P0 前置清理: cannon 冷却落点、textlog 最新行统一、drive-brain 样本、remaining-tasks 同步。
2. 数据层与文档修正: Mystic split、Shadow Veil buff、技能 id、`battle-mechanics.md`。
3. 纯 helper: pressure、control debuff selector、red target selector、OC budget。
4. `brain.ts` 接入: L2/L3/L4/L5 按 helper 消费, 保留现有优先级短路。
5. UI/log/drive-brain 回归与构建验证。

每个 checkpoint 都应保持脚本可构建。`dist/hv-autobattle.user.js` 只在最终 build 时更新, 避免手改生成物。

## 15. 风险与降级

| 风险 | 等级 | 降级 |
|---|---|---|
| Mystic 语义改正后, 旧逻辑少了一个"假恢复兜底" | 中 | 专用宝石与药链补齐; 生存层不依赖 Mystic |
| Shadow Veil 降低敌方命中, 同时减少反击/OC | 中 | 仅高压/开关维护, 低压不铺 |
| 高压控制拖慢日常刷场 | 中 | `usePressureControl` 和压力判定双门控 |
| Silence 命中受重甲干扰影响 | 中 | Channeling 优先喂关键 Silence; 失败时不死循环, 继续按压力重试/降级 |
| 多红怪切目标抖动 | 中 | 保留 `lockedRedId`, 只有更高层级目标才切锁 |
| 最终波 round 读取失败 | 低 | 读不到 round 时按有下一波处理, 保守不乱花 OC |
| cannon 执行失败误盖冷却 | 中 | P0 改为执行成功后才落 `cannonCd`; 脚本回归覆盖 false/true |
| textlog 新旧顺序被不同 reader 方法各自解释 | 中 | P0 统一 reader helper; 顶新底旧作为当前 GF 实测默认 |

## 16. 实现状态

- P0 前置清理完成:cannon 冷却落点、textlog 最新行 helper、drive-brain 样本、remaining-tasks 同步。
- 数据层完成:Mystic 独立字段、Shadow Veil buff/技能、Silence/Blind/Slow/Sleep id/config。
- 策略层完成:`strategy.ts` 提供 pressure、control debuff、red target、cannon OC budget helper。
- brain 接入完成:Mystic 触发 Channeling、Shadow Veil 高压维护、Weaken/Silence 压力控制、SP reserve、最终波不攒炮、非红 OC 技按 ranked 选目标。
- 回归完成:`drive-c-layered.mts` 覆盖 Mystic/影纱/沉默/最终波OC/SP预留;`drive-brain.mts` 补可读样本。
- 剩余风险:真机确认 Mystic 后 Channeling 读取、Shadow Veil 图标、Silence 置灰/命中、低压拖慢和最终波 OC 日志。

## 17. Review 结论

这份设计聚焦在 M2 战斗决策, 不扩散到连刷后勤。核心改造点都有明确数据来源和降级路径。当前实现已完成主体闭环, 下一步以真机日志观察和阈值微调为主, 再进入 M3 连刷。
