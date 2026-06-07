// 竞技场识别纯函数. 数据源 = /json 原始 textlog(未汉化英文); battleType 来自 URL ss(SS_CN).
// HV /json 无结构化 round 字段、无全局 battle 对象(hvc.js.bak 确认), 故解析 textlog[].t 的 Round N/M.
import type { ArenaTier } from '../types';

/** 从 /json 原始响应抽 textlog 文本行(每元素 {t:html,c:cls}; 取 t). 解析失败返回 []. */
export function extractTextlog(rawJson: string | null): string[] {
  if (!rawJson) return [];
  try {
    const d = JSON.parse(rawJson) as { textlog?: { t: string }[] };
    return Array.isArray(d.textlog) ? d.textlog.map((e) => e.t ?? '') : [];
  } catch {
    return [];
  }
}

/** 解析当前轮数(Round N / M; GF 实测 1000 轮). 翻写 dodying L3242 但喂 /json textlog. */
export function parseRoundFromJson(rawJson: string | null): { roundNow: number; roundAll: number } | null {
  const text = extractTextlog(rawJson).join('\n');
  const m = text.match(/Round\s*(\d+)\s*\/\s*(\d+)/i);
  return m ? { roundNow: +m[1], roundAll: +m[2] } : null;
}

/** roundAll 反查竞技场准入等级(仅 battleType==='竞技场' 时由调用方调). 未命中返回 null. */
export function resolveArenaTier(roundAll: number, tiers: ArenaTier[]): ArenaTier | null {
  return tiers.find((t) => t.roundAll === roundAll) ?? null;
}

/** 生成 battleCode + level. 竞技场命中→AR-Lv{level}-{name}; ss=ar 失配→AR-R{roundAll}(level=null); GF→GF; RB/遭遇→kind-roundAll. */
export function deriveBattleCode(
  battleType: string,
  roundAll: number,
  tiers: ArenaTier[],
): { battleCode: string; level: number | null } {
  if (battleType === '竞技场') {
    const tier = resolveArenaTier(roundAll, tiers);
    return tier ? { battleCode: `AR-Lv${tier.level}-${tier.name}`, level: tier.level } : { battleCode: `AR-R${roundAll}`, level: null };
  }
  if (battleType === '压榨界') return { battleCode: 'GF', level: null };
  const kind = battleType === '浴血擂台' ? 'RB' : battleType === '遭遇战' ? 'BA' : 'BT';
  return { battleCode: roundAll ? `${kind}-${roundAll}` : kind, level: null };
}
