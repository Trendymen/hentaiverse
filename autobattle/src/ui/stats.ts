// A 收益统计面板. 订阅 battle:end 自刷(仅可见时). 复用 group/components.
import { el } from '../core/dom';
import { bus } from '../core/bus';
import { Store } from '../core/store';
import type { StatsAccum } from '../types';

function rows(title: string, obj: Record<string, number>): string {
  const items = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  if (!items.length) return '';
  return `<div class="hvab-gh">${title}</div>` + items.map(([k, v]) => `<div class="hvab-row"><span>${k}</span><span>${v}</span></div>`).join('');
}

export function statsPane(): HTMLElement {
  const p = el('div', { id: 'hvab-stats-pane' });
  const render = () => {
    const s = Store.get<StatsAccum | null>('stats', null);
    if (!s) { p.innerHTML = '<div class="hvab-empty">暂无记录 · 打一场即出</div>'; return; }
    const h = Math.max(0.001, (Date.now() - s.startTime) / 3600000);
    p.innerHTML =
      `<div class="hvab-gh">收益(本会话)</div>` +
      `<div class="hvab-row"><span>EXP</span><span>${s.exp} (${Math.round(s.exp / h)}/h)</span></div>` +
      `<div class="hvab-row"><span>Credit</span><span>${s.credit} (${Math.round(s.credit / h)}/h)</span></div>` +
      `<div class="hvab-row"><span>场次/回合/怪</span><span>${s.battles}/${s.rounds}/${s.monsters}</span></div>` +
      rows('掉落', s.drops) + rows('技能次数', s.magic) + rows('物品次数', s.items) + rows('伤害', s.damage) + rows('回复', s.restore) +
      `<div class="hvab-gh">受伤</div><div class="hvab-row"><span>总/物理均/魔法均</span><span>${s.hurt.total}/${Math.round(s.hurt.pavg)}/${Math.round(s.hurt.mavg)}</span></div>`;
  };
  render();
  bus.on('battle:end', () => { if (p.offsetParent) render(); }); // 仅可见时刷
  return p;
}
