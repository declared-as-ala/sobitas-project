import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
  adjustFontFallback: true,
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn'),
  title: {
    default: "Proteine Tunisie | Whey, Créatine & Compléments",
    template: "%s | Proteine Tunisie"
  },
  description: "Proteine Tunisie : whey protein, créatine et compléments alimentaires. Livraison rapide à travers toute la Tunisie sur protein.tn.",
  keywords: [
    "proteine tunisie",
    "protein tunisie",
    "whey tunisie",
    "whey protein",
    "whey proteine tunisie",
    "protéine whey tunisie",
    "créatine tunisie",
    "créatine monohydrate tunisie",
    "gainer tunisie",
    "mass gainer tunisie",
    "BCAA tunisie",
    "oméga 3 tunisie",
    "meilleure whey tunisie",
    "prix protéine tunisie",
    "prix whey tunisie",
    "acheter protéine tunisie",
    "achat protéine tunisie",
    "où acheter protéine en tunisie",
    "proteine pas cher tunisie",
    "proteine en ligne tunisie",
    "proteine musculation tunisie",
    "proteine isolate tunisie",
    "proteine vegan tunisie",
    "complément alimentaire tunisie",
    "nutrition sportive tunisie"
  ],
  authors: [{ name: "Proteine Tunisie" }],
  creator: "Proteine Tunisie",
  publisher: "Proteine Tunisie",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://protein.tn",
    siteName: "Proteine Tunisie",
    title: "Proteine Tunisie",
    description: "Proteine Tunisie : whey protein, créatine et compléments alimentaires avec livraison rapide partout en Tunisie sur protein.tn.",
    images: [
      {
        url: "/favicon-512x512.png",
        width: 512,
        height: 512,
        alt: "Proteine Tunisie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Proteine Tunisie",
    description: "Proteine Tunisie : whey protein, créatine et compléments alimentaires avec livraison rapide partout en Tunisie sur protein.tn.",
    images: ["/favicon-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  const { buildOrganizationSchema, buildLocalBusinessSchema, buildWebSiteSchema } = await import('@/util/structuredData');
  const orgSchema = buildOrganizationSchema(baseUrl);
  const localBusinessSchema = buildLocalBusinessSchema(baseUrl);
  const websiteSchema = buildWebSiteSchema(baseUrl);

  return (
    <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#dc2626" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Proteine Tunisie" />
        <meta property="og:site_name" content="Proteine Tunisie" />
        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" />
        {/* Manifest for PWA and Android support */}
        <link rel="manifest" href="/site.webmanifest" />
        {/* Preconnect for image/storage origin – same default as api.ts to avoid hydration mismatch */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'https://admin.protein.tn'} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'https://admin.protein.tn'} />
        {/* Preload LCP hero image (Next/Image will request /_next/image?url=…; this warms cache) */}

        {/* Structured data: Organization + LocalBusiness + WebSite for SEO (Tunisia local & rich results) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      </head>
      <body className={cn("min-h-screen font-sans antialiased")}>
        {/* Google tag (gtag.js) — deferred with afterInteractive to avoid blocking FCP */}
        {/* Register service worker for PWA install support */}
        <Script id="register-sw" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(() => {}); }`}
        </Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-0J0J27JZ7D" strategy="lazyOnload" />
        <Script id="gtag-init" strategy="lazyOnload">
          {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-0J0J27JZ7D', { send_page_view: false });`}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <Providers>
            <Suspense fallback={null}>
              <NavigationHandler />
            </Suspense>
            {children}
            <GlobalLoader />
            <DeferredToaster />
            <InstallAppBanner />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
