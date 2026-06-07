/**
 * riddle/submit.ts — 勾选小马 checkbox + 提交 + 弹窗模式
 *
 * 纯执行层：不做答案决策，selected 由调用方传入。
 * 所有函数防御性处理，不向外抛异常。
 */

import { type RiddleState, type PonyName } from './types';

/**
 * 按 selected 列表勾选对应 checkbox，并点击提交按钮。
 *
 * @param state   detect.ts 产出的运行态快照
 * @param selected 需要勾选的小马名列表（其余自动取消勾选）
 */
export function submitRiddle(state: RiddleState, selected: PonyName[]): void {
  if (!state.present) return;

  const selectedSet = new Set<string>(selected);

  for (const option of state.options) {
    const shouldCheck = selectedSet.has(option.name);
    if (option.el.checked !== shouldCheck) {
      option.el.checked = shouldCheck;
      try {
        option.el.dispatchEvent(new Event('change', { bubbles: true }));
      } catch {
        // 派发事件失败不阻断流程
      }
    }
  }

  if (state.submitEl) {
    try {
      (state.submitEl as HTMLElement).click();
    } catch {
      // 点击失败不抛异常
    }
  }
}

/**
 * 以弹窗模式打开当前页面（移植自 dodying）。
 * 弹窗内脚本会独立初始化，用于在专属窗口答题。
 */
export function openRiddleWindow(): void {
  try {
    window.open(
      location.href,
      'riddleWindow',
      'resizable,scrollbars,width=1241,height=707',
    );
  } catch {
    // 被浏览器拦截或环境不支持时静默失败
  }
}

/**
 * 预热弹窗：open 后约 200ms 关闭，触发脚本在弹窗内完成初始化，
 * 减少首次正式打开时的延迟（移植自 dodying 预处理逻辑）。
 */
export function preloadRiddleWindow(): void {
  try {
    const win = window.open(
      location.href,
      'riddleWindow',
      'resizable,scrollbars,width=1241,height=707',
    );
    if (win) {
      setTimeout(() => {
        try {
          win.close();
        } catch {
          // 关闭失败时静默
        }
      }, 200);
    }
    // win 为 null 表示被浏览器弹窗拦截，静默跳过
  } catch {
    // open 本身抛异常时静默失败
  }
}
