import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import type { IpcContext } from '../types';

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
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('clipboard:show-main');
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
      title: 'CinnaTool Clipboard',
      backgroundColor: '#fbfbfa',
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
