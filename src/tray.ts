import { Tray, Menu, nativeImage, BrowserWindow, app, dialog } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): void {
  // Use icon.png for tray
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.png')
    : path.join(__dirname, '..', 'src', 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('CinnaTool');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'About CinnaTool',
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'About CinnaTool',
          message: 'CinnaTool',
          detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}`,
          buttons: ['OK'],
        });
      },
    },
    {
      label: 'Open DevTools',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.openDevTools();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click tray icon to toggle window visibility
  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
