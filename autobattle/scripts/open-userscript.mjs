#!/usr/bin/env node
import { accessSync, constants, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const userscriptPath = path.join(root, 'dist', 'hv-autobattle.user.js');
const installPath = '/hv-autobattle.user.js';
const defaultPort = 53180;

function readOption(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

export function createOpenCommand(fileUrl, platform = process.platform, browser = 'chrome') {
  if (browser === 'default') {
    if (platform === 'win32') return { command: 'cmd', args: ['/c', 'start', '', fileUrl] };
    if (platform === 'darwin') return { command: 'open', args: [fileUrl] };
    return { command: 'xdg-open', args: [fileUrl] };
  }

  if (platform === 'win32') return { command: 'cmd', args: ['/c', 'start', '', browser, fileUrl] };
  if (platform === 'darwin') return { command: 'open', args: ['-a', browser, fileUrl] };
  return { command: browser, args: [fileUrl] };
}

function createInstallUrl(port) {
  return `http://127.0.0.1:${port}${installPath}`;
}

function openUrl(url) {
  const browser = readOption('browser', 'chrome');
  const { command, args } = createOpenCommand(url, process.platform, browser);
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

async function serveUserscript(port) {
  let closed = false;
  let forceCloseTimer;
  function closeOnce() {
    if (closed) return;
    closed = true;
    if (forceCloseTimer) clearTimeout(forceCloseTimer);
    server.close();
  }

  const server = createServer((req, res) => {
    if (!req.url || new URL(req.url, `http://127.0.0.1:${port}`).pathname !== installPath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/javascript; charset=utf-8',
    });
    res.end(readFileSync(userscriptPath));

    setTimeout(closeOnce, 1500);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  forceCloseTimer = setTimeout(closeOnce, 120_000);
  return server;
}

async function main() {
  accessSync(userscriptPath, constants.R_OK);

  const port = Number(readOption('port', String(defaultPort)));
  const installUrl = createInstallUrl(port);
  if (hasFlag('print')) {
    console.log(installUrl);
    return;
  }

  const server = await serveUserscript(port);
  if (hasFlag('no-open')) {
    console.log(`Serving Tampermonkey install URL: ${installUrl}`);
  } else {
    openUrl(installUrl);
    console.log(`Opened Tampermonkey install URL: ${installUrl}`);
  }
  console.log('Serving userscript once; press Ctrl+C if the browser does not request it.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
