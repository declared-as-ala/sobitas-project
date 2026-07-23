import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic, Archivo } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
import { cn } from "@/app/components/ui/utils";
import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { Providers } from "@/app/providers";
import { GlobalLoader } from "@/app/components/GlobalLoader";
import { NavigationHandler } from "@/app/components/NavigationHandler";
import { DeferredToaster } from "@/app/components/DeferredToaster";
import { InstallAppBanner } from "@/app/components/InstallAppBanner";
import { WhatsAppFab } from "@/app/components/WhatsAppFab";
import { MobileTabBar } from "@/app/components/MobileTabBar";
import { LOCALE_STORAGE_KEY } from "@/i18n";

const inter = Inter({
  // `latin` only: every French diacritic (é è ê à ç ù û î ô, œ at U+0152-0153) is in Google's
  // `latin` range. `latin-ext` is Eastern-European coverage this French/Arabic storefront never
  // renders, and it was extra preloaded Inter bytes competing with the hero LCP. Same call made
  // for Archivo.
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
  adjustFontFallback: true,
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-arabic",
  // The site default is French; the Arabic subset must NOT be preloaded on every page
  // (it added ~4 render-blocking font requests to a French-default site). It is still
  // applied via the CSS variable when the user switches to Arabic (dir=rtl).
  preload: false,
});

/**
 * Display face for headings/prices/badges/countdowns (body stays Inter).
 *
 * Archivo, not Oswald. Oswald is the default "athletic condensed" — it is on thousands of gym
 * and supplement sites, so it reads as a category cliché rather than as us. Archivo is a
 * grotesque with a real WIDTH axis (62.5–125) alongside weight, which buys two typographic
 * registers from ONE variable file:
 *   - headlines set tight/condensed (`font-stretch: 82%`) for athletic compression
 *   - kickers and nav set wide + letterspaced (`font-stretch: 112%`) for the editorial feel
 * Oswald could only ever do the first, which is why every section on the site looked the same
 * weight and the same width.
 *
 * PAYLOAD — measured, not assumed. A 2-axis variable font is NOT free: with `subsets: ["latin",
 * "latin-ext"]` Archivo contributed 176 kB of PRELOADED font against Oswald's 40 kB. Narrowing to
 * `latin` halves that, and costs nothing: every French diacritic (é è ê à ç ù û î ô, and œ at
 * U+0152-0153) is inside Google's `latin` range: U+0000-00FF plus those pairs. `latin-ext` is
 * Eastern-European coverage this storefront never renders.
 *
 * Note precisely what `subsets` does: it controls which subsets are PRELOADED, not which files
 * are emitted. next/font still writes a woff2 per subset into .next/static/media; the others are
 * simply never fetched. The 176 -> 90 kB figure is preloaded bytes, which is the number that
 * affects the critical path.
 *
 * NOT PRELOADED — and this is a net win over the Oswald it replaces, which WAS preloaded.
 * Measured on fonts.googleapis.com: Archivo latin is 34.9 kB with the weight axis alone and
 * 90.1 kB with the width axis added, so the design costs +55 kB. Putting that on the critical
 * path would be indefensible on a mobile-first Tunisian storefront. It does not belong there
 * anyway: the LCP element is the hero IMAGE, so preloading a display face only makes it compete
 * with the LCP resource for bandwidth. Dropping the preload removes Oswald's 40 kB from the
 * critical path and buys the width axis for free.
 *
 * The swap is safe against CLS specifically because the hero copy is absolutely positioned
 * inside a FIXED-height hero frame (see Hero.tsx), so re-flowing that text cannot move anything.
 * Section headings further down do re-flow slightly, but they are outside the viewport at load
 * and CLS only scores shifts that are actually on screen.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-display",
  preload: false,
  adjustFontFallback: true,
  fallback: ["var(--font-inter)", "system-ui", "sans-serif"],
});

const SITE_TITLE_DEFAULT =
  'Protéine Tunisie | Whey, Créatine & Compléments en Tunisie';
const SITE_DESCRIPTION =
  'Achetez whey protein, créatine, vitamines et compléments alimentaires en Tunisie avec livraison rapide et produits authentiques.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn'),
  applicationName: 'Protéine Tunisie',
  title: {
    default: SITE_TITLE_DEFAULT,
    template: '%s | Protéine Tunisie',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'protéine tunisie',
    'proteine tunisie',
    'whey tunisie',
    'whey protein tunisie',
    'créatine tunisie',
    'créatine monohydrate tunisie',
    'compléments alimentaires tunisie',
    'vitamines tunisie',
    'gainer tunisie',
    'mass gainer tunisie',
    'BCAA tunisie',
    'oméga 3 tunisie',
    'nutrition sportive tunisie',
    'acheter protéine tunisie',
    'meilleure whey tunisie',
    'prix whey tunisie',
    'protein tunisie',
    'protein.tn',
  ],
  authors: [{ name: 'Protéine Tunisie' }],
  creator: 'Protéine Tunisie',
  publisher: 'Protéine Tunisie',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://protein.tn',
    siteName: 'Protéine Tunisie',
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [
      {
        // Was '/og-banner.jpg', which does not exist in /public → every share/preview 404'd.
        // Point at the real optimized hero until a purpose-built 1200×630 banner is designed.
        url: '/og-banner.jpg',
        width: 1200,
        height: 630,
        alt: 'Protéine Tunisie — whey, créatine et compléments en Tunisie',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: ['/og-banner.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || process.env.GOOGLE_SITE_VERIFICATION,
  },
};

/**
 * Site-wide viewport. `viewportFit: 'cover'` is what makes `env(safe-area-inset-*)`
 * resolve to real values on notched devices — without it the insets are always 0px.
 *
 * Every fixed-bottom element in the app (cart CTA, checkout CTA, PDP add-to-cart bar and
 * its skeleton twin, install banner, ScrollToTop, WhatsApp FAB) is ALREADY written against
 * `env(safe-area-inset-bottom)`, so this activates padding they were built to expect and
 * lets their backgrounds bleed to the physical screen edge instead of stopping short.
 * It is also a hard prerequisite for the mobile tab bar.
 *
 * `maximumScale: 5` is kept from the previous per-page viewport — never set it to 1,
 * that blocks pinch-zoom and is an accessibility failure.
 */
export function generateViewport(): Viewport {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    viewportFit: 'cover',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  const { buildOrganizationSchema, buildLocalBusinessSchema, buildWebSiteSchema, buildSiteNavigationSchema, parseStoreRating } = await import('@/util/structuredData');
  // Server-fetch the header nav + categories mega-menu ONCE (Next Data Cache, shared across all
  // routes, 10-min revalidate) so the navbar is correct in the SSR HTML — no more first-paint
  // "NOS PRODUITS" → "BOUTIQUE" label swap, and 3 fewer client API calls on every page view.
  const { getServerNavigation, getServerNavCategories, getServerFooter } = await import('@/services/siteChrome.server');
  const [navigation, navCategories, footer] = await Promise.all([
    getServerNavigation(),
    getServerNavCategories(),
    getServerFooter(),
  ]);
  // Store/seller rating is emitted ONLY from a real, operator-supplied aggregate (Google Business /
  // Facebook / Google Customer Reviews). Unset → no aggregateRating (never fabricated).
  const storeRating = parseStoreRating(
    process.env.NEXT_PUBLIC_STORE_RATING_VALUE,
    process.env.NEXT_PUBLIC_STORE_RATING_COUNT
  );
  const orgSchema = buildOrganizationSchema(baseUrl, { rating: storeRating });
  const localBusinessSchema = buildLocalBusinessSchema(baseUrl);
  const websiteSchema = buildWebSiteSchema(baseUrl);
  const siteNavigationSchema = buildSiteNavigationSchema(baseUrl);

  return (
    <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable} ${notoArabic.variable} ${archivo.variable}`}>
      <head>
        {/* Anti-FOUC: set lang/dir from the persisted locale BEFORE first paint. Must read the
            same key I18nProvider writes (LOCALE_STORAGE_KEY = 'sobitas-locale'); it previously
            hardcoded the wrong 'protein-locale', so this was dead code and ar/en users got a
            French-LTR flash + a half-flipped mixed render before hydration. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `try{var l=localStorage.getItem('${LOCALE_STORAGE_KEY}');if(l==='fr'||l==='en'||l==='ar'){document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';document.documentElement.dataset.locale=l}}catch(e){}`,
          }}
        />
        {/* Brand orange — must stay in sync with --c-brand in styles/tokens.css.
            This tints the mobile browser chrome, so a stale value here is very visible. */}
        <meta name="theme-color" content="#D53B04" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Protéine Tunisie" />
        {/* Favicons — ?v=6 busts the year-long Cloudflare/browser cache (official Protein.tn logo, from favi/) */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=6" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=6" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=6" />
        <link rel="icon" href="/favicon.ico?v=6" />
        {/* Manifest for PWA and Android support */}
        <link rel="manifest" href="/site.webmanifest" />
        {/* Preconnect to image/storage origin and Google Fonts CDN */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'https://admin.protein.tn'} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'https://admin.protein.tn'} />
        {/* Preconnect GTM/GA so the lazyOnload scripts resolve faster when they fire */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        {/* (Removed a self-origin `preconnect` to baseUrl: the document is already on that origin,
            so it only opened a second, unused CORS socket that same-origin subresources can't
            reuse — pure overhead on the critical path.) */}

        {/* Structured data: Organization + LocalBusiness + WebSite for SEO (Tunisia local & rich results) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationSchema) }} />
        {/* NOTE: Removed <link rel="prerender"> hints. The legacy `prerender` hint is deprecated
            (superseded by the Speculation Rules API) and it eagerly downloaded three full pages
            on every single page load — wasted bandwidth that hurt Core Web Vitals for no gain. */}
      </head>
      <body className={cn("min-h-screen font-sans antialiased")}>
        {/* Google tag (gtag.js) — deferred with afterInteractive to avoid blocking FCP */}
        {/* Register service worker for PWA install support */}
        <Script id="register-sw" strategy="lazyOnload">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(() => {}); }`}
        </Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-0J0J27JZ7D" strategy="lazyOnload" />
        <Script id="gtag-init" strategy="lazyOnload">
          {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-0J0J27JZ7D', { send_page_view: false });`}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <Providers navigation={navigation} navCategories={navCategories} cmsPages={footer.cmsPages} coordinates={footer.coordinates}>
            <Suspense fallback={null}>
              <NavigationHandler />
            </Suspense>
            {children}
            <GlobalLoader />
            <DeferredToaster />
            <InstallAppBanner />
            <WhatsAppFab />
            {/* Mounted once here, not per page, so it never remounts on navigation. */}
            <MobileTabBar />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
