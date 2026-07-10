import type React from 'react';

export interface ModelInfo {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  requiresUrl: boolean;
}

export interface ImageFileInfo {
  name: string;
  path: string;
  url: string;
  size: number;
  mtime: number;
}

export interface ImageFolderResult {
  folderPath: string;
  folderName: string;
  images: ImageFileInfo[];
}

export interface WallpaperFileInfo {
  name: string;
  path: string;
  url: string;
  size: number;
  mtime: number;
  mediaType: 'image' | 'video';
}

export interface HomeNewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface GithubTrendingItem {
  name: string;
  owner: string;
  repo: string;
  description: string;
  url: string;
  language: string;
  stars: string;
  periodStars: string;
}

export interface HomeDashboardData {
  news: HomeNewsItem[];
  trending: GithubTrendingItem[];
  summary: string;
  summaryState: HomeSummaryState;
  fetchedAt: number;
}

export type HomeSummaryReason =
  | 'disabled'
  | 'missing-config'
  | 'generated'
  | 'auth'
  | 'rate-limit'
  | 'timeout'
  | 'request'
  | 'empty-response';

export interface HomeSummaryState {
  enabled: boolean;
  available: boolean;
  generated: boolean;
  error: string;
  reason: HomeSummaryReason;
}

export interface HomeDashboardOptions {
  aiSummaryEnabled?: boolean;
  forceRefresh?: boolean;
}

export interface SaveGeneratedDocumentRequest {
  content: string;
  fileName?: string;
  extension?: 'md' | 'txt';
}

export interface SaveGeneratedDocumentResult {
  fileName: string;
  path: string;
}

export type QuickAction = 'create-todo' | 'create-schedule' | 'add-clipboard' | 'toggle-floating';

export interface ElectronAPI {
  // Window operations
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openClipboardFloatingWindow: () => Promise<boolean>;
  toggleClipboardFloatingWindow: () => Promise<boolean>;
  restoreClipboardToMainWindow: () => Promise<boolean>;
  openTranslationQuickWindow: () => Promise<boolean>;
  openAISettings: () => Promise<boolean>;
  onShowClipboardPage: (callback: () => void) => () => void;
  onOpenAISettings: (callback: () => void) => () => void;
  onQuickAction: (callback: (action: QuickAction) => void) => () => void;

  // System information
  platform: NodeJS.Platform;
  version: string;

  // AI Chat: user config store
  storeSet: (key: string, value: unknown) => Promise<boolean>;
  storeGet: (key: string) => Promise<unknown>;

  // AI Chat: get supported model list
  getModels: () => Promise<ModelInfo[]>;

  // App shell
  notifyShellReady: () => void;
  setAppLocale: (locale: 'zh' | 'en') => Promise<boolean>;
  readClipboardText: () => Promise<string>;
  writeClipboardText: (text: string) => Promise<boolean>;
  openExternalUrl: (url: string) => Promise<boolean>;
  fetchHomeDashboard: (
    locale: 'zh' | 'en',
    period: 'daily' | 'weekly' | 'yearly',
    options?: HomeDashboardOptions
  ) => Promise<HomeDashboardData>;
  selectDownloadFolder: () => Promise<string | null>;
  saveGeneratedDocument: (request: SaveGeneratedDocumentRequest) => Promise<SaveGeneratedDocumentResult>;
  selectWallpaperFile: (kind: 'static' | 'dynamic') => Promise<WallpaperFileInfo | null>;
  resolveWallpaperFile: (path: string, kind: 'static' | 'dynamic') => Promise<WallpaperFileInfo | null>;

  // Image viewer
  selectImageFolder: () => Promise<ImageFolderResult | null>;
  selectImageFile: () => Promise<ImageFolderResult | null>;

}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        allowpopups?: string | boolean;
        autosize?: string | boolean;
        disableblinkfeatures?: string;
        httpreferrer?: string;
        nodeintegration?: string | boolean;
        partition?: string;
        plugins?: string | boolean;
        preload?: string;
        src?: string;
        useragent?: string;
        webpreferences?: string;
      };
    }
  }
}

export {};
