import { app } from 'electron';
import path from 'path';

export function getAssetPath(filename: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets', filename)
    : path.join(__dirname, '..', '..', '..', 'src', 'assets', filename);
}

export function getAppIconPath(): string {
  if (process.platform === 'darwin') {
    return getAssetPath('icon.icns');
  }

  return process.platform === 'win32'
    ? getAssetPath('icon.ico')
    : getAssetPath('icon.png');
}

export function getTrayIconPath(): string {
  if (process.platform === 'darwin') {
    return getAssetPath('trayTemplate.png');
  }

  return process.platform === 'win32'
    ? getAssetPath('icon.ico')
    : getAssetPath('icon.png');
}
