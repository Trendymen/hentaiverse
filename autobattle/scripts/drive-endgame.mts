// 断言 endgameRedHold: 残局红名 OC 省留地板.
// 跑: cd autobattle && npx --yes tsx scripts/drive-endgame.mts
import assert from 'node:assert/strict';
import { endgameRedHold } from '../src/battle/strategy';
import { DEFAULT_CONFIG } from '../src/core/config';
import type { BattleState, EnemyState } from '../src/types';

const C = { ...DEFAULT_CONFIG };
const e = (o: Partial<EnemyState>): EnemyState => ({ alive: true, is_red_boss: true, hpPct: 100, ...o } as EnemyState);
const St = (enemies: EnemyState[]) => ({ enemies } as unknown as BattleState);

let pass = 0;
const check = (name: string, actual: boolean, expected: boolean) => {
  assert.equal(actual, expected, `${name}: 期望 ${expected} 实得 ${actual}`);
  console.log('  ✓', name);
  pass++;
};

const endgame = [e({ hpPct: 40 }), e({ hpPct: 80 })]; // 残局: 2红名, 其一<50%

// 1. 残局+血稳+盾击oc190 → true(190-25=165<175 暂缓)
check('残局·血稳·盾击oc190→暂缓', endgameRedHold(St(endgame), C, 190, 25, false), true);
// 2. 残局+血稳+盾击oc200 → false(200-25=175≥175 放行消化溢出)
check('残局·血稳·盾击oc200→放行', endgameRedHold(St(endgame), C, 200, 25, false), false);
// 3. 残局+血稳+要害oc200 → true(200-50=150<175)
check('残局·血稳·要害oc200→暂缓', endgameRedHold(St(endgame), C, 200, 50, false), true);
// 4. 残局+血稳+慈悲oc250 → true(250-100=150<175 慈悲恒暂缓)
check('残局·血稳·慈悲oc250→暂缓', endgameRedHold(St(endgame), C, 250, 100, false), true);
// 5. 残局+struggling+慈悲oc120 → false(血连降正常斩杀)
check('残局·struggling·慈悲→放行', endgameRedHold(St(endgame), C, 120, 100, true), false);
// 6. 非残局(有杂兵)+血稳 → false
check('有杂兵·非残局→放行', endgameRedHold(St([e({ hpPct: 40 }), e({ is_red_boss: false, hpPct: 40 })]), C, 120, 100, false), false);
// 7. 红名都≥50%+血稳 → false(还没收尾)
check('红名都≥50%→放行', endgameRedHold(St([e({ hpPct: 80 }), e({ hpPct: 60 })]), C, 120, 100, false), false);
// 8. 红名数>2(3红名)+血稳 → false
check('红名>2→放行', endgameRedHold(St([e({ hpPct: 40 }), e({ hpPct: 80 }), e({ hpPct: 90 })]), C, 120, 100, false), false);
// 9. 开关关+残局+血稳 → false
const Coff = { ...DEFAULT_CONFIG, useEndgameRedOcSave: false };
check('开关关→放行', endgameRedHold(St(endgame), Coff, 120, 100, false), false);

console.log(`\n✅ endgameRedHold 全部 ${pass} 用例通过`);
