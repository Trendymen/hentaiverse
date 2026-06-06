// 断言 endgameRedHold: 残局红名 OC 省留地板(本轮>6怪 + 只剩1红名 + 血稳).
// 跑: cd autobattle && npx --yes tsx scripts/drive-endgame.mts
import assert from 'node:assert/strict';
import { endgameRedHold } from '../src/battle/strategy';
import { DEFAULT_CONFIG } from '../src/core/config';
import type { BattleState, EnemyState } from '../src/types';

const C = { ...DEFAULT_CONFIG };
const e = (o: Partial<EnemyState>): EnemyState => ({ alive: true, is_red_boss: true, hpPct: 100, ...o } as EnemyState);
const St = (enemies: EnemyState[], monsterTotal = 10) => ({ enemies, monsterTotal } as unknown as BattleState);

let pass = 0;
const check = (name: string, actual: boolean, expected: boolean) => {
  assert.equal(actual, expected, `${name}: 期望 ${expected} 实得 ${actual}`);
  console.log('  ✓', name);
  pass++;
};

const solo = [e({ hpPct: 40 })]; // 触发: 大波(monsterTotal 默认10) + 只剩1红名

// 1. 大波+只剩1红名+血稳+盾击oc190 → true(190-25=165<175 暂缓)
check('大波·1红名·血稳·盾击oc190→暂缓', endgameRedHold(St(solo), C, 190, 25, false), true);
// 2. 大波+只剩1红名+血稳+盾击oc200 → false(200-25=175≥175 放行消化溢出)
check('大波·1红名·血稳·盾击oc200→放行', endgameRedHold(St(solo), C, 200, 25, false), false);
// 3. 大波+只剩1红名+血稳+要害oc200 → true(200-50=150<175)
check('大波·1红名·血稳·要害oc200→暂缓', endgameRedHold(St(solo), C, 200, 50, false), true);
// 4. 大波+只剩1红名+血稳+慈悲oc250 → true(250-100=150<175 慈悲恒暂缓)
check('大波·1红名·血稳·慈悲oc250→暂缓', endgameRedHold(St(solo), C, 250, 100, false), true);
// 5. 大波+只剩1红名+struggling → false(血连降正常斩杀)
check('大波·1红名·struggling→放行', endgameRedHold(St(solo), C, 120, 100, true), false);
// 6. 小波(monsterTotal=6, 非>6)+只剩1红名+血稳 → false(本轮怪总数≤6)
check('小波mt6·1红名→放行', endgameRedHold(St(solo, 6), C, 120, 100, false), false);
// 7. 大波+剩2红名+血稳 → false(非"只剩1红名")
check('大波·2红名→放行', endgameRedHold(St([e({ hpPct: 40 }), e({ hpPct: 80 })]), C, 120, 100, false), false);
// 8. 大波+只剩1只但是杂兵(非red)+血稳 → false
check('大波·1杂兵→放行', endgameRedHold(St([e({ is_red_boss: false, hpPct: 40 })]), C, 120, 100, false), false);
// 9. 大波+只剩1红名(血量不论, 80%)+血稳+盾击oc190 → true(新条件不看血量阈值)
check('大波·1红名80%→暂缓(不看血量)', endgameRedHold(St([e({ hpPct: 80 })]), C, 190, 25, false), true);
// 10. 开关关+大波+只剩1红名 → false
const Coff = { ...DEFAULT_CONFIG, useEndgameRedOcSave: false };
check('开关关→放行', endgameRedHold(St(solo), Coff, 190, 25, false), false);

console.log(`\n✅ endgameRedHold 全部 ${pass} 用例通过`);
