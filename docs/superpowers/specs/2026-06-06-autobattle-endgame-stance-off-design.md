# 单红收尾关架式攒 OC 设计

- 日期: 2026-06-06
- 状态: 设计待审
- 分支: feat/auto
- 范围: `autobattle/src/battle/strategy.ts`、`autobattle/src/battle/brain.ts`、`autobattle/src/core/config.ts`

## 背景与问题

实战日志显示:战斗收尾只剩 1 个红名 boss 时,bot 把它从 100% 一路平砍磨到 0,常耗 30–40 回合,**慈悲处决(Merciful Blow)54 波 0 次触发**。根因:架式常开每回合烧 ~25 OC,单红 boss 平砍+反击产的 OC 刚好被烧掉,OC 卡在 40–138,凑不齐「盾击(25)→要害(50)→慈悲(100)」处决链。

设想:**单红收尾时关架式**,OC 不被烧、靠平砍/反击攒起来,把处决链跑起来(尤其慈悲秒掉最后 <25%)。

## 两个必须同时处理的陷阱(单独关架式会更糟)

1. **连招盾击/要害绑定 `S.stanceOn`**(`brain.ts:286` 要害、`brain.ts:289` 盾击):单纯关架式 → 这两步放不出 → 红名不晕→不流血→慈悲也放不出 → 退化成纯平砍(还丢了 +100% 物理),更慢。**必须解除单红收尾下的 `stanceOn` 绑定**。
2. **大波单红仍在攒炮**:`shouldSaveOcForCannon`(`strategy.ts`)在 `monsterTotal≥6 && 有下一波` 时返回 true,连招块(`if(!saveOcForCannon)`)整个被跳过。而单红 `alive=1<6` 炮根本放不出。**必须在单红收尾强制不攒炮**,否则连招/关架式都白搭。

## 目标

单红收尾(只剩 1 红名)时:关架式攒 OC + 让处决链在关架式下跑起来,争取用慈悲加速结束。做成灰度开关,实战对比验证。

## 非目标(YAGNI)

- 不改非单红收尾(≥2 活怪 / 无红名 / 开关关)的任何行为。
- 不改慈悲斩杀阈值(仍 `<25%`;若实测关架式更慢,再单独议放宽慈悲)。
- 不动杂兵盾击的 `ocFloorOk`、不动红名减益/Heartseeker。

## 触发判定

`strategy.ts` 新增(`Config`/`BattleState`/`EnemyState` 均已 import,零新增 import):

```ts
/** 单红收尾(灰度): 活怪只剩 1 个且是红名 → 关架式攒 OC、处决链解除架式门槛. */
export function endgameSoloRed(S: BattleState, C: Config): boolean {
  if (!C.useEndgameStanceOff) return false;
  const live = S.enemies.filter((e) => e.alive);
  return live.length === 1 && live[0].is_red_boss;
}
```

## 设计:三处配合改动(缺一链就断)

`brain.ts` 在 P12 架式开关(约 232 行)**之前**算一次,供三处引用:
```ts
const soloRed = endgameSoloRed(S, C);
```

### 改动 A:单红收尾强制不攒炮(`brain.ts:262`)
```ts
// 改前
const saveOcForCannon = shouldSaveOcForCannon(S, C, pressure, struggling);
// 改后
const saveOcForCannon = !soloRed && shouldSaveOcForCannon(S, C, pressure, struggling);
```
→ 单红收尾 `saveOcForCannon=false`,连招块执行(P16 平砍 note 的「攒炮中」也自然不再出现)。

### 改动 B:单红收尾关架式 + 不自动开(`brain.ts:232-240`)
把现有 P12 滞回逻辑整块包进 `else`,前面加 `soloRed` 分支:
```ts
if (soloRed) {
  if (S.stanceOn) return { type: 'stance', exec: Exec.stance }; // 关架式攒OC; 不自动开(落到 P13+)
} else {
  const cannonCtx = C.useCannon && C.cannonYieldStance && S.cannonExists && !S.cannonOnCd && S.alive >= C.CANNON_MIN_ENEMIES;
  if (cannonCtx && oc >= C.CANNON_YIELD_OC && oc < C.CANNON_MIN_OC) this.charging = true;
  if (!cannonCtx || oc < C.OC_OFF * C.OCMAX || oc >= C.CANNON_MIN_OC) this.charging = false;
  if (this.charging) {
    if (S.stanceOn) return { type: 'stance', exec: Exec.stance };
  } else {
    if (oc >= C.OC_ON * C.OCMAX && !S.stanceOn && !pressure.spReserveLow) return { type: 'stance', exec: Exec.stance };
    if (oc < C.OC_OFF * C.OCMAX && S.stanceOn) return { type: 'stance', exec: Exec.stance };
  }
}
```

### 改动 C:连招盾击/要害解除 `stanceOn` 绑定(`brain.ts:286`、`brain.ts:289`)
```ts
// 要害(286): S.stanceOn → (S.stanceOn || soloRed)
if (C.useVitalStrike && (S.stanceOn || soloRed) && tgtSp.stunned && !tgtSp.bleeding && oc >= 50 && (!C.useDelayedBleed || this.bleedTimer.shouldFeed(tgtSp, bleedCfg(C))) && Exec.skillReady(SK_SPECIAL.vitalStrike))
// 盾击(289): S.stanceOn → (S.stanceOn || soloRed)
if (C.useShieldBash && (S.stanceOn || soloRed) && !tgtSp.stunned && oc >= 25 && Exec.skillReady(SK_SPECIAL.shieldBash))
```

### 合起来的行为
单红收尾 → 关架式(B)→ 不攒炮(A,连招块执行)→ 关架式下平砍攒 OC → `OC≥25` 盾击晕(C)→ `≥50` 要害流血(C)→ `<25%+≥100` 慈悲处决。

## 改动 3:`config.ts` 新增灰度开关
`useShieldBashOcFloor` 附近新增(默认开,可一键回退):
```ts
useEndgameStanceOff: true, // 单红收尾(只剩1红名)关架式攒OC, 让盾击→要害→慈悲处决链在关架式下跑起来(解除连招stanceOn门槛+强制不攒炮); false 退回旧"架式常开磨"(灰度回退)
```
全新布尔键,spread 自动取默认,无需 bump `CONFIG_VERSION`。

## 权衡(已与用户确认,灰度实测)

关架式丢 +100% 物理,粗算单红总耗时**可能不降反升**(慈悲只秒 <25%,补不回平砍减半的损失)。但纸上账可能漏算反击产 OC、要害流血 DoT、盾击晕降红名输出等。故做成 `useEndgameStanceOff` 灰度开关,**实战开/关对比数据说话**,不好就关。

## 回归风险

| 风险 | 缓解 |
| --- | --- |
| 影响非单红场景 | `soloRed` 在 `live.length!==1` 或非红名或开关关时为 false,A/B/C 三处全短路,维持现状 |
| 关架式与 charging 攒炮态冲突 | `soloRed` 分支在 charging 逻辑之上;单红 `alive<6` 本就 `cannonCtx=false`、不会进 charging,无交叉 |
| 关架式后 OC<55 原会触发关架式那条失效 | `soloRed` 分支已先 return(关架式),原 else 不执行;语义一致(都是关) |
| 慈悲仍需流血,要害需先晕 | 链顺序 盾击→要害→慈悲 已由连招块顺序保证;关架式下三步都可放(改 C) |

## 测试要点

`drive-brain.mts` 加单红收尾对比场景(`enemy` 带 `debuff:{weaken,imperil}` 跳过 P13 减益,聚焦观察架式/连招):
1. 单红 + `stanceOn=true` + 开关 on → 决策为**切架式**(关架式,验证 B);
2. 单红 + `stanceOn=false` + `OC=50` + 开关 on → **盾击晕红名(连招1步)**(关架式下放盾击,验证 C+A);
3. 单红 + `stanceOn=false` + `OC=50` + 开关 off → **平砍红名**(现状回归对比)。

`endgameSoloRed` 逻辑简单(开关 + 单红判定),由上述集成场景覆盖,不单建断言脚本。

## 待实现清单

1. `config.ts` 新增 `useEndgameStanceOff: true`
2. `strategy.ts` 新增 `endgameSoloRed`
3. `brain.ts` import + 算 `soloRed` + 改动 A/B/C
4. `drive-brain.mts` 加 3 个单红收尾对比场景
5. typecheck + drive-brain 跑通 + diagnostics
