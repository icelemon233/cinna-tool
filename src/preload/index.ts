import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window operations
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  openClipboardFloatingWindow: () => ipcRenderer.invoke('clipboard-window:open'),
  restoreClipboardToMainWindow: () => ipcRenderer.invoke('clipboard-window:restore-main'),
  onShowClipboardPage: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('clipboard:show-main', listener);
    return () => ipcRenderer.removeListener('clipboard:show-main', listener);
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

  // Claude Code
  getClaudeCodeConfig: () => ipcRenderer.invoke('cc:get-config'),
  saveClaudeCodeConfig: (config: unknown) => ipcRenderer.invoke('cc:save-config', config),
  selectClaudeCodeProject: () => ipcRenderer.invoke('cc:select-project'),
  selectClaudeCodeMcpConfig: () => ipcRenderer.invoke('cc:select-mcp-config'),
  listClaudeCodeDirectory: (directoryPath?: string) => ipcRenderer.invoke('cc:list-directory', directoryPath),
  readClaudeCodeFile: (filePath: string) => ipcRenderer.invoke('cc:read-file', filePath),
  getClaudeCodeStatus: (config?: unknown) => ipcRenderer.invoke('cc:status', config),
  runClaudeCode: (request: unknown) => ipcRenderer.invoke('cc:run', request),
  abortClaudeCode: (requestId?: string) => ipcRenderer.invoke('cc:abort', requestId),
  onClaudeCodeEvent: (callback: (event: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on('cc:event', listener);
    return () => ipcRenderer.removeListener('cc:event', listener);
  },
});
