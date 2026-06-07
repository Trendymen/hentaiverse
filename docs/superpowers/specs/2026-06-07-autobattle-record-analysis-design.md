# autobattle「记录与分析」里程碑设计 — 事件驱动·复用 logger

> 日期: 2026-06-07 · 状态: 设计已确认(经 6-agent 对抗 review 修订), 待写实现计划
> 性质: 独立新里程碑(M3 连刷之后、M4 保护后勤之前优先做)
> 关联:
> - 调研: dodying 记录功能(掉落 dropMonitor 4139-4194 / 数据 recordUsage 4197-4332 / 按场 recordEach 312-314 / monsterDB 3200-3238 / UI 1147-1241)
> - HV 官方客户端: `hvc.js.bak`(api_call/api_response L1-20, Battle.process_action L888-940)
> - 翻写底本: `autobattle/reference/hvAutoAttack.user.js`
> - 复用基建: `core/logger.ts`(决策日志) / `ui/log.ts`(弹窗) / `core/bus.ts`(事件总线) / `core/store.ts`(GM/localStorage KV)

## 1. 背景与目标

**现状**: autobattle 已完成 M1/M2/M3。M2 有成熟**决策日志**(`logger.ts`: 每决策一条 round/turn/OC/HP/MP/SP/动作/note, 环形 5000 + 落盘), 但**无收益统计与战斗过程归档**。dodying 有掉落/数据统计但只存聚合、不存完整过程日志、不显示角色等级、不算速率。

**目标**: 新建「记录与分析」里程碑, 两个目的不同的模块:
- **A · 收益统计(玩家向)**: 掉落(装备/水晶/材料) + EXP/Credit + 场次/回合/turn/怪数/boss + **EXP·h/Credit·h 速率(dodying 没有)** + monsterDB 落盘 + 技能/伤害/受伤/熟练度明细 + **玩家角色等级显示(非战斗页读, dodying 没有)**。
- **B · 决策调优日志(分析向)**: 每场把【每回合 /json 原始 + 决策日志(logger)】按 **battleCode(含竞技场准入等级)** 关联归档进 **IndexedDB**, 导出 JSON + 脚本内按等级对比视图。回答"各竞技场准入等级的决策怎么按等级优化"。

两模块共享归档基建(battleCode/采集事件), 但存储分层、独立开关、独立交付。

## 2. 用户已锁定的决策

| # | 决策 | 取值 |
|---|---|---|
| ① | 采集架构 | **方案 C: 事件驱动 · 复用扩展现有 logger** |
| ② | 范围 | A 全维度 + B 完整日志 + 玩家角色等级显示 |
| ③ | B 日志粒度 | **每回合 /json 原始响应存档** |
| ④ | B 存储 | **IndexedDB**(A 走 GM Store) |
| ⑤ | 分析形式 | 导出 JSON + 脚本内按等级对比视图, 都要 |
| ⑥ | "等级"语义 | **竞技场准入等级(需求等级 Lv.80~300)**, B 分组维度; 与玩家角色等级(⑧)区分 |
| ⑦ | 竞技场识别 | config `arenaTiers` 映射 + roundAll 反查(不依赖连刷读 DOM) |
| ⑧ | 玩家角色等级 | 尝试非战斗页读玩家自己的 Lv(best-effort) |
| ⑨ | 交付 | 分 3 阶段(A 收益 → B IndexedDB → 速率/角色等级/打磨) |

## 3. 架构(事件驱动 · 复用 logger)

### 3.1 核心: loop 一拍多发(含去重)

loop 每回合 `logger.push(决策记录)` 的同一拍多发事件。**关键: 必须去重**——loop tick 在 `changed||stalled` 都跑完整决策(loop.ts:78), 含 stuckN 安全网换目标、stalled(2.5s 没推进)重复决策、defend/skip 等非真实回合推进, 不能把这些当真实回合记录。

```
loop.tick(决策做出后):
  logger.push(record)                          // 现有: 决策日志环形(不动)
  // 仅在【真实回合推进】时发(loop.ts:116 已有 S.roundNow!==lastRound 判据; 或 turn 真增):
  bus.emit('battle:round', RoundSample)         // 携带 决策 Action(结构化 type/id) + 当回合 /json 原始 + 三围/怪况 + isRetry 标记
  // 战斗结束判定 见 §3.2(用 battleId 切换沿, 不用 continue):
  bus.emit('battle:end', BattleEnd)             // 在新场 Initializing/roundNow 倒退时, 对上一 battleId 结算
```

`battle:round` 对 stalled/stuckN 安全网重试标 `isRetry=true`, 订阅者跳过(不计入 usage/不归档为新回合), 防 B 混入重试噪声、防 A usage 重复计数。

A 收益统计、B 调优日志都是 bus 订阅者, 互不知道对方、独立开关、独立交付。**`bus.ts` 实现零改动(泛型 `K extends keyof BusEvents`); 仅需在 `types.ts` 的 `BusEvents` 接口加 `battle:round`/`battle:end` 两条类型声明**。

### 3.2 battle:end 触发边界(Critical 修订: 不用 continue)

**不能用 continue 触发**: `canContinue`(#btcp)在 GF **每一波清完怪**都出现(brain.ts:116), continue 走 `battle_continue()`=整页 reload(executor.ts); GF roundAll=1000 → 一次连刷约 1000 次 continue, 若每次 emit battle:end 会把一场 GF 切成 ~1000 个"场"。且 reload 会打断 battle:end 的异步 IndexedDB 写。

**正确边界**: 以 **battleId 切换沿 + roundNow 倒退** 判"一场":
- 复用 loop.ts:81-82 已有的「roundNow 倒退(R_n < 上次 R) = 重开 GrindFest」检测。
- **竞技场整场** = Initializing 到 `roundNow===roundAll` 那波打完(arena roundAll 固定)。
- **GF 整场** = 一次 session(以 roundNow 倒退、或显式退出战斗 battle:active=false 为界)。
- battle:end 在「检测到新场 Initializing / roundNow 倒退 / battleId 变更」时, 对**上一个 battleId** 做结算(而非当场每波)。
- 因 continue 前会 reload: A 的聚合走同步 Store(无碍); B 的原始日志靠 **逐回合直写 rounds + battleId 跨 reload 恢复**(§6.1), 不依赖 battle:end 那一刻同步写完。

### 3.3 logger 双层并存(非替换)

- 第一层(保留不动): 现有 5000 环形 + localStorage 防抖落盘(logger.ts:17-20 每次 `Store.set` 写全量 buf) → 实时 HUD 弹窗、同步热查。
- 第二层(B 新增): IndexedDB 按场归档 → 大容量异步冷归档。
- **raw 不进 logger**: logger 每次写全量 buf, 把每条几 KB raw 塞进 5000 环形会撑爆单次 GM_setValue。raw 走 `battle:round` 事件 → B 订阅者 → IndexedDB。`logger.ts` 只多透传可选 `battleCode?`, 避免职责过载。

### 3.4 存储分层(为何 A 走 GM、B 走 IndexedDB)

`Store`(`core/store.ts`) = GM 优先、localStorage 兜底的 KV 封装(`hvab_` 前缀)。分层主因是**访问模式不同**: A 是小聚合、每次开面板**同步全量秒读**渲染(KV 完美); B 是大量每回合完整 /json、要**按准入等级范围查询 + 按场范围删除**(IndexedDB 索引/游标必需)。(GM 容量一般够小聚合用; 不对 Tampermonkey 内部存储后端做断言。)

## 4. 数据采集

### 4.1 /json 时序(天然对齐)

main 的 prototype hook 早于 HV 业务拿到 `/json`(写 `lastBattleResponse`) → HV 渲染进 DOM → loop 的 observer+80ms debounce 触发 tick → `logger.push` 后 `getLastBattle()` 拿到当回合 `/json`。决策与 /json 同回合配对。`main.ts` 的 `lastBattleResponse` 已是模块级(main.ts:13)、`getLastBattle` 已存在(main.ts:100 但仅挂 __hvab), 只需新增 `export`。**注意 loop←main 循环依赖**(main 既 hookNet 又 init loop): 建议把 `getLastBattle` 抽到独立小模块 `core/net-cache.ts` 供 main/loop/记录模块共同 import。

### 4.2 事件载荷(types.ts 新增)

```ts
export interface RoundSample {
  battleId: string;          // 同场关联(§6.1; 每 tick 从 Store curBattleId 读)
  battleCode: string;        // 'AR-Lv130-流亡之途' / 'GF' / 'AR-R50'(失配退化)
  level: number | null;      // 竞技场准入等级; 非竞技场/失配为 null
  roundNow: number; roundAll: number; turn: number;
  action: { type: string; id?: number };  // brain 决策【结构化】Action(非中文串; 供技能/物品次数统计)
  actionLabel: string;       // 中文可读(给 B 日志展示)
  record: LogRecord;         // 复用现有决策日志(决策⊗战斗日志同源同回合)
  rawJson: string | null;    // 当回合 /json 原始(冷启动缺失为 null)
  bossThisWave: number;      // 本波 boss 数 = enemies.filter(is_red_boss).length(reader.ts:188)
  isRetry: boolean;          // stalled/stuckN 安全网重试 → 订阅者跳过
}
export interface BattleEnd {
  battleId: string; battleCode: string; level: number | null;
  roundAll: number; victorious: boolean;          // textlog 含 'You are Victorious!'
  finalRawJson: string | null;
  startedAt: number; endedAt: number;
  // 注: EXP/Credit/掉落不在此, 由 A 从每回合 textlog 'You gain' + [item] 行累加(见 §5.1)
}
// BusEvents 追加: 'battle:round': RoundSample; 'battle:end': BattleEnd;
```

### 4.3 battleCode + 竞技场准入等级识别(决策⑥⑦)

**数据源(经 hvc.js.bak + 汉化实测确认)**: HV /json **无结构化 round/drop/exp(真值)/credit 字段、无全局 battle 数据对象**(`window.battle` 是 UI 控制器; dodying `g('battle').roundAll` 是它自己从 textlog 回填 L3242, `unsafeWindow.battle.roundAll` 拿不到, **已否决**); 且**汉化脚本改写渲染后 DOM textlog 文本**(实测 `Spawned Monster`→`生成怪物`、`Round` 行被吞)。故**统一从 main hook 的 /json 原始响应解析**(未汉化英文):
- **roundNow/roundAll**: 纯函数 `parseRoundFromJson(rawJson)` 解析 `textlog[].t` 的 `Round N / M`(GF 实测 1000 轮); DOM `#textlog` 仅 /json 缺失最后兜底(汉化下不可靠); 缓存再兜底(一场固定)。
- **battleType(是不是竞技场)**: URL `ss` 经 `SS_CN` 映射(reader.ts:228; ar=竞技场/gr=压榨界/rb=浴血擂台/ba=遭遇战; **不受汉化影响**)。

**arenaTiers 映射(config; 截图底本, 覆盖 L398 玩家实际刷的 Lv.80~300 共 14 档)**:
```ts
arenaTiers: [  // {roundAll, level, name}; 与 dodying 'ar'.list(L2701-2725) 对齐
  {roundAll:25,level:80,name:'力量流失'},  {roundAll:30,level:90,name:'杀戮地带'},
  {roundAll:35,level:100,name:'最终阶段'}, {roundAll:40,level:110,name:'无尽旅程'},
  {roundAll:45,level:120,name:'梦陨之时'}, {roundAll:50,level:130,name:'流亡之途'},
  {roundAll:55,level:140,name:'封印之力'}, {roundAll:60,level:150,name:'崭新之翼'},
  {roundAll:65,level:165,name:'弑神之路'}, {roundAll:70,level:180,name:'死亡前夜'},
  {roundAll:75,level:200,name:'命运三女神与树'}, {roundAll:80,level:225,name:'世界末日'},
  {roundAll:85,level:250,name:'永恒黑暗'}, {roundAll:90,level:300,name:'与龙共舞'},
]
```
> **显式声明**: arenaTiers **仅覆盖 Lv.80~300**(玩家实际刷档; dodying 全表另有低段 roundAll 2~20→Lv1~70、高段 95/100→Lv400/500 共 10 档, 玩家不刷, 故意不列)。"梦陨之时"(Dreamfall Lv120, 对齐 dodying 用字)。

**失配兜底(Important: 同时防 RB 误判)**: 纯函数 `resolveArenaTier(roundAll, tiers)` —— **仅 `battleType==='竞技场'`(ss=ar) 才查表**; 命中→`{level,name}`; **ss=ar 但 roundAll 未命中(低/高段竞技场)→ `level=null` + battleCode 退化 `AR-R${roundAll}`(不硬塞错等级)**; 非 ss=ar(GF/RB/遭遇)→ `kind-roundAll`(GF roundAll=1000 → `GF`)。
> **RB 存疑(阶段2 真机确认)**: dodying L3142-3148 显示 Arena/RB 共用 `Initializing arena challenge` 日志、靠 challenge id 区分(i≤35=arena/i≥105=rb), 暗示 RB 可能走 `ss=ar` 而非独立 `ss=rb`。若 RB 走 ss=ar, 其 roundAll 不在 arenaTiers(Lv80-300) → 失配兜底自动给 level=null + `AR-R${roundAll}`, **不会误塞竞技场准入等级**。阶段2 真机确认 RB 实际 URL; 若需精确区分再补 challenge-id 判定。

实现: `record/battle-code.ts` 纯函数 `parseRoundFromJson`/`resolveArenaTier`/`deriveBattleCode`。

## 5. A 收益统计(玩家向)

**A 订阅者 `record/stats-collector.ts`**: `on('battle:round')`(跳过 isRetry) 逐回合累加 usage(内存 in-progress); `on('battle:end')` 落 Store。解析全做纯函数, 喂 **/json 原始**(非汉化 DOM)。

### 5.1 掉落 + EXP/Credit 解析(纯函数 `record/drop-parse.ts`, 翻写 dropMonitor 4139-4194)
- **解析源**: /json 原始 `textlog[].t` 的 **`[item]` 掉落行**(对齐 dodying L4147, 它解析的是 textlog 节点, 非 pane_completion)。
- **掉落分类(从 HTML 字符串取色)**: textlog[].t 是 HTML 字符串(hvc.js.bak L912 innerHTML), 非 live DOM。取色用正则 `color:\s*rgb\(255,\s*0,\s*0\)` 等, 或薄壳里 `innerHTML` 进临时节点再读 `.style.color`(rgb 空格规范化要统一)。红=装备(按 `dropQuality` 0-7 品质门槛归 `Equipment of X`)、品红=水晶(`Nx Crystal of Y`)、金=Credit、其它=材料按名 +1。
- **EXP/Credit 真值(Critical 修订)**: **唯一来源 = `textlog[].t` 的 `You gain (\d+) (EXP|Credit)` 正则**(对齐 dodying L4148)。**`/json` 的 `d.exp` 是经验条像素宽度 + 1234 满条哨兵(hvc.js.bak L920-921), 非数值, 严禁用作 EXP 数值或交叉校验**。
- **drive-record.mts 样本必须用真实 /json 抓的 HTML 字符串**(非手写纯文本, 否则纯函数测过、真机挂)。

### 5.2 usage 解析(纯函数 `record/usage-parse.ts`, 翻写 recordUsage 4197-4332)
逐回合扫 /json textlog 累加: restore/damage/hurt(物理 `_pavg`/魔法 `_mavg` 均值)/proficiency/evade/miss/focus。场次/回合/turn 在 `roundNow===roundAll` 波末累加(对齐 dodying `_battle` 语义)。
- **技能/物品次数(Important 修订)**: 从 RoundSample 的**结构化 `action.{type,id}`** 累加(brain 决策原始 type/id), **不从 LogRecord 中文串反解**(LogRecord 只有 `action:string` 中文标签, 反解受翻译表影响更脆)。
- **boss 计数(Critical 修订)**: 每波末统计 `bossThisWave`(RoundSample 带, = enemies.filter(is_red_boss).length, reader.ts:188 红框判定)。口径 = 红名 boss; 无 dodying `g('bossAll')` 等价物, 以 is_red_boss 聚合为准。

### 5.3 monsterDB(纯函数 `record/monster-db.ts`, 翻写 3200-3238)
`upsert(db, midMap, spawn)`: 同名异 MID 备份/恢复, `cacheMonsterHP` 开关控落盘。Spawned 解析复用 `reader.parseSpawnHp` 的正则**但喂 /json `textlog[].t`**(英文, 非汉化 DOM "生成怪物"); 注意 textlog[].t 是 HTML 字符串, 正则需适配(抠文本或正则容忍标签)。

### 5.4 聚合结构 + Store 键
```ts
interface StatsAccum {
  startTime; activeMs;                 // activeMs=Σ每场战斗时长(活跃速率用)
  exp; credit; battles; rounds; turns; monsters; bosses;  // bosses 来源见 §5.2
  drops: Record<string,number>;        // 'Equipment of Legendary'/'Crystal of Vigor'/材料 → 计数
  restore; items; magic; damage; proficiency: Record<string,number>;
  hurt: { _avg; _pavg; _mavg; _total; _count; mp; oc };
  self: { evade; miss; focus };
}
```
| Store 键(`hvab_`) | 内容 |
|---|---|
| `hvab_stats` | 累计总量(可重置) |
| `hvab_statsOld` | 按 battleCode 归档的单场**聚合摘要**数组(玩家向多场对比; 限 archiveMaxBattles) |
| `hvab_monsterDB`/`hvab_monsterMID` | 怪 HP 库 |
| `hvab_playerLevel` | 玩家角色等级缓存(§5.6) |
| `hvab_curBattleId` | 当前场 battleId(§6.1 跨 reload 直写 key) |

> **A.statsOld(聚合摘要) vs B.battles(§6.1 原始归档元数据)关系**: 各取所需不双写——A.statsOld 给**玩家**看跨场收益聚合(掉落/EXP 汇总), 走 Store 同步秒读; B.battles 给**分析**看原始场元数据(configSnapshot/逐回合关联), 走 IndexedDB。二者维度不同, 不合并不互相依赖。

### 5.5 EXP·h/Credit·h 速率(阶段3, 纯函数 `record/rate.ts`)
`ratePerHour(amount, startMs, endMs)`。两口径: 会话(含挂机) + 活跃(`activeMs` 分母, 纯效率)。`statsRateMode` config 选默认。

### 5.6 玩家角色等级(阶段3, best-effort, 决策⑧, 与⑥竞技场准入等级不同)
`record/player-level.ts`: `!inBattle()` 非战斗页**被动**读含 `Level N` 的 DOM(不主动 fetch) → 缓存 `hvab_playerLevel`。纯函数 `parseLevel(text)` 可测; 读不到显示缓存值。

## 6. B 决策调优日志 + IndexedDB(分析向)

**B 订阅者 `record/battle-archive.ts`** —— 逐回合直写(无内存 buffer, 抗 reload):
- `on('battle:round')`(跳过 isRetry) → `idb.add('rounds', round)`(用 `battleId` 关联)
- `on('battle:end')` → `idb.put('battles', 场元数据)`

### 6.1 battleId 生命周期(Important 修订: 跨 reload 一致)
- **只在「检测到 roundNow 倒退 / Initializing 新场」时生成新 battleId** 并立即 `Store.set('curBattleId', id)`。
- **每个 tick 一律从 `Store.get('curBattleId')` 读作直写 key** → reload 后读同一个 → 同场回合归同一 battleId。
- battleCode 首 tick 即使因 rawJson 冷启动缺失而退化(`AR-R?`), 也在拿到准确 roundAll 后**回填 `battles` 记录**(battles 是 `put` 可覆盖); `rounds` 用 battleId 关联, 不受 battleCode 退化影响。
- **"零丢失"限定为**: `rounds` 逐回合直写不丢(抗 reload); battleId 一致性靠 curBattleId 单一真相。

### 6.2 两个 object store(DB `hvab` v1)
```ts
// rounds (keyPath:'rid' autoIncrement; index: byBattle/byCode/byLevel)
interface ArchivedRound {
  rid?; battleId; battleCode; level;
  roundNow; roundAll; turn; ts;
  action: { type; id? }; actionLabel; record: LogRecord;  // 决策(结构化+可读+完整)
  rawJson: string | null;                                  // 当回合 /json 原始
}
// battles (keyPath:'battleId'; index: byLevel/byCode/byTime)
interface ArchivedBattle {
  battleId; battleCode; level; kind;
  startedAt; endedAt; turnCount; roundAll; victorious;
  configSnapshot: Partial<Config>;       // ★ 当时决策参数(架式/技能/喝药/攒炮); battle:end 时浅拷贝 config.all() 相关子集
  summary: { cannonFired; potions; avgOc; stanceRatio; winRate?; bosses; ... };
}
```

### 6.3 IndexedDB 封装(`core/idb.ts`, ~120 行, 不引 npm 包)
`open`(单例)/`add`/`put`/`get`/`getAllByIndex`/`getAll`/`count`/`delete`/`clear`, Promise 化。`window.indexedDB ?? unsafeWindow.indexedDB`。所有操作 try/catch, 写失败仅 console **不影响战斗 loop**。

### 6.4 容量清理
- `archiveMaxBattles`(默认 200): 超出按 `byTime` 删最旧场 + 级联删其 rounds
- `archiveKeepPerLevel`(默认 20): 每准入等级最多留 N 场
- 手动「清空归档」; `QuotaExceeded` 兜底自动 prune 后重试
- Store 存 <1KB `hvab_tuning_index`(各等级场次计数)供视图秒开

## 7. UI

### 7.1 A 收益 tab(panel 加第 5 tab `stats`, 新 `ui/stats.ts`)
顶部卡: 会话时长 · EXP/Credit 总量 · **EXP·h/Credit·h 速率** · 场次/回合/怪数/boss · 玩家 `Lv N`。折叠分区(复用 `group()`): 掉落 · 技能次数 · 伤害 · 受伤(物理/魔法均值) · 回复 · 熟练度(复用 dodying 7 类中文 translation)。按钮: 刷新/重置/导出 JSON/查看 monsterDB。订阅 `battle:end` 增量刷新(仅 tab 可见时)。**`panel.ts` 的 `activeTab` 联合类型 + TABS 数组需加 `'stats'`**。

### 7.2 B 按等级对比视图(扩展 `ui/log.ts` 双模式)
模式1(现有决策日志流, 不动) + 模式2「归档对比」: **准入等级**选择器(`hvab_tuning_index`) → 该等级场次列表(`idb byLevel`) → 选 2+ 场对比 summary(放炮/喝药次数/平均 OC/架式比/胜率/EXP·h) → 点开某场 lazy-load `rounds` 看决策序列 + `configSnapshot`。异步 loading 态, 与同步流隔离。

### 7.3 导出
A 导出 `hvab_stats`+monsterDB JSON; B 导出整场归档(单场 join battles+rounds / 全量 / 按准入等级)。抽 `downloadJSON` 复用。

## 8. config 新增配置项(CONFIG_VERSION 5→6)
```ts
recordEnabled: true,        // A 收益统计总开关
recordArchive: false,       // B 调优日志总开关(重存储, 默认关需主动开)
cacheMonsterHP: true,       // monsterDB 落盘
dropQuality: 6,             // 装备品质门槛(0Crude..7Peerless; 默认6=Legendary起记)
archiveMaxBattles: 200,     // B 最多留几场
archiveKeepPerLevel: 20,    // 每准入等级最多留几场
statsRateMode: 'active',    // 速率口径 'active'|'session'
showPlayerLevel: true,      // 显示玩家角色等级
arenaTiers: [ /* §4.3 的 14 行(常量数据表, 非用户配置; 放 config 便于 HV 改设定时改) */ ],
```
新键纯增量, `{...DEFAULT_CONFIG, ...stored}` 自动补; bump version 触发一次落盘。

## 9. 与现有代码集成点(决策路径零逻辑改动)

| 文件 | 改动 |
|---|---|
| `core/bus.ts` | **零改**(泛型支持) |
| `types.ts` | 加 RoundSample/BattleEnd/StatsAccum/ArchivedRound/ArchivedBattle/ArenaTier + **BusEvents 加 battle:round/battle:end 两条**; LogRecord 加可选 `battleCode?` |
| `core/net-cache.ts`(新) | `lastBattleResponse` + `export getLastBattle()` 抽到此独立模块, 供 main/loop/记录模块 import, **避免 loop↔main 循环依赖** |
| `main.ts` | hookNet 写入改走 net-cache; init 两订阅者; beforeunload flush |
| `loop.ts` | `logger.push` 后**仅真实回合推进时** emit `battle:round`(带 isRetry); 新场/roundNow 倒退处 emit `battle:end`(§3.2); 非战斗分支低频 `tryReadLevel()`; **决策/去抖/busyUntil/stuckN 逻辑零改** |
| `battle/reader.ts` | 零改(复用 parseSpawnHp 正则, 记录模块喂 /json textlog; reader 自身 DOM 解析降级为兜底) |
| `ui/log.ts` | 加「归档对比」模式 |
| `ui/panel.ts` | 加 `stats` tab + activeTab 联合类型加 'stats' |
| `ui/hud.ts` | 可选: 玩家 Lv + 会话 EXP·h |
| `core/config.ts` | §8 新键 + arenaTiers + VERSION 6 |

## 10. 纯度与可测性(无 vitest, tsc + 控制台喂数据)
**纯函数**: `drop-parse.parseDrops`(吃 /json HTML 字符串) · `usage-parse`(吃结构化 action + textlog) · `monster-db.upsert` · `battle-code.{parseRoundFromJson,resolveArenaTier,deriveBattleCode}` · `rate.ratePerHour` · `player-level.parseLevel` · `archive-prune`。`scripts/drive-record.mts` 喂**真实 /json HTML 字符串样本**断言。
**副作用(薄壳)**: stats-collector/battle-archive(订阅 bus 调纯函数)、idb.ts、HTML 取色薄壳、Store 读写。`__hvab` 加 `getStats()/tuning.count()/exportAll()`。

## 11. 风险与边界

| 风险 | 等级 | 缓解 |
|---|---|---|
| **/json `d.exp` 是经验条像素宽+1234 哨兵, 非 EXP 数值** | 已确认(hvc.js.bak L920) | EXP/Credit 真值唯一从 textlog `You gain N EXP/Credit`; 严禁用 d.exp |
| **battle:end 用 continue 触发会把 GF 切成 ~1000 场** | 已确认(loop.ts:172) | 改用 battleId 切换沿 + roundNow 倒退(loop.ts:81-82)判一场(§3.2) |
| **boss 计数无 dodying 等价数据源** | 已确认(reader 无 bossAll) | 用 is_red_boss(reader.ts:188)每波末聚合, RoundSample 带 bossThisWave |
| **汉化改写 DOM textlog 文本** | 高 | 一律从 /json 原始(未汉化英文)解析; DOM 仅缺失兜底 |
| /json textlog[].t 是 HTML 字符串, 取色/取文本需适配 | 中 | 正则抠 `color:rgb` 或 innerHTML 临时节点; drive 样本用真实 /json HTML |
| RB 可能走 ss=ar(非 ss=rb) | 中 | 阶段2 真机确认; 失配兜底(roundAll 不在表→level=null+`AR-R${n}`)已防误塞准入等级 |
| arenaTiers 仅 Lv80-300 | 低 | 显式声明; 失配兜底 level=null; 低/高段玩家不刷 |
| battle:round 含 stalled/安全网重试噪声 | 中 | isRetry 标记 + 仅真实回合推进 emit, 订阅者跳过 |
| battleId 跨 reload 不一致 | 中 | 每 tick 从 Store('curBattleId')读同一 key; battleCode 退化后回填 battles |
| HV 无结构化 round/drop/exp/全局 battle 对象 | 已确认(hvc.js.bak) | 全从 /json textlog HTML 解析 |
| LogRecord 无结构化 type/id | 已确认 | RoundSample 带结构化 action.{type,id}, 不从中文串反解 |

## 12. 分 3 阶段交付(每阶段独立 typecheck + 控制台验证 + 可挂载)
- **阶段 1 · 事件 + A 收益(走 Store, 不碰 IndexedDB)**: net-cache + types 事件 + loop emit(去重) + battle-code(parseRoundFromJson/resolveArenaTier) + drop-parse/usage-parse/monster-db/stats-collector + 收益 tab + config。纯函数同步可测。
- **阶段 2 · B 调优日志(IndexedDB)**: idb.ts + battle-archive(逐回合直写 + battleId 生命周期) + 两 store + 容量清理 + ui/log.ts 按等级对比 + 导出。**前置: 真机 dump /json schema 确认 textlog[].t 内容 + RB URL(ss=rb?)**。
- **阶段 3 · 速率 + 玩家角色等级 + 打磨**: rate 两口径 + player-level + HUD 集成 + 配额边界。

## 13. 文件改动清单

**新增**:
| 文件 | 职责 | 纯/副作用 | 行 | 阶段 |
|---|---|---|---|---|
| `core/net-cache.ts` | lastBattleResponse + getLastBattle(解循环依赖) | 副作用 | ~20 | 1 |
| `core/idb.ts` | IndexedDB Promise 封装 | 副作用 | ~120 | 2 |
| `record/battle-code.ts` | parseRoundFromJson/resolveArenaTier/deriveBattleCode | 纯 | ~80 | 1 |
| `record/drop-parse.ts` | 掉落颜色分类(吃 /json HTML) + EXP/Credit(You gain) | 纯 | ~110 | 1 |
| `record/usage-parse.ts` | 逐回合 usage(结构化 action + textlog) | 纯 | ~130 | 1 |
| `record/monster-db.ts` | monsterDB upsert | 纯 | ~80 | 1 |
| `record/rate.ts` | EXP·h/Credit·h | 纯 | ~30 | 3 |
| `record/player-level.ts` | 玩家角色等级解析+读取 | 纯+壳 | ~50 | 3 |
| `record/archive-prune.ts` | 清理选择 | 纯 | ~40 | 2 |
| `record/stats-collector.ts` | A 订阅者(壳) | 副作用 | ~130 | 1 |
| `record/battle-archive.ts` | B 订阅者(壳, battleId 生命周期) | 副作用 | ~160 | 2 |
| `ui/stats.ts` | A 收益面板 | UI | ~180 | 1 |
| `scripts/drive-record.mts` | 纯函数回归(真实 /json 样本) | 验证 | ~130 | 1 |

**修改**: `types.ts`(~85) · `main.ts`(~10) · `loop.ts`(~20) · `logger.ts`(~3) · `ui/log.ts`(~150) · `ui/panel.ts`(~10) · `ui/hud.ts`(~15) · `ui/styles.ts`(~40) · `core/config.ts`(~28)。

**总量级**: 新增 ~1260 行 + 修改 ~360 行。阶段1 ~750 / 阶段2 ~520 / 阶段3 ~300。
