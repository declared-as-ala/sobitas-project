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
/**
 * DO NOT rely on this flag to keep the AR/EN data out of the bundle — it does not, and cannot.
 *
 * I18nProvider.tsx used to claim the build "tree-shakes ~30KB of unused translation data off every
 * page's first-load JS". That was false. Verified by scanning the built client chunks for Arabic
 * codepoints: the dictionaries were present in 7065 (31 kB) and 7742 (76 kB), BOTH of which the
 * network trace shows loading before FCP. Every French visitor downloaded Arabic and English
 * dictionaries for a feature that is switched off.
 *
 * The tempting fix — dropping the `: boolean` annotation so the type narrows to literal `false` —
 * does nothing either. TypeScript types are ERASED at compile time; `const X: boolean = false` and
 * `const X = false` emit byte-identical JavaScript. Measured: same chunk hashes, same Arabic data.
 * A type annotation can never influence what a minifier can prove.
 *
 * The data is kept out by LOADING IT LAZILY (see I18nProvider), which depends on nothing but
 * `import()`. If this flag is ever flipped to `true`, the tables are fetched on demand the first
 * time a non-French locale is selected.
 */
export const MULTILOCALE_ENABLED = false;

export function isLocale(value: unknown): value is Locale {
  return value === 'fr' || value === 'en' || value === 'ar';
}

export function getLocaleDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
