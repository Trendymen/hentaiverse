# 目标权重系统(finWeight)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 autobattle 的 brain 平砍目标选择接入 dodying 的 finWeight 目标权重(血量 + 13 状态 + Yggdrasil boss),取代现在的"最低 eid 杂兵"。

**Architecture:** 方案 C 分层 —— `reader` 只读原始数据(绝对 hpNow/name/13 状态),新增纯函数模块 `target-weight.ts` 算权重排序,`brain` P16 薄调用。红怪锁定线全不动(守半自动红线)。

**Tech Stack:** TypeScript(strict) + vite-plugin-monkey;无测试框架,验证靠 `npm run typecheck` + GF 真机实测(chrome-devtools 控制台喂数据)。

**设计依据:** `docs/superpowers/specs/2026-06-05-autobattle-target-weight-design.md`(含 GF 真机实测发现)。

**实现顺序:** types → tables(STATUS_LIB) → target-weight.ts(纯函数,可独立) → reader → brain → config → 整体验证。

**全局约束:**
- 仅中文 UI;tsc strict 必须过;打包不压缩。
- 血条 index bug 修复(Task 4)**无条件生效**,不受 `useTargetWeight` 控制。
- `useTargetWeight` 默认 **false**(灰度);关掉时 `rankTargets` 退回 eid 升序 = 现状,零回归。
- 每个 Task 末尾 commit 只 `git add` 本 Task 改的文件(不碰别的会话未提交文件)。
- commit message 结尾加 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。

---

## File Structure

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/types.ts` | 改 | `EnemyState` 加 `hpNow`/`name`/`status`;新增 `WeightInput`/`WeightConfig`/`RankedEnemy` |
| `src/battle/tables.ts` | 改 | 新增 `STATUS_LIB`(13 状态表) + `StatusDef` 接口 |
| `src/battle/target-weight.ts` | 建 | 纯函数 `computeFinWeight`/`rankTargets`(零 DOM/单例) |
| `src/battle/reader.ts` | 改 | 修血条 bug + `_spawnHp()` 缓存初始 HP + map 内算 hpNow/name/status |
| `src/battle/brain.ts` | 改 | P16 换 `rankTargets` + `weightCfg` helper + import |
| `src/core/config.ts` | 改 | 新增 5 键 |

---

## Task 1: types.ts — 扩 EnemyState + 权重类型

**Files:**
- Modify: `src/types.ts:67-76`(EnemyState)、文件尾部加权重类型

- [ ] **Step 1: 给 EnemyState 加 3 字段**

把 `src/types.ts` 的 `EnemyState`(67-76 行)整体替换为:

```ts
/** 单个敌人状态 */
export interface EnemyState {
  eid: number;
  alive: boolean;
  is_red_boss: boolean;
  debuff: Record<string, boolean>;
  penArmor: boolean;
  hpPct: number; // 当前 HP%(血条 width/120)
  bleeding: boolean; // 是否流血(wpn_bleed; 慈悲处决判据)
  stunned: boolean; // 是否晕眩(要害连招判据: 盾击晕眩→要害高伤)
  hpNow: number; // 绝对当前 HP(initHp×width/120; 初始HP缺失时退化为 hpPct; 死怪 Infinity)
  name: string; // 怪名(.btm3 文本; Yggdrasil 检测用)
  status: Record<string, boolean>; // 13 状态 flags(STATUS_LIB key → 是否挂着)
}
```

- [ ] **Step 2: 文件尾部新增权重模块类型**

在 `src/types.ts` 末尾(`BusEvents` 之后)追加:

```ts
/** target-weight 纯函数输入(EnemyState 的结构子集; EnemyState 鸭子类型可直接传) */
export interface WeightInput {
  eid: number;
  alive: boolean;
  is_red_boss: boolean;
  hpNow: number;
  name: string;
  status: Record<string, boolean>;
}

/** target-weight 配置(brain 从 config 装配传入; 模块本身不碰单例) */
export interface WeightConfig {
  baseHpRatio: number;
  yggdrasilExtraWeight: number;
  unreachableWeight: number;
  statusWeight: Record<string, number>;
  enabled: boolean;
}

/** 带 finWeight 的排序结果 */
export type RankedEnemy = WeightInput & { finWeight: number };
```

- [ ] **Step 3: typecheck（此时 reader 还没填新字段,EnemyState 必报缺字段 → 预期失败,确认改动生效）**

Run: `cd autobattle && npm run typecheck`
Expected: 报错 `src/battle/reader.ts` 返回的 enemies 对象缺少 `hpNow`/`name`/`status`(Task 4 补)。这是预期的中间态。

- [ ] **Step 4: Commit**

```bash
cd autobattle && git add src/types.ts
git commit -m "feat(autobattle): types 扩 EnemyState(hpNow/name/status) + 权重类型(WeightInput/WeightConfig/RankedEnemy)

目标权重系统 Task1; 见 specs/2026-06-05-autobattle-target-weight-design.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: tables.ts — STATUS_LIB 13 状态表

**Files:**
- Modify: `src/battle/tables.ts`(在 DEBUFFS 定义之后插入)

- [ ] **Step 1: 新增 StatusDef 接口 + STATUS_LIB**

在 `src/battle/tables.ts` 的 `DEBUFFS` 数组定义(76 行结束)之后插入:

```ts
/** 怪物 13 状态库(翻写 dodying skillLib hvAutoAttack.user.js:3302-3355).
 *  key → {中文名, src 关键字, 官方英文名}. reader 读状态用它, target-weight 权重按 key 对应; 不含权重数值(解耦).
 *  匹配: .btm6 img 的 src 含 img 关键字, 或 onmouseover set_infopane_effect('name'...) 官方名(双保险). */
export interface StatusDef {
  cn: string;
  img: string;
  name: string;
}
export const STATUS_LIB: Record<string, StatusDef> = {
  We: { cn: '虚弱', img: 'weaken', name: 'Weaken' },
  Bl: { cn: '致盲', img: 'blind', name: 'Blind' },
  Slo: { cn: '缓慢', img: 'slow', name: 'Slow' },
  Si: { cn: '沉默', img: 'silence', name: 'Silence' },
  Sle: { cn: '沉眠', img: 'sleep', name: 'Sleep' },
  Im: { cn: '陷危', img: 'imperil', name: 'Imperil' },
  PA: { cn: '破甲', img: 'wpn_ap', name: 'Penetrated Armor' },
  BW: { cn: '流血', img: 'wpn_bleed', name: 'Bleeding Wound' },
  Co: { cn: '混乱', img: 'confuse', name: 'Confuse' },
  Dr: { cn: '枯竭', img: 'drainhp', name: 'Drain' },
  MN: { cn: '魔磁网', img: 'magnet', name: 'MagNet' },
  Stun: { cn: '眩晕', img: 'wpn_stun', name: 'Stunned' },
  CM: { cn: '魔力合流', img: 'coalescemana', name: 'Coalesced Mana' },
};
```

- [ ] **Step 2: typecheck（STATUS_LIB 是纯数据,本身应无错;仍是 Task1 的中间态报错）**

Run: `cd autobattle && npm run typecheck`
Expected: 仍只报 reader 的 EnemyState 缺字段(Task 4 修);tables.ts 本身无新错。

- [ ] **Step 3: Commit**

```bash
cd autobattle && git add src/battle/tables.ts
git commit -m "feat(autobattle): tables 加 STATUS_LIB(13状态表, 翻写 dodying skillLib)

目标权重系统 Task2

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: target-weight.ts — 纯函数权重模块（可独立验证）

**Files:**
- Create: `src/battle/target-weight.ts`

- [ ] **Step 1: 创建 target-weight.ts**

新建 `src/battle/target-weight.ts`,完整内容:

```ts
// 目标权重(finWeight)纯函数模块. 翻写 dodying countMonsterHP hvAutoAttack.user.js:3357-3379.
// 零 DOM / 零 config 单例 / 零 Store: 输入即全部依赖, 可独立喂数据验证(控制台 import 直接跑).
import type { WeightInput, WeightConfig, RankedEnemy } from '../types';

/** 单怪 finWeight(可独立验证的最小单元). hpMin = 全体活怪 hpNow 最小值.
 *  权重越小优先级越高: 血越低→w 越小; 负权重状态(陷危/破甲/流血/混乱)→更小→优先打;
 *  正权重状态(眩晕/沉眠/虚弱等)→更大→靠后打. */
export function computeFinWeight(e: WeightInput, hpMin: number, cfg: WeightConfig): number {
  if (!e.alive || !isFinite(e.hpNow)) return cfg.unreachableWeight; // 死怪/不可达垫底
  let w = cfg.baseHpRatio * Math.log10(e.hpNow / hpMin); // >0 生命越低权重越低
  if (e.name.includes('Yggdrasil')) w += cfg.yggdrasilExtraWeight; // 世界树 boss 绝对优先
  for (const k in cfg.statusWeight) if (e.status[k]) w += cfg.statusWeight[k];
  return w;
}

/** 按 finWeight 升序排序(拷贝输入, 不可变, 纯函数). [0] = 最该打的目标.
 *  enabled=false → 直接按 eid 升序返回(总开关关 = 退回现状, 零回归). */
export function rankTargets(enemies: WeightInput[], cfg: WeightConfig): RankedEnemy[] {
  if (!cfg.enabled) {
    return [...enemies]
      .map((e) => ({ ...e, finWeight: e.eid }))
      .sort((a, b) => a.finWeight - b.finWeight);
  }
  const liveHp = enemies.filter((e) => e.alive && isFinite(e.hpNow)).map((e) => e.hpNow);
  const hpMin = liveHp.length ? Math.min(...liveHp) : 1;
  return enemies
    .map((e) => ({ ...e, finWeight: computeFinWeight(e, hpMin, cfg) }))
    .sort((a, b) => a.finWeight - b.finWeight);
}
```

- [ ] **Step 2: typecheck（模块自身应编译通过）**

Run: `cd autobattle && npm run typecheck`
Expected: target-weight.ts 无错(仍只剩 reader 的中间态报错)。

- [ ] **Step 3: 纯函数手验（dev 构建后控制台喂数据,或临时内联断言)**

在 `src/battle/target-weight.ts` 末尾**临时**加一段自检(验证后删除):

```ts
// —— 临时自检(验证后删除本段) ——
const _cfg: WeightConfig = { baseHpRatio: 1, yggdrasilExtraWeight: -1000, unreachableWeight: 1000, statusWeight: { Im: -15, Stun: 290 }, enabled: true };
const _mk = (eid: number, hpNow: number, name = '', status: Record<string, boolean> = {}): WeightInput => ({ eid, alive: true, is_red_boss: false, hpNow, name, status });
console.log('低血优先 [2,1]:', rankTargets([_mk(1, 100), _mk(2, 10)], _cfg).map((e) => e.eid));
console.log('Yggdrasil 满血也第一 [9,..]:', rankTargets([_mk(1, 10), _mk(9, 99999, 'Yggdrasil')], _cfg).map((e) => e.eid));
console.log('陷危(Im)优先于同血裸怪:', rankTargets([_mk(1, 100), _mk(2, 100, '', { Im: true })], _cfg).map((e) => e.eid));
console.log('enabled=false 退化 eid 升序 [1,2]:', rankTargets([_mk(2, 10), _mk(1, 99)], { ..._cfg, enabled: false }).map((e) => e.eid));
console.log('baseHpRatio=-1 高血优先 [1,2]:', rankTargets([_mk(1, 100), _mk(2, 10)], { ..._cfg, baseHpRatio: -1 }).map((e) => e.eid));
```

Run: `cd autobattle && npm run build` 然后在浏览器装载脚本看 console。
Expected 输出:
```
低血优先 [2,1]: [2, 1]
Yggdrasil 满血也第一 [9,..]: [9, 1]
陷危(Im)优先于同血裸怪: [2, 1]
enabled=false 退化 eid 升序 [1,2]: [1, 2]
baseHpRatio=-1 高血优先 [1,2]: [1, 2]
```

- [ ] **Step 4: 删除临时自检段**

删掉 Step 3 加的 `—— 临时自检 ——` 整段。再次 `npm run typecheck` 应通过(无未用变量报错)。

- [ ] **Step 5: Commit**

```bash
cd autobattle && git add src/battle/target-weight.ts
git commit -m "feat(autobattle): target-weight.ts 纯函数权重模块(computeFinWeight/rankTargets)

翻写 dodying finWeight 公式; 手验 5 用例通过(低血/Yggdrasil/状态/退化/反转)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: reader.ts — 修血条 bug + 初始 HP 解析 + hpNow/name/status

**Files:**
- Modify: `src/battle/reader.ts`(实例字段、import、`_spawnHp()` 新方法、read() 内 enemies map 块)

- [ ] **Step 1: import STATUS_LIB**

把 `src/battle/reader.ts:5` 的:
```ts
import { BUFF_IMG, DEBUFFS, SS_CN, GEM } from './tables';
```
改为:
```ts
import { BUFF_IMG, DEBUFFS, SS_CN, GEM, STATUS_LIB } from './tables';
```

- [ ] **Step 2: 加实例缓存字段**

在 `StateReader` 类的 `takesMagic` 字段(reader.ts:16)之后加:
```ts
  initHp: Record<string, number> = {}; // 缓存: 怪初始 HP(键=字母 A-E, 对应 mkey/DOM idx; Spawned 行解析)
```

- [ ] **Step 3: 新增 _spawnHp() 方法**

在 `_enemyMagic()` 方法(reader.ts:81 结束)之后插入:

```ts
  /** 从 #textlog 解析 "Spawned Monster X: MID=N (Name) LV=N HP=N" 行 → 缓存每怪初始 HP.
   *  GF 实测格式(2026-06-05): "Spawned Monster A: MID=325614 (Halo Effect) LV=398 HP=105710".
   *  字母 A→mkey_1/idx0, B→mkey_2/idx1 …(letter=String.fromCharCode(65+idx)).
   *  textlog 每波给一次且最新在顶部, 长回合可能被挤出末尾 → 解析到就更新, 没有则沿用; 新波同字母覆盖. */
  private _spawnHp(): void {
    const tl = document.getElementById('textlog');
    if (!tl) return;
    const re = /Spawned Monster ([A-Z]):\s*MID=\d+\s*\([^)]+\)\s*LV=\d+\s*HP=(\d+)/g;
    for (const m of (tl.textContent || '').matchAll(re)) this.initHp[m[1]] = +m[2];
  }
```

- [ ] **Step 4: read() 开头调用 _spawnHp()**

在 `read()` 里 `this._enemyMagic();`(reader.ts:86)之后加一行:
```ts
    this._spawnHp(); // 更新怪初始 HP 缓存(Spawned 行)
```

- [ ] **Step 5: 替换 enemies map 块(修血条 bug + 加 hpNow/name/status)**

把 reader.ts 的这一段(约 113-134 行,从 `const allMkey` 到 `.filter((e) => e.alive);`):

```ts
    const allMkey = $$<HTMLElement>('[id^="mkey_"]');
    // 怪血条 img(顺序同 mkey): style.width/120 = HP%(翻写 dodying countMonsterHP:3296). 【index 对应待 GF 核对】
    const bloodImgs = $$<HTMLImageElement>('.btm4 > .btm5:nth-child(1) img');
    const enemies: EnemyState[] = allMkey
      .map((m, idx) => {
        const eid = +m.id.split('_')[1];
        const dimg = $$<HTMLImageElement>('.btm6 img', m).map((i) => i.getAttribute('src') || '');
        const debuff: Record<string, boolean> = {};
        for (const d of DEBUFFS) debuff[d.key] = dimg.some((s) => d.img.test(s));
        const bw = bloodImgs[idx] ? parseFloat(bloodImgs[idx].style.width || '120') : 120;
        return {
          eid,
          alive: !/opacity/.test(m.getAttribute('style') || ''),
          is_red_boss: !!$('.btm2[style*="background"]', m),
          debuff,
          penArmor: dimg.some((s) => /penetrat|bleed/i.test(s)),
          hpPct: isNaN(bw) ? 100 : Math.round((bw / 120) * 100), // 当前 HP%(满血条 width=120)
          bleeding: $$<HTMLImageElement>('img', m).some((i) => /wpn_bleed/i.test(i.getAttribute('src') || '')), // 流血图标(慈悲处决判据)
          stunned: $$<HTMLImageElement>('img', m).some((i) => /stun/i.test(i.getAttribute('src') || '')), // 晕眩图标(要害连招判据: 盾击晕眩→要害高伤)【src 待实测核对】
        };
      })
      .filter((e) => e.alive);
```

整体替换为(注意:**血条改 per-mkey**,弃用全局 `bloodImgs[idx]`;新增 hpNow/name/status;bleeding/stunned 读法保持不变):

```ts
    const allMkey = $$<HTMLElement>('[id^="mkey_"]');
    const enemies: EnemyState[] = allMkey
      .map((m, idx) => {
        const eid = +m.id.split('_')[1];
        const dimgEl = $$<HTMLImageElement>('.btm6 img', m);
        const dimg = dimgEl.map((i) => i.getAttribute('src') || '');
        const debuff: Record<string, boolean> = {};
        for (const d of DEBUFFS) debuff[d.key] = dimg.some((s) => d.img.test(s));
        // 13 状态 flags: src 关键字 或 onmouseover 官方名(双保险, 翻写 dodying skillLib)
        const status: Record<string, boolean> = {};
        for (const k in STATUS_LIB) {
          const sd = STATUS_LIB[k];
          status[k] =
            dimg.some((s) => s.includes(sd.img)) ||
            dimgEl.some((i) => (i.getAttribute('onmouseover') || '').includes(`set_infopane_effect('${sd.name}'`));
        }
        // 血条 per-mkey(修 index bug: 全局 .btm5:nth-child(1) img 每怪含 nbargreen+nbarfg 两 img → bloodImgs[idx] 错位)
        const bImg = m.querySelector<HTMLImageElement>('.btm4 > .btm5:nth-child(1) img');
        const bw = bImg ? parseFloat(bImg.style.width || '120') : 120;
        const hpPct = isNaN(bw) ? 100 : Math.round((bw / 120) * 100); // 满血条 width=120(GF 实测)
        const dead = /opacity/.test(m.getAttribute('style') || '');
        // 绝对 hpNow: initHp[字母] × width/120(翻写 dodying:3296); 初始HP缺失退化 hpPct(同基准排序仍对); 死怪 Infinity
        const init = this.initHp[String.fromCharCode(65 + idx)];
        const hpNow = dead ? Infinity : init ? Math.floor((init * bw) / 120 + 1) : hpPct;
        return {
          eid,
          alive: !dead,
          is_red_boss: !!$('.btm2[style*="background"]', m),
          debuff,
          penArmor: dimg.some((s) => /penetrat|bleed/i.test(s)),
          hpPct,
          bleeding: $$<HTMLImageElement>('img', m).some((i) => /wpn_bleed/i.test(i.getAttribute('src') || '')),
          stunned: $$<HTMLImageElement>('img', m).some((i) => /stun/i.test(i.getAttribute('src') || '')),
          hpNow,
          name: ($('.btm3', m)?.textContent || '').trim(),
          status,
        };
      })
      .filter((e) => e.alive);
```

- [ ] **Step 6: typecheck（EnemyState 现已填全字段,应通过）**

Run: `cd autobattle && npm run typecheck`
Expected: PASS(reader 返回的 enemies 现含 hpNow/name/status,Task1 的报错消除)。若报 `$('.btm3', m)` 可能为 null —— `?.textContent` 已处理;若报 `bImg.style` —— 已 `bImg ?` 守卫。

- [ ] **Step 7: Commit**

```bash
cd autobattle && git add src/battle/reader.ts
git commit -m "fix(autobattle): reader 修血条 index bug(per-mkey) + Spawned 初始HP缓存 + hpNow/name/13状态

血条修复无条件生效(全局 bloodImgs[idx] 每怪2img错位, 除0号外全错); _spawnHp 解析 Spawned 行; 目标权重 Task4

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: brain.ts — P16 换 rankTargets

**Files:**
- Modify: `src/battle/brain.ts`(import、weightCfg helper、P16 块 166-167)

- [ ] **Step 1: 加 import**

把 `src/battle/brain.ts:2-5`:
```ts
import { config } from '../core/config';
import { SK, SK_SPECIAL, IT, DEBUFFS, CHANNEL_Q } from './tables';
import { Exec, lastCannon } from './executor';
import type { Action, ActionType, BattleState, EnemyState } from '../types';
```
改为:
```ts
import { config } from '../core/config';
import type { Config } from '../core/config';
import { SK, SK_SPECIAL, IT, DEBUFFS, CHANNEL_Q } from './tables';
import { Exec, lastCannon } from './executor';
import { rankTargets } from './target-weight';
import type { Action, ActionType, BattleState, EnemyState, WeightConfig } from '../types';
```

- [ ] **Step 2: 加模块级 weightCfg helper**

在 `src/battle/brain.ts` 的 `export class Brain {`(第 7 行)**之前**插入:

```ts
/** 从 config 装配 target-weight 所需的 WeightConfig(模块只认参数, 不碰单例) */
function weightCfg(C: Config): WeightConfig {
  return {
    baseHpRatio: C.baseHpRatio,
    yggdrasilExtraWeight: C.yggdrasilExtraWeight,
    unreachableWeight: C.unreachableWeight,
    statusWeight: C.statusWeight,
    enabled: C.useTargetWeight,
  };
}
```

- [ ] **Step 3: 替换 P16 杂兵选择**

把 `src/battle/brain.ts:165-167`:
```ts
    // P16 破甲滚雪球平砍: 先清最弱杂兵, 仅剩红怪锁定持续平砍
    const trash = S.enemies.filter((e) => !e.is_red_boss && e.alive);
    if (trash.length) return A('attack', trash.sort((a, c) => a.eid - c.eid)[0].eid);
```
替换为:
```ts
    // P16 破甲滚雪球平砍: 杂兵按 finWeight 选最优(血量+13状态+Yggdrasil); 仅剩红怪锁定持续平砍.
    //   红怪线(lockTarget/P13/P15/下方尾部锁定)全不动 —— 权重只接管杂兵选谁(守半自动红线).
    //   useTargetWeight=false → rankTargets 退回 eid 升序 = 现状, 零回归.
    const ranked = rankTargets(S.enemies, weightCfg(C));
    const trash = ranked.filter((e) => !e.is_red_boss && e.alive);
    if (trash.length) return A('attack', trash[0].eid);
```

- [ ] **Step 4: typecheck（config 此时还没 5 个新键 → 预期 weightCfg 报缺属性,Task6 补）**

Run: `cd autobattle && npm run typecheck`
Expected: 报 `C.baseHpRatio`/`C.useTargetWeight` 等不存在于 Config(Task6 加)。预期中间态。

- [ ] **Step 5: Commit**

```bash
cd autobattle && git add src/battle/brain.ts
git commit -m "feat(autobattle): brain P16 换 rankTargets 选权重最优杂兵 + weightCfg helper

红怪线(lockTarget/P13/P15/尾部锁定)全不动; 目标权重 Task5

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: config.ts — 新增 5 键

**Files:**
- Modify: `src/core/config.ts`(DEFAULT_CONFIG 内,M2 开关段之后)

- [ ] **Step 1: 加 5 个配置键**

在 `src/core/config.ts` 的 `useMercifulBlow: false,`(40 行)之后、`};`(41 行)之前插入:

```ts
  // ── 目标权重系统(翻写 dodying finWeight; 详见 specs/2026-06-05-autobattle-target-weight-design.md)──
  useTargetWeight: false, // 总开关(默认关·灰度); 只控制 P16 是否按权重排序. 血条 bug 修复不受此控制
  baseHpRatio: 1, // 关键可调: >0 低血优先 / <0 高血优先
  yggdrasilExtraWeight: -1000, // 内置: 世界树 boss 绝对优先
  unreachableWeight: 1000, // 内置: 死怪垫底
  // 内置 13 状态权重(reference 1067-1079 实测默认值). statusWeight 是 record, 将来若做面板可调需注意整体覆盖语义
  statusWeight: { We: 12, Bl: 10, Slo: 15, Si: 10, Sle: 100, Im: -15, PA: -12, BW: -10, Co: -109, Dr: 2, MN: 7, Stun: 290, CM: -20 } as Record<string, number>,
```

- [ ] **Step 2: typecheck（全链路应通过）**

Run: `cd autobattle && npm run typecheck`
Expected: PASS(brain 的 weightCfg 现能取到全部键;`statusWeight as Record<string,number>` 与 WeightConfig 兼容)。

- [ ] **Step 3: Commit**

```bash
cd autobattle && git add src/core/config.ts
git commit -m "feat(autobattle): config 加目标权重 5 键(useTargetWeight默认关/baseHpRatio/Ygg/unreachable/statusWeight)

目标权重 Task6; 全链路 typecheck 通过

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 整体验证 + 真机实测

**Files:** 无改动(纯验证)

- [ ] **Step 1: 全量 typecheck + build**

Run: `cd autobattle && npm run typecheck && npm run build`
Expected: typecheck PASS;build 产出未压缩 userscript(`dist/` 下)。

- [ ] **Step 2: 装载脚本,开总开关前先验血条修复(无条件生效)**

在 HV 战斗页装载新脚本。chrome-devtools 控制台执行(核对 hpNow/hpPct 准):
```js
// reader 单例已挂载时(若未导出到 window, 用下面 DOM 直读核对)
[...document.querySelectorAll('[id^="mkey_"]')].map((m,i)=>({
  idx:i, name:m.querySelector('.btm3')?.textContent.trim(),
  width:m.querySelector('.btm4>.btm5:nth-child(1) img')?.style.width
}))
```
Expected: 每怪 width 与血条目视一致(满血 120px),不再出现"除 0 号外全 100/错位"。

- [ ] **Step 3: 开 useTargetWeight,观察 P16 选目标**

控制台开总开关(或面板):
```js
JSON.parse(localStorage.getItem('hvab_config')||'{}'); // 看现值
// 通过面板勾选 useTargetWeight, 或:
const c = JSON.parse(localStorage.getItem('hvab_config')||'{}'); c.useTargetWeight = true;
localStorage.setItem('hvab_config', JSON.stringify(c)); location.reload();
```
观察战斗中平砍是否优先打**低血/已破甲(PA)/已流血(BW)/已陷危(Im)** 的杂兵,而非固定打 1 号。

- [ ] **Step 4: 核对 spec §10 待实测项**

逐项验(本轮能遇到的):
- 死怪血条是否 `nbardead.png`(打死一只看 `blood_src`)。
- 红怪场景 `.btm2[style*=background]` + Yggdrasil 名读取(遇到时验)。
- 长回合 textlog 是否把 Spawned 挤出 → 验 `reader.initHp` 仍在(缓存沿用)。
- 连刷换波 `initHp` 是否被新 Spawned 覆盖。
- `hpNow` 数值与已知怪血量比对。

记录结果到 spec §10 或新 issue,异常则回头修。

- [ ] **Step 5: 最终确认 commit（若 Step 2-4 有微调）**

```bash
cd autobattle && git add -A src/
git commit -m "test(autobattle): 目标权重系统真机实测核对(血条/hpNow/13状态/选目标)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
（若无微调则跳过本步。）

---

## 实现完成判据

- [ ] `npm run typecheck` PASS、`npm run build` 产出未压缩脚本。
- [ ] 血条 `hpPct`/`hpNow` per-mkey 读法核对正确(不再错位)。
- [ ] `useTargetWeight=false` 时行为 = 现状(P16 打最低 eid 杂兵)。
- [ ] `useTargetWeight=true` 时平砍优先低血/破甲/流血/陷危杂兵。
- [ ] 红怪锁定线(lockTarget/P13/P15/P16 尾部)行为不变。
- [ ] spec §10 待实测项已逐项核对或记录。
