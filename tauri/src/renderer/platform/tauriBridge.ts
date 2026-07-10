import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { open } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import type {
  HomeDashboardOptions,
  ImageFolderResult,
  ModelInfo,
  PlatformHttpRequest,
  PlatformHttpResponse,
  QuickAction,
  SaveGeneratedDocumentRequest,
  SaveGeneratedDocumentResult,
  WallpaperFileInfo,
} from '@/shared/types/platform';

function detectPlatform(): NodeJS.Platform {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('mac')) return 'darwin';
  if (platform.includes('win')) return 'win32';
  if (platform.includes('linux')) return 'linux';
  return 'linux';
}

function listenEvent<T>(event: string, callback: (payload: T) => void): () => void {
  let unlisten: (() => void) | undefined;
  void listen<T>(event, ({ payload }) => {
    callback(payload);
  }).then((nextUnlisten) => {
    unlisten = nextUnlisten;
  });

  return () => {
    unlisten?.();
  };
}

const appWindow = getCurrentWindow();

function withWallpaperUrl(file: WallpaperFileInfo | null): WallpaperFileInfo | null {
  if (!file) return null;
  return { ...file, url: convertFileSrc(file.path) };
}

function withImageUrls(folder: ImageFolderResult | null): ImageFolderResult | null {
  if (!folder) return null;
  return {
    ...folder,
    images: folder.images.map((image) => ({
      ...image,
      url: convertFileSrc(image.path),
    })),
  };
}

async function selectOnePath(options: Parameters<typeof open>[0]): Promise<string | null> {
  const selected = await open({ multiple: false, ...options });
  return typeof selected === 'string' ? selected : null;
}

window.cinnaAPI = {
  minimize: () => appWindow.minimize(),
  maximize: () => appWindow.toggleMaximize(),
  close: () => appWindow.close(),
  openClipboardFloatingWindow: () => invoke<boolean>('open_clipboard_floating_window'),
  toggleClipboardFloatingWindow: () => invoke<boolean>('toggle_clipboard_floating_window'),
  restoreClipboardToMainWindow: () => invoke<boolean>('restore_clipboard_to_main_window'),
  openTranslationQuickWindow: () => invoke<boolean>('open_translation_quick_window'),
  openAISettings: () => invoke<boolean>('open_ai_settings'),
  onShowClipboardPage: (callback) => listenEvent<void>('clipboard:show-main', callback),
  onOpenAISettings: (callback) => listenEvent<void>('settings:open-ai', callback),
  onQuickAction: (callback: (action: QuickAction) => void) => listenEvent<QuickAction>('app:quick-action', callback),

  platform: detectPlatform(),
  version: 'tauri',

  storeSet: (key: string, value: unknown) => invoke<boolean>('store_set', { key, value }),
  storeGet: (key: string) => invoke<unknown>('store_get', { key }),

  getModels: () => invoke<ModelInfo[]>('get_models'),
  httpRequest: (request: PlatformHttpRequest) => invoke<PlatformHttpResponse>('http_request', { request }),

  notifyShellReady: () => {
    void invoke('notify_shell_ready');
  },
  setAppLocale: (locale: 'zh' | 'en') => invoke<boolean>('set_app_locale', { locale }),
  readClipboardText: async () => readText(),
  writeClipboardText: async (text: string) => {
    await writeText(text);
    return true;
  },
  openExternalUrl: async (url: string) => {
    await openUrl(url);
    return true;
  },
  openUrlWindow: (url: string, title?: string) => invoke<boolean>('open_url_window', { url, title }),
  fetchHomeDashboard: (locale: 'zh' | 'en', period: 'daily' | 'weekly' | 'yearly', options?: HomeDashboardOptions) =>
    invoke('fetch_home_dashboard', { locale, period, options }),
  selectDownloadFolder: () => selectOnePath({ directory: true }),
  saveGeneratedDocument: (request: SaveGeneratedDocumentRequest) =>
    invoke<SaveGeneratedDocumentResult>('save_generated_document', { request }),
  selectWallpaperFile: async (kind: 'static' | 'dynamic') => {
    const filePath = await selectOnePath({
      filters: [
        {
          name: kind === 'dynamic' ? 'Media' : 'Images',
          extensions: kind === 'dynamic' ? ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm', 'mov'] : ['png', 'jpg', 'jpeg', 'webp', 'gif'],
        },
      ],
    });
    return filePath ? withWallpaperUrl(await invoke<WallpaperFileInfo | null>('resolve_wallpaper_file', { path: filePath, kind })) : null;
  },
  resolveWallpaperFile: (path: string, kind: 'static' | 'dynamic') =>
    invoke<WallpaperFileInfo | null>('resolve_wallpaper_file', { path, kind }).then(withWallpaperUrl),

  selectImageFolder: async () => {
    const folderPath = await selectOnePath({ directory: true });
    return folderPath ? withImageUrls(await invoke<ImageFolderResult | null>('read_image_folder', { folderPath })) : null;
  },
  selectImageFile: async () => {
    const filePath = await selectOnePath({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg'] }],
    });
    return filePath ? withImageUrls(await invoke<ImageFolderResult | null>('read_image_file', { filePath })) : null;
  },
};
