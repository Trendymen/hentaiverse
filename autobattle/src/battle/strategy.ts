import type { Config } from '../core/config';
import { CONTROL_DEBUFFS } from './tables';
import type { BattleState, EnemyState } from '../types';

export type PressureLevel = 'low' | 'medium' | 'high';

export interface BrainMemory {
  lowHpStreak: number;
}

export interface Pressure {
  level: PressureLevel;
  spReserveLow: boolean;
  spCritical: boolean;
  hasRed: boolean;
}

export interface RankedEnemy extends EnemyState {
  finWeight: number;
}

export interface ControlChoice {
  id: number;
  key: string;
  target: EnemyState;
  note: string;
}

function isYggdrasil(e: EnemyState): boolean {
  return (e.name || '').includes('Yggdrasil');
}

function hasDebuff(e: EnemyState, key: string, status: string): boolean {
  return Boolean(e.debuff?.[key] || e.status?.[status]);
}

export function hasFutureRound(S: BattleState): boolean {
  return S.roundAll === 0 || S.roundNow === 0 || S.roundNow < S.roundAll;
}

export function assessPressure(S: BattleState, C: Config, memory: BrainMemory): Pressure {
  const HM = S.maxHp || C.HPMAX;
  const SM = S.maxSp || C.SPMAX;
  const spRatio = SM ? S.sp / SM : 1;
  const hasRed = S.enemies.some((e) => e.alive && e.is_red_boss);
  const spReserveLow = spRatio < C.SP_RESERVE_RATIO;
  const spCritical = spRatio < C.SP_LOW;
  const heavy = S.lastDmg > 0.3 * HM;
  const lowHp = memory.lowHpStreak >= C.STRUGGLE_STREAK;
  const high = spCritical || heavy || lowHp;
  const medium = high || hasRed || spReserveLow;

  return {
    level: high ? 'high' : medium ? 'medium' : 'low',
    spReserveLow,
    spCritical,
    hasRed,
  };
}

export function selectRedTarget(S: BattleState, ranked: RankedEnemy[] = [], need: 'control' | 'damage' | 'execute' = 'damage'): EnemyState | null {
  const live = S.enemies.filter((e) => e.alive && e.is_red_boss);
  if (!live.length) return null;

  const ygg = live.find(isYggdrasil);
  if (ygg) return ygg;

  if (need === 'execute') {
    const ex = live.find((e) => e.hpPct < 25 && e.bleeding);
    if (ex) return ex;
  }

  if (need === 'control') {
    const gap = live.find((e) => !hasDebuff(e, 'weaken', 'We') || !hasDebuff(e, 'imperil', 'Im'));
    if (gap) return gap;
  }

  const locked = S.lockedRedId !== undefined ? live.find((e) => e.eid === S.lockedRedId) : undefined;
  if (locked) return locked;

  return ranked.find((e) => e.alive && e.is_red_boss) || live.sort((a, b) => a.eid - b.eid)[0] || null;
}

export function selectControlDebuff(S: BattleState, C: Config, ranked: RankedEnemy[], pressure: Pressure): ControlChoice | null {
  if (!C.usePressureControl || pressure.level === 'low') return null;
  if (!pressure.hasRed && S.alive < C.CONTROL_MIN_ENEMIES) return null;

  const live = ranked.filter((e) => e.alive);
  if (!live.length) return null;

  const highValue = live.filter((e) => e.is_red_boss || isYggdrasil(e));
  const scope = pressure.level === 'high' ? live : highValue.length ? highValue : live.slice(0, 1);

  for (const d of CONTROL_DEBUFFS) {
    if (!C[d.cfg]) continue;
    if (d.key === 'silence' && !(pressure.spReserveLow || pressure.level === 'high')) continue;
    if ((d.key === 'blind' || d.key === 'slow') && pressure.level !== 'high') continue;
    if (d.key === 'imperil') {
      const target = (highValue.length ? highValue : scope).find((e) => !hasDebuff(e, d.key, d.status));
      if (target) return { id: d.id, key: d.key, target, note: `控:高价值陷危#${target.eid}` };
      continue;
    }
    const target = scope.find((e) => !hasDebuff(e, d.key, d.status));
    if (!target) continue;
    const label = d.key === 'weaken' ? '全体虚弱' : d.key === 'silence' ? 'SP压沉默' : d.key;
    return { id: d.id, key: d.key, target, note: `控:${label}#${target.eid}` };
  }

  return null;
}

export function shouldSaveOcForCannon(S: BattleState, C: Config, pressure: Pressure, struggling: boolean): boolean {
  if (!C.useCannon || !S.cannonExists || S.cannonOnCd || struggling) return false;
  if (pressure.level === 'high' || pressure.spReserveLow) return false;
  if (S.alive >= C.CANNON_MIN_ENEMIES) return true;
  return hasFutureRound(S) && S.monsterTotal >= C.CANNON_MIN_ENEMIES;
}

/** 无压力时盾击晕杂兵的 OC 经济地板: 放完(扣 cost)后 OC 仍需 ≥ 地板, 把 OC 留给开/维持架式 + 攒炮.
 *  炮可用时地板抬到攒炮让位线 CANNON_YIELD_OC(为炮跨波预留), 否则用开架式线 OC_ON*OCMAX.
 *  有压力(level≠'low', 含红名场) 或灰度开关关闭则不设地板, 维持旧行为. */
export function ocFloorOk(S: BattleState, C: Config, pressure: Pressure, oc: number, cost: number): boolean {
  if (!C.useShieldBashOcFloor) return true; // 灰度开关关 → 旧行为
  if (pressure.level !== 'low') return true; // 有压力(hasRed/spReserveLow 已强制 ≥medium) → 维持现状
  const cannonReady = C.useCannon && S.cannonExists && !S.cannonOnCd;
  const floor = cannonReady ? C.CANNON_YIELD_OC : C.OC_ON * C.OCMAX;
  return oc - cost >= floor;
}

/** 残局红名 OC 省留: 本轮怪总数>6 的大波、打到只剩 1 只红名、有下一轮波、且血稳(非struggling)时,
 *  对红名 OC 单体技设175地板(放完仍≥CANNON_YIELD_OC), 攒OC留下轮开局炮.
 *  最终波(无下一轮波) → 无脑OC斩杀; struggling/非触发/开关关 → false(正常出手). */
export function endgameRedHold(S: BattleState, C: Config, oc: number, cost: number, struggling: boolean): boolean {
  if (!C.useEndgameRedOcSave) return false; // 开关关 → 不暂缓
  if (struggling) return false; // 血连降 → 正常斩杀链
  if (!hasFutureRound(S)) return false; // 最终波(无下一轮波) → 无脑OC斩杀, 不省
  if (S.monsterTotal <= 6) return false; // 本轮怪总数≤6(非大波) → 不进入
  const live = S.enemies.filter((e) => e.alive);
  if (live.length !== 1 || !live[0].is_red_boss) return false; // 非"只剩1红名" → 不进入
  return oc - cost < C.CANNON_YIELD_OC; // 放完<175 → 暂缓攒OC; 放完≥175 → 不暂缓(消化溢出)
}
