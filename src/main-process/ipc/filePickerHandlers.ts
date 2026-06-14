import { ipcMain } from 'electron';
import {
  getWallpaperFilters,
  IMAGE_EXTENSIONS,
  readImageFolder,
  readSingleImage,
  toWallpaperFileInfo,
} from '../services/media';
import type { IpcContext, WallpaperKind } from '../types';
import { showOpenDialog } from './dialog';

export function registerFilePickerHandlers(context: IpcContext): void {
  ipcMain.handle('downloads:select-folder', async () => {
    const result = await showOpenDialog(context, {
      title: '选择下载位置',
      properties: ['openDirectory'],
    });

    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  ipcMain.handle('wallpaper:select-file', async (_event, kind: WallpaperKind) => {
    const result = await showOpenDialog(context, {
      title: kind === 'static' ? '选择壁纸图片' : '选择动态壁纸文件',
      properties: ['openFile'],
      filters: getWallpaperFilters(kind),
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return toWallpaperFileInfo(result.filePaths[0], kind);
  });

  ipcMain.handle('wallpaper:resolve-file', (_event, filePath: string, kind: WallpaperKind) => {
    return toWallpaperFileInfo(filePath, kind);
  });

  ipcMain.handle('images:select-folder', async () => {
    const result = await showOpenDialog(context, {
      title: '选择图片文件夹',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return readImageFolder(result.filePaths[0]);
  });

  ipcMain.handle('images:select-file', async () => {
    const result = await showOpenDialog(context, {
      title: '选择图片',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: Array.from(IMAGE_EXTENSIONS).map((ext) => ext.slice(1)) }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return readSingleImage(result.filePaths[0]);
  });
}
