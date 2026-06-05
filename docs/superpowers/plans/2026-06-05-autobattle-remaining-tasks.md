# autobattle 剩余工作清单(M2 收尾 / M3 / M4 / M5)

- 日期:2026-06-05
- 性质:审计结论 + 决策记录 + 待办清单(非 bite-sized TDD 计划;部分项阻塞于实测样本,待解阻后再细化为可执行步骤)
- 关联文档:
  - 设计:`docs/superpowers/specs/2026-06-04-autobattle-ui-rework-design.md`(§5 目录 / §7 四 tab / §8 里程碑 / §9 验收 / §10 开放细节)
  - M1 计划:`docs/superpowers/plans/2026-06-04-autobattle-m1-foundation.md`
  - 冲突审计:`docs/i18n-scripts-conflict-audit.md`

> ⚠️ 仓库现由**两个会话并发**:autobattle(本文件)与 i18n 汉化各自推进,常驻分支 `docs/i18n-conflict-audit`。提交时只暂存各自子树,勿互相覆盖。

---

## 0. 里程碑总进度

| 里程碑 | 状态 | 说明 |
|---|---|---|
| M1 地基 | ✅ 完成 | 工程/构建(不压缩)/core/UI 骨架/document-start hook |
| M2 战斗内 | 🟡 基本完成 | reader/brain/executor/tables + 战斗循环 + HUD 真实数据 + 战斗 tab 配置面板 + 小马炮逻辑修复(commit `a6a8472`);**剩 §2 收尾项** |
| M3 连刷 | 🟠 仅 GF 波次内续战 | `engine/` 未建;遭遇/竞技场/精力/连刷 tab 全缺(见 §3) |
| M4 保护后勤 | ❌ 未开始 | `engine/{stamina,watchdog,supply,stats}.ts` 全缺(见 §4) |
| M5 杂项打磨 | ❌ 未开始 | 告警/通知/异世界/小马提醒 + 提醒 tab + UI 精修(见 §5) |

---

## 1. 本会话决策记录(实施时直接照此办,不再重议)

| # | 议题 | 决策 | 依据 |
|---|---|---|---|
| D1 | 小马炮逻辑 | ✅ commit `a6a8472`(cannonReady=未置灰才可放、攒炮架式让路、`oc≥200`、置灰不放不盖冷却、`OC_ON 0.4→0.5`、`cannonCdMs→1500`)+ ✅ commit `71beb11` 后续修:炮提到架式之前(P11.5)防"OC 到 200 被架式抢→来回开关";攒炮判据改用 `cannonReady`(冷却好)而非"在技能栏"(冷却期不空压架式) | HV wiki + Special Skills 表(炮 200/50)+ 实测炮按钮 DOM |
| D5 | **OC 读数 bug(炮不放/架式乱抖的总根因)** | ✅ commit `71beb11`:reader 把 OC 从"量条宽 `bar/vcp×250`"(抄旧 B大脑,满 OC 也只算出 ~119 → `oc≥200` 永不成立 → 炮永不放、攒炮永真压架式)改为 **dodying 数点法** `(#vcp>div>div 数 − #vcp>div>div#vcr 数)×25` | dodying `hvAutoAttack.user.js:2666`;实测满 OC: 数点法=250、旧法=119 |
| D2 | HUD 加"角色等级" | ❌ **不加**,保持现状(HP/MP/SP/OC + 战斗类型/轮数/回合/怪数/动作) | 原版 dodying/B大脑 HUD 均无玩家等级;玩家级战斗页 DOM 读不到(代价高) |
| D3 | P5 Absorb 法系怪判定 | **战斗日志魔法伤害启发式**(原版无此逻辑,需新写) | 见 §2.1 |
| D4 | XHR battle 响应解析 | **需一份真实样本**才能定字段结构;授权我在你战斗中读一次 `window.__hvab.getLastBattle()` | 见 §2.2;reference 也只抓不解析 |

---

## 2. M2 收尾(本会话选定优先;小马炮已完成)

### 2.1 P5 Absorb 法系怪判定 —— 战斗日志魔法伤害启发式 〔未开始〕

- **现状**:`brain.ts` P5 处 `isMagic` 硬编码 `false`,Absorb 永不触发。所有 reference(B大脑/盾脑/decideAction)都**没有**识别"怪是法系攻击者"的代码——这是新写功能,非翻写。
- **要做**:
  1. `reader.ts`:解析战斗日志 `#textlog`,提取**最近一回合敌方对我造成的伤害类型**。物理系=pierce/crush/slash;魔法系=fire/cold/wind/elec/holy/dark/soul 等。复用 dodying 伤害类型解析思路(`reference/hvAutoAttack.user.js:4266-4287` 的 `pierc|crush|slash` 物理判定 + 元素词)。
  2. 在 `BattleState` 加瞬态字段(如 `tookMagicDmg: boolean` 或 `lastEnemyDmgType`)。
  3. `brain.ts` P5:`isMagic = S.tookMagicDmg`(或近 N 回合内吃过魔法伤害),据此放 Absorb;加 `useAbsorb` 配置开关(默认可关,盾战物防为主)。
- **依据**:设计 §9 验收"16 级联 + 4 加固";`brain.ts` 现有 TODO 注释。
- **阻塞**:无(不需碰 HV 页;日志格式可从 reference 伤害解析器推定,上线后 GF 实测微调)。

### 2.2 XHR battle 响应解析激活 —— 需真实样本 〔未开始/阻塞〕

- **现状**:`main.ts` document-start 已捕获 `lastBattleResponse`,但 `reader.ts` 全程走 DOM(`_expire` 注释仍写"待 GF 实测核对回合数读法")。设计 §1/§6 的核心卖点(精确 buff 剩余回合 / 精确鬥气)**未激活**。reference 旧 B大脑(`hv_brain_modern:90`)同样只抓不解析。
- **要做**:拿到真实 battle 响应 JSON 后,在 reader 用响应字段替换/校正 DOM 读法(buff turns、overcharge、怪物状态)。
- **依据**:设计 §6 数据流、§10 开放细节("XHR 旁路解析出的 battle 响应字段结构 → M2 在 GrindFest 实测核对")。
- **阻塞**:**必须先有一份真实样本**(战斗中 `window.__hvab.getLastBattle()` 输出)。用户授权可读一次,但需用户正处于战斗中。在此之前不能写解析(否则瞎猜字段=违反"绝不臆造")。
- **额外坑(实测)**:`__hvab.getLastBattle` 挂在油猴**沙箱 window**,页面世界(含 chrome-devtools)读不到 → 读样本前需把 `main.ts` 的 `window.__hvab` 改挂 `unsafeWindow.__hvab`。

### 2.3 其它代码级遗留 〔低优先〕

- `loop.ts:3`:回合触发机制 300ms 轮询 → 可升级 `MutationObserver` 精确监听(设计 §10)。〔优化,非阻塞〕
- `reader.ts:_expire`:buff 剩余回合 DOM 读法待 GF 实测核对(与 2.2 一并解决更佳)。
- `typecheck`:✅ 现已通过(依赖已 `npm install`,`tsc --noEmit` exit 0)——原审计的 TS2688 已解除。

### 2.4 特殊近战技巧纳入决策(盾击 / 要害强击 / 最后的慈悲)〔待完成〕

- **现状**:brain 进攻只有平砍 + 小马炮,**不用**这三个吃 OC 的特殊近战技巧(实测 `pane_skill`/`pane_quickbar` 已解锁):

  | 技巧 | DBID | OC 消耗 | 冷却 | 效果 |
  |---|---|---|---|---|
  | 盾击 Shield Bash | 2201 | 25(1点) | 10 | 单体 + 晕眩 |
  | 要害强击 Vital Strike | 2202 | 50(2点) | 10 | 单体高伤 |
  | 最后的慈悲 Merciful Blow | 2203 | 100(4点) | 10 | 残血处决/补刀 |
  | (小马炮 OFC) | 1111 | 200(8点) | 50 | 已接入 P11.5 |

  实测 `onmouseover` 参数格式 = `[MP, OC点数, 冷却回合]`,每点 OC = 25。
- **要做**(待用户定规则后):tables 加 `SK_SPECIAL`(2201/2202/2203);brain 在合适优先级插入(如残血红怪→慈悲、单体高价值→要害);各自加开关。
- **核心设计张力**:它们都吃 OC,**会和攒小马炮抢 OC**。需先决定"攒炮模式下这些要不要也让路,还是允许用便宜的(盾击25/要害50)穿插"。**待用户定规则**(`AskUserQuestion` 已问,用户选"先标待完成")。
- **阻塞**:无技术阻塞;等产品规则(OC 预算分配)。

---

## 3. M3 连刷 〔仅 GF 波次内续战已做,场间连刷整体缺失〕

- **已做**:清完怪自动续下一波(`brain.ts` canContinue + `executor.continueBattle()` + `reader` canContinue),实现 GF **波次内**推进。
- **要做(`engine/` 目录尚未建立)**:
  1. `engine/starter.ts`:
     - 自动**遭遇战**开启(战斗结束后按配置开下一场)
     - 闲置**竞技场**:等级勾选(1~500 / RB / GF)
     - **GF 场间**连刷
  2. `engine/stamina.ts`:精力阈值 / 战前恢复精力
  3. `panel.ts` **连刷 tab** 控件:遭遇战开关 / 竞技场等级勾选 / GF 开关 / 精力阈值 / 战前恢复(现为占位"待 M3 接入")
  4. `config.ts`:连刷 + 精力相关配置键
- **依据**:设计 §5(engine/starter、stamina)、§7 连刷 tab、§8 M3、§6 数据流。
- **阻塞**:遭遇/竞技场**开战 API 参数**为 §10 开放细节,需对照 `reference/hvAutoAttack.user.js`(dodying 原版含竞技场/遭遇逻辑)忠实翻写 + GF/竞技场实测核对。**实施前需先做一轮 reference 翻写研究**,把硬事实(endpoint/参数/选择器)落实后再写 bite-sized 步骤。

---

## 4. M4 保护后勤 〔未开始〕

- `engine/stamina.ts`:精力损失保护(暂停 / 警告 / 逃跑)
- `engine/watchdog.ts`:页面无响应(刷新 / 切服 / 防卡死)
- `engine/supply.ts`:装备修复(耐久阈值)/ 库存检查
- `engine/stats.ts`:掉落 + 消耗统计
- `panel.ts` **保护 tab** 控件(现占位"待 M4 接入")
- **依据**:设计 §5 engine/、§7 保护 tab、§8 M4。dodying 原版含精力/无响应/修复逻辑,可翻写。

---

## 5. M5 杂项打磨 〔未开始〕

- 音频警报 / 桌面通知(`GM_notification`)
- 异世界自动切换
- 小马答题弹窗提醒(**红线:仅提醒人工,绝不自动随机提交**;`brain.ts:riddle()` 现 `return null` 留人工)
- `panel.ts` **提醒 tab** 控件(现占位"待 M5 接入")+ UI 精修
- **依据**:设计 §2 红线、§7 提醒 tab、§8 M5。

---

## 6. 关联 backlog(非 autobattle,由 i18n 会话负责,仅备忘)

> 详见原审计;此处只留指针,**不在 autobattle 会话范围内推进**。

- **hvUtils.js 汉化阶段二尾巴**:3 处残留显示文本未译(`1029` Random Encounter Expired/Ready、`6617` Shrine "inventory is full"、`6752` Shrine "Show All Items/Show Only Filtered");任务3 用户审核 checkpoint、任务13 全局收尾验证无完成痕迹。
- **冲突审计 `docs/i18n-scripts-conflict-audit.md`**:P1 漏词(`Crystal of Quintessence`、旧材质 `Ironsilk/Drakehide/Reactive`、旧部位 `Coif/Hauberk/Mitons/Chausses` 的 `$i18n.slot` 映射);P2 SSOT 共享词表未启动;`Refreshment/Regeneration/Replenishment` 效果名 vs 道具名待核实。

---

## 7. 验收与红线(全程不可逾越)

- 每个里程碑:`tsc --noEmit` 无错、`npm run build` 产出单 `dist/hv-autobattle.user.js`(**不压缩可调试**)、`node --check` 通过、可在 Tampermonkey 加载。
- 战斗内决策对齐 B大脑(16 级联 + 4 加固);连刷/保护对齐 dodying(以 `reference/` 逐项核对)。
- **红线**:无无人值守全自动 bot;无检测规避;小马题不自动随机提交;偏半自动辅助(L398 封号代价极高)。

---

## 8. 建议实施顺序

1. **§2.1 Absorb 启发式**(不碰 HV,可立即做)
2. **§2.2 XHR 解析**(等用户进战斗,读一次样本后做;顺带解决 §2.3 buff 回合读法)
3. **§2.3优化和2.4 特殊近战技巧纳入决策**
4. **§3 M3 连刷**(先 reference 翻写研究落实开战 API,再分 starter / stamina / 连刷 tab 三批)
5. M4 → M5
