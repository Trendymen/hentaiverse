# HV 自动战斗框架现代化重写 · 设计文档

- 日期: 2026-06-04
- 适配玩家: L398 PFUDOR 单手虚空盾战 (账号 l2266803)
- 落点: `autobattle/` 原地重构为 TS 工程, 旧焊接版移入 `autobattle/reference/`

## 1. 背景

当前 `autobattle/` 是把停更的 dodying `hvAutoAttack.user.js` 焊接「B大脑」决策内核得到的单文件产物 (4674 行, `weld.mjs` 字符串拼接)。问题:

- 架构是补丁叠补丁: B 模块内联进 dodying, 靠 `onBattle` 焊接点接管。
- 两套界面并存: dodying 老 UI(大量已失效配置) + B大脑控制台。
- 战斗中途注入抓不到 `battle` XHR 响应, 只能纯 DOM 解析, 读不到 buff 精确剩余回合/精确鬥气。

决定: **独立 TS 工程化重写**, 忠实翻写 dodying 实战引擎, 自研现代化界面。

## 2. 目标与非目标

### 目标
- 独立油猴脚本, 不再焊接 dodying。
- 全功能: ①战斗内决策 ②战斗外连刷 ③保护后勤 ④提醒杂项。
- 现代化界面: 右下角常驻 HUD + 点 ⚙ 向上展开的分 tab 抽屉。
- TS 工程化, 模块分层, 决策逻辑纯函数可测。
- **构建产物不压缩、不丑化, 充分可调试。**

### 非目标 / 红线 (不可逾越)
- 不做无人值守全自动 bot。
- 不做任何检测规避。
- 不自动随机回答小马图 (riddle): 仅弹窗提醒人工, 绝不自动提交随机答案。
- L398 无双装, 封号代价极高 —— 所有设计偏向半自动辅助。

## 3. 架构定位: 独立重写 + 忠实翻写

- **独立**: 新脚本自己实现 UI / 决策 / 状态读取 / 动作执行 / 连刷 / 保护, 不 require、不焊接 dodying。
- **忠实翻写**: dodying 作为「引擎规范参考」放进 `reference/`。其游戏交互**硬事实**(API endpoint、请求参数、CD 公式、DOM 选择器、触发时机)逐行对照忠实搬, **绝不凭空臆造**; 代码**形态**用 TS class / 类型 / 纯函数 / 事件总线重构。
- 每个翻写自 dodying 的模块, 顶部注明「翻写自 dodying 第 N 行 / 函数名」, 便于回溯校验。

## 4. 技术栈

- **TypeScript** (源码)
- **vite + vite-plugin-monkey** (打包): 油猴专用, TS 原生支持 + 开发时热更新 + 自动生成 `==UserScript==` 头 + GM API 类型。
- 构建配置: **`build.minify = false`** —— 不压缩、不混淆变量名、保留代码结构与换行, 便于 Tampermonkey + devtools 断点调试与读源码。开启 inline sourcemap (若 Tampermonkey 支持则更佳, 不支持也因未压缩而可读)。
- 注入时机: **`@run-at document-start`** —— 在 HV 的 `battle` 对象绑定 XHR 之前最早 hook 请求, 根治「战斗中途注入抓不到响应」的旧痛点。
- 产物: 单个 `dist/hv-autobattle.user.js`, 直接装进 Tampermonkey。

## 5. 目录结构

```
autobattle/
├── package.json · tsconfig.json · vite.config.ts
├── src/
│   ├── main.ts              # 入口: @run-at document-start, 装配各层
│   ├── core/
│   │   ├── store.ts         # 持久化(GM 优先, localStorage 兜底)
│   │   ├── config.ts        # 类型化配置 schema + 默认值 + 用户覆盖
│   │   ├── dom.ts           # $ / $$ / 等 DOM 工具
│   │   └── bus.ts           # 事件总线(解耦战斗内/外与 UI)
│   ├── battle/              # 战斗内 (现有 B大脑迁移)
│   │   ├── reader.ts        # StateReader: DOM 解析 + XHR 旁路捕获
│   │   ├── brain.ts         # decide(state): Action 纯函数决策(可单测)
│   │   ├── executor.ts      # Exec: 动作 → DOM 点击
│   │   └── tables.ts        # SK / IT / BUFF_IMG / DEBUFFS / CHANNEL_Q
│   ├── engine/             # 战斗外 (翻写 dodying)
│   │   ├── starter.ts       # 连刷: 遭遇战 / 竞技场(等级勾选) / GF
│   │   ├── stamina.ts       # 精力保护 / 阈值 / 战前恢复
│   │   ├── watchdog.ts      # 无响应刷新 / 切服 / 防卡死
│   │   ├── supply.ts        # 装备修复 / 库存检查
│   │   └── stats.ts         # 掉落 / 消耗统计
│   ├── ui/
│   │   ├── hud.ts           # 右下常驻 HUD(开关 + 血条 + 怪数 + 当前动作)
│   │   ├── panel.ts         # 抽屉设置面板(四 tab)
│   │   ├── components.ts    # 可复用控件(开关/滑块/数字/分组)
│   │   └── styles.ts        # CSS(深色半透明/圆角/blur)
│   └── types.ts            # State / Action / Config 等全局类型
├── dist/hv-autobattle.user.js   # 打包产物(装这个; 不压缩可调试)
├── reference/                   # 翻写底本(不进构建)
│   ├── hvAutoAttack.user.js     # dodying 原版
│   ├── hv_brain_modern.user.js  # 旧 B大脑源
│   ├── weld.mjs · hvAutoAttack_BRAIN.user.js  # 旧焊接版
│   └── hv_decideAction.js · hv_shield_brain.js
└── README.md
```

## 6. 数据流

- **入口** `main.ts` @document-start: 立即 hook XHR/fetch(只读不改) → 等 DOM ready → 挂载 UI → 启动战斗内/外循环监听。
- **战斗内回合**: 翻写 dodying 触发链(回合结束事件) → `reader.read()` 产出 `State` → `brain.decide(State)` 产出 `Action`(纯函数) → `executor.exec(Action)` 落到 DOM。动作间随机延迟(拟人 + 等 DOM)。
- **战斗外**: `watchdog` 监听页面无响应; `starter` 在战斗结束后按配置开下一场(遭遇/竞技场/GF)。
- **持久化**: `store` (GM 优先), `config` 类型化, 兼容迁移现有 `hvsb_*` 键。
- **解耦**: `bus` 事件总线让 UI 订阅状态更新, 战斗内/外模块互不直接依赖。

## 7. 界面设计

### 常驻 HUD (右下角)
```
┌──────────────────────┐
│ 🛡 盾战大脑   🧠自动 ⚙ │   ← 开关(🧠自动/⏸暂停) + 齿轮
│ HP ████████░░  82%   │
│ MP ██████░░░░  61%   │
│ SP ███░░░░░░░  30%   │
│ OC ████░░░░░░  40%   │
│ 怪 3   ▶ Imperil     │   ← 存活怪数 + 当前/上一动作
└──────────────────────┘
```

### 点 ⚙ 向上展开抽屉 (四 tab)
- **战斗**: 喝药线(急救血/常规血/回蓝/喝灵力) · 灵动架式(开/关 阈值) · 减益(☑Weaken ☑Imperil) · ☑Channeling增益 · ☑小马炮 · ☑起手卷轴 · 节奏延迟(min/max) · 进阶常量(SPARK_RESERVE / BURST_EST / MP_FUSE / 各 MIN_ENEMIES, 折叠区)。
- **连刷**: 自动遭遇战 · 闲置竞技场(等级勾选 1~500 / RB / GF) · GF 连刷 · 精力阈值 · 战前恢复精力。
- **保护**: 精力损失保护(暂停/警告/逃跑) · 页面无响应(刷新/切服) · 装备修复(耐久阈值) · 库存检查 · 掉落+消耗统计入口。
- **提醒**: 音频警报 · 桌面通知 · 异世界自动切换 · 小马答题弹窗提醒(禁随机自动答)。

### 视觉
深色半透明背景 + `backdrop-filter: blur` + 圆角 + 系统字体, 沿用并组件化现有 B大脑控制台基调; 控件统一(开关/滑块/数字框)。

## 8. 分阶段交付 (Milestone)

| 里程碑 | 内容 | 交付即可用 |
|---|---|---|
| **M1 地基** | TS 工程 + vite-plugin-monkey 构建(不压缩) + core(store/config/dom/bus) + UI 骨架(空 HUD + 抽屉) + document-start hook | 空面板能挂载, 构建产物可装可调试 |
| **M2 战斗内** | battle/(reader + brain 迁移现有 B大脑 + executor + tables) | 能打战斗, 替代焊接版核心 |
| **M3 连刷** | engine/starter (遭遇 / 竞技场 / GF) | 能连续刷 |
| **M4 保护后勤** | engine/(stamina/watchdog/supply/stats) | 挂机安全网与后勤 |
| **M5 杂项打磨** | 提醒(告警/异世界/小马提醒) + UI 精修 | 全功能 |

每个里程碑独立可装可测; 旧焊接版在 M2 完成前一直可用, 平滑过渡。

## 9. 验收标准

- 每个 milestone: 构建通过、产物为单 `.user.js`、`node --check` 或 tsc 无错、可在 Tampermonkey 加载。
- 产物**未压缩未混淆**, devtools 可读源码、可断点。
- 战斗内决策行为对齐现有 B大脑(16 级联 + 4 加固)。
- 连刷/保护行为对齐 dodying(以 `reference/` 逐项核对)。
- 红线: 无无人值守全自动、无检测规避、小马题不自动随机提交。

## 10. 待实现阶段确认的开放细节

- 战斗内回合触发的精确 hook 点(dodying `eventEnd`/`onBattle` 链)→ M2 翻写时对照 `reference/` 落实。
- XHR 旁路解析出的 battle 响应字段结构 → M2 在 GrindFest 实测核对。
- 竞技场/遭遇战开战 API 的参数 → M3 翻写时对照 `reference/` 落实。
