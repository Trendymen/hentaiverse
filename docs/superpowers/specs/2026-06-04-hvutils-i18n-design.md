# hvUtils.js 界面汉化设计

- 日期:2026-06-04
- 状态:设计已获批(待用户复核 spec)
- 目标文件:`hvUtils.js`(HentaiVerse 战斗外工具油猴脚本 v4.0.0,作者 sssss2,约 488KB / 10885 行,纯英文 UI,当前 0 处中文)

## 1. 背景与目标

`hvUtils.js` 自身动态生成了大量英文界面(设置面板、顶栏菜单、按钮、确认/警告弹窗、状态文本、表格、操作日志等)。本任务把这些**面向用户的界面文本 + 设置项说明**翻译为**简体中文**,术语对齐 HentaiVerse 中文社区习惯。

UI 文本规模(由 Explore agent 全文提取,详见 `docs/hvutils-ui-strings.md`):

- **A 类:游戏专有名词约 300 个**——场所名、装备品质/前缀/后缀/类型/词条、绑定道具(38)、消耗品/晶体(50+)、怪物 Chaos 升级词条与里程碑、Hath Perk、天赋技能预设等。
- **B 类:通用功能文案约 400 条**——设置面板全部 label/说明、150+ 按钮、25 条 confirm、30 条 alert、动态状态、表格列头、操作日志、placeholder 等。
- 合计约 **700 处**待翻译。

## 2. 决策汇总(brainstorming 定稿)

| # | 决策点 | 选择 |
|---|---|---|
| 1 | 整体工作流 | 两阶段:先产出术语对照表 → 用户确认 → 再翻译 |
| 2 | 实现方式 | 直接改 `hvUtils.js` 源码字符串字面量(不做 i18n 字典、不做外挂) |
| 3 | 翻译范围 | 界面文本 + 设置项说明文字(不动代码注释、配置 key、逻辑) |
| 4 | 术语源 | **equip_chinese 字典优先**,fandom/ehwiki 补充缺失项并交叉验证 |
| 5 | 译法风格 | **功能意译**,贴近 equip_chinese(如 Binding of Slaughter → 粘合剂 基础物理伤害) |
| 6 | 边界字符串 | **保守**:拿不准是显示还是逻辑标识符时,留英文 |
| 7 | 验证强度 | 每批 vscode-mcp-server 查 diagnostics + 人工甄别复查逻辑标识符 |

## 3. 架构:两阶段

### 阶段一:术语对照表(深度考证)

**主源**:`equip_chinese_2.js` 内联字典(社区实战译法,功能意译风格):

- `loadItems`(行 355–955):物品 / 绑定道具 / 消耗品
- `loadEquipsInfo`(行 962–1109):装备属性词条
- `loadEquips`(行 1116–1330):装备名(类型 / 前缀 / 后缀)
- `loadExtra`(行 1331+):论坛额外内容

**补充源**(填补 equip_chinese 未覆盖项 + 交叉验证):

- **fandom 中文 wiki**(`scratchpad.fandom.com/zh/wiki/...`):普通抓取返回 403,**必须用浏览器 MCP(chrome-devtools)抓取**。`/zh/` 默认正文即简体。`Category:HentaiVerse` 共 86 词条,重点:`Acronyms`(缩写表,已抓)、`Equipment_Prefixes`、`Equipment_Suffixes`、`Equipment_Procs`、各场所名、`Monster_Lab`、`Items`。
- **ehwiki 中文版**(`ehwiki.org/wiki/HentaiVerse/Chinese`):WebFetch 可抓,但**繁简混用**,需统一转简体并核对。

**equip_chinese 未覆盖、需 wiki 补充的 A 类**:场所名(Arena/GrindFest/Item World 等)、怪物 Chaos 升级词条(Scavenging/Fortitude…)、怪物里程碑描述、Hath Perk(Coupon Clipper/Dark Descent)、天赋技能预设、设置相关机制词。

**冲突解决**:equip_chinese 优先;equip_chinese 缺失则取 fandom 简体;两 wiki 分歧记录备注。风格统一为功能意译。

**产出**:《HV 简体术语对照表》(`docs/hvutils-glossary.md`),列:`英文 | 简体中文 | 来源 | 备注`,覆盖 A 类全部术语。**交用户审核定稿**后才进入阶段二。

### 阶段二:源码翻译(直接改 `hvUtils.js`)

动手前先**备份**为 `hvUtils.js.bak`。据定稿术语表逐处替换:

- **A 类术语**:按表译,且**仅在"显示给用户"的位置**翻译(见 §4)。
- **B 类功能文案**:直接译,保留模板变量与格式(见 §5)。
- **边界保守**:无法确定是显示还是逻辑标识符的,留英文。

## 4. 核心风险:显示文本 vs 逻辑标识符

hvUtils.js 处理的是游戏返回的**英文**数据。许多 A 类术语是**用来匹配/解析英文数据的标识符**,翻译它们会破坏排序/过滤/着色/菜单跳转。**必须区别对待**:

| 角色 | 处理 | 典型位置(出自提取清单) |
|---|---|---|
| 逻辑标识符 | **保留英文** | `settings.topMenuLinks` 数组里的页面名;菜单定义对象的 `s:'Character', ss:'tr'` 等 key;`lotteryFilters` / `equipNameCode` / `equipmentShopProtectFilters` / `equipmentShopBazaarFilters` / `shrineFilters` 过滤规则里的品质/前后缀/类型英文;`monsterLabDefaultSort` 排序键;解析装备名的正则;作为对象 key / className 的术语 |
| 显示文本 | **翻译** | 设置面板区块标题(行 205/211/218/225/234/243/247/251/256 等)与各 label/text 说明;所有按钮 value(Save/Close/Revert/USE RESTORATIVE…);confirm/alert 文案;动态状态文本(Loading…/Waiting…/Training completed!…);表格列头;操作日志;placeholder |

判断尺子:**该字符串是"用户在屏幕上读的"还是"代码拿去匹配/当 key/拼 URL 的"?** 后者一律留英文。

> 注:设置项的 `key`(如 `reNotification`)本就不显示,绝不翻译;只翻译其 `label` / `text`。顶栏菜单需"显示名译、跳转 key 留英文",二者在代码中是不同字段,分别处理。

## 5. 保护机制

替换时严格保留:

- `${...}` 模板插值、`\n` 换行
- HTML 标签(`<br>`、`<span style=…>` 等)与 `&lt;` / `&gt;` / `&amp;` 实体
- 正则表达式内容、字符串作为 key/匹配值时的原值

只改文案字符串本身,不改 `confirm/alert` 的调用逻辑与控制流。

## 6. 执行计划(分批,每批后查 diagnostics)

按功能模块分批,降低单次改动风险:

1. 设置面板(区块标题 + 全部 label/text + 底部按钮)
2. 顶栏 / 菜单(显示名译,跳转 key 留英文)+ 顶栏状态(Stamina/Credits/Equip Slots)
3. 装备 / 装备库存(显示文本;过滤规则键留英文)
4. 装备店(按钮、确认弹窗、批量操作)
5. 怪物实验室(按钮、Chaos 词条显示名、里程碑、升级流程文本)
6. MoogleMail(按钮、确认/警告、操作日志、placeholder)
7. 锻造 / Salvage / Upgrade 计算器
8. 祭坛 / 彩票 / 字体设置 / 其余弹窗与零散文本

每批完成后:`vscode-mcp-server get_diagnostics` 确认无语法错误 + 人工复查本批未误译逻辑标识符。

## 7. 验证与交付

- **语法**:每批 diagnostics 通过(目标文件无新增 error)。
- **逻辑**:人工复查 §4 的"保留英文"清单确未被翻译。
- **可选**:在 `hentaiverse.org` 实跑抽查菜单跳转 / 过滤 / 排序(需登录态)。

**交付物**:

1. `docs/hvutils-glossary.md`——《HV 简体术语对照表》
2. 翻译后的 `hvUtils.js`
3. `hvUtils.js.bak`——原文件备份
4. `docs/hvutils-ui-strings.md`——UI 文本提取清单(实施工作底稿)

## 8. 非目标(YAGNI)

- 不做 i18n 多语言切换框架。
- 不做"译文/原文"运行时切换(直接改源码即永久中文)。
- 不翻译代码注释、变量名、配置 key。
- 不改动任何功能逻辑、不做无关重构。
- 不抓 fandom 全部 86 词条,只按术语缺口聚焦抓取。
