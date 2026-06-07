/**
 * riddle/index.ts — 编排层：检测 → 告警/通知 → UI → 超时自动提交已勾选项
 *
 * 由 loop.ts tick() 每 tick 调用；模块级状态管理题目生命周期。
 * 全程 try/catch，不向外抛异常。
 */

import { type RiddleConfig } from './types';
import { type Config } from '../core/config';
import { config } from '../core/config';
import { detectRiddle } from './detect';
import { playAlarm, sendDesktop, unlockAudio } from './notify';
import { mountRiddleUI } from './ui';
import { submitRiddle, openRiddleWindow } from './submit';
import type { PonyName } from './types';

// ── 首次用户交互自动解锁音频（注册一次性监听）──────────────────────────────────
(function registerAudioUnlock() {
  try {
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
  } catch { /* 注册失败不致命 */ }
})();

// ── 模块级状态（题目生命周期）──
let active = false;         // 上一 tick 是否有小马题
let submitted = false;      // 本题是否已自动提交
let unmount: (() => void) | null = null; // UI 卸载函数

/**
 * 从 config 装配 RiddleConfig（仿 brain 的 weightCfg）。
 */
export function riddleCfg(C: Config): RiddleConfig {
  return {
    useRiddleAssist:    C.useRiddleAssist,
    riddlePopup:        C.riddlePopup,
    riddleHotkeys:      C.riddleHotkeys,
    riddleAlarm:        C.riddleAlarm,
    riddleNotify:       C.riddleNotify,
    riddleChartOverlay: C.riddleChartOverlay,
    riddleCollect:      C.riddleCollect,
    riddleUrgentSec:    C.riddleUrgentSec,
    riddleAutoRecognize: C.riddleAutoRecognize,
  };
}

/**
 * 由 loop 每 tick 调用。
 * 独立于 enabled——useRiddleAssist 门控，即使未开自动战斗也工作。
 *
 * 性能注：detectRiddle 每 tick 全页扫描，可接受（偶发题目 + useRiddleAssist 门控）。
 * TODO: 倒计时可改为定点读 #riddlecounter 避免全页扫描（后续优化点）。
 */
export function tickRiddle(): void {
  try {
    const cfg = riddleCfg(config.all());

    // 开关关闭：若之前有题则清理状态后直接返回
    if (!cfg.useRiddleAssist) {
      if (active) {
        unmount?.();
        unmount = null;
        active = false;
        submitted = false;
      }
      return;
    }

    const rs = detectRiddle();

    // 题目消失：清理状态
    if (!rs.present) {
      if (active) {
        unmount?.();
        unmount = null;
        active = false;
        submitted = false;
      }
      return;
    }

    // 新出现的小马题：初始化
    if (!active) {
      active = true;
      submitted = false;

      if (cfg.riddleAlarm) {
        try { playAlarm(); } catch { /* 告警失败不中断 */ }
      }
      if (cfg.riddleNotify) {
        try { sendDesktop('小马题!', `剩 ${rs.secondsLeft ?? '?'} 秒, 快答`); } catch { /* 通知失败不中断 */ }
      }

      try { unmount = mountRiddleUI(rs, cfg); } catch { unmount = null; }

      if (cfg.riddlePopup) {
        try { openRiddleWindow(); } catch { /* 弹窗失败不中断 */ }
      }
    }

    // 超时自动提交（仅提交已勾选项；未勾加急催答不乱交——漏答无惩罚）
    if (!submitted && rs.secondsLeft != null && rs.secondsLeft <= cfg.riddleUrgentSec) {
      const selected = rs.options
        .filter((o) => o.el.checked)
        .map((o) => o.name as PonyName);

      if (selected.length > 0) {
        try { submitRiddle(rs, selected); } catch { /* 提交失败不中断 */ }
        submitted = true;
      } else {
        // 一只没勾：加急催答提醒，不乱交
        if (cfg.riddleAlarm) {
          try { playAlarm(1); } catch { /* 催答告警失败不中断 */ }
        }
      }
    }
  } catch {
    /* tickRiddle 不能崩，否则影响 loop 稳定性 */
  }
}
