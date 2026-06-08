export interface ModelInfo {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  requiresUrl: boolean;
}

export interface ElectronAPI {
  // Window operations
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;

  // System information
  platform: NodeJS.Platform;
  version: string;

  // AI Chat: user config store
  storeSet: (key: string, value: unknown) => Promise<boolean>;
  storeGet: (key: string) => Promise<unknown>;

  // AI Chat: get supported model list
  getModels: () => Promise<ModelInfo[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
