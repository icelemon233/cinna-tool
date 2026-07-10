import { BrowserWindow } from 'electron';
import path from 'path';
import { getAppIconPath } from '../utils/assets';

let translationWindow: BrowserWindow | null = null;

function loadTranslationWindow(window: BrowserWindow): void {
  if (process.env.VITE_DEV_SERVER_URL) {
    const url = new URL(process.env.VITE_DEV_SERVER_URL);
    url.searchParams.set('window', 'translation-quick');
    void window.loadURL(url.toString());
    return;
  }

  void window.loadFile(path.join(__dirname, '../../../dist-renderer/index.html'), {
    query: { window: 'translation-quick' },
  });
}

export function openTranslationQuickWindow(): BrowserWindow {
  if (translationWindow && !translationWindow.isDestroyed()) {
    if (translationWindow.isMinimized()) translationWindow.restore();
    translationWindow.show();
    translationWindow.focus();
    translationWindow.moveTop();
    return translationWindow;
  }

  translationWindow = new BrowserWindow({
    width: 680,
    height: 620,
    minWidth: 520,
    minHeight: 480,
    show: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    title: 'CinnaTool AI Translation',
    icon: getAppIconPath(),
    backgroundColor: '#fbfbfa',
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  translationWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  translationWindow.on('closed', () => {
    translationWindow = null;
  });
  translationWindow.once('ready-to-show', () => {
    translationWindow?.show();
    translationWindow?.focus();
  });

  loadTranslationWindow(translationWindow);
  return translationWindow;
}
