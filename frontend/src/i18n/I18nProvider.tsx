'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { fr, type TranslationKey } from './locales/fr';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  MULTILOCALE_ENABLED,
  getLocaleDirection,
  isLocale,
  type Locale,
} from '.';
/**
 * NON-FRENCH DATA IS LOADED ON DEMAND, NOT IMPORTED.
 *
 * These modules — locales/ar, locales/en, legacy-ar (15 kB), legacy-en (7 kB), seo-ar, seo-en —
 * used to be static imports, and a comment here asserted the build tree-shook them away because
 * every use sits behind `MULTILOCALE_ENABLED`, a compile-time `false`.
 *
 * It did not. Scanning the built client chunks for Arabic codepoints found the dictionaries in
 * 7065 (31 kB) and 7742 (76 kB), and the network trace shows BOTH loading before FCP. Every
 * French visitor was paying for Arabic and English on a site running in French-only mode.
 *
 * Nor does narrowing the flag's type help: TypeScript types are erased, so `const X: boolean =
 * false` and `const X = false` emit identical JavaScript — verified, same chunk hashes.
 *
 * `import()` is the only mechanism that guarantees a separate chunk regardless of what the
 * minifier can prove. With MULTILOCALE_ENABLED false these are never fetched at all; if it is
 * ever switched on, they arrive the first time a non-French locale is chosen and translation
 * falls back to French for the few hundred milliseconds in between — which is exactly the
 * behaviour the feature already has on first paint.
 */
type LegacyTable = {
  dict: Record<string, string>;
  patterns: ReadonlyArray<readonly [RegExp, string]>;
};

const EMPTY_LEGACY: LegacyTable = { dict: {}, patterns: [] };

/** Shape the SEO modules return; kept explicit here because they are no longer statically typed
 *  through a direct import. */
type LocalizedSeo = { title: string; description: string } | null | undefined;

const legacyTables: Partial<Record<Locale, LegacyTable>> = {};
let seoLoaders: { ar: (p: string) => LocalizedSeo; en: (p: string) => LocalizedSeo } | null = null;

/** Fetch the AR/EN payloads for `locale`. No-op for French, and for an already-loaded locale. */
async function loadLocaleAssets(locale: Locale): Promise<void> {
  if (!MULTILOCALE_ENABLED || locale === 'fr') return;

  if (!dictionaries[locale]) {
    const mod = locale === 'ar' ? await import('./locales/ar') : await import('./locales/en');
    dictionaries[locale] = locale === 'ar' ? (mod as { ar: typeof fr }).ar : (mod as { en: typeof fr }).en;
  }

  if (!legacyTables[locale]) {
    if (locale === 'ar') {
      const m = await import('./legacy-ar');
      legacyTables.ar = { dict: m.legacyArabic, patterns: m.legacyArabicPatterns };
    } else {
      const m = await import('./legacy-en');
      legacyTables.en = { dict: m.legacyEnglish, patterns: m.legacyEnglishPatterns };
    }
  }

  if (!seoLoaders) {
    const [arSeo, enSeo] = await Promise.all([import('./seo-ar'), import('./seo-en')]);
    seoLoaders = { ar: arSeo.getArabicSeo, en: enSeo.getEnglishSeo };
  }
}

type Values = Record<string, string | number>;

type I18nValue = {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Values) => string;
  translateLegacy: (text: string) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);
// French is the only dictionary that ships. ar/en are added by loadLocaleAssets() on demand —
// see the note above it for why the previous "it tree-shakes" claim was measurably wrong.
const dictionaries: Partial<Record<Locale, typeof fr>> = { fr };
const translatedNodes = new WeakMap<Text, string>();
const translatedAttributes = new WeakMap<Element, Map<string, string>>();
const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'NOSCRIPT']);

function interpolate(text: string, values?: Values): string {
  if (!values) return text;
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    text,
  );
}

function translateLegacyText(text: string, locale: Locale): string {
  // French-only today: identity translation. This early return makes the legacy-ar/legacy-en maps
  // unreachable (compile-time), so they tree-shake out of the client bundle.
  if (!MULTILOCALE_ENABLED) return text;
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const clean = text.trim();
  if (!clean) return text;

  // Falls back to the French source text until the chunk resolves — see loadLocaleAssets.
  const table = legacyTables[locale] ?? EMPTY_LEGACY;
  const legacy = table.dict;
  const patterns = table.patterns;
  const exact = legacy[clean] ?? legacy[clean.toLocaleUpperCase('fr-FR')];
  if (exact) return `${leading}${exact}${trailing}`;

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(clean)) return `${leading}${clean.replace(pattern, replacement)}${trailing}`;
  }
  return text;
}

function shouldTranslateNode(node: Text): boolean {
  const parent = node.parentElement;
  return Boolean(parent && !SKIP_TAGS.has(parent.tagName) && !parent.closest('[data-i18n-skip]'));
}

function restoreTree(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const original = translatedNodes.get(node);
    if (original !== undefined) {
      node.nodeValue = original;
      translatedNodes.delete(node);
    }
    node = walker.nextNode() as Text | null;
  }

  const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : root.querySelectorAll('*');
  for (const element of elements) {
    const originals = translatedAttributes.get(element);
    if (!originals) continue;
    originals.forEach((value, attribute) => element.setAttribute(attribute, value));
    translatedAttributes.delete(element);
  }
}

function translateTree(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (shouldTranslateNode(node)) {
      const original = translatedNodes.get(node) ?? node.nodeValue ?? '';
      const translated = translateLegacyText(original, locale);
      if (translated !== original && node.nodeValue !== translated) {
        translatedNodes.set(node, original);
        node.nodeValue = translated;
      }
    }
    node = walker.nextNode() as Text | null;
  }

  const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : root.querySelectorAll('*');
  for (const element of elements) {
    if (element.closest('[data-i18n-skip]')) continue;
    for (const attribute of ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const originals = translatedAttributes.get(element) ?? new Map<string, string>();
      const original = originals.get(attribute) ?? current;
      const translated = translateLegacyText(original, locale);
      if (translated !== original) {
        originals.set(attribute, original);
        translatedAttributes.set(element, originals);
        element.setAttribute(attribute, translated);
      }
    }
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  // Bumped when a lazily-loaded locale chunk arrives, so text already on screen re-translates.
  // Stays at 0 forever while MULTILOCALE_ENABLED is false — loadLocaleAssets returns immediately.
  const [, setAssetsVersion] = useState(0);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (!MULTILOCALE_ENABLED) {
      // French-only: forget any persisted ar/en so the whole app (incl. the API locale param)
      // stays French. No translation pass runs while locale === 'fr'.
      try { localStorage.removeItem(LOCALE_STORAGE_KEY); } catch { /* ignore */ }
      return;
    }
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const translateLegacy = useCallback(
    (text: string) => translateLegacyText(text, locale),
    [locale],
  );

  useEffect(() => {
    const dir = getLocaleDirection(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.documentElement.dataset.locale = locale;
    document.body.dir = dir;

    observerRef.current?.disconnect();
    restoreTree(document.body);

    if (locale !== 'fr') {
      translateTree(document.body, locale);
      observerRef.current = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'characterData' && mutation.target instanceof Text) {
            translateTree(mutation.target.parentNode ?? document.body, locale);
          }
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element || node instanceof DocumentFragment) translateTree(node, locale);
            if (node instanceof Text && node.parentNode) translateTree(node.parentNode, locale);
          });
        }
      });
      observerRef.current.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    return () => observerRef.current?.disconnect();
  }, [locale]);

  // Pull the AR/EN chunks in as soon as a non-French locale is active. No-op while
  // MULTILOCALE_ENABLED is false, which is why none of that data reaches a French visitor.
  useEffect(() => {
    let cancelled = false;
    void loadLocaleAssets(locale).then(() => {
      // Re-render so the freshly loaded dictionary is applied to already-rendered text.
      if (!cancelled) setAssetsVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (!MULTILOCALE_ENABLED || locale === 'fr') return;
    const seo = seoLoaders ? (locale === 'ar' ? seoLoaders.ar(pathname) : seoLoaders.en(pathname)) : null;
    if (!seo) return;
    const applySeo = () => {
      if (document.title !== seo.title) document.title = seo.title;
      const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (description && description.content !== seo.description) description.content = seo.description;
      document.querySelectorAll<HTMLMetaElement>('meta[property="og:locale"]').forEach((meta) => {
        const openGraphLocale = locale === 'ar' ? 'ar_TN' : 'en_US';
        if (meta.content !== openGraphLocale) meta.content = openGraphLocale;
      });
    };
    applySeo();
    const headObserver = new MutationObserver(applySeo);
    headObserver.observe(document.head, { childList: true, subtree: true, attributes: true });
    return () => headObserver.disconnect();
  }, [locale, pathname]);

  const value = useMemo<I18nValue>(() => {
    const intlLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-TN' : 'fr-TN';
    return {
      locale,
      dir: getLocaleDirection(locale),
      setLocale,
      t: (key, values) => interpolate(dictionaries[locale]?.[key] ?? fr[key] ?? key, values),
      translateLegacy,
      formatDate: (value, options) =>
        new Intl.DateTimeFormat(intlLocale, options ?? { dateStyle: 'medium' }).format(new Date(value)),
      formatNumber: (number, options) => new Intl.NumberFormat(intlLocale, options).format(number),
      formatCurrency: (number, currency = 'TND') =>
        new Intl.NumberFormat(intlLocale, { style: 'currency', currency }).format(number),
    };
  }, [locale, setLocale, translateLegacy]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
