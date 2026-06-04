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
  roundNow: number;
  roundAll: number;
  monsterTotal: number;
  battleType: string;
  gemReady: boolean;
  cannonReady: boolean;
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
  'ui:toggle': boolean;
}
