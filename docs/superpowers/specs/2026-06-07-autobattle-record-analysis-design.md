# autobattle「记录与分析」里程碑设计 — 事件驱动·复用 logger

> 日期: 2026-06-07 · 状态: 设计已确认, 待写实现计划
> 性质: 独立新里程碑(M3 连刷之后、M4 保护后勤之前优先做)
> 关联:
> - 调研: dodying 记录功能全貌(掉落 dropMonitor 4139-4194 / 数据 recordUsage 4197-4349 / 按场 recordEach 312-314 / monsterDB 3200-3238 / UI 1147-1241)
> - 翻写底本: `autobattle/reference/hvAutoAttack.user.js`
> - 复用基建: `core/logger.ts`(决策日志) / `ui/log.ts`(弹窗) / `core/bus.ts`(事件总线) / `core/store.ts`(GM/localStorage KV)

## 1. 背景与目标

**现状**: autobattle 已完成 M1/M2/M3。M2 有成熟的**决策日志**(`logger.ts`: 每决策一条 round/turn/OC/HP/MP/SP/动作/note, 环形 5000 + 落盘), 但这是"行为追踪", **没有任何收益统计与战斗过程归档**。dodying 原版有掉落/数据统计(dropMonitor/recordUsage), 但: ① 只存聚合, 不存完整过程日志; ② 不显示角色等级; ③ 不算收益速率。

**目标**: 新建「记录与分析」里程碑, 含**两个目的不同的模块**:
- **A · 收益统计(玩家向)**: 回答"刷了多少、效率如何"。掉落(装备/水晶/材料) + EXP/Credit + 场次/回合/turn/怪数/boss + **EXP·h/Credit·h 速率(dodying 没有)** + monsterDB 落盘 + 技能/伤害/受伤/熟练度明细 + **玩家角色等级显示(非战斗页读, dodying 没有)**。
- **B · 决策调优日志(分析向)**: 回答"各竞技场准入等级的决策怎么按等级优化"。每场把【每回合 /json 原始 + 决策日志(logger)】按 **battleCode(含竞技场准入等级)** 关联归档进 **IndexedDB**, 支持导出 JSON 离线分析 + 脚本内按等级对比视图。

两模块共享归档基建(battleCode/采集事件), 但存储分层、独立开关、独立交付。

## 2. 用户已锁定的决策

| # | 决策 | 取值 |
|---|---|---|
| ① | 采集架构 | **方案 C: 事件驱动 · 复用扩展现有 logger**(否决 A 中心化采集 / B 双管道) |
| ② | 范围 | A 全维度 + B 完整日志 + 玩家角色等级显示, 全要 |
| ③ | B 日志粒度 | **每回合 /json 原始响应存档** |
| ④ | B 存储 | **IndexedDB**(A 仍走 GM Store; 分层理由见 §3.3) |
| ⑤ | 分析形式 | 导出 JSON 离线分析 **+** 脚本内按等级对比视图, 都要 |
| ⑥ | "等级"语义 | **竞技场准入等级(需求等级 Lv.80~300)**, 是 B 的分组维度; 与玩家角色等级(⑦)区分 |
| ⑦ | 竞技场识别 | **config 存 arenaTiers 映射表, 按战斗场次(roundAll)反查准入等级+名称**(不依赖连刷读 DOM) |
| ⑧ | 玩家角色等级 | 尝试非战斗页读玩家自己的 Lv(best-effort, 与⑥不同) |
| ⑨ | 交付 | 分 3 阶段(A 收益 → B IndexedDB → 速率/角色等级/打磨) |

## 3. 架构(事件驱动 · 复用 logger)

### 3.1 核心: loop 一拍多发

loop 每回合 `logger.push(决策记录)` 的**同一拍**多做:
```
loop.tick (决策做出后):
  logger.push(record)                          // 现有: 决策日志(环形 5000)
  bus.emit('battle:round', RoundSample)        // 新增: 决策 record + 当回合 /json 原始 + 三围/怪况
loop 检测战斗结束(roundNow===roundAll / continue / 退出战斗):
  bus.emit('battle:end', BattleEnd)            // 新增: 末回合 /json + victorious + 起止时间
```

A 收益统计、B 调优日志**都只是 bus 订阅者**, 互不知道对方、独立开关、独立交付。`bus` 泛型已支持任意事件, **零改动**。

```
                main.hookNet ──► lastBattleResponse(/json 原始, 每回合刷新; export getLastBattle)
                      │
 loop.tick ──决策──► logger.push ──┐(环形 5000, 实时 HUD 弹窗, 不动)
      │                            │
      ├─ emit('battle:round') ─────┼──► bus ──► A: stats-collector ──► Store(hvab_, 小聚合)
      └─ emit('battle:end')   ─────┘         └─► B: battle-archive  ──► IndexedDB(大原始)
                                                                          │
                                                ui/stats.ts(收益 tab) ◄───┘ ui/log.ts(按等级对比视图)
```

### 3.2 logger 双层并存(非替换)

- **第一层(保留不动)**: 现有 5000 环形 + localStorage 防抖落盘 → 实时 HUD 弹窗、同步热查、`toText()` 诊断。依赖**同步**读, 不能异步化。
- **第二层(B 新增)**: IndexedDB 按场归档 → 大容量异步冷归档。
- **raw 不进 logger**: 5000 条 × 每条几 KB raw 会撑爆 localStorage / GM 单值上限。raw 走 `battle:round` 事件 → B 订阅者 → IndexedDB。`logger.ts` 本身只多透传一个可选 `battleCode?`, 几乎不改 —— 避免 logger 职责过载。

### 3.3 存储分层(为何 A 走 GM、B 走 IndexedDB)

`Store`(`core/store.ts`) = GM_setValue/GM_getValue 优先、localStorage 兜底的 **KV 封装**(`hvab_` 前缀)。分层不是因 GM 容量不够(Tampermonkey GM 底层也是 IndexedDB, 容量够), 而是**访问模式不同**:

| | A 收益(走 Store/GM KV) | B 调优(走 IndexedDB) |
|---|---|---|
| 数据 | 小聚合对象(几 KB) | 大量每回合完整 /json |
| 访问 | 每次开面板**同步秒读**全量渲染 | **按准入等级/时间查询** + **按场范围删除(滚动清理)** + 单条增删 |
| 适配 | KV 同步, 完美 | 原生索引/游标范围删, 必需 |

dodying 全 localStorage 够用是因为它只存聚合(不存完整日志)。

## 4. 数据采集

### 4.1 /json 时序(天然对齐, 无需等待)

main 的 prototype hook 早于 HV 业务拿到 `/json`(写 `lastBattleResponse`) → HV 渲染进 DOM → loop 的 MutationObserver + 80ms debounce 触发 tick → `logger.push` 后 `getLastBattle()` 拿到的正是当回合 `/json`。决策与 /json 同回合配对, 零竞态。`main.ts` 把 `lastBattleResponse` 提为模块级 + `export getLastBattle()`(loop 直接 import, 不穿 unsafeWindow)。

### 4.2 事件载荷(types.ts 新增)

```ts
export interface RoundSample {
  battleCode: string;       // 'AR-Lv130-流亡之途' / 'GF-...' (见 4.3)
  level: number | null;     // 竞技场准入等级 130; 非竞技场为 null
  roundNow: number; roundAll: number; turn: number;
  record: LogRecord;        // 复用现有决策日志结构(物理同一对象 → 决策⊗战斗日志同源同回合)
  rawJson: string | null;   // 当回合 /json 原始(getLastBattle 快照; 冷启动缺失为 null)
  textlog: string;          // #textlog.textContent 快照(rawJson 缺时兜底解析)
  monsterAll: number; monsterAliveBefore: number;
}
export interface BattleEnd {
  battleCode: string; level: number | null;
  roundAll: number; victorious: boolean;          // textlog 含 'You are Victorious!'
  finalRawJson: string | null; finalTextlog: string;  // 末回合(含完整掉落 textlog + exp/credit)
  startedAt: number; endedAt: number;
}
// BusEvents 追加:
//   'battle:round': RoundSample;
//   'battle:end': BattleEnd;
```

### 4.3 battleCode + 竞技场准入等级识别(决策⑥⑦)

**level = 竞技场准入等级(Lv.80~300)**, 非玩家角色等级、非轮数。识别走 **config 映射表 + roundAll 反查**(不依赖连刷读 DOM):

```ts
// config.ts 新增数据(截图底本; HV 改设定可改 config)
arenaTiers: [
  { roundAll: 25, level: 80,  name: '力量流失' },   { roundAll: 30, level: 90,  name: '杀戮地带' },
  { roundAll: 35, level: 100, name: '最终阶段' },   { roundAll: 40, level: 110, name: '无尽旅程' },
  { roundAll: 45, level: 120, name: '梦殒之时' },   { roundAll: 50, level: 130, name: '流亡之途' },
  { roundAll: 55, level: 140, name: '封印之力' },   { roundAll: 60, level: 150, name: '崭新之翼' },
  { roundAll: 65, level: 165, name: '弑神之路' },   { roundAll: 70, level: 180, name: '死亡前夜' },
  { roundAll: 75, level: 200, name: '命运三女神与树' }, { roundAll: 80, level: 225, name: '世界末日' },
  { roundAll: 85, level: 250, name: '永恒黑暗' },   { roundAll: 90, level: 300, name: '与龙共舞' },
]
```

```ts
// record/battle-code.ts (纯函数, 可测)
export function resolveArenaTier(roundAll: number, tiers: ArenaTier[]): ArenaTier | null;
// battleType==='竞技场'(reader 从 ss=ar 算) 时用 roundAll 查 tiers; 命中=竞技场, 否则 null
export function deriveBattleCode(battleType: string, roundAll: number, tier: ArenaTier | null): string;
//   竞技场: `AR-Lv${tier.level}-${tier.name}` (level=tier.level)
//   GF/RB/手动: `${kind}-${roundAll}` (level=null)
```

> 双重判定: 只有 `battleType==='竞技场'`(ss=ar) 才查 arenaTiers, 避免 GF/RB 的 roundAll 偶然撞 25~90。GF 持久战 roundAll 通常很大, 天然不撞。

> **识别数据源(经 hvc.js.bak 官方脚本 + 汉化实测修正)**: 三条硬事实——
> ① HV 官方 /json 响应**无结构化 round/drop/exp(真值)/credit 字段**, 全埋在 `textlog[]`(数组 `{t:html, c:cls}`) 与 `pane_completion`(HTML) 里(hvc.js.bak Battle.process_action L888-940);
> ② HV **无全局 battle 数据对象**(`window.battle` 是 UI 控制器, 无 roundAll/roundType; dodying 的 `g('battle').roundAll` 实为它自己从 textlog 解析后回填 L3242, 非 HV 原生 → `unsafeWindow.battle.roundAll` 拿不到, **已否决**);
> ③ **汉化脚本改写渲染后 DOM 的 textlog 文本**(实测: `Spawned Monster`→`生成怪物`、`Initializing Grindfest (Round 2/1000)` 整行被吞) → **从渲染 DOM 解析英文模式不可靠**。
>
> 因此**统一从 main hook 抓的 /json 原始响应解析**(未经汉化的英文原文, B 调优日志本就存它):
> - **roundNow/roundAll**: 解析 `textlog[].t` 的 `Round N / M`(英文原文; GF 实测 1000 轮)
> - **battleType**: 用 URL `ss` 经 `SS_CN` 映射(reader.ts:228; ar=竞技场/gr=压榨界/rb=浴血擂台/ba=遭遇战; **不受汉化影响**)
> - 渲染后 DOM `#textlog` 仅作 /json 缺失的**最后兜底**(汉化下不可靠); 缓存再兜底(roundAll 一场固定)
>
> 实现: `record/battle-code.ts` 加纯函数 `parseRoundFromJson(rawJson): {roundNow, roundAll} | null`(解析 textlog[].t); `deriveBattleCode`/`resolveArenaTier` 不变。掉落(§5.1)/Spawned(§5.3)同理一律喂 /json 原始 textlog/pane_completion, 不喂汉化 DOM。GF roundAll=1000 不入 arenaTiers(battleType≠竞技场不查表), battleCode=`GF`。

## 5. A 收益统计(玩家向)

**A 订阅者 `record/stats-collector.ts`**: `on('battle:round')` 逐回合累加 usage(内存 in-progress, 省写频); `on('battle:end')` 结算掉落+EXP+速率并落 Store。解析全做纯函数, DOM/Store 副作用留薄壳。

### 5.1 掉落解析(纯函数 `record/drop-parse.ts`, 翻写 dropMonitor 4139-4194)
`parseDrops(textlog, dropQuality) → DropDelta`: 优先解析 `battle:end` 末回合 /json 的 pane HTML 里 span color, DOM 兜底。
- 红 rgb(255,0,0)=装备: 按 `dropQuality`(0-7)品质门槛起, 归类 `Equipment of X` 计数
- 品红 rgb(186,5,180)=水晶: `Nx Crystal of Y` 数量累加 · 金 rgb(168,144,0)=Credit 文本数字 · 其它=材料/卷轴按名 +1
- `You gain N EXP/Credit` → 累加 exp/credit(/json 的 `exp` 字段交叉校验)

### 5.2 usage 解析(纯函数 `record/usage-parse.ts`, 翻写 recordUsage 4197-4332)
逐回合扫 textlog 累加 7 类。**技能/物品次数从决策侧 `LogRecord` 拿更准**(明确知道出了什么招), damage/hurt(物理 `_pavg`/魔法 `_mavg` 均值)/restore/proficiency/evade/miss/focus 从 textlog 正则。场次/回合/turn/怪数/boss 在怪清空波末累加。

### 5.3 monsterDB(纯函数 `record/monster-db.ts`, 翻写 3200-3238)
复用 `reader.parseSpawnHp` 的 MID/Name/LV/HP 解析。`upsert(db, midMap, spawn)`: 同名异 MID 备份到 `monsterMID`/恢复。`cacheMonsterHP` 开关控落盘。

### 5.4 聚合结构 + Store 键
```ts
interface StatsAccum {
  startTime; activeMs;                 // activeMs=Σ每场战斗时长(活跃速率用)
  exp; credit; battles; rounds; turns; monsters; bosses;
  drops: Record<string,number>;        // 'Equipment of Legendary'/'Crystal of Vigor'/材料 → 计数
  restore; items; magic; damage; proficiency: Record<string,number>;
  hurt: { _avg; _pavg; _mavg; _total; _count; mp; oc };
  self: { evade; miss; focus };
}
```
| Store 键(`hvab_`) | 内容 | 对应 dodying |
|---|---|---|
| `hvab_stats` | 累计总量 StatsAccum(可重置) | stats |
| `hvab_statsOld` | 按 battleCode 归档的单场快照数组(多场对比, 限 archiveMaxBattles) | statsOld |
| `hvab_monsterDB`/`hvab_monsterMID` | 怪 HP 库 | monsterDB/monsterMID |
| `hvab_playerLevel` | 玩家角色等级缓存(§5.6) | — |

### 5.5 EXP·h / Credit·h 速率(阶段3, 纯函数 `record/rate.ts`)
`ratePerHour(amount, startMs, endMs)`。两口径: **会话**(含挂机间隙, 真实产出) + **活跃**(`activeMs` 分母, 纯刷图效率)。`statsRateMode` config 选默认口径; 可选近 N 场滑窗。

### 5.6 玩家角色等级(阶段3, best-effort, 决策⑧——注意与竞技场准入等级⑥不同)
`record/player-level.ts`: `!inBattle()` 非战斗页**被动**读含 `Level N` 的 DOM(不主动 fetch 避 300ms 红线) → 缓存 `hvab_playerLevel`。纯函数 `parseLevel(text)` 可测; 读不到显示上次缓存值, 从未读到显示 `—`。HUD/收益 tab 显示玩家自己的 `Lv N`。

## 6. B 决策调优日志 + IndexedDB(分析向)

**B 订阅者 `record/battle-archive.ts`** —— **逐回合直写**(无内存 buffer, 跨 reload 零状态丢失):
- `on('battle:round')` → `idb.add('rounds', round)`
- `on('battle:end')` → `idb.put('battles', 场元数据)`

### 6.1 两个 object store(DB `hvab` v1)
```ts
// rounds (keyPath:'rid' autoIncrement; index: byBattle/byCode/byLevel)
interface ArchivedRound {
  rid?; battleId; battleCode; level;     // battleId 关联同场; level=准入等级(byLevel 索引)
  roundNow; roundAll; turn; ts;
  record: LogRecord;                     // 决策日志(与 A 同源)
  rawJson: string | null;               // 当回合 /json 原始(离线可重跑任意 parser)
}
// battles (keyPath:'battleId'; index: byLevel/byCode/byTime)
interface ArchivedBattle {
  battleId; battleCode; level; kind;     // kind: 竞技场/GF/RB
  startedAt; endedAt; turnCount; roundAll; victorious;
  configSnapshot: Partial<Config>;       // ★ 当时的架式/技能/喝药/攒炮参数 —— 按等级调参分析的灵魂
  summary: { cannonFired; potions; avgOc; stanceRatio; winRate?; ... };  // 派生, 对比视图直接展示
}
```
- **`configSnapshot` 是「按等级调参」的灵魂**: 分析 "Lv.130 这档决策怎么优化" 必须知道当时用的什么参数。`battle:end` 存 `config.all()` 相关子集。
- `battleId = ${battleCode}@${startedAt}`, 开战(firstRound)生成, 跨 reload 从 Store 兜底恢复, 关联同场所有回合。

### 6.2 IndexedDB 封装(`core/idb.ts`, ~120 行, 不引 npm 包)
`open`(单例, onupgradeneeded 建 store/索引)/`add`/`put`/`get`/`getAllByIndex`/`getAll`/`count`/`delete`/`clear`, Promise 化。`window.indexedDB ?? unsafeWindow.indexedDB`。所有操作 try/catch 包裹, 写失败仅 console **不影响战斗 loop**(对齐 Store 哲学)。

### 6.3 容量清理
- `archiveMaxBattles`(默认 200): 超出按 `byTime` 删最旧场 + 级联删其 rounds
- `archiveKeepPerLevel`(默认 20): 每准入等级最多留 N 场(防某级刷爆挤掉其它级; 对比分析只需每级近期样本)
- 手动「清空归档」按钮; `QuotaExceeded` 兜底自动 prune 后重试
- Store 存 <1KB `hvab_tuning_index`(各等级场次计数)供视图秒开, 不必每次 open DB

## 7. UI

### 7.1 A 收益 tab(panel 加第 5 tab `stats`, 新 `ui/stats.ts`)
- 顶部卡: 会话时长 · EXP/Credit 总量 · **EXP·h/Credit·h 速率** · 场次/回合/怪数/boss · 玩家 `Lv N`
- 折叠分区(复用 `group()`): 掉落(Equipment/水晶/材料分组) · 技能次数 · 伤害 · 受伤(物理/魔法均值) · 回复 · 熟练度(复用 dodying 7 类中文 translation)
- 按钮: 刷新 · 重置累计 · 导出 JSON · 查看 monsterDB
- 订阅 `battle:end` 增量刷新(仅 tab 可见时, 仿 log.ts 可见性守卫)

### 7.2 B 按等级对比视图(扩展 `ui/log.ts` 为双模式)
- 模式1(现有决策日志流, 不动)
- 模式2「归档对比」: **准入等级**选择器(来自 `hvab_tuning_index`) → 该等级场次列表(`idb byLevel`) → 选 2+ 场并排对比 summary(放炮/喝药次数/平均 OC/架式比/胜率/EXP·h) → 点开某场 lazy-load `rounds` 看决策序列 + `configSnapshot`。异步 loading 态, 与同步流隔离。

### 7.3 导出
A 导出 `hvab_stats`+monsterDB JSON; B 导出整场归档(单场 join battles+rounds / 全量 / 按准入等级)。复用 log.ts 下载逻辑(抽 `downloadJSON`)。

## 8. config 新增配置项(CONFIG_VERSION 5→6)

```ts
// ── 记录与分析里程碑 ──
recordEnabled: true,        // A 收益统计总开关
recordArchive: false,       // B 调优日志总开关(重存储, 默认关需主动开)
cacheMonsterHP: true,       // monsterDB 落盘
dropQuality: 6,             // 装备品质门槛(0Crude..7Peerless; 默认6=Legendary起记)
archiveMaxBattles: 200,     // B 最多留几场
archiveKeepPerLevel: 20,    // 每准入等级最多留几场
statsRateMode: 'active',    // 速率口径 'active'(战斗内)|'session'(含挂机)
showPlayerLevel: true,      // 显示玩家角色等级
arenaTiers: [ /* §4.3 的 14 行竞技场映射表 */ ],
```
新键纯增量, `{...DEFAULT_CONFIG, ...stored}` 自动补默认; bump version 触发一次落盘。

## 9. 与现有代码集成点(决策路径零逻辑改动)

| 文件 | 改动 |
|---|---|
| `core/bus.ts` | 零改(泛型支持) |
| `types.ts` | 加 RoundSample/BattleEnd/StatsAccum/ArchivedRound/ArchivedBattle/ArenaTier + BusEvents 两条; LogRecord 加可选 `battleCode?` |
| `core/logger.ts` | 极小: 透传可选 `battleCode`; 环形职责不变 |
| `main.ts` | `lastBattleResponse` 提模块级 + `export getLastBattle()`; init 两订阅者; beforeunload 加 flush |
| `loop.ts` | `logger.push` 后 emit `battle:round`; continue/退出战斗处 emit `battle:end`; 非战斗分支低频 `tryReadLevel()`(决策逻辑零改) |
| `battle/reader.ts` | 零改(复用 parseSpawnHp 纯函数, 但记录模块喂 /json 原始 textlog 而非汉化 DOM; reader 自身 DOM 解析降级为 /json 缺失兜底) |
| `ui/log.ts` | 加「归档对比」模式(异步 idb 渲染 + 切换 + 单场展开 + 导出) |
| `ui/panel.ts` | 加 `stats` tab |
| `ui/hud.ts` | 可选: 显示玩家 Lv + 会话 EXP·h |
| `core/config.ts` | §8 新键 + arenaTiers + VERSION 6 |

## 10. 纯度与可测性(无 vitest, tsc + 控制台喂数据)

**纯函数(可控制台/drive-*.mts 验证, 范本 target-weight.ts)**: `drop-parse.parseDrops` · `usage-parse` · `monster-db.upsert` · `battle-code.resolveArenaTier/deriveBattleCode` · `rate.ratePerHour` · `player-level.parseLevel` · `archive-prune`(清理选择) · `tuning summarize`(对比摘要)。新增 `scripts/drive-record.mts` 喂样本 textlog/决策序列断言。

**副作用(薄壳)**: `stats-collector`/`battle-archive`(订阅 bus 调纯函数)、`idb.ts`(IndexedDB)、DOM 取 span color、Store 读写。`__hvab` 加 `getStats()/tuning.count()/tuning.exportAll()` 调试钩子。

## 11. 风险与边界

| 风险 | 等级 | 缓解 |
|---|---|---|
| /json 结构未实测确证(textlog/exp/pane 字段名) | 高 | 阶段2 前置: 真机 dump `__hvab.getLastBattle()` 确认 schema |
| 掉落必须读 span color(/json 是 HTML 字符串) | 中 | 解析 /json pane HTML 的 color; DOM 兜底 |
| IndexedDB 在 Tampermonkey/unsafeWindow 沙箱行为 | 中 | 阶段2 先验证持久/配额; 不可用则降级(仅 disable B, A 照常) |
| roundAll 撞号(GF/RB 撞竞技场 25~90) | 低 | 双重判定: battleType===竞技场 才查 arenaTiers |
| **汉化脚本改写渲染后 DOM textlog 文本**(Spawned Monster→生成怪物 / Round 行被吞; 实测) | 高 | **一律从 /json 原始响应(未汉化英文)解析**轮数/掉落/Spawned; DOM 仅 /json 缺失最后兜底(汉化下不可靠) |
| HV 无结构化 round/drop/exp 字段、无全局 battle 数据对象 | — | 已确认(hvc.js.bak); 轮数从 /json textlog[].t 的 Round N/M 解析, 掉落从 pane_completion+textlog HTML |
| 跨 reload in-progress 场丢失 | 低 | 逐回合直写 rounds(非内存 buffer)根治 |
| B raw 体量大 | 中 | archiveMaxBattles + 每等级保留 + recordArchive 默认关 |
| logger 职责过载 | — | raw 移出 logger 到 B 订阅者, logger 只透传 battleCode |
| 玩家角色等级读不到 | 低 | best-effort 缓存兜底, 不阻塞 |

## 12. 分 3 阶段交付(每阶段独立 typecheck + 控制台验证 + 可挂载)

- **阶段 1 · 事件 + A 收益(走 Store, 不碰 IndexedDB)**: types 事件 + loop emit + battle-code + drop-parse/usage-parse/monster-db/rate + stats-collector + 收益 tab + config。纯函数同步可测, 玩家先得掉落/EXP/Credit/速率。**先交付即有价值, 风险最低**。
- **阶段 2 · B 调优日志(IndexedDB)**: idb.ts + battle-archive(逐回合直写) + 两 store + 容量清理 + ui/log.ts 按等级对比视图 + 导出 JSON。前置: 真机 dump /json schema。
- **阶段 3 · 速率两口径 + 玩家角色等级 + 打磨**: rate 会话/活跃口径 + player-level + HUD 集成 + 配额边界 + CSS。

## 13. 文件改动清单

**新增**(`autobattle/src/record/` + `core/idb.ts` + `ui/stats.ts`):
| 文件 | 职责 | 纯/副作用 | 行 | 阶段 |
|---|---|---|---|---|
| `core/idb.ts` | IndexedDB Promise 封装 | 副作用 | ~120 | 2 |
| `record/battle-code.ts` | resolveArenaTier/deriveBattleCode/parseRoundFromJson(全纯函数; parseRoundFromJson 解析 /json textlog[].t 的 Round N/M) | 纯 | ~70 | 1 |
| `record/drop-parse.ts` | 掉落颜色分类(翻写 dropMonitor) | 纯 | ~90 | 1 |
| `record/usage-parse.ts` | 逐回合 7 类(翻写 recordUsage) | 纯 | ~140 | 1 |
| `record/monster-db.ts` | monsterDB upsert | 纯 | ~80 | 1 |
| `record/rate.ts` | EXP·h/Credit·h | 纯 | ~30 | 3 |
| `record/player-level.ts` | 玩家角色等级解析+读取 | 纯+壳 | ~50 | 3 |
| `record/archive-prune.ts` | 清理选择 | 纯 | ~40 | 2 |
| `record/stats-collector.ts` | A 订阅者(壳) | 副作用 | ~120 | 1 |
| `record/battle-archive.ts` | B 订阅者(壳) | 副作用 | ~150 | 2 |
| `ui/stats.ts` | A 收益面板 | UI | ~180 | 1 |
| `scripts/drive-record.mts` | 纯函数回归 | 验证 | ~120 | 1 |

**修改**: `types.ts`(~80) · `main.ts`(~8) · `loop.ts`(~15) · `logger.ts`(~3) · `ui/log.ts`(~150 对比视图) · `ui/panel.ts`(~10) · `ui/hud.ts`(~15) · `ui/styles.ts`(~40) · `config.ts`(~25)。

**总量级**: 新增 ~1170 行 + 修改 ~346 行。按 §12 三阶段: 阶段1 ~700(A+事件)/阶段2 ~500(B+IndexedDB)/阶段3 ~300(速率+等级+打磨)。
