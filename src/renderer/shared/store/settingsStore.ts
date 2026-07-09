import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'peach' | 'mint' | 'sakura' | 'lavender' | 'lemon' | 'dark';

export interface WallpaperFileInfo {
  name: string;
  path: string;
  url: string;
  size: number;
  mtime: number;
  mediaType: 'image' | 'video';
}

export interface SettingsState {
  theme: ThemeType;
  language: 'zh' | 'en';
  wallpaperFile: WallpaperFileInfo | null;
  dynamicWallpaperFile: WallpaperFileInfo | null;
  hideHomePage: boolean;
  wallpaperOpacity: number;
  clipboardFloatingOpacity: number;
  downloadPath: string;
}

export interface SettingsActions {
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  setLanguage: (lang: 'zh' | 'en') => void;
  setWallpaperFile: (file: WallpaperFileInfo | null) => void;
  setDynamicWallpaperFile: (file: WallpaperFileInfo | null) => void;
  setHideHomePage: (hidden: boolean) => void;
  setWallpaperOpacity: (opacity: number) => void;
  setClipboardFloatingOpacity: (opacity: number) => void;
  setDownloadPath: (path: string) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const themeOrder: ThemeType[] = ['peach', 'mint', 'sakura', 'lavender', 'lemon', 'dark'];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'mint',
      language: 'zh',
      wallpaperFile: null,
      dynamicWallpaperFile: null,
      hideHomePage: false,
      wallpaperOpacity: 0.74,
      clipboardFloatingOpacity: 0.9,
      downloadPath: '',

      setTheme: (theme: ThemeType) => {
        set({ theme });
      },

      toggleTheme: () => {
        set((state) => {
          const currentIdx = themeOrder.indexOf(state.theme);
          const nextIdx = (currentIdx + 1) % themeOrder.length;
          return { theme: themeOrder[nextIdx] };
        });
      },

      toggleLanguage: () => {
        set((state) => ({
          language: state.language === 'zh' ? 'en' : 'zh',
        }));
      },

      setLanguage: (lang: 'zh' | 'en') => {
        set({ language: lang });
      },

      setWallpaperFile: (file: WallpaperFileInfo | null) => {
        set({ wallpaperFile: file });
      },

      setDynamicWallpaperFile: (file: WallpaperFileInfo | null) => {
        set({ dynamicWallpaperFile: file });
      },

      setHideHomePage: (hidden: boolean) => {
        set({ hideHomePage: hidden });
      },

      setWallpaperOpacity: (opacity: number) => {
        set({ wallpaperOpacity: Math.min(1, Math.max(0.15, opacity)) });
      },

      setClipboardFloatingOpacity: (opacity: number) => {
        set({ clipboardFloatingOpacity: Math.min(1, Math.max(0.35, opacity)) });
      },

      setDownloadPath: (path: string) => {
        set({ downloadPath: path });
      },
    }),
    {
      name: 'cinnatool-settings',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        wallpaperFile: state.wallpaperFile?.path ? state.wallpaperFile : null,
        dynamicWallpaperFile: state.dynamicWallpaperFile?.path ? state.dynamicWallpaperFile : null,
        hideHomePage: state.hideHomePage,
        wallpaperOpacity: state.wallpaperOpacity,
        clipboardFloatingOpacity: state.clipboardFloatingOpacity,
        downloadPath: state.downloadPath,
      }),
    }
  )
);
