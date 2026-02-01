import { Metadata } from 'next';
import { getAccueil, getSlides } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { HomePageClient } from './components/HomePageClient';
import type { AccueilData } from '@/types';

export const metadata: Metadata = {
  title: 'Protein Tunisie – Whey Protein, Creatine & Sobitas Premium | Protein.tn',
  description: 'Découvrez la meilleure proteine en Tunisie avec Sobitas : whey protein, creatine, BCAA et compléments certifiés premium. Livraison rapide et prix compétitifs. Commandez maintenant sur Protein.tn.',
  keywords: 'proteine tunisie, whey Tunisie, créatine Tunisie, compléments alimentaires Sousse, compléments alimentaires Tunis, acheter whey Tunisie, protéine musculation Tunisie',
  openGraph: {
    title: 'Protein Tunisie – Whey Protein, Creatine & Sobitas Premium | Protein.tn',
    description: 'Découvrez la meilleure proteine en Tunisie avec Sobitas : whey protein, creatine, BCAA et compléments certifiés premium. Livraison rapide et prix compétitifs. Commandez maintenant sur Protein.tn.',
    images: ['/assets/img/logo/logo.webp'],
    url: 'https://sobitas.tn',
    type: 'website',
  },
  other: {

  },
};

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Preload critical hero image for LCP optimization
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  };
}

async function getHomeData(): Promise<{ accueil: AccueilData; slides: any[] }> {
  try {
    const [accueil, slides] = await Promise.all([
      getAccueil(),
      getSlides(),
    ]);
    return { accueil, slides };
  } catch (error) {
    console.error('Error fetching home data:', error);
    // Return empty data structure on error
    return {
      accueil: {
        categories: [],
        last_articles: [],
        ventes_flash: [],
        new_product: [],
        packs: [],
        best_sellers: [],
      },
      slides: [],
    };
  }
}

export default async function Home() {
  const { accueil, slides } = await getHomeData();

  return <HomePageClient accueil={accueil} slides={slides} />;
}
