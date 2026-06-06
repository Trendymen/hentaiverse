// 连刷副作用执行(写层). 把 FarmAction 翻译成 XHR/导航/Store. 不做任何决策(从不读 state). 对齐 battle/executor.ts.
// 翻写 dodying $ajax.open(POST+reload) L144-146 / openNoFetch(window.open _self) L147 / recover=stamina L2418.
import { gmPost } from '../core/gm-http';
import { Store } from '../core/store';
import type { FarmAction } from '../types';

/** 导航(openNoFetch 等价): 整页跳转(GET). */
function navigate(url: string): void {
  window.open(url, '_self');
}

/** 开战: POST initid/inittoken 后整页 reload(翻写 $ajax.open + goto). */
function startBattle(href: string, initid: string, token: string): void {
  gmPost(`?s=Battle&ss=${href}`, `initid=${initid}&inittoken=${token}`)
    .then(() => {
      window.location.href = location.href; // goto: 触发 reload 进战斗页
    })
    .catch((e) => console.error('[HVAB:farm] startBattle 失败', e));
}

/** 恢复精力: POST recover=stamina 后 reload(翻写 L2418). */
function recoverStamina(): void {
  gmPost(location.href, 'recover=stamina')
    .then(() => {
      window.location.href = location.href;
    })
    .catch((e) => console.error('[HVAB:farm] recoverStamina 失败', e));
}

/** 执行一个 FarmAction. */
export function execFarm(action: FarmAction): void {
  switch (action.type) {
    case 'none':
      return;
    case 'navigate':
      navigate(action.url);
      return;
    case 'start-battle':
      startBattle(action.href, action.initid, action.token);
      return;
    case 'recover-stamina':
      recoverStamina();
      return;
    case 'set-cooldown':
      Store.set('farmCooldownUntil', action.untilMs);
      return;
  }
}
