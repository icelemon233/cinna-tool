import { BrowserWindow } from 'electron';
import path from 'path';
import { getAppIconPath } from '../utils/assets';
import { loadWindowState, saveWindowState } from '../utils/jsonStore';

export function createMainWindow(isQuitting: () => boolean): BrowserWindow {
  const savedState = loadWindowState();
  const shouldStartInBackground =
    process.env.VITE_DEV_SERVER_URL && process.env.CINNATOOL_DEV_BACKGROUND_START === '1';
  const chromeOptions =
    process.platform === 'darwin'
      ? {
          titleBarStyle: 'hidden' as const,
          trafficLightPosition: { x: 18, y: 18 },
        }
      : {
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: true,
        };

  const win = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 400,
    minHeight: 300,
    show: false,
    title: 'CinnaTool',
    icon: getAppIconPath(),
    ...chromeOptions,
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });

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

  if (process.platform === 'darwin') {
    win.on('close', (event) => {
      if (!isQuitting()) {
        event.preventDefault();
        win.hide();
      }
    });
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (!shouldStartInBackground) {
      win.webContents.openDevTools();
    }
  } else {
    win.loadFile(path.join(__dirname, '../../../dist-renderer/index.html'));
  }

  win.once('ready-to-show', () => {
    if (shouldStartInBackground) {
      win.showInactive();
      return;
    }

    win.show();
  });

  return win;
}
