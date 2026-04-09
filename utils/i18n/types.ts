export type Locale = 'en' | 'es' | 'fr' | 'pt';

export const SUPPORTED_LOCALES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Flatten nested translation objects for easier access.
 * Example: { home: { title: "Home" } } → { "home.title": "Home" }
 */
export function flattenTranslations(
  obj: any,
  prefix = '',
  result: Record<string, string> = {}
): Record<string, string> {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[newKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      flattenTranslations(value, newKey, result);
    }
  }
  return result;
}

/**
 * Get a translation by dot-notation key path.
 * Example: getTranslation("home.title", translations)
 */
export function getTranslation(
  key: string,
  translations: Record<string, string>,
  defaultValue = key
): string {
  return translations[key] || defaultValue;
}
