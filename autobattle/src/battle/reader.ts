// 状态读取: HV 战斗 DOM → BattleState. 翻写自 reference/hv_brain_modern.user.js:82-125
// XHR 旁路捕获已在 main.ts(document-start)完成; 本层以 DOM 解析为主数据源.
import { config } from '../core/config';
import { $, $$ } from '../core/dom';
import { BUFF_IMG, DEBUFFS, SS_CN } from './tables';
import { IT } from './tables';
import type { BattleState, BuffMap, BuffState, EnemyState } from '../types';

export class StateReader {
  prev: Partial<BattleState> = {};
  maxHp = 0;
  maxMp = 0;
  maxSp = 0;
  roundNow = 0;
  roundAll = 0;

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
      const kw = BUFF_IMG[k].toLowerCase();
      // 匹配图标文件名(src) 或 悬停 buff 官方名(onmouseover 里 set_infopane_effect('名字') 的第一个参数;
      // 只取名字、不含描述, 避免描述里的词误判). 比纯图标名更可靠, 且能识别图标名未知的 buff(如御谜士祝福).
      const im = imgs.find((i) => {
        const src = (i.getAttribute('src') || '').toLowerCase();
        const name = ((i.getAttribute('onmouseover') || '').match(/set_infopane_effect\('([^']*)'/)?.[1] || '').toLowerCase();
        return src.includes(kw) || name.includes(kw);
      });
      out[k] = im ? { active: true, turns: this._expire(im) } : { active: false, turns: 0 };
    }
    return out;
  }

  /** 从战斗日志 #textlog 解析轮数(取最新); 读不到则保留上次缓存.
   *  英文优先(精确); 汉化/通用兜底: 括号内 "N / M"(防某些汉化把 Round 译成中文改了 textContent). */
  private _round(): void {
    const tl = document.getElementById('textlog');
    if (!tl) return;
    const txt = tl.textContent || '';
    let ms = [...txt.matchAll(/Round\s*(\d+)\s*\/\s*(\d+)/gi)];
    if (!ms.length) ms = [...txt.matchAll(/[(（][^)）]{0,8}?(\d+)\s*\/\s*(\d+)[^)）]{0,8}?[)）]/g)];
    const last = ms[ms.length - 1];
    if (last) {
      this.roundNow = +last[1];
      this.roundAll = +last[2];
    }
  }

  read(): BattleState {
    const C = config.all();
    this._round(); // 更新轮数缓存
    const hp = this._num('vrhd'),
      mp = this._num('vrm'),
      sp = this._num('vrs');
    if (hp) this.maxHp = Math.max(this.maxHp || C.HPMAX, hp); // 动态识别满值(自适应成长/插件), 解决 >100%
    if (mp) this.maxMp = Math.max(this.maxMp || C.MPMAX, mp);
    if (sp) this.maxSp = Math.max(this.maxSp || C.SPMAX, sp);

    // OC(斗气): 数亮点 —— dodying 原版法(hvAutoAttack.user.js:2666): 总点(#vcp>div>div) 减 灭点(id=vcr), 每点 25(满10点=250).
    // ⚠旧 B大脑(我之前翻写的底本)用 bar宽/vcp宽×250 是错的: 满 OC 也只算出 ~119(190/400×250),
    //   致 oc≥200 永不成立 → 小马炮永不放 + 攒炮模式永远压着架式("来回开关灵动"总根因). 已弃用.
    const ocDots = $$('#vcp>div>div').length;
    const ocEmpty = $$('#vcp>div>div#vcr').length;
    const oc = ocDots ? (ocDots - ocEmpty) * 25 : 0;

    const B = this._buffs();
    const stance = document.getElementById('ckey_spirit') as HTMLImageElement | null;

    const allMkey = $$<HTMLElement>('[id^="mkey_"]');
    const enemies: EnemyState[] = allMkey
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

    // 小马炮按钮置灰(opacity:0.5 + onclick=null)= 在 50 回合冷却中. 实测 OC=119<200 仍未置灰 → 置灰只代表冷却, 不代表 OC.
    // 故 cannonReady = 未置灰(冷却好); 能否真放再由 brain 叠加 OC≥200 判. 可用态 DOM: 无 opacity、有 onclick.
    const cannonEl = $$<HTMLElement>('#pane_skill [onmouseover]').find((e) =>
      /Friendship|Cannon/i.test(e.getAttribute('onmouseover') || ''),
    );
    const cannonDimmed = /opacity\s*:\s*0?\.\d/.test(cannonEl?.getAttribute('style') || '');

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
      roundNow: this.roundNow,
      roundAll: this.roundAll,
      monsterTotal: allMkey.length,
      battleType: SS_CN[new URLSearchParams(location.search).get('ss') || ''] || '战斗',
      gemReady: !!$(`.bti3>div[onmouseover*="set_infopane_item(${IT.manaGem})"]`),
      cannonReady: !!cannonEl && !cannonDimmed, // 未置灰 = 不在 50 回合冷却(brain 再叠加 OC≥200 才放)
      scrollReady: !!$(`.bti3>div[onmouseover*="set_infopane_item(${IT.scrollProt})"]`),
      firstRound: this.prev._started !== true,
      lockedRedId: this.prev.lockedRedId,
      _started: true,
    };
  }
}

export const reader = new StateReader();
