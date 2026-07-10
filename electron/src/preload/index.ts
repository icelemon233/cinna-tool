import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window operations
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  openClipboardFloatingWindow: () => ipcRenderer.invoke('clipboard-window:open'),
  toggleClipboardFloatingWindow: () => ipcRenderer.invoke('clipboard-window:toggle'),
  restoreClipboardToMainWindow: () => ipcRenderer.invoke('clipboard-window:restore-main'),
  openTranslationQuickWindow: () => ipcRenderer.invoke('translation-window:open'),
  openAISettings: () => ipcRenderer.invoke('settings:open-ai'),
  onShowClipboardPage: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('clipboard:show-main', listener);
    return () => ipcRenderer.removeListener('clipboard:show-main', listener);
  },
  onOpenAISettings: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('settings:open-ai', listener);
    return () => ipcRenderer.removeListener('settings:open-ai', listener);
  },
  onQuickAction: (callback: (action: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on('app:quick-action', listener);
    return () => ipcRenderer.removeListener('app:quick-action', listener);
  },

  // System information
  platform: process.platform,
  version: process.versions.electron,

  // AI Chat: user config store
  storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),

  // AI Chat: get supported model list
  getModels: () => ipcRenderer.invoke('get-models'),

  // App shell
  notifyShellReady: () => ipcRenderer.send('app:shell-ready'),
  setAppLocale: (locale: 'zh' | 'en') => ipcRenderer.invoke('app:set-locale', locale),
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
  writeClipboardText: (text: string) => ipcRenderer.invoke('clipboard:write-text', text),
  openExternalUrl: (url: string) => ipcRenderer.invoke('app:open-external', url),
  fetchHomeDashboard: (
    locale: 'zh' | 'en',
    period: 'daily' | 'weekly' | 'yearly',
    options?: unknown
  ) => ipcRenderer.invoke('home:fetch', locale, period, options),
  selectDownloadFolder: () => ipcRenderer.invoke('downloads:select-folder'),
  saveGeneratedDocument: (request: unknown) => ipcRenderer.invoke('documents:save-generated', request),
  selectWallpaperFile: (kind: 'static' | 'dynamic') => ipcRenderer.invoke('wallpaper:select-file', kind),
  resolveWallpaperFile: (path: string, kind: 'static' | 'dynamic') =>
    ipcRenderer.invoke('wallpaper:resolve-file', path, kind),

  // Image viewer
  selectImageFolder: () => ipcRenderer.invoke('images:select-folder'),
  selectImageFile: () => ipcRenderer.invoke('images:select-file'),

});
