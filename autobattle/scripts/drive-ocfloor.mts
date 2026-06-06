// 断言 ocFloorOk: 无压力时盾击晕杂兵的 OC 预留地板.
// 跑: cd autobattle && npx --yes tsx scripts/drive-ocfloor.mts
import assert from 'node:assert/strict';
import { ocFloorOk, type Pressure } from '../src/battle/strategy';
import { DEFAULT_CONFIG } from '../src/core/config';
import type { BattleState } from '../src/types';

const C = { ...DEFAULT_CONFIG };
const COST = 25;
// ocFloorOk 只读 pressure.level; hasRed 仅为形状合法填 false(不强行把 medium 等同 hasRed, 避免误导)
const P = (level: 'low' | 'medium' | 'high'): Pressure => ({ level, spReserveLow: false, spCritical: false, hasRed: false });
const S = (cannonExists: boolean, cannonOnCd: boolean) => ({ cannonExists, cannonOnCd } as unknown as BattleState);

let pass = 0;
const check = (name: string, actual: boolean, expected: boolean) => {
  assert.equal(actual, expected, `${name}: 期望 ${expected} 实得 ${actual}`);
  console.log('  ✓', name);
  pass++;
};

// 1. 无压力 + 炮不可用 + oc=140 → false (140-25=115 < 开架式线125)
check('无压力·炮不可用·oc140→抑制', ocFloorOk(S(false, false), C, P('low'), 140, COST), false);
// 2. 无压力 + 炮不可用 + oc=150 → true  (150-25=125 ≥ 125)
check('无压力·炮不可用·oc150→放行', ocFloorOk(S(false, false), C, P('low'), 150, COST), true);
// 3. 无压力 + 炮可用 + oc=190 → false (190-25=165 < 炮线175)
check('无压力·炮可用·oc190→抑制', ocFloorOk(S(true, false), C, P('low'), 190, COST), false);
// 4. 无压力 + 炮可用 + oc=200 → true  (200-25=175 ≥ 175)
check('无压力·炮可用·oc200→放行', ocFloorOk(S(true, false), C, P('low'), 200, COST), true);
// 5. 有压力(medium) + oc=30 → true (level≠low, 维持现状)
check('有压力·oc30→维持现状', ocFloorOk(S(true, false), C, P('medium'), 30, COST), true);
// 6. 开关关 + 无压力 + oc=30 → true (旧行为)
const Coff = { ...DEFAULT_CONFIG, useShieldBashOcFloor: false };
check('开关关·无压力·oc30→旧行为', ocFloorOk(S(false, false), Coff, P('low'), 30, COST), true);
// 7. 无压力 + 炮存在但CD中 → cannonReady=false, 地板降回开架式线125 → 140-25=115<125 → false
check('无压力·炮CD中·oc140→抑制(地板降回125)', ocFloorOk(S(true, true), C, P('low'), 140, COST), false);

console.log(`\n✅ ocFloorOk 全部 ${pass} 用例通过`);
