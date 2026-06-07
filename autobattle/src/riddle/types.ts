// 小马题(Riddlemaster)类型契约. 详见 specs/2026-06-07-autobattle-riddle-design.md.
// Mane6 = My Little Pony 6 主角, 顺序对齐截图 checkbox 从左到右(顺序仅作默认, hotkeys 按实际 label 动态绑定).

/** 6 主角小马名(HV checkbox label 原文, 英文不受汉化影响) */
export const MANE6 = [
  'Twilight Sparkle',
  'Rarity',
  'Fluttershy',
  'Rainbow Dash',
  'Pinkie Pie',
  'Applejack',
] as const;

export type PonyName = (typeof MANE6)[number];

/** 答题结果(采集标签可信度用) */
export type RiddleResult = 'correct' | 'wrong' | 'unknown';

/** 一条采集样本(入 IndexedDB; 为未来 CNN 训练) */
export interface RiddleSample {
  imageDataUrl: string; // 题目图 PNG dataURL
  labels: Record<PonyName, boolean>; // 6 维 multi-hot(玩家勾选的小马)
  result: RiddleResult; // 对/错/未知
  meta: {
    level: number | null; // 玩家等级(难度元数据)
    round: number | null; // 最近战斗层数/轮数(难度元数据)
    ts: number; // 时间戳 ms
    w: number; // 题图宽
    h: number; // 题图高
  };
}

/** 检测/解析出的小马题运行态(detect 产出, ui/submit/collector 消费) */
export interface RiddleState {
  present: boolean; // 当前页是否有小马题
  options: { name: PonyName; el: HTMLInputElement }[]; // 6 个 checkbox + 对应小马名
  submitEl: HTMLElement | null; // Submit Answer 按钮
  imageEl: HTMLImageElement | HTMLCanvasElement | null; // 题目图元素
  secondsLeft: number | null; // 倒计时秒
}

/** riddle 配置(brain/loop 从 config 装配; 纯模块不碰单例) */
export interface RiddleConfig {
  useRiddleAssist: boolean;
  riddlePopup: boolean;
  riddleHotkeys: boolean;
  riddleAlarm: boolean;
  riddleNotify: boolean;
  riddleChartOverlay: boolean;
  riddleCollect: boolean;
  riddleUrgentSec: number;
  riddleAutoRecognize: boolean;
}

/** 未来 CNN 识别接口契约(现 stub; brain.riddle() 实现) */
export interface RiddleRecognition {
  pony: PonyName;
  confidence: number; // 0-1
}
