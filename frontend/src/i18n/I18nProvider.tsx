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
import { ar } from './locales/ar';
import { en } from './locales/en';
import { fr, type TranslationKey } from './locales/fr';
import { legacyArabic, legacyArabicPatterns } from './legacy-ar';
import { legacyEnglish, legacyEnglishPatterns } from './legacy-en';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  MULTILOCALE_ENABLED,
  getLocaleDirection,
  isLocale,
  type Locale,
} from '.';
import { getArabicSeo } from './seo-ar';
import { getEnglishSeo } from './seo-en';

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
// French is the only client locale today (MULTILOCALE_ENABLED === false), so only the French
// dictionary needs to ship. en/ar (+ the legacy/seo maps used below) are referenced ONLY inside
// `if (MULTILOCALE_ENABLED)` guards — a compile-time `false` — so the production build tree-shakes
// ~30KB of unused translation data off every page's first-load JS. They stay in the repo for the
// future server-side i18n rework.
const dictionaries: Partial<Record<Locale, typeof fr>> = { fr };
if (MULTILOCALE_ENABLED) {
  Object.assign(dictionaries, { en, ar });
}
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

  const legacy = locale === 'ar' ? legacyArabic : locale === 'en' ? legacyEnglish : {};
  const patterns = locale === 'ar' ? legacyArabicPatterns : locale === 'en' ? legacyEnglishPatterns : [];
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

  useEffect(() => {
    if (!MULTILOCALE_ENABLED || locale === 'fr') return;
    const seo = locale === 'ar' ? getArabicSeo(pathname) : getEnglishSeo(pathname);
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
