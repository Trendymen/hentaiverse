import { CSS } from './ui/styles';
import { el, onReady } from './core/dom';
import { createHud } from './ui/hud';
import { createPanel, togglePanel } from './ui/panel';
import { createLogView, toggleLog } from './ui/log';
import { config } from './core/config';
import { logger } from './core/logger';
import { bus } from './core/bus';
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
      if (/\/json|Battle|api/i.test(this.__url || '')) lastBattleResponse = this.responseText; // HV 战斗 endpoint 实测 = POST /json(原 /Battle|api/ 不匹配 → 捕获不到)
    });
    return xs.call(this, body);
  };

  const f = window.fetch;
  if (f) {
    window.fetch = function (...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
      const first = args[0];
      const url = typeof first === 'string' ? first : first instanceof Request ? first.url : String(first);
      return f.apply(window, args).then((rp) => {
        if (/\/json|Battle|api/i.test(url)) {
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
  const logView = createLogView();
  const hud = createHud(
    () => {
      config.set('enabled', !config.get('enabled'));
    },
    () => {
      const open = !panel.classList.contains('open');
      togglePanel(panel, open);
      config.set('panelOpen', open);
    },
    () => {
      const open = logView.style.display !== 'flex';
      toggleLog(logView, open);
      config.set('logOpen', open); // 点📋 = 记忆打开/关闭状态
    },
  );

  root.appendChild(hud);
  root.appendChild(panel);
  root.appendChild(logView);
  document.body.appendChild(root);

  if (config.get('panelOpen')) togglePanel(panel, true);

  // 日志窗口随战斗开关(loop emit battle:active, 退出已去抖): 进战斗+记忆打开→自动开(靠首次 tick, 不挂载主动开 —
  //   挂载立即开会跟整页 reload 重建同帧→闪, 见 57f0504 无闪对比); 真退出战斗→关窗口+清记忆(用户选定)
  bus.on('battle:active', (active) => {
    if (active) {
      if (config.get('logOpen')) toggleLog(logView, true);
    } else {
      toggleLog(logView, false);
      config.set('logOpen', false);
    }
  });
}

// 调试接口: 挂到 unsafeWindow(页面世界), devtools/console 与外部脚本可直接读 __hvab.log()/logText()/getLastBattle()
{
  const w = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as unknown as { __hvab: unknown };
  w.__hvab = {
    getLastBattle: () => lastBattleResponse,
    config,
    log: () => logger.all(),
    logText: () => logger.toText(),
    clearLog: () => logger.clear(),
  };
}

// ── 入口 ──
hookNet(); // document-start: 立即 hook, 早于一切业务请求
window.addEventListener('beforeunload', () => logger.flush()); // reload/关页前落盘: 通用兜底所有未落盘缓冲(continue/手动刷新/GF跳轮/退出皆 reload)
onReady(() => {
  mountUI(); // body 就绪后挂载 UI
  startLoop(); // 启动战斗轮询(内部判断 enabled/inBattle, 暂停时不出招)
});
