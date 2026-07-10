import { dialog } from 'electron';
import type { IpcContext } from '../types';

export async function showOpenDialog(
  { getMainWindow }: IpcContext,
  options: Electron.OpenDialogOptions
) {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return dialog.showOpenDialog(options);
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();

  return dialog.showOpenDialog(mainWindow, options);
}
