// 战斗日志视图: 右下弹出可滚动面板, 场中实时刷 + 场后回查, 带 复制/导出/清空.
import { el } from '../core/dom';
import { bus } from '../core/bus';
import { logger, fmtLine } from '../core/logger';

function copyText(t: string): void {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      /* ignore */
    }
    ta.remove();
  };
  try {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).catch(fallback);
    else fallback();
  } catch {
    fallback();
  }
}

function downloadText(t: string): void {
  const blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hv-battlelog.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 战斗日志面板. 默认隐藏, 由 HUD 的 📋 切换. */
export function createLogView(): HTMLElement {
  const box = el('div', { id: 'hvab-log' });
  box.innerHTML = `
    <div class="hvab-log-hd">
      <b>📋 战斗日志 <span id="hvab-log-n">0</span></b>
      <span class="hvab-log-btns">
        <button id="hvab-log-copy" title="整段复制到剪贴板">复制</button>
        <button id="hvab-log-exp" title="导出为 .txt">导出</button>
        <button id="hvab-log-clr" title="清空日志">清空</button>
        <button id="hvab-log-x" title="关闭">✕</button>
      </span>
    </div>
    <div class="hvab-log-body" id="hvab-log-body"></div>`;

  const body = box.querySelector<HTMLElement>('#hvab-log-body')!;
  const nEl = box.querySelector<HTMLElement>('#hvab-log-n')!;

  const renderAll = (): void => {
    body.textContent = logger.toText();
    nEl.textContent = String(logger.count());
    body.scrollTop = body.scrollHeight;
  };

  // 实时追加(仅在面板可见时渲染, 省性能; 打开时全量渲染)
  bus.on('log:update', (r) => {
    if (box.style.display !== 'flex') return;
    if (r === null) {
      renderAll();
      return;
    }
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
    body.appendChild(document.createTextNode(fmtLine(r) + '\n'));
    nEl.textContent = String(logger.count());
    if (atBottom) body.scrollTop = body.scrollHeight;
  });

  box.querySelector<HTMLButtonElement>('#hvab-log-copy')!.onclick = () => copyText(logger.toText());
  box.querySelector<HTMLButtonElement>('#hvab-log-exp')!.onclick = () => downloadText(logger.toText());
  box.querySelector<HTMLButtonElement>('#hvab-log-clr')!.onclick = () => {
    logger.clear();
    renderAll();
  };
  box.querySelector<HTMLButtonElement>('#hvab-log-x')!.onclick = () => toggleLog(box, false);

  (box as unknown as { _renderAll: () => void })._renderAll = renderAll;
  return box;
}

/** 展开/收起日志面板. */
export function toggleLog(box: HTMLElement, open?: boolean): void {
  const show = open ?? box.style.display !== 'flex';
  box.style.display = show ? 'flex' : 'none';
  if (show) (box as unknown as { _renderAll?: () => void })._renderAll?.();
}
