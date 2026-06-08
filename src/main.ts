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

// --- User config store using local JSON file ---
const configFilePath = path.join(app.getPath('userData'), 'config.json');

function loadConfig(): Record<string, unknown> {
  try {
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf-8');
      return JSON.parse(data) as Record<string, unknown>;
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

function saveConfig(config: Record<string, unknown>): void {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // ignore write errors
  }
}

// --- AI Chat model definitions ---
interface ModelInfo {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  requiresUrl: boolean;
}

function getModelList(): ModelInfo[] {
  return [
    {
      id: 'gpt-4o',
      name: 'ChatGPT (OpenAI)',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      requiresUrl: false,
    },
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude (Anthropic)',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-sonnet-20241022',
      requiresUrl: false,
    },
    {
      id: 'gemini-2-flash',
      name: 'Gemini (Google)',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash',
      requiresUrl: false,
    },
    {
      id: 'glm-4-flash',
      name: 'GLM (智谱AI)',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4-flash',
      requiresUrl: false,
    },
    {
      id: 'kimi-plus',
      name: 'Kimi (Moonshot)',
      baseUrl: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k',
      requiresUrl: false,
    },
    {
      id: 'deepseek-chat',
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      requiresUrl: false,
    },
    {
      id: 'qwen-plus',
      name: '通义千问 (阿里云)',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
      requiresUrl: false,
    },
    {
      id: 'custom',
      name: '自定义 (OpenAI 兼容接口)',
      baseUrl: '',
      model: '',
      requiresUrl: true,
    },
  ];
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
  // Window controls
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

  // AI Chat: user config store
  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    const config = loadConfig();
    config[key] = value;
    saveConfig(config);
    return true;
  });

  ipcMain.handle('store:get', (_event, key: string) => {
    const config = loadConfig();
    return config[key] ?? null;
  });

  // AI Chat: get supported model list
  ipcMain.handle('get-models', () => {
    return getModelList();
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
