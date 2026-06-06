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
  'farm:state': FarmHud; // M3 连刷: 当前 FSM 状态 → HUD 战斗外展示
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

// ── M3 连刷(farm)类型. 详见 specs/2026-06-06-autobattle-m3-farm-design.md ──

/** 连刷有限状态机的 13 个状态 */
export type FarmState =
  | 'IDLE' // HV 战斗外页, 连刷开 → 准备下一场
  | 'CHECK_ENCOUNTER' // 开战前先查待处理遭遇(优先级最高)
  | 'ENCOUNTER_ENGAGE' // 决定接受遭遇 → 导航去 e-hentai
  | 'ENCOUNTER_WAIT' // 已在 e-hentai 站, 等注入分支 accept/reject
  | 'CHECK_STAMINA' // 战前精力门
  | 'RECOVER_STAMINA' // 精力不足且可药补 → recover XHR
  | 'PICK_NEXT' // 选下一靶(等级/RB/GF, arrayDone 去重, GF 计数)
  | 'STARTING' // 扒 token + 开战 XHR(发出即 reload)
  | 'IN_BATTLE' // 战斗中: FSM 静默, 交 brain/loop 驱动
  | 'POST_BATTLE' // 战斗结束落地 ?s=Battle, 准备回前页(M4 掉落统计钩子)
  | 'RETURN' // openNoFetch(lastHref) 回战斗前页
  | 'COOLDOWN' // 精力耗尽/无靶/遭遇满 24 → 定时等待
  | 'STOPPED'; // 连刷关或致命错误 → 停机

/** farm-reader 对当前页的分类 */
export type FarmPage =
  | 'in-battle' // inBattle() DOM 在
  | 'hv-battle-end' // url.endsWith('?s=Battle') 战斗结束落地
  | 'hv-out' // 其他 HV 页(含 ?s=Battle&ss=xx 选择页)
  | 'eh-encounter'; // host===e-hentai.org

/** 竞技场连刷上下文(Store 'arena' 键; 每日重置). 翻写 dodying arena 对象 L2504-2535 */
export interface ArenaStore {
  array: string[]; // 待战等级/RB 列表(arenaLevels split + reverse; 持久不变, 靠 arrayDone 去重)
  arrayDone: (number | string)[]; // 今日已完成(去重)
  token: Record<string, string>; // {等级ID|'gr' → token}
  gr: number; // 剩余可开 GF 场数
  date: number; // time(0) ms; UTC 同日判定用
}

/** 遭遇战一条记录. 翻写 dodying encounter 元素 */
export interface EncounterRec {
  href?: string;
  time: number;
  encountered?: number;
}

/** 精力快照(farm-reader 从 Store + DOM 读出; M3 不检测库存药, 故无 has11401/has11402) */
export interface StaminaSnapshot {
  cached: number; // Store 缓存的 stamina
  lastTimeHour: number; // 上次记录的小时戳(floor(ms/3600000))
  hathperk: boolean; // 影响盲发恢复量预估(+20/+10)
}

/** farm-reducer 唯一输入(纯数据快照) */
export interface FarmContext {
  page: FarmPage;
  url: string;
  host: string;
  hvOrigin: string; // HV 站 origin(engage 拼 url 用)
  nowMs: number;
  nowHour: number; // floor(nowMs/3600000)
  storedState: FarmState; // Store 存的上次 state(续跑依据)
  arena: ArenaStore;
  stamina: StaminaSnapshot;
  encounter: EncounterRec[]; // 去重合并后的今日遭遇记录
  lastEH: number; // 上次打开 e-hentai 时间
  lastHref: string; // 战斗前页地址(回前页用)
  eventHref?: string; // e-hentai eventpane 里的遭遇目标 href 片段
  cooldownUntil: number; // COOLDOWN 到期时戳
}

/** farm-reducer 输出的副作用意图(纯数据; executor 翻译成 XHR/导航/Store) */
export type FarmAction =
  | { type: 'none'; note?: string }
  | { type: 'start-battle'; href: 'ar' | 'ar&page=2' | 'rb' | 'gr'; initid: string; token: string; note?: string }
  | { type: 'navigate'; url: string; note?: string } // openNoFetch 等价(engage/reject/return 共用)
  | { type: 'recover-stamina'; note?: string }
  | { type: 'set-cooldown'; untilMs: number; note?: string };

/** reducer 输出 */
export interface FarmStep {
  next: FarmState;
  action: FarmAction;
  arena?: ArenaStore; // 更新后的 arena(starter 落盘)
}

/** reducer 配置(starter 从 config 装配; 纯函数不碰单例, 仿 weightCfg) */
export interface FarmReducerCfg {
  farmEnabled: boolean;
  autoEncounter: boolean;
  restoreStamina: boolean;
  staminaLow: number;
  staminaLowWithNat: number;
  staminaEncounter: number;
  encounterCdMs: number; // encounterCdMin * 60000
  grPerDay: number;
  arenaLevels: string;
  staminaHathperk: boolean;
}

/** HUD 展示的连刷状态 */
export interface FarmHud {
  state: FarmState;
  note?: string;
  cdRemainMs?: number;
}
