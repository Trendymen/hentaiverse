// ==UserScript==
// @name         [HV] 自动战斗 · 盾战大脑
// @namespace    https://github.com/local/hv-autobattle
// @version      0.1.0
// @author       local
// @description  HV 单手盾战现代化半自动辅助(独立重写,忠实翻写 dodying 引擎)
// @match        *://hentaiverse.org/*
// @match        *://alt.hentaiverse.org/*
// @match        *://e-hentai.org/*
// @connect      hentaiverse.org
// @connect      e-hentai.org
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const CSS = `
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
`;
  function el(tag, attrs = {}, html = "") {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html) e.innerHTML = html;
    return e;
  }
  function onReady(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }
  class Bus {
    constructor() {
      this.map = /* @__PURE__ */ new Map();
    }
    on(type, fn) {
      let set = this.map.get(type);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        this.map.set(type, set);
      }
      set.add(fn);
      return () => {
        var _a;
        (_a = this.map.get(type)) == null ? void 0 : _a.delete(fn);
      };
    }
    emit(type, payload) {
      var _a;
      (_a = this.map.get(type)) == null ? void 0 : _a.forEach((fn) => {
        try {
          fn(payload);
        } catch {
        }
      });
    }
  }
  const bus = new Bus();
  const PREFIX = "hvab_";
  const Store = {
    get(key, def) {
      try {
        if (typeof GM_getValue === "function") return GM_getValue(PREFIX + key, def);
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? def : JSON.parse(raw);
      } catch {
        return def;
      }
    },
    set(key, val) {
      try {
        if (typeof GM_setValue === "function") GM_setValue(PREFIX + key, val);
        else localStorage.setItem(PREFIX + key, JSON.stringify(val));
      } catch {
      }
    }
  };
  const DEFAULT_CONFIG = {
    enabled: false,
    // B大脑总开关 (🧠自动 / ⏸暂停)
    panelOpen: false,
    // 抽屉是否展开
    activeTab: "battle"
  };
  let current = { ...DEFAULT_CONFIG, ...Store.get("config", {}) };
  const config = {
    get(key) {
      return current[key];
    },
    set(key, val) {
      const next = { ...current };
      next[key] = val;
      current = next;
      Store.set("config", current);
    },
    all() {
      return current;
    }
  };
  function createHud(onToggle, onGear) {
    const hud = el("div", { id: "hvab-hud" });
    const bar = (id, name) => `<div class="hvab-bar"><i id="hvab-${id}"></i><span id="hvab-${id}t">${name} -</span></div>`;
    hud.innerHTML = `
    <div class="hvab-top">
      <button id="hvab-sw"></button>
      <b class="hvab-name">🛡 盾战大脑</b>
      <button id="hvab-gear">⚙</button>
    </div>
    ${bar("hp", "HP")}${bar("mp", "MP")}${bar("sp", "SP")}${bar("oc", "OC")}
    <div style="font-size:10px;opacity:.7;margin-top:4px">怪 - · 待 M2 接入决策</div>`;
    const sw = hud.querySelector("#hvab-sw");
    const refresh = () => {
      const on = config.get("enabled");
      sw.textContent = on ? "🧠 自动" : "⏸ 暂停";
      sw.style.background = on ? "#3a7" : "#a55";
    };
    sw.onclick = () => {
      onToggle();
      refresh();
    };
    hud.querySelector("#hvab-gear").onclick = onGear;
    refresh();
    bus.on("state:update", (v) => {
    });
    return hud;
  }
  function section(title) {
    return el("div", { class: "hvab-section" }, `<div class="hvab-empty">${title} · 待 M2+ 接入配置项</div>`);
  }
  const TABS = [
    { key: "battle", label: "战斗" },
    { key: "farm", label: "连刷" },
    { key: "guard", label: "保护" },
    { key: "notify", label: "提醒" }
  ];
  function createPanel() {
    const panel = el("div", { id: "hvab-panel" });
    const tabs = el("div", { class: "hvab-tabs" });
    const panes = el("div", { class: "hvab-panes" });
    let active = config.get("activeTab");
    const render = () => {
      tabs.querySelectorAll(".hvab-tab").forEach(
        (b) => b.classList.toggle("active", b.dataset.tab === active)
      );
      panes.querySelectorAll(".hvab-tabpane").forEach(
        (p) => p.classList.toggle("active", p.dataset.pane === active)
      );
    };
    for (const t of TABS) {
      const btn = el("button", { class: "hvab-tab", "data-tab": t.key }, t.label);
      btn.onclick = () => {
        active = t.key;
        config.set("activeTab", t.key);
        render();
      };
      tabs.appendChild(btn);
      const pane = el("div", { class: "hvab-tabpane", "data-pane": t.key });
      pane.appendChild(section(t.label));
      panes.appendChild(pane);
    }
    panel.appendChild(tabs);
    panel.appendChild(panes);
    render();
    return panel;
  }
  function togglePanel(panel, open) {
    panel.classList.toggle("open", open);
  }
  let lastBattleResponse = null;
  function hookNet() {
    const xo = XMLHttpRequest.prototype.open;
    const xs = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(_method, url) {
      this.__url = String(url);
      return xo.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
      this.addEventListener("load", () => {
        if (/Battle|api/i.test(this.__url || "")) lastBattleResponse = this.responseText;
      });
      return xs.call(this, body);
    };
    const f = window.fetch;
    if (f) {
      window.fetch = function(...args) {
        const first = args[0];
        const url = typeof first === "string" ? first : first instanceof Request ? first.url : String(first);
        return f.apply(window, args).then((rp) => {
          if (/Battle|api/i.test(url)) {
            rp.clone().text().then((t) => {
              lastBattleResponse = t;
            }).catch(() => {
            });
          }
          return rp;
        });
      };
    }
  }
  function mountUI() {
    if (document.getElementById("hvab-root")) return;
    const root = el("div", { id: "hvab-root" });
    const style = el("style");
    style.textContent = CSS;
    root.appendChild(style);
    const panel = createPanel();
    const hud = createHud(
      () => {
        config.set("enabled", !config.get("enabled"));
      },
      () => {
        const open = !panel.classList.contains("open");
        togglePanel(panel, open);
        config.set("panelOpen", open);
      }
    );
    root.appendChild(hud);
    root.appendChild(panel);
    document.body.appendChild(root);
    if (config.get("panelOpen")) togglePanel(panel, true);
  }
  window.__hvab = {
    getLastBattle: () => lastBattleResponse,
    config
  };
  hookNet();
  onReady(mountUI);

})();