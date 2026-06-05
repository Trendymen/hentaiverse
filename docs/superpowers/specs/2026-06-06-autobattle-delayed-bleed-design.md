# autobattle 要害延迟喂流血设计 — 独立模块 BleedTimer

> 日期: 2026-06-06 · 状态: 设计已确认, 待写实现计划
> 关联: docs/superpowers/specs/2026-06-05-autobattle-target-weight-design.md (独立模块+配套类型+config 装配范本)

## 1. 背景与目标

**现状**: 红名/boss 击杀连招 = 盾击晕 → 要害强击(产 5 道流血 DoT) → 慈悲处决(`hpPct<25 && bleeding`)。要害的触发条件**完全不看血量**:
- `brain.ts` 破例线(约 L232): `execRed.stunned && !execRed.bleeding && oc>=50`
- `brain.ts` 连招线(约 L245): `S.stanceOn && tgtSp.stunned && oc>=50`

红名一被盾击晕(血量可能还 70-80%)就立刻喂要害流血。但流血只持续约 5 回合,红名(尤其血厚 boss)从高血量磨到 <25% 要很多回合,**流血早过期**; 等真到 <25% 该接慈悲斩杀(需 `bleeding`)时前置条件不满足 → 斩杀放不出,或被迫重喂要害再耗 50 OC。

**目标**: 把要害**延迟到红名/boss 血量接近 25% 才喂**,让 5 道 DoT 刚好覆盖斩杀窗口。

## 2. 用户已锁定的决策

| # | 决策 | 取值 |
|---|---|---|
| ① | 判定方式 | **掉血速率预测**(非纯血量窗口) |
| ② | 流血持续回合 B | **5**(可配) |
| ③ | 速率 r 算法 | 最近 2-3 回合**移动平均**, **只采集"上回合主动攻击了这只红名"的掉血样本**(盾反/AOE/流血 DoT 等被动掉血不计入) |
| ④ | 无主动速率样本时的兜底 | **保守血量窗口**: 红名 `hpPct ≤ N%`(默认 30) 就插要害(被动掉到窗口也插) |
| ⑤ | 杂兵减压线 | 保持原样不动(杂兵要害为降围殴,不为铺斩杀) |
| ⑥ | 慈悲斩杀逻辑 | 不变(`hpPct<25 && bleeding`),只改"要害何时喂" |
| 架构 | 实现落地 | 独立模块 `BleedTimer` class(范本 = `target-weight.ts`) |

**判定公式**: 设当前血量 `hp%`、每回合主动掉血速率 `r`(%/回合)、流血持续 `B=5`、安全余量 `safety=1`。预计到 25% 还需 `T = ceil((hp-25)/r)`。**当 `T ≤ B - safety`(即 T≤4) 时才喂要害**。

## 3. 架构(独立有状态模块, 单向数据流)

```
reader → BattleState(含 EnemyState[]) → brain.decide
                                          ├─ ① bleedTimer.observe(红名快照)        采样/清理(有状态)
                                          ├─ ② bleedTimer.shouldFeed(red, cfg)     判定时机(读状态)
                                          └─ ③ bleedTimer.noteActiveAttack(eid)    登记归因(写状态)
```

**新增/改动文件**
- **新建** `autobattle/src/battle/bleed-timing.ts`(~130-160 行): `BleedTimer` class。零 DOM、零 config 单例、零 Store(输入即依赖,与 `target-weight.ts` 同纪律),唯一区别是它**有跨回合状态**(Map)。
- `autobattle/src/types.ts`: 新增 `BleedFeedInput`(EnemyState 子集)、`BleedTimerConfig`(brain 装配传入),对应现有 `WeightInput` / `WeightConfig`。
- `autobattle/src/battle/brain.ts`: 新增私有成员 `bleedTimer` + 装配函数 `bleedCfg(C)`(仿 `weightCfg`) + 私有 helper `hitRed`; decide 接入 observe; 改两处要害分支; 6 处主动攻击红名 return 埋点。
- `autobattle/src/core/config.ts`: `DEFAULT_CONFIG` 新增 7 键; `CONFIG_VERSION` 3→4(仅 bump)。

**职责切分**: `BleedTimer` 只回答"血量/速率时机到没到"和"采样掉血速率",**不碰** DOM、config 单例、技能释放、目标选择。`stunned` / `!bleeding` / `oc>=50` / `skillReady` 仍由 brain 两处要害分支的外层守卫把关。

## 4. 数据流时序与归因机制

**每回合 decide 内三个触点**(`ranked` 计算之后):
```
decide(S) {
  ① bleedTimer.observe( S.enemies.filter(e => e.is_red_boss) )   // 决策前: 兑现上回合样本 + cleanup 死红名 + 更新血量基线
  ...
  ② ... && (!C.useDelayedBleed || bleedTimer.shouldFeed(red, bleedCfg(C))) && ...   // 要害分支: 血量时机门
  ③ return this.hitRed(red.eid, {...})   // hitRed 内部 noteActiveAttack(eid) 后返回 action
}
```

**归因核心: 上回合登记、下回合兑现**(本方案最关键、最易错的机制)
- 回合 N: 决策若是"主动攻击红名 X", return 前 `noteActiveAttack(X)` → 内部 `pendingActiveEid = X`。
- 回合 N+1: 开头 `observe()` 看红名 X 这回合掉了多少血(`上回合记录的 hpPct - 当前 hpPct`)。**只有 `pendingActiveEid === X` 且掉血 > 0** 才把掉幅计入 X 的速率样本窗口。

这样自然得到两个正确行为:
1. **被动掉血回合**(在打杂兵、红名靠盾反/AOE/DoT 掉血)没有登记 → 不入样本,速率只反映"我主动打红名"的真实输出。
2. 这一招 **miss / 被格挡 / 网络没放出去**(血没掉)→ 不入样本,对"到底放没放出去"天然鲁棒,不需要 Brain 通知执行结果。

**为何跨一回合**: HV 异步往返,Brain 决策那一刻怪还没掉血,掉血在下一次 `reader.read` 才反映。所以归因必须"登记意图 → 下回合按 hpPct 真降兑现"。这与 `reader.prev` / `mercifulTry` 的跨回合范式同构。

## 5. 判定算法 shouldFeed

**BleedTimer 内部状态**
```ts
interface RedSample {
  lastHpPct: number;       // 上次 observe 记录的血量基线(算单回合掉幅用)
  activeDeltas: number[];  // 主动攻击掉血样本窗口(每个 = 一次主动攻击回合的 hpPct 降幅; 上限 8)
}
private reds = new Map<number, RedSample>();    // eid → 样本(多红名各自独立桶)
private pendingActiveEid: number | null = null; // 上回合主动攻击登记的红名 eid
```

**shouldFeed 伪代码**(只看血量/速率时机, stunned/oc 由 brain 外层守卫)
```
shouldFeed(execRed, cfg):
  if not cfg.enabled:  return true            // 退回旧行为(brain 的 stunned&&!bleeding 守门)
  hp = execRed.hpPct                          // 全程 hpPct(0-100), 不用 hpNow
  if hp <= 25:         return true            // ① 已破斩杀线还没流血 → 立刻喂(别错过)
  samples = reds.get(execRed.eid)?.activeDeltas ?? []
  if samples.length >= cfg.minSamples:        // 有主动速率样本 → 速率预测主路
     r = avg( samples.slice(-cfg.rateWindow) )
     if r > cfg.minRate:
        T = ceil((hp - 25) / r)               // 还需几回合到 25%
        if T <= 0:     return true            // ② 单击跨窗(r 极大)→ 立刻喂
        return T <= cfg.bleedTurns - cfg.safety   // ③ T≤4 才喂
     // r 太小/负 → 落兜底
  return hp <= cfg.fallbackHpPct              // ④ 兜底血量窗口(缠杂兵/被动掉血场景)
```

**边界逐条**
- **样本不足**(刚锁红名、样本=0)→ 走兜底窗口 30%,已比旧"一晕就喂"保守得多。
- **r 太小或负**(被动掉血、被治疗回血、血条读数抖动)→ 走兜底窗口,绝不会算出超大 T 卡死。
- **单击跨窗**(要害本身把怪从 28%→20%)→ `T≤0` 立刻喂,喂完即 <25%+流血,下回合直接慈悲。
- **血厚 boss 单回合掉幅 <1%**(hpPct 整数粒度读成 0)→ 被 `drop>0` 过滤 → 样本攒得慢 → 落兜底 30%(可接受的保守,兜底接住)。
- **量纲统一**: 速率、T、斩杀线 25、兜底窗口全用 `hpPct`(0-100); **不用 `hpNow`** —— 它在 `initHp` 缺失时退化为 hpPct(reader.ts:184),量纲会在同一只怪生命周期内漂移。

## 6. Config 新增参数

开关用 camelCase、常量用大写下划线(贴现有 config 风格):

| 键 | 默认 | 含义 |
|---|---|---|
| `useDelayedBleed` | `true` | 延迟逻辑开关。**默认开**(用户要的就是新行为); 想灰度对比可设 `false` 一键退回旧"一晕就喂" |
| `BLEED_DURATION` | `5` | 流血持续回合 B |
| `BLEED_SAFETY` | `1` | 安全余量, 要求 `T ≤ B−safety`(=4) 才喂, 留 1 回合冗余防 DoT 先过期 |
| `BLEED_FALLBACK_HP` | `30` | 无主动速率样本 / 速率太小时的兜底血量窗口(hpPct ≤ 此值就喂) |
| `BLEED_RATE_WINDOW` | `3` | 速率移动平均窗口(最近 2-3 个主动样本) |
| `BLEED_MIN_SAMPLES` | `1` | 走速率主路最少样本数, 不足走兜底 |
| `BLEED_MIN_RATE` | `1` | 速率有效下限(%/回合), ≤ 此值视为无效走兜底 |

**装配函数**(brain.ts, 仿 weightCfg):
```ts
function bleedCfg(C: Config): BleedTimerConfig {
  return {
    enabled: C.useDelayedBleed, bleedTurns: C.BLEED_DURATION, safety: C.BLEED_SAFETY,
    fallbackHpPct: C.BLEED_FALLBACK_HP, rateWindow: C.BLEED_RATE_WINDOW,
    minSamples: C.BLEED_MIN_SAMPLES, minRate: C.BLEED_MIN_RATE,
  };
}
```

`CONFIG_VERSION` 3→4: 新键在 `{...DEFAULT_CONFIG, ...旧存档}` 合并时旧存档无 → 自动取默认,仅 bump 版本号即可(无需在迁移块逐键强刷)。

## 7. 配套 TS 类型(types.ts, 参考 WeightInput/WeightConfig)

```ts
/** BleedTimer 喂入/判定输入(EnemyState 结构子集; EnemyState 鸭子类型可直接传) */
export interface BleedFeedInput {
  eid: number;
  is_red_boss: boolean;
  hpPct: number;
  bleeding: boolean;
  stunned: boolean;
}

/** BleedTimer 配置(brain 从 config 装配传入; 模块本身不碰单例) */
export interface BleedTimerConfig {
  enabled: boolean;       // 延迟逻辑总开关; false = shouldFeed 恒 true(退回旧"一晕就喂")
  bleedTurns: number;     // B: 流血持续回合数(默认 5)
  safety: number;         // 安全余量(默认 1)
  fallbackHpPct: number;  // 无主动样本时的保守血量窗口(默认 30)
  rateWindow: number;     // 速率移动平均窗口(默认 3)
  minSamples: number;     // 走速率主路最少样本数(默认 1)
  minRate: number;        // 速率有效下限 %/回合(默认 1)
}
```

## 8. brain 集成细节

### 8.1 两处要害分支改写(只加"血量时机门"+ 归因埋点, 外层守卫不动)

破例线(约 brain.ts L232):
```ts
if (C.useVitalStrike && execRed.stunned && !execRed.bleeding && oc >= 50
    && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(execRed, bleedCfg(C)))
    && Exec.skillReady(SK_SPECIAL.vitalStrike))
  return this.hitRed(execRed.eid, { type:'spell', id:SK_SPECIAL.vitalStrike,
    note:`要害收割红名#${execRed.eid}(${execRed.hpPct}%·延迟喂流血·破攒炮)`,
    exec:()=>Exec.castHostileOn(SK_SPECIAL.vitalStrike, execRed.eid) });
```

连招线(约 brain.ts L245)同样加门, 并**补一个 `!tgtSp.bleeding`**:
```ts
if (C.useVitalStrike && S.stanceOn && tgtSp.stunned && !tgtSp.bleeding && oc >= 50
    && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C)))
    && Exec.skillReady(SK_SPECIAL.vitalStrike))
  return this.hitRed(tgtSp.eid, {...});
```
> **补 `!tgtSp.bleeding` 的理由**: 原连招线缺这个守卫。延迟逻辑下喂完流血后红名若仍 >25% 且还晕着,会重复喂要害浪费 50 OC。补 `!bleeding` 与破例线统一,是本方案的必要配套。

`hitRed` 是 Brain 私有 helper, 不改 if 结构:
```ts
private hitRed<A extends Action>(eid: number, a: A): A {
  this.bleedTimer.noteActiveAttack(eid);
  return a;
}
```

### 8.2 noteActiveAttack 埋点清单(哪些 return 算"主动攻击红名")

| 埋(真造成主动掉血) | 不埋(会污染样本 / 被动) |
|---|---|
| 破例线 慈悲(L229) / 要害(L233) | P13 红怪减益 `castOnRed`(L208) —— 减益不掉血,计入会拉低 r → 永不喂 |
| 连招 慈悲(L242) / 要害(L246) / 盾击(L249) | 放炮 AOE(被动削红名) |
| 仅剩红怪平砍(L276/L288) | 杂兵线、防御、治疗、补 buff |

共 **6 个埋点**。漏埋只会让样本偏少 → 偏保守走兜底,不会崩。

### 8.3 状态清理(全在 observe 内自动, 无需 battle 钩子)

```
observe(reds):                          // reds = 当前所有活红名快照
  aliveEids = set(reds.map(e => e.eid))
  for eid in this.reds.keys():
     if eid 不在 aliveEids → this.reds.delete(eid)    // 死亡/切场 → 删样本(防 Map 泄漏 + eid 复用串味)
  for red in reds:
     rec = this.reds.get(red.eid) ?? { lastHpPct: red.hpPct, activeDeltas: [] }
     if pendingActiveEid == red.eid:                   // 上回合主动打了它
        drop = rec.lastHpPct - red.hpPct
        if drop > 0:
           rec.activeDeltas.push(drop)
           if rec.activeDeltas.length > 8: rec.activeDeltas.shift()   // 固定上限 8
     rec.lastHpPct = red.hpPct
     this.reds.set(red.eid, rec)
  this.pendingActiveEid = null
```
- **多红名**: 各自独立 Map 桶, 互不串。`pendingActiveEid` 单值(一回合只主动打一只), 只给被打的那只记样本, 其余红名本回合掉血算被动不入样本。
- **eid 复用**(跨波 reader `(order+1)%10` 回绕): 死红名当回合就被 cleanup 删除, 新波同 eid 不继承旧样本。
- **跨 reload**: Brain 单例随进程销毁重建, Map 自动清空(流血速率是局部战术量, 跨 reload 无意义)。

## 9. 副作用对策

- **晕眩过期**: 连招盾击分支(`!stunned`)会在脱晕后重新补晕, 延迟期红名被周期性重晕, 到点喂要害时大概率仍晕。攒炮期/破例线不补晕(省 25 OC)靠反击概率晕 —— 偶发脱晕则该回合不喂、等下次晕, 是可接受的概率延迟。
- **OC 竞争**: 要害分支本有 `oc>=50` 守卫; 不足则本回合不喂、下回合再判, 红名已晕盾击不重复、平砍继续磨血+采样, 不卡死。慈悲线 `oc>=100` 同理。
- **主动/被动掉血混在一个 diff**: 同回合既有主动攻击又有流血 DoT 时, 单个 hpPct diff 无法完全切分 → 偏向**偏早喂**(最多浪费一次要害; 漏喂才致命, 直接斩杀放不出), `BLEED_SAFETY` 进一步吸收偏差。
- **慈悲拉黑(世界树等免疫处决 boss)**: 慈悲被 `mercifulBlockEid` 拉黑后走平砍磨, 要害仍会在 ≤30% 兜底喂一次, 不陷死循环。

## 10. 验证方式

- **不引入 vitest**: 项目 package.json 仅 dev/build/typecheck, 引入测试 runner 是另一个工程, 超出本次范围。`BleedTimer` 设计成纯输入可测(无 DOM/config 单例耦合), 未来若加 runner 可直接喂 `observe`/`noteActiveAttack` 序列断言。
- **本次验证**:
  1. `npm run typecheck` 通过 + vscode-mcp-server diagnostics 清洁(改动文件)。
  2. 复用 `loop.ts` 已有的 `[HVAB:foes]` 调试日志, 追加喂血判定字段(红名 `eid/hpPct/r/T/路径(速率or兜底)/shouldFeed 结果`)。
  3. GF 真机实测肉眼核对: 要害是否在接近 25% 才喂、流血是否覆盖到斩杀、慈悲是否顺利接上。

## 11. 风险与边界

| 风险 | 等级 | 缓解 |
|---|---|---|
| 速率采样太慢(刚锁红名样本不足) | 中 | `BLEED_FALLBACK_HP=30` 兜底保证 ≤30% 必喂; `BLEED_MIN_SAMPLES=1` 一个样本即可启动速率路 |
| 晕眩延迟期过期 → 补盾击多耗 25 OC | 中 | 设计接受成本(目标优先血量到位); 调试日志可量化 |
| 被动掉血污染主动样本(同回合 DoT 混入) | 中 | 难完全分离; "偏早喂"比"漏喂"安全; safety 余量吸收 |
| hpPct 整数粒度(<1% 读成 0) | 低 | 血厚 boss 单回合主动掉血通常 >1%; 薄怪很快进兜底窗口; `BLEED_MIN_RATE=1` 与此对齐 |
| eid 复用 / 跨波 | 低 | observe cleanup 当回合删死红名样本 |
| r≤0(回血/不动) | 低 | 落兜底窗口, 不会算出负 T 乱喂 |
| `useDelayedBleed=false` | — | shouldFeed 恒 true + noteActiveAttack 仍登记但无人读 → 纯旁路, 零回归 |

## 12. 文件改动清单

| 文件 | 改什么 | 预估 |
|---|---|---|
| `autobattle/src/battle/bleed-timing.ts` | **新建**: `BleedTimer` class(observe/shouldFeed/noteActiveAttack + 内部 reds Map/pendingActiveEid) | ~130-160 行 |
| `autobattle/src/types.ts` | 新增 `BleedFeedInput` / `BleedTimerConfig` | +20 |
| `autobattle/src/battle/brain.ts` | 私有成员 `bleedTimer` + `bleedCfg(C)` + `hitRed` helper; decide 接 observe; 改两处要害分支(连招线补 `!bleeding`); 6 处埋点 | +20 / 改 ~10 |
| `autobattle/src/core/config.ts` | `DEFAULT_CONFIG` +7 键; `CONFIG_VERSION` 3→4 | +9 |
