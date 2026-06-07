// /json 原始响应缓存. 独立模块供 main(写) / loop(读) / 记录模块(读) import, 避免 loop↔main 循环依赖.
let last: string | null = null;
export function setLastBattle(text: string | null): void { last = text; }
export function getLastBattle(): string | null { return last; }
