// 连刷状态转移核心(纯函数). farmReducer(state, ctx, cfg) → {next, action, arena?}.
// 零 DOM/零 Store/零 config 单例/零 Date.now(): 全部经 ctx/cfg 传入, 可控制台喂数据断言转移(对齐 brain.decide).
import type { FarmContext, FarmStep, FarmReducerCfg, FarmState } from '../types';
import { computeStamina, gate, computeCost, shouldRecover } from './stamina';
import { computeCooldown, pickEngageable } from './encounter';
import { pickNextArena } from './arena';

const MS_PER_DAY = 24 * 3600_000;
const MS_30MIN = 30 * 60_000;

function nextMidnight(nowMs: number): number {
  return (Math.floor(nowMs / MS_PER_DAY) + 1) * MS_PER_DAY;
}

export function farmReducer(state: FarmState, ctx: FarmContext, cfg: FarmReducerCfg): FarmStep {
  switch (state) {
    case 'IDLE':
      if (!cfg.farmEnabled) return { next: 'STOPPED', action: { type: 'none', note: '连刷关' } };
      return { next: 'CHECK_ENCOUNTER', action: { type: 'none' } };

    case 'CHECK_ENCOUNTER': {
      if (cfg.autoEncounter) {
        const cd = computeCooldown(ctx.encounter, ctx.nowMs, ctx.lastEH, cfg.encounterCdMs);
        const href = pickEngageable(ctx.encounter);
        const stamina = computeStamina(ctx.stamina, ctx.nowHour);
        if (cd === 0 && href && stamina >= cfg.staminaEncounter) {
          return { next: 'ENCOUNTER_ENGAGE', action: { type: 'none', note: '有可接遭遇' } };
        }
      }
      return { next: 'CHECK_STAMINA', action: { type: 'none' } };
    }

    case 'ENCOUNTER_ENGAGE':
      return { next: 'ENCOUNTER_WAIT', action: { type: 'navigate', url: 'https://e-hentai.org/news.php?encounter', note: '跳遭遇页' } };

    case 'ENCOUNTER_WAIT': {
      // STARTUP 路由因 host===e-hentai 进入此态; farm-reader 已扒 eventpane 填 ctx.eventHref
      if (ctx.eventHref) return { next: 'IN_BATTLE', action: { type: 'navigate', url: `${ctx.hvOrigin}/${ctx.eventHref}`, note: '接受遭遇→跳回HV' } };
      return { next: 'IDLE', action: { type: 'navigate', url: ctx.lastHref, note: '无遭遇/过期→回HV' } };
    }

    case 'CHECK_STAMINA': {
      const stamina = computeStamina(ctx.stamina, ctx.nowHour);
      const pick = pickNextArena(ctx.arena);
      if (pick.kind === 'empty') return { next: 'COOLDOWN', action: { type: 'set-cooldown', untilMs: nextMidnight(ctx.nowMs), note: '今日全清' } };
      const cost = computeCost(pick.key!, stamina, ctx.arena.gr, false);
      const g = gate(stamina, cost, cfg.staminaLow, cfg.staminaLowWithNat, ctx.nowHour);
      if (g === 1) return { next: 'PICK_NEXT', action: { type: 'none' } };
      if (shouldRecover(ctx.stamina, stamina, cfg)) return { next: 'RECOVER_STAMINA', action: { type: 'none' } };
      const until = g === 0 ? nextMidnight(ctx.nowMs) : ctx.nowMs + MS_30MIN;
      return { next: 'COOLDOWN', action: { type: 'set-cooldown', untilMs: until, note: g === 0 ? '今日精力耗尽' : '等自然恢复' } };
    }

    case 'RECOVER_STAMINA':
      return { next: 'CHECK_STAMINA', action: { type: 'recover-stamina', note: '喝药恢复精力' } };

    case 'PICK_NEXT': {
      const pick = pickNextArena(ctx.arena);
      if (pick.kind === 'empty') return { next: 'COOLDOWN', action: { type: 'set-cooldown', untilMs: nextMidnight(ctx.nowMs), note: '今日全清' } };
      if (pick.kind === 'need-token') return { next: 'PICK_NEXT', action: { type: 'navigate', url: `?s=Battle&ss=${pick.href}`, note: `收集 ${pick.href} token` }, arena: pick.arena };
      return { next: 'STARTING', action: { type: 'start-battle', href: pick.href!, initid: pick.initid!, token: pick.token!, note: `开战 ${pick.href}#${pick.key}` }, arena: pick.arena };
    }

    case 'STARTING':
      // start-battle 已在 PICK_NEXT 这一 tick exec 并 reload; 此态仅在 reload 未发生时兜底回 PICK_NEXT 重试
      return { next: 'PICK_NEXT', action: { type: 'none', note: 'STARTING 兜底重选' } };

    case 'IN_BATTLE':
      // 战斗中 loop 走战斗内分支(farmTick 不被调); 落到此处=已离开战斗
      return { next: 'POST_BATTLE', action: { type: 'none' } };

    case 'POST_BATTLE':
      return { next: 'RETURN', action: { type: 'none', note: '战斗结束' } };

    case 'RETURN':
      return { next: 'IDLE', action: { type: 'navigate', url: ctx.lastHref, note: '回前页' } };

    case 'COOLDOWN':
      if (!cfg.farmEnabled) return { next: 'STOPPED', action: { type: 'none' } };
      if (ctx.nowMs >= ctx.cooldownUntil) return { next: 'IDLE', action: { type: 'none', note: '冷却结束' } };
      return { next: 'COOLDOWN', action: { type: 'none' } };

    case 'STOPPED':
      if (cfg.farmEnabled) return { next: 'IDLE', action: { type: 'none', note: '重新开' } };
      return { next: 'STOPPED', action: { type: 'none' } };

    default:
      return { next: 'IDLE', action: { type: 'none' } };
  }
}
