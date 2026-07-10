import zh from './locales/zh';
import en from './locales/en';

export type Locale = 'zh' | 'en';
export type TranslationDictionary = Record<string, string>;

export const translations: Record<Locale, TranslationDictionary> = {
  zh,
  en,
};
