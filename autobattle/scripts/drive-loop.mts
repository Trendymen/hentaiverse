// Loop-level regression checks that do not need a browser.
// Run: cd autobattle && npx tsx scripts/drive-loop.mts
import assert from 'node:assert/strict';
import { nextCannonCooldown } from '../src/loop';

assert.equal(
  nextCannonCooldown('cannon', false, 0, 50),
  0,
  'failed cannon execution must not start the 50-turn cooldown',
);

assert.equal(
  nextCannonCooldown('cannon', true, 0, 50),
  50,
  'successful cannon execution starts the configured cooldown',
);

assert.equal(
  nextCannonCooldown('attack', true, 7, 50),
  7,
  'non-cannon actions do not change cannon cooldown',
);

console.log('drive-loop ok');
