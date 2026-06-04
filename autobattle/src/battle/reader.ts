// 状态读取: HV 战斗 DOM → BattleState. 翻写自 reference/hv_brain_modern.user.js:82-125
// XHR 旁路捕获已在 main.ts(document-start)完成; 本层以 DOM 解析为主数据源.
import { config } from '../core/config';
import { $, $$ } from '../core/dom';
import { BUFF_IMG, DEBUFFS } from './tables';
import { IT } from './tables';
import type { BattleState, BuffMap, BuffState, EnemyState } from '../types';

export class StateReader {
  prev: Partial<BattleState> = {};
  maxHp = 0;
  maxMp = 0;
  maxSp = 0;

  /** 取元素第一个数字组, 无视百分比插件注入的 [88%] 等 */
  private _num(id: string): number {
    const e = document.getElementById(id);
    const m = e && (e.textContent || '').match(/\d+/);
    return m ? parseInt(m[0]) : NaN;
  }

  /** buff 剩余回合(【待 GF 实测核对读法】) */
  private _expire(img: Element): number {
    const ex = img.parentElement?.querySelector('[id*="expire"]');
    const n = ex ? parseInt((ex.textContent || '').match(/\d+/)?.[0] ?? '') : NaN;
    return isNaN(n) ? 99 : n;
  }

  /** 解析所有 buff 图标(含 channeling) */
  private _buffs(): Record<string, BuffState> {
    const imgs = $$<HTMLImageElement>('#pane_effects>img');
    const out: Record<string, BuffState> = {};
    for (const k in BUFF_IMG) {
      const im = imgs.find((i) => (i.getAttribute('src') || '').includes(BUFF_IMG[k]));
      out[k] = im ? { active: true, turns: this._expire(im) } : { active: false, turns: 0 };
    }
    return out;
  }

  read(): BattleState {
    const C = config.all();
    const hp = this._num('vrhd'),
      mp = this._num('vrm'),
      sp = this._num('vrs');
    if (hp) this.maxHp = Math.max(this.maxHp || C.HPMAX, hp); // 动态识别满值(自适应成长/插件), 解决 >100%
    if (mp) this.maxMp = Math.max(this.maxMp || C.MPMAX, mp);
    if (sp) this.maxSp = Math.max(this.maxSp || C.SPMAX, sp);

    const vcp = document.getElementById('vcp'),
      barEl = vcp?.firstElementChild as HTMLElement | null;
    const oc =
      vcp && barEl && vcp.offsetWidth ? Math.round((barEl.offsetWidth / vcp.offsetWidth) * C.OCMAX) : 0;

    const B = this._buffs();
    const stance = document.getElementById('ckey_spirit') as HTMLImageElement | null;

    const enemies: EnemyState[] = $$<HTMLElement>('[id^="mkey_"]')
      .map((m) => {
        const eid = +m.id.split('_')[1];
        const dimg = $$<HTMLImageElement>('.btm6 img', m).map((i) => i.getAttribute('src') || '');
        const debuff: Record<string, boolean> = {};
        for (const d of DEBUFFS) debuff[d.key] = dimg.some((s) => d.img.test(s));
        return {
          eid,
          alive: !/opacity/.test(m.getAttribute('style') || ''),
          is_red_boss: !!$('.btm2[style*="background"]', m),
          debuff,
          penArmor: dimg.some((s) => /penetrat|bleed/i.test(s)),
        };
      })
      .filter((e) => e.alive);

    const lastDmg =
      typeof this.prev.hp === 'number' && this.prev.hp > hp ? this.prev.hp - hp : 0;

    const buff: BuffMap = {
      spark: B.spark,
      spiritShield: B.spiritShield,
      protection: B.protection,
      absorb: B.absorb,
      haste: B.haste,
      regen: B.regen,
      heartseeker: B.heartseeker,
      blessing: B.blessing,
      hpot: B.hpot,
      mpot: B.mpot,
      spot: B.spot,
    };

    return {
      hp,
      mp,
      sp,
      overcharge: oc,
      lastDmg,
      enemies,
      alive: enemies.length,
      maxHp: this.maxHp,
      maxMp: this.maxMp,
      maxSp: this.maxSp,
      buff,
      channeling: B.channeling.active,
      stanceOn: !!(stance && /spirit_a/.test(stance.getAttribute('src') || '')),
      riddle: !!document.getElementById('riddlecounter'),
      canContinue: !!document.getElementById('btcp'),
      gemReady: !!$(`.bti3>div[onmouseover*="set_infopane_item(${IT.manaGem})"]`),
      cannonReady: !!$$('#pane_skill [onmouseover]').find((e) =>
        /Friendship|Cannon/i.test(e.getAttribute('onmouseover') || ''),
      ),
      scrollReady: !!$(`.bti3>div[onmouseover*="set_infopane_item(${IT.scrollProt})"]`),
      firstRound: this.prev._started !== true,
      lockedRedId: this.prev.lockedRedId,
      _started: true,
    };
  }
}

export const reader = new StateReader();
