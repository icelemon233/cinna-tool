import { Tray, Menu, nativeImage, BrowserWindow, app, dialog, type NativeImage } from 'electron';
import { getTrayIconPath } from '../utils/assets';

let tray: Tray | null = null;
let trayWindow: BrowserWindow | null = null;
let trayLocale: 'zh' | 'en' = 'zh';

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
  if (!trayWindow || trayWindow.isDestroyed()) return;
  if (trayWindow.isMinimized()) {
    trayWindow.restore();
  }
  trayWindow.show();
  trayWindow.focus();
}

function updateMenu() {
  if (!tray || !trayWindow) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: t('show'),
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
            .replace('{version}', app.getVersion())
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
    icon.setTemplateImage(true);
    return icon;
  }

  return icon.resize({ width: 16, height: 16 });
}

export function createTray(mainWindow: BrowserWindow): void {
  trayWindow = mainWindow;
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
