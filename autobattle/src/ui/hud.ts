import { el } from '../core/dom';
import { bus } from '../core/bus';
import { config } from '../core/config';

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
    <div class="hvab-info">
      <div id="hvab-meta1">待战斗</div>
      <div id="hvab-meta2">怪 - · ▶ -</div>
    </div>`;

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

  // 战斗循环每回合 emit hud:update → 更新 vital 条 + 战斗信息(类型/轮数/回合/怪数/动作)
  bus.on('hud:update', (d) => {
    const setBar = (key: string, v: number, m: number, name: string) => {
      const i = document.getElementById('hvab-' + key);
      const t = document.getElementById('hvab-' + key + 't');
      const p = isNaN(v) || !m ? 0 : Math.min(100, Math.round((v / m) * 100));
      if (i) i.style.width = p + '%';
      if (t) t.textContent = `${name} ${p}%`;
    };
    setBar('hp', d.hp, d.maxHp, 'HP');
    setBar('mp', d.mp, d.maxMp, 'MP');
    setBar('sp', d.sp, d.maxSp, 'SP');
    setBar('oc', d.oc, config.get('OCMAX'), 'OC');

    const m1 = document.getElementById('hvab-meta1');
    const m2 = document.getElementById('hvab-meta2');
    const round = d.roundAll ? ` R${d.roundNow}/${d.roundAll}` : '';
    if (m1) m1.textContent = `${d.battleType}${round} · T${d.turn}`;
    if (m2) m2.textContent = `怪 ${d.alive}/${d.monsterTotal} · ▶ ${d.action}`;
  });
  return hud;
}
