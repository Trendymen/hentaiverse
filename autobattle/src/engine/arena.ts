// 竞技场选靶(Arena)纯函数. 翻写 dodying idleArena 选靶 hvAutoAttack.user.js:2570-2645 + updateArena 日重置 L2522-2533 + token 正则 L2517-2522.
// 零 DOM/零 Store: arena 快照 + cfg 传入, 可控制台喂数据验证.
import type { ArenaStore } from '../types';

const MS_PER_DAY = 24 * 3600_000;

/** 跨日判定(arena.date 与 now 不同 UTC 日). 翻写 updateArena isToday L2503. */
export function isNewDay(arena: ArenaStore, nowMs: number): boolean {
  if (!arena.date) return true;
  return Math.floor(arena.date / MS_PER_DAY) !== Math.floor(nowMs / MS_PER_DAY);
}

/** 每日重置 arena(翻写 updateArena L2522-2533): arenaLevels split+reverse 入 array; gr=grPerDay; arrayDone 清空; token 保留(由 reader 收集). */
export function initArenaCtx(prev: ArenaStore | null, arenaLevels: string, grPerDay: number, nowMs: number): ArenaStore {
  const array = arenaLevels
    ? arenaLevels.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  array.reverse();
  return { array, arrayDone: [], token: prev?.token ?? {}, gr: grPerDay, date: nowMs };
}

/** id → href 映射(翻写 idleArena L2618-2632): gr / ≥105=rb / ≥19=ar&page=2 / 其余=ar. */
export function mapHref(key: string): 'ar' | 'ar&page=2' | 'rb' | 'gr' {
  if (key === 'gr') return 'gr';
  const n = Number(key);
  if (n >= 105) return 'rb';
  if (n >= 19) return 'ar&page=2';
  return 'ar';
}

/** 从 GF 按钮 onclick 扒 token. 翻写 L2517: init_battle(1, 'TOK'). */
export function parseGrToken(onclick: string): string | null {
  const m = onclick.match(/init_battle\(1, *'(.*?)'\)/);
  return m ? m[1] : null;
}

/** 从竞技场按钮 onclick 扒 {等级ID, token}. 翻写 L2521: init_battle(等级,?,'TOK'). */
export function parseArenaToken(onclick: string): { id: string; token: string } | null {
  const m = onclick.match(/init_battle\((\d+),\d+,'(.*?)'\)/);
  return m ? { id: m[1], token: m[2] } : null;
}

export interface PickResult {
  kind: 'battle' | 'need-token' | 'empty';
  key?: string;
  href?: 'ar' | 'ar&page=2' | 'rb' | 'gr';
  initid?: string;
  token?: string;
  arena: ArenaStore; // 更新后(arrayDone push / gr--)
}

/**
 * 选下一靶(翻写 idleArena while 选靶 L2570-2645). 纯函数: 返回意图 + 更新后 arena, 不发请求.
 * - array 不持久化 pop(临时拷贝消费), 靠 arrayDone 去重 —— 与 dodying `const array=[...arena.array]` 一致.
 * - token 有 → battle(非 GF 开战前 arrayDone.push; GF 则 gr--).
 * - token 缺 → need-token(不动 arrayDone/gr; 由 reducer 导航选择页被动收集后重选).
 */
export function pickNextArena(input: ArenaStore): PickResult {
  const arena: ArenaStore = {
    ...input,
    array: [...input.array],
    arrayDone: [...input.arrayDone],
    token: { ...input.token },
  };
  const arr = [...arena.array]; // 临时消费拷贝(不持久化 pop)
  while (arr.length > 0) {
    const raw = arr.pop()!;
    const num = Number(raw);
    const id = isNaN(num) ? 'gr' : String(num);
    if (arena.arrayDone.includes(id) || arena.arrayDone.includes(num)) continue;
    if (id === 'gr') {
      if (arena.gr <= 0) {
        if (!arena.arrayDone.includes('gr')) arena.arrayDone.push('gr');
        continue;
      }
      const token = arena.token.gr;
      if (!token) return { kind: 'need-token', key: 'gr', href: 'gr', arena };
      arena.gr--;
      return { kind: 'battle', key: 'gr', href: 'gr', initid: '1', token, arena };
    }
    const token = arena.token[id];
    if (!token) return { kind: 'need-token', key: id, href: mapHref(id), arena };
    arena.arrayDone.push(num);
    return { kind: 'battle', key: id, href: mapHref(id), initid: id, token, arena };
  }
  return { kind: 'empty', arena };
}
