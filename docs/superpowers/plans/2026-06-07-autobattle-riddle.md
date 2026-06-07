# 小马题自动答题（务实辅助+采集）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 autobattle 实现 HV 小马题（Riddlemaster）的务实辅助（弹窗/大按钮多选 UI/数字快捷键/音频+桌面提醒/图鉴浮层）+ 训练数据采集（IndexedDB），`brain.riddle()` 预留 CNN recognize 接口供未来真自动。

**Architecture:** 新建 `src/riddle/` 子系统（detect/ui/hotkeys/submit/collector/notify/types），由 loop 在检测到小马题时激活；纯逻辑（Mane6 映射/快捷键/采集数据结构）抽纯函数可测，DOM/弹窗/Canvas/IndexedDB 副作用隔离。**分两批**：批 1 不依赖 DOM 可立即实现；批 2 依赖小马题真实 DOM HTML 样本（spec §9），待用户抓样本后实现。

**Tech Stack:** TypeScript · Vite(vite-plugin-monkey) · **无 vitest**（验证=`npm run typecheck` + 控制台喂数据 + 真机）· Canvas/IndexedDB/GM_notification · 翻写参考 `reference/hvAutoAttack.user.js`(riddle 旧版) + `RiddleLimiter*.user.js`(选项 UI)。

**关联设计:** `docs/superpowers/specs/2026-06-07-autobattle-riddle-design.md`。

---

## 文件结构

**新建 `autobattle/src/riddle/`**：

| 文件 | 职责 | 批次 |
|---|---|---|
| `types.ts` | Mane6 枚举 / RiddleSample / RiddleState / 配置类型 | 批1(DOM无关) |
| `hotkeys.ts` | 数字 1-6→checkbox index 纯映射；事件绑定 | 批1 纯映射 / 批2 绑定 |
| `collector.ts` | 采集：纯(buildSample/multi-hot/元数据) + IO(IndexedDB/截图/导出) | 批1 纯 / 批2 IO |
| `notify.ts` | 音频警报 + 桌面通知(通用) | 批1 |
| `detect.ts` | 检测小马题 + 解析(题图/checkbox/Submit/倒计时) | 批2(待样本) |
| `submit.ts` | 勾选+提交+弹窗模式 | 批2(待样本) |
| `ui.ts` | 大按钮多选 UI + 图鉴浮层 + 醒目倒计时 | 批2(待样本) |

**修改**：`core/config.ts`(+9键 v5→6)、`battle/reader.ts`(检测适配)、`battle/brain.ts`(riddle 分支+recognize)、`loop.ts`(激活)、`ui/panel.ts`(提醒 tab)、`global.d.ts`(GM_notification 声明)。

**验证范式**（无 vitest）：每 task 写代码 → `cd autobattle && npm run typecheck`(PASS) → 纯函数附控制台验证片段 → `npm run build` → commit。

---

# 批 1：DOM 无关（可立即实现）

## Task 1: riddle/types.ts

**Files:**
- Create: `autobattle/src/riddle/types.ts`

- [ ] **Step 1: 写 types.ts**

```typescript
// 小马题(Riddlemaster)类型契约. 详见 specs/2026-06-07-autobattle-riddle-design.md.
// Mane6 = My Little Pony 6 主角, 顺序对齐截图 checkbox 从左到右(顺序仅作默认, hotkeys 按实际 label 动态绑定).

/** 6 主角小马名(HV checkbox label 原文, 英文不受汉化影响) */
export const MANE6 = [
  'Twilight Sparkle',
  'Rarity',
  'Fluttershy',
  'Rainbow Dash',
  'Pinkie Pie',
  'Applejack',
] as const;

export type PonyName = (typeof MANE6)[number];

/** 答题结果(采集标签可信度用) */
export type RiddleResult = 'correct' | 'wrong' | 'unknown';

/** 一条采集样本(入 IndexedDB; 为未来 CNN 训练) */
export interface RiddleSample {
  imageDataUrl: string; // 题目图 PNG dataURL
  labels: Record<PonyName, boolean>; // 6 维 multi-hot(玩家勾选的小马)
  result: RiddleResult; // 对/错/未知
  meta: {
    level: number | null; // 玩家等级(难度元数据)
    round: number | null; // 最近战斗层数/轮数(难度元数据)
    ts: number; // 时间戳 ms
    w: number; // 题图宽
    h: number; // 题图高
  };
}

/** 检测/解析出的小马题运行态(detect 产出, ui/submit/collector 消费) */
export interface RiddleState {
  present: boolean; // 当前页是否有小马题
  options: { name: PonyName; el: HTMLInputElement }[]; // 6 个 checkbox + 对应小马名
  submitEl: HTMLElement | null; // Submit Answer 按钮
  imageEl: HTMLImageElement | HTMLCanvasElement | null; // 题目图元素
  secondsLeft: number | null; // 倒计时秒
}

/** riddle 配置(brain/loop 从 config 装配; 纯模块不碰单例) */
export interface RiddleConfig {
  useRiddleAssist: boolean;
  riddlePopup: boolean;
  riddleHotkeys: boolean;
  riddleAlarm: boolean;
  riddleNotify: boolean;
  riddleChartOverlay: boolean;
  riddleCollect: boolean;
  riddleUrgentSec: number;
  riddleAutoRecognize: boolean;
}

/** 未来 CNN 识别接口契约(现 stub; brain.riddle() 实现) */
export interface RiddleRecognition {
  pony: PonyName;
  confidence: number; // 0-1
}
```

- [ ] **Step 2: typecheck**

Run: `cd autobattle && npm run typecheck`
Expected: PASS（无输出）。

- [ ] **Step 3: Commit**

```bash
git add autobattle/src/riddle/types.ts
git commit -m "feat(riddle): 类型契约(Mane6/RiddleSample/RiddleState/RiddleConfig)"
```

---

## Task 2: config.ts 加 9 riddle 键 + CONFIG_VERSION 5→6

**Files:**
- Modify: `autobattle/src/core/config.ts`

- [ ] **Step 1: 在 DEFAULT_CONFIG 尾部（`staminaHathperk` 行之后、`}` 之前）追加**

```typescript
  // ── 小马题自动答题(riddle; 详见 specs/2026-06-07-autobattle-riddle-design.md)──
  useRiddleAssist: true, // 小马题辅助总开关
  riddlePopup: true, // 弹窗模式(独立窗答, 绕后台标签节流)
  riddleHotkeys: true, // 数字 1-6 / Enter / Esc 快捷键
  riddleAlarm: true, // 音频警报
  riddleNotify: true, // 桌面通知 GM_notification
  riddleChartOverlay: true, // PONY CHART 图鉴浮层
  riddleCollect: true, // 数据采集(IndexedDB, 铺路 CNN)
  riddleUrgentSec: 8, // 催答提醒触发秒数(倒计时 ≤ 此值加急)
  riddleAutoRecognize: false, // 自动识别(CNN; 现 stub 无效, 未来接入后生效)
```

- [ ] **Step 2: CONFIG_VERSION 5 → 6**

改 `const CONFIG_VERSION = 5;` 为 `const CONFIG_VERSION = 6;`。迁移块**不加新 force 行**（riddle 键纯增量，`{...DEFAULT_CONFIG, ...stored}` 自动补默认；bump 触发现有 `Store.set` 落盘）。保留现有 v5 的 4 条 force 覆盖。

- [ ] **Step 3: typecheck**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。新键并入 `Config` 类型。

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/core/config.ts
git commit -m "feat(riddle): config 加 9 个 riddle 键 + CONFIG_VERSION 5→6"
```

---

## Task 3: riddle/hotkeys.ts 纯映射

**Files:**
- Create: `autobattle/src/riddle/hotkeys.ts`

- [ ] **Step 1: 写 hotkeys.ts（纯映射部分；事件绑定在批 2 Task 8 接入 UI）**

```typescript
// 小马题快捷键映射(纯函数部分). 数字 1-6 → 当前 checkbox 从左到右第 N 个; Enter=提交; Esc=静音.
// 按 checkbox 实际数量动态判定(不假设固定 6 个), 真实 label 绑定在 ui.ts 接入.

export type RiddleKeyAction =
  | { kind: 'toggle'; index: number } // toggle 第 index 个 checkbox(0-based)
  | { kind: 'submit' }
  | { kind: 'mute' }
  | { kind: 'none' };

/** 键 → 动作. count = 当前 checkbox 数量(动态). 数字超范围返回 none. */
export function mapRiddleKey(key: string, count: number): RiddleKeyAction {
  if (/^[1-9]$/.test(key)) {
    const index = Number(key) - 1;
    return index < count ? { kind: 'toggle', index } : { kind: 'none' };
  }
  if (key === 'Enter') return { kind: 'submit' };
  if (key === 'Escape') return { kind: 'mute' };
  return { kind: 'none' };
}
```

- [ ] **Step 2: typecheck**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: 控制台验证（可选，build 后 devtools）**

```js
m.mapRiddleKey('3', 6); // {kind:'toggle', index:2}
m.mapRiddleKey('7', 6); // {kind:'none'}(超范围)
m.mapRiddleKey('Enter', 6); // {kind:'submit'}
m.mapRiddleKey('Escape', 6); // {kind:'mute'}
```

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/riddle/hotkeys.ts
git commit -m "feat(riddle): hotkeys 数字1-6/Enter/Esc 纯映射"
```

---

## Task 4: riddle/collector.ts 纯部分（样本构造 + multi-hot）

**Files:**
- Create: `autobattle/src/riddle/collector.ts`（先纯函数；IndexedDB/截图 IO 在批 2 Task 9 追加）

- [ ] **Step 1: 写 collector.ts 纯函数部分**

```typescript
// 小马题采集(纯函数部分). 样本构造 + multi-hot 编码. IndexedDB/Canvas 截图 IO 在批2追加.
import { MANE6, type PonyName, type RiddleSample, type RiddleResult } from './types';

/** 勾选的小马列表 → 6 维 multi-hot(全 6 只都有键, 选中 true). */
export function encodeMultiHot(selected: PonyName[]): Record<PonyName, boolean> {
  const set = new Set<PonyName>(selected);
  const out = {} as Record<PonyName, boolean>;
  for (const name of MANE6) out[name] = set.has(name);
  return out;
}

/** 组装一条采集样本(纯; imageDataUrl/尺寸由调用方截图后传入). */
export function buildSample(args: {
  imageDataUrl: string;
  selected: PonyName[];
  result: RiddleResult;
  level: number | null;
  round: number | null;
  ts: number;
  w: number;
  h: number;
}): RiddleSample {
  return {
    imageDataUrl: args.imageDataUrl,
    labels: encodeMultiHot(args.selected),
    result: args.result,
    meta: { level: args.level, round: args.round, ts: args.ts, w: args.w, h: args.h },
  };
}
```

- [ ] **Step 2: typecheck**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: 控制台验证（可选）**

```js
m.encodeMultiHot(['Rarity','Applejack']); // {Twilight Sparkle:false, Rarity:true, ..., Applejack:true}
```

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/riddle/collector.ts
git commit -m "feat(riddle): collector 纯函数(multi-hot 编码 + 样本构造)"
```

---

## Task 5: riddle/notify.ts（音频 + 桌面通知，通用）+ global.d.ts

**Files:**
- Create: `autobattle/src/riddle/notify.ts`
- Modify: `autobattle/src/global.d.ts`（补 GM_notification 声明，若缺）

- [ ] **Step 1: global.d.ts 补 GM_notification（若现有未声明）**

在现有 GM 声明区追加（先确认现有是否已有，没有才加）：

```typescript
declare const GM_notification: ((details: { title?: string; text?: string; timeout?: number }) => void) | undefined;
```

- [ ] **Step 2: 写 notify.ts**

```typescript
// 小马题提醒: 音频警报 + 桌面通知. 通用(不依赖小马题 DOM); 触发时机由 detect/loop 接入(批2).
// 移植 dodying setAlarm('Riddle') 思路: Web Audio 蜂鸣.

/** 蜂鸣警报(Web Audio, 无需音频文件). times=连响次数. */
export function playAlarm(times = 2): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.35;
      osc.start(t);
      osc.stop(t + 0.2);
    }
  } catch {
    /* 音频不可用不致命 */
  }
}

/** 桌面通知(GM_notification 优先, 退回 Notification API). */
export function sendDesktop(title: string, text: string): void {
  try {
    if (typeof GM_notification === 'function') {
      GM_notification({ title, text, timeout: 5000 });
      return;
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: text });
    }
  } catch {
    /* 通知失败不致命 */
  }
}
```

- [ ] **Step 3: typecheck**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add autobattle/src/riddle/notify.ts autobattle/src/global.d.ts
git commit -m "feat(riddle): notify 音频警报 + 桌面通知(GM_notification)"
```

---

## Task 5.5: 批 1 构建确认

- [ ] **Step 1: build + node-check**

Run: `cd autobattle && npm run build && node --check dist/hv-autobattle.user.js`
Expected: 构建成功，node-check 无输出。批 1 纯逻辑全部进 bundle（`useRiddleAssist` 默认 true 但无 detect 激活 → 暂无行为，零回归）。

- [ ] **Step 2: Commit dist**

```bash
git add autobattle/dist/hv-autobattle.user.js
git commit -m "build(riddle): 批1 DOM无关产物(类型/config/快捷键/采集纯/提醒)"
```

---

# 批 2：DOM 依赖（待用户抓小马题 DOM HTML 样本，spec §9）

> **阻塞前置**：以下 task 需要小马题真实 DOM HTML（题目图元素类型+跨域、6 checkbox 选择器+小马名对应、Submit 选择器、倒计时 DOM、对错反馈）。用户下次遇小马题抓 `#riddlemaster` 区域 outerHTML 后，把下列每个 task 的「待样本确定」项填实再执行。各 task 已给接口契约 + 实现骨架 + 验证方式。

## Task 6: riddle/detect.ts（检测+解析）— 待样本

**Files:** Create: `autobattle/src/riddle/detect.ts`

**接口契约**（已定，供批 1 其他模块引用）：
```typescript
import type { RiddleState } from './types';
export function detectRiddle(root?: ParentNode): RiddleState; // 检测+解析当前页小马题
```

**实现骨架 + 待样本项**：
- 检测信号：小马题特征 DOM（6 小马名 checkbox + "Submit Answer" + "Select ALL ponies" 文案 + 倒计时）。**待样本**：精确容器/选择器（新版可能不再是 `#riddlecounter`/`#riddlemaster`）。
- 解析 options：找 6 个 checkbox，每个关联其 label 小马名 → `{name, el}[]`。**待样本**：checkbox 与 label 文本的 DOM 关系（label for / 相邻文本 / 父节点）。
- 解析 submitEl：定位 "Submit Answer" 按钮。**待样本**：选择器。
- 解析 imageEl：题目图元素（`<img>`/`<canvas>`）。**待样本**：元素类型 + src 域(跨域?)。
- 解析 secondsLeft：倒计时数字。**待样本**：倒计时 DOM（截图是 "33"，旧版是 `#riddlecounter>div>div` backgroundPosition）。
- 纯解析子函数（label→PonyName 规整、倒计时数字提取）抽出可测。

**验证**：typecheck + 真机 detectRiddle() 返回正确 RiddleState。**Commit** `feat(riddle): detect 检测+解析小马题`。

## Task 7: riddle/submit.ts（提交+弹窗）— 待样本

**Files:** Create: `autobattle/src/riddle/submit.ts`

**接口契约**：
```typescript
import type { RiddleState, PonyName } from './types';
export function submitRiddle(state: RiddleState, selected: PonyName[]): void; // 勾选+点 Submit
export function openRiddleWindow(): void; // 弹窗模式(移植 dodying window.open riddleWindow)
export function preloadRiddleWindow(): void; // 预处理预加载
```

**实现骨架 + 待样本项**：
- submitRiddle：按 selected 勾选对应 checkbox（state.options 里匹配 name）+ 点 state.submitEl。**待样本**：checkbox 勾选方式（.checked=true + dispatchEvent('change')?）、Submit 触发（click / form.submit）。
- 弹窗：移植 dodying `window.open(location.href, 'riddleWindow', 'resizable,scrollbars,width=1241,height=707')` + 预处理（提前 open+200ms close）。`riddlePopup` 配置控制。
- 人工触发为主（务实辅助不自动勾选）；未来 CNN 开启则自动 submitRiddle。

**验证**：typecheck + 真机弹窗+勾选+提交。**Commit** `feat(riddle): submit 多选提交 + 弹窗模式`。

## Task 8: riddle/ui.ts（大按钮 UI + 图鉴浮层 + 倒计时 + 快捷键绑定）— 待样本

**Files:** Create: `autobattle/src/riddle/ui.ts`

**接口契约**：
```typescript
import type { RiddleState, RiddleConfig } from './types';
export function mountRiddleUI(state: RiddleState, cfg: RiddleConfig): () => void; // 挂载 UI, 返回卸载函数
```

**实现骨架 + 待样本项**：
- 大按钮多选：6 只小马大按钮/卡片（名字+可选缩略图），点击 toggle 对应 checkbox + 高亮（借鉴 RiddleLimiter Plus 大按钮+悬停）。
- 醒目倒计时：读 state.secondsLeft 大数字显示，≤riddleUrgentSec 变红。
- PONY CHART 图鉴浮层：内嵌/浮层显示参考图鉴（spec 用户发的对照图，可内置 base64 或读 PONY CHART 链接）。**待样本**：PONY CHART 链接 href。
- 快捷键绑定：用 Task 3 `mapRiddleKey` + state.options 绑 keydown（数字 toggle / Enter submit / Esc 静音）。
- 复用现有 styles 范式。

**验证**：typecheck + build + 真机 UI/快捷键/图鉴/倒计时。**Commit** `feat(riddle): 大按钮多选 UI + 图鉴浮层 + 倒计时 + 快捷键绑定`。

## Task 9: riddle/collector.ts IO（IndexedDB + 截图 + 导出）— 待样本

**Files:** Modify: `autobattle/src/riddle/collector.ts`（追加 IO）

**接口契约**：
```typescript
import type { RiddleSample } from './types';
export function captureRiddleImage(imageEl: HTMLImageElement | HTMLCanvasElement): { dataUrl: string; w: number; h: number } | null;
export async function saveSample(sample: RiddleSample): Promise<void>; // 入 IndexedDB
export async function exportSamples(): Promise<Blob>; // 导出 JSON/zip
export async function clearSamples(): Promise<void>;
```

**实现骨架 + 待样本项**：
- captureRiddleImage：img→canvas.drawImage→toDataURL / canvas→toDataURL。**待样本**：题图元素类型 + **跨域**（HV 图跨域 → canvas 污染 toDataURL 报错 → 需 GM_xmlhttpRequest 取图转 blob/dataURL 或 img.crossOrigin）。这是本 task 最大未知。
- IndexedDB：建库 `hvab-riddle` / store `samples`，saveSample put，exportSamples 读全部打包 JSON。
- 难度元数据（level/round）从哪取？**待样本/集成**：玩家等级 DOM、最近层数（reader 的 roundNow / GF 层数）。

**验证**：typecheck + 真机采集入库 + 导出。**Commit** `feat(riddle): collector IndexedDB 采集 + 截图 + 导出`。

## Task 10: 集成（reader/brain/loop/panel）— 待样本

**Files:** Modify: `reader.ts`、`brain.ts`、`loop.ts`、`ui/panel.ts`

**实现骨架 + 待样本项**：
- **reader.ts:244**：`riddle` 检测从 `!!#riddlecounter` 适配新版（用 detect.ts 的信号或新选择器）。**待样本**。
- **brain.ts**：P0 riddle 分支保留；`brain.riddle()` 实现为 `recognize` 接口（现 return null=人工；`riddleAutoRecognize` + CNN 就绪未来填充）。
- **loop.ts**：tick 检测到小马题 → 暂停战斗决策 + 激活 riddle 子系统（detect→notify→mountUI→采集；弹窗按 riddlePopup）。打断战斗优先。
- **panel.ts**：提醒(notify)tab 加 riddle 配置组（9 键 swRow/numRow）+ 导出/清空采集按钮。
- 装配 `riddleCfg(C): RiddleConfig`（仿 weightCfg）。

**验证**：typecheck + build + 真机端到端（小马题→提醒→UI→人工答→采集；useRiddleAssist=false 零回归）。**Commit** `feat(riddle): 集成 reader/brain/loop/panel`。

## Task 11: 构建 + 真机验收 — 待样本

- typecheck + build + node-check 全绿。
- 真机：小马题出现 → 弹窗/大按钮/数字快捷键/音频+桌面通知/图鉴浮层/倒计时工作；人工快答；样本入 IndexedDB；导出可用；催答在倒计时将尽触发；`useRiddleAssist=false` 零回归。
- **Commit dist** `build(riddle): 小马题辅助+采集产物`。

---

## Self-review（spec 覆盖 / 占位 / 类型一致）

- **spec 覆盖**：§4 架构→批1+批2 全文件；§5 检测/提交/弹窗→Task6/7；§6 UI/快捷键/提醒→Task3/5/8；§7 采集/导出/CNN→Task4/9+brain.riddle()；§8 config→Task2；§9 待样本→批2 各 task 标注。✓
- **类型一致**：MANE6/PonyName/RiddleSample/RiddleState/RiddleConfig/RiddleRecognition 跨 task 一致；mapRiddleKey/encodeMultiHot/buildSample/detectRiddle/submitRiddle/mountRiddleUI/captureRiddleImage/saveSample 签名前后一致。✓
- **占位说明**：批 2 的「待样本确定」非普通 placeholder，是 spec §9 明确的 DOM 开放项（用户决定先做批 1）；批 2 给了接口契约+骨架，样本到位即可填实。批 1 全部完整代码无占位。

---

## Execution Handoff

批 1（Task 1-5.5）可立即 subagent-driven 执行；批 2（Task 6-11）阻塞于小马题 DOM 样本。
