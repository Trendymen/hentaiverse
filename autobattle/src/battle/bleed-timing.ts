// 要害延迟喂流血: 红名掉血速率追踪器(有状态模块). 范本 = target-weight.ts。
// 零 DOM / 零 config 单例 / 零 Store: 输入即全部依赖, 唯一状态是跨回合的 reds Map。
// 设计: docs/superpowers/specs/2026-06-06-autobattle-delayed-bleed-design.md
import type { BleedFeedInput, BleedTimerConfig } from '../types';

/** 单只红名的速率追踪记录 */
interface RedSample {
  lastHpPct: number; // 上次 observe 记录的血量基线(算单回合掉幅用)
  activeDeltas: number[]; // 主动攻击掉血样本窗口(每个 = 一次主动攻击回合的 hpPct 降幅)
}

const SAMPLE_CAP = 8; // activeDeltas 物理上限; shouldFeed 再取最近 cfg.rateWindow 个平均

const EXECUTE_HP = 25; // 斩杀线(与慈悲 hpPct<25 / selectRedTarget 'execute' 对齐)

export class BleedTimer {
  private reds = new Map<number, RedSample>(); // eid → 样本(多红名各自独立桶)
  private pendingActiveEid: number | null = null; // 上回合主动攻击登记的红名 eid

  /** 每回合 decide 开头无条件调一次. 兑现上回合主动样本 + cleanup 死红名 + 更新血量基线.
   *  @param reds 当前所有活红名快照(已由 brain filter(is_red_boss)) */
  observe(reds: BleedFeedInput[]): void {
    const aliveEids = new Set(reds.map((e) => e.eid));
    // cleanup: 死亡/切场的红名删样本(防 Map 泄漏 + eid 复用串味)
    for (const eid of this.reds.keys()) if (!aliveEids.has(eid)) this.reds.delete(eid);
    for (const red of reds) {
      const rec = this.reds.get(red.eid) ?? { lastHpPct: red.hpPct, activeDeltas: [] };
      // 兑现: 仅当"上回合主动打了这只红名"且本回合真掉血, 才计入主动速率样本(被动掉血/miss 自然排除)
      if (this.pendingActiveEid === red.eid) {
        const drop = rec.lastHpPct - red.hpPct;
        if (drop > 0) {
          rec.activeDeltas.push(drop);
          if (rec.activeDeltas.length > SAMPLE_CAP) rec.activeDeltas.shift();
        }
      }
      rec.lastHpPct = red.hpPct;
      this.reds.set(red.eid, rec);
    }
    this.pendingActiveEid = null;
  }

  /** brain 在"本回合决策 = 主动攻击该红名"的 return 分支(经 hitRed)登记归因.
   *  下一回合 observe 时该 eid 的掉血才算主动样本. */
  noteActiveAttack(eid: number): void {
    this.pendingActiveEid = eid;
  }

  /** 是否该现在喂要害. 只看血量/速率时机; stunned/!bleeding/oc 由 brain 外层守卫. */
  shouldFeed(execRed: BleedFeedInput, cfg: BleedTimerConfig): boolean {
    if (!cfg.enabled) return true; // 退回旧行为(brain 的 stunned&&!bleeding 守门)
    const hp = execRed.hpPct; // 全程 hpPct(0-100), 不用 hpNow
    let path = 'fallback';
    let r = 0;
    let T = 0;
    let feed: boolean;

    if (hp <= EXECUTE_HP) {
      path = 'execLine';
      feed = true; // 已破斩杀线还没流血 → 立刻喂(别错过; 单击跨窗也由此兜)
    } else {
      const samples = this.reds.get(execRed.eid)?.activeDeltas ?? [];
      if (samples.length >= cfg.minSamples) {
        const win = samples.slice(-cfg.rateWindow);
        r = win.reduce((a, b) => a + b, 0) / win.length; // 主动掉血移动平均(%/回合)
        if (r > cfg.minRate) {
          path = 'rate';
          T = Math.ceil((hp - EXECUTE_HP) / r); // 还需几回合到 25%
          feed = T <= cfg.bleedTurns - cfg.safety; // T≤B-safety 才喂
        } else {
          feed = hp <= cfg.fallbackHpPct; // r 太小/负 → 兜底窗口
        }
      } else {
        feed = hp <= cfg.fallbackHpPct; // 样本不足 → 兜底窗口
      }
    }

    // eslint-disable-next-line no-console
    console.log('[HVAB:bleed]', { eid: execRed.eid, hpPct: hp, r: Math.round(r * 10) / 10, T, path, feed });
    return feed;
  }
}
