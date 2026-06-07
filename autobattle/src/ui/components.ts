import { el } from '../core/dom';
import { config, type Config } from '../core/config';

// UI 层动态 key 读写配置. set 经 unknown 中转绕过泛型约束(运行时 next[key]=val 正常).
function writeCfg(key: keyof Config, val: number | boolean | string): void {
  (config.set as unknown as (k: keyof Config, v: unknown) => void)(key, val);
}

/** 配置分组容器 */
export function group(title: string, ...rows: HTMLElement[]): HTMLElement {
  const g = el('div', { class: 'hvab-grp' });
  g.appendChild(el('div', { class: 'hvab-gh' }, title));
  rows.forEach((r) => g.appendChild(r));
  return g;
}

/** 百分比行(config 存 0-1, UI 显示/编辑 0-100) */
export function pctRow(key: keyof Config, label: string): HTMLElement {
  const row = el('label', { class: 'hvab-row' }, `<span>${label}</span><span class="hvab-in"><input type="number" min="0" max="100" step="1"><em>%</em></span>`);
  const input = row.querySelector<HTMLInputElement>('input')!;
  input.value = String(Math.round(Number(config.get(key)) * 100));
  input.onchange = () => writeCfg(key, (parseFloat(input.value) || 0) / 100);
  return row;
}

/** 数字行(整数 / 毫秒等) */
export function numRow(key: keyof Config, label: string, unit = ''): HTMLElement {
  const row = el('label', { class: 'hvab-row' }, `<span>${label}</span><span class="hvab-in"><input type="number" step="1"><em>${unit}</em></span>`);
  const input = row.querySelector<HTMLInputElement>('input')!;
  input.value = String(Number(config.get(key)));
  input.onchange = () => writeCfg(key, parseFloat(input.value) || 0);
  return row;
}

/** 文本行(逗号串等字符串配置). */
export function textRow(key: keyof Config, label: string, hint = ''): HTMLElement {
  const row = el('label', { class: 'hvab-row' }, `<span>${label}</span><span class="hvab-in"><input type="text"><em>${hint}</em></span>`);
  const input = row.querySelector<HTMLInputElement>('input')!;
  input.value = String(config.get(key) ?? '');
  input.onchange = () => writeCfg(key, input.value.trim());
  return row;
}

/** 开关行 */
export function swRow(key: keyof Config, label: string): HTMLElement {
  const row = el('label', { class: 'hvab-row' }, `<span>${label}</span><input type="checkbox">`);
  const input = row.querySelector<HTMLInputElement>('input')!;
  input.checked = Boolean(config.get(key));
  input.onchange = () => writeCfg(key, input.checked);
  return row;
}

/** 占位(未接入的 tab) */
export function section(title: string): HTMLElement {
  return el('div', { class: 'hvab-section' }, `<div class="hvab-empty">${title}</div>`);
}
