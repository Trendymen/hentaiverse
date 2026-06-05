// 目标权重(finWeight)纯函数模块. 翻写 dodying countMonsterHP hvAutoAttack.user.js:3357-3379.
// 零 DOM / 零 config 单例 / 零 Store: 输入即全部依赖, 可独立喂数据验证(控制台 import 直接跑).
import type { WeightInput, WeightConfig, RankedEnemy } from '../types';

/** 单怪 finWeight(可独立验证的最小单元). hpMin = 全体活怪 hpNow 最小值.
 *  权重越小优先级越高: 血越低→w 越小; 负权重状态(陷危/破甲/流血/混乱)→更小→优先打;
 *  正权重状态(眩晕/沉眠/虚弱等)→更大→靠后打. */
export function computeFinWeight(e: WeightInput, hpMin: number, cfg: WeightConfig): number {
  if (!e.alive || !isFinite(e.hpNow)) return cfg.unreachableWeight; // 死怪/不可达垫底
  let w = cfg.baseHpRatio * Math.log10(e.hpNow / hpMin); // >0 生命越低权重越低
  if (e.name.includes('Yggdrasil')) w += cfg.yggdrasilExtraWeight; // 世界树 boss 绝对优先
  for (const k in cfg.statusWeight) if (e.status[k]) w += cfg.statusWeight[k];
  return w;
}

/** 按 finWeight 升序排序(拷贝输入, 不可变, 纯函数). [0] = 最该打的目标.
 *  enabled=false → 直接按 eid 升序返回(总开关关 = 退回现状, 零回归). */
export function rankTargets(enemies: WeightInput[], cfg: WeightConfig): RankedEnemy[] {
  if (!cfg.enabled) {
    return [...enemies]
      .map((e) => ({ ...e, finWeight: e.eid }))
      .sort((a, b) => a.finWeight - b.finWeight);
  }
  const liveHp = enemies.filter((e) => e.alive && isFinite(e.hpNow)).map((e) => e.hpNow);
  const hpMin = liveHp.length ? Math.max(1, Math.min(...liveHp)) : 1; // 下界 1: 防血条解析失败(bw=0→hpNow=0)致 log10(_/0)=NaN 排序乱
  return enemies
    .map((e) => ({ ...e, finWeight: computeFinWeight(e, hpMin, cfg) }))
    .sort((a, b) => a.finWeight - b.finWeight);
}
