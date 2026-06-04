# HV 自动战斗 · 盾战大脑(现代化独立重写)

为 L398 PFUDOR 单手虚空盾战定制的现代化半自动辅助。TypeScript + vite-plugin-monkey 工程,产物为单文件、**不压缩、可调试**,仅中文。

> ⚠️ 半自动辅助。禁止无人值守挂机 / 检测规避(封号红线)。小马图默认不自动答题。

## 开发

```bash
cd autobattle
npm install
npm run dev        # 开发模式, 控制台给出油猴安装链接(热更新)
npm run build      # 构建 dist/hv-autobattle.user.js(不压缩可调试)
npm run typecheck  # tsc 类型检查
```

## 安装

把 `dist/hv-autobattle.user.js` 安装进 Tampermonkey,刷新 HV 页面。改了 `src/` 后重跑 `npm run build` 再覆盖。

## 结构

- `src/core/` — store(持久化 GM/localStorage)/config(单一真相配置)/dom(工具)/bus(类型化事件总线)
- `src/ui/` — hud(右下常驻 HUD)/panel(四 tab 抽屉)/components/styles
- `src/main.ts` — 入口(`@run-at document-start` hook XHR/fetch + 挂载 UI)
- `src/global.d.ts` — GM API 全局类型声明
- `reference/` — dodying 原版 + 旧焊接版(翻写底本, 不参与构建)

## 里程碑

- **M1 地基** ✅ — 工程 / 构建(不压缩)/ core / UI 骨架 / document-start hook
- **M2 战斗内** 🟡 基本完成 — Reader + Brain(16 级联 + 4 加固)+ Executor + tables + 战斗循环 + HUD 真实数据 + 战斗 tab 配置面板 + 小马炮 OC/冷却逻辑修复;**剩** Absorb 法系启发式 / XHR 响应解析收尾
- **M3 连刷** 🟠 仅 GF 波次内续战 — 遭遇 / 竞技场(等级勾选)/ GF 场间连刷 + 精力阈值 + 连刷 tab **待做**(`engine/` 未建)
- **M4 保护后勤** ❌ 未开始 — 精力 / 无响应 / 修复 / 库存 / 统计
- **M5 杂项打磨** ❌ 未开始 — 告警 / 异世界 / 小马提醒 + UI 精修

> 剩余工作清单 + 决策记录见 `../docs/superpowers/plans/2026-06-05-autobattle-remaining-tasks.md`
