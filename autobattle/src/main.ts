import { CSS } from './ui/styles';
import { el, onReady } from './core/dom';
import { createHud } from './ui/hud';
import { createPanel, togglePanel } from './ui/panel';
import { config } from './core/config';
import { startLoop } from './loop';

// ── document-start: 最早 hook XHR/fetch 旁路(只读不改) ──
// 在 HV 的 battle 对象绑定发送引用之前注入, 才能捕获战斗响应(M2 解析 buff 剩余回合/精确斗气).
let lastBattleResponse: string | null = null;

function hookNet(): void {
  const xo = XMLHttpRequest.prototype.open;
  const xs = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest & { __url?: string }, _method: string, url: string | URL) {
    this.__url = String(url);
    return (xo as (this: XMLHttpRequest, ...args: unknown[]) => void).apply(this, arguments as unknown as unknown[]);
  };
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest & { __url?: string }, body?: Document | XMLHttpRequestBodyInit | null) {
    this.addEventListener('load', () => {
      if (/Battle|api/i.test(this.__url || '')) lastBattleResponse = this.responseText;
    });
    return xs.call(this, body);
  };

  const f = window.fetch;
  if (f) {
    window.fetch = function (...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
      const first = args[0];
      const url = typeof first === 'string' ? first : first instanceof Request ? first.url : String(first);
      return f.apply(window, args).then((rp) => {
        if (/Battle|api/i.test(url)) {
          rp.clone()
            .text()
            .then((t) => {
              lastBattleResponse = t;
            })
            .catch(() => {});
        }
        return rp;
      });
    };
  }
}

// 挂载现代界面(右下常驻 HUD + 抽屉)
function mountUI(): void {
  if (document.getElementById('hvab-root')) return;
  const root = el('div', { id: 'hvab-root' });
  const style = el('style');
  style.textContent = CSS;
  root.appendChild(style);

  const panel = createPanel();
  const hud = createHud(
    () => {
      config.set('enabled', !config.get('enabled'));
    },
    () => {
      const open = !panel.classList.contains('open');
      togglePanel(panel, open);
      config.set('panelOpen', open);
    },
  );

  root.appendChild(hud);
  root.appendChild(panel);
  document.body.appendChild(root);

  if (config.get('panelOpen')) togglePanel(panel, true);
}

// 调试接口(产物未压缩, devtools 可直接调用 window.__hvab.getLastBattle())
(window as unknown as { __hvab: unknown }).__hvab = {
  getLastBattle: () => lastBattleResponse,
  config,
};

// ── 入口 ──
hookNet(); // document-start: 立即 hook, 早于一切业务请求
onReady(() => {
  mountUI(); // body 就绪后挂载 UI
  startLoop(); // 启动战斗轮询(内部判断 enabled/inBattle, 暂停时不出招)
});
