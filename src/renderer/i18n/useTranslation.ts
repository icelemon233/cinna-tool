import { useSettingsStore } from '../store/settingsStore';
import { translations, type Locale } from './translations';

export function useTranslation() {
  const language = useSettingsStore((state) => state.language) as Locale;
  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };
  return { t, locale: language };
}
