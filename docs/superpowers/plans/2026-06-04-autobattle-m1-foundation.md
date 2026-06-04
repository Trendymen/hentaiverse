# M1 地基 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `autobattle/` 原地重构为 TypeScript + vite-plugin-monkey 工程,产出一个不压缩、可调试的单文件油猴脚本,空界面(右下常驻 HUD + 四 tab 抽屉)能在 HV 页面挂载,并在 `document-start` 最早期 hook XHR/fetch 旁路。

**Architecture:** 独立重写,不焊接 dodying。旧焊接版移入 `reference/` 作翻写底本。分层:`core`(store/config/dom/bus)、`ui`(hud/panel/components/styles)、入口 `main.ts`。M1 只搭骨架与基础设施,战斗决策/连刷/保护在 M2-M5 接入。

**Tech Stack:** TypeScript · vite · vite-plugin-monkey(`build.minify:false` 不压缩可调试,`run-at: document-start`)。

**参考:** 设计文档 `docs/superpowers/specs/2026-06-04-autobattle-ui-rework-design.md`。

---

## 文件结构(M1 创建/迁移)

```
autobattle/
├── package.json            # 创建: 依赖 + dev/build/typecheck 脚本
├── .gitignore              # 创建: 忽略 node_modules
├── tsconfig.json           # 创建: TS strict + vite-plugin-monkey/client 类型
├── vite.config.ts          # 创建: userscript 头 + minify:false + document-start
├── src/
│   ├── main.ts             # 创建: document-start hook + 装配 + 挂载 UI
│   ├── types.ts            # 创建: 全局类型(随里程碑扩展)
│   ├── core/
│   │   ├── store.ts        # 创建: GM/localStorage 持久化
│   │   ├── config.ts       # 创建: 类型化配置 + 默认值合并
│   │   ├── dom.ts          # 创建: 选择器/建元素/onReady 工具
│   │   └── bus.ts          # 创建: 类型化事件总线
│   └── ui/
│       ├── styles.ts       # 创建: CSS(深色半透明/圆角/blur)
│       ├── components.ts   # 创建: 可复用控件容器(M1 占位)
│       ├── hud.ts          # 创建: 右下常驻 HUD 空壳
│       └── panel.ts        # 创建: 四 tab 抽屉空壳
├── dist/hv-autobattle.user.js  # 构建产物(Task 15 生成)
├── reference/              # 迁移: dodying 原版 + 旧焊接版(翻写底本)
│   ├── hvAutoAttack.user.js
│   ├── hv_brain_modern.user.js
│   ├── weld.mjs
│   ├── hvAutoAttack_BRAIN.user.js
│   ├── hv_decideAction.js   # 已存在
│   └── hv_shield_brain.js   # 已存在
└── README.md               # Task 15 更新
```

---

### Task 1: 迁移旧焊接版进 reference/

**Files:**
- Move: `autobattle/hvAutoAttack.user.js` → `autobattle/reference/hvAutoAttack.user.js`
- Move: `autobattle/hv_brain_modern.user.js` → `autobattle/reference/hv_brain_modern.user.js`
- Move: `autobattle/weld.mjs` → `autobattle/reference/weld.mjs`
- Move: `autobattle/dist/hvAutoAttack_BRAIN.user.js` → `autobattle/reference/hvAutoAttack_BRAIN.user.js`

- [ ] **Step 1: git mv 旧文件进 reference/**

```bash
cd /Users/liuzhuo/webstorm_project/hentaiverse/autobattle
git mv hvAutoAttack.user.js reference/hvAutoAttack.user.js
git mv hv_brain_modern.user.js reference/hv_brain_modern.user.js
git mv weld.mjs reference/weld.mjs
git mv dist/hvAutoAttack_BRAIN.user.js reference/hvAutoAttack_BRAIN.user.js
rmdir dist 2>/dev/null || true
```

- [ ] **Step 2: 验证迁移结果**

Run: `ls reference/ && echo '---' && ls`
Expected: `reference/` 含 6 个文件(hvAutoAttack.user.js / hv_brain_modern.user.js / weld.mjs / hvAutoAttack_BRAIN.user.js / hv_decideAction.js / hv_shield_brain.js);根目录只剩 `README.md` 和 `reference/`,无 `dist/`、无散落 `.user.js`。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(autobattle): 旧焊接版移入 reference/ 作翻写底本"
```

---

### Task 2: package.json + .gitignore + 安装依赖

**Files:**
- Create: `autobattle/package.json`
- Create: `autobattle/.gitignore`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "hv-autobattle",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "HV 单手盾战现代化半自动辅助(独立重写)",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vite-plugin-monkey": "^4.0.6"
  }
}
```

- [ ] **Step 2: 写 .gitignore**

```
node_modules/
*.local
.vite/
```

- [ ] **Step 3: 安装依赖**

Run: `cd /Users/liuzhuo/webstorm_project/hentaiverse/autobattle && npm install`
Expected: 生成 `node_modules/` 与 `package-lock.json`,无 ERR。若某版本不存在,npm 会取最近的满足 `^` 的版本。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "build(autobattle): 初始化 npm 工程(vite + vite-plugin-monkey + ts)"
```

---

### Task 3: tsconfig.json

**Files:**
- Create: `autobattle/tsconfig.json`

- [ ] **Step 1: 写 tsconfig.json**

`types: ["vite-plugin-monkey/client"]` 提供 `GM_getValue` 等全局 GM API 与 `unsafeWindow` 的类型声明。

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vite-plugin-monkey/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 2: 验证 tsconfig 可被解析**

Run: `cd autobattle && npx tsc --noEmit`
Expected: 因为 `src/` 还没文件,tsc 报 "No inputs were found" 是允许的;**只要不是 tsconfig 语法错误**即可。下一个有 src 的 task 会真正跑通。

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "build(autobattle): 添加 tsconfig(strict + vite-plugin-monkey 类型)"
```

---

### Task 4: vite.config.ts

**Files:**
- Create: `autobattle/vite.config.ts`

- [ ] **Step 1: 写 vite.config.ts**

userscript 元数据忠实对齐 dodying 原版(三域名 include / connect / 6 个 GM grant),但 `run-at` 升级为 `document-start`(最早 hook XHR)。`build.minify:false` 不压缩可调试。

```typescript
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: '[HV] 自动战斗 · 盾战大脑', // 仅中文, 不做多语言
        namespace: 'https://github.com/local/hv-autobattle',
        version: '0.1.0',
        description: 'HV 单手盾战现代化半自动辅助(独立重写,忠实翻写 dodying 引擎)',
        author: 'local',
        match: ['*://hentaiverse.org/*', '*://alt.hentaiverse.org/*', '*://e-hentai.org/*'],
        connect: ['hentaiverse.org', 'e-hentai.org'],
        grant: [
          'GM_getValue',
          'GM_setValue',
          'GM_deleteValue',
          'GM_notification',
          'GM_xmlhttpRequest',
          'unsafeWindow',
        ],
        'run-at': 'document-start',
      },
      build: {
        fileName: 'hv-autobattle.user.js',
      },
    }),
  ],
  build: {
    // 不压缩、不丑化: 保留变量名与结构, 充分可调试 (vite-plugin-monkey 默认即 false, 显式声明加保险)
    minify: false,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "build(autobattle): vite-plugin-monkey 配置(document-start + 不压缩)"
```

---

### Task 5: src/types.ts

**Files:**
- Create: `autobattle/src/types.ts`

- [ ] **Step 1: 写 types.ts**

```typescript
// 全局类型: 随里程碑扩展. M1 先放界面态快照与事件总线事件表.

/** 角色当前数值快照 (M2 由 StateReader 填真值; M1 仅作类型占位) */
export interface VitalSnapshot {
  hp: number;
  mp: number;
  sp: number;
  oc: number;
}

/** 事件总线事件表 (key = 事件名, value = payload 类型). 随里程碑追加. */
export interface BusEvents {
  'state:update': VitalSnapshot;
  'ui:toggle': boolean;
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS(无输出即无错)。

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(autobattle): 全局类型 types.ts"
```

---

### Task 6: src/core/store.ts

**Files:**
- Create: `autobattle/src/core/store.ts`

- [ ] **Step 1: 写 store.ts**

键前缀 `hvab_`(与旧焊接版 `hvsb_` 区分,全新工程不继承旧值)。

```typescript
// 持久化: GM 优先, localStorage 兜底. 全新工程键前缀 hvab_.
const PREFIX = 'hvab_';

export const Store = {
  get<T>(key: string, def: T): T {
    try {
      if (typeof GM_getValue === 'function') return GM_getValue<T>(PREFIX + key, def);
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? def : (JSON.parse(raw) as T);
    } catch {
      return def;
    }
  },
  set<T>(key: string, val: T): void {
    try {
      if (typeof GM_setValue === 'function') GM_setValue(PREFIX + key, val);
      else localStorage.setItem(PREFIX + key, JSON.stringify(val));
    } catch {
      /* 持久化失败不致命, 忽略 */
    }
  },
};
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。若 `GM_getValue` 报未定义,确认 tsconfig 的 `types` 含 `vite-plugin-monkey/client`(Task 3 已配)。

- [ ] **Step 3: Commit**

```bash
git add src/core/store.ts
git commit -m "feat(autobattle): 持久化 Store(GM/localStorage)"
```

---

### Task 7: src/core/config.ts

**Files:**
- Create: `autobattle/src/core/config.ts`

- [ ] **Step 1: 写 config.ts**

```typescript
import { Store } from './store';

/** 默认配置. M1 仅放总开关与界面态; 战斗/连刷/保护项随里程碑加入. */
export const DEFAULT_CONFIG = {
  enabled: false, // B大脑总开关 (🧠自动 / ⏸暂停)
  panelOpen: false, // 抽屉是否展开
  activeTab: 'battle' as 'battle' | 'farm' | 'guard' | 'notify',
};

export type Config = typeof DEFAULT_CONFIG;

// 单一真相: 模块加载时合并默认值 + 持久化覆盖; 之后所有读写统一走 config.get/set, 落盘到 Store 'config' 键.
let current: Config = { ...DEFAULT_CONFIG, ...Store.get<Partial<Config>>('config', {}) };

export const config = {
  get<K extends keyof Config>(key: K): Config[K] {
    return current[key];
  },
  set<K extends keyof Config>(key: K, val: Config[K]): void {
    const next: Config = { ...current };
    next[key] = val;
    current = next;
    Store.set('config', current);
  },
  all(): Config {
    return current;
  },
};
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add src/core/config.ts
git commit -m "feat(autobattle): 类型化配置 config(默认值合并)"
```

---

### Task 8: src/core/dom.ts

**Files:**
- Create: `autobattle/src/core/dom.ts`

- [ ] **Step 1: 写 dom.ts**

```typescript
// DOM 工具: 选择器 / 建元素 / DOM-ready.
export const $ = <E extends Element = Element>(sel: string, root: ParentNode = document): E | null =>
  root.querySelector<E>(sel);

export const $$ = <E extends Element = Element>(sel: string, root: ParentNode = document): E[] =>
  [...root.querySelectorAll<E>(sel)];

/** 建元素 + 批量属性 + innerHTML. */
export function el(tag: string, attrs: Record<string, string> = {}, html = ''): HTMLElement {
  const e = document.createElement(tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (html) e.innerHTML = html;
  return e;
}

/** document-start 注入下安全等待 body 就绪. */
export function onReady(fn: () => void): void {
  if (document.body) fn();
  else document.addEventListener('DOMContentLoaded', fn, { once: true });
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add src/core/dom.ts
git commit -m "feat(autobattle): DOM 工具(选择器/建元素/onReady)"
```

---

### Task 9: src/core/bus.ts

**Files:**
- Create: `autobattle/src/core/bus.ts`

- [ ] **Step 1: 写 bus.ts**

```typescript
import type { BusEvents } from '../types';

type Handler<T> = (payload: T) => void;

/** 极简类型化事件总线: 解耦战斗内/外与 UI. */
class Bus {
  private map = new Map<keyof BusEvents, Set<Handler<unknown>>>();

  on<K extends keyof BusEvents>(type: K, fn: Handler<BusEvents[K]>): () => void {
    let set = this.map.get(type);
    if (!set) {
      set = new Set();
      this.map.set(type, set);
    }
    set.add(fn as Handler<unknown>);
    return () => {
      this.map.get(type)?.delete(fn as Handler<unknown>);
    };
  }

  emit<K extends keyof BusEvents>(type: K, payload: BusEvents[K]): void {
    this.map.get(type)?.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        /* 单个订阅者异常不影响其他 */
      }
    });
  }
}

export const bus = new Bus();
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add src/core/bus.ts
git commit -m "feat(autobattle): 类型化事件总线 bus"
```

---

### Task 10: src/ui/styles.ts

**Files:**
- Create: `autobattle/src/ui/styles.ts`

- [ ] **Step 1: 写 styles.ts**

```typescript
// 注入 CSS: 深色半透明 / 圆角 / blur. M1 给 HUD + 抽屉骨架样式.
export const CSS = `
#hvab-root{position:fixed;right:10px;bottom:10px;z-index:99999;width:204px;font:12px/1.4 system-ui,-apple-system,sans-serif;color:#dce3f0}
#hvab-hud{background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;box-shadow:0 6px 22px rgba(0,0,0,.5)}
#hvab-hud .hvab-top{display:flex;align-items:center;gap:7px;margin-bottom:6px}
#hvab-hud .hvab-name{flex:1;font-size:12px;opacity:.92}
#hvab-sw{cursor:pointer;border:0;border-radius:6px;padding:3px 10px;font:bold 12px system-ui;color:#fff;background:#a55}
#hvab-gear{cursor:pointer;border:0;background:none;color:#9aa;font-size:14px;padding:0}
.hvab-bar{position:relative;height:14px;background:rgba(255,255,255,.08);border-radius:7px;margin:3px 0;overflow:hidden}
.hvab-bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:7px;transition:width .25s}
#hvab-hp{background:#4caf50}#hvab-mp{background:#3b82f6}#hvab-sp{background:#ef4444}#hvab-oc{background:#f59e0b}
.hvab-bar span{position:absolute;inset:0;text-align:center;font:10px/14px monospace;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.7)}
#hvab-panel{margin-top:8px;background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;display:none}
#hvab-panel.open{display:block}
.hvab-tabs{display:flex;gap:4px;margin-bottom:8px}
.hvab-tab{flex:1;cursor:pointer;border:0;border-radius:6px;padding:4px 0;font-size:11px;background:rgba(255,255,255,.08);color:#bcd}
.hvab-tab.active{background:#3a7;color:#fff}
.hvab-tabpane{display:none}
.hvab-tabpane.active{display:block}
.hvab-empty{opacity:.5;font-size:11px;padding:10px 0;text-align:center}
`;
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add src/ui/styles.ts
git commit -m "feat(autobattle): UI 样式 styles(深色半透明/圆角/blur)"
```

---

### Task 11: src/ui/components.ts

**Files:**
- Create: `autobattle/src/ui/components.ts`

- [ ] **Step 1: 写 components.ts**

```typescript
import { el } from '../core/dom';

// 可复用控件: 随里程碑补全(开关/滑块/数字框). M1 先提供占位 section 容器.
export function section(title: string): HTMLElement {
  return el('div', { class: 'hvab-section' }, `<div class="hvab-empty">${title} · 待 M2+ 接入配置项</div>`);
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add src/ui/components.ts
git commit -m "feat(autobattle): UI 控件容器 components(M1 占位)"
```

---

### Task 12: src/ui/hud.ts

**Files:**
- Create: `autobattle/src/ui/hud.ts`

- [ ] **Step 1: 写 hud.ts**

右下常驻 HUD 空壳:开关(🧠自动/⏸暂停,读 Store.enabled)+ 齿轮 + 四条 vital 占位。数据接入在 M2(订阅 `state:update`)。

```typescript
import { el } from '../core/dom';
import { bus } from '../core/bus';
import { config } from '../core/config';
import type { VitalSnapshot } from '../types';

/** 右下常驻 HUD. onToggle: 点开关回调; onGear: 点齿轮回调. */
export function createHud(onToggle: () => void, onGear: () => void): HTMLElement {
  const hud = el('div', { id: 'hvab-hud' });
  const bar = (id: string, name: string) =>
    `<div class="hvab-bar"><i id="hvab-${id}"></i><span id="hvab-${id}t">${name} -</span></div>`;
  hud.innerHTML = `
    <div class="hvab-top">
      <button id="hvab-sw"></button>
      <b class="hvab-name">🛡 盾战大脑</b>
      <button id="hvab-gear">⚙</button>
    </div>
    ${bar('hp', 'HP')}${bar('mp', 'MP')}${bar('sp', 'SP')}${bar('oc', 'OC')}
    <div style="font-size:10px;opacity:.7;margin-top:4px">怪 - · 待 M2 接入决策</div>`;

  const sw = hud.querySelector<HTMLButtonElement>('#hvab-sw')!;
  const refresh = () => {
    const on = config.get('enabled');
    sw.textContent = on ? '🧠 自动' : '⏸ 暂停';
    sw.style.background = on ? '#3a7' : '#a55';
  };
  sw.onclick = () => {
    onToggle();
    refresh();
  };
  hud.querySelector<HTMLButtonElement>('#hvab-gear')!.onclick = onGear;
  refresh();

  // M2 接入: 订阅状态更新填 vital 条; M1 仅注册占位避免遗漏
  bus.on('state:update', (v: VitalSnapshot) => {
    void v;
  });
  return hud;
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add src/ui/hud.ts
git commit -m "feat(autobattle): 右下常驻 HUD 空壳(开关+齿轮+vital占位)"
```

---

### Task 13: src/ui/panel.ts

**Files:**
- Create: `autobattle/src/ui/panel.ts`

- [ ] **Step 1: 写 panel.ts**

四 tab(战斗/连刷/保护/提醒)抽屉空壳,tab 切换 + 每 tab 占位。`activeTab` 持久化。

```typescript
import { el } from '../core/dom';
import { section } from './components';
import { config } from '../core/config';

const TABS = [
  { key: 'battle', label: '战斗' },
  { key: 'farm', label: '连刷' },
  { key: 'guard', label: '保护' },
  { key: 'notify', label: '提醒' },
] as const;

/** 抽屉设置面板 (M1 空壳: 四 tab 切换 + 占位). */
export function createPanel(): HTMLElement {
  const panel = el('div', { id: 'hvab-panel' });
  const tabs = el('div', { class: 'hvab-tabs' });
  const panes = el('div', { class: 'hvab-panes' });
  let active: string = config.get('activeTab');

  const render = () => {
    tabs.querySelectorAll('.hvab-tab').forEach((b) =>
      b.classList.toggle('active', (b as HTMLElement).dataset.tab === active),
    );
    panes.querySelectorAll('.hvab-tabpane').forEach((p) =>
      p.classList.toggle('active', (p as HTMLElement).dataset.pane === active),
    );
  };

  for (const t of TABS) {
    const btn = el('button', { class: 'hvab-tab', 'data-tab': t.key }, t.label);
    btn.onclick = () => {
      active = t.key;
      config.set('activeTab', t.key);
      render();
    };
    tabs.appendChild(btn);

    const pane = el('div', { class: 'hvab-tabpane', 'data-pane': t.key });
    pane.appendChild(section(t.label));
    panes.appendChild(pane);
  }

  panel.appendChild(tabs);
  panel.appendChild(panes);
  render();
  return panel;
}

/** 展开/收起抽屉. */
export function togglePanel(panel: HTMLElement, open?: boolean): void {
  panel.classList.toggle('open', open);
}
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add src/ui/panel.ts
git commit -m "feat(autobattle): 四 tab 抽屉空壳 panel"
```

---

### Task 14: src/main.ts

**Files:**
- Create: `autobattle/src/main.ts`

- [ ] **Step 1: 写 main.ts**

入口:`document-start` 立即 hook XHR/fetch 旁路(只读不改,根治"战斗中途抓不到响应"),DOM-ready 后挂载 UI。`window.__hvab` 暴露调试接口(产物未压缩,可在 devtools 直接调用)。

```typescript
import { CSS } from './ui/styles';
import { el, onReady } from './core/dom';
import { createHud } from './ui/hud';
import { createPanel, togglePanel } from './ui/panel';
import { config } from './core/config';

// ── document-start: 最早 hook XHR/fetch 旁路(只读不改) ──
// 在 HV 的 battle 对象绑定发送引用之前注入, 才能捕获战斗响应(M2 解析 buff 剩余回合/精确鬥气).
let lastBattleResponse: string | null = null;

function hookNet(): void {
  const xo = XMLHttpRequest.prototype.open;
  const xs = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest & { __url?: string }, _method: string, url: string | URL) {
    this.__url = String(url);
    return (xo as (this: XMLHttpRequest, ...args: unknown[]) => void).apply(this, arguments as unknown as unknown[]);
  };
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest & { __url?: string }, body?: Document | XMLHttpRequestBodyInit | null) {
    this.addEventListener('load', () => {
      if (/Battle|api/i.test(this.__url || '')) lastBattleResponse = this.responseText;
    });
    return xs.call(this, body);
  };

  const f = window.fetch;
  if (f) {
    window.fetch = function (...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
      const first = args[0];
      const url = typeof first === 'string' ? first : first instanceof Request ? first.url : String(first);
      return f.apply(window, args).then((rp) => {
        if (/Battle|api/i.test(url)) {
          rp.clone()
            .text()
            .then((t) => {
              lastBattleResponse = t;
            })
            .catch(() => {});
        }
        return rp;
      });
    };
  }
}

// 挂载现代界面(右下常驻 HUD + 抽屉)
function mountUI(): void {
  if (document.getElementById('hvab-root')) return;
  const root = el('div', { id: 'hvab-root' });
  const style = el('style');
  style.textContent = CSS;
  root.appendChild(style);

  const panel = createPanel();
  const hud = createHud(
    () => {
      config.set('enabled', !config.get('enabled'));
    },
    () => {
      const open = !panel.classList.contains('open');
      togglePanel(panel, open);
      config.set('panelOpen', open);
    },
  );

  root.appendChild(hud);
  root.appendChild(panel);
  document.body.appendChild(root);

  if (config.get('panelOpen')) togglePanel(panel, true);
}

// 调试接口(产物未压缩, devtools 可直接调用 window.__hvab.getLastBattle())
(window as unknown as { __hvab: unknown }).__hvab = {
  getLastBattle: () => lastBattleResponse,
  config,
};

// ── 入口 ──
hookNet(); // document-start: 立即 hook, 早于一切业务请求
onReady(mountUI); // body 就绪后挂载 UI
```

- [ ] **Step 2: 验证类型编译**

Run: `cd autobattle && npm run typecheck`
Expected: PASS。若 `arguments` 在箭头/严格模式报错,确认 `XMLHttpRequest.prototype.open` 用的是 `function` 声明(本代码已是)。

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(autobattle): 入口 main(document-start hook + 挂载 UI)"
```

---

### Task 15: 构建 + 浏览器加载验证 + README

**Files:**
- Create: `autobattle/dist/hv-autobattle.user.js`(构建生成)
- Modify: `autobattle/README.md`

- [ ] **Step 1: 构建产物**

Run: `cd autobattle && npm run build`
Expected: 生成 `dist/hv-autobattle.user.js`,控制台输出构建成功,无报错。

- [ ] **Step 2: 验证产物未压缩可调试**

Run: `head -30 dist/hv-autobattle.user.js && echo '---' && wc -l dist/hv-autobattle.user.js`
Expected: 顶部是完整 `==UserScript==` 头(含 `@run-at document-start`、三个 `@match`、6 个 `@grant`);代码体保留换行/缩进/可读变量名(非单行压缩),行数为正常多行(几百行级别,而非 1-2 行)。

- [ ] **Step 3: 语法自检**

Run: `node --check dist/hv-autobattle.user.js`
Expected: 无输出(语法 OK)。

- [ ] **Step 4: 浏览器加载验证(人工)**

把 `dist/hv-autobattle.user.js` 安装进 Tampermonkey(或开发模式 `npm run dev` 取安装链接),打开 HV 页面,确认:
1. 右下角出现「🛡 盾战大脑」HUD,有 ⏸暂停/🧠自动 开关、四条 vital 占位条、⚙ 齿轮。
2. 点 ⚙ 向上展开抽屉,四个 tab(战斗/连刷/提醒/保护)可切换,每 tab 显示"待 M2+ 接入"占位。
3. 点开关在 ⏸暂停↔🧠自动 间切换,刷新页面后状态保持(持久化生效)。
4. devtools console 执行 `window.__hvab.getLastBattle()` 返回 `null` 或最近一次 battle 响应文本(hook 生效)。

- [ ] **Step 5: 更新 README.md**

```markdown
# HV 自动战斗 · 盾战大脑(现代化独立重写)

为 L398 PFUDOR 单手虚空盾战定制的现代化半自动辅助。TypeScript + vite-plugin-monkey 工程,产物为单文件、不压缩、可调试。

> ⚠️ 半自动辅助。禁止无人值守挂机/检测规避(封号红线)。小马图默认不自动答题。

## 开发

```bash
cd autobattle
npm install
npm run dev        # 开发模式, 控制台给出油猴安装链接(热更新)
npm run build      # 构建 dist/hv-autobattle.user.js(不压缩可调试)
npm run typecheck  # tsc 类型检查
```

## 安装

把 `dist/hv-autobattle.user.js` 安装进 Tampermonkey,刷新 HV 页面。

## 结构

- `src/core/` — store(持久化)/config(配置)/dom(工具)/bus(事件总线)
- `src/ui/` — hud(常驻 HUD)/panel(四 tab 抽屉)/components/styles
- `src/main.ts` — 入口(document-start hook + 挂载)
- `reference/` — dodying 原版 + 旧焊接版(翻写底本, 不参与构建)

## 里程碑

- M1 地基 ✅ — 工程/构建/core/UI 骨架/document-start hook
- M2 战斗内 — Reader + Brain + Executor
- M3 连刷 — 遭遇/竞技场/GF
- M4 保护后勤 — 精力/无响应/修复/库存/统计
- M5 杂项打磨 — 告警/异世界/小马提醒 + UI 精修
```

- [ ] **Step 6: Commit**

```bash
git add dist/hv-autobattle.user.js README.md
git commit -m "feat(autobattle): M1 地基构建产物 + README(空界面可挂载)"
```

---

## 验收(M1 完成判据)

- `npm run typecheck` 通过,`npm run build` 产出单文件 `dist/hv-autobattle.user.js`。
- 产物未压缩(多行可读、变量名保留)、`node --check` 通过、`==UserScript==` 头含 `document-start` + 三 match + 六 grant。
- 浏览器加载后右下 HUD + 四 tab 抽屉空壳可见可交互,开关状态持久化,`window.__hvab.getLastBattle()` 可调用(hook 生效)。
- 旧焊接版完整保留在 `reference/`,翻写底本就位。
- 红线守住:M1 不含任何自动出招/连刷/答题逻辑,纯地基。
