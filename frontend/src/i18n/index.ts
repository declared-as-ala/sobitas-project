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

/**
 * ── SSR MULTILOCALE FOUNDATION (fr default-unprefixed · en/ar prefixed) ─────────────────────
 * Single source of truth for which locales exist, which carry a URL prefix, and how each maps to
 * an hreflang / og:locale tag. Consumed by the middleware locale negotiation, the `[locale]`
 * layout, and the locale-aware canonical/hreflang builders. French is the incumbent ranking
 * locale and stays at the site root with NO prefix; only en/ar are prefixed, so no existing
 * French URL ever changes.
 */
export const LOCALES: readonly Locale[] = ['fr', 'en', 'ar'];

/** Locales served under a URL path prefix. French is unprefixed (served at the site root). */
export const PREFIXED_LOCALES: readonly Locale[] = ['en', 'ar'];

/** BCP-47 hreflang value per locale (all territory-Tunisia). */
export const LOCALE_HREFLANG: Record<Locale, string> = {
  fr: 'fr-TN',
  en: 'en-TN',
  ar: 'ar-TN',
};

/** Open Graph `og:locale` value per locale (language_TERRITORY). */
export const LOCALE_OG_LOCALE: Record<Locale, string> = {
  fr: 'fr_FR',
  en: 'en_US',
  ar: 'ar_TN',
};

/** True for a locale served under a URL prefix (en, ar) — i.e. not the unprefixed default (fr). */
export function isPrefixedLocale(locale: Locale): boolean {
  return locale !== DEFAULT_LOCALE;
}

/** The URL prefix for a locale: '' for the unprefixed default (fr), '/en' | '/ar' otherwise. */
export function localePrefix(locale: Locale): string {
  return isPrefixedLocale(locale) ? `/${locale}` : '';
}

/**
 * Split a request pathname into its locale and the locale-stripped path. A leading `/en` or `/ar`
 * segment selects that locale and is removed; anything else is the default (fr), path unchanged.
 * Pure — this is exactly what the middleware runs its existing SEO matchers against.
 *
 *   '/en/whey-proteine' -> { locale: 'en', pathname: '/whey-proteine' }
 *   '/ar'               -> { locale: 'ar', pathname: '/' }
 *   '/whey-proteine'    -> { locale: 'fr', pathname: '/whey-proteine' }
 */
export function stripLocalePrefix(pathname: string): { locale: Locale; pathname: string } {
  const match = pathname.match(/^\/(en|ar)(?=\/|$)(.*)$/);
  if (match) {
    return { locale: match[1] as Locale, pathname: match[2] || '/' };
  }
  return { locale: DEFAULT_LOCALE, pathname };
}

/**
 * Re-apply a locale's prefix to a (locale-stripped) path. Inverse of `stripLocalePrefix`. Used to
 * rewrite to the internal `[locale]` route and to re-prefix redirect/crawler targets so an en/ar
 * request never escapes its locale.
 *
 *   ('en', '/whey-proteine') -> '/en/whey-proteine'
 *   ('fr', '/whey-proteine') -> '/whey-proteine'
 */
export function localizePath(locale: Locale, pathname: string): string {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!isPrefixedLocale(locale)) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}
