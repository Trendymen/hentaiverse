# autobattle 小马题自动答题设计 — 务实辅助 + 采集铺路

> 日期: 2026-06-07 · 状态: 设计已确认, 待写实现计划
> 工作分支: `feat/autobattle-riddle`(隔离 worktree)
> 关联:
> - 翻写底本: `autobattle/reference/hvAutoAttack.user.js`(riddle 旧版逻辑)、`RiddleLimiter.user.js` / `RiddleLimiterPlus.user.js`(选项 UI 插件)
> - 总纲: `docs/superpowers/specs/2026-06-04-autobattle-ui-rework-design.md`(§7 提醒 tab)、`docs/superpowers/plans/2026-06-05-autobattle-remaining-tasks.md`(M5)

## 1. 背景与目标

**名词**: HV 战斗中偶发**御谜士小马题(Riddlemaster)**——限时(实测 33 秒)弹出一道题, 答对得"御谜士祝福"(增伤 + 一次性恢复)。

**真实机制(由真机截图确认, 颠覆了初期假设)**: 题目是一张**米黄噪点背景上叠加多只半透明小马**的图, 要求"**Select ALL ponies you see**"(多选), 选项是 6 只主角小马名字的 checkbox(Twilight Sparkle / Rarity / Fluttershy / Rainbow Dash / Pinkie Pie / Applejack) + "Submit Answer" 按钮 + "PONY CHART" 图鉴链接 + 倒计时。

**关键难点(决定方案)**:
- **多选**(Select ALL, 不是单选)。
- **去色**: 小马在题图里是**灰度/低饱和半透明**, 彩虹/粉/黄/紫等鲜艳色被抹掉 → **颜色直方图识别失效**。
- **多只重叠 + 随机旋转 + 强干扰**(半透明灰矩形/椭圆/圆圈 + 噪点背景)。
- **随机生成**: 题图每次不同(随机小马组合+旋转+位置+干扰) → **整图 hash 记忆失效**。
- **难度随进度递增**: 玩家等级越高、最近战斗层数越多(GF 满 1000 层), 图越模糊、颗粒遮挡越多 → 任何自动识别命中率随进度下降。

**结论**: dodying(随机提交)、两插件(只是 A/B/C UI 按钮, 不含答案)、颜色法、记忆法**全部绕不过"识别去色半透明重叠旋转小马"这道硬坎**。可靠的真自动只有 CNN, 但需先采集大量标注数据训练。

**目标**: 走**务实辅助 + 采集铺路**——立即可用的人工辅助(弹窗/大按钮多选 UI/快捷键/提醒), 同时每答一题采集训练样本(题图+答案+难度元数据)入库, 为未来 CNN 真自动铺路; `brain.riddle()` 预留识别接口, 数据够了训练好模型即可无缝升级真自动。

## 2. 用户已锁定的决策

| # | 决策 | 取值 |
|---|---|---|
| ① | 自动程度 | **务实辅助 + 采集铺路**(不做即时自动识别; 真自动=未来 CNN, 现预留接口) |
| ② | 视觉识别 | 待 DOM/图样本再定; 颜色法/记忆法已否决(去色+随机生成); 未来走 CNN 多标签 |
| ③ | 参考特征源 | (未来 CNN)预置 6 只标准图 / 采集的题图训练 |
| ④ | 漏答兜底 | **多选下随机失效**(2^6 组合几乎必错)→ 改为**催答提醒**(倒计时将尽加急音+通知), 不乱提交; 真没人答则漏答(无惩罚) |
| ⑤ | 弹窗模式 | **移植** dodying `window.open` 独立窗(绕后台标签节流) |
| ⑥ | 辅助功能 | A/B/C... 即**数字 1-6 快捷键** + 音频警报 + 桌面通知 GM_notification + 倒计时显示 + 图鉴浮层 |
| ⑦ | 采集存储 | **IndexedDB**(题图+多选标签+难度元数据[等级/层数]) + 导出 JSON/zip |
| ⑧ | 提交方式 | 新版多选: 勾选 checkbox + 点 Submit Answer(人工/快捷键触发; 弃用旧版 `#riddleanswer` 单值) |

## 3. 真实题目机制(截图分析)

```
┌─────────────────────────────────────────────┐
│  米黄噪点背景 + 半透明灰矩形/椭圆/圆圈(干扰)        │
│  + 多只去色半透明小马(随机旋转/重叠)             │  ← 题目图
└─────────────────────────────────────────────┘
☐ Twilight Sparkle  ☐ Rarity  ☐ Fluttershy
☐ Rainbow Dash  ☐ Pinkie Pie  ☐ Applejack       ← 6 checkbox 多选
[PONY CHART]  [Submit Answer]   33               ← 图鉴 + 提交 + 倒计时
"Select ALL ponies you see in the image above
 then hit Submit Answer before the time limit runs out."
```

**新旧版差异(重要)**: dodying/两插件用的 `#riddleanswer`(单值) + `#riddleanswer+img`(提交)是**旧版单选**机制; 截图是**新版多选**(checkbox + Submit Answer)。**一切以新版为准**, 旧版提交机制不直接适用; 但 dodying 的**弹窗/快捷键/音频/倒计时/预处理**思路仍可移植。

## 4. 架构(riddle/ 子系统)

小马题是战斗中弹出的限时事件, 跨"检测 + UI 辅助 + 提交 + 采集 + 提醒"多职责, 做成相对独立子系统。

**新建 `autobattle/src/riddle/`**:

| 文件 | 职责 | 纯度 |
|---|---|---|
| `detect.ts` | 检测小马题 + 解析(题目图元素 / 6 checkbox+小马名映射 / Submit 按钮 / 倒计时秒数) | 副作用(读 DOM), 解析子函数纯 |
| `ui.ts` | 辅助 UI: 大按钮多选(借鉴 RiddleLimiter Plus 大按钮+悬停)、选中高亮、醒目倒计时、PONY CHART 图鉴浮层 | 副作用(DOM) |
| `hotkeys.ts` | 快捷键: 数字 1-6 toggle 对应小马 checkbox + Enter 提交 + Esc 静音; 映射按 checkbox 实际 label 动态绑定 | 副作用(事件), 映射纯函数 |
| `submit.ts` | 提交: 勾选选定 checkbox + 点 Submit; 弹窗模式(`window.open` riddleWindow + 预处理预加载, 移植 dodying) | 副作用 |
| `collector.ts` | 数据采集: 题图 dataURL + 多选标签 + 结果 + 难度元数据 → IndexedDB; 导出 JSON/zip | 副作用(Canvas/IndexedDB) |
| `notify.ts` | 提醒: 音频警报(移植 dodying `setAlarm('Riddle')`) + 桌面通知 `GM_notification` + 催答升级 | 副作用 |
| `types.ts` | RiddleState / RiddleSample / Mane6 枚举 / 配置类型 | 纯类型 |

**与现有工程集成**:
- **reader**: `riddle` 检测从旧 `!!#riddlecounter` 适配新版多选信号。
- **loop**: tick 检测到小马题 → 暂停战斗决策 + 激活 riddle 子系统(小马题限时, 打断战斗优先)。
- **brain**: P0 `riddle` 分支(现有) → 辅助路线返回"留人工" + 触发 UI/提醒/采集; 未来 `riddleAutoRecognize` 开 + CNN 就绪则自动勾选提交。`brain.riddle()` 保留为识别接口 `recognize(imageData): {pony, confidence}[]`(现 stub=null=人工)。
- **panel**: 提醒 tab 加 riddle 配置组(扩展现占位)。
- **弹窗**: riddleWindow 内脚本重载 → 同一套 detect/ui 代码复用(弹窗/主窗共用)。

**纪律**: 纯逻辑(题目解析、快捷键映射、采集数据结构、Mane6 名↔checkbox 映射)抽纯函数可测; DOM/弹窗/Canvas 截图/IndexedDB 副作用隔离在薄壳——对齐现有 `engine/`、`battle/` 范式。

## 5. 检测 + 解析 + 提交 + 弹窗

**检测(detect.ts)**:
- 信号 = 新版小马题特征 DOM(6 个小马名 checkbox + "Submit Answer" 按钮 + "Select ALL ponies" 文案 + PONY CHART + 倒计时)。
- 解析(纯函数): 6 checkbox → `{小马名 → checkbox 元素}` 映射; 倒计时秒数; 题目图元素引用。
- 精确选择器**待 DOM 样本标定**。

**提交(submit.ts)——人工触发, 非自动**:
- 务实辅助路线脚本**不自动勾选**(不识别); 由人工/快捷键勾选, 提交 = 勾选选定 checkbox + 点 "Submit Answer"。
- 弃用 dodying `#riddleanswer` 单值路径(旧版单选)。

**弹窗模式(移植 dodying `window.open`)**:
- 检测到小马题 → open 独立 riddleWindow(绕后台标签节流, 挂机时也能弹窗答) → 弹窗内呈现增强 UI + 倒计时 + 快捷键 → 人工/快捷键勾选 → Submit → 关窗 + 主窗刷新续战。
- 移植预处理预加载(提前 open+close 触发脚本初始化, 减首次延迟)。
- 配置 `riddlePopup` on/off(off = 主窗口内处理)。

**兜底策略(多选下随机失效 → 催答)**: 新版多选随机几乎必错 → 倒计时将尽(≤`riddleUrgentSec`)且未答 → **催答提醒**(加急音+通知), 不乱提交; 真没人答则漏答(无惩罚)。

**对错读取(采集用)**: 答对得"御谜士祝福"——待样本确认对/错的 DOM/日志线索; 读不到则采集兜底用"人工勾选答案"当标签(人工答可信)。

## 6. 辅助 UI + 快捷键 + 提醒

**辅助 UI(ui.ts)**:
- 6 只小马**大按钮/卡片**替代原小 checkbox: 每只显示名字(+ 可选图鉴缩略图), 点击 toggle, 选中高亮, 悬停反馈(借鉴 RiddleLimiter Plus)。
- **醒目倒计时**: 读 DOM 倒计时大数字显示, 剩 ≤N 秒变红告急。
- **PONY CHART 图鉴浮层**: 一键浮层显示 6 只参考图鉴对照辨认, 原地不跳走。
- 大号 Submit 按钮。

**快捷键(hotkeys.ts)**:
- **数字 1-6** toggle 当前从左到右第 N 个小马 checkbox(主推, 无冲突); 字母方案因 Rainbow Dash/Rarity 都 R 有冲突, 故弃。
- **Enter** = Submit Answer; **Esc** = 静音提醒。
- 映射**按 checkbox 实际 label 动态绑定**(不假设 6 只顺序固定), 纯函数可测。

**提醒(notify.ts)**:
- 音频警报(移植 dodying `setAlarm('Riddle')`)。
- 桌面通知 `GM_notification`("小马题! 剩 X 秒")。
- 催答升级(倒计时 ≤ `riddleUrgentSec` 仍未答 → 加急音 + 再通知)。
- 各提醒独立开关。

## 7. 数据采集 + 导出 + 未来 CNN 接口

**数据采集(collector.ts)——每答一题攒一条训练样本**:
- `RiddleSample = { 题目图 dataURL, 答案标签(6 维 multi-hot=勾选的小马), 结果(对/错), 元数据(玩家等级 / 最近层数难度 / 时间 / 图尺寸) }`。
- **难度元数据关键**: 难度随等级/层数递增, 未来训练须按难度分层, 每条样本记等级+层数。
- 题图截取: `img→canvas.toDataURL` / `canvas→toDataURL`; **跨域风险**(HV 题图若跨域 → canvas 被污染 `toDataURL` 报错 → 需 `GM_xmlhttpRequest` 取图或 `crossOrigin`), 待样本定。
- 标签质量: 优先采集**确认答对**的样本(标签可信); 读不到对错则全采、导出时人工筛。

**存储 + 导出**:
- 题图 dataURL 大(几十~几百 KB/张), `localStorage`/GM(~5-10MB)会爆 → 用 **IndexedDB**(浏览器内, 几十 MB~GB)存样本。
- 一键**导出 JSON/zip**(图+标签+元数据)供项目外训练。

**未来 CNN 接口(无缝升级真自动)**:
- `brain.riddle()` / detect 预留 `recognize(imageData): {pony, confidence}[]`。
- 现 stub = 人工; 采集够 → 项目外训练 CNN → 模型(tf.js/onnx)内嵌或加载 → 填充接口 → 自动勾选, 从"辅助"无缝升级"真自动"。

**采集开关**: `riddleCollect` 可配, 数据**仅存本地、不上传**。

## 8. config 新增键(提醒 tab, CONFIG_VERSION bump)

| 键 | 默认 | 含义 |
|---|---|---|
| `useRiddleAssist` | `true` | 小马题辅助总开关 |
| `riddlePopup` | `true` | 弹窗模式(独立窗答, 绕后台节流) |
| `riddleHotkeys` | `true` | 数字 1-6 / Enter / Esc 快捷键 |
| `riddleAlarm` | `true` | 音频警报 |
| `riddleNotify` | `true` | 桌面通知 GM_notification |
| `riddleChartOverlay` | `true` | PONY CHART 图鉴浮层 |
| `riddleCollect` | `true` | 数据采集(IndexedDB, 铺路 CNN) |
| `riddleUrgentSec` | `8` | 催答提醒触发秒数(倒计时 ≤ 此值加急) |
| `riddleAutoRecognize` | `false` | 自动识别(CNN; 现 stub 无效, 未来接入后生效, 默认关) |

新键纯增量, `{...DEFAULT_CONFIG, ...stored}` 自动补默认; bump version 触发一次落盘。

## 9. 待样本 DOM 清单(实现前置)

务实辅助核心是 DOM 操作, 以下需用户下次遇小马题时抓 `#riddlemaster`(或新版容器)区域 outerHTML 确认:
1. **题目图元素**: `<img src>` / `<canvas>` / 背景图? 是否跨域(决定采集截像素方式 + 是否需 GM_xmlhttpRequest 取图)。
2. **6 个 checkbox**: id/name/与小马名 label 的对应结构。
3. **Submit 按钮**: 选择器。
4. **倒计时 DOM**: 数字"33"在哪个元素、怎么读。
5. **PONY CHART 图鉴链接**: href(能否程序化获取图鉴)。
6. **对错反馈**: 答完后页面/战斗日志怎么显示对/错(采集结果标签用)。

## 10. 风险与边界

| 风险 | 等级 | 缓解 |
|---|---|---|
| 真自动识别难(去色+半透明+重叠+旋转+干扰+难度递增) | 高 | 务实辅助路线不赌即时识别; 真自动留 CNN + 采集铺路, 不过度承诺 |
| 题图跨域 → canvas `toDataURL` 污染报错 | 中 | `GM_xmlhttpRequest` 取图 / `crossOrigin`; 待样本确认图来源域 |
| IndexedDB 容量/清理 | 低 | 容量大; 提供导出+清空; 仅本地 |
| 弹窗被浏览器拦截 | 中 | 移植 dodying 预处理; 配置可关弹窗走主窗口 |
| 新版 DOM 与 reference 旧版不符 | 中 | 一切以新版多选 DOM 为准; 待样本标定选择器 |
| 多选随机兜底失效 | — | 已改为催答提醒, 不乱提交 |
| `useRiddleAssist=false` | — | 整条旁路, 零回归 |

## 11. 文件改动清单

**新增**(`autobattle/src/riddle/`):
| 文件 | 预估 |
|---|---|
| `riddle/types.ts` | ~40 |
| `riddle/detect.ts` | ~90 |
| `riddle/ui.ts` | ~140 |
| `riddle/hotkeys.ts` | ~70 |
| `riddle/submit.ts` | ~90 |
| `riddle/collector.ts` | ~130 |
| `riddle/notify.ts` | ~70 |

**修改**: `core/config.ts`(+9 键+version)、`battle/reader.ts`(riddle 检测适配)、`battle/brain.ts`(riddle 分支+recognize 接口)、`loop.ts`(激活 riddle)、`ui/panel.ts`(提醒 tab riddle 组)、`global.d.ts`(GM_notification/GM_xmlhttpRequest 若缺)。

## 12. 验收

- `npm run typecheck` + `npm run build` + `node --check` 全绿。
- 纯函数(解析/快捷键映射/采集数据结构/Mane6 映射)控制台喂数据验证。
- GF 真机: 小马题出现 → 弹窗/大按钮 UI/数字快捷键/音频+桌面通知/图鉴浮层/倒计时 工作; 人工快答; 样本入 IndexedDB; 导出可用; 催答提醒在倒计时将尽触发。
- `useRiddleAssist=false` 零回归确认。
- 视觉识别(CNN)不在本期; 接口预留可后续接。

## 13. 里程碑

原属 M5 提醒 tab 的"小马答题提醒", 现扩展为完整**辅助 + 采集**子系统(远大于原计划)。作为独立子项目, 在 M3 连刷之后优先做(采集越早开, 攒训练集越早)。
