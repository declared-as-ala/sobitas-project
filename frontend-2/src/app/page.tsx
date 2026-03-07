import { Metadata } from 'next';
import { getAccueil } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { HomePageClient } from './components/HomePageClient';
import type { AccueilData } from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl('/');
  const title = 'Protéine Tunisie | Whey, Créatine & Compléments – SOBITAS';
  const description =
    'Protéine Tunisie : whey protein, créatine et compléments alimentaires. Livraison rapide à Sousse, Tunis, Sfax et partout en Tunisie avec SOBITAS sur Protein.tn.';

  return {
    title,
    description,
    keywords:
      'proteine tunisie, protein tunisie, whey tunisie, whey protein tunisie, créatine tunisie, complément alimentaire tunisie, nutrition sportive tunisie, protéine musculation Tunisie',
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      title,
      description,
      images: ['/assets/img/logo/logo.webp'],
      url: canonical,
      type: 'website',
    },
    other: {},
  };
}

// ISR: revalidate every 60s to reduce server load and TTFB
export const revalidate = 60;

// Preload critical hero image for LCP optimization
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  };
}

async function getHomeData(): Promise<{ accueil: AccueilData }> {
  try {
    const accueil = await getAccueil();
    return { accueil };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {
      accueil: {
        categories: [],
        last_articles: [],
        ventes_flash: [],
        new_product: [],
        packs: [],
        best_sellers: [],
      },
    };
  }
}

export default async function Home() {
  const { accueil } = await getHomeData();

  return (
    <>
      {/* Preload static hero images for LCP: mobile and web */}
      <link rel="preload" as="image" href="/MobileSlider.png" fetchPriority="high" media="(max-width: 767px)" />
      <link rel="preload" as="image" href="/WEBSlider.png" fetchPriority="high" media="(min-width: 768px)" />
      <HomePageClient accueil={accueil} staticHero />
    </>
  );
}
