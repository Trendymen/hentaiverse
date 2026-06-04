import { el } from '../core/dom';

// 可复用控件: 随里程碑补全(开关/滑块/数字框). M1 先提供占位 section 容器.
export function section(title: string): HTMLElement {
  return el('div', { class: 'hvab-section' }, `<div class="hvab-empty">${title} · 待 M2+ 接入配置项</div>`);
}
