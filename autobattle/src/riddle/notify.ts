// 小马题提醒: 音频警报 + 桌面通知. 通用(不依赖小马题 DOM); 触发时机由 detect/loop 接入(批2).
// 移植 dodying setAlarm('Riddle') 思路: Web Audio 蜂鸣.

// ── 单例 AudioContext ──────────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      _ctx = new Ctor();
    }
    return _ctx;
  } catch {
    return null;
  }
}

/**
 * 解锁音频：在用户手势中调用，唤醒 suspended AudioContext。
 * 同时播一个近静音短音 (gain≈0.001) 触发浏览器自动播放策略解锁。
 */
export function unlockAudio(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
    resume.then(() => {
      try {
        // 近静音短音，触发解锁
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch { /* 静音音播放失败不致命 */ }
    }).catch(() => { /* resume 失败不致命 */ });
  } catch {
    /* 解锁失败不致命 */
  }
}

/** 蜂鸣警报(Web Audio 单例 ctx, 无需音频文件). times=连响次数. */
export function playAlarm(times = 2): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const doPlay = () => {
      try {
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
      } catch { /* 音频不可用不致命 */ }
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay).catch(() => { /* resume 失败不致命 */ });
    } else {
      doPlay();
    }
  } catch {
    /* 音频不可用不致命 */
  }
}

/** 请求桌面通知权限(仅原生 Notification 需要; GM_notification 跳过). */
export function requestNotifyPermission(): void {
  try {
    if (typeof GM_notification === 'function') return; // GM 不需要申请
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { /* 拒绝不致命 */ });
    }
  } catch {
    /* 请求失败不致命 */
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
