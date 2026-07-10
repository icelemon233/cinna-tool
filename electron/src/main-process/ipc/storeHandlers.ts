import { ipcMain } from 'electron';
import { loadConfig, saveConfig } from '../utils/jsonStore';

export function registerStoreHandlers(): void {
  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    const config = loadConfig();
    config[key] = value;
    saveConfig(config);
    return true;
  });

  ipcMain.handle('store:get', (_event, key: string) => {
    const config = loadConfig();
    return config[key] ?? null;
  });
}
