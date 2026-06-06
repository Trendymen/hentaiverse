# autobattle M3「连刷」设计 — 显式有限状态机(FSM)

> 日期: 2026-06-06 · 状态: 设计已确认, 待写实现计划
> 关联:
> - 总纲: `docs/superpowers/specs/2026-06-04-autobattle-ui-rework-design.md`(§5 engine/ / §6 数据流 / §7 连刷 tab / §8 M3)
> - 剩余清单: `docs/superpowers/plans/2026-06-05-autobattle-remaining-tasks.md`(§3 M3)
> - 独立模块/装配范本: `docs/superpowers/specs/2026-06-05-autobattle-target-weight-design.md`、`autobattle/src/battle/target-weight.ts`
> - 翻写底本: `autobattle/reference/hvAutoAttack.user.js`(dodying 原版)

## 1. 背景与目标

**现状**: M1 地基✅、M2 战斗内🟢 已完成。连刷(M3)只做了 **GF 波次内续战**(清完当前波 → `reader.canContinue`=`!!#btcp` → `executor.continueBattle()` → reload 进下一波)。`engine/` 目录尚未建立, **GF 场间连刷 / 竞技场闲置 / 遭遇战 / 精力** 整体缺失。

> 注: 原 M3 开战 API 研究文档(`plans/2026-06-06-autobattle-m3-startbattle-research.md`)已删除, 本设计基于现存文档 + `reference/` dodying 翻写底本重新落实。

**名词**: **GF = Grindfest(持久战/刷怪场)**, HV 三类开战之一(`?s=Battle&ss=` 取值 `ar`=竞技场 / `rb`=随机 / `gr`=GF)。GF 是连续无限波次的长时挂机刷场, 是本账号(L398 PFUDOR 单手盾战 l2266803)的主力场景。区分两个层级:
- **波次内续战**(一场 GF 之内, 清波→continue 进下一波): M2 已做。
- **GF 场间连刷**(一整场 GF 结束 → 自动再开一场新 GF): M3 要做(dodying 用 `arena.gr` 计数控制连开几场)。

**目标**: 用显式有限状态机实现战斗外连刷编排, 覆盖竞技场闲置刷 + GF 场间连刷 + 遭遇战跨站 + 战前精力门, 忠实翻写 dodying 游戏交互硬事实, 决策逻辑做成纯函数可测, FSM 当前状态在 HUD 可视化便于 GF 真机实测排障。

## 2. 用户已锁定的决策

| # | 决策 | 取值 |
|---|---|---|
| ① | 架构流派 | **显式有限状态机(FSM)**(13 状态; 备选 A 忠实翻写隐式态 / C loop 轻量集成 已否决) |
| ② | M3 范围 | **全做**: 竞技场闲置(1~500/RB) + GF 场间连刷 + **遭遇战跨站(e-hentai)** + 精力 |
| ③ | 精力切分 | **仅战前精力门 + 战前恢复**; 战中精力损失保护留 M4(`watchdog`) |
| ④ | 连刷触发 | **独立开关** `farmEnabled`, 与战斗 `enabled` 解耦 → **二者同开才连刷** |
| ⑤ | 主路径 | 竞技场闲置 + GF 场间 **两条并重、同批实现** |
| ⑥ | POST_BATTLE | **保留为独立状态**(为 M4 掉落统计留钩子) |
| ⑦ | token 收集 | **被动收集 + 必要时单页导航**(不复刻 dodying 离屏 `$ajax.fetch` 多页队列) |

## 3. 架构(read→decide→exec 三段式 + FSM 持久化)

**核心思想**: 把 dodying「靠 localStorage + URL 隐式判断当前该做什么」的散弹式编排, 重构成**一个显式有限状态机**。当前 `farmState` 持久化到 Store —— 因为开战 / 接遭遇 / 恢复精力都触发整页 reload 让脚本重启、内存全失, FSM 必须能从 Store 恢复 state 续跑(与现有 `loop.ts` 里 `cannonCd`/`cannonRound` 跨 reload 持久化同源)。

沿用现有 `battle/` 层的 **read → decide → exec 三段式**, 原样移植到战斗外:

```
page load(任意 HV / e-hentai 页)
  └ main.ts onReady → startLoop() → loop.ts tick()
       nowIn = inBattle()?
       ├ enabled && nowIn          【战斗内, 现有, 零改动】 reader→brain→executor
       └ enabled && farmEnabled && !nowIn  【战斗外, M3 新增】 starter.farmTick()
            farmTick = read → reduce → persist → exec
              ① ctx   = farmReader.read()        读 URL 分类 + Store + DOM token 源(副作用)
              ② state = routeStartup(ctx) ?? ctx.storedState   STARTUP 路由(URL 强信号优先)
              ③ step  = farmReducer(state, ctx, cfg)   纯函数 → {next, action, arena?}
              ④ Store.set('farmState', step.next)  持久化续跑
              ⑤ farmExecutor.exec(step.action)     扒 token/开战 XHR/导航/recover(副作用)
              ⑥ bus.emit('farm:state', {...})      HUD 展示当前状态
```

**新增 `src/engine/` 目录(7 文件)**:

| 文件 | 角色 | 纯度 | 翻写自 / 类比 |
|---|---|---|---|
| `farm-reducer.ts` | 状态转移核心 `farmReducer(state, ctx, cfg)→FarmStep` | **纯函数** | `battle/brain.ts` `decide` |
| `farm-reader.ts` | 读出 `FarmContext`(URL 分类 / Store / DOM token 源), 不决策 | 副作用(读) | `battle/reader.ts` |
| `farm-executor.ts` | 执行 `FarmAction`(扒 token / 开战 XHR / 导航 / recover / 接遭遇) | 副作用(写) | `battle/executor.ts` |
| `starter.ts` | FSM 引擎壳 `farmTick()` + 节奏锁 + STARTUP 路由 + state 持久化/恢复 | 薄编排 | loop 战斗内分支骨架 |
| `stamina.ts` | 精力自然恢复 / 24h 预测 / 门控(纯) + recover(副作用) | 纯+读写 | `checkStamina` L2394 |
| `encounter.ts` | 遭遇记录 / 冷却 / 过期(纯) + 跨站接受拒绝(副作用) | 纯+读写 | `updateEncounter`/`onEncounter`/`getEncounter` |
| `arena.ts` | 竞技场选靶(等级/RB/GF 计数, arrayDone 去重, 每日重置) | **纯函数** | `idleArena` 选靶段 L2570 |

外加 `core/gm-http.ts`(~25 行, 封装 `GM_xmlhttpRequest` POST, 开战/recover 共用)。

**与现有架构关系**:
- **battle 层(reader/brain/executor/strategy/target-weight/tables/bleed-timing)完全零改动** —— M2 刚靠 GF 实测转正, 绝不触碰。
- **loop.ts 是唯一接缝**: 现有 `enabled && nowIn` 战斗内分支后, 新增**互斥**的 `!nowIn` 分支调 `farmTick()`。
- **config 单例只在引擎壳层(starter)读**, 纯函数(reducer/stamina/encounter/arena)收装配好的 cfg 参数(仿现有 `weightCfg(C)`→`WeightConfig`), **不碰单例 → 保证可测**。

**dodying 翻写硬事实复核**(已 grep 核对, 全方案地基):
- 开战(L2643): `$ajax.open('?s=Battle&ss='+href, 'initid='+key+'&inittoken='+token)`。
- `$ajax.open(url,data)`(L144-146) = `fetch(POST url,data).then(goto)`; `goto()`(L610)=`window.location.href=window.location` → **POST 开战后整页 reload**(非导航到新 URL)。
- `$ajax.openNoFetch(url)`(L147-148)=`window.open(url,'_self')` → 纯导航(遭遇跳站、战后回 lastHref)。
- token: GF(L2517)`img[src*=startgrindfest.png]` onclick `init_battle(1,'TOK')`; 竞技场(L2521)`img[src*=startchallenge.png]` onclick `init_battle(\d+,\d+,'TOK')`。
- 精力(L2394-2420)、遭遇(`checkIsHV` L2135 / `updateEncounter` L2424 / `onEncounter` L2472 / `getEncounter` L2195)、编排(`idleArena` L2560 / `updateArena` L2495)、`lastHref` 缓存(L326)、`arena` 形状(L2504-2535)。
- **请求最小间隔 300ms 是封号红线**(L132 注释 `DO NOT DECREASE ... OR YOU WILL GET BANNED`)。

## 4. 状态机核心

### 4.1 状态全集(`FarmState`, 13 个)

| 状态 | 含义 |
|---|---|
| `IDLE` | HV 战斗外页, 连刷开 → 准备下一场 |
| `CHECK_ENCOUNTER` | 开战前先查待处理遭遇(优先级最高) |
| `ENCOUNTER_ENGAGE` | 决定接受遭遇 → 导航去 e-hentai |
| `ENCOUNTER_WAIT` | 已在 e-hentai 站, 等注入分支 accept/reject |
| `CHECK_STAMINA` | 战前精力门(自然恢复 + cost 门控) |
| `RECOVER_STAMINA` | 精力不足且可药补 → recover XHR |
| `PICK_NEXT` | 选下一靶(等级/RB/GF, arrayDone 去重, GF 计数) |
| `STARTING` | 扒 token + 开战 XHR |
| `IN_BATTLE` | 战斗中: FSM 静默, 交 brain/loop 驱动 |
| `POST_BATTLE` | 战斗结束落地 `?s=Battle`, 准备回前页(M4 掉落统计钩子) |
| `RETURN` | `openNoFetch(lastHref)` 回战斗前页 |
| `COOLDOWN` | 精力耗尽/无靶/遭遇满 24 → 定时等待 |
| `STOPPED` | 连刷关或致命错误 → 停机 |

### 4.2 转移图(`⟳` = 触发 reload, next 落 Store 后由脚本重启续跑)

```
STARTUP(每次 load 先跑, URL 强信号 > Store state):
  ├ host===e-hentai.org & ?encounter ──► ENCOUNTER_WAIT
  ├ url 含 ?s=Battle (战斗结束落地) ────► POST_BATTLE
  ├ inBattle() DOM 在 ─────────────────► IN_BATTLE
  └ HV 战斗外普通页 ───────────────────► 恢复 Store state(默认 IDLE)

IDLE ─(开关关)► STOPPED   ─(开)► CHECK_ENCOUNTER
CHECK_ENCOUNTER ─(有遭遇&cd=0&精力够)► ENCOUNTER_ENGAGE  ─(否)► CHECK_STAMINA
ENCOUNTER_ENGAGE ──(导航 e-hentai)⟳──► ENCOUNTER_WAIT
ENCOUNTER_WAIT ─(有链接)accept⟳► IN_BATTLE ─(无/过期)reject⟳► IDLE
CHECK_STAMINA ─(够)► PICK_NEXT
              ─(自然恢复有望,-1)► COOLDOWN(30min)
              ─(今日耗尽,0)► COOLDOWN(次日 UTC)
              ─(可药补)► RECOVER_STAMINA
RECOVER_STAMINA ──(recover XHR)⟳──► CHECK_STAMINA(复查)
PICK_NEXT ─(命中靶)► STARTING ─(今日全清)► COOLDOWN(次日) ─(GF gr≤0)► 跳过再选
STARTING ──(扒 token+开战 XHR)⟳──► IN_BATTLE  (失败/token 缺 → IDLE 重选)
IN_BATTLE ─(仍在)► IN_BATTLE 静默 ─(结束)► POST_BATTLE
POST_BATTLE ──► RETURN ──(openNoFetch lastHref)⟳──► IDLE
COOLDOWN ─(到时/恢复够)► IDLE ─(开关关)► STOPPED
STOPPED ─(重新开)► IDLE
```

### 4.3 跨 reload 恢复

reload 后内存全失, **STARTUP 路由每次 load 先跑**, 优先用 URL 强信号(最可信的「我现在在哪」事实)兜底 Store state:
- `ENCOUNTER_WAIT`(在 e-hentai 站, `host===e-hentai.org` + Store 双确认)
- `IN_BATTLE`(`inBattle()` DOM 直接判定, 不靠 Store)
- `POST_BATTLE`(`url.endsWith('?s=Battle')` 直接判定)
- `CHECK_STAMINA` / `IDLE`(recover/return reload 后落普通 HV 页, 靠 Store `farmState` 续跑)

只有「普通 HV 战斗外页」这种 URL 无强信号时, 才用 Store 存的 `farmState` 续跑 —— 判定收敛到 STARTUP 一处显式路由, 对齐 dodying「URL + localStorage 双判」但更可控。**职责划界**: 「URL 判定」放 STARTUP, 「Store state 续跑」放 reducer, 二者不重叠。

### 4.4 类型契约(`types.ts` 新增)

```ts
export type FarmState = 'IDLE'|'CHECK_ENCOUNTER'|'ENCOUNTER_ENGAGE'|'ENCOUNTER_WAIT'
  |'CHECK_STAMINA'|'RECOVER_STAMINA'|'PICK_NEXT'|'STARTING'|'IN_BATTLE'
  |'POST_BATTLE'|'RETURN'|'COOLDOWN'|'STOPPED';

/** farm-reader 读出的全部环境事实(reducer 唯一输入之一, 纯数据) */
export interface FarmContext {
  page: 'hv-battle-end'|'hv-out'|'in-battle'|'eh-encounter'|'eh-other';
  url: string;
  nowMs: number;            // time(0) 等价
  nowHour: number;          // floor(nowMs/3600_000), 精力自然恢复用
  storedState: FarmState;   // Store 存的上次 state(续跑依据)
  arena: ArenaStore;        // {array, arrayDone, token, gr, date}
  stamina: StaminaSnapshot; // {cached, lastTimeHour, hathperk, has11401, has11402}
  encounter: EncounterRec[];// 去重合并后的今日遭遇记录
  lastEH: number;           // 上次打开 e-hentai 时间
  lastHref: string;         // 战斗前页地址(回前页用)
  hasEventpane: boolean;    // e-hentai 页 #eventpane 在?(新一天/遭遇)
  eventHref?: string;       // eventpane 里的遭遇目标 href 片段
}

export interface ArenaStore {
  array: string[];               // 待战等级列表(arenaLevels 逆序消费)
  arrayDone: (number|string)[];  // 今日已完成(去重)
  token: Record<string, string>; // {等级ID|'gr' → token}
  gr: number;                    // 剩余可开 GF 场数
  date: string;                  // time(2) UTC 日期戳(跨日重置)
}

export interface EncounterRec { href?: string; time: number; encountered?: number; }

export interface StaminaSnapshot {
  cached: number;       // Store 缓存的 stamina
  lastTimeHour: number; // 上次记录的小时戳
  hathperk: boolean;    // 影响 11401 +20/+10
  has11401: boolean; has11402: boolean;
}

/** reducer 输出的副作用意图(纯数据, executor 翻译成 DOM/XHR/导航) */
export type FarmAction =
  | { type:'none'; note?:string }
  | { type:'start-battle'; href:'ar'|'ar&page=2'|'rb'|'gr'; initid:string; token:string; note?:string }
  | { type:'navigate'; url:string; note?:string }       // openNoFetch 等价
  | { type:'recover-stamina'; note?:string }
  | { type:'engage-encounter'; url:string; note?:string }
  | { type:'reject-encounter'; lastHref:string; note?:string }
  | { type:'return'; lastHref:string; note?:string }
  | { type:'persist-arena'; arena:ArenaStore; note?:string }
  | { type:'set-cooldown'; untilMs:number; note?:string };

export interface FarmStep { next: FarmState; action: FarmAction; arena?: ArenaStore; }

/** reducer 配置(从 config 装配, 仿 weightCfg; 纯函数不碰单例) */
export interface FarmReducerCfg {
  farmEnabled: boolean;
  staminaLow: number; staminaLowWithNat: number; staminaEncounter: number;
  restoreStamina: boolean;
  encounterCdMs: number;  // encounterCdMin * 60_000
  autoEncounter: boolean;
  grPerDay: number;
  tickMs: number;
}
```

新增 bus 事件: `BusEvents` 加 `'farm:state': { state: FarmState; note?: string; cdRemainMs?: number }`。

## 5. 业务落地(开战 / 精力 / 遭遇 映射到状态)

### 5.1 开战三件套(`PICK_NEXT` → `STARTING`, 翻写 L2643)

**`PICK_NEXT`**(`arena.ts` 纯函数 `pickNextArena(arena, cfg)`):
- **`arena.array` 构建**: `initArenaCtx` 每日重置(`isNewDay` 触发)时 `split(arenaLevels)` 逆序入 array; 若 arenaLevels 含 `gr` 则同时置 `arena.gr=grPerDay`(GF 场数)、清空 arrayDone。UI「等级勾选」(含 GrindFest 项)即编辑 arenaLevels 串。
- 从 `arena.array` pop 取下一个未 done 的靶。
- href 映射(L2618-2642): GF→`href='gr'`,`initid='1'`,`token=arena.token.gr`, 且 `arena.gr--`(`gr≤0` 时 push `'gr'` 进 arrayDone 跳过再选); 等级 <19→`ar`; 19~104→`ar&page=2`; ≥105(RB)→`rb`; `initid=等级ID`,`token=arena.token[id]`。
- 非 GF 开战前 `arena.arrayDone.push(id)`(L2639)。
- **顺序红线**: reducer 把更新后 arena 放进 `FarmStep.arena` → executor **先 `persist-arena` 落盘、再发开战 XHR**(否则 reload 后 arrayDone 丢失会重复刷同一靶)。

**`STARTING`**(`farm-executor`):
- 扒 token: GF `img[src*=startgrindfest.png]` onclick `/init_battle\(1, *'(.*?)'\)/`; 竞技场 `img[src*=startchallenge.png]` onclick `/init_battle\((\d+),\d+,'(.*?)'\)/` → `{等级ID: token}`。解析抽纯函数 `parseInitBattleToken(onclick)` 可测。
- `gm-http.ts` `GM_xmlhttpRequest` POST `?s=Battle&ss=${href}`, body `initid=${id}&inittoken=${token}`, `Content-Type: application/x-www-form-urlencoded`, `onload` → `location.href=location` reload → `IN_BATTLE`。
- **叠加 300ms 最小请求间隔锁**(封号红线)。

**token 收集策略(决策⑦)**: token 只在 Battle 选择页 DOM 里。`farm-reader` 每次落地选择页时**被动收集**当前页 token 进 `arena.token`; `STARTING` 只用已有 token, 缺则降级 `navigate` 到选择页(主动收集), 下一 tick 再开战。把 dodying 离屏 `$ajax.fetch` 多页并发(L2510-2524), 降成「被动收集 + 必要时单页导航」, 不复刻 `$ajax` 队列系统。代价: token 跨日失效时多 1~2 次 reload。token 跨日由 `arena.date` 重置(`isNewDay`)。

### 5.2 精力战前门(`CHECK_STAMINA` / `RECOVER_STAMINA`, 翻写 L2394-2420)

**仅战前门 + 战前恢复**(战中保护留 M4)。`stamina.ts` 纯函数:
```
computeStamina(snap, nowHour) = snap.cached + (snap.lastTimeHour ? nowHour - snap.lastTimeHour : 0)  // 每小时自然恢复
predictNatural(stamina, nowHour) = stamina + 24 - (nowHour % 24)                                       // 24h 预测
gate(stamina, cost, low, lowWithNat, nowHour): 1 | 0 | -1
  stmNR = predictNatural(stamina, nowHour); nrOk = !cost || (stmNR - cost >= lowWithNat)
  if (stamina - cost >= low && nrOk) return 1   // 够     → PICK_NEXT
  if (!nrOk)                         return -1  // 恢复无望 → COOLDOWN(30min)
  return 0                                       // 今日耗尽 → COOLDOWN(次日 UTC)
```
- `cost` = 靶的精力消耗(`arena.ts` staminaCost 表, HV 非 isekai ×1)。`low` 默认 `staminaLow`; 遭遇门用 `staminaEncounter`。
- 精力数值来源: Store 缓存 + 每小时自然恢复推算; `farm-reader` 落到能读 `#stamina_readout` 的页时刷新缓存 `{value, hourStamp}`。

**`RECOVER_STAMINA`**(L2412-2419): `recover = has11402?5 : has11401?(hathperk?20:10):0`; `recover && stamina≤100-recover` → POST `recover=stamina` ⟳ `CHECK_STAMINA` 复查。`restoreStamina=false` 直接按 gate 走 COOLDOWN。

### 5.3 遭遇战跨站(`CHECK_ENCOUNTER`→`ENCOUNTER_ENGAGE`→`ENCOUNTER_WAIT`)

翻写 `updateEncounter`/`onEncounter`/`checkIsHV`/`getEncounter`:

**`CHECK_ENCOUNTER`**(`encounter.ts` 纯 `computeCooldown(recs, now, lastEH)`, L2429-2438):
```
encountered = recs.filter(e => e.encountered && e.href); count = recs.filter(e => e.href).length
last = recs[0]?.time ?? lastEH ?? 0
if (encountered.length >= 24) cd = floor(recs[0].time/1d + 1)*1d - now  // 满24 → 次日 UTC
else if (!last)               cd = 0
else                          cd = 30min + last - now
cd = max(0, cd)
```
`autoEncounter && cd=0 && 有可接 && 精力够(staminaEncounter)` → `ENCOUNTER_ENGAGE`; 否则 → `CHECK_STAMINA`(跳过遭遇)。

**`ENCOUNTER_ENGAGE`**: `openNoFetch('https://e-hentai.org/news.php?encounter')` ⟳ `ENCOUNTER_WAIT`。

**`ENCOUNTER_WAIT`**(e-hentai 注入, `host===e-hentai.org`, `@match` 已含): `setValue('lastEH', now)`; 读 `#eventpane>div>a` href 第 4 段 = url:
- `url===undefined` → 新一天 → 清空 encounter。
- 有未接 url → **accept**: `openNoFetch(${hvOrigin}/${url})` ⟳ `IN_BATTLE`(跳回 HV 进遭遇战斗)。
- 无 url → **reject**: `openNoFetch(lastHref)` ⟳ `IDLE`(过期/无遭遇回 HV)。
- 战斗中遭遇 → `IN_BATTLE` 不处理, 战后回 HV 再 `CHECK_ENCOUNTER`。

**`getEncounter` 去重合并**(纯 `mergeEncounters(current, stored, today)`, L2195): 按 href 字典合并、取 max time、按当日过滤(`time(2)===today`)、time 降序 —— 化解 e-hentai↔HV 跨站并发写不丢不重。**依赖 GM 存储跨域共享**(localStorage 不跨域; `@grant GM_getValue/setValue` 已有)。

## 6. config 新增键(`CONFIG_VERSION` 3→4)

开关类默认 **false**(安全/灰度优先, 主动开启), 阈值类贴 dodying placeholder:

| 键 | 默认 | 含义 |
|---|---|---|
| `farmEnabled` | `false` | **连刷独立开关**(与 `enabled` 解耦, 二者同开才连刷) |
| `autoEncounter` | `false` | 自动接受遭遇战(跨站, 默认关需主动开) |
| `restoreStamina` | `false` | 战前精力不足是否喝药恢复(消耗道具, 默认关) |
| `farmTickMs` | `1500` | 连刷 tick 节奏(≥300ms 红线, 留余量) |
| `grPerDay` | `3` | GF 每日开场数(`arena.gr` 初值, 跨日重置) |
| `arenaLevels` | `''` | 待战等级/RB 逗号串(逆序消费); 可含特殊值 `gr` 代表 GF(GF 场数另由 `grPerDay` 控制) |
| `staminaLow` | `60` | 开战精力下限 |
| `staminaEncounter` | `60` | 遭遇战精力下限 |
| `staminaLowWithNat` | `0` | 含 24h 自然恢复的下限 |
| `encounterCdMin` | `30` | 遭遇常规冷却(分钟) |
| `staminaHathperk` | `false` | 精力 hathperk(影响 11401 恢复 +20/+10) |

新键纯增量, `{...DEFAULT_CONFIG, ...stored}` 自动补默认, 迁移块只 bump version + 落盘一次, **不加 force 覆盖行**(保留 v3 三条强制覆盖不动)。装配函数 `farmCfg(C): FarmReducerCfg`(仿 `weightCfg`)从 config 摘键传给纯 reducer。

## 7. 连刷 tab UI + HUD 状态展示

`panel.ts` `farmPane()` 替换占位 `section('连刷... 待 M3 接入')`, 100% 复用 `components.ts` 的 `group/swRow/numRow`:
```
group('连刷总控', swRow('farmEnabled','启用连刷(需同时开战斗🧠)'))
group('竞技场/GF', numRow('grPerDay','GF每日场数'), …等级勾选/文本)
group('精力(战前门)', swRow('restoreStamina'), numRow('staminaLow'),
                      numRow('staminaEncounter'), numRow('staminaLowWithNat'))
group('遭遇战', swRow('autoEncounter'), numRow('encounterCdMin'))
group('节奏', numRow('farmTickMs'))
```
- **HUD 显当前 FSM 状态**(方案 B 卖点): `starter` tick 后 `bus.emit('farm:state', {state, note, cdRemainMs})`, `hud.ts` 战斗外显示「连刷:`CHECK_STAMINA` · cd 12:34」。
- 等级列表(1~500/RB 逗号串): 现有控件无文本行 → M3 先用 config 默认串承载, `textRow` 作为 `components.ts` 小增量(~12 行)或二期, 不阻塞核心。

## 8. 与 loop.ts 集成

```ts
// tick() 内, 现有战斗内 if 之后:
else if (config.get('enabled') && config.get('farmEnabled') && !nowIn) {
  farmTick();   // engine/starter.ts; 内部自带 farmBusyUntil 节奏锁 + STARTUP 路由
}
```
- **互斥**: `nowIn` 已算, true 走战斗分支、false 才连刷。`IN_BATTLE` 态在 `nowIn=true` 期间不被 farmTick 驱动(走战斗分支), 自然静默; `IN_BATTLE→POST_BATTLE` 由「战斗结束 reload 落 `?s=Battle`」的 STARTUP 路由完成。
- **复用退出去抖** `EXIT_FALSE_STREAK=4`: 防 reload 后战斗 DOM 延迟 ~308ms 误判退出而错误开下一场 —— farm 分支只在确认离开战斗后才动作。
- **节奏锁**: `starter` 维护 `farmBusyUntil`, 每 tick 后 `+farmTickMs`, 锁内重复调用 return(复用 loop `busyUntil` 手法)。
- **驱动来源**: MutationObserver 监听 `#battle_main` 在战斗外不触发 → farm 分支主要靠 `slowPoll`; 建议 `slowPoll` 在 `!inBattle()` 时间隔放宽到 `farmTickMs`。`COOLDOWN` 态用 `set-cooldown` 存 `untilMs`, tick 比较 `now>=untilMs` 才转 `IDLE`, 期间廉价 return。
- **封号红线**: 任何发请求/导航的 action 经 executor 300ms 最小间隔锁 + `farmTickMs` 双节流。

## 9. 纯度与可测性

**纯函数(可单测, 输入即依赖, 零 DOM/零 Store/零 config 单例, 对齐 `target-weight.ts`)**:
- `farmReducer(state, ctx, cfg)→FarmStep`(核心, 喂 `(state, ctx, cfg)` 断言 `{next, action}`)
- `stamina.ts`: `computeStamina` / `predictNatural` / `gate` / `pickRecoverItem`
- `encounter.ts`: `computeCooldown` / `mergeEncounters` / `isExpired` / `pickEngageable`
- `arena.ts`: `pickNextArena` / `mapHref` / `markDone` / `isNewDay` / `initArenaCtx`
- `parseInitBattleToken(onclick)` / `parseStaminaReadout(text)`(字符串→结构)

**副作用(薄壳, 逻辑尽量榨进纯函数)**: `farm-reader.read`(DOM/URL/Store)、`farm-executor.exec`(扒 token/`gm-http` POST/导航/Store 写)、`starter.farmTick`(read→persist→exec 三步串联)。

**不引入 vitest**(项目纪律, 同 delayed-bleed): 纯函数设计成可控制台 import 喂数据验证; 诊断量就地 `console.log('[HVAB:farm]', {state, action, cd})`(仿现有 `[HVAB:bleed]` 范式)。`__hvab` 调试接口可加 `getFarm: ()=>Store.get('farmState')` 等暴露 farm 上下文。

## 10. 风险与边界

| 风险 | 等级 | 缓解 |
|---|---|---|
| **状态机映射工作量**(把 dodying L2135~2700 ~560 行隐式逻辑无遗漏映射成 13 状态) | 高 | 每个 dodying 函数 → 一个纯子模块(stamina/encounter/arena)逐个翻写+验证, 再由 reducer 编排; 先翻纯子模块(可独立测), 最后接 reducer |
| **请求限流封号**(开战/recover/遭遇高频导航) | 高 | `gm-http` 300ms 最小间隔 + `farmTickMs≥1500` 双节流; COOLDOWN 廉价空转 |
| **跨站 Store 丢失**(localStorage 不跨域) | 中 | 明确依赖 GM 存储(@grant 已有); STARTUP 加跨站 URL 强信号兜底 |
| **token 跨日失效 / 收集降维多 reload** | 中 | `arena.date` 跨日重置 token; 开战失败(响应非战斗页)强制重扒; 接受多 1~2 reload 可接受 |
| **`?s=Battle` 结束页判定边界**(漏判→不回前页卡死) | 中 | STARTUP `url.endsWith('?s=Battle')` → POST_BATTLE; GF 真机必测 |
| **同回合主/被动掉血等战斗内边界** | — | 不在 M3 范围(战斗内 M2 已处理) |
| **等级选择 UI 简化**(逗号串非多选矩阵) | 低 | 功能等价, 标注已知取舍; textRow 二期 |
| `farmEnabled=false` | — | farm 分支整条不进 → 纯旁路, 零回归; 一键灰度退回纯战斗 |

## 11. 文件改动清单

**新增**(`src/engine/` + `core/gm-http.ts`, ~1105 行):

| 文件 | 行数 | 性质 |
|---|---|---|
| `autobattle/src/engine/farm-reducer.ts` | ~180 | 纯 |
| `autobattle/src/engine/farm-reader.ts` | ~120 | 副作用读 |
| `autobattle/src/engine/farm-executor.ts` | ~150 | 副作用写 |
| `autobattle/src/engine/starter.ts` | ~140 | 引擎壳 |
| `autobattle/src/engine/stamina.ts` | ~110 | 纯+读写 |
| `autobattle/src/engine/encounter.ts` | ~160 | 纯+读写 |
| `autobattle/src/engine/arena.ts` | ~130 | 纯 |
| `autobattle/src/core/gm-http.ts` | ~25 | 副作用 |

**修改**(~+155 行):

| 文件 | 改动 | 行数 |
|---|---|---|
| `autobattle/src/types.ts` | Farm 契约(FarmState/FarmContext/FarmAction/FarmStep/FarmReducerCfg/ArenaStore/EncounterRec/StaminaSnapshot) + BusEvents `farm:state` | +70 |
| `autobattle/src/core/config.ts` | §6 的 11 键 + CONFIG_VERSION 3→4 + 迁移块落盘行 | +15 |
| `autobattle/src/loop.ts` | `tick()` 加 `!nowIn` farm 分支; `slowPoll` 战斗外间隔放宽 | +10 |
| `autobattle/src/ui/panel.ts` | `farmPane()` 替换占位 | +30 |
| `autobattle/src/ui/hud.ts` | 订阅 `farm:state`, 战斗外展示当前状态 + cd | +15 |
| `autobattle/src/global.d.ts` | 若 `GM_xmlhttpRequest` 类型缺则补声明 | +5 |

**不动**: `battle/*` 全部、`core/store.ts`、`core/bus.ts`(仅扩 BusEvents 类型)、`core/dom.ts`、`core/logger.ts`、`main.ts`(@match/@grant/@connect 已含 e-hentai.org)。

## 12. 验收方式

- `npm run typecheck`(`tsc --noEmit`)通过 + vscode-mcp-server diagnostics 清洁(改动文件)。
- `npm run build` 产单 `dist/hv-autobattle.user.js`(不压缩可调试) + `node --check` 通过。
- 纯函数逐个控制台喂数据验证(reducer 全状态转移、stamina gate 三态、encounter 冷却三档、arena 选靶/每日重置)。
- GF 真机实测肉眼核对: 连刷独立开关(需双开)、GF 场间自动续刷、竞技场闲置刷、精力门(够则开/不够 COOLDOWN/可药补恢复)、遭遇战跨站(接受/拒绝/过期/24次冷却)、HUD 当前 FSM 状态显示。
- 连刷行为对齐 dodying(以 `reference/` 逐项核对); `farmEnabled=false` 零回归确认。

## 13. 落到 writing-plans 的 TDD 拆分建议

1. **纯子模块先行**(可独立验证, 零依赖): `stamina.ts`(gate/computeStamina/predict) → `encounter.ts`(computeCooldown/mergeEncounters) → `arena.ts`(pickNextArena/mapHref/isNewDay)。
2. **契约 + config**: `types.ts` 加 Farm 契约、`config.ts` 加键 + version bump(先让 tsc 过)。
3. **reducer**: `farm-reducer.ts` 编排纯子模块, 喂 ctx 断言全状态转移(核心验证集)。
4. **副作用层**: `farm-reader.ts`(URL/Store/DOM 读, 含 parseInitBattleToken/parseStaminaReadout) + `farm-executor.ts`(gm-http POST/导航/扒 token) + `core/gm-http.ts`。
5. **引擎壳 + 集成**: `starter.ts` 串联 + `loop.ts` 加 `!nowIn` 分支。
6. **UI**: `panel.ts` farm tab + `hud.ts` 状态展示。
