// 决策大脑: 16 级联 + 4 致命加固. 翻写自 reference/hv_brain_modern.user.js:128-187
import { config } from '../core/config';
import type { Config } from '../core/config';
import { SK, SK_SPECIAL, IT, DEBUFFS, CHANNEL_Q } from './tables';
import { Exec } from './executor';
import { rankTargets } from './target-weight';
import type { Action, ActionType, BattleState, EnemyState, WeightConfig } from '../types';

/** 从 config 装配 target-weight 所需的 WeightConfig(模块只认参数, 不碰单例) */
function weightCfg(C: Config): WeightConfig {
  return {
    baseHpRatio: C.baseHpRatio,
    yggdrasilExtraWeight: C.yggdrasilExtraWeight,
    unreachableWeight: C.unreachableWeight,
    statusWeight: C.statusWeight,
    enabled: C.useTargetWeight,
  };
}

export class Brain {
  decide(S: BattleState): Action {
    const C = config.all();
    const { hp, mp, sp } = S,
      oc = S.overcharge,
      ch = S.channeling,
      b = S.buff;
    const HM = S.maxHp || C.HPMAX,
      MM = S.maxMp || C.MPMAX,
      SM = S.maxSp || C.SPMAX; // 动态满值(自适应)
    const hasRed = S.enemies.some((e) => e.is_red_boss);
    const danger = Math.max(S.lastDmg, hasRed ? C.BURST_EST * HM : 0.3 * HM); // ②
    const predicted = hp - danger,
      PANIC = (hasRed ? C.PANIC_RED : C.PANIC_NORM) * HM;
    const mpFree = Math.max(0, mp - C.SPARK_RESERVE); // ①
    const heavy = S.lastDmg > 0.3 * HM,
      sparkCost = ch ? C.SPARK_RESERVE * 0.5 : C.SPARK_RESERVE;
    const A = (t: ActionType, id: number): Action => ({
      type: t,
      id,
      exec:
        t === 'spell'
          ? () => Exec.skill(id)
          : t === 'item'
            ? () => Exec.item(id)
            : () => Exec.attack(id),
    });
    // 体力急救药降级链: 终极体力药 → 体力长效药 → 体力药水, 取背包里第一个"可点"的;
    // 全部没货/冷却 → 返回 null, 交上层降级(火花/防御), 不再空转点击不存在的药(修死循环根因)
    const pickHeal = (): Action | null => {
      for (const id of [IT.hElixir, IT.hDraught, IT.hPotion]) {
        if (Exec.itemAvailable(id)) return A('item', id);
      }
      return null;
    };

    // P0 小马图: 留人工
    if (S.riddle) {
      const r = this.riddle();
      return r ? { type: 'riddle', option: r.option, exec: () => document.querySelector<HTMLElement>(r.option)?.click() } : { type: 'skip', note: 'riddle留人工' };
    }
    // P0.5 胜利继续下一波: 清完怪后 HV 弹 #btcp("You are victorious"), 点它进下一波 → 连续刷(GF 波次推进)
    if (S.canContinue) return { type: 'continue', exec: () => Exec.continueBattle() };
    // P1 Spark 零空窗(防一击致死) ①③
    if (!b.spark.active || b.spark.turns <= 2) {
      if (mp >= sparkCost) return A('spell', SK.Spark);
      if (!b.spark.active)
        return hp < 0.6 * HM
          ? (pickHeal() ?? { type: 'defend', exec: Exec.defend, note: 'Spark真空+急救药耗尽硬抗' })
          : { type: 'defend', exec: Exec.defend, note: 'Spark真空+缺MP硬抗' };
      return S.gems.mp ? A('item', S.gems.mp) : A('item', IT.mElixir);
    }
    // P2 承伤预测式急救: 仅"当前血已破红线(hp<PANIC)" 或 "预测下一发致命且当前血本就不健康(hp<HP_HEAL)" 才救.
    // 血量健康(≥HP_HEAL)即便有红怪也不急救 —— 红怪单发 ≤BURST_EST, 健康血挨一发死不了, 不浪费顶级药.
    // (修: 91%血+红怪误触发 → 喝终极体力药; 且 Elixir 耗尽点不动 → 空转死循环. 喝药改降级链, 没货则火花/防御兜底)
    if (hp < PANIC || (predicted < PANIC && hp < C.HP_HEAL * HM)) {
      const canCure = mp >= C.MP_LOW * MM || ch;
      // 完全治疗术冷却(opacity:0.5)→ 退普通治疗术 → 喝药 → 火花(可放才放)→ 防御; 不再死盯放不出的法术空转(对齐原版 isOn 可放性门)
      if (canCure && Exec.skillReady(SK.FullCure)) return A('spell', SK.FullCure);
      if (canCure && Exec.skillReady(SK.Cure)) return A('spell', SK.Cure);
      return pickHeal() ?? (Exec.skillReady(SK.Spark) && mp >= sparkCost ? A('spell', SK.Spark) : { type: 'defend', exec: Exec.defend, note: '治疗冷却+急救药耗尽硬抗' });
    }
    // P2.5 Channeling 主动利用: 折扣窗口补最贵(保命已在前, 不抢)
    if (ch && C.useChanneling !== false) {
      for (const q of CHANNEL_Q) {
        if (!q.need(b, S)) continue;
        if (q.hostile) {
          const t = this.lockTarget(S);
          if (t) return this.castOnRed(q.id, t, S);
          continue;
        }
        return A('spell', q.id);
      }
    }
    // P3 MP 熔断 ④(节流: 长效药冷却中改秘药)
    if (mp < C.MP_FUSE * MM && !ch && (b.spark.turns <= 2 || b.spiritShield.turns <= 2 || b.protection.turns <= 2))
      return S.gems.mp ? A('item', S.gems.mp) : !b.mpot.active ? A('item', IT.mDraught) : A('item', IT.mElixir);
    // 物理双墙状态(缺失或剩 ≤1 回合视为需补)
    const ssDown = !b.spiritShield.active || b.spiritShield.turns <= 1;
    const prDown = !b.protection.active || b.protection.turns <= 1;
    // P4 守护卷轴只在"两墙都缺"时一键补(省回合); 墙在/只缺一墙 → 跳过走法术单补, 不再因 firstRound 无脑铺(防有墙还浪费卷轴/打断手动守护)
    if (C.scrollFirst && S.scrollReady && ssDown && prDown)
      return A('item', IT.scrollProt);
    // 单墙法术补(MP 不足: Gem 回蓝 → 秘药兜底)
    if (prDown)
      return mp >= sparkCost ? A('spell', SK.Protection) : S.gems.mp ? A('item', S.gems.mp) : A('item', IT.mElixir);
    if (ssDown)
      return mp >= sparkCost ? A('spell', SK.SpiritShield) : S.gems.mp ? A('item', S.gems.mp) : A('item', IT.mElixir);
    // P5 Absorb(仅法系怪): 最近敌方对我造成魔法伤害 → 上吸收墙. useAbsorb 默认关(盾战物防为主).
    if (C.useAbsorb && S.tookMagicDmg && !b.absorb.active && Exec.skillReady(SK.Absorb)) return A('spell', SK.Absorb); // 加 skillReady(冷却检测): Absorb 放了进冷却就别反复决策(根治法吸死循环)
    // P7 Haste
    if (!b.haste.active || b.haste.turns <= 1) return A('spell', SK.Haste);
    // 重击波垫血(节流)
    if (heavy && hp < C.HP_HEAL * HM && !b.hpot.active) return A('item', IT.hDraught);
    // P8 Regen(御谜士祝福期间跳过 — 祝福自带强力回复, 不浪费 Regen 的 MP)
    if (!b.blessing.active && (!b.regen.active || b.regen.turns <= 1)) return A('spell', SK.Regen);
    // P9 回 MP(节流: manapot 在=刚喝长效药冷却中不重复喝; Gem 不受冷却)
    if (mpFree < C.MP_LOW * MM) {
      if (S.gems.mp) return A('item', S.gems.mp);
      if (!b.mpot.active) return A('item', IT.mDraught);
    }
    // P10 回 HP(节流)
    if (hp < C.HP_HEAL * HM && !b.hpot.active) return S.gems.hp ? A('item', S.gems.hp) : A('item', IT.hDraught);
    // P11 回 SP 喂斗气(节流)
    if (sp < C.SP_LOW * SM && S.stanceOn && !b.spot.active) return S.gems.sp ? A('item', S.gems.sp) : A('item', IT.sDraught);
    // P11.5 小马炮 AOE(攒满即放, 必须排在架式之上): 不在 50 回合冷却(loop 按回合追踪 cannonOnCd) + OC≥200(炮耗8点斗气).
    //   弃用 opacity 判: OC<200 与冷却同为 opacity:0.5 无法区分(炮死锁根因), 改用回合冷却 + OC 数值.
    //   排在架式之上: 否则 OC 攒到 200 那刻被 P12"开架式"抢走 → 架式烧回<200 → 炮放不出+架式来回开关.
    if (C.useCannon && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES && oc >= C.CANNON_MIN_OC)
      return { type: 'cannon', exec: Exec.cannon };
    // P12 灵动架式开关(滞回) + 临门让位
    //   架式常驻为主(ehwiki:+100%物理伤害; 平砍+反击产OC > 架式烧10% → 净涨); 仅"临门一脚"让位:
    //   炮在栏+不冷却+够怪+OC接近200(≥CANNON_YIELD_OC 且 <200) → 关架式冲刺1-2回合让 OC 冲到 200 放炮.
    //   OC<CANNON_YIELD_OC 架式照常滞回常驻(不再全程压架式攒炮 — 日志实测全程架关=丢光+100%伤害).
    const chargingCannon =
      C.useCannon && C.cannonYieldStance && S.cannonExists && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES && oc >= C.CANNON_YIELD_OC && oc < C.CANNON_MIN_OC;
    if (chargingCannon) {
      if (S.stanceOn) return { type: 'stance', exec: Exec.stance }; // 关架式, 停止 OC 流失
    } else {
      if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn) return { type: 'stance', exec: Exec.stance };
      if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: 'stance', exec: Exec.stance };
    }
    // P13 红怪减益序列(表驱动 Weaken→Imperil; 定向 commit 红怪)
    const tgt = this.lockTarget(S);
    if (tgt?.is_red_boss) {
      for (const d of DEBUFFS) {
        if (C[d.cfg] === false) continue; // 控制台开关
        if (tgt.debuff[d.key]) continue; // 已挂该减益
        if (!(ch || mpFree >= C.MP_LOW * MM)) break; // MP 不够: 整块让位给输出
        return this.castOnRed(d.id, tgt, S);
      }
    }
    // P14 Heartseeker(持久战提暴)
    if ((!b.heartseeker.active || b.heartseeker.turns <= 1) && S.alive >= C.HS_MIN_ENEMIES && (ch || mpFree >= 0.4 * MM))
      return A('spell', SK.Heartseeker);
    // P15 OC 近战技 + 跨波攒炮预算(OC 跨波保留, 是稀缺资源, 要花在刀刃上).
    //   攒炮模式 saveOcForCannon: 炮在栏不冷却 + 血线健康 + (本波怪还多≥4 OR 本波高密度) → 攒 OC 不花单体技.
    //     有红名也攒: 怪多时炮 AOE 清场+削红名最值(red boss 也吃炮伤), 总是先尝试攒炮.
    //     高密度波(monsterTotal≥CANNON_MIN_ENEMIES)即使清到剩 2-3 杂兵也攒: 杂兵平砍清, OC 留给(本/下)波开炮 AOE.
    //   放弃攒炮(血线下降 struggling / 低密度波 / 炮冷却) → 单体技减压: 慈悲处决红名, 要害秒怪降围殴, 盾击晕眩.
    const struggling = hp < C.HP_HEAL * HM; // 血线下降(掉到健康线下 → 放弃攒炮, 单体技杀怪减压)
    const highDensity = S.monsterTotal >= C.CANNON_MIN_ENEMIES; // 高密度波(下波大概率也多 → 值得跨波攒炮)
    const saveOcForCannon =
      C.useCannon && S.cannonExists && !S.cannonOnCd && !struggling && (S.alive >= C.CANNON_MIN_ENEMIES || highDensity);
    if (!saveOcForCannon) {
      // 最后的慈悲(100 OC): 仅红名怪 25%+流血 处决(贵, 杂兵平砍即秒不值)
      const dying = S.enemies.find((e) => e.alive && e.is_red_boss && e.hpPct < 25 && e.bleeding);
      if (C.useMercifulBlow && dying && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow))
        return { type: 'spell', id: SK_SPECIAL.mercifulBlow, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, dying.eid) };
      const tgtSp = this.lockTarget(S); // 红怪优先
      // 要害强击(50 OC): 红名已晕→收割喂流血; 【红名在场 或 力不从心】→ 秒已晕杂兵减围殴血线压力; 纯杂兵且血健康→不放(平砍清, 省 OC 攒炮)
      const stunnedTgt = (tgtSp?.stunned ? tgtSp : null) || ((hasRed || struggling) ? S.enemies.find((e) => e.alive && e.stunned && !e.is_red_boss) : null);
      if (C.useVitalStrike && stunnedTgt && oc >= 50 && Exec.skillReady(SK_SPECIAL.vitalStrike))
        return { type: 'spell', id: SK_SPECIAL.vitalStrike, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, stunnedTgt.eid) };
      // 盾击(25 OC): 给未晕眩目标上晕眩(红怪优先铺要害; 否则杂兵, 晕眩减伤 + 铺要害秒杂兵)
      const toStun = tgtSp && !tgtSp.stunned ? tgtSp : S.enemies.find((e) => e.alive && !e.is_red_boss && !e.stunned);
      if (C.useShieldBash && toStun && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
        return { type: 'spell', id: SK_SPECIAL.shieldBash, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, toStun.eid) };
    }
    // P16 破甲滚雪球平砍: 杂兵按 finWeight 选最优(血量+13状态+Yggdrasil); 仅剩红怪锁定持续平砍.
    //   红怪线(lockTarget/P13/P15/下方尾部锁定)全不动 —— 权重只接管杂兵选谁(守半自动红线).
    //   useTargetWeight=false → rankTargets 退回 eid 升序 = 现状, 零回归.
    const ranked = rankTargets(S.enemies, weightCfg(C));
    const trash = ranked.filter((e) => !e.is_red_boss && e.alive);
    if (trash.length) return A('attack', trash[0].eid);
    if (tgt) {
      S.lockedRedId = tgt.eid;
      return A('attack', tgt.eid);
    }
    return { type: 'defend', exec: Exec.defend };
  }

  /** 锁定红怪(记忆目标优先, 否则首个活红怪) */
  lockTarget(S: BattleState): EnemyState | null {
    const live = S.enemies.filter((e) => e.is_red_boss && e.alive);
    return (S.lockedRedId !== undefined && live.find((e) => e.eid === S.lockedRedId)) || live[0] || null;
  }

  /** 定向红怪释放 hostile 减益 */
  castOnRed(id: number, tgt: EnemyState, S: BattleState): Action {
    S.lockedRedId = tgt.eid;
    return { type: 'spell', id, exec: () => Exec.castHostileOn(id, tgt.eid) };
  }

  /** 小马图: 默认留人工(接图像识别后返回 {confident, option}) */
  riddle(): { confident: boolean; option: string } | null {
    return null;
  }
}

export const brain = new Brain();
