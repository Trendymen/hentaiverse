// Userscript GM API + unsafeWindow 全局类型. vite-plugin-monkey 按 @grant 注入(vite.config 已声明).
// GM_* 声明为「可能 undefined」以反映非 GM 环境, 配合 core/store.ts 的 typeof guard 退回 localStorage.
declare const GM_getValue: (<T>(key: string, def: T) => T) | undefined;
declare const GM_setValue: ((key: string, val: unknown) => void) | undefined;
declare const GM_deleteValue: ((key: string) => void) | undefined;

// 页面真实 window(Tampermonkey 沙箱外). 访问 HV 的全局 battle 对象需经此; DOM 操作仍用共享的 document.
declare const unsafeWindow: Window &
  typeof globalThis & {
    battle?: { commit_target?: (n: number) => void };
  };
