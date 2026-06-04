// 技能/物品/buff ID 表 + 红怪减益序列 + Channeling 队列. 翻写自 reference/hv_brain_modern.user.js:47-68
import { config } from '../core/config';
import type { Action, BattleState, BuffMap } from '../types';

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
  blessing: 'riddlemaster', // 御谜士的祝福(Blessing of the RiddleMaster); 匹配 onmouseover buff 名里的 'RiddleMaster', 不再依赖图标文件名
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

/** 法术 id → 中文名(HUD 显示用) */
export const SK_CN: Record<number, string> = {
  212: '虚弱', 213: '陷危', 311: '治疗术', 312: '细胞活化', 313: '完全治疗术',
  411: '守护', 412: '急速', 421: '吸收', 422: '生命火花', 423: '灵力盾', 431: '穿心',
};
/** 物品 DBID → 中文名 */
export const IT_CN: Record<number, string> = {
  11191: '体力长效药', 11195: '体力药水', 11199: '终极体力药',
  11291: '法力长效药', 11295: '法力药水', 11299: '终极法力药',
  11391: '灵力长效药', 11395: '灵力药水',
  13111: '保护卷轴', 12601: '黑暗魔药', 12501: '神圣魔药', 10006: '魔力宝石',
};
/** URL ss 参数 → 战斗类型中文 */
export const SS_CN: Record<string, string> = {
  gr: '压榨界', ar: '竞技场', rb: '浴血擂台', iw: '道具界', tw: '塔楼', ba: '遭遇战',
};
/** 决策动作 → 中文友好标签(HUD 显示) */
export function actionLabel(a: Action | null): string {
  if (!a) return '-';
  switch (a.type) {
    case 'attack':
      return `平砍 ${a.id ?? ''}号`;
    case 'spell':
      return SK_CN[a.id ?? 0] || `法术#${a.id ?? ''}`;
    case 'item':
      return IT_CN[a.id ?? 0] || `用#${a.id ?? ''}`;
    case 'cannon':
      return '小马炮';
    case 'stance':
      return '切架式';
    case 'defend':
      return '防御';
    case 'continue':
      return '继续下一波';
    case 'riddle':
      return '小马图(人工)';
    case 'skip':
      return '跳过';
    default:
      return a.type;
  }
}
