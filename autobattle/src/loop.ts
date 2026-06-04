// 战斗循环驱动. 独立版没有 dodying 焊接点, 自建触发:
//   指纹变化驱动(状态变=新回合, 出招) + 超时兜底(2.5s 没推进=上一招可能无效, 强制换招防自锁死) + busy 锁(出招后等服务器往返).
// 【待 GF 实测优化】触发机制可改 MutationObserver 精确监听 HV 回合渲染.
import { config } from './core/config';
import { reader } from './battle/reader';
import { brain } from './battle/brain';
import { actionLabel } from './battle/tables';
import { bus } from './core/bus';
import type { BattleState } from './types';

let lastFp = '';
let actedAt = 0;
let busyUntil = 0;
let turn = 0;
let lastRound = -1;
let timer: ReturnType<typeof setTimeout> | null = null;

function inBattle(): boolean {
  return !!document.getElementById('vrhd');
}

// 回合指纹: 状态没变=同回合(不重复出招); 变了=新回合(可出招). 含怪的减益(铺 Weaken/Imperil 后也算推进).
function fingerprint(S: BattleState): string {
  const buffs = Object.entries(S.buff)
    .filter(([, v]) => v.active)
    .map(([k]) => k)
    .join(',');
  const foes = S.enemies
    .map((e) => `${e.eid}:${Object.keys(e.debuff).filter((k) => e.debuff[k]).join('')}`)
    .join(',');
  return [S.hp, S.mp, S.sp, S.overcharge, S.alive, foes, buffs, S.channeling ? 'ch' : ''].join('|');
}

function tick(): void {
  try {
    if (config.get('enabled') && inBattle() && Date.now() >= busyUntil) {
      const S = reader.read();
      const fp = fingerprint(S);
      const changed = fp !== lastFp;
      const stalled = Date.now() - actedAt > 2500; // 2.5s 状态没推进 → 上一招可能无效, 强制重新决策换招(防自锁死)
      if (changed || stalled) {
        const a = brain.decide(S);
        // 轮数变 → 回合计数归零(新一波从 T1 起)
        if (S.roundNow !== lastRound) {
          turn = 0;
          lastRound = S.roundNow;
        }
        turn++;
        bus.emit('hud:update', {
          hp: S.hp,
          mp: S.mp,
          sp: S.sp,
          oc: S.overcharge,
          maxHp: S.maxHp,
          maxMp: S.maxMp,
          maxSp: S.maxSp,
          alive: S.alive,
          monsterTotal: S.monsterTotal,
          roundNow: S.roundNow,
          roundAll: S.roundAll,
          turn,
          battleType: S.battleType,
          action: actionLabel(a),
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
              /* HV 处理中/元素未就绪 */
            }
          }, delay);
          busyUntil = Date.now() + delay + 150; // 出招后极短锁(仅覆盖 exec 执行那一下); 同回合重复主要靠指纹去重, 锁短 = 换回合后响应快
          actedAt = Date.now();
        }
        lastFp = fp;
        reader.prev = S; // 每回合更新(firstRound/lastDmg/lockedRedId 正确推进, 不再自锁)
      }
    }
  } catch {
    /* tick 不能崩, 否则循环断 */
  }
  timer = setTimeout(tick, 300); // 轮询更快 = 换回合后更早检测到新回合
}

export function startLoop(): void {
  if (timer === null) {
    actedAt = Date.now();
    tick();
  }
}
