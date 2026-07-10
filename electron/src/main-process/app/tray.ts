import { Tray, Menu, nativeImage, BrowserWindow, app, dialog, type NativeImage } from 'electron';
import { getTrayIconPath, getTrayIconRetinaPath } from '../utils/assets';
import { revealMainWindow } from '../windows/mainWindow';

let tray: Tray | null = null;
let trayWindow: BrowserWindow | null = null;
let trayLocale: 'zh' | 'en' = 'zh';
let isMainWindowLocked = () => false;
const APP_VERSION = '1.0.0';

const labels = {
  zh: {
    show: '显示窗口',
    about: '关于 CinnaTool',
    devtools: '打开开发者工具',
    quit: '退出',
    ok: '确定',
    detail: '版本: {version}\nElectron: {electron}\nChrome: {chrome}\nNode.js: {node}',
  },
  en: {
    show: 'Show Window',
    about: 'About CinnaTool',
    devtools: 'Open DevTools',
    quit: 'Quit',
    ok: 'OK',
    detail: 'Version: {version}\nElectron: {electron}\nChrome: {chrome}\nNode.js: {node}',
  },
};

function t(key: keyof typeof labels.zh): string {
  return labels[trayLocale][key];
}

function showWindow() {
  if (isMainWindowLocked()) return;
  if (!trayWindow || trayWindow.isDestroyed()) return;
  revealMainWindow(trayWindow);
}

function updateMenu() {
  if (!tray || !trayWindow) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: t('show'),
      enabled: !isMainWindowLocked(),
      click: showWindow,
    },
    { type: 'separator' },
    {
      label: t('about'),
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: t('about'),
          message: 'CinnaTool',
          detail: t('detail')
            .replace('{version}', APP_VERSION)
            .replace('{electron}', process.versions.electron)
            .replace('{chrome}', process.versions.chrome)
            .replace('{node}', process.versions.node),
          buttons: [t('ok')],
        });
      },
    },
    {
      label: t('devtools'),
      click: () => {
        if (trayWindow && !trayWindow.isDestroyed()) {
          trayWindow.webContents.openDevTools();
        }
      },
    },
    { type: 'separator' },
    {
      label: t('quit'),
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function createTrayIcon(): NativeImage {
  const icon = nativeImage.createFromPath(getTrayIconPath());

  if (process.platform === 'darwin') {
    const retinaIcon = nativeImage.createFromPath(getTrayIconRetinaPath());
    if (!retinaIcon.isEmpty()) {
      icon.addRepresentation({
        scaleFactor: 2,
        dataURL: retinaIcon.toDataURL(),
      });
    }
    icon.setTemplateImage(true);
    return icon;
  }

  return icon.resize({ width: 16, height: 16 });
}

export function createTray(mainWindow: BrowserWindow, isLocked: () => boolean = () => false): void {
  trayWindow = mainWindow;
  isMainWindowLocked = isLocked;
  const icon = createTrayIcon();

  tray = new Tray(icon);
  tray.setToolTip('CinnaTool');
  updateMenu();

  // Keep tray click predictable: show/focus the app instead of hiding it when already foreground.
  tray.on('click', () => {
    showWindow();
  });
}

export function updateTrayLocale(locale: 'zh' | 'en'): void {
  trayLocale = locale;
  updateMenu();
}

export function refreshTrayMenu(): void {
  updateMenu();
}
