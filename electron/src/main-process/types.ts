import type { BrowserWindow } from 'electron';

export type AppLocale = 'zh' | 'en';
export type TrendingPeriod = 'daily' | 'weekly' | 'yearly';

export interface IpcContext {
  getMainWindow: () => BrowserWindow | null;
  isMainWindowLocked: () => boolean;
  setMainWindowLocked: (locked: boolean) => void;
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
  forceRefresh?: boolean;
}
