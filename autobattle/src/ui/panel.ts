import { el } from '../core/dom';
import { group, pctRow, numRow, swRow, section } from './components';
import { config } from '../core/config';

const TABS = [
  { key: 'battle', label: '战斗' },
  { key: 'farm', label: '连刷' },
  { key: 'guard', label: '保护' },
  { key: 'notify', label: '提醒' },
] as const;

/** 战斗 tab: 接入 M2 决策配置 */
function battlePane(): HTMLElement {
  const p = el('div');
  p.appendChild(group('喝药线(低于即补)', pctRow('PANIC_RED', '急救血'), pctRow('HP_HEAL', '常规喝血'), pctRow('MP_LOW', '回蓝'), pctRow('SP_LOW', '喝灵力')));
  p.appendChild(group('灵动架式(斗气)', pctRow('OC_ON', '≥ 开'), pctRow('OC_OFF', '< 关')));
  p.appendChild(group('开关', swRow('useCannon', '自动小马炮'), swRow('scrollFirst', '起手用卷轴'), swRow('useWeaken', '红怪铺虚弱'), swRow('useImperil', '红怪铺陷危'), swRow('useChanneling', 'Channeling 增益'), swRow('useAbsorb', '法系怪吸收墙')));
  p.appendChild(group('OC 近战技(非炮场景)', swRow('useVitalStrike', '要害强击'), swRow('useShieldBash', '盾击晕眩'), swRow('useMercifulBlow', '慈悲处决(待HP%)')));
  p.appendChild(group('节奏', numRow('delayMin', '延迟下限', 'ms'), numRow('delayMax', '延迟上限', 'ms')));
  p.appendChild(group('进阶(谨慎改)', numRow('SPARK_RESERVE', 'Spark预留MP'), pctRow('BURST_EST', '暴击波预估'), pctRow('MP_FUSE', 'MP熔断线'), numRow('HS_MIN_ENEMIES', '觅心最少怪'), numRow('CANNON_MIN_ENEMIES', '炮最少怪')));
  return p;
}

function paneFor(key: string): HTMLElement {
  switch (key) {
    case 'battle':
      return battlePane();
    case 'farm':
      return section('连刷(遭遇 / 竞技场 / GF) · 待 M3 接入');
    case 'guard':
      return section('保护后勤(精力 / 无响应 / 修复 / 库存) · 待 M4 接入');
    default:
      return section('提醒杂项(告警 / 异世界 / 小马) · 待 M5 接入');
  }
}

/** 抽屉设置面板: 四 tab 切换, 战斗 tab 已接入配置, 其余占位 */
export function createPanel(): HTMLElement {
  const panel = el('div', { id: 'hvab-panel' });
  const tabs = el('div', { class: 'hvab-tabs' });
  const panes = el('div', { class: 'hvab-panes' });
  let active: string = config.get('activeTab');

  const render = () => {
    tabs.querySelectorAll('.hvab-tab').forEach((b) => b.classList.toggle('active', (b as HTMLElement).dataset.tab === active));
    panes.querySelectorAll('.hvab-tabpane').forEach((p) => p.classList.toggle('active', (p as HTMLElement).dataset.pane === active));
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
    pane.appendChild(paneFor(t.key));
    panes.appendChild(pane);
  }

  panel.appendChild(tabs);
  panel.appendChild(panes);
  render();
  return panel;
}

/** 展开/收起抽屉 */
export function togglePanel(panel: HTMLElement, open?: boolean): void {
  panel.classList.toggle('open', open);
}
