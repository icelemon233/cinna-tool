const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

function run(cmd, args, label) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${label}] ${d}`));
  child.on('error', (e) => console.error(`[${label}] error:`, e.message));
  return child;
}

// 1. Start Vite dev server
const vite = run('node', ['node_modules/vite/bin/vite.js'], 'vite');

// 2. Start tsc watch
const tsc = run('node', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.electron.json', '--watch'], 'tsc');

// 3. Wait for Vite + tsc, then launch Electron
const http = require('http');
const fs = require('fs');

const VITE_URL = 'http://localhost:5173';
const DIST_MAIN = path.join(root, 'dist', 'main.js');

function waitForVite() {
  return new Promise((resolve) => {
    const check = () => {
      http.get(VITE_URL, (res) => {
        if (res.statusCode === 200) resolve();
        else setTimeout(check, 500);
      }).on('error', () => setTimeout(check, 500));
    };
    check();
  });
}

function waitForMainJs() {
  return new Promise((resolve) => {
    const check = () => {
      if (fs.existsSync(DIST_MAIN)) resolve();
      else setTimeout(check, 500);
    };
    check();
  });
}

async function launchElectron() {
  console.log('[dev] Waiting for Vite...');
  await waitForVite();
  console.log('[dev] Vite ready!');

  console.log('[dev] Waiting for tsc...');
  await waitForMainJs();
  // Give tsc a moment to finish writing all files
  await new Promise(r => setTimeout(r, 1500));
  console.log('[dev] tsc ready!');

  console.log('[dev] Launching Electron...');
  const electronPath = require('electron');
  const electron = spawn(electronPath.toString(), [DIST_MAIN], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: VITE_URL }
  });

  electron.on('close', (code) => {
    vite.kill();
    tsc.kill();
    process.exit(code || 0);
  });
}

// Handle cleanup
process.on('SIGINT', () => {
  vite.kill();
  tsc.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  vite.kill();
  tsc.kill();
  process.exit(0);
});

launchElectron();
