const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const VITE_URL = 'http://localhost:5173';
const DIST_MAIN = path.join(__dirname, '..', 'dist', 'main.js');

function waitForVite() {
  return new Promise((resolve) => {
    const check = () => {
      http.get(VITE_URL, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(check, 500);
        }
      }).on('error', () => {
        setTimeout(check, 500);
      });
    };
    check();
  });
}

function waitForMainJs() {
  return new Promise((resolve) => {
    const check = () => {
      if (fs.existsSync(DIST_MAIN)) {
        resolve();
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

async function main() {
  console.log('[wait-and-launch] Waiting for Vite dev server...');
  await waitForVite();
  console.log('[wait-and-launch] Vite is ready!');

  console.log('[wait-and-launch] Waiting for TypeScript compilation...');
  await waitForMainJs();
  console.log('[wait-and-launch] dist/main.js found!');

  // Small delay to ensure tsc finishes writing
  await new Promise(r => setTimeout(r, 1000));

  console.log('[wait-and-launch] Launching Electron...');
  const electron = require('electron');
  const electronPath = typeof electron === 'string' ? electron : electron.toString();

  const child = spawn(electronPath, [DIST_MAIN], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: VITE_URL
    }
  });

  child.on('close', (code) => {
    process.exit(code);
  });
}

main();
