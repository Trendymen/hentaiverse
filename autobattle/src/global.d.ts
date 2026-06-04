// Userscript GM API 全局类型. vite-plugin-monkey 按 @grant 在运行时注入(vite.config 已声明 grant);
// 声明为「可能 undefined」以反映非 GM 环境, 配合 core/store.ts 里的 typeof guard 退回 localStorage.
// 随里程碑用到更多 GM API(GM_notification / GM_xmlhttpRequest 等)时在此增补.
declare const GM_getValue: (<T>(key: string, def: T) => T) | undefined;
declare const GM_setValue: ((key: string, val: unknown) => void) | undefined;
declare const GM_deleteValue: ((key: string) => void) | undefined;
