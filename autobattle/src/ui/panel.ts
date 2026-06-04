import { el } from '../core/dom';
import { section } from './components';
import { config } from '../core/config';

const TABS = [
  { key: 'battle', label: '战斗' },
  { key: 'farm', label: '连刷' },
  { key: 'guard', label: '保护' },
  { key: 'notify', label: '提醒' },
] as const;

/** 抽屉设置面板 (M1 空壳: 四 tab 切换 + 占位). */
export function createPanel(): HTMLElement {
  const panel = el('div', { id: 'hvab-panel' });
  const tabs = el('div', { class: 'hvab-tabs' });
  const panes = el('div', { class: 'hvab-panes' });
  let active: string = config.get('activeTab');

  const render = () => {
    tabs.querySelectorAll('.hvab-tab').forEach((b) =>
      b.classList.toggle('active', (b as HTMLElement).dataset.tab === active),
    );
    panes.querySelectorAll('.hvab-tabpane').forEach((p) =>
      p.classList.toggle('active', (p as HTMLElement).dataset.pane === active),
    );
  };

  for (const t of TABS) {
    const btn = el('button', { class: 'hvab-tab', 'data-tab': t.key }, t.label);
    btn.onclick = () => {
      active = t.key;
      config.set('activeTab', t.key);
      render();
    };
    tabs.appendChild(btn);

    const pane = el('div', { class: 'hvab-tabpane', 'data-pane': t.key });
    pane.appendChild(section(t.label));
    panes.appendChild(pane);
  }

  panel.appendChild(tabs);
  panel.appendChild(panes);
  render();
  return panel;
}

/** 展开/收起抽屉. */
export function togglePanel(panel: HTMLElement, open?: boolean): void {
  panel.classList.toggle('open', open);
}
