/**
 * riddle/ui.ts — 小马题辅助 UI 浮层
 *
 * 功能:
 *  - 6 个大按钮多选(点击 toggle checkbox + 高亮同步)
 *  - 倒计时显示(每秒刷新, ≤ urgentSec 变红)
 *  - 图鉴浮层入口(点击切换 PONY CHART 参考区)
 *  - 大号提交按钮
 *  - 快捷键绑定(1-6 toggle, Enter 提交, Esc 静音)
 *  - 单例挂载(重复调用自动卸载旧实例)
 *  - 完整卸载函数(移除 DOM + 解绑 keydown + clearInterval)
 */

import { mapRiddleKey } from './hotkeys';
import { submitRiddle } from './submit';
import { detectRiddle } from './detect';
import type { RiddleState, RiddleConfig, PonyName } from './types';

// ─── 常量 ────────────────────────────────────────────────────────────────────

/** 浮层根元素固定 id(唯一实例标识) */
const ROOT_ID = 'hvab-riddle-ui';

/** 图鉴浮层固定 id */
const CHART_ID = 'hvab-riddle-chart';

// ─── 样式(内联, 深色半透明风格与 HUD 对齐) ───────────────────────────────────

const STYLES = `
#${ROOT_ID} {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font: 14px/1.4 system-ui, -apple-system, sans-serif;
  color: #dce3f0;
  pointer-events: auto;
  /* 防止意外拉伸, 最大宽度 600px */
  max-width: 600px;
  width: max-content;
}
#${ROOT_ID} .rui-header {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(22, 24, 36, .94);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(120, 140, 200, .3);
  border-radius: 10px;
  padding: 5px 14px;
  font-size: 14px;
  min-width: 160px;
  justify-content: space-between;
}
#${ROOT_ID} .rui-title {
  font-weight: 600;
  letter-spacing: .5px;
  opacity: .85;
}
#${ROOT_ID} .rui-timer {
  font: bold 20px monospace;
  min-width: 2.5ch;
  text-align: right;
  color: #7ce;
  transition: color .3s;
}
#${ROOT_ID} .rui-timer.urgent {
  color: #f66;
  animation: rui-blink .6s step-end infinite;
}
@keyframes rui-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: .3; }
}
#${ROOT_ID} .rui-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
/* 大按钮: 每个约 90x56px */
#${ROOT_ID} .rui-pony-btn {
  position: relative;
  width: 90px;
  min-height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(32, 36, 52, .95);
  border: 2px solid rgba(100, 120, 180, .35);
  border-radius: 10px;
  cursor: pointer;
  transition: background .15s, border-color .15s, transform .08s;
  box-shadow: 0 3px 10px rgba(0,0,0,.4);
  padding: 6px 4px;
  user-select: none;
}
#${ROOT_ID} .rui-pony-btn:hover {
  background: rgba(44, 50, 72, .98);
  border-color: rgba(140, 160, 220, .6);
  transform: translateY(-1px);
}
#${ROOT_ID} .rui-pony-btn.selected {
  background: rgba(30, 100, 60, .9);
  border-color: #3d9;
  box-shadow: 0 0 12px rgba(50, 200, 120, .45);
}
#${ROOT_ID} .rui-pony-btn .rui-seq {
  font-size: 11px;
  opacity: .55;
  position: absolute;
  top: 4px;
  left: 7px;
}
#${ROOT_ID} .rui-pony-btn .rui-name {
  font-size: 11px;
  text-align: center;
  line-height: 1.3;
  word-break: break-word;
  max-width: 82px;
}
#${ROOT_ID} .rui-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
#${ROOT_ID} .rui-submit-btn {
  padding: 8px 28px;
  background: #2a6;
  border: 0;
  border-radius: 8px;
  color: #fff;
  font: bold 15px system-ui;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0,0,0,.4);
  transition: background .15s, transform .08s;
}
#${ROOT_ID} .rui-submit-btn:hover {
  background: #3b8;
  transform: translateY(-1px);
}
#${ROOT_ID} .rui-chart-btn {
  padding: 8px 14px;
  background: rgba(60, 70, 100, .9);
  border: 1px solid rgba(120, 140, 200, .35);
  border-radius: 8px;
  color: #bcd;
  font: 14px system-ui;
  cursor: pointer;
  transition: background .15s;
}
#${ROOT_ID} .rui-chart-btn:hover {
  background: rgba(70, 82, 120, .95);
}
#${ROOT_ID} .rui-close-btn {
  padding: 4px 8px;
  background: rgba(100, 30, 30, .7);
  border: 0;
  border-radius: 6px;
  color: #faa;
  font: 14px system-ui;
  cursor: pointer;
  opacity: .7;
  transition: opacity .15s;
}
#${ROOT_ID} .rui-close-btn:hover {
  opacity: 1;
}
/* 图鉴浮层 */
#${CHART_ID} {
  position: fixed;
  bottom: 110px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999998;
  background: rgba(16, 18, 28, .97);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(120, 140, 200, .35);
  border-radius: 12px;
  padding: 12px 16px;
  color: #dce3f0;
  font: 14px/1.5 system-ui;
  max-width: 520px;
  width: max-content;
  box-shadow: 0 8px 28px rgba(0,0,0,.6);
}
#${CHART_ID} .rchart-title {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: .5px;
  margin-bottom: 8px;
  opacity: .9;
}
#${CHART_ID} .rchart-img-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
#${CHART_ID} .rchart-img-wrap img {
  max-width: 200px;
  max-height: 160px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.1);
  cursor: pointer;
}
#${CHART_ID} .rchart-hint {
  margin-top: 8px;
  font-size: 13px;
  opacity: .55;
  text-align: center;
}
`;

// ─── 辅助 ─────────────────────────────────────────────────────────────────────

/** 注入 <style id="hvab-riddle-style"> (幂等: 已存在不重复注入) */
function ensureStyle(): void {
  const styleId = 'hvab-riddle-style';
  if (document.getElementById(styleId)) return;
  try {
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = STYLES;
    (document.head || document.documentElement).appendChild(s);
  } catch {
    // 防御: 无法注入样式时继续运行(降级用内联 style)
  }
}

/** 收集当前已勾选的小马名列表 */
function collectSelected(state: RiddleState): PonyName[] {
  const result: PonyName[] = [];
  for (const opt of state.options) {
    try {
      if (opt.el.checked) result.push(opt.name);
    } catch {
      // checkbox 已被页面移除时静默跳过
    }
  }
  return result;
}

/** 安全地 toggle 一个 checkbox 并同步高亮对应按钮 */
function toggleOption(
  opt: { name: PonyName; el: HTMLInputElement },
  btn: HTMLElement,
): void {
  try {
    opt.el.checked = !opt.el.checked;
    opt.el.dispatchEvent(new Event('change', { bubbles: true }));
    btn.classList.toggle('selected', opt.el.checked);
  } catch {
    // checkbox 已不可访问时静默
  }
}

/** 同步所有按钮高亮状态与 checkbox.checked 一致(用于外部操作后刷新) */
function syncBtnHighlights(
  options: RiddleState['options'],
  btnEls: HTMLElement[],
): void {
  options.forEach((opt, i) => {
    try {
      const btn = btnEls[i];
      if (btn) btn.classList.toggle('selected', opt.el.checked);
    } catch {
      // 防御
    }
  });
}

// ─── 图鉴浮层 ─────────────────────────────────────────────────────────────────

/**
 * 构建图鉴浮层元素.
 * 优先在当前页面查找 "PONY CHART" 相关图片(启发: alt/src 含 pony/chart 关键词).
 * 若页面无图则给出提示; 将来可在此替换为内置参考图.
 */
function buildChartOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = CHART_ID;

  const title = document.createElement('div');
  title.className = 'rchart-title';
  title.textContent = '📖 PONY CHART — 小马图鉴';
  overlay.appendChild(title);

  const imgWrap = document.createElement('div');
  imgWrap.className = 'rchart-img-wrap';

  // 启发式查找页面内含 PONY CHART 的图片
  // HV 原页面通常有一个大图 + PONY CHART 文案附近的 img
  const chartImgs: HTMLImageElement[] = [];
  try {
    document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      const src = (img.src || img.getAttribute('src') || '').toLowerCase();
      const alt = (img.alt || '').toLowerCase();
      // 启发: URL/alt 中含 pony、chart、riddle、mane6 等关键词
      if (/pony|chart|riddle|mane|sparkle|rarity|fluttershy|rainbow|pinkie|applejack/i.test(src + alt)) {
        chartImgs.push(img);
      }
    });
  } catch {
    // 防御
  }

  if (chartImgs.length > 0) {
    // 取面积最大的 ≤3 张(避免塞满屏幕)
    const sorted = chartImgs
      .slice()
      .sort(
        (a, b) =>
          b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight,
      )
      .slice(0, 3);
    for (const img of sorted) {
      const clone = document.createElement('img');
      clone.src = img.src;
      clone.alt = img.alt || 'pony chart';
      clone.title = '点击在新标签页打开大图';
      clone.onclick = () => {
        try {
          window.open(img.src, '_blank');
        } catch {
          // 被拦截时静默
        }
      };
      imgWrap.appendChild(clone);
    }
  } else {
    // 图鉴图片占位(真机后可替换为内置 base64 参考图)
    const placeholder = document.createElement('div');
    placeholder.style.cssText =
      'padding:16px 20px;opacity:.55;font-size:13px;text-align:center';
    placeholder.textContent =
      '页面内未检测到 PONY CHART 图片。\n请参考 HV Wiki 或截图备忘。\n(后续版本将内置参考图)';
    placeholder.style.whiteSpace = 'pre-line';
    imgWrap.appendChild(placeholder);
  }

  overlay.appendChild(imgWrap);

  const hint = document.createElement('div');
  hint.className = 'rchart-hint';
  hint.textContent = '点击图片可在新标签页查看大图';
  overlay.appendChild(hint);

  return overlay;
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

/**
 * 挂载小马题辅助 UI.
 *
 * @param state  detect.ts 产出的运行态快照
 * @param cfg    RiddleConfig 配置
 * @returns      卸载函数(移除 DOM + 解绑事件 + 停止定时器)
 */
export function mountRiddleUI(state: RiddleState, cfg: RiddleConfig): () => void {
  // ── 卸载已存在的旧实例(防重复挂载) ────────────────────────────────────────
  const existingRoot = document.getElementById(ROOT_ID);
  if (existingRoot) {
    // 触发旧实例的卸载副作用(通过自定义事件通知旧实例清理 interval/listener)
    try {
      existingRoot.dispatchEvent(new CustomEvent('hvab-unmount'));
    } catch {
      // 防御
    }
    existingRoot.remove();
  }
  const existingChart = document.getElementById(CHART_ID);
  if (existingChart) existingChart.remove();

  // ── 无小马题时直接返回空卸载函数 ──────────────────────────────────────────
  if (!state.present || state.options.length === 0) {
    return () => {};
  }

  // ── 注入样式(幂等) ─────────────────────────────────────────────────────────
  ensureStyle();

  // ── 构建浮层根元素 ─────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = ROOT_ID;

  // ── 头部: 标题 + 倒计时 ───────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'rui-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'rui-title';
  titleEl.textContent = '🐴 小马题';
  header.appendChild(titleEl);

  // 倒计时显示(若 state.secondsLeft 为 null 则隐藏)
  const timerEl = document.createElement('span');
  timerEl.className = 'rui-timer';
  timerEl.style.display = state.secondsLeft === null ? 'none' : '';
  timerEl.textContent = state.secondsLeft !== null ? String(state.secondsLeft) : '';
  header.appendChild(timerEl);

  // 关闭按钮(临时隐藏浮层, 不影响答题)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'rui-close-btn';
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  closeBtn.title = '隐藏辅助浮层(快捷键不受影响)';
  header.appendChild(closeBtn);

  root.appendChild(header);

  // ── 倒计时刷新定时器 ──────────────────────────────────────────────────────
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  if (state.secondsLeft !== null) {
    timerInterval = setInterval(() => {
      try {
        // 重新检测页面获取最新 secondsLeft
        const fresh = detectRiddle();
        if (!fresh.present) {
          // 题目已消失, 停止刷新
          if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          return;
        }
        const secs = fresh.secondsLeft;
        if (secs !== null) {
          timerEl.style.display = '';
          timerEl.textContent = String(secs);
          // ≤ urgentSec 变红闪烁
          timerEl.classList.toggle('urgent', secs <= cfg.riddleUrgentSec);
        } else {
          timerEl.style.display = 'none';
        }
      } catch {
        // 防御: detectRiddle 不应抛, 但 DOM 操作可能失败
      }
    }, 1000);
  }

  // ── 大按钮区 ──────────────────────────────────────────────────────────────
  const btnsArea = document.createElement('div');
  btnsArea.className = 'rui-btns';

  // 记录按钮元素引用(供快捷键操作高亮同步)
  const ponyBtns: HTMLElement[] = [];

  state.options.forEach((opt, i) => {
    const btn = document.createElement('div');
    btn.className = 'rui-pony-btn';
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-label', opt.name);
    btn.title = `${opt.name}（快捷键 ${i + 1}）`;

    // 序号标签
    const seqEl = document.createElement('span');
    seqEl.className = 'rui-seq';
    seqEl.textContent = String(i + 1);
    btn.appendChild(seqEl);

    // 小马名(按词换行: 空格→换行友好)
    const nameEl = document.createElement('span');
    nameEl.className = 'rui-name';
    nameEl.textContent = opt.name;
    btn.appendChild(nameEl);

    // 初始高亮同步 checkbox 状态
    try {
      btn.classList.toggle('selected', opt.el.checked);
    } catch {
      // 防御
    }

    // 点击 toggle
    btn.addEventListener('click', () => toggleOption(opt, btn));

    ponyBtns.push(btn);
    btnsArea.appendChild(btn);
  });

  root.appendChild(btnsArea);

  // ── 操作栏: 图鉴按钮 + 提交按钮 ─────────────────────────────────────────
  const actionsArea = document.createElement('div');
  actionsArea.className = 'rui-actions';

  // 图鉴浮层(仅 cfg.riddleChartOverlay 开启时显示)
  let chartOverlay: HTMLElement | null = null;
  let chartVisible = false;

  if (cfg.riddleChartOverlay) {
    const chartBtn = document.createElement('button');
    chartBtn.className = 'rui-chart-btn';
    chartBtn.type = 'button';
    chartBtn.textContent = '📖 图鉴';
    chartBtn.title = '切换 PONY CHART 参考图鉴';

    chartBtn.addEventListener('click', () => {
      if (!chartVisible) {
        // 首次打开: 懒构建
        if (!chartOverlay) {
          chartOverlay = buildChartOverlay();
          try {
            (document.body || document.documentElement).appendChild(chartOverlay);
          } catch {
            // 防御: appendChild 失败
          }
        }
        chartOverlay.style.display = '';
        chartVisible = true;
        chartBtn.textContent = '📕 关闭图鉴';
      } else {
        if (chartOverlay) chartOverlay.style.display = 'none';
        chartVisible = false;
        chartBtn.textContent = '📖 图鉴';
      }
    });

    actionsArea.appendChild(chartBtn);
  }

  // 提交按钮
  const submitBtn = document.createElement('button');
  submitBtn.className = 'rui-submit-btn';
  submitBtn.type = 'button';
  submitBtn.textContent = '✔ 提交答案';
  submitBtn.title = '提交已选中的小马（快捷键 Enter）';

  submitBtn.addEventListener('click', () => {
    const selected = collectSelected(state);
    submitRiddle(state, selected);
  });

  actionsArea.appendChild(submitBtn);
  root.appendChild(actionsArea);

  // ── 关闭按钮行为: 隐藏根元素(不卸载, 快捷键保持) ─────────────────────────
  closeBtn.addEventListener('click', () => {
    btnsArea.style.display = btnsArea.style.display === 'none' ? '' : 'none';
    actionsArea.style.display = actionsArea.style.display === 'none' ? '' : 'none';
    closeBtn.textContent = btnsArea.style.display === 'none' ? '⬜' : '✕';
  });

  // ── 挂载到页面 ────────────────────────────────────────────────────────────
  try {
    (document.body || document.documentElement).appendChild(root);
  } catch {
    // 防御: DOM 写入失败时卸载已创建内容
    if (timerInterval !== null) clearInterval(timerInterval);
    return () => {};
  }

  // ── 快捷键绑定(仅 cfg.riddleHotkeys 开启) ────────────────────────────────
  const keydownHandler = (e: KeyboardEvent): void => {
    // 如果焦点在输入框内则不拦截(防止干扰页面其他输入)
    const target = e.target as HTMLElement | null;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const action = mapRiddleKey(e.key, state.options.length);

    switch (action.kind) {
      case 'toggle': {
        const idx = action.index;
        const opt = state.options[idx];
        const btn = ponyBtns[idx];
        if (opt && btn) {
          toggleOption(opt, btn);
          e.preventDefault();
        }
        break;
      }
      case 'submit': {
        // 同步一次按钮高亮再提交(防止外部操作导致状态不一致)
        syncBtnHighlights(state.options, ponyBtns);
        const selected = collectSelected(state);
        submitRiddle(state, selected);
        e.preventDefault();
        break;
      }
      case 'mute': {
        // 静音: 折叠浮层(UI 消失但快捷键保留)
        try {
          const isVisible = root.style.display !== 'none';
          root.style.display = isVisible ? 'none' : '';
          // console.debug('[hvab-riddle] mute → UI', isVisible ? 'hidden' : 'shown');
        } catch {
          // 防御
        }
        e.preventDefault();
        break;
      }
      case 'none':
      default:
        break;
    }
  };

  if (cfg.riddleHotkeys) {
    try {
      document.addEventListener('keydown', keydownHandler);
    } catch {
      // 防御
    }
  }

  // ── 旧实例通知处理(监听 hvab-unmount, 避免 GC 泄漏) ─────────────────────
  // 注: 此事件由下一次 mountRiddleUI 在卸载旧实例时派发
  root.addEventListener(
    'hvab-unmount',
    () => {
      // 清理定时器和监听器(DOM 移除由调用方负责)
      if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      if (cfg.riddleHotkeys) {
        try {
          document.removeEventListener('keydown', keydownHandler);
        } catch {
          // 防御
        }
      }
    },
    { once: true },
  );

  // ── 返回卸载函数 ──────────────────────────────────────────────────────────
  return function unmount(): void {
    // 1. 停止倒计时定时器
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    // 2. 解绑键盘监听
    if (cfg.riddleHotkeys) {
      try {
        document.removeEventListener('keydown', keydownHandler);
      } catch {
        // 防御
      }
    }

    // 3. 移除浮层 DOM
    try {
      root.remove();
    } catch {
      // 防御
    }

    // 4. 移除图鉴浮层
    if (chartOverlay) {
      try {
        chartOverlay.remove();
      } catch {
        // 防御
      }
      chartOverlay = null;
    }
    const orphanChart = document.getElementById(CHART_ID);
    if (orphanChart) {
      try {
        orphanChart.remove();
      } catch {
        // 防御
      }
    }
  };
}
