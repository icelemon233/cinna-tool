export interface ElectronAPI {
  // Window operations
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;

  // System information
  platform: NodeJS.Platform;
  version: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
