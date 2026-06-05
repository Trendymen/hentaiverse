// 执行层: 决策动作 → 真实 HV DOM 操作. 翻写自 reference/hv_brain_modern.user.js:71-79
// 差异: 访问页面 battle 对象走 unsafeWindow(Tampermonkey 沙箱); DOM 操作用共享 document.
import { cannonBtn } from './tables';

let _lastCannon = 0; // 小马炮上次释放时间戳(冷却节流用)
export const lastCannon = (): number => _lastCannon;

export const Exec = {
  /** 通用法术: 读 onclick 自动区分 friendly(touch_and_go 自动)/hostile(选中后对第一个活怪 commit) */
  skill(id: number): boolean {
    const e = document.getElementById(String(id));
    if (!e || e.style.opacity === '0.5') return false; // 冷却/不可放: HV 把技能图标置灰 opacity:0.5(对齐原版 isOn), 不点空按钮假装成功
    const oc = e.getAttribute('onclick') || '';
    e.click();
    if (/set_hostile_skill/.test(oc)) {
      const m = document.querySelector<HTMLElement>('[id^="mkey_"]:not([style*="opacity"])');
      if (m) return Exec.attack(parseInt(m.id.split('_')[1]));
    }
    return true;
  },
  /** 用物品(quickbar 物品悬浮触发器) */
  item(db: number): boolean {
    const e = document.querySelector<HTMLElement>(`.bti3>div[onmouseover*="set_infopane_item(${db})"]`);
    return e ? (e.click(), true) : false;
  },
  /** 物品当前是否可点: 没货/冷却时 HV 不渲染该悬浮触发器. 用于决策前查库存, 避免选中点不出的药而空转(死循环根因之一) */
  itemAvailable(db: number): boolean {
    return !!document.querySelector(`.bti3>div[onmouseover*="set_infopane_item(${db})"]`);
  },
  /** 法术当前是否可放: 对齐原版 hvAutoAttack isOn() — 冷却时 HV 把技能图标设 opacity:0.5(置灰), 非 0.5 即可放 */
  skillReady(id: number): boolean {
    const e = document.getElementById(String(id));
    if (!e) return false;
    return e.style.opacity !== '0.5';
  },
  /** 平砍指定怪: 优先页面 battle.commit_target(unsafeWindow), 退回点 mkey 元素 */
  attack(n: number): boolean {
    const w =
      typeof unsafeWindow !== 'undefined' ? unsafeWindow : (window as unknown as typeof unsafeWindow);
    if (n === 0) {
      // 诊断埋点(eid=0 = 10怪满编局第10只怪 mkey_0; HV 原版 getMonsterID=(order+1)%10, order=9→mkey_0 回绕).
      // commit_target(0) 疑似 falsy 无效(原版从不裸调, 而是点 #mkey DOM 触发完整 hover_target+commit_target).
      // 仅 dump 铁证, 不改逻辑: 下次10怪局复现时 chrome-devtools 读 console(pattern [HVAB:eid0]) 即可确认 commit_target(0) 是否真打到该怪.
      const el = document.getElementById('mkey_0');
      const bw = el?.querySelector<HTMLElement>('.btm4 > .btm5:nth-child(1) img')?.style.width || '?';
      console.warn(
        `[HVAB:eid0] attack(0)触发 mkey_0存在=${!!el} commit_target存在=${!!w.battle?.commit_target} 血条w=${bw} onclick=${el?.getAttribute('onclick') || 'null'}`,
      );
    }
    if (w.battle?.commit_target) {
      w.battle.commit_target(n);
      return true;
    }
    const e = document.getElementById('mkey_' + n);
    return e ? (e.click(), true) : false;
  },
  /** 切换灵动架式 */
  stance(): boolean {
    const e = document.getElementById('ckey_spirit');
    return e ? (e.click(), true) : false;
  },
  /** 防御 */
  defend(): boolean {
    const e = document.getElementById('ckey_defend');
    return e ? (e.click(), true) : false;
  },
  /** 小马炮(hostile AOE): 记时间用于冷却节流 */
  cannon(): boolean {
    const c = cannonBtn();
    if (!c) return false;
    // 修‘放空也进冷却’bug: 按钮置灰(opacity:0.5 = OC<200 或在50回合冷却)即不可用 → 不放、也不盖冷却戳
    if (/opacity\s*:\s*0?\.\d/.test(c.getAttribute('style') || '')) return false;
    const id = parseInt(c.id);
    const r = Number.isNaN(id) ? (c.click(), true) : Exec.skill(id);
    if (r) _lastCannon = Date.now();
    return r;
  },
  /** hostile 定向: 选中技能后 commit 指定红怪 eid(修"打第一个怪"); 找不到 eid 退回通用 skill.
   *  GF 实测确认: 技能元素 id=DBID(2201/2202/2203), onclick=lock_action+set_hostile_skill(无 touch_and_go),
   *  靠 commit_target 释放 → 真出招+真消耗 OC(盾击 crit 102413 秒杂兵, OC 138→100). 同红怪减益机制. */
  castHostileOn(id: number, eid: number): boolean {
    const e = document.getElementById(String(id));
    if (!e || e.style.opacity === '0.5') return false; // 置灰(OC不够/冷却)不放: 否则 click 无效但后续 commit_target 会误变平砍
    e.click(); // 触发 set_hostile_skill(id) 进入选目标
    const m = document.getElementById('mkey_' + eid);
    return m ? Exec.attack(eid) : Exec.skill(id);
  },
  /** 胜利后继续下一波(GF/Arena 波次推进): battle.battle_continue() 优先, 退回点 #btcp */
  continueBattle(): boolean {
    const w =
      typeof unsafeWindow !== 'undefined' ? unsafeWindow : (window as unknown as typeof unsafeWindow);
    if (w.battle?.battle_continue) {
      w.battle.battle_continue();
      return true;
    }
    const e = document.getElementById('btcp');
    return e ? (e.click(), true) : false;
  },
};
