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
| M2 战斗内 | 🟢 收尾接近完成 | reader/brain/executor/tables + 循环 + HUD + 战斗 tab 面板 + 小马炮 + **目标权重 finWeight(§2.5)** + **OC 近战技连招/跨波攒炮(§2.4/2.6)** + Absorb(§2.1) + UI 滚动/固定高度;**唯一剩:3 个 OC 技 castHostileOn 真机实测(§2.7)** |
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
| D6 | OC 经济策略(用户定) | 慈悲/要害限红名连招(盾击晕→要害流血→慈悲处决,锁同红怪)+ 盾击对杂兵减伤 + 跨波攒炮(有红名也攒,血线下降才放弃)+ 去抖(连续 2 次 hp<50%)+ 穿心单 boss 也放 + 祝福只增伤(撤 Regen 误跳) | 见 §2.6;武器暂无流血→慈悲依赖要害产流血,晕眩靠盾战反击概率 |

---

## 2. M2 收尾(本会话选定优先;小马炮已完成)

### 2.1 P5 Absorb 法系怪判定 —— 战斗日志魔法伤害启发式 ✅ 完成(commit `08433d6`)

- **现状**:`brain.ts` P5 处 `isMagic` 硬编码 `false`,Absorb 永不触发。所有 reference(B大脑/盾脑/decideAction)都**没有**识别"怪是法系攻击者"的代码——这是新写功能,非翻写。
- **要做**:
  1. `reader.ts`:解析战斗日志 `#textlog`,提取**最近一回合敌方对我造成的伤害类型**。物理系=pierce/crush/slash;魔法系=fire/cold/wind/elec/holy/dark/soul 等。复用 dodying 伤害类型解析思路(`reference/hvAutoAttack.user.js:4266-4287` 的 `pierc|crush|slash` 物理判定 + 元素词)。
  2. 在 `BattleState` 加瞬态字段(如 `tookMagicDmg: boolean` 或 `lastEnemyDmgType`)。
  3. `brain.ts` P5:`isMagic = S.tookMagicDmg`(或近 N 回合内吃过魔法伤害),据此放 Absorb;加 `useAbsorb` 配置开关(默认可关,盾战物防为主)。
- **依据**:设计 §9 验收"16 级联 + 4 加固";`brain.ts` 现有 TODO 注释。
- **阻塞**:无(不需碰 HV 页;日志格式可从 reference 伤害解析器推定,上线后 GF 实测微调)。

### 2.2 XHR battle 响应解析 —— ❌ 评估后不做(GF 实测样本确认无价值)

- **结论(2026-06-05 GF 实测样本)**:抓到真实 `/json` 响应(commit `5c1f449` 修过滤 `/Battle|api/`→加 `/json`;endpoint 实测 = `POST hentaiverse.org/json`,reqBody `{type:'battle',method:'action',mode,target,skill}`)。响应是 JSON{`pane_effects`/`pane_quickbar`/`pane_vitals`/`pane_monster`/`table_*` 全是 **HTML 字符串**,`textlog` 数组,`exp`/`healthflash`}。
- **它就是 HV 渲染 DOM 的 HTML 源** → 解析这些 = 解析 HTML 字符串,**还不如直接读已渲染的 DOM**(现状)。**无任何"比 DOM 更精确的结构化数值"**:HP/MP/SP 在 pane_vitals 有数值文本(DOM 也有);**OC 连数值都没有**(只 `#vcp` width+数点,同 DOM;width=点数×19px 与数点法同源,精度收益不值标定);怪 HP 在 pane_monster 血条 width(同 DOM)。
- **白捡的真修复**:① buff 剩余回合读法 → `_expire` 已修(§2.3);② endpoint 过滤已修(脚本现能捕获 `/json` 到 `__hvab.getLastBattle()`,留作将来调试 / 掉落统计 `exp` 字段用)。
- **textlog 数组**(分条有序)比 DOM `#textlog` 略好(免顶底顺序坑),但现 DOM 读法(已 reverse 处理)够用,不值得切。

### 2.3 其它代码级遗留 〔低优先〕

- `loop.ts:3`:回合触发机制 300ms 轮询 → 可升级 `MutationObserver` 精确监听(设计 §10)。〔优化,非阻塞〕
- ✅ `reader.ts:_expire`:已修(commit `d3471ee`)— buff 剩余回合改读 onmouseover `set_infopane_effect('名','描述',第三参数)`:数字=回合 / `'autocast'`=游戏自动维持。XHR `/json` 样本确认(pane_effects),原读 `[id*=expire]` 读不到才兜底 99。脚本补的 buff(Regen/穿心/吸收/陷危)现可提前补。
- `typecheck`:✅ 现已通过(依赖已 `npm install`,`tsc --noEmit` exit 0)——原审计的 TS2688 已解除。

### 2.4 特殊近战技巧纳入决策(盾击 / 要害强击 / 最后的慈悲)✅ 完成(OC 经济策略见 §2.6)

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
- **✅ 完成**:三技已接入决策 + OC 预算规则已定(见 §2.6);三技默认关,**待 castHostileOn 真机实测**释放机制后开启(§2.7)。

### 2.5 目标权重系统(finWeight)✅ 完成

- **做了什么**:翻写 dodying finWeight 目标权重(血量绝对 hpNow + 13 状态 + Yggdrasil boss),取代原"平砍最低 eid"。方案 C 分层:`reader` 出原始数据 / `target-weight.ts` 纯函数算权重排序 / `brain` P16 接入。
- **关联**:设计 `specs/2026-06-05-autobattle-target-weight-design.md`;计划 `plans/2026-06-05-autobattle-target-weight.md`。
- **commits**:types `e8df42d` / tables STATUS_LIB `4e6fe05` / target-weight `a849766` / reader(修血条 index bug + Spawned 初始 HP + hpNow/name/13状态) `e55106d` / brain `0f06e44` / config `dc76281` / review 修复(hpMin 防 NaN + _spawnHp 覆盖顺序) `8c1e923`。
- **白捡 bug**:GF 实测扒出现有血条 `hpPct` 错位(全局 `bloodImgs[idx]` 每怪含 2 img),改 per-mkey **无条件修复**(慈悲判据 hpPct 也一起救)。
- **配置**:`useTargetWeight` 默认关灰度 + `baseHpRatio`;13 状态权重内置(reference 实测默认值)。
- **GF 真机实测确认**:Spawned 行格式 `Spawned Monster A: MID=N (Name) LV=N HP=N`(非旧版 Initializing);字母 A→mkey_1 对齐;13 状态 onmouseover 官方名英文不受汉化;待项见 §2.7。

### 2.6 OC 经济策略细化 ✅ 完成

按用户定的 OC 预算规则(D6)接入,三技默认关:
- **慈悲(100 OC)**:仅红名怪 25%+流血 处决(贵,杂兵平砍即秒不值)。
- **红名处决连招**(锁同一红怪串联,优先于杂兵):盾击晕 → 要害收割+5 道流血 → 慈悲 25% 处决。武器暂无流血 → 流血只能靠要害,故**慈悲必须配要害开**;晕眩靠盾战反击概率(红名常自带晕)。
- **杂兵减压**(红名在场 或 力不从心):要害秒已晕杂兵降围殴 + 盾击晕杂兵减伤。
- **跨波攒炮 `saveOcForCannon`**:炮在栏不冷却 + 血线健康 + (本波怪≥4 OR 高密度波)→ 攒 OC 不花单体技;**有红名也攒**(炮 AOE 削红名+清杂兵);高密度波剩 2-3 杂兵也攒(平砍清,OC 留下波炮)。
- **放弃攒炮**:血线下降去抖(连续 `STRUGGLE_STREAK=2` 次 `hp<STRUGGLE_HP=50%`,防瞬掉误判)/ 低密度波 / 炮冷却 → 转单体技减压。
- **穿心单 boss 也放**(commit `56e87b4`):P14 + Channeling 队列加 `||红名`,单 boss 持久战最该提暴(原 `HS_MIN_ENEMIES=2` 会漏)。
- **祝福 Regen 误判修复**(commit `727158e`):御谜士祝福只增伤(+10/20%)+ 答题瞬间一次性回复,**不持续回血** → 撤销原"祝福期跳过 Regen"(会漏血)。
- **commits**:慈悲限红名 `865252d` / 攒炮+减压 `e42021d` / 攒炮去 !hasRed `7936b31` / 去抖 `4a109bb` / 红名连招串联 `731fcaa` / 穿心+翻译 `56e87b4` / 祝福 Regen `727158e`。

**UI 完善**(commits `23ebccd` 滚动 / `66bfc3c` 滚动条 / `7700bb6` 固定高度+tabs sticky):选项面板加滚动(固定高度 558px 防切 tab 跳变)+ tabs sticky 固定顶部 + 精致滚动条;面板标签 觅心→穿心。

### 2.7 待真机实测(M2 唯一剩余阻塞)

- **三个 OC 近战技 `castHostileOn` 释放机制 ✅ 已验证**(commit `8df9804`):GF 实测点 `2201`+`commit_target` 真放出盾击(crit 102413,`Cut Down has been defeated`,OC 138→100 真消耗)。技能元素 `id=DBID`、`onclick=lock_action+set_hostile_skill`(无 touch_and_go,靠 commit_target 释放),与红怪减益同机制;castHostileOn 已加 opacity 守卫。**释放机制确认可用**;剩"实战观察决策优先级/攒炮节奏是否如预期"(装最新 build 开三开关跑一轮)。
- **目标权重真机核对**:开 `useTargetWeight` 看 P16 选目标;死怪 `nbardead` / 红怪 Yggdrasil 名 / 长回合 Spawned 缓存沿用 / 连刷换波 initHp 覆盖 / hpNow 数值核对(spec §10)。
- **textlog 顺序遗留**:`_round`/`_enemyMagic` 注释"末尾"vs 实测"顶新底旧",靠每轮清空侥幸正确,待核统一(`_spawnHp` 已 reverse 防御)。

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

1. ~~§2.1 Absorb 启发式~~ ✅ / ~~§2.4 OC 近战技~~ ✅ / ~~§2.5 目标权重~~ ✅ / ~~§2.6 OC 经济+UI~~ ✅
2. **§2.7 三个 OC 技 castHostileOn 真机实测**(最高优先,解阻后即可开启三技 + useTargetWeight)
3. **§2.2 XHR 解析**(等用户进战斗,读一次样本后做;顺带解决 §2.3 buff 回合读法)
4. **§3 M3 连刷**(先 reference 翻写研究落实开战 API,再分 starter / stamina / 连刷 tab 三批)
5. M4 → M5
