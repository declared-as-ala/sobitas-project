import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic, Oswald } from "next/font/google";
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
  subsets: ["latin", "latin-ext"],
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

// Athletic condensed display face for headings/prices/badges/countdowns (body stays Inter).
// Only 2 weights + latin-ext (French diacritics) to protect the mobile LCP budget.
const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-display",
  preload: true,
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
    <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable} ${notoArabic.variable} ${oswald.variable}`}>
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
        {/* Brand red — must stay in sync with --c-brand in styles/tokens.css.
            This tints the mobile browser chrome, so a stale value here is very visible. */}
        <meta name="theme-color" content="#E01B24" />
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
        {/* Hint for API proxy used on first navigation */}
        <link rel="preconnect" href={baseUrl} crossOrigin="anonymous" />

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
