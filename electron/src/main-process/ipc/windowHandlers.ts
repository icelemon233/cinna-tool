import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import type { IpcContext } from '../types';
import { revealMainWindow } from '../windows/mainWindow';
import { openTranslationQuickWindow } from '../windows/translationWindow';

export function registerWindowHandlers({
  getMainWindow,
  isMainWindowLocked,
  setMainWindowLocked,
}: IpcContext): void {
  let clipboardWindow: BrowserWindow | null = null;
  let restoringFromClipboardWindow = false;

  const loadClipboardWindow = (window: BrowserWindow) => {
    if (process.env.VITE_DEV_SERVER_URL) {
      const url = new URL(process.env.VITE_DEV_SERVER_URL);
      url.searchParams.set('window', 'clipboard-floating');
      window.loadURL(url.toString());
      return;
    }

    window.loadFile(path.join(__dirname, '../../../dist-renderer/index.html'), {
      query: { window: 'clipboard-floating' },
    });
  };

  const showMainClipboardPage = () => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    setMainWindowLocked(false);
    mainWindow.setSkipTaskbar(false);
    revealMainWindow(mainWindow);
    mainWindow.webContents.send('clipboard:show-main');
  };

  const showMainAiSettings = () => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    setMainWindowLocked(false);
    mainWindow.setSkipTaskbar(false);
    revealMainWindow(mainWindow);
    mainWindow.webContents.send('settings:open-ai');
  };

  const createClipboardWindow = () => {
    clipboardWindow = new BrowserWindow({
      width: 400,
      height: 600,
      minWidth: 400,
      minHeight: 600,
      maxWidth: 400,
      maxHeight: 600,
      frame: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      show: false,
      title: 'CinnaTool Quick Tools',
      transparent: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, '../../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    clipboardWindow.on('close', () => {
      if (restoringFromClipboardWindow || !isMainWindowLocked()) return;
      showMainClipboardPage();
    });

    clipboardWindow.on('closed', () => {
      clipboardWindow = null;
      restoringFromClipboardWindow = false;
    });

    loadClipboardWindow(clipboardWindow);
    clipboardWindow.once('ready-to-show', () => {
      clipboardWindow?.show();
    });
  };

  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const mainWindow = getMainWindow();
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    getMainWindow()?.close();
  });

  ipcMain.handle('translation-window:open', () => {
    openTranslationQuickWindow();
    return true;
  });

  ipcMain.handle('settings:open-ai', () => {
    restoringFromClipboardWindow = true;
    showMainAiSettings();
    if (clipboardWindow && !clipboardWindow.isDestroyed()) {
      clipboardWindow.close();
    }
    return true;
  });

  ipcMain.handle('clipboard-window:open', () => {
    if (clipboardWindow && !clipboardWindow.isDestroyed()) {
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        setMainWindowLocked(true);
        mainWindow.hide();
        mainWindow.setSkipTaskbar(true);
      }
      clipboardWindow.show();
      clipboardWindow.focus();
      return true;
    }

    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      setMainWindowLocked(true);
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    }

    createClipboardWindow();
    return true;
  });

  ipcMain.handle('clipboard-window:toggle', () => {
    if (clipboardWindow && !clipboardWindow.isDestroyed()) {
      restoringFromClipboardWindow = true;
      showMainClipboardPage();
      clipboardWindow.close();
      return true;
    }

    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      setMainWindowLocked(true);
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    }

    createClipboardWindow();
    return true;
  });

  ipcMain.handle('clipboard-window:restore-main', () => {
    restoringFromClipboardWindow = true;
    showMainClipboardPage();
    if (clipboardWindow && !clipboardWindow.isDestroyed()) {
      clipboardWindow.close();
    }
    return true;
  });
}
