// 注入 CSS: 深色半透明 / 圆角 / blur. M1 给 HUD + 抽屉骨架样式.
export const CSS = `
#hvab-root{position:fixed;right:10px;bottom:10px;z-index:99999;width:204px;font:12px/1.4 system-ui,-apple-system,sans-serif;color:#dce3f0}
#hvab-hud{background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;box-shadow:0 6px 22px rgba(0,0,0,.5)}
#hvab-hud .hvab-top{display:flex;align-items:center;gap:7px;margin-bottom:6px}
#hvab-hud .hvab-name{flex:1;font-size:12px;opacity:.92}
#hvab-sw{cursor:pointer;border:0;border-radius:6px;padding:3px 10px;font:bold 12px system-ui;color:#fff;background:#a55}
#hvab-gear{cursor:pointer;border:0;background:none;color:#9aa;font-size:14px;padding:0}
.hvab-bar{position:relative;height:14px;background:rgba(255,255,255,.08);border-radius:7px;margin:3px 0;overflow:hidden}
.hvab-bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:7px;transition:width .25s}
#hvab-hp{background:#4caf50}#hvab-mp{background:#3b82f6}#hvab-sp{background:#ef4444}#hvab-oc{background:#f59e0b}
.hvab-bar span{position:absolute;inset:0;text-align:center;font:10px/14px monospace;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.7)}
#hvab-panel{margin-top:8px;background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;display:none}
#hvab-panel.open{display:block}
.hvab-tabs{display:flex;gap:4px;margin-bottom:8px}
.hvab-tab{flex:1;cursor:pointer;border:0;border-radius:6px;padding:4px 0;font-size:11px;background:rgba(255,255,255,.08);color:#bcd}
.hvab-tab.active{background:#3a7;color:#fff}
.hvab-tabpane{display:none}
.hvab-tabpane.active{display:block}
.hvab-empty{opacity:.5;font-size:11px;padding:10px 0;text-align:center}
.hvab-info{margin-top:5px;font-size:10px;line-height:1.5;opacity:.82;text-align:center}
#hvab-meta1{opacity:.75;letter-spacing:.3px}
#hvab-meta2{font-weight:600}
`;
