import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('install:tm builds and then opens the Tampermonkey install URL', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['open:tm'], 'node scripts/open-userscript.mjs');
  assert.equal(pkg.scripts['open:tm:print'], 'node scripts/open-userscript.mjs --print');
  assert.equal(pkg.scripts['install:tm'], 'npm run build && npm run open:tm');
});

test('open-userscript --print emits the dist userscript file URL', () => {
  const output = execFileSync(process.execPath, ['scripts/open-userscript.mjs', '--print'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();

  assert.match(output, /^file:\/\//);
  assert.ok(output.endsWith('/dist/hv-autobattle.user.js'), output);
});
