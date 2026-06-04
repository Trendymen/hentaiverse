# HV 汉化脚本冲突梳理与修复计划

> 日期：2026-06-04
> 覆盖脚本：`hvUtils.js`、`hv_chinese.js`、`equip_chinese_2.js`、`hv_battle_ch.js`
> 方法：10-agent workflow 取证 + 两路对抗审查校正 + chrome-devtools 真实页面实测核实
> 旧版 `equip_chinese.js`（含 `.bak`）已决定废弃，不在本梳理范围。

---

## 0. 一句话结论

四个脚本运行时 **DOM 域基本互斥**（实测装备仓库/换装页高亮正常、无乱码），**同屏覆盖不是主要矛盾**。真正的痛点是：

1. **跨脚本译名不一致**（约 30 组同词不同译）；
2. **字典重复**（跨脚本 4 份 + `hv_chinese` 内部自重复）；
3. **2 处确认的 bug**（`hv_battle_ch` 重复键）。

> 已完成：换装页穿戴装备高亮丢失问题——根因是 `hvUtils.js` 换装页路径用 `textContent` 展平而未注入富文本，已改为复用 `$equip.$i18n.displayNameHtml`（见 §7 P0-done），实测 `#eqsb` 已出现 15 个高亮 span，修复生效。

---

## 1. 职责边界（实测校准版，建议固化）

| 区域 | 归属 | 机制 | 高亮风格 |
|---|---|---|---|
| 装备名（仓库 `ss=in`/换装 `ss=eq`/装备店 `ss=es`/战斗面板/底部彩票/邮件） | **hvUtils** | `.remove()` 原生 `.equiplist` 后重建 + `displayNameHtml` 注入 | 圆角 span（`background+padding:0 3px+border-radius:2px`）|
| 装备名（hvUtils 不接管页：EH 论坛 `.postcolor`、hvmarket、reasoningtheory 拍卖、`/equip/*` 与 `showequip.php` 详情页） | **equip_chinese_2** | 英文正则对 `innerHTML` 整块替换 | 彩色 span（有 `background`、**无** padding/border-radius）|
| 弹窗/对比/属性面板文本（`#popup_box`/`#equipinfo`/`#eqstats`/`#compare_pane`/`#confirm_body`） | **hv_chinese** | MutationObserver + XPath `text.data` 逐节点替换 | 无 span，品质用 `✪☆☯✧` 符号 |
| 战斗日志 | **hv_battle_ch** | `GM_addStyle` 隐藏 `#textlog`、自建 `#translog` 整块正则 | 自带配色 span |
| UI/菜单/导航/底部栏 | **hvUtils** | 硬编码中文 `#hvut-top`/`#hvut-bottom`，`#navbar` 设 `display:none` | — |

**让位关系（均已天然成立，无需新增逻辑）**：hvUtils 接管页 → equip2/hv_chinese 因英文 key 对中文匹配失败而空操作；战斗页 → hv_chinese 检测 `#expholder[title]` return 让位给 hv_battle_ch；论坛/站外 → 域名天然隔离归 equip2。

---

## 2. 实测确认的 DOM 事实（chrome-devtools，2026-06-04）

| # | 事实 | 证据 |
|---|---|---|
| 1 | 换装页 `#eqsb` 穿戴装备高亮修复生效 | hvUtils 运行后 `#eqsb` 有 15 个带 `padding` 的高亮 span：`传奇 灼热之 西洋剑 杀戮`、`无双 翡翠(风抗) 动力 盔甲 物防` |
| 2 | hvUtils 是装备名高亮主力；**缺席时回落 hv_chinese** | 移除 hvUtils 后同一换装页变 `✪传奇✪ 红莲(火) 西洋剑 杀戮`（✪符号、名词式前缀、0 高亮 span、navbar 未隐藏） |
| 3 | hvUtils 异步初始化期间有**首屏回落**：先 hv_chinese 版，hvUtils 跑完才重建成高亮 | 新开装备页 load 完成瞬间 `hvut:false`、装备名为 hv_chinese 版；约 4s 后 hvUtils 接管 |
| 4 | `#popup_box` tooltip 文本归 hv_chinese | 换装页悬停装备，tooltip 装备名为 `✪传奇✪ 红莲(火)`（hv_chinese 风格，非 hvUtils 高亮）|
| 5 | **装备 tooltip 判据 = `#popup_box .eq`** | 装备 tooltip 内容容器为 `<div class="eq es">`，含 `.ex`（属性区）`.ep`（加成区）；可据此区分装备/物品 tooltip |
| 6 | **同物异显实证** | 同一装备：列表 = hvUtils 高亮版 `传奇 灼热之`；悬停 tooltip = hv_chinese 符号版 `✪传奇✪ 红莲(火)` |
| 7 | hvUtils 缺席非报错，纯属未注入/被禁用 | console 无 hvUtils 相关 error（仅浏览器扩展的无关 warn）|
| 8 | `#change-translate` 实测仅 1 个 | 未出现多脚本同 id 叠加；按钮复用机制生效 |

> **已验证**：物品 tooltip（如「体力长效药」）的 `#popup_box` 是纯 `<div>` 结构、**不含 `.eq`**（`持续50回合…/消耗品`）；装备 tooltip 则有 `<div class="eq es">`。故 **`#popup_box .eq` 是可靠的装备/物品 tooltip 判据**（审查关于"无法区分"的疑虑已排除）。物品 tooltip 文本由 hv_chinese 翻译。

---

## 2.1 hvUtils 开/关 DOM 拓扑对比（chrome-devtools 双态实测 2026-06-04）

> 在 hvUtils 启用 vs 禁用两态下逐页实测（ss=in / ss=eq / ss=es / ss=up / ss=lt），确认其他脚本选择器受 hvUtils 影响的真实情况。

### 装备名渲染归属（按页 × hvUtils 开关）

| 页面 | hvUtils 开 | hvUtils 关 |
|---|---|---|
| 仓库 ss=in / 换装 ss=eq / 装备店 ss=es | **hvUtils 高亮**（重建 + padding span，如 `传奇 灼热之`） | **hv_chinese 无高亮**（`✪☆☯` 符号、`红莲(火)` 名词式前缀） |
| 锻造 ss=up / 彩票 ss=lt | **hv_chinese 无高亮**（hvUtils 不渲染这些页装备名） | **hv_chinese 无高亮**（不变） |

→ 结论：hvUtils 只在 **in/eq/es** 接管装备名高亮；**Forge/彩票等页开关态都由 hv_chinese 翻、始终无高亮**（文档 §3 早前"Forge equip2 先则有高亮"的乐观说法，实测为 hv_chinese 无高亮）。

### 关键选择器开/关对比

| 选择器 | hvUtils 开 | hvUtils 关 | 说明 |
|---|---|---|---|
| `#navbar` | `display:none` | `display:block` | hvUtils 隐藏并以 `#hvut-top` 替代 |
| `#hvut-top`/`#hvut-bottom` | 存在 | 不存在 | hvUtils 专属新建 |
| `.equiplist`(ss=in) | 7 个，带 `data-eid` | 2 个原生，无 eid | hvUtils `.remove()` 后重建 |
| `equips.set` 节点(ss=in) | 151（聚合所有分类） | 65（仅当前分类） | hvUtils 异步拉全 |
| `equips.set` 节点(ss=es) | 486 | — | hvUtils 拉全装备店 |
| `#eqsh`(ss=eq 装备搜索框) | `display:none` | `display:block` | **hvUtils 隐藏**（实测确认） |
| `#eqshop_sellall`(ss=es) | `display:none` | （原生显示） | hvUtils 隐藏 |
| `#eqch_left`/`#eqch_stats`(ss=eq) | 在 hvUtils 容器内 | 原生 | hvUtils 接管换装左栏 |
| `#networth` | ss=in/eq/up/lt = 0；es = 1 | 同（与开关无关） | 见下纠正 1 |

### ⚠️ 实测纠正 4 处静态推断误判

1. **`#networth` 在 ss=in/ss=eq 开关态都为 0** → 这两页**本就没有** `#networth`；之前"hvUtils 移除 #networth"对它们是误判。hvUtils 的 `remove()` 只对**确实含该元素的页**生效（ss=es 实测保留 = 1）。
2. **`#equiplist`(id) 开关态都 `display:none`** → **原生就隐藏**，非 hvUtils 所为。
3. **`#equipselect_left` 在 ss=eq 开关态都为 0** → HV 本身无此 id，**hv_chinese dictsMap 的这条选择器是失效/过时配置**（与 hvUtils 无关，翻译永远命不中）。建议清理或修正该选择器。
4. **`.eqb`/`#eqsb` 是 HV 原生节点**（关态也在、无 eid），不是 hvUtils 专属；hvUtils 在其内部注入富文本，开态因外层套了 hvUtils 容器才显 `hvut:true`。

### 实测附带发现
- 导航 ss=in 时 hvUtils 会弹 `alert("请选择装备的主分类。")` 阻塞页面（关闭 hvUtils 后不再弹 → 确认是 hvUtils 行为，疑为整合模式某分支触发，值得排查）。
- hvUtils（504KB）异步初始化期间有**首屏回落**：页面 load 完成瞬间装备名是 hv_chinese 版，约 3–4s 后 hvUtils 重建为高亮版（短暂闪烁）。
- `#popup_box` tooltip 文本始终归 hv_chinese（开关态一致），hvUtils 仅给它加 class（`hvut-eq-popupbox`）。

---

## 3. 问题① 文案矛盾（约 30 组）

> 基准原则：默认以 **hv_chinese** 为文案基准；装备名相关以主渲染层（hvUtils/equip2）为准。下表已并入本次用户决策。

### 3.1 已定决策

| 词 | 决策 | 落点 |
|---|---|---|
| **Katana** | **太刀** | 改 hv_chinese / hv_battle_ch（主渲染层 hvUtils/equip2 已是太刀，不动）|
| **Elixir（Mana/Health/Spirit Elixir）** | **终极X药** | 仅改 hv_battle_ch 行 80/83/86（`X力秘药`→`终极X药`）。⚠️ 审查异见：`X力秘药` 层级更清晰（与 `Last Elixir=终极秘药` 不撞前缀），但需改三家含主渲染层；权衡改动面后选「终极X药」|
| **品质符号** | 仅 **高四级**（Exquisite/Magnificent/Legendary/Peerless）统一带 `✧☆✪☯` | hvUtils quality 表给高四级加符号（底色已有）。⚠️ 低六级（Flimsy~Fine）三家本就无符号、已一致，**不要全加** |

### 3.2 其余矛盾（按类别，建议向多数派/基准统一）

| 类别 | 词 → 分歧 | 建议 | 改谁 |
|---|---|---|---|
| 品质 | Crude：hv_chinese 劣等 / 其余 劣质 | 劣质 | hv_chinese 行1910 |
| 品质 | Fine：hv_chinese 优秀 / 其余 优质 | 优质 | hv_chinese 行1914（`/^Fine /`，保留尾空格）|
| 品质 | Flimsy：hv_battle_ch 脆弱 / 其余 薄弱 | 薄弱 | hv_battle_ch 行584 |
| 武器 | Mace：hvUtils/equip2 重槌 / hv_chinese 重锤 / hv_battle_ch 锤矛 | 重槌（避免与 Great Mace=重锤 撞名）| hv_chinese、hv_battle_ch 行457 |
| 武器 | Buckler：hv_chinese 小圆盾 / 其余 圆盾 | 圆盾 | hv_chinese 行1944 |
| 护甲 | Leggings：hv_battle_ch 绑腿 / 其余 护腿 | 护腿 | hv_battle_ch 行474 |
| 护甲 | Boots：hv_battle_ch 马靴 / 其余 靴子 | 靴子 | hv_battle_ch 行479 |
| 护甲 | Cap：hv_chinese 帽 / 其余 兜帽 | 兜帽（⚠️ key 是 `'Cap '` 带尾空格、且与材质拼接「棉质 帽」，改前确认拼接语序）| hv_chinese 行1971 |
| 材质 | Cotton：hv_chinese 棉制 / 其余 棉质 | 棉质 | hv_chinese |
| 材质 | Redwood：hv_chinese 红杉木 / 其余 红木 | 红木 | hv_chinese |
| 材质 | Frugal：hv_chinese 节约的 / 其余 节能 | 节能 | hv_chinese |
| 元素前缀 | Fiery/Arctic/Shocking/Hallowed/Demonic：hv_chinese「红莲(火)/北极(冰)/雷鸣(雷)/圣光(圣)/魔性(暗)」名词式 / 其余「灼热之/极寒之/闪电之/神圣之/恶魔之」动词式 | 动词式 | hv_chinese 行1990-1995 整段 |
| 元素前缀 | Tempestuous/Ethereal：hv_chinese「风暴(风)/虚空」/ 其余「风暴之/虚空之」 | 补「之」 | hv_chinese |
| 后缀 | Swiftness：hvUtils/equip2 加速 / hv_chinese/hv_battle_ch 迅捷 | 加速（避免与 the Fleet=迅捷 撞名）| hv_chinese（**3 处**行2033/2090/2965）、hv_battle_ch |
| 后缀 | Shadowdancer：hv_battle_ch 影武者 / 其余 影舞者 | 影舞者 | hv_battle_ch 行517 |
| 后缀 | Arcanist/Banshee/Illithid/Curse-weaver/Nimble/Barrier/Protection/Warding：hv_battle_ch 用旧异名（秘法/女妖/汲灵/织咒者/灵活/屏障/保护/护佑）| 三家主名（奥术师/报丧女妖/灵吸怪/咒术师/招架/格挡/物防/魔防）| hv_battle_ch（保留功能角标如「(攻速+)」只改名词）|
| 后缀 | Spirit-ward：hv_chinese 幽冥结界 / 其余 灵魂护佑 | 灵魂护佑 | hv_chinese（**2 处** equipsName 行2078 + equipsSuffix 行2135）|
| 后缀 | Fire-eater：hv_chinese 吞火者 / 其余 噬火者 | 噬火者 | hv_chinese |
| 技能 | Fiery Blast：hv_chinese 灼热冲击 / hv_battle_ch 炎爆术 | 灼热冲击 | hv_battle_ch 行138 |
| 技能 | Shatter/Vital Strike/Heartseeker/Arcane Focus：hv_battle_ch（粉碎/致命/觅心者/奥术集中）vs hv_chinese（破碎/要害强击/穿心/奥术集成）| 向 hv_chinese 基准 | hv_battle_ch（注：Heartseeker 是 BUFF 状态，不在技能字典）|
| 状态 | Hastened：hv_chinese 疾速 / hv_battle_ch 急速（且 Haste 两家都急速）| 急速 | hv_chinese（**2 处**行934/3502）|
| 材料 | Scrap Metal/Wood、Energy Cell：hvUtils 废金属/废木料/能量电池 / 其余 金属废料/木材废料/能量元 | 多数派 | hvUtils 行1291（⚠️ 只改 items 表中文 value，不动作为逻辑 key 的英文 `'Energy Cell'`，如行6132 `const cell`）；**另注** hv_chinese 文案行1768/2421/2560 也残留「能量电池」需一并改 |
| 其他 | Monster Chow：hvUtils 怪物饲料 / hv_battle_ch 怪物口粮 | 二选一统一 | — |
| 待定 | **Wind-waker**：hv_chinese 驭风者（语义准）/ 其余三家 风之杖（疑误译）| **未决**：取「驭风者」需改三家含主渲染层；取「风之杖」只改 hv_chinese 一处 | 待用户拍板 |
| 待核实 | Refreshment/Regeneration/Replenishment：hv_chinese 译效果名（提神/再生/补给）/ hv_battle_ch 译道具名（灵力/生命/魔力长效药）| 语义层级不同，需核实游戏实际指代 | 待核实 |
| 自冲突 | hv_chinese 内部 Overwhelming Strikes：行551 压制打击 / 行3434 压倒性的攻击 | 压制打击 | hv_chinese（两处统一）|

---

## 4. 问题② 重复翻译

| # | 重复 | 说明/风险 |
|---|---|---|
| 1 | 品质/后缀/物品在 **4 份字典各写一遍** | 改一处漏三处；Flimsy/Crude 已分叉 |
| 2 | hv_chinese 内部自重复（改 P1 时**最易漏**）| `items` vs `battling` 整套消耗品；`equipsName` vs `equipsSuffix` 后缀两份（精确 key vs `/xxx$/` 正则）；**Swiftness 3 处**（2033/2090/2965）、**Hastened 2 处**（934/3502）、**Overwhelming Strikes 2 处**（551/3434）—— 改任一词必须全部同步 |
| 3 | hv_battle_ch `items_words` 整段是从 equip2 复制后漂移 | Mace/Leggings/Boots/Shadowdancer 等已偏离 |
| 4 | Binding 粘合剂 **38 条 × 3 份**（hvUtils/hv_chinese/equip2）| 译法已统一、纯文本无样式分歧——最适合抽 SSOT（见 §7 P2）|
| 5 | hvUtils 漏词 | items 表缺 Crystal of Quintessence（灵魂水晶）；解析正则缺旧材质（见 §6 真问题）|

---

## 5. 问题③ DOM 节点覆盖（基本无害，仅少数真问题）

| 区域 | 结论 |
|---|---|
| 装备仓库/换装/装备店 | hvUtils `.remove()` 重建完胜，equip2/hv_chinese 空操作 → **无乱码**（实测确认）|
| Alt+A 还原在 hvUtils 接管页"失灵" | **无害空操作**（equip2 把 hvUtils 中文当原文存入 translatedList，还原中↔中互换）。审查结论：**不要修**（修反而牺牲 equip2 对回退英文段的补充）|
| `#popup_box`/`#equipinfo`/`#eqstats`/`#compare_pane`/`#confirm_body` | hvUtils 只调 class/定位不写文本，hv_chinese observer 独占翻译，职责不重叠 |
| `#navbar` | hvUtils `display:none` 隐藏 + 自建 `#hvut-top`；hv_chinese 仍翻隐藏的 navbar = 无害浪费（卸载 hvUtils 时形成隐式降级）|
| `#change-translate` | 多脚本同 id 复用 click listener，点一次各管各的 translatedList，互不破坏；按钮文案可能不同步（最后触发者覆盖）|
| **真问题**：旧材质 Ironsilk/Drakehide/Reactive | 不在 hvUtils 解析正则的材质段 → 这些旧装备在 hvUtils 接管页 **整名回退英文**（非漏一段），回退的英文还会被 equip2 二次注入无 padding span → 风格混排 |
| **真问题**：锁子甲部位 Coif/Hauberk/Mitons/Chausses | 缺在 hvUtils **slot 表**（行1280，非 type 表）→ 该段回退英文 |

---

## 6. 确认的 Bug（无争议，可直接修）

1. **hv_battle_ch:370** `'Crystal of Corruption':'腐化水晶'` 覆盖了行368 的 `'暗黑水晶'`（同对象后键覆盖）→ 实际显示「腐化水晶」与其余三家冲突。**删行370**，保留行368。
2. **hv_battle_ch** `Heartseeker`（行42/176）、`Arcane Focus`（行43/175）重复定义（值相同，无害冗余）→ 各删一处。

---

## 7. 修复计划

### P0-done（已完成并实测验证）
- **换装页穿戴装备高亮**：`hvUtils.js` 换装页 forEach 由 `eq.node.div.textContent = eq.node.div.textContent` 改为 `if (translateNames) eq.node.div.innerHTML = $equip.$i18n.displayNameHtml(eq)`。实测 `#eqsb` 15 个高亮 span 生效。

### P0（无争议，低风险）
- 删 hv_battle_ch 行370（Crystal of Corruption bug）、行176/175（Heartseeker/Arcane Focus 冗余）。

### P1（译名对齐 —— 注意以下执行约束）
- 按 §3.1 决策 + §3.2 表逐条改字典 **value**。
- ⚠️ **hv_chinese 自重复词必须全部改全**：Swiftness ×3、Hastened ×2、Overwhelming Strikes ×2、Spirit-ward ×2（equipsName+equipsSuffix）。漏改任一 → 同物两译（列表 vs 详情页），比统一前更糟。
- ⚠️ **保留 key 尾随空格**：`'Cap '`、`'中等 '`(Average)、`/^Fine /` 等改 value 时保留空格，否则破坏词间分隔。
- ⚠️ **品质符号只给高四级**（见 §3.1）。
- ⚠️ **hv_battle_ch 后缀带功能角标**（如「迅捷(攻速+)」）只改括号前名词，不整条替换（正则 value，不能简单 sed）。
- ⚠️ **材料名只改 items 表中文 value**，绝不动作为逻辑 key/filter 的英文标识符（`'Energy Cell'`/`'Scrap Metal'` 等）；并补改 hv_chinese 残留的「能量电池」文案。
- 补 hvUtils 漏词：items 表补 Crystal of Quintessence；**解析正则补旧材质** Ironsilk/Drakehide/Reactive（否则整名回退英文）；slot 表补 Coif/Hauberk/Mitons/Chausses。

### P2（暂缓，需充分回归 + 用户决策）
- 消除 hv_chinese 内部自重复：⚠️ `equipsName`/`equipsSuffix` **不能为去重而删一套 key**（服务整名匹配 vs 独立信息页分行尾词匹配两种场景，且不同容器在 dictsMap 绑定不同字典组合）——只能两套并存、同步 value。
- 抽译名 SSOT 共享词表（优先 Binding 38 条）：⚠️ 经 `unsafeWindow` 跨油猴脚本共享有 **加载顺序竞态**（消费方可能在 hvUtils 挂载前执行 → 首屏英文闪烁），必须先解决"词表就绪前不翻译"的同步握手再做。

---

## 8. 待决/待补测清单

- [ ] **Wind-waker** 译名方向（驭风者 改三家 / 风之杖 改一处）——待用户拍板。
- [ ] **Refreshment/Regeneration/Replenishment** 是效果名还是道具名——需核实游戏实际指代。
- [x] **物品 tooltip 判据**：已验证物品 tooltip 不含 `.eq`，`#popup_box .eq` 可靠区分装备/物品（2026-06-04 实测）。
- [ ] hvUtils 旧材质装备是否真整名回退英文——需有对应旧装备的页面实测。
- [ ] 是否投入 P2 SSOT 架构重构。
