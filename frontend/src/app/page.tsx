import { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getAccueil, getSlides } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { HomePageClient } from './components/HomePageClient';
import type { AccueilData } from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl('/');
  const title = 'Protein Tunisie | Whey, Créatine & Compléments en Tunisie';
  const description =
    'Protein Tunisie : proteine tunisie, whey, créatine, compléments alimentaires et matériel de musculation avec livraison rapide partout en Tunisie.';

  return {
    title,
    description,
    keywords:
      'proteine tunisie, protein tunisie, whey tunisie, whey protein tunisie, créatine tunisie, complément alimentaire tunisie, nutrition sportive tunisie, protéine musculation Tunisie',
    alternates: { canonical },
    openGraph: {
      title: 'Protein Tunisie | Whey, Créatine & Compléments en Tunisie',
      description,
      images: ['/assets/img/logo/logo.webp'],
      url: canonical,
      type: 'website',
      siteName: 'Protein Tunisie',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Protein Tunisie | Whey, Créatine & Compléments en Tunisie',
      description,
      images: ['/assets/img/logo/logo.webp'],
    },
    other: {},
  };
}

export function generateViewport() {
  return { width: 'device-width', initialScale: 1, maximumScale: 5 };
}

const emptyAccueil: AccueilData = {
  categories: [],
  last_articles: [],
  ventes_flash: [],
  new_product: [],
  packs: [],
  best_sellers: [],
};

async function getHomeData(): Promise<{ accueil: AccueilData; slides: any[] }> {
  noStore();
  const delays = [0, 600, 1600];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]! > 0) await new Promise((r) => setTimeout(r, delays[i]!));
    const [accueil, slides] = await Promise.all([getAccueil(), getSlides()]);
    const hasProducts =
      (accueil.new_product?.length ?? 0) > 0 ||
      (accueil.best_sellers?.length ?? 0) > 0 ||
      (accueil.ventes_flash?.length ?? 0) > 0 ||
      (accueil.categories?.length ?? 0) > 0 ||
      (accueil.packs?.length ?? 0) > 0;
    if (hasProducts || (slides?.length ?? 0) > 0 || i === delays.length - 1) return { accueil, slides };
  }
  return { accueil: emptyAccueil, slides: [] };
}

function getSlideData(slide: any): { imageUrl: string; title: string } | null {
  if (!slide) return null;
  const p = slide.cover || slide.image || slide.image_path || slide.url;
  if (!p) return null;
  return {
    imageUrl: getStorageUrl(p),
    title: slide.titre || slide.title || slide.designation_fr || 'Protéines Premium',
  };
}

function getFirstSlideByType(slides: any[], type: 'mobile' | 'web') {
  const filtered = slides.filter(
    (s: any) => s && (s.cover || s.image || s.image_path || s.url) && (s.type || '').toLowerCase() === type
  );
  const sorted = [...filtered].sort((a: any, b: any) => (a.ordre ?? a.order ?? 0) - (b.ordre ?? b.order ?? 0));
  return getSlideData(sorted[0] ?? null);
}

function getFirstSlideAnyType(slides: any[]) {
  const withImage = slides.filter((s: any) => s && (s.cover || s.image || s.image_path || s.url));
  const sorted = [...withImage].sort((a: any, b: any) => (a.ordre ?? a.order ?? 0) - (b.ordre ?? b.order ?? 0));
  return getSlideData(sorted[0] ?? null);
}

// Build Next.js image optimization URL
function nextImgUrl(src: string, w: number, q = 75) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

// Build srcset string for <link rel="preload" imagesrcset> — browser picks correct width by DPR
function buildImgSrcSet(src: string, widths: number[], q = 75) {
  return widths.map((w) => `${nextImgUrl(src, w, q)} ${w}w`).join(', ');
}

export interface HeroFirstSlide {
  imageUrl: string;
  title: string;
}

export default async function Home() {
  const { accueil, slides } = await getHomeData();

  // Pre-compute first slide for mobile and desktop at server time.
  // These are passed as stable props so HeroSlider can render the first frame
  // as a native <picture> element in SSR HTML — no JS execution required to
  // show the hero image. This is the key fix for LCP 6.5s on mobile.
  const mobileFirst = getFirstSlideByType(slides, 'mobile') ?? getFirstSlideAnyType(slides);
  const desktopFirst = getFirstSlideByType(slides, 'web') ?? getFirstSlideAnyType(slides);

  // Correct preloads: use imagesrcset so the browser preloads the image at the
  // right width for its DPR (Moto G Power needs w=1080, not w=828).
  const mobileSrcSet = mobileFirst ? buildImgSrcSet(mobileFirst.imageUrl, [640, 750, 828, 1080]) : null;
  const desktopSrcSet = desktopFirst ? buildImgSrcSet(desktopFirst.imageUrl, [1080, 1200]) : null;

  return (
    <>
      {/* LCP hero preloads — media-specific so mobile only downloads mobile image */}
      {mobileSrcSet && mobileFirst && (
        <link
          rel="preload"
          as="image"
          href={nextImgUrl(mobileFirst.imageUrl, 1080)}
          imageSrcSet={mobileSrcSet}
          imageSizes="100vw"
          media="(max-width: 767px)"
          fetchPriority="high"
        />
      )}
      {desktopSrcSet && desktopFirst && (
        <link
          rel="preload"
          as="image"
          href={nextImgUrl(desktopFirst.imageUrl, 1200)}
          imageSrcSet={desktopSrcSet}
          imageSizes="100vw"
          media="(min-width: 768px)"
          fetchPriority="high"
        />
      )}
      <HomePageClient
        accueil={accueil}
        slides={slides}
        heroMobileFirst={mobileFirst ?? undefined}
        heroDesktopFirst={desktopFirst ?? undefined}
      />
    </>
  );
}
