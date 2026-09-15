import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, type Locale } from './index';

/**
 * next-intl request configuration — the MESSAGE layer only.
 *
 * We deliberately do NOT use next-intl's routing middleware: the existing 1,138-line SEO middleware
 * owns the single middleware slot (301/410/canonical/x-crawler rewrites) and resolves the locale
 * itself. It negotiates the locale from the URL prefix (`/en`, `/ar`; French is unprefixed at the
 * root) and passes it down to the render via the `x-locale` REQUEST header
 * (`NextResponse.next/rewrite({ request: { headers } })`). This config just turns that resolved
 * locale into the right message catalog.
 *
 * Reading `headers()` here opts every route that renders translated chrome into dynamic rendering.
 * That is deliberate and cheap on this codebase: the money routes (`[slug]`, category, shop,
 * product) are ALREADY `ƒ` dynamic (they traded their HTML cache for `?page=N`, keeping only a data
 * cache — see the docblock in `app/(shop)/[slug]/page.tsx`), so no ISR is lost there. A handful of
 * low-traffic static pages (contact/faq/about) become dynamic but keep their data cache.
 *
 * When the header is absent — a build-time render, `generateStaticParams`, or a plain French
 * request the middleware left unprefixed — we fall back to the default (fr), so the app keeps
 * building and behaving as French-only.
 */
export default getRequestConfig(async () => {
  const requested = (await headers()).get('x-locale');
  const locale: Locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
