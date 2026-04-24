import { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getAccueil, getSlides } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { HomePageClient } from './components/HomePageClient';
import type { AccueilData } from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl('/');
  const title = 'Proteine Tunisie | Whey, Créatine & Compléments Alimentaires';
  const description =
    'Proteine Tunisie : whey protein, créatine et compléments alimentaires. Livraison rapide à Sousse, Tunis, Sfax et partout en Tunisie sur Protein.tn.';

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

// Home is loaded fresh each request (see getHomeData + noStore) so backend deploys don’t cache empty hero/products.

// Preload critical hero image for LCP optimization
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  };
}

const emptyAccueil: AccueilData = {
  categories: [],
  last_articles: [],
  ventes_flash: [],
  new_product: [],
  packs: [],
  best_sellers: [],
};

/** Load home payload: no static cache + short retries when API is warming after a deploy. */
async function getHomeData(): Promise<{ accueil: AccueilData; slides: any[] }> {
  noStore();
  const delays = [0, 600, 1600];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]! > 0) {
      await new Promise((r) => setTimeout(r, delays[i]!));
    }
    const [accueil, slides] = await Promise.all([getAccueil(), getSlides()]);
    const hasProducts =
      (accueil.new_product?.length ?? 0) > 0 ||
      (accueil.best_sellers?.length ?? 0) > 0 ||
      (accueil.ventes_flash?.length ?? 0) > 0 ||
      (accueil.categories?.length ?? 0) > 0 ||
      (accueil.packs?.length ?? 0) > 0;
    const hasSlides = (slides?.length ?? 0) > 0;
    if (hasProducts || hasSlides || i === delays.length - 1) {
      return { accueil, slides };
    }
  }
  return { accueil: emptyAccueil, slides: [] };
}

function getSlidePath(slide: any): string | null {
  if (!slide) return null;
  const p = slide.cover || slide.image || slide.image_path || slide.url;
  return p ? getStorageUrl(p) : null;
}

function getFirstSlideByType(slides: any[], type: 'mobile' | 'web'): string | null {
  const filtered = slides.filter((s: any) => s && (s.cover || s.image || s.image_path || s.url) && (s.type || '').toLowerCase() === type);
  const sorted = [...filtered].sort((a: any, b: any) => (a.ordre ?? a.order ?? 0) - (b.ordre ?? b.order ?? 0));
  return getSlidePath(sorted[0] ?? null);
}

function getFirstSlideAnyType(slides: any[]): string | null {
  const withImage = slides.filter((s: any) => s && (s.cover || s.image || s.image_path || s.url));
  const sorted = [...withImage].sort((a: any, b: any) => (a.ordre ?? a.order ?? 0) - (b.ordre ?? b.order ?? 0));
  return getSlidePath(sorted[0] ?? null);
}

export default async function Home() {
  const { accueil, slides } = await getHomeData();

  // Preload the LCP hero image via Next.js optimization endpoint (not the raw storage URL).
  // Use media queries so mobile downloads the mobile slide and desktop downloads the desktop slide.
  // This fixes the root cause of LCP 7.7s on mobile: previously the raw 1.5 MB desktop image was
  // being preloaded on all devices, saturating the Slow-4G connection before any JS ran.
  const mobileFirstUrl = getFirstSlideByType(slides, 'mobile') ?? getFirstSlideAnyType(slides);
  const desktopFirstUrl = getFirstSlideByType(slides, 'web') ?? getFirstSlideAnyType(slides);

  const mobilePreload = mobileFirstUrl
    ? `/_next/image?url=${encodeURIComponent(mobileFirstUrl)}&w=828&q=75`
    : null;
  const desktopPreload = desktopFirstUrl
    ? `/_next/image?url=${encodeURIComponent(desktopFirstUrl)}&w=1920&q=75`
    : null;

  return (
    <>
      {/* Mobile: preload small optimized hero; Desktop: preload desktop hero */}
      {mobilePreload && (
        <link rel="preload" as="image" href={mobilePreload} media="(max-width: 767px)" fetchPriority="high" />
      )}
      {desktopPreload && (
        <link rel="preload" as="image" href={desktopPreload} media="(min-width: 768px)" fetchPriority="high" />
      )}
      <HomePageClient accueil={accueil} slides={slides} />
    </>
  );
}
