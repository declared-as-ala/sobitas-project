import { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getAccueil, getCategories, getBestSellers, getNewProducts, getAllBrands } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildWebPageSchema, buildItemListSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { buildProductUrlPath } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { HomePageClient } from './components/HomePageClient';
import type { AccueilData, Product } from '@/types';

// ISR (was uncached via noStore → rendered on EVERY request, so TTFB — and the hero LCP preload —
// waited on a live /accueil backend call; that's the 3.7s LCP). Caching the route render and
// revalidating in the background ships the HTML + hero preload instantly. 5-min staleness is fine
// for the home rails; the flash-sale countdown ticks client-side from each product's expiry date.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl('/');
  const title = 'Protéine Tunisie | Whey, Créatine & Compléments – SOBITAS Sousse';
  const description =
    'Achetez whey, créatine, gainer, BCAA et compléments alimentaires en Tunisie chez SOBITAS (Sousse). Produits authentiques, livraison rapide à Sousse, Tunis et partout en Tunisie.';

  return {
    title,
    description,
    keywords:
      'protéine tunisie, whey tunisie, créatine tunisie, compléments alimentaires tunisie, vitamines tunisie, nutrition sportive tunisie, protein tunisie, protein.tn, protéine sousse, compléments alimentaires sousse, whey sousse, protéine tunis, sobitas',
    alternates: { canonical },
    openGraph: {
      title,
      description,
      // Use the 1200×630 hero, not the 512² favicon — otherwise every Facebook/WhatsApp/LinkedIn
      // share of the homepage previews as a tiny square icon instead of a real banner.
      images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'Protéine Tunisie — Whey, Créatine & Compléments' }],
      url: canonical,
      type: 'website',
      siteName: 'Protéine Tunisie',
      locale: 'fr_FR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-banner.jpg'],
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

// Bulletproof last-resort categories (the catalogue's real top categories + real covers). Used ONLY
// when BOTH /accueil and /categories come back empty — a rare backend hiccup (e.g. a cold start right
// after a deploy) that would otherwise blank the homepage "Catégories populaires" grid. The next ISR
// revalidation replaces these with the live (identical) categories, so the swap is invisible.
const FALLBACK_CATEGORIES = [
  { id: 1, slug: 'sante-vitalite', designation_fr: 'SANTÉ & VITALITÉ', cover: 'categories/rRqCff4GDcYE3tnmOyxssRSNgxDMTq5BjwgwZqH2.webp' },
  { id: 2, slug: 'proteines', designation_fr: 'PROTÉINES', cover: 'categories/HckZ8s5a0261W1s4eM6YuvVc1oZQi8ZCFMW5gd8L.webp' },
  { id: 3, slug: 'perte-de-poids', designation_fr: 'PERTE DE POIDS', cover: 'categories/ogKd9PviN1xVzx0vgImR2UPezcr0pHLjyh3l71cb.webp' },
  { id: 4, slug: 'prise-de-masse', designation_fr: 'PRISE DE MASSE', cover: 'categories/c1af5df5-848e-4a02-9597-00b193a8bae9.webp' },
  { id: 5, slug: 'performance', designation_fr: 'PERFORMANCE', cover: 'categories/6b5acbd3-290d-40ef-9295-f2c2811af738.webp' },
  { id: 6, slug: 'equipement', designation_fr: 'ÉQUIPEMENT', cover: 'categories/8ba629b9-88b9-42a8-b4e2-3c4fb703a177.webp' },
] as unknown as AccueilData['categories'];

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

    // Categories serve two jobs: resolve each product's subcategory slug (for canonical links) and
    // fill the "Catégories populaires" grid. The /accueil payload ships `categories[].sous_categories`;
    // if it's empty (rare hiccup) fall back to the dedicated /categories endpoint.
    let categories = Array.isArray(accueil.categories) ? accueil.categories : [];
    if (categories.length === 0) {
      try {
        const fetched = await getCategories();
        if (Array.isArray(fetched) && fetched.length > 0) categories = fetched;
      } catch {
        // keep empty; the fallback categories below still fill the grid
      }
    }

    // The /accueil payload intermittently returns EMPTY product rails (an ISR render that captures
    // that leaves the homepage with no products at all). Backfill the two flagship rails from their
    // dedicated, more reliable endpoints so the homepage never renders product-less. (packs /
    // ventes_flash can be legitimately empty — no active packs or flash sale — so we don't fabricate
    // them.)
    const [best, news] = await Promise.all([
      accueil.best_sellers?.length ? Promise.resolve(accueil.best_sellers) : getBestSellers().catch(() => [] as Product[]),
      accueil.new_product?.length ? Promise.resolve(accueil.new_product) : getNewProducts().catch(() => [] as Product[]),
    ]);

    // Enrich list products (which ship only `sous_categorie_id`) with their subcategory so every
    // product link + ItemList URL is the canonical /{subcat}/{slug} instead of /shop/{slug} — the
    // latter 301-redirects, which is exactly the "Page with redirect" bucket in Search Console.
    const enriched: AccueilData = {
      ...accueil,
      categories: categories.length > 0 ? categories : (FALLBACK_CATEGORIES as AccueilData['categories']),
      best_sellers: enrichProductsWithSubcategory(best, categories),
      new_product: enrichProductsWithSubcategory(news, categories),
      packs: enrichProductsWithSubcategory(accueil.packs, categories),
      ventes_flash: enrichProductsWithSubcategory(accueil.ventes_flash, categories),
    };

    return { accueil: enriched, slides: LOCAL_HOME_SLIDES };
  } catch (err) {
    // getAccueil rethrows on the server, so a total backend failure lands here. Do NOT let this
    // product-less render be CACHED for the whole revalidate window (5 min on the flagship page):
    // noStore() defers to a runtime re-render on the next request, which self-heals immediately.
    noStore();
    console.error('[home] accueil fetch failed — rendering fallback WITHOUT caching:', err);
    return { accueil: { ...emptyAccueil, categories: FALLBACK_CATEGORIES }, slides: LOCAL_HOME_SLIDES };
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

export interface HeroFirstSlide {
  imageUrl: string;
  title: string;
}

export default async function Home() {
  // Fetch brands alongside the home payload so the (now SSR) brands wall renders in the HTML.
  // Incidental: a failure just falls back to BrandsSection's client fetch (no cache poisoning).
  const [{ accueil, slides }, brands] = await Promise.all([
    getHomeData(),
    getAllBrands().catch(() => [] as Awaited<ReturnType<typeof getAllBrands>>),
  ]);

  // Pre-compute first slide for mobile and desktop at server time.
  // These are passed as stable props so HeroSlider can render the first frame
  // as a native <picture> element in SSR HTML — no JS execution required to
  // show the hero image. This is the key fix for LCP 6.5s on mobile.
  const mobileFirst = getFirstSlideByType(slides, 'mobile') ?? getFirstSlideAnyType(slides);
  const desktopFirst = getFirstSlideByType(slides, 'web') ?? getFirstSlideAnyType(slides);

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
      {/* LCP hero preloads — direct-static AVIF (edge-cached), media-specific per breakpoint */}
      <link rel="preload" as="image" href="/slides/hero-m.avif" type="image/avif" media="(max-width: 767px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/slides/hero-d.avif" type="image/avif" media="(min-width: 768px)" fetchPriority="high" />
      <HomePageClient
        accueil={accueil}
        slides={slides}
        brands={brands}
        heroMobileFirst={mobileFirst ?? undefined}
        heroDesktopFirst={desktopFirst ?? undefined}
      />
    </>
  );
}
