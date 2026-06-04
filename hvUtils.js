// ==UserScript==
// @name           HV Utils
// @namespace      HVUT
// @description    A comprehensive out-of-battle script for Hentaiverse
// @homepageURL    https://forums.e-hentai.org/index.php?showtopic=211883
// @supportURL     https://forums.e-hentai.org/index.php?showtopic=211883
// @version        4.0.0
// @date           2025-11-15
// @author         sssss2
// @match          *://*.hentaiverse.org/*
// @match          *://e-hentai.org/*
// @connect        hentaiverse.org
// @connect        e-hentai.org
// @exclude        *://hentaiverse.org/equip/*
// @exclude        *://alt.hentaiverse.org/equip/*
// @exclude        *://hentaiverse.org/isekai/equip/*
// @exclude        *://alt.hentaiverse.org/isekai/equip/*
// @exclude        *://hentaiverse.org/isekai/*
// @exclude        *://alt.hentaiverse.org/isekai/*
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_deleteValue
// @grant          GM_addStyle
// @grant          GM_xmlhttpRequest
// @grant          GM_setClipboard
// @grant          unsafeWindow
// @run-at         document-end
// ==/UserScript==

const settings = {

  // [GENERAL]
  reNotification: true,
  reGallery: true,
  reGalleryAlt: false,
  reBeep: [0.2, 500, 0.5], // [volume, frequency, duration]

  topMenuIntegration: true,
  topMenuLinks: ['Character', 'Equipment', 'Item Inventory', 'Equip Inventory', 'Equipment Shop', 'Item Shop', 'The Market', 'Monster Lab', 'The Shrine', 'MoogleMail', 'The Arena', 'The Tower', 'Ring of Blood', 'GrindFest', 'Item World'],
  confirmStaminaRestorative: true,
  disableStaminaRestorative: 79,
  warnLowStamina: 10,

  showCredits: 0, // 0:disable, 2:always
  showEquipSlots: 1, // 0:disable, 1:on battle pages only, 2:always
  trainingNotification: true,
  lotteryNotification: true,
  translateNames: true,
  lotteryFilters: [
    'Rapier && Slaughter',
    'Ethereal && (Rapier || Wakizashi) && (Balance || Nimble)',
    'Wakizashi && Battlecaster',
    'Ethereal && (Axe || Club || Shortsword || Estoc || Katana || Longsword || Mace) && Slaughter',
    'Force Shield || Buckler && (Barrier || Battlecaster)',
    'Fiery && (Willow || Redwood) && (Destruction || Elementalist || Surtr)',
    'Arctic && (Willow || Redwood) && (Destruction || Elementalist || Niflheim)',
    'Shocking && (Willow || Redwood) && (Destruction || Elementalist || Mjolnir)',
    'Tempestuous && (Willow || Redwood) && (Destruction || Elementalist || Freyr)',
    'Hallowed && (Oak || Katalox) && (Destruction || Heaven-sent || Heimdall)',
    'Demonic && (Willow || Katalox) && (Destruction || Demon-fiend || Fenrir)',
    '(Radiant || Charged) && Phase',
    'Charged && (Elementalist || Heaven-sent || Demon-fiend)',
    '(Savage || Agile) && Shadowdancer',
    'Power && Slaughter',
    'Power && Savage && Balance',
  ],

  // [EQUIPMENT]
  equipInventoryIntegration: true,
  equipSort: true,
  equipColor: true,
  equipHoverFunctions: true,
  equipTouchFunctions: false,
  equipCode: '[{$_eid}] [url={$url}]{$namecode}[/url] ({$level?Lv.$level}{$soulbound?Soulbound}{$unassigned?Unassigned}, {$pab}{$note?, $note}){$price? @ $price}',
  equipNameCode: [
    'Peerless : quality=rainbow, name=bold',
    'Legendary : quality=#f90, quality=bold',
    'Magnificent : quality=#69f',
    'Exquisite : quality=#3c3',
    '(Rapier || Shortsword) && Slaughter : type=bold, suffix=bold ; Ethereal : prefix=#f00 ; (Hallowed || Demonic) : prefix=#f90',
    '(Club || Axe) && Slaughter && Ethereal : prefix=#f00, type=bold, suffix=bold',
    '(Rapier || Wakizashi) && (Balance || Nimble) && Ethereal : prefix=#f00, type=bold, suffix=bold',
    'Wakizashi && (Nimble || Battlecaster) && (Fiery || Arctic || Shocking || Tempestuous) : prefix=#f00, type=bold, suffix=bold',
    '(Estoc || Katana || Longsword || Mace) && Slaughter && Ethereal : prefix=#f00, type=bold, suffix=bold',
    'Oak && Hallowed && Heimdall : prefix=#f00, type=bold, suffix=bold',
    'Willow && (Shocking || Tempestuous || Demonic) && Destruction : prefix=#f00, type=bold, suffix=bold',
    'Katalox && Hallowed && (Destruction || Heimdall || Heaven-sent) : prefix=#f90, type=bold',
    'Katalox && Demonic && (Destruction || Fenrir || Demon-fiend) : prefix=#f90, type=bold',
    'Redwood && (Fiery || Arctic || Shocking || Tempestuous) && Destruction : prefix=#f00, type=bold, suffix=bold',
    'Redwood && (Fiery || Arctic || Shocking || Tempestuous) && Elementalist : prefix=#f90, type=bold',
    'Redwood && (Fiery && Surtr || Arctic && Niflheim || Shocking && Mjolnir || Tempestuous && Freyr) : prefix=#f90, type=bold',
    'Force Shield : type=bold ; Protection || Dampening || Deflection : suffix=bold',
    'Buckler && (Barrier || Battlecaster) : type=bold, suffix=bold ; Reinforced : prefix=#f90',
    'Phase : type=bold ; Radiant || Charged : prefix=#f00 ; Mystic || Frugal : prefix=#f90',
    'Cotton && (Elementalist || Heaven-sent || Demon-fiend) : suffix=bold ; Charged : prefix=#f00 ; Elementalist && Shoes || (Heaven-sent || Demon-fiend) && Robe : slot=bold',
    'Shade && Shadowdancer : type=bold, suffix=bold ; Savage : prefix=#f00 ; Agile : prefix=#f90',
    'Power : type=bold ; Savage : prefix=#f90 ; Slaughter : suffix=bold ; Savage && Slaughter : prefix=#f00',
    'Plate && Shielding : prefix=#f90',
  ],

  // [Equipment Shop]
  equipmentShopIntegration: true,
  equipmentShopShowLevel: true,
  equipmentShopShowPAB: true,
  equipmentShopConfirm: 1, // 0:disable, 1:confirm less-profitable actions, 2:always

  equipmentShopProtectFilters: [
    'Peerless',
    'Legendary',
    'Magnificent && (Rapier || Shortsword) && Slaughter',
    'Magnificent && (Force Shield || Buckler && Barrier)',
    'Magnificent && Fiery && Redwood && (Destruction || Elementalist || Surtr)',
    'Magnificent && Arctic && Redwood && (Destruction || Elementalist || Niflheim)',
    'Magnificent && Shocking && (Willow || Redwood) && (Destruction || Elementalist || Mjolnir)',
    'Magnificent && Tempestuous && (Willow || Redwood) && (Destruction || Elementalist || Freyr)',
    'Magnificent && Hallowed && (Oak || Katalox) && (Destruction || Heaven-sent || Heimdall)',
    'Magnificent && Demonic && (Willow || Katalox) && (Destruction || Demon-fiend || Fenrir)',
    'Magnificent && (Radiant || Charged) && Phase',
    'Magnificent && Charged && (Elementalist || Heaven-sent || Demon-fiend)',
    'Magnificent && (Savage || Agile) && Shadowdancer',
    'Magnificent && Power && Slaughter',
  ],
  equipmentShopAutoLock: true,

  equipmentShopBazaarFilters: [
    'Peerless',
    'Legendary',
    'Magnificent && Rapier && Slaughter',
    'Magnificent && (Force Shield || Buckler && Barrier)',
    'Magnificent && Fiery && Redwood && (Destruction || Elementalist || Surtr)',
    'Magnificent && Arctic && Redwood && (Destruction || Elementalist || Niflheim)',
    'Magnificent && Shocking && (Willow || Redwood) && (Destruction || Elementalist || Mjolnir)',
    'Magnificent && Tempestuous && (Willow || Redwood) && (Destruction || Elementalist || Freyr)',
    'Magnificent && Hallowed && (Oak || Katalox) && (Destruction || Heaven-sent || Heimdall)',
    'Magnificent && Demonic && (Willow || Katalox) && (Destruction || Demon-fiend || Fenrir)',
    'Magnificent && (Radiant || Charged) && Phase',
    'Magnificent && Charged && (Elementalist || Heaven-sent || Demon-fiend)',
    'Magnificent && (Savage || Agile) && Shadowdancer',
    'Magnificent && Power && Slaughter',
    '$Exquisite+ && (Rapier || Shortsword) && Slaughter && $prefix && $pab=sd && $level<250',
    '$Exquisite+ && Power && !Warding',
    '$Superior+ && (Force Shield || Buckler && Barrier || Kite Shield)',
    '$iw',
  ],

  monsterLab: true,
  monsterLabDefaultSort: 'index',

  shrineHideItems: ['Figurine', 'Peerless Voucher'],
  shrineFilters: ['Peerless', 'Legendary'],

  moogleMail: true,
  moogleMailCouponClipper: false,
  moogleMailDarkDescent: false,

  // [BATTLE]
  equipEnchantPosition: 'left',
  equipEnchantWeapon: 4,
  equipEnchantArmor: 3,
  equipEnchantRepairThreshold: 55,
  equipEnchantItemInventory: {
    'Health Draught': 200,
    'Mana Draught': 200,
    'Spirit Draught': 200,
    'Health Potion': 100,
    'Mana Potion': 100,
    'Spirit Potion': 100,
    'Health Elixir': 10,
    'Mana Elixir': 10,
    'Spirit Elixir': 10,
  },
  equipEnchantCheckArmors: false,

};

/* END OF SETTINGS */

/* eslint-disable arrow-spacing, block-spacing, comma-spacing, key-spacing, keyword-spacing, object-curly-spacing, space-before-blocks, space-before-function-paren, space-infix-ops, semi-spacing */
function $id(id,d) {return (d||document).getElementById(id);}
function $qs(q,d) {return (d||document).querySelector(q);}
function $qsa(q,d) {return Array.from((d||document).querySelectorAll(q));}
function $doc(h) {const d=document.implementation.createHTMLDocument('');d.documentElement.innerHTML=h;return d;}
function $element(t,p,a,f) {let e;if(t){e=document.createElement(t);}else if(t===''){e=document.createTextNode(a);a=null;}else{return document.createDocumentFragment();}if(a!==null&&a!==undefined){function ao(e,a){Object.entries(a).forEach(([an,av])=>{if(typeof av==='object'){let a;if(an in e){a=e[an];}else{e[an]={};a=e[an];}Object.entries(av).forEach(([an,av])=>{a[an]=av;});}else{if(an==='style'){e.style.cssText=av;}else if(an in e){e[an]=av;}else{e.setAttribute(an,av);}}});}function as(e,a){const an={'#':'id','.':'className','!':'style','/':'innerHTML'}[a[0]];if(an){e[an]=a.slice(1);}else if(a!==''){e.textContent=a;}}if(typeof a==='string'||typeof a==='number'){e.textContent=a;}else if(Array.isArray(a)){a.forEach((a)=>{if(typeof a==='string'||typeof a==='number'){as(e,a);}else if(typeof a==='object'){ao(e,a);}});}else if(typeof a==='object'){ao(e,a);}}if(f){if(typeof f==='function'){e.addEventListener('click',f);}else if(typeof f==='object'){Object.entries(f).forEach(([ft,fl])=>{e.addEventListener(ft,fl);});}}if(p){if(p.nodeType===1||p.nodeType===11){p.appendChild(e);}else if(Array.isArray(p)){if(['beforebegin','afterbegin','beforeend','afterend'].includes(p[1])){p[0].insertAdjacentElement(p[1],e);}else if(!isNaN(p[1])){p[0].insertBefore(e,p[0].childNodes[p[1]]);}else{p[0].insertBefore(e,p[1]);}}}return e;}
function $input(o,p,a,f) {if(typeof o==='string'){o=[o];}const [t,v,n,s]=o;if(!a){a={};}if(t==='select'){const i=$element('select',p,a,f);if(v){v.forEach((v)=>{v=split2(v,':');if(!v[1]){v[1]=v[0];}$element('option',i,{value:v[0],text:v[1]});});}return i;}a.type=t;if(v===undefined||v===null){const i=$element('input',p,a,f);return i;}else if(t==='button'||t==='submit'){a.value=v;const i=$element('input',p,a,f);return i;}else{const l=$element('label',p);const i=$element('input',l,a,f);if(s&&(t==='checkbox'||t==='radio')){$element('span',l);l.classList.add('hvut-label');}if(v){if(n==='before'){l.prepend(v,' ');}else{l.append(' ',v);}}return i;}}
function time_format(t,o) {t=Math.floor(t/1000);const h=Math.floor(t/3600).toString().padStart(2,'0');const m=Math.floor(t%3600/60).toString().padStart(2,'0');const s=(t%60).toString().padStart(2,'0');return !o?`${h}:${m}:${s}`:o===1?`${h}:${m}`:o===2?`${m}:${s}`:'';}
function object_sort(o,x=[]) {const index={};const _x=x.length+1;x.forEach((e,i)=>{index[e]=i+1;});Object.keys(o).sort((a,b)=>{const _a=index[a]||_x;const _b=index[b]||_x;return _a-_b||(a<b?-1:1);}).forEach((e)=>{const v=o[e];delete o[e];o[e]=v;});}
function split2(s,d,t=true) {let a;const p=s.indexOf(d);if(p===-1){a=[s];}else{const k=s.slice(0,p);const v=s.slice(p+1);a=[k,v];}if(t){a=a.map((e)=>e.trim());}return a;}
function scrollIntoView(e,p=e.parentNode) {p.scrollTop+=e.getBoundingClientRect().top-p.getBoundingClientRect().top;}
function confirm_event(n,e,m,c,f) {if(!n){return;}const a=n.getAttribute('on'+e);n.removeAttribute('on'+e);n.addEventListener(e,(e)=>{if(!c||c()){if(confirm(m)){if(f){f();}}else{e.preventDefault();e.stopImmediatePropagation();}}},true);n.setAttribute('on'+e,a);}
function toggle_button(e,s,h,t,c,d) {function f(){if(t.classList.contains(c)){t.classList.remove(c);e.value=h;}else{t.classList.add(c);e.value=s;}}e.value=h;e.addEventListener('click',f);if(d){f();}}
function play_beep(volume=0.2,frequency=500,duration=0.5) {const delay=1;if(!volume){return;}const c=new window.AudioContext();const o=c.createOscillator();const g=c.createGain();o.type='sine';o.frequency.value=frequency;g.gain.value=volume;o.connect(g);g.connect(c.destination);o.start(delay);o.stop(delay+duration);}
function popup(t) {function r(e){e.preventDefault();e.stopImmediatePropagation();if(e.button===0||e.key==='Enter'||e.key===' '||e.key==='Escape'){w.remove();document.removeEventListener('keydown',r);}}const w=$element('div',document.body,['!position:fixed;top:0;left:0;width:1236px;height:702px;padding:3px 100% 100% 3px;background-color:#0006;z-index:1001;cursor:pointer;display:flex;justify-content:center;align-items:center;'],r);const d=$element('div',w,['/'+t,'!min-width:400px;min-height:100px;max-width:100%;max-height:100%;padding:10px;background-color:#fff;border:1px solid;display:flex;flex-direction:column;justify-content:center;font-size:10pt;color:#333;']);document.addEventListener('keydown',r);return d;}
function popup_text(m,wd,ht,b=[]) {let v;if(typeof m==='string'){v=m;}else{v=m.join('\n');}const w=$element('div',document.body,['!position:fixed;top:0;left:0;width:1236px;height:702px;padding:3px 100% 100% 3px;background-color:#0006;z-index:1001;display:flex;justify-content:center;align-items:center;']);const d=$element('div',w,['!border:1px solid;padding:5px;background-color:#fff;']);const t=$element('textarea',d,{value:v,spellcheck:false,style:`display:block;margin:0 0 5px;font-size:9pt;line-height:1.5em;width:${wd}px;height:${ht}px;white-space:pre;`});function c(){w.remove();}b.forEach((o)=>{$element('input',d,{type:'button',value:o.text},()=>{if(o.click==='default'){t.value=o.value;}else if(o.click==='revert'){t.value=v;}else if(typeof o.click==='function'){o.click(p);}});});$element('input',d,{type:'button',value:'Close'},c);const p={wrapper:w,textarea:t,close:c};return p;}
function get_message(d,s) {if(typeof d==='string'){d=$doc(d);}const m=$qsa('#messagebox_inner>p',d).map((p)=>p.textContent);if(s){return m;}else{return m.join('\n');}}
/* eslint-enable */

const _window = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
const _query = Object.fromEntries(location.search.slice(1).split('&').map((q) => { const [k, v = ''] = q.split('=', 2); return [k, decodeURIComponent(v.replace(/\+/g, ' '))]; }));

// CONFIGURATION
const $config = {

  version: 1,
  ls_savelist: ['ch_style'],
  data: [
    { tag: 'h1', text: '随机遭遇' },
    { key: 'reNotification', type: 'boolean', label: '启用随机遭遇通知。' },
    { key: 'reGallery', type: 'boolean', label: '浏览画廊时也启用随机遭遇通知。' },
    { key: 'reGalleryAlt', type: 'boolean', label: '从画廊打开随机遭遇时跳转到 alt.hentaiverse.org。' },
    { key: 'reBeep', type: 'array', input: 'text', value_type: 'number', value_sep: ',', text: '随机遭遇就绪时播放提示音。\n数值顺序为 [音量]、[频率]、[时长]。\n设为 0 可禁用。', style: 'width: 150px;', oncreate: (o) => { $input(['button', '测试音效'], [o.node.input, 'afterend'], null, () => { const validation = $config.validate(o); if (!validation.error) { play_beep(...validation.value); } }); } },

    { tag: 'h1', text: '顶部导航栏' },
    { key: 'topMenuIntegration', type: 'boolean', label: '将顶部菜单整合为一个按钮。' },
    { key: 'topMenuLinks', type: 'array', input: 'textarea', text: '设置顶部的快捷链接。\n若上方 [topMenuIntegration] 已禁用,请将列表项数量设为 8 个或更少。' },
    { key: 'confirmStaminaRestorative', type: 'boolean', label: '使用耐力恢复剂前先确认。', disabled: 'isekai' },
    { key: 'disableStaminaRestorative', type: 'number', label: '当耐力高于指定值时禁用耐力恢复剂按钮。', disabled: 'isekai' },
    { key: 'warnLowStamina', type: 'number', label: '当耐力低于指定值时发出警告。' },

    { tag: 'h1', text: '底部栏' },
    { key: 'showCredits', type: 'number', input: 'select', options: ['0:禁用', '2:始终'], label: '显示绅士币余额。' },
    { key: 'showEquipSlots', type: 'number', input: 'select', options: ['0:禁用', '1:仅战斗页面', '2:始终'], label: '显示装备仓库的空闲格数。' },
    { key: 'trainingNotification', type: 'boolean', label: '显示进行中的训练,并自动开始下一项训练直到设定等级。' },
    { key: 'lotteryNotification', type: 'boolean', label: '显示当前抽奖中的武器和防具。' },
    { key: 'lotteryFilters', type: 'array', input: 'textarea', text: '当抽奖中的新装备符合条件时通知。\n* $pab 不可用。', desc: 'equipFilters', validator: 'equipFilters' },

    { tag: 'h1', text: '装备' },
    { key: 'equipInventoryIntegration', type: 'boolean', label: '在装备仓库中将所有类型的装备整合到一个列表。' },
    { key: 'equipSort', type: 'boolean', label: '对装备列表进行排序和分类。' },
    { key: 'equipColor', type: 'boolean', label: '按品质设置装备颜色。' },
    { key: 'translateNames', type: 'boolean', label: '将装备名/物品名显示为中文(彩票、战斗面板、列表等;英文原值仍用于筛选)。' },
    { key: 'equipHoverFunctions', type: 'boolean', label: '鼠标悬停在装备上时支持键盘和鼠标操作。' },
    { key: 'equipTouchFunctions', type: 'boolean', label: '在移动端支持触控操作' },
    { key: 'equipCode', type: 'string', input: 'textarea', text: '设置论坛代码的格式。', style: 'height: 80px; white-space: normal;' },
    { key: 'equipNameCode', type: 'array', input: 'textarea', text: '设置装饰装备名称的代码规则。' },

    { tag: 'h1', text: '装备店' },
    { key: 'equipmentShopIntegration', type: 'boolean', label: '在默认商店页面整合所有类型的装备。' },
    { key: 'equipmentShopShowLevel', type: 'boolean', label: '显示装备等级。' },
    { key: 'equipmentShopShowPAB', type: 'boolean', label: '显示装备的 PAB。' },
    { key: 'equipmentShopConfirm', type: 'number', input: 'select', options: ['0:禁用', '1:仅确认收益较低的操作', '2:始终'], label: '出售或分解装备时进行确认。' },
    { key: 'equipmentShopProtectFilters', type: 'array', input: 'textarea', text: '将贵重装备集中显示在列表顶部,并防止它们被「Select All」按钮选中。', desc: 'equipFilters', validator: 'equipFilters' },
    { key: 'equipmentShopAutoLock', type: 'boolean', label: '自动锁定受保护的装备。' },
    { key: 'equipmentShopBazaarFilters', type: 'array', input: 'textarea', text: '将贵重装备保留在 BAZAAR 中,然后隐藏其余所有垃圾装备。', desc: 'equipFilters', validator: 'equipFilters' },

    { tag: 'h1', text: '怪物实验室' },
    { key: 'monsterLab', type: 'boolean', label: '高级怪物实验室功能', disabled: 'isekai' },
    { key: 'monsterLabDefaultSort', type: 'string', input: 'select', options: ['index', 'name', 'class', 'pl:power level', 'wins', 'kills', 'gains:new gifts', 'gifts:total gifts', 'morale', 'hunger'], label: '设置列表排序的默认值。', disabled: 'isekai' },

    { tag: 'h1', text: '祭坛' },
    { key: 'shrineHideItems', type: 'array', input: 'textarea', text: '隐藏物品,防止它们被意外供奉给祭坛。' },
    { key: 'shrineFilters', type: 'array', input: 'textarea', text: '仅显示更高品质的奖励装备名称。\n* $pab 不可用。', desc: 'equipFilters', validator: 'equipFilters' },

    { tag: 'h1', text: '莫古邮件' },
    { key: 'moogleMail', type: 'boolean', label: '高级莫古邮件功能' },
    { key: 'moogleMailCouponClipper', type: 'boolean', label: '适用于拥有 "Coupon Clipper" hath 特权的玩家。\n若莫古邮件主题包含 "Coupon Clipper" 或 "Item Shop",则收取绅士币、购买所需物品后寄回。', disabled: 'isekai' },
    { key: 'moogleMailDarkDescent', type: 'boolean', label: '适用于拥有 "Dark Descent" hath 特权的玩家。\n若莫古邮件主题包含 "Dark Descent" 或 "reforge",则收取装备、重铸后寄回。', disabled: 'isekai' },

    { tag: 'h1', text: '战斗' },
    { key: 'equipEnchantPosition', type: 'string', input: 'select', options: ['left', 'right'], label: '设置面板的位置。' },
    { key: 'equipEnchantWeapon', type: 'number', label: '设置武器的附魔次数:每件 15 分钟' },
    { key: 'equipEnchantArmor', type: 'number', label: '设置防具的附魔次数:每件 1 小时' },
    { key: 'equipEnchantRepairThreshold', type: 'number', label: '当某件装备耐久过低时发出警告。' },
    { key: 'equipEnchantItemInventory', type: 'object', input: 'textarea', value_type: 'number', text: '显示仓库中的物品数量,当某项数量低于指定值时发出警告。\n点击列表中的物品名称即可从道具店购买相应数量。' },
    { key: 'equipEnchantCheckArmors', type: 'boolean', label: '显示防具的附魔。防具加载状态会稍慢一些。' },
  ],
  text: {
    equipHoverFunctions: `
      [C] 在弹窗中打开装备链接
      [V] 在新标签页打开装备链接
      [L] 显示链接代码
      [K] 以 bbcode 格式显示链接代码
      [DOUBLE CLICK] 双击打开装备链接
    `,
    equipTouchFunctions: `
      [DOUBLE TAP] 双击打开装备链接
      [LONG PRESS] 长按打开装备链接
    `,
    equipEnchantRepairThreshold: `
      若数值介于 0 和 1 之间,表示装备的耐久百分比(例:0.6 => 60%)。
      若数值大于 1,表示到 50% 耐久的余量(例:55 => 205 / 300)。
      压榨界推荐值为 55。
    `,
  },
  desc: {
    topMenuLinks: `List
      Character
      Equipment
      Abilities
      Training
      Item Inventory
      Equip Inventory
      Settings

      Equipment Shop
      Item Shop
      The Shrine
      The Market
      Monster Lab
      MoogleMail
      Weapon Lottery
      Armor Lottery

      The Arena
      The Tower
      Ring of Blood
      GrindFest
      Item World

      Repair
      Upgrade
      Enchant
      Salvage
      Reforge
      Soulfuse
    `,
    equipCode: `Syntax
      {$name}       equipment name
      {$namecode}   equipment name in colors/bold
      {$url}        equipment url
      {$eid}        equipment id
      {$_eid}       $eid with a transparent underline for layout
      {$level}      equipment level
      {$pab}        equipment pab
      {$tier}       potency tier (IW level)
      {$price}      the value of the 'price' input field
      {$note}       the value of the 'note' input field
                  - if it contains '$featured;', the equip code will be added to 'Featured' section
                  - if it contains '$new;', the equip code will be added to 'Newly Added' section
      {$condition ? text_if_true}
                  - if $condition is a valid value, it prints 'text_if_true', otherwise nothing
                  e.g., {$price? @ $price}
                  - if the equipment has a 'price' value in the Equipment Inventory, it prints like ' @ 10m'.
      {$condition ? text_if_true : text_if_false}
                  - if $condition is a valid value, it prints 'text_if_true', otherwise 'text_if_false'.
                  e.g., {$level ? Lv.$level : Souldbound}
                  - if the equipment has a level, it prints like 'Lv.500', otherwise 'Soulbound'.
    `,
    equipNameCode: `Syntax
      BASE MATCH : option=value, option=value, ...
      BASE MATCH : option=value, option=value, ... ; SUB MATCH : option=value, option=value, ... ; SUB MATCH : option=value, option=value, ...
      - BASE MATCH uses EQUIP FILTER rule.
      - each SUB MATCH is separate.
      - e.g., Willow Staff of Destruction : name=bold ; Demonic : prefix=red ; Tempestuous || Shocking : prefix=orange
      [Option Keywords]
      options : name (full name), quality, prefix, type, slot, suffix
      values : bold, rainbow, or any color such as 'red', '#f00'
      - e.g., Peerless : quality=rainbow, name=bold
    `,
    equipFilters: `Syntax
      ()   : GROUPING
      &&   : AND
      ||   : OR
      !    : NOT
      $QUALITY+   : Whether the quality of the equipment is equal to or higher than the given QUALITY
      $pab=xyz    : Whether the equipment has pab x, y and z
      $prefix     : Whether the equipment has a prefix
      $iw         : Whether the equipment has any potency levels
      $level      : Number, the level of the equipment
      e.g., Magnificent && Power && !Warding
      e.g., $Exquisite+ && (Rapier || Shortsword) && Slaughter && $prefix && $pab=sd && $level<250
    `,
  },
  validator: {
    topMenuLinks: function (value) {
      const errors = value.filter((v) => !_top.menu.hasOwnProperty(v));
      const error = errors.join('\n');
      const result = { value, error };
      return result;
    },
    equipNameCode: function (value) {
      const result = $equip.namecode_parse(value);
      return result;
    },
    equipFilters: function (value) {
      const result = $equip.filter_validate(value);
      return result;
    },
  },
  init: function () {
    $config.isekai = location.pathname.includes('/isekai/') && ($id('world_text')?.textContent.match(/(\d+ Season \d+)/)[1] || '1');
    $config.ns = $config.isekai ? 'hvuti' : 'hvut';
    $config.prefix = $config.ns + '_';
    $config.default = settings;
    $config.settings = $config.get('settings', {});
    if ($config.settings.version !== $config.version) {
      $config.migration();
    }
  },
  migration: function () {
    if (!$config.settings.version) {
      $config.reset();
      const in_equipdata = $config.ls_get('in_equipdata');
      const in_json = $config.ls_get('in_json');
      if (in_equipdata || in_json) {
        const equipdata = { version: 1 };
        Object.assign(equipdata, in_equipdata, in_json);
        $config.set('equipdata', equipdata);
      }
      const in_equipcode = $config.ls_get('in_equipcode');
      if (in_equipcode) {
        $config.settings.equipCode = in_equipcode.replace(/(\{\$\w+):/g, '$1?').replace(/\$bbcode/g, '$namecode');
      }
      const in_namecode = $config.ls_get('in_namecode');
      if (in_namecode) {
        $config.settings.equipNameCode = in_namecode;
      }

      const prices = $config.ls_get('prices');
      if (prices) {
        Object.entries(prices).forEach(([key, value]) => {
          if (typeof value === 'object') {
            Object.assign(prices, value);
            delete prices[key];
          }
        });
        setTimeout(() => { // $price is not defined yet
          $price.json = null;
          $price.init();
          $price.reset();
          $price.set(prices);
        }, 1000);
      }

      const es_protect = $config.ls_get('es_protect');
      if (es_protect) {
        $config.settings.equipmentShopProtectFilters = es_protect;
      }
      const es_bazaar = $config.ls_get('es_bazaar');
      if (es_bazaar) {
        $config.settings.equipmentShopBazaarFilters = es_bazaar;
      }

      const ml_log = $config.ls_get('ml_log');
      if (ml_log && !ml_log[0]) {
        ml_log[0] = { version: 1 };
        ml_log.forEach((log, i) => {
          if (!log || i === 0) {
            return;
          }
          log.pa = log.pa.map((e) => [e.value, e.to]);
          log.er = log.er.map((e) => [e.value, e.to]);
          log.ct = log.ct.map((e) => [e.value, e.to, e.max]);
          log.gifts = log.gift;
          log.gifts.push(...log.gifts.splice(28, 6, ...log.gifts.splice(40, 5)));
          delete log.gift;
          delete log.selected;
        });
        $config.set('ml_log', ml_log);
        $config.ls_del('ml_log');
      }

      const ls_list = ['equipnames', 'equipset', 'ch_style', 'se_settings', 'ss_log', 'ml_log'];
      ls_list.forEach((key) => {
        const value = $config.ls_get(key);
        if (value) {
          $config.set(key, value);
        }
      });

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key.startsWith($config.prefix)) {
          localStorage.removeItem(key);
        }
      }
    }

    $config.save();
  },
  reset: function () {
    $config.settings = JSON.parse(JSON.stringify($config.default));
  },
  get: function (key, dvalue, prefix = $config.prefix) {
    const value = GM_getValue(prefix + key, dvalue);
    return value;
  },
  set: function (key, value, prefix = $config.prefix) {
    GM_setValue(prefix + key, value);
    if ($config.ls_savelist.includes(key)) {
      $config.ls_set(key, value, prefix);
    }
  },
  del: function (key, prefix = $config.prefix) {
    GM_deleteValue(prefix + key);
  },
  ls_get: function (key, dvalue, prefix = $config.prefix) {
    const value = localStorage.getItem(prefix + key);
    return value === null ? dvalue : JSON.parse(value);
  },
  ls_set: function (key, value, prefix = $config.prefix) {
    localStorage.setItem(prefix + key, JSON.stringify(value));
  },
  ls_del: function (key, prefix = $config.prefix) {
    localStorage.removeItem(prefix + key);
  },
  titles: {
    reNotification: '随机遭遇通知',
    reGallery: '画廊内通知',
    reGalleryAlt: '画廊用 alt 服务器',
    reBeep: '提示音',
    topMenuIntegration: '顶部菜单整合',
    topMenuLinks: '顶部快捷链接',
    confirmStaminaRestorative: '确认使用耐力恢复剂',
    disableStaminaRestorative: '禁用耐力恢复剂阈值',
    warnLowStamina: '低耐力警告',
    showCredits: '显示绅士币余额',
    showEquipSlots: '显示装备空闲格',
    trainingNotification: '训练通知',
    lotteryNotification: '彩票通知',
    lotteryFilters: '彩票筛选',
    equipInventoryIntegration: '装备仓库整合',
    equipSort: '装备排序',
    equipColor: '装备品质着色',
    translateNames: '装备名中文显示',
    equipHoverFunctions: '鼠标悬停功能',
    equipTouchFunctions: '触控功能',
    equipCode: '装备代码格式',
    equipNameCode: '装备名装饰规则',
    equipmentShopIntegration: '装备店整合',
    equipmentShopShowLevel: '显示装备等级',
    equipmentShopShowPAB: '显示装备 PAB',
    equipmentShopConfirm: '买卖确认',
    equipmentShopProtectFilters: '贵重装备保护',
    equipmentShopAutoLock: '自动锁定保护装备',
    equipmentShopBazaarFilters: '集市保留筛选',
    monsterLab: '怪物实验室增强',
    monsterLabDefaultSort: '默认排序方式',
    shrineHideItems: '祭坛隐藏物品',
    shrineFilters: '祭坛奖励筛选',
    moogleMail: '莫古邮件增强',
    moogleMailCouponClipper: '优惠券剪贴者服务',
    moogleMailDarkDescent: '黑暗降临服务',
    equipEnchantPosition: '面板位置',
    equipEnchantWeapon: '武器附魔次数',
    equipEnchantArmor: '防具附魔次数',
    equipEnchantRepairThreshold: '耐久警告阈值',
    equipEnchantItemInventory: '物品库存提示',
    equipEnchantCheckArmors: '显示防具附魔',
  },

  create: function () {
    GM_addStyle(/*css*/`
      .hvut-cfg-div { position: absolute; top: 27px; left: 0; width: 60%; height: calc(100% - 27px); padding: 0 20%; overflow: auto; font-size: 10pt; text-align: left; background-color:#EDEBDF; z-index: 9; }
      .hvut-cfg-div header { margin-bottom: 20px; padding: 10px; font-size: 15pt; font-weight: bold; border-bottom: 2px solid; }
      .hvut-cfg-div h1 { margin: 20px 0 10px; padding: 10px; font-size: 12pt; font-weight: bold; background-color: #fff9; }
      .hvut-cfg-div h2 { margin: 0; font-size: 10pt; font-weight: bold; }
      .hvut-cfg-div h3 { margin: 0; font-size: 10pt; font-weight: bold; text-decoration: underline; }
      .hvut-cfg-div div { margin-left: 10px; padding: 10px; line-height: 24px; }
      .hvut-cfg-div div:hover { background-color: #fff9; }
      .hvut-cfg-div p { margin: 0; }
      .hvut-cfg-disabled { color: #999; }
      .hvut-cfg-error { box-shadow: 0 0 0 2px #c00 inset; }
      .hvut-cfg-error p:last-child { padding: 10px; background-color: #fff9; color: #c00; }
      .hvut-cfg-div footer { position: sticky; bottom: 0; margin-top: 20px; padding: 10px; border-top: 2px solid; text-align: center; background-color: inherit; }
      .hvut-cfg-div input { vertical-align: middle; }
      .hvut-cfg-div input[type='text'] { width: 95%; }
      .hvut-cfg-div input[type='number'] { width: 50px; text-align: right; }
      .hvut-cfg-div textarea { width: 95%; height: 200px; white-space: nowrap; }
    `);

    $config.node = {};
    $config.node.div = $element('div', null, ['.hvut-cfg-div'], { change: $config.validate_panel });
    //$config.node.ul = $element('ul', $config.node.div);
    $element('header', $config.node.div, 'HV Utils 设置');

    $config.data.forEach((o) => {
      if (o.tag) {
        $element(o.tag, $config.node.div, o.text);
        //$element('li', $config.node.ul, o.text, () => { scrollIntoView(h); });
        return;
      }
      o.node = {};
      o.node.div = $element('div', $config.node.div);
      const _title = $config.titles[o.key];
      $element('h2', o.node.div, _title ? `${_title} (${o.key})` : o.key);

      if (o.input === 'textarea') {
        //o.node.input = $element('textarea', o.node.div, { spellcheck: false });
      } else if (o.input === 'select') {
        o.node.input = $input(['select', o.options], o.node.div);
        if (o.label) {
          $element('span', o.node.div, o.label);
        }
      } else if (o.type === 'boolean') {
        o.node.input = $input(['checkbox', o.label], o.node.div);
      } else if (o.type === 'number') {
        o.node.input = $input(['number'], o.node.div);
        if (o.label) {
          $element('span', o.node.div, o.label);
        }
      } else {
        o.node.input = $input(['text'], o.node.div);
      }

      let text = $config.text[o.text || o.key] || o.text;
      if (text) {
        text = text.trim().replace(/^ +/gm, '').replace(/\n/g, '<br>');
        o.node.text = $element('p', o.node.div, ['/' + text]);
      }
      let desc = $config.desc[o.desc || o.key];
      if (desc) {
        desc = desc.trim().replace(/^ +/gm, '').split('\n');
        const button = desc[0];
        desc = desc.slice(1).join('<br>');
        $input(['button', button], o.node.div, null, () => { o.node.desc.classList.toggle('hvut-none'); });
        //$element('br', o.node.div);
        o.node.desc = $element('p', o.node.div, ['/' + desc, '.hvut-none']);
      }

      if (o.input === 'textarea') { // append here
        o.node.input = $element('textarea', o.node.div, { spellcheck: false });
      }
      o.node.input.dataset.key = o.key;
      if (o.style) {
        o.node.input.style.cssText = o.style;
      }
      if (o.disabled === 'persistent' && !$config.isekai || o.disabled === 'isekai' && $config.isekai) {
        o.node.div.classList.add('hvut-cfg-disabled');
        o.node.input.disabled = true;
      }
      if (o.oncreate) {
        o.oncreate(o);
      }
    });

    const bottom = $element('footer', $config.node.div);
    $input(['button', '保存'], bottom, null, () => { $config.save(true); });
    $input(['button', '关闭'], bottom, null, () => { $config.close(); });
    $input(['button', '还原'], bottom, null, () => { $config.load($config.settings); });
    $input(['button', '默认'], bottom, null, () => { $config.load($config.default); });
  },
  open: function (key) {
    if (!$config.node) {
      $config.create();
    }
    $id('csp').appendChild($config.node.div);
    $config.load();
    if (key) {
      const o = $config.data.find((o) => o.key === key);
      scrollIntoView(o.node.div);
    }
  },
  close: function () {
    $config.node.div.remove();
  },
  set_panel: function (obj = $config.settings) {
    $config.data.forEach((o) => {
      if (!o.key) {
        return;
      }
      const input = o.node.input;
      if (input.disabled) {
        return;
      }
      const value = obj[o.key];
      if (value === undefined) {
        return;
      }
      if (o.type === 'boolean') {
        input.checked = value;
      } else if (o.type === 'number') {
        input.value = value;
      } else if (o.type === 'string') {
        input.value = value;
      } else if (o.type === 'array') {
        input.value = $config.array2text(value, o.value_sep);
      } else if (o.type === 'object') {
        input.value = $config.obj2text(value, o.value_sep);
      }
    });
  },
  get_panel: function () {
    const obj = {};
    const errors = [];
    $config.data.forEach((o) => {
      if (!o.key) {
        return;
      }
      if (o.disabled === 'persistent' && !$config.isekai || o.disabled === 'isekai' && $config.isekai) {
        return;
      }
      const validation = $config.validate(o);
      if (validation.error) {
        errors.push(o);
        return;
      }
      obj[o.key] = validation.value;
    });
    if (errors.length) {
      scrollIntoView(errors[0].node.div);
      return false;
    }
    return obj;
  },
  validate_panel: function (e) {
    const key = e.target.dataset.key;
    const o = $config.data.find((o) => o.key === key);
    const validation = $config.validate(o);
    return validation;
  },
  validate: function (o) {
    let value;
    let error;
    if (o.type === 'boolean') {
      value = o.node.input.checked;
    } else if (o.type === 'number') {
      value = Number(o.node.input.value);
    } else if (o.type === 'string') {
      value = o.node.input.value;
    } else if (o.type === 'array') {
      ({ value, error } = $config.text2array(o.node.input.value, o.value_sep, o.value_type));
    } else if (o.type === 'object') {
      ({ value, error } = $config.text2obj(o.node.input.value, o.value_sep, o.value_type));
    }
    const validator = $config.validator[o.validator || o.key];
    if (validator) {
      const _error = error;
      ({ value, error } = validator(value));
      if (!error) {
        error = _error;
      }
    }
    if (error) {
      if (!o.node.error) {
        o.node.error = $element('p', o.node.div);
      }
      const html = error.replace(/\n/g, '<br>');
      o.node.error.innerHTML = '<h3>Validation Error</h3>' + html;
      o.node.div.appendChild(o.node.error);
      o.node.div.classList.add('hvut-cfg-error');
    } else {
      o.node.error?.remove();
      o.node.div.classList.remove('hvut-cfg-error');
    }
    const result = { value, error };
    return result;
  },
  load: function (obj = $config.settings) {
    $config.set_panel(obj);
    $config.get_panel();
  },
  save: function (panel) {
    if (panel) {
      const obj = $config.get_panel();
      if (!obj) { // error
        return;
      }
      $config.settings = obj;
    }
    $config.settings.version = $config.version;
    $config.set('settings', $config.settings);
    if (panel) {
      location.href = location.href;
    }
  },
  text2obj: function (text, sep = ['\n', ':'], type) {
    const obj = {};
    const errors = [];
    text.split(sep[0]).filter((t) => t.trim()).forEach((t) => {
      const split = split2(t, sep[1]);
      const key = split[0];
      let value = split[1];
      if (!key || !value) {
        errors.push(t);
        return true;
      }
      if (type === 'number') {
        value = Number(value);
        if (isNaN(value)) {
          errors.push(t);
          return true;
        }
      }
      obj[key] = value;
    });
    const error = errors.join('\n');
    const result = { value: obj, error };
    return result;
  },
  obj2text: function (obj, sep = ['\n', ':']) {
    const text = Object.entries(obj).map(([key, value]) => `${key} ${sep[1]} ${value}`).join(sep[0]);
    return text;
  },
  text2array: function (text, sep = '\n', type) {
    const errors = [];
    const array = text.split(sep).filter((t) => t.trim()).map((t) => {
      let value = t.trim();
      if (type === 'number') {
        value = Number(value);
        if (isNaN(value)) {
          errors.push(t);
          return true;
        }
      }
      return value;
    });
    const error = errors.join('\n');
    const result = { value: array, error };
    return result;
  },
  array2text: function (array, sep = '\n') {
    if (!sep.includes('\n')) {
      sep += ' ';
    }
    const text = array.join(sep);
    return text;
  },

};

$config.init();
//$config.settings = settings;

// AJAX
const $ajax = {

  interval: 300, // DO NOT DECREASE THIS NUMBER, OR IT MAY TRIGGER THE SERVER'S LIMITER AND YOU WILL GET BANNED
  max: 4,
  tid: null,
  conn: 0,
  index: 0,
  queue: [],

  fetch: function (url, data, method, context = {}, headers = {}) {
    return new Promise((resolve, reject) => {
      $ajax.add(method, url, data, resolve, reject, context, headers);
    });
  },
  repeat: function (count, func, ...args) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(func(...args));
    }
    return list;
  },
  add: function (method, url, data, onload, onerror, context = {}, headers = {}) {
    console.log('ajax call', url);
    if (!data) {
      method = 'GET';
    } else if (!method) {
      method = 'POST';
    }
    if (method === 'POST') {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      if (data && typeof data === 'object') {
        data = Object.entries(data).map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');
      }
    } else if (method === 'JSON') {
      method = 'POST';
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      if (data && typeof data === 'object') {
        data = JSON.stringify(data);
      }
    }
    context.onload = onload;
    context.onerror = onerror;
    $ajax.queue.push({ method, url, data, headers, context, onload: $ajax.onload, onerror: $ajax.onerror });
    $ajax.next();
  },
  next: function () {
    if (!$ajax.queue[$ajax.index] || $ajax.error) {
      return;
    }
    if ($ajax.tid) {
      if (!$ajax.conn) {
        clearTimeout($ajax.tid);
        $ajax.timer();
        $ajax.send();
      }
    } else {
      if ($ajax.conn < $ajax.max) {
        $ajax.timer();
        $ajax.send();
      }
    }
  },
  timer: function () {
    $ajax.tid = setTimeout(() => {
      $ajax.tid = null;
      $ajax.next();
    }, $ajax.interval);
  },
  send: function () {
    GM_xmlhttpRequest($ajax.queue[$ajax.index]);
    $ajax.index++;
    $ajax.conn++;
  },
  onload: function (r) {
    $ajax.conn--;
    const text = r.responseText;
    if (r.status !== 200) {
      $ajax.error = `${r.status} ${r.statusText}: ${r.finalUrl}`;
      r.context.onerror?.();
    } else if (text === 'state lock limiter in effect') {
      if ($ajax.error !== text) {
        popup(`<p style="color: #f00; font-weight: bold;">${text}</p><p>You have reached the maximum connection limit.<br>Try again later.</p>`);
      }
      $ajax.error = text;
      r.context.onerror?.();
    } else {
      r.context.onload?.(text);
      $ajax.next();
    }
  },
  onerror: function (r) {
    $ajax.conn--;
    $ajax.error = `${r.status} ${r.statusText}: ${r.finalUrl}`;
    r.context.onerror?.();
    $ajax.next();
  },

};

window.addEventListener('unhandledrejection', (e) => { console.log($ajax.error || e); });

// RANDOM ENCOUNTER
const $re = {

  init: function () {
    if ($re.inited) {
      return;
    }
    $re.inited = true;
    $re.type = (!location.hostname.includes('hentaiverse.org') || $config.isekai) ? 'eh' : $id('navbar') ? 'hv' : $id('battle_top') ? 'ba' : false;
    $re.get();
  },
  clock: function (button) {
    $re.init();
    $re.button = button;
    $re.button.addEventListener('click', (e) => { $re.run(e.ctrlKey || e.shiftKey); });
    const date = new Date($re.json.date);
    const now = new Date();
    if (date.getUTCDate() !== now.getUTCDate() || date.getUTCMonth() !== now.getUTCMonth() || date.getUTCFullYear() !== now.getUTCFullYear()) {
      $re.reset();
      $re.load();
    }
    $re.start();
  },
  hv: function () {
    $re.init();
    $re.check();
    const button = $element('div', _top.node.div, ['!width: 80px; cursor: pointer;']);
    $re.clock(button);
  },
  ba: function () {
    $re.init();
    if ($id('textlog').tBodies[0].lastElementChild.textContent === 'Initializing random encounter ...') {
      $re.check();
    }
    const button = $element('div', $id('csp'), ['RE', '!position: absolute; top: 10px; left: 600px; cursor: pointer; font-size: 10pt; font-weight: bold;']);
    $re.clock(button);

    // support monsterbation that clears all timer id when a round starts
    const target = document.body;
    const options = { childList: true };
    const callback = function () {
      if (!button.parentNode.parentNode && $id('csp')) {
        $id('csp').appendChild(button);
      }
      $re.start();
    };
    const observer = new MutationObserver(callback);
    observer.observe(target, options);
  },
  eh: function () {
    $re.init();
    const link = $qs('#eventpane a');
    const onclick = link?.getAttribute('onclick');
    const key = onclick?.match(/\?s=Battle&ss=ba&encounter=([A-Za-z0-9=]+)/)?.[1];
    if (key) {
      $re.set(key);
      if ($config.settings.reGalleryAlt) {
        link.setAttribute('onclick', onclick.replace('https://hentaiverse.org/', 'http://alt.hentaiverse.org/'));
      }
    }
    if ($config.settings.reGallery && $id('nb')) {
      $id('nb').style.maxWidth = '1080px';
      const button = $element('a', $element('div', $id('nb')), ['!display: inline-block; width: 70px; text-align: left; cursor: pointer;']);
      $re.clock(button);
    }
  },
  get: function () {
    $re.json = $config.get('re', { date: 0, key: '', count: 0, clear: true }, 'hvut_');
  },
  set: function (key) {
    if (key) {
      $re.json.key = key;
      $re.json.date = Date.now();
      $re.json.count++;
      $re.json.clear = false;
    }
    $config.set('re', $re.json, 'hvut_');
  },
  reset: function () {
    $re.json.date = Date.now();
    $re.json.count = 0;
    $re.json.clear = true;
    $re.set();
    $re.start();
  },
  check: function () {
    const key = /\?s=Battle&ss=ba&encounter=([A-Za-z0-9=]+)/.exec(location.search)?.[1];
    if (key) {
      const now = Date.now();
      if ($re.json.key === key) {
        if (!$re.json.clear) {
          $re.json.clear = true;
          $re.set();
        }
      } else if ($re.json.date + 1800000 < now) {
        $re.json.date = now;
        $re.json.key = key;
        $re.json.count++;
        $re.json.clear = true;
        $re.set();
      }
    }
  },
  refresh: function () {
    const remain = $re.json.date + 1800000 - Date.now();
    if (remain > 0) {
      $re.button.textContent = time_format(remain, 2) + ` [${$re.json.count}]`;
      $re.beep = true;
    } else {
      $re.button.textContent = (!$re.json.clear ? 'Expired' : 'Ready') + ` [${$re.json.count}]`;
      if ($re.beep) {
        $re.beep = false;
        play_beep(...$config.settings.reBeep);
      }
      $re.stop();
    }
  },
  run: async function (engage) {
    if ($re.type === 'ba') {
      $re.load();
    } else if ($re.type === 'hv') {
      if (!$re.json.clear || engage) {
        $re.engage();
      } else {
        $re.load(true);
      }
    } else if ($re.type === 'eh') {
      $re.stop();
      $re.button.textContent = '检查中…';
      const html = await $ajax.fetch('https://hentaiverse.org/');
      if (html.includes('<div id="navbar">')) {
        if (!$re.json.clear || engage) {
          $re.engage();
        } else {
          $re.load(true);
        }
      } else {
        $re.load();
      }
    }
  },
  load: async function (engage) {
    $re.stop();
    $re.get();
    $re.button.textContent = '加载中…';
    const html = await $ajax.fetch('https://e-hentai.org/news.php');
    const doc = $doc(html);
    const eventpane = $id('eventpane', doc)?.innerHTML;
    const key = eventpane?.match(/\?s=Battle&amp;ss=ba&amp;encounter=([A-Za-z0-9=]+)/)?.[1];
    if (key) {
      $re.set(key);
      if (engage) {
        $re.engage();
        return;
      }
    } else if (eventpane?.includes('It is the dawn of a new day')) {
      popup(eventpane);
      $re.reset();
    } else {
      popup('生成新的随机遭遇密钥失败');
    }
    $re.start();
  },
  engage: function () {
    if (!$re.json.key) {
      return;
    }
    const href = `?s=Battle&ss=ba&encounter=${$re.json.key}`;
    if ($re.type === 'ba') {
      return;
    } else if ($re.type === 'hv') {
      location.href = href;
    } else if ($re.type === 'eh') {
      window.open(($config.settings.reGalleryAlt ? 'http://alt.hentaiverse.org/' : 'https://hentaiverse.org/') + href, '_blank');
      $re.json.clear = true;
      $re.start();
    }
  },
  start: function () {
    $re.stop();
    if (!$re.json.clear) {
      $re.button.style.color = '#e00';
    } else {
      $re.button.style.color = '';
    }
    $re.tid = setInterval($re.refresh, 1000);
    $re.refresh();
  },
  stop: function () {
    if ($re.tid) {
      clearInterval($re.tid);
      $re.tid = 0;
    }
  },

};

/* NO-NAVBAR */
if (!$id('navbar')) {
  // BATTLE
  if ($id('battle_top')) {
    if ($config.settings.reNotification) {
      $re.ba();
    }

  // RIDDLE MASTER
  } else if ($id('riddleform')) {

  // GALLERY
  } else if (location.hostname === 'e-hentai.org') {
    if ($config.settings.reNotification) {
      $re.eh();
    }
  }

  return;
}

// CHECK FONT SETTINGS
const level_exec = /^(.+) Lv\.(\d+)/.exec($id('level_readout').textContent.trim());
if (!level_exec) {
  if (_query.ss === 'se') {
    alert('使用 HVUT 前,请先设置 [Custom Font]。');
    scrollIntoView($id('settings_cfont').parentNode, $id('settings_outer'));
    const form = $qs('#settings_outer form');
    form.fontlocal.checked = true;
    form.fontlocal.required = true;
    form.fontface.required = true;
    form.fontsize.required = true;
    form.fontface.placeholder = 'Tahoma, Arial';
    form.fontsize.placeholder = '10';
    form.fontoff.placeholder = '0';
  } else {
    location.href = '?s=Character&ss=se';
  }
  return;
}

// PLAYER DATA
const _player = {
  difficulty: level_exec[1],
  level: parseInt(level_exec[2]),
  stamina: parseInt(/Stamina: (\d+)/.exec($id('stamina_readout').textContent)[1]),
  accuracy: $qs('#stamina_readout > div:nth-child(2)').title,
  condition: $qs('#stamina_readout img[title^="Stamina"]').title,
  warn: [],
};

/* START */

/* eslint-disable one-var */
var _ch = {},
    _eq = {},
    _ab = {},
    _tr = {},
    //_it = {},
    _in = {},
    _se = {},

    _es = {},
    //_is = {},
    _ml = {},
    _ss = {},
    _mk = {},
    _mm = {},
    _lt = {},
    //_la = {},

    _ar = {},
    //_rb = {},
    //_gr = {},
    _iw = {},

    //_re = {},
    _up = {},
    //_en = {},
    //_sa = {},
    //_fo = {},
    //_fu = {},

    _top = {},
    _bottom = {};
/* eslint-enable */

// EQUIP PARSER
const $equip = {

  names: (() => {
    let equipnames = $config.get('equipnames', {});
    if ($config.isekai && ($config.isekai !== equipnames.isekai)) {
      equipnames = { isekai: $config.isekai };
      $config.set('equipnames', equipnames);
      $config.del('equipdata');
    }
    return equipnames;
  })(),
  dynjs_equip: _window.dynjs_equip || {},
  dynjs_eqstore: _window.dynjs_eqstore || {},
  dynjs_loaded: {},
  eqvalue: _window.eqvalue || {},

  alias: {
    '1handed': 'One-handed Weapon', '2handed': 'Two-handed Weapon', 'staff': 'Staff', 'shield': 'Shield', 'acloth': 'Cloth Armor', 'alight': 'Light Armor', 'aheavy': 'Heavy Armor',
    'One-handed Weapon': '1handed', 'Two-handed Weapon': '2handed', 'Staff': 'staff', 'Shield': 'shield', 'Cloth Armor': 'acloth', 'Light Armor': 'alight', 'Heavy Armor': 'aheavy',
  },
  index: {
    category: { 'One-handed Weapon': 1, 'Two-handed Weapon': 2, 'Staff': 3, 'Shield': 4, 'Cloth Armor': 5, 'Light Armor': 6, 'Heavy Armor': 7, 'Unknown': 99 },
    type: {
      'Rapier': 1, 'Club': 2, 'Shortsword': 3, 'Axe': 4, 'Wakizashi': 5, 'Dagger': 6, 'Sword Chucks': 7,
      'Estoc': 1, 'Mace': 2, 'Longsword': 3, 'Katana': 4, 'Scythe': 5,
      'Oak Staff': 1, 'Willow Staff': 2, 'Katalox Staff': 3, 'Redwood Staff': 4, 'Ebony Staff': 5,
      'Force Shield': 1, 'Buckler': 2, 'Kite Shield': 3, 'Tower Shield': 4,
      'Phase': 1, 'Cotton': 2, 'Gossamer': 3, 'Silk': 4,
      'Shade': 1, 'Leather': 2, 'Kevlar': 3, 'Dragon Hide': 4,
      'Power': 1, 'Plate': 2, 'Shield': 3, 'Chainmail': 4,
    },
    quality: { 'Peerless': 1, 'Legendary': 2, 'Magnificent': 3, 'Exquisite': 4, 'Superior': 5, 'Fine': 6, 'Average': 7, 'Fair': 8, 'Crude': 9, 'Flimsy': 10 },
    prefix: {
      'Ethereal': 1, 'Fiery': 2, 'Arctic': 3, 'Shocking': 4, 'Tempestuous': 5, 'Hallowed': 6, 'Demonic': 7,
      'Radiant': 1, 'Charged': 2, 'Mystic': 3, 'Frugal': 4,
      'Savage': 1, 'Agile': 2, 'Reinforced': 3, 'Shielding': 4, 'Mithril': 5,
      'Ruby': 11, 'Cobalt': 12, 'Amber': 13, 'Jade': 14, 'Zircon': 15, 'Onyx': 16,
    },
    slot: {
      'Cap': 1, 'Robe': 2, 'Gloves': 3, 'Pants': 4, 'Shoes': 5,
      'Helmet': 1, 'Breastplate': 2, 'Cuirass': 2, 'Armor': 2, 'Gauntlets': 3, 'Greaves': 4, 'Leggings': 4, 'Sabatons': 5, 'Boots': 5,
    },
    suffix: {
      'Slaughter': 1, 'Balance': 2, 'Swiftness': 3, 'the Barrier': 4, 'the Nimble': 5, 'the Battlecaster': 6, 'the Vampire': 7, 'the Illithid': 8, 'the Banshee': 9,
      'Destruction': 1, 'Surtr': 2, 'Niflheim': 3, 'Mjolnir': 4, 'Freyr': 5, 'Heimdall': 6, 'Fenrir': 7, 'the Elementalist': 8, 'the Heaven-sent': 9, 'the Demon-fiend': 10, 'the Earth-walker': 11, 'the Curse-weaver': 12, 'Focus': 13,
      'the Shadowdancer': 1, 'the Fleet': 2, 'the Arcanist': 3, 'Negation': 4,
      'Protection': 21, 'Warding': 22, 'Dampening': 23, 'Stoneskin': 24, 'Deflection': 25,
    },
  },
  reg: {
    name: (() => {
      const quality = 'Flimsy|Crude|Fair|Average|Fine|Superior|Exquisite|Magnificent|Legendary|Peerless';
      const prefix = 'Ethereal|Fiery|Arctic|Shocking|Tempestuous|Hallowed|Demonic|Ruby|Cobalt|Amber|Jade|Zircon|Onyx|Charged|Frugal|Radiant|Mystic|Agile|Reinforced|Savage|Shielding|Mithril';
      const slot = 'Cap|Robe|Gloves|Pants|Shoes|Helmet|Breastplate|Gauntlets|Leggings|Boots|Cuirass|Armor|Greaves|Sabatons|Coif|Hauberk|Mitons|Chausses|Boots';
      const onehanded = 'Axe|Club|Rapier|Shortsword|Wakizashi|Dagger|Sword Chucks';
      const twohanded = 'Estoc|Longsword|Mace|Katana|Scythe';
      const staff = 'Oak Staff|Willow Staff|Katalox Staff|Redwood Staff|Ebony Staff';
      const shield = 'Buckler|Kite Shield|Force Shield|Tower Shield';
      const acloth = 'Cotton|Phase|Gossamer|Silk';
      const alight = 'Leather|Shade|Kevlar|Dragon Hide';
      const aheavy = 'Plate|Power|Shield|Chainmail';
      const pattern = `^(${quality})(?: (?:(${prefix})|(.+?)))? (?:(${onehanded})|(${twohanded})|(${staff})|(${shield})|(?:(?:(${acloth})|(${alight})|(${aheavy})) (${slot})))(?: of (.+))?$`;
      return new RegExp(pattern, 'i');
    })(),
    html: /<div>(.+?) &nbsp; &nbsp; (?:Level (\d+|Unassigned) )?&nbsp; &nbsp; <span>(Tradeable|Untradeable|Soulbound)<\/span><\/div><div>Condition: (\d+) \/ (\d+) \(\d+%\) &nbsp; &nbsp; Potency Tier: (\d+) \((?:(\d+) \/ (\d+)|MAX)\)/,
    magic: /Fire|Cold|Elec|Wind|Holy|Dark/i,
    pab: /Strength|Dexterity|Agility|Endurance|Intelligence|Wisdom/g,
  },

  // 装备/物品名翻译子模块(SSOT=docs/hvutils-glossary.md;译名取自 equip_chinese 字典,已去 HTML/符号)
  // 将来合并所有脚本后,此块即可升格为统一翻译核心。译名仅作显示,英文 eq.info.name 原值不动。
  $i18n: {
    quality: { Peerless: '无双', Legendary: '传奇', Magnificent: '史诗', Exquisite: '精良', Superior: '上等', Fine: '优质', Average: '中等', Fair: '一般', Crude: '劣质', Flimsy: '薄弱' },
    prefix: { Ethereal: '虚空之', Fiery: '灼热之', Arctic: '极寒之', Shocking: '闪电之', Tempestuous: '风暴之', Hallowed: '神圣之', Demonic: '恶魔之', Radiant: '魔光', Charged: '充能的', Mystic: '神秘的', Frugal: '节能', Savage: '野蛮的', Agile: '俊敏的', Reinforced: '加固的', Shielding: '盾化的', Mithril: '秘银的', Ruby: '红宝石(火抗)', Cobalt: '钴石(冰抗)', Amber: '琥珀(雷抗)', Jade: '翡翠(风抗)', Zircon: '锆石(圣抗)', Onyx: '缟玛瑙(暗抗)' },
    type: { Rapier: '西洋剑', Club: '棍', Shortsword: '短剑', Axe: '斧', Wakizashi: '脇差', Dagger: '匕首', 'Sword Chucks': '锁链双剑', Estoc: '刺剑', Mace: '重槌', Longsword: '长剑', Katana: '太刀', Scythe: '镰刀', 'Oak Staff': '橡木法杖', 'Willow Staff': '柳木法杖', 'Katalox Staff': '铁木法杖', 'Redwood Staff': '红木法杖', 'Ebony Staff': '乌木法杖', 'Force Shield': '力场盾', Buckler: '圆盾', 'Kite Shield': '鸢盾', 'Tower Shield': '塔盾', Phase: '相位', Cotton: '棉质', Gossamer: '薄纱', Silk: '丝绸', Shade: '暗影', Leather: '皮革', Kevlar: '凯夫拉', 'Dragon Hide': '龙皮', Power: '动力', Plate: '板甲', Chainmail: '锁子甲' },
    slot: { Cap: '兜帽', Robe: '长袍', Gloves: '手套', Pants: '短裤', Shoes: '鞋', Helmet: '头盔', Breastplate: '护胸', Cuirass: '胸甲', Armor: '盔甲', Gauntlets: '手甲', Greaves: '护胫', Leggings: '护腿', Sabatons: '铁靴', Boots: '靴子' },
    suffix: { Slaughter: '杀戮', Balance: '平衡', Swiftness: '加速', 'the Barrier': '格挡', 'the Nimble': '招架', 'the Battlecaster': '战法师', 'the Vampire': '吸血鬼', 'the Illithid': '灵吸怪', 'the Banshee': '报丧女妖', Destruction: '毁灭', Surtr: '苏尔特(火伤)', Niflheim: '尼芙菲姆(冰伤)', Mjolnir: '姆乔尔尼尔(雷伤)', Freyr: '弗瑞尔(风伤)', Heimdall: '海姆达(圣伤)', Fenrir: '芬里尔(暗伤)', Focus: '专注', 'the Elementalist': '元素使', 'the Heaven-sent': '天堂', 'the Demon-fiend': '恶魔', 'the Earth-walker': '地行者', 'the Curse-weaver': '咒术师', 'the Shadowdancer': '影舞者', 'the Fleet': '迅捷', 'the Arcanist': '奥术师', Negation: '否定', Protection: '物防', Warding: '魔防', Dampening: '抑制', Stoneskin: '石肤', Deflection: '偏转', 'the Ox': '牛(力量)', 'the Raccoon': '浣熊(灵巧)', 'the Cheetah': '猎豹(敏捷)', 'the Turtle': '乌龟(体质)', 'the Fox': '狐狸(智力)', 'the Owl': '猫头鹰(智慧)', 'the Fire-eater': '噬火者', 'the Thunder-child': '雷之子', 'the Wind-waker': '风之杖', 'the Frost-born': '冰人', 'the Spirit-ward': '灵魂护佑', 'the Thrice-blessed': '三重祝福' },
    items: {
      'Binding of Slaughter': '粘合剂 基础物理伤害', 'Binding of Balance': '粘合剂 物理命中率', 'Binding of Isaac': '粘合剂 物理暴击率', 'Binding of Destruction': '粘合剂 基础魔法伤害', 'Binding of Focus': '粘合剂 魔法命中率', 'Binding of Friendship': '粘合剂 魔法暴击率', 'Binding of Protection': '粘合剂 物理减伤', 'Binding of Warding': '粘合剂 魔法减伤', 'Binding of the Fleet': '粘合剂 回避率', 'Binding of the Barrier': '粘合剂 格挡率', 'Binding of the Nimble': '粘合剂 招架率', 'Binding of Negation': '粘合剂 抵抗率', 'Binding of the Ox': '粘合剂 力量', 'Binding of the Raccoon': '粘合剂 灵巧', 'Binding of the Cheetah': '粘合剂 敏捷', 'Binding of the Turtle': '粘合剂 体质', 'Binding of the Fox': '粘合剂 智力', 'Binding of the Owl': '粘合剂 智慧', 'Binding of the Elementalist': '粘合剂 元素魔法熟练度', 'Binding of the Heaven-sent': '粘合剂 神圣魔法熟练度', 'Binding of the Demon-fiend': '粘合剂 黑暗魔法熟练度', 'Binding of the Curse-weaver': '粘合剂 减益魔法熟练度', 'Binding of the Earth-walker': '粘合剂 增益魔法熟练度', 'Binding of Surtr': '粘合剂 火属性咒语伤害', 'Binding of Niflheim': '粘合剂 冰属性咒语伤害', 'Binding of Mjolnir': '粘合剂 雷属性咒语伤害', 'Binding of Freyr': '粘合剂 风属性咒语伤害', 'Binding of Heimdall': '粘合剂 圣属性咒语伤害', 'Binding of Fenrir': '粘合剂 暗属性咒语伤害', 'Binding of Dampening': '粘合剂 敲击减伤', 'Binding of Stoneskin': '粘合剂 斩击减伤', 'Binding of Deflection': '粘合剂 刺击减伤', 'Binding of the Fire-eater': '粘合剂 火属性减伤', 'Binding of the Frost-born': '粘合剂 冰属性减伤', 'Binding of the Thunder-child': '粘合剂 雷属性减伤', 'Binding of the Wind-waker': '粘合剂 风属性减伤', 'Binding of the Thrice-blessed': '粘合剂 圣属性减伤', 'Binding of the Spirit-ward': '粘合剂 暗属性减伤',
      'Health Potion': '体力药水', 'Health Draught': '体力长效药', 'Health Elixir': '终极体力药', 'Mana Potion': '法力药水', 'Mana Draught': '法力长效药', 'Mana Elixir': '终极法力药', 'Spirit Potion': '灵力药水', 'Spirit Draught': '灵力长效药', 'Spirit Elixir': '终极灵力药', 'Last Elixir': '终极秘药', 'Energy Drink': '能量饮料', 'Caffeinated Candy': '咖啡因糖果', 'Monster Chow': '怪物饲料', 'Monster Edibles': '怪物食品', 'Monster Cuisine': '怪物料理', 'Golden Lottery Ticket': '黄金彩票券',
      'Infusion of Flames': '火焰魔药', 'Infusion of Frost': '冰冷魔药', 'Infusion of Lightning': '闪电魔药', 'Infusion of Storms': '风暴魔药', 'Infusion of Divinity': '神圣魔药', 'Infusion of Darkness': '黑暗魔药',
      'Scroll of Swiftness': '加速卷轴', 'Scroll of Protection': '保护卷轴', 'Scroll of the Avatar': '化身卷轴', 'Scroll of Absorption': '吸收卷轴', 'Scroll of Shadows': '幻影卷轴', 'Scroll of Life': '生命卷轴', 'Scroll of the Gods': '神之卷轴',
      'Flower Vase': '花瓶', 'Bubble-Gum': '泡泡糖', 'Soul Stone': '灵魂石',
      'Voidseeker Shard': '虚空碎片', 'Aether Shard': '以太碎片', 'Featherweight Shard': '羽毛碎片', 'Amnesia Shard': '重铸碎片', 'Crystallized Phazon': '相位碎片(布)', 'Shade Fragment': '暗影碎片(轻)', 'Repurposed Actuator': '动力碎片(重)', 'Defense Matrix Modulator': '力场碎片(盾)',
      'Crystal of Vigor': '力量水晶', 'Crystal of Finesse': '灵巧水晶', 'Crystal of Swiftness': '敏捷水晶', 'Crystal of Fortitude': '体质水晶', 'Crystal of Cunning': '智力水晶', 'Crystal of Knowledge': '智慧水晶', 'Crystal of Flames': '火焰水晶', 'Crystal of Frost': '冰冻水晶', 'Crystal of Lightning': '闪电水晶', 'Crystal of Tempest': '疾风水晶', 'Crystal of Devotion': '神圣水晶', 'Crystal of Corruption': '暗黑水晶',
      "Voidseeker's Blessing": '虚空探索者的祝福', 'Suffused Aether': '弥漫的以太', 'Featherweight Charm': '轻如鸿毛', 'Infused Flames': '火焰附魔', 'Infused Frost': '冰霜附魔', 'Infused Lightning': '雷电附魔', 'Infused Storm': '风暴附魔', 'Infused Divinity': '神圣附魔', 'Infused Darkness': '黑暗附魔',
      'Scrap Metal': '废金属', 'Scrap Wood': '废木料', 'Energy Cell': '能量电池',
    },
    _join: function (i) {
      const I = $equip.$i18n;
      const q = I.quality[i.quality] || i.quality || '';
      const pre = i.prefix ? (I.prefix[i.prefix] || i.prefix) : '';
      const t = i.type ? (I.type[i.type] || i.type) : '';
      const slot = i.slot ? (I.slot[i.slot] || i.slot) : '';
      const suf = i.suffix ? (I.suffix[i.suffix] || i.suffix) : '';
      return [q, pre, t, slot, suf].filter(Boolean).join(' ');
    },
    // 入参为已解析 eq:直接读段拼中文;未解析(无 quality)则回退英文整名
    applyEquip: function (eq) {
      return eq.info.quality ? $equip.$i18n._join(eq.info) : eq.info.name;
    },
    // 入参为装备名字符串(彩票/邮件等):正则拆段后拼中文;解析失败原样返回
    equipName: function (str) {
      const exec = $equip.reg.name.exec(str);
      if (!exec) { return str; }
      return $equip.$i18n._join({ quality: exec[1], prefix: exec[2] || exec[3], type: exec[4] || exec[5] || exec[6] || exec[7] || exec[8] || exec[9] || exec[10], slot: exec[11], suffix: exec[12] });
    },
    // 物品整名翻译,未收录回退英文
    itemName: function (name) { return $equip.$i18n.items[name] || name; },
    // 任意名(装备或物品混合场景,如祭坛奖励):先按装备名解析,失败再查物品表
    anyName: function (str) { const e = $equip.$i18n.equipName(str); return e !== str ? e : $equip.$i18n.itemName(str); },
    // 装备显示名:开关关→英文;customname 玩家红字名不翻;否则用派生 namezh,缺失则即时解析
    displayName: function (eq) {
      if (!$config.settings.translateNames) { return eq.info.customname || eq.info.name; }
      if (eq.info.customname) { return eq.info.customname; }
      return eq.info.namezh || $equip.$i18n.equipName(eq.info.name);
    },
  },

  stats: {
    'Attack Damage': { scale: 50 / 3, fluc: 0.0854, forge: 'Physical Damage', binding: 'Binding of Slaughter', potency: 'Butcher', plus: 0.02 },
    'Attack Speed': { scale: Infinity, fluc: 0.0481, potency: 'Swift Strike', plus: 1.924, multi: true },
    'Attack Accuracy': { scale: 5000, fluc: 0.06069, forge: 'Physical Hit Chance', binding: 'Binding of Balance' },
    'Attack Crit Chance': { scale: 2000, fluc: 0.0105, forge: 'Physical Crit Chance', binding: 'Binding of Isaac', multi: true },
    'Attack Crit Damage': { scale: Infinity, fluc: 0.01, potency: 'Fatality', plus: 2 },
    'Counter-Parry': { scale: Infinity, fluc: 0, potency: 'Overpower', plus: 4 },
    'Magic Damage': { scale: 250 / 11, fluc: 0.082969, forge: 'Magical Damage', binding: 'Binding of Destruction', potency: 'Archmage', plus: 0.02 },
    'Casting Speed': { scale: Infinity, fluc: 0.0489, potency: 'Spellweaver', plus: 1.467 },
    'Magic Accuracy': { scale: 5000, fluc: 0.0491, forge: 'Magical Hit Chance', binding: 'Binding of Focus' },
    'Magic Crit Chance': { scale: 2000, fluc: 0.0114, forge: 'Magical Crit Chance', binding: 'Binding of Friendship', multi: true },
    'Spell Crit Damage': { scale: Infinity, fluc: 0.01, potency: 'Annihilator', plus: 2 },
    'Mana Conservation': { scale: Infinity, fluc: 0.1, potency: 'Economizer', plus: 5, multi: true },
    'Counter-Resist': { scale: Infinity, fluc: 0.1, potency: 'Penetrator', plus: 4 },
    'Physical Mitigation': { scale: 2000, fluc: 0.021, forge: 'Physical Defense', binding: 'Binding of Protection', multi: true },
    'Magical Mitigation': { scale: 2000, fluc: 0.0201, forge: 'Magical Defense', binding: 'Binding of Warding', multi: true },
    'Evade Chance': { scale: 2000, fluc: 0.025, forge: 'Evade Chance', binding: 'Binding of the Fleet', multi: true },
    'Block Chance': { scale: 2000, fluc: 0.0998, forge: 'Block Chance', binding: 'Binding of the Barrier', multi: true },
    'Parry Chance': { scale: 2000, fluc: 0.0894, forge: 'Parry Chance', binding: 'Binding of the Nimble', multi: true },
    'Resist Chance': { scale: 2000, fluc: 0.0804, forge: 'Resist Chance', binding: 'Binding of Negation', multi: true },
    'HP Bonus': { scale: Infinity, fluc: 0 },
    'MP Bonus': { scale: Infinity, fluc: 0 },
    'Burden': { scale: Infinity, fluc: 0 },
    'Interference': { scale: Infinity, fluc: 0 },
    'Fire EDB': { scale: 200, fluc: 0.0804, forge: 'Fire Spell Damage', binding: 'Binding of Surtr' },
    'Cold EDB': { scale: 200, fluc: 0.0804, forge: 'Cold Spell Damage', binding: 'Binding of Niflheim' },
    'Elec EDB': { scale: 200, fluc: 0.0804, forge: 'Elec Spell Damage', binding: 'Binding of Mjolnir' },
    'Wind EDB': { scale: 200, fluc: 0.0804, forge: 'Wind Spell Damage', binding: 'Binding of Freyr' },
    'Holy EDB': { scale: 200, fluc: 0.0804, forge: 'Holy Spell Damage', binding: 'Binding of Heimdall' },
    'Dark EDB': { scale: 200, fluc: 0.0804, forge: 'Dark Spell Damage', binding: 'Binding of Fenrir' },
    'Elemental': { scale: 250 / 7, fluc: 0.0306, forge: 'Elemental Proficiency', binding: 'Binding of the Elementalist' },
    'Divine': { scale: 250 / 7, fluc: 0.0306, forge: 'Divine Proficiency', binding: 'Binding of the Heaven-sent' },
    'Forbidden': { scale: 250 / 7, fluc: 0.0306, forge: 'Forbidden Proficiency', binding: 'Binding of the Demon-fiend' },
    'Deprecating': { scale: 250 / 7, fluc: 0.0306, forge: 'Deprecating Proficiency', binding: 'Binding of the Curse-weaver' },
    'Supportive': { scale: 250 / 7, fluc: 0.0306, forge: 'Supportive Proficiency', binding: 'Binding of the Earth-walker' },
    'Crushing': { scale: Infinity, fluc: 0.0155, forge: 'Crushing Mitigation', binding: 'Binding of Dampening', multi: true },
    'Slashing': { scale: Infinity, fluc: 0.0153, forge: 'Slashing Mitigation', binding: 'Binding of Stoneskin', multi: true },
    'Piercing': { scale: Infinity, fluc: 0.015, forge: 'Piercing Mitigation', binding: 'Binding of Deflection', multi: true },
    'Fire MIT': { scale: Infinity, fluc: 0.1, forge: 'Fire Mitigation', binding: 'Binding of the Fire-eater', multi: true },
    'Cold MIT': { scale: Infinity, fluc: 0.1, forge: 'Cold Mitigation', binding: 'Binding of the Frost-born', multi: true },
    'Elec MIT': { scale: Infinity, fluc: 0.1, forge: 'Elec Mitigation', binding: 'Binding of the Thunder-child', multi: true },
    'Wind MIT': { scale: Infinity, fluc: 0.1, forge: 'Wind Mitigation', binding: 'Binding of the Wind-waker', multi: true },
    'Holy MIT': { scale: Infinity, fluc: 0.1, forge: 'Holy Mitigation', binding: 'Binding of the Thrice-blessed', multi: true },
    'Dark MIT': { scale: Infinity, fluc: 0.1, forge: 'Dark Mitigation', binding: 'Binding of the Spirit-ward', multi: true },
    'Strength': { scale: 250 / 7, fluc: 0.03, forge: 'Strength Bonus', binding: 'Binding of the Ox' },
    'Dexterity': { scale: 250 / 7, fluc: 0.03, forge: 'Dexterity Bonus', binding: 'Binding of the Raccoon' },
    'Agility': { scale: 250 / 7, fluc: 0.03, forge: 'Agility Bonus', binding: 'Binding of the Cheetah' },
    'Endurance': { scale: 250 / 7, fluc: 0.03, forge: 'Endurance Bonus', binding: 'Binding of the Turtle' },
    'Intelligence': { scale: 250 / 7, fluc: 0.03, forge: 'Intelligence Bonus', binding: 'Binding of the Fox' },
    'Wisdom': { scale: 250 / 7, fluc: 0.03, forge: 'Wisdom Bonus', binding: 'Binding of the Owl' },
  },
  prefix: {
    'Ethereal': [],
    'Fiery': ['Fire EDB'],
    'Arctic': ['Cold EDB'],
    'Shocking': ['Elec EDB'],
    'Tempestuous': ['Wind EDB'],
    'Hallowed': ['Holy EDB'],
    'Demonic': ['Dark EDB'],
    'Ruby': ['Fire MIT'],
    'Cobalt': ['Cold MIT'],
    'Amber': ['Elec MIT'],
    'Jade': ['Wind MIT'],
    'Zircon': ['Holy MIT'],
    'Onyx': ['Dark MIT'],
    'Charged': ['Casting Speed'],
    'Frugal': ['Mana Conservation'],
    'Radiant': ['Magic Damage'],
    'Mystic': ['Spell Crit Damage'],
    'Agile': ['Attack Speed'],
    'Reinforced': ['Crushing', 'Slashing', 'Piercing'],
    'Savage': ['Attack Crit Damage'],
    'Shielding': ['Block Chance'],
    'Mithril': ['Burden'],
  },
  suffix: {
    'Slaughter': ['Attack Damage'],
    'Balance': ['Attack Accuracy', 'Attack Crit Chance'],
    'Swiftness': ['Attack Speed'],
    'the Barrier': ['Block Chance'],
    'the Nimble': ['Parry Chance'],
    'the Battlecaster': ['Magic Accuracy', 'Mana Conservation'],
    'the Vampire': [],
    'the Illithid': [],
    'the Banshee': [],
    'Destruction': ['Magic Damage'],
    'Surtr': ['Fire EDB'],
    'Niflheim': ['Cold EDB'],
    'Mjolnir': ['Elec EDB'],
    'Freyr': ['Wind EDB'],
    'Heimdall': ['Holy EDB'],
    'Fenrir': ['Dark EDB'],
    'the Elementalist': ['Elemental'],
    'the Heaven-sent': ['Divine'],
    'the Demon-fiend': ['Forbidden'],
    'the Earth-walker': ['Supportive'],
    'the Curse-weaver': ['Deprecating'],
    'Focus': ['Magic Accuracy', 'Magic Crit Chance', 'Mana Conservation'],
    'the Shadowdancer': ['Attack Crit Chance', 'Evade Chance'],
    'the Fleet': ['Evade Chance'],
    'the Arcanist': ['Magic Accuracy', 'Interference', 'Intelligence', 'Wisdom'],
    'Negation': ['Resist Chance'],
    'Protection': ['Physical Mitigation'],
    'Warding': ['Magical Mitigation'],
    'Dampening': ['Crushing'],
    'Stoneskin': ['Slashing'],
    'Deflection': ['Piercing'],
  },
  pmax: {
    'Axe': { 'Attack Damage': [59.87, 75.92], 'Attack Accuracy': [12.81], 'Attack Crit Chance': [5.37], 'Burden': [14], 'Interference': [3.5], 'Fire EDB': [0, 11.34], 'Cold EDB': [0, 11.34], 'Elec EDB': [0, 11.34], 'Wind EDB': [0, 11.34], 'Holy EDB': [0, 11.34], 'Dark EDB': [0, 11.34], 'Strength': [6.33], 'Dexterity': [4.08], 'Agility': [3.33] },
    'Club': { 'Attack Damage': [53.04, 67.72], 'Attack Accuracy': [12.81, 31.02], 'Attack Crit Chance': [5.37, 10.41], 'Magic Accuracy': [0, 7.91], 'Mana Conservation': [0, 16.11], 'Parry Chance': [0, 9.04], 'Burden': [9.8], 'Interference': [3.5], 'Fire EDB': [0, 11.34], 'Cold EDB': [0, 11.34], 'Elec EDB': [0, 11.34], 'Wind EDB': [0, 11.34], 'Holy EDB': [0, 11.34], 'Dark EDB': [0, 11.34], 'Strength': [6.33], 'Dexterity': [4.08], 'Agility': [4.08] },
    'Rapier': { 'Attack Damage': [39.38, 51.33], 'Attack Accuracy': [21.92, 44.68], 'Attack Crit Chance': [5.37, 10.41], 'Magic Accuracy': [0, 7.91], 'Mana Conservation': [0, 16.11], 'Parry Chance': [18.89, 26.94], 'Burden': [6.3], 'Interference': [3.5], 'Fire EDB': [0, 11.34], 'Cold EDB': [0, 11.34], 'Elec EDB': [0, 11.34], 'Wind EDB': [0, 11.34], 'Holy EDB': [0, 11.34], 'Dark EDB': [0, 11.34], 'Strength': [4.08], 'Dexterity': [6.33], 'Agility': [4.08] },
    'Shortsword': { 'Attack Damage': [47.92, 61.58], 'Attack Speed': [0, 6.54], 'Attack Accuracy': [27.99, 53.79], 'Attack Crit Chance': [5.37, 10.41], 'Magic Accuracy': [0, 7.91], 'Mana Conservation': [0, 16.11], 'Parry Chance': [18.89], 'Burden': [5.25], 'Interference': [3.5], 'Fire EDB': [0, 11.34], 'Cold EDB': [0, 11.34], 'Elec EDB': [0, 11.34], 'Wind EDB': [0, 11.34], 'Holy EDB': [0, 11.34], 'Dark EDB': [0, 11.34], 'Strength': [6.33], 'Dexterity': [6.33], 'Agility': [6.33] },
    'Wakizashi': { 'Attack Damage': [35.11, 46.21], 'Attack Speed': [12.56, 18.57], 'Attack Accuracy': [24.95, 49.24], 'Attack Crit Chance': [5.37, 10.41], 'Magic Accuracy': [0, 7.91], 'Mana Conservation': [0, 16.12], 'Parry Chance': [22.47, 30.53], 'Burden': [2.8], 'Interference': [3.5], 'Fire EDB': [0, 11.34], 'Cold EDB': [0, 11.34], 'Elec EDB': [0, 11.34], 'Wind EDB': [0, 11.34], 'Holy EDB': [0, 11.34], 'Dark EDB': [0, 11.34], 'Strength': [3.33], 'Dexterity': [7.83], 'Agility': [7.83] },
    'Estoc': { 'Attack Damage': [64.99, 82.07], 'Attack Accuracy': [9.77, 26.47], 'Attack Crit Chance': [7.99, 13.56], 'Magic Accuracy': [0, 12.82], 'Mana Conservation': [0, 26.11], 'Burden': [14], 'Interference': [7], 'Fire EDB': [0, 11.34], 'Cold EDB': [0, 11.34], 'Elec EDB': [0, 11.34], 'Wind EDB': [0, 11.34], 'Holy EDB': [0, 11.34], 'Dark EDB': [0, 11.34], 'Strength': [11.58], 'Dexterity': [6.03], 'Agility': [3.93] },
    'Longsword': { 'Attack Damage': [78.66, 98.47], 'Attack Accuracy': [12.81, 31.02], 'Attack Crit Chance': [8.52, 14.19], 'Magic Accuracy': [0, 12.81], 'Mana Conservation': [0, 26.11], 'Burden': [21], 'Interference': [10.5], 'Fire EDB': [0, 11.34], 'Cold EDB': [0, 11.34], 'Elec EDB': [0, 11.34], 'Wind EDB': [0, 11.34], 'Holy EDB': [0, 11.34], 'Dark EDB': [0, 11.34], 'Strength': [12.33], 'Dexterity': [9.33], 'Agility': [4.83] },
    'Mace': { 'Attack Damage': [64.99, 82.07], 'Attack Accuracy': [12.2, 30.11], 'Attack Crit Chance': [7.99, 13.56], 'Magic Accuracy': [0, 12.82], 'Mana Conservation': [0, 26.11], 'Burden': [14], 'Interference': [7], 'Fire EDB': [0, 11.34], 'Cold EDB': [0, 11.34], 'Elec EDB': [0, 11.34], 'Wind EDB': [0, 11.34], 'Holy EDB': [0, 11.34], 'Dark EDB': [0, 11.34], 'Strength': [11.73], 'Dexterity': [7.83], 'Agility': [4.08] },
    'Katana': { 'Attack Damage': [64.99, 82.07], 'Attack Accuracy': [27.98, 53.78], 'Attack Crit Chance': [8.52, 14.19], 'Burden': [14], 'Interference': [7], 'Fire EDB': [0, 11.34], 'Cold EDB': [0, 11.34], 'Elec EDB': [0, 11.34], 'Wind EDB': [0, 11.34], 'Holy EDB': [0, 11.34], 'Dark EDB': [0, 11.34], 'Strength': [12.33], 'Dexterity': [9.33], 'Agility': [4.83] },
    'Katalox Staff': { 'Attack Damage': [34.22], 'Magic Damage': [32.39, 52.2], 'Magic Accuracy': [19.18, 38.34], 'Magic Crit Chance': [7.3, 12.39], 'Mana Conservation': [0, 33.08], 'Burden': [7], 'Fire EDB': [0, 11.31], 'Cold EDB': [0, 11.31], 'Elec EDB': [0, 11.31], 'Wind EDB': [0, 11.31], 'Holy EDB': [11.31, 21.76, 27.39, 37.84], 'Dark EDB': [11.31, 21.76, 27.39, 37.84], 'Divine': [8.28, 16.24], 'Forbidden': [8.28, 16.24], 'Deprecating': [6.14], 'Intelligence': [7.22], 'Wisdom': [4.82] },
    'Oak Staff': { 'Attack Damage': [34.23], 'Magic Damage': [31.98], 'Magic Accuracy': [18.94, 38], 'Magic Crit Chance': [5.82, 10.61], 'Mana Conservation': [0, 33.09], 'Counter-Resist': [13.58], 'Burden': [4.9], 'Fire EDB': [8.1, 18.56], 'Cold EDB': [8.1, 18.56], 'Elec EDB': [0, 11.32], 'Wind EDB': [0, 11.32], 'Holy EDB': [16.14, 26.6, 32.22, 42.68], 'Dark EDB': [0, 11.32], 'Elemental': [6.45], 'Divine': [6.45], 'Supportive': [11.81, 19.76], 'Intelligence': [4.82], 'Wisdom': [7.22] },
    'Redwood Staff': { 'Attack Damage': [34.23], 'Magic Damage': [31.98, 51.71], 'Magic Accuracy': [18.94, 38], 'Magic Crit Chance': [5.82, 10.61], 'Mana Conservation': [0, 33.09], 'Burden': [4.9], 'Fire EDB': [11.32, 21.77, 27.4, 37.85], 'Cold EDB': [11.32, 21.77, 27.4, 37.85], 'Elec EDB': [11.32, 21.77, 27.4, 37.85], 'Wind EDB': [11.32, 21.77, 27.4, 37.85], 'Holy EDB': [0, 11.32], 'Dark EDB': [0, 11.32], 'Elemental': [8.29, 16.24], 'Supportive': [4.31], 'Deprecating': [4.31], 'Intelligence': [6.32], 'Wisdom': [6.32] },
    'Willow Staff': { 'Attack Damage': [34.23], 'Magic Damage': [31.98, 51.71], 'Magic Accuracy': [18.94, 38], 'Magic Crit Chance': [5.82, 10.61], 'Mana Conservation': [0, 33.09], 'Counter-Resist': [13.58], 'Burden': [4.9], 'Fire EDB': [0, 11.32], 'Cold EDB': [0, 11.32], 'Elec EDB': [8.1, 18.56], 'Wind EDB': [8.1, 18.56], 'Holy EDB': [0, 11.32], 'Dark EDB': [16.14, 26.6], 'Elemental': [6.14], 'Forbidden': [6.14], 'Deprecating': [11.81, 19.76], 'Intelligence': [4.82], 'Wisdom': [7.22] },
    'Buckler': { 'Attack Speed': [0, 3.65], 'Magic Accuracy': [0, 12.82], 'Mana Conservation': [0, 26.1], 'Physical Mitigation': [2.33, 4.22], 'Magical Mitigation': [2.23, 6.65], 'Block Chance': [31.03, 37.52], 'Parry Chance': [0, 9.04], 'Burden': [2.8, 2.1], 'Interference': [1.4], 'Crushing': [0, 3.27], 'Slashing': [0, 3.23], 'Piercing': [0, 3.16], 'Strength': [6.33], 'Dexterity': [6.33], 'Endurance': [6.33], 'Agility': [6.33] },
    'Force Shield': { 'Physical Mitigation': [3.38, 5.48], 'Magical Mitigation': [3.24, 7.86], 'Block Chance': [38.52], 'Burden': [2.8], 'Interference': [28], 'Crushing': [0, 7.14], 'Slashing': [0, 7.05], 'Piercing': [0, 6.91], 'Fire MIT': [0, 26.1], 'Cold MIT': [0, 26.1], 'Elec MIT': [0, 26.1], 'Wind MIT': [0, 26.1], 'Holy MIT': [0, 26.1], 'Dark MIT': [0, 26.1], 'Strength': [6.33], 'Dexterity': [6.33], 'Endurance': [6.33], 'Agility': [6.33] },
    'Kite Shield': { 'Attack Speed': [0, 3.65], 'Physical Mitigation': [3.38, 5.48], 'Magical Mitigation': [3.24, 7.86], 'Block Chance': [36.02], 'Burden': [10.5, 7.91], 'Interference': [10.5], 'Crushing': [0, 3.27, 7.14, 10.24], 'Slashing': [0, 3.23, 7.05, 10.11], 'Piercing': [0, 3.16, 6.91, 9.91], 'Strength': [6.33], 'Dexterity': [6.33], 'Endurance': [6.33], 'Agility': [6.33] },
    'Phase Cap': { 'Attack Accuracy': [4.62], 'Magic Damage': [0, 4.23], 'Casting Speed': [0, 3.47], 'Magic Accuracy': [5.45], 'Spell Crit Damage': [0, 3.91], 'Mana Conservation': [0, 3.61], 'Physical Mitigation': [3.38], 'Magical Mitigation': [4.24], 'Evade Chance': [5.28], 'Resist Chance': [6.52], 'Fire EDB': [0, 16.97], 'Cold EDB': [0, 16.97], 'Elec EDB': [0, 16.97], 'Wind EDB': [0, 16.97], 'Holy EDB': [0, 16.97], 'Dark EDB': [0, 16.97], 'Crushing': [2.5], 'Fire MIT': [0, 26.11], 'Cold MIT': [0, 26.11], 'Elec MIT': [0, 26.11], 'Wind MIT': [0, 26.11], 'Holy MIT': [0, 26.11], 'Dark MIT': [0, 26.11], 'Agility': [6.03], 'Intelligence': [7.08], 'Wisdom': [7.08] },
    'Phase Robe': { 'Attack Accuracy': [5.41], 'Magic Damage': [0, 4.9], 'Casting Speed': [0, 4.06], 'Magic Accuracy': [6.43], 'Spell Crit Damage': [0, 4.67], 'Mana Conservation': [0, 4.11], 'Physical Mitigation': [4.01], 'Magical Mitigation': [5.05], 'Evade Chance': [6.28], 'Resist Chance': [7.64], 'Fire EDB': [0, 20.18], 'Cold EDB': [0, 20.18], 'Elec EDB': [0, 20.18], 'Wind EDB': [0, 20.18], 'Holy EDB': [0, 20.18], 'Dark EDB': [0, 20.18], 'Crushing': [2.96], 'Fire MIT': [0, 31.11], 'Cold MIT': [0, 31.11], 'Elec MIT': [0, 31.11], 'Wind MIT': [0, 31.11], 'Holy MIT': [0, 31.11], 'Dark MIT': [0, 31.11], 'Agility': [7.17], 'Intelligence': [8.43], 'Wisdom': [8.43] },
    'Phase Gloves': { 'Attack Accuracy': [4.25], 'Magic Damage': [0, 3.9], 'Casting Speed': [0, 3.18], 'Magic Accuracy': [4.96], 'Spell Crit Damage': [0, 3.53], 'Mana Conservation': [0, 3.41], 'Physical Mitigation': [3.07], 'Magical Mitigation': [3.84], 'Evade Chance': [4.78], 'Resist Chance': [5.95], 'Fire EDB': [0, 15.36], 'Cold EDB': [0, 15.36], 'Elec EDB': [0, 15.36], 'Wind EDB': [0, 15.36], 'Holy EDB': [0, 15.36], 'Dark EDB': [0, 15.36], 'Crushing': [2.26], 'Fire MIT': [0, 23.61], 'Cold MIT': [0, 23.61], 'Elec MIT': [0, 23.61], 'Wind MIT': [0, 23.61], 'Holy MIT': [0, 23.61], 'Dark MIT': [0, 23.61], 'Agility': [5.46], 'Intelligence': [6.42], 'Wisdom': [6.42] },
    'Phase Pants': { 'Attack Accuracy': [5.04], 'Magic Damage': [0, 4.56], 'Casting Speed': [0, 3.77], 'Magic Accuracy': [5.94], 'Spell Crit Damage': [0, 4.29], 'Mana Conservation': [0, 3.91], 'Physical Mitigation': [3.7], 'Magical Mitigation': [4.64], 'Evade Chance': [5.78], 'Resist Chance': [7.08], 'Fire EDB': [0, 18.58], 'Cold EDB': [0, 18.58], 'Elec EDB': [0, 18.58], 'Wind EDB': [0, 18.58], 'Holy EDB': [0, 18.58], 'Dark EDB': [0, 18.58], 'Crushing': [2.73], 'Fire MIT': [0, 28.61], 'Cold MIT': [0, 28.61], 'Elec MIT': [0, 28.61], 'Wind MIT': [0, 28.61], 'Holy MIT': [0, 28.61], 'Dark MIT': [0, 28.61], 'Agility': [6.6], 'Intelligence': [7.77], 'Wisdom': [7.77] },
    'Phase Shoes': { 'Attack Accuracy': [3.83], 'Magic Damage': [0, 3.57], 'Casting Speed': [0, 2.89], 'Magic Accuracy': [4.47], 'Spell Crit Damage': [0, 3.15], 'Mana Conservation': [0, 3.11], 'Physical Mitigation': [2.75], 'Magical Mitigation': [3.44], 'Evade Chance': [4.28], 'Resist Chance': [5.39], 'Fire EDB': [0, 13.75], 'Cold EDB': [0, 13.75], 'Elec EDB': [0, 13.75], 'Wind EDB': [0, 13.75], 'Holy EDB': [0, 13.75], 'Dark EDB': [0, 13.75], 'Crushing': [2.03], 'Fire MIT': [0, 21.11], 'Cold MIT': [0, 21.11], 'Elec MIT': [0, 21.11], 'Wind MIT': [0, 21.11], 'Holy MIT': [0, 21.11], 'Dark MIT': [0, 21.11], 'Agility': [4.89], 'Intelligence': [5.73], 'Wisdom': [5.73] },
    'Cotton Cap': { 'Attack Accuracy': [4.62], 'Casting Speed': [0, 3.47], 'Magic Accuracy': [4.23], 'Mana Conservation': [0, 3.61], 'Physical Mitigation': [4.43, 6.74], 'Magical Mitigation': [4.24, 9.07], 'Evade Chance': [4.03], 'Resist Chance': [6.11], 'Proficiency': [0, 8.29], 'Crushing': [3.27], 'Fire MIT': [0, 26.11], 'Cold MIT': [0, 26.11], 'Elec MIT': [0, 26.11], 'Wind MIT': [0, 26.11], 'Holy MIT': [0, 26.11], 'Dark MIT': [0, 26.11], 'Agility': [4.83], 'Intelligence': [6.33], 'Wisdom': [6.33] },
    'Cotton Robe': { 'Attack Accuracy': [5.41], 'Casting Speed': [0, 4.06], 'Magic Accuracy': [4.96], 'Mana Conservation': [0, 4.11], 'Physical Mitigation': [5.27, 8.04], 'Magical Mitigation': [5.05, 10.83], 'Evade Chance': [4.78], 'Resist Chance': [7.16], 'Proficiency': [0, 9.89], 'Crushing': [3.89], 'Fire MIT': [0, 31.11], 'Cold MIT': [0, 31.11], 'Elec MIT': [0, 31.11], 'Wind MIT': [0, 31.11], 'Holy MIT': [0, 31.11], 'Dark MIT': [0, 31.11], 'Agility': [5.73], 'Intelligence': [7.53], 'Wisdom': [7.53] },
    'Cotton Gloves': { 'Attack Accuracy': [4.25], 'Casting Speed': [0, 3.18], 'Magic Accuracy': [3.88], 'Mana Conservation': [0, 3.41], 'Physical Mitigation': [4.01, 6.09], 'Magical Mitigation': [3.84, 8.18], 'Evade Chance': [3.65], 'Resist Chance': [5.63], 'Proficiency': [0, 7.5], 'Crushing': [2.96], 'Fire MIT': [0, 23.61], 'Cold MIT': [0, 23.61], 'Elec MIT': [0, 23.61], 'Wind MIT': [0, 23.61], 'Holy MIT': [0, 23.61], 'Dark MIT': [0, 23.61], 'Agility': [4.38], 'Intelligence': [5.73], 'Wisdom': [5.73] },
    'Cotton Pants': { 'Attack Accuracy': [5.04], 'Casting Speed': [0, 3.77], 'Magic Accuracy': [4.62], 'Mana Conservation': [0, 3.91], 'Physical Mitigation': [4.85, 7.39], 'Magical Mitigation': [4.64, 9.95], 'Evade Chance': [4.4], 'Resist Chance': [6.68], 'Proficiency': [0, 9.09], 'Crushing': [3.58], 'Fire MIT': [0, 28.61], 'Cold MIT': [0, 28.61], 'Elec MIT': [0, 28.61], 'Wind MIT': [0, 28.61], 'Holy MIT': [0, 28.61], 'Dark MIT': [0, 28.61], 'Agility': [5.28], 'Intelligence': [6.93], 'Wisdom': [6.93] },
    'Cotton Shoes': { 'Attack Accuracy': [3.83], 'Casting Speed': [0, 2.89], 'Magic Accuracy': [3.49], 'Mana Conservation': [0, 3.11], 'Physical Mitigation': [3.59, 5.44], 'Magical Mitigation': [3.44, 7.3], 'Evade Chance': [3.28], 'Resist Chance': [5.07], 'Proficiency': [0, 6.7], 'Crushing': [2.65], 'Fire MIT': [0, 21.11], 'Cold MIT': [0, 21.11], 'Elec MIT': [0, 21.11], 'Wind MIT': [0, 21.11], 'Holy MIT': [0, 21.11], 'Dark MIT': [0, 21.11], 'Agility': [3.93], 'Intelligence': [5.13], 'Wisdom': [5.13] },
    'Shade Helmet': { 'Attack Damage': [11.25], 'Attack Speed': [0, 3.69], 'Attack Accuracy': [6.78], 'Attack Crit Chance': [0, 2.75], 'Attack Crit Damage': [0, 3.12], 'Magic Accuracy': [0, 7.01], 'Physical Mitigation': [6.97], 'Magical Mitigation': [5.26], 'Evade Chance': [4.42, 6.67], 'Resist Chance': [14.21, 21.44], 'Interference': [8.4, 2.1], 'Crushing': [5.99], 'Slashing': [5.92], 'Fire MIT': [0, 26.17], 'Cold MIT': [0, 26.17], 'Elec MIT': [0, 26.17], 'Wind MIT': [0, 26.17], 'Holy MIT': [0, 26.17], 'Dark MIT': [0, 26.17], 'Strength': [4.1], 'Dexterity': [4.85], 'Endurance': [4.1], 'Agility': [4.85], 'Intelligence': [0, 3.38], 'Wisdom': [0, 3.38] },
    'Shade Breastplate': { 'Attack Damage': [13.3], 'Attack Speed': [0, 4.31], 'Attack Accuracy': [7.99], 'Attack Crit Chance': [0, 3.27], 'Attack Crit Damage': [0, 3.72], 'Magic Accuracy': [0, 8.29], 'Physical Mitigation': [8.31], 'Magical Mitigation': [6.27], 'Evade Chance': [5.24, 7.94], 'Resist Chance': [16.86, 25.54], 'Interference': [10.08, 2.52], 'Crushing': [7.16], 'Slashing': [7.06], 'Fire MIT': [0, 31.17], 'Cold MIT': [0, 31.17], 'Elec MIT': [0, 31.17], 'Wind MIT': [0, 31.17], 'Holy MIT': [0, 31.17], 'Dark MIT': [0, 31.17], 'Strength': [4.85], 'Dexterity': [5.75], 'Endurance': [4.85], 'Agility': [5.75], 'Intelligence': [0, 3.98], 'Wisdom': [0, 3.98] },
    'Shade Gauntlets': { 'Attack Damage': [10.22], 'Attack Speed': [0, 3.4], 'Attack Accuracy': [6.17], 'Attack Crit Chance': [0, 2.49], 'Attack Crit Damage': [0, 2.82], 'Magic Accuracy': [0, 6.37], 'Physical Mitigation': [6.29], 'Magical Mitigation': [4.76], 'Evade Chance': [4.02, 6.04], 'Resist Chance': [12.92, 19.43], 'Interference': [7.56, 1.89], 'Crushing': [5.42], 'Slashing': [5.35], 'Fire MIT': [0, 23.67], 'Cold MIT': [0, 23.67], 'Elec MIT': [0, 23.67], 'Wind MIT': [0, 23.67], 'Holy MIT': [0, 23.67], 'Dark MIT': [0, 23.67], 'Strength': [3.74], 'Dexterity': [4.4], 'Endurance': [3.74], 'Agility': [4.4], 'Intelligence': [0, 3.08], 'Wisdom': [0, 3.08] },
    'Shade Leggings': { 'Attack Damage': [12.27], 'Attack Speed': [0, 4.03], 'Attack Accuracy': [7.39], 'Attack Crit Chance': [0, 3.01], 'Attack Crit Damage': [0, 3.42], 'Magic Accuracy': [0, 7.65], 'Physical Mitigation': [7.64], 'Magical Mitigation': [5.76], 'Evade Chance': [4.84, 7.32], 'Resist Chance': [15.57, 23.53], 'Interference': [9.24, 2.31], 'Crushing': [6.58], 'Slashing': [6.5], 'Fire MIT': [0, 28.67], 'Cold MIT': [0, 28.67], 'Elec MIT': [0, 28.67], 'Wind MIT': [0, 28.67], 'Holy MIT': [0, 28.67], 'Dark MIT': [0, 28.67], 'Strength': [4.49], 'Dexterity': [5.3], 'Endurance': [4.49], 'Agility': [5.3], 'Intelligence': [0, 3.68], 'Wisdom': [0, 3.68] },
    'Shade Boots': { 'Attack Damage': [9.2], 'Attack Speed': [0, 3.06], 'Attack Accuracy': [5.57], 'Attack Crit Chance': [0, 2.22], 'Attack Crit Damage': [0, 2.52], 'Magic Accuracy': [0, 5.73], 'Physical Mitigation': [5.62], 'Magical Mitigation': [4.26], 'Evade Chance': [3.59, 5.39], 'Resist Chance': [11.55, 17.34], 'Interference': [6.72, 1.68], 'Crushing': [4.83], 'Slashing': [4.77], 'Fire MIT': [0, 21.17], 'Cold MIT': [0, 21.17], 'Elec MIT': [0, 21.17], 'Wind MIT': [0, 21.17], 'Holy MIT': [0, 21.17], 'Dark MIT': [0, 21.17], 'Strength': [3.35], 'Dexterity': [3.95], 'Endurance': [3.35], 'Agility': [3.95], 'Intelligence': [0, 2.78], 'Wisdom': [0, 2.78] },
    'Leather Helmet': { 'Attack Speed': [0, 3.69], 'Physical Mitigation': [8.12, 11.17], 'Magical Mitigation': [6.67, 11.97], 'Evade Chance': [2.54], 'Resist Chance': [10.59], 'Burden': [3.5], 'Interference': [7], 'Crushing': [7.93, 11.03, 14.91, 18.01], 'Slashing': [7.83, 10.89, 14.71, 17.77], 'Piercing': [3.93, 6.93, 10.68, 13.68], 'Fire MIT': [0, 26.17], 'Cold MIT': [0, 26.17], 'Elec MIT': [0, 26.17], 'Wind MIT': [0, 26.17], 'Holy MIT': [0, 26.17], 'Dark MIT': [0, 26.17], 'Strength': [4.85], 'Dexterity': [4.85], 'Endurance': [4.1], 'Agility': [4.1] },
    'Leather Breastplate': { 'Attack Speed': [0, 4.31], 'Physical Mitigation': [9.7, 13.35], 'Magical Mitigation': [7.95, 14.33], 'Evade Chance': [2.99], 'Resist Chance': [12.52], 'Burden': [4.2], 'Interference': [8.4], 'Crushing': [9.48, 13.2, 17.85, 21.57], 'Slashing': [9.36, 13.03, 17.62, 21.29], 'Piercing': [4.68, 8.28, 12.78, 16.38], 'Fire MIT': [0, 31.17], 'Cold MIT': [0, 31.17], 'Elec MIT': [0, 31.17], 'Wind MIT': [0, 31.17], 'Holy MIT': [0, 31.17], 'Dark MIT': [0, 31.17], 'Strength': [5.75], 'Dexterity': [5.75], 'Endurance': [4.85], 'Agility': [4.85] },
    'Leather Gauntlets': { 'Attack Speed': [0, 3.4], 'Physical Mitigation': [7.34, 10.09], 'Magical Mitigation': [6.02, 10.81], 'Evade Chance': [2.32], 'Resist Chance': [9.62], 'Burden': [3.15], 'Interference': [6.3], 'Crushing': [7.16, 9.95, 13.43, 16.22], 'Slashing': [7.06, 9.82, 13.26, 16.01], 'Piercing': [3.55, 6.25, 9.63, 12.33], 'Fire MIT': [0, 23.67], 'Cold MIT': [0, 23.67], 'Elec MIT': [0, 23.67], 'Wind MIT': [0, 23.67], 'Holy MIT': [0, 23.67], 'Dark MIT': [0, 23.67], 'Strength': [4.4], 'Dexterity': [4.4], 'Endurance': [3.74], 'Agility': [3.74] },
    'Leather Leggings': { 'Attack Speed': [0, 4.03], 'Physical Mitigation': [8.92, 12.28], 'Magical Mitigation': [7.31, 13.14], 'Evade Chance': [2.77], 'Resist Chance': [11.55], 'Burden': [3.85], 'Interference': [7.7], 'Crushing': [8.71, 12.12, 16.38, 19.79], 'Slashing': [8.59, 11.96, 16.17, 19.53], 'Piercing': [4.3, 7.6, 11.73, 15.03], 'Fire MIT': [0, 28.67], 'Cold MIT': [0, 28.67], 'Elec MIT': [0, 28.67], 'Wind MIT': [0, 28.67], 'Holy MIT': [0, 28.67], 'Dark MIT': [0, 28.67], 'Strength': [5.3], 'Dexterity': [5.3], 'Endurance': [4.49], 'Agility': [4.49] },
    'Leather Boots': { 'Attack Speed': [0, 3.06], 'Physical Mitigation': [6.55, 8.98], 'Magical Mitigation': [5.38, 9.62], 'Evade Chance': [2.09], 'Resist Chance': [8.66], 'Burden': [2.8], 'Interference': [5.6], 'Crushing': [6.38, 8.86, 11.96, 14.44], 'Slashing': [6.3, 8.75, 11.81, 14.26], 'Piercing': [3.18, 5.58, 8.58, 10.98], 'Fire MIT': [0, 21.17], 'Cold MIT': [0, 21.17], 'Elec MIT': [0, 21.17], 'Wind MIT': [0, 21.17], 'Holy MIT': [0, 21.17], 'Dark MIT': [0, 21.17], 'Strength': [3.95], 'Dexterity': [3.95], 'Endurance': [3.35], 'Agility': [3.35] },
    'Power Helmet': { 'Attack Damage': [18.04, 25.73], 'Attack Accuracy': [6.15, 21.02], 'Attack Crit Chance': [1.43, 5.68], 'Attack Crit Damage': [1.36, 4.36], 'Physical Mitigation': [8.11, 11.16], 'Magical Mitigation': [6.26, 11.48], 'Burden': [10.5, 7.91], 'Interference': [17.5], 'Crushing': [4.82], 'Slashing': [7.82], 'Piercing': [7.67], 'Fire MIT': [0, 26.13], 'Cold MIT': [0, 26.13], 'Elec MIT': [0, 26.13], 'Wind MIT': [0, 26.13], 'Holy MIT': [0, 26.13], 'Dark MIT': [0, 26.13], 'Strength': [7.09], 'Dexterity': [6.34], 'Endurance': [4.84] },
    'Power Armor': { 'Attack Damage': [21.46, 30.68], 'Attack Accuracy': [7.24, 25.09], 'Attack Crit Chance': [1.69, 6.8], 'Attack Crit Damage': [1.61, 5.21], 'Physical Mitigation': [9.69, 13.34], 'Magical Mitigation': [7.46, 13.73], 'Burden': [12.6, 9.45], 'Interference': [21], 'Crushing': [5.75], 'Slashing': [9.35], 'Piercing': [9.17], 'Fire MIT': [0, 31.13], 'Cold MIT': [0, 31.13], 'Elec MIT': [0, 31.13], 'Wind MIT': [0, 31.13], 'Holy MIT': [0, 31.13], 'Dark MIT': [0, 31.13], 'Strength': [8.44], 'Dexterity': [7.54], 'Endurance': [5.74] },
    'Power Gauntlets': { 'Attack Damage': [16.33, 23.25], 'Attack Accuracy': [5.6, 19.02], 'Attack Crit Chance': [1.3, 5.14], 'Attack Crit Damage': [1.24, 3.94], 'Physical Mitigation': [7.33, 10.09], 'Magical Mitigation': [5.65, 10.36], 'Burden': [9.45, 7.07], 'Interference': [15.75], 'Crushing': [4.36], 'Slashing': [7.06], 'Piercing': [6.92], 'Fire MIT': [0, 23.63], 'Cold MIT': [0, 23.63], 'Elec MIT': [0, 23.63], 'Wind MIT': [0, 23.63], 'Holy MIT': [0, 23.63], 'Dark MIT': [0, 23.63], 'Strength': [6.43], 'Dexterity': [5.74], 'Endurance': [4.39] },
    'Power Leggings': { 'Attack Damage': [19.75, 28.20], 'Attack Accuracy': [6.69, 23.08], 'Attack Crit Chance': [1.57, 6.25], 'Attack Crit Damage': [1.49, 4.79], 'Physical Mitigation': [8.91, 12.27], 'Magical Mitigation': [6.86, 12.61], 'Burden': [11.55, 8.68], 'Interference': [19.25], 'Crushing': [5.29], 'Slashing': [8.59], 'Piercing': [8.42], 'Fire MIT': [0, 28.63], 'Cold MIT': [0, 28.63], 'Elec MIT': [0, 28.63], 'Wind MIT': [0, 28.63], 'Holy MIT': [0, 28.63], 'Dark MIT': [0, 28.63], 'Strength': [7.78], 'Dexterity': [6.94], 'Endurance': [5.29] },
    'Power Boots': { 'Attack Damage': [14.62, 20.77], 'Attack Accuracy': [5.05, 16.95], 'Attack Crit Chance': [1.17, 4.57], 'Attack Crit Damage': [1.11, 3.51], 'Physical Mitigation': [6.54, 8.97], 'Magical Mitigation': [5.05, 9.23], 'Burden': [8.4, 6.3], 'Interference': [14], 'Crushing': [3.89], 'Slashing': [6.29], 'Piercing': [6.17], 'Fire MIT': [0, 21.13], 'Cold MIT': [0, 21.13], 'Elec MIT': [0, 21.13], 'Wind MIT': [0, 21.13], 'Holy MIT': [0, 21.13], 'Dark MIT': [0, 21.13], 'Strength': [5.74], 'Dexterity': [5.14], 'Endurance': [3.94] },
    'Plate Helmet': { 'Physical Mitigation': [10.73, 14.3], 'Magical Mitigation': [7.76, 13.29], 'Block Chance': [0, 6.09], 'Burden': [14, 10.5], 'Interference': [14], 'Crushing': [5.98, 12.96], 'Slashing': [9.73, 16.62], 'Piercing': [9.54, 16.29], 'Fire MIT': [0, 26.11], 'Cold MIT': [0, 26.11], 'Elec MIT': [0, 26.11], 'Wind MIT': [0, 26.11], 'Holy MIT': [0, 26.11], 'Dark MIT': [0, 26.11], 'Strength': [4.83], 'Dexterity': [4.83], 'Endurance': [6.33] },
    'Plate Cuirass': { 'Physical Mitigation': [12.83, 17.12], 'Magical Mitigation': [9.27, 15.9], 'Block Chance': [0, 7.09], 'Burden': [16.8, 12.6], 'Interference': [16.8], 'Crushing': [7.15, 15.52], 'Slashing': [11.64, 19.91], 'Piercing': [11.42, 19.52], 'Fire MIT': [0, 31.11], 'Cold MIT': [0, 31.11], 'Elec MIT': [0, 31.11], 'Wind MIT': [0, 31.11], 'Holy MIT': [0, 31.11], 'Dark MIT': [0, 31.11], 'Strength': [5.73], 'Dexterity': [5.73], 'Endurance': [7.53] },
    'Plate Gauntlets': { 'Physical Mitigation': [9.68, 12.9], 'Magical Mitigation': [7.02, 12], 'Block Chance': [0, 5.59], 'Burden': [12.6, 9.45], 'Interference': [12.6], 'Crushing': [5.41, 11.69], 'Slashing': [8.78, 14.98], 'Piercing': [8.61, 14.69], 'Fire MIT': [0, 23.61], 'Cold MIT': [0, 23.61], 'Elec MIT': [0, 23.61], 'Wind MIT': [0, 23.61], 'Holy MIT': [0, 23.61], 'Dark MIT': [0, 23.61], 'Strength': [4.38], 'Dexterity': [4.38], 'Endurance': [5.73] },
    'Plate Greaves': { 'Physical Mitigation': [11.78, 15.71], 'Magical Mitigation': [8.52, 14.61], 'Block Chance': [0, 6.59], 'Burden': [15.4, 11.55], 'Interference': [15.4], 'Crushing': [6.57, 14.25], 'Slashing': [10.7, 18.27], 'Piercing': [10.49, 17.91], 'Fire MIT': [0, 28.61], 'Cold MIT': [0, 28.61], 'Elec MIT': [0, 28.61], 'Wind MIT': [0, 28.61], 'Holy MIT': [0, 28.61], 'Dark MIT': [0, 28.61], 'Strength': [5.28], 'Dexterity': [5.28], 'Endurance': [6.93] },
    'Plate Sabatons': { 'Physical Mitigation': [8.63, 11.49], 'Magical Mitigation': [6.25, 10.67], 'Block Chance': [0, 5.09], 'Burden': [11.2, 8.4], 'Interference': [11.2], 'Crushing': [4.82, 10.4], 'Slashing': [7.82, 13.33], 'Piercing': [7.67, 13.07], 'Fire MIT': [0, 21.11], 'Cold MIT': [0, 21.11], 'Elec MIT': [0, 21.11], 'Wind MIT': [0, 21.11], 'Holy MIT': [0, 21.11], 'Dark MIT': [0, 21.11], 'Strength': [3.93], 'Dexterity': [3.93], 'Endurance': [5.13] },
  },
  ppxp: {
    'Axe': 375, 'Club': 375, 'Rapier': 377, 'Shortsword': 377, 'Wakizashi': 378,
    'Estoc': 377, 'Katana': 375, 'Longsword': 375, 'Mace': 375,
    'Katalox Staff': 368, 'Oak Staff': 371, 'Redwood Staff': 371, 'Willow Staff': 371,
    'Buckler': 374, 'Force Shield': 374, 'Kite Shield': 374,
    'Phase': 377, 'Cotton': 377,
    'Arcanist': 421, 'Shade': 394, 'Leather': 393,
    'Power': 382, ' Plate': 377,
  },
  quality: {
    'flimsy': 1, 'crude': 2, 'fair': 3, 'average': 4, 'fine': 5, 'superior': 6, 'exquisite': 7, 'magnificent': 8, 'legendary': 9, 'peerless': 10,
  },

  parse: {

    name: function (name, eq) {
      eq = eq || { info: {}, data: {}, node: {} };
      if (!eq.info.name) {
        eq.info.name = name;
      }
      const exec = $equip.reg.name.exec(name);
      if (exec) {
        if (!eq.info.category) {
          eq.info.category = exec[4] ? 'One-handed Weapon' : exec[5] ? 'Two-handed Weapon' : exec[6] ? 'Staff' : exec[7] ? 'Shield' : exec[8] ? 'Cloth Armor' : exec[9] ? 'Light Armor' : exec[10] ? 'Heavy Armor' : 'Unknown';
        }
        eq.info.quality = exec[1];
        eq.info.prefix = exec[2] || exec[3];
        eq.info.type = exec[4] || exec[5] || exec[6] || exec[7] || exec[8] || exec[9] || exec[10];
        eq.info.slot = exec[11];
        eq.info.suffix = exec[12];
      } else if (!eq.info.category) {
        eq.info.category = 'Unknown';
      }
      if ($config.settings.translateNames) {
        eq.info.namezh = $equip.$i18n.applyEquip(eq);
      }
      return eq;
    },
    div: function (div) {
      const eid = /equips\.set\((\d+),/.exec(div.getAttribute('onmouseover'))?.[1];
      if (!eid) {
        return { error: 'invalid div' };
      }
      const dynjs = $equip.dynjs_equip[eid] || $equip.dynjs_eqstore[eid] || $equip.dynjs_loaded[eid];
      if (!dynjs) {
        return { error: 'no data' };
      }
      const exec = $equip.reg.html.exec(dynjs.d);
      if (!exec) {
        return { error: 'parse error' };
      }
      const eq = {
        info: {
          name: dynjs.t,
          category: exec[1],
          level: parseInt(exec[2]) || 0,
          unassigned: exec[2] === 'Unassigned',
          tradeable: exec[3] === 'Tradeable',
          soulbound: exec[3] === 'Soulbound',
          cdt: exec[4] / exec[5],
          condition: parseInt(exec[4]),
          durability: parseInt(exec[5]),
          tier: parseInt(exec[6]),
          pxp1: parseInt(exec[7]),
          pxp2: parseInt(exec[8]),
          pab: dynjs.d.match($equip.reg.pab)?.map((p) => p[0]).join('') || '',
          eid: eid,
          key: dynjs.k,
        },
        data: {
          html: dynjs.d,
          value: $equip.eqvalue[eid],
        },
        node: {
          div: div,
        },
      };
      const equipname = $equip.names[eq.info.eid];
      if (equipname && equipname !== eq.info.name) {
        eq.info.customname = eq.info.name;
        eq.info.name = equipname;
      }
      $equip.parse.name(eq.info.name, eq);
      eq.info.pxp = $equip.getpxp(eq);
      div.dataset.eid = eq.info.eid;
      div.dataset.key = eq.info.key;
      return eq;
    },
    extended: function (extended) {
      const exec = $equip.reg.html.exec(extended.children[0].innerHTML);
      const eq = {
        info: {
          category: exec[1],
          level: parseInt(exec[2]) || 0,
          unassigned: exec[2] === 'Unassigned',
          tradeable: exec[3] === 'Tradeable',
          soulbound: exec[3] === 'Soulbound',
          cdt: exec[4] / exec[5],
          condition: parseInt(exec[4]),
          durability: parseInt(exec[5]),
          tier: parseInt(exec[6]),
          pxp1: parseInt(exec[7]),
          pxp2: parseInt(exec[8]),
        },
        data: {},
        node: {
          extended: extended,
        },
      };
      let name_div = extended.previousElementSibling;
      if (!name_div.textContent.trim()) { // 'RENAME' button in Forge/Upgrade
        name_div = name_div.previousElementSibling;
      }
      eq.info.name = Array.from(name_div.firstElementChild.children).map((d) => d.textContent.trim() || ' ').join('').replace(/\b(Of|The)\b/, (s) => s.toLowerCase());
      $equip.parse.name(eq.info.name, eq);
      const custom_div = name_div.previousElementSibling;
      if (custom_div) {
        eq.info.customname = Array.from(custom_div.firstElementChild.children).map((d) => d.textContent.trim() || ' ').join('');
      }
      eq.info.pxp = $equip.getpxp(eq);
      $equip.parse.stats(eq);
      $equip.parse.upgrades(eq);
      return eq;
    },
    stats: function (eq) {
      let div;
      if (eq.node.extended) {
        div = eq.node.extended.children[0];
      } else if (eq.data.html) {
        div = $element('template', null, ['/' + eq.data.html]).content.firstElementChild;
      } else {
        console.log('No Equipment Data');
        return;
      }
      eq.stats = {};
      const level = eq.info.level || _player.level;
      Array.from(div.children).forEach((child) => {
        if (child.classList.contains('ex')) {
          Array.from(child.children).forEach((div) => {
            if (!div.childElementCount) {
              return;
            }
            const name = div.firstElementChild.textContent;
            const span = div.children[1].firstElementChild;
            const value = parseFloat(span.textContent);
            const base = div.title ? parseFloat(div.title.slice(6)) : (value / (1 + level / $equip.stats[name].scale));
            eq.stats[name] = { value, base, span };
          });
        } else if (child.classList.contains('ep')) {
          const type = child.firstElementChild.textContent;
          Array.from(child.children).slice(1).forEach((div) => {
            const text = div.firstChild.nodeValue.slice(0, -2);
            const name = $equip.reg.magic.test(text) ? text + (type === 'Damage Mitigations' ? ' MIT' : ' EDB') : text;
            const span = div.firstElementChild;
            const value = parseFloat(span.textContent);
            const base = div.title ? parseFloat(div.title.slice(6)) : (value / (1 + level / $equip.stats[name].scale));
            eq.stats[name] = { value, base, span };
          });
        } else if (/\+(\d+) (.+) Damage/.test(child.textContent)) {
          const name = 'Attack Damage';
          const span = child.firstElementChild;
          const value = parseFloat(RegExp.$1);
          const base = child.title ? parseFloat(child.title.slice(6)) : (value / (1 + level / $equip.stats[name].scale));
          eq.stats[name] = { value, base, span };
        }
      });
    },
    equiplist: function (equiplist) {
      const stats_equip = {};
      equiplist.forEach((eq) => {
        $equip.parse.stats(eq);
        Object.entries(eq.stats).forEach(([s, v]) => {
          if (!stats_equip[s]) {
            stats_equip[s] = 0;
          }
          if ($equip.stats[s].multi) {
            stats_equip[s] = (1 - (1 - stats_equip[s] / 100) * (1 - v.value / 100)) * 100;
          } else {
            stats_equip[s] += v.value;
          }
        });
      });
      return stats_equip;
    },
    pmax: function (eq) {
      const pmax = $equip.pmax[eq.info.type + (eq.info.slot ? ' ' + eq.info.slot : '')] || {};
      const pmax_offset = {};
      $equip.prefix[eq.info.prefix]?.forEach((e) => {
        pmax_offset[e] = (pmax_offset[e] || 0) + 1;
      });
      $equip.suffix[eq.info.suffix]?.forEach((e) => {
        pmax_offset[e] = (pmax_offset[e] || 0) + 1;
      });
      if (eq.info.type === 'Leather' || eq.info.type === 'Kite Shield') {
        if (['Dampening', 'Stoneskin', 'Deflection'].includes(eq.info.suffix)) {
          $equip.suffix[eq.info.suffix].forEach((e) => {
            pmax_offset[e]++;
          });
        }
      }
      if (eq.info.category === 'Staff') {
        if (['Surtr', 'Niflheim', 'Mjolnir', 'Freyr', 'Heimdall', 'Fenrir'].includes(eq.info.suffix)) {
          $equip.suffix[eq.info.suffix].forEach((e) => {
            pmax_offset[e]++;
          });
        }
      }
      Object.entries(eq.stats).forEach(([name, stat]) => {
        stat.pmax = pmax[name]?.[pmax_offset[name] || 0] || null;
      });
    },
    upgrades: function (eq) {
      const div = eq.node.extended.children[1];
      eq.upgrades = {};
      $qsa('#eu > span', div).forEach((span) => {
        if (/(.+) Lv\.(\d+)/.test(span.textContent)) {
          eq.upgrades[RegExp.$1] = parseFloat(RegExp.$2);
        }
      });
      $qsa('#ep > span', div).forEach((span) => {
        if (/(.+) Lv\.(\d+)/.test(span.textContent)) {
          eq.upgrades[RegExp.$1] = parseFloat(RegExp.$2);
        } else {
          eq.upgrades[span.textContent] = true;
        }
      });
      $qsa('#ee > span', div).forEach((span) => {
        if (/(.+) \[(\d+)m\]/.test(span.textContent)) {
          eq.upgrades[RegExp.$1] = parseFloat(RegExp.$2);
        }
      });
      Object.entries(eq.stats).forEach(([name, stat]) => {
        stat.unforged = $equip.unforge(name, stat.base, eq.upgrades, eq.info.pxp, eq.info.level || _player.level, eq.upgrades);
      });
    },

  },

  unforge: function (name, base, upgrade, pxp, level, iw) {
    const stat = $equip.stats[name];
    upgrade = (upgrade && typeof upgrade === 'object' ? upgrade[stat.forge] : upgrade) || 0;
    iw = (iw && typeof iw === 'object' ? iw[stat.potency] : iw) || 0;
    let iwcoeff = 1;
    let iwbonus = 0;
    if (iw) {
      if (name === 'Attack Damage' || name === 'Magic Damage') {
        iwcoeff += iw * stat.plus;
      } else {
        iwbonus += iw * stat.plus;
      }
    }
    const fluc = stat.fluc;
    const bonus = (pxp - 100) / 25 * fluc;
    const factor = name === 'Attack Damage' || name === 'Magic Damage' ? 0.279575 : 0.2;
    const coeff = 1 + factor * Math.log(1 + 0.1 * upgrade);
    const value = (base - bonus - iwbonus) / coeff / iwcoeff + bonus; // this base is a forged base
    return value;
  },

  forge: function (name, base, upgrade, pxp, level, iw) {
    const stat = $equip.stats[name];
    upgrade = (upgrade && typeof upgrade === 'object' ? upgrade[stat.forge] : upgrade) || 0;
    iw = (iw && typeof iw === 'object' ? iw[stat.potency] : iw) || 0;
    let iwcoeff = 1;
    let iwbonus = 0;
    if (iw) {
      if (name === 'Attack Damage' || name === 'Magic Damage') {
        iwcoeff += iw * stat.plus;
      } else {
        iwbonus += iw * stat.plus;
      }
    }
    const fluc = stat.fluc;
    const bonus = (pxp - 100) / 25 * fluc;
    const factor = name === 'Attack Damage' || name === 'Magic Damage' ? 0.279575 : 0.2;
    const coeff = 1 + factor * Math.log(1 + 0.1 * upgrade);
    const forged = (base - bonus) * coeff * iwcoeff + bonus + iwbonus;
    const scale = stat.scale;
    const value = forged * (1 + level / scale);
    return value;
  },

  getpxp: function (eq) {
    let pxp;
    if (eq.info.tier === 0) {
      pxp = eq.info.pxp2;
    } else if (eq.info.tier === 10) {
      const ppxp = Object.entries($equip.ppxp).find(([n]) => eq.info.name.includes(n))?.[1] || 400;
      if (eq.info.quality === 'Peerless') {
        pxp = ppxp;
      } else if (eq.info.quality === 'Legendary') {
        pxp = Math.round(ppxp * 0.95);
      } else if (eq.info.quality === 'Magnificent') {
        pxp = Math.round(ppxp * 0.89);
      } else {
        pxp = Math.round(ppxp * 0.8);
      }
    } else {
      pxp = $equip.calcpxp(eq.info.pxp2, eq.info.tier);
    }
    return pxp;
  },

  calcpxp: function (pxpN, n) {
    pxpN = parseInt(pxpN);
    n = parseInt(n);
    let pxp0Est = 300;
    for (let i = 1; i < 15; i++) {
      const sumPxpNextLevel = Math.ceil(1000 * (Math.pow(1 + pxp0Est / 1000, n + 1) - 1));
      const sumPxpThisLevel = Math.ceil(1000 * (Math.pow(1 + pxp0Est / 1000, n) - 1));
      const estimate = sumPxpNextLevel - sumPxpThisLevel;
      if (estimate > pxpN) {
        pxp0Est -= 300 / Math.pow(2, i);
      } else {
        pxp0Est += 300 / Math.pow(2, i);
      }
    }
    return Math.ceil(pxp0Est);
  },

  list: function (node, sort = true, parent = node) {
    if (!node) {
      return;
    }
    const equiplist = Array.from($qsa('div[onmouseover*="equips.set"]', node)).map((div) => {
      const eq = $equip.parse.div(div);
      eq.node.wrapper = div.parentNode;
      if (eq.info.customname) {
        div.classList.add('hvut-eq-customname');
        div.dataset.eqname = eq.info.name;
      }
      div.classList.add('hvut-eq-' + eq.info.quality);
      return eq;
    });
    if ($config.settings.equipSort && sort) {
      $equip.sort(equiplist, parent);
    }
    return equiplist;
  },

  sort: function (equiplist, parent) {
    if (!parent) {
      parent = equiplist[0].node.wrapper.parentNode;
    }
    equiplist.sort((a, b) => {
      if (a.info.category !== b.info.category) {
        return $equip.index.category[a.info.category] - $equip.index.category[b.info.category];
      } else if (a.info.category === 'Unknown') {
        return a.info.name > b.info.name ? 1 : a.info.name < b.info.name ? -1 : 0;
      } else if (a.info.type !== b.info.type) {
        return ($equip.index.type[a.info.type] || 99) - ($equip.index.type[b.info.type] || 99);
      }

      let r = 0;
      const k = a.info.category === 'One-handed Weapon' || a.info.category === 'Two-handed Weapon' ? ['suffix', 'quality', 'prefix']
        : a.info.category === 'Staff' ? ['prefix', 'suffix', 'quality']
        : a.info.type === 'Buckler' ? ['suffix', 'quality', 'prefix']
        : a.info.category === 'Shield' ? ['quality', 'suffix', 'prefix']
        : a.info.category === 'Cloth Armor' ? ['suffix', 'slot', 'quality', 'prefix']
        : ['slot', 'suffix', 'quality', 'prefix'];

      k.some((e) => {
        if (e in $equip.index) {
          r = ($equip.index[e][a.info[e]] || 99) - ($equip.index[e][b.info[e]] || 99);
        } else {
          r = a.info[e] > b.info[e] ? 1 : a.info[e] < b.info[e] ? -1 : 0;
        }
        return r;
      });

      return r || (b.info.eid - a.info.eid);
    });

    const frag = $element();
    equiplist.forEach((eq, i, a) => {
      const p = a[i - 1] || { info: {} };
      if (eq.info.category !== p.info.category) {
        $element('p', frag, [eq.info.category, '.hvut-eq-category']);
      }
      switch (eq.info.category) {
        case 'One-handed Weapon':
        case 'Two-handed Weapon':
          if (eq.info.type !== p.info.type) {
            $element('p', frag, [eq.info.type || 'Unknown', '.hvut-eq-type']);
          } else if (eq.info.suffix !== p.info.suffix) {
            eq.node.wrapper.classList.add('hvut-eq-border');
          }
          break;
        case 'Staff':
          if (eq.info.type !== p.info.type) {
            $element('p', frag, [eq.info.type || 'Unknown', '.hvut-eq-type']);
          } else if (eq.info.prefix !== p.info.prefix) {
            eq.node.wrapper.classList.add('hvut-eq-border');
          }
          break;
        case 'Shield':
          if (eq.info.type !== p.info.type) {
            $element('p', frag, [eq.info.type || 'Unknown', '.hvut-eq-type']);
          } else if (eq.info.suffix !== p.info.suffix && eq.info.type === 'Buckler') {
            eq.node.wrapper.classList.add('hvut-eq-border');
          }
          break;
        case 'Cloth Armor':
          if (eq.info.type !== p.info.type || eq.info.suffix !== p.info.suffix) {
            $element('p', frag, [(eq.info.type ? eq.info.suffix || '[No Suffix]' : 'Unknown'), '.hvut-eq-type']);
          } else if (eq.info.slot !== p.info.slot) {
            eq.node.wrapper.classList.add('hvut-eq-border');
          }
          break;
        case 'Light Armor':
        case 'Heavy Armor':
          if (eq.info.type !== p.info.type || eq.info.slot !== p.info.slot) {
            $element('p', frag, [(eq.info.type ? `${eq.info.type} ${eq.info.slot}` : 'Unknown'), '.hvut-eq-type']);
          } else if (eq.info.suffix !== p.info.suffix && (eq.info.type === 'Shade' || eq.info.type === 'Power')) {
            eq.node.wrapper.classList.add('hvut-eq-border');
          }
          break;
      }
      frag.appendChild(eq.node.wrapper);
    });
    parent.innerHTML = '';
    parent.appendChild(frag);
    return equiplist;
  },

  namecode: function (eq) {
    if (!$equip.namecode.rules) {
      const validation = $equip.namecode_parse();
      if (validation.error) {
        alert(`错误: 代码无效\n\n${validation.error}`);
        return;
      }
      $equip.namecode.rules = validation.rules;
    }
    function rainbow(t) {
      const c = ['#f00', '#f90', '#fc0', '#0c0', '#09f', '#00c', '#c0f'];
      return t.split('').map((t, i) => `[color=${c[i % 7]}]${t}[/color]`).join('');
    }
    function color(t) {
      const s = mod[t];
      if (!s.code || !s.color) {
        return;
      }
      if (s.color === 'rainbow') {
        s.code = rainbow(s.code);
      } else {
        s.code = `[color=${s.color}]${s.code}[/color]`;
      }
    }
    function bold(t) {
      const s = mod[t];
      if (!s.code || !s.bold) {
        return;
      }
      s.code = `[b]${s.code}[/b]`;
    }

    const mod = {
      name: { code: eq.info.name },
      quality: { code: eq.info.quality },
      prefix: { code: eq.info.prefix },
      type: { code: eq.info.type },
      slot: { code: eq.info.slot },
      suffix: { code: 'of ' + eq.info.suffix },
    };
    $equip.namecode.rules.forEach((rule) => {
      rule.some((r, i) => {
        if (!$equip.filter_equip(r.match, eq.info.name, eq)) {
          if (i === 0) {
            return true; // skip the entire rule if the first fails
          } else {
            return;
          }
        }
        r.options.forEach(({ key, value }) => {
          if (!mod[key]) {
            return;
          }
          if (value === 'bold') {
            mod[key].bold = true;
          } else {
            mod[key].color = value;
          }
        });
      });
    });
    if (eq.info.type) { // obsolete equipment doesn't have any info
      mod.name.code = ['quality', 'prefix', 'type', 'slot', 'suffix'].filter((t) => eq.info[t]).map((t) => { if (mod[t].color && mod[t].color !== mod.name.color) { color(t); } if (!mod.name.bold) { bold(t); } return mod[t].code; }).join(' ');
    }
    color('name');
    bold('name');
    eq.data.namecode = mod.name.code;
    return mod.name.code;
  },
  namecode_parse: function (array = $config.settings.equipNameCode) {
    const rules = [];
    const errors = [];
    array.forEach((s) => {
      if (!s.trim()) {
        return;
      }
      const rule = [];
      s.split(';').forEach((s) => {
        if (!s.trim()) {
          return;
        }
        const [match, text] = split2(s, ':');
        if (!match) {
          errors.push(s);
          return;
        }
        const { error } = $equip.filter_validate(match);
        if (error) {
          errors.push(s);
          return;
        }
        const options = [];
        text.split(',').forEach((o) => {
          o = o.trim();
          const exec = /^(name|quality|prefix|type|slot|suffix)\s*=\s*([\w#]+)$/.exec(o);
          if (!exec) {
            errors.push(s);
            return;
          }
          options.push({ key: exec[1], value: exec[2] });
        });
        const r = { match, options };
        rule.push(r);
      });
      rules.push(rule);
    });
    const namecode = rules.map((r) => r.map((r) => r.match + ' : ' + r.options.map(({ key, value }) => `${key}=${value}`).join(', ')).join(' ; '));
    const error = errors.join('\n');
    const result = { value: namecode, error, rules };
    return result;
  },

  filter: function (filters, name, equip) {
    if (!filters) {
      return false;
    }
    const n = name.toLowerCase();
    return filters.some((f) => $equip.filter_equip(f, n, equip));
  },
  filter_equip: function (filter, name, equip) {
    if (!filter) {
      return false;
    }
    const n = name.toLowerCase();
    const t = filter.toLowerCase();
    const r = t.replace(/[a-z0-9-$=<>+ ]+/g, (f) => {
      f = f.trim();
      if (!f) {
        return '';
      } else if (!/[^a-z- ]/.test(f)) {
        return n.includes(f);
      } else if (f.includes('$')) {
        return $equip.filter_details(f, equip);
      } else {
        throw new Error('Invalid Filter');
      }
    });
    return eval(r);
  },
  filter_details: function (filter, equip) {
    if (/\$([a-z]+)\+/.test(filter)) { // $Magnificent+
      const fquality = RegExp.$1;
      const quality = equip?.info?.quality.toLowerCase() ?? 'crude';
      if (!$equip.quality.hasOwnProperty(fquality)) {
        throw new Error('Invalid Filter');
      }
      return $equip.quality[quality] >= $equip.quality[fquality];
    }
    if (filter.includes('$pab') && /\$pab=([a-z]+)/.test(filter)) {
      const fpab = RegExp.$1;
      const pab = equip?.info?.pab?.toLowerCase() ?? '';
      return fpab.split('').every((p) => pab.includes(p));
    }
    if (filter.includes('$level')) {
      const level = equip?.info?.level ?? 0;
      return filter.replace(/\$level/, level);
    }
    if (filter.includes('$prefix')) {
      return !!equip?.info?.prefix;
    }
    if (filter.includes('$iw')) {
      return !!equip?.info?.tier;
    }
    throw new Error('Invalid Filter');
  },
  filter_validate: function (filters) {
    if (!Array.isArray(filters)) {
      filters = [filters];
    }
    const errors = filters.filter((filter) => {
      try {
        $equip.filter_equip(filter, '');
        return false;
      } catch (e) {
        return true;
      }
    });
    const error = errors.join('\n');
    const result = { value: filters, error };
    return result;
  },

};

// ITEM INVENTORY
const $item = {

  list: null,
  reg: {
    itemc: /show_itemc_box\(-?\d+,-?\d+,'\w+',this,'\w+',(\d+)\)/,
    itemr: /show_itemr_box\(-?\d+,-?\d+,'\w+',this,'\w+','.+?','.*?','(.+?)'\)/,
    shrine: /set_shrine_item\((\w+),(\d+),(\d+),'(.+?)'\)/,
    mooglemail: /set_mooglemail_item\((\d+),this\)/,
  },
  get_type: function (text) {
    if ($item.reg.itemr.test(text)) {
      return RegExp.$1.replace(/\W/g, '');
    } else if ($item.reg.itemc.test(text)) {
      return 'Consumable';
    } else {
      return '';
    }
  },
  get_data: function (text) {
    let exec;
    if ((exec = $item.reg.shrine.exec(text))) {
      const iid = exec[1];
      const stock = parseInt(exec[2]);
      const bulk = parseInt(exec[3]);
      const name = exec[4];
      return { iid, stock, bulk, name };
    } else if ((exec = $item.reg.mooglemail.exec(text))) {
      const iid = exec[1];
      return { iid };
    } else {
      return {};
    }
  },
  load: async function () {
    const html = await $ajax.fetch('?s=Character&ss=it');
    const doc = $doc(html);
    $item.list = {};
    $qsa('.itemlist tr', doc).forEach((tr) => {
      const name = tr.cells[0].textContent;
      const id = parseInt(tr.cells[0].firstElementChild.id.slice(5));
      const stock = parseInt(tr.cells[1].textContent);
      $item.list[name] = { id, stock };
    });
  },
  once: async function () {
    if ($item.list) {
      return;
    } else {
      await $item.load();
    }
  },
  load_shop: async function () {
    const html = await $ajax.fetch('?s=Bazaar&ss=is');
    const doc = $doc(html);
    $item.storetoken = $id('shopform', doc).elements.storetoken.value;
    $item.networth = parseInt($id('networth', doc).textContent.replace(/\D/g, ''));
    $item.shop = {};

    const reg_item = /itemshop\.set_item\('item_pane',(\d+),(\d+),(\d+)/;
    $qsa('#item_pane .itemlist tr', doc).forEach((tr) => {
      const exec = reg_item.exec(tr.cells[0].firstElementChild.getAttribute('onclick'));
      const name = tr.cells[0].textContent.trim();
      const id = parseInt(exec[1]);
      const stock = parseInt(exec[2]);
      const sell_price = parseInt(exec[3]);
      $item.shop[name] = { id, stock, sell_price };
    });

    const reg_shop = /itemshop\.set_item\('shop_pane',(\d+),(\d+),(\d+)/;
    $qsa('#shop_pane .itemlist tr', doc).forEach((tr) => {
      const exec = reg_shop.exec(tr.cells[0].firstElementChild.getAttribute('onclick'));
      const name = tr.cells[0].textContent.trim();
      const id = parseInt(exec[1]);
      const shop_stock = parseInt(exec[2]);
      const shop_price = parseInt(exec[3]);
      if (!$item.shop[name]) {
        $item.shop[name] = {};
      }
      Object.assign($item.shop[name], { id, shop_stock, shop_price });
    });
  },
  count: function (name) {
    if (name) {
      return $item.list[name]?.stock || 0;
    } else {
      const obj = {};
      for (const name in $item.list) {
        obj[name] = $item.list[name].stock || 0;
      }
      return obj;
    }
  },
  cost: function (items) {
    let cost = 0;
    items.forEach((item) => {
      cost += item.count * ($item.shop[item.name]?.shop_price || 0);
    });
    return cost;
  },
  buy: async function (items) { //items = [{ name, count }];
    if (!items.length) {
      alert('采购请求列表为空。');
      return;
    }
    await $item.load_shop();
    const cost = $item.cost(items);
    if (cost > $item.networth) {
      alert('绅士币不足。');
      return;
    }
    const nostock = items.find((item) => item.count > ($item.shop[item.name]?.shop_stock || 0));
    if (nostock) {
      alert('道具店中的物品数量不足。');
      return;
    }
    items.forEach((item) => {
      item.id = $item.shop[item.name].id;
    });

    async function buy(id, count) {
      const html = await $ajax.fetch('?s=Bazaar&ss=is', `storetoken=${$item.storetoken}&select_mode=shop_pane&select_item=${id}&select_count=${count}`);
      const doc = $doc(html);
      const error = get_message(doc);
      if (error) {
        return false;
      }
      return true;
    }

    const requests = items.map((item) => buy(item.id, item.count));
    const results = await Promise.all(requests);
    if (!results.every((r) => r)) {
      alert('发生错误。');
      return;
    }
    return true;
  },
};

// ITEM PRICE
const $price = {

  json: null,
  market: null,
  filters: { co: null, ma: null, tr: null, ar: null, fi: null, mo: null },
  groups: {
    'Consumables': [
      'Health Draught', 'Health Potion', 'Health Elixir', 'Mana Draught', 'Mana Potion', 'Mana Elixir', 'Spirit Draught', 'Spirit Potion', 'Spirit Elixir', 'Last Elixir', 'Energy Drink', 'Caffeinated Candy',
      'Infusion of Flames', 'Infusion of Frost', 'Infusion of Lightning', 'Infusion of Storms', 'Infusion of Divinity', 'Infusion of Darkness', 'Scroll of Swiftness', 'Scroll of Protection', 'Scroll of the Avatar', 'Scroll of Absorption', 'Scroll of Shadows', 'Scroll of Life', 'Scroll of the Gods',
      'Flower Vase', 'Bubble-Gum',
    ],
    'Materials': [
      'Low-Grade Cloth', 'Mid-Grade Cloth', 'High-Grade Cloth', 'Low-Grade Leather', 'Mid-Grade Leather', 'High-Grade Leather', 'Low-Grade Metals', 'Mid-Grade Metals', 'High-Grade Metals', 'Low-Grade Wood', 'Mid-Grade Wood', 'High-Grade Wood',
      'Scrap Cloth', 'Scrap Leather', 'Scrap Metal', 'Scrap Wood', 'Energy Cell',
      'Crystallized Phazon', 'Shade Fragment', 'Repurposed Actuator', 'Defense Matrix Modulator',
      'Wispy Catalyst', 'Diluted Catalyst', 'Regular Catalyst', 'Robust Catalyst', 'Vibrant Catalyst', 'Coruscating Catalyst',
      'Binding of Slaughter', 'Binding of Balance', 'Binding of Isaac', 'Binding of Destruction', 'Binding of Focus', 'Binding of Friendship', 'Binding of Protection', 'Binding of Warding', 'Binding of the Fleet', 'Binding of the Barrier', 'Binding of the Nimble', 'Binding of Negation', 'Binding of the Elementalist', 'Binding of the Heaven-sent', 'Binding of the Demon-fiend', 'Binding of the Curse-weaver', 'Binding of the Earth-walker', 'Binding of Surtr', 'Binding of Niflheim', 'Binding of Mjolnir', 'Binding of Freyr', 'Binding of Heimdall', 'Binding of Fenrir', 'Binding of Dampening', 'Binding of Stoneskin', 'Binding of Deflection', 'Binding of the Fire-eater', 'Binding of the Frost-born', 'Binding of the Thunder-child', 'Binding of the Wind-waker', 'Binding of the Thrice-blessed', 'Binding of the Spirit-ward', 'Binding of the Ox', 'Binding of the Raccoon', 'Binding of the Cheetah', 'Binding of the Turtle', 'Binding of the Fox', 'Binding of the Owl',
      'Peerless Weapon Core', 'Legendary Weapon Core', 'Peerless Staff Core', 'Legendary Staff Core', 'Peerless Armor Core', 'Legendary Armor Core',
      'Voidseeker Shard', 'Aether Shard', 'Featherweight Shard', 'Amnesia Shard',
    ],
    'Trophies': ['ManBearPig Tail', 'Holy Hand Grenade of Antioch', "Mithra's Flower", 'Dalek Voicebox', 'Lock of Blue Hair', 'Bunny-Girl Costume', 'Hinamatsuri Doll', 'Broken Glasses', 'Black T-Shirt', 'Sapling', 'Unicorn Horn', 'Noodly Appendage'],
    'Crystals': ['Crystal of Vigor', 'Crystal of Finesse', 'Crystal of Swiftness', 'Crystal of Fortitude', 'Crystal of Cunning', 'Crystal of Knowledge', 'Crystal of Flames', 'Crystal of Frost', 'Crystal of Lightning', 'Crystal of Tempest', 'Crystal of Devotion', 'Crystal of Corruption'],
    'Figures': ['Twilight Sparkle Figurine', 'Rainbow Dash Figurine', 'Applejack Figurine', 'Fluttershy Figurine', 'Pinkie Pie Figurine', 'Rarity Figurine', 'Trixie Figurine', 'Princess Celestia Figurine', 'Princess Luna Figurine', 'Apple Bloom Figurine', 'Scootaloo Figurine', 'Sweetie Belle Figurine', 'Big Macintosh Figurine', 'Spitfire Figurine', 'Derpy Hooves Figurine', 'Lyra Heartstrings Figurine', 'Octavia Figurine', 'Zecora Figurine', 'Cheerilee Figurine', 'Vinyl Scratch Figurine', 'Daring Do Figurine', 'Doctor Whooves Figurine', 'Berry Punch Figurine', 'Bon-Bon Figurine', 'Fluffle Puff Figurine', 'Angel Bunny Figurine', 'Gummy Figurine'],
  },
  default: {
    'Wispy Catalyst': 100,
    'Diluted Catalyst': 500,
    'Regular Catalyst': 1000,
    'Robust Catalyst': 2500,
    'Vibrant Catalyst': 5000,
    'Coruscating Catalyst': 10000,
  },

  init: function () {
    if ($price.json) {
      return;
    }
    if ($config.isekai) {
      $price.groups['Consumables'] = $price.groups['Consumables'].filter((n) => !'Last Elixir|Energy Drink|Caffeinated Candy'.includes(n));
      $price.groups['Materials'] = $price.groups['Materials'].filter((n) => !n.startsWith('Binding of'));
      delete $price.groups['Crystals'];
      delete $price.groups['Figures'];
      delete $price.filters['ar'];
      delete $price.filters['fi'];
      delete $price.filters['mo'];
    }
    $price.json = $config.get('prices');
    if (!$price.json) {
      $price.reset();
    }
  },
  reset: function () {
    const json = {};
    Object.values($price.groups).forEach((g) => {
      g.forEach((n) => {
        json[n] = 0;
      });
    });
    Object.assign(json, $price.default);
    $price.json = json;
    $config.set('prices', $price.json);
    //$price.set(json, true);
  },
  get_items: function (i) {
    let items;
    if (!i) {
      items = Object.keys($price.json);
    } else if (typeof i === 'string') {
      if (i in $price.groups) {
        items = $price.groups[i];
      } else if (i in $price.filters) {
        items = $price.filters[i];
      } else {
        items = [];
        console.log('Invalid items');
      }
    } else if (Array.isArray(i)) {
      items = i;
    } else {
      items = [];
      console.log('Invalid items');
    }
    return items;
  },
  get: function (i) {
    $price.init();
    const prices = {};
    const items = $price.get_items(i);
    items.forEach((n) => { prices[n] = $price.json[n] || 0; });
    return prices;
  },
  set: function (json, replace) {
    $price.init();
    if (replace) {
      $price.json = json;
    } else {
      Object.assign($price.json, json);
    }
    $config.set('prices', $price.json);
  },
  edit: function (i, filter, callback) {
    $price.init();
    const items = $price.get_items(i);
    const prices = $price.get(items);
    const all = !filter;

    popup_text($config.obj2text(prices, ['\n', '@']), 300, 500, [
      { text: 'Save', click: save },
      { text: 'Bid', click: (p) => { market(p, 'bid'); } },
      { text: 'Ask', click: (p) => { market(p, 'ask'); } },
      { text: 'Edit All Items', click: edit_all },
    ]);

    function save(p) {
      const { value: new_prices, error } = $config.text2obj(p.textarea.value, ['\n', '@'], 'number');
      if (error) { // error: invalid input
        alert(`错误: 价格必须为数字\n\n${error}`);
        return;
      }
      if (all && p.textarea.value.trim() === '') {
        $price.reset();
      } else {
        const replace = all;
        $price.set(new_prices, replace);
      }
      p.close();
      if (JSON.stringify(prices) !== JSON.stringify(new_prices)) {
        callback?.();
      }
    }
    async function market(p, key) {
      p.textarea.disabled = true;
      const new_prices = await $price.update_market(filter, key);
      p.textarea.value = $config.obj2text(new_prices, ['\n', '@']);
      p.textarea.disabled = false;
      save(p);
    }
    function edit_all(p) {
      if (all) {
        return;
      }
      p.close();
      $price.edit('', '', callback);
    }
  },
  parse_market: function (filter, doc = document) {
    if (!$price.market) {
      $price.market = {};
    }
    $price.filters[filter] = [];
    Array.from($qs('#market_itemlist table', doc).rows).forEach((tr, i) => {
      if (i === 0) {
        return;
      }
      const name = tr.cells[0].textContent;
      const itemid = /itemid=(\d+)/.exec(tr.getAttribute('onclick'))[1];
      const stock = parseInt(tr.cells[1].textContent);
      const bid = parseFloat(tr.cells[2].textContent.slice(0, -2)) || 0;
      const ask = parseFloat(tr.cells[3].textContent.slice(0, -2)) || 0;
      const market_stock = parseInt(tr.cells[4].textContent.slice(0, -2)) || 0;
      if (!$price.market[name]) {
        $price.market[name] = {};
      }
      Object.assign($price.market[name], { itemid, stock, bid, ask, market_stock });
      $price.filters[filter].push(name);
    });
  },
  update_market: async function (filter, key, save) {
    const all = !filter;
    if (all && !$price.market_all) {
      const filters = Object.keys($price.filters);
      const requests = filters.map((filter) => update(filter));
      await Promise.all(requests);
      $price.market_all = true;
    } else if (!all && !$price.market) {
      await update(filter);
    }
    const items = $price.get_items(filter);
    const prices = $price.get(items);
    const market_prices = $price.get_market(items, key);
    const new_prices = { ...prices, ...market_prices };
    if (save) {
      $price.set(new_prices);
    }
    return new_prices;

    async function update(filter) {
      const html = await $ajax.fetch(`?s=Bazaar&ss=mk&screen=browseitems&filter=${filter}`);
      const doc = $doc(html);
      $price.parse_market(filter, doc);
    }
  },
  get_market: function (items, key) {
    const prices = {};
    items.forEach((name) => {
      if (name in $price.market) {
        prices[name] = $price.market[name][key];
      }
    });
    return prices;
  },
  set_market: function (items, key) {
    const prices = $price.get_market(items, key);
    $price.set(prices);
  },

};

// MoogleMail
const $mail = {

  queue: [],
  current: 0,
  ready: true,

  request: function (mail) {
    if (mail) {
      const chunks = $mail.chunk(mail);
      $mail.queue.push(...chunks);
    }
    return $mail.send();
  },
  send: async function () {
    const mail = $mail.queue[$mail.current];
    if (!mail) {
      return;
    }
    if (!$mail.ready) {
      return;
    }
    $mail.ready = false;

    const { to_name, subject, body, attach, cod, cod_persistent } = mail;
    const index = $mail.current + 1;
    let html;
    let doc;

    $mail.log('\n========== 发送中 ==========');

    if (!$mail.token) {
      if (_query.ss === 'mm' && _query.filter === 'new') {
        doc = document;
      } else {
        $mail.log(`#${index}: 检查邮箱`);
        html = await $ajax.fetch('?s=Bazaar&ss=mm&filter=new');
        doc = $doc(html);
      }
      $mail.token = $id('mailform', doc).elements.mmtoken.value;
      if ($id('mmail_attachremove', doc)) {
        $mail.log(`#${index}: 移除附件`);
        await $mail.discard();
      }
    }
    const token = $mail.token;

    if (attach?.length) {
      $mail.log(`#${index}: 添加附件中`);
      async function attach_add(e) {
        const html = await $ajax.fetch('?s=Bazaar&ss=mm&filter=new', `mmtoken=${token}&action=attach_add&select_item=${e.id}&select_count=${e.count}&select_pane=${e.pane}`);
        if ($mail.check(html)) {
          return false;
        }
        done++;
        $mail.log(`#${index}: 已添加 (${done}/${total})`);
        return true;
      }

      const total = attach.length;
      let done = 0;
      const requests = attach.map((e) => attach_add(e));
      const results = await Promise.all(requests);
      if (!results.every((r) => r)) {
        $mail.discard();
        return;
      }
    }

    if (cod && !cod_persistent) {
      $mail.log(`#${index}: 设置货到付款`);
      html = await $ajax.fetch('?s=Bazaar&ss=mm&filter=new', `mmtoken=${token}&action=attach_cod&action_value=${cod}`);
      if ($mail.check(html)) {
        $mail.discard();
        return;
      }
    }

    if (cod && cod_persistent) {
      $mail.log(`#${index}: 在永久区准备`);
      html = await $ajax.fetch('/?s=Bazaar&ss=mm&filter=new');
      doc = $doc(html);
      if ($mail.check(html)) {
        $mail.discard();
        return;
      }
      if (!$id('navbar', doc)) {
        $mail.log('!!! 错误: 无法访问永久区莫古邮件');
        return;
      }
      if ($id('mmail_attachremove', doc)) {
        $mail.log('!!! 错误: 永久区莫古邮件已有附件');
        return;
      }

      $mail.log(`#${index}: 在永久区添加附件`);
      html = await $ajax.fetch('/?s=Bazaar&ss=mm&filter=new', `mmtoken=${token}&action=attach_add&select_item=0&select_count=1&select_pane=credits`);
      if ($mail.check(html)) {
        $mail.discard();
        return;
      }

      $mail.log(`#${index}: 在永久区设置货到付款`);
      html = await $ajax.fetch('/?s=Bazaar&ss=mm&filter=new', `mmtoken=${token}&action=attach_cod&action_value=${cod}`);
      if ($mail.check(html)) {
        $mail.discard();
        return;
      }

      $mail.log(`#${index}: 在永久区发送`);
      html = await $ajax.fetch('/?s=Bazaar&ss=mm&filter=new', { mmtoken: token, action: 'send', message_to_name: to_name, message_subject: subject, message_body: body });
      if ($mail.check(html)) {
        $mail.discard();
        return;
      }
    }

    $mail.log(`#${index}: 发送中`);
    html = await $ajax.fetch('?s=Bazaar&ss=mm&filter=new', { mmtoken: token, action: 'send', message_to_name: to_name, message_subject: subject, message_body: body });
    if ($mail.check(html)) {
      $mail.discard();
      return;
    }

    $mail.log(`#${index}: 完成`);
    $mail.ready = true;
    $mail.current++;
    if ($mail.queue[$mail.current]) {
      return $mail.send();
    } else {
      location.href = '?s=Bazaar&ss=mm&filter=sent';
      return true;
    }
  },
  chunk: function (mail) {
    if (!mail.attach?.length) {
      if (!mail.subject) {
        mail.subject = '(no subject)';
      }
      if (!mail.body) {
        mail.body = '';
      }
      return [mail];
    }
    const chunks = [];
    const size = 10;

    for (let i = 0, l = mail.attach.length; i < l; i += size) {
      const attach = mail.attach.slice(i, i + size);
      const { to_name, cod_persistent } = mail;
      let { subject, body } = mail;
      let atext = '';
      let cod_total = 0;
      attach.forEach((e) => {
        if (e.cod) {
          cod_total += e.cod;
        }
        if (e.atext) {
          atext += e.atext + '\n';
        }
      });

      let cod_deduction = 0;
      if (mail.cod_deduction) {
        cod_deduction = Math.min(cod_total, mail.cod_deduction);
        mail.cod_deduction -= cod_deduction;
      }
      let cod = cod_total - cod_deduction;
      if (cod < 10) {
        cod = 0;
      }

      if (!subject) {
        if (attach.length) {
          if (attach[0].pane === 'equip') {
            subject = attach[0].name;
          } else {
            subject = `${attach[0].count.toLocaleString()} x ${attach[0].name}`;
          }
          if (attach.length > 1) {
            subject += ` and ${attach.length - 1} item(s)`;
          }
        } else {
          subject = '(no subject)';
        }
      }
      if (!body) {
        body = '';
      }
      if (atext) {
        body += `\n\n========== Attachment ==========\n\n${atext}`;
        if (cod_total) {
          if (attach.length > 1) {
            body += `\nTotal: ${cod_total.toLocaleString()} Credits`;
          }
          if (cod_deduction) {
            body += `\nDeduction: -${cod_deduction.toLocaleString()} Credits`;
            body += `\nCoD: ${cod.toLocaleString()} Credits`;
            if (cod) {
              body += '\n=> CoD: 0 Credits';
            }
          }
          if (cod && cod_persistent) {
            body += '\n* A CoD request has been sent to Persistent';
          }
        }
        body += '\n\n================================\n\n';
      }

      const chunk = { to_name, subject, body, attach, cod, cod_persistent };
      chunks.push(chunk);
    }

    return chunks;
  },
  check: function (html) {
    const doc = $doc(html);
    const error = get_message(doc);
    if (error) {
      $mail.error = error;
      $mail.log('!!! Error: ' + error);
    }
    return error;
  },
  discard: function () {
    return $ajax.fetch('?s=Bazaar&ss=mm&filter=new', `mmtoken=${$mail.token}&action=discard`);
  },
  log: function (text, clear) {
    if (!$mail.log.popup) {
      $mail.log.popup = popup_text('', 300, 300);
    }
    const p = $mail.log.popup;
    if (!p.wrapper.parentNode) {
      document.body.appendChild(p.wrapper);
    }
    if (clear) {
      p.textarea.value = '';
    }
    p.textarea.value += text + '\n';
    p.textarea.scrollTop = p.textarea.scrollHeight;
  },

};

// Battle Panel: Equipment Enchant and Repair
const $battle = {

  enchant_data: {
    'Voidseeker Shard': { effect: "Voidseeker's Blessing", weapon: 'vseek' },
    'Aether Shard': { effect: 'Suffused Aether', weapon: 'ether' },
    'Featherweight Shard': { effect: 'Featherweight Charm', weapon: 'feath', armor: 'feath' },
    'Infusion of Flames': { effect: 'Infused Flames', weapon: 'sfire', armor: 'pfire', day: 2 },
    'Infusion of Frost': { effect: 'Infused Frost', weapon: 'scold', armor: 'pcold', day: 3 },
    'Infusion of Lightning': { effect: 'Infused Lightning', weapon: 'selec', armor: 'pelec', day: 6 },
    'Infusion of Storms': { effect: 'Infused Storm', weapon: 'swind', armor: 'pwind', day: 4 },
    'Infusion of Divinity': { effect: 'Infused Divinity', weapon: 'sholy', armor: 'pholy', day: 0 },
    'Infusion of Darkness': { effect: 'Infused Darkness', weapon: 'sdark', armor: 'pdark', day: 1 },
  },
  node: {},
  equips: [],

  click: function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) {
      return;
    }
    const { action, eid, item, count } = target.dataset;
    if (action === 'view') {
      $battle.view(eid);
    } else if (action === 'enchant') {
      $battle.enchant($battle.current, item, count);
    } else if (action === 'repair') {
      $battle.repair($battle.current);
    } else if (action === 'repairall') {
      $battle.repair('all');
    } else if (action === 'buy') {
      $battle.buy(item, count);
    }
  },
  get: function (eid) {
    return $battle.equips.find((eq) => eq.info.eid == eid);
  },
  view: function (eid) {
    $battle.node.repair.innerHTML = '';
    $battle.node.enchant.innerHTML = '';

    const eq = $battle.get(eid);
    if (!eq) {
      return;
    }
    $battle.get($battle.current)?.node.li.classList.remove('hvut-bt-active');
    $battle.current = eq.info.eid;
    eq.node.li.classList.add('hvut-bt-active');

    if (eq.data.repair) {
      eq.data.repair.forEach(({ name, count }) => {
        const stock = $item.count(name);
        const textContent = `${$config.settings.translateNames ? $equip.$i18n.itemName(name) : name} x ${count} (${stock})`;
        const className = stock < count ? 'hvut-bt-warn' : '';
        $element('li', $battle.node.repair, { textContent, className });
      });
    } else if (eq.data.repair === null) {
      $element('li', $battle.node.repair, '-');
    }

    if (!$item.list) {
      return;
    }
    const cat = eq.info.cat;
    const day = (new Date()).getUTCDay();
    Object.entries($battle.enchant_data).forEach(([name, item]) => {
      if (item[cat]) {
        const li = $element('li', $battle.node.enchant);
        const count = (cat === 'weapon' && name.includes('Infusion of ') ? $config.settings.equipEnchantWeapon : $config.settings.equipEnchantArmor) || 1;
        const stock = $item.count(name);
        if (cat === 'weapon' && item.day === day) {
          li.classList.add('hvut-bt-day');
        }
        if (!stock) {
          li.classList.add('hvut-bt-nostock');
        }
        $element('span', li, [`[+${count}]`, '.hvut-cphu', { dataset: { action: 'enchant', item: name, count } }]);
        $element('span', li, [`${$config.settings.translateNames ? $equip.$i18n.itemName(item.effect) : item.effect}`, '.hvut-cphu', { dataset: { action: 'enchant', item: name, count: 1 } }]);
        $element('span', li, [`(${stock})`]);
      }
    });
  },
  load: async function (eid) {
    const eq = $battle.get(eid);
    eq.node.enc.textContent = '加载中…';
    const html = await $ajax.fetch(`equip/${eq.info.eid}/${eq.info.key}`);
    const doc = $doc(html);
    $battle.parse(eq.info.eid, doc);
  },
  parse: function (eid, doc) {
    const div = $id('equip_extended', doc);
    const exec = /Condition: (\d+) \/ (\d+) \((\d+)%\)/.exec($qs('.eq', div).children[1].textContent);
    const eq = $battle.get(eid);
    eq.info.condition = parseInt(exec[1]);
    eq.info.durability = parseInt(exec[2]);
    eq.info.cdt = eq.info.condition / eq.info.durability;
    $battle.display_condition(eq.info.eid);

    eq.node.enc.innerHTML = '';
    const enchant = $qsa('#ee > span', div);
    enchant.forEach((e) => { $element('span', eq.node.enc, e.textContent); });
    if (!enchant.length) {
      eq.node.enc.textContent = '无附魔';
    }
  },
  enchant: async function (eid, name, count) {
    if (!$item.list) {
      return;
    }
    const eq = $battle.get(eid);
    const item = $battle.enchant_data[name];
    const stock = $item.count(name);
    if (count > stock) {
      count = stock;
    }
    if (count < 1) {
      return;
    }
    eq.node.enc.textContent = '加载中…';

    async function enchant(eq) {
      const html = await $ajax.fetch('?s=Forge&ss=en', `select_item=${eq.info.eid}&enchantment=${item[eq.info.cat]}`);
      const doc = $doc(html);
      const error = get_message(doc);
      if (error) {
        popup(error);
      }
      $battle.parse(eq.info.eid, doc);
    }

    const requests = $ajax.repeat(count, enchant, eq);
    await Promise.all(requests);
    $battle.load_inventory();
  },
  repair: async function (eid) {
    const eq = $battle.get(eid);
    const eqall = eid === 'all';
    if (eq?.info?.cdt === 1 || $battle.repair.repairall === null) {
      return;
    }

    let requires;
    if (eqall) {
      requires = $battle.repair.repairall;
    } else if (eq) {
      requires = eq.data.repair;
    }
    if (requires) {
      const items = [];
      requires.forEach(({ name, count }) => {
        count -= $item.count(name);
        if (count > 0) {
          items.push({ name, count });
        }
      });
      if (items.length) {
        if (!confirm('维修材料不足。\n是否从道具店购买材料来维修你的装备?')) {
          return;
        }
        $battle.node.repairall.innerHTML = '';
        $battle.node.repair.innerHTML = '';
        $element('li', $battle.node.repairall, '...');
        $element('li', $battle.node.repair, '...');
        await $item.buy(items);
      }
    }

    $battle.node.repairall.innerHTML = '';
    $battle.node.repair.innerHTML = '';

    const html = await $ajax.fetch('?s=Forge&ss=re', eq ? 'select_item=' + eq.info.eid : eqall ? 'repair_all=1' : null);
    const doc = $doc(html);
    $battle.load_dynjs(doc);

    const error = get_message(doc);
    if (error) {
      popup(error);
      $battle.load_inventory();
      return;
    }

    const repairall = /Requires: (.+)/.exec($id('repairall', doc).nextElementSibling.textContent)[1];
    if (repairall === 'Everything is fully repaired.') {
      $battle.repair.repairall = null;
    } else {
      $battle.repair.repairall = repairall.split(', ').map((e) => {
        const exec = /(\d+)x (.+)/.exec(e);
        const count = parseInt(exec[1]);
        const name = exec[2];
        return { name, count };
      });
    }

    const equips = {};
    $qsa('.equiplist div[onclick*="set_forge_cost"]', doc).forEach((div) => {
      const exec = /set_forge_cost\((\d+),'Requires: (.+?)'/.exec(div.getAttribute('onclick'));
      const eid = exec[1];
      const requires = exec[2];
      equips[eid] = requires.split(', ').map((e) => {
        const exec = /(\d+)x (.+)/.exec(e);
        const count = parseInt(exec[1]);
        const name = exec[2];
        return { name, count };
      });
    });

    $battle.equips.forEach((e) => {
      const requires = equips[e.info.eid];
      if (requires) {
        e.data.repair = requires;
      } else {
        e.data.repair = null;
      }
      if (eq === e || eqall && $config.settings.equipEnchantCheckArmors) {
        $battle.load(e.info.eid);
      }
    });

    if (eq || eqall) {
      $battle.load_inventory();
    } else {
      $battle.display_inventory();
    }
    $persona.check_warning(doc);
  },
  buy: async function (name, count) {
    if (!confirm(`要购买 ${count} x ${name} 吗?`)) {
      return;
    }
    const items = [{ name, count }];
    await $item.buy(items);
    $battle.load_inventory();
  },
  load_dynjs: async function (doc) {
    const src = $qs('script[src*="/dynjs/"]', doc).src;
    const html = await $ajax.fetch(src + '?t=' + Date.now());
    $equip.dynjs_loaded = JSON.parse(html.slice(16, -1));

    $battle.equips.some((eq) => {
      const dynjs = $equip.dynjs_loaded[eq.info.eid];
      if (!dynjs) {
        $persona.change_p();
        return true;
      }
      const exec = $equip.reg.html.exec(dynjs.d);
      eq.info.condition = parseInt(exec[4]);
      eq.info.durability = parseInt(exec[5]);
      eq.info.cdt = eq.info.condition / eq.info.durability;
      $battle.display_condition(eq.info.eid);
    });
  },
  display_condition: function (eid) {
    const eq = $battle.get(eid);
    let thld = $config.settings.equipEnchantRepairThreshold;
    if (thld < 1) {
      thld = eq.info.cdt <= thld;
    } else { // margin to 50%
      thld = eq.info.condition <= thld + eq.info.durability * 0.5;
    }
    eq.node.cdt.textContent = `${eq.info.condition} / ${eq.info.durability} (${(eq.info.cdt * 100).toFixed(1)}%)`;
    eq.node.cdt.className = eq.info.cdt <= 0.5 ? 'hvut-bt-cdt2' : eq.info.cdt <= 0.6 || thld ? 'hvut-bt-cdt1' : '';
  },
  load_inventory: async function () {
    $battle.node.inventory.innerHTML = '';
    $battle.node.repairall.innerHTML = '';
    await $item.load();
    $battle.display_inventory();
    $config.set('items', $item.count());
  },
  display_inventory: function () {
    $battle.node.inventory.innerHTML = '';
    $battle.node.repairall.innerHTML = '';
    if (!$item.list) {
      return;
    }
    Object.entries($config.settings.equipEnchantItemInventory).forEach(([name, count]) => {
      const stock = $item.count(name);
      const textContent = `${$config.settings.translateNames ? $equip.$i18n.itemName(name) : name} (${stock})`;
      const className = stock < count ? 'hvut-bt-warn' : '';
      const dataset = { action: 'buy', item: name, count };
      $element('li', $battle.node.inventory, { textContent, className, dataset });
    });
    if ($battle.repair.repairall) {
      $battle.repair.repairall.forEach(({ name, count }) => {
        const stock = $item.count(name);
        const textContent = `${$config.settings.translateNames ? $equip.$i18n.itemName(name) : name} x ${count} (${stock})`;
        const className = stock < count ? 'hvut-bt-warn' : '';
        $element('li', $battle.node.repairall, { textContent, className });
      });
    } else if ($battle.repair.repairall === null) {
      $element('li', $battle.node.repairall, '一切已完全修复。');
    }
    $battle.view($battle.current);
  },
  create: function () {
    $battle.load_inventory();
    $battle.equips.length = 0;
    $battle.node.equip.innerHTML = '';
    const equipset = $config.get('equipset');
    if (!equipset) {
      $persona.change_p();
      return;
    }
    equipset.forEach((info) => {
      if (!info.eid) {
        $element('li', $battle.node.equip, [`/<a>${info.slot}</a><span>空</span><span></span>`]);
        return false;
      }

      const eq = { info, data: {}, node: {} };
      eq.info.cat = (eq.info.category === 'One-handed Weapon' || eq.info.category === 'Two-handed Weapon' || eq.info.category === 'Staff') ? 'weapon' : 'armor';
      eq.node.li = $element('li', $battle.node.equip);
      eq.node.name = $element('a', eq.node.li, { textContent: $equip.$i18n.displayName(eq), href: `equip/${eq.info.eid}/${eq.info.key}`, target: '_blank' });
      eq.node.enc = $element('span', eq.node.li);
      eq.node.cdt = $element('span', eq.node.li, { textContent: '...', dataset: { action: 'view', eid: eq.info.eid } });

      $battle.equips.push(eq);
      if (eq.info.cat === 'weapon' || $config.settings.equipEnchantCheckArmors) {
        $battle.load(eq.info.eid);
      }
    });

    $battle.current = $battle.equips[0]?.info.eid;
    $battle.repair();
  },
  init: function () {
    GM_addStyle(/*css*/`
      .hvut-bt-outer { width: 1220px !important; }
      .hvut-bt-outer > p { width: 520px; margin-left: auto; margin-right: auto; }
      .hvut-bt-on .hvut-bt-outer { width: 620px !important; }
      .hvut-bt-on.hvut-bt-left .hvut-bt-outer { margin-left: 600px !important; }
      .hvut-bt-on.hvut-bt-right .hvut-bt-outer { margin-right: 600px !important; }
      .hvut-bt-on .hvut-bt-div { visibility: visible; }
      .hvut-bt-left .hvut-bt-div { left: 8px; }
      .hvut-bt-right .hvut-bt-div { right: 8px; }
      #popup_box.hvut-bt-right-popup { left: 624px !important; }
      #popup_box.hvut-bt-left-popup { left: 244px !important; }

      .hvut-bt-div { visibility: hidden; position: absolute; bottom: 8px; width: 599px; height: 417px; color: #333; font-size: 10pt; line-height: 20px; white-space: nowrap; }
      .hvut-bt-div > ul { margin: 0; padding: 21px 0 0; border: 1px solid; list-style: none; display: flex; flex-direction: column; justify-content: center; }
      .hvut-bt-div > ul::before { content: attr(data-header); position: absolute; top: 0; width: 100%; border-bottom: 1px solid; background-color: #edb; font-size: 10pt; line-height: 20px; font-weight: bold; }

      .hvut-bt-equip { position: absolute; bottom: 0; left: 0; width: 400px; height: 286px; }
      .hvut-bt-equip li { position: relative; height: 40px; padding-right: 60px; border-bottom: 1px solid; }
      .hvut-bt-equip li:last-child { border-bottom: none; }
      .hvut-bt-equip li:hover { background-color: #fff; z-index: 1; }
      .hvut-bt-active { background-color: #fff; }
      .hvut-bt-equip li > a { display: block; overflow: hidden; text-overflow: ellipsis; font-weight: bold; text-decoration: none; }
      .hvut-bt-equip li > span:nth-child(2) { display: block; font-size: 9pt; overflow: hidden; text-overflow: ellipsis; }
      .hvut-bt-equip li > span:nth-child(2) > span { display: inline-block; margin: 0 3px; color: #e00; }
      .hvut-bt-equip li > span:nth-child(2):empty { visibility: hidden; }
      .hvut-bt-equip li:hover > span:nth-child(2) { white-space: normal; border-bottom: 1px solid; background: inherit; pointer-events: none; }
      .hvut-bt-equip li:last-child:hover > span:nth-child(2) { position: absolute; bottom: 0; width: 340px; border-top: 1px solid; border-bottom: none; }
      .hvut-bt-equip li > span:nth-child(3) { position: absolute; top: 0; right: 0; width: 59px; height: 100%; border-left: 1px solid #333; font-size: 9pt; white-space: normal; cursor: pointer; }
      .hvut-bt-equip li > span:nth-child(3):hover { background-color: #fff; }
      .hvut-bt-cdt1 { color: #e00; }
      .hvut-bt-cdt2 { color: #fff; background-color: #e00 !important; }

      .hvut-bt-inventory { position: absolute; bottom: 314px; left: 0; width: 400px; min-height: 80px; max-height: 160px; flex-direction: row !important; justify-content: space-between !important; flex-wrap: wrap; align-content: space-evenly; font-size: 9pt; }
      .hvut-bt-inventory > li { width: 32%; overflow: hidden; cursor: pointer; }
      .hvut-bt-inventory > li:last-child:nth-child(3n+2) { margin-right: 34%; }
      .hvut-bt-warn { color: #e00; }

      .hvut-bt-enchant { position: absolute; bottom: 0; left: 407px; width: 190px; height: 204px; line-height: 18px; }
      .hvut-bt-enchant > li { display: flex; margin: 2px 0; }
      .hvut-bt-enchant span { margin: 0 2px; }
      .hvut-bt-enchant span:nth-child(1) { color: #03c; }
      .hvut-bt-enchant span:nth-child(2) { flex-grow: 1; overflow: hidden; text-overflow: ellipsis; text-align: left; color: #03c; }
      .hvut-bt-day { background-color: #fff; }
      .hvut-bt-day span:nth-child(2) { font-weight: bold; }
      .hvut-bt-nostock span { color: #999 !important; cursor: default; }

      .hvut-bt-repair { position: absolute; bottom: 232px; left: 407px; width: 190px; height: 54px; cursor: pointer; }
      .hvut-bt-repair:hover { background-color: #fff; }
      .hvut-bt-repairall { position: absolute; bottom: 314px; left: 407px; width: 190px; min-height: 80px; cursor: pointer; }
      .hvut-bt-repairall:hover { background-color: #fff; }
    `);

    $battle.node.div = $element('div', $id('mainpane'), ['.hvut-bt-div'], (e) => { $battle.click(e); });
    $battle.node.equip = $element('ul', $battle.node.div, ['.hvut-bt-equip', { dataset: { header: 'EQUIPMENT' } }]);
    $battle.node.enchant = $element('ul', $battle.node.div, ['.hvut-bt-enchant', { dataset: { header: 'ENCHANT' } }]);
    $battle.node.repair = $element('ul', $battle.node.div, ['.hvut-bt-repair', { dataset: { header: 'REPAIR', action: 'repair' } }]);
    $battle.node.repairall = $element('ul', $battle.node.div, ['.hvut-bt-repairall', { dataset: { header: 'REPAIR ALL', action: 'repairall' } }]);
    $battle.node.inventory = $element('ul', $battle.node.div, ['.hvut-bt-inventory', { dataset: { header: 'ITEM INVENTORY' } }]);

    $id('mainpane').classList.add('hvut-bt-on');
    $id('mainpane').style.paddingRight = '8px';

    if ($config.settings.equipEnchantPosition === 'right') {
      $id('mainpane').classList.add('hvut-bt-right');
      $id('popup_box').classList.add('hvut-bt-right-popup');
    } else {
      $id('mainpane').classList.add('hvut-bt-left');
      $id('popup_box').classList.add('hvut-bt-left-popup');
    }

    $qs('#arena_outer, #rob_outer, #towerstart, #grindfest, #itemworld_outer')?.classList.add('hvut-bt-outer');

    $battle.create();
  },

};

// BASIC CSS
GM_addStyle(/*css*/`
  input, textarea, select, option { font-size: 9pt; }
  input[type='text'], input[type='number'] { margin: 0 5px; padding: 2px 4px; border-width: 1px; line-height: 16px; }
  input[type='text'][readonly], input[type='number'][readonly] { color: #666; }
  input[type='number'] { -moz-appearance: textfield; }
  input[type='number']::-webkit-outer-spin-button, input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; }
  input[type='button'] { font-weight: bold; margin: 0 5px; padding: 1px 3px; border-width: 2px; border-radius: 5px; line-height: 16px; }
  input[type='checkbox'] { width: 16px; height: 16px; margin: 0 2px; position: relative; top: 0; vertical-align: top; }
  textarea { margin: 5px; padding: 4px; border-width: 1px; line-height: 20px; }
  select { margin: 0 5px; padding: 2px; border-width: 1px; height: calc(4em/3 + 6px); }
  select[size] { height: auto; }
  select[size] option:checked { background-color: revert; color: revert; }
  .hvut-label input { display: none; }
  .hvut-label input + span { position: relative; display: inline-block; width: 14px; height: 14px; border: 1px solid #966; background-color: #fff; vertical-align: top; }
  .hvut-label:hover input + span { border-color: #5C0D11; background-color: #fff; }
  .hvut-label input[type='checkbox'] + span { border-radius: 3px; }
  .hvut-label input[type='radio'] + span { border-radius: 50%; }
  .hvut-label input[type='checkbox']:checked + span::before { content: ''; position: absolute; top: 1px; left: 4px; width: 3px; height: 7px; border: solid #5C0D11; border-width: 0 3px 3px 0; transform: rotate(45deg); }
  .hvut-label input[type='radio']:checked + span::before { content: ''; position: absolute; top: 3px; left: 3px; width: 8px; height: 8px; background-color: #5C0D11; border-radius: 50%; }
  .hvut-scrollbar-none { padding: 0; scrollbar-width: none; }
  .hvut-scrollbar-none::-webkit-scrollbar { display: none; }
  .hvut-scrollbar-none option { margin: 0; border: 0; padding: 3px; }

  #mainpane { width: auto; }
  .csps { visibility: hidden; }
  .csps > img { display: none; }
  .cspp { overflow-y: auto; }
  .fc2, .fc4 { display: inline; }

  .hvut-none { display: none !important; }
  .hvut-none-cont .hvut-none-item { display: none; }
  .hvut-cphu, .hvut-cphu-sub > * { cursor: pointer; }
  .hvut-cphu:hover, .hvut-cphu-sub > *:hover { text-decoration: underline; }
  .hvut-spaceholder { flex-grow: 1; }
  .hvut-side { position: absolute; width: 100px; display: flex; flex-direction: column; }
  .hvut-side > input { margin: 3px 0; white-space: normal; }
  .hvut-side-margin { margin-bottom: 10px !important; }

  .equiplist { font-weight: normal; }
  .eqp { margin: 5px; width: auto; }
  .eqp:hover { background-color: #ddd; }
  .eqp > div:last-child { position: relative; padding: 1px 5px; line-height: 20px; white-space: nowrap; }
  .hvut-eq-customname::after { visibility: hidden; content: attr(data-eqname); position: absolute; top: -1px; left: -1px; min-width: 100%; border: 1px solid; padding: inherit; background-color: inherit; }
  .hvut-eq-customname:hover::after { visibility: visible; }
  .hvut-eq-category { margin: 10px 0 5px; padding: 2px 5px; border: 1px solid; font-size: 10pt; font-weight: bold; background-color: #edb; }
  .hvut-eq-loading .hvut-eq-category { background-color: #eee; color: #333; }
  .hvut-eq-type { margin: 10px 5px 5px; padding: 2px 5px; border: 1px solid; font-size: 10pt; font-weight: bold; }
  div + .hvut-eq-border { margin-top: 11px; }
  div + .hvut-eq-border::before { content: ''; position: absolute; margin-top: -6px; width: 100%; border-top: 1px solid #5C0D11; }
  .hvut-none-cont .hvut-eq-border { margin-top: 0; }
  .hvut-none-cont .hvut-eq-border::before { content: none; }

  .itemlist { user-select: auto !important; }
  .itemlist > tbody > tr > td > div { padding: 3px 5px 3px 18px; line-height: 16px; }
  .itemlist > tbody > tr > td > div[style*='color'] { box-shadow: 0 0 0 2px inset; }
  .it, .it ~ td { padding-top: 7px; }
  .hvut-it-Consumable { color: #00B000; }
  .hvut-it-Artifact { color: #0000FF; }
  .hvut-it-Trophy { color: #461B7E; }
  .hvut-it-Token { color: #254117; }
  .hvut-it-Crystal { color: #BA05B4; }
  .hvut-it-MonsterFood { color: #489EFF; }
  .hvut-it-Material { color: #f00; }
  .hvut-it-Collectable { color: #0000FF; }
`);

if ($config.settings.equipColor) {
  GM_addStyle(/*css*/`
    .eqp > div:last-child:not([onclick]) { color: #966; }
    .eqp > div:last-child[style*='color'] { box-shadow: 0 0 0 2px inset; }
    .hvut-eq-Peerless { background-color: #fbb; }
    .hvut-eq-Legendary { background-color: #fd8; }
    .hvut-eq-Magnificent { background-color: #bdf; }
    .hvut-eq-Exquisite { background-color: #ce9; }
    .hvut-eq-Superior { background-color: #ccc; }
  `);
}

if ($id('stats_pane')) {
  GM_addStyle(/*css*/`
    #stats_header, #eqch_stats .csps { display: none; }
    #stats_pane { height: 650px !important; white-space: nowrap; }
    .stats_page .spc { width: auto; padding: 10px 0 0 10px; font-weight: bold; }
    .stats_page .far { color: #c00; }
    .stats_page .st2 > div:nth-child(2n) { width: 100px; }
    .hvut-ch-expand #eqch_left { width: 660px; }
    .hvut-ch-expand #eqch_stats { width: 560px; }
    .hvut-ch-expand #stats_pane { overflow: hidden !important; }
    .hvut-ch-expand .stats_page { float: left; height: 100%; overflow: hidden; }
    .hvut-ch-expand .stats_page:hover { overflow: visible; }
    .hvut-ch-expand .stats_page:nth-of-type(1) { width: 250px; border-right: 1px dotted; }
    .hvut-ch-expand .stats_page:nth-of-type(2) { width: 300px; margin-left: 3px; }
    .hvut-ch-expand .st1 > div:nth-child(2n+1) { width: 45px; padding-left: 5px; clear: left; }
    .hvut-ch-expand .st1 > div:nth-child(2n) { width: 200px; }
    .hvut-ch-expand .st2 > div:nth-child(2n+1) { width: 45px; padding-left: 5px; }
    .hvut-ch-expand .st2 > div:nth-child(2n) { width: 100px; }
    .hvut-ch-expand .st3 > div:nth-child(2n+1) { width: 45px; padding-left: 5px; }
    .hvut-ch-expand .st3 > div:nth-child(2n) { width: 200px; }
  `);

  $qs('#stats_pane > div:last-of-type').prepend(...$qsa('#stats_pane > div:first-of-type > div:nth-last-of-type(-n+2)'));
  toggle_button($input('button', $id('stats_pane'), { style: 'position: absolute; top: 12px; right: 20px; width: 100px;' }), '折叠', '展开', $id('eqch_outer'), 'hvut-ch-expand', true);
}

// DISABLE FONT ENGINE
_window.common.get_dynamic_digit_string = function (n) { return `<div class="fc4 far fcb"><div>${n.toLocaleString()}</div></div>`; };

if ($config.settings.equipHoverFunctions) {
  // EQUIPMENT KEY FUNCTIONS
  document.addEventListener('keydown', (e) => {
    if (e.target.nodeName === 'INPUT' || e.target.nodeName === 'TEXTAREA') {
      return;
    }
    const div = $qs('div[data-eid]:hover');
    if (div) {
      const eq = $equip.parse.div(div);
      if (e.key === 'C') {
        div.dispatchEvent(new MouseEvent('mouseover'));
        document.dispatchEvent(new KeyboardEvent('keypress', { which: 99, keyCode: 99 }));
      }
      const key = e.key.toUpperCase();
      if (key === 'V') {
        window.open(`equip/${eq.info.eid}/${eq.info.key}`, '_blank');
      } else if (key === 'L') {
        prompt('Forum Link:', `[url=${location.origin}${location.pathname}equip/${eq.info.eid}/${eq.info.key}]${eq.info.name}[/url]`);
      } else if (key === 'K') {
        $equip.namecode(eq);
        prompt('Forum Link:', `[url=${location.origin}${location.pathname}equip/${eq.info.eid}/${eq.info.key}]${eq.data.namecode}[/url]`);
      }
    }
  });

  // EQUIPMENT MOUSE FUNCTIONS
  document.addEventListener('dblclick', () => {
    const div = $qs('div[data-eid]:hover');
    if (div) {
      window.open(`equip/${div.dataset.eid}/${div.dataset.key}`, '_blank');
    }
  });
}

if ($config.settings.equipTouchFunctions) {
  // EQUIPMENT TOUCH FUNCTIONS
  function handleAction(target) {
    const div = target?.closest('div[data-eid]');
    if (!div) {
      return;
    }
    window.open(`equip/${div.dataset.eid}/${div.dataset.key}`, '_blank');
  }

  let lastTap = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      const target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
      handleAction(target);
    }
    lastTap = now;
  });

  let touchTimer = null;
  document.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    touchTimer = setTimeout(() => {
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      handleAction(target);
    }, 500);
  });

  document.addEventListener('touchend', () => {
    clearTimeout(touchTimer);
  });

  document.addEventListener('touchmove', () => {
    clearTimeout(touchTimer);
  });
}

// TOP MENU
GM_addStyle(/*css*/`
  #navbar { display: none; }

  #hvut-top { display: flex; position: relative; height: 22px; padding: 2px 0; border-bottom: 1px solid; font-size: 10pt; line-height: 22px; font-weight: bold; z-index: 10; white-space: nowrap; cursor: default; }
  #hvut-top > div { position: relative; height: 22px; margin: 0 5px; }
  #hvut-top a { display: block; text-decoration: none; }

  .hvut-top-warn { background-color: #fd9; }
  .hvut-top-message { position: absolute !important; top: 100%; left: -1px; width: 100%; margin: 0 !important; padding: 2px 0; border: 1px solid #5C0D11; background-color: #fd9c; color: #e00; z-index: -1; pointer-events: none; }

  .hvut-top-sub { visibility: hidden; position: absolute; top: 22px; left: -6px; padding: 5px; border-style: solid; border-width: 0 1px 1px; background-color: #EDEBDF; opacity: 0.95; }
  div:hover > .hvut-top-sub { visibility: visible; }
  .hvut-top-sub select { display: block; margin: 0; }
  .hvut-top-stamina > p { width: 220px; border-top: 1px solid #5C0D11; white-space: normal; }
  .hvut-top-stamina > p:first-child { border-top: none; }
  .hvut-top-exp { position: relative; width: 299px; height: 8px; margin: 0 auto; border: 1px solid; background: linear-gradient(to right, #930 1px, transparent 1px) repeat -1px 0 / 30px; }
  .hvut-top-exp::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #fff; z-index: -1; }
  .hvut-top-exp > div { position: absolute; top: 0; left: 0; height: 100%; background-color: #9cf; z-index: -1; }
  .hvut-top-placeholder { flex: 1; }
  .hvut-top-server { left: auto; right: -6px; }
  .hvut-top-config { left: auto; right: -6px; }
  .hvut-top-config > div { margin: 5px; text-align: left; cursor: pointer; }

  .hvut-top-menu { display: flex; }
  .hvut-top-menu > div { position: relative; margin: 0 5px; }
  .hvut-top-menu span { font-size: 12pt; color: #930; }
  .hvut-top-menu .hvut-top-sub { width: max-content; }
  .hvut-top-menu ul { float: left; margin: 0 0 0 5px; padding: 0; list-style: none; text-align: left; line-height: 20px; }
  .hvut-top-menu ul:first-child { margin-left: 0; }
  .hvut-top-menu a { margin: 3px 0; padding: 0 5px; }
  .hvut-top-menu a:hover { background-color: #fff; }
  .hvut-top-menu-s { padding: 0 5px; background-color: #5C0D11; color: #fff; }

  .hvut-top-links { display: flex; }
  .hvut-top-links > a { position: relative; margin: 0 1px; padding: 0 1px; min-width: 28px; font-size: 12pt; border-radius: 2px; }
  .hvut-top-links > a:hover { background-color: #fff; }
  .hvut-top-links > a > span { display: none; position: absolute; top: 100%; left: 0; margin-top: 2px; margin-left: 0; padding: 1px 4px; background-color: #fff; color: #930; border: 1px solid; font-size: 10pt; line-height: 20px; font-weight: normal; pointer-events: none; }
  .hvut-top-links > a:hover > span { display: block; }
  .hvut-top-ygm { color: transparent !important; background: url('/y/mmail/ygm.png') no-repeat center center; animation: ygm 0.5s ease-in-out 10 alternate; filter: brightness(200%); }
  .hvut-top-ygm:hover { color: #e00 !important; background-image: none; animation: none; filter: none; }
  @keyframes ygm { from { opacity: 1; } to { opacity: 0.3; } }
`);

_top.menu = {
  'Character': { s: 'Character', ss: 'ch', button: 'CH', text: '角色' },
  'Equipment': { s: 'Character', ss: 'eq', button: 'EQ', text: '装备' },
  'Abilities': { s: 'Character', ss: 'ab', button: 'AB', text: '能力' },
  'Training': { s: 'Character', ss: 'tr', button: 'TR', text: '训练', disabled: 'isekai' },
  'Item Inventory': { s: 'Character', ss: 'it', button: 'IT', text: '道具仓库' },
  'Equip Inventory': { s: 'Character', ss: 'in', button: 'IN', text: '装备仓库' },
  'Settings': { s: 'Character', ss: 'se', button: 'SE', text: '设置' },
  'Equipment Shop': { s: 'Bazaar', ss: 'es', button: 'ES', text: '装备店' },
  'Item Shop': { s: 'Bazaar', ss: 'is', button: 'IS', text: '道具店' },
  'The Shrine': { s: 'Bazaar', ss: 'ss', button: 'SS', text: '祭坛' },
  'The Market': { s: 'Bazaar', ss: 'mk', button: 'MK', text: '市场' },
  'Monster Lab': { s: 'Bazaar', ss: 'ml', button: 'ML', text: '怪物实验室', disabled: 'isekai' },
  'MoogleMail': { s: 'Bazaar', ss: 'mm', button: 'MM', text: '莫古邮件' },
  'Weapon Lottery': { s: 'Bazaar', ss: 'lt', button: 'LT', text: '武器抽奖', disabled: 'isekai' },
  'Armor Lottery': { s: 'Bazaar', ss: 'la', button: 'LA', text: '防具抽奖', disabled: 'isekai' },
  'The Arena': { s: 'Battle', ss: 'ar', button: 'AR', text: '竞技场' },
  'The Tower': { s: 'Battle', ss: 'tw', button: 'TW', text: '高塔', disabled: 'persistent' },
  'Ring of Blood': { s: 'Battle', ss: 'rb', button: 'RB', text: '浴血擂台' },
  'GrindFest': { s: 'Battle', ss: 'gr', button: 'GR', text: '压榨界' },
  'Item World': { s: 'Battle', ss: 'iw', button: 'IW', text: '道具界' },
  'Repair': { s: 'Forge', ss: 're', button: 'RE', text: '维修' },
  'Upgrade': { s: 'Forge', ss: 'up', button: 'UP', text: '升级' },
  'Enchant': { s: 'Forge', ss: 'en', button: 'EN', text: '附魔' },
  'Salvage': { s: 'Forge', ss: 'sa', button: 'SA', text: '分解' },
  'Reforge': { s: 'Forge', ss: 'fo', button: 'FO', text: '重铸' },
  'Soulfuse': { s: 'Forge', ss: 'fu', button: 'FU', text: '灵魂同步' },
};
Object.values(_top.menu).forEach((m) => {
  if (!m.href) {
    m.href = `?s=${m.s}&ss=${m.ss}`;
  }
});

_top.create = function () {
  if (_top.inited) {
    return;
  }
  _top.inited = true;

  const ul = {};
  if ($config.settings.topMenuIntegration) {
    const menu_sub = $element('div', _top.node.menu['MENU'], ['.hvut-top-sub']);
    ['Character', 'Bazaar', 'Battle', 'Forge'].forEach((m) => {
      ul[m] = $element('ul', menu_sub);
      $element('li', ul[m], [m, '.hvut-top-menu-s']);
    });
  } else {
    ['Character', 'Bazaar', 'Battle', 'Forge'].forEach((m) => {
      const menu_sub = $element('div', _top.node.menu[m], ['.hvut-top-sub']);
      ul[m] = $element('ul', menu_sub);
    });
  }
  Object.values(_top.menu).forEach((m) => {
    if (m.disabled === 'persistent' && !$config.isekai || m.disabled === 'isekai' && $config.isekai) {
      return;
    }
    const li = $element('li', ul[m.s]);
    $element('a', li, { textContent: m.text, href: m.href });
  });

  const stamina_sub = $element('div', _top.node.stamina, ['.hvut-top-sub hvut-top-stamina']);
  if (!$config.isekai) {
    _top.node.stamina_form = $element('form', stamina_sub, { method: 'POST' }, { submit: (e) => { _top.stamina_submit(e); } });
    $input('hidden', _top.node.stamina_form, { name: 'recover', value: 'stamina' });
    $input('submit', _top.node.stamina_form, { value: '使用恢复剂', disabled: _player.stamina >= $config.settings.disableStaminaRestorative, style: 'width: 200px;' });
    _top.node.stamina.addEventListener('mouseenter', _top.stamina_create);
  }
  $element('p', stamina_sub, _player.condition);
  if (_player.accuracy) {
    $element('p', stamina_sub, [_player.accuracy, '!color: #e00;']);
  }

  if (_player.level !== 500) {
    const exec = /([0-9,]+) \/ ([0-9,]+)\s*Next: ([0-9,]+)/.exec($id('level_details').textContent);
    const exp = parseInt(exec[1].replace(/,/g, ''));
    const up = parseInt(exec[2].replace(/,/g, ''));
    const next = parseInt(exec[3].replace(/,/g, ''));
    const level_start = Math.round(Math.pow(_player.level + 3, Math.pow(2.850263212287058, 1 + _player.level / 1000)));
    const level_exp = exp - level_start;
    const level_up = up - level_start;
    const pct = ((level_exp / level_up) * 100).toFixed(2);
    const level_sub = $element('div', _top.node.level, ['.hvut-top-sub']);
    $element('p', level_sub, `总计: ${exp.toLocaleString()} / ${up.toLocaleString()}`);
    $element('p', level_sub, `下一级: ${next.toLocaleString()}`);
    $element('p', level_sub, `本级: ${level_exp.toLocaleString()} / ${level_up.toLocaleString()} (${pct}%)`);
    $element('div', level_sub, ['.hvut-top-exp', `/<div style="width: ${pct}%;"></div>`]);
  }

  const server_sub = $element('div', _top.node.server, ['.hvut-top-sub hvut-top-server']);
  if ($config.isekai) {
    const server_on = 'Isekai';
    const server_to = 'Persistent';
    $element('a', server_sub, { href: '/', innerHTML: `<p>当前在 ${server_on} 游玩</p><p>${$config.isekai}</p><p>点击切换到 ${server_to}</p>` });
  } else {
    const server_on = 'Persistent';
    const server_to = 'Isekai';
    $element('a', server_sub, { href: '/isekai/', innerHTML: `<p>当前在 ${server_on} 游玩</p><p>点击切换到 ${server_to}</p>` });
  }

  const config_sub = $element('div', _top.node.config, ['.hvut-top-sub hvut-top-config']);
  $element('div', config_sub, 'HV Utils 设置', () => { $config.open(); });
  if ($id('mbsettings')) { // monsterbation
    config_sub.appendChild($id('mbsettings'));
    $id('mbsettings').firstElementChild.className = '';
    GM_addStyle(/*css*/`
      #mbsettings { position: relative; }
      #mbprofile { top: 100%; left: 0; min-width: 100%; box-sizing: border-box; font-weight: normal; }
    `);
  }
};

_top.stamina_create = async function () {
  if (_top.stamina_create.inited) {
    return;
  }
  _top.stamina_create.inited = true;
  const p = $element('p', _top.node.stamina_form, '加载中…');
  await $item.once();
  const items = ['Caffeinated Candy', 'Energy Drink'].filter((e) => $item.count(e));
  if (items.length) {
    items.forEach((e) => { $element('p', _top.node.stamina_form, `${e} (${$item.count(e)})`); });
    p.remove();
  } else {
    p.textContent = '无可用恢复剂';
  }
};

_top.stamina_submit = function (e) {
  if ($config.settings.confirmStaminaRestorative && !confirm('确定要使用耐力恢复剂吗?')) {
    e.preventDefault();
  }
};

_top.init = function () {
  _top.node = {};
  _top.node.div = $element('div', null, ['#hvut-top'], { mouseenter: () => { _top.create(); } });

  const menu_div = $element('div', _top.node.div, ['.hvut-top-menu']);
  _top.node.menu = {};
  if ($config.settings.topMenuIntegration) {
    _top.node.menu['MENU'] = $element('div', menu_div, ['/<span>菜单</span>']);
  } else {
    ['Character', 'Bazaar', 'Battle', 'Forge'].forEach((t) => {
      _top.node.menu[t] = $element('div', menu_div, [`/<span>${t.toUpperCase()}</span>`]);
    });
  }

  const links = $config.settings.topMenuLinks.filter((b) => {
    const m = _top.menu[b];
    if (!m || m.disabled === 'persistent' && !$config.isekai || m.disabled === 'isekai' && $config.isekai) {
      return false;
    } else {
      return true;
    }
  });
  const links_div = $element('div', _top.node.div, ['.hvut-top-links']);
  const new_mail = $id('nav_mail')?.textContent.trim();
  if (new_mail && !links.includes('MoogleMail')) {
    links.push('MoogleMail');
  }
  links.forEach((b) => {
    const m = _top.menu[b];
    let button = m.button;
    let cn = '';
    if (b === 'MoogleMail' && new_mail) {
      button = `[${new_mail}]`;
      cn = 'hvut-top-ygm';
    }
    const a = $element('a', links_div, { textContent: button, href: m.href });
    if (cn) {
      a.className = cn;
    }
    $element('span', a, m.text);
  });

  _top.node.stamina = $element('div', _top.node.div, ['!width: 90px;', `/<span>Stamina: ${_player.stamina}</span>`]);
  _top.node.level = $element('div', _top.node.div, ['!width: 60px;', `/<span>Lv.${_player.level}</span>`]);
  _top.node.difficulty = $element('div', _top.node.div, ['!width: 80px;', `/<span>${_player.difficulty}</span>`]);
  _top.node.persona = $element('div', _top.node.div, ['!width: 110px;', '/<span>形象</span>']);
  if ($config.settings.reNotification) {
    $re.hv();
  }
  $element('div', _top.node.div, ['.hvut-top-placeholder']);
  const server = $config.isekai ? 'Isekai' : 'Persistent';
  _top.node.server = $element('div', _top.node.div, ['!width: 80px;', `/<span>${server}</span>`]);

  _top.node.config = $element('div', _top.node.div, ['!width: 30px;']);
  $element('span', _top.node.config, ['!cursor: pointer;', '/<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="22" viewBox="0 0 50 50" fill="#630"><path d="M47.16,21.221l-5.91-0.966c-0.346-1.186-0.819-2.326-1.411-3.405l3.45-4.917c0.279-0.397,0.231-0.938-0.112-1.282 l-3.889-3.887c-0.347-0.346-0.893-0.391-1.291-0.104l-4.843,3.481c-1.089-0.602-2.239-1.08-3.432-1.427l-1.031-5.886 C28.607,2.35,28.192,2,27.706,2h-5.5c-0.49,0-0.908,0.355-0.987,0.839l-0.956,5.854c-1.2,0.345-2.352,0.818-3.437,1.412l-4.83-3.45 c-0.399-0.285-0.942-0.239-1.289,0.106L6.82,10.648c-0.343,0.343-0.391,0.883-0.112,1.28l3.399,4.863 c-0.605,1.095-1.087,2.254-1.438,3.46l-5.831,0.971c-0.482,0.08-0.836,0.498-0.836,0.986v5.5c0,0.485,0.348,0.9,0.825,0.985 l5.831,1.034c0.349,1.203,0.831,2.362,1.438,3.46l-3.441,4.813c-0.284,0.397-0.239,0.942,0.106,1.289l3.888,3.891 c0.343,0.343,0.884,0.391,1.281,0.112l4.87-3.411c1.093,0.601,2.248,1.078,3.445,1.424l0.976,5.861C21.3,47.647,21.717,48,22.206,48 h5.5c0.485,0,0.9-0.348,0.984-0.825l1.045-5.89c1.199-0.353,2.348-0.833,3.43-1.435l4.905,3.441 c0.398,0.281,0.938,0.232,1.282-0.111l3.888-3.891c0.346-0.347,0.391-0.894,0.104-1.292l-3.498-4.857 c0.593-1.08,1.064-2.222,1.407-3.408l5.918-1.039c0.479-0.084,0.827-0.5,0.827-0.985v-5.5C47.999,21.718,47.644,21.3,47.16,21.221z M25,32c-3.866,0-7-3.134-7-7c0-3.866,3.134-7,7-7s7,3.134,7,7C32,28.866,28.866,32,25,32z"></path></svg>'], () => { $config.open(); });

  $id('navbar').after(_top.node.div);
};

_top.init();

// DIFFICULTY CHANGER
const $dfct = {

  div: _top.node.difficulty,
  button: _top.node.difficulty.firstElementChild,
  list: ['Normal', 'Hard', 'Nightmare', 'Hell', 'Nintendo', 'IWBTH', 'PFUDOR'],

  init: function () {
    const ch_style = $config.get('ch_style', {});
    if (ch_style.difficulty !== _player.difficulty) {
      ch_style.difficulty = _player.difficulty;
      $config.set('ch_style', ch_style);
    }
  },
  create: function () {
    if ($dfct.sub) {
      return;
    }
    $dfct.sub = $element('div', $dfct.div, ['.hvut-top-sub']);
    const options = $dfct.list.map((d, i) => `${i + 1}:${d}`).reverse();
    $dfct.selector = $input(['select', options], $dfct.sub, { size: $dfct.list.length, className: 'hvut-scrollbar-none', style: 'width: 80px;' }, { change: () => {
      $dfct.selector.disabled = true;
      $dfct.change($dfct.selector.value);
    } });
    $dfct.selector.value = $dfct.list.indexOf(_player.difficulty) + 1;
  },
  change: async function (value) {
    $dfct.button.textContent = '(D1...)';
    let html = await $ajax.fetch('?s=Character&ss=se');
    let doc = $doc(html);
    $dfct.button.textContent = '(D2...)';
    const form = new FormData($qs('#settings_outer form', doc));
    form.set('difflevel', value);
    form.set('submit', 'Apply Changes');
    const post = Object.fromEntries(form.entries());
    html = await $ajax.fetch('?s=Character&ss=se', post);
    doc = $doc(html);
    $dfct.set_button(doc);
  },
  set_button: function (doc) {
    const value = /^(.+) Lv\.(\d+)/.exec($id('level_readout', doc).textContent.trim())[1];
    if (!value) {
      $dfct.button.textContent = '(D: ERROR)';
      return;
    }
    _player.difficulty = value;
    $dfct.button.textContent = value;
    if ($dfct.selector) {
      $dfct.selector.value = $dfct.list.indexOf(value) + 1;
      $dfct.selector.disabled = false;
    }
    const ch_style = $config.get('ch_style', {});
    ch_style.difficulty = value;
    $config.set('ch_style', ch_style);
  },

};

$dfct.div.addEventListener('mouseenter', $dfct.create);
$dfct.init();

// PERSONA & EQUIPMENT SET CHANGER
const $persona = {

  json: $config.get('persona', {}),
  div: _top.node.persona,
  button: _top.node.persona.firstElementChild,

  create: function () {
    const json = $persona.json;
    if (!json.pset || !json.eset) {
      return;
    }
    if ($persona.sub) {
      return;
    }
    $persona.sub = $element('div', $persona.div, ['.hvut-top-sub']);

    $persona.selector_p = $input('select', $persona.sub, { size: json.plen, className: 'hvut-scrollbar-none', style: 'width: 110px;' }, { change: () => {
      $persona.selector_p.disabled = true;
      $persona.change_p($persona.selector_p.value);
    } });
    for (let i = 1; i <= json.plen; i++) {
      $element('option', $persona.selector_p, { value: i, text: json[i].name });
    }
    $persona.selector_p.value = json.pset;

    $persona.selector_e = $input('select', $persona.sub, { size: json.elen, className: 'hvut-scrollbar-none', style: 'width: 110px;' }, { change: () => {
      $persona.selector_e.disabled = true;
      $persona.change_e($persona.selector_e.value);
    } });
    for (let i = 1; i <= json.elen; i++) {
      $element('option', $persona.selector_e, { value: i, text: json[json.pset][i].name || `Set ${i}` });
    }
    $persona.selector_e.value = json.eset;
  },
  check_p: function (doc) {
    const json = $persona.json;
    const pset = parseInt($id('persona_form', doc).elements.persona_set.value);
    const plen = $id('persona_form', doc).elements.persona_set.options.length;
    const checked = pset === json.pset;

    Array.from($id('persona_form', doc).elements.persona_set.options).forEach((o) => {
      const pset = parseInt(o.value);
      const pname = o.text;
      if (!json[pset]) {
        json[pset] = {};
      }
      json[pset].name = pname;
    });

    json.pset = pset;
    json.plen = plen;
    json.pname = json[pset].name;
    $persona.set_value();
    return checked;
  },
  check_e: function (doc) {
    const json = $persona.json;
    const pset = json.pset;
    const eset = parseInt($qs('img[src$="_on.png"]', doc).src.slice(-8, -7));
    const elen = $id('eqsl', doc).childElementCount;

    for (let i = 1; i <= elen; i++) {
      if (!json[pset][i]) {
        json[pset][i] = { name: '' };
      }
    }

    json.eset = eset;
    json.elen = elen;
    json.ename = json[pset][eset].name;
    $persona.set_value();
  },
  change_p: async function (pset) {
    $persona.button.textContent = '(P...)';
    $dfct.button.textContent = '(D...)';
    const html = await $ajax.fetch('?s=Character&ss=ch', pset ? 'persona_set=' + pset : null);
    const doc = $doc(html);
    $persona.check_p(doc);
    if ($persona.selector_p) {
      $persona.selector_p.value = $persona.json.pset;
      $persona.selector_p.disabled = false;
    }
    $persona.change_e();
    $dfct.set_button(doc);
  },
  change_e: async function (eset) {
    $persona.button.textContent = '(E...)';
    const html = await $ajax.fetch('?s=Character&ss=eq', eset ? 'equip_set=' + eset : null);
    const doc = $doc(html);
    $persona.check_e(doc);
    const json = $persona.json;
    if ($persona.selector_e) {
      for (let i = 1; i <= json.elen; i++) {
        const ename = json[json.pset][i].name;
        $persona.selector_e.options[i - 1].text = ename || 'Set ' + i;
      }
      $persona.selector_e.value = json.eset;
      $persona.selector_e.disabled = false;
    }
    $persona.set_button();
    $persona.load_dynjs(doc);
    $persona.check_warning(doc);
  },
  set_button: function () {
    const pname = $persona.json.pname || 'Persona ' + $persona.json.pset;
    $persona.button.textContent = `${pname.slice(0, 10)} [${$persona.json.eset}]`;
  },
  load_dynjs: async function (doc) {
    const src = $qs('script[src*="/dynjs/"]', doc).src;
    const html = await $ajax.fetch(src + '?t=' + Date.now());
    $equip.dynjs_loaded = JSON.parse(html.slice(16, -1));
    $persona.save_equipset(doc);
    $persona.parse_stats_pane(doc);
    if (_query.s === 'Battle') {
      $battle?.create();
    } else if (['eq', 'ab', 'it', 'se'].includes(_query.ss)) {
      location.href = location.href;
    }
  },
  set_value: function (name, value) {
    const json = $persona.json;
    if (name) {
      json[json.pset][json.eset][name] = value;
    }
    $config.set('persona', json);
  },
  get_value: function (name) {
    const json = $persona.json;
    return json[json.pset][json.eset][name];
  },
  save_equipset: function (doc) {
    const equipset = $qsa('.eqb', doc).map((d) => {
      const eq = $equip.parse.div(d.children[1]);
      const slot = d.children[0].textContent;
      if (eq.info) {
        const { category, name, customname, eid, key } = eq.info;
        return { slot, category, name, customname, eid, key };
      } else {
        return { slot };
      }
    });
    $config.set('equipset', equipset);
  },
  check_warning: function (doc) {
    _top.node.message?.remove();
    _top.node.div.classList.remove('hvut-top-warn');
    _top.node.persona.firstElementChild.style.color = '';
    _player.warn = $qsa('#stamina_restore .fcr', doc).map((d) => d.textContent.trim()); // Repair weapon, Repair armor, Check equipment, Check attributes
    if (_player.warn.length) {
      if (_query.s === 'Battle') {
        _top.node.message = _top.node.message || $element('div', null, ['.hvut-top-message']);
        _top.node.message.textContent = '[WARNING] ' + _player.warn.join(', ');
        _top.node.div.appendChild(_top.node.message);
      }
      _top.node.div.classList.add('hvut-top-warn');
      _top.node.persona.firstElementChild.style.color = '#e00';
    }
    _top.node.stamina.firstElementChild.style.color = '';
    if (_player.condition.includes('Stamina: Exhausted') || _player.accuracy || _player.stamina <= $config.settings.warnLowStamina) {
      _top.node.div.classList.add('hvut-top-warn');
      _top.node.stamina.firstElementChild.style.color = '#e00';
    } else if (_player.condition.includes('Stamina: Great')) {
      _top.node.stamina.firstElementChild.style.color = '#03c';
    }
  },
  parse_stats_pane: function (doc) {
    const stats_pane = {};
    $qsa('#stats_pane .st1 > div:nth-child(2n), #stats_pane .st2 > div:nth-child(2n)', doc).forEach((div) => {
      const type = div.parentNode.previousElementSibling.textContent;
      const number = parseFloat(div.previousElementSibling.textContent);
      let text = div.textContent.trim();
      if (text.startsWith('% ')) {
        text = text.slice(2);
      }
      if (text === 'hit chance') {
        const p = type === 'Physical Attack' ? 'Attack' : type === 'Magical Attack' ? 'Magic' : '';
        text = `${p} hit chance`; // equipment: Attack Accuracy, Magic Accuracy
      } else if (/crit chance \/ \+([0-9.]+) % damage/.test(text)) {
        const p = type === 'Physical Attack' ? 'Attack' : type === 'Magical Attack' ? 'Magic' : '';
        text = `${p} crit chance`;
        stats_pane[`${p} Crit Damage`] = parseFloat(RegExp.$1); // equipment: Attack Crit Damage, Spell Crit Damage
      }
      text = text.replace(/\b[a-z]/g, (s) => s.toUpperCase());
      if ($equip.reg.magic.test(text)) {
        text += type === 'Specific Mitigation' ? ' MIT' : ' EDB';
      }
      stats_pane[text] = number;
    });

    const fighting_style = /(Unarmed|One-Handed|Two-Handed|Dualwield|Niten Ichiryu|Staff)/.exec($qs('.spn', doc).textContent)[1];
    const spell_type = ['Fire', 'Cold', 'Elec', 'Wind', 'Holy', 'Dark'].sort((a, b) => stats_pane[b + ' EDB'] - stats_pane[a + ' EDB'])[0];
    const spell_damage = stats_pane[spell_type + ' EDB'];
    const prof_factor = Math.max(0, Math.min(1, stats_pane[{ 'Holy': 'Divine', 'Dark': 'Forbidden' }[spell_type] || 'Elemental'] / _player.level - 1));
    const ch_style = { level: _player.level, difficulty: _player.difficulty };
    stats_pane['Fighting Style'] = fighting_style;
    ch_style['Fighting Style'] = fighting_style;
    if (fighting_style === 'Staff' || spell_damage >= 80) {
      stats_pane['Spell Type'] = spell_type;
      stats_pane['Proficiency Factor'] = prof_factor;
      ch_style['Spell Type'] = spell_type;
      ch_style['Proficiency Factor'] = Math.round(prof_factor * 1000) / 1000;
    } else {
      ch_style['Attack Base Damage'] = stats_pane['Attack Base Damage'];
    }
    $config.set('ch_style', ch_style);
    return stats_pane;
  },
  init: function () {
    if ($id('persona_form')) {
      if (!$persona.check_p()) {
        $persona.change_e();
      } else {
        $persona.set_button();
      }
    } else if (!$persona.json.pset || !$persona.json.eset) {
      $persona.change_p();
    } else {
      $persona.set_button();
    }
    $persona.check_warning();
  },

};

$persona.div.addEventListener('mouseenter', $persona.create);
$persona.init();

// BOTTOM MENU
GM_addStyle(/*css*/`
  #hvut-bottom { position: absolute; display: flex; top: 100%; left: -1px; width: 100%; border: 1px solid; font-size: 10pt; line-height: 20px; }
  #hvut-bottom:empty { display: none; }
  #hvut-bottom > div { margin: -1px 0 -1px -1px; border: 1px solid #5C0D11; padding: 0 10px; }
  #hvut-bottom > .hvut-spaceholder ~ div { margin: -1px -1px -1px 0; }
  #hvut-bottom > .hvut-spaceholder { margin: 0; border: 0; padding: 0; }
  #hvut-bottom a { color: inherit; }
  .hvut-bottom-warn { background-color: #5C0D11; color: #fff; }

  .hvut-lt-div > a { margin-right: 5px; }
  .hvut-lt-div > span { display: inline-block; width: 40px; }
  .hvut-lt-check { background-color: #fd9; }
`);

_bottom.node = {};
_bottom.node.div = $element('div', $id('csp'), ['#hvut-bottom']);

// CREDITS COUNTER
if ($config.settings.showCredits === 2) {
  _bottom.show_credits = async function () {
    _bottom.node.credits = $element('div', _bottom.node.div, '加载中…');
    if ($id('networth')) {
      _bottom.node.credits.textContent = $id('networth').textContent;
      $id('networth').remove();
    } else {
      const html = await $ajax.fetch('?s=Bazaar&ss=is');
      const doc = $doc(html);
      _bottom.node.credits.textContent = $id('networth', doc).textContent;
    }
  };

  _bottom.show_credits();
}

// EQUIPMENT COUNTER
if ($config.settings.showEquipSlots === 2 || $config.settings.showEquipSlots === 1 && _query.s === 'Battle') {
  _bottom.show_equip = async function () {
    _bottom.node.equip = $element('div', _bottom.node.div, '加载中…');
    const html = await $ajax.fetch('?s=Character&ss=in');
    const exec = />Equip Slots: (\d+)(?: \+ (\d+))? \/ (\d+)</.exec(html);
    const inventory = parseInt(exec[1]);
    const storage = parseInt(exec[2] || 0);
    const slots = parseInt(exec[3]);
    const free = slots - inventory - storage;
    _bottom.node.equip.textContent = `装备格: ${inventory} + ${storage} / ${slots}`;
    if (free < slots / 10) {
      _bottom.node.equip.classList.add('hvut-bottom-warn');
    } else if (free < slots / 2) {
      _bottom.node.equip.style.color = '#c00';
    }
  };

  _bottom.show_equip();
}

// TRAINING TIMER
if ($config.settings.trainingNotification) {
  _bottom.tr = {
    json: $config.get('tr_notif', {}, 'hvut_'),
    node: {},

    init: function () {
      const json = _bottom.tr.json;
      if (!json.current_name && !json.next_name && !json.error) {
        return;
      }
      _bottom.tr.node.div = $element('div', _bottom.node.div);
      _bottom.tr.node.link = $element('a', _bottom.tr.node.div, { href: '/?s=Character&ss=tr', textContent: 'Initializing...', style: 'margin-right: 5px;' });
      _bottom.tr.node.clock = $element('span', _bottom.tr.node.div, ['!display: inline-block; width: 60px;']);
      if (json.error) {
        _bottom.tr.node.link.textContent = json.error;
      } else if (json.current_name) {
        _bottom.tr.node.link.textContent = `${json.current_name} [${json.current_level + 1}]`;
      }
      _bottom.tr.clock();
    },
    clock: function () {
      const json = _bottom.tr.json;
      const remain = json.current_end - Date.now();
      if (remain > 0) {
        _bottom.tr.node.clock.textContent = time_format(remain);
        setTimeout(_bottom.tr.clock, 1000);
      } else {
        _bottom.tr.node.link.textContent = '加载中…';
        _bottom.tr.node.clock.textContent = '';
        _bottom.tr.load();
      }
    },
    load: async function (post) {
      const html = await $ajax.fetch('/?s=Character&ss=tr', post);
      const doc = $doc(html);
      if (!$id('train_outer', doc)) {
        _bottom.tr.node.link.textContent = '等待中…';
        setTimeout(_bottom.tr.clock, 60000);
        return;
      }
      const json = _bottom.tr.json;
      const level = {};
      Array.from($id('train_table', doc).rows).slice(1).forEach((tr) => {
        level[tr.cells[0].textContent] = parseInt(tr.cells[4].textContent);
      });
      json.error = '';
      if ($id('train_progress', doc)) {
        json.current_name = $id('train_progcnt', doc).previousElementSibling.textContent;
        json.current_level = level[json.current_name];
        json.current_end = /var end_time = (\d+);/.exec(html)[1] * 1000;
        _bottom.tr.node.link.textContent = `${json.current_name} [${json.current_level + 1}]`;
        _bottom.tr.clock();
      } else if (json.next_name) {
        const error = get_message(doc);
        if (error) {
          json.error = error;
          _bottom.tr.node.link.textContent = json.error;
          setTimeout(_bottom.tr.clock, 60000);
        } else if (level[json.next_name] < json.next_level) {
          if ($qs(`img[onclick*="training.start_training(${json.next_id})"]`, doc)) {
            _bottom.tr.load('start_train=' + json.next_id);
          } else {
            json.error = "Can't start Training";
            _bottom.tr.node.link.textContent = json.error;
            setTimeout(_bottom.tr.clock, 60000);
          }
        } else {
          _bottom.tr.node.link.textContent = '训练完成!';
        }
      } else {
        _bottom.tr.node.link.textContent = '训练完成!';
      }
      $config.set('tr_notif', json, 'hvut_');
    },
  };

  _bottom.tr.init();
}

// LOTTERY
if ($config.settings.lotteryNotification) {
  _bottom.show_lottery = function (ss) {
    const json = $config.get('lt_notif', { lt: {}, la: {} }, 'hvut_');
    const lottery = json[ss];
    const now = Date.now();
    if (lottery.date > now && lottery.hide) {
      return;
    }
    _bottom.node[ss] = {};
    _bottom.node[ss].div = $element('div', _bottom.node.div, ['.hvut-lt-div']);
    _bottom.node[ss].equip = $element('a', _bottom.node[ss].div, { textContent: 'Loading...', href: '/?s=Bazaar&ss=' + ss, target: !$config.isekai ? '_self' : '_blank' });
    _bottom.node[ss].time = $element('span', _bottom.node[ss].div, '--:--');

    if (lottery.date > now) {
      if (lottery.date - now < 3600000) {
        _bottom.node[ss].div.classList.add('hvut-bottom-warn');
      } else if (lottery.check) {
        _bottom.node[ss].div.classList.add('hvut-lt-check');
      }
      _bottom.node[ss].equip.textContent = $config.settings.translateNames ? $equip.$i18n.equipName(lottery.equip) : lottery.equip;
      _bottom.node[ss].time.textContent = time_format(lottery.date - now, 1);
      return;
    }
    _bottom.node[ss].div.classList.add('hvut-bottom-warn');
    _bottom.load_lottery(ss);
  };

  _bottom.load_lottery = async function (ss) {
    const html = await $ajax.fetch('/?s=Bazaar&ss=' + ss);
    const doc = $doc(html);
    const eqname = $id('lottery_eqname', doc);
    if (!eqname) {
      _bottom.node[ss].equip.textContent = '加载失败';
      return;
    }
    const text = $id('rightpane', doc).lastElementChild.textContent;
    const json = $config.get('lt_notif', { lt: {}, la: {} }, 'hvut_');
    const lottery = json[ss];
    const now = Date.now();
    let date = Date.now();
    let margin = 0;
    if (/Today's drawing is in (?:(\d+) hours?)?(?: and )?(?:(\d+) minutes?)?/.test(text)) {
      date += (60 * parseInt(RegExp.$1 || 0) + parseInt(RegExp.$2 || 0)) * 60000;
      margin = 2;
    } else if (text.includes("Today's ticket sale is closed")) {
      margin = 10;
    } else {
      throw new Error('Parsing Error');
    }
    const mm = (new Date(date)).getUTCMinutes();
    if (date && (mm < 1 || 60 - mm <= margin)) {
      date = Math.round(date / 3600000) * 3600000;
    }
    lottery.id = parseInt(/lottery=(\d+)/.exec($qs('img[src*="lottery_prev_a.png"]', doc)?.getAttribute('onclick'))[1] || 0) + 1;
    lottery.equip = eqname.textContent;
    lottery.date = date;
    lottery.check = $equip.filter($config.settings.lotteryFilters, lottery.equip);
    lottery.hide = !$config.settings.lotteryNotification;
    $config.set('lt_notif', json, 'hvut_');
    if (lottery.check) {
      const date_text = eqname.previousElementSibling.textContent;
      popup(`<p>${date_text}</p><p style="color: #f00; font-weight: bold;">${$config.settings.translateNames ? $equip.$i18n.equipName(lottery.equip) : lottery.equip}</p>`);
    }

    _bottom.node[ss].equip.textContent = lottery.equip;
    _bottom.node[ss].time.textContent = time_format(lottery.date - now, 1);
  };

  $element('div', _bottom.node.div, ['.hvut-spaceholder']);

  _bottom.show_lottery('lt');
  _bottom.show_lottery('la');
}


//* [1] Character - Character
if (_query.s === 'Character' && _query.ss === 'ch' || $id('persona_outer')) {
  _ch.persona = $id('persona_form').elements.persona_set.value;
  _ch.exp_table = [null, { total: 0 }];

  _ch.get_exp = function (level) {
    const num = parseInt(level);
    const dec = level % 1;
    if (!_ch.exp_table[num]) {
      _ch.exp_table[num] = { total: Math.round(Math.pow(num + 3, Math.pow(2.850263212287058, 1 + num / 1000))) };
    }
    let exp = _ch.exp_table[num].total;
    if (dec) {
      if (!_ch.exp_table[num].next) {
        _ch.exp_table[num].next = _ch.get_exp(num + 1) - exp;
      }
      exp += Math.round(_ch.exp_table[num].next * dec);
    }
    return exp;
  };

  _ch.get_level = function (exp, level) {
    level = parseInt(level) || 1;
    while (exp >= _ch.exp_table[level].total) {
      level++;
      if (!_ch.exp_table[level]) {
        _ch.exp_table[level] = { total: _ch.get_exp(level) };
      }
    }
    level--;
    if (!_ch.exp_table[level].next) {
      _ch.exp_table[level].next = _ch.exp_table[level + 1].total - _ch.exp_table[level].total;
    }
    return level + (exp - _ch.exp_table[level].total) / _ch.exp_table[level].next;
  };

  _ch.exp = {

    total: _window.total_exp,
    prof: {},

    init: function () {
      _ch.node.div.innerHTML = '';
      $qs('img[onclick*="do_attr_post"]').style.visibility = 'hidden';
      $id('prof_outer').classList.add('hvut-ch-prof');

      $qsa('#prof_outer tr').forEach((tr) => {
        const p = { tr: tr };
        const name = tr.cells[0].textContent;
        _ch.exp.prof[name] = p;
        p.current = parseFloat(tr.cells[1].textContent);
        p.exp = _ch.get_exp(p.current);
        tr.cells[1].textContent = p.current;
        $element('td', tr);
        $element('td', tr);
      });
      _ch.node.level = $input(['number', 'Level', 'before'], _ch.node.div, { value: _player.level, min: 1, max: 600, style: 'width: 50px;' });
      const ass = $config.get('tr_level', {})['Assimilator'] || 0;
      _ch.node.ass = $input(['number', 'Training: Assimilator', 'before'], _ch.node.div, { value: ass, min: 0, max: 25, style: 'width: 30px;' });
      _ch.exp.calc();
    },

    calc: function () {
      const level = parseFloat(_ch.node.level.value);
      const ass = parseInt(_ch.node.ass.value);
      if (isNaN(level) || level < 1 || level > 600 || isNaN(ass) || ass < 0 || ass > 25) {
        return;
      }

      _window.total_exp = _ch.get_exp(level);
      _window.update_usable_exp();
      _window.update_display('str');

      const exp_gain = _window.total_exp - _ch.exp.total;
      const prof_gain = Math.max(0, exp_gain * 4 * (1 + ass * 0.1));
      Object.values(_ch.exp.prof).forEach((p) => {
        p.level = _ch.get_level(p.exp + prof_gain, p.current);
        p.tr.cells[2].textContent = '+' + (p.level - p.current).toFixed(3);
        p.tr.cells[3].textContent = p.level.toFixed(3);
      });
    },

  };

  GM_addStyle(/*css*/`
    #attr_table tr:last-child > td { padding-top: 10px !important; }
    .hvut-ch-div { position: absolute; margin: -25px 0 0 40px; font-size: 10pt; line-height: 22px; text-align: left; }
    .hvut-ch-div label { margin: 0 5px; }
    .hvut-ch-div label > input { text-align: right; }
    .hvut-ch-prof { width: 640px !important; font-size: 10pt; }
    .hvut-ch-prof > div { width: 310px !important; margin: 0 5px; }
    .hvut-ch-prof td:nth-child(1) { width: 105px !important; }
    .hvut-ch-prof td:nth-child(2) { width: 60px !important; }
    .hvut-ch-prof td:nth-child(3) { width: 65px; color: #c00; }
    .hvut-ch-prof td:nth-child(4) { width: 60px; font-weight: bold; }
  `);

  _ch.node = {};
  _ch.node.div = $element('div', $id('attr_outer'), ['.hvut-ch-div'], { input: () => { _ch.exp.calc(); } });
  $input(['button', 'EXP 模拟器'], _ch.node.div, null, () => { _ch.exp.init(); });

  $persona.parse_stats_pane();
} else
// [END 1] Character - Character */


//* [2] Character - Equipment
if (_query.s === 'Character' && _query.ss === 'eq') {
  _eq.mage_stats = function () {
  // to get exact numbers
    const stats_pane = _eq.stats_pane;
    const stats_equip = $equip.parse.equiplist(_eq.equiplist);

    const spell_type = stats_pane['Spell Type'];
    if (!spell_type) {
      return;
    }
    const prof_factor = stats_pane['Proficiency Factor'];
    const edb_infusion = $persona.get_value('infusion') ? 0.25 : 0;
    const edb = stats_pane[spell_type + ' EDB'] / 100 + edb_infusion;
    const magic_damage = stats_pane['Magic Base Damage'];
    const magic_crit_chance = stats_pane['Magic Crit Chance'] / 100;
    const magic_crit_damage = 0.5 + (stats_equip['Spell Crit Damage'] || 0) / 100; // stats_equip['Spell Crit Damage'] is more accurate than stats_pane['Magic Crit Damage']
    const magic_score = magic_damage * (1 + edb) * (1 + magic_crit_chance * magic_crit_damage);
    const arcane_crit_chance = 1 - (1 - magic_crit_chance) * (1 - 0.1);
    const arcane_crit_damage = magic_crit_damage + (_player.level >= 405 ? 0.15 : _player.level >= 365 ? 0.14 : _player.level >= 325 ? 0.12 : _player.level >= 285 ? 0.10 : _player.level >= 245 ? 0.08 : _player.level >= 205 ? 0.06 : _player.level >= 175 ? 0.03 : 0);
    const arcane_score = magic_damage * 1.25 * (1 + edb) * (1 + arcane_crit_chance * arcane_crit_damage);

    const cr_staff = stats_equip['Counter-Resist'] || 0;
    const cr_spell = prof_factor / 2 + cr_staff / 100;
    const prof_dep = Math.max(0, Math.min(1, stats_pane['Deprecating'] / _player.level - 1));
    const cr_dep = prof_dep / 2 + cr_staff / 100;
    const prof_sup = Math.min(1, stats_pane['Supportive'] / _player.level - 1);
    const cure_bonus = prof_sup / (prof_sup > 0 ? 2 : 5);
    const mit_imperil = !$persona.get_value('imperil') ? 0 : (spell_type === 'Holy' || spell_type === 'Dark') ? 0.25 : 0.4;
    const mit_reduce = Math.pow(prof_factor, 1.5) * 0.5 + mit_imperil;
    const mit_day = $persona.get_value('daybonus') ? 0.1 : 0;
    const resist_dfct = _player.difficulty === 'PFUDOR' ? 0.1 : 0;
    const mitigations = [0, 0.5, 0.62, 0.75];

    if (!_eq.node.mage) {
      _eq.node.mage = $element('div', $id('eqch_left'), ['.hvut-eq-mage']);
    }
    _eq.node.mage.innerHTML = '';
    const div = $element('div', _eq.node.mage, ['.hvut-eq-chart'], (e) => { _eq.click_stats(e); });

    const options_div = $element('div', div, ['.hvut-eq-options']);
    $input(['checkbox', 'PFUDOR'], options_div, { dataset: { action: 'set' }, checked: resist_dfct });
    $input(['checkbox', '注灵'], options_div, { dataset: { action: 'set', name: 'infusion', value: 'this' }, checked: edb_infusion });
    $input(['checkbox', '易伤'], options_div, { dataset: { action: 'set', name: 'imperil', value: 'this' }, checked: mit_imperil });
    $input(['checkbox', '星期加成'], options_div, { dataset: { action: 'set', name: 'daybonus', value: 'this' }, checked: mit_day });

    ul = $element('ul', div, ['.hvut-eq-stats']);
    $element('li', ul, '法师属性');
    $element('li', ul, [`/<span>${Math.round(magic_score).toLocaleString()}</span><span>法术评分</span>`]);
    $element('li', ul, [`/<span>${Math.round(arcane_score).toLocaleString()}</span><span>奥术评分</span>`]);
    $element('li', ul, [`/<span>${(prof_factor).toFixed(3)}</span><span>熟练度系数</span>`]);
    $element('li', ul, [`/<span>${(mit_reduce * 100).toFixed(2)}%</span><span>减伤削减</span>`]);
    $element('li', ul, [`/<span>${(cr_staff).toFixed(2)}%</span><span>Base Counter-Resist</span>`]);
    $element('li', ul, [`/<span>${(cr_spell * 100).toFixed(2)}%</span><span>${spell_type} C-R</span>`]);
    $element('li', ul, [`/<span>${(cr_dep * 100).toFixed(2)}%</span><span>Deprecating C-R</span>`]);
    $element('li', ul, [`/<span>${(cure_bonus * 100).toFixed(2)}%</span><span>治疗加成</span>`]);

    ul = $element('ul', div, ['.hvut-eq-monster']);
    $element('li', ul, '怪物抗性');
    $element('li', ul, '基础抗性');
    $element('li', ul, '减益抗性');
    $element('li', ul, `${spell_type} Resist`);
    $element('li', ul, '伤害减免');
    mitigations.forEach((mit) => { $element('li', ul, `减伤 ${mit * 100}%`); });

    [{ n: 'Schoolgirl', s: 10, t: 0 }, { n: 'Average', s: 8.5, t: 5 }, { n: 'Maximum', s: 10, t: 10 }].forEach((r) => {
      const rb = 1 - (1 - r.s / 100) * (1 - r.t / 100) * (1 - resist_dfct); // base resist
      const rs = rb * (1 - cr_spell); // spell resist
      /* damage resist
        = Math.pow(rs, 1) * Math.pow(1 - rs, 2) * C(3, 1) * 0.5
        + Math.pow(rs, 2) * Math.pow(1 - rs, 1) * C(3, 2) * 0.75
        + Math.pow(rs, 3) * 1 * 0.9;
      */
      const rd = 0.15 * rs * rs * rs - 0.75 * rs * rs + 1.5 * rs;
      const r_dep = rb * (1 - cr_dep);

      const ul = $element('ul', div, ['.hvut-eq-damage']);
      $element('li', ul, r.n);
      $element('li', ul, (rb * 100).toFixed(2) + '%');
      $element('li', ul, (r_dep * 100).toFixed(2) + '%');
      $element('li', ul, (rs * 100).toFixed(2) + '%');
      $element('li', ul, (rd * 100).toFixed(2) + '%');

      mitigations.forEach((mit) => {
        mit -= mit_day;
        mit = mit < 0 ? mit : mit < mit_reduce ? 0 : mit - mit_reduce;
        const damage = arcane_score * (1 - rd) * (1 - mit);
        $element('li', ul, Math.round(damage).toLocaleString());
      });
    });
  };

  _eq.click_stats = function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) {
      return;
    }
    const { action, name, value } = target.dataset;
    if (action === 'set') {
      if (value === 'this') {
        $persona.set_value(name, target.checked);
      }
      _eq.mage_stats();
    }
  };

  _eq.show_base = async function () {
    const html = await $ajax.fetch('?s=Character&ss=ch');
    const doc = $doc(html);
    const base = {};
    $qsa('#attr_table tr:nth-last-child(n+2), #prof_outer tr', doc).forEach((tr) => {
      base[tr.children[0].textContent.toLowerCase()] = tr.children[1].textContent;
    });
    const stats = ['strength', 'dexterity', 'agility', 'endurance', 'intelligence', 'wisdom', 'elemental', 'divine', 'forbidden', 'deprecating', 'supportive'];
    $qsa('.st2:nth-last-child(-n+3) .fal > div').forEach((d) => {
      const s = d.textContent.trim();
      if (stats.includes(s)) {
        d.innerHTML = `&nbsp;[${Math.round(base[s])}]${d.textContent}`;
      }
    });
  };

  _eq.equip_code = function () {
    const code = _eq.equiplist.map((eq) => `[url=${location.origin}${location.pathname}equip/${eq.info.eid}/${eq.info.key}]${eq.info.name}[/url]`);
    popup_text(code, 900, 150);
  };

  _eq.equip_popups = function () {
    if (_eq.node.popups) {
      _eq.node.popups.classList.toggle('hvut-none');
      return;
    }
    _eq.node.popups = $element('div', document.body, ['.hvut-eq-popups', (_eq.equiplist.length > 6 ? '!width: 1500px;' : '')]);
    _eq.equiplist.forEach((eq) => { $element('iframe', _eq.node.popups, { src: `equip/${eq.info.eid}/${eq.info.key}`, scrolling: 'no' }); });
  };

  _eq.prof = {
    node: {},
    list: [],
    equips: {
      'Oak Staff': { base: 6.45, pxp: 371 },
      'Willow Staff': { base: 6.14, pxp: 371 },
      'Redwood Staff': { base: 8.29, pxp: 371 },
      'Redwood Staff of the Elementalist': { base: 16.24, pxp: 371 },
      'Katalox Staff': { base: 8.28, pxp: 368 },
      'Katalox Staff of the Heaven-sent/Demon-fiend': { base: 16.24, pxp: 368 },
      'Cotton Cap': { base: 8.29, pxp: 377 },
      'Cotton Robe': { base: 9.89, pxp: 377 },
      'Cotton Gloves': { base: 7.5, pxp: 377 },
      'Cotton Pants': { base: 9.09, pxp: 377 },
      'Cotton Shoes': { base: 6.7, pxp: 377 },
    },
    click: function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, key } = target.dataset;
      if (action === 'close') {
        _eq.prof.toggle();
      } else if (action === 'add') {
        _eq.prof.add();
      } else if (action === 'load') {
        _eq.prof.load(key);
      } else if (action === 'name') {
        _eq.prof.name(key);
      } else if (action === 'save') {
        _eq.prof.save(key);
      } else if (action === 'delete') {
        _eq.prof.delete(key);
      }
      const { equip, value } = target.dataset;
      if (action === 'max') {
        _eq.prof.set_max(equip, value);
      } else if (action === 'factor') {
        _eq.prof.set_factor(value);
      }
    },
    init: function () {
      if (_eq.prof.inited) {
        return;
      }
      _eq.prof.inited = true;
      _eq.prof.current = null;
      _eq.prof.list = $config.get('eq_prof', []).map((json, i) => {
        const data = {
          key: i + 1,
          json,
          values: JSON.parse(JSON.stringify(json)),
          node: {},
        };
        return data;
      });

      const node = _eq.prof.node;
      node.div = $element('div', $id('eqch_left'), ['.hvut-eq-prof'], { click: (e) => { _eq.prof.click(e); }, input: (e) => { _eq.prof.change(e); } });
      node.side = $element('div', node.div, ['.hvut-side hvut-eq-side']);
      $input(['button', '关闭'], node.side, { dataset: { action: 'close' } });
      $input(['button', '新建'], node.side, { dataset: { action: 'add' }, className: 'hvut-side-margin' });

      const p = $element('p', node.div);
      node.name = $element('span', p);
      $input(['button', '改名'], p, { dataset: { action: 'name' } });
      $input(['button', '保存'], p, { dataset: { action: 'save' } });
      $input(['button', '删除'], p, { dataset: { action: 'delete' } });

      const summary = $element('ul', node.div, ['.hvut-eq-summary']);
      node.proficiency = $element('li', summary, ['/<span>总熟练度</span><span></span>']).lastChild;
      node.prof_factor = $element('li', summary, ['/<span>熟练度系数</span><span></span>']).lastChild;
      node.mit_reduction = $element('li', summary, ['/<span>减伤削减</span><span></span>']).lastChild;
      node.counter_resist = $element('li', summary, ['/<span>Counter-Resist</span><span></span>']).lastChild;

      $element('p', node.div, '角色');
      const char = $element('ul', node.div, ['.hvut-eq-char', { dataset: { action: 'char' } }]);
      let li;
      li = $element('li', char, ['/<span>等级</span>']);
      node.level = $input('number', li, { min: 0, max: 500, step: 1, required: true });
      li = $element('li', char, ['/<span>基础熟练度</span>']);
      node.base = $input('number', li, { min: 0, step: 0.1 });
      node.base_factor = $element('span', li);
      $input(['button', 'x1.0'], li, { dataset: { action: 'factor', value: '1.0 ' } });
      $input(['button', 'x1.1'], li, { dataset: { action: 'factor', value: '1.1 ' } });
      $input(['button', 'x1.2'], li, { dataset: { action: 'factor', value: '1.2 ' } });
      li = $element('li', char);
      node.hathperk = $input(['checkbox', 'Hath 特权'], $element('span', li));
      node.hath_bonus = $input('number', li, { step: 0.001, readOnly: true });

      $element('p', node.div, '装备');
      const equip = $element('table', node.div, ['.hvut-eq-equip']);
      $element('tr', equip, ['/<td></td><td>类型</td><td>灵魂绑定</td><td>等级</td><td>pxp</td><td>max</td><td>base</td><td>max</td><td>升级</td><td>缩放</td>']);

      node.equips = ['Willow Staff', 'Cotton Cap', 'Cotton Robe', 'Cotton Gloves', 'Cotton Pants', 'Cotton Shoes'].map((e, i) => {
        const eqnode = {};
        const eq = _eq.prof.equips[e];
        const tr = $element('tr', equip, [{ dataset: { action: 'equip', equip: i } }, '/<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>']);

        if (i === 0) {
          eqnode.type = $input(['select', ['Oak Staff', 'Willow Staff', 'Redwood Staff', 'Redwood Staff of the Elementalist', 'Katalox Staff', 'Katalox Staff of the Heaven-sent/Demon-fiend']], tr.children[1], { dataset: { action: 'staff' } });
        } else {
          tr.children[1].textContent = e;
        }

        eqnode.check = $input('checkbox', tr.children[0]);
        eqnode.soulbound = $input('checkbox', tr.children[2]);
        eqnode.level = $input('number', tr.children[3], { min: 1, max: 500, step: 1, required: true });
        eqnode.pxp = $input('number', tr.children[4], { min: 200, max: eq.pxp, step: 1, required: true });
        eqnode.pxpmax = $element('span', tr.children[5], [eq.pxp, { dataset: { action: 'max', equip: i, value: 'pxp' } }]);
        eqnode.base = $input('number', tr.children[6], { min: 1, max: eq.base, step: 0.01, required: true });
        eqnode.pmax = $element('span', tr.children[7], [eq.base, { dataset: { action: 'max', equip: i, value: 'base' } }]);
        eqnode.upgrade = $input('number', tr.children[8], { min: 0, max: 50, step: 1 });
        eqnode.scaled = tr.children[9];
        return eqnode;
      });

      _eq.prof.list.forEach((data) => {
        _eq.prof.add_button(data);
      });
      _eq.prof.load();
    },
    load: function (key) {
      if (!_eq.prof.list.length) {
        _eq.prof.add();
        return;
      }
      if (!key) {
        key = _eq.prof.list[0].key;
      }
      if (!Number.isInteger(key)) {
        key = parseInt(key);
      }
      if (key === _eq.prof.current) {
        return;
      }
      const prev = _eq.prof.get();
      if (prev) {
        prev.node.button.classList.remove('hvut-eq-current');
      }
      _eq.prof.current = key;

      const data = _eq.prof.get(key);
      data.node.button.classList.add('hvut-eq-current');
      const node = _eq.prof.node;
      node.name.textContent = data.values.name;

      node.level.value = data.values.level || '';
      node.base.value = data.values.base || '';
      node.hathperk.checked = data.values.hathperk;
      _eq.prof.change_char();

      node.equips[0].type.value = data.values.equips[0].type;
      _eq.prof.change_staff();

      node.equips.forEach((eqnode, i) => {
        const eq = data.values.equips[i];
        eqnode.check.checked = eq.check;
        eqnode.soulbound.checked = eq.soulbound;
        eqnode.level.value = eq.level || '';
        eqnode.pxp.value = eq.pxp || '';
        eqnode.base.value = eq.base || '';
        eqnode.upgrade.value = eq.upgrade || '';
        _eq.prof.change_equip(i);
      });
      //_eq.prof.calc();
    },
    get: function (key = _eq.prof.current) {
      return _eq.prof.list.find((data) => data.key == key);
    },
    add: function () {
      let key = 1;
      while (_eq.prof.get(key)) {
        key++;
      }
      const json = {
        name: `Noname${key}`,
        level: _player.level,
        base: _player.level,
        hathperk: true,
        equips: ['Willow Staff', 'Cotton Cap', 'Cotton Robe', 'Cotton Gloves', 'Cotton Pants', 'Cotton Shoes'].map((e) => {
          const eq = { ..._eq.prof.equips[e] };
          eq.type = e;
          eq.check = false;
          eq.soulbound = false;
          eq.level = _player.level;
          eq.pxp = Math.round(eq.pxp * 0.95);
          eq.base = Math.round(eq.base * 0.95 * 100) / 100;
          eq.upgrade = 0;
          return eq;
        }),
      };
      const data = {
        new: true,
        key,
        json,
        values: JSON.parse(JSON.stringify(json)),
        node: {},
      };
      _eq.prof.list.push(data);
      _eq.prof.add_button(data);
      _eq.prof.load(data.key);
    },
    add_button: function (data) {
      data.node.button = $input(['button', data.values.name], _eq.prof.node.side, { dataset: { action: 'load', key: data.key } });
      if (data.new) {
        data.node.button.classList.add('hvut-eq-new');
      }
    },
    change: function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, equip } = target.dataset;
      if (action === 'char') {
        _eq.prof.change_char();
      } else if (action === 'equip') {
        _eq.prof.change_equip(equip);
      } else if (action === 'staff') {
        _eq.prof.change_staff();
      }
    },
    change_char: function () {
      const data = _eq.prof.get();
      const values = data.values;
      const node = _eq.prof.node;
      const prev_level = values.level;
      ['level', 'base', 'hathperk'].forEach((e) => {
        if (node[e].type === 'number') {
          values[e] = parseFloat(node[e].value) || 0;
        } else if (node[e].type === 'checkbox') {
          values[e] = node[e].checked;
        } else {
          values[e] = node[e].value;
        }
      });

      if (values.level !== prev_level) {
        node.base.max = values.level * 10 * 1.2 / 10;
        node.equips.forEach((eqnode, i) => {
          const eq = values.equips[i];
          eqnode.level.max = values.level;
          if (eq.soulbound) {
            _eq.prof.change_equip(i);
          }
        });
      }
      node.base_factor.textContent = ' = Level * ' + (values.base / values.level).toFixed(3);
      node.hath_bonus.value = values.hathperk ? (values.base * 0.1).toFixed(2) : 0;

      _eq.prof.calc();
    },
    change_equip: function (n) {
      const data = _eq.prof.get();
      const values = data.values;
      const eq = values.equips[n];
      const eqnode = _eq.prof.node.equips[n];
      ['check', 'soulbound', 'level', 'pxp', 'base', 'upgrade'].forEach((e) => {
        if (eqnode[e].type === 'number') {
          eq[e] = parseFloat(eqnode[e].value) || 0;
        } else if (eqnode[e].type === 'checkbox') {
          eq[e] = eqnode[e].checked;
        } else {
          eq[e] = eqnode[e].value;
        }
      });

      eqnode.level.disabled = eq.soulbound;
      if (eq.soulbound) {
        eq.level = values.level;
        eqnode.level.value = eq.level;
      }
      eq.scaled = $equip.forge('Elemental', eq.base, eq.upgrade, eq.pxp, eq.level);
      eqnode.scaled.textContent = eq.scaled.toFixed(2);

      _eq.prof.calc();
    },
    change_staff: function () {
      const eqnode = _eq.prof.node.equips[0];
      const equips = _eq.prof.equips[eqnode.type.value];
      eqnode.pxp.max = equips.pxp;
      eqnode.pxpmax.textContent = equips.pxp;
      eqnode.base.max = equips.base;
      eqnode.pmax.textContent = equips.base;
    },
    set_max: function (n, stat) {
      const eqnode = _eq.prof.node.equips[n];
      eqnode[stat].value = eqnode[stat].max;
      _eq.prof.change_equip(n);
    },
    set_factor: function (value) {
      const data = _eq.prof.get();
      const values = data.values;
      _eq.prof.node.base.value = (values.level * value).toFixed(1);
      _eq.prof.change_char();
    },
    calc: function () {
      const data = _eq.prof.get();
      const values = data.values;
      const node = _eq.prof.node;

      values.proficiency = values.base;
      if (values.hathperk) {
        values.proficiency += values.base * 0.1;
      }
      values.equips.forEach((eq) => {
        if (eq.check) {
          values.proficiency += eq.scaled;
        }
      });
      values.prof_factor = Math.max(0, Math.min(1, values.proficiency / values.level - 1));
      values.mit_reduction = Math.pow(values.prof_factor, 1.5) / 2;
      values.counter_resist = values.prof_factor / 2;

      node.proficiency.textContent = values.proficiency.toFixed(3);
      node.prof_factor.textContent = values.prof_factor.toFixed(3);
      node.mit_reduction.textContent = (values.mit_reduction * 100).toFixed(2) + '%';
      node.counter_resist.textContent = (values.counter_resist * 100).toFixed(2) + '%';
    },
    save: function (key = _eq.prof.current) {
      const data = _eq.prof.get(key);
      if (data.new) {
        data.node.button.classList.remove('hvut-eq-new');
        data.new = false;
      }
      data.json = JSON.parse(JSON.stringify(data.values));
      const json = _eq.prof.list.filter((data) => !data.new).map((data) => data.json);
      $config.set('eq_prof', json);
    },
    name: function (key = _eq.prof.current) {
      const data = _eq.prof.get(key);
      const name = prompt('Enter the name of the settings', data.values.name)?.trim();
      if (!name) {
        return;
      }
      data.values.name = name;
      data.node.button.value = name;
      _eq.prof.node.name.textContent = name;
    },
    delete: function (key = _eq.prof.current) {
      const data = _eq.prof.get(key);
      data.node.button.remove();
      const index = _eq.prof.list.findIndex((data) => data.key === key);
      _eq.prof.list.splice(index, 1);
      if (key == _eq.prof.current) {
        _eq.prof.current = null;
      }
      const json = _eq.prof.list.filter((data) => !data.new).map((data) => data.json);
      $config.set('eq_prof', json);
      _eq.prof.load();
    },
    toggle: function () {
      _eq.prof.node.div?.classList.toggle('hvut-none');
      _eq.prof.init();
    },
  };

  _eq.node = {};

  if (_query.equip_slot) {
    GM_addStyle(/*css*/`
      #eqch_left .eqb { padding: 0; height: auto; font-size: 10pt; line-height: 20px; text-align: center; overflow: hidden; }
      #eqch_left .eqb > div:last-child { padding: 1px 0; position: relative; }
    `);

    $equip.list($qs('#equip_pane .equiplist'));
  } else {
    GM_addStyle(/*css*/`
      #popup_box.hvut-eq-popupbox { margin-top: 15px; }
      #eqch_left { height: 654px; padding-top: 3px; }
      #eqsh { display: none; }
      #eqsl { margin-top: 15px; }
      #eqsb .eqb { padding: 0; height: auto; font-size: 10pt; line-height: 20px; text-align: center; overflow: hidden; }
      #eqsb .eqb > div:last-child { padding: 1px 0; position: relative; }

      .hvut-eq-buttons { display: flex; width: 650px; margin: 5px auto; text-align: left; }
      .hvut-eq-info { position: absolute; top: 0; right: 0; font-size: 9pt; }
      .hvut-eq-info > span { display: inline-block; margin: 0 3px; }
      .hvut-eq-info > span:nth-child(2) { width: 35px; }
      .hvut-eq-info > span:nth-child(3) { width: 35px; }
      .hvut-eq-untradeable { color: #c00; }
      .hvut-eq-cdt1 { color: #c00; }
      .hvut-eq-cdt2 { color: #fff; background-color: #c00; }

      .hvut-eq-mage { position: absolute; bottom: 0; left: 0; width: 100%; }
      .hvut-eq-chart { position: relative; display: flex; flex-wrap: wrap; justify-content: space-between; width: 620px; margin: 0 auto; padding: 10px 15px; overflow: hidden; border: 1px solid; font-size: 10pt; line-height: 20px; text-align: left; white-space: nowrap; }
      .hvut-eq-options { width: 100%; margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px solid; }
      .hvut-eq-options label { margin-right: 10px; }
      .hvut-eq-chart ul { list-style: none; margin: 0; padding: 0; }
      .hvut-eq-chart li { padding: 0 10px; border-bottom: 1px dotted transparent; }
      .hvut-eq-chart li:first-child { font-weight: bold; margin-bottom: 3px; border-bottom: 1px dotted; }
      .hvut-eq-chart span:first-child { display: inline-block; width: 50px; text-align: right; margin-right: 5px; }
      .hvut-eq-stats { width: 210px; }
      .hvut-eq-monster { width: 140px; text-align: right; }
      .hvut-eq-damage { width: 80px; text-align: right; }
      .hvut-eq-stats li:nth-child(3), .hvut-eq-stats li:nth-child(5), .hvut-eq-monster li:nth-child(5), .hvut-eq-damage li:nth-child(5) { border-bottom-color: currentColor; }

      .hvut-eq-prof { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: auto; padding-left: 120px; box-sizing: border-box; font-size: 10pt; text-align: left; background-color: #EDEBDF; }
      .hvut-eq-prof input[type='number'] { text-align: right; }
      .hvut-eq-prof input[type='checkbox'] { top: 3px; }
      .hvut-eq-prof input:invalid { color: #e00; }
      .hvut-eq-prof span { display: inline-block; }
      .hvut-eq-prof p { margin: 5px 0; font-weight: bold; white-space: nowrap; }
      .hvut-eq-prof p > span { min-width: 150px; }
      .hvut-eq-prof ul { margin: 5px 0 15px; padding: 0; max-width: 530px; list-style: none; }
      .hvut-eq-prof li { margin: 1px 0; height: 22px; line-height: 22px; }
      .hvut-eq-side { top: 0; left: 0; }
      .hvut-eq-current { color: #03c !important; border-color: #03c !important; }
      .hvut-eq-new { font-style: italic; }
      .hvut-eq-summary span:first-child { width: 150px; }
      .hvut-eq-summary span:last-child { width: 50px; font-weight: bold; text-align: right; }
      .hvut-eq-char li > *:nth-child(1) { width: 130px; }
      .hvut-eq-char li > *:nth-child(2) { width: 60px; }
      .hvut-eq-char li > *:nth-child(3) { margin: 0 10px; }
      .hvut-eq-equip { table-layout: fixed; width: 530px; line-height: 22px; }
      .hvut-eq-equip td { padding: 1px 5px; }
      .hvut-eq-equip input { width: 100%; margin: 0; box-sizing: border-box; }
      .hvut-eq-equip select { width: 100%; margin: 0; }
      .hvut-eq-equip tr:first-child { border: 1px solid; }
      .hvut-eq-equip td:nth-child(1) { width: 20px; }
      .hvut-eq-equip td:nth-child(3) { width: 20px; direction: rtl; }
      .hvut-eq-equip td:nth-child(4) { width: 40px; }
      .hvut-eq-equip td:nth-child(5) { width: 40px; }
      .hvut-eq-equip td:nth-child(6) { width: 25px; text-align: right; padding-right: 10px; }
      .hvut-eq-equip td:nth-child(7) { width: 50px; }
      .hvut-eq-equip td:nth-child(8) { width: 35px; text-align: right; padding-right: 10px; }
      .hvut-eq-equip td:nth-child(9) { width: 30px; }
      .hvut-eq-equip td:nth-child(10) { width: 50px; text-align: right; padding-right: 10px; }
      .hvut-eq-equip td > span { cursor: pointer; }

      .hvut-eq-popups { position: relative; width: 1238px; padding: 10px 0; line-height: 0; text-align: left; background-color: inherit; }
      .hvut-eq-popups iframe { width: 372px; height: 445px; border: 1px solid; margin: 0 -1px -1px 0; overflow: hidden; }
    `);

    $id('popup_box').classList.add('hvut-eq-popupbox');

    $persona.check_e();
    $persona.set_button();
    $persona.save_equipset();

    _eq.stats_pane = $persona.parse_stats_pane();
    _eq.show_base();
    _eq.equiplist = $equip.list($id('eqsb'), false);
    _eq.equiplist.forEach((eq) => {
      eq.node.div.textContent = eq.node.div.textContent;
      $element('div', eq.node.wrapper.firstElementChild, ['.hvut-eq-info']).append(
        $element('span', null, [(eq.info.soulbound ? '灵魂绑定' : 'Lv.' + eq.info.level), (eq.info.soulbound || !eq.info.tradeable ? '.hvut-eq-untradeable' : '')]), ' : ',
        $element('span', null, 'IW ' + eq.info.tier), ' : ',
        $element('span', null, [Math.ceil(eq.info.cdt * 100) + '%', (eq.info.cdt <= 0.5 ? '.hvut-eq-cdt2' : eq.info.cdt <= 0.6 ? '.hvut-eq-cdt1' : '')])
      );
    });

    _eq.node.buttons = $element('div', [$id('eqch_left'), 'afterbegin'], ['.hvut-eq-buttons']);
    $input(['button', '装备代码'], _eq.node.buttons, null, () => { _eq.equip_code(); });
    $input(['button', '装备弹窗'], _eq.node.buttons, null, () => { _eq.equip_popups(); });
    $input(['button', '熟练度模拟器'], _eq.node.buttons, null, () => { _eq.prof.toggle(); });
    _eq.node.equipset_name = $input('text', _eq.node.buttons, { value: $persona.json.ename || 'Set ' + $persona.json.eset, style: 'width: 100px; margin-left: auto; text-align: center;' });
    $input(['button', '保存'], _eq.node.buttons, null, () => { $persona.set_value('name', _eq.node.equipset_name.value); });

    if (_eq.stats_pane['Spell Type']) {
      _eq.mage_stats();
    }
  }
} else
// [END 2] Character - Equipment */


//* [3] Character - Abilities
if (_query.s === 'Character' && _query.ss === 'ab') {
  _ab.ability = {
    'HP Tank': { category: 'General', img: '3.png', pos: 0, unlock: [0, 25, 50, 75, 100, 120, 150, 200, 250, 300], point: [1, 2, 3, 3, 4, 4, 4, 5, 5, 5] },
    'MP Tank': { category: 'General', img: '3.png', pos: -34, unlock: [0, 30, 60, 90, 120, 160, 210, 260, 310, 350], point: [1, 2, 3, 3, 4, 4, 4, 5, 5, 5] },
    'SP Tank': { category: 'General', img: '3.png', pos: -68, unlock: [0, 40, 80, 120, 170, 220, 270, 330, 390, 450], point: [1, 2, 3, 3, 4, 4, 4, 5, 5, 5] },
    'Better Health Pots': { category: 'General', img: '1.png', pos: 0, unlock: [0, 100, 200, 300, 400], point: [1, 2, 3, 4, 5] },
    'Better Mana Pots': { category: 'General', img: '1.png', pos: -34, unlock: [0, 80, 140, 220, 380], point: [2, 3, 5, 7, 9] },
    'Better Spirit Pots': { category: 'General', img: '1.png', pos: -68, unlock: [0, 90, 160, 240, 400], point: [2, 3, 5, 7, 9] },
    '1H Damage': { category: 'One-handed', img: 'e.png', pos: -68, unlock: [0, 100, 200], point: [2, 3, 5] },
    '1H Accuracy': { category: 'One-handed', img: 'e.png', pos: -34, unlock: [50, 150], point: [1, 2] },
    '1H Block': { category: 'One-handed', img: 'e.png', pos: 0, unlock: [250], point: [3] },
    '2H Damage': { category: 'Two-handed', img: 'k.png', pos: -34, unlock: [0, 100, 200], point: [2, 3, 5] },
    '2H Accuracy': { category: 'Two-handed', img: 'k.png', pos: 0, unlock: [50, 150], point: [1, 2] },
    '2H Parry': { category: 'Two-handed', img: 'e.png', pos: -102, unlock: [250], point: [3] },
    'DW Damage': { category: 'Dual-wielding', img: 'j.png', pos: 0, unlock: [0, 100, 200], point: [2, 3, 5] },
    'DW Accuracy': { category: 'Dual-wielding', img: 'k.png', pos: -68, unlock: [50, 150], point: [1, 2] },
    'DW Crit': { category: 'Dual-wielding', img: 'k.png', pos: -102, unlock: [250], point: [3] },
    'Staff Spell Damage': { category: 'Staff', img: '9.png', pos: -68, unlock: [0, 100, 200], point: [2, 3, 5] },
    'Staff Accuracy': { category: 'Staff', img: 'v.png', pos: 0, unlock: [50, 150], point: [1, 2] },
    'Staff Damage': { category: 'Staff', img: 'k.png', pos: -136, unlock: [0], point: [3] },
    'Cloth Spellacc': { category: 'Cloth Armor', img: '5.png', pos: 0, unlock: [120], point: [5] },
    'Cloth Spellcrit': { category: 'Cloth Armor', img: '5.png', pos: -34, unlock: [0, 40, 90, 130, 190], point: [1, 2, 3, 5, 7] },
    'Cloth Castspeed': { category: 'Cloth Armor', img: '5.png', pos: -68, unlock: [150, 250], point: [2, 5] },
    'Cloth MP': { category: 'Cloth Armor', img: 'u.png', pos: -136, unlock: [0, 60, 110, 170, 230, 290, 350], point: [1, 2, 3, 3, 4, 4, 5] },
    'Light Acc': { category: 'Light Armor', img: '7.png', pos: -34, unlock: [0], point: [3] },
    'Light Crit': { category: 'Light Armor', img: '7.png', pos: 0, unlock: [0, 40, 90, 130, 190], point: [1, 2, 3, 5, 7] },
    'Light Speed': { category: 'Light Armor', img: '6.png', pos: -68, unlock: [150, 250], point: [2, 5] },
    'Light HP/MP': { category: 'Light Armor', img: '5.png', pos: -102, unlock: [0, 60, 110, 170, 230, 290, 350], point: [1, 2, 3, 3, 4, 4, 5] },
    'Heavy Crush': { category: 'Heavy Armor', img: 'j.png', pos: -34, unlock: [0, 75, 150], point: [3, 5, 7] },
    'Heavy Prcg': { category: 'Heavy Armor', img: 'a.png', pos: -102, unlock: [0, 75, 150], point: [3, 5, 7] },
    'Heavy Slsh': { category: 'Heavy Armor', img: 'j.png', pos: -68, unlock: [0, 75, 150], point: [3, 5, 7] },
    'Heavy HP': { category: 'Heavy Armor', img: 'u.png', pos: -102, unlock: [0, 60, 110, 170, 230, 290, 350], point: [1, 2, 3, 3, 4, 4, 5] },
    'Better Weaken': { category: 'Deprecating 1', img: '4.png', pos: 0, unlock: [70, 100, 130, 190, 250], point: [1, 2, 3, 5, 7] },
    'Faster Weaken': { category: 'Deprecating 1', img: 'b.png', pos: -68, unlock: [80, 165, 250], point: [3, 5, 7] },
    'Better Imperil': { category: 'Deprecating 1', img: 'a.png', pos: -68, unlock: [130, 175, 230, 285, 330], point: [1, 2, 3, 4, 5] },
    'Faster Imperil': { category: 'Deprecating 1', img: 'r.png', pos: 0, unlock: [140, 225, 310], point: [3, 5, 7] },
    'Better Blind': { category: 'Deprecating 1', img: 'r.png', pos: -34, unlock: [110, 130, 160, 190, 220], point: [1, 2, 3, 4, 5] },
    'Faster Blind': { category: 'Deprecating 1', img: '9.png', pos: -102, unlock: [120, 215, 275], point: [1, 2, 3] },
    'Mind Control': { category: 'Deprecating 1', img: '9.png', pos: -136, unlock: [80, 130, 170], point: [1, 3, 5] },
    'Better Silence': { category: 'Deprecating 2', img: 'c.png', pos: -170, unlock: [120, 170, 215], point: [3, 5, 7] },
    'Better MagNet': { category: 'Deprecating 2', img: 'u.png', pos: 0, unlock: [250, 295, 340, 370, 400], point: [1, 2, 3, 4, 5] },
    'Better Slow': { category: 'Deprecating 2', img: 'c.png', pos: 0, unlock: [30, 50, 75, 105, 135], point: [1, 2, 3, 4, 5] },
    'Better Drain': { category: 'Deprecating 2', img: '2.png', pos: 0, unlock: [20, 50, 90], point: [2, 3, 5] },
    'Faster Drain': { category: 'Deprecating 2', img: 'n.png', pos: 0, unlock: [30, 70, 110, 150, 200], point: [1, 2, 3, 4, 5] },
    'Ether Theft': { category: 'Deprecating 2', img: '2.png', pos: -34, unlock: [150], point: [5] },
    'Spirit Theft': { category: 'Deprecating 2', img: '2.png', pos: -68, unlock: [150], point: [5] },
    'Better Haste': { category: 'Supportive 1', img: '9.png', pos: -34, unlock: [60, 75, 90, 110, 130], point: [1, 2, 3, 4, 5] },
    'Better Shadow Veil': { category: 'Supportive 1', img: '6.png', pos: -34, unlock: [90, 105, 120, 135, 155], point: [1, 2, 3, 5, 7] },
    'Better Absorb': { category: 'Supportive 1', img: 'c.png', pos: -34, unlock: [40, 60, 80], point: [1, 2, 3] },
    'Stronger Spirit': { category: 'Supportive 1', img: 'a.png', pos: 0, unlock: [200, 220, 240, 265, 285], point: [1, 2, 3, 4, 5] },
    'Better Heartseeker': { category: 'Supportive 1', img: '6.png', pos: 0, unlock: [140, 185, 225, 265, 305, 345, 385], point: [1, 2, 3, 4, 5, 6, 7] },
    'Better Arcane Focus': { category: 'Supportive 1', img: 'q.png', pos: 0, unlock: [175, 205, 245, 285, 325, 365, 405], point: [1, 2, 3, 4, 5, 6, 7] },
    'Better Regen': { category: 'Supportive 1', img: 'b.png', pos: -34, unlock: [50, 70, 95, 145, 195, 245, 295, 375, 445, 500], point: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    'Better Cure': { category: 'Supportive 1', img: 'i.png', pos: -102, unlock: [0, 35, 65], point: [2, 3, 5] },
    'Better Spark': { category: 'Supportive 2', img: 'q.png', pos: -170, unlock: [100, 125, 150], point: [2, 3, 5] },
    'Better Protection': { category: 'Supportive 2', img: 'o.png', pos: 0, unlock: [40, 55, 75, 95, 120], point: [1, 2, 3, 4, 5] },
    'Flame Spike Shield': { category: 'Supportive 2', img: 's.png', pos: 0, unlock: [10, 65, 140, 220, 300], point: [3, 1, 2, 3, 4] },
    'Frost Spike Shield': { category: 'Supportive 2', img: 'p.png', pos: 0, unlock: [10, 65, 140, 220, 300], point: [3, 1, 2, 3, 4] },
    'Shock Spike Shield': { category: 'Supportive 2', img: 'g.png', pos: 0, unlock: [10, 65, 140, 220, 300], point: [3, 1, 2, 3, 4] },
    'Storm Spike Shield': { category: 'Supportive 2', img: 'a.png', pos: -34, unlock: [10, 65, 140, 220, 300], point: [3, 1, 2, 3, 4] },
    'Conflagration': { category: 'Elemental', img: 'h.png', pos: 0, unlock: [50, 100, 150, 200, 250, 300, 400], point: [3, 4, 5, 6, 8, 10, 12] },
    'Cryomancy': { category: 'Elemental', img: 'i.png', pos: -34, unlock: [50, 100, 150, 200, 250, 300, 400], point: [3, 4, 5, 6, 8, 10, 12] },
    'Havoc': { category: 'Elemental', img: '9.png', pos: 0, unlock: [50, 100, 150, 200, 250, 300, 400], point: [3, 4, 5, 6, 8, 10, 12] },
    'Tempest': { category: 'Elemental', img: 'i.png', pos: -68, unlock: [50, 100, 150, 200, 250, 300, 400], point: [3, 4, 5, 6, 8, 10, 12] },
    'Sorcery': { category: 'Elemental', img: 'c.png', pos: -68, unlock: [70, 140, 210, 280, 350], point: [1, 2, 3, 4, 5] },
    'Elementalism': { category: 'Elemental', img: 'c.png', pos: -136, unlock: [85, 170, 255, 340, 425], point: [2, 3, 5, 7, 9] },
    'Archmage': { category: 'Elemental', img: 'i.png', pos: 0, unlock: [90, 180, 270, 360, 450], point: [5, 7, 9, 12, 15] },
    'Better Corruption': { category: 'Forbidden', img: 't.png', pos: 0, unlock: [75, 150], point: [3, 5] },
    'Better Disintegrate': { category: 'Forbidden', img: 't.png', pos: -34, unlock: [175, 250], point: [5, 7] },
    'Better Ragnarok': { category: 'Forbidden', img: 'u.png', pos: -68, unlock: [250, 325, 400], point: [7, 9, 12] },
    'Ripened Soul': { category: 'Forbidden', img: 'u.png', pos: -34, unlock: [150, 300, 450], point: [7, 10, 15] },
    'Dark Imperil': { category: 'Forbidden', img: 't.png', pos: -68, unlock: [175, 225, 275, 325, 375], point: [2, 3, 5, 7, 9] },
    'Better Smite': { category: 'Divine', img: 'q.png', pos: -136, unlock: [75, 150], point: [3, 5] },
    'Better Banish': { category: 'Divine', img: 'q.png', pos: -34, unlock: [175, 250], point: [5, 7] },
    'Better Paradise': { category: 'Divine', img: 'q.png', pos: -68, unlock: [250, 325, 400], point: [7, 9, 12] },
    'Soul Fire': { category: 'Divine', img: 'l.png', pos: 0, unlock: [150, 300, 450], point: [7, 10, 15] },
    'Holy Imperil': { category: 'Divine', img: 'v.png', pos: -34, unlock: [175, 225, 275, 325, 375], point: [2, 3, 5, 7, 9] },
  };

  _ab.preset = {
    'Current Set': [],
    'One-handed': ['HP Tank', 'MP Tank', 'SP Tank', 'Better Health Pots', 'Better Mana Pots', 'Better Spirit Pots', '1H Damage', '1H Accuracy', '1H Block', 'Heavy Crush', 'Heavy Prcg', 'Heavy Slsh', 'Heavy HP', 'Better Haste', 'Better Shadow Veil', 'Stronger Spirit', 'Better Heartseeker', 'Better Regen', 'Better Cure', 'Better Spark', 'Better Protection', 'Flame Spike Shield'],
    'Two-handed': ['HP Tank', 'MP Tank', 'SP Tank', 'Better Health Pots', 'Better Mana Pots', 'Better Spirit Pots', '2H Damage', '2H Accuracy', '2H Parry', 'Light Acc', 'Light Crit', 'Light Speed', 'Light HP/MP', 'Better Haste', 'Better Shadow Veil', 'Stronger Spirit', 'Better Heartseeker', 'Better Regen', 'Better Cure', 'Better Spark', 'Better Protection', 'Flame Spike Shield'],
    'Dual-wielding': ['HP Tank', 'MP Tank', 'SP Tank', 'Better Health Pots', 'Better Mana Pots', 'Better Spirit Pots', 'DW Damage', 'DW Accuracy', 'DW Crit', 'Light Acc', 'Light Crit', 'Light Speed', 'Light HP/MP', 'Better Haste', 'Better Shadow Veil', 'Stronger Spirit', 'Better Heartseeker', 'Better Regen', 'Better Cure', 'Better Spark', 'Better Protection', 'Flame Spike Shield'],
    'Niten Ichiryu': ['HP Tank', 'MP Tank', 'SP Tank', 'Better Health Pots', 'Better Mana Pots', 'Better Spirit Pots', '2H Damage', '2H Parry', 'DW Accuracy', 'DW Crit', 'Light Acc', 'Light Crit', 'Light Speed', 'Light HP/MP', 'Better Haste', 'Better Shadow Veil', 'Stronger Spirit', 'Better Heartseeker', 'Better Regen', 'Better Cure', 'Better Spark', 'Better Protection', 'Flame Spike Shield'],
    'Elemental mage': ['HP Tank', 'MP Tank', 'SP Tank', 'Better Health Pots', 'Better Mana Pots', 'Better Spirit Pots', 'Staff Spell Damage', 'Staff Accuracy', 'Cloth Spellacc', 'Cloth Spellcrit', 'Cloth Castspeed', 'Cloth MP', 'Better Imperil', 'Faster Imperil', 'Better Haste', 'Better Shadow Veil', 'Stronger Spirit', 'Better Arcane Focus', 'Better Regen', 'Better Cure', 'Better Spark', 'Better Protection', 'Flame Spike Shield', 'Conflagration', 'Sorcery', 'Elementalism', 'Archmage'],
    'Dark mage': ['HP Tank', 'MP Tank', 'SP Tank', 'Better Health Pots', 'Better Mana Pots', 'Better Spirit Pots', 'Staff Spell Damage', 'Staff Accuracy', 'Cloth Spellacc', 'Cloth Spellcrit', 'Cloth Castspeed', 'Cloth MP', 'Better Imperil', 'Faster Imperil', 'Better Haste', 'Better Shadow Veil', 'Stronger Spirit', 'Better Arcane Focus', 'Better Regen', 'Better Cure', 'Better Spark', 'Better Protection', 'Flame Spike Shield', 'Better Corruption', 'Better Disintegrate', 'Better Ragnarok', 'Ripened Soul', 'Dark Imperil'],
    'Holy mage': ['HP Tank', 'MP Tank', 'SP Tank', 'Better Health Pots', 'Better Mana Pots', 'Better Spirit Pots', 'Staff Spell Damage', 'Staff Accuracy', 'Cloth Spellacc', 'Cloth Spellcrit', 'Cloth Castspeed', 'Cloth MP', 'Better Imperil', 'Faster Imperil', 'Better Haste', 'Better Shadow Veil', 'Stronger Spirit', 'Better Arcane Focus', 'Better Regen', 'Better Cure', 'Better Spark', 'Better Protection', 'Flame Spike Shield', 'Better Smite', 'Better Banish', 'Better Paradise', 'Soul Fire', 'Holy Imperil'],
  };

  _ab.point = parseInt(/Ability Points: (\d+)/.exec($id('ability_top').children[3].textContent)[1]);
  _ab.level = {};

  _ab.click = function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) {
      return;
    }
    const { action, name, to } = target.dataset;
    if (action === 'unlock') {
      e.stopPropagation();
      _ab.unlock(name, to);
    }
  };

  _ab.unlock = async function (name, to) {
    const ab = _ab.ability[name];
    const count = to - ab.level;

    async function unlock(ab) {
      const html = await $ajax.fetch(location.href, 'unlock_ability=' + ab.id);
      const doc = $doc(html);
      const error = get_message(doc);
      if (error) {
        popup(error);
      } else {
        const button = $qs('div[style*="u.png"]', ab.div.children[2]);
        button.style.opacity = 0.5;
        button.style.backgroundImage = button.style.backgroundImage.replace('u.png', 'f.png');
      }
    }

    const requests = $ajax.repeat(count, unlock, ab);
    await Promise.all(requests);
    location.href = location.href;
  };

  _ab.calc = {

    node: { ability: {} },
    level: [],
    selected: [],

    init: function () {
      if (_ab.calc.inited) {
        return;
      }
      _ab.calc.inited = true;

      Object.entries(_ab.ability).forEach(([n, ab]) => {
        ab.unlock.forEach((u, i) => {
          if (!_ab.calc.level[u]) {
            _ab.calc.level[u] = [];
          }
          _ab.calc.level[u].push({ name: n, level: i + 1, point: ab.point[i] });
        });
      });

      const node = _ab.calc.node;
      node.div = $element('div', $id('mainpane'), ['.hvut-ab-calc'], (e) => { _ab.calc.click(e); });
      node.side = $element('div', node.div, ['.hvut-side hvut-ab-side']);
      node.ul = $element('ul', $element('div', node.div), ['.hvut-ab-ul']);
      node.table = $element('table', $element('div', node.div), ['.hvut-ab-table']);

      $input(['button', '关闭'], node.side, { dataset: { action: 'toggle' }, className: 'hvut-side-margin' });
      Object.keys(_ab.preset).forEach((n) => { $input(['button', n], node.side, { dataset: { action: 'preset', name: n } }); });

      let category;
      let li;
      Object.entries(_ab.ability).forEach(([n, ab]) => {
        if (category !== ab.category) {
          category = ab.category;
          li = $element('li', node.ul);
          $element('span', li, [category, '.hvut-ab-category']);
        }
        const icon = $element('div', li, [{ dataset: { action: 'ability', name: n } }, '.hvut-ab-icon hvut-ab-off', `!background-image: url("/y/t/${ab.img}"); background-position-x: ${ab.pos - 2}px;`]);
        $element('span', icon, [n, '.hvut-ab-tooltip']);
        node.ability[n] = icon;
      });

      _ab.calc.preset('Current Set');
    },

    preset: function (name) {
      _ab.calc.selected.forEach((e) => { _ab.calc.node.ability[e].classList.add('hvut-ab-off'); });
      _ab.calc.selected = _ab.preset[name].slice();
      _ab.calc.selected.forEach((e) => { _ab.calc.node.ability[e].classList.remove('hvut-ab-off'); });
      _ab.calc.table();
    },

    ability: function (name) {
      const selected = _ab.calc.selected;
      if (selected.includes(name)) {
        selected.splice(selected.indexOf(name), 1);
        _ab.calc.node.ability[name].classList.add('hvut-ab-off');
      } else {
        selected.push(name);
        _ab.calc.node.ability[name].classList.remove('hvut-ab-off');
      }
      _ab.calc.table();
    },

    table: function () {
      const tbody = [];
      let sum = 0;
      _ab.calc.level.forEach((list, unlock) => {
        const selected = list.filter(({ name }) => _ab.calc.selected.includes(name));
        if (!selected.length) {
          return;
        }
        sum += selected.reduce((s, e) => (s + e.point), 0);
        const aboost = sum - unlock;
        const tr = $element('tr', null, [_player.level < unlock ? '.hvut-ab-nolevel' : '']);
        $element('td', tr, unlock);
        $element('td', tr, sum);
        $element('td', tr, [`/<span>${aboost}</span>`, aboost < 0 ? '.hvut-ab-noab' : '']);
        const td = $element('td', tr);
        selected.forEach(({ name, level, point }) => {
          const ab = _ab.ability[name];
          const icon = $element('div', td, ['.hvut-ab-icon', `!background-image: url("/y/t/${ab.img}"); background-position-x: ${ab.pos - 2}px;`]);
          $element('span', icon, [point, '.hvut-ab-point']);
          $element('span', icon, [`${name} Lv.${level}`, '.hvut-ab-tooltip']);
        });
        tbody.push(tr);
      });

      _ab.calc.node.table.innerHTML = '<thead><tr><td>等级</td><td>能力点</td><td>能力提升</td><td>能力</td></tr></thead><tbody></tbody>';
      _ab.calc.node.table.tBodies[0].append(...tbody);
      $qsa('.hvut-ab-table tr:not(.hvut-ab-nolevel)').at(-1).scrollIntoView({ block: 'center' });
    },

    toggle: function () {
      _ab.calc.node.div?.classList.toggle('hvut-none');
      _ab.calc.init();
    },

    click: function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, name } = target.dataset;
      if (action === 'preset') {
        _ab.calc.preset(name);
      } else if (action === 'ability') {
        _ab.calc.ability(name);
      } else if (action === 'toggle') {
        _ab.calc.toggle();
      }
    },

  };

  GM_addStyle(/*css*/`
    .hvut-ab-slot { position: absolute; bottom: -5px; left: 2px; width: 30px; font-size: 9pt; color: #fff; }
    .hvut-ab-max { background-color: #333; }
    .hvut-ab-limit { background-color: #03c; }
    .hvut-ab-up { background-color: #c00; }
    .hvut-ab-tree > img[src*='/td'] { filter: brightness(250%); }
    .hvut-ab-bar { font-size: 10pt; line-height: 30px; }
    .hvut-ab-bu { color: #333; display: block; }
    .hvut-ab-bux { color: #999; display: block; cursor: not-allowed; }
    .hvut-ab-bx { color: #999; }

    #ability_treepane > div > div:first-child { padding-top: 13px; }
    .hvut-ab-warn { display: block; margin-top: -6px; }
    .hvut-ab-warn::before { content: attr(data-warn); display: inline-block; margin-bottom: 2px; padding: 1px 3px; border-radius: 2px; background-color: #c00; color: #fff; font-size: 9pt; }

    .hvut-ab-calc { display: flex; position: absolute; top: 27px; left: 0; width: 100%; height: 675px; justify-content: center; align-items: center; background-color: #EDEBDF; z-index: 9; font-size: 10pt; text-align: left; }
    .hvut-ab-calc > div { margin: 0 10px; height: 616px; }
    .hvut-ab-calc > div:nth-child(3) { overflow: hidden scroll; }
    .hvut-ab-icon { display: inline-block; position: relative; width: 30px; margin: 2px; height: 32px; vertical-align: middle; background-position-y: -2px; cursor: default; }
    .hvut-ab-off { filter: grayscale(100%); box-shadow: 0 0 0 20px #fff9 inset; }
    .hvut-ab-off:hover { filter: none; }
    .hvut-ab-point { position: absolute; top: 0; right: 0; width: 14px; padding: 1px; text-align: center; background-color: #333; color: #fff; font-size: 9pt; }
    .hvut-ab-tooltip { visibility: hidden; position: absolute; bottom: 32px; left: 0; padding: 0 3px; border: 1px solid; background-color: #fff; font-size: 9pt; line-height: 16px; white-space: nowrap; z-index: 1; pointer-events: none; }
    .hvut-ab-icon:hover > .hvut-ab-tooltip { visibility: visible; }

    .hvut-ab-side { position: static; }
    .hvut-ab-ul { width: 450px; margin: 0; padding: 0; border: 1px solid; list-style: none; }
    .hvut-ab-ul > li { padding: 2px; border-bottom: 1px solid; }
    .hvut-ab-ul > li:last-child { border-bottom: none; }
    .hvut-ab-category { display: inline-block; width: 130px; margin-left: 10px; font-weight: bold; vertical-align: middle; }
    .hvut-ab-ul .hvut-ab-icon { cursor: pointer; }
    .hvut-ab-table { table-layout: fixed; border-collapse: separate; border-spacing: 0; position: relative; width: 400px; text-align: right; }
    .hvut-ab-table thead td { position: sticky; top: 0; height: 36px; border-top-width: 1px; font-weight: bold; text-align: center; background-color: #edb; z-index: 1; }
    .hvut-ab-table td { border-style: solid; border-width: 0 1px 1px 0; padding: 2px 5px; }
    .hvut-ab-table td:nth-child(1) { border-left-width: 1px; }
    .hvut-ab-table td:nth-child(2) { width: 50px; }
    .hvut-ab-table td:nth-child(3) { width: 50px; }
    .hvut-ab-table td:nth-child(4) { width: 204px; text-align: left; }
    .hvut-ab-table .hvut-ab-icon:nth-child(n+7) { margin-top: 7px; }
    .hvut-ab-nolevel { background-color: #edb; }
    .hvut-ab-noab > span { color: #999; }
  `);

  $qsa('#ability_top div[onmouseover*="overability"]').forEach((div) => {
    const exec = /overability\(\d+, '([^']+)'.+?(?:(Not Acquired)|Requires <strong>Level (\d+))/.exec(div.getAttribute('onmouseover'));
    const name = exec[1];
    const ab = _ab.ability[name];

    ab.slotted = true;
    ab.level = exec[2] ? 0 : ab.unlock.indexOf(parseInt(exec[3])) + 1;
    ab.max = ab.unlock.length;
    ab.limit = ab.unlock.findIndex((e) => e > _player.level);
    if (ab.limit === -1) {
      ab.limit = ab.max;
    }

    _ab.preset['Current Set'].push(name);
    if (ab.level) {
      _ab.level[name] = ab.level;
    }

    const span = $element('span', div, ['.hvut-ab-slot']);
    if (ab.level === ab.max) {
      span.textContent = '满';
      span.classList.add('hvut-ab-max');
    } else if (ab.level === ab.limit) {
      span.textContent = `${ab.level}/${ab.max}`;
      span.classList.add('hvut-ab-limit');
    } else {
      span.textContent = `${ab.level}/${ab.max}`;
      span.classList.add('hvut-ab-up');
      const categories = ['General', 'One-handed', 'Two-handed', 'Dual-wielding', '', 'Staff', 'Cloth Armor', 'Light Armor', 'Heavy Armor', 'Deprecating 1', 'Deprecating 2', 'Supportive 1', 'Supportive 2', 'Elemental', 'Forbidden', 'Divine'];
      const index = categories.indexOf(ab.category);
      $qsa('#ability_treelist > div')[index].classList.add('hvut-ab-tree');
    }
  });
  $config.set('ab_level', _ab.level);

  $id('ability_treepane').addEventListener('click', _ab.click, true);
  $qsa('#ability_treepane > div').forEach((div) => {
    const name = div.firstElementChild.textContent;
    const ab = _ab.ability[name];
    let point = _ab.point;

    ab.div = div;
    ab.id = /do_unlock_ability\((\d+)\)/.exec(div.children[2].getAttribute('onclick'))?.[1] || '';
    ab.level = 0;

    Array.from(div.children[2].children).forEach((button, i) => {
      const type = /(.)\.png/.exec(button.style.backgroundImage)[1];
      button.classList.add('hvut-ab-bar');

      if (type === 'f') {
        ab.level++;
      } else if (type === 'u') {
        point -= ab.point[i];
        if (point < 0) {
          $element('span', button, [ab.point[i], '.hvut-ab-bux']);
        } else {
          $element('span', button, [ab.point[i], '.hvut-ab-bu', { dataset: { action: 'unlock', name: name, to: i + 1 } }]);
        }
      } else if (type === 'x') {
        $element('span', button, [`${ab.point[i]} (${ab.unlock[i]})`, '.hvut-ab-bx']);
      }
    });

    if (ab.level) {
      if (!ab.slotted) {
        div.firstElementChild.firstElementChild.classList.add('hvut-ab-warn');
        div.firstElementChild.firstElementChild.dataset.warn = 'unslotted';
      } else if (ab.level !== ab.limit) {
        div.firstElementChild.firstElementChild.classList.add('hvut-ab-warn');
        div.firstElementChild.firstElementChild.dataset.warn = 'unleveled';
      }
    }
  });

  $input(['button', '能力模拟器'], $id('ability_outer'), { style: 'position: absolute; top: 20px; left: -80px; width: 90px; white-space: normal;' }, () => { _ab.calc.toggle(); });
} else
// [END 3] Character - Abilities */


//* [4] Character - Training
if (_query.s === 'Character' && _query.ss === 'tr') {
  _tr.data = {
    'Adept Learner': { id: 50, b: 100, l: 50, e: 0.000417446 },
    'Assimilator': { id: 51, b: 50000, l: 50000, e: 0.0057969565 },
    'Ability Boost': { id: 80, b: 100, l: 100, e: 0.0005548607 },
    'Manifest Destiny': { id: 81, b: 1000000, l: 1000000, e: 0 },
    'Scavenger': { id: 70, b: 500, l: 500, e: 0.0088310825 },
    'Luck of the Draw': { id: 71, b: 2000, l: 2000, e: 0.0168750623 },
    'Quartermaster': { id: 72, b: 5000, l: 5000, e: 0.017883894 },
    'Archaeologist': { id: 73, b: 25000, l: 25000, e: 0.030981982 },
    'Metabolism': { id: 84, b: 1000000, l: 1000000, e: 0 },
    'Inspiration': { id: 85, b: 2000000, l: 2000000, e: 0 },
    'Scholar of War': { id: 90, b: 30000, l: 10000, e: 0 },
    'Tincture': { id: 91, b: 30000, l: 10000, e: 0 },
    'Pack Rat': { id: 98, b: 10000, l: 10000, e: 0 },
    'Dissociation': { id: 88, b: 1000000, l: 1000000, e: 0 },
    'Set Collector': { id: 96, b: 12500, l: 12500, e: 0 },
  };

  _tr.click = function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) {
      return;
    }
    const { action, name } = target.dataset;
    if (action === 'change') {
      _tr.change(name);
    }
  };

  _tr.change = function (name, level) {
    const training = _tr.data[name];
    if (!training?.time) {
      _tr.node.select.value = '';
      _tr.node.level.value = '';
      _tr.node.level.disabled = true;
      _tr.node.cost.value = '';
      return;
    }
    if (!level) {
      level = training.level;
    }
    _tr.node.select.value = name;
    _tr.node.level.value = level;
    _tr.node.level.min = training.level;
    _tr.node.level.max = training.max;
    _tr.node.level.disabled = false;
    _tr.calc();
  };

  _tr.calc = function () {
    const name = _tr.node.select.value;
    const to = parseInt(_tr.node.level.value);
    if (!name || !to) {
      return;
    }

    const training = _tr.data[name];
    let from = training.level;
    let cost = 0;
    if (name === _tr.current) {
      from++;
    }
    while (from < to) {
      cost += Math.round(Math.pow(training.b + training.l * from, 1 + training.e * from));
      from++;
    }
    _tr.node.cost.value = cost.toLocaleString();
  };

  _tr.set = function (reload) {
    if (_tr.node.select.value) {
      _tr.json.next_name = _tr.node.select.value;
      _tr.json.next_level = parseInt(_tr.node.level.value);
      _tr.json.next_id = _tr.data[_tr.node.select.value].id;
    } else {
      _tr.json.next_name = '';
      _tr.json.next_level = 0;
      _tr.json.next_id = 0;
    }
    $config.set('tr_notif', _tr.json, 'hvut_');

    if (reload) {
      location.href = location.href;
    }
  };

  _tr.cancel = function (reload) {
    _tr.node.select.value = '';
    _tr.set(reload);
  };

  GM_addStyle(/*css*/`
    #train_table > tbody > tr > td:last-child { width: 100px; padding-right: 10px; }
    #train_table > tbody > tr:last-child > td { font-weight: bold; }
  `);

  _tr.node = {};
  _tr.node.div = $element('div', [$id('train_outer'), 'afterbegin'], ['!margin: 5px;' + ($config.settings.trainingNotification ? '' : ' display: none;')]);
  _tr.node.select = $input(['select', [':Plan Training...']], _tr.node.div, null, { change: () => { _tr.change(_tr.node.select.value); } });
  _tr.node.level = $input('number', _tr.node.div, { disabled: true, style: 'width: 30px; text-align: right;' }, { input: () => { _tr.calc(); } });
  $input(['button', '设置'], _tr.node.div, null, () => { _tr.set(true); });
  _tr.node.cost = $input('text', _tr.node.div, { readOnly: true, style: 'width: 90px; text-align: right;' });
  $input(['button', '取消计划'], _tr.node.div, null, () => { _tr.cancel(true); });

  _tr.json = $config.get('tr_notif', {}, 'hvut_');
  _tr.current = $qs('#train_progress > div:nth-child(2) > :first-child')?.textContent;
  _tr.level = {};
  _tr.spent = 0;

  if ($id('train_progress')) {
    confirm_event($qs('img[src$="/canceltrain.png"]'), 'click', '确定要取消当前训练吗?', null, _tr.cancel);
  }

  $id('train_table').addEventListener('click', _tr.click);
  Array.from($id('train_table').rows).forEach((tr, i) => {
    if (!i) {
      $element('th', tr);
      $element('th', tr, ['/<div class="fc2 fac fcb"><div>Spent Credits</div></div>']);
      return;
    }
    const name = tr.cells[0].textContent.trim();
    const time = parseFloat(tr.cells[3].textContent);
    const level = parseInt(tr.cells[4].textContent);
    const max = parseInt(tr.cells[6].textContent);

    _tr.level[name] = level;

    const training = _tr.data[name];
    if (!training) {
      return;
    }
    training.time = time;
    training.level = level;
    training.max = max;
    if (training.time) {
      tr.classList.add('hvut-cphu');
      tr.dataset.action = 'change';
      tr.dataset.name = name;
      $element('option', _tr.node.select, { text: name, value: name });
    }

    let spent = 0;
    for (let i = 0; i < level; i++) {
      spent += Math.round(Math.pow(training.b + training.l * i, 1 + training.e * i));
    }
    _tr.spent += spent;
    $element('td', tr, [`/<div class="fc4 far fcb"><div>${spent.toLocaleString()}</div></div>`]);
  });
  $element('tr', $id('train_table').tBodies[0], [`/<td colspan="9"><div class="fc4 far fcb"><div>Total ${_tr.spent.toLocaleString()}</div></div></td>`]);

  $config.set('tr_level', _tr.level);

  if (_tr.current && _tr.data[_tr.current]) {
    _tr.json.current_name = _tr.current;
    _tr.json.current_level = _tr.data[_tr.current].level;
    _tr.json.current_end = _window.end_time * 1000;
  } else {
    _tr.json.current_name = '';
    _tr.json.current_level = 0;
    _tr.json.current_end = 0;
  }
  if (_tr.json.next_name) {
    if (_tr.data[_tr.json.next_name].level < _tr.json.next_level) {
      _tr.change(_tr.json.next_name, _tr.json.next_level);
    } else {
      _tr.json.next_name = '';
      _tr.json.next_level = 0;
      _tr.json.next_id = 0;
    }
  }
  _tr.json.error = '';
  $config.set('tr_notif', _tr.json, 'hvut_');
} else
// [END 4] Character - Training */


//* [5] Character - Item Inventory
if (_query.s === 'Character' && _query.ss === 'it') {
  $qsa('.itemlist tr').forEach((tr) => {
    const div = tr.cells[0].firstElementChild;
    const type = $item.get_type(div.getAttribute('onmouseover'));
    tr.classList.add('hvut-it-' + type);
  });

  GM_addStyle(/*css*/`
    #item_left { width: 400px; }
    #item_left .cspp { overflow-y: scroll; }
    #item_list .itemlist td:nth-child(1) { width: 285px !important; }
    #item_list .itemlist td:nth-child(2) { width: 75px !important; }
    #item_right { width: 605px; }
    #item_slots { height: 572px; margin-top: 19px; }
    #item_slots > div { width: 300px; }
    .sa { height: 30px; margin: 8px auto; line-height: 20px; }
    .sa > div { height: 20px !important; padding: 5px 10px !important; }
    .sa > div:last-child > div { padding: 0; }
  `);
} else
// [END 5] Character - Item Inventory */


//* [6] Character - Equip Inventory
if (_query.s === 'Character' && _query.ss === 'in') {
  _in.filter = _query.filter || '1handed';
  _in.category = { '1handed': {}, '2handed': {}, 'staff': {}, 'shield': {}, 'acloth': {}, 'alight': {}, 'aheavy': {} };
  _in.equiplist = [];
  _in.equipdata = $config.get('equipdata', { version: 1 });
  _in.node = {};

  _in.click = function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) {
      return;
    }
    const { action, eid, filter } = target.dataset;
    const eq = eid && _in.equiplist.find((eq) => eq.info.eid == eid);
    if (action === 'lpr') {
      _in.get_lpr(eq);
    } else if (action === 'scroll') {
      _in.scroll(filter);
    }
  };

  _in.init_list = function (filter) {
    const parent = ['acloth', 'alight', 'aheavy'].includes(filter) ? $id('inv_eqstor') : $id('inv_equip');
    _in.category[filter].div = $element('div', parent, ['.equiplist nosel']);
    $element('p', _in.category[filter].div, [$equip.alias[filter], '.hvut-eq-category']);
    $element('span', $qs('.hvut-in-header', parent.parentNode), { textContent: $equip.alias[filter], dataset: { action: 'scroll', filter } });
  };

  _in.load_list = async function (filter) {
    _in.init_list(filter);
    _in.category[filter].div.classList.add('hvut-eq-loading');

    const html = await $ajax.fetch('?s=Character&ss=in&filter=' + filter);
    const doc = $doc(html);
    Object.assign($equip.dynjs_eqstore, JSON.parse(/var dynjs_eqstore = (\{.*\});/.exec(html)?.[1] || null));
    _in.get_list(filter, $id('eqinv_outer', doc));
    _in.category[filter].div.classList.remove('hvut-eq-loading');
    _in.set_rangeselect();
  };

  _in.get_list = function (filter, outer) {
    const equiplist = $equip.list(outer, false);
    const popup_reg = /(equips\.set\(\d+),'(?:inv_equip|inv_eqstor)',\d+,\d+\)/;
    const popup_replace = ['acloth', 'alight', 'aheavy'].includes(filter) ? "$1,'inv_eqstor',300,200)" : "$1,'inv_equip',500,200)";
    equiplist.forEach((eq) => {
      eq.json = _in.equipdata[eq.info.eid] || {};
      if (!eq.node.div.previousElementSibling) {
        $element('div', [eq.node.wrapper, 'afterbegin'], ['.hvut-in-is']);
      }
      eq.node.lock = eq.node.wrapper.firstElementChild;
      eq.node.sub = $element('div', [eq.node.div, 'beforebegin'], ['.hvut-in-sub' + (eq.info.tradeable ? '' : ' hvut-in-untrade')]);
      eq.node.eid = $element('span', eq.node.sub, [eq.info.eid, '.hvut-in-eid']);
      eq.node.check = $input('checkbox', eq.node.sub, { className: 'hvut-in-check', checked: eq.json.checked });
      eq.node.price = $input('text', eq.node.sub, { className: 'hvut-in-price', placeholder: '$price', value: eq.json.price || '' });
      eq.node.note = $input('text', eq.node.sub, { className: 'hvut-in-note', placeholder: '$note', value: eq.json.note || '' });
      eq.node.lpr = $input(['button', '<'], eq.node.sub, { className: 'hvut-in-lpr', dataset: { action: 'lpr', eid: eq.info.eid } });
      eq.node.div.setAttribute('onmouseover', eq.node.div.getAttribute('onmouseover').replace(popup_reg, popup_replace));
    });
    if (equiplist.length) {
      $equip.sort(equiplist, _in.category[filter].div);
    }
    _in.check_name(equiplist);
    _in.category[filter].equiplist = equiplist;
    _in.equiplist.push(...equiplist);
  };

  _in.sort_list = function (key) {
    if (key === 'category') {
      Object.values(_in.category).forEach((c) => {
        if (c.equiplist.length) {
          $equip.sort(c.equiplist, c.div);
        }
      });
      _in.set_rangeselect();
      return;
    }
    function sort_by_name(a, b) {
      return ($equip.index.quality[a.info.quality] - $equip.index.quality[b.info.quality]) || (a.info.name > b.info.name ? 1 : a.info.name < b.info.name ? -1 : b.info.eid - a.info.eid);
    }
    function sort_by_eid(a, b) {
      return b.info.eid - a.info.eid;
    }
    const sort_fn = key === 'name' ? sort_by_name : key === 'eid' ? sort_by_eid : () => {};
    Object.values(_in.category).forEach((c) => {
      if (!c.equiplist.length) {
        return;
      }
      const frag = $element();
      frag.appendChild(c.div.firstElementChild);
      c.equiplist.sort(sort_fn);
      c.equiplist.forEach((eq) => {
        frag.appendChild(eq.node.wrapper);
        eq.node.wrapper.classList.remove('hvut-eq-border');
      });
      c.div.innerHTML = '';
      c.div.appendChild(frag);
    });
    _in.set_rangeselect();
  };

  _in.check_list = function (t, c) {
    if (t === 'all') {
      _in.equiplist.forEach((eq) => { eq.node.check.checked = c; });
    } else if (t === 'tradeable') {
      _in.equiplist.forEach((eq) => { if (eq.info.tradeable) { eq.node.check.checked = c; } });
    } else if (t === 'invert') {
      _in.equiplist.forEach((eq) => { eq.node.check.checked = !eq.node.check.checked; });
    }
  };

  _in.scroll = function (filter) {
    scrollIntoView(_in.category[filter].div);
  };

  _in.get_lpr = function (eq) {
    function load(e) {
      const d = e.target.contentDocument;
      if (!d.location.href.includes('/equip/')) {
        return;
      }
      const value = eq.node.note.value;
      let count = 0;
      const tid = setInterval(() => {
        const div = $id('summaryDiv', d);
        if (div) {
          const summary = div.textContent;
          eq.node.note.value = summary;
          if (/^(Soulbound|Unassigned|\d+)/.test(summary)) {
            clearInterval(tid);
            eq.node.lpr.value = '<';
            ifr.remove();
            return;
          } else if (/Response Error|Request Error|No data available|Unknown equip type/.test(summary)) {
            count = 9999;
          } else if (/Getting ranges/.test(summary)) {
            count++;
          } else {
            count++;
          }
        } else {
          count++;
        }
        if (count > 100) {
          clearInterval(tid);
          eq.node.lpr.value = '<';
          eq.node.note.style.width = '250px';
          if (!div) {
            eq.node.note.value = "Couldn't load Percentile Range script";
          }
          setTimeout(() => {
            eq.node.note.value = value;
            eq.node.note.style.width = '';
            ifr.remove();
          }, 3000);
        }
      }, 100);
    }

    eq.node.lpr.value = '...';
    const ifr = $element('iframe', document.body, { style: 'display: none;' }, { load: (e) => { load(e); } });
    ifr.src = `equip/${eq.info.eid}/${eq.info.key}`;
  };

  _in.set_rangeselect = function () {
    const inv_equip = [];
    const inv_eqstor = [];
    $qsa('#eqinv_outer .eqp').forEach((w) => {
      if ((w.firstElementChild.getAttribute('onclick') || '').includes('equips.lock')) {
        inv_equip.push(w.lastElementChild.dataset.eid);
      } else {
        inv_eqstor.push(w.lastElementChild.dataset.eid);
      }
    });
    _window.rangeselect.inv_equip = inv_equip;
    _window.rangeselect.inv_eqstor = inv_eqstor;
  };

  _in.wts = function () {
    const equiplist = _in.equiplist.filter((e) => e.node.check.checked);
    const eid_maxlen = Math.max(...equiplist.map((e) => e.info.eid.toString().length));
    let code = '';
    let code_new = '';
    let code_featured = '';

    equiplist.sort((a, b) => {
      if (a.info.category !== b.info.category) {
        return $equip.index.category[a.info.category] - $equip.index.category[b.info.category];
      } else if (a.info.category === 'Unknown') {
        return a.info.name > b.info.name ? 1 : a.info.name < b.info.name ? -1 : 0;
      } else if (a.info.type !== b.info.type) {
        return $equip.index.type[a.info.type] - $equip.index.type[b.info.type];
      }

      let r = 0;
      const k = a.info.category === 'One-handed Weapon' || a.info.category === 'Two-handed Weapon' ? ['suffix', 'quality', 'prefix']
        : a.info.category === 'Staff' ? ['prefix', 'suffix', 'quality']
        : a.info.type === 'Buckler' ? ['suffix', 'quality', 'prefix']
        : a.info.category === 'Shield' ? ['quality', 'suffix', 'prefix']
        : a.info.category === 'Cloth Armor' ? ['suffix', 'slot', 'quality', 'prefix']
        : ['slot', 'suffix', 'quality', 'prefix'];

      k.some((e) => {
        if (e in $equip.index) {
          r = ($equip.index[e][a.info[e]] || 99) - ($equip.index[e][b.info[e]] || 99);
        } else {
          r = a.info[e] > b.info[e] ? 1 : a.info[e] < b.info[e] ? -1 : 0;
        }
        return r;
      });

      return r || (b.info.eid - a.info.eid);
    });

    equiplist.forEach((eq, i, a) => {
      const p = a[i - 1] || { info: {} };
      if (eq.info.category !== p.info.category) {
        const category = eq.info.category;
        code += `\n\n\n[size=3][b][${category}][/b][/size]\n`;
      }

      switch (eq.info.category) {
        case 'One-handed Weapon':
        case 'Two-handed Weapon':
          if (eq.info.type !== p.info.type) {
            const type = eq.info.type || 'Unknown';
            code += `\n\n[size=2][b][${type}][/b][/size]\n\n`;
          } else if (eq.info.suffix !== p.info.suffix) {
            code += '\n';
          }
          break;
        case 'Staff':
          if (eq.info.type !== p.info.type) {
            const type = eq.info.type || 'Unknown';
            code += `\n\n[size=2][b][${type}][/b][/size]\n\n`;
          } else if (eq.info.prefix !== p.info.prefix) {
            code += '\n';
          }
          break;
        case 'Shield':
          if (eq.info.type !== p.info.type) {
            const type = eq.info.type || 'Unknown';
            code += `\n\n[size=2][b][${type}][/b][/size]\n\n`;
          }
          break;
        case 'Cloth Armor':
          if (eq.info.type !== p.info.type || eq.info.suffix !== p.info.suffix) {
            const type = eq.info.type ? eq.info.suffix || 'No Suffix' : 'Unknown';
            code += `\n\n[size=2][b][${type}][/b][/size]\n\n`;
          } else if (eq.info.slot !== p.info.slot) {
          //code += '\n';
          }
          break;
        case 'Light Armor':
        case 'Heavy Armor':
          if (eq.info.type !== p.info.type) {
            const type = eq.info.type || 'Unknown';
            code += `\n\n[size=2][b][${type}][/b][/size]\n\n`;
          } else if (eq.info.slot !== p.info.slot) {
            code += '\n';
          }
          break;
      }

      eq.data._eid = eq.info.eid.toString();
      const eid_len = eq.data._eid.length;
      if (eid_maxlen > eid_len) {
        eq.data._eid = '[color=transparent]' + '_'.repeat(eid_maxlen - eid_len) + '[/color]' + eq.data._eid;
      }
      if (!eq.data.url) {
        eq.data.url = `${location.origin}${location.pathname}equip/${eq.info.eid}/${eq.info.key}`;
      }
      //if (!eq.data.namecode) {
      $equip.namecode(eq);
      //}
      eq.data.price = eq.node.price.value;
      eq.data.note = eq.node.note.value;

      if (eq.data.note.includes('$featured;')) {
        eq.data['featured'] = true;
        eq.data.note = eq.data.note.replace('$featured;', '');
      } else {
        eq.data['featured'] = false;
      }
      if (eq.data.note.includes('$new;')) {
        eq.data['new'] = true;
        eq.data.note = eq.data.note.replace('$new;', '');
      } else {
        eq.data['new'] = false;
      }

      const equipcode = $config.settings.equipCode.replace(/\{\$(\w+)(\s*\?(.*?)(?::(.*?))?)?\}/g, (s, k, e, t, f) => {
        const v = (k in eq.data) ? eq.data[k] : (k in eq.info) ? eq.info[k] : '';
        if (!e) {
          return v ?? '';
        } else {
          const r = v ? t : f || '';
          return r.replace(/\$(\w+)/g, (s, k) => { const v = (k in eq.data) ? eq.data[k] : (k in eq.info) ? eq.info[k] : ''; return v ?? ''; });
        }
      }).trim();

      code += equipcode + '\n';
      if (eq.data['new']) {
        code_new += equipcode + '\n';
      }
      if (eq.data['featured']) {
        code_featured += equipcode + '\n';
      }
    });

    if (code_featured) {
      code = '\n\n\n[size=3][b][Featured][/b][/size]\n\n' + code_featured + code;
    }
    if (code_new) {
      code = '\n\n\n[size=3][b][Newly Added][/b][/size]\n\n' + code_new + code;
    }
    popup_text(code.trim() || '未选择装备。', 900, 500);
  };

  _in.save_json = function () {
    _in.equipdata = { version: _in.equipdata.version };
    _in.equiplist.forEach((eq) => {
      _in.equipdata[eq.info.eid] = { checked: eq.node.check.checked, price: eq.node.price.value, note: eq.node.note.value };
    });
    $config.set('equipdata', _in.equipdata);
  };

  _in.load_json = function () {
    _in.equiplist.forEach((eq) => {
      const j = _in.equipdata[eq.info.eid] || {};
      eq.node.check.checked = j.checked;
      eq.node.price.value = j.price || '';
      eq.node.note.value = j.note || '';
    });
  };

  _in.check_name = function (equiplist) {
    async function load(eq) {
      const html = await $ajax.fetch(`equip/${eq.info.eid}/${eq.info.key}`);
      const doc = $doc(html);
      const equipname = Array.from($id('equip_extended', doc).previousElementSibling.firstElementChild.children).map((d) => d.textContent.trim() || ' ').join('').replace(/\b(Of|The)\b/, (s) => s.toLowerCase());
      if (equipname && equipname !== eq.info.name) {
        eq.info.customname = eq.info.name;
        eq.info.name = equipname;
        $equip.parse.name(eq.info.name, eq);
      }
      $equip.names[eq.info.eid] = eq.info.name;
      $config.set('equipnames', $equip.names);
    }
    equiplist.forEach((eq) => {
      if (eq.info.tier === 10 && !$equip.names[eq.info.eid]) {
        load(eq);
      }
    });
  };

  GM_addStyle(/*css*/`
    #eqinv_outer { position: relative; width: 1100px; margin-left: 120px; }
    .eqinv_pane > div:last-child { width: 540px; }
    .eqinv_pane .cspp { margin-top: 15px; overflow-y: scroll; }

    .hvut-in-side { top: 44px; left: -110px; }
    .hvut-in-side label { margin: 3px 0; line-height: 16px; white-space: nowrap; text-align: left; }

    .hvut-in-header { position: absolute; top: 5px; left: 0; width: 100%; text-align: center; font-size: 10pt; line-height: 16px; font-weight: bold; }
    .hvut-in-header > span { display: inline-block; margin: 0 10px; padding: 2px 5px; border: 1px solid; }
    .hvut-in-is { position: absolute; top: 4px; left: 4px; width: 10px; height: 10px; border: 1px dashed; }
    .il, .iu, .hvut-in-is { margin-top: 1px; }
    .hvut-in-ii { display: inline-block; position: relative; width: 22px; height: 20px; padding: 1px 0; vertical-align: middle; }

    .hvut-in-sub { position: absolute; right: 0; z-index: 1; }
    .hvut-in-untrade { color: #c00; }
    .hvut-in-untrade * { color: inherit !important; }
    .hvut-in-eid { visibility: hidden; position: absolute; right: 150px; padding: 0 3px; border: 1px solid; line-height: 20px; background-color: #fff; }
    .eqp:hover .hvut-in-eid { visibility: visible; }
    .hvut-in-sub .hvut-in-check { top: 3px; }
    .hvut-in-sub .hvut-in-price { width: 35px; margin: 0 1px; text-align: right; }
    .hvut-in-sub .hvut-in-note { width: 70px; margin: 0 1px; }
    .hvut-in-sub .hvut-in-lpr { display: none; width: 22px; margin: 0 1px; padding: 1px 0; border-radius: 0; border-color: currentColor !important; }
    .hvut-in-sub:hover > .hvut-in-note { width: 46px; }
    .hvut-in-sub:hover > .hvut-in-lpr { display: inline-block; }
  `);

  if ($config.settings.equipInventoryIntegration) {
    const filterbar = $id('filterbar');
    $element('a', [filterbar, 'afterbegin'], { href: '?s=Character&ss=in', innerHTML: '<div>All</div>' });
    if (_query.filter) {
      filterbar.children[0].children[0].classList.add('cfb');
    } else {
      filterbar.children[0].children[0].classList.add('cfbs');
      filterbar.children[1].children[0].classList.remove('cfbs');
      filterbar.children[1].children[0].classList.add('cfb');
    }
  }

  if (_query.filter || !$config.settings.equipInventoryIntegration) {
    $equip.list($qs('#inv_equip .equiplist'));
    $equip.list($qs('#inv_eqstor .equiplist'));
    _in.set_rangeselect();
  } else {
    GM_addStyle(/*css*/`
      .eqinv_pane > div:first-child { display: none; }
    `);
    $id('eqinv_bot').firstElementChild.firstElementChild.firstElementChild.prepend(
      $element('div', null, ['.hvut-in-ii', '/<div class="il"></div>']),
      $element('div', null, ['.hvut-in-ii', '/<div class="iu"></div>'])
    );
    $id('eqinv_bot').lastElementChild.firstElementChild.firstElementChild.prepend(
      $element('div', null, ['.hvut-in-ii', '/<div class="hvut-in-is"></div>'])
    );

    $id('eqinv_outer').addEventListener('click', _in.click);
    _in.node.side = $element('div', $id('eqinv_outer'), ['.hvut-side hvut-in-side']);
    $input(['button', '排序: 分类'], _in.node.side, null, () => { _in.sort_list('category'); });
    $input(['button', '排序: 名称'], _in.node.side, null, () => { _in.sort_list('name'); });
    $input(['button', '排序: 编号'], _in.node.side, { className: 'hvut-side-margin' }, () => { _in.sort_list('eid'); });
    $input(['button', '装备代码'], _in.node.side, null, () => { _in.wts(); });
    $input(['checkbox', '全选'], _in.node.side, null, (e) => { _in.check_list('all', e.target.checked); });
    $input(['checkbox', '可交易'], _in.node.side, null, (e) => { _in.check_list('tradeable', e.target.checked); });
    $input(['checkbox', '反选'], _in.node.side, null, () => { _in.check_list('invert'); });
    $input(['button', '保存'], _in.node.side, null, () => { _in.save_json(); });
    $input(['button', '还原'], _in.node.side, null, () => { _in.load_json(); });
    $input(['button', '编辑代码'], _in.node.side, null, () => { $config.open('equipCode'); });

    $element('div', [$id('inv_equip'), 'beforebegin'], ['.hvut-in-header hvut-cphu-sub']);
    $element('div', [$id('inv_eqstor'), 'beforebegin'], ['.hvut-in-header hvut-cphu-sub']);

    _in.init_list('1handed');
    _in.get_list('1handed', $id('eqinv_outer'));
    $qs('#inv_equip .equiplist').remove();
    $qs('#inv_eqstor .equiplist').remove();

    const requests = ['2handed', 'staff', 'shield', 'acloth', 'alight', 'aheavy'].map((filter) => _in.load_list(filter));
    Promise.all(requests).then(() => {
    //
    });
  }
} else
// [END 6] Character - Equip Inventory */


//* [7] Character - Settings
if (_query.s === 'Character' && _query.ss === 'se') {
  _se.form = $qs('#settings_outer form');
  _se.elements = Array.from(_se.form.elements);
  _se.json = $config.get('se_settings', {});
  _se.node = {};

  _se.click = function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) {
      return;
    }
    const { action, key } = target.dataset;
    if (action === 'load') {
      _se.load(key);
    } else if (action === 'remove') {
      _se.remove(key);
    } else if (action === 'save') {
      _se.save();
    }
  };
  _se.add = function (name) {
    _se.node[name] = $input(['button', name], _se.div, { dataset: { action: 'load', key: name }, className: 'hvut-se-button' });
    $input(['button', 'x'], _se.div, { dataset: { action: 'remove', key: name }, className: 'hvut-se-remove' });
  };
  _se.save = function () {
    const name = prompt('输入设置名称')?.trim();
    if (!name) {
      return;
    }
    if (!_se.json[name]) {
      _se.add(name);
    }
    const form = new FormData(_se.form);
    const json = Object.fromEntries(form.entries());
    _se.json[name] = json;
    $config.set('se_settings', _se.json);
  };
  _se.load = function (name) {
    const json = _se.json[name];
    _se.elements.forEach((e) => {
      if (e.type === 'button' || e.type === 'reset' || e.type === 'image' || e.type === 'submit') {
        return;
      }
      if (e.type === 'checkbox') {
        e.checked = json[e.name];
      } else if (e.type === 'radio') {
        e.checked = json[e.name] === e.value;
      } else {
        e.value = json[e.name];
      }
    });
  };
  _se.remove = function (name) {
    delete _se.json[name];
    $config.set('se_settings', _se.json);
    _se.node[name].nextElementSibling.remove();
    _se.node[name].remove();
  };

  GM_addStyle(/*css*/`
    .hvut-se-div { margin-top: 20px; padding: 20px 0; border-top: 3px double; text-align: left; }
    .hvut-se-div .hvut-se-button { min-width: 50px; margin: 0 30px 10px 10px; }
    .hvut-se-div .hvut-se-remove { visibility: hidden; width: 22px; margin-left: -30px; }
    .hvut-se-button:hover + .hvut-se-remove, .hvut-se-remove:hover { visibility: visible; }
  `);

  _se.div = $element('div', _se.form, ['.hvut-se-div'], (e) => { _se.click(e); });
  $input(['button', '保存当前设置'], _se.div, { dataset: { action: 'save' }, style: 'margin-bottom: 15px;' });
  $element('br', _se.div);

  Object.keys(_se.json).forEach((p) => { _se.add(p); });

  _se.elements.forEach((e) => {
    if (e.nodeName === 'SELECT') {
      const value = e.value;
      const options = Array.from(e.options);
      options.sort((a, b) => { let av = a.value; let bv = b.value; if (av && !isNaN(av) && bv && !isNaN(bv)) { av = Number(av); bv = Number(bv); } return (av > bv ? 1 : -1); });
      e.append(...options);
      e.value = value;
    }
  });

  _se.form.fontlocal.required = true;
  _se.form.fontface.required = true;
  _se.form.fontsize.required = true;
  _se.form.fontface.placeholder = 'Tahoma, Arial';
  _se.form.fontsize.placeholder = '10';
  _se.form.fontoff.placeholder = '0';
} else
// [END 7] Character - Settings */


//* [8] Bazaar - Equipment Shop
if (_query.s === 'Bazaar' && _query.ss === 'es') {
  _es.filter = _query.filter || '1handed';
  _es.rare_type = { 'Force Shield': true, 'Phase': true, 'Shade': true, 'Power': true };
  _es.mat_type = { '1handed': 'Metals', '2handed': 'Metals', 'staff': 'Wood', 'shield': 'Wood', 'acloth': 'Cloth', 'alight': 'Leather', 'aheavy': 'Metals' };
  _es.core_type = { '1handed': 'Weapon', '2handed': 'Weapon', 'staff': 'Staff', 'shield': 'Armor', 'acloth': 'Armor', 'alight': 'Armor', 'aheavy': 'Armor' };
  _es.quality = { 'Flimsy': 1, 'Crude': 2, 'Fair': 3, 'Average': 4, 'Fine': 5, 'Superior': 6, 'Exquisite': 7, 'Magnificent': 8, 'Legendary': 9, 'Peerless': 10 };
  _es.category = { 'valuable': {}, '1handed': {}, '2handed': {}, 'staff': {}, 'shield': {}, 'acloth': {}, 'alight': {}, 'aheavy': {} };
  _es.storetoken = $id('shopform').elements.storetoken.value;
  _es.prices = $price.get('Materials');
  _es.item_pane_equips = [];
  _es.shop_pane_equips = [];
  _es.node = {};

  _es.click = function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) {
      return;
    }
    const { action, eid, pane } = target.dataset;
    if (pane === 'item') {
      const eq = eid && _es.item_pane_equips.find((eq) => eq.info.eid == eid);
      if (action === 'sell') {
        _es.sell(eq);
      } else if (action === 'salvage') {
        _es.salvage(eq);
      } else if (action === 'transfer') {
        _es.transfer(eq);
      } else if (action === 'popup') {
        _es.showequip(eq, pane);
      }
    } else if (pane === 'shop') {
      const eq = eid && _es.shop_pane_equips.find((eq) => eq.info.eid == eid);
      if (action === 'buy') {
        _es.shop_buy(eq);
      } else if (action === 'salvage') {
        _es.shop_salvage(eq);
      } else if (action === 'popup') {
        _es.showequip(eq, pane);
      }
    }
  };

  _es.sell = async function (eq, ask = true) {
    if (eq.data.sold) {
      return;
    }
    if (eq.node.div.dataset.locked != '0') {
      alert('该装备已锁定。');
      return;
    }
    if (ask && ($config.settings.equipmentShopConfirm === 2 || $config.settings.equipmentShopConfirm === 1 && eq.data.salvage_recommended || $config.settings.equipmentShopConfirm > 0 && eq.data.valuable)) {
      let msg = `确定要出售\n[${eq.info.name}]\n换取 ${eq.data.value.toLocaleString()} 绅士币吗?`;
      if (eq.data.salvage_recommended) {
        msg += '\n分解材料的价值更高。';
      }
      if (!confirm(msg)) {
        return;
      }
    }
    eq.data.sold = true;
    eq.node.wrapper.classList.add('hvut-es-disabled');

    const html = await $ajax.fetch('?s=Bazaar&ss=es', `storetoken=${_es.storetoken}&select_group=item_pane&select_eids=${eq.info.eid}`);
    _es.update_credits(html);
    eq.node.wrapper.remove();
  };

  _es.salvage = async function (eq, ask = true) {
    if (eq.data.sold) {
      return;
    }
    if (eq.node.div.dataset.locked != '0') {
      alert('该装备已锁定。');
      return;
    }
    if (ask && ($config.settings.equipmentShopConfirm === 2 || $config.settings.equipmentShopConfirm === 1 && !eq.data.salvage_recommended || $config.settings.equipmentShopConfirm > 0 && eq.data.valuable)) {
      let msg = `确定要分解\n[${eq.info.name}]\n吗?`;
      if (!eq.data.salvage_recommended) {
        msg += '\n出售能换取更多绅士币。';
      }
      if (!confirm(msg)) {
        return;
      }
    }
    eq.data.sold = true;
    eq.node.wrapper.classList.add('hvut-es-disabled');

    await $ajax.fetch('?s=Forge&ss=sa&filter=' + eq.data.filter, 'select_item=' + eq.info.eid);
    eq.node.wrapper.remove();
  };

  _es.transfer = async function (eq, equipgroup = 'inv_equip') {
    if (eq.data.sold) {
      return;
    }
    eq.data.sold = true;
    eq.node.wrapper.classList.add('hvut-es-disabled');

    // 'inv_equip': to storage, 'inv_eqstor': to inventory
    await $ajax.fetch('?s=Character&ss=in', `equiplist=${eq.info.eid}&equipgroup=${equipgroup}`);
    eq.node.wrapper.remove();
  };

  _es.shop_buy = async function (eq, ask = true) {
    if (eq.data.sold) {
      return;
    }
    if (ask && !confirm(`确定要购买\n[${eq.info.name}]\n换取 ${eq.data.value.toLocaleString()} 绅士币吗?`)) {
      return;
    }
    eq.data.sold = true;
    eq.node.wrapper.classList.add('hvut-es-disabled');

    const html = await $ajax.fetch('?s=Bazaar&ss=es', `storetoken=${_es.storetoken}&select_group=shop_pane&select_eids=${eq.info.eid}`);
    _es.update_credits(html);
    eq.node.wrapper.remove();
  };

  _es.shop_salvage = async function (eq, ask = true) {
    if (eq.data.sold || ask && !confirm(`确定要购买\n[${eq.info.name}]\n并随即分解它吗?`)) {
      return;
    }
    eq.data.sold = true;
    eq.node.wrapper.classList.add('hvut-es-disabled');

    const html = await $ajax.fetch('?s=Bazaar&ss=es', `storetoken=${_es.storetoken}&select_group=shop_pane&select_eids=${eq.info.eid}`);
    const uid = /var uid = (\d+);/.exec(html)[1];
    const simple_token = /var simple_token = "(\w+)";/.exec(html)[1];
    _es.update_credits(html);

    await $ajax.fetch('json', { type: 'simple', method: 'lockequip', uid: uid, token: simple_token, eid: eq.info.eid, lock: 0 }, 'JSON');
    await $ajax.fetch('?s=Forge&ss=sa&filter=' + eq.data.filter, 'select_item=' + eq.info.eid);
    eq.node.wrapper.remove();
  };

  _es.showequip = function (eq) {
    window.open(`equip/${eq.info.eid}/${eq.info.key}`, '_blank');
  };

  _es.is_selected = function (eq) {
    return /rgb\(0,\s*48,\s*203\)|#0030CB/i.test(eq.node.div.style.color); // later, may need hex2rgb
  };

  _es.select_all = function (v) {
    const s = v === 'salvage' ? true : v === 'sell' ? false : 'all';
    const ctrlclick = new MouseEvent('click', { ctrlKey: true });
    _es.item_pane_equips.forEach((eq) => {
      if (eq.node.div.dataset.locked != '0') {
        return;
      }
      if (eq.data.valuable) {
        if (_es.is_selected(eq)) {
          eq.node.div.dispatchEvent(ctrlclick);
        }
        return;
      }
      if (_es.is_selected(eq) !== (eq.data.salvage_recommended === s || s === 'all')) {
        eq.node.div.dispatchEvent(ctrlclick);
      }
    });
  };

  _es.sell_all = async function () {
    const selected = [];
    const valuable = [];
    const salvage = [];
    let sum = 0;

    _es.item_pane_equips.forEach((eq) => {
      if (eq.data.sold || !_es.is_selected(eq) || eq.node.div.dataset.locked != '0') {
        return;
      }
      selected.push(eq);
      if (eq.data.valuable) {
        valuable.push(eq.info.name);
      } else if (eq.data.salvage_recommended) {
        salvage.push(eq.info.name);
      }
      sum += eq.data.value;
    });

    if (!selected.length) {
      return;
    }
    if ($config.settings.equipmentShopConfirm === 2 || $config.settings.equipmentShopConfirm === 1 && salvage.length || valuable.length) {
      let msg = `确定要出售 ${selected.length} 件装备换取 ${sum.toLocaleString()} 绅士币吗?`;
      if (salvage.length) {
        msg += `\n其中 ${salvage.length} 件分解更划算。`;
      }
      if (valuable.length) {
        msg += `\n\n其中 ${valuable.length} 件名称贵重。确定吗?\n${valuable.join('\n')}`;
      }
      if (!confirm(msg)) {
        return;
      }
    }
    selected.forEach((eq) => {
      eq.data.sold = true;
      eq.node.wrapper.classList.add('hvut-es-disabled');
    });

    const select_eids = selected.map((eq) => eq.info.eid).join(',');
    const html = await $ajax.fetch('?s=Bazaar&ss=es', `storetoken=${_es.storetoken}&select_group=item_pane&select_eids=${select_eids}`);
    _es.update_credits(html);
    selected.forEach((eq) => { eq.node.wrapper.remove(); });
  };

  _es.salvage_all = function () {
    const selected = [];
    const valuable = [];
    const sell = [];

    _es.item_pane_equips.forEach((eq) => {
      if (eq.data.sold || !_es.is_selected(eq) || eq.node.div.dataset.locked != '0') {
        return;
      }
      selected.push(eq);
      if (eq.data.valuable) {
        valuable.push(eq.info.name);
      } else if (!eq.data.salvage_recommended) {
        sell.push(eq.info.name);
      }
    });

    if (!selected.length) {
      return;
    }
    if ($config.settings.equipmentShopConfirm === 2 || $config.settings.equipmentShopConfirm === 1 && sell.length || valuable.length) {
      let msg = `确定要分解选中的 ${selected.length} 件装备吗?`;
      if (sell.length) {
        msg += `\n其中 ${sell.length} 件出售更划算。`;
      }
      if (valuable.length) {
        msg += `\n\n其中 ${valuable.length} 件名称贵重。确定吗?\n${valuable.join('\n')}`;
      }
      if (!confirm(msg)) {
        return;
      }
    }
    selected.forEach((eq) => { _es.salvage(eq, false); });
  };

  _es.salvage_mats = function (eq, d) {
    if (eq.data.salvage_mats) {
      return;
    }
    eq.data.salvage_mats = {};
    if (!eq.info.tradeable) {
      //return;
    }
    const q = _es.quality[eq.info.quality];
    const t = _es.mat_type[eq.data.filter];
    let value = eq.data.value;

    if (d) {
      value = Math.ceil(value / d);
    }
    if (!q) { // obsolete or unknown
    } else if (q < 6) {
      const scrap = 'Scrap ' + (t === 'Metals' ? 'Metal' : t);
      eq.data.salvage_mats[scrap] = Math.min(10, Math.ceil(value / 100));
    } else {
      const mat = (q === 6 ? 'Low-Grade ' : q === 7 ? 'Mid-Grade ' : 'High-Grade ') + t;
      eq.data.salvage_mats[mat] = !$config.isekai ? 1 : q === 6 ? 3 : q === 7 ? 2 : 1;
    }
    if (q >= 9) {
      const core = (q === 9 ? 'Legendary ' : 'Peerless ') + _es.core_type[eq.data.filter] + ' Core';
      eq.data.salvage_mats[core] = _es.rare_type[eq.info.type] ? 5 : 1;
    }
    if (_es.rare_type[eq.info.type]) {
      const cell = 'Energy Cell';
      eq.data.salvage_mats[cell] = 1; //Math.max(1, s[1] / 2);
    }
  };

  _es.salvage_calc = function (eq) {
    eq.data.salvage_value = Object.entries(eq.data.salvage_mats).reduce((s, [k, v]) => (s + (_es.prices[k] || 0) * v), 0);
  };

  _es.update_credits = function (html) {
    const doc = $doc(html);
    const networth = parseInt($id('networth', doc).textContent.replace(/\D/g, ''));
    $id('networth').textContent = '绅士币: ' + networth.toLocaleString();
  };

  _es.init_list = function (filter) {
    _es.category[filter].item_div = $element('div', $id('item_pane'), ['.equiplist nosel']);
    _es.category[filter].shop_div = $element('div', $id('shop_pane'), ['.equiplist nosel']);
    $element('p', _es.category[filter].item_div, [$equip.alias[filter], '.hvut-eq-category']);
    $element('p', _es.category[filter].shop_div, [$equip.alias[filter], '.hvut-eq-category']);
  };

  _es.load_list = async function (filter) {
    _es.init_list(filter);
    _es.category[filter].item_div.classList.add('hvut-eq-loading');
    _es.category[filter].shop_div.classList.add('hvut-eq-loading');

    const html = await $ajax.fetch('?s=Bazaar&ss=es&filter=' + filter);
    const doc = $doc(html);
    Object.assign($equip.dynjs_eqstore, JSON.parse(/var dynjs_eqstore = (\{.*\});/.exec(html)?.[1] || null));
    Object.assign($equip.eqvalue, JSON.parse(/var eqvalue = (\{.*\});/.exec(html)?.[1] || null));
    _es.item_pane_init(filter, $qs('#item_pane .equiplist', doc));
    _es.shop_pane_init(filter, $qs('#shop_pane .equiplist', doc));
    _es.category[filter].item_div.classList.remove('hvut-eq-loading');
    _es.category[filter].shop_div.classList.remove('hvut-eq-loading');
    _es.set_rangeselect();
  };

  _es.item_pane_init = function (filter, outer) {
    const equiplist = $equip.list(outer, false);
    const protect_filter = $config.settings.equipmentShopProtectFilters;

    equiplist.forEach((eq) => {
      eq.data.filter = filter;
      eq.data.valuable = $equip.filter(protect_filter, eq.info.name);
      _es.salvage_mats(eq);

      eq.node.wrapper.classList.add('hvut-es-expand');
      if ($config.settings.equipmentShopShowLevel && eq.info.level) {
        $element('span', [eq.node.div, 'afterbegin'], [`[${eq.info.level}] `, '.hvut-es-level']);
      }
      if ($config.settings.equipmentShopShowPAB && eq.info.pab) {
        $element('span', eq.node.div, [` [${eq.info.pab}]`, '.hvut-es-pab']);
      }
      $element('span', eq.node.div, ['.hvut-es-check']);

      eq.node.lock = eq.node.wrapper.firstElementChild;
      eq.node.sub = $element('div', [eq.node.div, 'beforebegin'], ['.hvut-es-sub hvut-cphu-sub']);
      eq.node.sell = $element('span', eq.node.sub, [`Sell ${eq.data.value}`, { dataset: { action: 'sell', eid: eq.info.eid, pane: 'item' } }]);
      eq.node.salvage = $element('span', eq.node.sub, [{ dataset: { action: 'salvage', eid: eq.info.eid, pane: 'item' } }]);
      if (eq.info.tier) {
        $element('span', eq.node.sub, [`IW ${eq.info.tier}`, '.hvut-es-bold', { dataset: { action: 'popup', eid: eq.info.eid, pane: 'item' } }]);
      }
      eq.node.transfer = $element('span', eq.node.sub, ['Transfer to Storage', { dataset: { action: 'transfer', eid: eq.info.eid, pane: 'item' } }]);

      if (eq.data.valuable) {
        eq.node.transfer.classList.add('hvut-es-bold');
      }
      _es.item_pane_calc(eq);
    });
    _es.item_pane_equips.push(...equiplist);

    const valuable = equiplist.filter((eq) => eq.data.valuable);
    if (valuable.length) {
      _es.category['valuable'].item_div.append(...valuable.map((eq) => eq.node.wrapper));
      valuable.forEach((eq) => {
        if ($config.settings.equipmentShopAutoLock && eq.node.div.dataset.locked == '0') {
          eq.node.lock.click();
        }
      });
    }

    const sell = equiplist.filter((eq) => !eq.data.valuable);
    if (sell.length) {
      _es.category[filter].item_div.append(...sell.map((eq) => eq.node.wrapper));
    }
  };

  _es.item_pane_calc = function (eq) {
    _es.salvage_calc(eq);
    eq.node.salvage.textContent = `分解 ${eq.data.salvage_value}`;

    if (eq.data.salvage_value > eq.data.value) {
      eq.data.salvage_recommended = true;
      eq.node.salvage.classList.add('hvut-es-bold');
      eq.node.sell.classList.remove('hvut-es-bold');
    } else {
      eq.data.salvage_recommended = false;
      eq.node.salvage.classList.remove('hvut-es-bold');
      eq.node.sell.classList.add('hvut-es-bold');
    }
  };

  _es.shop_pane_init = function (filter, outer) {
    const equiplist = $equip.list(outer, false);
    const bazaar_filter = $config.settings.equipmentShopBazaarFilters;

    equiplist.forEach((eq) => {
      eq.data.filter = filter;
      eq.data.valuable = bazaar_filter.length && $equip.filter(bazaar_filter, eq.info.name, eq);
      _es.salvage_mats(eq, 5);

      if ($config.settings.equipmentShopShowLevel && eq.info.level) {
        $element('span', [eq.node.div, 'afterbegin'], [`[${eq.info.level}] `, '.hvut-es-level']);
      }
      if ($config.settings.equipmentShopShowPAB && eq.info.pab) {
        $element('span', eq.node.div, [` [${eq.info.pab}]`, '.hvut-es-pab']);
      }
      eq.node.check = $element('span', null, ['.hvut-es-check']);

      eq.node.sub = $element('div', null, ['.hvut-es-sub hvut-cphu-sub']);
      eq.node.buy = $element('span', eq.node.sub, [`购买 ${eq.data.value}`, { dataset: { action: 'buy', eid: eq.info.eid, pane: 'shop' } }]);
      eq.node.salvage = $element('span', eq.node.sub, [{ dataset: { action: 'salvage', eid: eq.info.eid, pane: 'shop' } }]);
      if (eq.info.tier) {
        $element('span', eq.node.sub, [`IW ${eq.info.tier}`, '.hvut-es-bold', { dataset: { action: 'popup', eid: eq.info.eid, pane: 'shop' } }]);
      }

      _es.shop_pane_calc(eq);
    });
    _es.shop_pane_equips.push(...equiplist);
    $equip.sort(equiplist, _es.category[filter].shop_div);
    _es.shop_pane_list(_es.category[filter].shop_div);
  };

  _es.shop_pane_calc = function (eq) {
    _es.salvage_calc(eq);
    eq.node.salvage.textContent = `分解 ${eq.data.salvage_value}`;

    let visible = false;
    if (eq.data.valuable) {
      visible = true;
    }
    if (eq.data.salvage_value > eq.data.value) {
      visible = true;
      eq.node.salvage.classList.add('hvut-es-bold');
      eq.node.salvage.classList.remove('hvut-none');
    } else {
      eq.node.salvage.classList.remove('hvut-es-bold');
      eq.node.salvage.classList.add('hvut-none');
    }
    if (!eq.info.tradeable) {
      visible = false;
    }
    if (visible) {
      eq.node.div.append(eq.node.check);
      eq.node.div.before(eq.node.sub);
      eq.node.wrapper.classList.add('hvut-es-expand');
      eq.node.wrapper.classList.remove('hvut-none-item');
    } else {
      eq.node.check.remove();
      eq.node.sub.remove();
      eq.node.wrapper.classList.remove('hvut-es-expand');
      eq.node.wrapper.classList.add('hvut-none-item');
    }
  };

  _es.shop_pane_list = function (div = document) {
    $qsa('.hvut-eq-type', div).forEach((div) => {
      let next = div;
      let eqp;
      while ((next = next.nextElementSibling)) {
        if (!next.classList.contains('eqp')) {
          break;
        }
        if (!next.classList.contains('hvut-none-item')) {
          eqp = true;
          break;
        }
      }
      if (eqp) {
        div.classList.remove('hvut-none-item');
      } else {
        div.classList.add('hvut-none-item');
      }
    });
  };

  _es.edit_price = function () {
    _es.prices = $price.get('Materials');
    _es.item_pane_equips.forEach((eq) => {
      _es.item_pane_calc(eq);
    });
    _es.shop_pane_equips.forEach((eq) => {
      _es.shop_pane_calc(eq);
    });
    _es.shop_pane_list();
  };

  _es.set_rangeselect = function () {
    _window.rangeselect.item_pane = $qsa('#item_pane .eqp').map((w) => w.lastElementChild.dataset.eid);
    _window.rangeselect.shop_pane = $qsa('#shop_pane .eqp').map((w) => w.lastElementChild.dataset.eid);
  };

  GM_addStyle(/*css*/`
    #eqshop_outer { position: relative; width: 1100px; margin-left: 120px; }
    .eqshop_pane > div:first-child { display: none; }
    .eqshop_pane > div:last-child { width: 540px; }
    .eqshop_pane .cspp { overflow-y: scroll; }
    #eqshop_sellall { display: none; }

    .hvut-es-side { top: 44px; left: -110px; }
    .hvut-es-side input { margin: 3px 0; white-space: normal; }

    .hvut-es-valuable { background-color: #fff; }
    .eqp.hvut-es-expand { height: 44px; }
    .hvut-es-level { display: inline-block; min-width: 35px; margin-right: 5px; }
    .hvut-es-pab { position: absolute; left: 490px; width: 0; direction: rtl; pointer-events: none; }
    .hvut-es-check { position: absolute; top: 25px; left: 5px; width: 14px; height: 14px; border: 1px solid; color: #930; background-color: #fff; }
    .eqp > div:last-child[style*='color'] > .hvut-es-check::before { content: ''; position: absolute; top: 1px; left: 4px; width: 3px; height: 7px; border-right: 3px solid; border-bottom: 3px solid; transform: rotate(45deg); }
    .hvut-es-sub { position: absolute; top: 24px; left: 20px; font-size: 8pt; line-height: 18px; padding-left: 45px; }
    .hvut-es-sub > * { margin-right: 10px; }
    .hvut-es-bold { font-weight: bold; }
    .hvut-es-disabled > div { text-decoration: line-through; }
  `);

  _es.node.side = $element('div', $id('eqshop_outer'), ['.hvut-side hvut-es-side']);
  toggle_button($input('button', _es.node.side, { className: 'hvut-side-margin' }), '显示全部装备', '仅显示已筛选', $id('shop_pane'), 'hvut-none-cont', $config.settings.equipmentShopBazaarFilters.length);
  $input(['button', '选择:'], _es.node.side, null, () => { _es.select_all('sell'); });
  $input(['button', '出售'], _es.node.side, { className: 'hvut-side-margin' }, () => { _es.sell_all(); });
  $input(['button', '选择:'], _es.node.side, null, () => { _es.select_all('salvage'); });
  $input(['button', '分解'], _es.node.side, { className: 'hvut-side-margin' }, () => { _es.salvage_all(); });
  $input(['button', '编辑筛选'], _es.node.side, null, () => { $config.open('equipmentShopProtectFilters'); });
  $input(['button', '物品价格'], _es.node.side, null, () => { $price.edit('Materials', 'ma', _es.edit_price); });

  $id('item_pane').addEventListener('click', _es.click);
  $id('shop_pane').addEventListener('click', _es.click);

  _es.category['valuable'].item_div = $element('div', $id('item_pane'), ['.equiplist nosel hvut-es-valuable']);
  $element('p', _es.category['valuable'].item_div, ['[受保护: 贵重装备]', '.hvut-eq-category']);

  if ($config.settings.equipmentShopIntegration) {
    const filterbar = $id('filterbar');
    $element('a', [filterbar, 'afterbegin'], { href: '?s=Bazaar&ss=es', innerHTML: '<div>All</div>' });
    if (_query.filter) {
      filterbar.children[0].children[0].classList.add('cfb');
    } else {
      filterbar.children[0].children[0].classList.add('cfbs');
      filterbar.children[1].children[0].classList.remove('cfbs');
      filterbar.children[1].children[0].classList.add('cfb');
    }
  }

  if (_query.filter || !$config.settings.equipmentShopIntegration) {
    _es.init_list(_es.filter);
    const item_equiplist = $qs('#item_pane .equiplist');
    const shop_equiplist = $qs('#shop_pane .equiplist');
    _es.item_pane_init(_es.filter, $qs('#item_pane .equiplist'));
    _es.shop_pane_init(_es.filter, $qs('#shop_pane .equiplist'));
    item_equiplist.remove();
    shop_equiplist.remove();
    _es.set_rangeselect();
  } else {
    _es.category['valuable'].item_div.classList.add('hvut-eq-loading');

    _es.init_list('1handed');
    const item_equiplist = $qs('#item_pane .equiplist');
    const shop_equiplist = $qs('#shop_pane .equiplist');
    _es.item_pane_init('1handed', item_equiplist);
    _es.shop_pane_init('1handed', shop_equiplist);
    item_equiplist.remove();
    shop_equiplist.remove();

    const requests = ['2handed', 'staff', 'shield', 'acloth', 'alight', 'aheavy'].map((filter) => _es.load_list(filter));
    Promise.all(requests).then(() => {
      _es.category['valuable'].item_div.classList.remove('hvut-eq-loading');
    });
  }
} else
// [END 8] Bazaar - Equipment Shop */


//* [9] Bazaar - Item Shop
if (_query.s === 'Bazaar' && _query.ss === 'is') {
  $qsa('#item_pane .itemlist tr').forEach((tr) => {
    const div = tr.cells[0].firstElementChild;
    const type = $item.get_type(div.getAttribute('onmouseover'));
    tr.classList.add('hvut-it-' + type);
  });
  $qsa('#shop_pane .itemlist tr').forEach((tr) => {
    const div = tr.cells[0].firstElementChild;
    const type = $item.get_type(div.getAttribute('onmouseover'));
    tr.classList.add('hvut-it-' + type);
  });

  GM_addStyle(/*css*/`
    .itshop_pane .cspp { margin-top: 15px; overflow-y: scroll; }
    #itshop_outer .itemlist td:nth-child(1) { width: 285px !important; }
    #itshop_outer .itemlist td:nth-child(2) { width: 75px !important; }
  `);
} else
// [END 9] Bazaar - Item Shop */


//* [10] Bazaar - The Shrine
if (_query.s === 'Bazaar' && _query.ss === 'ss') {
  _ss.log = $config.get('ss_log', {});
  _ss.node = {};
  _ss.equip = { capacity: 0, current: 0, requests: 0, received: 0, sold: 0, salvaged: 0, total: 0 };
  _ss.items = {};
  _ss.trophy = {
    'ManBearPig Tail': { tier: 2, value: 1000 },
    'Holy Hand Grenade of Antioch': { tier: 2, value: 1000 },
    "Mithra's Flower": { tier: 2, value: 1000 },
    'Dalek Voicebox': { tier: 2, value: 1000 },
    'Lock of Blue Hair': { tier: 2, value: 1000 },
    'Bunny-Girl Costume': { tier: 3, value: 2000 },
    'Hinamatsuri Doll': { tier: 3, value: 2000 },
    'Broken Glasses': { tier: 3, value: 2000 },
    'Black T-Shirt': { tier: 4, value: 4000 },
    'Sapling': { tier: 4, value: 4000 },
    'Unicorn Horn': { tier: 5, value: 5000 },
    'Noodly Appendage': { value: 5000 },
  };
  _ss.item_index = [
    'Precursor Artifact',
    'Trophy Tier 2', 'Trophy Tier 3', 'Trophy Tier 4', 'Trophy Tier 5',
    'ManBearPig Tail', 'Holy Hand Grenade of Antioch', "Mithra's Flower", 'Dalek Voicebox', 'Lock of Blue Hair', 'Bunny-Girl Costume', 'Hinamatsuri Doll', 'Broken Glasses', 'Black T-Shirt', 'Sapling', 'Unicorn Horn', 'Noodly Appendage', 'Stocking Stuffers', "Tenbora's Box", 'Peerless Voucher',
    'Mysterious Box', 'Solstice Gift', 'Shimmering Present', 'Potato Battery', 'RealPervert Badge', 'Raptor Jesus', 'Rainbow Egg', 'Colored Egg', 'Gift Pony', 'Faux Rainbow Mane Cap', 'Pegasopolis Emblem', 'Fire Keeper Soul', 'Crystalline Galanthus', 'Sense of Self-Satisfaction', 'Six-Lock Box', 'Golden One-Bit Coin', 'USB ASIC Miner', 'Reindeer Antlers', 'Ancient Porn Stash', 'VPS Hosting Coupon', 'Heart Locket', 'Holographic Rainbow Projector', 'Pot of Gold', 'Dinosaur Egg', 'Precursor Smoothie Blender', 'Rainbow Smoothie', 'Mysterious Tooth', 'Grammar Nazi Armband', 'Abstract Wire Sculpture', 'Delicate Flower', 'Assorted Coins', "Coin Collector's Guide", 'Iron Heart', 'Shrine Fortune', 'Plague Mask', 'Festival Coupon', 'Annoying Gun',
    'Platinum Coupon', 'Golden Coupon', 'Silver Coupon', 'Bronze Coupon',
  ];
  _ss.item_group = {
    'Artifact': ['Energy Drink', '2 Hath', '1 Hath', 'Flower Vase', 'Bubble-Gum', 'Chaos Token', 'Last Elixir', '3x Last Elixir', { group: '1000x Crystal', items: ['1000x Crystal of Vigor', '1000x Crystal of Finesse', '1000x Crystal of Swiftness', '1000x Crystal of Fortitude', '1000x Crystal of Cunning', '1000x Crystal of Knowledge', '1000x Crystal of Flames', '1000x Crystal of Frost', '1000x Crystal of Lightning', '1000x Crystal of Tempest', '1000x Crystal of Devotion', '1000x Crystal of Corruption'] }, { group: '3000x Crystal', items: ['3000x Crystal of Vigor', '3000x Crystal of Finesse', '3000x Crystal of Swiftness', '3000x Crystal of Fortitude', '3000x Crystal of Cunning', '3000x Crystal of Knowledge', '3000x Crystal of Flames', '3000x Crystal of Frost', '3000x Crystal of Lightning', '3000x Crystal of Tempest', '3000x Crystal of Devotion', '3000x Crystal of Corruption'] }, { group: '5000x Crystal', items: ['5000x Crystal of Vigor', '5000x Crystal of Finesse', '5000x Crystal of Swiftness', '5000x Crystal of Fortitude', '5000x Crystal of Cunning', '5000x Crystal of Knowledge', '5000x Crystal of Flames', '5000x Crystal of Frost', '5000x Crystal of Lightning', '5000x Crystal of Tempest', '5000x Crystal of Devotion', '5000x Crystal of Corruption'] }, { group: 'Primary Attributes Bonus', items: ['Your strength has increased by one', 'Your dexterity has increased by one', 'Your agility has increased by one', 'Your endurance has increased by one', 'Your intelligence has increased by one', 'Your wisdom has increased by one', 'Strength was increased by 1', 'Dexterity was increased by 1', 'Agility was increased by 1', 'Endurance was increased by 1', 'Intelligence was increased by 1', 'Wisdom was increased by 1'] }],
    'Trophy': ['Peerless', 'Legendary', 'Magnificent', 'Exquisite', 'Superior', 'Average'],
    'Collectable': [{ group: '3x High-Grade Material', items: ['3x High-Grade Cloth', '3x High-Grade Leather', '3x High-Grade Metals', '3x High-Grade Wood'] }, { group: '2x High-Grade Material', items: ['2x High-Grade Cloth', '2x High-Grade Leather', '2x High-Grade Metals', '2x High-Grade Wood'] }, { group: '1x High-Grade Material', items: ['1x High-Grade Cloth', '1x High-Grade Leather', '1x High-Grade Metals', '1x High-Grade Wood'] }, { group: 'Binding', items: ['Binding of Slaughter', 'Binding of Balance', 'Binding of Isaac', 'Binding of Destruction', 'Binding of Focus', 'Binding of Friendship', 'Binding of Protection', 'Binding of Warding', 'Binding of the Fleet', 'Binding of the Barrier', 'Binding of the Nimble', 'Binding of Negation', 'Binding of the Elementalist', 'Binding of the Heaven-sent', 'Binding of the Demon-fiend', 'Binding of the Curse-weaver', 'Binding of the Earth-walker', 'Binding of Surtr', 'Binding of Niflheim', 'Binding of Mjolnir', 'Binding of Freyr', 'Binding of Heimdall', 'Binding of Fenrir', 'Binding of Dampening', 'Binding of Stoneskin', 'Binding of Deflection', 'Binding of the Fire-eater', 'Binding of the Frost-born', 'Binding of the Thunder-child', 'Binding of the Wind-waker', 'Binding of the Thrice-blessed', 'Binding of the Spirit-ward', 'Binding of the Ox', 'Binding of the Raccoon', 'Binding of the Cheetah', 'Binding of the Turtle', 'Binding of the Fox', 'Binding of the Owl'] }],
  };

  _ss.click = function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) {
      return;
    }
    const { action, iid, count, type, slot } = target.dataset;
    if (action === 'offer') {
      _ss.offer(iid, count);
    } else if (action === 'select') {
      e.preventDefault();
      _ss.select(type, slot);
    }
  };

  _ss.select = function (type, slot) {
    const target = _ss.node.select[type + (slot ? ' ' + slot : '')];
    if (_ss.node.selected === target) {
      target.classList.remove('hvut-ss-selected');
      _ss.node.selected = null;
    } else {
      _ss.node.selected?.classList.remove('hvut-ss-selected');
      target.classList.add('hvut-ss-selected');
      _ss.node.selected = target;
    }
  };

  _ss.offer = function (iid, count) {
    if (_ss.error) {
      popup(_ss.error);
      return;
    }
    const item = _ss.items[iid];
    if (count === 'max') {
      count = item.max;
    } else if (count === 'input') {
      count = parseInt(item.node.count.value);
    } else {
      count = parseInt(count);
    }
    if (count > item.max) {
      count = item.max;
    }
    if (!count || count < 0) {
      return;
    }

    let select_reward_type;
    let select_reward_slot;
    if (item.type === 'Trophy') {
      if (_ss.node.selected && !_ss.node.selected.disabled) {
        select_reward_type = _ss.node.selected.dataset.type;
        select_reward_slot = _ss.node.selected.dataset.slot;
      } else {
        alert('请选择装备的主分类。');
        return;
      }
      _ss.equip.requests += count;
    } else { // Artifact, Collectable
      select_reward_type = '';
      select_reward_slot = '';
    }

    if (!_ss.log[item.log]) {
      _ss.log[item.log] = {};
    }
    if (!item.results) {
      item.results = _ss.create_list(item.type);
      item.node.span = $element('p', _ss.node.results, [($config.settings.translateNames ? $equip.$i18n.anyName(item.name) : item.name) + (item.upgrade ? ' => Tier ' + item.upgrade : '') + ' ', '.hvut-ss-p']).appendChild($element('span'));
      item.node.ul = $element('ul', _ss.node.results, ['.hvut-ss-ul']);
      Object.values(item.results).forEach((r) => { item.node.ul.appendChild(r.li).classList.add('hvut-none'); });
      scrollIntoView(item.node.ul);
    }
    _ss.node.results.classList.remove('hvut-none');

    item.requests += count;
    item.stock -= count * item.bulk;
    item.max -= count;
    item.node.stock.textContent = item.stock;
    item.node.max.textContent = item.max;

    for (let i = 0; i < count; i++) {
      _ss.request(iid, select_reward_type, select_reward_slot);
    }
  };

  _ss.request = async function (iid, select_reward_type, select_reward_slot) {
    const item = _ss.items[iid];
    const html = await $ajax.fetch('?s=Bazaar&ss=ss', `select_item=${iid}&select_reward_type=${select_reward_type}&select_reward_slot=${select_reward_slot}`);
    const doc = $doc(html);
    const results = item.results;
    const rewards = [];
    const reg = /Received (.+)|(Your .+ has increased by one|.+ was increased by 1)|((?:Crude|Fair|Average|Superior|Exquisite|Magnificent|Legendary|Peerless) .+)/;

    get_message(doc, true).forEach((msg) => {
      if (!msg || ['Snowflake has blessed you with some of her power!', 'Snowflake has blessed you with an item!', 'Received:', 'Hit Space Bar to offer another item like this.'].includes(msg)) {
        return;
      } else if (msg.includes('Peerless Voucher')) { // 'Received 1x Peerless Voucher!'
        popup(`<p style="color: #f00; font-weight: bold;">${msg}</p>`);
      } else if (msg.includes('Sold it for')) {
        _ss.equip.sold++;
      } else if (msg.includes('Salvaged it for')) { // Salvaged it for .+ (Peerless|Legendary) .+ Core
        _ss.equip.salvaged++;
      } else if (reg.test(msg)) {
        rewards.push(RegExp.$1 || RegExp.$2 || RegExp.$3);
      } else {
        _ss.error = msg;
        popup(msg);
      }
    });

    item.recieved++;
    item.node.span.textContent = `(${item.recieved}/${item.requests})`;

    rewards.forEach((n) => {
      const r = item.type === 'Trophy' ? n.split(' ')[0] : n;
      if (!_ss.log[item.log][r]) {
        _ss.log[item.log][r] = 0;
      }
      _ss.log[item.log][r]++;

      if (!results[r]) {
        results[r] = _ss.create_listitem(r);
        item.node.ul.appendChild(results[r].li);
      }
      if (!results[r].count) {
        results[r].li.classList.remove('hvut-none');
        if (results[r].group) {
          results[results[r].group].li.classList.remove('hvut-none');
        }
      }

      results[r].count++;
      if (results[r].group) {
        results[results[r].group].count++;
      }
      Object.keys(results).forEach((k) => {
        results[k].sp.textContent = (results[k].count * 100 / item.recieved).toFixed(1) + ' %';
        results[k].sc.textContent = ` [${results[k].count}] `;
      });

      if (item.type === 'Trophy') {
        if ($equip.filter($config.settings.shrineFilters, n)) {
          $element('li', [results[r].li, 'afterend'], [$config.settings.translateNames ? $equip.$i18n.equipName(n) : n, '.hvut-ss-equip']);
        }
        _ss.equip.received++;
        _ss.equip.total = _ss.equip.current + _ss.equip.received - _ss.equip.sold - _ss.equip.salvaged;
        _ss.node.results_equip.value = `装备格: ${_ss.equip.total} / ${_ss.equip.capacity}` + (_ss.equip.sold ? `, 已售: ${_ss.equip.sold}` : '') + (_ss.equip.salvaged ? `, 已分解: ${_ss.equip.salvaged}` : '');
        if (_ss.equip.total >= _ss.equip.capacity) {
          if (!_ss.error) {
            _ss.error = 'Your equipment inventory is full';
            popup(_ss.error);
          }
        }
      }
    });

    if (item.recieved % 10 === 0 || item.recieved === item.requests || _ss.error) {
      $config.set('ss_log', _ss.log);
    }
  };

  _ss.toggle_results = function () {
    _ss.node.results.classList.toggle('hvut-none');
  };

  _ss.view_log = function () {
    const div = _ss.node.log;
    div.innerHTML = '';

    const reg_artifact = /Energy Drink|Flower Vase|Bubble-Gum|Chaos Token|Hath|Last Elixir|\d+x Crystal of|has increased by one|was increased by 1/;
    const reg_trophy = /Peerless|Legendary|Magnificent|Exquisite|Superior|Average/;
    const reg_collectable = /High-Grade|Binding of/;

    object_sort(_ss.log, _ss.item_index);
    Object.entries(_ss.log).forEach(([n, log]) => {
      const keys = Object.keys(log);
      const type = keys.some((k) => reg_artifact.test(k)) ? 'Artifact' : keys.some((k) => reg_trophy.test(k)) ? 'Trophy' : keys.some((k) => reg_collectable.test(k)) ? 'Collectable' : null;
      const list = _ss.create_list(type);
      let total = Object.values(log).reduce((s, e) => (s + e), 0);
      if (type === 'Collectable') {
        total /= 2;
      }

      $element('p', div, [`${$config.settings.translateNames ? $equip.$i18n.anyName(n) : n} (${total})`, '.hvut-ss-p']);
      const ul = $element('ul', div, ['.hvut-ss-ul']);

      Object.entries(log).forEach(([r, c]) => {
        if (!list[r]) {
          list[r] = _ss.create_listitem(r);
        }
        list[r].count = c;
        if (list[r].group) {
          list[list[r].group].count += c;
        }
      });

      Object.keys(list).forEach((r) => {
        if (!list[r].count) {
          return;
        }
        list[r].sp.textContent = (list[r].count * 100 / total).toFixed(1) + ' %';
        list[r].sc.textContent = ` [${list[r].count}] `;
        ul.appendChild(list[r].li);
      });
    });
  };

  _ss.toggle_log = function () {
    if (_ss.node.log.classList.contains('hvut-none')) {
      _ss.view_log();
      _ss.node.log.classList.remove('hvut-none');
    } else {
      _ss.node.log.classList.add('hvut-none');
      _ss.node.log.innerHTML = '';
    }
  };

  _ss.create_list = function (type) {
    const list = {};
    const array = _ss.item_group[type] || [];
    array.forEach((r) => {
      if (typeof r === 'string') {
        list[r] = _ss.create_listitem(r);
      } else {
        const g = r.group;
        list[g] = _ss.create_listitem(g);
        r.items.forEach((m) => {
          list[m] = _ss.create_listitem(m, g);
        });
      }
    });
    return list;
  };

  _ss.create_listitem = function (r, g) {
    const item = { count: 0 };
    item.li = $element('li');
    item.sp = $element('span', item.li);
    item.sc = $element('span', item.li);
    $element('span', item.li, $config.settings.translateNames ? $equip.$i18n.anyName(r) : r);
    if (g) {
      item.group = g;
      item.li.classList.add('hvut-ss-group');
    }
    return item;
  };

  _ss.show_trophies = function () {
    popup_text(_ss.trophies_text, 600, 250);
  };

  GM_addStyle(/*css*/`
    #shrine_outer { position: relative; width: 1066px; margin-left: 130px; }
    #shrine_left { width: 562px; }
    #shrine_left .cspp { overflow-y: scroll; }

    #shrine_left .itemlist td:nth-child(1) { width: 230px !important; }
    #shrine_left .itemlist td:nth-child(2) { width: 60px; }
    #shrine_left .itemlist td:nth-child(3) { width: 30px; padding-left: 5px; text-align: left; font-size: 8pt; color: #930; }
    #shrine_left .itemlist td:nth-child(4) { width: 50px; }
    #shrine_left .itemlist td:nth-child(5) { width: 148px; padding-left: 5px; text-align: left; }
    #shrine_left .itemlist input { margin: 0 1px; }
    #shrine_left .itemlist input:nth-child(1) { width: 40px; text-align: right; }
    #shrine_left .itemlist input:nth-child(2) { width: 50px; }
    #shrine_left .itemlist input:nth-child(3) { width: 40px; }

    .hvut-ss-side { top: 33px; left: -110px; }
    .hvut-ss-log { position: absolute; top: 33px; left: 0; width: 540px; height: 550px; margin: 0; padding: 10px; border: 1px solid; text-align: left; overflow-y: scroll; background-color: #EDEBDF; }
    .hvut-ss-results { position: absolute; top: 33px; left: 572px; width: 472px; height: 550px; margin: 0; padding: 10px; border: 1px solid; text-align: left; overflow-y: scroll; background-color: #EDEBDF; }
    .hvut-ss-p { margin: 5px; font-size: 10pt; font-weight: bold; }
    .hvut-ss-ul { margin: 5px 5px 10px; padding: 0; list-style: none; font-size: 10pt; line-height: 20px; }
    .hvut-ss-ul span:first-child { display: inline-block; width: 60px; text-align: right; color: #930; }
    .hvut-ss-ul span:last-child { font-weight: bold; }
    .hvut-ss-group { color: #666; }
    .hvut-ss-group > span:first-child { visibility: hidden; }
    .hvut-ss-equip { margin-left: 65px; color: #930; }

    .hvut-ss-selected:not([disabled]) { color: #c00 !important; border-color: #c00 !important; outline: 1px solid; }
  `);

  $id('inv_item').addEventListener('click', _ss.click);
  $id('accept_equip').addEventListener('click', _ss.click);

  _ss.node.side = $element('div', $id('shrine_outer'), ['.hvut-side hvut-ss-side']);
  toggle_button($input('button', _ss.node.side), 'Show All Items', 'Show Only Filtered', $id('inv_item'), 'hvut-none-cont', true);
  $input(['button', '供奉结果'], _ss.node.side, null, () => { _ss.toggle_results(); });
  $input(['button', '祭坛日志'], _ss.node.side, null, () => { _ss.toggle_log(); });
  $input(['button', '编辑筛选'], _ss.node.side, null, () => { $config.open('shrineHideItems'); });

  _ss.node.log = $element('div', $id('shrine_outer'), ['.hvut-ss-log hvut-none']);
  _ss.node.results = $element('div', $id('shrine_outer'), ['.hvut-ss-results hvut-none']);
  _ss.node.results_buttons = $element('div', _ss.node.results, ['!margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid; text-align: center;']);
  _ss.node.results_equip = $input(['button', '装备格'], _ss.node.results_buttons, { style: 'width: 450px;' });

  $ajax.fetch('?s=Character&ss=in').then((html) => {
    const exec = />Equip Slots: (\d+)(?: \+ (\d+))? \/ (\d+)</.exec(html);
    _ss.equip.current = parseInt(exec[1]) + parseInt(exec[2] || 0);
    _ss.equip.capacity = parseInt(exec[3]);
    _ss.node.results_equip.value = `装备格: ${_ss.equip.current} / ${_ss.equip.capacity}`;
  });

  _ss.trophies_value = 0;
  _ss.trophies_text = [];

  $qsa('.itemlist tr').forEach((tr) => {
    const div = tr.cells[0].firstElementChild;
    const name = div.textContent;
    const type = $item.get_type(div.getAttribute('onmouseover'));
    const { iid, stock, bulk } = $item.get_data(div.getAttribute('onclick'));
    const max = Math.floor(stock / bulk);
    const item = { log: name, name, type, iid, stock, bulk, max, requests: 0, recieved: 0, node: {} };
    _ss.items[iid] = item;

    div.classList.add('hvut-it-' + type);
    item.node.stock = tr.cells[1];
    item.node.bulk = $element('td', tr);
    item.node.max = $element('td', tr);
    const td = $element('td', tr);
    item.node.count = $input('text', td);
    item.node.button = $input(['button', '供奉'], td, { dataset: { action: 'offer', iid: iid, count: 'input' } });

    if (item.type === 'Trophy') {
      if (_ss.trophy[name]) {
        item.tier = _ss.trophy[name].tier;
        item.value = _ss.trophy[name].value;
        if (item.tier) {
          let t = item.tier;
          let b = item.bulk;
          while (b > 1) {
            b /= t === 2 ? 4 : t === 3 ? 2 : t === 4 ? 4 : 1;
            t++;
          }
          item.value *= t === item.tier ? 1 : t === 3 ? 1.1 : t === 4 ? 1.2 : t === 5 ? 1.3 : 1;
          item.upgrade = t;
          item.log = 'Trophy Tier ' + t;
        }
        if (item.value) {
          const a = item.stock - item.stock % item.bulk;
          if (a) {
            _ss.trophies_value += a * item.value;
            _ss.trophies_text.push(`${a.toLocaleString()} x ${name} @ ${item.value.toLocaleString()} = ${(a * item.value).toLocaleString()}`);
          }
        }
      }
      item.node.bulk.textContent = '/ ' + item.bulk;
      item.node.max.textContent = item.max;
      $input(['button', '全部'], td, { dataset: { action: 'offer', iid: iid, count: 'max' } });
    }
    if ($config.settings.shrineHideItems.some((h) => name.includes(h))) {
      tr.classList.add('hvut-none-item');
    }
  });

  $input(['button', `仓库中有价值 ${_ss.trophies_value.toLocaleString()} 绅士币的奖杯。`], $id('shrine_trophy'), { style: 'margin: 5px;' }, () => { _ss.show_trophies(); });

  _ss.node.select = {};
  $qsa('#accept_equip input[type="submit"]').forEach((s) => {
    s.dataset.action = 'select';
    const exec = /submit_shrine_reward\('(.*?)','(.*?)'\)/.exec(s.getAttribute('onclick'));
    const type = exec[1];
    const slot = exec[2];
    const select = slot ? `${type} ${slot}` : type;
    s.dataset.type = type;
    s.dataset.slot = slot;
    _ss.node.select[select] = s;
    s.removeAttribute('onclick');
  });
} else
// [END 10] Bazaar - The Shrine */


//* [11] Bazaar - The Market
if (_query.s === 'Bazaar' && _query.ss === 'mk') {
  if (!_query.screen) {
    _query.screen = 'browseitems';
  }
  if (!_query.filter) {
    _query.filter = 'co';
  }

  _mk.init_list = function () {
    if (!$qs('#market_itemlist table')) {
      return;
    }
    $price.parse_market(_query.filter);
    _mk.items = Object.keys($price.market);
    Array.from($qs('#market_itemlist table').rows).forEach((tr, i) => {
      if (i === 0) {
        $element('th', tr, 'HVUT 价格');
        return;
      }
      const name = tr.cells[0].textContent;
      const td = $element('td', tr);
      $price.market[name].td = td;
    });
    _mk.modify();

    if (!$id('market_itemfilter')) {
      $element('div', $id('market_right'), ['#market_itemfilter']);
    }
    const side = $element('div', $id('market_left').lastElementChild, ['.hvut-side hvut-mk-side']);
    $input(['button', '设为买价'], side, null, () => { _mk.save('bid'); });
    $input(['button', '设为卖价'], side, null, () => { _mk.save('ask'); });
    $input(['button', '编辑价格'], side, null, () => { _mk.edit(); });
  };

  _mk.edit = function () {
    $price.edit(_mk.items, _query.filter, _mk.modify);
  };

  _mk.save = function (key) {
    $price.set_market(_mk.items, key);
    _mk.modify();
  };

  _mk.modify = function () {
    const prices = $price.get();
    _mk.items.forEach((name) => {
      $price.market[name].td.textContent = prices[name] || '';
    });
  };

  _mk.get_crystals = function () {
    if (!$qs('#market_itemlist table')) {
      return;
    }
    const [bid, ask] = ['Crystal of Vigor', 'Crystal of Finesse', 'Crystal of Swiftness', 'Crystal of Fortitude', 'Crystal of Cunning', 'Crystal of Knowledge', 'Crystal of Flames', 'Crystal of Frost', 'Crystal of Lightning', 'Crystal of Tempest', 'Crystal of Devotion', 'Crystal of Corruption'].reduce((s, e) => [s[0] + $price.market[e].bid * 1000, s[1] + $price.market[e].ask * 1000], [0, 0]);
    $element('tr', [$qs('#market_itemlist table').rows[0], 'afterend'], [`/<td>水晶包</td><td></td><td>${bid} C</td><td>${ask} C</td><td></td>`]);
  };

  _mk.click2link = function () {
    if (!$qs('#market_itemlist table')) {
      return;
    }
    Array.from($qs('#market_itemlist table').rows).forEach((tr) => {
      const onclick = tr.getAttribute('onclick');
      if (!onclick) {
        return;
      }
      const href = /document\.location='([^']+)'/.exec(onclick)[1];
      $element('a', tr.cells[0], { href });
      tr.removeAttribute('onclick');
    });
  };

  GM_addStyle(/*css*/`
    #market_itemlist th { z-index: 1; }
    #market_itemlist tr { position: relative; }
    #market_itemlist td a { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

    .hvut-mk-side { bottom: 20px; left: 32px; }
  `);

  _mk.init_list();
  _mk.click2link();
  if (_query.screen === 'browseitems' && _query.filter === 'mo') {
    _mk.get_crystals();
  }
  $id('account_amount').autocomplete = 'off';
} else
// [END 11] Bazaar - The Market */


//* [12] Bazaar - Monster Lab
if (_query.s === 'Bazaar' && _query.ss === 'ml' && $config.settings.monsterLab) {
  if (_query.create) {
  } else if (_query.slot) {
    if (_query.pane === 'skills') {
      const prev_button = $qs('img[src$="/monster/prev.png"]');
      prev_button.setAttribute('onclick', prev_button.getAttribute('onclick').replace('ss=ml', 'ss=ml&pane=skills'));
      const next_button = $qs('img[src$="/monster/next.png"]');
      next_button.setAttribute('onclick', next_button.getAttribute('onclick').replace('ss=ml', 'ss=ml&pane=skills'));
    }
  } else {
    GM_addStyle(/*css*/`
      #monster_outer { margin-left: 130px; font-weight: normal; }
      #monster_list .cspp { margin-top: 15px; overflow-y: scroll; }

      .hvut-ml-side { top: 38px; left: -110px; }
      .hvut-ml-sort { position: absolute; display: flex; top: 10px; left: 22px; font-size: 10pt; line-height: 16px; }
      .hvut-ml-sort > span { display: inline-block; margin: 0 5px; padding: 2px 0; border: 1px solid; box-sizing: border-box; }
      .hvut-ml-sort > .hvut-ml-sort-current { font-weight: bold; outline: 1px solid; }

      #monster_list { width: auto; }
      #monster_actions { width: auto; }
      #slot_pane { height: 514px !important; white-space: nowrap; }
      #slot_pane > div { position: relative; display: flex; height: 26px; line-height: 26px; }
      #slot_pane > div > div { margin-left: 10px; padding: 0; }
      #slot_pane .fc4 { font-size: 10pt; }
      #slot_pane > div > div:nth-child(1) { order: 1; width: 20px; }
      #slot_pane > div > div:nth-child(2) { order: 2; width: 210px; overflow: hidden; }
      #slot_pane > div > div:nth-child(4) { order: 3; width: 70px; }
      #slot_pane > div > div:nth-child(3) { order: 4; width: 40px; text-align: right; }
      #slot_pane > div > div:nth-child(7) { order: 5; width: 90px; }
      #slot_pane > div > div:nth-child(8) { order: 6; width: 25px; }
      #slot_pane > div > div:nth-child(9) { order: 7; width: 50px; }
      #slot_pane > div > div:nth-child(6) { order: 8; width: 200px; }
      #slot_pane > div > div:nth-child(5) { order: 9; width: 200px; }

      .hvut-ml-new { background-color: #edb; }
      .hvut-ml-wins::after { content: 'Last Update: ' attr(data-update); position: absolute; top: 2px; right: 615px; border: 1px solid; padding: 2px 4px; line-height: 16px; background-color: #edb; visibility: hidden; }
      .hvut-ml-wins:hover::after { visibility: visible; }
      .hvut-ml-outdated { color: #c00; }
      .hvut-ml-gains > span { display: inline-block; width: 25px; line-height: 22px; border-radius: 2px; background-color: #5C0D11; color: #fff; }
      .hvut-ml-gains > ul { visibility: hidden; position: absolute; top: 2px; right: 515px; margin: 0; padding: 5px 10px; border: 1px solid; list-style: none; font-size: 9pt; line-height: 20px; white-space: nowrap; background-color: #EDEBDF; z-index: 3; }
      .hvut-ml-gains:hover > ul { visibility: visible; }
      #slot_pane > div:nth-of-type(n+15):nth-last-of-type(-n+5) > .hvut-ml-gains > ul { top: auto; bottom: 2px; }
      .msn { height: auto; }
      .hvut-ml-feed { position: absolute; top: 5px; left: 62px; width: 124px; height: 12px; font-size: 8pt; line-height: 12px; }
      div:hover > .hvut-ml-feed { background-color: #fff9; }

      .hvut-ml-summary { position: absolute; top: 38px; left: 10px; max-height: 500px; min-width: 400px; margin: 0; padding: 10px; overflow: auto; border: 1px solid; list-style: none; background-color: #EDEBDF; font-size: 9pt; line-height: 20px; text-align: left; white-space: nowrap; z-index: 1; }
      .hvut-ml-summary > li:first-child { margin-bottom: 5px; font-weight: bold; }
      .hvut-ml-summary > li { margin: 0 5px; }
      .hvut-ml-log { position: absolute; top: 38px; left: 610px; margin: 0; padding: 10px; width: 460px; height: 560px; column-count: 2; column-gap: 10px; border: 1px solid; list-style: none; background-color: #EDEBDF; font-size: 9pt; line-height: 16px; text-align: left; white-space: nowrap; z-index: 2; }
      .hvut-ml-log > li { overflow: hidden; text-overflow: ellipsis; }
      .hvut-ml-log > li:nth-child(-n+3) { column-span: all; font-weight: bold; }
      .hvut-ml-log > li:nth-child(3) { margin-bottom: 16px; }
      .hvut-ml-margin { margin-top: 16px !important; }
      .hvut-ml-break { break-after: column; }

      .hvut-ml-up { position: absolute; top: 27px; left: 0; width: 100%; height: 675px; z-index: 9; background-color: #EDEBDF; font-size: 10pt; text-align: left; }
      .hvut-ml-up-list { height: 493px; margin: 20px 10px 10px; overflow-y: scroll; }
      .hvut-ml-up-table { table-layout: fixed; border-collapse: separate; border-spacing: 0 3px; margin: -3px auto; width: 1180px; line-height: 24px; text-align: center; white-space: nowrap; user-select: none; }
      .hvut-ml-up-table tr:first-child td { position: sticky; top: 0; font-size: 8pt; background-color: #edb; }
      .hvut-ml-up-table tr:hover td { background-color: #edb; }
      .hvut-ml-up-table td { width: 24px; padding: 0; border-width: 1px 0; border-style: solid; border-color: #5C0D11; }
      .hvut-ml-up-table td:hover { background-color: #fff !important; }
      .hvut-ml-up-table td:nth-child(1) { width: 30px; }
      .hvut-ml-up-table td:nth-child(2) { width: auto; text-align: left; padding-left: 5px; }
      .hvut-ml-up-table td:nth-child(3) { width: 90px; text-align: left; padding-left: 5px; }
      .hvut-ml-up-table td:nth-child(4) { width: 40px; }
      .hvut-ml-up-table td:nth-child(5) { width: 40px; }
      .hvut-ml-up-table td:nth-child(1) { border-left-width: 1px; }
      .hvut-ml-up-table td:nth-child(5),
      .hvut-ml-up-table td:nth-child(6),
      .hvut-ml-up-table td:nth-child(15),
      .hvut-ml-up-table td:nth-child(22),
      .hvut-ml-up-table td:nth-child(35) { border-right-width: 1px; }
      .hvut-ml-up-change { color: #c00; }
      .hvut-ml-up-table td[data-desc]::after { content: attr(data-desc); visibility: hidden; position: absolute; top: 24px; right: -1px; white-space: nowrap; padding: 2px 10px; background-color: #fff; border: 1px solid; z-index: 1; }
      .hvut-ml-up-table td[data-desc]:hover::after { visibility: visible; }

      .hvut-ml-up-bottom { margin: 10px; }
      .hvut-ml-up-bottom > ul { float: left; margin: 0 5px; padding: 5px; list-style: none; border: 1px solid; }
      .hvut-ml-up-bottom li { margin: 5px; }
      .hvut-ml-up-bottom li::after { content: ''; display: block; clear: both; }
      .hvut-ml-up-bottom li.hvut-ml-up-nostock { color: #c00; }
      .hvut-ml-up-bottom li > span { float: left; text-align: right; }
      .hvut-ml-up-crystal span:nth-child(1) { width: 70px; }
      .hvut-ml-up-crystal span:nth-child(2) { width: 90px; }
      .hvut-ml-up-crystal span:nth-child(3) { width: 100px; }
      .hvut-ml-up-crystal span:nth-child(4) { width: 90px; }
      .hvut-ml-up-token span:nth-child(1) { width: 130px; }
      .hvut-ml-up-token span:nth-child(2) { width: 70px; }
      .hvut-ml-up-buttons { float: right; width: 100px; display: flex; flex-direction: column; }
      .hvut-ml-up-buttons input { margin: 3px 0; }

      .hvut-ml-plc { display: flex; position: absolute; top: 27px; left: 0; width: 100%; height: 675px; justify-content: center; align-items: center; z-index: 9; background-color: #EDEBDF; font-size: 10pt; text-align: left; white-space: nowrap; }
      .hvut-ml-plc-right { height: 635px; margin-left: 20px; }
      .hvut-ml-plc-buttons { display: flex; flex-wrap: wrap; justify-content: space-between; width: 250px; }
      .hvut-ml-plc-buttons input { margin: 0 0 4px; }
      .hvut-ml-plc-buttons input:nth-child(-n+3) { width: 32%; }
      .hvut-ml-plc-buttons input:nth-child(4) { width: 100%; margin-top: 16px; }
      .hvut-ml-plc-buttons input:nth-child(n+5) { width: 24%; }
      .hvut-ml-plc-table { table-layout: fixed; border-collapse: collapse; margin-top: 20px; width: 480px; }
      .hvut-ml-plc-table tr:first-child { font-weight: bold; }
      .hvut-ml-plc-table td { border: 1px solid; padding: 2px 5px; }
      .hvut-ml-plc-table td:first-child { width: 40px; text-align: right; }
      .hvut-ml-plc-left { width: 600px; height: 530px; margin-top: 105px; overflow: auto; line-height: 26px; }
      .hvut-ml-plc-left > div { display: flex; width: 572px; margin: 5px 0; padding: 5px 0; border: 1px solid; }
      .hvut-ml-plc-left > div:first-child { position: absolute; margin-top: -105px; outline: 1px solid; }
      .hvut-ml-plc-left > div > div { width: 240px; padding: 5px; border-left: 1px solid; }
      .hvut-ml-plc-left > div > div:first-child { width: 60px; border-left: none; }
      .hvut-ml-plc-left input[type='number'] { width: 30px; text-align: right; }
      .hvut-ml-plc-del { width: 22px; margin: 0 10px 0 0 !important; }
      .hvut-ml-plc-btn { display: inline-block; width: 140px; text-align: center; }
      .hvut-ml-plc-btn > span { display: inline-block; width: 18px; line-height: 18px; border: 1px solid; margin: 0 1px; text-align: center; background-color: #fff; border-radius: 3px; cursor: default; }
      .hvut-ml-plc-btn > input { width: 25px; padding: 2px 0; border-width: 1px; border-radius: 0; }
      .hvut-ml-plc-btn > .hvut-ml-plc-up { background-color: #edb; }
      .hvut-ml-plc-crystal { display: inline-block; width: 95px; text-align: right; }
    `);

    _ml.materials = ['Low-Grade Cloth', 'Mid-Grade Cloth', 'High-Grade Cloth', 'Low-Grade Leather', 'Mid-Grade Leather', 'High-Grade Leather', 'Low-Grade Metals', 'Mid-Grade Metals', 'High-Grade Metals', 'Low-Grade Wood', 'Mid-Grade Wood', 'High-Grade Wood', 'Crystallized Phazon', 'Shade Fragment', 'Repurposed Actuator', 'Defense Matrix Modulator', 'Binding of Slaughter', 'Binding of Balance', 'Binding of Isaac', 'Binding of Destruction', 'Binding of Focus', 'Binding of Friendship', 'Binding of Protection', 'Binding of Warding', 'Binding of the Fleet', 'Binding of the Barrier', 'Binding of the Nimble', 'Binding of Negation', 'Binding of the Elementalist', 'Binding of the Heaven-sent', 'Binding of the Demon-fiend', 'Binding of the Curse-weaver', 'Binding of the Earth-walker', 'Binding of Surtr', 'Binding of Niflheim', 'Binding of Mjolnir', 'Binding of Freyr', 'Binding of Heimdall', 'Binding of Fenrir', 'Binding of Dampening', 'Binding of Stoneskin', 'Binding of Deflection', 'Binding of the Fire-eater', 'Binding of the Frost-born', 'Binding of the Thunder-child', 'Binding of the Wind-waker', 'Binding of the Thrice-blessed', 'Binding of the Spirit-ward', 'Binding of the Ox', 'Binding of the Raccoon', 'Binding of the Cheetah', 'Binding of the Turtle', 'Binding of the Fox', 'Binding of the Owl'];
    _ml.mobs = [];
    _ml.now = Date.now();
    _ml.log = $config.get('ml_log', [{ version: 1 }]);

    _ml.parse = function (mob, doc) {
      mob.pl = parseInt($qs('.msl > div:nth-child(3)', doc).textContent.slice(4));
      mob.hunger = parseInt($qs('.msl > div:nth-child(5) img', doc).style.width) * 200;
      mob.morale = parseInt($qs('.msl > div:nth-child(6) img', doc).style.width) * 200;
      mob.wins = parseInt($qs('#monsterstats_right > div:nth-child(2) > div:nth-child(2)', doc).textContent);
      mob.kills = parseInt($qs('#monsterstats_right > div:nth-child(3) > div:nth-child(2)', doc).textContent);
      mob.log.pl = mob.pl;
      mob.log.wins = mob.wins;
      mob.log.kills = mob.kills;
      mob.log.update = Date.now();

      const stats = $qsa('#monsterstats_top td:nth-child(2)', doc).map((td) => parseInt(td.textContent));
      const pa = stats.slice(0, 6);
      const er = stats.slice(6, 12);
      mob.pa.forEach((e, i) => {
        e.value = pa[i];
        mob.log.pa[i][0] = pa[i];
      });
      mob.er.forEach((e, i) => {
        e.value = er[i];
        mob.log.er[i][0] = er[i];
      });

      $qsa('#chaosupg td:nth-child(2)', doc).forEach((td, i) => {
        mob.ct[i].value = $qsa('.mcu2', td).length;
        mob.log.ct[i][0] = mob.ct[i].value;
        mob.ct[i].max = 20 - $qsa('.mcu0', td).length;
        mob.log.ct[i][2] = mob.ct[i].max;
      });

      $config.set('ml_log', _ml.log);
    };

    _ml.price2str = function (price) {
      let str;
      if (price > 1000000) {
        str = (Math.round(price / 10000) / 100) + 'm';
      } else if (price > 1000) {
        str = (Math.round(price / 10) / 100) + 'k';
      } else {
        str = Math.round(price) + '';
      }
      return str;
    };

    // Monster List
    _ml.main = {

      node: {},
      gains: {},

      click: function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) {
          return;
        }
        const { action, index, key } = target.dataset;
        if (action === 'sort') {
          _ml.main.sort(key);
        } else if (action === 'morale') {
          e.stopPropagation();
          _ml.main.feed(index, 'drugs');
        } else if (action === 'hunger') {
          e.stopPropagation();
          _ml.main.feed(index, 'food');
        } else if (action === 'update') {
          e.stopPropagation();
          _ml.main.feed(index);
        }
      },
      mouseover: function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) {
          return;
        }
        const { action, index } = target.dataset;
        if (action === 'log') {
          _ml.main.show_log(index);
        }
      },
      mouseout: function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) {
          return;
        }
        const { action, index } = target.dataset;
        if (action === 'log') {
          _ml.main.hide_log(index);
        }
      },
      sort: function (key) {
        if (!['index', 'name', 'class', 'pl', 'wins', 'kills', 'gains', 'gifts', 'morale', 'hunger'].includes(key)) {
          return;
        }
        let order = ['pl', 'wins', 'kills', 'gains', 'gifts'].includes(key) ? -1 : 1;
        if (key === _ml.main.sort.key) {
          order = _ml.main.sort.order * -1;
        }
        if (_ml.main.sort.key) {
          _ml.main.node.sort[_ml.main.sort.key].classList.remove('hvut-ml-sort-current');
        }
        _ml.main.node.sort[key].classList.add('hvut-ml-sort-current');
        _ml.main.sort.key = key;
        _ml.main.sort.order = order;
        if (!_ml.main.sort.list) {
          const empty = $qsa('#slot_pane > div[onclick*="&create=new"]').map((div) => ({ node: { div }, index: parseInt(div.firstElementChild.textContent) }));
          _ml.main.sort.list = _ml.mobs.filter((mob) => mob).concat(empty);
        }
        _ml.main.sort.list.sort((a, b) => (a[key] == b[key] ? 0 : a[key] == undefined ? 1 : b[key] == undefined ? -1 : (a[key] > b[key] ? 1 : -1) * order));
        $id('slot_pane').prepend(..._ml.main.sort.list.map((mob) => mob.node.div));
      },
      feed: async function (index, food) {
        const mob = _ml.mobs[index];
        if (!mob.status) {
          return;
        }
        mob.status = 0;
        mob.node.wins.textContent = '...';
        const html = await $ajax.fetch('?s=Bazaar&ss=ml&slot=' + mob.index, food ? 'food_action=' + food : '');
        const doc = $doc(html);
        _ml.main.onsuccess(index, doc);
        //_ml.main.onerror(index);
      },
      feedall: function (stat, value, food) {
        _ml.mobs.forEach((mob) => { _ml.main.feed(mob.index, !value || value >= mob[stat] ? food : null); });
      },
      onsuccess: function (index, doc) {
        const mob = _ml.mobs[index];
        _ml.parse(mob, doc);
        mob.status = 1;
        mob.node.wins.dataset.update = new Date(mob.log.update).toLocaleDateString();
        mob.node.wins.classList.remove('hvut-ml-outdated');
        mob.node.wins.textContent = `${mob.wins} / ${mob.kills}`;
        mob.node.hunger.textContent = mob.hunger;
        mob.node.hungerbar.style.width = (mob.hunger / 200) + 'px';
        mob.node.morale.textContent = mob.morale;
        mob.node.moralebar.style.width = (mob.morale / 200) + 'px';
      },
      onerror: function (index) {
        const mob = _ml.mobs[index];
        mob.status = -1;
        mob.node.wins.classList.add('hvut-ml-outdated');
        mob.node.wins.textContent = '失败';
      },
      edit_price: function () {
        _ml.main.make_summary();
        if (_ml.mobs[-1].node.log) {
          _ml.main.make_log(-1);
        }
        _ml.mobs.forEach((mob) => {
          if (mob.node.log) {
            _ml.main.make_log(mob.index);
          }
        });
      },
      toggle_summary: function () {
        _ml.main.node.summary?.classList.toggle('hvut-none');
      },
      make_summary: function () {
        const mobs = Object.values(_ml.main.gains);
        if (!mobs.length) {
          return;
        }
        const summary = {};
        const gains = mobs.flat();
        const prices = $price.get('Materials');
        let income = 0;
        gains.forEach((g) => {
          if (!summary[g]) {
            summary[g] = 0;
          }
          summary[g]++;
          income += (prices[g] || 0);
        });
        if (!_ml.main.node.summary) {
          _ml.main.node.summary = $element('ul', $id('monster_outer'), ['.hvut-ml-summary']);
        }
        _ml.main.node.summary.innerHTML = '';
        $element('li', _ml.main.node.summary, `${mobs.length} 只怪物带来 ${gains.length} 份礼物,共 ${_ml.price2str(income)} 绅士币`);
        _ml.materials.forEach((g) => {
          if (summary[g]) {
            $element('li', _ml.main.node.summary, `${summary[g]} x ${$config.settings.translateNames ? $equip.$i18n.itemName(g) : g}`);
          }
        });
      },
      toggle_log: function (index) {
        const mob = _ml.mobs[index];
        if (mob.node.log?.parentNode) {
          _ml.main.hide_log(index);
        } else {
          _ml.main.show_log(index);
        }
      },
      show_log: function (index) {
        const mob = _ml.mobs[index];
        if (!mob.node.log) {
          _ml.main.make_log(index);
        }
        $id('monster_outer').appendChild(mob.node.log);
      },
      hide_log: function (index) {
        const mob = _ml.mobs[index];
        mob.node.log?.remove();
      },
      make_log: function (index) {
        const mob = _ml.mobs[index];
        if (!mob.node.log) {
          mob.node.log = $element('ul', null, ['.hvut-ml-log']);
        }
        mob.node.log.innerHTML = '';
        const date = mob.log.date;
        const days = (_ml.now - date) / (1000 * 60 * 60 * 24);
        const prices = $price.get('Materials');
        let count = 0;
        let income = 0;
        _ml.materials.forEach((mat, i) => {
          const li = $element('li', mob.node.log, mob.log.gifts[i] + ' x ' + ($config.settings.translateNames ? $equip.$i18n.itemName(mat) : mat));
          if (i === 12 || i === 16 || i === 22 || i === 28 || i === 33 || i === 39 || i === 42 || i === 48) {
            li.classList.add('hvut-ml-margin');
          }
          if (i === 27) {
            li.classList.add('hvut-ml-break');
          }
          count += mob.log.gifts[i];
          income += mob.log.gifts[i] * (prices[mat] || 0);
        });

        mob.node.log.prepend(
          $element('li', null, `已 ${Math.round(days * 10) / 10} 天 / 始于 ${(new Date(date)).toLocaleString()}`),
          $element('li', null, `- Total: ${count} gifts, ${_ml.price2str(income)} credits`),
          $element('li', null, `- Daily: ${Math.round(count / days * 10) / 10} gifts, ${_ml.price2str(income / days)} credits`)
        );
      },

    };

    // Initializing List
    if ($id('messagebox_outer')) {
      let monster;
      let gift;
      get_message(null, true).forEach((msg) => {
        if (!msg) {
          return;
        } else if (/^(.+) brought you (?:a gift|some gifts)!$/.test(msg)) {
          monster = RegExp.$1.toLowerCase();
          _ml.main.gains[monster] = [];
        } else if (/^Received (?:a|some) (.+)$/.test(msg)) {
          gift = RegExp.$1;
          _ml.main.gains[monster].push(gift);
        } else {
          popup(msg);
        }
      });
      $id('messagebox_outer').classList.add('hvut-none');
    }

    _ml.mobs[-1] = { log: { date: _ml.now, gifts: (new Array(54)).fill(0) }, node: {} };

    $qsa('#slot_pane > div').forEach((div, i) => {
      const index = i + 1;
      if (div.getAttribute('onclick').includes('&create=new')) {
        _ml.log[index] = null;
        return;
      }

      let log = _ml.log[index];
      if (!log) {
        log = { date: _ml.now, update: 0, pl: null, wins: 0, kills: 0, pa: [], er: [], ct: [], gifts: [] };
        _ml.log[index] = log;
        for (let i = 0; i < 6; i++) {
          log.pa[i] = [0, 0];
          log.er[i] = [0, 0];
        }
        for (let i = 0; i < 12; i++) {
          log.ct[i] = [0, 0, 0];
        }
        for (let i = 0; i < 54; i++) {
          log.gifts[i] = 0;
        }
      }
      if (_ml.mobs[-1].log.date > log.date) {
        _ml.mobs[-1].log.date = log.date;
      }

      const mob = { index, log, status: -1, pa: [], er: [], ct: [], node: { div: div } };
      _ml.mobs[mob.index] = mob;

      mob.name = div.children[1].textContent;
      mob.class = div.children[3].textContent;
      mob.pl = parseInt(div.children[2].textContent.slice(4));
      div.children[2].textContent = mob.pl;
      if (mob.pl !== mob.log.pl) {
        mob.update_needed = true;
      }
      mob.wins = mob.log.wins;
      mob.kills = mob.log.kills;
      for (let i = 0; i < 6; i++) {
        mob.pa[i] = { value: log.pa[i][0], to: 0 };
        mob.er[i] = { value: log.er[i][0], to: 0 };
      }
      for (let i = 0; i < 12; i++) {
        mob.ct[i] = { value: log.ct[i][0], to: 0, max: log.ct[i][2] };
      }

      const hungerdiv = div.children[4];
      const moralediv = div.children[5];
      hungerdiv.dataset.action = 'hunger';
      hungerdiv.dataset.index = index;
      moralediv.dataset.action = 'morale';
      moralediv.dataset.index = index;

      mob.node.hungerbar = hungerdiv.firstElementChild.firstElementChild;
      mob.node.moralebar = moralediv.firstElementChild.firstElementChild;
      mob.hunger = parseInt(mob.node.hungerbar.style.width) * 200;
      mob.morale = parseInt(mob.node.moralebar.style.width) * 200;
      mob.node.hunger = $element('div', hungerdiv.firstElementChild, [mob.hunger, '.hvut-ml-feed']);
      mob.node.morale = $element('div', moralediv.firstElementChild, [mob.morale, '.hvut-ml-feed']);
      mob.node.wins = $element('div', div, ['.hvut-ml-wins', { dataset: { action: 'update', index } }]);
      mob.node.gains = $element('div', div, ['.hvut-ml-gains']);
      mob.node.gifts = $element('div', div, { dataset: { action: 'log', index } });

      if (mob.log.update) {
        mob.node.wins.textContent = `${mob.wins} / ${mob.kills}`;
        mob.node.wins.dataset.update = new Date(mob.log.update).toLocaleDateString();
        if (mob.log.update < Date.now() - 7 * 24 * 60 * 60 * 1000) {
          mob.node.wins.classList.add('hvut-ml-outdated');
        }
      } else {
        mob.node.wins.textContent = '-';
      }

      const gains = _ml.main.gains[mob.name.toLowerCase()];
      if (gains) {
        mob.gains = gains.length;
        div.classList.add('hvut-ml-new');
        $element('span', mob.node.gains, gains.length);
        const ul = $element('ul', mob.node.gains);
        gains.forEach((g) => {
          $element('li', ul, $config.settings.translateNames ? $equip.$i18n.itemName(g) : g);
          mob.log.gifts[_ml.materials.indexOf(g)]++;
        });
      }

      for (let i = 0; i < 54; i++) {
        _ml.mobs[-1].log.gifts[i] += mob.log.gifts[i];
      }
      mob.gifts = mob.log.gifts.reduce((s, e) => (s + e), 0);
      mob.node.gifts.textContent = mob.gifts;
    });

    $config.set('ml_log', _ml.log);

    $id('monster_list').addEventListener('click', _ml.main.click, true);
    $id('monster_list').addEventListener('mouseover', _ml.main.mouseover);
    $id('monster_list').addEventListener('mouseout', _ml.main.mouseout);

    const sort_div = $element('div', [$id('slot_pane'), 'beforebegin'], ['.hvut-ml-sort hvut-cphu-sub']);
    _ml.main.node.sort = {
      index: $element('span', sort_div, [{ textContent: '#' }, '!width: 30px;', { dataset: { action: 'sort', key: 'index' } }]),
      name: $element('span', sort_div, ['Name', '!width: 210px;', { dataset: { action: 'sort', key: 'name' } }]),
      class: $element('span', sort_div, ['Class', '!width: 70px;', { dataset: { action: 'sort', key: 'class' } }]),
      pl: $element('span', sort_div, ['PL', '!width: 40px;', { dataset: { action: 'sort', key: 'pl' } }]),
      wins: $element('span', sort_div, ['Wins', '!width: 40px;', { dataset: { action: 'sort', key: 'wins' } }]),
      kills: $element('span', sort_div, ['Kills', '!width: 40px;', { dataset: { action: 'sort', key: 'kills' } }]),
      gains: $element('span', sort_div, ['+', '!width: 25px;', { dataset: { action: 'sort', key: 'gains' } }]),
      gifts: $element('span', sort_div, ['Gifts', '!width: 50px;', { dataset: { action: 'sort', key: 'gifts' } }]),
      morale: $element('span', sort_div, ['Morale', '!width: 200px;', { dataset: { action: 'sort', key: 'morale' } }]),
      hunger: $element('span', sort_div, ['Hunger', '!width: 200px;', { dataset: { action: 'sort', key: 'hunger' } }]),
    };

    if ($config.settings.monsterLabDefaultSort === 'index') {
      _ml.main.sort.key = 'index';
      _ml.main.sort.order = 1;
      _ml.main.node.sort.index.classList.add('hvut-ml-sort-current');
    } else {
      _ml.main.sort($config.settings.monsterLabDefaultSort);
    }

    const side_div = $element('div', $id('monster_outer'), ['.hvut-side hvut-ml-side']);
    $input(['button', '礼物汇总'], side_div, null, () => { _ml.main.toggle_summary(); });
    $input(['button', '怪物实验室日志'], side_div, null, () => { _ml.main.toggle_log(-1); });
    $input(['button', '物品价格'], side_div, { className: 'hvut-side-margin' }, () => { $price.edit('Materials', 'ma', _ml.main.edit_price); });
    $input(['button', '更新胜场/击杀'], side_div, null, () => { _ml.main.feedall(); });
    $input(['button', '怪物升级器'], side_div, { id: 'hvut-ml-up-button' }, () => { _ml.upgrade.toggle(); });
    $input(['button', '战力计算器'], side_div, null, () => { _ml.plc.toggle(); });

    _ml.main.make_summary();

    // Monster Upgrader
    _ml.upgrade = {

      pa: [
        { query: 'pa_str', text: '力量', crystal: 'Crystal of Vigor' },
        { query: 'pa_dex', text: '灵巧', crystal: 'Crystal of Finesse' },
        { query: 'pa_agi', text: '敏捷', crystal: 'Crystal of Swiftness' },
        { query: 'pa_end', text: '体质', crystal: 'Crystal of Fortitude' },
        { query: 'pa_int', text: '智力', crystal: 'Crystal of Cunning' },
        { query: 'pa_wis', text: '智慧', crystal: 'Crystal of Knowledge' },
      ],
      er: [
        { query: 'er_fire', text: '火焰', crystal: 'Crystal of Flames' },
        { query: 'er_cold', text: '冰霜', crystal: 'Crystal of Frost' },
        { query: 'er_elec', text: '闪电', crystal: 'Crystal of Lightning' },
        { query: 'er_wind', text: '狂风', crystal: 'Crystal of Tempest' },
        { query: 'er_holy', text: '神圣', crystal: 'Crystal of Devotion' },
        { query: 'er_dark', text: '黑暗', crystal: 'Crystal of Corruption' },
      ],
      ct: [
        { query: 'affect', text: '拾荒', desc: '礼物系数 +2.5%' },
        { query: 'health', text: '坚韧', desc: '怪物生命 +5%' },
        { query: 'damage', text: '残暴', desc: '怪物伤害 +2.5%' },
        { query: 'accur', text: '精准', desc: '怪物命中 +5%' },
        { query: 'cevbl', text: '洞察', desc: '目标有效闪避/格挡 -1%' },
        { query: 'cpare', text: '压制', desc: '目标有效招架/抵抗 -1%' },
        { query: 'parry', text: '拦截', desc: '怪物招架 +0.5%' },
        { query: 'resist', text: '消解', desc: '怪物抵抗 +0.5%' },
        { query: 'evade', text: '闪避', desc: '怪物闪避 +0.5%' },
        { query: 'phymit', text: '防御', desc: '怪物物理减伤 +1%' },
        { query: 'magmit', text: '守护', desc: '怪物魔法减伤 +1%' },
        { query: 'atkspd', text: '迅捷', desc: '怪物攻击速度 +2.5%' },
      ],

      pa_pl: [0],
      er_pl: [0],
      pa_crystal: [0],
      er_crystal: [0],
      pa_morale: [0],
      er_morale: [0],

      node: {
        button: $id('hvut-ml-up-button'),
      },

      mousedown: function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) {
          return;
        }
        const { action, index, type, item, key } = target.dataset;
        if (action === 'sort') {
          _ml.upgrade.sort(key);
        } else if (action === 'reset') {
          _ml.upgrade.reset(index);
        } else if (action === 'upgrade') {
          const inc = e.button === 0 ? 1 : e.button === 2 ? -1 : 0;
          _ml.upgrade.exec(index, type, item, inc);
        }
      },
      contextmenu: function (e) {
        e.preventDefault();
      },

      init: async function () {
        if (_ml.upgrade.inited) {
          return;
        }
        _ml.upgrade.inited = true;

        _ml.upgrade.node.button.disabled = true;
        await $item.once();
        _ml.upgrade.pa.forEach((e) => {
          e.stock = $item.count(e.crystal);
        });
        _ml.upgrade.er.forEach((e) => {
          e.stock = $item.count(e.crystal);
        });
        _ml.upgrade.ct.stock = $item.count('Chaos Token');
        _ml.upgrade.node.button.disabled = false;
        await _ml.upgrade.update();

        _ml.upgrade.node.div = $element('div', $id('mainpane'), ['.hvut-ml-up']);
        const list = $element('div', _ml.upgrade.node.div, ['.hvut-ml-up-list'], { mousedown: (e) => { _ml.upgrade.mousedown(e); }, contextmenu: (e) => { _ml.upgrade.contextmenu(e); } });
        const bottom = $element('div', _ml.upgrade.node.div, ['.hvut-ml-up-bottom']);

        _ml.upgrade.sort.key = 'index';
        _ml.upgrade.sort.order = 1;

        _ml.upgrade.node.table = $element('table', list, ['.hvut-ml-up-table']);
        const thead = $element('tr', _ml.upgrade.node.table);
        $element('td', thead, { textContent: '#', dataset: { action: 'sort', key: 'index' } });
        $element('td', thead, ['name', { dataset: { action: 'sort', key: 'name' } }]);
        $element('td', thead, ['class', { dataset: { action: 'sort', key: 'class' } }]);
        $element('td', thead, ['pl', { dataset: { action: 'sort', key: 'pl' } }]);
        $element('td', thead, ['morale', { dataset: { action: 'sort', key: 'morale' } }]);
        $element('td', thead, ['*', { dataset: { action: 'reset', index: 'all', desc: 'Reset' } }]);

        $element('td', thead, ['+', { dataset: { action: 'upgrade', index: 'all', type: 'pa', item: 'all', desc: 'Increase / Decrease Primary Attributes' } }]);
        $element('td', thead, ['=', { dataset: { action: 'upgrade', index: 'all', type: 'pa', item: 'equal', desc: 'Equalize Primary Attributes' } }]);
        _ml.upgrade.pa.forEach((pa, i) => { $element('td', thead, [pa.text.toLowerCase(), { dataset: { action: 'upgrade', index: 'all', type: 'pa', item: i, desc: pa.crystal } }]); });

        $element('td', thead, ['+', { dataset: { action: 'upgrade', index: 'all', type: 'er', item: 'all', desc: 'Increase / Decrease Elemental Mitigations' } }]);
        $element('td', thead, ['=', { dataset: { action: 'upgrade', index: 'all', type: 'er', item: 'equal', desc: 'Equalize Elemental Mitigations' } }]);
        _ml.upgrade.er.forEach((er, i) => { $element('td', thead, [er.text.toLowerCase(), { dataset: { action: 'upgrade', index: 'all', type: 'er', item: i, desc: er.crystal } }]); });

        $element('td', thead, ['+', { dataset: { action: 'upgrade', index: 'all', type: 'ct', item: 'all', desc: 'Increase / Decrease Token Stats' } }]);
        _ml.upgrade.ct.forEach((ct, i) => { $element('td', thead, [ct.text.slice(0, 3).toLowerCase(), { dataset: { action: 'upgrade', index: 'all', type: 'ct', item: i, desc: `${ct.text} : ${ct.desc}` } }]); });

        const pa_ul = $element('ul', bottom, ['.hvut-ml-up-crystal']);
        _ml.upgrade.pa.forEach((e) => {
          e.li = $element('li', pa_ul);
        });
        const er_ul = $element('ul', bottom, ['.hvut-ml-up-crystal']);
        _ml.upgrade.er.forEach((e) => {
          e.li = $element('li', er_ul);
        });
        _ml.upgrade.ct.ul = $element('ul', bottom, ['.hvut-ml-up-token']);

        const buttons = $element('div', bottom, ['.hvut-ml-up-buttons']);
        $input(['button', '保存'], buttons, null, () => { _ml.upgrade.save(); });
        $input(['button', '还原'], buttons, null, () => { _ml.upgrade.load(); });
        _ml.upgrade.node.update = $input(['button', '更新'], buttons, null, () => { _ml.upgrade.force_update(); });
        _ml.upgrade.node.run = $input(['button', '运行'], buttons, null, () => { _ml.upgrade.run(); });
        $input(['button', '关闭'], buttons, null, () => { _ml.upgrade.toggle(); });

        for (let i = 0; i < 25; i++) {
          _ml.upgrade.pa_pl[i + 1] = _ml.upgrade.pa_pl[i] + (3 + i * 0.5);
          _ml.upgrade.pa_crystal[i + 1] = _ml.upgrade.pa_crystal[i] + Math.round(50 * Math.pow(1.555079154, i));
          _ml.upgrade.pa_morale[i + 1] = _ml.upgrade.pa_morale[i] + (3 + Math.ceil(i * 0.5)) * 1000;
        }
        for (let i = 0; i < 50; i++) {
          _ml.upgrade.er_pl[i + 1] = _ml.upgrade.er_pl[i] + Math.floor(1 + i * 0.1);
          _ml.upgrade.er_crystal[i + 1] = _ml.upgrade.er_crystal[i] + Math.round(10 * Math.pow(1.26485522, i));
          _ml.upgrade.er_morale[i + 1] = _ml.upgrade.er_morale[i] + (1 + Math.floor(i * 0.1)) * 2000;
        }
        _ml.upgrade.pa.forEach((e) => {
          e.used = 0;
          e.require = 0;
        });
        _ml.upgrade.er.forEach((e) => {
          e.used = 0;
          e.require = 0;
        });

        let ct_slot = $qsa('#slot_pane > div.msl').length;
        const ct_next = parseInt(/Cost: (\d+) Chaos Token/.exec($id('monster_actions').textContent)[1]);
        if (ct_next === Math.ceil(1 + Math.pow(ct_slot, 1.2))) {
        } else if (ct_next === Math.ceil(1 + Math.pow(ct_slot / 2, 1.2))) {
          ct_slot = ct_slot / 2;
        } else {
          ct_slot = 0;
        }
        _ml.upgrade.ct.unlock = 0;
        for (let i = 0; i < ct_slot; i++) {
          _ml.upgrade.ct.unlock += Math.ceil(1 + Math.pow(i, 1.2));
        }
        _ml.upgrade.ct.used = 0;
        _ml.upgrade.ct.require = 0;

        // create mob list table here
        _ml.mobs.forEach((mob) => {
          mob.node.tr = $element('tr', _ml.upgrade.node.table);
          const tr = mob.node.tr;

          $element('td', tr, mob.index);
          $element('td', tr, mob.name);
          $element('td', tr, mob.class);
          mob.node.pl = $element('td', tr, mob.pl);
          mob.node.morale = $element('td', tr, mob.morale / 100);
          $element('td', tr, ['*', { dataset: { action: 'reset', index: mob.index } }]);

          $element('td', tr, ['+', { dataset: { action: 'upgrade', index: mob.index, type: 'pa', item: 'all' } }]);
          $element('td', tr, ['=', { dataset: { action: 'upgrade', index: mob.index, type: 'pa', item: 'equal' } }]);
          mob.pa.forEach((e, i) => {
            e.node = $element('td', tr, [e.value, { dataset: { action: 'upgrade', index: mob.index, type: 'pa', item: i } }]);
            e.to = e.value;
            e.used = _ml.upgrade.pa_crystal[e.value];
            _ml.upgrade.pa[i].used += e.used;
            e.require = 0;
          });

          $element('td', tr, ['+', { dataset: { action: 'upgrade', index: mob.index, type: 'er', item: 'all' } }]);
          $element('td', tr, ['=', { dataset: { action: 'upgrade', index: mob.index, type: 'er', item: 'equal' } }]);
          mob.er.forEach((e, i) => {
            e.node = $element('td', tr, [e.value, { dataset: { action: 'upgrade', index: mob.index, type: 'er', item: i } }]);
            e.to = e.value;
            e.used = _ml.upgrade.er_crystal[e.value];
            _ml.upgrade.er[i].used += e.used;
            e.require = 0;
          });

          mob.ct.used = 0;
          mob.ct.require = 0;
          $element('td', tr, ['+', { dataset: { action: 'upgrade', index: mob.index, type: 'ct', item: 'all' } }]);
          mob.ct.forEach((e, i) => {
            e.node = $element('td', tr, [e.value, { dataset: { action: 'upgrade', index: mob.index, type: 'ct', item: i } }]);
            e.to = e.value;
            mob.ct.used += (1 + e.value) * e.value / 2;
          });
          _ml.upgrade.ct.used += mob.ct.used;
        });

        _ml.upgrade.sum();
        _ml.upgrade.load();
      },

      update: async function () {
        const mobs = _ml.mobs.filter((mob) => mob.update_needed);
        const total = mobs.length;
        if (!total) {
          return;
        }

        _ml.upgrade.node.button.disabled = true;
        _ml.upgrade.node.button.value = '更新中… …';
        if (_ml.upgrade.node.run) {
          _ml.upgrade.node.run.disabled = true;
          _ml.upgrade.node.run.value = '更新中…';
        }

        async function update(mob) {
          const html = await $ajax.fetch(`?s=Bazaar&ss=ml&slot=${mob.index}`);
          const doc = $doc(html);
          done++;
          mob.update_needed = false;
          _ml.parse(mob, doc);
          _ml.upgrade.node.button.value = `更新中… (${done}/${total})`;
          if (_ml.upgrade.node.run) {
            _ml.upgrade.node.run.value = `${done}/${total}`;
          }
        }

        let done = 0;
        const requests = mobs.map((mob) => update(mob));
        await Promise.all(requests);

        $config.set('ml_log', _ml.log);
        _ml.upgrade.node.button.disabled = false;
        _ml.upgrade.node.button.value = '怪物升级器';
        if (_ml.upgrade.node.run) {
          _ml.upgrade.node.run.value = '完成';
        }
      },

      force_update: function () {
        _ml.mobs.forEach((mob) => {
          mob.log.pl = -1;
        });
        $config.set('ml_log', _ml.log);
        location.href = location.href;
      },

      sort: function (key) {
        if (!['index', 'name', 'class', 'pl', 'wins', 'kills', 'gains', 'gifts', 'morale', 'hunger'].includes(key)) {
          return;
        }
        let order = ['wins', 'kills', 'gains', 'gifts'].includes(key) ? -1 : 1;
        if (key === _ml.upgrade.sort.key) {
          order = _ml.upgrade.sort.order * -1;
        }
        _ml.upgrade.sort.key = key;
        _ml.upgrade.sort.order = order;

        if (!_ml.upgrade.sort.list) {
          _ml.upgrade.sort.list = _ml.mobs.filter((mob) => mob);
        }
        _ml.upgrade.sort.list.sort((a, b) => (a[key] == b[key] ? 0 : a[key] == undefined ? 1 : b[key] == undefined ? -1 : (a[key] > b[key] ? 1 : -1) * order));
        _ml.upgrade.node.table.append(..._ml.upgrade.sort.list.map((mob) => mob.node.tr));
      },

      exec: function (index, type, item, inc) {
        let mobs;
        if (index === 'all') {
          mobs = _ml.mobs;
        } else {
          mobs = [_ml.mobs[index]];
        }
        mobs.forEach((mob) => {
          let items;
          if (item === 'equal') {
            const max = Math.max(...mob[type].map((e) => e.to));
            mob[type].forEach((e) => { e.to = max; });
            items = mob[type];
            inc = 0;
          } else if (item === 'all') {
            items = mob[type];
          } else {
            items = [mob[type][item]];
          }
          items.forEach((e) => {
            const value = e.value;
            let to = e.to + inc;
            const max = type === 'pa' ? 25 : type === 'er' ? 50 : type === 'ct' ? e.max : 0;
            if (to < value) {
              to = value;
            } else if (to > max) {
              to = max;
            }
            e.to = to;
            e.node.textContent = to;
            if (to > value) {
              e.node.classList.add('hvut-ml-up-change');
            } else {
              e.node.classList.remove('hvut-ml-up-change');
            }
          });
          _ml.upgrade.calc(mob);

          mob.node.pl.textContent = mob.pl_to;
          if (mob.pl === mob.pl_to) {
            mob.node.pl.classList.remove('hvut-ml-up-change');
          } else {
            mob.node.pl.classList.add('hvut-ml-up-change');
          }
          mob.node.morale.textContent = mob.morale_to / 100;
          if (mob.morale === mob.morale_to) {
            mob.node.morale.classList.remove('hvut-ml-up-change');
          } else {
            mob.node.morale.classList.add('hvut-ml-up-change');
          }
        });

        _ml.upgrade.sum(true);
      },

      reset: function (index) {
        let mobs;
        if (index === 'all') {
          mobs = _ml.mobs;
        } else {
          mobs = [_ml.mobs[index]];
        }
        mobs.forEach((mob) => {
          mob.pa.forEach((e) => {
            e.to = e.value;
          });
          mob.er.forEach((e) => {
            e.to = e.value;
          });
          mob.ct.forEach((e) => {
            e.to = e.value;
          });
          _ml.upgrade.exec(mob.index, 'pa', 'all', 0);
          _ml.upgrade.exec(mob.index, 'er', 'all', 0);
          _ml.upgrade.exec(mob.index, 'ct', 'all', 0);
          //_ml.upgrade.calc(mob);
        });
        //_ml.upgrade.sum(true);
      },

      calc: function (mob) {
        mob.pa.forEach((e) => {
          e.require = _ml.upgrade.pa_crystal[e.to] - _ml.upgrade.pa_crystal[e.value];
        });
        mob.er.forEach((e) => {
          e.require = _ml.upgrade.er_crystal[e.to] - _ml.upgrade.er_crystal[e.value];
        });

        mob.ct.require = mob.ct.reduce((s, e) => (s + (e.value + 1 + e.to) * (e.to - e.value) / 2), 0);
        mob.pl_to = Math.round(
          mob.pa.reduce((s, e) => (s + _ml.upgrade.pa_pl[e.to]), 0)
          + mob.er.reduce((s, e) => (s + _ml.upgrade.er_pl[e.to]), 0)
        );
        mob.morale_to = Math.min(
          24000,
          mob.morale
          + mob.pa.reduce((s, e) => (s + (_ml.upgrade.pa_morale[e.to] - _ml.upgrade.pa_morale[e.value])), 0)
          + mob.er.reduce((s, e) => (s + (_ml.upgrade.er_morale[e.to] - _ml.upgrade.er_morale[e.value])), 0)
        );
      },

      sum: function (calc) {
        if (calc) {
          _ml.upgrade.pa.forEach((e) => {
            e.require = 0;
          });
          _ml.upgrade.er.forEach((e) => {
            e.require = 0;
          });
          _ml.upgrade.ct.require = 0;

          _ml.mobs.forEach((mob) => {
            mob.pa.forEach((e, i) => {
              _ml.upgrade.pa[i].require += e.require;
            });
            mob.er.forEach((e, i) => {
              _ml.upgrade.er[i].require += e.require;
            });
            _ml.upgrade.ct.require += mob.ct.require;
          });
        }

        _ml.upgrade.pa.forEach((e) => {
          e.li.innerHTML = `
            <span>${e.crystal.slice(11)}</span>
            <span>${e.used.toLocaleString()}</span>
            <span>+${e.require.toLocaleString()}</span>
            <span>(${e.stock.toLocaleString()})</span>`;

          if (e.require > e.stock) {
            e.li.classList.add('hvut-ml-up-nostock');
          } else {
            e.li.classList.remove('hvut-ml-up-nostock');
          }
        });

        _ml.upgrade.er.forEach((e) => {
          e.li.innerHTML = `
            <span>${e.crystal.slice(11)}</span>
            <span>${e.used.toLocaleString()}</span>
            <span>+${e.require.toLocaleString()}</span>
            <span>(${e.stock.toLocaleString()})</span>`;

          if (e.require > e.stock) {
            e.li.classList.add('hvut-ml-up-nostock');
          } else {
            e.li.classList.remove('hvut-ml-up-nostock');
          }
        });

        _ml.upgrade.ct.ul.innerHTML = `
          <li><span>混沌代币</span></li>
          <li><span>(解锁槽位)</span><span>${_ml.upgrade.ct.unlock.toLocaleString()}</span></li>
          <li><span>(升级怪物)</span><span>${_ml.upgrade.ct.used.toLocaleString()}</span></li>
          <li><span>合计消耗</span><span>${(_ml.upgrade.ct.unlock + _ml.upgrade.ct.used).toLocaleString()}</span></li>
          <li><span>需要</span><span>${_ml.upgrade.ct.require.toLocaleString()}</span></li>
          <li><span>库存</span><span>${_ml.upgrade.ct.stock.toLocaleString()}</span></li>`;

        if (_ml.upgrade.ct.require > _ml.upgrade.ct.stock) {
          _ml.upgrade.ct.ul.lastElementChild.classList.add('hvut-ml-up-nostock');
        }
        _ml.upgrade.stock = !$qs('.hvut-ml-up-nostock');
        _ml.upgrade.node.run.disabled = !_ml.upgrade.stock;
      },

      run: async function () {
        if (!_ml.upgrade.stock) {
          alert('水晶或混沌代币不足');
          return;
        }
        if (!confirm('确定要升级选中的怪物吗?')) {
          return;
        }

        const urls = [];
        _ml.mobs.forEach((mob) => {
          let update_needed = false;
          mob.pa.forEach((e, i) => {
            let count = e.to - e.value;
            if (count < 1) {
              return;
            }
            update_needed = true;
            while (count > 10) {
              urls.push([`?s=Bazaar&ss=ml&slot=${mob.index}`, `crystal_upgrade=${_ml.upgrade.pa[i].query}&crystal_count=10`]);
              count -= 10;
            }
            urls.push([`?s=Bazaar&ss=ml&slot=${mob.index}`, `crystal_upgrade=${_ml.upgrade.pa[i].query}&crystal_count=${count}`]);
          });
          mob.er.forEach((e, i) => {
            let count = e.to - e.value;
            if (count < 1) {
              return;
            }
            update_needed = true;
            while (count > 10) {
              urls.push([`?s=Bazaar&ss=ml&slot=${mob.index}`, `crystal_upgrade=${_ml.upgrade.er[i].query}&crystal_count=10`]);
              count -= 10;
            }
            urls.push([`?s=Bazaar&ss=ml&slot=${mob.index}`, `crystal_upgrade=${_ml.upgrade.er[i].query}&crystal_count=${count}`]);
          });
          mob.ct.forEach((e, i) => {
            let count = e.to - e.value;
            if (count < 1) {
              return;
            }
            update_needed = true;
            while (count > 10) {
              urls.push([`?s=Bazaar&ss=ml&slot=${mob.index}`, `chaos_upgrade=${_ml.upgrade.ct[i].query}&chaos_count=10`]);
              count -= 10;
            }
            urls.push([`?s=Bazaar&ss=ml&slot=${mob.index}`, `chaos_upgrade=${_ml.upgrade.ct[i].query}&chaos_count=${count}`]);
          });
          if (update_needed) {
            mob.update_needed = true;
            mob.log.pl = -1;
          }
        });

        const total = urls.length;
        if (total === 0) {
          return;
        }
        $config.set('ml_log', _ml.log);
        _ml.upgrade.node.run.disabled = true;
        _ml.upgrade.node.update.disabled = true;

        async function upgrade(url, post) {
          await $ajax.fetch(url, post);
          done++;
          _ml.upgrade.node.run.value = `${done}/${total}`;
        }

        let done = 0;
        const requests = urls.map(([url, post]) => upgrade(url, post));
        await Promise.all(requests);
        _ml.upgrade.update();
      },

      save: function () {
        _ml.mobs.forEach((mob) => {
          mob.log.pa.forEach((e, i) => {
            e[1] = mob.pa[i].to;
          });
          mob.log.er.forEach((e, i) => {
            e[1] = mob.er[i].to;
          });
          mob.log.ct.forEach((e, i) => {
            e[1] = mob.ct[i].to;
          });
        });

        $config.set('ml_log', _ml.log);
      },
      load: function () {
        _ml.mobs.forEach((mob) => {
          mob.pa.forEach((e, j) => {
            e.to = mob.log.pa[j][1] || e.value;
          });
          mob.er.forEach((e, j) => {
            e.to = mob.log.er[j][1] || e.value;
          });
          mob.ct.forEach((e, j) => {
            e.to = mob.log.ct[j][1] || e.value;
          });
        });

        _ml.upgrade.exec('all', 'pa', 'all', 0);
        _ml.upgrade.exec('all', 'er', 'all', 0);
        _ml.upgrade.exec('all', 'ct', 'all', 0);
      },
      toggle: function () {
        $id('messagebox_outer')?.remove();
        _ml.upgrade.node.div?.classList.toggle('hvut-none');
        _ml.upgrade.init();
      },

    };

    // PL-Crystal Calculator
    _ml.plc = {

      preset: {
        '250': { count: 1, pa_lv: 5, pa_up: 4, er_lv: 14, er_up: 0 },
        '500': { count: 1, pa_lv: 9, pa_up: 3, er_lv: 21, er_up: 4 },
        '750': { count: 1, pa_lv: 12, pa_up: 3, er_lv: 27, er_up: 1 },
        '1000': { count: 1, pa_lv: 15, pa_up: 1, er_lv: 32, er_up: 0 },
        '1250': { count: 1, pa_lv: 17, pa_up: 2, er_lv: 36, er_up: 3 },
        '1500': { count: 1, pa_lv: 19, pa_up: 3, er_lv: 40, er_up: 2 },
        '1750': { count: 1, pa_lv: 21, pa_up: 2, er_lv: 43, er_up: 5 },
        '2250': { count: 1, pa_lv: 25, pa_up: 0, er_lv: 50, er_up: 0 },
      },
      data: {
        pa_crystal: [0],
        pa_pl: [0],
        er_crystal: [0],
        er_pl: [0],
      },
      list: [],
      node: {},

      click: function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) {
          return;
        }
        const { action, index, type, value } = target.dataset;
        if (action === 'add') {
          _ml.plc.add(_ml.plc.preset[value]);
        } else if (action === 'remove') {
          _ml.plc.remove(index);
        } else if (action === 'change') {
          _ml.plc.change(index, type, value);
        }
      },
      input: function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) {
          return;
        }
        const { action, index, type } = target.dataset;
        if (action === 'change') {
          _ml.plc.change(index, type);
        }
      },
      init: function () {
        if (_ml.plc.inited) {
          return;
        }
        _ml.plc.inited = true;

        const data = _ml.plc.data;
        for (let i = 0; i < 26; i++) {
          data.pa_pl[i + 1] = data.pa_pl[i] + (3 + i * 0.5);
          data.pa_crystal[i + 1] = data.pa_crystal[i] + Math.round(50 * Math.pow(1.555079154, i));
        }
        for (let i = 0; i < 51; i++) {
          data.er_pl[i + 1] = data.er_pl[i] + Math.floor(1 + i * 0.1);
          data.er_crystal[i + 1] = data.er_crystal[i] + Math.round(10 * Math.pow(1.26485522, i));
        }

        const node = _ml.plc.node;
        node.div = $element('div', $id('mainpane'), ['.hvut-ml-plc'], (e) => { _ml.plc.click(e); });
        node.left = $element('div', node.div, ['.hvut-ml-plc-left'], { input: (e) => { _ml.plc.input(e); } });

        const total = $element('div', node.left);
        $element('div', total).append(
          $element('span', null, '怪物'), $element('br'), $element('br'),
          node.count = $input('number', null, { min: 0, max: 200, readOnly: true })
        );
        $element('div', total).append(
          $element('span', null, '主属性'), $element('br'),
          $element('span', null, ['水晶', '.hvut-ml-plc-btn']),
          node.pa_total = $element('span', null, ['.hvut-ml-plc-crystal']), $element('br'),
          $element('span', null, ['差值', '.hvut-ml-plc-btn']),
          node.pa_total_diff = $element('span', null, ['.hvut-ml-plc-crystal'])
        );
        $element('div', total).append(
          $element('span', null, '元素减伤'), $element('br'),
          $element('span', null, ['水晶', '.hvut-ml-plc-btn']),
          node.er_total = $element('span', null, ['.hvut-ml-plc-crystal']), $element('br'),
          $element('span', null, ['差值', '.hvut-ml-plc-btn']),
          node.er_total_diff = $element('span', null, ['.hvut-ml-plc-crystal'])
        );

        node.right = $element('div', node.div, ['.hvut-ml-plc-right']);

        const buttons = $element('div', node.right, ['.hvut-ml-plc-buttons']);
        $input(['button', '保存'], buttons, null, () => { _ml.plc.save(); });
        $input(['button', '还原'], buttons, null, () => { _ml.plc.load(); });
        $input(['button', '关闭'], buttons, null, () => { _ml.plc.toggle(); });
        $input(['button', '添加怪物'], buttons, { dataset: { action: 'add' } });
        Object.keys(_ml.plc.preset).forEach((pl) => { $input(['button', pl], buttons, { dataset: { action: 'add', value: pl } }); });

        $element('table', node.right, ['.hvut-ml-plc-table',
          `/<tbody>
          <tr><td>战斗力</td><td>效果</td></tr>
          <tr><td>25</td><td>解锁命名,命名后可在战斗中出战</td></tr>
          <tr><td>200</td><td>解锁第二个技能攻击</td></tr>
          <tr><td>250</td><td>无法再被删除<br>士气流失减少 2 倍</td></tr>
          <tr><td>251</td><td>食物从怪物饲料变为怪物食品</td></tr>
          <tr><td>400</td><td>解锁灵力攻击</td></tr>
          <tr><td>499</td><td>礼物开始可能包含高级材料</td></tr>
          <tr><td>750</td><td>士气流失减少 3 倍<br>低级材料不再作为礼物</td></tr>
          <tr><td>751</td><td>食物从怪物食品变为怪物料理</td></tr>
          <tr><td>1000</td><td>永不停用</td></tr>
          <tr><td>1005</td><td>所有混沌升级均可用</td></tr>
          <tr><td>1250</td><td>士气流失减少 4 倍</td></tr>
          <tr><td>1499</td><td>中级材料不再作为礼物(100% 为高级)</td></tr>
          <tr><td>1750</td><td>士气流失减少 5 倍</td></tr>
          <tr><td>2250</td><td>已达战斗力上限<br>士气流失减少 6 倍</td></tr>
          </tbody>`,
        ]);

        _ml.plc.load();
      },
      save: function () {
        $config.set('ml_plc', _ml.plc.list.filter((m) => m).map((m) => m.json));
        _ml.plc.load();
      },
      load: function () {
        _ml.plc.list.forEach((m) => { m?.node.div.remove(); });
        _ml.plc.list.length = 0;
        $config.get('ml_plc', [_ml.plc.preset['250']]).forEach((j) => { _ml.plc.add(j); });
      },
      toggle: function () {
        _ml.plc.node.div?.classList.toggle('hvut-none');
        _ml.plc.init();
      },

      add: function (j) {
        const m = { json: { count: 1, pa_lv: 0, pa_up: 0, er_lv: 0, er_up: 0 }, node: {} };
        const index = _ml.plc.list.length;
        if (j) {
          Object.assign(m.json, j);
        }
        m.node.div = $element('div', _ml.plc.node.left);
        let sub;
        let span;

        sub = $element('div', m.node.div);
        $input(['button', 'x'], sub, { className: 'hvut-ml-plc-del', dataset: { action: 'remove', index } });
        m.node.index = $element('span', sub, `#${index + 1}`);
        $element('br', sub);
        m.node.pl = $element('span', sub);
        $element('br', sub);
        m.node.count = $input('number', sub, { value: m.json.count, min: 0, max: 200, dataset: { action: 'change', index, type: 'count' } });

        sub = $element('div', m.node.div);
        $element('span', sub, '主属性');
        $element('br', sub);

        span = $element('span', sub, ['.hvut-ml-plc-btn']);
        m.node.pa = [];
        for (let i = 0; i < 6; i++) {
          m.node.pa.push($element('span', span));
        }
        m.node.pa_avg = $element('span', sub, ['.hvut-ml-plc-crystal']);
        $element('br', sub);

        span = $element('span', sub, ['.hvut-ml-plc-btn']);
        $input(['button', '-6'], span, { dataset: { action: 'change', index, type: 'pa', value: '-' } });
        $input(['button', '-1'], span, { dataset: { action: 'change', index, type: 'pa', value: '-1' } });
        $input(['button', '+1'], span, { dataset: { action: 'change', index, type: 'pa', value: '+1' } });
        $input(['button', '+6'], span, { dataset: { action: 'change', index, type: 'pa', value: '+' } });
        m.node.pa_diff = $element('span', sub, ['.hvut-ml-plc-crystal']);

        sub = $element('div', m.node.div);
        $element('span', sub, '元素减伤');
        $element('br', sub);

        span = $element('span', sub, ['.hvut-ml-plc-btn']);
        m.node.er = [];
        for (let i = 0; i < 6; i++) {
          m.node.er.push($element('span', span));
        }
        m.node.er_avg = $element('span', sub, ['.hvut-ml-plc-crystal']);
        $element('br', sub);

        span = $element('span', sub, ['.hvut-ml-plc-btn']);
        $input(['button', '-6'], span, { dataset: { action: 'change', index, type: 'er', value: '-' } });
        $input(['button', '-1'], span, { dataset: { action: 'change', index, type: 'er', value: '-1' } });
        $input(['button', '+1'], span, { dataset: { action: 'change', index, type: 'er', value: '+1' } });
        $input(['button', '+6'], span, { dataset: { action: 'change', index, type: 'er', value: '+' } });
        m.node.er_diff = $element('span', sub, ['.hvut-ml-plc-crystal']);

        _ml.plc.list.push(m);
        _ml.plc.change(index);
      },
      remove: function (index) {
        const m = _ml.plc.list[index];
        m.node.div.remove();
        _ml.plc.list[index] = null;
        _ml.plc.calc();
      },
      change: function (index, type, value) {
        const m = _ml.plc.list[index];
        if (!type) {
        } else if (type === 'count') {
          m.json[type] = (value === undefined ? parseInt(m.node[type].value) : parseInt(value)) || 0;
        } else {
          let lv = m.json[type + '_lv'];
          let up = m.json[type + '_up'];
          const max = type === 'pa' ? 25 : type === 'er' ? 50 : 0;
          if (value === '+') {
            lv++;
            up = 0;
          } else if (value === '-') {
            if (up === 0) {
              lv--;
            }
            up = 0;
          } else {
            up += Number(value);
            if (up >= 6) {
              lv++;
              up -= 6;
            } else if (up < 0) {
              lv--;
              up += 6;
            }
          }
          if (lv < 0) {
            lv = 0;
            up = 0;
          } else if (lv >= max) {
            lv = max;
            up = 0;
          }
          m.json[type + '_lv'] = lv;
          m.json[type + '_up'] = up;
        }

        if (m.node.count.validity.valid) {
          const data = _ml.plc.data;
          const { pa_lv, pa_up, er_lv, er_up } = m.json;
          m.count = m.json.count;
          m.pl = data.pa_pl[pa_lv] * (6 - pa_up) + data.pa_pl[pa_lv + 1] * (pa_up) + data.er_pl[er_lv] * (6 - er_up) + data.er_pl[er_lv + 1] * (er_up);
          m.pa_avg = (data.pa_crystal[pa_lv] * (6 - pa_up) + data.pa_crystal[pa_lv + 1] * (pa_up)) / 6;
          m.er_avg = (data.er_crystal[er_lv] * (6 - er_up) + data.er_crystal[er_lv + 1] * (er_up)) / 6;
          m.diff = m.pa_avg - m.er_avg;

          m.node.pl.textContent = '战力 ' + m.pl;
          m.node.pa.forEach((span, i) => {
            if (i + pa_up >= 6) {
              span.textContent = pa_lv + 1;
              span.classList.add('hvut-ml-plc-up');
            } else {
              span.textContent = pa_lv;
              span.classList.remove('hvut-ml-plc-up');
            }
          });
          m.node.er.forEach((span, i) => {
            if (i + er_up >= 6) {
              span.textContent = er_lv + 1;
              span.classList.add('hvut-ml-plc-up');
            } else {
              span.textContent = er_lv;
              span.classList.remove('hvut-ml-plc-up');
            }
          });
          m.node.pa_avg.textContent = Math.round(m.pa_avg).toLocaleString();
          m.node.pa_diff.textContent = m.diff > 0 ? '(+' + Math.round(m.diff).toLocaleString() + ')' : '';
          m.node.er_avg.textContent = Math.round(m.er_avg).toLocaleString();
          m.node.er_diff.textContent = m.diff < 0 ? '(+' + Math.round(-m.diff).toLocaleString() + ')' : '';

          m.valid = true;
        } else {
          m.valid = false;
        }

        _ml.plc.calc();
      },
      calc: function () {
        let count = 0;
        let pa = 0;
        let er = 0;
        _ml.plc.list.forEach((m) => {
          if (!m?.valid) {
            return;
          }
          count += m.count;
          pa += m.pa_avg * m.count;
          er += m.er_avg * m.count;
        });
        const diff = pa - er;
        _ml.plc.node.count.value = count;
        _ml.plc.node.pa_total.textContent = Math.round(pa).toLocaleString();
        _ml.plc.node.pa_total_diff.textContent = diff > 0 ? '(+' + Math.round(diff).toLocaleString() + ')' : '';
        _ml.plc.node.er_total.textContent = Math.round(er).toLocaleString();
        _ml.plc.node.er_total_diff.textContent = diff < 0 ? '(+' + Math.round(-diff).toLocaleString() + ')' : '';
      },

    };
  }
} else
// [END 12] Bazaar - Monster Lab */


//* [13] Bazaar - MoogleMail
if (_query.s === 'Bazaar' && _query.ss === 'mm' && $config.settings.moogleMail) {
  _mm.node = {};

  _mm.attach_text = function (item) {
    if (!item.data.count) {
      return '';
    } else if (item.data.pane === 'equip') {
      return `[${item.info.eid}] ${item.info.name}` + (item.data.cod ? ` @ ${item.data.cod.toLocaleString()}c` : '');
    } else {
      return `${item.data.count.toLocaleString()} x ${item.info.name}` + (item.data.cod ? ` @ ${item.data.price.toLocaleString()}c = ${item.data.cod.toLocaleString()}c` : '');
    }
  };

  _mm.parse_count = function (str) {
    if (!str) {
      return 0;
    }
    return parseInt(str.replace(/,/g, '')) || 0;
  };

  _mm.parse_price = function (str, float) {
    if (!str) {
      return 0;
    }
    if (/([0-9,]+(?:\.\d*)?)([ckm]?)/i.test(str)) {
      const u = RegExp.$2.toLowerCase();
      let n = parseFloat(RegExp.$1.replace(/,/g, ''));
      if (u === 'm') {
        n *= 1000000;
      } else if (u === 'k') {
        n *= 1000;
      }
      if (!float) {
        n = Math.round(n);
      }
      return n;
    } else {
      return 0;
    }
  };

  // MM WRITE
  if (_query.filter === 'new' && _query.hvut !== 'disabled') {
    if ($id('mmail_attachremove')) {
      alert('请移除已附加的物品。');
      location.href = location.href + '&hvut=disabled';
      return;
    }

    _mm.mmtoken = $id('mailform').elements.mmtoken.value;

    _mm.write_calc = function () {
      const queue = [].concat(_mm.credits_list, _mm.equip_list, _mm.item_list).filter((e) => e.node.check.checked && e.data.count);
      let atext = '';
      let cod_total = 0;
      queue.forEach((e) => {
        atext += `${e.data.atext}\n`;
        cod_total += e.data.cod;
      });
      if (cod_total) {
        if (queue.length > 1) {
          atext += `\nTotal: ${cod_total.toLocaleString()} Credits`;
        }
        const cod_deduction = _mm.parse_price(_mm.node.write_cod_deduction.value);
        if (cod_deduction) {
          const cod = cod_total - cod_deduction;
          atext += `\nDeduction: -${cod_deduction.toLocaleString()} Credits`;
          atext += `\nCoD: ${cod.toLocaleString()} Credits`;
          if (cod < 10) {
            atext += '\n=> CoD: 0 Credits';
          }
        }
      }
      _mm.write_log(atext, true);
    };

    _mm.write_pack = function (e) {
      if (_mm.write_pack.current) {
        popup('正在处理其他请求…');
        return;
      }

      let selected;
      if (!e) {
        selected = [].concat(_mm.credits_list, _mm.equip_list, _mm.item_list).filter((e) => e.node.check.checked && e.data.count);
      } else if (Array.isArray(e)) {
        selected = e;
      } else if (e.data) {
        selected = [e];
        e.data.atext = _mm.attach_text(e);
      } else {
        return;
      }
      if (selected.some((e) => e.data.pane === 'equip' && e.node.div?.dataset.locked == '1')) {
        alert('装备已锁定'); // Equipment cannot be attached, kupo!
        return;
      }
      if (selected.some((e) => e.data.count > e.data.stock)) {
        alert('物品数量不足'); // Insufficient items, kupo!
        return;
      }
      if (!_mm.node.write_to_name.value) {
        alert('无收件人');
        return;
      }
      _mm.write_pack.current = true;
      _mm.node.write_field.disabled = true;
      _mm.userlist.add(_mm.node.write_to_name.value);

      const attach = selected.map((e) => e.data);
      const mail = {
        to_name: _mm.node.write_to_name.value,
        subject: _mm.node.write_subject.value,
        body: _mm.node.write_body.value,
        attach,
        cod_deduction: _mm.parse_price(_mm.node.write_cod_deduction.value),
        cod_persistent: $config.isekai && _mm.node.write_cod_persistent.checked,
      };
      $mail.request(mail);
    };

    _mm.write_log = function (text, clear) {
      if (clear) {
        _mm.node.write_log.value = '';
      }
      _mm.node.write_log.value += text + '\n';
      _mm.node.write_log.scrollTop = _mm.node.write_log.scrollHeight;
    };

    _mm.write_toggle = function (div) {
      if (div === _mm.write_toggle.current) {
        return;
      }
      if (_mm.write_toggle.current) {
        _mm.node[_mm.write_toggle.current].classList.add('hvut-none');
      }
      _mm.write_toggle.current = div;
      _mm.node[_mm.write_toggle.current].classList.remove('hvut-none');
    };

    _mm.userlist = {
      list: $config.get('mm_userlist', []),
      create: function () {
        _mm.node.write_userlist.innerHTML = '';
        _mm.userlist.list.forEach((u) => { $element('option', _mm.node.write_userlist, { value: u }); });
      },
      add: function (user) {
        if (!user) {
          return;
        }
        _mm.userlist.list.unshift(user);
        _mm.userlist.save();
      },
      save: function () {
        _mm.userlist.list = _mm.userlist.list.filter((e, i, a) => e && a.indexOf(e) === i);
        $config.set('mm_userlist', _mm.userlist.list);
        if (_mm.node.write_userlist) {
          _mm.userlist.create();
        }
      },
      popup: function () {
        popup_text(_mm.userlist.list.join('\n'), 300, 300, [
          { text: 'Save', click: (p) => {
            _mm.userlist.list = p.textarea.value.split('\n');
            _mm.userlist.save();
            p.close();
          } },
        ]);
      },
    };

    GM_addStyle(/*css*/`
      #mailform, #mmail_left, #mmail_right { display: none; }

      .hvut-mm-field { margin: 0; padding: 0; border: 0; }
      .hvut-mm-left { float: left; margin-left: 20px; padding-top: 10px; width: 600px; height: 600px; font-size: 10pt; text-align: left; line-height: 30px; }
      .hvut-mm-right { float: right; margin-right: 20px; width: 550px; height: 620px; font-size: 10pt; text-align: left; }
      #mmail_outer input[type='checkbox'] { vertical-align: middle; }

      .hvut-mm-left > span, .hvut-mm-left > label { display: inline-block; line-height: 22px; }
      .hvut-mm-left > span { text-align: right; }
      .hvut-mm-left > label { margin-right: 10px; }
      .hvut-mm-left > :first-child { float: right; }
      .hvut-mm-attachtext { float: right; width: 90px; margin: 2px 5px; display: flex; flex-direction: column; }
      .hvut-mm-attachtext input { margin: 3px 0; white-space: normal; }

      .hvut-mm-tabs { padding: 10px 0; border-bottom: 3px double; display: flex; line-height: 16px; font-weight: bold; }
      .hvut-mm-tabs span { display: inline-block; margin: 0 10px; padding: 2px 5px; border: 1px solid; }
      .hvut-mm-tabs span:first-child { order: 1; margin-left: auto; }
      .hvut-mm-attach-menu { margin-bottom: 10px; padding: 5px 0; border-bottom: 3px double; line-height: 30px; }
      .hvut-mm-disabled { padding: 10px; font-weight: bold; }

      .hvut-mm-attach { height: 475px; overflow-y: scroll; }
      .hvut-mm-attach .itemlist td:nth-child(1) { width: 175px !important; }
      .hvut-mm-attach .itemlist td:nth-child(2) { width: 75px; padding-right: 5px; }
      .hvut-mm-attach .itemlist td:nth-child(3) { width: auto; }
      .hvut-mm-attach .itemlist-credits td:nth-child(1) { width: 100px !important; }
      .hvut-mm-attach .itemlist-credits td:nth-child(2) { width: 145px }
      .hvut-mm-attach input { margin: 0 1px; }
      .hvut-mm-attach input:invalid, .hvut-mm-invalid { color: #e00 !important; }
      .hvut-mm-count { width: 50px; text-align: right; }
      .hvut-mm-price { width: 50px; text-align: right; }
      .hvut-mm-cod { width: 70px; text-align: right; }
      .hvut-mm-send { width: 40px; }
      .hvut-mm-sub { position: absolute; right: 0; z-index: 1; }
      .hvut-mm-eid { visibility: hidden; position: absolute; right: 125px; padding: 0 3px !important; border: 1px solid; line-height: 20px; background-color: #fff; }
      .eqp:hover .hvut-mm-eid { visibility: visible; }
    `);

    _mm.node.write_field = $element('fieldset', $id('mmail_outer'), ['.hvut-mm-field']);
    _mm.node.write_left = $element('div', _mm.node.write_field, ['.hvut-mm-left']);

    $input(['button', '发送'], _mm.node.write_left, { tabIndex: 4, style: 'width: 60px; height: 52px; margin-top: 4px;' }, () => { _mm.write_pack(); });
    $element('span', _mm.node.write_left, ['收件人:', '!width: 60px;']);
    _mm.node.write_to_name = $input('text', _mm.node.write_left, { value: $id('mailform').elements.message_to_name.value || '', tabIndex: 1, style: 'width: 360px; font-weight: bold;' });
    $input(['button', '编辑列表'], _mm.node.write_left, { style: 'width: 80px;' }, () => { _mm.userlist.popup(); });
    $element('span', _mm.node.write_left, ['主题:', '!width: 60px;']);
    _mm.node.write_subject = $input('text', _mm.node.write_left, { value: $id('mailform').elements.message_subject.value || '', tabIndex: 2, style: 'width: 450px; font-weight: bold;' });

    _mm.node.write_to_name.setAttribute('list', 'hvut-mm-userlist');
    _mm.node.write_userlist = $element('datalist', _mm.node.write_left, ['#hvut-mm-userlist']);
    _mm.userlist.create();

    $element('span', _mm.node.write_left, ['选项:', '!width: 60px;']);
    _mm.node.write_cod_deduction = $input(['text', '货到付款扣除'], _mm.node.write_left, { pattern: '(\\d+|\\d{1,3}(,\\d{3})*)(\\.\\d+)?[KMkm]?', style: 'width: 60px; text-align: right;' }, { input: (e) => { _mm.write_calc(e); } });
    if ($config.isekai) {
      _mm.node.write_cod_persistent = $input(['checkbox', 'Persistent 货到付款'], _mm.node.write_left, { checked: true });
    }

    _mm.node.write_body = $element('textarea', _mm.node.write_left, { value: $id('mailform').elements.message_body.value || '', tabIndex: 3, spellcheck: false, style: 'width: 580px; height: 250px; margin-top: 10px;' });
    _mm.node.write_log = $element('textarea', _mm.node.write_left, { readOnly: true, spellcheck: false, style: 'width: 480px; height: 200px; color: unset;' });
    $mail.log = _mm.write_log;

    const attach_div = $element('div', _mm.node.write_left, ['.hvut-mm-attachtext']);
    $input(['button', '从文本添加附件'], attach_div);
    $input(['button', '可用格式'], attach_div, null, () => { popup_text('100 x Health Potion @ 10\n(200) Mana Potion @ 90\nSpirit Potion @ 90 x 300\nLast Elixir @ 1.5k (100)', 300, 100); });
    $input(['button', '计算'], attach_div, null, () => { _mm.item_text(); });
    $input(['button', '添加附件'], attach_div, null, () => { _mm.item_text(true); });
    $input(['button', '重置'], attach_div, null, () => { _mm.item_search('', true); });

    _mm.node.write_right = $element('div', _mm.node.write_field, ['.hvut-mm-right']);
    _mm.node.write_tabs = $element('div', _mm.node.write_right, ['.hvut-mm-tabs hvut-cphu-sub']);
    $element('span', _mm.node.write_tabs, '使用默认莫古邮件', () => { location.href = location.href + '&hvut=disabled'; });

    // MM item
    _mm.item_change = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, iid } = target.dataset;
      const it = iid && _mm.item_list.find((it) => it.info.iid == iid);
      if (action === 'calc') {
        it.data.count = _mm.parse_count(it.node.count.value);
        if (it.data.count > it.data.stock) {
          it.node.count.classList.add('hvut-mm-invalid');
        } else {
          it.node.count.classList.remove('hvut-mm-invalid');
        }
        it.data.price = _mm.parse_price(it.node.price.value, true);
        it.data.cod = Math.ceil(it.data.count * it.data.price);
        it.node.cod.value = it.data.cod ? it.data.cod.toLocaleString() : '';
        it.data.atext = _mm.attach_text(it);
        _mm.write_calc();
      }
    };
    _mm.item_click = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, iid } = target.dataset;
      const it = iid && _mm.item_list.find((it) => it.info.iid == iid);
      if (action === 'send') {
        _mm.write_pack(it);
      }
    };
    _mm.item_set = function (it, count, price) {
      count = parseInt(count);
      if (!isNaN(count)) {
        it.data.count = Math.min(it.data.stock, Math.max(0, count));
        it.node.count.value = it.data.count || '';
        if (it.data.count > it.data.stock) {
          it.node.count.classList.add('hvut-mm-invalid');
        } else {
          it.node.count.classList.remove('hvut-mm-invalid');
        }
      }
      price = parseFloat(price);
      if (!isNaN(price)) {
        it.data.price = Math.max(0, price);
        it.node.price.value = it.data.price || '';
      }
      it.data.cod = Math.ceil(it.data.count * it.data.price);
      it.node.cod.value = it.data.cod ? it.data.cod.toLocaleString() : '';
      it.data.atext = _mm.attach_text(it);
    };
    _mm.item_count = function (num) {
      if (num !== Infinity) {
        num = parseInt(num);
        if (!Number.isInteger(num)) {
          return;
        }
      }
      _mm.item_list.forEach((it) => {
        if (it.node.check.checked) {
          _mm.item_set(it, num === Infinity ? it.data.stock : num);
        }
      });
      _mm.write_calc();
    };
    _mm.item_all = function (checked) {
      _mm.item_list.forEach((it) => {
        if (it.visible) {
          it.node.check.checked = checked;
          it.data.atext = _mm.attach_text(it);
        }
      });
      _mm.write_calc();
    };
    _mm.item_search = function (value, set) {
      if (typeof value === 'string') {
        if (set) {
          _mm.node.item_search.value = value;
        } else {
          value = value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',');
          if (value === _mm.item_search.value) {
            return;
          }
        }
      }

      let results;
      if (!value) {
        results = _mm.item_list;
      } else if (typeof value === 'string') {
        value = value.split(',').map((v) => v.split(' '));
        results = _mm.item_list.filter((e) => {
          const lowercase = e.info.lowercase;
          return e.node.check.checked || value.some((v) => v.every((s) => s && lowercase.includes(s)));
        });
      } else { // array
        results = _mm.item_list.filter((e) => {
          if (value.includes(e.info.name)) {
            return true;
          } else if (e.node.check.checked) {
            return true;
          } else {
            return false;
          }
        });
      }
      _mm.item_list.forEach((e) => { e.visible = false; });
      results.forEach((e) => { e.visible = true; });
      _mm.item_list.forEach((e) => {
        if (e.visible) {
          e.node.tr.classList.remove('hvut-none');
        } else {
          e.node.tr.classList.add('hvut-none');
        }
      });
    };
    _mm.item_text = function (attach) {
      const text = _mm.node.write_body.value.split('\n');
      const textdata = {};
      text.forEach((t) => {
        if (t.includes('> Removed attachment:')) {
          return;
        }

        let exec;
        let name;
        let count;
        let price;
        if ((exec = /([A-Za-z][-A-Za-z0-9' ]*)(?:\s*@\s*([0-9,.]+[ckm]?))?(?:\s+[x*\uff0a]?\s*[[(]?([0-9,]+)[\])]?)/i.exec(t))) {
          name = exec[1];
          count = exec[3];
          price = exec[2];
        } else if ((exec = /(?:[[(]?([0-9,]+)[\])]?\s*[x*\uff0a]?\s*)([A-Za-z][-A-Za-z0-9' ]*)(?:\s*@\s*([0-9,.]+[ckm]?))?/i.exec(t))) {
          name = exec[2];
          count = exec[1];
          price = exec[3];
        } else {
          return;
        }
        name = name.trim();
        count = _mm.parse_count(count);
        price = _mm.parse_price(price, true);
        const lowercase = name.toLowerCase();
        textdata[lowercase] = { name, count, price };
      });

      if (attach) {
        _mm.item_list.forEach((it) => {
          const lowercase = it.info.lowercase;
          const textitem = textdata[lowercase];
          if (textitem) {
            _mm.item_set(it, textitem.count, textitem.price);
            it.visible = true;
            it.node.check.checked = true;
            it.node.tr.classList.remove('hvut-none');
          } else if (it.visible && !it.node.check.checked) {
            it.visible = false;
            it.node.tr.classList.add('hvut-none');
          }
        });
        _mm.write_calc();
      } else {
        let cod = 0;
        let atext = '';
        Object.values(textdata).forEach((textitem) => {
          textitem.cod = Math.ceil(textitem.count * textitem.price);
          cod += textitem.cod;
          atext += `${textitem.count.toLocaleString()} x ${textitem.name}`;
          if (textitem.cod) {
            atext += ` @ ${textitem.price.toLocaleString()}c = ${textitem.cod.toLocaleString()}c`;
          }
          atext += '\n';
        });
        if (cod) {
          atext += `\nTotal: ${cod.toLocaleString()} Credits`;
        }
        _mm.write_log(atext, true);
      }
    };

    _mm.node.item_div = $element('div', null, ['.hvut-none']);
    _mm.node.item_menu = $element('div', _mm.node.item_div, ['.hvut-mm-attach-menu']);
    $input(['button', '全部'], _mm.node.item_menu, null, () => { _mm.item_search(''); });
    $price.init();
    Object.keys($price.groups).forEach((g) => {
      $input(['button', g], _mm.node.item_menu, null, () => { _mm.item_search($price.groups[g]); });
    });
    $element('br', _mm.node.item_menu);
    _mm.node.item_search = $input('text', _mm.node.item_menu, { placeholder: 'heal dra, man pot, elix', style: 'width: 170px;' }, { input: (e) => { _mm.item_search(e.target.value); }, keyup: (e) => { if (e.key === 'Escape') { _mm.item_search('', true); } } });
    $input(['button', '清空'], _mm.node.item_menu, null, () => { _mm.item_search('', true); });
    $input('checkbox', _mm.node.item_menu, { style: 'margin-left: 20px;' }, (e) => { _mm.item_all(e.target.checked); });
    $input('text', _mm.node.item_menu, { placeholder: '数量', style: 'width: 50px; text-align: right;' }, { input: (e) => { _mm.item_count(e.target.value); } });
    $input(['button', '全部'], _mm.node.item_menu, null, () => { _mm.item_count(Infinity); });
    $input(['button', '0'], _mm.node.item_menu, null, () => { _mm.item_count(0); });

    _mm.node.item_attach = $element('div', _mm.node.item_div, ['#item', '.hvut-mm-attach'], { input: (e) => { _mm.item_change(e); }, click: (e) => { _mm.item_click(e); } });
    _mm.node.item_list = $qs('.itemlist') || $element('table');
    _mm.node.item_attach.appendChild(_mm.node.item_list);

    _mm.item_list = Array.from(_mm.node.item_list.rows).map((tr) => {
      const div = tr.cells[0].firstElementChild;
      const name = div.textContent;
      const type = $item.get_type(div.getAttribute('onmouseover'));
      const { iid } = $item.get_data(div.getAttribute('onclick'));
      const lowercase = name.toLowerCase();
      const stock = parseInt(tr.cells[1].textContent);
      return { info: { name, lowercase, iid, type }, data: { pane: 'item', id: iid, name, stock, count: 0, price: 0, cod: 0 }, node: { tr } };
    });
    _mm.item_list.forEach((it) => {
      it.visible = true;
      it.node.tr.classList.add('hvut-it-' + it.info.type);
      it.node.td = $element('td', it.node.tr);
      it.node.check = $input('checkbox', it.node.td, { dataset: { action: 'calc', iid: it.info.iid } });
      it.node.count = $input('text', it.node.td, { dataset: { action: 'calc', iid: it.info.iid }, className: 'hvut-mm-count', placeholder: '数量', pattern: '\\d+|\\d{1,3}(,\\d{3})*', max: it.data.stock });
      it.node.price = $input('text', it.node.td, { dataset: { action: 'calc', iid: it.info.iid }, className: 'hvut-mm-price', placeholder: '价格', pattern: '(\\d+|\\d{1,3}(,\\d{3})*)(\\.\\d+)?[KMkm]?' });
      it.node.cod = $input('text', it.node.td, { className: 'hvut-mm-cod', placeholder: '货到付款', readOnly: true });
      it.node.send = $input(['button', '发送'], it.node.td, { dataset: { action: 'send', iid: it.info.iid }, className: 'hvut-mm-send' });
    });

    if ($id('mmail_attachitem')) {
      $id('item').id += '_';
      $element('span', _mm.node.write_tabs, '物品', () => { _mm.write_toggle('item_div'); });
      _mm.node.write_right.appendChild(_mm.node.item_div);
    }

    // MM equip
    _mm.equip_change = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, eid } = target.dataset;
      const eq = eid && _mm.equip_list.find((eq) => eq.info.eid == eid);
      if (action === 'calc') {
        eq.data.cod = _mm.parse_price(eq.node.price.value);
        eq.data.atext = _mm.attach_text(eq);
        _mm.write_calc();
      }
    };
    _mm.equip_click = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, eid } = target.dataset;
      const eq = eid && _mm.equip_list.find((eq) => eq.info.eid == eid);
      if (action === 'send') {
        _mm.write_pack(eq);
      }
    };
    _mm.equip_all = function (checked) {
      _mm.equip_list.forEach((eq) => {
        if (eq.visible) {
          eq.node.check.checked = checked;
          eq.data.atext = _mm.attach_text(eq);
        }
      });
      _mm.write_calc();
    };
    _mm.equip_search = function (value, set) {
      if (set) {
        _mm.node.equip_search.value = value;
      }
      value = value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',');
      if (value === _mm.equip_search.value) {
        return;
      }
      _mm.equip_search.value = value;

      let results;
      if (!value) {
        results = _mm.equip_list;
      } else {
        value = value.split(',').map((v) => v.split(' '));
        results = _mm.equip_list.filter((e) => {
          const lowercase = e.info.lowercase;
          const eid = e.info.eid ? e.info.eid.toString() : '';
          return e.node.check.checked || value.some((v) => v.every((s) => s && (lowercase.includes(s) || eid.includes(s))));
        });
      }
      _mm.equip_list.forEach((e) => { e.visible = false; });
      results.forEach((e) => { e.visible = true; });
      $equip.sort(results, _mm.node.equip_list);
    };

    _mm.node.equip_div = $element('div', null, ['.hvut-none']);
    _mm.node.equip_menu = $element('div', _mm.node.equip_div, ['.hvut-mm-attach-menu']);
    _mm.node.equip_search = $input('text', _mm.node.equip_menu, { placeholder: 'Equipment name or eid', style: 'width: 310px;' }, { input: (e) => { _mm.equip_search(e.target.value); }, keyup: (e) => { if (e.key === 'Escape') { _mm.equip_search('', true); } } });
    $input(['button', '清空'], _mm.node.equip_menu, null, () => { _mm.equip_search('', true); });
    $input('checkbox', _mm.node.equip_menu, { style: 'margin-left: 20px;' }, (e) => { _mm.equip_all(e.target.checked); });

    _mm.node.equip_attach = $element('div', _mm.node.equip_div, ['#equip', '.hvut-mm-attach'], { input: (e) => { _mm.equip_change(e); }, click: (e) => { _mm.equip_click(e); } });
    _mm.node.equip_list = $qs('.equiplist') || $element('div', null, ['.equiplist nosel']);
    _mm.node.equip_attach.appendChild(_mm.node.equip_list);

    _mm.equip_data = $config.get('equipdata', {});
    _mm.equip_list = $equip.list(_mm.node.equip_list);
    _mm.equip_list.forEach((eq) => {
      eq.visible = true;
      eq.info.lowercase = eq.info.name.toLowerCase();
      eq.data.pane = 'equip';
      eq.data.id = eq.info.eid;
      eq.data.name = eq.info.name;
      eq.data.count = 1;
      eq.node.div.removeAttribute('onclick');
      eq.node.lock = eq.node.wrapper.firstElementChild;
      eq.node.sub = $element('div', [eq.node.div, 'beforebegin'], ['.hvut-mm-sub']);
      eq.node.eid = $element('span', eq.node.sub, [eq.info.eid, '.hvut-mm-eid']);
      eq.node.check = $input('checkbox', eq.node.sub, { dataset: { action: 'calc', eid: eq.info.eid } });
      eq.node.price = $input('text', eq.node.sub, { dataset: { action: 'calc', eid: eq.info.eid }, className: 'hvut-mm-price', placeholder: '价格', pattern: '(\\d+|\\d{1,3}(,\\d{3})*)(\\.\\d+)?[KMkm]?' });
      eq.node.send = $input(['button', '发送'], eq.node.sub, { dataset: { action: 'send', eid: eq.info.eid }, className: 'hvut-mm-send' });

      const json = _mm.equip_data[eq.info.eid];
      if (json?.price) {
        eq.node.price.value = json.price;
        eq.data.cod = _mm.parse_price(json.price);
      }
    });

    if ($id('mmail_attachequip')) {
      $id('equip').id += '_';
      $element('span', _mm.node.write_tabs, '装备', () => { _mm.write_toggle('equip_div'); });
      _mm.node.write_right.appendChild(_mm.node.equip_div);
    }

    // MM credits
    _mm.credits_change = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, name } = target.dataset;
      const it = name && _mm.credits_list.find((it) => it.info.name === name);
      if (action === 'calc') {
        if (name === 'Credits') {
          it.data.count = _mm.parse_price(it.node.count.value);
        } else {
          it.data.count = _mm.parse_count(it.node.count.value);
        }
        if (it.data.count > it.data.stock) {
          it.node.count.classList.add('hvut-mm-invalid');
        } else {
          it.node.count.classList.remove('hvut-mm-invalid');
        }
        it.data.price = _mm.parse_price(it.node.price.value, true);
        it.data.cod = Math.ceil(it.data.count * it.data.price);
        it.node.cod.value = it.data.cod ? it.data.cod.toLocaleString() : '';
        it.data.atext = _mm.attach_text(it);
        _mm.write_calc();
      }
    };

    _mm.credits_list = [];
    const credits = { info: { name: 'Credits' }, data: { pane: 'credits', id: 0, name: 'Credits', stock: 0, count: 0, price: 0, cod: 0 }, node: {} };
    const hath = { info: { name: 'Hath' }, data: { pane: 'hath', id: 0, name: 'Hath', stock: 0, count: 0, price: 0, cod: 0 }, node: {} };
    if ($id('mmail_attachcredits')) {
      credits.data.stock = _mm.parse_count(/Current Funds: ([0-9,]+) Credits/.exec($id('mmail_attachcredits').textContent)[1]);
    }
    if ($id('mmail_attachhath')) {
      hath.data.stock = _mm.parse_count(/Current Funds: ([0-9,]+) Hath/.exec($id('mmail_attachhath').textContent)[1]);
    }

    _mm.node.credits_div = $element('div', null, ['.hvut-none']);
    _mm.node.credits_attach = $element('div', _mm.node.credits_div, ['.hvut-mm-attach'], { input: (e) => { _mm.credits_change(e); } });
    _mm.node.credits_list = $element('table', _mm.node.credits_attach, ['.itemlist itemlist-credits', '/<tbody></tbody>']);

    credits.node.tr = $element('tr', _mm.node.credits_list.tBodies[0]);
    $element('td', credits.node.tr, credits.info.name);
    $element('td', credits.node.tr, credits.data.stock.toLocaleString());
    credits.node.td = $element('td', credits.node.tr);
    credits.node.check = $input('checkbox', credits.node.td, { dataset: { action: 'calc', name: 'Credits' } });
    credits.node.count = $input('text', credits.node.td, { dataset: { action: 'calc', name: 'Credits' }, className: 'hvut-mm-count', placeholder: '数量', pattern: '(\\d+|\\d{1,3}(,\\d{3})*)(\\.\\d+)?[KMkm]?' });
    credits.node.price = $input('text', credits.node.td, { dataset: { action: 'calc', name: 'Credits' }, className: 'hvut-mm-price', placeholder: '价格', pattern: '(\\d+|\\d{1,3}(,\\d{3})*)(\\.\\d+)?[KMkm]?', style: 'visibility: hidden;' });
    credits.node.cod = $input('text', credits.node.td, { className: 'hvut-mm-cod', placeholder: '货到付款', readOnly: true, style: 'visibility: hidden;' });

    hath.node.tr = $element('tr', _mm.node.credits_list.tBodies[0]);
    $element('td', hath.node.tr, hath.info.name);
    $element('td', hath.node.tr, hath.data.stock.toLocaleString());
    hath.node.td = $element('td', hath.node.tr);
    hath.node.check = $input('checkbox', hath.node.td, { dataset: { action: 'calc', name: 'Hath' } });
    hath.node.count = $input('text', hath.node.td, { dataset: { action: 'calc', name: 'Hath' }, className: 'hvut-mm-count', placeholder: '数量', pattern: '\\d+|\\d{1,3}(,\\d{3})*' });
    hath.node.price = $input('text', hath.node.td, { dataset: { action: 'calc', name: 'Hath' }, className: 'hvut-mm-price', placeholder: '价格', pattern: '(\\d+|\\d{1,3}(,\\d{3})*)(\\.\\d+)?[KMkm]?' });
    hath.node.cod = $input('text', hath.node.td, { className: 'hvut-mm-cod', placeholder: '货到付款', readOnly: true });

    if ($id('mmail_attachcredits')) {
      _mm.credits_list.push(credits, hath);
      $element('span', _mm.node.write_tabs, '绅士币 / Hath', () => { _mm.write_toggle('credits_div'); });
      _mm.node.write_right.appendChild(_mm.node.credits_div);
    }

    _mm.credits_multi = function () {
      if (_mm.credits_multi.current) {
        popup('正在处理其他请求…');
        return;
      }
      _mm.credits_multi.current = true;
      _mm.node.write_field.disabled = true;

      const queue = [];
      const errors = [];
      let credits_funds = credits.data.stock;
      let hath_funds = hath.data.stock;
      _mm.node.credits_multi.value.split('\n').forEach((t) => {
        if (!t) {
          return;
        }
        const [to_name, ctext, subject, ...body] = t.split(';');
        if (!to_name) {
          errors.push('无收件人: ' + t);
          return;
        }

        const attach = [];
        if (!ctext) {
        } else if (/^\s*([0-9,.]+[ckm]?)\s*$/i.test(ctext)) {
          const it = { pane: 'credits', name: 'Credits', id: 0, count: _mm.parse_price(RegExp.$1) };
          attach.push(it);
          credits_funds -= it.count;
        } else if (/^\s*([0-9,]+)h\s*$/i.test(ctext)) {
          const it = { pane: 'hath', name: 'Hath', id: 0, count: _mm.parse_count(RegExp.$1) };
          attach.push(it);
          hath_funds -= it.count;
        } else {
          errors.push('无效附件: ' + t);
          return;
        }

        const mail = {
          to_name,
          subject: subject.trim() || _mm.node.write_subject.value,
          body: body.length ? body.join(';').replace(/\|/g, '\n') : _mm.node.write_body.value,
          attach,
        };
        queue.push(mail);
      });
      if (errors.length) {
        alert(errors.join('\n'));
        return;
      }
      if (credits_funds < 0) {
        alert('绅士币不足');
        return;
      }
      if (hath_funds < 0) {
        alert('Hath 不足');
        return;
      }

      queue.map((mail) => $mail.request(mail));
    };

    const multi_div = $element('div', _mm.node.credits_attach, ['!margin-top: 50px;']);
    $input(['button', '群发'], multi_div, { style: 'width: 150px; margin: 10px;' }, () => { _mm.credits_multi(); });
    $element('br', multi_div);
    _mm.node.credits_multi = $element('textarea', multi_div, { placeholder: '用户; 绅士币; 主题; 正文 (| = 换行)\nex)\nsssss2; 10m\nsssss3; 500k; WTB; hi|I want to buy...\nTenboro; 500c\nMoogleMail; 1000h; Thanks', style: 'width: 500px; height: 300px;', spellcheck: false });

    if (!['item_div', 'equip_div', 'credits_div'].some((d) => { if (_mm.node[d].parentNode) { _mm.write_toggle(d); return true; } })) {
      $element('div', _mm.node.write_right, ['/' + $id('mmail_right').innerHTML, '.hvut-mm-disabled']);
      _mm.node.write_cod_deduction.disabled = true;
      if ($config.isekai) {
        _mm.node.write_cod_persistent.disabled = true;
        _mm.node.write_cod_persistent.checked = false;
      }
    }
    _mm.node.write_to_name.focus();

    // MM LIST
  } else if ($id('mmail_list')) {
    _mm.db = {

      version: 1,
      season: 'mm',

      open: function (callback) {
        if (_mm.db.database) {
          callback?.();
          return;
        }
        const request = indexedDB.open($config.ns, _mm.db.version);
        request.onsuccess = function (e) {
          _mm.db.database = e.target.result;
          callback?.();
        };
        request.onupgradeneeded = function (e) {
          const db = e.target.result;
          const stores = [_mm.db.season];
          stores.forEach((store) => {
            if (!db.objectStoreNames.contains(store)) {
              db.createObjectStore(store, { keyPath: 'mid' });
            }
          });
        };
      },
      conn: function (mode = 'readonly', store = _mm.db.season) {
        const db = _mm.db.database;
        const tx = db.transaction(store, mode);
        const os = tx.objectStore(store);
        return { db, tx, os };
      },
      search: function (query) {
        const { season, filter, name, subject, text, attach, eid, cod, cod_min, cod_max } = query;
        const results = [];
        return new Promise((resolve) => {
          const conn = _mm.db.conn('readonly', season);
          conn.os.openCursor().onsuccess = function (e) {
            const cursor = e.target.result;
            if (cursor) {
              const db = cursor.value;
              const mail = _mm.mail_get(db.mid, season);
              mail.db = db;

              const exclude = filter && filter !== db.filter
                  || name && !db.user.toLowerCase().includes(name)
                  || subject && !db.subject.toLowerCase().includes(subject)
                  || text && !db.text.toLowerCase().includes(text)
                  || cod && cod !== db.cod || cod_min && (!db.cod || cod_min > db.cod) || cod_max && cod_max < db.cod
                  || attach && !(db.attach?.some((e) => { if (eid) { return e.t === 'e' && e.e === eid; } else { const n = e.n.toLowerCase(); return attach.every((a) => n.includes(a)); } }));
              if (!exclude) {
                results.push(mail);
              }
              cursor.continue();
            } else {
              resolve(results);
            }
          };
        });
      },
      export: function () {
        _mm.node.db_export.disabled = true;
        const json = [];
        const database = _mm.db.database.name;
        const stores = Array.from(_mm.db.database.objectStoreNames);
        let completed = stores.length;
        stores.forEach((store) => {
          const values = [];
          const conn = _mm.db.conn('readonly', store);
          conn.os.openCursor().onsuccess = function (e) {
            const cursor = e.target.result;
            if (cursor) {
              values.push(cursor.value);
              cursor.continue();
            } else {
              json.push({ database, store, values });
              completed--;
              if (completed === 0) {
                const date = new Date();
                const download = $config.ns.toUpperCase() + '_MoogleMail_' + (date.getFullYear() + ('0' + (date.getMonth() + 1)).slice(-2) + ('0' + date.getDate()).slice(-2)) + '.json';
                const link = $element('a', document.body, { download, style: 'display: none;' });
                window.URL.revokeObjectURL(link.href);
                link.href = window.URL.createObjectURL(new Blob([JSON.stringify(json)], { type: 'application/json' }));
                link.click();
                _mm.node.db_export.value = '完成';
                popup(`<p>文件已保存。</p><p style="font-weight: bold;">${download}</p>`);
              }
            }
          };
        });
      },
      import: function () {
        _mm.node.db_import.disabled = true;
        const input = $input('file', null, { accept: '.json' }, { change: () => {
          const file = input.files[0];
          if (!file) {
            return;
          }
          const reader = new FileReader();
          reader.onload = function (e) {
            db_import(e.target.result);
          };
          reader.onerror = function () {
            alert('读取文件失败');
          };
          reader.readAsText(file);
        } });
        input.click();

        function db_import(text) {
          try {
            const dbname = _mm.db.database.name;
            const stores = Array.from(_mm.db.database.objectStoreNames);
            const json = JSON.parse(text);
            let completed = json.length;

            function complete() {
              completed--;
              if (completed === 0) {
                _mm.node.db_import.value = '完成';
              }
            }

            json.forEach((obj) => {
              const { database, store, values } = obj;
              if (database !== dbname) {
                console.log('Invalid Database');
                complete();
                return;
              }
              if (!stores.includes(store)) {
                complete();
                console.log('Invalid objectStore');
                return;
              }
              const conn = _mm.db.conn('readwrite', store);
              conn.tx.oncomplete = function () {
                complete();
              };
              values.forEach((data) => {
                conn.os.put(data);
              });
            });
          } catch (e) {
            alert('文件解析失败\n请选择有效的莫古邮件数据库 json 文件');
            return;
          }
        }
      },
      clear: function () {
        if (confirm('本浏览器中所选赛季的莫古邮件记录将被删除。\n确定吗?')) {
          const season = _mm.node.search_season?.value || _mm.db.season;
          const conn = _mm.db.conn('readwrite', season);
          conn.os.clear();
        }
      },
      toggle: function () {
        if (_mm.node.db_div) {
          _mm.node.db_div.classList.toggle('hvut-none');
          return;
        }
        _mm.node.db_div = $element('div', _mm.node.bottom);
        $input(['button', '关闭'], _mm.node.db_div, null, () => { _mm.db.toggle(); });
        $input(['button', '重置数据库'], _mm.node.db_div, null, () => { _mm.db.clear(); });
        _mm.node.db_export = $input(['button', '导出为 JSON'], _mm.node.db_div, null, () => { _mm.db.export(); });
        _mm.node.db_import = $input(['button', '从 JSON 导入'], _mm.node.db_div, null, () => { _mm.db.import(); });
      },
      init: function () {
        if ($config.isekai) {
          _mm.db.season = $config.isekai;
          const exec = /(\d+) Season (\d+)/.exec($config.isekai);
          if (exec) {
            const year = exec[1];
            const season = exec[2];
            const version = parseInt(year.slice(2)) * 100 + parseInt(season);
            _mm.db.version = version;
          } else {
            _mm.db.version = 1;
          }
        }
      },

    };

    _mm.page_filter = _query.filter || 'inbox';
    _mm.page_current = parseInt(_query.page) || 0;

    _mm.page_init = function () {
      _mm.node.page_table[_mm.page_current] = $element('table', $id('mmail_outerlist'), ['.hvut-mm-list']);
      _mm.page_create($id('mmail_list'), _mm.page_current);
      $id('mmail_list').remove();
      _mm.page_prev = _mm.page_current;
      _mm.page_next = _mm.page_current;
      _mm.page_pager($id('mmail_pager'), _mm.page_current);
    };

    _mm.page_click = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, mid, season } = target.dataset;
      if (action === 'read') {
        e.preventDefault();
        _mm.mail_read(mid, null, season);
      }
    };

    _mm.page_load = async function (p) {
      if (p === 'prev') {
        if (_mm.page_prev === null) {
          return;
        }
        p = _mm.page_prev;
      } else if (p === 'next') {
        if (_mm.page_next === null) {
          return;
        }
        p = _mm.page_next;
      }
      if (_mm.node.page_table[p]) {
        return;
      }
      _mm.node.page_table[p] = $element('table', [$id('mmail_outerlist'), _mm.node.page_table[p + 1]], ['.hvut-mm-list']);
      const table = _mm.node.page_table[p];
      $element('tr', table, [`/<td>${p} 页: 加载中…</td>`]);
      scrollIntoView(table);
      _mm.node.page_prev.disabled = true;
      _mm.node.page_next.disabled = true;

      const html = await $ajax.fetch(`?s=Bazaar&ss=mm&filter=${_mm.page_filter}&page=${p}`);
      const doc = $doc(html);
      const list = $qs('#mmail_list', doc);
      _mm.kill_asshole(list);
      _mm.page_create(list, p);
      scrollIntoView(table);
      _mm.page_pager($id('mmail_pager', doc), p);
      return doc;
    };

    _mm.page_pager = function (pager, p) {
      const prev = parseInt(pager.children[0].firstElementChild.href?.match(/&page=(\d+)/)[1]) || null;
      const next = parseInt(pager.children[1].firstElementChild.href?.match(/&page=(\d+)/)[1]) || null;
      if (_mm.page_prev !== null && p <= _mm.page_prev) {
        _mm.page_prev = prev;
      }
      if (_mm.page_next !== null && p >= _mm.page_next) {
        _mm.page_next = next;
      }
      _mm.node.page_prev.disabled = _mm.page_prev === null;
      _mm.node.page_next.disabled = _mm.page_next === null;
    };

    _mm.page_create = function (list, p) {
      const table = _mm.node.page_table[p];
      const tbody = $element('tbody');
      const type = { 'inbox': '收件箱', 'read': '发件人', 'sent': '收件人' }[_mm.page_filter];
      $element('tr', tbody, [`/<td>${type}</td><td>${p} 页</td><td>附件</td><td>货到付款</td><td>发送时间</td><td>已读</td>`]);

      const conn = _mm.db.conn();
      let count = list.rows.length - 1;
      Array.from(list.rows).slice(1).forEach((row) => {
        if (row.cells[0].id === 'mmail_nnm') {
          $element('tr', tbody, ['/<td colspan="6">无新邮件</td>']);
          return;
        }
        const mid = parseInt(/mid=(\d+)/.exec(row.getAttribute('onclick'))[1]);
        const user = row.cells[0].textContent;
        const returned = user === 'MoogleMail';
        const subject = row.cells[1].textContent;
        let sent = row.cells[2].textContent;
        sent = Date.parse(sent + ':00.000Z') / 1000;
        let read = row.cells[3].textContent;
        read = read === 'Never' ? null : Date.parse(read + ':00.000Z') / 1000;

        const mail = _mm.mail_get(mid);
        if (mail.page) {
          return;
        }
        mail.page = { filter: _mm.page_filter, user, returned, subject, sent, read };
        const page = mail.page;
        mail.node.page = $element('tr', tbody, ['/<td></td><td></td><td></td><td></td><td></td><td></td>']);
        $element('a', mail.node.page.cells[1], { dataset: { action: 'read', mid: mid }, href: `?s=Bazaar&ss=mm&filter=${page.filter}&mid=${mid}&page=${p}` });

        conn.os.get(mid).onsuccess = function (e) {
          mail.db = e.target.result || null;
          const db = mail.db;
          if (!db || db.filter !== page.filter || !page.returned && !db.user.startsWith(page.user) || db.sent !== page.sent || db.read !== page.read) {
            if (page.filter !== 'inbox') {
              _mm.mail_load(mid);
            }
          }
          _mm.page_modify(mail);
          if (!--count) {
            scrollIntoView(table);
          }
        };
      });
      table.innerHTML = '';
      table.appendChild(tbody);
    };

    _mm.page_modify = function (mail) {
      const page = mail.page;
      const db = mail.db;
      const tr = mail.node.page;
      tr.cells[0].textContent = (db || page).user;
      tr.cells[1].firstElementChild.textContent = (db || page).subject;
      tr.cells[2].innerHTML = '';
      tr.cells[3].innerHTML = '';

      db?.attach?.forEach((e) => {
        const span = $element('span', tr.cells[2], [`.hvut-mm-attach-${e.t}`]);
        if (e.t === 'e') {
          if (e.e && e.k) {
            $element('a', span, { textContent: $config.settings.translateNames ? $equip.$i18n.equipName(e.n) : e.n, href: `equip/${e.e}/${e.k}`, target: '_blank' });
          } else {
            span.textContent = $config.settings.translateNames ? $equip.$i18n.equipName(e.n) : e.n;
          }
        } else {
          span.textContent = `${e.c.toLocaleString()} x ${$config.settings.translateNames ? $equip.$i18n.itemName(e.n) : e.n}`;
        }
      });
      if (db?.cod) {
        tr.cells[3].innerHTML = `<span>${db.cod.toLocaleString()}</span>`;
      }
      tr.cells[4].textContent = _mm.dts(page.sent);
      tr.cells[5].textContent = page.read ? _mm.dts(page.read) : '';

      tr.classList[page.read ? 'remove' : 'add']('hvut-mm-unread');
      tr.classList[(db || page).returned ? 'add' : 'remove']('hvut-mm-returned');
      tr.classList[(db || page).filter !== page.filter ? 'add' : 'remove']('hvut-mm-removed');
      tr.classList[db ? 'remove' : 'add']('hvut-mm-nodb');
    };

    _mm.page_go = function (p) {
      p = parseInt(p);
      if (isNaN(p) || p < 0) {
        return;
      }
      location.href = location.href.replace(/&page=\d+/, '') + '&page=' + p;
    };

    _mm.mail_data = {};

    _mm.mail_get = function (mid, season = _mm.db.season) {
      if (!_mm.mail_data[season]) {
        _mm.mail_data[season] = {};
      }
      if (!_mm.mail_data[season][mid]) {
        _mm.mail_data[season][mid] = { mid, node: {} };
      }
      return _mm.mail_data[season][mid];
    };

    _mm.mail_read = async function (mid, post, season = _mm.db.season) {
      const mail = _mm.mail_get(mid, season);
      if (_mm.mail_current === mail && !post) {
        _mm.mail_close();
        return;
      }
      _mm.mail_close();
      _mm.mail_current = mail;
      _mm.node.mail_view.classList.remove('hvut-none');
      $element('p', _mm.node.mail_view, ['Loading...', '.hvut-mm-loading']);

      mail.node.page?.classList.add('hvut-mm-current');
      mail.node.search?.classList.add('hvut-mm-current');

      if (season === _mm.db.season) {
        await _mm.mail_load(mid, post);
      }
      _mm.mail_view(mail);
    };

    _mm.mail_load = async function (mid, post) {
      const mail = _mm.mail_get(mid);
      const html = await $ajax.fetch('?s=Bazaar&ss=mm&mid=' + mid, post);
      mail.view = _mm.mail_parse(html);
      _mm.mail_update(mail);
      return true;
    };

    _mm.mail_parse = function (arg) {
      let html;
      let doc;
      if (typeof arg === 'string') {
        html = arg;
        doc = $doc(html);
      } else {
        doc = arg;
        html = doc.documentElement.innerHTML;
      }

      const view = {};
      const form = $id('mailform', doc);
      if (form) {
        _mm.mmtoken = form.elements.mmtoken.value;
        view.to = form.elements[3].value;
        view.from = form.elements[4].value;
        view.subject = form.elements[5].value;
        view.text = form.elements[6].value;
        view.attach = [];
        view.return = $qs('#mmail_showbuttons > img[src*="returnmail.png"]', doc) ? true : false;
        view.recall = $qs('#mmail_showbuttons > img[src*="recallmail.png"]', doc) ? true : false;
        view.reply = $qs('#mmail_showbuttons > img[src*="reply.png"]', doc) ? true : false;
        view.take = $qs('#mmail_attachremove > img[src*="attach_takeall.png"]', doc) ? true : false;

        if (view.from === 'MoogleMail') {
          view.from = /This message was returned from (.+), kupo!|This mail was sent to (.+), but was returned, kupo!/.test(view.text.split('\n').reverse().join('\n')) && (RegExp.$1 || RegExp.$2);
          view.returned = true;
        }
        if (view.take) {
          view.filter = 'inbox';
          view.user = view.from;
        } else if (view.reply) {
          view.filter = 'read';
          view.user = view.from;
        } else if (view.returned) {
          view.filter = 'read';
          view.user = view.from;
        } else {
          view.filter = 'sent';
          view.user = view.to;
        }
        view.read = view.filter === 'read' || view.filter === 'sent' && !view.recall;

        if ($id('mmail_attachlist', doc)) {
          Object.assign($equip.dynjs_eqstore, JSON.parse(/var dynjs_eqstore = (\{.*\});/.exec(html)?.[1] || null));
          Array.from($id('mmail_attachlist', doc).children).forEach((div) => {
            let exec;
            const onmouseover = div.firstElementChild.firstElementChild?.getAttribute('onmouseover');
            if (onmouseover && (exec = /equips\.set\((\d+)/.exec(onmouseover))) {
              const eid = parseInt(exec[1]);
              const key = $equip.dynjs_eqstore[eid].k;
              const name = $equip.dynjs_eqstore[eid].t;
              const type = 'e';
              view.attach.push({ t: type, n: name, e: eid, k: key });
            } else if ((exec = /^([0-9,]+)x? (.+)$/.exec(div.textContent))) {
              const count = _mm.parse_count(exec[1]);
              const name = exec[2];
              const type = name === 'Hath' ? 'h' : name === 'Credits' ? 'c' : 'i';
              view.attach.push({ t: type, n: name, c: count });
            } else {
              console.log(div.textContent.trim());
            }
          });
          if ($id('mmail_currentcod', doc)) {
            view.cod = _mm.parse_count(/Requested Payment on Delivery: ([0-9,]+) credits/.exec($id('mmail_currentcod', doc).textContent)[1]);
          }
        } else {
          const split = view.text.split('\n\n').reverse();
          const attach = split[0].split('\n').every((e) => {
            const exec = /^Removed attachment: (?:([0-9,]+)x? (.+)|(.+))$/.exec(e);
            if (!exec) {
              return false;
            }
            if (exec[3]) {
              const name = exec[3];
              const type = 'e';
              view.attach.unshift({ t: type, n: name });
            } else {
              const name = exec[2];
              const type = name === 'Hath' ? 'h' : name === 'Credits' ? 'c' : 'i';
              const count = _mm.parse_count(exec[1]);
              view.attach.unshift({ t: type, n: name, c: count });
            }
            return true;
          });
          if (attach) {
            view.cod = _mm.parse_count(/^CoD Paid: ([0-9,]+) Credits$/.exec(split[1])?.[1]);
          }

          // pre 0.85
          const exec = /^Attached item removed: (?:([0-9,]+)x? (.+)|(.+)) \(type=([chie]) id=(\d+), CoD was ([0-9]+)C\)$/.exec(split[0]);
          if (exec) {
            const type = exec[4];
            if (type === 'e') {
              const name = exec[3];
              const eid = exec[5];
              view.attach.push({ t: type, n: name, e: eid });
            } else {
              const name = exec[2];
              const count = _mm.parse_count(exec[1]);
              view.attach.push({ t: type, n: name, c: count });
            }
            view.cod = _mm.parse_count(exec[6]);
          }
        }
      } else {
        view.error = get_message(doc) || 'UNKNOWN ERROR';
      }

      return view;
    };

    _mm.mail_update = function (mail) {
      const mid = mail.mid;
      const page = mail.page;
      const view = mail.view;

      if (view.error) {
      } else if (mail.db) {
        const db = mail.db;
        const sent = page?.sent || db.sent;
        let read = page?.read || db.read;
        if (read === null && view.read) {
          read = -1;
        }
        if (db.filter !== view.filter || db.user !== view.user || db.subject !== view.subject || db.text !== view.text || db.sent !== sent || db.read !== read) {
          db.filter = view.filter;
          db.user = view.user;
          db.subject = view.subject;
          db.text = view.text;
          db.sent = sent;
          db.read = read;
          if (view.returned) {
            db.returned = 1;
            delete db.cod;
          }
          const conn = _mm.db.conn('readwrite');
          conn.os.put(db);
        }
      } else if (page) {
        mail.db = { mid: mid, filter: view.filter, user: view.user, subject: view.subject, text: view.text, sent: page.sent, read: page.read };
        const db = mail.db;
        if (view.returned) {
          db.returned = 1;
        }
        if (view.attach.length) {
          db.attach = view.attach;
        }
        if (view.cod) {
          db.cod = view.cod;
        }
        const conn = _mm.db.conn('readwrite');
        conn.os.add(db);
      }

      _mm.mail_modify(mail);
    };

    _mm.mail_modify = function (mail) {
      if (mail.node.page) {
        _mm.page_modify(mail);
      }
      if (mail.node.search) {
        _mm.search_modify(mail);
      }
    };

    _mm.mail_view = function (mail) {
      if (_mm.mail_current !== mail) {
        return;
      }
      const mid = mail.mid;
      const view = mail.view || {};
      const db = mail.db;
      const div = _mm.node.mail_view;
      div.innerHTML = '';
      if (!db) {
        $element('p', div, [`ERROR: ${view.error}`, '.hvut-mm-loading']);
        return;
      }
      div.classList[db.returned ? 'add' : 'remove']('hvut-mm-rts');

      const type = db.filter === 'sent' ? '收件人' : '发件人';
      const read = db.read === null ? '-' : db.read === -1 ? '????-??-??' : _mm.dts(db.read, 4);
      $element('dl', div, [`/<dt>${type}</dt><dd>${db.user}</dd><dt>发送时间</dt><dd>${_mm.dts(db.sent, 4)}</dd><dt>主题</dt><dd>${db.subject}</dd><dt>已读</dt><dd>${read}</dd>`]);

      _mm.node.mail_body = $element('textarea', div, { value: db.text, spellcheck: false, readOnly: true });
      const buttons = $element('div', div);
      $input(['button', '关闭'], buttons, { dataset: { action: 'close', mid } });
      if (view.reply) {
        $input(['button', '回复'], buttons, { dataset: { action: 'reply', mid } });
      }
      if (view.take) {
        $input(['button', '全部领取'], buttons, { dataset: { action: 'take', mid, value: view.cod || '' } });
      }
      if (view.return) {
        $input(['button', '退回'], buttons, { dataset: { action: 'return', mid } });
      }
      if (view.recall) {
        $input(['button', '撤回'], buttons, { dataset: { action: 'recall', mid } });
      }
      if (view.error) {
        $input(['button', view.error], buttons);
        div.classList.add('hvut-mm-failed');
      } else {
        div.classList.remove('hvut-mm-failed');
      }
      if (db.returned) {
        $input(['button', `此邮件已被 ${db.user} 退回`], buttons);
      }

      if (view.take && !view.returned && $config.settings.moogleMailCouponClipper && /Coupon Clipper|Item Shop/i.test(db.subject + '\n' + db.text)) {
        $input(['button', '优惠券剪贴者'], buttons, { dataset: { action: 'itemshop', mid } });
      }
      if (view.take && !view.returned && $config.settings.moogleMailDarkDescent && /Dark Descent|reforge/i.test(db.subject + '\n' + db.text)) {
        const [, cost] = _mm.reforge_parse(db.attach);
        if (cost) {
          $input(['button', `黑暗降临 [${cost}]`], buttons, { dataset: { action: 'reforge', mid } });
        }
      }

      mail.attach = [];
      if (db.attach) {
        const ul = $element('ul', div, null, { input: (e) => { _mm.mail_cod(e); } });
        const li = $element('li', ul);
        const wtx = db.filter === 'sent' ? 'WTS' : 'WTB';

        let cod_text;
        if (db.cod) {
          if (db.read) {
            cod_text = `货到付款已付: ${db.cod.toLocaleString()}`;
          } else {
            cod_text = `货到付款: ${db.cod.toLocaleString()}`;
          }
        } else {
          cod_text = '无货到付款';
        }
        $element('span', li, cod_text);
        mail.node.price = $input('text', li, { className: 'hvut-mm-price', readOnly: true, value: wtx });
        mail.node.cod = $input('text', li, { className: 'hvut-mm-cod', readOnly: true });
        mail.attach = JSON.parse(JSON.stringify(db.attach));
        mail.attach.forEach((e) => {
          const li = $element('li', ul);
          const span = $element('span', li, [`.hvut-mm-attach-${e.t}`]);
          if (e.t === 'e') {
            if (e.e && e.k) {
              $element('a', span, { textContent: $config.settings.translateNames ? $equip.$i18n.equipName(e.n) : e.n, href: `equip/${e.e}/${e.k}`, target: '_blank' });
            } else {
              span.textContent = $config.settings.translateNames ? $equip.$i18n.equipName(e.n) : e.n;
            }
          } else {
            span.textContent = `${e.c.toLocaleString()} x ${$config.settings.translateNames ? $equip.$i18n.itemName(e.n) : e.n}`;
          }
          e.node = {};
          if (e.n === 'Credits') {
            return;
          }
          e.node.price = $input('text', li, { className: 'hvut-mm-price' });
          e.node.cod = $input('text', li, { className: 'hvut-mm-cod', readOnly: true });
        });
      }
    };

    _mm.mail_click = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, mid, value } = target.dataset;
      if (action === 'close') {
        _mm.mail_close();
      } else if (action === 'reply') {
        location.href = `?s=Bazaar&ss=mm&filter=new&reply=${mid}`;
      } else if (action === 'take') {
        if (value && !confirm(`领取附件将从你的账户扣除 ${parseInt(value).toLocaleString()} 绅士币。\n确定吗?`)) {
          return;
        }
        _mm.mail_read(mid, `action=attach_remove&mmtoken=${_mm.mmtoken}`);
      } else if (action === 'return') {
        if (!confirm('此操作会将邮件退回给发件人。\n确定吗?')) {
          return;
        }
        _mm.mail_read(mid, `action=return_message&mmtoken=${_mm.mmtoken}`);
      } else if (action === 'recall') {
        if (!confirm('此操作会将邮件退回给发件人。\n确定吗?')) {
          return;
        }
        _mm.mail_read(mid, `action=return_message&mmtoken=${_mm.mmtoken}`);
      } else if (action === 'itemshop') {
        _mm.itemshop_confirm(mid);
      } else if (action === 'reforge') {
        _mm.reforge_confirm(mid);
      }
    };

    _mm.mail_close = function () {
      if (_mm.mail_current) {
        const mail = _mm.mail_current;
        mail.node.page?.classList.remove('hvut-mm-current');
        mail.node.search?.classList.remove('hvut-mm-current');
      }
      _mm.mail_current = null;
      _mm.node.mail_view.classList.add('hvut-none');
      _mm.node.mail_view.innerHTML = '';
      _mm.mail_log('', true);
      _mm.node.mail_log.parentNode.classList.add('hvut-none');
    };

    _mm.mail_cod = function () {
      const mail = _mm.mail_current;
      if (!mail) {
        return;
      }
      const db = mail.db;
      const wtx = db.filter === 'sent' ? 'WTS' : 'WTB';
      const attach = mail.attach;
      let sum = 0;

      attach.forEach((e) => {
        if (e.n === 'Credits') {
          return;
        }
        const p = _mm.parse_price(e.node.price.value, true);
        const cod = p * (e.c || 1);
        e.node.cod.value = cod ? cod.toLocaleString() : '';
        sum += cod;
      });
      mail.node.cod.value = sum ? sum.toLocaleString() : '';
      if (db?.cod) {
        mail.node.price.value = !sum ? wtx : db.cod === sum ? 'CoD =' : db.cod > sum ? 'CoD >' : 'CoD <';
        mail.node.price.dataset.codMatch = db.cod === sum ? '1' : '0';
        mail.node.cod.dataset.codMatch = db.cod === sum ? '1' : '0';
      }
    };

    _mm.mail_log = function (text, clear) {
      _mm.node.mail_log.parentNode.classList.remove('hvut-none');
      if (clear) {
        _mm.node.mail_log.value = '';
      }
      _mm.node.mail_log.value += text + '\n';
      _mm.node.mail_log.scrollTop = _mm.node.mail_log.scrollHeight;
    };

    _mm.search_submit = function () {
      const season = _mm.node.search_season?.value || _mm.db.season;
      const filter = _mm.node.search_filter.value;
      const name = _mm.node.search_name.value.trim().toLowerCase();
      const subject = _mm.node.search_subject.value.trim().toLowerCase();
      const text = _mm.node.search_text.value.trim().toLowerCase();
      let attach = _mm.node.search_attach.value.trim();
      let eid = null;
      let cod = _mm.node.search_cod.value.replace(/\s/g, '').toLowerCase();
      let cod_min = 0;
      let cod_max = 0;
      if (attach) {
        if (isNaN(attach)) {
          attach = attach.toLowerCase().replace(/\s+/g, ' ').split(' ');
        } else {
          eid = parseInt(attach);
        }
      }
      if (/^([0-9.]+[ckm]?)$/i.test(cod)) {
        cod = _mm.parse_price(RegExp.$1);
      } else if (/^([0-9.]+[ckm]?)?[-~]([0-9.]+[ckm]?)?$/i.test(cod)) {
        cod = false;
        cod_min = _mm.parse_price(RegExp.$1);
        cod_max = _mm.parse_price(RegExp.$2);
      } else {
        cod = false;
      }
      const query = { season, filter, name, subject, text, attach, eid, cod, cod_min, cod_max };
      _mm.search(query);
    };

    _mm.search = function (query) {
      _mm.mail_close();
      _mm.node.search_div.innerHTML = '';
      _mm.node.search_div.classList.remove('hvut-none');
      $element('div', _mm.node.search_div, ['Searching...', '.hvut-mm-searching']);

      _mm.db.search(query).then((results) => {
        const table = $element('table', null, ['.hvut-mm-list']);
        const tbody = $element('tbody', table);
        $element('tr', tbody, [`/<td>搜索</td><td>${results.length} 封邮件</td><td>附件</td><td>货到付款</td><td>发送时间</td><td>已读</td>`]);

        results.sort((a, b) => b.db.mid - a.db.mid);
        results.forEach((mail) => {
          const db = mail.db;
          if (!mail.node.search) {
            mail.node.search = $element('tr', tbody, ['/<td></td><td></td><td></td><td></td><td></td><td></td>']);
            if (query.season === _mm.db.season) {
              $element('a', mail.node.search.cells[1], { dataset: { action: 'read', mid: db.mid }, href: `?s=Bazaar&ss=mm&filter=${db.filter}&mid=${db.mid}` });
            } else {
              $element('a', mail.node.search.cells[1], { dataset: { action: 'read', mid: db.mid, season: query.season } });
            }
          }
          tbody.appendChild(mail.node.search);
          _mm.search_modify(mail);
        });

        _mm.node.search_div.innerHTML = '';
        _mm.node.search_div.appendChild(table);
      });
    };

    _mm.search_modify = function (mail) {
      const db = mail.db;
      const tr = mail.node.search;
      const type = { 'inbox': '收件箱', 'read': '发件人', 'sent': '收件人' }[db.filter];
      tr.cells[0].innerHTML = `<span>${type}</span> ${db.user}`;
      tr.cells[1].firstElementChild.textContent = db.subject;
      tr.cells[2].innerHTML = '';
      tr.cells[3].innerHTML = '';

      db.attach?.forEach((e) => {
        const span = $element('span', tr.cells[2], [`.hvut-mm-attach-${e.t}`]);
        if (e.t === 'e') {
          if (e.e && e.k) {
            $element('a', span, { textContent: $config.settings.translateNames ? $equip.$i18n.equipName(e.n) : e.n, href: `equip/${e.e}/${e.k}`, target: '_blank' });
          } else {
            span.textContent = $config.settings.translateNames ? $equip.$i18n.equipName(e.n) : e.n;
          }
        } else {
          span.textContent = `${e.c.toLocaleString()} x ${$config.settings.translateNames ? $equip.$i18n.itemName(e.n) : e.n}`;
        }
      });
      if (db.cod) {
        tr.cells[3].innerHTML = `<span>${db.cod.toLocaleString()}</span>`;
      }
      tr.cells[4].textContent = _mm.dts(db.sent);
      tr.cells[5].textContent = db.read ? _mm.dts(db.read) : '';

      tr.classList[db.read ? 'remove' : 'add']('hvut-mm-unread');
      tr.classList[db.returned ? 'add' : 'remove']('hvut-mm-returned');
    };

    _mm.search_close = function () {
      _mm.node.search_div.classList.add('hvut-none');
      _mm.node.search_div.innerHTML = '';
    };

    _mm.search_keypress = function (e) {
      if (e.key === 'Enter') {
        _mm.search_submit();
      }
    };

    _mm.search_toggle = function () {
      if (_mm.node.search_form) {
        _mm.node.search_form.classList.toggle('hvut-none');
        return;
      }
      _mm.node.search_form = $element('div', _mm.node.bottom, null, { keypress: (e) => { _mm.search_keypress(e); } });
      $input(['button', '关闭'], _mm.node.search_form, null, () => { _mm.search_toggle(); });

      if ($config.isekai) {
        const seasons = Array.from(_mm.db.database.objectStoreNames);
        _mm.node.search_season = $input(['select', seasons], _mm.node.search_form);
        _mm.node.search_season.value = $config.isekai;
      }
      _mm.node.search_filter = $input(['select', [':all', 'inbox', 'read', 'sent']], _mm.node.search_form);
      _mm.node.search_name = $input('text', _mm.node.search_form, { placeholder: '用户', style: 'width: 120px;' });
      _mm.node.search_subject = $input('text', _mm.node.search_form, { placeholder: '主题', style: 'width: 120px;' });
      _mm.node.search_text = $input('text', _mm.node.search_form, { placeholder: '正文', style: 'width: 120px;' });
      _mm.node.search_attach = $input('text', _mm.node.search_form, { placeholder: '附件', style: 'width: 120px;' });
      _mm.node.search_cod = $input('text', _mm.node.search_form, { placeholder: '货到付款 (min-max)', style: 'width: 100px;' });
      $input(['button', '搜索'], _mm.node.search_form, null, () => { _mm.search_submit(); });
      $input(['button', '关闭列表'], _mm.node.search_form, null, () => { _mm.search_close(); });
    };

    _mm.dts = function (date, year = 2) { // date_to_string
      const d = new Date(date * 1000);
      const yy = d.getFullYear().toString().slice(-year);
      const MM = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      const HH = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      return `${yy}-${MM}-${dd} ${HH}:${mm}`;
    };

    _mm.kill_asshole = function (obj) { // email-decode.min.js: usernames with '@' are encoded in html, then decoded
      function h(e, t, r, a) {
        for (r = '', a = '0x' + e.slice(t, t + 2) | 0, t += 2; t < e.length; t += 2) {
          r += String.fromCharCode('0x' + e.slice(t, t + 2) ^ a);
        }
        return r;
      }
      $qsa('.__cf_email__', obj).forEach((a) => {
        a.parentNode.replaceChild(document.createTextNode(h(a.dataset.cfemail, 0)), a);
      });
      return obj;
    };

    _mm.itemshop_confirm = async function (mid) {
      const mail = _mm.mail_get(mid);
      const items = _mm.itemshop_parse();
      if (!items.length) {
        alert('无效请求');
        return;
      }
      await $item.load_shop();
      const cost = $item.cost(items);
      const credits = mail.db.attach.filter((e) => e.n === 'Credits').reduce((s, e) => (s + e.c), 0);
      if (cost !== credits) {
        if (!confirm(`所需材料的总价为 ${cost.toLocaleString()} 绅士币,但附带的绅士币为 ${credits.toLocaleString()}。\n确定吗?`)) {
          return;
        }
      }
      _mm.itemshop(mid, items);
    };

    _mm.itemshop_parse = function (text = _mm.node.mail_body.value) {
      const itemshop_list = [
        'Health Draught',
        'Health Potion',
        'Health Elixir',
        'Mana Draught',
        'Mana Potion',
        'Mana Elixir',
        'Spirit Draught',
        'Spirit Potion',
        'Spirit Elixir',
        'Crystal of Vigor',
        'Crystal of Finesse',
        'Crystal of Swiftness',
        'Crystal of Fortitude',
        'Crystal of Cunning',
        'Crystal of Knowledge',
        'Crystal of Flames',
        'Crystal of Frost',
        'Crystal of Lightning',
        'Crystal of Tempest',
        'Crystal of Devotion',
        'Crystal of Corruption',
        'Monster Chow',
        'Monster Edibles',
        'Monster Cuisine',
        'Happy Pills',
        'Scrap Cloth',
        'Scrap Leather',
        'Scrap Metal',
        'Scrap Wood',
        'Energy Cell',
      ];
      const items = [];
      text.split('\n').forEach((t) => {
        let exec;
        let name;
        let count;
        if (t.startsWith('> ')) {
          return;
        } else if ((exec = /([A-Za-z][-A-Za-z0-9' ]*)(?:\s*@\s*([0-9,.]+[ckm]?))?(?:\s+[x*\uff0a]?\s*[[(]?([0-9,]+)[\])]?)/i.exec(t))) {
          name = exec[1];
          count = exec[3];
        } else if ((exec = /(?:[[(]?([0-9,]+)[\])]?\s*[x*\uff0a]?\s*)([A-Za-z][-A-Za-z0-9' ]*)(?:\s*@\s*([0-9,.]+[ckm]?))?/i.exec(t))) {
          name = exec[2];
          count = exec[1];
        } else {
          return;
        }
        name = name.trim();
        count = _mm.parse_count(count);
        if (itemshop_list.includes(name) && count) {
          const item = { name, count };
          items.push(item);
        }
      });
      return items;
    };

    _mm.itemshop = async function (mid, items) {
      if (_mm.itemshop.current) {
        popup('正在处理其他请求…');
        return;
      }
      _mm.itemshop.current = mid;

      _mm.mail_log('[道具店请求]', true);
      _mm.mail_log('接收中');
      await _mm.mail_load(mid, `action=attach_remove&mmtoken=${_mm.mmtoken}`);
      _mm.mail_log('购买中');

      const result = await $item.buy(items);
      if (!result) {
        return;
      }
      _mm.mail_log('...');

      const attach = items.map((item) => {
        const name = item.name;
        const id = $item.shop[name].id;
        const count = item.count;
        return { pane: 'item', id, name, count };
      });
      const mail = {
        to_name: _mm.mail_get(mid).view.from,
        subject: '[Item Shop Service]',
        body: '[Item Shop Service]',
        attach,
      };
      $mail.request(mail);
    };

    _mm.reforge_confirm = function (mid) {
      const mail = _mm.mail_get(mid);
      const equips = _mm.reforge_parse(mail.db.attach);
      const cost = equips.reduce((s, eq) => (s + Math.ceil(eq.info.tier / 2)), 0);
      if (!cost) {
        alert('没有带潜能的装备');
        return;
      }
      const amnesia = mail.db.attach.filter((e) => e.n === 'Amnesia Shard').reduce((s, e) => (s + e.c), 0);
      if (!amnesia) {
        if (!confirm(`需消耗 ${cost} 个重铸碎片,但未附带任何物品。\n确定吗?`)) {
          return;
        }
      } else if (amnesia !== cost) {
        if (!confirm(`需消耗 ${cost} 个重铸碎片,但附带物品数量为 ${amnesia}。\n确定吗?`)) {
          return;
        }
      }
      _mm.reforge(mid, equips);
    };

    _mm.reforge_parse = function (attach) {
      const equips = attach.filter((e) => e.t === 'e').map((dbeq) => {
        const eid = dbeq.e;
        const dynjs = $equip.dynjs_eqstore[eid];
        const key = dynjs.k;
        const name = dynjs.t;
        const html = dynjs.d;
        const exec = $equip.reg.html.exec(html);
        const category = exec[1];
        const tier = parseInt(exec[6]);
        const eq = {
          info: { eid, key, name, category, tier },
          data: {},
          node: {},
        };
        //$equip.parse.name(eq.info.name, eq);
        return eq;
      });
      return equips;
    };

    _mm.reforge = async function (mid, equips) {
      if (_mm.reforge.current) {
        popup('正在处理其他请求…');
        return;
      }
      _mm.reforge.current = mid;

      _mm.mail_log('[重铸请求]', true);
      _mm.mail_log('接收中');
      await _mm.mail_load(mid, `action=attach_remove&mmtoken=${_mm.mmtoken}`);

      _mm.mail_log('重铸中');
      const html = await $ajax.fetch('?s=Character&ss=in');
      const uid = /var uid = (\d+);/.exec(html)[1];
      const token = /var simple_token = "(\w+)";/.exec(html)[1];
      _mm.mail_log('...');

      async function reforge(eq) {
        let html = await $ajax.fetch('json', { type: 'simple', method: 'lockequip', uid, token, eid: eq.info.eid, lock: 0 }, 'JSON');
        const json = JSON.parse(html);
        if (!json || json.eid != eq.info.eid || json.locked != 0) {
          const error = '解锁失败';
          _mm.mail_log(error);
          return false;
        }
        unlocked++;
        _mm.mail_log(`已解锁 (${unlocked}/${total})`);

        if (!eq.info.tier) {
          reforged++;
          _mm.mail_log(`已重铸 (${reforged}/${total}): 潜能等级 0`);
          return true;
        }

        html = await $ajax.fetch('?s=Forge&ss=fo&filter=' + $equip.alias[eq.info.category], 'select_item=' + eq.info.eid);
        const doc = $doc(html);
        const error = get_message(doc);
        if (error) {
          _mm.mail_log(error);
          return false;
        }
        reforged++;
        _mm.mail_log(`已重铸 (${reforged}/${total})`);
        return true;
      }

      const total = equips.length;
      let unlocked = 0;
      let reforged = 0;
      const requests = equips.map((eq) => reforge(eq));
      const results = await Promise.all(requests);
      if (!results.every((r) => r)) {
        return;
      }

      const attach = equips.map((eq) => {
        const id = eq.info.eid;
        const name = eq.info.name;
        return { pane: 'equip', id, name, count: 1 };
      });
      const mail = {
        to_name: _mm.mail_get(mid).view.from,
        subject: '[Reforge Service]',
        body: '[Reforge Service]',
        attach,
      };
      $mail.request(mail);
    };

    GM_addStyle(/*css*/`
      #mmail_outerlist { margin: 10px; overflow-y: scroll; }
      #mmail_list { display: none; }
      #mmail_pager { display: none; }

      .hvut-mm-list { table-layout: fixed; border-collapse: collapse; margin: 0 auto 10px 0; width: 1180px; font-size: 10pt; line-height: 22px; text-align: left; white-space: nowrap; }
      .hvut-mm-list tr:hover { background-color: #ddd; }
      .hvut-mm-list tr > td:hover { background-color: #fff; }
      .hvut-mm-list tr:first-child > td { border-top: 1px solid; background-color: #edb; font-weight: bold; text-align: center; }
      .hvut-mm-list td { padding: 1px 5px; border-bottom: 1px solid; overflow: hidden; text-overflow: ellipsis; }
      .hvut-mm-list td:nth-child(1) { width: 140px; }
      .hvut-mm-list td:nth-child(1) > span { padding: 1px 3px; border: 1px solid; font-weight: bold; }
      .hvut-mm-list td:nth-child(3) { width: 300px; }
      .hvut-mm-list td:nth-child(4) { width: 80px; text-align: right; }
      .hvut-mm-list td:nth-child(4) > span { color: #03c; }
      .hvut-mm-list td:nth-child(5) { width: 100px; text-align: center; }
      .hvut-mm-list td:nth-child(6) { width: 100px; text-align: center; }

      .hvut-mm-list td:nth-child(2) > a { display: block; text-decoration: none; cursor: pointer; }
      .hvut-mm-list tr:hover > td:nth-child(2) > a { text-decoration: underline; }
      .hvut-mm-list td:nth-child(3) > span { display: block; }
      .hvut-mm-attach-e { color: #c00; }
      .hvut-mm-attach-e > a { color: inherit; }
      .hvut-mm-attach-c { color: #03f; }
      .hvut-mm-attach-h { color: #c0c; }
      .hvut-mm-attach-i { color: #090; }

      .hvut-mm-current { background-color: #edb !important; }
      .hvut-mm-loading { margin: 20px; font-weight: bold; color: #c00; }
      .hvut-mm-returned { background-color: #eee; }
      .hvut-mm-returned * { color: #666 !important; }
      .hvut-mm-unread { background-color: #fcc; }
      .hvut-mm-nodb { background-color: #fcc; }
      .hvut-mm-removed { background-color: #eee; text-decoration: line-through; }

      .hvut-mm-bottom { position: absolute; left: 0; bottom: 8px; width: 100%; display: flex; text-align: left; }
      .hvut-mm-bottom div { position: absolute; left: 0; bottom: 0; width: 100%; background-color: #EDEBDF; }
      .hvut-mm-bottom div > *:first-child { margin-right: 80px; }

      .hvut-mm-search { position: absolute; top: 79px; left: 20px; width: 1200px; height: 580px; border: 2px solid; background-color: #EDEBDF; overflow-y: scroll; z-index: 1; }
      .hvut-mm-searching { position: absolute; top: 50%; transform: translateY(-50%); width: 100%; font-size: 10pt; font-weight: bold; color: #c00; }

      .hvut-mm-view { position: absolute; top: 81px; right: 14px; display: flex; flex-direction: column; width: 626px; height: 566px; padding: 5px; border: 2px solid; background-color: #EDEBDF; font-size: 10pt; line-height: 20px; text-align: left; z-index: 2; }
      .hvut-mm-failed { background-color: #eee; }
      .hvut-mm-view > dl { display: grid; grid-template-columns: 80px auto 80px 120px; gap: 5px; margin: 5px; text-align: center; align-items: center; }
      .hvut-mm-view dt { margin: 0; border: 1px solid; }
      .hvut-mm-view dd { margin: 0; border-bottom: 1px solid; }
      .hvut-mm-view dd:nth-of-type(2n+1) { padding: 0 5px; text-align: left; }
      .hvut-mm-rts dd:nth-of-type(1)::before { content: '[MoogleMail] '; color: #666; }
      .hvut-mm-view > textarea { flex-basis: 191px; }
      .hvut-mm-view > div { display: flex; margin: 5px 0; }
      .hvut-mm-view > ul { margin: 5px; padding: 5px; border: 1px solid; list-style: none; max-height: 242px; overflow: auto; flex-shrink: 0; }
      .hvut-mm-view li:first-child { margin-top: 0; padding: 0 0 0 5px; border: 1px solid; font-weight: bold; }
      .hvut-mm-view li:first-child > .hvut-mm-price { text-align: center; }
      .hvut-mm-view li { display: flex; margin-top: 2px; padding: 0 1px 0 6px; }
      .hvut-mm-view li span:first-child { margin-right: auto; }
      .hvut-mm-view li input { margin: 0; padding: 1px 4px; text-align: right; }
      .hvut-mm-price { width: 60px; }
      .hvut-mm-cod { width: 90px; }
      .hvut-mm-view input[data-cod-match='1'] { color: #03c; }
      .hvut-mm-view input[data-cod-match='0'] { color: #c00; }
      .hvut-mm-rts > ul input { display: none; }

      .hvut-mm-log { position: absolute; top: 81px; right: 652px; border: 2px solid; background-color: #EDEBDF; z-index: 2; }
    `);

    $id('mmail_outerlist').addEventListener('click', _mm.page_click);
    _mm.node.page_table = [];

    _mm.node.bottom = $element('div', $id('mmail_outer'), ['.hvut-mm-bottom']);
    $input(['button', '管理数据库'], _mm.node.bottom, null, () => { _mm.db.toggle(); });
    $input(['button', '搜索邮件'], _mm.node.bottom, null, () => { _mm.search_toggle(); });

    _mm.node.page_go = $input('text', _mm.node.bottom, { value: _mm.page_current, style: 'width: 30px; margin-left: auto; text-align: center;' });
    $input(['button', '跳转'], _mm.node.bottom, null, () => { _mm.page_go(_mm.node.page_go.value); });
    _mm.node.page_prev = $input(['button', '上一页'], _mm.node.bottom, { disabled: true }, () => { _mm.page_load('prev'); });
    _mm.node.page_next = $input(['button', '下一页'], _mm.node.bottom, { disabled: true }, () => { _mm.page_load('next'); });

    _mm.node.search_div = $element('div', $id('mmail_outer'), ['.hvut-mm-search hvut-none'], (e) => { _mm.page_click(e); });
    _mm.node.mail_view = $element('div', $id('mmail_outer'), ['.hvut-mm-view hvut-none'], (e) => { _mm.mail_click(e); });
    _mm.node.mail_log = $element('div', $id('mmail_outer'), ['.hvut-mm-log hvut-none']).appendChild($element('textarea', null, { readOnly: true, spellcheck: false, style: 'width: 300px; height: 300px;' }));
    $mail.log = _mm.mail_log;

    _mm.db.init();
    _mm.db.open(_mm.page_init);
  }
} else
// [END 13] Bazaar - MoogleMail */


//* [14] Bazaar - Lottery
if (_query.s === 'Bazaar' && (_query.ss === 'lt' || _query.ss === 'la')) {
  if ($config.settings.lotteryNotification && $qs('img[src$="lottery_next_d.png"]')) {
    _lt.toggle = function (show) {
      _lt.json[_query.ss].hide = !show;
      $config.set('lt_notif', _lt.json, 'hvut_');
    };
    _lt.json = $config.get('lt_notif', { lt: {}, la: {} }, 'hvut_');

    const div = $element('div', $id('rightpane'), ['!margin-top: 10px; color: #c00;']);
    $input(['checkbox', '在底部栏显示此彩票'], div, { checked: !_lt.json[_query.ss].hide }, { change: (e) => { _lt.toggle(e.target.checked); } });
  }

  confirm_event($qs('img[src$="/lottery_golden_a.png"]'), 'click', '确定要使用一张黄金彩票券吗?');
} else
// [END 14] Bazaar - Lottery */


// Battle
if (_query.s === 'Battle' && $id('initform')) {
  GM_addStyle(/*css*/`
    #arena_list { white-space: nowrap; }
    #arena_list tbody > tr > th:nth-child(1) { width: 474px; }
    #arena_list tbody > tr > th:nth-child(2) { width: 120px; }
    #arena_list tbody > tr > th:nth-child(3) { width: 90px; }
    #arena_list tbody > tr > th:nth-child(4) { width: 90px; }
    #arena_list tbody > tr > th:nth-child(5) { width: 90px; }
    #arena_list tbody > tr > th:nth-child(6) { width: 90px; }
    #arena_list tbody > tr > th:nth-child(7) { width: 120px; }
    #arena_list tbody > tr > th:nth-child(8) { width: 90px; }
    #arena_list tbody > tr > th:nth-child(8) > input { width: 80px; }
    #arena_list tbody > tr > td > div { width: 100% !important; left: 0; }

    .hvut-bt-on #arena_list tr > th:nth-child(1) { width: 302px; }
    .hvut-bt-on #arena_outer #arena_list tr > *:nth-child(2),
    .hvut-bt-on #arena_outer #arena_list tr > *:nth-child(5),
    .hvut-bt-on #arena_outer #arena_list tr > *:nth-child(6),
    .hvut-bt-on #arena_outer #arena_list tr > *:nth-child(7) { display: none; }
    .hvut-bt-on #rob_outer #arena_list tr > *:nth-child(2),
    .hvut-bt-on #rob_outer #arena_list tr > *:nth-child(4),
    .hvut-bt-on #rob_outer #arena_list tr > *:nth-child(5),
    .hvut-bt-on #rob_outer #arena_list tr > *:nth-child(7) { display: none; }
  `);

  _ar.split_colspan = function (table) {
    $qsa('td[colspan="2"]', table).forEach((td) => {
      td.removeAttribute('colspan');
      $element('td', [td, 'beforebegin'], '-');
    });
  };


  //* [16] Battle - Arena
  if (_query.ss === 'ar') {
    _ar.split_colspan($id('arena_list'));
    toggle_button($input('button', $id('arena_list').rows[0].cells[7]), 'Details', 'Collapse', $id('mainpane'), 'hvut-bt-on', true);
    $element('div', [$id('mainpane'), 'afterbegin'], ['#arena_outer']).append($id('arena_list'));
  } else
  // [END 16] Battle - Arena */


  //* [17] Battle - Ring of Blood
  if (_query.ss === 'rb') {
    _ar.split_colspan($id('arena_list'));
    toggle_button($input('button', $id('arena_list').rows[0].cells[7]), 'Details', 'Collapse', $id('mainpane'), 'hvut-bt-on', true);
    $element('div', [$id('mainpane'), 'afterbegin'], ['#rob_outer']).append($id('arena_list'), $id('arena_tokens'));
  } else
  // [END 17] Battle - Ring of Blood */


  //* [18] Battle - GrindFest
  if (_query.ss === 'gr') {

  } else
  // [END 18] Battle - GrindFest */


  //* [19] Battle - Item World
  if (_query.ss === 'iw') {
    _iw.pxp_mod = !$config.isekai ? { 'Normal': 2, 'Hard': 2, 'Nightmare': 4, 'Hell': 7, 'Nintendo': 10, 'IWBTH': 15, 'PFUDOR': 20 } : { 'Normal': 12, 'Hard': 12, 'Nightmare': 12, 'Hell': 21, 'Nintendo': 30, 'IWBTH': 45, 'PFUDOR': 60 };

    _iw.click = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, eid } = target.dataset;
      const eq = eid && _iw.equiplist.find((eq) => eq.info.eid == eid);
      if (action === 'select') {
        _iw.select(eq);
      } else if (action === 'calc') {
        _iw.calc(eq);
      } else if (action === 'reforge') {
        _iw.reforge(eq);
      }
    };

    _iw.select = function (eq) {
      _iw.set_latest(eq);
      if (!eq.info.round) {
        eq.info.round = Math.round(75 * Math.pow((eq.info.pxp - 0.5 - 100) / 250, 3));
        if (eq.info.round > 100) {
          eq.info.round = 100;
        } else if (eq.info.round < 20) {
          eq.info.round = 20;
        }
        eq.info.round_ = eq.info.round;
        if (eq.info.tier) {
          _iw.load(eq);
        }
      }
      _iw.update(eq);
    };

    _iw.calc = function (eq) {
      let round = parseInt(prompt('Enter the number of rounds', eq.info.round));
      if (!round) {
        return;
      }
      if (round > 100) {
        round = 100;
      } else if (round < 20) {
        round = 20;
      }
      eq.info.round_ = round;
      _iw.update(eq);
    };

    _iw.update = function (eq) {
      let gear_exp = eq.info.round_ * _iw.pxp_mod[_player.difficulty];
      if (eq.info.soulbound) {
        gear_exp *= 2;
      }
      let tier = eq.info.tier;
      let pxp1 = eq.info.pxp1 + gear_exp;
      let pxp2 = eq.info.pxp2;
      while (tier < 10 && pxp1 >= pxp2) {
        tier++;
        pxp1 -= pxp2;
        pxp2 = Math.ceil(eq.info.pxp * Math.pow(1 + eq.info.pxp / 1000, tier));
      }
      const pxp_text = tier < 10 ? `(${pxp1} / ${pxp2})` : '(满)';

      eq.node.sub.innerHTML = '';
      $element('span', eq.node.sub, [`IW ${eq.info.tier}`, (eq.info.tier ? '.hvut-iw-tier' : '')]);
      $element('span', eq.node.sub, `(${eq.info.pxp1} / ${eq.info.pxp2})`);
      $element('span', eq.node.sub, [`+${gear_exp} (${eq.info.round_})`, '.hvut-iw-up hvut-cphu', { dataset: { action: 'calc', eid: eq.info.eid } }]);
      $element('span', eq.node.sub, '=>');
      $element('span', eq.node.sub, [`IW ${tier}`, (tier ? '.hvut-iw-tier' : '')]);
      $element('span', eq.node.sub, pxp_text);

      if (!eq.data.potencies?.length) {
        return;
      }
      $element('span', eq.node.sub, ['Reforge', '.hvut-iw-reforge hvut-cphu', { dataset: { action: 'reforge', eid: eq.info.eid } }]);
      eq.data.potencies.forEach((p) => {
        $element('span', eq.node.sub, p);
      });
    };

    _iw.load = async function (eq) {
      const html = await $ajax.fetch(`equip/${eq.info.eid}/${eq.info.key}`);
      const doc = $doc(html);
      const eq_ = $equip.parse.extended($id('equip_extended', doc));
      eq.info.tier = eq_.info.tier;
      eq.info.pxp1 = eq_.info.pxp1;
      eq.info.pxp2 = eq_.info.pxp2;
      eq.data.potencies = $qsa('#ep > span', doc).map((p) => p.textContent);
      _iw.update(eq);
    };

    _iw.reforge = async function (eq) {
      if (!eq.node.lock.classList.contains('iu')) {
        alert('重铸前请先解锁。');
        return;
      }
      if (!confirm(`确定要重铸此物品吗?\n[${eq.info.name}]\n此操作将移除所有潜能并将其等级重置为零。`)) {
        return;
      }
      const html = await $ajax.fetch(`?s=Forge&ss=fo&filter=${_iw.filter}`, `select_item=${eq.info.eid}`);
      const doc = $doc(html);
      const error = get_message(doc);
      if (error) {
        popup(error);
      }
      _iw.load(eq);
    };

    _iw.set_latest = function (eq) {
      _iw.json[_iw.filter] = eq.info.eid;
      $config.set('iw_latest', _iw.json);
    };

    GM_addStyle(/*css*/`
      #itemworld_right { display: none; }
      #itemworld_left { float: none; margin: 0 auto; }
      #itemworld_left .cspp { overflow-y: scroll; }
      div[onclick*='start_itemworld'] { width: 200px; margin: 30px auto 10px; }

      #itemworld_left .eqp { height: 44px; }
      .hvut-iw-latest { border: 1px solid; background-color: #fff !important; }
      .hvut-iw-sub { position: absolute; top: 24px; left: 20px; font-size: 8pt; line-height: 18px; white-space: nowrap; }
      .hvut-iw-sub > * { margin-right: 5px; }
      .hvut-iw-tier { font-weight: bold; }
      .hvut-iw-up { color: #c00; }
      .hvut-iw-reforge { color: #c00; font-weight: bold; margin-left: 5px; }
    `);

    $id('itemworld_left').firstElementChild.prepend($id('accept_button').parentNode);

    $id('item_pane').addEventListener('click', _iw.click);

    _iw.equiplist = $equip.list($qs('#item_pane .equiplist'));
    _iw.equiplist.forEach((eq) => {
      eq.node.div.dataset.action = 'select';
      eq.node.lock = eq.node.wrapper.firstElementChild;
      eq.node.sub = $element('div', [eq.node.div, 'beforebegin'], ['.hvut-iw-sub']);
      $element('span', eq.node.sub, [`IW ${eq.info.tier}`, (eq.info.tier ? '.hvut-iw-tier' : '')]);
      $element('span', eq.node.sub, `(${eq.info.pxp1} / ${eq.info.pxp2})`);
    });

    _iw.json = $config.get('iw_latest', {});
    _iw.filter = _query.filter || '1handed';
    _iw.latest = $id('e' + _iw.json[_iw.filter]);
    if (_iw.latest) {
      $qs('#item_pane > .equiplist').prepend(_iw.latest.parentNode);
      _iw.latest.parentNode.classList.add('hvut-iw-latest');
      _iw.latest.click();
    }
  } else
  // [END 19] Battle - Item World */

  // eslint-disable-next-line brace-style
  {} // END OF [else if]; DO NOT REMOVE THIS LINE!

  $battle.init();
} else
// Battle


//* [21] Forge - Upgrade
if (_query.s === 'Forge' && _query.ss === 'up') {
  _up.exp = { 'Low-Grade': 1, 'Mid-Grade': 5, 'High-Grade': 20, 'Wispy Catalyst': 3, 'Diluted Catalyst': 13, 'Regular Catalyst': 25, 'Robust Catalyst': 63, 'Vibrant Catalyst': 125, 'Coruscating Catalyst': 250 };
  _up.catalysts = ['Wispy Catalyst', 'Diluted Catalyst', 'Regular Catalyst', 'Robust Catalyst', 'Vibrant Catalyst', 'Coruscating Catalyst'];

  _up.sort = function (object) {
    const index = ['Wispy Catalyst', 'Diluted Catalyst', 'Regular Catalyst', 'Robust Catalyst', 'Vibrant Catalyst', 'Coruscating Catalyst', 'Low-Grade', 'Mid-Grade', 'High-Grade', 'Crystallized Phazon', 'Shade Fragment', 'Repurposed Actuator', 'Defense Matrix Modulator', 'Binding of'];
    Object.keys(object).sort((a, b) => index.findIndex((e) => a.includes(e)) - index.findIndex((e) => b.includes(e))).forEach((k) => {
      const v = object[k];
      delete object[k];
      object[k] = v;
    });
  };

  _up.set = function (eq) {
    eq.upgrade.type = { 'One-handed Weapon': 'Metals', 'Two-handed Weapon': 'Metals', 'Staff': 'Wood', 'Shield': 'Wood', 'Cloth Armor': 'Cloth', 'Light Armor': 'Leather', 'Heavy Armor': 'Metals' }[eq.info.category];
    eq.upgrade.rare = { 'Phase': 'Crystallized Phazon', 'Shade': 'Shade Fragment', 'Power': 'Repurposed Actuator', 'Force Shield': 'Defense Matrix Modulator' }[eq.info.type];

    let array = new Array(150);
    array.fill([6, 0, 0], 0);
    array.fill([5, 1, 0], 5);
    array.fill([4, 2, 0], 12);
    array.fill([3, 3, 0], 20);
    array.fill([2, 4, 0], 27);
    array.fill([1, 5, 0], 35);
    array.fill([0, 6, 0], 42);
    array.fill([0, 5, 1], 55);
    array.fill([0, 4, 2], 62);
    array.fill([0, 3, 3], 70);
    array.fill([0, 2, 4], 77);
    array.fill([0, 1, 5], 85);
    array.fill([0, 0, 6], 92);
    array = array.slice({ 'Sup': 0, 'Exq': 15, 'Mag': 30, 'Leg': 50 }[eq.upgrade.quality] || 0);
    const catalysts = _up.catalysts.slice({ 'Sup': 0, 'Exq': 1, 'Mag': 2, 'Leg': 3 }[eq.upgrade.quality] || 0);

    eq.upgrade.requires_50.length = 0;
    eq.upgrade.requires_100.length = 0;
    array.slice(0, 100).forEach((e, i) => {
      const _100 = { materials: {} };
      if (e[0]) { _100.materials['Low-Grade ' + eq.upgrade.type] = e[0]; }
      if (e[1]) { _100.materials['Mid-Grade ' + eq.upgrade.type] = e[1]; }
      if (e[2]) { _100.materials['High-Grade ' + eq.upgrade.type] = e[2]; }
      if (i > 4 && !$config.isekai) {
        _100.binding = true;
      }
      _100.forge_exp = _up.exp['Low-Grade'] * e[0] + _up.exp['Mid-Grade'] * e[1] + _up.exp['High-Grade'] * e[2];

      if (i < 5 || i < 95 && i % 2 === 0) {
        const j = i < 5 ? i : 4 + (i - 4) / 2;
        const _50 = JSON.parse(JSON.stringify(_100));
        const c = catalysts[j < 13 ? 0 : j < 25 ? 1 : 2];
        _50.materials[c] = 1;
        _50.forge_exp += _up.exp[c];
        _50.gear_exp = Math.ceil(_50.forge_exp / 10);
        eq.upgrade.requires_50.push(_50);
      }

      const c = catalysts[i < 25 ? 0 : i < 50 ? 1 : 2];
      _100.materials[c] = 1;
      _100.forge_exp += _up.exp[c];
      _100.gear_exp = Math.ceil(_100.forge_exp / 10);
      eq.upgrade.requires_100.push(_100);
    });
  };

  _up.calc = function (eq, up, t) {
    up.materials = {};
    up.forge_exp = 0;
    up.gear_exp = 0;
    let from;
    let to;
    if (t) {
      from = up.level;
      to = up.to;
    } else {
      from = 0;
      to = up.level;
    }
    up.requires.slice(from, to).forEach((c) => {
      Object.keys(c.materials).forEach((n) => {
        if (!up.materials[n]) {
          up.materials[n] = 0;
        }
        up.materials[n] += c.materials[n];
      });
      if (c.binding) {
        if (!up.materials[up.binding]) {
          up.materials[up.binding] = 0;
        }
        up.materials[up.binding]++;
      }
      up.forge_exp += c.forge_exp;
      up.gear_exp += c.gear_exp;
    });
    if (eq.upgrade.rare && to > eq.upgrade.level) {
      up.materials[eq.upgrade.rare] = to - eq.upgrade.level;
    }
    _up.sort(up.materials);
  };

  _up.sum = function (eq, t) {
    const materials = {};
    let level = 0;
    let forge_exp = 0;
    let gear_exp = 0;
    eq.upgrade.list.forEach((up) => {
      if (t) {
        if (!up.valid || !up.to || up.to === up.level) {
          return;
        }
        if (level < up.to) {
          level = up.to;
        }
      }
      Object.keys(up.materials).forEach((n) => {
        if (!materials[n]) {
          materials[n] = 0;
        }
        materials[n] += up.materials[n];
      });
      forge_exp += up.forge_exp;
      gear_exp += up.gear_exp;
    });
    if (eq.info?.soulbound) {
      gear_exp *= 2;
    }
    if (t) {
      if (eq.upgrade.rare && level > eq.upgrade.level) {
        materials[eq.upgrade.rare] = level - eq.upgrade.level;
      }
    } else {
      if (eq.upgrade.rare) {
        materials[eq.upgrade.rare] = eq.upgrade.level;
      }
    }
    _up.sort(materials);

    const prices = $price.get('Materials');
    const credits = Object.keys(materials).reduce((s, e) => (s + materials[e] * (prices[e] || 0)), 0);

    return { materials, credits, forge_exp, gear_exp };
  };

  _up.salvage_calc = function (q) {
    let text = _up.node.salvage_equip.value.trim();
    if (!text) {
      return;
    }
    text = split2(text, 'Current Owner:')[0].replace(/( (?:of|the))\n/g, '$1 ').replace(/\n((?:Of|The) )/g, ' $1');
    let eq = text.split('\n').map((t) => t.trim()).reverse().find((t) => $equip.parse.name(t).info.type);
    if (!eq) {
      alert('找不到装备名称。');
      return;
    }
    eq = $equip.parse.name(eq);
    let pxp = null;
    let quality;
    if (q) {
      pxp = 0;
      quality = q;
    } else if (/Potency Tier: (\d+) \(\d+ \/ (\d+)\)/.test(text)) {
      pxp = $equip.calcpxp(RegExp.$2, RegExp.$1);
      quality = pxp >= 348 ? 'Leg' : pxp >= 335 ? 'Mag' : pxp >= 313 ? 'Exq' : 'Sup';
    } else {
      quality = { 'Superior': 'Sup', 'Exquisite': 'Exq', 'Magnificent': 'Mag', 'Legendary': 'Leg', 'Peerless': 'Leg' }[eq.info.quality] || 'Sup';
    }
    _up.node.salvage_quality.value = '';

    eq.upgrade = {
      list: [],
      quality: quality,
      level: 0,
      requires_50: [],
      requires_100: [],
    };

    Array.from(text.matchAll(/([\w ]+) Lv\.(\d+)/g)).forEach((m) => {
      const forge = m[1].trim();
      const [name, stat] = Object.entries($equip.stats).find(([, s]) => s.forge === forge) || [];
      if (!name) {
        return;
      }
      const max = forge === 'Physical Damage' || forge === 'Magical Damage' ? 100 : 50;
      const up = {
        name: name,
        forge: forge,
        binding: stat.binding,
        level: parseInt(m[2]),
        requires: max === 100 ? eq.upgrade.requires_100 : eq.upgrade.requires_50,
        materials: {},
        forge_exp: 0,
        gear_exp: 0,
      };
      if (eq.upgrade.level < up.level) {
        eq.upgrade.level = up.level;
      }
      eq.upgrade.list.push(up);
    });

    _up.set(eq);
    eq.upgrade.list.forEach((up) => { _up.calc(eq, up); });

    const { materials, credits } = _up.sum(eq);
    const return_materials = {};
    let return_credits = 0;
    const prices = $price.get('Materials');
    Object.keys(materials).forEach((n) => {
      if (n.includes('Catalyst')) {
        return;
      }
      return_materials[n] = Math.floor(materials[n] * 0.9);
      return_credits += return_materials[n] * (prices[n] || 0);
    });

    const pxp_text = pxp ? `${quality} (${pxp})`
      : pxp === 0 ? `${quality} (已选)`
      : `${quality} ?? (无法计算此装备的基础 PXP)`;

    _up.node.salvage_summary.innerHTML = `
      <li>${$config.settings.translateNames ? $equip.$i18n.displayName(eq) : eq.info.name}</li>
      <li>PXP 品质: ${pxp_text}</li>
      <li>升级费用: ${credits.toLocaleString()}</li>
      <li>返还价值: ${return_credits.toLocaleString()}</li>`;

    _up.node.salvage_returns.innerHTML = '<tr><td>材料</td><td>升级</td><td>返还</td><td>单价</td></tr>';
    Object.keys(materials).forEach((n) => {
      const u = materials[n] || '';
      const r = return_materials[n] || '';
      const p = prices[n] || '';
      if (u) {
        $element('tr', _up.node.salvage_returns, [`/<td>${$config.settings.translateNames ? $equip.$i18n.itemName(n) : n}</td><td>${u}</td><td>${r}</td><td>${p}</td>`]);
      }
    });
  };

  _up.salvage_init = function () {
    if (_up.salvage_init.inited) {
      return;
    }
    _up.salvage_init.inited = true;

    _up.node.salvage = $element('div', $id('mainpane'), ['.hvut-up-salvage']);
    const left = $element('div', _up.node.salvage);
    const right = $element('div', _up.node.salvage);
    if (_up.equip) {
      $input(['button', _up.equip.info.name], left, { style: 'min-width: 350px; margin-bottom: 20px;' }, () => { _up.node.salvage_equip.value = $id('leftpane').textContent; _up.salvage_calc(_up.equip.upgrade.quality); });
      $element('br', left);
    }
    _up.node.salvage_quality = $input(['select', [':PXP 品质', 'Leg:Leg (348~)', 'Mag:Mag (335~348)', 'Exq:Exq (313~335)', 'Sup:Sup (~313)']], left);
    $input(['button', '计算'], left, null, () => { _up.salvage_calc(_up.node.salvage_quality.value); });
    $input(['button', '物品价格'], left, null, () => { $price.edit('Materials', 'ma', _up.salvage_calc); });
    $input(['button', '关闭'], left, null, () => { _up.salvage_toggle(); });
    _up.node.salvage_equip = $element('textarea', left, { placeholder: '复制装备弹窗的完整文本并粘贴到此处。' });
    _up.node.salvage_summary = $element('ul', right);
    _up.node.salvage_returns = $element('table', right);
  };

  _up.salvage_toggle = function () {
    _up.node.salvage?.classList.toggle('hvut-none');
    _up.salvage_init();
  };

  GM_addStyle(/*css*/`
    .hvut-up-salvage { position: absolute; top: 27px; left: 0; width: 100%; height: 675px; display: flex; justify-content: center; align-items: center; background-color: #EDEBDF; font-size: 10pt; line-height: 20px; z-index: 3; }
    .hvut-up-salvage > div { height: 550px; margin: 0 30px; white-space: nowrap; }
    .hvut-up-salvage > div:first-child { width: 400px; }
    .hvut-up-salvage > div:last-child { width: 450px; overflow: auto; }
    .hvut-up-salvage textarea { display: block; width: 380px; height: 450px; margin: 10px auto; }
    .hvut-up-salvage ul { margin: 0 0 10px; padding: 0; list-style-position: inside; text-align: left; }
    .hvut-up-salvage table { table-layout: fixed; border-collapse: collapse; width: 440px; }
    .hvut-up-salvage tr:first-child { font-weight: bold; }
    .hvut-up-salvage td { border: 1px solid; overflow: hidden; text-overflow: ellipsis; }
    .hvut-up-salvage td:nth-child(2) { width: 70px; }
    .hvut-up-salvage td:nth-child(3) { width: 70px; }
    .hvut-up-salvage td:nth-child(4) { width: 80px; }
  `);

  _up.node = {};

  if ($id('equip_extended')) {
    _up.upgrade_change = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const { action, forge } = target.dataset;
      const up = forge && _up.equip.upgrade.list.find((up) => up.forge === forge);
      if (action === 'calc') {
        _up.upgrade_calc(up);
      }
    };

    _up.upgrade_validate = function (up) {
      const eq = _up.equip;
      if (up.node.to.validity.valid) {
        if (up.node.to.value) {
          up.to = parseInt(up.node.to.value);
        } else {
          up.to = up.level;
        }
        up.valid = true;
      } else {
        up.to = up.level;
        up.valid = false;
      }
      _up.calc(eq, up, true);
      up.node.table.innerHTML = '';
      const prices = $price.get('Materials');
      Object.entries(up.materials).forEach(([name, count]) => {
        const stock = $item.count(name);
        const price = prices[name];
        const className = stock < count ? '.hvut-up-nostock' : '';
        $element('tr', up.node.table, [`/<td>${name}</td><td>${count}</td><td>${stock}</td><td>${price}</td>`, className]);
      });
    };

    _up.upgrade_calc = function (up) {
      _up.upgrade_validate(up);

      const eq = _up.equip;
      const stat = eq.stats[up.name];
      if (up.to === up.level) {
        stat.span.textContent = stat.value;
      } else {
        const value = Math.round($equip.forge(up.name, stat.unforged, up.to, eq.info.pxp, eq.info.level || _player.level, eq.upgrades) * 100) / 100;
        if ($equip.stats[up.name].multi) {
          const increase = (1 - (1 - value / 100) / (1 - stat.value / 100)) * 100;
          const title = 'Multiplicative Increase';
          stat.span.innerHTML = `${value}<br><span class="hvut-up-span" title="${title}">~${Math.round(increase * 100) / 100} %</span>`;
        } else {
          const increase = value - stat.value;
          const title = 'Additive Increase';
          stat.span.innerHTML = `${value}<br><span class="hvut-up-span" title="${title}">+${Math.round(increase * 100) / 100}</span>`;
        }
      }
      _up.upgrade_sum();
    };

    _up.upgrade_sum = function () {
      const eq = _up.equip;
      const { materials, credits, forge_exp, gear_exp } = _up.sum(eq, true);
      eq.upgrade.materials = materials;

      let tier = eq.info.tier;
      let pxp1 = eq.info.pxp1 + gear_exp;
      let pxp2 = eq.info.pxp2;
      while (tier < 10 && pxp1 >= pxp2) {
        tier++;
        pxp1 -= pxp2;
        pxp2 = Math.ceil(eq.info.pxp * Math.pow(1 + eq.info.pxp / 1000, tier));
      }
      const pxp_text = tier < 10 ? `(${pxp1} / ${pxp2})` : '(满)';

      _up.node.summary.innerHTML = `
        <li><span>锻造经验</span><span>${forge_exp.toLocaleString()}</span></li>
        <li><span>装备经验</span><span>${gear_exp.toLocaleString()}</span></li>
        <li><span>潜能等级</span><span>${tier} ${pxp_text}</span></li>
        <li><span>总费用</span><span>${credits.toLocaleString()}</span></li>`;

      _up.node.costs.innerHTML = '<tr><td>材料</td><td>需要</td><td>库存</td><td>价格</td></tr>';
      const prices = $price.get('Materials');
      Object.entries(materials).forEach(([name, count]) => {
        const stock = $item.count(name);
        const price = prices[name];
        const className = stock < count ? '.hvut-up-nostock' : '';
        $element('tr', _up.node.costs, [`/<td>${name}</td><td>${count}</td><td>${stock}</td><td>${price}</td>`, className]);
      });

      let valid = false;
      _up.node.run.disabled = true;
      if (_up.upgrade_run.done) {
        //
      } else if (eq.upgrade.list.some((up) => !up.valid)) {
        _up.node.run.value = '输入无效';
      } else if (eq.upgrade.list.some((up) => up.to > up.level && up.to > up.cap)) {
        _up.node.run.value = '锻造等级不足';
      } else if ($qs('.hvut-up-nostock', _up.node.costs)) {
        _up.node.run.value = '材料不足';
      } else {
        valid = true;
        _up.node.run.disabled = false;
        _up.node.run.value = '全部升级';
      }
      return valid;
    };

    _up.upgrade_run = async function () {
      if (_up.upgrade_run.done || !_up.upgrade_sum() || !confirm('确定要升级此装备吗?')) {
        return;
      }
      _up.upgrade_run.done = true;
      _up.node.run.disabled = true;

      async function upgrade(eid, stat) {
        const html = await $ajax.fetch(location.href, `select_item=${eid}&upgrade_stat=${stat}`);
        const doc = $doc(html);
        const error = get_message(doc);
        if (error) { // Equipment Potency Unlocked!
          popup(error);
        }
        done++;
        _up.node.run.value = `${done}/${total}`;
      }

      let total = 0;
      let done = 0;
      const requests = _up.equip.upgrade.list.filter((up) => up.to > up.level).map((up) => {
        const count = up.to - up.level;
        total += count;
        return $ajax.repeat(count, upgrade, _up.equip.info.eid, up.id);
      }).flat();
      await Promise.all(requests);
      alert('完成!\n请刷新页面。');
    };

    _up.buy_catalysts = async function () {
      _up.node.catalysts.disabled = true;

      await $item.once();
      const catalysts = [
        'Wispy Catalyst',
        'Diluted Catalyst',
        'Regular Catalyst',
        'Robust Catalyst',
        'Vibrant Catalyst',
        'Coruscating Catalyst',
      ];
      const requires = _up.equip.upgrade.materials;
      const items = [];
      catalysts.forEach((name) => {
        if (requires[name]) {
          const count = requires[name] - $item.count(name);
          if (count > 0) {
            items.push({ name, count });
          }
        }
      });

      if (!items.length) {
        alert('你已有足够的催化剂。');
        _up.node.catalysts.disabled = false;
        return;
      }
      if (!confirm('确定要购买催化剂吗?')) {
        _up.node.catalysts.disabled = false;
        return;
      }

      const result = await $item.buy(items);
      if (!result) {
        //return;
      }
      _up.load_inventory();
    };

    _up.load_inventory = async function () {
      await $item.load();
      _up.node.catalysts.disabled = false;
      _up.equip.upgrade.list.forEach((up) => { _up.upgrade_validate(up); });
      _up.upgrade_sum();
    };

    GM_addStyle(/*css*/`
      #forge_outer { width: 1100px; }
      #forge_outer + div { width: 370px !important; margin: 0 0 0 64px !important; }
      #forge_outer #leftpane { width: 370px !important; margin-left: 0 !important; }
      #forge_outer #leftpane > div:not(#equip_extended), #forge_outer #leftpane > div:not(#equip_extended) div { width: auto !important; }
      #forge_outer #rightpane { width: 370px !important; }
      #forge_outer #rightpane > div { width: auto !important; }
      #forge_outer .ex > div { height: auto; min-height: 18px; }
      #forge_outer .ep > div { height: auto; min-height: 14px; }

      .hvut-up-span { color: #03c; white-space: nowrap; }
      .hvut-up-input { width: 30px; text-align: right; }
      .hvut-up-input:invalid { color: #e00; }
      .hvut-up-sub { position: absolute; top: 10px; left: 380px; }
      .hvut-up-sub:empty { display: none; }
      .hvut-up-list { table-layout: fixed; border-collapse: collapse; width: 370px; }
      .hvut-up-list tr:hover { background-color: #fff; }
      .hvut-up-list td { padding: 1px !important; }
      .hvut-up-list td:first-child { width: auto !important; }
      .hvut-up-list td:last-child { width: 50px; }
      .hvut-up-list img { margin: 0 !important; }

      .hvut-up-div { float: right; width: 350px; height: 380px; margin-top: 220px; overflow: auto; }
      .hvut-up-buttons { display: flex; justify-content: space-between; }
      .hvut-up-buttons input { margin: 0; }
      .hvut-up-summary { margin: 10px; padding: 0; list-style: none; font-size: 10pt; line-height: 20px; text-align: right; }
      .hvut-up-summary span:first-child { float: left; width: 220px; }
      .hvut-up-costs { table-layout: fixed; border-collapse: collapse; margin: 10px; width: 330px; font-size: 10pt; line-height: 20px; white-space: nowrap; }
      .hvut-up-div .hvut-up-costs tr:first-child { font-weight: bold; }
      .hvut-up-costs td { border: 1px solid #5C0D11; overflow: hidden; text-overflow: ellipsis; }
      .hvut-up-costs td:nth-child(2) { width: 50px; }
      .hvut-up-costs td:nth-child(3) { width: 50px; }
      .hvut-up-costs td:nth-child(4) { width: 60px; }
      .hvut-up-nostock { color: #c00; }
    `);

    _up.node.list = $id('rightpane').children[1].firstElementChild;
    _up.node.list.classList.add('hvut-up-list');
    _up.node.list.addEventListener('input', _up.upgrade_change);
    _up.node.div = $element('div', $id('forge_outer'), ['.hvut-up-div hvut-scrollbar-none']);

    $element('div', _up.node.div, ['.hvut-up-buttons']).append(
      _up.node.run = $input(['button', '全部升级'], null, { tabIndex: -1, style: 'width: 160px;' }, () => { _up.upgrade_run(); }),
      _up.node.catalysts = $input(['button', '购买催化剂'], null, { tabIndex: -1, style: 'width: 100px;' }, () => { _up.buy_catalysts(); }),
      $input(['button', '物品价格'], null, { tabIndex: -1, style: 'width: 80px;' }, () => { $price.edit('Materials', 'ma', _up.upgrade_sum); })
    );
    _up.node.summary = $element('ul', _up.node.div, ['.hvut-up-summary']);
    _up.node.costs = $element('table', _up.node.div, ['.hvut-up-costs']);

    _up.equip = $equip.parse.extended($id('equip_extended'));
    _up.equip.info.eid = $id('forgeform').elements.select_item.value;
    if (_up.equip.info.tier === 10 && !$equip.names[_up.equip.info.eid]) {
      $equip.names[_up.equip.info.eid] = _up.equip.info.name;
      $config.set('equipnames', $equip.names);
    }

    _up.equip.upgrade = {
      list: [],
      quality: null,
      level: 0,
      requires_50: [],
      requires_100: [],
    };

    Array.from(_up.node.list.rows).forEach((tr) => {
      const eq = _up.equip;
      const forge = tr.cells[0].textContent;
      const [name, stat] = Object.entries($equip.stats).find(([, s]) => s.forge === forge) || [];
      const max = forge === 'Physical Damage' || forge === 'Magical Damage' ? 100 : 50;
      const up = {
        id: /'costpane_(\w+)'/.exec(tr.getAttribute('onmouseout'))[1],
        name: name,
        forge: forge,
        binding: stat.binding,
        level: parseInt(tr.cells[1].textContent),
        cap: parseInt(tr.cells[3].textContent),
        max: max,
        requires: max === 100 ? eq.upgrade.requires_100 : eq.upgrade.requires_50,
        materials: {},
        forge_exp: 0,
        gear_exp: 0,
        node: {},
      };
      up.node.to = $input('number', $element('td', tr), { className: 'hvut-up-input', dataset: { action: 'calc', forge: forge }, value: up.level || '', min: up.level, max: up.max });
      up.node.table = $element('table', $id('costpane_' + up.id), ['.hvut-up-sub hvut-up-costs']);

      if (eq.upgrade.level < up.level) {
        eq.upgrade.level = up.level;
      }
      if (!eq.upgrade.quality && /(\w+ Catalyst)/.test($id('costpane_' + up.id).textContent)) {
        const index = (up.level < up.max / 4) ? 0 : (up.level < up.max / 2) ? 1 : 2;
        const catalysts = _up.catalysts.slice(index);
        eq.upgrade.quality = ['Sup', 'Exq', 'Mag', 'Leg'][catalysts.indexOf(RegExp.$1)];
      }
      eq.upgrade.list.push(up);
    });

    _up.set(_up.equip);
    _up.load_inventory();

    $input(['button', '分解计算器'], $id('leftpane'), { style: 'margin-top: 40px;' }, () => { _up.salvage_toggle(); });
  } else {
    $input(['button', '分解计算器'], $id('rightpane'), { style: 'margin-top: 40px;' }, () => { _up.salvage_toggle(); });
  }
} else
// [END 21] Forge - Upgrade */


//* [23] Forge - Salvage
if (_query.s === 'Forge' && _query.ss === 'sa') {
  $element('div', $id('rightpane'), ['此操作将永久销毁该物品', '!margin-top: 30px; font-size: 12pt; font-weight: bold; color: #c00;']);

  if ($id('salvage_button')) {
    confirm_event($id('salvage_button').parentNode, 'click', '确定要分解此物品吗?', () => $id('salvage_button').src.includes('salvage.png'));
  }
} else
// [END 23] Forge - Salvage */

// eslint-disable-next-line brace-style
{} // END OF [else if]; DO NOT REMOVE THIS LINE!


// Sort Equipment List
if (_query.s === 'Forge' && $id('item_pane')) {
  if ((_query.ss === 're' || _query.ss === 'up' || _query.ss === 'en') && (_query.filter === 'equipped' || !_query.filter)) { // equipped
    $equip.list($qs('#item_pane .equiplist'), false);
  } else {
    $equip.list($qs('#item_pane .equiplist'));
  }
}

/* END */