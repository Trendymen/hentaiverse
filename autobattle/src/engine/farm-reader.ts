// 连刷环境读取(副作用层: 读 DOM/URL/Store; 选择页被动收集 token; e-hentai 注入). 翻写 dodying checkIsHV L2135-2189.
// 解析子函数(token/精力数字)已在 arena.ts/此处抽纯函数; readFarm 只做装配 + 被动收集落盘.
import { $, $$ } from '../core/dom';
import { Store } from '../core/store';
import { parseGrToken, parseArenaToken } from './arena';
import { filterToday } from './encounter';
import type { FarmContext, FarmPage, FarmState, ArenaStore, EncounterRec, StaminaSnapshot } from '../types';

const MS_PER_HOUR = 3600_000;

function emptyArena(nowMs: number): ArenaStore {
  return { array: [], arrayDone: [], token: {}, gr: 0, date: nowMs };
}

/** 从 #stamina_readout 文本提精力数字(翻写 dodying asyncSetStamina L2309 区域). 读不到返回 null. */
export function parseStaminaReadout(root: ParentNode = document): number | null {
  const el = $('#stamina_readout', root);
  if (!el) return null;
  const m = (el.textContent || '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

/** 当前页是否 HV 战斗结束落地(?s=Battle 结尾, 翻写 L320). */
function isBattleEnd(url: string): boolean {
  return url.endsWith('?s=Battle');
}

/** 选择页(?s=Battle&ss=ar|gr|rb): 扒当前页所有 token merge 进 arena 并落盘(被动收集). */
function collectTokens(arena: ArenaStore): ArenaStore {
  const next: ArenaStore = { ...arena, token: { ...arena.token } };
  const gf = $<HTMLElement>('img[src*="startgrindfest.png"]');
  if (gf) {
    const t = parseGrToken(gf.getAttribute('onclick') || '');
    if (t) next.token.gr = t;
  }
  $$<HTMLElement>('img[src*="startchallenge.png"]').forEach((img) => {
    const p = parseArenaToken(img.getAttribute('onclick') || '');
    if (p) next.token[p.id] = p.token;
  });
  return next;
}

/** 读出 FarmContext. 含被动收集 token / e-hentai eventpane 解析 / 精力刷新等副作用. */
export function readFarm(): FarmContext {
  const url = location.href;
  const host = location.host;
  const nowMs = Date.now();
  const nowHour = Math.floor(nowMs / MS_PER_HOUR);
  const storedState = Store.get<FarmState>('farmState', 'IDLE');
  const lastHref = Store.get<string>('lastHref', '');
  const lastEH = Store.get<number>('lastEH', 0);
  const cooldownUntil = Store.get<number>('farmCooldownUntil', 0);

  // 精力快照(读 readout 则刷新缓存)
  const readout = parseStaminaReadout();
  if (readout !== null) {
    Store.set('stamina', readout);
    Store.set('staminaTime', nowHour);
  }
  const stamina: StaminaSnapshot = {
    cached: Store.get<number>('stamina', 0),
    lastTimeHour: Store.get<number>('staminaTime', 0),
    hathperk: Store.get<boolean>('staminaHathperk', false),
  };

  // arena(跨日重置由 reducer/starter 触发; reader 只读 + 选择页收集 token)
  let arena = Store.get<ArenaStore>('arena', emptyArena(nowMs));
  // 过滤当日记录(filterToday 消除跨日旧数据累积; e-hentai unshift 后同样过滤)
  let encounter = filterToday(Store.get<EncounterRec[]>('encounter', []), nowMs);
  let eventHref: string | undefined;
  let hvOrigin = Store.get<string>('hvUrl', 'https://hentaiverse.org');

  let page: FarmPage;

  if (host === 'e-hentai.org') {
    page = 'eh-encounter';
    Store.set('lastEH', nowMs);
    // checkIsHV e-hentai 分支(翻写 L2148-2173)
    const isEngage = url === 'https://e-hentai.org/news.php?encounter';
    const eventpane = $('#eventpane');
    if (eventpane) {
      const a = $<HTMLAnchorElement>('#eventpane>div>a');
      const seg = a?.href.split('/')[3];
      if (seg === undefined) {
        // 新一天: 清空旧日记录, 跳过 unshift(seg=undefined 为无效 href, 不推垃圾记录)
        encounter = [];
        eventHref = undefined;
      } else {
        // seg 有值才 unshift, 过滤当日后落盘
        encounter.unshift({ href: seg, time: nowMs });
        encounter = filterToday(encounter, nowMs);
        Store.set('encounter', encounter);
        eventHref = seg;
      }
    } else {
      // 无 eventpane: 找第一个未接受的(翻写 L2161-2173)
      for (const e of encounter) {
        if (e.encountered) continue;
        if (e.href) {
          eventHref = e.href;
          break;
        }
      }
    }
    void isEngage; // isEngage 当前由 reducer 用 page+eventHref 判定接受/回跳, 此处仅保留语义
  } else {
    // HV 侧: 记录 origin(engage 拼 url 用, 翻写 L2137). 跨日重置交 starter.ensureArena(reader 不碰 config).
    hvOrigin = location.origin;
    Store.set('hvUrl', hvOrigin);
    // 缓存最后一个非战斗结束页 href(翻写 dodying L324-326: RETURN 时 navigate 回此页, 不落到空串)
    // ?s=Battle 结尾=战斗结束落地页, 排除; ?s=Battle&ss=ar 选择页仍记录(回跳到选择页可继续连刷, 不死循环)
    if (!url.endsWith('?s=Battle')) Store.set('lastHref', url);
    // 选择页被动收集 token(?s=Battle&ss=ar|gr|rb)
    if (/\?s=Battle&ss=(ar|gr|rb)/.test(url)) {
      arena = collectTokens(arena);
      Store.set('arena', arena);
    }
    page = isBattleEnd(url) ? 'hv-battle-end' : 'hv-out';
  }

  // ── M3 增量: 异世界续刷 + 战败退出 ──
  const isIsekai = Store.get<boolean>('isIsekai', false);
  const lastIsekaiSwitch = Store.get<number>('lastIsekaiSwitch', 0);
  const defeated = Store.get<boolean>('farmDefeated', false);

  return { page, url, host, hvOrigin, nowMs, nowHour, storedState, arena, stamina, encounter, lastEH, lastHref, eventHref, cooldownUntil, isIsekai, lastIsekaiSwitch, defeated };
}
