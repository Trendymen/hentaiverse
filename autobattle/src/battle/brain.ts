// 决策大脑: 16 级联 + 4 致命加固. 翻写自 reference/hv_brain_modern.user.js:128-187
import { config } from '../core/config';
import type { Config } from '../core/config';
import { SK, SK_SPECIAL, IT, DEBUFFS, CHANNEL_Q } from './tables';
import { Exec } from './executor';
import { rankTargets } from './target-weight';
import type { Action, ActionType, BattleState, EnemyState, WeightConfig } from '../types';
import { assessPressure, hasFutureRound, selectControlDebuff, selectRedTarget, shouldSaveOcForCannon } from './strategy';

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
  private lowHpStreak = 0; // 连续 hp<STRUGGLE_HP 的决策次数(达 STRUGGLE_STREAK 才判血线下降, 防单次瞬掉误触发)
  private charging = false; // 攒炮冲刺态(滞回): OC≥YIELD 进入关架式并保持, 放炮归0/跌破OC_OFF/炮不可用才退出 — 防架式在 YIELD 上下抖动
  private mercifulTry: { eid: number; oc: number } | null = null; // 上次慈悲尝试(目标 eid + 当时 OC); 下回合验证有没有真放出(OC 降没降)
  private mercifulBlockEid = -1; // 慈悲拉黑目标: 上次慈悲 OC 没降=没放出(HV 拒绝处决, 如世界树 boss 免疫处决) → 本段不再对它空点慈悲, 改要害磨; 目标死/不在则解除

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
    // 血线下降去抖: 连续 STRUGGLE_STREAK 次 hp<STRUGGLE_HP 才判撑不住(放弃攒炮), 防单次瞬掉(挨发暴击又被拉回)误触发
    if (hp < C.STRUGGLE_HP * HM) this.lowHpStreak++;
    else this.lowHpStreak = 0;
    // 慈悲去重退避: 上回合决策的慈悲若没真放出(目标还活 + OC 没降, 慈悲应耗100) → 拉黑该目标慈悲、改要害磨; 目标死/不在则解除. 治"对处决免疫的怪(如世界树boss)每回合空点刷屏".
    if (this.mercifulTry) {
      const mt = this.mercifulTry;
      this.mercifulBlockEid = S.enemies.some((e) => e.eid === mt.eid && e.alive) && oc >= mt.oc ? mt.eid : -1;
      this.mercifulTry = null;
    }
    if (this.mercifulBlockEid >= 0 && !S.enemies.some((e) => e.eid === this.mercifulBlockEid && e.alive)) this.mercifulBlockEid = -1;
    const ranked = rankTargets(S.enemies, weightCfg(C));
    const pressure = assessPressure(S, C, { lowHpStreak: this.lowHpStreak });
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
    const pickMana = (): Action => (S.gems.mp ? A('item', S.gems.mp) : !b.mpot.active ? A('item', IT.mDraught) : A('item', IT.mElixir));
    const pickSpirit = (): Action => (S.gems.sp ? A('item', S.gems.sp) : A('item', IT.sDraught));

    // P0 小马图: 留人工
    if (S.riddle) {
      const r = this.riddle();
      return r ? { type: 'riddle', option: r.option, exec: () => document.querySelector<HTMLElement>(r.option)?.click() } : { type: 'skip', note: 'riddle留人工' };
    }
    // P0.5 胜利继续下一波: 清完怪后 HV 弹 #btcp("You are victorious"), 点它进下一波 → 连续刷(GF 波次推进)
    if (S.canContinue) return { type: 'continue', exec: () => Exec.continueBattle() };
    // P1 Spark 零空窗(防一击致死) ①③
    if (!b.spark.active || b.spark.turns <= 2) {
      if (mp >= sparkCost && Exec.skillReady(SK.Spark)) return A('spell', SK.Spark);
      if (b.spark.active && S.gems.mystic && !ch && C.useChanneling !== false)
        return { type: 'item', id: S.gems.mystic, note: 'Mystic:开Channeling补Spark', exec: () => Exec.item(S.gems.mystic) };
      if (!b.spark.active)
        return hp < 0.6 * HM
          ? (pickHeal() ?? { type: 'defend', exec: Exec.defend, note: 'Spark真空+急救药耗尽硬抗' })
          : { type: 'defend', exec: Exec.defend, note: 'Spark真空+缺MP硬抗' };
      return pickMana();
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
    const shadowDown = !b.shadowVeil.active || b.shadowVeil.turns <= 1;
    const ssDown = !b.spiritShield.active || b.spiritShield.turns <= 1;
    const prDown = !b.protection.active || b.protection.turns <= 1;
    const scrollCanCoverWalls = C.scrollFirst && S.scrollReady && ssDown && prDown;
    // P2.5 Channeling 主动利用: 折扣窗口补最贵(保命已在前, 不抢)
    if (ch && C.useChanneling !== false) {
      const channelFriendly: { id: number; need: boolean }[] = [
        { id: SK.Spark, need: !b.spark.active || b.spark.turns <= 2 },
        { id: SK.SpiritShield, need: !b.spiritShield.active || b.spiritShield.turns <= 1 },
        { id: SK.Protection, need: !b.protection.active || b.protection.turns <= 1 },
        { id: SK.ShadowVeil, need: C.useShadowVeil && shadowDown && !pressure.spReserveLow && (!C.shadowVeilPressureOnly || pressure.level !== 'low') },
      ];
      for (const q of channelFriendly) {
        if (q.need && Exec.skillReady(q.id)) return A('spell', q.id);
      }
      const control = selectControlDebuff(S, C, ranked, pressure);
      if (control && Exec.skillReady(control.id)) {
        if (control.target.is_red_boss) S.lockedRedId = control.target.eid;
        return { type: 'spell', id: control.id, note: `${control.note}(Channeling)`, exec: () => Exec.castHostileOn(control.id, control.target.eid) };
      }
      for (const q of CHANNEL_Q) {
        if (!q.need(b, S)) continue;
        if (!Exec.skillReady(q.id)) continue; // 耗蓝技能统一守卫: 置灰(冷却)跳过试队列下一个
        if (q.hostile) {
          const t = this.lockTarget(S);
          if (t) return this.castOnRed(q.id, t, S);
          continue;
        }
        return A('spell', q.id);
      }
    }
    // 双墙都缺且有卷轴: 卷轴不耗 MP, 先于 Mystic/MP 熔断, 一键补两墙.
    if (scrollCanCoverWalls) return A('item', IT.scrollProt);
    const mysticControl = selectControlDebuff(S, C, ranked, pressure);
    const mysticDefenseNeed =
      (!scrollCanCoverWalls && (ssDown || prDown) && mp < sparkCost) ||
      (C.useShadowVeil && shadowDown && !pressure.spReserveLow && pressure.level !== 'low' && mpFree < C.MP_LOW * MM);
    const mysticControlNeed = mysticControl && pressure.level !== 'low' && (!pressure.spReserveLow || mysticControl.key !== 'imperil');
    if (S.gems.mystic && !ch && C.useChanneling !== false && (mysticDefenseNeed || mysticControlNeed))
      return { type: 'item', id: S.gems.mystic, note: mysticDefenseNeed ? 'Mystic:开Channeling补防御' : 'Mystic:开Channeling控压', exec: () => Exec.item(S.gems.mystic) };
    // P3 MP 熔断 ④(节流: 长效药冷却中改秘药)
    if (mp < C.MP_FUSE * MM && !ch && (b.spark.turns <= 2 || b.spiritShield.turns <= 2 || b.protection.turns <= 2))
      return pickMana();
    // 单墙法术补(MP 不足: Gem 回蓝 → 秘药兜底)
    if (prDown)
      return mp >= sparkCost && Exec.skillReady(SK.Protection) ? A('spell', SK.Protection) : pickMana();
    if (ssDown)
      return mp >= sparkCost && Exec.skillReady(SK.SpiritShield) ? A('spell', SK.SpiritShield) : pickMana();
    // P5 Absorb(仅法系怪): 最近敌方对我造成魔法伤害 → 上吸收墙. useAbsorb 默认关(盾战物防为主).
    if (C.useAbsorb && S.tookMagicDmg && !b.absorb.active && Exec.skillReady(SK.Absorb)) return A('spell', SK.Absorb); // 加 skillReady(冷却检测): Absorb 放了进冷却就别反复决策(根治法吸死循环)
    // P6 Shadow Veil: 仅高压/显式开启维护, 低压不主动牺牲反击与 OC 收益.
    if (C.useShadowVeil && shadowDown && !pressure.spReserveLow && (!C.shadowVeilPressureOnly || pressure.level !== 'low') && (ch || mpFree >= C.MP_LOW * MM) && Exec.skillReady(SK.ShadowVeil))
      return { type: 'spell', id: SK.ShadowVeil, note: `压:${pressure.level} 影纱`, exec: () => Exec.skill(SK.ShadowVeil) };
    // P7 Haste(加 skillReady 守卫: MP不够/冷却时别硬决策放不出的法术→死磕安全网)
    if ((!b.haste.active || b.haste.turns <= 1) && Exec.skillReady(SK.Haste)) return A('spell', SK.Haste);
    // 重击波垫血(节流)
    if (heavy && hp < C.HP_HEAL * HM && !b.hpot.active) return A('item', IT.hDraught);
    // P8 Regen(细胞活化, 持续回血). 祝福只增伤不持续回血→祝福期仍需 Regen. 加 skillReady 守卫: MP不够别硬放(GF日志R28: 反复硬放Regen→烧光MP→Spark真空瘫痪10回合)
    if ((!b.regen.active || b.regen.turns <= 1) && Exec.skillReady(SK.Regen)) return A('spell', SK.Regen);
    // P9 回 MP(节流: manapot 在=刚喝长效药冷却中不重复喝; Gem 不受冷却)
    if (mpFree < C.MP_LOW * MM) {
      if (S.gems.mp) return A('item', S.gems.mp);
      if (!b.mpot.active) return A('item', IT.mDraught);
    }
    // P10 回 HP(节流)
    if (hp < C.HP_HEAL * HM && !b.hpot.active) return S.gems.hp ? A('item', S.gems.hp) : A('item', IT.hDraught);
    // P10.5 高压控制: Weaken → Silence → 高价值 Imperil, 用 SP 压力本身触发沉默减压.
    const control = selectControlDebuff(S, C, ranked, pressure);
    if (control && (ch || mpFree >= C.MP_LOW * MM) && Exec.skillReady(control.id)) {
      if (control.target.is_red_boss) S.lockedRedId = control.target.eid;
      return { type: 'spell', id: control.id, note: `${control.note} 压:${pressure.level}`, exec: () => Exec.castHostileOn(control.id, control.target.eid) };
    }
    // P11 回 SP 喂斗气(节流)
    const spReserveNeed = sp < C.SP_RESERVE_RATIO * SM && (b.spiritShield.active || pressure.level !== 'low');
    if ((sp < C.SP_LOW * SM || spReserveNeed || (sp < C.SP_LOW * SM && S.stanceOn)) && !b.spot.active)
      return { ...pickSpirit(), note: spReserveNeed ? 'SP:预留不足' : 'SP:低线' };
    // P11.5 小马炮 AOE(攒满即放, 必须排在架式之上): 不在 50 回合冷却(loop 按回合追踪 cannonOnCd) + OC≥200(炮耗8点斗气).
    //   弃用 opacity 判: OC<200 与冷却同为 opacity:0.5 无法区分(炮死锁根因), 改用回合冷却 + OC 数值.
    //   排在架式之上: 否则 OC 攒到 200 那刻被 P12"开架式"抢走 → 架式烧回<200 → 炮放不出+架式来回开关.
    if (C.useCannon && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES && oc >= C.CANNON_MIN_OC)
      return { type: 'cannon', exec: Exec.cannon };
    // P12 灵动架式开关(滞回) + 临门让位
    //   架式常驻为主(ehwiki:+100%物理伤害; 平砍+反击产OC > 架式烧10% → 净涨); 仅"临门一脚"让位:
    //   炮在栏+不冷却+够怪+OC接近200(≥CANNON_YIELD_OC 且 <200) → 关架式冲刺1-2回合让 OC 冲到 200 放炮.
    //   OC<CANNON_YIELD_OC 架式照常滞回常驻(不再全程压架式攒炮 — 日志实测全程架关=丢光+100%伤害).
    //   ⚠滞回防抖(GF 实测 66 次切架式 bug): 原 chargingCannon 每回合按 oc≥YIELD 重算 → 关架式后 OC 烧到<YIELD 又满足常驻开架式 → 175 上下反复横跳.
    //   改 charging 状态滞回: OC≥YIELD 进入冲刺(关架式并保持), 放炮归0 / 跌破 OC_OFF / 炮不可用 才退出, 冲刺期只切一次架式.
    const cannonCtx = C.useCannon && C.cannonYieldStance && S.cannonExists && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES;
    if (cannonCtx && oc >= C.CANNON_YIELD_OC && oc < C.CANNON_MIN_OC) this.charging = true;
    if (!cannonCtx || oc < C.OC_OFF * C.OCMAX || oc >= C.CANNON_MIN_OC) this.charging = false;
    if (this.charging) {
      if (S.stanceOn) return { type: 'stance', exec: Exec.stance }; // 冲刺期关架式(只切一次, 之后保持关攒到 200)
    } else {
      if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn && !pressure.spReserveLow) return { type: 'stance', exec: Exec.stance };
      if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: 'stance', exec: Exec.stance };
    }
    // P13 红怪减益序列(表驱动 Weaken→Imperil; 定向 commit 红怪)
    const tgt = selectRedTarget(S, ranked, 'control');
    if (tgt?.is_red_boss) {
      for (const d of DEBUFFS) {
        if (C[d.cfg] === false) continue; // 控制台开关
        if (tgt.debuff[d.key]) continue; // 已挂该减益
        if (!(ch || mpFree >= C.MP_LOW * MM)) break; // MP 不够: 整块让位给输出
        if (!Exec.skillReady(d.id)) continue; // 耗蓝技能统一守卫: 减益置灰(冷却)跳过试下一个
        return this.castOnRed(d.id, tgt, S);
      }
    }
    // P14 Heartseeker(持久战提暴; 多怪 或 有红名boss 都放 — 单 boss 血厚打最久最该提暴, HS_MIN_ENEMIES 只挡纯杂兵速清波)
    if ((!b.heartseeker.active || b.heartseeker.turns <= 1) && (S.alive >= C.HS_MIN_ENEMIES || hasRed) && (ch || mpFree >= 0.4 * MM) && Exec.skillReady(SK.Heartseeker))
      return A('spell', SK.Heartseeker);
    // P15 OC 近战技 + 跨波攒炮预算(OC 跨波保留, 是稀缺资源, 要花在刀刃上).
    //   攒炮模式 saveOcForCannon: 炮在栏不冷却 + 血线健康 + (本波怪还多≥4 OR 本波高密度) → 攒 OC 不花单体技.
    //     有红名也攒: 怪多时炮 AOE 清场+削红名最值(red boss 也吃炮伤), 总是先尝试攒炮.
    //     高密度波(monsterTotal≥CANNON_MIN_ENEMIES)即使清到剩 2-3 杂兵也攒: 杂兵平砍清, OC 留给(本/下)波开炮 AOE.
    //   放弃攒炮(血线下降 struggling / 低密度波 / 炮冷却) → 单体技减压: 慈悲处决红名, 要害秒怪降围殴, 盾击晕眩.
    const struggling = this.lowHpStreak >= C.STRUGGLE_STREAK; // 血线下降去抖: 连续 STRUGGLE_STREAK 次跌破 STRUGGLE_HP(默认 50%×2 次)才放弃攒炮
    const finalRound = !hasFutureRound(S);
    const saveOcForCannon = shouldSaveOcForCannon(S, C, pressure, struggling);
    // 红名"要害+慈悲"破例(无视攒炮): 慈悲处决须先有要害产的流血(武器无流血附魔), 故两步绑定提到攒炮 gate 之前;
    //   盾击不破例(攒炮期红名靠盾战反击概率晕, 省 25 OC). 慈悲(斩杀线<25%+流血)优先于要害(已晕→喂流血), 都锁同一红怪.
    const execRed = selectRedTarget(S, ranked, 'execute');
    if (execRed) {
      // 慈悲(斩杀线处决, 不受架式门槛限制): 加去重拉黑(放不出/处决免疫就不再空点) + 记录尝试供下回合验证 OC 降没降
      if (C.useMercifulBlow && execRed.eid !== this.mercifulBlockEid && execRed.hpPct < 25 && execRed.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
        this.mercifulTry = { eid: execRed.eid, oc };
        return { type: 'spell', id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${execRed.eid}(${execRed.hpPct}%+流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, execRed.eid) };
      }
      // 要害(喂流血): 只在红名"未流血"时喂一次 — 5道DoT够用, 反复要害(每次50OC)会把攒给慈悲(100)的OC耗光→斩杀线OC不足放不出慈悲(实测根因)
      if (C.useVitalStrike && execRed.stunned && !execRed.bleeding && oc >= 50 && Exec.skillReady(SK_SPECIAL.vitalStrike))
        return { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${execRed.eid}(未流血→喂流血·破攒炮)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, execRed.eid) };
    }
    if (!saveOcForCannon) {
      const tgtSp = selectRedTarget(S, ranked, 'execute'); // 锁定红怪(连招与处决都对它)
      // ── 红名处决连招(锁同一红怪串联, 优先于杂兵): 盾击晕 → 要害收割+5流血 → 慈悲25%处决 ──
      if (tgtSp) {
        // 慈悲(连招终点, 100 OC): 红名 25%+流血 → 处决. 同破例: 去重拉黑 + 记录尝试(防对处决免疫的怪空点)
        if (C.useMercifulBlow && tgtSp.eid !== this.mercifulBlockEid && tgtSp.hpPct < 25 && tgtSp.bleeding && oc >= 100 && Exec.skillReady(SK_SPECIAL.mercifulBlow)) {
          this.mercifulTry = { eid: tgtSp.eid, oc };
          return { type: 'spell', id: SK_SPECIAL.mercifulBlow, note: `慈悲处决红名#${tgtSp.eid}(${tgtSp.hpPct}%+流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.mercifulBlow, tgtSp.eid) };
        }
        // 要害(连招第2步, 50 OC): 红名已晕 → 收割+5道流血. 让位架式: 架式未开先攒OC开架式(+100%物理更值, 修"小局斗气全砸OC技不开架式")
        if (C.useVitalStrike && S.stanceOn && tgtSp.stunned && oc >= 50 && Exec.skillReady(SK_SPECIAL.vitalStrike))
          return { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害收割红名#${tgtSp.eid}(已晕→喂流血)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, tgtSp.eid) };
        // 盾击(连招第1步, 25 OC): 红名未晕 → 上晕眩. 让位架式: 架式未开先攒OC开架式(架式开后靠反击+主动盾击晕)
        if (C.useShieldBash && S.stanceOn && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
          return { type: 'spell', id: SK_SPECIAL.shieldBash, note: `盾击晕红名#${tgtSp.eid}(连招1步)`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, tgtSp.eid) };
      }
      // ── 杂兵减压(红名连招本回合无事 / 无红名): 红名在场或力不从心 → 要害秒已晕杂兵降围殴; 盾击晕杂兵减伤 ──
      if (C.useVitalStrike && (hasRed || struggling || finalRound || pressure.level !== 'low') && oc >= 50) {
        const stunTrash = ranked.find((e) => e.alive && e.stunned && !e.is_red_boss);
        if (stunTrash && Exec.skillReady(SK_SPECIAL.vitalStrike)) {
          const why = struggling ? '力不从心' : hasRed ? '红名在场' : finalRound ? '最终波' : '高压';
          return { type: 'spell', id: SK_SPECIAL.vitalStrike, note: `要害秒杂兵#${stunTrash.eid}(${why}减压)`, exec: () => Exec.castHostileOn(SK_SPECIAL.vitalStrike, stunTrash.eid) };
        }
      }
      if (C.useShieldBash && oc >= 25) {
        const toStun = ranked.find((e) => e.alive && !e.is_red_boss && !e.stunned);
        if (toStun && Exec.skillReady(SK_SPECIAL.shieldBash))
          return { type: 'spell', id: SK_SPECIAL.shieldBash, note: `盾击晕杂兵#${toStun.eid}`, exec: () => Exec.castHostileOn(SK_SPECIAL.shieldBash, toStun.eid) };
      }
    }
    // P16 破甲滚雪球平砍: 杂兵按 finWeight 选最优(血量+13状态+Yggdrasil); 仅剩红怪锁定持续平砍.
    //   红怪线(lockTarget/P13/P15/下方尾部锁定)全不动 —— 权重只接管杂兵选谁(守半自动红线).
    //   useTargetWeight=false → rankTargets 退回 eid 升序 = 现状, 零回归.
    const trash = ranked.filter((e) => !e.is_red_boss && e.alive);
    if (trash.length) {
      const t = trash[0];
      const why = saveOcForCannon ? '攒炮中' : C.useTargetWeight ? 'finWeight最优' : '最低eid';
      return { type: 'attack', id: t.eid, note: `平砍杂兵#${t.eid}(${why},${t.hpPct}%${t.status?.PA ? '·破甲' : ''})`, exec: () => Exec.attack(t.eid) };
    }
    if (tgt) {
      S.lockedRedId = tgt.eid;
      return { type: 'attack', id: tgt.eid, note: `平砍红名#${tgt.eid}(仅剩红怪,${tgt.hpPct}%)`, exec: () => Exec.attack(tgt.eid) };
    }
    return { type: 'defend', exec: Exec.defend };
  }

  /** 锁定红怪(记忆目标优先, 否则首个活红怪) */
  lockTarget(S: BattleState): EnemyState | null {
    return selectRedTarget(S, rankTargets(S.enemies, weightCfg(config.all())), 'damage');
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
