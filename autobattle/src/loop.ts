// 战斗循环驱动. 独立版没有 dodying 焊接点, 自建触发:
//   指纹变化驱动(状态变=新回合, 出招) + 超时兜底(2.5s 没推进=上一招可能无效, 强制换招防自锁死) + busy 锁(出招后等服务器往返).
// 【待 GF 实测优化】触发机制可改 MutationObserver 精确监听 HV 回合渲染.
import { config } from './core/config';
import { reader } from './battle/reader';
import { brain } from './battle/brain';
import { Exec } from './battle/executor';
import { actionLabel, SK, IT } from './battle/tables';
import { bus } from './core/bus';
import { logger } from './core/logger';
import { Store } from './core/store';
import { getLastBattle } from './core/net-cache';
import { parseRoundFromJson, deriveBattleCode } from './record/battle-code';
import type { ActionType, BattleState } from './types';
import { farmTick } from './engine/starter';
import { tickRiddle } from './riddle';

let lastFp = '';
let actedAt = 0;
let busyUntil = 0;
let turn = 0;
let lastRound = -1;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSig = ''; // 上一次决策动作签名(死循环安全网用)
let lastInBattle: boolean | null = null; // 上一 tick 是否在战斗(初始 null → 首次 tick 必 emit 当前态, 同步 reload 后日志窗口); 检测进/退战斗驱动 battle:active
let inBattleFalseStreak = 0; // inBattle 连续 false 次数(退出去抖)
const EXIT_FALSE_STREAK = 4; // 连续 4 次 inBattle=false 才判真退出 — 防 reload 后战斗 DOM 延迟~308ms 的短暂 false 误清 logOpen(诊断确认的根因)
let stuckN = 0; // 连续"未推进+同动作"计数: 达阈值=上招放不出→强制脱困
// 小马炮冷却跨波/轮持续(HV 跳轮 reload 内存全失), 故持久化到 Store: cannonCd=剩余冷却回合, cannonRound=上次轮(检测重开 GrindFest)
let cannonCd = Store.get<number>('cannonCd', 0);
let regenCd = 0; // 细胞活化回合追踪(战斗内, 不跨 reload): 放出后 REGEN_HOLD 回合内不重放
let manaPotCd = 0; // 回蓝药冷静期(战斗内, 不跨 reload): 喝后 MANAPOT_HOLD 回合内常规线不重喝
const MANA_POT_IDS = new Set<number>([IT.mDraught, IT.mPotion, IT.mElixir]); // 三种回蓝药(宝石不受冷却, 不计入冷静期)
let cannonRoundSeen = Store.get<number>('cannonRound', -1);
let curBattleId = Store.get<string>('curBattleId', '');
let battleStartTs = Store.get<number>('curBattleStart', 0);

export function nextCannonCooldown(actionType: ActionType, execResult: unknown, currentCd: number, cooldownTurns: number): number {
  return actionType === 'cannon' && execResult === true ? cooldownTurns : currentCd;
}

function inBattle(): boolean {
  // 用战斗 vital 容器判定(#pane_vitals 的 id 不随状态变, 最稳); 兜底任何 HP 数值变体(vrhd/vrhb/宽屏 dvrh*).
  // 旧版只认 #vrhd → HP 数值切到 vrhb 态时误判"不在战斗" → 整脚本停摆(HUD 全空), 即本次根因.
  return !!document.getElementById('pane_vitals') || !!document.querySelector('[id^="vrh"],[id^="dvrh"]');
}

// 回合指纹: 状态没变=同回合(不重复出招); 变了=新回合(可出招). 含怪血+减益(铺 Weaken/Imperil 后也算推进).
//   ⚠怪血(hpNow)必须纳入: 攒OC平砍杂兵阶段玩家三围/OC/存活/减益全不动, 平砍只掉怪血 —— 若指纹漏掉怪血,
//   逐 tick 指纹恒定 → changed=false → loop 把"打中但指纹没变"误判为"上招放不出" → stuckN 累加触发安全网换目标(实测误报根因).
//   纳入后: 平砍打中→指纹变→立刻再出手(farming更快)+ stuckN 清零; 真网络卡怪血冻住→指纹仍不变→安全网照常生效, 不破坏原设计.
function fingerprint(S: BattleState): string {
  const buffs = Object.entries(S.buff)
    .filter(([, v]) => v.active)
    .map(([k]) => k)
    .join(',');
  const foes = S.enemies
    .map((e) => `${e.eid}:${e.hpNow}:${Object.keys(e.debuff).filter((k) => e.debuff[k]).join('')}`)
    .join(',');
  return [S.hp, S.mp, S.sp, S.overcharge, S.alive, foes, buffs, S.channeling ? 'ch' : ''].join('|');
}

function tick(): void {
  // 日志窗口联动: 检测进/退战斗(独立于 enabled). 退出去抖: 连续 N 次 false 才算真退出.
  //   诊断确认根因: reload 后战斗 DOM(#pane_vitals)延迟~308ms 才 ready, 首次 tick inBattle=false 会误判退出→清 logOpen→跨波不显示.
  //   去抖让这段短暂 false 不触发退出(配合 main 挂载时无条件立即开 → 既不闪又跨波显示).
  const nowIn = inBattle();
  if (nowIn) {
    inBattleFalseStreak = 0;
    if (lastInBattle !== true) {
      bus.emit('battle:active', true);
      lastInBattle = true;
    }
  } else if (lastInBattle !== false && ++inBattleFalseStreak >= EXIT_FALSE_STREAK) {
    bus.emit('battle:active', false);
    lastInBattle = false;
  }
  try {
    // 小马题辅助：独立于 enabled，useRiddleAssist 门控，战斗外也要工作
    if (config.get('useRiddleAssist')) { try { tickRiddle(); } catch {} }
    if (config.get('enabled') && nowIn && Date.now() >= busyUntil) {
      const S = reader.read();
      const fp = fingerprint(S);
      const changed = fp !== lastFp;
      const stalled = Date.now() - actedAt > 2500; // 2.5s 状态没推进 → 上一招可能无效, 强制重新决策换招(防自锁死)
      if (changed || stalled) {
        if (changed) {
          // 记录埋点(决策零改): battleId 切换沿 + battle:end. 仅新增 emit/Store 读写, 不动其下 cannonCd 逻辑.
          const raw = getLastBattle();
          const rj = parseRoundFromJson(raw);
          const rNow = rj?.roundNow ?? S.roundNow;
          const rAll = rj?.roundAll ?? S.roundAll;
          const isNewBattle = !curBattleId || (rNow > 0 && cannonRoundSeen > 0 && rNow < cannonRoundSeen);
          if (isNewBattle) {
            if (curBattleId) {
              const victorious = /You are Victorious/i.test(raw || '');
              bus.emit('battle:end', {
                battleId: curBattleId,
                battleCode: Store.get<string>('curBattleCode', ''),
                level: Store.get<number | null>('curLevel', null),
                roundAll: Store.get<number>('curRoundAll', 0),
                victorious,
                finalRawJson: raw,
                startedAt: battleStartTs,
                endedAt: Date.now(),
              });
            }
            const meta = deriveBattleCode(S.battleType, rAll, config.get('arenaTiers'));
            curBattleId = `${meta.battleCode}@${Date.now()}`;
            battleStartTs = Date.now();
            Store.set('curBattleId', curBattleId);
            Store.set('curBattleStart', battleStartTs);
            Store.set('curBattleCode', meta.battleCode);
            Store.set('curLevel', meta.level);
            Store.set('curRoundAll', rAll);
          }
          // 炮冷却跨 reload 持久化: 轮数倒退(R30→R1=重开 GrindFest)→ 新战斗清零; 否则真新回合 -1
          if (S.roundNow > 0 && cannonRoundSeen > 0 && S.roundNow < cannonRoundSeen) cannonCd = 0;
          cannonRoundSeen = S.roundNow;
          if (cannonCd > 0) cannonCd--;
          if (regenCd > 0) regenCd--;
          if (manaPotCd > 0) manaPotCd--;
          Store.set('cannonCd', cannonCd);
          Store.set('cannonRound', cannonRoundSeen);
        }
        S.cannonOnCd = cannonCd > 0; // 注入冷却态给 brain(reader 读不到冷却)
        S.cannonCdLeft = cannonCd; // 注入剩余冷却回合: P12 冷却尾段预判(剩几回合就提前关架式攒OC, 冷却完即放)
        S.regenOnCd = regenCd > 0; // 细胞活化回合追踪(兜 reader DOM 检测空窗)
        S.manaPotOnCd = manaPotCd > 0; // 回蓝药冷静期(防常规线连喝)
        let a = brain.decide(S);
        // 死循环安全网: stalled(fp 没变=上招没推进)又决策同一招 → 判定该招放不出(法术冷却/物品没货/按钮缺), 连续 2 次强制平砍脱困
        const sig = `${a.type}:${a.id ?? ''}`;
        if (!changed && sig === lastSig) stuckN++;
        else stuckN = 0;
        lastSig = sig;
        if (stuckN >= 2) {
          // 退避升级(GF 实测 R32 网络卡死循环刷屏): 原"强制平砍"和正常平砍是同一 commit_target, 网络卡时照样放不出 → 无限循环刷屏.
          //   达 STUCK_PAUSE → 疑似网络卡/无响应: 告警 + 自动暂停(不再疯狂刷), 等人工▶恢复;
          //   否则换个活怪平砍(目标可能特殊/卡) + 指数退避(busyUntil 拉长, 见下); stuckN 不重置, 累积到 pause(网络恢复 changed 会清零).
          if (stuckN >= config.get('STUCK_PAUSE')) {
            a = { type: 'skip', note: `⚠连续${stuckN}次放不出, 疑似网络卡/无响应 → 自动暂停, 检查网络后手动▶恢复` };
            config.set('enabled', false);
          } else {
            const live = S.enemies.filter((e) => e.alive);
            const t = live.length ? live[stuckN % live.length] : null; // 轮换目标试
            a = t
              ? { type: 'attack', id: t.eid, exec: () => Exec.attack(t.eid), note: `安全网:换目标#${t.eid}(连续${stuckN}次放不出·退避重试)` }
              : { type: 'defend', exec: () => Exec.defend(), note: '安全网:无活怪→防御' };
          }
        }
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
        // 诊断埋点: 平砍目标命中 mkey_0(10怪满编局第10只怪, eid=0; HV (order+1)%10 回绕). 落盘 battlelog 留明显标记 + 附 onclick(看 commit_target 参数). 仅诊断, 不改决策.
        if (a.type === 'attack' && a.id === 0) {
          const oc0 = document.getElementById('mkey_0')?.getAttribute('onclick') || 'null';
          note = `⚠️mkey_0(第10只·疑似打不动)[oc=${oc0.slice(0, 70)}] ${note}`;
        }
        if (!note && a.type !== 'cannon' && C.useCannon && S.alive >= C.CANNON_MIN_ENEMIES) {
          if (S.cannonOnCd) note = `炮:冷却剩${cannonCd}回合`;
          else if (S.overcharge < C.CANNON_MIN_OC) note = `炮:攒OC ${S.overcharge}/${C.CANNON_MIN_OC}`;
        }
        // 红名敌情(并入导出日志, 取代旧 [HVAB:foes] console 埋点): 仅红名在场时附, 供"反击晕红名/要害喂血时机"诊断 —
        //   看 reader 认红名(is_red_boss)对不对 + 红名每回合晕没晕(stunned)/有没有流血(bleeding); 杂兵波留空不污染行宽.
        const reds = S.enemies.filter((e) => e.alive && e.is_red_boss);
        const foe = reds.length
          ? reds.map((e) => `红#${e.eid} ${e.hpPct}% ${e.stunned ? '已晕' : '未晕'} ${e.bleeding ? '流血' : '无血'}`).join(' ')
          : undefined;
        const rec = {
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
          foe,
        };
        logger.push(rec);
        // 记录埋点(决策零改): battle:round → stats-collector 累计. 复用刚 push 的 LogRecord(同源同回合, DRY).
        bus.emit('battle:round', {
          battleId: curBattleId,
          battleCode: Store.get<string>('curBattleCode', ''),
          level: Store.get<number | null>('curLevel', null),
          roundNow: S.roundNow,
          roundAll: S.roundAll,
          turn,
          action: { type: a.type, id: a.id },
          actionLabel: actionLabel(a),
          record: rec,
          rawJson: getLastBattle(),
          bossThisWave: S.enemies.filter((e) => e.alive && e.is_red_boss).length,
          isRetry: !changed || stuckN >= 2,
        });
        if (a.type === 'continue') logger.flush(); // 继续下一波 battle_continue() 会 reload 页面 → 立即落盘, 防这条(及3s防抖内未落盘缓冲)随 reload 丢失

        if (a?.exec) {
          const dMin = config.get('delayMin'),
            dMax = config.get('delayMax');
          const delay = dMin + Math.random() * Math.max(1, dMax - dMin);
          const fn = a.exec;
          setTimeout(() => {
            let result: boolean | void = undefined;
            try {
              result = fn();
            } catch {
              /* HV 处理中/元素未就绪 */
            }
            const nextCd = nextCannonCooldown(a.type, result, cannonCd, config.get('CANNON_CD_TURNS'));
            if (nextCd !== cannonCd) {
              cannonCd = nextCd;
              Store.set('cannonCd', cannonCd);
            }
            // 细胞活化/回蓝药回合追踪: 真放出后(result===true)盖冷却戳, 下回合起 changed 递减, 抑制 reader DOM 空窗/长效药慢回导致的重复
            if (a.type === 'spell' && a.id === SK.Regen && result === true) regenCd = config.get('REGEN_HOLD');
            if (a.type === 'item' && a.id !== undefined && MANA_POT_IDS.has(a.id) && result === true) manaPotCd = config.get('MANAPOT_HOLD');
          }, delay);
          busyUntil = Date.now() + delay + 150 + (stuckN > 1 ? Math.min(stuckN * 500, 5000) : 0); // 出招后极短锁; 连续放不出(stuckN>1)指数退避减速(stuckN×500, 上限5s), 防网络卡时 300ms 疯狂刷屏
          actedAt = Date.now();
        }
        lastFp = fp;
        reader.prev = S; // 每回合更新(firstRound/lastDmg/lockedRedId 正确推进, 不再自锁)
      }
    } else if (config.get('enabled') && config.get('farmEnabled') && !nowIn && lastInBattle === false) {
      // M3 连刷: 仅战斗外 + 连刷开关开 + 已确认退出战斗(lastInBattle===false, 即连续 EXIT_FALSE_STREAK 次 false 后才置).
      // 守卫 lastInBattle===false 复用退出去抖: reload 后 DOM 延迟~308ms 期间 lastInBattle 仍为 null/true, 不会误触发连刷.
      // farmTick 内部 farmBusyUntil 节流到 farmTickMs, 故此处不查 busyUntil.
      farmTick();
    }
  } catch {
    /* tick 不能崩, 否则循环断 */
  }
}

// ── 驱动: MutationObserver(观察 #battle_main 战斗区, DOM 渲染即精确触发) + 慢轮询兜底(2s) ──
//   #battle_main = 实测的 vitals/effects/monster/textlog 共同祖先(#csp>#mainpane>#battle_main>{#battle_left, #battle_right}).
//   observer 负责快(战斗内 ajax 局部更新即触发, 不等 300ms 周期; 网络卡 DOM 不变就不触发 → R32 刷屏天然消失);
//   慢轮询兜底(2s)处理: 战斗↔非战斗切换(挂/断 observer) + observer 漏 + 上招放不出 DOM 不变的死等(配 stalled 2.5s + 退避).
let mo: MutationObserver | null = null;
let debTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTick(): void {
  if (debTimer) clearTimeout(debTimer); // debounce 80ms: 一个 /json 响应同时更新多 pane → 多次 mutation 合并成一次 tick(等这批 DOM 全更新完再读, 数据一致)
  debTimer = setTimeout(tick, 80);
}

function ensureObserver(): void {
  const root = document.getElementById('battle_main');
  if (root && !mo) {
    mo = new MutationObserver(scheduleTick);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
  } else if (!root && mo) {
    mo.disconnect();
    mo = null; // 退出战斗/换波 reload → 断开(reload 后脚本重启会重挂)
  }
}

function slowPoll(): void {
  // 慢轮询兜底(2s): 挂/断 observer + observer 漏/死等时兜底触发(tick 内有 busy锁+指纹去重+enabled/inBattle 守卫, 重复调用无副作用)
  ensureObserver();
  tick();
  // 自适应间隔: 未挂 observer(战斗未开/未渲染完)→ 300ms 快检测战斗开始(修初次抓取慢); 挂上后 → 2s 慢兜底(observer 已负责快触发)
  timer = setTimeout(slowPoll, mo ? 2000 : 300);
}

export function startLoop(): void {
  if (timer === null) {
    actedAt = Date.now();
    slowPoll(); // 启动慢轮询兜底(内含 ensureObserver 挂 observer); observer 负责快速精确触发, 慢轮询只兜底
  }
}
