import { ipcMain } from 'electron';
import type { IpcContext } from '../types';

export function registerWindowHandlers({ getMainWindow }: IpcContext): void {
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
}
