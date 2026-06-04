// 技能/物品/buff ID 表 + 红怪减益序列 + Channeling 队列. 翻写自 reference/hv_brain_modern.user.js:47-68
import { config } from '../core/config';
import type { BattleState, BuffMap } from '../types';

/** 法术 DBID */
export const SK = {
  Weaken: 212,
  Imperil: 213,
  Cure: 311,
  Regen: 312,
  FullCure: 313,
  Protection: 411,
  Haste: 412,
  Absorb: 421,
  Spark: 422,
  SpiritShield: 423,
  Heartseeker: 431,
} as const;

/** 物品 DBID (91=长效Draught 95=药水 99=秘药) */
export const IT = {
  hDraught: 11191,
  hPotion: 11195,
  hElixir: 11199,
  mDraught: 11291,
  mPotion: 11295,
  mElixir: 11299,
  sDraught: 11391,
  sPotion: 11395,
  scrollProt: 13111,
  infDark: 12601,
  infHoly: 12501,
  manaGem: 10006,
} as const;

/** buff 图标 src 关键字(用于 #pane_effects>img 匹配) */
export const BUFF_IMG: Record<string, string> = {
  spark: 'sparklife',
  spiritShield: 'spiritshield',
  protection: 'protection',
  absorb: 'absorb',
  haste: 'haste',
  regen: 'regen',
  heartseeker: 'heartseeker',
  channeling: 'channeling',
  hpot: 'healthpot',
  mpot: 'manapot',
  spot: 'spiritpot',
};

/** 红怪定向减益序列(顺序=优先级; Weaken 减伤先于 Imperil 破抗 → survival-first). 加 Blind/Slow 只改此表. */
export interface DebuffDef {
  key: string;
  id: number;
  cfg: 'useWeaken' | 'useImperil';
  img: RegExp;
}
export const DEBUFFS: DebuffDef[] = [
  { key: 'weaken', id: SK.Weaken, cfg: 'useWeaken', img: /weaken/i },
  { key: 'imperil', id: SK.Imperil, cfg: 'useImperil', img: /imperil/i },
];

/** Channeling 折扣窗口(1MP+50%)待补贵技能优先队列(贵→便宜) */
export interface ChannelDef {
  id: number;
  hostile?: boolean;
  need: (b: BuffMap, S: BattleState) => boolean;
}
export const CHANNEL_Q: ChannelDef[] = [
  { id: SK.Spark, need: (b) => !b.spark.active || b.spark.turns <= 2 },
  { id: SK.SpiritShield, need: (b) => !b.spiritShield.active || b.spiritShield.turns <= 1 },
  { id: SK.Protection, need: (b) => !b.protection.active || b.protection.turns <= 1 },
  {
    id: SK.Imperil,
    hostile: true,
    need: (_b, S) => {
      const t = S.enemies.find((e) => e.is_red_boss && e.alive);
      return !!t && !t.debuff.imperil;
    },
  },
  {
    id: SK.Heartseeker,
    need: (b, S) =>
      (!b.heartseeker.active || b.heartseeker.turns <= 1) && S.alive >= config.get('HS_MIN_ENEMIES'),
  },
];

/** 小马炮按钮(hostile AOE): 从技能面板按 onmouseover 文本找 */
export const cannonBtn = (): HTMLElement | undefined =>
  [...document.querySelectorAll<HTMLElement>('#pane_skill [onmouseover]')].find((e) =>
    /Friendship|Cannon/i.test(e.getAttribute('onmouseover') || ''),
  );
