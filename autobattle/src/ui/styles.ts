// 注入 CSS: 深色半透明 / 圆角 / blur. M1 给 HUD + 抽屉骨架样式.
export const CSS = `
#hvab-root{position:fixed;right:10px;bottom:10px;z-index:99999;width:240px;font:14px/1.4 system-ui,-apple-system,sans-serif;color:#dce3f0}
#hvab-hud{background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;box-shadow:0 6px 22px rgba(0,0,0,.5)}
#hvab-hud .hvab-top{display:flex;align-items:center;gap:7px;margin-bottom:6px}
#hvab-hud .hvab-name{flex:1;font-size:14px;opacity:.92}
#hvab-sw{cursor:pointer;border:0;border-radius:6px;padding:3px 10px;font:bold 14px system-ui;color:#fff;background:#a55}
#hvab-gear{cursor:pointer;border:0;background:none;color:#9aa;font-size:14px;padding:0}
.hvab-bar{position:relative;height:18px;background:rgba(255,255,255,.08);border-radius:7px;margin:3px 0;overflow:hidden}
.hvab-bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:7px;transition:width .25s}
#hvab-hp{background:#4caf50}#hvab-mp{background:#3b82f6}#hvab-sp{background:#ef4444}#hvab-oc{background:#f59e0b}
.hvab-bar span{position:absolute;inset:0;text-align:center;font:14px/18px monospace;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.7)}
#hvab-panel{margin-top:8px;background:rgba(22,24,36,.94);backdrop-filter:blur(8px);border:1px solid rgba(120,140,200,.3);border-radius:12px;padding:8px 10px;display:none;height:min(540px,calc(100vh - 180px));overflow-y:auto;overscroll-behavior:contain}
#hvab-panel{scrollbar-width:thin;scrollbar-color:rgba(140,160,220,.5) transparent}
#hvab-panel::-webkit-scrollbar{width:8px}
#hvab-panel::-webkit-scrollbar-track{background:transparent;margin:6px 0}
#hvab-panel::-webkit-scrollbar-thumb{background:rgba(140,160,220,.4);border-radius:10px;border:2px solid transparent;background-clip:padding-box;transition:background .2s}
#hvab-panel::-webkit-scrollbar-thumb:hover{background:rgba(165,185,240,.7);background-clip:padding-box}
#hvab-panel.open{display:block}
.hvab-tabs{display:flex;gap:4px;position:sticky;top:0;z-index:5;margin:0 0 8px;padding-bottom:8px;background:rgba(22,24,36,.98)}
.hvab-tab{flex:1;cursor:pointer;border:0;border-radius:6px;padding:4px 0;font-size:14px;background:rgba(255,255,255,.08);color:#bcd}
.hvab-tab.active{background:#3a7;color:#fff}
.hvab-tabpane{display:none}
.hvab-tabpane.active{display:block}
.hvab-empty{opacity:.5;font-size:14px;padding:10px 0;text-align:center}
.hvab-info{margin-top:5px;font-size:14px;line-height:1.5;opacity:.82;text-align:center}
#hvab-meta1{opacity:.75;letter-spacing:.3px}
#hvab-meta2{font-weight:600}
.hvab-grp{margin-bottom:8px}
.hvab-gh{font-size:14px;letter-spacing:.5px;opacity:.5;margin:4px 0 3px}
.hvab-row{display:flex;align-items:center;justify-content:space-between;font-size:14px;padding:2px 0;gap:6px}
.hvab-row>span:first-child{flex:1;opacity:.85}
.hvab-in{opacity:.8;display:inline-flex;align-items:center;gap:2px}
.hvab-in em{font-style:normal;opacity:.55;font-size:14px}
.hvab-row input[type=number]{width:46px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#fff;font:14px monospace;padding:1px 4px;text-align:right}
.hvab-row input[type=checkbox]{accent-color:#3a7;width:15px;height:15px;cursor:pointer}
#hvab-logbtn{cursor:pointer;border:0;background:none;color:#9aa;font-size:14px;padding:0}
#hvab-log{position:fixed;right:10px;bottom:10px;z-index:100000;width:min(480px,92vw);max-height:74vh;flex-direction:column;background:rgba(16,18,28,.975);backdrop-filter:blur(9px);border:1px solid rgba(120,140,200,.38);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.6);display:none;color:#dce3f0}
.hvab-log-hd{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.1);flex:0 0 auto;font-size:14px}
.hvab-log-btns button{cursor:pointer;border:0;border-radius:5px;margin-left:4px;padding:3px 8px;font-size:14px;background:rgba(255,255,255,.12);color:#cde}
.hvab-log-btns #hvab-log-clr{background:#a55;color:#fff}
.hvab-log-btns #hvab-log-x{background:none;color:#9aa;font-size:14px;padding:2px 4px}
.hvab-log-body{flex:1 1 auto;overflow:auto;padding:6px 10px;white-space:pre-wrap;word-break:break-word;font:14px/1.5 ui-monospace,Consolas,monospace;color:#bcd}
`;
