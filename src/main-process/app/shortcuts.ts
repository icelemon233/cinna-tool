import { app, BrowserWindow, globalShortcut } from 'electron';

export type QuickAction = 'create-todo' | 'create-schedule' | 'add-clipboard' | 'toggle-floating';

interface RegisterGlobalShortcutsOptions {
  getMainWindow: () => BrowserWindow | null;
  showMainWindow: () => void;
}

const SHORTCUTS: Array<{ accelerator: string; action: QuickAction; revealMainWindow: boolean }> = [
  { accelerator: 'CommandOrControl+1', action: 'create-todo', revealMainWindow: true },
  { accelerator: 'CommandOrControl+2', action: 'create-schedule', revealMainWindow: true },
  { accelerator: 'CommandOrControl+3', action: 'add-clipboard', revealMainWindow: true },
  { accelerator: 'CommandOrControl+0', action: 'toggle-floating', revealMainWindow: false },
];

function sendQuickAction(mainWindow: BrowserWindow | null, action: QuickAction): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('app:quick-action', action);
}

export function registerGlobalShortcuts({
  getMainWindow,
  showMainWindow,
}: RegisterGlobalShortcutsOptions): void {
  for (const { accelerator, action, revealMainWindow } of SHORTCUTS) {
    globalShortcut.register(accelerator, () => {
      if (revealMainWindow) {
        showMainWindow();
      }

      setTimeout(() => {
        sendQuickAction(getMainWindow(), action);
      }, 80).unref?.();
    });
  }

  app.once('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
