# HV 单手盾战 — 战斗机制实测确认 & 决策规则

> 本文沉淀的是**已确认**的事实(实测 / 游戏官方文本 / 玩家经验)。带「⚠待核对」的是尚未真机验证的推断。
> 决策代码见 `src/battle/brain.ts`,读取见 `src/battle/reader.ts`,执行见 `src/battle/executor.ts`,循环见 `src/loop.ts`。

---

## 一、小马炮 Orbital Friendship Cannon(本项目踩坑最深处)

| 项 | 事实 | 来源 |
|---|---|---|
| 按钮 | `id=1111`,在 `#pane_skill`,`onmouseover` 含 `'Orbital Friendship Cannon'` | 实测 |
| 消耗 | **200 OC**(8 点斗气 × 25) | 实测 |
| 冷却 | **放完后 50 回合冷却**,期间即使 OC 够也放不出 | 玩家确认 |
| 触发 | 怪 ≥4(`CANNON_MIN_ENEMIES`)才考虑 | 设计 |

### ⚠️ 置灰陷阱(炮死锁根因)

**OC<200 和「50 回合冷却中」,炮按钮 DOM 完全一样**:都是 `opacity:0.5` + `onclick=NULL`,**视觉/属性无法区分**(实测 OC150 时即如此)。

- 所以**彻底弃用 opacity 判炮冷却** —— 否则 OC<200 的灰被当冷却 → 攒炮不启动 → OC 被架式/OC技能消耗 → 永远攒不到 200 → 炮一发不放(死锁)。
- **OC≥200 且不在冷却 → 按钮变亮**(玩家确认)。

### 正确设计(已实现)

| 判据 | 用什么 | 不用什么 |
|---|---|---|
| OC 够不够 | `overcharge ≥ 200`(reader 数点精确读) | ~~opacity~~ |
| 在不在冷却 | `cannonOnCd`(loop 按**回合**追踪) | ~~opacity~~、~~22s 时间戳~~ |
| 炮在不在技能栏 | `cannonExists`(`!!cannonBtn()`) | — |

**冷却回合追踪**(`src/loop.ts`):模块变量 `cannonCd`,只有 `Exec.cannon()` 实际返回 `true` 后才置 `CANNON_CD_TURNS=50`;每个真新回合(状态推进)`-1`,归 0 = 冷却好;**新战斗清零**(没放过=不冷却,不再「一上来就以为冷却」)。

### 三种炮场景的决策(brain P11.5 / P12 / P15)

- **OC≥200 + 不冷却 + 怪≥4** → 放炮(P11.5,排在架式之上,否则攒到 200 那刻被开架式烧回)
- **OC<200 + 不冷却 + 怪≥4** → 攒炮:架式让路(开着就关、关着别开),让 OC 爬到 200(P12)
- **冷却中(`cannonOnCd`)** → **不放、不攒**;架式照常滞回,OC 改花在 OC 近战技(P15)——炮放不出,OC 不必留

---

## 二、OC 特殊近战技 + 连招

| 技 | id | OC 消耗 | 效果 | 来源 |
|---|---|---|---|---|
| 盾击 Shield Bash | 2201 | 25(1点) | 使目标**晕眩 5 回合** + 敲击伤害 | hv_chinese.js:3298 |
| 要害强击 Vital Strike | 2202 | 50(2点) | **对已晕眩目标**:大伤害 + 堆 5 道流血(50%×5回合) | hv_chinese.js:3299 |
| 最后的慈悲 Merciful Blow | 2203 | 100(4点) | **残血<25% + 流血** 处决 | dodying:3811 |

**onclick 释放机制**(实测):三者都是 `battle.lock_action(this,1,'magic',ID); battle.set_hostile_skill(...)` —— 与法术 hostile 同机制,用 `castHostileOn(id, eid)`(选中技能 → commit 目标 eid)释放。

**连招链**(环环相扣,要害的流血正好喂慈悲):
```
盾击(给未晕眩目标上晕眩) → 要害(对晕眩目标高伤+5道流血) → 慈悲(残血+流血处决)
```

**与炮的优先级**:多怪攒炮场景,OC 留给炮,这三技让路;只在「非炮场景 / 炮冷却中」才用(P15)。

`castHostileOn` 对 OC 技能的释放已 GF 实测确认:点技能后 `commit_target(eid)` 真出招并真扣 OC。

---

## 三、OC(斗气)读取

- `#vcp>div>div` 数点,**每点 25**;正充能的那点 `id=vcr`(半亮 opacity0.5)按 **12.5** 估 → `(满点×25 + vcr点×12.5)`
- 满 **250**(10 点)
- 宽屏(d)版无 `#vcp`,OC 读 `#dvrc` 数值
- 架式(灵动架式)**每回合烧 ~10% OC**;开启需 **OC≥50%**(`OC_ON=0.5`),滞回关在 `OC_OFF=0.22`
- ⚠旧「量条宽/容器宽×250」算法是错的(满 OC 也只算 ~119 → oc≥200 永不成立),已弃

---

## 四、怪状态读取(都走 DOM 数值/英文 attribute,抗汉化)

| 项 | 读法 | 来源 |
|---|---|---|
| 怪元素 | `[id^="mkey_"]`,`mkey_N`;`opacity` 样式 = 死/不可选 | — |
| **当前 HP%** | `.btm4>.btm5:nth-child(1) img` 的 `style.width / 120`(满血条=120px) | dodying:3296 |
| 死亡 | 血条 img `src` 含 `nbardead.png` | dodying:3291 |
| **晕眩** | mkey 内 img `src` 含 `stun` | 实测(e4) |
| 流血 | mkey 内 img `src` 含 `wpn_bleed` | dodying:3811 ⚠待核对精确文件名 |
| 破甲 | `.btm6 img` src 含 `penetrat` 或 `bleed` | — |
| 红怪 | `.btm2[style*="background"]` 存在 | — |

实测血条:`e1 67px→56%`、`e3 113px→94%`、`e5 115px→96%`(读准)。⚠满血怪血条 img 可能无 `style.width`(脚本默认按 100% 处理);index 与 mkey 顺序对应待大样本核对。

---

## 五、buff 读取

- `#pane_effects>img`,匹配 `src` 文件名 **或** `onmouseover` 里 `set_infopane_effect('名字')` 的名字(后者抗图标改名,如御谜士祝福认 `RiddleMaster`)
- **吸收墙 absorb**:`src=absorb.png` / 名 `Absorbing Ward`(实测确认匹配)
- **影纱 shadowVeil**:`src/name` 关键字按 `shadowveil` 匹配,进入高压防御层
- 各 buff 关键字见 `src/battle/tables.ts` 的 `BUFF_IMG`
- Channeling 也在此读(`channeling` 图标);命中后 1MP+增强 50%,brain P2.5 抢补最贵法术

---

## 六、vital 读取

- 在 `#pane_vitals` 内按 id **前缀**匹配(HV 按状态/布局换 id 后缀):HP=`vrh`/`dvrh`、MP=`vrm`/`dvrm`、SP=`vrs`/`dvrs`
- 满值**动态自适应**(读到更大值就更新 max),解决成长/插件导致 >100%
- ⚠旧版只认 `#vrhd` → HP 切到 `vrhb` 态时误判「不在战斗」→ 整脚本停摆,已用前缀匹配根治

---

## 七、释放机制(executor)

| 动作 | 机制 |
|---|---|
| 法术 friendly(如 Spark) | onclick 自带 `set_friendly_skill + touch_and_go`,点一下自动释放 |
| 法术/OC技 hostile(陷危/盾击/要害/慈悲) | `set_hostile_skill` 选中 → `commit_target(eid)` 对指定怪释放(`castHostileOn`) |
| 平砍 | `battle.commit_target(eid)`(unsafeWindow),退回点 `mkey_N` |
| 架式 | 点 `#ckey_spirit`(src 含 `spirit_a` = 开) |
| 物品 | 点 `.bti3>div[onmouseover*="set_infopane_item(db)"]`;**该触发器不存在 = 没货/冷却**(决策前用 `itemAvailable` 查,避免点空) |
| 可放性 | 技能冷却时 HV 设 `opacity:0.5`(对齐原版 `isOn`);`skillReady` 据此判 |

---

## 八、决策级联(brain,生存优先 → 输出)

```
P0 小马图(留人工) → P0.5 胜利继续下一波 → P1 Spark零空窗 → P2 承伤预测急救
→ P2.5 Channeling补最贵 → P3 MP熔断 → P4 双墙(卷轴/单补) → P5 Absorb(法系)
→ P6 Shadow Veil(高压) → P7 Haste → P8 Regen → P9 回MP → P10 回HP
→ P10.5 高压控制(Weaken→Silence→高价值Imperil) → P11 回SP预留
→ P11.5 小马炮 → P12 架式开关/攒炮让路 → P13 红怪减益(Weaken→Imperil)
→ P14 Heartseeker → P15 OC近战技(最终波/高压不攒炮) → P16 破甲滚雪球平砍
```

宝石按需对口:缺啥用对应专用宝石(生命/魔力/灵力);**神秘宝石不再当恢复兜底**,只作为 Channeling 触发器,服务 Spark/双墙/影纱/关键减益等下一发高价值法术。

---

## 决策回归工具

`scripts/drive-brain.mts`:Node 里用**真实** `brain.decide` 跑典型状态,看每种出什么招。`scripts/drive-c-layered.mts` 是 C-layered 的断言型回归(Mystic/影纱/沉默/最终波OC/SP预留)。改 `brain` 后两者都跑一遍即可回归:

```bash
cd autobattle && npx tsx scripts/drive-brain.mts
cd autobattle && npx tsx scripts/drive-c-layered.mts
```

覆盖:满状态平砍 / Spark真空 / 危急急救 / 缺墙卷轴 / 放炮 / 攒炮 / 红怪减益 / 要害·盾击·慈悲连招 / Absorb / Channeling / 炮冷却中转OC技 / Mystic / Shadow Veil / Silence / 最终波不攒炮。

---

## 待真机核对清单

1. Mystic Gem 使用后 `channeling` buff 是否稳定被 reader 读到
2. Shadow Veil 图标关键字是否确认为 `shadowveil`,剩余回合读取是否与其他 buff 一致
3. Silence/Blind/Slow 的技能 id 与 opacity 冷却判断是否正确
4. 高压控制不会在低压 GF/arena 明显拖慢
5. 最终波 OC 不攒炮后,红怪/杂兵减压动作符合日志预期
6. 流血图标 `wpn_bleed` 精确文件名 + 怪满血时血条 width 读法
7. 晕眩图标 `stun` 精确 src(目前 `/stun/` 模糊匹配,实测 e4 命中)
8. 血条 img 与 mkey 的 index 对应(大样本)
