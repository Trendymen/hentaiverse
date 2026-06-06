// GM_xmlhttpRequest POST 薄封装 + 300ms 最小间隔(封号红线, 翻写 dodying $ajax interval:300 L131 "DO NOT DECREASE").
// 仅供连刷开战/精力恢复的低频单发请求; 不做队列/并发(那是 dodying $ajax 的重活, 连刷无需).
const MIN_INTERVAL = 300;
let lastPost = 0;

/** POST 表单. resolve=onload(开战成功后由调用方 reload), reject=不可用/出错. */
export function gmPost(url: string, body: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const send = () => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest unavailable'));
        return;
      }
      lastPost = Date.now();
      GM_xmlhttpRequest({
        method: 'POST',
        url,
        data: body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        onload: (r) => (r.status === 200 ? resolve() : reject(new Error(`HTTP ${r.status}`))),
        onerror: () => reject(new Error('xhr error')),
      });
    };
    const wait = Math.max(0, MIN_INTERVAL - (Date.now() - lastPost));
    if (wait > 0) setTimeout(send, wait);
    else send();
  });
}
