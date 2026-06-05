// 状态读取: HV 战斗 DOM → BattleState. 翻写自 reference/hv_brain_modern.user.js:82-125
// XHR 旁路捕获已在 main.ts(document-start)完成; 本层以 DOM 解析为主数据源.
import { config } from '../core/config';
import { $, $$ } from '../core/dom';
import { BUFF_IMG, DEBUFFS, SS_CN, GEM, STATUS_LIB } from './tables';
import { IT } from './tables';
import type { BattleState, BuffMap, BuffState, EnemyState } from '../types';

export class StateReader {
  prev: Partial<BattleState> = {};
  maxHp = 0;
  maxMp = 0;
  maxSp = 0;
  roundNow = 0;
  roundAll = 0;
  takesMagic = false; // 缓存: 最近敌方对我是否魔法伤害(读不到保留)
  initHp: Record<string, number> = {}; // 缓存: 怪初始 HP(键=字母 A-E, 对应 mkey/DOM idx; Spawned 行解析)

  /** 读 vital 数值(HP/MP/SP): HV 会按状态换数值元素 id 后缀(实测 HP 在 vrhd↔vrhb 间切)+ 宽屏版加前缀 dvr*.
   *  故在 #pane_vitals 内按 id 前缀匹配, 不写死全名 —— 一次覆盖所有后缀/前缀变体(连原版都只认 vrhd、漏了 vrhb). */
  private _vital(...prefixes: string[]): number {
    const scope = document.getElementById('pane_vitals') ?? document.body;
    for (const p of prefixes) {
      for (const e of Array.from(scope.querySelectorAll(`[id^="${p}"]`))) {
        const m = (e.textContent || '').match(/\d+/);
        if (m) return parseInt(m[0]);
      }
    }
    return NaN;
  }

  /** buff 剩余回合: onmouseover set_infopane_effect('名','描述',第三参数) — 数字=回合, 'autocast'/字符串=游戏自动维持(常驻).
   *  XHR /json 响应实测确认(pane_effects 字段, 也在 DOM): Regen 21 / Heartseeker 326 / Spark等 autocast. 原读 [id*=expire] 读不到才兜底 99. */
  private _expire(img: Element): number {
    const mo = img.getAttribute('onmouseover') || '';
    const p = (mo.match(/set_infopane_effect\('[^']*',\s*'[^']*',\s*([^)]+)\)/)?.[1] || '').trim();
    return /^\d+$/.test(p) ? parseInt(p) : 99; // 数字=剩余回合; 'autocast'/其他=游戏自动/常驻 → 99 不补
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

  /** 从 #textlog 最新一条"敌方对我伤害"判物理/魔法(物理 pierc/crush/slash, 否则魔法).
   *  翻写自 dodying:4264-4280; 日志最新在末尾(与 _round 一致)故取最后一个匹配; 读不到保留上次缓存. */
  private _enemyMagic(): void {
    const tl = document.getElementById('textlog');
    if (!tl) return;
    const ms = [...(tl.textContent || '').matchAll(/you for \d+ ([a-zA-Z]+) damage/g)];
    const last = ms[ms.length - 1];
    if (!last) return;
    const type = last[1].replace(/ing$/i, '').toLowerCase();
    this.takesMagic = !/pierc|crush|slash/.test(type);
  }

  /** 从 #textlog 解析 "Spawned Monster X: MID=N (Name) LV=N HP=N" 行 → 缓存每怪初始 HP.
   *  GF 实测格式(2026-06-05): "Spawned Monster A: MID=325614 (Halo Effect) LV=398 HP=105710".
   *  字母 A→mkey_1/idx0, B→mkey_2/idx1 …(letter=String.fromCharCode(65+idx)).
   *  textlog 每波给一次且最新在顶部, 长回合可能被挤出末尾 → 解析到就更新, 没有则沿用; 新波同字母覆盖. */
  private _spawnHp(): void {
    const tl = document.getElementById('textlog');
    if (!tl) return;
    const re = /Spawned Monster ([A-Z]):\s*MID=\d+\s*\([^)]+\)\s*LV=\d+\s*HP=(\d+)/g;
    // textlog 顶新底旧(本文件 _round/_enemyMagic 注释的"末尾"措辞与此相反, 以 GF 实测 spec§2.4 为准).
    // reverse: matchAll 按文本序(顶→底=新→旧), 反转后先写旧波、后写新波 → 同字母新波覆盖旧波(防 textlog 万一不清空时用错波次 HP).
    for (const m of [...(tl.textContent || '').matchAll(re)].reverse()) this.initHp[m[1]] = +m[2];
  }

  read(): BattleState {
    const C = config.all();
    this._round(); // 更新轮数缓存
    this._enemyMagic(); // 更新"最近敌方伤害是否魔法"缓存
    this._spawnHp(); // 更新怪初始 HP 缓存(Spawned 行)
    // HV 按状态/布局换 vital 数值 id: HP 实测 vrhd↔vrhb(截图证), 宽屏版加前缀 dvr*. 用前缀匹配兜住所有变体(修"切到 vrhb 态 HUD 全空+脚本停摆")
    const hp = this._vital('vrh', 'dvrh'),
      mp = this._vital('vrm', 'dvrm'),
      sp = this._vital('vrs', 'dvrs');
    if (hp) this.maxHp = Math.max(this.maxHp || C.HPMAX, hp); // 动态识别满值(自适应成长/插件), 解决 >100%
    if (mp) this.maxMp = Math.max(this.maxMp || C.MPMAX, mp);
    if (sp) this.maxSp = Math.max(this.maxSp || C.SPMAX, sp);

    // OC(斗气) 数点: 满点 ×25 + 在建点(id=vcr, 半亮 opacity0.5)按半点 ≈12.5 估 → 粒度 25→12.5(更细 + 架式阈值更准).
    //   实测: HV 把斗气画成 N 个点(每点25), 正充能的那点 id=vcr/opacity0.5; DOM 不暴露其精确填充, 故在建点按半点估.
    //   dodying 原版(hvAutoAttack.user.js:2666)是 floor(直接减掉 vcr); 这里多给半点, 修"架式过早关"+"OC 只跳整10%".
    //   ⚠旧 B大脑量条法(bar宽/vcp宽×250)是错的: 满 OC 也只算 ~119 → oc≥200 永不成立 → 炮永不放(总根因), 已弃.
    const ocDots = $$<HTMLElement>('#vcp>div>div');
    let oc: number;
    if (ocDots.length) {
      const ocVcr = ocDots.filter((d) => d.id === 'vcr').length;
      oc = Math.round((ocDots.length - ocVcr) * 25 + ocVcr * 12.5);
    } else {
      // 宽屏(d)版无 #vcp 数点, OC 直接读 #dvrc 数值(原版 hvAutoAttack:2671)
      const dvrc = document.getElementById('dvrc');
      oc = dvrc ? parseInt((dvrc.textContent || '').match(/\d+/)?.[0] ?? '0') || 0 : 0;
    }

    const B = this._buffs();
    const stance = document.getElementById('ckey_spirit') as HTMLImageElement | null;

    const allMkey = $$<HTMLElement>('[id^="mkey_"]');
    const enemies: EnemyState[] = allMkey
      .map((m, idx) => {
        const eid = +m.id.split('_')[1];
        const dimgEl = $$<HTMLImageElement>('.btm6 img', m);
        const dimg = dimgEl.map((i) => i.getAttribute('src') || '');
        const debuff: Record<string, boolean> = {};
        for (const d of DEBUFFS) debuff[d.key] = dimg.some((s) => d.img.test(s));
        // 13 状态 flags: src 关键字 或 onmouseover 官方名(双保险, 翻写 dodying skillLib)
        const status: Record<string, boolean> = {};
        for (const k in STATUS_LIB) {
          const sd = STATUS_LIB[k];
          status[k] =
            dimg.some((s) => s.includes(sd.img)) ||
            dimgEl.some((i) => (i.getAttribute('onmouseover') || '').includes(`set_infopane_effect('${sd.name}`)); // 前缀匹配(去闭合'): 兼容叠加层数后缀如 'Penetrated Armor (x2)'(GF 实测)
        }
        // 血条 per-mkey(修 index bug: 全局 .btm5:nth-child(1) img 每怪含 nbargreen+nbarfg 两 img → bloodImgs[idx] 错位)
        const bImg = m.querySelector<HTMLImageElement>('.btm4 > .btm5:nth-child(1) img');
        const bw = bImg ? parseFloat(bImg.style.width || '120') : 120;
        const hpPct = isNaN(bw) ? 100 : Math.round((bw / 120) * 100); // 满血条 width=120(GF 实测)
        const dead = /opacity/.test(m.getAttribute('style') || '');
        // 绝对 hpNow: initHp[字母] × width/120(翻写 dodying:3296); 初始HP缺失退化 hpPct(同基准排序仍对); 死怪 Infinity
        const init = this.initHp[String.fromCharCode(65 + idx)];
        const hpNow = dead ? Infinity : init ? Math.floor((init * bw) / 120 + 1) : hpPct;
        return {
          eid,
          alive: !dead,
          is_red_boss: !!$('.btm2[style*="background"]', m),
          debuff,
          penArmor: dimg.some((s) => /penetrat|bleed/i.test(s)),
          hpPct,
          bleeding: $$<HTMLImageElement>('img', m).some((i) => /wpn_bleed/i.test(i.getAttribute('src') || '')),
          stunned: $$<HTMLImageElement>('img', m).some((i) => /stun/i.test(i.getAttribute('src') || '')),
          hpNow,
          name: ($('.btm3', m)?.textContent || '').trim(),
          status,
        };
      })
      .filter((e) => e.alive);

    const lastDmg =
      typeof this.prev.hp === 'number' && this.prev.hp > hp ? this.prev.hp - hp : 0;

    // 小马炮: 只判"在不在技能栏"(cannonExists). OC 够不够看数值(overcharge≥200), 50 回合冷却由 loop 按回合追踪(cannonOnCd).
    // 弃用 opacity 判冷却: 实测 OC<200 与 50 回合冷却都是 opacity:0.5+onclick=null, 视觉无法区分(这是炮死锁根因).
    const cannonEl = $$<HTMLElement>('#pane_skill [onmouseover]').find((e) =>
      /Friendship|Cannon/i.test(e.getAttribute('onmouseover') || ''),
    );

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

    // 宝石按需对口: 缺啥用对应宝石, 没对口专用的用神秘宝石(回三样)兜底; 都没=0
    const gemAvail = (db: number) => !!$(`.bti3>div[onmouseover*="set_infopane_item(${db})"]`);
    const pickGem = (own: number) => (gemAvail(own) ? own : gemAvail(GEM.mystic) ? GEM.mystic : 0);
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
      tookMagicDmg: this.takesMagic,
      roundNow: this.roundNow,
      roundAll: this.roundAll,
      monsterTotal: allMkey.length,
      battleType: SS_CN[new URLSearchParams(location.search).get('ss') || ''] || '战斗',
      gems: { hp: pickGem(GEM.health), mp: pickGem(GEM.mana), sp: pickGem(GEM.spirit) },
      cannonExists: !!cannonEl, // 炮在技能栏(攒炮/放炮/OC技能让路共用)
      cannonOnCd: false, // 50 回合冷却由 loop 按回合追踪注入(reader 读不到冷却)
      scrollReady: !!$(`.bti3>div[onmouseover*="set_infopane_item(${IT.scrollProt})"]`),
      firstRound: this.prev._started !== true,
      lockedRedId: this.prev.lockedRedId,
      _started: true,
    };
  }
}

export const reader = new StateReader();
