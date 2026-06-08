import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window operations
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // System information
  platform: process.platform,
  version: process.versions.electron,

  // AI Chat: user config store
  storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),

  // AI Chat: get supported model list
  getModels: () => ipcRenderer.invoke('get-models'),
});
