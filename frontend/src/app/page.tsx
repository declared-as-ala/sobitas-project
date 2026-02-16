import { Metadata } from 'next';
import { getAccueil, getSlides } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { HomePageClient } from './components/HomePageClient';
import type { AccueilData } from '@/types';

export const metadata: Metadata = {
  title: 'Protein Tunisie – Whey Protein, Creatine & Sobitas Premium | Protein.tn',
  description: 'Découvrez la meilleure proteine en Tunisie avec Sobitas : whey protein, creatine, BCAA et compléments certifiés premium. Livraison rapide et prix compétitifs. Commandez maintenant sur Protein.tn.',
  keywords: 'proteine tunisie, whey Tunisie, créatine Tunisie, compléments alimentaires Sousse, compléments alimentaires Tunis, acheter whey Tunisie, protéine musculation Tunisie',
  alternates: {
    canonical: buildCanonicalUrl('/'),
  },
  openGraph: {
    title: 'Protein Tunisie – Whey Protein, Creatine & Sobitas Premium | Protein.tn',
    description: 'Découvrez la meilleure proteine en Tunisie avec Sobitas : whey protein, creatine, BCAA et compléments certifiés premium. Livraison rapide et prix compétitifs. Commandez maintenant sur Protein.tn.',
    images: ['/assets/img/logo/logo.webp'],
    url: buildCanonicalUrl('/'),
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

/** First LCP candidate: hero image. Preload so the browser discovers it earlier. */
function getFirstSlideImageUrl(slides: any[]): string | null {
  if (!slides?.length) return null;
  const withImage = slides.filter((s: any) => s && (s.cover || s.image || s.image_path || s.url));
  const sorted = [...withImage].sort((a: any, b: any) => (a.ordre ?? a.order ?? 0) - (b.ordre ?? b.order ?? 0));
  const first = sorted[0] || withImage[0];
  if (!first) return null;
  const path = first.cover || first.image || first.image_path || first.url;
  return path ? getStorageUrl(path) : null;
}

export default async function Home() {
  const { accueil, slides } = await getHomeData();
  const firstHeroImageUrl = getFirstSlideImageUrl(slides);

  return (
    <>
      {firstHeroImageUrl && (
        <link rel="preload" as="image" href={firstHeroImageUrl} fetchPriority="high" />
      )}
      <HomePageClient accueil={accueil} slides={slides} />
    </>
  );
}
