import { ipcMain } from 'electron';
import { updateTrayLocale } from '../app/tray';
import { fetchHomeDashboard } from '../services/homeDashboard';
import { getModelList } from '../services/models';
import type { AppLocale, HomeDashboardOptions, TrendingPeriod } from '../types';

export function registerAppHandlers(): void {
  ipcMain.handle('get-models', () => getModelList());

  ipcMain.handle('app:set-locale', (_event, locale: AppLocale) => {
    updateTrayLocale(locale);
    return true;
  });

  ipcMain.handle('home:fetch', (_event, locale: AppLocale, period: TrendingPeriod, options?: HomeDashboardOptions) => {
    return fetchHomeDashboard(locale, period, options);
  });
}
