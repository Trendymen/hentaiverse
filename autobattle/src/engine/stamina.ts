// 精力(Stamina)纯函数 + 战前门. 翻写 dodying checkStamina hvAutoAttack.user.js:2394-2422 + staminaCost 表 L2594-2610.
// 零 DOM/零 Store/零 config 单例: now/snapshot/cfg 全部传入, 可控制台喂数据验证(对齐 target-weight.ts).
import type { StaminaSnapshot, FarmReducerCfg } from '../types';

/** dodying staminaCost 原始基值表(等级→基值; 105-112=RB 各 1). 翻写 L2594-2606. */
export const STAMINA_COST: Record<string, number> = {
  1: 2, 3: 4, 5: 6, 8: 8, 9: 10, 11: 12, 12: 15, 13: 20, 15: 25, 16: 30,
  17: 35, 19: 40, 20: 45, 21: 50, 23: 55, 24: 60, 26: 65, 27: 70, 28: 75, 29: 80,
  32: 85, 33: 90, 34: 95, 35: 100,
  105: 1, 106: 1, 107: 1, 108: 1, 109: 1, 110: 1, 111: 1, 112: 1,
};

/** 当前精力 = 缓存 + 每小时自然恢复. 翻写 L2397-2400. */
export function computeStamina(snap: StaminaSnapshot, nowHour: number): number {
  return snap.cached + (snap.lastTimeHour ? nowHour - snap.lastTimeHour : 0);
}

/** 24h 自然恢复预测. 翻写 L2401. */
export function predictNatural(stamina: number, nowHour: number): number {
  return stamina + 24 - (nowHour % 24);
}

/** 单靶精力消耗. 翻写 L2594-2610: 基值 × (isekai?2:1) × (stamina>=60?0.03:0.02); GF 额外 +1. */
export function computeCost(key: string, stamina: number, grCount: number, isIsekai: boolean): number {
  const base = key === 'gr' ? grCount : STAMINA_COST[key] ?? 0;
  const cost = base * (isIsekai ? 2 : 1) * (stamina >= 60 ? 0.03 : 0.02);
  return key === 'gr' ? cost + 1 : cost;
}

/** 精力门. 翻写 L2403-2410: 1=够 / 0=今日耗尽 / -1=自然恢复不够. */
export function gate(stamina: number, cost: number, low: number, lowWithNat: number, nowHour: number): 1 | 0 | -1 {
  const stmNR = predictNatural(stamina, nowHour);
  const nrOk = !cost || stmNR - cost >= lowWithNat;
  if (stamina - cost >= low && nrOk) return 1;
  if (!nrOk) return -1;
  return 0;
}

/** 是否盲发恢复(M3: 不检测库存药, restoreStamina 开 + 精力低于 100-恢复量 即发; 库存检测留 M4). 翻写 L2412-2418 简化. */
export function shouldRecover(snap: StaminaSnapshot, stamina: number, cfg: FarmReducerCfg): boolean {
  if (!cfg.restoreStamina) return false;
  const recover = snap.hathperk ? 20 : 10;
  return stamina <= 100 - recover;
}
