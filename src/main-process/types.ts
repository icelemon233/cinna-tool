import type { BrowserWindow } from 'electron';

export type AppLocale = 'zh' | 'en';
export type TrendingPeriod = 'daily' | 'weekly' | 'yearly';

export interface IpcContext {
  getMainWindow: () => BrowserWindow | null;
}

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

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

export type WallpaperKind = 'static' | 'dynamic';

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

export type ClaudeCodeEventType = 'start' | 'delta' | 'meta' | 'stderr' | 'error' | 'exit';

export interface ClaudeCodeEvent {
  requestId: string;
  type: ClaudeCodeEventType;
  text?: string;
  sessionId?: string;
  model?: string;
  tools?: string[];
  mcpServers?: string[];
  code?: number | null;
  signal?: NodeJS.Signals | null;
}
