import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { CartProvider } from "@/app/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { GlobalLoader } from "@/app/components/GlobalLoader";
import { NavigationHandler } from "@/app/components/NavigationHandler";
import { DeferredToaster } from "@/app/components/DeferredToaster";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
  adjustFontFallback: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn'),
  icons: {
    icon: [
      { url: '/icon.png', sizes: 'any' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/icon.png',
  },
  title: {
    default: "Proteine Tunisie – N°1 Whey, Creatine & Livraison | SOBITAS Protein.tn",
    template: "%s | Protein.tn"
  },
  description: "Proteine Tunisie : whey protein, creatine et compléments. Livraison rapide Sousse, Tunis, Sfax. Meilleur prix proteine tunisie – SOBITAS.",
  keywords: [
    "proteine tunisie",
    "protein tunisie",
    "whey protein",
    "whey proteine tunisie",
    "protéine whey tunisie",
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
    "créatine monohydrate effet secondaire",
    "comment prendre créatine",
    "proteine pas cher tunisie",
    "proteine en ligne tunisie",
    "proteine musculation tunisie",
    "proteine isolate tunisie",
    "proteine vegan tunisie"
  ],
  authors: [{ name: "SOBITAS" }],
  creator: "SOBITAS",
  publisher: "SOBITAS",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://sobitas.tn",
    siteName: "Sobitas",
    title: "Proteine Tunisie – N°1 Whey, Creatine & Livraison | SOBITAS Protein.tn",
    description: "Proteine Tunisie : whey protein, creatine et compléments. Livraison rapide Sousse, Tunis, Sfax. Meilleur prix – SOBITAS.",
    images: [
      {
        url: "/icon.png", // Fixed: Use local icon instead of broken external path
        width: 512,
        height: 512,
        alt: "Sobitas - Protéine Tunisie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Proteine Tunisie – N°1 Whey, Creatine & Livraison | SOBITAS Protein.tn",
    description: "Proteine Tunisie : whey protein, creatine et compléments. Livraison rapide Sousse, Tunis, Sfax. Meilleur prix – SOBITAS.",
    images: ["/icon.png"],
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
    // Add Google Search Console verification if available
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';
  const { buildOrganizationSchema, buildLocalBusinessSchema, buildWebSiteSchema } = await import('@/util/structuredData');
  const orgSchema = buildOrganizationSchema(baseUrl);
  const localBusinessSchema = buildLocalBusinessSchema(baseUrl);
  const websiteSchema = buildWebSiteSchema(baseUrl);

  return (
    <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Favicon and Icons for Google Search Results */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        {/* Preconnect for image/storage origin – speeds up product images, slider, logo */}
        <link rel="preconnect" href="https://admin.protein.tn" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://admin.protein.tn" />
        {/* Preload LCP hero image (Next/Image will request /_next/image?url=…; this warms cache) */}

        {/* Structured data: Organization + LocalBusiness + WebSite for SEO (Tunisia local & rich results) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      </head>
      <body className={inter.className}>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0J0J27JZ7D"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-0J0J27JZ7D');
          `}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LoadingProvider>
            <AuthProvider>
              <CartProvider>
                <Suspense fallback={null}>
                  <NavigationHandler />
                </Suspense>
                {children}
                <GlobalLoader />
                <DeferredToaster />
              </CartProvider>
            </AuthProvider>
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
