import { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getAccueil } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { HomePageClient } from './components/HomePageClient';
import type { AccueilData } from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl('/');
  const title = 'Protéine Tunisie | Whey, Créatine & Compléments en Tunisie';
  const description =
    'Achetez whey protein, créatine, vitamines et compléments alimentaires en Tunisie avec livraison rapide et produits authentiques.';

  return {
    title,
    description,
    keywords:
      'protéine tunisie, whey tunisie, créatine tunisie, compléments alimentaires tunisie, vitamines tunisie, nutrition sportive tunisie, protein tunisie, protein.tn',
    alternates: { canonical },
    openGraph: {
      title,
      description,
      images: [{ url: '/favicon-512x512.png', width: 512, height: 512, alt: 'Protéine Tunisie' }],
      url: canonical,
      type: 'website',
      siteName: 'Protéine Tunisie',
      locale: 'fr_FR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/favicon-512x512.png'],
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

type LocalHomeSlide = {
  id: string;
  cover: string;
  title: string;
  link: string;
  type: 'mobile' | 'web';
  ordre: number;
};

const LOCAL_HOME_SLIDES: LocalHomeSlide[] = [
  {
    id: 'home-hero-mobile',
    cover: '/slides/home-hero-mobile.webp',
    title: 'Proteines Premium',
    link: '/shop',
    type: 'mobile',
    ordre: 1,
  },
  {
    id: 'home-hero-web',
    cover: '/slides/home-hero-web.webp',
    title: 'Proteines Premium',
    link: '/shop',
    type: 'web',
    ordre: 1,
  },
];

async function getHomeData(): Promise<{ accueil: AccueilData; slides: LocalHomeSlide[] }> {
  noStore();
  try {
    const accueil = await getAccueil();
    return { accueil, slides: LOCAL_HOME_SLIDES };
  } catch {
    return { accueil: emptyAccueil, slides: LOCAL_HOME_SLIDES };
  }
}

function getSlideData(slide: any): { imageUrl: string; title: string } | null {
  if (!slide) return null;
  const p = slide.cover || slide.image || slide.image_path || slide.url;
  if (!p) return null;
  return {
    imageUrl: p,
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

  // Mobile: quality=50 (hero background, fidelity matters less than speed on slow 4G).
  // Max width 828 (covers @2x retina on 414px phone — 1080 is wasteful on mobile).
  // Desktop: quality=75, covers HiDPI up to 1200px.
  const mobileSrcSet = mobileFirst ? buildImgSrcSet(mobileFirst.imageUrl, [640, 750, 828], 50) : null;
  const desktopSrcSet = desktopFirst ? buildImgSrcSet(desktopFirst.imageUrl, [1080, 1200], 75) : null;

  return (
    <>
      {/* LCP hero preloads — media-specific so mobile only downloads mobile image */}
      {mobileSrcSet && mobileFirst && (
        <link
          rel="preload"
          as="image"
          href={nextImgUrl(mobileFirst.imageUrl, 828, 50)}
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
          href={nextImgUrl(desktopFirst.imageUrl, 1200, 75)}
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
