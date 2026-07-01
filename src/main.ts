import { app, BrowserWindow, nativeImage } from 'electron';
import { createTray, refreshTrayMenu } from './main-process/app/tray';
import { registerIpcHandlers } from './main-process/ipc/index';
import { registerMediaProtocolHandlers, registerMediaSchemes } from './main-process/protocols/mediaProtocol';
import { getAppIconPath, getAssetPath } from './main-process/utils/assets';
import { loadConfig } from './main-process/utils/jsonStore';
import { createMainWindow, revealMainWindow } from './main-process/windows/mainWindow';

let isQuitting = false;
let mainWindow: BrowserWindow | null = null;
let isMainWindowLocked = false;
let didCreateShellExtras = false;
let didCompleteFirstReveal = false;
const startupStartedAt = Date.now();
const shouldLogStartup = process.env.CINNATOOL_STARTUP_LOG === '1';

function logStartup(label: string): void {
  if (!shouldLogStartup) return;
  console.log(`[startup +${Date.now() - startupStartedAt}ms] ${label}`);
}

const bootPreferences = loadConfig()['app-preferences'] as { hardwareAcceleration?: boolean } | undefined;
if (bootPreferences?.hardwareAcceleration === false) {
  app.disableHardwareAcceleration();
}

registerMediaSchemes();

const showMainWindow = () => {
  logStartup('showMainWindow');
  if (isMainWindowLocked) {
    isMainWindowLocked = false;
    refreshTrayMenu();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!didCompleteFirstReveal) {
      logStartup('showMainWindow ignored before first reveal');
      return;
    }
    revealMainWindow(mainWindow);
    return;
  }

  didCompleteFirstReveal = false;
  mainWindow = createMainWindow(() => isQuitting, handleMainWindowRevealed);
};

function createShellExtras(): void {
  if (didCreateShellExtras) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  didCreateShellExtras = true;
  createTray(mainWindow, () => isMainWindowLocked);
  logStartup('after createTray');

  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(getAssetPath('icon.png'));
    app.dock.setIcon(dockIcon);
    logStartup('after setDockIcon');
  }
}

function scheduleShellExtras(): void {
  setTimeout(createShellExtras, 600).unref?.();
}

function handleMainWindowRevealed(): void {
  didCompleteFirstReveal = true;
  scheduleShellExtras();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;

  logStartup('app.whenReady');
  registerMediaProtocolHandlers();
  registerIpcHandlers({
    getMainWindow: () => mainWindow,
    isMainWindowLocked: () => isMainWindowLocked,
    setMainWindowLocked: (locked: boolean) => {
      isMainWindowLocked = locked;
      refreshTrayMenu();
    },
  });
  logStartup('before createMainWindow');
  didCompleteFirstReveal = false;
  mainWindow = createMainWindow(() => isQuitting, handleMainWindowRevealed);
  logStartup('after createMainWindow');
  setTimeout(createShellExtras, 12_000).unref?.();

  app.on('activate', () => {
    showMainWindow();
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
