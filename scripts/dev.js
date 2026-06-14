const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');

const root = path.resolve(__dirname, '..');
const VITE_PORT = 5173;
const VITE_URL = `http://localhost:${VITE_PORT}`;
const DIST_DIR = path.join(root, 'dist');
const DIST_MAIN = path.join(DIST_DIR, 'main.js');
const WATCHED_ELECTRON_ENTRY_FILES = new Set(['main.js', 'preload.js', 'tray.js']);

let electron = null;
let vite = null;
let tsc = null;
let restartingElectron = false;
let restartTimer = null;
let electronWatchers = [];
let electronLaunchCount = 0;

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

function isHttpEndpointActive(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    request.on('error', () => resolve(false));
    request.setTimeout(500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function canListenOn(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error) => {
      resolve(error.code !== 'EADDRINUSE');
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

// 3. Wait for Vite + tsc, then launch Electron
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

async function waitForElectronOutput() {
  console.log('[dev] Waiting for Vite...');
  await waitForVite();
  console.log('[dev] Vite ready!');

  console.log('[dev] Waiting for tsc...');
  await waitForMainJs();
  // Give tsc a moment to finish writing all files
  await new Promise(r => setTimeout(r, 1500));
  console.log('[dev] tsc ready!');
}

function launchElectron() {
  console.log('[dev] Launching Electron...');
  const electronPath = require('electron');
  const shouldStartInBackground = electronLaunchCount > 0;
  electronLaunchCount += 1;

  electron = spawn(electronPath.toString(), [DIST_MAIN], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: VITE_URL,
      CINNATOOL_DEV_BACKGROUND_START: shouldStartInBackground ? '1' : '0'
    }
  });

  electron.on('close', (code) => {
    electron = null;
    if (restartingElectron) {
      restartingElectron = false;
      launchElectron();
      return;
    }
    cleanup();
    process.exit(code || 0);
  });
}

function scheduleElectronRestart(reason) {
  if (!electron) return;
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (!electron) return;
    console.log(`[dev] ${reason}; restarting Electron...`);
    restartingElectron = true;
    electron.kill();
  }, 350);
}

function shouldRestartForElectronOutput(filePath) {
  const relativePath = path.relative(DIST_DIR, filePath).split(path.sep).join('/');
  if (!relativePath || relativePath.startsWith('..')) return false;
  if (WATCHED_ELECTRON_ENTRY_FILES.has(relativePath)) return true;
  if (!relativePath.endsWith('.js')) return false;
  return relativePath.startsWith('main-process/') || relativePath.startsWith('preload/');
}

function watchElectronDir(dirPath, watchedDirs) {
  if (watchedDirs.has(dirPath)) return;
  watchedDirs.add(dirPath);

  const watcher = fs.watch(dirPath, (_eventType, filename) => {
    if (!filename) return;

    const filePath = path.join(dirPath, filename.toString());
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      watchElectronDir(filePath, watchedDirs);
      return;
    }

    if (shouldRestartForElectronOutput(filePath)) {
      scheduleElectronRestart(`${path.relative(DIST_DIR, filePath)} changed`);
    }
  });
  electronWatchers.push(watcher);
}

function watchElectronOutput() {
  const watchedDirs = new Set();

  function walk(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    watchElectronDir(dirPath, watchedDirs);

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dirPath, entry.name));
      }
    }
  }

  walk(DIST_DIR);
}

function cleanup() {
  clearTimeout(restartTimer);
  electronWatchers.forEach((watcher) => watcher.close());
  electronWatchers = [];
  electron?.kill();
  vite?.kill();
  tsc?.kill();
}

// Handle cleanup
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

async function start() {
  const existingDevServer = await isHttpEndpointActive(VITE_URL);
  const [ipv4Available, ipv6Available] = await Promise.all([
    canListenOn(VITE_PORT, '127.0.0.1'),
    canListenOn(VITE_PORT, '::1'),
  ]);

  if (existingDevServer || !ipv4Available || !ipv6Available) {
    console.error(`[dev] Port ${VITE_PORT} is already in use. Stop the existing dev server, then run pnpm run dev again.`);
    process.exit(1);
  }

  // 1. Start Vite dev server on the exact port Electron will load.
  vite = run(
    'node',
    ['node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', String(VITE_PORT), '--strictPort'],
    'vite'
  );

  // 2. Start tsc watch for Electron main/preload files.
  tsc = run('node', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.electron.json', '--watch'], 'tsc');

  await waitForElectronOutput();
  launchElectron();
  watchElectronOutput();
}

start();
