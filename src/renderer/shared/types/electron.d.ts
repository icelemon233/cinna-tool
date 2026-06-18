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
}

export type ClaudeCodePermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'plan'
  | 'auto'
  | 'dontAsk'
  | 'bypassPermissions';

export interface ClaudeCodeConfig {
  command: string;
  projectPath: string;
  model: string;
  permissionMode: ClaudeCodePermissionMode;
  apiKey: string;
  authToken: string;
  baseUrl: string;
  defaultSonnetModel: string;
  defaultOpusModel: string;
  defaultHaikuModel: string;
  defaultFableModel: string;
  mcpConfigPath: string;
  additionalDirs: string[];
  extraArgs: string;
}

export interface ClaudeCodeFileNode {
  name: string;
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  hasChildren: boolean;
  size?: number;
  mtime?: number;
}

export interface ClaudeCodeDirectoryResult {
  path: string;
  relativePath: string;
  nodes: ClaudeCodeFileNode[];
  truncated: boolean;
}

export interface ClaudeCodeFileContent {
  name: string;
  path: string;
  relativePath: string;
  content: string;
  size: number;
  mtime: number;
  binary: boolean;
  truncated: boolean;
}

export interface ClaudeCodeStatus {
  ok: boolean;
  command: string;
  version: string;
  auth: string;
  error: string;
}

export interface ClaudeCodeRunRequest {
  prompt: string;
  sessionId?: string;
  config: ClaudeCodeConfig;
}

export interface ClaudeCodeEvent {
  requestId: string;
  type: 'start' | 'delta' | 'meta' | 'stderr' | 'error' | 'exit';
  text?: string;
  sessionId?: string;
  model?: string;
  tools?: string[];
  mcpServers?: string[];
  code?: number | null;
  signal?: string | null;
}

export interface ElectronAPI {
  // Window operations
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openClipboardFloatingWindow: () => Promise<boolean>;
  restoreClipboardToMainWindow: () => Promise<boolean>;
  onShowClipboardPage: (callback: () => void) => () => void;

  // System information
  platform: NodeJS.Platform;
  version: string;

  // AI Chat: user config store
  storeSet: (key: string, value: unknown) => Promise<boolean>;
  storeGet: (key: string) => Promise<unknown>;

  // AI Chat: get supported model list
  getModels: () => Promise<ModelInfo[]>;

  // App shell
  setAppLocale: (locale: 'zh' | 'en') => Promise<boolean>;
  writeClipboardText: (text: string) => Promise<boolean>;
  openExternalUrl: (url: string) => Promise<boolean>;
  fetchHomeDashboard: (
    locale: 'zh' | 'en',
    period: 'daily' | 'weekly' | 'yearly',
    options?: HomeDashboardOptions
  ) => Promise<HomeDashboardData>;
  selectDownloadFolder: () => Promise<string | null>;
  selectWallpaperFile: (kind: 'static' | 'dynamic') => Promise<WallpaperFileInfo | null>;
  resolveWallpaperFile: (path: string, kind: 'static' | 'dynamic') => Promise<WallpaperFileInfo | null>;

  // Image viewer
  selectImageFolder: () => Promise<ImageFolderResult | null>;
  selectImageFile: () => Promise<ImageFolderResult | null>;

  // Claude Code
  getClaudeCodeConfig: () => Promise<ClaudeCodeConfig>;
  saveClaudeCodeConfig: (config: ClaudeCodeConfig) => Promise<ClaudeCodeConfig>;
  selectClaudeCodeProject: () => Promise<string | null>;
  selectClaudeCodeMcpConfig: () => Promise<string | null>;
  listClaudeCodeDirectory: (directoryPath?: string) => Promise<ClaudeCodeDirectoryResult>;
  readClaudeCodeFile: (filePath: string) => Promise<ClaudeCodeFileContent>;
  getClaudeCodeStatus: (config?: Partial<ClaudeCodeConfig>) => Promise<ClaudeCodeStatus>;
  runClaudeCode: (request: ClaudeCodeRunRequest) => Promise<string>;
  abortClaudeCode: (requestId?: string) => Promise<boolean>;
  onClaudeCodeEvent: (callback: (event: ClaudeCodeEvent) => void) => () => void;
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
