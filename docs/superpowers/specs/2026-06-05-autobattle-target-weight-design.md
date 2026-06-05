# autobattle 目标权重系统(finWeight)设计 — 方案 C 分层模块

> 日期: 2026-06-05 · 状态: 设计已确认, 待写实现计划
> 关联: docs/superpowers/plans/2026-06-05-autobattle-remaining-tasks.md (§2.4 后续)

## 1. 背景与目标

**现状**: `brain` P16 平砍目标是 `trash.sort((a,c)=>a.eid-c.eid)[0]` —— 选最低 eid 的杂兵, 完全不看怪的血量和身上的状态。

**目标**: 忠实翻写 dodying `hvAutoAttack.user.js` 的 `finWeight` 目标权重系统, 让平砍按"血量 + 13 种怪状态 + Yggdrasil 世界树 boss"智能选目标(低血/已破防优先, 滚雪球), 适配单手盾战。

**用户已定决策**:
- ① 权重因素: 完整 = 血量 + 全 13 状态 + Yggdrasil boss
- ② 血量算法: 绝对 `hpNow`(从战斗日志解析初始 HP + 血条宽度跟踪)
- ③ 配置暴露: 内置默认 + 关键可调(总开关 + `baseHpRatio`)
- 架构: 方案 C(分层模块, reader 出原始数据 / target-weight 纯函数算权重 / brain 薄调用)

**约束**: 仅中文 UI; tsc strict; 打包不压缩可调试; 忠实翻写 dodying 但可裁掉范围技等盾战用不上的部分; 半自动红线(不做无人值守全自动, 红怪决策可控不乱跳)。

## 2. 实测发现(2026-06-05 GF 真机 chrome-devtools, `?s=Battle&ss=ar` 竞技场 5 怪)

这些发现来自真机 DOM, 修正了 dodying 蓝本中已过时/与现状不符的假设, 避免臆造。

### 2.1 现有血条 hpPct 读法是 bug(顺带修复)
`.btm4 > .btm5:nth-child(1) img` 每只怪含 **2 个 img**: `nbargreen.png`(带 `style.width`, 是血量条)+ `nbarfg.png`(前景, 无 width)。全局选出 `5 怪 × 2 = 10` 个:
```
[0]67px(怪0✓) [1]""(怪0前景) [2]113px(怪1) [3]"" [4]115px(怪2) [5]"" [6]120px(怪3满) [7]"" [8]113px(怪4) [9]""
```
现有 `reader.ts:122` 的 `bloodImgs[idx]` 直接用 idx 索引 → **错位**: 只有 0 号怪准, 怪1 拿到 `""`(NaN→兜底 100), 怪2 拿到怪1 的值… 即现有 `hpPct` 除 0 号外全错。

**正解**: per-mkey 读 `m.querySelector('.btm4 > .btm5:nth-child(1) img')`(怪元素内第一个 img = 绿条)。实测验证 5 怪血条宽度 = 67/113/115/120/113, 全对。满血 = 120px, `HP% = width/120`。

### 2.2 初始 HP 来源是 `Spawned Monster` 行(非 dodying 的 `Initializing` 行)
实测战斗日志:
```
Spawned Monster A: MID=325614 (Halo Effect) LV=398 HP=105710
Spawned Monster B: MID=153041 (Professional Ass Spanker) LV=398 HP=108572
...
Initializing arena challenge #16 (Round 13 / 30) ...
```
正则 `/Spawned Monster ([A-Z]):\s*MID=(\d+)\s*\(([^)]+)\)\s*LV=(\d+)\s*HP=(\d+)/g` 实测 5 行全解析成功。dodying 蓝本(3204-3230)用的是旧版 HV 的 `Initializing` 行格式, **与当前 HV 不符**, 必须用 `Spawned Monster` 格式。

### 2.3 字母 A-E 严格对齐 mkey / DOM idx
`Spawned Monster A` → `mkey_1`(Halo Effect), `B`→`mkey_2`, …`E`→`mkey_5`。即 `letter = String.fromCharCode(65 + idx)`, idx 为 reader `allMkey.map` 的下标。`commit_target(N)` 参数 = mkey 数字(`mkey_1`→`commit_target(1)`), 现有 `executor.attack` 正确。

### 2.4 textlog 最新在顶、最早在底
`firstRows`(顶部)是最新战斗动作, `lastRows`(底部)是 `Spawned`/`Initializing`。Spawned 行在底部, 长回合日志累积可能把它挤出 → **必须缓存初始 HP**(解析到就存, 被挤出沿用)。
> 注: textlog 似乎每"轮(round/wave)"清空重来(实测仅含当前轮的 1 个 Spawned 块, 无历史轮), 但不能依赖此假设, 仍按"缓存 + 沿用"处理。

### 2.5 13 状态可用 onmouseover 官方名匹配(比 src 更准)
`.btm6 img` 带 `onmouseover="battle.set_infopane_effect('Stunned', ...)"`, 可提取官方名。实测还混入 `windmiss.png = Turbulent Air`(不在 13 状态表) —— 关键字表里没有就自动忽略, 稳健。死怪血条为 `nbardead.png`(dodying 蓝本, 本波无死怪未直接验证, 留待实测)。

## 3. 架构(三层, 单向数据流)

```
reader.ts (StateReader) ── 只读"原始数据" ──────────────────────────
  · _spawnHp(): 解析 Spawned 行 → 缓存每怪初始 HP(按字母/idx)
  · 每怪 EnemyState: 绝对 hpNow + name + 13 状态 flags(+ 现有字段)
  · 不算 finWeight, 不排序
        │  S.enemies: EnemyState[]
        ▼
target-weight.ts ── 纯函数权重模块(新增) ──────────────────────────
  · rankTargets(enemies, weightCfg) → 按 finWeight 升序的 RankedEnemy[]
  · 无 DOM / 无 config 单例 / 无 Store, 输入即全部依赖, 可单测
        │  ranked: RankedEnemy[]
        ▼
brain.ts (Brain) ── 只"消费"排好序的目标 ──────────────────────────
  · P16: trash = ranked.filter(非红); attack(trash[0])
  · 红怪线(lockTarget/P13/P15/P16 尾部锁定)不动
```

## 4. 段 1 — 数据层 reader

### 4.1 修血条 bug(无条件生效)
`hpPct` 与新增 `hpNow` 改 per-mkey 读绿条, 弃用全局 `bloodImgs[idx]`:
```
const bImg = m.querySelector('.btm4 > .btm5:nth-child(1) img');  // 怪内第一个 = nbargreen
const bw = bImg ? parseFloat(bImg.style.width || '120') : 120;   // 满血 120px
// hpPct = isNaN(bw) ? 100 : round(bw/120*100)
```
此修复是基础数据修正, **不受 `useTargetWeight` 开关控制**(慈悲判据 `hpPct<25` 一直要准)。

### 4.2 初始 HP 解析 `_spawnHp()`
- 遍历 `#textlog` 全文, 用 §2.2 正则 matchAll 取所有 `Spawned Monster` 行。
- 建缓存 `initHp: Record<string, number>`(键 = 字母 A-E)+ 可选 `initHpName: Record<string, number>`(键 = 怪名, 兜底/校验)。
- 缓存到 `StateReader` 实例字段(类比现有 `takesMagic`/`maxHp` 缓存模式): 解析到就更新, 被挤出则沿用, 新波 Spawned 覆盖。

### 4.3 hpNow / name / 13 状态(都在 `.filter(alive)` 之前的 map 内算, 用 map idx)
- `hpNow`: `letter = String.fromCharCode(65 + idx)`; `hpNow = Math.floor(initHp[letter] * bw/120 + 1)`(翻写 dodying 3296)。死怪(`nbardead` 或 `!alive`)→ `hpNow = Infinity`(排序垫底)。
- **退化粒度(避免绝对/相对混用)**: Spawned 行一次性给本波**所有**怪的 HP, 故"全有或全无" —— 解析成功则全怪都有 `initHp`(全绝对 hpNow), 解析失败(整波 Spawned 没读到)则全波退化为 `hpPct`(全相对)。`log10(hpNow/hpMin)` 比值不变, 同一基准下排序仍正确; 绝不会出现"部分怪绝对、部分怪百分比"导致 `hpMin` 取错的情况。单怪 `HP=` 缺失(极端)用上一怪 HP 兜底(dodying 3210)。
- `name`: `m.querySelector('.btm3')?.textContent.trim()`(Yggdrasil 用 `includes('Yggdrasil')` 子串匹配抗汉化)。
- `status: Record<string, boolean>`: 用 `STATUS_LIB`(§5.1)遍历 13 key, 对怪内 `.btm6 img` 的 src 关键字 **或** `onmouseover` 官方名匹配(双保险, 类比现有 `_buffs`)。
- **保留现有 `debuff`/`penArmor`/`bleeding`/`stunned` 字段不动**(P13/P15/fingerprint 向后兼容)。

### 4.4 types 改动
`EnemyState` 新增: `hpNow: number`、`name: string`、`status: Record<string, boolean>`。

## 5. 段 2 — 权重模块 target-weight.ts(纯函数, 新增)

### 5.1 STATUS_LIB(放 tables.ts, 与 DEBUFFS 并列; 不含权重, 解耦)
| key | 中文 | src | 官方名 |
|---|---|---|---|
| We | 虚弱 | weaken | Weaken |
| Bl | 致盲 | blind | Blind |
| Slo | 缓慢 | slow | Slow |
| Si | 沉默 | silence | Silence |
| Sle | 沉眠 | sleep | Sleep |
| Im | 陷危 | imperil | Imperil |
| PA | 破甲 | wpn_ap | Penetrated Armor |
| BW | 流血 | wpn_bleed | Bleeding Wound |
| Co | 混乱 | confuse | Confuse |
| Dr | 枯竭 | drainhp | Drain |
| MN | 魔磁网 | magnet | MagNet |
| Stun | 眩晕 | wpn_stun | Stunned |
| CM | 魔力合流 | coalescemana | Coalesced Mana |

### 5.2 权重默认值(内置, reference 1063-1082 placeholder 实测值)
负 = 升优先(趁机打), 正 = 降优先(别浪费/别打扰):
```
Im 陷危 -15 · PA 破甲 -12 · BW 流血 -10 · Co 混乱 -109 · CM 魔力合流 -20   ← 负, 优先打
We 虚弱 12 · Bl 致盲 10 · Slo 缓慢 15 · Si 沉默 10 · Sle 沉眠 100 · Dr 枯竭 2 · MN 魔磁网 7 · Stun 眩晕 290  ← 正, 靠后打
baseHpRatio 1 · YggdrasilExtraWeight -1000 · unreachableWeight 1000
```

### 5.3 纯函数接口(零 DOM / 零单例)
```
WeightInput  = { eid, alive, is_red_boss, hpNow, name, status }   // EnemyState 结构子集, 鸭子类型可直接传
WeightConfig = { baseHpRatio, yggdrasilExtraWeight, unreachableWeight, statusWeight, enabled }
RankedEnemy  = WeightInput & { finWeight }

computeFinWeight(e: WeightInput, hpMin: number, cfg: WeightConfig): number   // 单怪, 可单测最小单元
rankTargets(enemies: WeightInput[], cfg: WeightConfig): RankedEnemy[]          // 拷贝后升序(不可变)
```

### 5.4 公式(翻写 reference 3357-3379)
```
死怪/!alive  → finWeight = unreachableWeight (垫底)
hpMin = min(活怪 hpNow)
活怪 w = baseHpRatio × log10(hpNow / hpMin)              // 血越低 w 越小 → 优先
  name.includes('Yggdrasil') → w += yggdrasilExtraWeight
  每个 status[k]=true → w += statusWeight[k]
finWeight = w → 升序排序, [0] = 最该打
enabled === false → 直接按 eid 升序返回(总开关关 = 退回现状, 零回归)
```
> 注: 现状 `reader.enemies` 末尾已 `.filter(e=>e.alive)`, 死怪不入数组, 故 `unreachableWeight` 分支当前是**防御性冗余**(将来若改为"不 filter, 让 brain 见全体"则生效)。保留无害。

## 6. 段 3 — brain 接入

### 6.1 装配 helper
```
const weightCfg = (C) => ({
  baseHpRatio: C.baseHpRatio, yggdrasilExtraWeight: C.yggdrasilExtraWeight,
  unreachableWeight: C.unreachableWeight, statusWeight: C.statusWeight,
  enabled: C.useTargetWeight,
});
```

### 6.2 P16 替换(brain.ts:166-167, 唯一核心改动)
```
const ranked = rankTargets(S.enemies, weightCfg(C));   // 全体活怪按 finWeight 升序
const trash = ranked.filter(e => !e.is_red_boss && e.alive);
if (trash.length) return A('attack', trash[0].eid);    // 权重最优杂兵
```
`import { rankTargets } from './target-weight'`。

### 6.3 协调裁决(守半自动红线)
**权重只接管"杂兵平砍选谁", 红怪线全部不动**:
- `lockTarget`(红怪锁定)、P13 红怪减益、P15 红怪 OC 技、P16 尾部"仅剩红怪锁定持续平砍"(brain.ts:168-171) —— **零改动**。红怪是定向输出, 不能因血量/状态在多红怪间乱跳。
- 不学 dodying"全体统一排序": Yggdrasil 若是**非红杂兵**, `name` 权重 -1000 让 P16 优先砍它(保留 dodying 意图); 若是红怪则归 `lockTarget`。

### 6.4 顺带变准 / 保持现状
- P15 慈悲 `dying = e.hpPct<25 && e.bleeding`: 段 1 修 bug 后 `hpPct` 即准(等价 dodying `hpNow/hp<0.25`), **逻辑一字不改**。
- P15 要害/盾击目标选择(`S.enemies.find(晕眩/未晕眩)`): **保持现状**, 接 ranked 选优属增量, 本次不动以缩小回归面。

## 7. 段 4 — 配置 config.ts

### 7.1 DEFAULT_CONFIG 新增 5 键
```
useTargetWeight: false,        // 总开关(默认关·灰度); 只控制 P16 是否按权重排序
baseHpRatio: 1,                // 关键可调: >0 低血优先 / <0 高血优先
yggdrasilExtraWeight: -1000,   // 内置(世界树 boss 绝对优先)
unreachableWeight: 1000,       // 内置(死怪垫底)
statusWeight: { We:12, Bl:10, Slo:15, Si:10, Sle:100, Im:-15, PA:-12,
                BW:-10, Co:-109, Dr:2, MN:7, Stun:290, CM:-20 },  // 内置 13 状态权重
```

### 7.2 面板暴露 & 迁移
- 面板只暴露 `useTargetWeight`(总开关)+ `baseHpRatio`(低/高血优先)。其余作内置常量(改源码可调, 不进面板)。
- 默认 `useTargetWeight=false`(灰度, 与 OC 技/Absorb 惯例一致), 实测核对 `hpNow`/排序后再开。
- 新增键首次 `{...DEFAULT, ...stored}` 中 stored 必无 → 自动取默认, **无需 bump `CONFIG_VERSION`**。`statusWeight` 是 record, 加注释提示将来若做面板可调需注意整体覆盖语义。

## 8. 风险与降级

| 风险 | 等级 | 缓解 |
|---|---|---|
| 汉化/版本改了 `Spawned Monster`/`MID=HP=` 文本 → 初始 HP 解析失败 | 中 | 英文 token 优先(HV 引擎硬编码, 汉化通常只翻 UI); 解析失败 → `hpNow` 退化 `hpPct`, 排序仍正确; 总开关默认关 |
| `letter ↔ mkey ↔ idx` 对齐被 DOM 重排打破 | 低 | 实测三者同 DOM 顺序; name 兜底校验; 错位最坏退化 hpPct |
| 13 状态 src/官方名核对 | 低 | src + onmouseover 双匹配; 非 13 状态(如 Turbulent Air)自动忽略 |
| 死怪 `nbardead.png` 未直接验证 | 低 | 蓝本明确; `!alive`(opacity)亦判死; 实测补验 |
| 权重数学 | 极低 | 纯函数, 无副作用, 可单测 |

**总降级链**: 初始 HP 不可得 → `hpNow` 用 `hpPct` → 排序仅失去跨怪绝对血量精度, 不崩; 总开关关 → 完全退回现状 eid 顺序, 零回归。

## 9. 文件清单

**新增**: `src/battle/target-weight.ts`(纯函数: `computeFinWeight`/`rankTargets` + 类型)

**改动**:
- `src/battle/reader.ts`: `_spawnHp()` + 实例缓存字段 `initHp`; map 内修血条 bug + 算 `hpNow`/`name`/`status`
- `src/battle/tables.ts`: 新增 `STATUS_LIB`(13 状态表)
- `src/battle/brain.ts`: P16 替换 `rankTargets` + `weightCfg` helper + import
- `src/types.ts`: `EnemyState` 加 `hpNow`/`name`/`status`; 新增 `WeightInput`/`WeightConfig`/`RankedEnemy`
- `src/core/config.ts`: 新增 5 键

## 10. 待真机实测项(实现后下次战斗一起验)

1. 死怪血条是否 `nbardead.png`(本波无死怪)。
2. 红怪场景 `.btm2[style*=background]` 检测 + Yggdrasil 名读取(本波无红怪/无 Yggdrasil)。
3. 长回合 textlog 是否真把 Spawned 挤出(验证缓存沿用)。
4. 连刷换波时 `initHp` 缓存刷新时机(新 Spawned 覆盖)。
5. `hpNow` 数值核对(用已知怪血量比对绝对值)。

## 11. 测试策略

`target-weight.ts` 是纯函数, 将来加 vitest 零成本; 即便手测也可控制台喂数据:
- `rankTargets([{eid:1,hpNow:100,...},{eid:2,hpNow:10,...}], cfg)` → 期望 `[2,1]`(低血优先)
- Yggdrasil 满血排第一(`-1000` 压倒)
- 死怪 `hpNow=Infinity` → 永远垫底
- `baseHpRatio=-1` → 高血优先(反转)
- `enabled=false` → eid 升序(退化等价旧行为)
