/**
 * riddle/detect.ts — 启发式检测+解析小马题(Riddlemaster)
 *
 * 设计原则:
 *  - 不依赖精确 id/class, 靠文本/结构特征定位 → 对 HV 改版鲁棒
 *  - 任何情况不抛异常; 无小马题时返回 absent 态
 *  - 关键判定均有注释说明启发依据
 */

import { MANE6, type PonyName, type RiddleState } from './types';

// ─── 常量 ────────────────────────────────────────────────────────────────────

/** 页面含这些字符串之一就可能是小马题页 */
const RIDDLE_SIGNALS = ['Submit Answer', 'Select ALL ponies', 'PONY CHART'] as const;

// ─── 纯辅助函数 ──────────────────────────────────────────────────────────────

/**
 * 判断 root 内任意文本节点/元素是否含目标字符串.
 * 走 document.body.innerText 或 root.textContent 均可; textContent 不走 layout, 更快.
 */
function hasText(root: ParentNode, needle: string): boolean {
  try {
    return (root as Element).textContent?.includes(needle) ?? false;
  } catch {
    return false;
  }
}

/**
 * 提取 checkbox 关联文本(启发顺序: labels API → closest label → parentElement).
 * 返回 trim 后字符串, 取不到返回 ''.
 */
function labelText(box: HTMLInputElement): string {
  try {
    // 标准 <label for="..."> 关联
    const viaApi = box.labels?.[0]?.textContent?.trim();
    if (viaApi) return viaApi;

    // <label><input ...> text</label> 内嵌写法
    const viaClosest = box.closest('label')?.textContent?.trim();
    if (viaClosest) return viaClosest;

    // <td><input ...> Twilight Sparkle</td> 等松散布局
    const viaParent = box.parentElement?.textContent?.trim();
    if (viaParent) return viaParent;
  } catch {
    // 防御: 跨 frame 或沙盒 DOM 访问可能抛
  }
  return '';
}

/**
 * 从字符串中提取首个整数(用于倒计时).
 * 例: '  42 ' → 42, 'abc' → null.
 */
function parseFirstDigits(text: string): number | null {
  const m = text.match(/\d+/);
  return m ? Number(m[0]) : null;
}

/**
 * 在 container 内找面积最大的 img 或 canvas.
 * 面积 = naturalWidth*naturalHeight (img) 或 width*height (canvas).
 * 若 container 为 null 则跳过, 返回 null.
 */
function pickLargestMedia(
  container: Element | null,
): HTMLImageElement | HTMLCanvasElement | null {
  if (!container) return null;
  let best: HTMLImageElement | HTMLCanvasElement | null = null;
  let bestArea = -1;

  try {
    container.querySelectorAll('img, canvas').forEach((el) => {
      let area = 0;
      if (el instanceof HTMLImageElement) {
        area = (el.naturalWidth || el.width) * (el.naturalHeight || el.height);
      } else if (el instanceof HTMLCanvasElement) {
        area = el.width * el.height;
      }
      if (area > bestArea) {
        bestArea = area;
        best = el as HTMLImageElement | HTMLCanvasElement;
      }
    });
  } catch {
    // 防御
  }
  return best;
}

// ─── 核心检测 ─────────────────────────────────────────────────────────────────

/**
 * 向上遍历至多 steps 层, 返回第 steps 层祖先(或到 document.body 为止).
 * 用于从 checkbox 定位到更大的题目容器.
 */
function ancestorUpBy(el: Element, steps: number): Element {
  let cur: Element = el;
  for (let i = 0; i < steps; i++) {
    if (!cur.parentElement || cur.parentElement === document.body) break;
    cur = cur.parentElement;
  }
  return cur;
}

/** 检测并解析当前页面小马题状态. 不抛异常. */
export function detectRiddle(root: ParentNode = document): RiddleState {
  const absent: RiddleState = {
    present: false,
    options: [],
    submitEl: null,
    imageEl: null,
    secondsLeft: null,
  };

  try {
    // ── 1. options: 遍历所有 checkbox, 匹配 MANE6 ─────────────────────────
    const options: RiddleState['options'] = [];
    const checkboxes = root.querySelectorAll<HTMLInputElement>('input[type=checkbox]');

    checkboxes.forEach((box) => {
      const text = labelText(box);
      // 启发: 小马名出现在 checkbox 关联文本中即视为选项
      const matched = (MANE6 as readonly string[]).find((n) => text.includes(n));
      if (matched) {
        options.push({ name: matched as PonyName, el: box });
      }
    });

    // ── 2. present: 至少 1 个选项 + 页面含题目信号文本 ────────────────────
    // 启发: HV 小马题必然同时含 checkbox 选项与特定文案
    const present =
      options.length >= 1 &&
      RIDDLE_SIGNALS.some((sig) => hasText(root, sig));

    if (!present) return absent;

    // ── 3. submitEl: 找文本严格等于 'Submit Answer' 的可点击元素 ───────────
    // 启发: HV 按钮可能是 button/input/a/div/span 任意标签
    let submitEl: HTMLElement | null = null;
    const candidates = root.querySelectorAll<HTMLElement>(
      'button, input[type=button], input[type=submit], a, div, span',
    );
    for (const el of candidates) {
      const label =
        (el instanceof HTMLInputElement ? el.value : el.textContent) ?? '';
      if (label.trim() === 'Submit Answer') {
        submitEl = el;
        break;
      }
    }

    // ── 4. imageEl: 从第一个选项 checkbox 向上 4 层容器取最大 img/canvas ──
    // 启发: 题目图与选项 checkbox 通常同属一个大容器
    let imageEl: HTMLImageElement | HTMLCanvasElement | null = null;
    if (options.length > 0) {
      const container = ancestorUpBy(options[0].el, 4);
      imageEl = pickLargestMedia(container);
    }
    // 退回: 整个 root 内最大 img/canvas
    if (!imageEl) {
      imageEl = pickLargestMedia(root as Element);
    }

    // ── 5. secondsLeft: 旧版 #riddlecounter → submitEl 附近数字 → null ────
    let secondsLeft: number | null = null;

    // 旧版 HV 用 #riddlecounter 存倒计时
    const counterEl = (root as Document | Element).querySelector?.('#riddlecounter');
    if (counterEl?.textContent) {
      secondsLeft = parseFirstDigits(counterEl.textContent.trim());
    }

    // 新版: 找 submitEl 同父/相邻节点中纯数字文本
    if (secondsLeft === null && submitEl?.parentElement) {
      const siblings = Array.from(submitEl.parentElement.childNodes);
      for (const node of siblings) {
        const t = node.textContent?.trim() ?? '';
        if (/^\d+$/.test(t)) {
          secondsLeft = Number(t);
          break;
        }
      }
    }

    return { present, options, submitEl, imageEl, secondsLeft };
  } catch {
    // 防御: 任何未预期错误都返回 absent 态, 避免上层崩溃
    return absent;
  }
}
