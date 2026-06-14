import { app, BrowserWindow, nativeImage } from 'electron';
import { createTray } from './main-process/app/tray';
import { registerIpcHandlers } from './main-process/ipc/index';
import { registerMediaProtocolHandlers, registerMediaSchemes } from './main-process/protocols/mediaProtocol';
import { getAppIconPath } from './main-process/utils/assets';
import { loadConfig } from './main-process/utils/jsonStore';
import { createMainWindow } from './main-process/windows/mainWindow';

let isQuitting = false;
let mainWindow: BrowserWindow | null = null;

const bootPreferences = loadConfig()['app-preferences'] as { hardwareAcceleration?: boolean } | undefined;
if (bootPreferences?.hardwareAcceleration === false) {
  app.disableHardwareAcceleration();
}

registerMediaSchemes();

app.whenReady().then(() => {
  registerMediaProtocolHandlers();
  registerIpcHandlers({ getMainWindow: () => mainWindow });
  mainWindow = createMainWindow(() => isQuitting);
  createTray(mainWindow);

  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(getAppIconPath());
    app.dock.setIcon(dockIcon);
  }

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    } else {
      mainWindow = createMainWindow(() => isQuitting);
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
