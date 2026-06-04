// 战斗循环驱动. 独立版没有 dodying 焊接点, 自建触发:
//   轮询(每 700ms) + 指纹去重(同回合只出一招) + busy 锁(动作后等服务器往返).
// 【待 GF 实测优化】触发机制可改 MutationObserver 精确监听 HV 回合渲染.
import { config } from './core/config';
import { reader } from './battle/reader';
import { brain } from './battle/brain';
import { bus } from './core/bus';
import type { BattleState } from './types';

let lastFp = '';
let busyUntil = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function inBattle(): boolean {
  return !!document.getElementById('vrhd');
}

// 回合指纹: 状态没变=同回合(不重复出招); 变了=新回合(可出招).
function fingerprint(S: BattleState): string {
  const buffs = Object.entries(S.buff)
    .filter(([, v]) => v.active)
    .map(([k]) => k)
    .join(',');
  const foes = S.enemies.map((e) => e.eid).join(',');
  return [S.hp, S.mp, S.sp, S.overcharge, S.alive, foes, buffs, S.channeling ? 'ch' : ''].join('|');
}

function tick(): void {
  try {
    if (config.get('enabled') && inBattle() && Date.now() >= busyUntil) {
      const S = reader.read();
      const fp = fingerprint(S);
      if (fp !== lastFp) {
        const a = brain.decide(S);
        const action = a ? `${a.type}${a.id ? ':' + a.id : ''}` : '';
        bus.emit('hud:update', {
          hp: S.hp,
          mp: S.mp,
          sp: S.sp,
          oc: S.overcharge,
          maxHp: S.maxHp,
          maxMp: S.maxMp,
          maxSp: S.maxSp,
          alive: S.alive,
          action,
        });
        if (a?.exec) {
          const dMin = config.get('delayMin'),
            dMax = config.get('delayMax');
          const delay = dMin + Math.random() * Math.max(1, dMax - dMin);
          const fn = a.exec;
          setTimeout(() => {
            try {
              fn();
            } catch {
              /* 出招失败无害(HV 处理中/元素未就绪) */
            }
          }, delay);
          busyUntil = Date.now() + delay + 500; // 锁: 动作延迟 + 服务器往返缓冲, 防同回合连点
        }
        lastFp = fp;
        reader.prev = S; // 存本回合(供下回合算 lastDmg / 记忆 lockedRedId)
      }
    }
  } catch {
    /* tick 不能崩, 否则循环断 */
  }
  timer = setTimeout(tick, 700); // 轮询驱动(HV 回合不会更快); 指纹去重保证同回合只出一招
}

export function startLoop(): void {
  if (timer === null) tick();
}
