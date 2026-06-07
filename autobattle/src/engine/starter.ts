// 连刷 FSM 引擎壳: farmTick = read → routeStartup → reduce → persist → exec. 节奏锁 farmBusyUntil. 翻写 dodying 调度 + STARTUP 路由(URL 强信号优先).
import { config, type Config } from '../core/config';
import { Store } from '../core/store';
import { bus } from '../core/bus';
import { readFarm } from './farm-reader';
import { farmReducer } from './farm-reducer';
import { execFarm } from './farm-executor';
import { initArenaCtx, isNewDay } from './arena';
import type { FarmContext, FarmState, FarmReducerCfg, ArenaStore } from '../types';

let farmBusyUntil = 0;

/** 从 config 装配 reducer 配置(仿 weightCfg; 纯函数不碰单例). */
export function farmCfg(C: Config): FarmReducerCfg {
  return {
    farmEnabled: C.farmEnabled,
    autoEncounter: C.autoEncounter,
    restoreStamina: C.restoreStamina,
    staminaLow: C.staminaLow,
    staminaLowWithNat: C.staminaLowWithNat,
    staminaEncounter: C.staminaEncounter,
    encounterCdMs: C.encounterCdMin * 60_000,
    grPerDay: C.grPerDay,
    arenaLevels: C.arenaLevels,
    staminaHathperk: C.staminaHathperk,
    // ── M3 增量: 异世界续刷 + 战败退出 ──
    autoSwitchIsekai: C.autoSwitchIsekai,
    isekaiGuardMs: C.ISEKAI_SWITCH_GUARD_MIN * 60_000,
    autoSkipDefeated: C.autoSkipDefeated,
  };
}

/** STARTUP 路由: URL 强信号优先于 Store state(翻写 dodying URL+localStorage 双判, 收敛到一处). */
function routeStartup(ctx: FarmContext): FarmState {
  if (ctx.page === 'eh-encounter') return 'ENCOUNTER_WAIT';
  if (ctx.page === 'in-battle') return 'IN_BATTLE';
  if (ctx.page === 'hv-battle-end') return 'POST_BATTLE';
  return ctx.storedState; // 普通 HV 战斗外页: 用 Store state 续跑(默认 IDLE)
}

/** 确保 arena 已按当日 config 初始化(跨日/首次用 grPerDay/arenaLevels 重建). reader 跨日只清进度, 此处补 gr/array. */
export function ensureArena(ctx: FarmContext, C: Config): ArenaStore {
  if (isNewDay(ctx.arena, ctx.nowMs) || (ctx.arena.array.length === 0 && C.arenaLevels)) {
    const arena = initArenaCtx(ctx.arena, C.arenaLevels, C.grPerDay, ctx.nowMs);
    Store.set('arena', arena);
    if (ctx.storedState === 'COOLDOWN' && arena.array.length > 0) {
      Store.set('farmState', 'IDLE');
      Store.set('farmCooldownUntil', 0);
    }
    return arena;
  }
  return ctx.arena;
}

/** 一次连刷推进. 由 loop 的 !nowIn 分支调用. */
export function farmTick(): void {
  if (Date.now() < farmBusyUntil) return;
  try {
    const C = config.all();
    const ctx = readFarm();
    ctx.arena = ensureArena(ctx, C); // 跨日/首次补全 arena(gr/array)
    const state = routeStartup(ctx);
    const step = farmReducer(state, ctx, farmCfg(C));
    Store.set('farmState', step.next);
    if (step.arena) Store.set('arena', step.arena);
    const cdRemainMs = step.next === 'COOLDOWN' ? Math.max(0, ctx.cooldownUntil - ctx.nowMs) : undefined;
    bus.emit('farm:state', { state: step.next, note: step.action.note, cdRemainMs });
    execFarm(step.action);
    farmBusyUntil = Date.now() + C.farmTickMs;
  } catch (e) {
    console.error('[HVAB:farm] farmTick', e);
  }
}
