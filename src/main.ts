import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { createTray } from './tray';

// --- Window state persistence using local JSON file ---
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState(): WindowState {
  try {
    if (fs.existsSync(stateFilePath)) {
      const data = fs.readFileSync(stateFilePath, 'utf-8');
      return JSON.parse(data) as WindowState;
    }
  } catch {
    // ignore parse errors
  }
  return { width: 800, height: 600 };
}

function saveWindowState(state: WindowState): void {
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(state), 'utf-8');
  } catch {
    // ignore write errors
  }
}

// --- App-level quit flag for macOS hide-on-close ---
let isQuitting = false;

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const savedState = loadWindowState();

  const win = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 400,
    minHeight: 300,
    title: 'CinnaTool',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Save window position and size on close/resize
  const persistBounds = () => {
    if (win.isDestroyed()) return;
    const bounds = win.getBounds();
    saveWindowState({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });
  };

  win.on('resize', persistBounds);
  win.on('move', persistBounds);

  // macOS: hide window instead of quitting when close button is clicked
  if (process.platform === 'darwin') {
    win.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        win.hide();
      }
    });
  }

  // Load content
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open DevTools in development mode
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }

  return win;
}

// Register IPC handlers for window operations
function registerIpcHandlers() {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  mainWindow = createWindow();
  createTray(mainWindow);

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    } else {
      mainWindow = createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export { isQuitting };
