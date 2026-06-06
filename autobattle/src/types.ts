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
  shadowVeil: BuffState;
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
  hpNow: number; // 绝对当前 HP(initHp×width/120; 初始HP缺失时退化为 hpPct; 死怪 Infinity)
  name: string; // 怪名(.btm3 文本; Yggdrasil 检测用)
  status: Record<string, boolean>; // 13 状态 flags(STATUS_LIB key → 是否挂着)
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
  gems: { hp: number; mp: number; sp: number; mystic: number }; // 对口恢复宝石 + 独立神秘宝石(Channeling); 0=无
  cannonExists: boolean; // 小马炮在技能栏(攒炮/放炮/OC技能让路共用; OC够看 overcharge≥200, 冷却看 cannonOnCd)
  cannonOnCd: boolean; // 在 50 回合冷却中(loop 按回合追踪注入; reader 读不到冷却, 默认 false)
  cannonCdLeft?: number; // loop 注入: 小马炮剩余冷却回合(0=未冷却); 供 P12 冷却尾段预判攒炮(剩几回合就提前关架式攒OC, 冷却完即放). reader 不设
  regenOnCd?: boolean; // loop 注入: 细胞活化回合追踪(放出 REGEN_HOLD 回合内不重放, 兜 reader DOM 检测空窗导致的连放烧蓝); reader 不设
  manaPotOnCd?: boolean; // loop 注入: 回蓝药冷静期(喝后 MANAPOT_HOLD 回合内常规线 P9 不重复喝, 防长效药慢回连喝多种); reader 不设
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
  exec?: () => boolean | void;
}

/** 事件总线事件表 */
export interface BusEvents {
  'state:update': VitalSnapshot;
  'hud:update': HudData;
  'log:update': LogRecord | null;
  'ui:toggle': boolean;
  'battle:active': boolean; // loop 检测 inBattle 跨 tick 变化: true=进战斗(下一轮恢复日志窗口), false=退出战斗(关窗口+清记忆)
}

/** target-weight 纯函数输入(EnemyState 的结构子集; EnemyState 鸭子类型可直接传) */
export interface WeightInput {
  eid: number;
  alive: boolean;
  is_red_boss: boolean;
  hpNow: number;
  name: string;
  status: Record<string, boolean>;
}

/** target-weight 配置(brain 从 config 装配传入; 模块本身不碰单例) */
export interface WeightConfig {
  baseHpRatio: number;
  yggdrasilExtraWeight: number;
  unreachableWeight: number;
  statusWeight: Record<string, number>;
  enabled: boolean;
}

/** BleedTimer 喂入/判定输入(EnemyState 结构子集; EnemyState 鸭子类型可直接传) */
export interface BleedFeedInput {
  eid: number;
  is_red_boss: boolean; // 语义标注; observe 收到的已是 filter(is_red_boss) 后的红名
  hpPct: number;
  // stunned/bleeding 不入此接口: 由 brain 两处要害分支的外层守卫把关, BleedTimer 内部只用 hpPct/eid
}

/** BleedTimer 配置(brain 从 config 装配传入; 模块本身不碰单例) */
export interface BleedTimerConfig {
  enabled: boolean; // 延迟逻辑总开关; false = shouldFeed 恒 true(退回旧"一晕就喂")
  bleedTurns: number; // B: 流血持续回合数(默认 5)
  safety: number; // 安全余量(默认 1); T ≤ B-safety 才喂
  fallbackHpPct: number; // 无主动样本/速率太小时的保守血量窗口(默认 30)
  rateWindow: number; // 速率移动平均窗口(默认 3)
  minSamples: number; // 走速率主路最少样本数(默认 1)
  minRate: number; // 速率有效下限 %/回合(默认 1)
}

/** 带 finWeight 的排序结果 */
export type RankedEnemy = WeightInput & { finWeight: number };
