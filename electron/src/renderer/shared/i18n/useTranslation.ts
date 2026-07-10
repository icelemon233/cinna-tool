import { useCallback } from 'react';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { translations, type Locale } from './translations';

export function useTranslation() {
  const language = useSettingsStore((state) => state.language) as Locale;
  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]);

  return { t, locale: language };
}
