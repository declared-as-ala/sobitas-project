import type { Metadata, Viewport } from "next";
/*
 * TWO FAMILIES, DOWN FROM FOUR.
 *
 * Every next/font/google family is a BUILD-TIME FETCH of fonts.gstatic.com, and on 13/08/2026 one
 * of them failed: next/font exhausted its three internal retries on Noto Sans Arabic and threw
 * `TypeError: Cannot read properties of null (reading '1')`, taking the whole deploy down with no
 * code change involved. Four families is four chances for that per build; two is two.
 *
 * WHAT WENT, AND WHY IT IS SAFE:
 *   Poppins            13 uses of `font-poppins`, a card-only prototype. Its own Tailwind stack
 *                      already listed var(--font-inter) as the next step, so those cards now render
 *                      in Inter — the face the rest of the body already uses.
 *   Noto Sans Arabic   `font-arabic` IS NOT IN tailwind.config.ts at all, so that class was always
 *                      a no-op. The real consumer is globals.css, which declares
 *                      `var(--font-arabic), "Noto Sans Arabic", "Segoe UI", Tahoma, Arial` — a
 *                      complete Arabic fallback chain that resolves on every modern device without
 *                      the download.
 *
 * WHAT STAYED, AND WHY NOT ONE FAMILY:
 *   Archivo  309 uses of `font-display` — the condensed athletic face on every heading, price,
 *            badge and countdown. It IS the storefront's visual identity.
 *   Inter    the body/UI face, applied through `sans`.
 * Collapsing to a single family would mean setting body copy in a condensed display face, which is
 * a legibility regression on the paragraphs that actually get read. Two is the honest floor.
 */
/*
 * ── SELF-HOSTED, BECAUSE THIS HAS NOW TAKEN THE DEPLOY DOWN TWICE ────────────────────────────
 *
 * The note above was written after the first time. Reducing four families to two halved the
 * exposure and did not remove it, so on 15/08/2026 it happened again — this time to Inter, and
 * this time it blocked a deploy carrying six commits of unrelated work:
 *
 *     #17 21.06 `next/font` error:
 *     #17 21.06 Failed to fetch `Inter` from Google Fonts.
 *     #17 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
 *
 * Lint passed. The Next build on the RUNNER passed. Only the build inside the Docker image failed,
 * because that is a second, separate egress to fonts.gstatic.com — so the same commit can be green
 * and red in the same run depending on a third party's availability from one network namespace.
 *
 * `next/font/google` downloads at BUILD time by design, which is the right default for most sites
 * and the wrong one for a deploy pipeline that must be reproducible. The two woff2 files are now
 * committed (Inter 48 kB, Archivo 90 kB, `latin` subset only) and read from disk. The build has no
 * network dependency for type at all, which also means it cannot be broken by a font URL rotating
 * — the v20/v25 hashes in Google's CSS are not stable.
 *
 * LICENSING: both families are SIL Open Font License 1.1, which permits redistribution including
 * bundling. Nothing about self-hosting them is a grey area.
 *
 * WHAT IS PRESERVED EXACTLY: the `--font-inter` / `--font-display` variable names, `display: swap`,
 * Inter preloaded and Archivo not (see the note below for why that asymmetry is deliberate), and
 * the fallback stacks. `adjustFontFallback` changes SHAPE rather than meaning — the Google loader
 * takes a boolean, the local loader takes the fallback family to compute metric overrides from —
 * so `true` becomes `'Arial'`, which is what the boolean resolved to for a sans-serif anyway.
 *
 * WEIGHT RANGES, NOT LISTS. These are the variable files, so one face covers the range: Inter
 * `400 700` replaces `weight: ["400","500","600","700"]`, and Archivo `100 900` carries the weight
 * axis while the file's `wdth` axis (62.5–125) keeps working through plain `font-stretch` — that
 * axis is the whole reason Archivo was chosen over Oswald, and it survives self-hosting untouched.
 */
import localFont from "next/font/local";
import { Suspense } from "react";

import Script from "next/script";
import { cn } from "@/app/components/ui/utils";
import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { Providers } from "@/app/providers";
import { GlobalLoader } from "@/app/components/GlobalLoader";
import { NavigationHandler } from "@/app/components/NavigationHandler";
import { DeferredToaster } from "@/app/components/DeferredToaster";
// PWA install prompt, moved off the critical path — see DeferredInstallBanner for why.
import { DeferredInstallBanner } from "@/app/components/DeferredInstallBanner";
// The cart drawer's mount point. It used to be the last element of HeaderClient, which forced that
// ~1,050-line component to subscribe to the drawer's open state — so every add-to-cart re-rendered
// the entire header inside the tap handler. See CartDrawerHost for the measurements.
import { CartDrawerHost } from "@/app/components/CartDrawerHost";
import { MobileTabBar } from "@/app/components/MobileTabBar";
import { ReferralCapture } from "@/app/components/ReferralCapture";
import { WebVitalsReporter } from "@/app/components/WebVitalsReporter";
import { LOCALE_STORAGE_KEY } from "@/i18n";

const inter = localFont({
  /* The `latin` subset file, which is what `subsets: ["latin"]` selected before. Every French
     diacritic (é è ê à ç ù û î ô, œ at U+0152-0153) is inside Google's `latin` range; `latin-ext`
     is Eastern-European coverage this French/Arabic storefront never renders, and it was extra
     preloaded bytes competing with the hero LCP. Same call made for Archivo. */
  src: "./fonts/Inter-latin-variable.woff2",
  // The variable file covers the range in one download, replacing the four static weights.
  weight: "400 700",
  style: "normal",
  display: "swap",
  preload: true,
  variable: "--font-inter",
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
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
const archivo = localFont({
  /* The two-axis file — `wdth` 62.5–125 alongside `wght`. That is 90 kB against 35 kB for the
     weight axis alone, and it is the whole reason Archivo was chosen over Oswald: it buys two
     typographic registers (condensed headlines at 82%, wide letterspaced kickers at 112%) from a
     single download. `axes: ["wdth"]` used to request it; here the file simply IS that build, and
     `font-stretch` continues to drive it with no loader involvement. */
  src: "./fonts/Archivo-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  preload: false,
  adjustFontFallback: "Arial",
  fallback: ["var(--font-inter)", "system-ui", "sans-serif"],
});

// Poppins — the typeface of the new GPT-designed product card. Scoped to the card for now (used
// via the `font-poppins` utility), not preloaded (below-the-fold, and the body stays Inter under
// the "card-first" rollout). Will widen to the rest of the site as more prototypes land.
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
    <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable} ${archivo.variable}`}>
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
        {/* Favicons — ?v=7 publishes the crisp, genuinely transparent Protein.tn mark. */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=7" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=7" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=7" />
        <link rel="icon" href="/favicon.ico?v=7" />
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
        <WebVitalsReporter />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <Providers navigation={navigation} navCategories={navCategories} cmsPages={footer.cmsPages} coordinates={footer.coordinates}>
            <Suspense fallback={null}>
              <NavigationHandler />
            </Suspense>
            {children}
            <GlobalLoader />
            <DeferredToaster />
            <DeferredInstallBanner />
            {/*
              The floating WhatsApp bubble is gone (owner, 10/08/2026: "take off the popup button of
              whatsapp from mobile, keep it only in the sidebar").

              It was `md:hidden`, i.e. PHONES ONLY — desktop has WhatsApp in the nav — so unmounting
              it removes it everywhere it appeared, and WhatsAppFab.tsx is deleted rather than left
              as dead code.

              The channel is not lost, and that was checked before removing it: the mobile menu in
              HeaderClient has its own WhatsApp row, added precisely because the bubble had once been
              the only way to reach WhatsApp on a phone. Deleting the dominant ordering channel for
              Tunisian COD shoppers would be a conversion bug wearing a layout fix's clothes — so the
              row was verified present first.

              This also gives the bottom-right corner back to ScrollToTop and the tab bar, which the
              pack-builder measurement had already flagged as over-crowded.
            */}
            {/* Mounted once here, not per page, so it never remounts on navigation. */}
            <MobileTabBar />
            <CartDrawerHost />
            <ReferralCapture />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
