export type Locale = 'fr' | 'en' | 'ar';

export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_STORAGE_KEY = 'sobitas-locale';
export const LOCALE_COOKIE = 'sobitas_locale';

/**
 * French-only mode. The AR/EN toggle uses a client-side dictionary DOM-walk that only covers
 * some phrases (the rest stay French → visible language mixing) and restores incompletely on
 * toggle-back — so it's disabled for now. Flip to `true` (and later invest in real per-locale
 * content) to bring the switcher back. When false: the LanguageSwitcher is hidden and the app
 * ignores/clears any persisted ar/en so the site stays clean French.
 */
export const MULTILOCALE_ENABLED: boolean = false;

export function isLocale(value: unknown): value is Locale {
  return value === 'fr' || value === 'en' || value === 'ar';
}

export function getLocaleDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
