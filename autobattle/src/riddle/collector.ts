// 小马题采集(纯函数部分). 样本构造 + multi-hot 编码. IndexedDB/Canvas 截图 IO 在批2追加.
import { MANE6, type PonyName, type RiddleSample, type RiddleResult } from './types';

/** 勾选的小马列表 → 6 维 multi-hot(全 6 只都有键, 选中 true). */
export function encodeMultiHot(selected: PonyName[]): Record<PonyName, boolean> {
  const set = new Set<PonyName>(selected);
  const out = {} as Record<PonyName, boolean>;
  for (const name of MANE6) out[name] = set.has(name);
  return out;
}

/** 组装一条采集样本(纯; imageDataUrl/尺寸由调用方截图后传入). */
export function buildSample(args: {
  imageDataUrl: string;
  selected: PonyName[];
  result: RiddleResult;
  level: number | null;
  round: number | null;
  ts: number;
  w: number;
  h: number;
}): RiddleSample {
  return {
    imageDataUrl: args.imageDataUrl,
    labels: encodeMultiHot(args.selected),
    result: args.result,
    meta: { level: args.level, round: args.round, ts: args.ts, w: args.w, h: args.h },
  };
}
