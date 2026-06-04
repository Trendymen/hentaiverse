// DOM 工具: 选择器 / 建元素 / DOM-ready.
export const $ = <E extends Element = Element>(sel: string, root: ParentNode = document): E | null =>
  root.querySelector<E>(sel);

export const $$ = <E extends Element = Element>(sel: string, root: ParentNode = document): E[] =>
  [...root.querySelectorAll<E>(sel)];

/** 建元素 + 批量属性 + innerHTML. */
export function el(tag: string, attrs: Record<string, string> = {}, html = ''): HTMLElement {
  const e = document.createElement(tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (html) e.innerHTML = html;
  return e;
}

/** document-start 注入下安全等待 body 就绪. */
export function onReady(fn: () => void): void {
  if (document.body) fn();
  else document.addEventListener('DOMContentLoaded', fn, { once: true });
}
