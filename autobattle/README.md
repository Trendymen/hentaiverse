# HV 自动战斗 — B大脑（单手盾战）

在 dodying 停更的 `hvAutoAttack.user.js` 基础上，焊接一个为 **L398 PFUDOR 单手虚空盾战** 定制的现代化决策内核「B大脑」。一键开关（🧠自动 / ⏸暂停），关闭后**不会**退回 dodying 原版自动战斗，由 B大脑自己接管或彻底停手。

> ⚠️ 仅作半自动辅助。禁止无人值守挂机/规避检测——L398 无双装，封号代价极高。小马图（riddle）默认**不自动答题**。

## 目录结构

```
autobattle/
├── hvAutoAttack.user.js          # 原版 dodying 基底（只读，不手改）
├── hv_brain_modern.user.js       # ★ B大脑模块源 —— 演进只改这个文件
├── weld.mjs                      # 焊接脚本：基底 + B大脑源 → dist 产物
├── dist/
│   └── hvAutoAttack_BRAIN.user.js  # ★ 合体产物 —— 装进 Tampermonkey 的就是它
└── reference/
    ├── hv_decideAction.js        # 早期决策伪代码草稿（历史参考）
    └── hv_shield_brain.js        # 早期 B大脑草稿（历史参考）
```

## 构建

```bash
cd autobattle
node weld.mjs        # 读 hvAutoAttack.user.js + hv_brain_modern.user.js → 写 dist/hvAutoAttack_BRAIN.user.js
```

`weld.mjs` 路径自适应（基于脚本所在目录），在仓库任意位置都能跑。

## 安装

把 `dist/hvAutoAttack_BRAIN.user.js` 全文覆盖进 Tampermonkey 对应脚本，刷新 HV 页面即可。改了 `hv_brain_modern.user.js` 后必须重跑 `node weld.mjs` 再覆盖安装。

## B大脑设计要点

- **decideAction 16 级联**：小马图 → Spark 零空窗保命 → 承伤预测急救 → MP 熔断 → 双物理墙 → Absorb(魔法怪) → Haste → 重击波兜底 → Regen → 回 MP → HP 维持 → SP 喂鬥气 → 灵动架式开关 → 红怪减益 → Heartseeker → 小马炮 AOE → 破甲滚雪球平砍。
- **减益(对红怪)**：表驱动 `DEBUFFS`，顺序 **Weaken(禁暴击/减伤) → Imperil(破抗增伤)**；`castHostileOn` 精确锁定红怪 eid，不误打杂兵。
- **Channeling 主动利用**：检测到 Channeling(下个法术 1MP +50% 增强) 时，优先把最贵的 Spark / 双墙 / Imperil / Heartseeker 塞进这回合吃满折扣（保命永远排它前面）。
- **控制台开关**：红怪铺 Weaken / 红怪铺 Imperil / Channeling 增益 / 小马炮 / 守护卷轴优先 / 动作间延迟区间，均可调，`localStorage` 持久化。

## 焊接原理

`weld.mjs` 在 dodying `onBattle()` 的 `taskList` 决策分发前插入：

```js
if (window.HVShieldBrain) { window.HVShieldBrain.step(); return; }
```

开启时 B大脑接管出招并 `return`（跳过 dodying 原决策）；模块未注册时照走原逻辑。同时关掉 dodying 歪斜的血条百分比，改由 B大脑居中渲染。
