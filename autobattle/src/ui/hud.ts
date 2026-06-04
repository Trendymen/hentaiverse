import { el } from '../core/dom';
import { bus } from '../core/bus';
import { config } from '../core/config';
import type { VitalSnapshot } from '../types';

/** 右下常驻 HUD. onToggle: 点开关回调; onGear: 点齿轮回调. */
export function createHud(onToggle: () => void, onGear: () => void): HTMLElement {
  const hud = el('div', { id: 'hvab-hud' });
  const bar = (id: string, name: string) =>
    `<div class="hvab-bar"><i id="hvab-${id}"></i><span id="hvab-${id}t">${name} -</span></div>`;
  hud.innerHTML = `
    <div class="hvab-top">
      <button id="hvab-sw"></button>
      <b class="hvab-name">🛡 盾战大脑</b>
      <button id="hvab-gear">⚙</button>
    </div>
    ${bar('hp', 'HP')}${bar('mp', 'MP')}${bar('sp', 'SP')}${bar('oc', 'OC')}
    <div style="font-size:10px;opacity:.7;margin-top:4px">怪 - · 待 M2 接入决策</div>`;

  const sw = hud.querySelector<HTMLButtonElement>('#hvab-sw')!;
  const refresh = () => {
    const on = config.get('enabled');
    sw.textContent = on ? '🧠 自动' : '⏸ 暂停';
    sw.style.background = on ? '#3a7' : '#a55';
  };
  sw.onclick = () => {
    onToggle();
    refresh();
  };
  hud.querySelector<HTMLButtonElement>('#hvab-gear')!.onclick = onGear;
  refresh();

  // M2 接入: 订阅状态更新填 vital 条; M1 仅注册占位避免遗漏
  bus.on('state:update', (v: VitalSnapshot) => {
    void v;
  });
  return hud;
}
