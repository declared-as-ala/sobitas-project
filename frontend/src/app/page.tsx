import { Metadata } from 'next';
import { getAccueil } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildWebPageSchema, buildItemListSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { buildProductUrlPath } from '@/util/productUrl';
import { HomePageClient } from './components/HomePageClient';
import type { AccueilData, Product } from '@/types';

// ISR (was uncached via noStore → rendered on EVERY request, so TTFB — and the hero LCP preload —
// waited on a live /accueil backend call; that's the 3.7s LCP). Caching the route render and
// revalidating in the background ships the HTML + hero preload instantly. 5-min staleness is fine
// for the home rails; the flash-sale countdown ticks client-side from each product's expiry date.
export const revalidate = 300;

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
      // Use the 1200×630 hero, not the 512² favicon — otherwise every Facebook/WhatsApp/LinkedIn
      // share of the homepage previews as a tiny square icon instead of a real banner.
      images: [{ url: '/slides/home-hero-web.webp', width: 1200, height: 630, alt: 'Protéine Tunisie — Whey, Créatine & Compléments' }],
      url: canonical,
      type: 'website',
      siteName: 'Protéine Tunisie',
      locale: 'fr_FR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/slides/home-hero-web.webp'],
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
    // Was '/slides/mobile.png' (2.26 MB). Use the optimized WebP that already exists in the
    // same folder (~116 KB) — this is the mobile LCP image, so the ~20× size cut is a
    // direct Largest-Contentful-Paint win on the device that drives 81% of clicks.
    cover: '/slides/home-hero-mobile.webp',
    title: 'Protéines Premium',
    link: '/shop',
    type: 'mobile',
    ordre: 1,
  },
  {
    id: 'home-hero-web',
    // Was '/slides/web.png' (2.26 MB) → optimized WebP (~135 KB).
    cover: '/slides/home-hero-web.webp',
    title: 'Protéines Premium',
    link: '/shop',
    type: 'web',
    ordre: 1,
  },
];

async function getHomeData(): Promise<{ accueil: AccueilData; slides: LocalHomeSlide[] }> {
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

  // Homepage JSON-LD: WebPage (this page) + BreadcrumbList (root) + ItemList of the featured
  // products so the flagship URL isn't schema-less. Built from the server `accueil` payload so
  // the markup matches the SSR HTML.
  const baseUrl = getBaseUrl();
  const featured: Product[] = [
    ...(Array.isArray(accueil.best_sellers) ? accueil.best_sellers : []),
    ...(Array.isArray(accueil.new_product) ? accueil.new_product : []),
  ];
  const seenFeatured = new Set<number>();
  const featuredUnique = featured.filter((p) => {
    if (!p || seenFeatured.has(p.id)) return false;
    seenFeatured.add(p.id);
    return true;
  });
  const webPageSchema = buildWebPageSchema(
    'Protéine Tunisie | Whey, Créatine & Compléments en Tunisie',
    '/',
    baseUrl,
    { description: 'Achetez whey protein, créatine, vitamines et compléments alimentaires en Tunisie avec livraison rapide et produits authentiques.' }
  );
  const breadcrumbSchema = buildBreadcrumbListSchema([{ name: 'Accueil', url: '/' }], baseUrl);
  const itemListSchema = featuredUnique.length > 0
    ? buildItemListSchema(
        featuredUnique.slice(0, 20).map((p) => ({ name: p.designation_fr || 'Produit', url: buildProductUrlPath(p) })),
        baseUrl,
        { name: 'Produits en vedette' }
      )
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
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
