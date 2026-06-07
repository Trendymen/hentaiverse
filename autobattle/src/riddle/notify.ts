// 小马题提醒: 音频警报 + 桌面通知. 通用(不依赖小马题 DOM); 触发时机由 detect/loop 接入(批2).
// 移植 dodying setAlarm('Riddle') 思路: Web Audio 蜂鸣.

/** 蜂鸣警报(Web Audio, 无需音频文件). times=连响次数. */
export function playAlarm(times = 2): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.35;
      osc.start(t);
      osc.stop(t + 0.2);
    }
  } catch {
    /* 音频不可用不致命 */
  }
}

/** 桌面通知(GM_notification 优先, 退回 Notification API). */
export function sendDesktop(title: string, text: string): void {
  try {
    if (typeof GM_notification === 'function') {
      GM_notification({ title, text, timeout: 5000 });
      return;
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: text });
    }
  } catch {
    /* 通知失败不致命 */
  }
}
