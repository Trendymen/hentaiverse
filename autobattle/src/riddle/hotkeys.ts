// 小马题快捷键映射(纯函数部分). 数字 1-6 → 当前 checkbox 从左到右第 N 个; Enter=提交; Esc=静音.
// 按 checkbox 实际数量动态判定(不假设固定 6 个), 真实 label 绑定在 ui.ts 接入.

export type RiddleKeyAction =
  | { kind: 'toggle'; index: number } // toggle 第 index 个 checkbox(0-based)
  | { kind: 'submit' }
  | { kind: 'mute' }
  | { kind: 'none' };

/** 键 → 动作. count = 当前 checkbox 数量(动态). 数字超范围返回 none. */
export function mapRiddleKey(key: string, count: number): RiddleKeyAction {
  if (/^[1-9]$/.test(key)) {
    const index = Number(key) - 1;
    return index < count ? { kind: 'toggle', index } : { kind: 'none' };
  }
  if (key === 'Enter') return { kind: 'submit' };
  if (key === 'Escape') return { kind: 'mute' };
  return { kind: 'none' };
}
