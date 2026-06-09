import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'peach' | 'mint' | 'sakura' | 'lavender' | 'lemon' | 'dark';

export interface SettingsState {
  theme: ThemeType;
  language: 'zh' | 'en';
}

export interface SettingsActions {
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  setLanguage: (lang: 'zh' | 'en') => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const themeOrder: ThemeType[] = ['peach', 'mint', 'sakura', 'lavender', 'lemon', 'dark'];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'mint',
      language: 'zh',

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
    }),
    {
      name: 'cinnatool-settings',
    }
  )
);
