// 全局类型: 随里程碑扩展. M1 先放界面态快照与事件总线事件表.

/** 角色当前数值快照 (M2 由 StateReader 填真值; M1 仅作类型占位) */
export interface VitalSnapshot {
  hp: number;
  mp: number;
  sp: number;
  oc: number;
}

/** 事件总线事件表 (key = 事件名, value = payload 类型). 随里程碑追加. */
export interface BusEvents {
  'state:update': VitalSnapshot;
  'ui:toggle': boolean;
}
