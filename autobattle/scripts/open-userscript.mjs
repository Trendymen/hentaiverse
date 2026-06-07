#!/usr/bin/env node
import { accessSync, constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const userscriptPath = path.join(root, 'dist', 'hv-autobattle.user.js');

function readOption(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
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

function openUrl(fileUrl) {
  const browser = readOption('browser', 'chrome');
  const { command, args } = createOpenCommand(fileUrl, process.platform, browser);
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

function main() {
  accessSync(userscriptPath, constants.R_OK);

  const fileUrl = pathToFileURL(userscriptPath).href;
  if (process.argv.includes('--print')) {
    console.log(fileUrl);
    return;
  }

  openUrl(fileUrl);
  console.log(`Opened Tampermonkey install URL: ${fileUrl}`);
}

main();
