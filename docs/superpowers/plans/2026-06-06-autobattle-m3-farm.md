# M3 连刷(显式状态机)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 HV autobattle 实现 M3「连刷」——竞技场闲置(1~500/RB) + GF 场间连刷 + 遭遇战跨站(e-hentai) + 战前精力门，由一个显式有限状态机(13 状态)驱动，battle 层零改动。

**Architecture:** 显式 FSM + `read→decide→exec` 三段式(对齐现有 battle 层)。`farmReducer` 纯函数做状态转移；`farm-reader` 读 `FarmContext`；`farm-executor` 执行 `FarmAction`(扒 token/开战 XHR/导航/恢复)；`starter` 是引擎壳(`farmTick` = read→reduce→persist→exec)。当前 `farmState` 持久化到 Store，因开战/接遭遇/恢复都触发整页 reload，FSM 从 Store 恢复续跑(同现有 `cannonCd` 跨 reload 范式)。loop 仅加一个 `!nowIn` 分支调 `farmTick`。

**Tech Stack:** TypeScript · vite-plugin-monkey · `GM_xmlhttpRequest`(开战 POST) · 无 vitest(验证用 `npm run typecheck` + 控制台喂数据 + GF 真机实测，对齐 M1/M2 范式)。

**关联设计:** `docs/superpowers/specs/2026-06-06-autobattle-m3-farm-design.md`。翻写底本: `autobattle/reference/hvAutoAttack.user.js`(行号见各 task)。

---

## 文件结构

**新增** `autobattle/src/engine/`(纯函数模块对齐 `battle/target-weight.ts` 纪律: 零 DOM/零 config 单例/零 Store)：

| 文件 | 职责 | 纯度 |
|---|---|---|
| `engine/stamina.ts` | 精力自然恢复/24h 预测/门控/cost 计算 | 纯 |
| `engine/encounter.ts` | 遭遇记录合并去重/冷却/选靶 | 纯 |
| `engine/arena.ts` | 竞技场选靶(等级/RB/GF 计数, arrayDone 去重, 每日重置, href 映射, token 解析) | 纯 |
| `engine/farm-reducer.ts` | 状态转移核心 `farmReducer(state, ctx, cfg)→FarmStep` | 纯 |
| `engine/farm-reader.ts` | 读 `FarmContext`(URL 分类/Store/DOM, 选择页被动收集 token, e-hentai 注入) | 副作用(读) |
| `engine/farm-executor.ts` | 执行 `FarmAction`(开战 XHR/导航/recover/cooldown) | 副作用(写) |
| `engine/starter.ts` | FSM 引擎壳 `farmTick`/`routeStartup`/`farmCfg`/节奏锁 | 薄编排 |
| `core/gm-http.ts` | `gmPost` 封装 `GM_xmlhttpRequest` + 300ms 最小间隔(封号红线) | 副作用 |

**修改**: `types.ts`(Farm 契约 + BusEvents) · `core/config.ts`(11 键 + CONFIG_VERSION 4→5) · `loop.ts`(`!nowIn` 分支) · `ui/panel.ts`(farmPane) · `ui/hud.ts`(farm:state 展示) · `src/global.d.ts`(GM_xmlhttpRequest 声明)。

**不动**: `battle/*` 全部、`core/store.ts`、`core/bus.ts`、`core/dom.ts`、`core/logger.ts`、`main.ts`。

**Store 键(前缀 `hvab_`)**: `farmState`(FarmState) · `arena`(ArenaStore) · `stamina`(number) · `staminaTime`(number 小时戳) · `encounter`(EncounterRec[]) · `lastEH`(number) · `lastHref`(string) · `hvUrl`(string) · `farmCooldownUntil`(number)。

---

## Task 1: types.ts 加 Farm 类型契约

**Files:**
- Modify: `autobattle/src/types.ts`(尾部追加 + BusEvents 内追加一行)

- [ ] **Step 1: 在 `BusEvents` 接口里加 farm 事件**

把 `BusEvents` 接口(现 L127-133)改为追加 `'farm:state'`：

```typescript
/** 事件总线事件表 */
export interface BusEvents {
  'state:update': VitalSnapshot;
  'hud:update': HudData;
  'log:update': LogRecord | null;
  'ui:toggle': boolean;
  'battle:active': boolean; // loop 检测 inBattle 跨 tick 变化: true=进战斗(下一轮恢复日志窗口), false=退出战斗(关窗口+清记忆)
  'farm:state': FarmHud; // M3 连刷: 当前 FSM 状态 → HUD 战斗外展示
}
```

- [ ] **Step 2: 在文件尾部(L175 之后)追加 M3 Farm 契约**

```typescript

// ── M3 连刷(farm)类型. 详见 specs/2026-06-06-autobattle-m3-farm-design.md ──

/** 连刷有限状态机的 13 个状态 */
export type FarmState =
  | 'IDLE' // HV 战斗外页, 连刷开 → 准备下一场
  | 'CHECK_ENCOUNTER' // 开战前先查待处理遭遇(优先级最高)
  | 'ENCOUNTER_ENGAGE' // 决定接受遭遇 → 导航去 e-hentai
  | 'ENCOUNTER_WAIT' // 已在 e-hentai 站, 等注入分支 accept/reject
  | 'CHECK_STAMINA' // 战前精力门
  | 'RECOVER_STAMINA' // 精力不足且可药补 → recover XHR
  | 'PICK_NEXT' // 选下一靶(等级/RB/GF, arrayDone 去重, GF 计数)
  | 'STARTING' // 扒 token + 开战 XHR(发出即 reload)
  | 'IN_BATTLE' // 战斗中: FSM 静默, 交 brain/loop 驱动
  | 'POST_BATTLE' // 战斗结束落地 ?s=Battle, 准备回前页(M4 掉落统计钩子)
  | 'RETURN' // openNoFetch(lastHref) 回战斗前页
  | 'COOLDOWN' // 精力耗尽/无靶/遭遇满 24 → 定时等待
  | 'STOPPED'; // 连刷关或致命错误 → 停机

/** farm-reader 对当前页的分类 */
export type FarmPage =
  | 'in-battle' // inBattle() DOM 在
  | 'hv-battle-end' // url.endsWith('?s=Battle') 战斗结束落地
  | 'hv-out' // 其他 HV 页(含 ?s=Battle&ss=xx 选择页)
  | 'eh-encounter'; // host===e-hentai.org

/** 竞技场连刷上下文(Store 'arena' 键; 每日重置). 翻写 dodying arena 对象 L2504-2535 */
export interface ArenaStore {
  array: string[]; // 待战等级/RB 列表(arenaLevels split + reverse; 持久不变, 靠 arrayDone 去重)
  arrayDone: (number | string)[]; // 今日已完成(去重)
  token: Record<string, string>; // {等级ID|'gr' → token}
  gr: number; // 剩余可开 GF 场数
  date: number; // time(0) ms; UTC 同日判定用
}

/** 遭遇战一条记录. 翻写 dodying encounter 元素 */
export interface EncounterRec {
  href?: string;
  time: number;
  encountered?: number;
}

/** 精力快照(farm-reader 从 Store + DOM 读出; M3 不检测库存药, 故无 has11401/has11402) */
export interface StaminaSnapshot {
  cached: number; // Store 缓存的 stamina
  lastTimeHour: number; // 上次记录的小时戳(floor(ms/3600000))
  hathperk: boolean; // 影响盲发恢复量预估(+20/+10)
}

/** farm-reducer 唯一输入(纯数据快照) */
export interface FarmContext {
  page: FarmPage;
  url: string;
  host: string;
  hvOrigin: string; // HV 站 origin(engage 拼 url 用)
  nowMs: number;
  nowHour: number; // floor(nowMs/3600000)
  storedState: FarmState; // Store 存的上次 state(续跑依据)
  arena: ArenaStore;
  stamina: StaminaSnapshot;
  encounter: EncounterRec[]; // 去重合并后的今日遭遇记录
  lastEH: number; // 上次打开 e-hentai 时间
  lastHref: string; // 战斗前页地址(回前页用)
  eventHref?: string; // e-hentai eventpane 里的遭遇目标 href 片段
  cooldownUntil: number; // COOLDOWN 到期时戳
}

/** farm-reducer 输出的副作用意图(纯数据; executor 翻译成 XHR/导航/Store) */
export type FarmAction =
  | { type: 'none'; note?: string }
  | { type: 'start-battle'; href: 'ar' | 'ar&page=2' | 'rb' | 'gr'; initid: string; token: string; note?: string }
  | { type: 'navigate'; url: string; note?: string } // openNoFetch 等价(engage/reject/return 共用)
  | { type: 'recover-stamina'; note?: string }
  | { type: 'set-cooldown'; untilMs: number; note?: string };

/** reducer 输出 */
export interface FarmStep {
  next: FarmState;
  action: FarmAction;
  arena?: ArenaStore; // 更新后的 arena(starter 落盘)
}

/** reducer 配置(starter 从 config 装配; 纯函数不碰单例, 仿 weightCfg) */
export interface FarmReducerCfg {
  farmEnabled: boolean;
  autoEncounter: boolean;
  restoreStamina: boolean;
  staminaLow: number;
  staminaLowWithNat: number;
  staminaEncounter: number;
  encounterCdMs: number; // encounterCdMin * 60000
  grPerDay: number;
  arenaLevels: string;
  staminaHathperk: boolean;
}

/** HUD 展示的连刷状态 */
export interface FarmHud {
  state: FarmState;
  note?: string;
  cdRemainMs?: number;
}
```

- [ ] **Step 3: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS(无输出)。`FarmHud` 在 BusEvents 引用、定义在同文件，TS 不要求前置声明，通过。

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/types.ts
git commit -m "feat(autobattle): M3 farm 类型契约(FarmState/Context/Action/Step + BusEvents farm:state)"
```

---

## Task 2: config.ts 加连刷配置键 + CONFIG_VERSION 4→5

**Files:**
- Modify: `autobattle/src/core/config.ts`

- [ ] **Step 1: 在 `DEFAULT_CONFIG` 尾部(L75 `BLEED_MIN_RATE` 行之后、L76 `}` 之前)追加连刷键**

```typescript
  // ── M3 连刷(farm; 详见 specs/2026-06-06-autobattle-m3-farm-design.md)──
  farmEnabled: false, // 连刷独立开关(与 enabled 解耦; 二者同开才连刷)
  autoEncounter: false, // 自动接受遭遇战(跨站 e-hentai; 默认关需主动开)
  restoreStamina: false, // 战前精力不足喝药恢复(消耗道具; 默认关; M3 盲发, 库存检测留 M4)
  farmTickMs: 1500, // 连刷 tick 节奏(≥300ms 服务器红线, 留余量)
  grPerDay: 3, // GF 每日开场数(arena.gr 初值, 跨日重置)
  arenaLevels: '', // 待战等级/RB 逗号串(逆序消费); 可含 'gr' 代表 GF
  staminaLow: 60, // 开战精力下限
  staminaEncounter: 60, // 遭遇战精力下限
  staminaLowWithNat: 0, // 含 24h 自然恢复的下限
  encounterCdMin: 30, // 遭遇常规冷却(分钟)
  staminaHathperk: false, // 精力 hathperk(影响盲发恢复量预估 +20/+10)
```

- [ ] **Step 2: 把 `CONFIG_VERSION` 由 4 改为 5**

改 L85：

```typescript
const CONFIG_VERSION = 5;
```

迁移块(L86-93)**不加新 force 行**——M3 新键纯增量, `{...DEFAULT_CONFIG, ...stored}` 已自动补默认值; bump 到 5 触发现有 `Store.set('config', current)` 把新键落盘一次即可。现有 v4 的四条 force 覆盖保留不动(对已是 v4 的存档幂等无害)。

- [ ] **Step 3: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。新键并入 `DEFAULT_CONFIG` → `Config` 类型自动含这些键。

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/core/config.ts
git commit -m "feat(autobattle): config 加 M3 连刷键 + CONFIG_VERSION 4→5"
```

---

## Task 3: engine/stamina.ts(纯函数)

**Files:**
- Create: `autobattle/src/engine/stamina.ts`

翻写 dodying `checkStamina`(L2394-2422) + `staminaCost` 表(L2594-2610)。

- [ ] **Step 1: 写 stamina.ts**

```typescript
// 精力(Stamina)纯函数 + 战前门. 翻写 dodying checkStamina hvAutoAttack.user.js:2394-2422 + staminaCost 表 L2594-2610.
// 零 DOM/零 Store/零 config 单例: now/snapshot/cfg 全部传入, 可控制台喂数据验证(对齐 target-weight.ts).
import type { StaminaSnapshot, FarmReducerCfg } from '../types';

/** dodying staminaCost 原始基值表(等级→基值; 105-112=RB 各 1). 翻写 L2594-2606. */
export const STAMINA_COST: Record<string, number> = {
  1: 2, 3: 4, 5: 6, 8: 8, 9: 10, 11: 12, 12: 15, 13: 20, 15: 25, 16: 30,
  17: 35, 19: 40, 20: 45, 21: 50, 23: 55, 24: 60, 26: 65, 27: 70, 28: 75, 29: 80,
  32: 85, 33: 90, 34: 95, 35: 100,
  105: 1, 106: 1, 107: 1, 108: 1, 109: 1, 110: 1, 111: 1, 112: 1,
};

/** 当前精力 = 缓存 + 每小时自然恢复. 翻写 L2397-2400. */
export function computeStamina(snap: StaminaSnapshot, nowHour: number): number {
  return snap.cached + (snap.lastTimeHour ? nowHour - snap.lastTimeHour : 0);
}

/** 24h 自然恢复预测. 翻写 L2401. */
export function predictNatural(stamina: number, nowHour: number): number {
  return stamina + 24 - (nowHour % 24);
}

/** 单靶精力消耗. 翻写 L2594-2610: 基值 × (isekai?2:1) × (stamina>=60?0.03:0.02); GF 额外 +1. */
export function computeCost(key: string, stamina: number, grCount: number, isIsekai: boolean): number {
  const base = key === 'gr' ? grCount : STAMINA_COST[key] ?? 0;
  const cost = base * (isIsekai ? 2 : 1) * (stamina >= 60 ? 0.03 : 0.02);
  return key === 'gr' ? cost + 1 : cost;
}

/** 精力门. 翻写 L2403-2410: 1=够 / 0=今日耗尽 / -1=自然恢复不够. */
export function gate(stamina: number, cost: number, low: number, lowWithNat: number, nowHour: number): 1 | 0 | -1 {
  const stmNR = predictNatural(stamina, nowHour);
  const nrOk = !cost || stmNR - cost >= lowWithNat;
  if (stamina - cost >= low && nrOk) return 1;
  if (!nrOk) return -1;
  return 0;
}

/** 是否盲发恢复(M3: 不检测库存药, restoreStamina 开 + 精力低于 100-恢复量 即发; 库存检测留 M4). 翻写 L2412-2418 简化. */
export function shouldRecover(snap: StaminaSnapshot, stamina: number, cfg: FarmReducerCfg): boolean {
  if (!cfg.restoreStamina) return false;
  const recover = snap.hathperk ? 20 : 10;
  return stamina <= 100 - recover;
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: 控制台验证(可选, 装 build 后在 devtools 跑)**

```js
// gate: 精力 50, cost 3, low 60 → -1 或 0
import('/* 模块路径 */').then(m => {
  console.log(m.gate(50, 3, 60, 0, 100)); // 期望 0(stamina-cost=47<60, 但 stmNR 够)
  console.log(m.gate(80, 3, 60, 0, 100)); // 期望 1(够)
  console.log(m.computeCost('35', 80, 3, false)); // 期望 100×1×0.03=3
  console.log(m.computeCost('gr', 80, 3, false)); // 期望 3×0.03+1=1.09
});
```

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/engine/stamina.ts
git commit -m "feat(autobattle): engine/stamina 精力纯函数(翻写 checkStamina + staminaCost)"
```

---

## Task 4: engine/encounter.ts(纯函数)

**Files:**
- Create: `autobattle/src/engine/encounter.ts`

翻写 dodying `getEncounter`(L2195-2212) + `updateEncounter` 冷却(L2429-2438)。

- [ ] **Step 1: 写 encounter.ts**

```typescript
// 遭遇战(Encounter)纯函数. 翻写 dodying getEncounter hvAutoAttack.user.js:2195-2212 + updateEncounter 冷却 L2429-2438.
// 零 DOM/零 Store: now/recs 传入, 可控制台喂数据验证.
import type { EncounterRec } from '../types';

const MS_PER_HOUR = 3600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** UTC 同日判定(dodying time(2) 等价). */
export function isSameUtcDay(aMs: number, bMs: number): boolean {
  return Math.floor(aMs / MS_PER_DAY) === Math.floor(bMs / MS_PER_DAY);
}

/** 只保留当日记录(getToday, 翻写 L2196). */
export function filterToday(recs: EncounterRec[], nowMs: number): EncounterRec[] {
  return recs.filter((e) => isSameUtcDay(e.time, nowMs));
}

/** 合并 current+stored 去重(getEncounter, 翻写 L2195-2212): 按 href 取 max time/encountered, 当日过滤, time 降序. */
export function mergeEncounters(current: EncounterRec[], stored: EncounterRec[], nowMs: number): EncounterRec[] {
  const dict: Record<string, EncounterRec> = {};
  for (const e of current) dict[e.href ?? 'newDawn'] = { ...e };
  for (const e of stored) {
    const key = e.href ?? 'newDawn';
    if (!dict[key]) dict[key] = { ...e };
    dict[key].time = Math.max(dict[key].time, e.time);
    dict[key].encountered = e.encountered || dict[key].encountered ? Math.max(dict[key].encountered ?? 0, e.encountered ?? 0) : undefined;
  }
  return filterToday(Object.values(dict), nowMs).sort((x, y) => y.time - x.time);
}

/** 冷却(翻写 updateEncounter L2429-2438): 满24→次日UTC / 从未→0 / 否则→cdMs(30min). */
export function computeCooldown(recs: EncounterRec[], nowMs: number, lastEH: number, cdMs: number): number {
  const encountered = recs.filter((e) => e.encountered && e.href);
  const last = recs[0]?.time ?? lastEH ?? 0;
  let cd: number;
  if (encountered.length >= 24) cd = Math.floor(recs[0].time / MS_PER_DAY + 1) * MS_PER_DAY - nowMs;
  else if (!last) cd = 0;
  else cd = cdMs + last - nowMs;
  return Math.max(0, cd);
}

/** 选第一个未接受的遭遇 href(翻写 checkIsHV L2168-2173). */
export function pickEngageable(recs: EncounterRec[]): string | undefined {
  for (const e of recs) {
    if (e.encountered) continue;
    if (e.href) return e.href;
  }
  return undefined;
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: 控制台验证(可选)**

```js
// 从未遭遇 → cd=0; 30min 内有遭遇 → cd>0
m.computeCooldown([], 1000 * 3600 * 100, 0, 1800000); // 期望 0
m.computeCooldown([{href:'x', time: 1000*3600*100}], 1000*3600*100 + 60000, 0, 1800000); // 期望 ~1740000(还剩29min)
m.pickEngageable([{href:'a', time:1, encountered:1}, {href:'b', time:2}]); // 期望 'b'
```

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/engine/encounter.ts
git commit -m "feat(autobattle): engine/encounter 遭遇战纯函数(翻写 getEncounter + 冷却)"
```

---

## Task 5: engine/arena.ts(纯函数)

**Files:**
- Create: `autobattle/src/engine/arena.ts`

翻写 dodying `idleArena` 选靶段(L2570-2645) + `updateArena` 日重置(L2522-2533) + token 正则(L2517-2522)。

- [ ] **Step 1: 写 arena.ts**

```typescript
// 竞技场选靶(Arena)纯函数. 翻写 dodying idleArena 选靶 hvAutoAttack.user.js:2570-2645 + updateArena 日重置 L2522-2533 + token 正则 L2517-2522.
// 零 DOM/零 Store: arena 快照 + cfg 传入, 可控制台喂数据验证.
import type { ArenaStore } from '../types';

const MS_PER_DAY = 24 * 3600_000;

/** 跨日判定(arena.date 与 now 不同 UTC 日). 翻写 updateArena isToday L2503. */
export function isNewDay(arena: ArenaStore, nowMs: number): boolean {
  if (!arena.date) return true;
  return Math.floor(arena.date / MS_PER_DAY) !== Math.floor(nowMs / MS_PER_DAY);
}

/** 每日重置 arena(翻写 updateArena L2522-2533): arenaLevels split+reverse 入 array; gr=grPerDay; arrayDone 清空; token 保留(由 reader 收集). */
export function initArenaCtx(prev: ArenaStore | null, arenaLevels: string, grPerDay: number, nowMs: number): ArenaStore {
  const array = arenaLevels
    ? arenaLevels.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  array.reverse();
  return { array, arrayDone: [], token: prev?.token ?? {}, gr: grPerDay, date: nowMs };
}

/** id → href 映射(翻写 idleArena L2618-2632): gr / ≥105=rb / ≥19=ar&page=2 / 其余=ar. */
export function mapHref(key: string): 'ar' | 'ar&page=2' | 'rb' | 'gr' {
  if (key === 'gr') return 'gr';
  const n = Number(key);
  if (n >= 105) return 'rb';
  if (n >= 19) return 'ar&page=2';
  return 'ar';
}

/** 从 GF 按钮 onclick 扒 token. 翻写 L2517: init_battle(1, 'TOK'). */
export function parseGrToken(onclick: string): string | null {
  const m = onclick.match(/init_battle\(1, *'(.*?)'\)/);
  return m ? m[1] : null;
}

/** 从竞技场按钮 onclick 扒 {等级ID, token}. 翻写 L2521: init_battle(等级,?,'TOK'). */
export function parseArenaToken(onclick: string): { id: string; token: string } | null {
  const m = onclick.match(/init_battle\((\d+),\d+,'(.*?)'\)/);
  return m ? { id: m[1], token: m[2] } : null;
}

export interface PickResult {
  kind: 'battle' | 'need-token' | 'empty';
  key?: string;
  href?: 'ar' | 'ar&page=2' | 'rb' | 'gr';
  initid?: string;
  token?: string;
  arena: ArenaStore; // 更新后(arrayDone push / gr--)
}

/**
 * 选下一靶(翻写 idleArena while 选靶 L2570-2645). 纯函数: 返回意图 + 更新后 arena, 不发请求.
 * - array 不持久化 pop(临时拷贝消费), 靠 arrayDone 去重 —— 与 dodying `const array=[...arena.array]` 一致.
 * - token 有 → battle(非 GF 开战前 arrayDone.push; GF 则 gr--).
 * - token 缺 → need-token(不动 arrayDone/gr; 由 reducer 导航选择页被动收集后重选).
 */
export function pickNextArena(input: ArenaStore): PickResult {
  const arena: ArenaStore = {
    ...input,
    array: [...input.array],
    arrayDone: [...input.arrayDone],
    token: { ...input.token },
  };
  const arr = [...arena.array]; // 临时消费拷贝(不持久化 pop)
  while (arr.length > 0) {
    const raw = arr.pop()!;
    const num = Number(raw);
    const id = isNaN(num) ? 'gr' : String(num);
    if (arena.arrayDone.includes(id) || arena.arrayDone.includes(num)) continue;
    if (id === 'gr') {
      if (arena.gr <= 0) {
        if (!arena.arrayDone.includes('gr')) arena.arrayDone.push('gr');
        continue;
      }
      const token = arena.token.gr;
      if (!token) return { kind: 'need-token', key: 'gr', href: 'gr', arena };
      arena.gr--;
      return { kind: 'battle', key: 'gr', href: 'gr', initid: '1', token, arena };
    }
    const token = arena.token[id];
    if (!token) return { kind: 'need-token', key: id, href: mapHref(id), arena };
    arena.arrayDone.push(num);
    return { kind: 'battle', key: id, href: mapHref(id), initid: id, token, arena };
  }
  return { kind: 'empty', arena };
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: 控制台验证(可选)**

```js
m.mapHref('5'); // 'ar'
m.mapHref('20'); // 'ar&page=2'
m.mapHref('105'); // 'rb'
m.parseArenaToken("init_battle(35,2,'abc123')"); // {id:'35', token:'abc123'}
m.pickNextArena({array:['5'], arrayDone:[], token:{'5':'tk'}, gr:3, date:1}); // kind:'battle' key:'5' href:'ar' token:'tk'
m.pickNextArena({array:['5'], arrayDone:[], token:{}, gr:3, date:1}); // kind:'need-token' key:'5' href:'ar'
```

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/engine/arena.ts
git commit -m "feat(autobattle): engine/arena 竞技场选靶纯函数(翻写 idleArena 选靶 + token 正则)"
```

---

## Task 6: engine/farm-reducer.ts(纯函数, 状态转移核心)

**Files:**
- Create: `autobattle/src/engine/farm-reducer.ts`

- [ ] **Step 1: 写 farm-reducer.ts**

```typescript
// 连刷状态转移核心(纯函数). farmReducer(state, ctx, cfg) → {next, action, arena?}.
// 零 DOM/零 Store/零 config 单例/零 Date.now(): 全部经 ctx/cfg 传入, 可控制台喂数据断言转移(对齐 brain.decide).
import type { FarmContext, FarmStep, FarmReducerCfg, FarmState } from '../types';
import { computeStamina, gate, computeCost, shouldRecover } from './stamina';
import { computeCooldown, pickEngageable } from './encounter';
import { pickNextArena } from './arena';

const MS_PER_DAY = 24 * 3600_000;
const MS_30MIN = 30 * 60_000;

function nextMidnight(nowMs: number): number {
  return (Math.floor(nowMs / MS_PER_DAY) + 1) * MS_PER_DAY;
}

export function farmReducer(state: FarmState, ctx: FarmContext, cfg: FarmReducerCfg): FarmStep {
  switch (state) {
    case 'IDLE':
      if (!cfg.farmEnabled) return { next: 'STOPPED', action: { type: 'none', note: '连刷关' } };
      return { next: 'CHECK_ENCOUNTER', action: { type: 'none' } };

    case 'CHECK_ENCOUNTER': {
      if (cfg.autoEncounter) {
        const cd = computeCooldown(ctx.encounter, ctx.nowMs, ctx.lastEH, cfg.encounterCdMs);
        const href = pickEngageable(ctx.encounter);
        const stamina = computeStamina(ctx.stamina, ctx.nowHour);
        if (cd === 0 && href && stamina >= cfg.staminaEncounter) {
          return { next: 'ENCOUNTER_ENGAGE', action: { type: 'none', note: '有可接遭遇' } };
        }
      }
      return { next: 'CHECK_STAMINA', action: { type: 'none' } };
    }

    case 'ENCOUNTER_ENGAGE':
      return { next: 'ENCOUNTER_WAIT', action: { type: 'navigate', url: 'https://e-hentai.org/news.php?encounter', note: '跳遭遇页' } };

    case 'ENCOUNTER_WAIT': {
      // STARTUP 路由因 host===e-hentai 进入此态; farm-reader 已扒 eventpane 填 ctx.eventHref
      if (ctx.eventHref) return { next: 'IN_BATTLE', action: { type: 'navigate', url: `${ctx.hvOrigin}/${ctx.eventHref}`, note: '接受遭遇→跳回HV' } };
      return { next: 'IDLE', action: { type: 'navigate', url: ctx.lastHref, note: '无遭遇/过期→回HV' } };
    }

    case 'CHECK_STAMINA': {
      const stamina = computeStamina(ctx.stamina, ctx.nowHour);
      const pick = pickNextArena(ctx.arena);
      if (pick.kind === 'empty') return { next: 'COOLDOWN', action: { type: 'set-cooldown', untilMs: nextMidnight(ctx.nowMs), note: '今日全清' } };
      const cost = computeCost(pick.key!, stamina, ctx.arena.gr, false);
      const g = gate(stamina, cost, cfg.staminaLow, cfg.staminaLowWithNat, ctx.nowHour);
      if (g === 1) return { next: 'PICK_NEXT', action: { type: 'none' } };
      if (shouldRecover(ctx.stamina, stamina, cfg)) return { next: 'RECOVER_STAMINA', action: { type: 'none' } };
      const until = g === 0 ? nextMidnight(ctx.nowMs) : ctx.nowMs + MS_30MIN;
      return { next: 'COOLDOWN', action: { type: 'set-cooldown', untilMs: until, note: g === 0 ? '今日精力耗尽' : '等自然恢复' } };
    }

    case 'RECOVER_STAMINA':
      return { next: 'CHECK_STAMINA', action: { type: 'recover-stamina', note: '喝药恢复精力' } };

    case 'PICK_NEXT': {
      const pick = pickNextArena(ctx.arena);
      if (pick.kind === 'empty') return { next: 'COOLDOWN', action: { type: 'set-cooldown', untilMs: nextMidnight(ctx.nowMs), note: '今日全清' } };
      if (pick.kind === 'need-token') return { next: 'PICK_NEXT', action: { type: 'navigate', url: `?s=Battle&ss=${pick.href}`, note: `收集 ${pick.href} token` }, arena: pick.arena };
      return { next: 'STARTING', action: { type: 'start-battle', href: pick.href!, initid: pick.initid!, token: pick.token!, note: `开战 ${pick.href}#${pick.key}` }, arena: pick.arena };
    }

    case 'STARTING':
      // start-battle 已在 PICK_NEXT 这一 tick exec 并 reload; 此态仅在 reload 未发生时兜底回 PICK_NEXT 重试
      return { next: 'PICK_NEXT', action: { type: 'none', note: 'STARTING 兜底重选' } };

    case 'IN_BATTLE':
      // 战斗中 loop 走战斗内分支(farmTick 不被调); 落到此处=已离开战斗
      return { next: 'POST_BATTLE', action: { type: 'none' } };

    case 'POST_BATTLE':
      return { next: 'RETURN', action: { type: 'none', note: '战斗结束' } };

    case 'RETURN':
      return { next: 'IDLE', action: { type: 'navigate', url: ctx.lastHref, note: '回前页' } };

    case 'COOLDOWN':
      if (!cfg.farmEnabled) return { next: 'STOPPED', action: { type: 'none' } };
      if (ctx.nowMs >= ctx.cooldownUntil) return { next: 'IDLE', action: { type: 'none', note: '冷却结束' } };
      return { next: 'COOLDOWN', action: { type: 'none' } };

    case 'STOPPED':
      if (cfg.farmEnabled) return { next: 'IDLE', action: { type: 'none', note: '重新开' } };
      return { next: 'STOPPED', action: { type: 'none' } };

    default:
      return { next: 'IDLE', action: { type: 'none' } };
  }
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: 控制台验证(可选, 喂 ctx 断言转移)**

```js
const baseCtx = { page:'hv-out', url:'', host:'hentaiverse.org', hvOrigin:'https://hentaiverse.org',
  nowMs: 1000*3600*100, nowHour: 100, storedState:'IDLE',
  arena:{array:['5'], arrayDone:[], token:{'5':'tk'}, gr:3, date: 1000*3600*100},
  stamina:{cached:80, lastTimeHour:100, hathperk:false}, encounter:[], lastEH:0, lastHref:'X', cooldownUntil:0 };
const cfg = { farmEnabled:true, autoEncounter:false, restoreStamina:false, staminaLow:60, staminaLowWithNat:0, staminaEncounter:60, encounterCdMs:1800000, grPerDay:3, arenaLevels:'5', staminaHathperk:false };
m.farmReducer('IDLE', baseCtx, cfg); // {next:'CHECK_ENCOUNTER', ...}
m.farmReducer('CHECK_STAMINA', baseCtx, cfg); // {next:'PICK_NEXT', ...}(80 够)
m.farmReducer('PICK_NEXT', baseCtx, cfg); // {next:'STARTING', action:{type:'start-battle', href:'ar', initid:'5', token:'tk'}, arena:{arrayDone:[5]...}}
```

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/engine/farm-reducer.ts
git commit -m "feat(autobattle): engine/farm-reducer 状态转移核心(13 状态纯函数)"
```

---

## Task 7: core/gm-http.ts + global.d.ts(GM_xmlhttpRequest)

**Files:**
- Create: `autobattle/src/core/gm-http.ts`
- Modify: `autobattle/src/global.d.ts`

- [ ] **Step 1: 在 global.d.ts 补 GM_xmlhttpRequest 声明**

在 `global.d.ts` 的 `declare const GM_deleteValue` 行(L5)之后追加：

```typescript

/** Userscript GM XHR(@grant 已含). 仅声明 M3 用到的字段. */
interface GMXHRDetails {
  method: string;
  url: string;
  data?: string;
  headers?: Record<string, string>;
  onload?: (r: { status: number; responseText: string }) => void;
  onerror?: (r: unknown) => void;
}
declare const GM_xmlhttpRequest: ((details: GMXHRDetails) => void) | undefined;
```

- [ ] **Step 2: 写 gm-http.ts**

```typescript
// GM_xmlhttpRequest POST 薄封装 + 300ms 最小间隔(封号红线, 翻写 dodying $ajax interval:300 L131 "DO NOT DECREASE").
// 仅供连刷开战/精力恢复的低频单发请求; 不做队列/并发(那是 dodying $ajax 的重活, 连刷无需).
const MIN_INTERVAL = 300;
let lastPost = 0;

/** POST 表单. resolve=onload(开战成功后由调用方 reload), reject=不可用/出错. */
export function gmPost(url: string, body: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const send = () => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest unavailable'));
        return;
      }
      lastPost = Date.now();
      GM_xmlhttpRequest({
        method: 'POST',
        url,
        data: body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        onload: (r) => (r.status === 200 ? resolve() : reject(new Error(`HTTP ${r.status}`))),
        onerror: () => reject(new Error('xhr error')),
      });
    };
    const wait = Math.max(0, MIN_INTERVAL - (Date.now() - lastPost));
    if (wait > 0) setTimeout(send, wait);
    else send();
  });
}
```

- [ ] **Step 3: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/core/gm-http.ts autobattle/src/global.d.ts
git commit -m "feat(autobattle): core/gm-http POST 封装(300ms 间隔) + GM_xmlhttpRequest 声明"
```

---

## Task 8: engine/farm-reader.ts(读 FarmContext)

**Files:**
- Create: `autobattle/src/engine/farm-reader.ts`

翻写 dodying `checkIsHV`(L2135-2189) e-hentai 分支 + 精力 readout 读取 + 选择页 token 被动收集。

- [ ] **Step 1: 写 farm-reader.ts**

```typescript
// 连刷环境读取(副作用层: 读 DOM/URL/Store; 选择页被动收集 token; e-hentai 注入). 翻写 dodying checkIsHV L2135-2189.
// 解析子函数(token/精力数字)已在 arena.ts/此处抽纯函数; readFarm 只做装配 + 被动收集落盘.
import { $, $$ } from '../core/dom';
import { Store } from '../core/store';
import { parseGrToken, parseArenaToken } from './arena';
import type { FarmContext, FarmPage, FarmState, ArenaStore, EncounterRec, StaminaSnapshot } from '../types';

const MS_PER_HOUR = 3600_000;

function emptyArena(nowMs: number): ArenaStore {
  return { array: [], arrayDone: [], token: {}, gr: 0, date: nowMs };
}

/** 从 #stamina_readout 文本提精力数字(翻写 dodying asyncSetStamina L2309 区域). 读不到返回 null. */
export function parseStaminaReadout(root: ParentNode = document): number | null {
  const el = $('#stamina_readout', root);
  if (!el) return null;
  const m = (el.textContent || '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

/** 当前页是否 HV 战斗结束落地(?s=Battle 结尾, 翻写 L320). */
function isBattleEnd(url: string): boolean {
  return url.endsWith('?s=Battle');
}

/** 选择页(?s=Battle&ss=ar|gr|rb): 扒当前页所有 token merge 进 arena 并落盘(被动收集). */
function collectTokens(arena: ArenaStore): ArenaStore {
  const next: ArenaStore = { ...arena, token: { ...arena.token } };
  const gf = $<HTMLElement>('img[src*="startgrindfest.png"]');
  if (gf) {
    const t = parseGrToken(gf.getAttribute('onclick') || '');
    if (t) next.token.gr = t;
  }
  $$<HTMLElement>('img[src*="startchallenge.png"]').forEach((img) => {
    const p = parseArenaToken(img.getAttribute('onclick') || '');
    if (p) next.token[p.id] = p.token;
  });
  return next;
}

/** 读出 FarmContext. 含被动收集 token / e-hentai eventpane 解析 / 精力刷新等副作用. */
export function readFarm(): FarmContext {
  const url = location.href;
  const host = location.host;
  const nowMs = Date.now();
  const nowHour = Math.floor(nowMs / MS_PER_HOUR);
  const storedState = Store.get<FarmState>('farmState', 'IDLE');
  const lastHref = Store.get<string>('lastHref', '');
  const lastEH = Store.get<number>('lastEH', 0);
  const cooldownUntil = Store.get<number>('farmCooldownUntil', 0);

  // 精力快照(读 readout 则刷新缓存)
  const readout = parseStaminaReadout();
  if (readout !== null) {
    Store.set('stamina', readout);
    Store.set('staminaTime', nowHour);
  }
  const stamina: StaminaSnapshot = {
    cached: Store.get<number>('stamina', 0),
    lastTimeHour: Store.get<number>('staminaTime', 0),
    hathperk: Store.get<boolean>('staminaHathperk', false),
  };

  // arena(跨日重置由 reducer/starter 触发; reader 只读 + 选择页收集 token)
  let arena = Store.get<ArenaStore>('arena', emptyArena(nowMs));
  let encounter = Store.get<EncounterRec[]>('encounter', []);
  let eventHref: string | undefined;
  let hvOrigin = Store.get<string>('hvUrl', 'https://hentaiverse.org');

  let page: FarmPage;

  if (host === 'e-hentai.org') {
    page = 'eh-encounter';
    Store.set('lastEH', nowMs);
    // checkIsHV e-hentai 分支(翻写 L2148-2173)
    const isEngage = url === 'https://e-hentai.org/news.php?encounter';
    const eventpane = $('#eventpane');
    if (eventpane) {
      const a = $<HTMLAnchorElement>('#eventpane>div>a');
      const seg = a?.href.split('/')[3];
      if (seg === undefined) encounter = []; // 新一天
      encounter.unshift({ href: seg, time: nowMs });
      Store.set('encounter', encounter);
      eventHref = seg;
    } else {
      // 无 eventpane: 找第一个未接受的(翻写 L2161-2173)
      for (const e of encounter) {
        if (e.encountered) continue;
        if (e.href) {
          eventHref = e.href;
          break;
        }
      }
    }
    void isEngage; // isEngage 当前由 reducer 用 page+eventHref 判定接受/回跳, 此处仅保留语义
  } else {
    // HV 侧: 记录 origin(engage 拼 url 用, 翻写 L2137). 跨日重置交 starter.ensureArena(reader 不碰 config).
    hvOrigin = location.origin;
    Store.set('hvUrl', hvOrigin);
    // 选择页被动收集 token(?s=Battle&ss=ar|gr|rb)
    if (/\?s=Battle&ss=(ar|gr|rb)/.test(url)) {
      arena = collectTokens(arena);
      Store.set('arena', arena);
    }
    page = isBattleEnd(url) ? 'hv-battle-end' : 'hv-out';
  }

  return { page, url, host, hvOrigin, nowMs, nowHour, storedState, arena, stamina, encounter, lastEH, lastHref, eventHref, cooldownUntil };
}
```

> **注**: reader 不碰跨日重置与 config —— 只读 Store arena 原样返回, 跨日/首次重建(用 config 的 grPerDay/arenaLevels)由 starter.ensureArena 负责(Task 10), 保持 reader 不依赖 config 单例。选择页收集的 token 会被 ensureArena 的 initArenaCtx 保留(token: prev.token)。

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add autobattle/src/engine/farm-reader.ts
git commit -m "feat(autobattle): engine/farm-reader 读 FarmContext(选择页收集 token + e-hentai 注入)"
```

---

## Task 9: engine/farm-executor.ts(执行 FarmAction)

**Files:**
- Create: `autobattle/src/engine/farm-executor.ts`

- [ ] **Step 1: 写 farm-executor.ts**

```typescript
// 连刷副作用执行(写层). 把 FarmAction 翻译成 XHR/导航/Store. 不做任何决策(从不读 state). 对齐 battle/executor.ts.
// 翻写 dodying $ajax.open(POST+reload) L144-146 / openNoFetch(window.open _self) L147 / recover=stamina L2418.
import { gmPost } from '../core/gm-http';
import { Store } from '../core/store';
import type { FarmAction } from '../types';

/** 导航(openNoFetch 等价): 整页跳转(GET). */
function navigate(url: string): void {
  window.open(url, '_self');
}

/** 开战: POST initid/inittoken 后整页 reload(翻写 $ajax.open + goto). */
function startBattle(href: string, initid: string, token: string): void {
  gmPost(`?s=Battle&ss=${href}`, `initid=${initid}&inittoken=${token}`)
    .then(() => {
      window.location.href = location.href; // goto: 触发 reload 进战斗页
    })
    .catch((e) => console.error('[HVAB:farm] startBattle 失败', e));
}

/** 恢复精力: POST recover=stamina 后 reload(翻写 L2418). */
function recoverStamina(): void {
  gmPost(location.href, 'recover=stamina')
    .then(() => {
      window.location.href = location.href;
    })
    .catch((e) => console.error('[HVAB:farm] recoverStamina 失败', e));
}

/** 执行一个 FarmAction. */
export function execFarm(action: FarmAction): void {
  switch (action.type) {
    case 'none':
      return;
    case 'navigate':
      navigate(action.url);
      return;
    case 'start-battle':
      startBattle(action.href, action.initid, action.token);
      return;
    case 'recover-stamina':
      recoverStamina();
      return;
    case 'set-cooldown':
      Store.set('farmCooldownUntil', action.untilMs);
      return;
  }
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。`switch` 对 `FarmAction` 联合穷举, 无 default 也应覆盖全部分支。

- [ ] **Step 3: Commit**

```bash
git add autobattle/src/engine/farm-executor.ts
git commit -m "feat(autobattle): engine/farm-executor 执行 FarmAction(开战 XHR/导航/recover)"
```

---

## Task 10: engine/starter.ts(FSM 引擎壳)

**Files:**
- Create: `autobattle/src/engine/starter.ts`

- [ ] **Step 1: 写 starter.ts**

```typescript
// 连刷 FSM 引擎壳: farmTick = read → routeStartup → reduce → persist → exec. 节奏锁 farmBusyUntil. 翻写 dodying 调度 + STARTUP 路由(URL 强信号优先).
import { config, type Config } from '../core/config';
import { Store } from '../core/store';
import { bus } from '../core/bus';
import { readFarm } from './farm-reader';
import { farmReducer } from './farm-reducer';
import { execFarm } from './farm-executor';
import { initArenaCtx, isNewDay } from './arena';
import type { FarmContext, FarmState, FarmReducerCfg, ArenaStore } from '../types';

let farmBusyUntil = 0;

/** 从 config 装配 reducer 配置(仿 weightCfg; 纯函数不碰单例). */
export function farmCfg(C: Config): FarmReducerCfg {
  return {
    farmEnabled: C.farmEnabled,
    autoEncounter: C.autoEncounter,
    restoreStamina: C.restoreStamina,
    staminaLow: C.staminaLow,
    staminaLowWithNat: C.staminaLowWithNat,
    staminaEncounter: C.staminaEncounter,
    encounterCdMs: C.encounterCdMin * 60_000,
    grPerDay: C.grPerDay,
    arenaLevels: C.arenaLevels,
    staminaHathperk: C.staminaHathperk,
  };
}

/** STARTUP 路由: URL 强信号优先于 Store state(翻写 dodying URL+localStorage 双判, 收敛到一处). */
function routeStartup(ctx: FarmContext): FarmState {
  if (ctx.page === 'eh-encounter') return 'ENCOUNTER_WAIT';
  if (ctx.page === 'in-battle') return 'IN_BATTLE';
  if (ctx.page === 'hv-battle-end') return 'POST_BATTLE';
  return ctx.storedState; // 普通 HV 战斗外页: 用 Store state 续跑(默认 IDLE)
}

/** 确保 arena 已按当日 config 初始化(跨日/首次用 grPerDay/arenaLevels 重建). reader 跨日只清进度, 此处补 gr/array. */
function ensureArena(ctx: FarmContext, C: Config): ArenaStore {
  if (isNewDay(ctx.arena, ctx.nowMs) || (ctx.arena.array.length === 0 && C.arenaLevels)) {
    const arena = initArenaCtx(ctx.arena, C.arenaLevels, C.grPerDay, ctx.nowMs);
    Store.set('arena', arena);
    return arena;
  }
  return ctx.arena;
}

/** 一次连刷推进. 由 loop 的 !nowIn 分支调用. */
export function farmTick(): void {
  if (Date.now() < farmBusyUntil) return;
  try {
    const C = config.all();
    const ctx = readFarm();
    ctx.arena = ensureArena(ctx, C); // 跨日/首次补全 arena(gr/array)
    const state = routeStartup(ctx);
    const step = farmReducer(state, ctx, farmCfg(C));
    Store.set('farmState', step.next);
    if (step.arena) Store.set('arena', step.arena);
    const cdRemainMs = step.next === 'COOLDOWN' ? Math.max(0, ctx.cooldownUntil - ctx.nowMs) : undefined;
    bus.emit('farm:state', { state: step.next, note: step.action.note, cdRemainMs });
    execFarm(step.action);
    farmBusyUntil = Date.now() + C.farmTickMs;
  } catch (e) {
    console.error('[HVAB:farm] farmTick', e);
  }
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add autobattle/src/engine/starter.ts
git commit -m "feat(autobattle): engine/starter FSM 引擎壳(farmTick + STARTUP 路由 + farmCfg 装配)"
```

---

## Task 11: loop.ts 集成 `!nowIn` 战斗外分支

**Files:**
- Modify: `autobattle/src/loop.ts`

- [ ] **Step 1: 顶部加 import**

在 loop.ts 的 import 区(L12 `import type ...` 之后)加：

```typescript
import { farmTick } from './engine/starter';
```

- [ ] **Step 2: 在 tick() 的战斗内 if 之后加 else if 战斗外分支**

现有 tick() 内(L73 起)：

```typescript
    if (config.get('enabled') && nowIn && Date.now() >= busyUntil) {
      // ... 战斗内逻辑(不动) ...
    }
```

把这个 `if (...) { ... }` 的闭合 `}`(L209)之后、`catch` 之前, 改为追加 `else if`：

```typescript
    } else if (config.get('enabled') && config.get('farmEnabled') && !nowIn) {
      // M3 连刷: 仅战斗外 + 连刷开关开. farmTick 内部 farmBusyUntil 节流到 farmTickMs, 故此处不查 busyUntil.
      farmTick();
    }
```

即把 L73 的 `if (...) {` ... L209 的 `}` 结构补成 `if (...) { ... } else if (...) { farmTick(); }`(整体仍在 L72 的 `try {` ... L210 `} catch {` 内)。

- [ ] **Step 3: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 4: 验证战斗内零回归(构建 + node --check)**

Run: `cd autobattle && npm run build && node --check dist/hv-autobattle.user.js`
Expected: 构建成功, `node --check` 无输出。战斗内分支逻辑一字未改, `farmEnabled` 默认 false → farm 分支不进, 纯旁路。

- [ ] **Step 5: Commit**

```bash
git add autobattle/src/loop.ts
git commit -m "feat(autobattle): loop 加 !nowIn 连刷分支(调 farmTick; 战斗内零改动)"
```

---

## Task 12: 连刷 tab UI + HUD 状态展示

**Files:**
- Modify: `autobattle/src/ui/panel.ts`
- Modify: `autobattle/src/ui/hud.ts`

- [ ] **Step 1: panel.ts 加 farmPane() 并替换占位**

在 `battlePane()` 函数(L13-23)之后加 `farmPane()`：

```typescript
/** 连刷 tab: M3 接入 */
function farmPane(): HTMLElement {
  const p = el('div');
  p.appendChild(group('连刷总控', swRow('farmEnabled', '启用连刷(需同时开战斗🧠)')));
  p.appendChild(group('竞技场/GF', numRow('grPerDay', 'GF每日场数')));
  p.appendChild(group('精力(战前门)', swRow('restoreStamina', '不足喝药恢复'), numRow('staminaLow', '开战精力下限'), numRow('staminaEncounter', '遭遇精力下限'), numRow('staminaLowWithNat', '含自然恢复下限')));
  p.appendChild(group('遭遇战', swRow('autoEncounter', '自动接受遭遇'), numRow('encounterCdMin', '遭遇冷却', '分')));
  p.appendChild(group('节奏', numRow('farmTickMs', '连刷tick', 'ms')));
  return p;
}
```

把 `paneFor`(L25-36)的 `case 'farm'` 行(L29-30)改为：

```typescript
    case 'farm':
      return farmPane();
```

> **注**: 等级列表(arenaLevels 逗号串)现有控件无文本输入行, M3 先用 config 默认串 / devtools `__hvab.config.set('arenaLevels','5,gr')` 配置; `textRow` 控件作为后续 UI 打磨, 不阻塞核心。

- [ ] **Step 2: hud.ts 订阅 farm:state 展示连刷状态**

在 `createHud` 的 `bus.on('hud:update', ...)` 块(L38-56)之后、`return hud;`(L57)之前，加：

```typescript
  // M3 连刷: 战斗外展示当前 FSM 状态(战斗内由 hud:update 写 meta1, 二者互斥不冲突)
  bus.on('farm:state', (f) => {
    const m1 = document.getElementById('hvab-meta1');
    if (!m1) return;
    const cd = f.cdRemainMs && f.cdRemainMs > 0 ? ` · cd ${Math.ceil(f.cdRemainMs / 60000)}分` : '';
    m1.textContent = `连刷:${f.state}${f.note ? ' · ' + f.note : ''}${cd}`;
  });
```

- [ ] **Step 3: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。`swRow/numRow` 的 key 参数受 `keyof Config` 约束, 新键已在 Task 2 加入 `Config`, 通过。

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/ui/panel.ts autobattle/src/ui/hud.ts
git commit -m "feat(autobattle): 连刷 tab UI + HUD 战斗外展示 FSM 状态"
```

---

## Task 13: 构建 + 验收

**Files:**
- Build: `autobattle/dist/hv-autobattle.user.js`

- [ ] **Step 1: 全量类型检查**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 2: diagnostics 清洁(改动文件)**

用 vscode-mcp-server 检查本次新增/改动文件 diagnostics(types.ts/config.ts/engine/*.ts/core/gm-http.ts/loop.ts/panel.ts/hud.ts/global.d.ts)。Expected: 无本次引入的 error/warning。

- [ ] **Step 3: 构建 + 语法自检**

Run: `cd autobattle && npm run build && node --check dist/hv-autobattle.user.js`
Expected: 产出单 `dist/hv-autobattle.user.js`(不压缩), `node --check` 无输出。

- [ ] **Step 4: GF 真机实测(人工, 装最新 build)**

依次核对(每项过了打勾)：
1. **零回归**: `farmEnabled` 默认关 → 纯战斗行为与 M2 一致(连刷不介入)。
2. **独立开关**: 仅开 🧠 不开连刷 → 不自动开下一场; 开 🧠 + 连刷开关 → 才连刷。
3. **GF 场间**: 配 `arenaLevels='gr'` + grPerDay, 一场 GF 打完 → 自动开下一场 GF(POST `?s=Battle&ss=gr`)。
4. **竞技场闲置**: 配 `arenaLevels='5,20,105'` → 依次开 ar/ar&page=2/rb; arrayDone 当日去重不重刷。
5. **精力门**: 精力够开战; 不够 → COOLDOWN(HUD 显 cd); restoreStamina 开 + 不足 → 发 recover。
6. **遭遇战**: autoEncounter 开 → cd=0 时跳 e-hentai → 接受跳回 HV 进战斗 / 无遭遇回 HV; 满 24 次 → 次日冷却。
7. **HUD 状态**: 战斗外 meta1 显示「连刷:`<状态>` · `<note>`」随推进更新。
8. **封号红线**: 观察请求间隔 ≥300ms(gm-http 锁), 无 `state lock limiter` 报错。

- [ ] **Step 5: Commit 构建产物**

```bash
git add autobattle/dist/hv-autobattle.user.js
git commit -m "build(autobattle): M3 连刷构建产物(FSM 连刷可挂载实测)"
```

---

## 验收(M3 完成判据)

- `npm run typecheck` 通过; vscode diagnostics 改动文件清洁。
- `npm run build` 产单 `dist/hv-autobattle.user.js`(不压缩); `node --check` 通过。
- 纯函数(stamina/encounter/arena/farm-reducer)控制台喂数据验证通过。
- GF 真机实测 Step 4 八项核对通过; `farmEnabled=false` 零回归确认。
- 连刷行为对齐 dodying(逐项核对 `reference/`); 开战/recover 请求 ≥300ms 间隔。
