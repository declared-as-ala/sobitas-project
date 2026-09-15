import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, isLocale, type Locale } from './index';

/**
 * next-intl request configuration — the MESSAGE layer only.
 *
 * We deliberately do NOT use next-intl's routing middleware: the existing 1,138-line SEO
 * middleware owns the single middleware slot (301/410/canonical/x-crawler rewrites) and resolves
 * the locale itself, passing it in through the `[locale]` route segment + `setRequestLocale`.
 * This config just turns the resolved locale into the right message catalog.
 *
 * Until the `[locale]` route tree lands (Phase 1 route move), `requestLocale` is undefined and we
 * fall back to the default (fr) — so the app keeps building and behaving as French-only.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
