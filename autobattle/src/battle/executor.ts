// 执行层: 决策动作 → 真实 HV DOM 操作. 翻写自 reference/hv_brain_modern.user.js:71-79
// 差异: 访问页面 battle 对象走 unsafeWindow(Tampermonkey 沙箱); DOM 操作用共享 document.
import { cannonBtn } from './tables';

let _lastCannon = 0; // 小马炮上次释放时间戳(冷却节流用)
export const lastCannon = (): number => _lastCannon;

export const Exec = {
  /** 通用法术: 读 onclick 自动区分 friendly(touch_and_go 自动)/hostile(选中后对第一个活怪 commit) */
  skill(id: number): boolean {
    const e = document.getElementById(String(id));
    if (!e) return false;
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
  /** 平砍指定怪: 优先页面 battle.commit_target(unsafeWindow), 退回点 mkey 元素 */
  attack(n: number): boolean {
    const w =
      typeof unsafeWindow !== 'undefined' ? unsafeWindow : (window as unknown as typeof unsafeWindow);
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
    const id = parseInt(c.id);
    const r = Number.isNaN(id) ? (c.click(), true) : Exec.skill(id);
    if (r) _lastCannon = Date.now();
    return r;
  },
  /** hostile 定向: 选中技能后 commit 指定红怪 eid(修"打第一个怪"); 找不到 eid 退回通用 skill */
  castHostileOn(id: number, eid: number): boolean {
    const e = document.getElementById(String(id));
    if (!e) return false;
    e.click();
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
