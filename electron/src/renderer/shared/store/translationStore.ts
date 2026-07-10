import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TranslationTargetLanguage =
  | 'en'
  | 'zh-CN'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'it'
  | 'ru'
  | 'ar';

interface TranslationState {
  targetLanguage: TranslationTargetLanguage;
  setTargetLanguage: (language: TranslationTargetLanguage) => void;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set) => ({
      targetLanguage: 'en',
      setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
    }),
    {
      name: 'cinnatool-translation-storage',
      partialize: (state) => ({ targetLanguage: state.targetLanguage }),
    }
  )
);
