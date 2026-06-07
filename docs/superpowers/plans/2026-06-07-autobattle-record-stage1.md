# 记录与分析 · 阶段1(A 收益统计) 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 逐 task 实现。Steps 用 `- [ ]` 跟踪。

**Goal:** 实现「记录与分析」里程碑阶段1——A 收益统计(掉落/EXP/Credit/场次/怪数/boss/技能伤害明细 + monsterDB)，事件驱动复用 logger，走 GM Store(不碰 IndexedDB)，玩家可在收益 tab 看产出。

**Architecture:** loop 每回合 `logger.push` 后 emit `battle:round`(带结构化决策 Action + 当回合 /json 原始 + isRetry 去重标记)；A 订阅者 `stats-collector` 跳过 isRetry、逐回合累加 usage/monsterDB、在 battle:end(battleId 切换沿)结算掉落+落 Store。所有解析为纯函数、喂 **/json 原始响应**(未汉化英文)，DOM 仅兜底。

**Tech Stack:** TypeScript · vite-plugin-monkey · 无 vitest(typecheck + `scripts/drive-record.mts` 控制台喂样本验证)。

**关联:** spec `docs/superpowers/specs/2026-06-07-autobattle-record-analysis-design.md`(§3-§5 阶段1)。翻写底本 `autobattle/reference/hvAutoAttack.user.js`(dropMonitor 4139 / recordUsage 4197 / monsterDB 3200)。

---

## 文件结构(阶段1)

**新增**:
- `src/core/net-cache.ts` — lastBattleResponse + getLastBattle(解 loop↔main 循环依赖)
- `src/record/battle-code.ts` — extractTextlog/parseRoundFromJson/resolveArenaTier/deriveBattleCode(纯)
- `src/record/drop-parse.ts` — parseDrops(掉落颜色分类 + EXP/Credit, 纯, 吃 /json textlog HTML)
- `src/record/usage-parse.ts` — accumulateUsage(逐回合 7 类, 纯)
- `src/record/monster-db.ts` — upsertMonster(纯)
- `src/record/stats-collector.ts` — A 订阅者(壳: 订阅 bus → 调纯函数 → 落 Store)
- `src/ui/stats.ts` — 收益 tab 渲染
- `scripts/drive-record.mts` — 纯函数回归(喂样本 textlog)

**修改**: `src/types.ts`(record 类型 + BusEvents 两条) · `src/core/config.ts`(record 配置 + arenaTiers + VERSION) · `src/main.ts`(net-cache 接入 + init collector) · `src/loop.ts`(emit battle:round/battle:end + battleId) · `src/ui/panel.ts`(stats tab)。

> 阶段1 **不动** IndexedDB/battle-archive/log.ts/速率/玩家等级(阶段2/3)。

---

## Task 1: types.ts 加 record 类型 + BusEvents

**Files:** Modify `autobattle/src/types.ts`(尾部追加 + BusEvents 接口追加两行)

- [ ] **Step 1: BusEvents 接口加两条**

在 `BusEvents` 接口内现有事件后追加:
```typescript
  'battle:round': RoundSample;
  'battle:end': BattleEnd;
```

- [ ] **Step 2: 文件尾部追加 record 类型**

```typescript

// ── 记录与分析(record)类型. 详见 specs/2026-06-07-autobattle-record-analysis-design.md ──

/** 竞技场准入等级映射项(config.arenaTiers; roundAll↔准入等级↔名称) */
export interface ArenaTier { roundAll: number; level: number; name: string; }

/** 每回合采集样本(loop emit battle:round) */
export interface RoundSample {
  battleId: string;          // 同场关联(每 tick 从 Store curBattleId 读)
  battleCode: string;        // 'AR-Lv130-流亡之途' / 'GF' / 'AR-R50'(失配退化)
  level: number | null;      // 竞技场准入等级; 非竞技场/失配为 null
  roundNow: number; roundAll: number; turn: number;
  action: { type: string; id?: number };  // brain 决策【结构化】(供技能/物品次数; 非中文串)
  actionLabel: string;       // 中文可读
  record: LogRecord;         // 复用决策日志(同源同回合)
  rawJson: string | null;    // 当回合 /json 原始(冷启动缺失为 null)
  bossThisWave: number;      // 本波 boss 数 = enemies.filter(is_red_boss).length
  isRetry: boolean;          // stalled/安全网重试 → 订阅者跳过(防重复计数)
}

/** 一场结束(loop 在 battleId 切换沿 emit battle:end) */
export interface BattleEnd {
  battleId: string; battleCode: string; level: number | null;
  roundAll: number; victorious: boolean;
  finalRawJson: string | null;   // 末回合 /json(含掉落 textlog)
  startedAt: number; endedAt: number;
}

/** A 收益累计(Store hvab_stats) */
export interface StatsAccum {
  startTime: number; activeMs: number;
  exp: number; credit: number;
  battles: number; rounds: number; turns: number; monsters: number; bosses: number;
  drops: Record<string, number>;
  restore: Record<string, number>;
  items: Record<string, number>;
  magic: Record<string, number>;
  damage: Record<string, number>;
  proficiency: Record<string, number>;
  hurt: { avg: number; pavg: number; mavg: number; total: number; count: number; mp: number; oc: number };
  self: { evade: number; miss: number; focus: number };
}

/** monsterDB: 怪名 → {mid, 各等级满血} */
export type MonsterDB = Record<string, { mid: number } & Record<number, number>>;
export type MonsterMID = Record<number, { mid: number } & Record<number, number>>;
```

- [ ] **Step 3: 验证** `cd autobattle && npm run typecheck` → PASS(RoundSample 引用 LogRecord 已存在; BusEvents 前向引用同文件合法)。

- [ ] **Step 4: Commit**
```bash
git add autobattle/src/types.ts
git commit -m "feat(autobattle): 记录阶段1 类型契约(RoundSample/BattleEnd/StatsAccum/ArenaTier + BusEvents)"
```

---

## Task 2: config.ts 加 record 配置 + arenaTiers + CONFIG_VERSION bump

**Files:** Modify `autobattle/src/core/config.ts`

- [ ] **Step 1: DEFAULT_CONFIG 尾部追加**

先读实际文件确认 `CONFIG_VERSION` 当前值(预期 5)。在 DEFAULT_CONFIG 最后一个键后追加:
```typescript
  // ── 记录与分析里程碑(详见 specs/2026-06-07-autobattle-record-analysis-design.md)──
  recordEnabled: true,        // A 收益统计总开关
  recordArchive: false,       // B 调优日志总开关(阶段2; 重存储默认关)
  cacheMonsterHP: true,       // monsterDB 落盘
  dropQuality: 6,             // 装备品质门槛(0Crude..7Peerless; 默认6=Legendary起记)
  archiveMaxBattles: 200,     // B 最多留几场(阶段2)
  archiveKeepPerLevel: 20,    // 每准入等级最多留几场(阶段2)
  statsRateMode: 'session' as 'session' | 'active',  // 速率口径(阶段3)
  showPlayerLevel: true,      // 显示玩家角色等级(阶段3)
  // 竞技场准入等级映射(截图底本, 覆盖 Lv.80~300; 失配→level=null+AR-R${roundAll})
  arenaTiers: [
    { roundAll: 25, level: 80, name: '力量流失' }, { roundAll: 30, level: 90, name: '杀戮地带' },
    { roundAll: 35, level: 100, name: '最终阶段' }, { roundAll: 40, level: 110, name: '无尽旅程' },
    { roundAll: 45, level: 120, name: '梦陨之时' }, { roundAll: 50, level: 130, name: '流亡之途' },
    { roundAll: 55, level: 140, name: '封印之力' }, { roundAll: 60, level: 150, name: '崭新之翼' },
    { roundAll: 65, level: 165, name: '弑神之路' }, { roundAll: 70, level: 180, name: '死亡前夜' },
    { roundAll: 75, level: 200, name: '命运三女神与树' }, { roundAll: 80, level: 225, name: '世界末日' },
    { roundAll: 85, level: 250, name: '永恒黑暗' }, { roundAll: 90, level: 300, name: '与龙共舞' },
  ] as { roundAll: number; level: number; name: string }[],
```

- [ ] **Step 2: CONFIG_VERSION 改为当前值+1**

读实际 `const CONFIG_VERSION = N`，改为 `N+1`(预期 5→6)。迁移块**不加新 force 行**(新键纯增量, `{...DEFAULT_CONFIG,...stored}` 自动补; bump 触发现有 Store.set 落盘)。

- [ ] **Step 3: 验证** `cd autobattle && npm run typecheck` → PASS。

- [ ] **Step 4: Commit**
```bash
git add autobattle/src/core/config.ts
git commit -m "feat(autobattle): config 加记录配置 + arenaTiers + CONFIG_VERSION bump"
```

---

## Task 3: core/net-cache.ts + main.ts 接入(解循环依赖)

**Files:** Create `autobattle/src/core/net-cache.ts`; Modify `autobattle/src/main.ts`

- [ ] **Step 1: 写 net-cache.ts**
```typescript
// /json 原始响应缓存. 独立模块供 main(写) / loop(读) / 记录模块(读) import, 避免 loop↔main 循环依赖.
let last: string | null = null;
export function setLastBattle(text: string | null): void { last = text; }
export function getLastBattle(): string | null { return last; }
```

- [ ] **Step 2: main.ts 改用 net-cache**

`main.ts` 顶部 import 加 `import { setLastBattle, getLastBattle } from './core/net-cache';`。删除模块级 `let lastBattleResponse: string | null = null;`(L13)。hookNet 内两处 `lastBattleResponse = ...`(L24, L39)改为 `setLastBattle(...)`。`__hvab` 的 `getLastBattle: () => lastBattleResponse`(L100)改为 `getLastBattle`(直接引用导入的)。

- [ ] **Step 3: 验证** `cd autobattle && npm run typecheck` → PASS(无 lastBattleResponse 残留引用)。

- [ ] **Step 4: Commit**
```bash
git add autobattle/src/core/net-cache.ts autobattle/src/main.ts
git commit -m "feat(autobattle): net-cache 抽取 /json 缓存(解 loop↔main 循环依赖)"
```

---

## Task 4: record/battle-code.ts(纯函数)

**Files:** Create `autobattle/src/record/battle-code.ts`

- [ ] **Step 1: 写 battle-code.ts**
```typescript
// 竞技场识别纯函数. 数据源 = /json 原始 textlog(未汉化英文); battleType 来自 URL ss(SS_CN).
// HV /json 无结构化 round 字段、无全局 battle 对象(hvc.js.bak 确认), 故解析 textlog[].t 的 Round N/M.
import type { ArenaTier } from '../types';

/** 从 /json 原始响应抽 textlog 文本行(每元素 {t:html,c:cls}; 取 t). 解析失败返回 []. */
export function extractTextlog(rawJson: string | null): string[] {
  if (!rawJson) return [];
  try {
    const d = JSON.parse(rawJson) as { textlog?: { t: string }[] };
    return Array.isArray(d.textlog) ? d.textlog.map((e) => e.t ?? '') : [];
  } catch {
    return [];
  }
}

/** 解析当前轮数(Round N / M; GF 实测 1000 轮). 翻写 dodying L3242 但喂 /json textlog. */
export function parseRoundFromJson(rawJson: string | null): { roundNow: number; roundAll: number } | null {
  const text = extractTextlog(rawJson).join('\n');
  const m = text.match(/Round\s*(\d+)\s*\/\s*(\d+)/i);
  return m ? { roundNow: +m[1], roundAll: +m[2] } : null;
}

/** roundAll 反查竞技场准入等级(仅 battleType==='竞技场' 时由调用方调). 未命中返回 null. */
export function resolveArenaTier(roundAll: number, tiers: ArenaTier[]): ArenaTier | null {
  return tiers.find((t) => t.roundAll === roundAll) ?? null;
}

/** 生成 battleCode + level. 竞技场命中→AR-Lv{level}-{name}; ss=ar 失配→AR-R{roundAll}(level=null); GF→GF; RB/遭遇→kind-roundAll. */
export function deriveBattleCode(
  battleType: string,
  roundAll: number,
  tiers: ArenaTier[],
): { battleCode: string; level: number | null } {
  if (battleType === '竞技场') {
    const tier = resolveArenaTier(roundAll, tiers);
    return tier ? { battleCode: `AR-Lv${tier.level}-${tier.name}`, level: tier.level } : { battleCode: `AR-R${roundAll}`, level: null };
  }
  if (battleType === '压榨界') return { battleCode: 'GF', level: null };
  const kind = battleType === '浴血擂台' ? 'RB' : battleType === '遭遇战' ? 'BA' : 'BT';
  return { battleCode: roundAll ? `${kind}-${roundAll}` : kind, level: null };
}
```

- [ ] **Step 2: 验证** `cd autobattle && npm run typecheck` → PASS。

- [ ] **Step 3: 控制台验证(可选)**
```js
m.parseRoundFromJson('{"textlog":[{"t":"Initializing Grindfest (Round 2 / 1000) ...","c":""}]}'); // {roundNow:2,roundAll:1000}
m.deriveBattleCode('竞技场', 50, TIERS); // {battleCode:'AR-Lv130-流亡之途', level:130}
m.deriveBattleCode('竞技场', 99, TIERS); // {battleCode:'AR-R99', level:null}(失配)
m.deriveBattleCode('压榨界', 1000, TIERS); // {battleCode:'GF', level:null}
```

- [ ] **Step 4: Commit**
```bash
git add autobattle/src/record/battle-code.ts
git commit -m "feat(autobattle): record/battle-code 竞技场识别纯函数(/json textlog 解析轮数+准入等级)"
```

---

## Task 5: record/drop-parse.ts(纯函数, 翻写 dropMonitor 4139-4194)

**Files:** Create `autobattle/src/record/drop-parse.ts`

- [ ] **Step 1: 写 drop-parse.ts**
```typescript
// 掉落 + EXP/Credit 解析(纯函数). 翻写 dodying dropMonitor hvAutoAttack.user.js:4139-4194.
// 喂 /json textlog 行(HTML 字符串, 未汉化英文). EXP/Credit 唯一真值源=textlog 'You gain N EXP/Credit'
// (注: /json 的 d.exp 是经验条像素宽+1234 哨兵, 非数值, 勿用 — hvc.js.bak L920).
// 掉落颜色: 从 HTML 字符串正则抠 color:rgb(...) (textlog[].t 是 innerHTML, 非 live DOM).

const QUALITIES = ['Crude', 'Fair', 'Average', 'Superior', 'Exquisite', 'Magnificent', 'Legendary', 'Peerless'];

export interface DropDelta { exp: number; credit: number; drops: Record<string, number>; }

/** 解析一批 textlog 行. dropQuality: 装备最低品质索引(0-7). 遇 'You are Victorious!' 停(对齐 dodying L4180). */
export function parseDrops(lines: string[], dropQuality: number): DropDelta {
  const out: DropDelta = { exp: 0, credit: 0, drops: {} };
  for (const line of lines) {
    if (/You are Victorious/i.test(line)) break;
    const eg = line.match(/You gain (\d+) (EXP|Credit)/i);
    if (eg) {
      if (/exp/i.test(eg[2])) out.exp += +eg[1];
      else out.credit += +eg[1];
      continue;
    }
    const sm = line.match(/color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)[^>]*>([^<]+)</i);
    if (!sm) continue;
    const r = sm[1], g = sm[2], b = sm[3], name = sm[4].trim();
    if (r === '255' && g === '0' && b === '0') {
      // 装备: 按品质门槛归 'Equipment of X'(X=末词类型)
      const q = QUALITIES.findIndex((x) => name.includes(x));
      if (q === -1 || q >= dropQuality) {
        const type = name.split(/\s+/).pop() || name;
        const key = `Equipment of ${type}`;
        out.drops[key] = (out.drops[key] || 0) + 1;
      }
    } else if (r === '186' && g === '5' && b === '180') {
      // 水晶: 'Nx Crystal of Y' 数量累加
      const cm = name.match(/(\d+)x (Crystal of \w+)/);
      if (cm) out.drops[cm[2]] = (out.drops[cm[2]] || 0) + +cm[1];
      else out.drops[name] = (out.drops[name] || 0) + 1;
    } else if (r === '168' && g === '144' && b === '0') {
      // 金色 = Credit 文本内数字
      const nm = name.match(/\d+/);
      if (nm) out.credit += +nm[0];
    } else {
      out.drops[name] = (out.drops[name] || 0) + 1; // 材料/卷轴按名
    }
  }
  return out;
}
```

- [ ] **Step 2: 验证** `cd autobattle && npm run typecheck` → PASS。

- [ ] **Step 3: 控制台验证(可选)**
```js
m.parseDrops(['You gain 1234 EXP','You gain 56 Credit','<span style="color:rgb(186, 5, 180)">3x Crystal of Power</span>'], 6);
// {exp:1234, credit:56, drops:{'Crystal of Power':3}}
```
> ⚠ span 取色正则基于 dodying rgb 值 + 通用 `color:rgb()` 格式。**阶段2 真机 dump 一份含掉落的 /json 后核对 textlog[].t 的实际 HTML(span 写法/rgb 空格), 微调正则**(Task 12 drive-record 用真实样本)。

- [ ] **Step 4: Commit**
```bash
git add autobattle/src/record/drop-parse.ts
git commit -m "feat(autobattle): record/drop-parse 掉落+EXP/Credit 纯函数(翻写 dropMonitor)"
```

---

## Task 6: record/usage-parse.ts(纯函数, 翻写 recordUsage 4197-4332)

**Files:** Create `autobattle/src/record/usage-parse.ts`

- [ ] **Step 1: 写 usage-parse.ts**
```typescript
// 逐回合 usage 累加(纯函数). 翻写 dodying recordUsage hvAutoAttack.user.js:4244-4318.
// 技能/物品次数从【结构化 action】累加(非中文串); damage/hurt/restore/proficiency/evade/miss/focus 从 textlog 文本.
import type { StatsAccum } from '../types';

/** 空累计(stats-collector 初始化用) */
export function emptyStats(nowMs: number): StatsAccum {
  return {
    startTime: nowMs, activeMs: 0,
    exp: 0, credit: 0, battles: 0, rounds: 0, turns: 0, monsters: 0, bosses: 0,
    drops: {}, restore: {}, items: {}, magic: {}, damage: {}, proficiency: {},
    hurt: { avg: 0, pavg: 0, mavg: 0, total: 0, count: 0, mp: 0, oc: 0 },
    self: { evade: 0, miss: 0, focus: 0 },
  };
}

/** 累加一回合: 技能/物品次数(结构化 action) + 文本统计(damage/hurt/restore/proficiency/evade/miss/focus). 原地改 s. */
export function accumulateUsage(s: StatsAccum, action: { type: string; id?: number }, lines: string[]): void {
  // 技能/物品次数(结构化, 不解析中文)
  if (action.type === 'spell' && action.id !== undefined) s.magic['#' + action.id] = (s.magic['#' + action.id] || 0) + 1;
  else if (action.type === 'item' && action.id !== undefined) s.items['#' + action.id] = (s.items['#' + action.id] || 0) + 1;
  for (const line of lines) {
    // 受到伤害: 'hits you for N <type> damage' (物理 pierc/crush/slash, 否则魔法)
    let m = line.match(/you for (\d+) ([a-zA-Z]+) damage/i);
    if (m) {
      const n = +m[1], type = m[2].toLowerCase();
      s.hurt.total += n; s.hurt.count++;
      if (/pierc|crush|slash/.test(type)) { s.hurt.pavg = (s.hurt.pavg * (s.hurt.count - 1) + n) / s.hurt.count; }
      else { s.hurt.mavg = (s.hurt.mavg * (s.hurt.count - 1) + n) / s.hurt.count; }
      s.hurt.avg = s.hurt.total / s.hurt.count;
      continue;
    }
    // 造成伤害: 'hits <foe> for N <type> damage' (我方输出)
    m = line.match(/hits .+ for (\d+) (\w+) damage/i);
    if (m) { s.damage[m[2].toLowerCase()] = (s.damage[m[2].toLowerCase()] || 0) + +m[1]; continue; }
    // 闪避/未命中/集中
    if (/\bevade/i.test(line)) s.self.evade++;
    else if (/\bmiss/i.test(line)) s.self.miss++;
    else if (/\bfocus/i.test(line)) s.self.focus++;
    // 回复: 'restores N points of (Health|Magic|Spirit)'
    m = line.match(/restores? (\d+) points? of (\w+)/i);
    if (m) s.restore[m[2].toLowerCase()] = (s.restore[m[2].toLowerCase()] || 0) + +m[1];
  }
}
```
> ⚠ damage/hurt/restore 正则基于 HV 战斗日志通用句式 + dodying L4264-4304。阶段2 真机样本(Task 12 drive-record)核对句式微调。

- [ ] **Step 2: 验证** `cd autobattle && npm run typecheck` → PASS。

- [ ] **Step 3: Commit**
```bash
git add autobattle/src/record/usage-parse.ts
git commit -m "feat(autobattle): record/usage-parse 逐回合统计纯函数(技能次数从结构化action)"
```

---

## Task 7: record/monster-db.ts(纯函数, 翻写 3200-3238)

**Files:** Create `autobattle/src/record/monster-db.ts`

- [ ] **Step 1: 写 monster-db.ts**
```typescript
// monsterDB upsert(纯函数). 翻写 dodying hvAutoAttack.user.js:3200-3238(同名异 MID 备份/恢复).
// 喂 /json textlog 行(英文 'Spawned Monster X: MID=N (Name) LV=N HP=N'; 非汉化 DOM '生成怪物').
import type { MonsterDB, MonsterMID } from '../types';

export interface SpawnInfo { mid: number; name: string; lv: number; hp: number; }

/** 从 textlog 行解析 Spawned 怪物(reader.parseSpawnHp 同源正则, 但取 MID/Name/LV/HP). */
export function parseSpawns(lines: string[]): SpawnInfo[] {
  const out: SpawnInfo[] = [];
  const re = /Spawned Monster [A-Z]:\s*MID=(\d+)\s*\(([^)]+)\)\s*LV=(\d+)\s*HP=(\d+)/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) out.push({ mid: +m[1], name: m[2].trim(), lv: +m[3], hp: +m[4] });
  }
  return out;
}

/** upsert 一只怪到 db(同名异 MID → 旧数据备份到 midMap; midMap 有本 MID 备份 → 恢复). 原地改 db/midMap. */
export function upsertMonster(db: MonsterDB, midMap: MonsterMID, s: SpawnInfo): void {
  const cur = db[s.name];
  if (cur && cur.mid !== s.mid) {
    midMap[cur.mid] = cur;            // 名字被别的怪占用 → 备份旧
    delete db[s.name];
  }
  if (midMap[s.mid]) {                // 本 MID 有旧备份 → 恢复
    db[s.name] = midMap[s.mid];
    delete midMap[s.mid];
  }
  const rec = db[s.name] ?? { mid: s.mid };
  rec.mid = s.mid;
  (rec as Record<number, number>)[s.lv] = s.hp;
  db[s.name] = rec;
}
```

- [ ] **Step 2: 验证** `cd autobattle && npm run typecheck` → PASS。

- [ ] **Step 3: Commit**
```bash
git add autobattle/src/record/monster-db.ts
git commit -m "feat(autobattle): record/monster-db upsert 纯函数(翻写 monsterDB 同名异MID)"
```

---

## Task 8: record/stats-collector.ts(A 订阅者)

**Files:** Create `autobattle/src/record/stats-collector.ts`

- [ ] **Step 1: 写 stats-collector.ts**
```typescript
// A 收益统计订阅者(副作用壳). 订阅 bus → 调纯函数 → 落 Store. 跳过 isRetry. battle:end 结算掉落.
import { bus } from '../core/bus';
import { Store } from '../core/store';
import { config } from '../core/config';
import { extractTextlog } from './battle-code';
import { parseDrops } from './drop-parse';
import { emptyStats, accumulateUsage } from './usage-parse';
import { parseSpawns, upsertMonster } from './monster-db';
import type { StatsAccum, MonsterDB, MonsterMID } from '../types';

const STATS_KEY = 'stats';
const STATS_OLD_KEY = 'statsOld';
const MDB_KEY = 'monsterDB';
const MMID_KEY = 'monsterMID';

let cur: StatsAccum | null = null;      // 当前累计(in-progress)
let curBattleId = '';                   // 本场 id
let lastRoundSeen = -1;                 // 上次记录的 roundNow(检测新波累计 rounds/bosses/monsters)

function loadStats(nowMs: number): StatsAccum {
  return Store.get<StatsAccum>(STATS_KEY, emptyStats(nowMs));
}

export function initStatsCollector(): void {
  bus.on('battle:round', (r) => {
    try {
      if (r.isRetry) return;                 // 安全网重试/stalled → 不计入
      if (!config.get('recordEnabled')) return;
      if (!cur) cur = loadStats(Date.now());
      const lines = extractTextlog(r.rawJson);
      // usage(技能从结构化 action; damage/hurt 等从 textlog)
      accumulateUsage(cur, r.action, lines);
      // monsterDB(开关控落盘)
      if (config.get('cacheMonsterHP')) {
        const db = Store.get<MonsterDB>(MDB_KEY, {});
        const mid = Store.get<MonsterMID>(MMID_KEY, {});
        let changed = false;
        for (const sp of parseSpawns(lines)) { upsertMonster(db, mid, sp); changed = true; }
        if (changed) { Store.set(MDB_KEY, db); Store.set(MMID_KEY, mid); }
      }
      // 每真实回合 +turns; 新波(roundNow 变)累计 rounds/bosses/monsters
      cur.turns += 1;
      if (r.roundNow !== lastRoundSeen) {
        cur.rounds += 1;
        cur.bosses += r.bossThisWave;     // boss 口径 = is_red_boss(reader.ts:188), 每波聚合
        cur.monsters += r.record.total;   // 本波总怪数(LogRecord.total = monsterTotal)
        lastRoundSeen = r.roundNow;
      }
      Store.set(STATS_KEY, cur);
    } catch { /* 采集不能崩 */ }
  });

  bus.on('battle:end', (e) => {
    try {
      if (!config.get('recordEnabled')) return;
      if (!cur) cur = loadStats(Date.now());
      // 掉落 + EXP/Credit(末回合 /json)
      const lines = extractTextlog(e.finalRawJson);
      const d = parseDrops(lines, config.get('dropQuality'));
      cur.exp += d.exp; cur.credit += d.credit;
      for (const k in d.drops) cur.drops[k] = (cur.drops[k] || 0) + d.drops[k];
      cur.battles += 1;
      cur.activeMs += Math.max(0, e.endedAt - e.startedAt);
      Store.set(STATS_KEY, cur);
      // 归档单场聚合摘要(玩家向多场对比; 限 archiveMaxBattles)
      const old = Store.get<({ battleCode: string; level: number | null; exp: number; credit: number; endedAt: number })[]>(STATS_OLD_KEY, []);
      old.push({ battleCode: e.battleCode, level: e.level, exp: d.exp, credit: d.credit, endedAt: e.endedAt });
      const keep = config.get('archiveMaxBattles');
      Store.set(STATS_OLD_KEY, old.slice(-keep));
      void curBattleId; void e.battleId;   // ui/stats(Task 11)订阅 battle:end 自刷, collector 不直接 emit
    } catch { /* 采集不能崩 */ }
  });
}
```
> **累计口径**: turns 每真实回合 +1(跳过 isRetry); rounds/bosses/monsters 在新波(`r.roundNow !== lastRoundSeen`)累计(boss=is_red_boss 每波 bossThisWave, monsters=本波 record.total); battles/exp/credit/drops 在 battle:end 累计。ui/stats(Task 11)订阅 battle:end 自刷, collector 不直接 emit。

- [ ] **Step 2: 验证** `cd autobattle && npm run typecheck` → PASS。

- [ ] **Step 3: Commit**
```bash
git add autobattle/src/record/stats-collector.ts
git commit -m "feat(autobattle): record/stats-collector A 订阅者(掉落/EXP/usage/monsterDB 落 Store)"
```

---

## Task 9: loop.ts 集成 emit battle:round + battle:end + battleId

**Files:** Modify `autobattle/src/loop.ts`

- [ ] **Step 1: 顶部 import**
```typescript
import { getLastBattle } from './core/net-cache';
import { parseRoundFromJson, deriveBattleCode } from './record/battle-code';
```
并在模块级状态区(`let cannonRoundSeen = ...` 附近)加:
```typescript
let curBattleId = Store.get<string>('curBattleId', '');
let battleStartTs = Store.get<number>('curBattleStart', 0);
```

- [ ] **Step 2: 在 changed 块的 roundNow 倒退检测处(L82 附近)加 battleId 切换沿 + battle:end**

现有 L80-89 changed 块。在 `cannonRoundSeen = S.roundNow;` 之前插入 battleId 管理(复用 roundNow 倒退判据):
```typescript
        if (changed) {
          const raw = getLastBattle();
          const rj = parseRoundFromJson(raw);
          const rNow = rj?.roundNow ?? S.roundNow;
          const rAll = rj?.roundAll ?? S.roundAll;
          // 新场判定: roundNow 倒退(R30→R1=重开) 或 首次无 battleId
          const isNewBattle = !curBattleId || (rNow > 0 && cannonRoundSeen > 0 && rNow < cannonRoundSeen);
          if (isNewBattle) {
            const { battleCode, level } = deriveBattleCode(S.battleType, rAll, config.get('arenaTiers'));
            // 先对上一场 emit battle:end(若有)
            if (curBattleId) {
              bus.emit('battle:end', {
                battleId: curBattleId, battleCode, level, roundAll: rAll,
                victorious: /You are Victorious/i.test(parseRoundFromJson(raw) ? '' : ''), // 占位见 Step3
                finalRawJson: raw, startedAt: battleStartTs, endedAt: Date.now(),
              });
            }
            curBattleId = `${battleCode}@${Date.now()}`;
            battleStartTs = Date.now();
            Store.set('curBattleId', curBattleId);
            Store.set('curBattleStart', battleStartTs);
          }
          // ... 现有 cannonCd 倒退清零/递减逻辑保持 ...
        }
```
> **注**: battle:end 的 victorious/battleCode 需用「上一场」的信息。精确实现: 把上一场的 battleCode/level/roundAll 也存 Store(`curBattleCode`/`curLevel`/`curRoundAll`), 切换时读出给 battle:end, 再写新场的。Step3 给完整版。

- [ ] **Step 3: 完整 battleId + battle:end 逻辑(替代 Step2 占位)**

实现时按此完整版(把上一场元信息存 Store, 切换沿结算上一场):
```typescript
        if (changed) {
          const raw = getLastBattle();
          const rj = parseRoundFromJson(raw);
          const rNow = rj?.roundNow ?? S.roundNow;
          const rAll = rj?.roundAll ?? S.roundAll;
          const isNewBattle = !curBattleId || (rNow > 0 && cannonRoundSeen > 0 && rNow < cannonRoundSeen);
          if (isNewBattle) {
            if (curBattleId) {
              const victorious = /You are Victorious/i.test((getLastBattle() && raw) || '');
              bus.emit('battle:end', {
                battleId: curBattleId,
                battleCode: Store.get<string>('curBattleCode', ''),
                level: Store.get<number | null>('curLevel', null),
                roundAll: Store.get<number>('curRoundAll', 0),
                victorious, finalRawJson: raw,
                startedAt: battleStartTs, endedAt: Date.now(),
              });
            }
            const meta = deriveBattleCode(S.battleType, rAll, config.get('arenaTiers'));
            curBattleId = `${meta.battleCode}@${Date.now()}`;
            battleStartTs = Date.now();
            Store.set('curBattleId', curBattleId);
            Store.set('curBattleStart', battleStartTs);
            Store.set('curBattleCode', meta.battleCode);
            Store.set('curLevel', meta.level);
            Store.set('curRoundAll', rAll);
          }
          if (S.roundNow > 0 && cannonRoundSeen > 0 && S.roundNow < cannonRoundSeen) cannonCd = 0;
          cannonRoundSeen = S.roundNow;
          if (cannonCd > 0) cannonCd--;
          if (regenCd > 0) regenCd--;
          if (manaPotCd > 0) manaPotCd--;
          Store.set('cannonCd', cannonCd);
          Store.set('cannonRound', cannonRoundSeen);
        }
```
(即在现有 changed 块**最前面**插入 battleId/battle:end 段, 保留其后原有 cannonCd 逻辑。)

- [ ] **Step 4: logger.push 后(L171 之后)emit battle:round**
```typescript
        bus.emit('battle:round', {
          battleId: curBattleId,
          battleCode: Store.get<string>('curBattleCode', ''),
          level: Store.get<number | null>('curLevel', null),
          roundNow: S.roundNow, roundAll: S.roundAll, turn,
          action: { type: a.type, id: a.id },
          actionLabel: actionLabel(a),
          record: { round: S.roundAll ? `R${S.roundNow}/${S.roundAll}` : S.battleType, turn, oc: S.overcharge, hp: pct(S.hp, S.maxHp || C.HPMAX), mp: pct(S.mp, S.maxMp || C.MPMAX), sp: pct(S.sp, S.maxSp || C.SPMAX), alive: S.alive, total: S.monsterTotal, cannon: S.cannonOnCd ? `冷却${cannonCd}` : S.overcharge >= C.CANNON_MIN_OC ? '可放' : '攒OC', stance: S.stanceOn, action: actionLabel(a), note, foe },
          rawJson: getLastBattle(),
          bossThisWave: S.enemies.filter((e) => e.alive && e.is_red_boss).length,
          isRetry: !changed || stuckN >= 2,
        });
```
> 复用刚 push 的 LogRecord 字段(与 logger.push 同对象语义)。`isRetry` 在 stalled(!changed)或安全网(stuckN>=2)时为 true → 订阅者跳过。

- [ ] **Step 5: 验证** `cd autobattle && npm run typecheck && npm run build && node --check dist/hv-autobattle.user.js` → 全 PASS(战斗内决策/去抖/busyUntil 逻辑零改, recordEnabled 默认 true 但订阅者只读不影响决策)。

- [ ] **Step 6: Commit**
```bash
git add autobattle/src/loop.ts
git commit -m "feat(autobattle): loop emit battle:round/battle:end + battleId 切换沿(决策零改)"
```

---

## Task 10: main.ts init stats-collector

**Files:** Modify `autobattle/src/main.ts`

- [ ] **Step 1: import + init**

顶部加 `import { initStatsCollector } from './record/stats-collector';`。在入口区(`hookNet();` 之后、`onReady` 之前)加 `initStatsCollector();`。

- [ ] **Step 2: 验证** `cd autobattle && npm run typecheck && npm run build` → PASS。

- [ ] **Step 3: Commit**
```bash
git add autobattle/src/main.ts
git commit -m "feat(autobattle): main 启动 stats-collector 订阅者"
```

---

## Task 11: ui/stats.ts 收益 tab + panel 接入

**Files:** Create `autobattle/src/ui/stats.ts`; Modify `autobattle/src/ui/panel.ts`

- [ ] **Step 1: 写 ui/stats.ts**
```typescript
// A 收益统计面板. 订阅 battle:end 自刷(仅可见时). 复用 group/components.
import { el } from '../core/dom';
import { bus } from '../core/bus';
import { Store } from '../core/store';
import type { StatsAccum } from '../types';

function rows(title: string, obj: Record<string, number>): string {
  const items = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  if (!items.length) return '';
  return `<div class="hvab-gh">${title}</div>` + items.map(([k, v]) => `<div class="hvab-row"><span>${k}</span><span>${v}</span></div>`).join('');
}

export function statsPane(): HTMLElement {
  const p = el('div', { id: 'hvab-stats-pane' });
  const render = () => {
    const s = Store.get<StatsAccum | null>('stats', null);
    if (!s) { p.innerHTML = '<div class="hvab-empty">暂无记录 · 打一场即出</div>'; return; }
    const h = Math.max(0.001, (Date.now() - s.startTime) / 3600000);
    p.innerHTML =
      `<div class="hvab-gh">收益(本会话)</div>` +
      `<div class="hvab-row"><span>EXP</span><span>${s.exp} (${Math.round(s.exp / h)}/h)</span></div>` +
      `<div class="hvab-row"><span>Credit</span><span>${s.credit} (${Math.round(s.credit / h)}/h)</span></div>` +
      `<div class="hvab-row"><span>场次/回合/怪</span><span>${s.battles}/${s.rounds}/${s.monsters}</span></div>` +
      rows('掉落', s.drops) + rows('技能次数', s.magic) + rows('物品次数', s.items) + rows('伤害', s.damage) + rows('回复', s.restore) +
      `<div class="hvab-gh">受伤</div><div class="hvab-row"><span>总/物理均/魔法均</span><span>${s.hurt.total}/${Math.round(s.hurt.pavg)}/${Math.round(s.hurt.mavg)}</span></div>`;
  };
  render();
  bus.on('battle:end', () => { if (p.offsetParent) render(); }); // 仅可见时刷
  return p;
}
```

- [ ] **Step 2: panel.ts 加 stats tab**

`panel.ts` 的 `TABS` 数组(L5-10)加 `{ key: 'stats', label: '收益' }`; `paneFor`(L25-36) 加 `case 'stats': return statsPane();`; 顶部 import `import { statsPane } from './stats';`。**`config.ts` 的 `activeTab` 联合类型**(`'battle'|'farm'|'guard'|'notify'`)加 `'stats'`。

- [ ] **Step 3: 验证** `cd autobattle && npm run typecheck && npm run build` → PASS。

- [ ] **Step 4: Commit**
```bash
git add autobattle/src/ui/stats.ts autobattle/src/ui/panel.ts autobattle/src/core/config.ts
git commit -m "feat(autobattle): 收益 tab(ui/stats) + panel 接入"
```

---

## Task 12: scripts/drive-record.mts 纯函数回归

**Files:** Create `autobattle/scripts/drive-record.mts`

- [ ] **Step 1: 写 drive-record.mts(对齐现有 drive-*.mts 范式)**
```typescript
// 纯函数回归: 喂样本 textlog 断言 drop/usage/monster/battle-code. node --experimental-strip-types 跑.
import { parseRoundFromJson, deriveBattleCode } from '../src/record/battle-code.ts';
import { parseDrops } from '../src/record/drop-parse.ts';
import { parseSpawns, upsertMonster } from '../src/record/monster-db.ts';
import { emptyStats, accumulateUsage } from '../src/record/usage-parse.ts';
import type { MonsterDB, MonsterMID } from '../src/types.ts';

let fail = 0;
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error('FAIL', msg, a, '!=', b); fail++; } else console.log('ok', msg); };

// battle-code
eq(parseRoundFromJson('{"textlog":[{"t":"Initializing Grindfest (Round 2 / 1000) ...","c":""}]}'), { roundNow: 2, roundAll: 1000 }, 'parseRound GF');
const TIERS = [{ roundAll: 50, level: 130, name: '流亡之途' }];
eq(deriveBattleCode('竞技场', 50, TIERS), { battleCode: 'AR-Lv130-流亡之途', level: 130 }, 'arena tier');
eq(deriveBattleCode('竞技场', 99, TIERS), { battleCode: 'AR-R99', level: null }, 'arena 失配');
eq(deriveBattleCode('压榨界', 1000, TIERS), { battleCode: 'GF', level: null }, 'GF');

// drop-parse
eq(parseDrops(['You gain 1234 EXP', 'You gain 56 Credit', '<span style="color:rgb(186, 5, 180)">3x Crystal of Power</span>'], 6),
  { exp: 1234, credit: 56, drops: { 'Crystal of Power': 3 } }, 'drop crystal+exp');

// monster-db
const db: MonsterDB = {}, mid: MonsterMID = {};
for (const s of parseSpawns(['Spawned Monster A: MID=194290 (Use) LV=398 HP=144152'])) upsertMonster(db, mid, s);
eq(db['Use']?.mid, 194290, 'monsterDB mid');
eq((db['Use'] as Record<number, number>)[398], 144152, 'monsterDB hp');

// usage
const st = emptyStats(0);
accumulateUsage(st, { type: 'spell', id: 1080 }, ['hits you for 257 wind damage']);
eq(st.magic['#1080'], 1, 'usage skill count');
eq(st.hurt.total, 257, 'usage hurt');

console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 运行** `cd autobattle && node --experimental-strip-types scripts/drive-record.mts`
Expected: `ALL PASS`。(若某条 FAIL, 是纯函数正则/逻辑 bug, 修对应 record 模块。)

- [ ] **Step 3: Commit**
```bash
git add autobattle/scripts/drive-record.mts
git commit -m "test(autobattle): drive-record 纯函数回归(battle-code/drop/usage/monster)"
```

---

## Task 13: 构建 + 阶段1 验收

- [ ] **Step 1:** `cd autobattle && npm run typecheck` → PASS
- [ ] **Step 2:** `cd autobattle && node --experimental-strip-types scripts/drive-record.mts` → ALL PASS
- [ ] **Step 3:** `cd autobattle && npm run build && node --check dist/hv-autobattle.user.js` → 产单文件不压缩 + 语法 OK
- [ ] **Step 4: diagnostics** vscode-mcp-server 检查改动文件(若不可用则跳过并说明)
- [ ] **Step 5: GF 真机实测(人工, 装最新 build)**:
  1. 打一场竞技场/GF, 开收益 tab → 见 EXP/Credit/掉落/技能次数累计、场次+1。
  2. **真机 dump 一份 /json**: console `JSON.parse(__hvab.getLastBattle())` → 核对 textlog[].t 实际 HTML(掉落 span 写法/rgb 空格/Round 行/Spawned 行) → 若与 drop-parse/usage-parse 正则不符, 微调正则 + 重跑 drive-record。
  3. GF 连刷: 确认一场 GF(roundAll=1000)只算 1 场(不是每波+1) — 验证 battleId 切换沿正确。
  4. recordEnabled 默认 true 但只读旁路, 确认战斗决策零回归。
- [ ] **Step 6: Commit 构建产物**
```bash
git add autobattle/dist/hv-autobattle.user.js
git commit -m "build(autobattle): 记录阶段1 构建产物(A 收益统计可挂载)"
```

---

## 验收(阶段1 完成判据)
- `npm run typecheck` + `node --check` 通过; `drive-record.mts` ALL PASS; `npm run build` 单文件不压缩。
- 收益 tab 显示掉落/EXP/Credit/技能/伤害/场次累计 + monsterDB 落盘。
- battleId 切换沿正确(GF 一场不被切成多场); 战斗决策零回归(recordEnabled 旁路)。
- 真机 dump /json 核对解析正则(掉落 span/rgb、Round、Spawned 句式)。

## 阶段2/3 待办(本计划外)
- **阶段2(前置: 真机 dump /json schema + RB URL 确认)**: idb.ts + battle-archive(逐回合直写 rounds + battleId 跨 reload) + ui/log.ts 按等级对比视图 + 导出 + 容量清理。
- **阶段3**: rate 两口径(active/session) + player-level(玩家角色等级) + HUD 集成 + 打磨。
