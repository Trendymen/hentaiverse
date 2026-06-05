// 战斗循环驱动. 独立版没有 dodying 焊接点, 自建触发:
//   指纹变化驱动(状态变=新回合, 出招) + 超时兜底(2.5s 没推进=上一招可能无效, 强制换招防自锁死) + busy 锁(出招后等服务器往返).
// 【待 GF 实测优化】触发机制可改 MutationObserver 精确监听 HV 回合渲染.
import { config } from './core/config';
import { reader } from './battle/reader';
import { brain } from './battle/brain';
import { Exec } from './battle/executor';
import { actionLabel } from './battle/tables';
import { bus } from './core/bus';
import { logger } from './core/logger';
import { Store } from './core/store';
import type { BattleState } from './types';

let lastFp = '';
let actedAt = 0;
let busyUntil = 0;
let turn = 0;
let lastRound = -1;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSig = ''; // 上一次决策动作签名(死循环安全网用)
let stuckN = 0; // 连续"未推进+同动作"计数: 达阈值=上招放不出→强制脱困
// 小马炮冷却跨波/轮持续(HV 跳轮 reload 内存全失), 故持久化到 Store: cannonCd=剩余冷却回合, cannonRound=上次轮(检测重开 GrindFest)
let cannonCd = Store.get<number>('cannonCd', 0);
let cannonRoundSeen = Store.get<number>('cannonRound', -1);

function inBattle(): boolean {
  // 用战斗 vital 容器判定(#pane_vitals 的 id 不随状态变, 最稳); 兜底任何 HP 数值变体(vrhd/vrhb/宽屏 dvrh*).
  // 旧版只认 #vrhd → HP 数值切到 vrhb 态时误判"不在战斗" → 整脚本停摆(HUD 全空), 即本次根因.
  return !!document.getElementById('pane_vitals') || !!document.querySelector('[id^="vrh"],[id^="dvrh"]');
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
        if (changed) {
          // 炮冷却跨 reload 持久化: 轮数倒退(R30→R1=重开 GrindFest)→ 新战斗清零; 否则真新回合 -1
          if (S.roundNow > 0 && cannonRoundSeen > 0 && S.roundNow < cannonRoundSeen) cannonCd = 0;
          cannonRoundSeen = S.roundNow;
          if (cannonCd > 0) cannonCd--;
          Store.set('cannonCd', cannonCd);
          Store.set('cannonRound', cannonRoundSeen);
        }
        S.cannonOnCd = cannonCd > 0; // 注入冷却态给 brain(reader 读不到冷却)
        let a = brain.decide(S);
        // 死循环安全网: stalled(fp 没变=上招没推进)又决策同一招 → 判定该招放不出(法术冷却/物品没货/按钮缺), 连续 2 次强制平砍脱困
        const sig = `${a.type}:${a.id ?? ''}`;
        if (!changed && sig === lastSig) stuckN++;
        else stuckN = 0;
        lastSig = sig;
        if (stuckN >= 2) {
          const t = S.enemies.find((e) => e.alive);
          a = t
            ? { type: 'attack', id: t.eid, exec: () => Exec.attack(t.eid), note: '安全网:上招放不出→强制平砍' }
            : { type: 'defend', exec: () => Exec.defend(), note: '安全网:上招放不出→防御' };
          stuckN = 0;
        }
        if (a.type === 'cannon') { cannonCd = config.get('CANNON_CD_TURNS'); Store.set('cannonCd', cannonCd); } // 放炮 → 50 回合冷却(持久化跨波/轮)
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

        // 战斗日志: 每决策一条(含"为什么没放炮"诊断), 落盘 GM
        const C = config.all();
        const pct = (v: number, m: number) => (m ? Math.min(100, Math.round((v / m) * 100)) : 0);
        let note = a.note || ''; // 优先 brain 的决策原因(目标/连招阶段/攒炮/减压); 没有再补炮诊断
        if (!note && a.type !== 'cannon' && C.useCannon && S.alive >= C.CANNON_MIN_ENEMIES) {
          if (S.cannonOnCd) note = `炮:冷却剩${cannonCd}回合`;
          else if (S.overcharge < C.CANNON_MIN_OC) note = `炮:攒OC ${S.overcharge}/${C.CANNON_MIN_OC}`;
        }
        logger.push({
          round: S.roundAll ? `R${S.roundNow}/${S.roundAll}` : S.battleType,
          turn,
          oc: S.overcharge,
          hp: pct(S.hp, S.maxHp || C.HPMAX),
          mp: pct(S.mp, S.maxMp || C.MPMAX),
          sp: pct(S.sp, S.maxSp || C.SPMAX),
          alive: S.alive,
          total: S.monsterTotal,
          cannon: S.cannonOnCd ? `冷却${cannonCd}` : S.overcharge >= C.CANNON_MIN_OC ? '可放' : '攒OC',
          stance: S.stanceOn,
          action: actionLabel(a),
          note,
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
