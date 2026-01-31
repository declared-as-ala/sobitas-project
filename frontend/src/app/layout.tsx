import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { CartProvider } from "@/app/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

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
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  title: {
    default: "Protéine Tunisie | Whey, Créatine & Compléments – SOBITAS Sousse",
    template: "%s | SOBITAS Tunisie"
  },
  description: "Boutique officielle de protéines et compléments alimentaires en Tunisie. Whey, créatine, gainer, BCAA. Livraison Sousse, Tunis et toute la Tunisie.",
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
    title: "Sobitas - Protéine Tunisie",
    description: "Découvrez notre boutique de protéines en Tunisie : whey, créatine, gainer, BCAA et plus !",
    images: [
      {
        url: "https://sobitas.tn/assets/img/logo/logo.webp",
        width: 1200,
        height: 630,
        alt: "Sobitas - Protéine Tunisie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sobitas - Protéine Tunisie",
    description: "Découvrez notre boutique de protéines en Tunisie : whey, créatine, gainer, BCAA et plus !",
    images: ["https://sobitas.tn/assets/img/logo/logo.webp"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SOBITAS',
    url: baseUrl,
    logo: `${baseUrl}/icon.png`,
    description: 'Distributeur officiel de protéines et compléments alimentaires en Tunisie. Whey, créatine, gainer, BCAA à Sousse. Livraison Tunis, Sousse et toute la Tunisie.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rue Rihab',
      addressLocality: 'Sousse',
      postalCode: '4000',
      addressCountry: 'TN',
    },
    telephone: '+21627612500',
    email: 'contact@protein.tn',
    sameAs: [
      'https://www.facebook.com/sobitass/',
      'https://www.instagram.com/sobitass/',
      'https://twitter.com/TunisieProteine',
      'https://www.tiktok.com/@sobitassousse',
    ],
  };
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/#localbusiness`,
    name: 'SOBITAS – Protéines & Compléments Alimentaires Tunisie',
    image: `${baseUrl}/icon.png`,
    url: baseUrl,
    telephone: '+21627612500',
    email: 'contact@protein.tn',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rue Rihab',
      addressLocality: 'Sousse',
      postalCode: '4000',
      addressCountry: 'TN',
    },
    priceRange: '$$',
    openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '19:00' },
  };
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SOBITAS – Protéine Tunisie',
    url: baseUrl,
    description: 'Boutique de protéines, whey, créatine et compléments alimentaires en Tunisie. Livraison Sousse, Tunis.',
    publisher: { '@type': 'Organization', name: 'SOBITAS' },
    inLanguage: 'fr-TN',
  };

  return (
    <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Preconnect first for LCP/PageSpeed – image API origin */}
        <link rel="preconnect" href="https://admin.protein.tn" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://admin.protein.tn" />
        {/* Preload LCP hero image (Next/Image will request /_next/image?url=…; this warms cache) */}
        <link rel="preload" as="image" href="/hero/webp/hero1.webp" fetchPriority="high" />
        {/* Structured data: Organization + LocalBusiness + WebSite for SEO (Tunisia local & rich results) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <CartProvider>
              {children}
              <Toaster position="top-center" richColors className="sonner-toaster" />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
