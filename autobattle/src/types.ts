// 全局类型. M1: 界面态; M2: 战斗状态/动作.

/** 角色当前数值快照(HUD 用) */
export interface VitalSnapshot {
  hp: number;
  mp: number;
  sp: number;
  oc: number;
}

/** HUD 完整渲染数据(loop → hud) */
export interface HudData {
  hp: number;
  mp: number;
  sp: number;
  oc: number;
  maxHp: number;
  maxMp: number;
  maxSp: number;
  alive: number;
  monsterTotal: number;
  roundNow: number;
  roundAll: number;
  turn: number;
  battleType: string;
  action: string;
}

/** 战斗日志一条记录(每决策一条; 落盘 GM, 供场中/场后诊断) */
export interface LogRecord {
  round: string; // "R51/55" 或战斗类型
  turn: number;
  oc: number; // 0~250
  hp: number; // %
  mp: number; // %
  sp: number; // %
  alive: number;
  total: number;
  cannon: string; // '可用' | '冷却'
  stance: boolean;
  action: string; // 中文动作名
  note: string; // 诊断, 如 "炮:冷却" / "炮:OC 150/200" / ""
}

/** 单个 buff/debuff 状态 */
export interface BuffState {
  active: boolean;
  turns: number;
}

/** 玩家 buff 集合(不含 channeling, channeling 提到 BattleState 顶层) */
export interface BuffMap {
  spark: BuffState;
  spiritShield: BuffState;
  protection: BuffState;
  absorb: BuffState;
  haste: BuffState;
  regen: BuffState;
  heartseeker: BuffState;
  blessing: BuffState;
  hpot: BuffState;
  mpot: BuffState;
  spot: BuffState;
}

/** 单个敌人状态 */
export interface EnemyState {
  eid: number;
  alive: boolean;
  is_red_boss: boolean;
  debuff: Record<string, boolean>;
  penArmor: boolean;
  hpPct: number; // 当前 HP%(血条 width/120)
  bleeding: boolean; // 是否流血(wpn_bleed; 慈悲处决判据)
  stunned: boolean; // 是否晕眩(要害连招判据: 盾击晕眩→要害高伤)
}

/** 一回合战斗状态快照 */
export interface BattleState {
  hp: number;
  mp: number;
  sp: number;
  overcharge: number;
  lastDmg: number;
  enemies: EnemyState[];
  alive: number;
  maxHp: number;
  maxMp: number;
  maxSp: number;
  buff: BuffMap;
  channeling: boolean;
  stanceOn: boolean;
  riddle: boolean;
  canContinue: boolean;
  tookMagicDmg: boolean;
  roundNow: number;
  roundAll: number;
  monsterTotal: number;
  battleType: string;
  gems: { hp: number; mp: number; sp: number }; // 按需对口可用宝石 id(专用优先, 神秘兜底; 0=无)
  cannonReady: boolean;
  cannonExists: boolean; // 小马炮按钮未置灰 = 不在 50 回合冷却(实测: 置灰=冷却中, 与 OC 无关; 能否真放还需 OC≥200, 由 brain 判)
  scrollReady: boolean;
  firstRound: boolean;
  lockedRedId: number | undefined;
  _started: boolean;
}

export type ActionType = 'spell' | 'item' | 'attack' | 'stance' | 'defend' | 'cannon' | 'riddle' | 'skip' | 'continue';

/** 决策输出: 一个动作 */
export interface Action {
  type: ActionType;
  id?: number;
  option?: string;
  note?: string;
  exec?: () => void;
}

/** 事件总线事件表 */
export interface BusEvents {
  'state:update': VitalSnapshot;
  'hud:update': HudData;
  'log:update': LogRecord | null;
  'ui:toggle': boolean;
}
