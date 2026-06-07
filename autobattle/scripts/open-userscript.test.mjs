import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
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

test('open-userscript --print emits a localhost userscript install URL', () => {
  const output = execFileSync(process.execPath, ['scripts/open-userscript.mjs', '--print'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();

  assert.match(output, /^http:\/\/127\.0\.0\.1:\d+\/hv-autobattle\.user\.js$/);
  assert.doesNotMatch(output, /^file:\/\//);
});

test('open-userscript serves the dist userscript over localhost', async () => {
  const port = '53181';
  const child = spawn(process.execPath, ['scripts/open-userscript.mjs', '--no-open', `--port=${port}`], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  const installUrl = `http://127.0.0.1:${port}/hv-autobattle.user.js`;
  await waitFor(() => stdout.includes(installUrl), () => stderr);

  const response = await fetch(installUrl);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^text\/javascript/);
  assert.equal(response.headers.get('content-disposition'), null);
  assert.match(body, /==UserScript==/);

  await waitForExit(child, () => stderr);
});

async function waitFor(predicate, readError) {
  const deadline = Date.now() + 5_000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(readError() || 'Timed out');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function waitForExit(child, readError) {
  const exitCode = await new Promise((resolve) => {
    child.once('exit', resolve);
    setTimeout(() => {
      child.kill();
      resolve(null);
    }, 5_000);
  });
  assert.equal(exitCode, 0, readError());
}
