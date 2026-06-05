# 要害延迟喂流血 (BleedTimer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把红名/boss 的要害强击(产 5 道流血 DoT)从「一晕就喂」改为「按掉血速率预测延迟到血量接近 25% 才喂」, 让流血刚好覆盖慈悲斩杀窗口。

**Architecture:** 新建独立有状态模块 `BleedTimer`(范本 = `target-weight.ts`), 封装红名掉血速率追踪 + 喂要害判定。brain 每回合 `observe` 采样、要害分支用 `shouldFeed` 加门、主动攻击红名的 return 经 `hitRed` 登记归因。零 DOM / 零 config 单例 / 零 Store, 输入即依赖。

**Tech Stack:** TypeScript(strict) + esbuild 打包 userscript。无单元测试 runner(spec §10 确认不引入 vitest), 验证 = `npm run typecheck` + vscode diagnostics + GF 真机实测 + `[HVAB:bleed]` 就地日志。

**Spec:** `docs/superpowers/specs/2026-06-06-autobattle-delayed-bleed-design.md`

---

## 验证手段说明(全程通用)

本项目**没有单元测试 runner**。因此本 plan 不写「写失败测试 → 跑测试」的 TDD 循环, 改用:
- **每个任务的验证** = `npm run typecheck`(tsc strict 编译通过) + 该文件 vscode diagnostics 清洁。
- **逻辑正确性验证**(Task 5) = `npm run build` 打包成功 + GF 真机实测肉眼核对 `[HVAB:bleed]` 日志(要害是否在接近 25% 才喂、流血是否覆盖斩杀、慈悲是否接上)。

`npm run typecheck` 预期输出: 无错误退出(exit 0), 控制台无 TS 报错行。

---

## File Structure

| 文件 | 责任 | 动作 |
|---|---|---|
| `autobattle/src/types.ts` | 新增 `BleedFeedInput`(EnemyState 子集) + `BleedTimerConfig`(brain 装配传入), 对应现有 `WeightInput`/`WeightConfig` | Modify |
| `autobattle/src/core/config.ts` | `DEFAULT_CONFIG` 新增 7 个延迟喂血参数(`useDelayedBleed` + 6 个 `BLEED_*`) | Modify |
| `autobattle/src/battle/bleed-timing.ts` | `BleedTimer` class: `observe`/`noteActiveAttack`/`shouldFeed` + 内部 `reds` Map / `pendingActiveEid` | **Create** |
| `autobattle/src/battle/brain.ts` | import + 私有成员 `bleedTimer` + 模块函数 `bleedCfg(C)` + 私有 helper `hitRed`; decide 开头 `observe`; 两处要害分支加 `shouldFeed` 门(连招线补 `!bleeding`); 6 处主动攻击红名 return 套 `hitRed` | Modify |

依赖顺序: Task 1(types) → Task 2(config) → Task 3(BleedTimer, 依赖 types) → Task 4(brain 集成, 依赖全部) → Task 5(全量验证)。

---

## Task 1: 配套 TS 类型

**Files:**
- Modify: `autobattle/src/types.ts`(在 `WeightConfig` 接口之后插入)

- [ ] **Step 1: 在 types.ts 的 WeightConfig 之后新增两个接口**

找到现有代码(types.ts 约 L143-150):
```ts
/** target-weight 配置(brain 从 config 装配传入; 模块本身不碰单例) */
export interface WeightConfig {
  baseHpRatio: number;
  yggdrasilExtraWeight: number;
  unreachableWeight: number;
  statusWeight: Record<string, number>;
  enabled: boolean;
}
```

在它**正下方**插入:
```ts

/** BleedTimer 喂入/判定输入(EnemyState 结构子集; EnemyState 鸭子类型可直接传) */
export interface BleedFeedInput {
  eid: number;
  is_red_boss: boolean; // 语义标注; observe 收到的已是 filter(is_red_boss) 后的红名
  hpPct: number;
  // stunned/bleeding 不入此接口: 由 brain 两处要害分支的外层守卫把关, BleedTimer 内部只用 hpPct/eid
}

/** BleedTimer 配置(brain 从 config 装配传入; 模块本身不碰单例) */
export interface BleedTimerConfig {
  enabled: boolean; // 延迟逻辑总开关; false = shouldFeed 恒 true(退回旧"一晕就喂")
  bleedTurns: number; // B: 流血持续回合数(默认 5)
  safety: number; // 安全余量(默认 1); T ≤ B-safety 才喂
  fallbackHpPct: number; // 无主动样本/速率太小时的保守血量窗口(默认 30)
  rateWindow: number; // 速率移动平均窗口(默认 3)
  minSamples: number; // 走速率主路最少样本数(默认 1)
  minRate: number; // 速率有效下限 %/回合(默认 1)
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: PASS(exit 0, 无报错)。新接口未被引用是正常的(后续任务用)。

- [ ] **Step 3: Commit**

```bash
git add autobattle/src/types.ts
git commit -m "feat(autobattle): 延迟喂血配套类型 BleedFeedInput/BleedTimerConfig"
```

---

## Task 2: Config 新增延迟喂血参数

**Files:**
- Modify: `autobattle/src/core/config.ts`(在 `DEFAULT_CONFIG` 的 `statusWeight` 行之后)

- [ ] **Step 1: 在 DEFAULT_CONFIG 末尾(statusWeight 之后)新增 7 个参数**

找到现有代码(config.ts 约 L61-63):
```ts
  // 内置 13 状态权重(reference 1067-1079 实测默认值). statusWeight 是 record, 将来若做面板可调需注意整体覆盖语义
  statusWeight: { We: 12, Bl: 10, Slo: 15, Si: 10, Sle: 100, Im: -15, PA: -12, BW: -10, Co: -109, Dr: 2, MN: 7, Stun: 290, CM: -20 } as Record<string, number>,
};
```

把它改为(在 `statusWeight` 行与 `};` 之间插入新块):
```ts
  // 内置 13 状态权重(reference 1067-1079 实测默认值). statusWeight 是 record, 将来若做面板可调需注意整体覆盖语义
  statusWeight: { We: 12, Bl: 10, Slo: 15, Si: 10, Sle: 100, Im: -15, PA: -12, BW: -10, Co: -109, Dr: 2, MN: 7, Stun: 290, CM: -20 } as Record<string, number>,
  // ── 要害延迟喂流血(BleedTimer; 详见 specs/2026-06-06-autobattle-delayed-bleed-design.md)──
  useDelayedBleed: true, // 延迟逻辑开关; false 退回旧"红名一晕就喂"(灰度可一键回滚)
  BLEED_DURATION: 5, // 流血持续回合 B(要害产的 DoT 覆盖窗口)
  BLEED_SAFETY: 1, // 安全余量; 要求 T ≤ B-safety(=4) 才喂, 留 1 回合冗余防 DoT 先过期
  BLEED_FALLBACK_HP: 30, // 无主动速率样本/速率太小时的兜底血量窗口(hpPct ≤ 此值就喂)
  BLEED_RATE_WINDOW: 3, // 速率移动平均窗口(最近 2-3 个主动样本)
  BLEED_MIN_SAMPLES: 1, // 走速率主路最少样本数, 不足走兜底
  BLEED_MIN_RATE: 1, // 速率有效下限(%/回合); ≤ 此值视为无效走兜底
};
```

> **不改 `CONFIG_VERSION`**: 这 7 个全是新增键, 旧存档里不存在, `{...DEFAULT_CONFIG, ...旧存档}` 合并时自动取新默认值, 旧存档无缝拿到。**不要 bump 版本号** —— bump 会重新触发迁移块强刷 `cannonCdMs/OC_ON/CANNON_MIN_ENEMIES`, 误重置用户可能调过的炮设置。

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: PASS。`Config` 类型(= `typeof DEFAULT_CONFIG`)自动多出 7 个键。

- [ ] **Step 3: Commit**

```bash
git add autobattle/src/core/config.ts
git commit -m "feat(autobattle): config 新增 7 个延迟喂血参数(默认开+可灰度回退)"
```

---

## Task 3: BleedTimer 核心模块

**Files:**
- Create: `autobattle/src/battle/bleed-timing.ts`

- [ ] **Step 1: 新建 bleed-timing.ts, 写入完整 BleedTimer class**

创建 `autobattle/src/battle/bleed-timing.ts`, 内容:
```ts
// 要害延迟喂流血: 红名掉血速率追踪器(有状态模块). 范本 = target-weight.ts。
// 零 DOM / 零 config 单例 / 零 Store: 输入即全部依赖, 唯一状态是跨回合的 reds Map。
// 设计: docs/superpowers/specs/2026-06-06-autobattle-delayed-bleed-design.md
import type { BleedFeedInput, BleedTimerConfig } from '../types';

/** 单只红名的速率追踪记录 */
interface RedSample {
  lastHpPct: number; // 上次 observe 记录的血量基线(算单回合掉幅用)
  activeDeltas: number[]; // 主动攻击掉血样本窗口(每个 = 一次主动攻击回合的 hpPct 降幅)
}

const SAMPLE_CAP = 8; // activeDeltas 物理上限; shouldFeed 再取最近 cfg.rateWindow 个平均

const EXECUTE_HP = 25; // 斩杀线(与慈悲 hpPct<25 / selectRedTarget 'execute' 对齐)

export class BleedTimer {
  private reds = new Map<number, RedSample>(); // eid → 样本(多红名各自独立桶)
  private pendingActiveEid: number | null = null; // 上回合主动攻击登记的红名 eid

  /** 每回合 decide 开头无条件调一次. 兑现上回合主动样本 + cleanup 死红名 + 更新血量基线.
   *  @param reds 当前所有活红名快照(已由 brain filter(is_red_boss)) */
  observe(reds: BleedFeedInput[]): void {
    const aliveEids = new Set(reds.map((e) => e.eid));
    // cleanup: 死亡/切场的红名删样本(防 Map 泄漏 + eid 复用串味)
    for (const eid of this.reds.keys()) if (!aliveEids.has(eid)) this.reds.delete(eid);
    for (const red of reds) {
      const rec = this.reds.get(red.eid) ?? { lastHpPct: red.hpPct, activeDeltas: [] };
      // 兑现: 仅当"上回合主动打了这只红名"且本回合真掉血, 才计入主动速率样本(被动掉血/miss 自然排除)
      if (this.pendingActiveEid === red.eid) {
        const drop = rec.lastHpPct - red.hpPct;
        if (drop > 0) {
          rec.activeDeltas.push(drop);
          if (rec.activeDeltas.length > SAMPLE_CAP) rec.activeDeltas.shift();
        }
      }
      rec.lastHpPct = red.hpPct;
      this.reds.set(red.eid, rec);
    }
    this.pendingActiveEid = null;
  }

  /** brain 在"本回合决策 = 主动攻击该红名"的 return 分支(经 hitRed)登记归因.
   *  下一回合 observe 时该 eid 的掉血才算主动样本. */
  noteActiveAttack(eid: number): void {
    this.pendingActiveEid = eid;
  }

  /** 是否该现在喂要害. 只看血量/速率时机; stunned/!bleeding/oc 由 brain 外层守卫. */
  shouldFeed(execRed: BleedFeedInput, cfg: BleedTimerConfig): boolean {
    if (!cfg.enabled) return true; // 退回旧行为(brain 的 stunned&&!bleeding 守门)
    const hp = execRed.hpPct; // 全程 hpPct(0-100), 不用 hpNow
    let path = 'fallback';
    let r = 0;
    let T = 0;
    let feed: boolean;

    if (hp <= EXECUTE_HP) {
      path = 'execLine';
      feed = true; // 已破斩杀线还没流血 → 立刻喂(别错过; 单击跨窗也由此兜)
    } else {
      const samples = this.reds.get(execRed.eid)?.activeDeltas ?? [];
      if (samples.length >= cfg.minSamples) {
        const win = samples.slice(-cfg.rateWindow);
        r = win.reduce((a, b) => a + b, 0) / win.length; // 主动掉血移动平均(%/回合)
        if (r > cfg.minRate) {
          path = 'rate';
          T = Math.ceil((hp - EXECUTE_HP) / r); // 还需几回合到 25%
          feed = T <= cfg.bleedTurns - cfg.safety; // T≤B-safety 才喂
        } else {
          feed = hp <= cfg.fallbackHpPct; // r 太小/负 → 兜底窗口
        }
      } else {
        feed = hp <= cfg.fallbackHpPct; // 样本不足 → 兜底窗口
      }
    }

    // eslint-disable-next-line no-console
    console.log('[HVAB:bleed]', { eid: execRed.eid, hpPct: hp, r: Math.round(r * 10) / 10, T, path, feed });
    return feed;
  }
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: PASS。模块自洽, 仅 import types, 不依赖 DOM/config。

- [ ] **Step 3: Commit**

```bash
git add autobattle/src/battle/bleed-timing.ts
git commit -m "feat(autobattle): BleedTimer 模块(速率预测+兜底+主动归因+就地日志)"
```

---

## Task 4: brain 集成

**Files:**
- Modify: `autobattle/src/battle/brain.ts`

> 本任务 6 个步骤改 brain.ts 多处。每步给出**精确原文 → 替换文**, 用 Edit 精确匹配(不依赖行号)。

- [ ] **Step 1: import BleedTimer + BleedTimerConfig**

原文(brain.ts 顶部 import 区, 约 L6-7):
```ts
import { rankTargets } from './target-weight';
import type { Action, ActionType, BattleState, EnemyState, WeightConfig } from '../types';
```
替换为:
```ts
import { rankTargets } from './target-weight';
import { BleedTimer } from './bleed-timing';
import type { Action, ActionType, BattleState, EnemyState, WeightConfig, BleedTimerConfig } from '../types';
```

- [ ] **Step 2: 新增 bleedCfg 装配函数(仿 weightCfg)**

原文(brain.ts, weightCfg 函数, 约 L10-19):
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
在它**正下方**插入:
```ts

/** 从 config 装配 BleedTimer 所需的 BleedTimerConfig(模块只认参数, 不碰单例) */
function bleedCfg(C: Config): BleedTimerConfig {
  return {
    enabled: C.useDelayedBleed,
    bleedTurns: C.BLEED_DURATION,
    safety: C.BLEED_SAFETY,
    fallbackHpPct: C.BLEED_FALLBACK_HP,
    rateWindow: C.BLEED_RATE_WINDOW,
    minSamples: C.BLEED_MIN_SAMPLES,
    minRate: C.BLEED_MIN_RATE,
  };
}
```

- [ ] **Step 3: 新增 bleedTimer 私有成员 + hitRed helper**

原文(brain.ts 类成员区, 约 L24-26):
```ts
  private mercifulTry: { eid: number; oc: number } | null = null; // 上次慈悲尝试(目标 eid + 当时 OC); 下回合验证有没有真放出(OC 降没降)
  private mercifulBlockEid = -1; // 慈悲拉黑目标: 上次慈悲 OC 没降=没放出(HV 拒绝处决, 如世界树 boss 免疫处决) → 本段不再对它空点慈悲, 改要害磨; 目标死/不在则解除
```
替换为:
```ts
  private mercifulTry: { eid: number; oc: number } | null = null; // 上次慈悲尝试(目标 eid + 当时 OC); 下回合验证有没有真放出(OC 降没降)
  private mercifulBlockEid = -1; // 慈悲拉黑目标: 上次慈悲 OC 没降=没放出(HV 拒绝处决, 如世界树 boss 免疫处决) → 本段不再对它空点慈悲, 改要害磨; 目标死/不在则解除
  private bleedTimer = new BleedTimer(); // 要害延迟喂流血: 红名掉血速率追踪 + 喂血时机判定(跨回合状态)

  /** 登记"本回合主动攻击了红名 eid"(供下回合算掉血样本)后原样返回 action. 只用于真造成主动掉血的红名 return. */
  private hitRed<A extends Action>(eid: number, a: A): A {
    this.bleedTimer.noteActiveAttack(eid);
    return a;
  }
```

- [ ] **Step 4: decide 开头喂入红名快照(observe)**

原文(brain.ts decide 内, 约 L47):
```ts
    const ranked = rankTargets(S.enemies, weightCfg(C));
```
替换为:
```ts
    const ranked = rankTargets(S.enemies, weightCfg(C));
    // 要害延迟喂血: 每回合无条件喂入活红名快照(兑现上回合主动样本 + cleanup 死红名 + 更新血量基线)
    this.bleedTimer.observe(S.enemies.filter((e) => e.is_red_boss));
```

- [ ] **Step 5: 改破例线(execRed 块) — 慈悲套 hitRed + 要害加门并套 hitRed**

原文(brain.ts, 约 L227-233):
```ts
      if (C.useMercifulBlow && execRed.eid !== this.mercifulBlockEid && execRed.hpPct < 25 && execRed.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
        this.mercifulTry = { eid: execRed.eid, oc };
        return { type: 'spell', id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${execRed.eid}(${execRed.hpPct}%+流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, execRed.eid) };
      }
      // 要害(喂流血): 只在红名"未流血"时喂一次 — 5道DoT够用, 反复要害(每次50OC)会把攒给慈悲(100)的OC耗光→斩杀线OC不足放不出慈悲(实测根因)
      if (C.useVitalStrike && execRed.stunned && !execRed.bleeding && oc >= 50 && Exec.skillReady(SK_SPECIAL.vitalStrike))
        return { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${execRed.eid}(未流血→喂流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, execRed.eid) };
```
替换为:
```ts
      if (C.useMercifulBlow && execRed.eid !== this.mercifulBlockEid && execRed.hpPct < 25 && execRed.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
        this.mercifulTry = { eid: execRed.eid, oc };
        return this.hitRed(execRed.eid, { type: 'spell', id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${execRed.eid}(${execRed.hpPct}%+流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, execRed.eid) });
      }
      // 要害(延迟喂流血): 未流血 + 血量时机到(速率预测/兜底)才喂 — 让 5 道 DoT 刚好覆盖斩杀窗口, 不再一晕就喂
      if (C.useVitalStrike && execRed.stunned && !execRed.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(execRed, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
        return this.hitRed(execRed.eid, { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${execRed.eid}(${execRed.hpPct}%·延迟喂流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, execRed.eid) });
```

- [ ] **Step 6: 改连招线 — 慈悲/盾击套 hitRed + 要害加门并补 !bleeding 并套 hitRed**

原文(brain.ts, 约 L240-249):
```ts
        if (C.useMercifulBlow && tgtSp.eid !== this.mercifulBlockEid && tgtSp.hpPct < 25 && tgtSp.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
          this.mercifulTry = { eid: tgtSp.eid, oc };
          return { type: 'spell', id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${tgtSp.eid}(${tgtSp.hpPct}%+流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, tgtSp.eid) };
        }
        // 要害(连招第2步, 50 OC): 红名已晕 → 收割+5道流血. 让位架式: 架式未开先攒OC开架式(+100%物理更值, 修"小局斗气全砸OC技不开架式")
        if (C.useVitalStrike && S.stanceOn && tgtSp.stunned && oc >= 50 && Exec.skillReady(SK_SPECIAL.vitalStrike))
          return { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${tgtSp.eid}(已晕→喂流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, tgtSp.eid) };
        // 盾击(连招第1步, 25 OC): 红名未晕 → 上晕眩. 让位架式: 架式未开先攒OC开架式(架式开后靠反击+主动盾击晕)
        if (C.useShieldBash && S.stanceOn && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
          return { type: 'spell', id: SK_SPECIAL.shieldBash, note: `盾击晕红名#${tgtSp.eid}(连招1步)`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, tgtSp.eid) };
```
替换为:
```ts
        if (C.useMercifulBlow && tgtSp.eid !== this.mercifulBlockEid && tgtSp.hpPct < 25 && tgtSp.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
          this.mercifulTry = { eid: tgtSp.eid, oc };
          return this.hitRed(tgtSp.eid, { type: 'spell', id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${tgtSp.eid}(${tgtSp.hpPct}%+流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, tgtSp.eid) });
        }
        // 要害(连招第2步, 延迟喂流血): 已晕 + 未流血 + 血量时机到才喂. 补 !bleeding 防喂完未到25%又重复喂; 让位架式同前
        if (C.useVitalStrike && S.stanceOn && tgtSp.stunned && !tgtSp.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
          return this.hitRed(tgtSp.eid, { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${tgtSp.eid}(${tgtSp.hpPct}%·延迟喂流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, tgtSp.eid) });
        // 盾击(连招第1步, 25 OC): 红名未晕 → 上晕眩. 让位架式: 架式未开先攒OC开架式(架式开后靠反击+主动盾击晕)
        if (C.useShieldBash && S.stanceOn && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
          return this.hitRed(tgtSp.eid, { type: 'spell', id: SK_SPECIAL.shieldBash, note: `盾击晕红名#${tgtSp.eid}(连招1步)`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, tgtSp.eid) });
```

- [ ] **Step 7: 平砍红名(仅剩红怪)套 hitRed**

原文(brain.ts, 约 L274-276):
```ts
    if (tgt) {
      S.lockedRedId = tgt.eid;
      return { type: 'attack', id: tgt.eid, note: `平砍红名#${tgt.eid}(仅剩红怪,${tgt.hpPct}%)`, exec: () => Exec.attack(tgt.eid) };
    }
```
替换为:
```ts
    if (tgt) {
      S.lockedRedId = tgt.eid;
      return this.hitRed(tgt.eid, { type: 'attack', id: tgt.eid, note: `平砍红名#${tgt.eid}(仅剩红怪,${tgt.hpPct}%)`, exec: () => Exec.attack(tgt.eid) });
    }
```

> **不要碰** `castOnRed`(L287-290, P13 减益释放 helper): 减益不掉血, 套 hitRed 会把减益回合误计入主动样本→拉低 r→永不喂。杂兵线(要害秒杂兵/盾击杂兵)、平砍杂兵、放炮、防御也一律不套。

- [ ] **Step 8: typecheck + diagnostics**

Run: `npm run typecheck`
Expected: PASS。`bleedCfg`/`bleedTimer`/`hitRed` 全部被引用, `BleedTimerConfig` import 被用上。
然后用 vscode-mcp-server 检查 `brain.ts`/`bleed-timing.ts`/`types.ts`/`config.ts` diagnostics, 应只剩 `[HVAB:bleed]` 等 cSpell 拼写 Information(无害)。

- [ ] **Step 9: Commit**

```bash
git add autobattle/src/battle/brain.ts
git commit -m "feat(autobattle): brain 接入 BleedTimer — 要害延迟喂流血+6处主动归因埋点"
```

---

## Task 5: 全量验证

**Files:** 无改动(纯验证)

- [ ] **Step 1: 全量 typecheck**

Run: `npm run typecheck`
Expected: PASS(exit 0)。

- [ ] **Step 2: 打包构建**

Run: `npm run build`
Expected: 构建成功, 产出 `autobattle/dist/hv-autobattle.user.js`, 无报错。

- [ ] **Step 3: GF 真机实测(人工)**

装载打包后的 userscript, 进竞技场/GF 带红名的战斗, 打开 console 看 `[HVAB:bleed]` 日志, 核对:
- 红名高血量(如 70%)被盾击晕后, 要害**不**立刻喂(日志 `feed:false`, 在 rate/fallback 路径)。
- 红名磨到接近 25%(速率路 `T≤4` 或兜底 `hpPct≤30`)时要害才喂(`feed:true`), 之后红名身上出现流血。
- 流血**未过期**就磨到 <25%, 慈悲顺利接上处决(不再出现"到25%却没流血放不出慈悲")。
- 缠杂兵期间红名靠被动掉血到 ≤30% 时, 兜底路径(`path:fallback`)也能喂上要害。
- 关 `useDelayedBleed`(面板或 Store)后行为退回旧"一晕就喂", 确认零回归。

- [ ] **Step 4: 实测通过后, 按需收敛日志(可选)**

若 `[HVAB:bleed]` 刷屏影响观察, 可在 `BleedTimer.shouldFeed` 把 `console.log` 改为仅 `feed===true` 时打, 或删除。单独 commit:
```bash
git add autobattle/src/battle/bleed-timing.ts
git commit -m "chore(autobattle): 收敛 [HVAB:bleed] 调试日志(实测通过后)"
```

---

## 自检备注(已在 spec workflow 自检中确认的关键约束)

- 全程用 `hpPct`(0-100), **不用 `hpNow`**(initHp 缺失会退化为 hpPct, 量纲漂移)。
- `shouldFeed` 不存在 `T≤0` 情形(`hp>25 && r>0` 时 `ceil((hp-25)/r)` 恒 ≥1); 单击跨窗由 `hp<=25` 那行兜, 不在速率分支处理。
- 归因只标记**真造成主动掉血**的红名 return(慈悲/要害/盾击/平砍红名共 6 处), `castOnRed`(减益)**绝不**标记。
- 漏标某个埋点 → 样本偏少 → 偏保守走兜底, 不会崩。
