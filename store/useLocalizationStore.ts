import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, Locale, flattenTranslations } from '@/utils/i18n/types';

// Import translations
import * as enJson from '@/utils/i18n/en.json';

type Translations = Record<string, string>;

interface LocalizationState {
  locale: Locale;
  translations: Translations;
  setLocale: (locale: Locale) => Promise<void>;
}

const allTranslations: Record<Locale, Translations> = {
  en: flattenTranslations(enJson),
  es: flattenTranslations(enJson), // TODO: Add Spanish translations
  fr: flattenTranslations(enJson), // TODO: Add French translations
  pt: flattenTranslations(enJson), // TODO: Add Portuguese translations
};

export const useLocalizationStore = create<LocalizationState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      translations: allTranslations[DEFAULT_LOCALE],

      setLocale: async (locale: Locale) => {
        set({
          locale,
          translations: allTranslations[locale] || allTranslations[DEFAULT_LOCALE],
        });
      },
    }),
    {
      name: 'shoouts-localization-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        locale: state.locale,
      }),
    }
  )
);

/**
 * Get a translated string by dot-notation key.
 * Usage: t("settings.language")
 */
export function useTranslation() {
  const { translations } = useLocalizationStore();

  return (key: string, defaultValue?: string): string => {
    return translations[key] || defaultValue || key;
  };
}
