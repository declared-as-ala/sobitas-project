import { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getAccueil, getCategories, getBestSellers, getNewProducts, getAllBrands, getStorageUrl } from '@/services/api';
import { getServerSlides } from '@/services/siteChrome.server';
import { buildHeroImageSet, type HeroSlide } from '@/util/heroImage';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildWebPageSchema, buildItemListSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { buildProductUrlPath } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { HomePageClient } from '@/app/components/HomePageClient';
import type { AccueilData, Product } from '@/types';

// ISR (was uncached via noStore → rendered on EVERY request, so TTFB — and the hero LCP preload —
// waited on a live /accueil backend call; that's the 3.7s LCP). Caching the route render and
// revalidating in the background ships the HTML + hero preload instantly. 5-min staleness is fine
// for the home rails; the flash-sale countdown ticks client-side from each product's expiry date.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl('/');
  const title = 'Protéine Tunisie | Whey, Créatine & Compléments – Protein.tn Sousse';
  const description =
    'Achetez whey, créatine, gainer, BCAA et compléments alimentaires en Tunisie chez Protein.tn (Sousse). Produits authentiques, livraison rapide à Sousse, Tunis et partout en Tunisie.';

  return {
    // absolute: the homepage title already reads as a full brand title; without this the root
    // layout's `%s | Protéine Tunisie` template would append the brand a SECOND time (~82 chars).
    title: { absolute: title },
    description,
    keywords:
      'protéine tunisie, whey tunisie, créatine tunisie, compléments alimentaires tunisie, vitamines tunisie, nutrition sportive tunisie, protein tunisie, protein.tn, protéine sousse, compléments alimentaires sousse, whey sousse, protéine tunis',
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

// generateViewport intentionally removed — app/layout.tsx now defines the site-wide viewport
// with the same width/initialScale/maximumScale PLUS `viewportFit: 'cover'` (required for
// env(safe-area-inset-*) to resolve on notched devices). Re-declaring it here would shadow that.

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

async function getHomeData(): Promise<{ accueil: AccueilData }> {
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

    return { accueil: enriched };
  } catch (err) {
    // getAccueil rethrows on the server, so a total backend failure lands here. Do NOT let this
    // product-less render be CACHED for the whole revalidate window (5 min on the flagship page):
    // noStore() defers to a runtime re-render on the next request, which self-heals immediately.
    noStore();
    console.error('[home] accueil fetch failed — rendering fallback WITHOUT caching:', err);
    return { accueil: { ...emptyAccueil, categories: FALLBACK_CATEGORIES } };
  }
}

/** Alt text for a slide that has none — keeps the LCP image described for SEO and screen readers. */
const HERO_FALLBACK_ALT = 'Whey, créatine et compléments — Protéine Tunisie';

export default async function Home() {
  // Fetch brands alongside the home payload so the (now SSR) brands wall renders in the HTML.
  // Incidental: a failure just falls back to BrandsSection's client fetch (no cache poisoning).
  const [{ accueil }, brands, serverSlides] = await Promise.all([
    getHomeData(),
    getAllBrands().catch(() => [] as Awaited<ReturnType<typeof getAllBrands>>),
    getServerSlides(),
  ]);

  // Admin-managed hero slides (Filament → Paramètres du site → Slides). The backend already
  // filters is_active and sorts by ordre. An empty list is normal and safe: the hero falls back
  // to its built-in static image, which is exactly what shipped before.
  //
  // A FAILED fetch is different, and must not be cached. The CI builder cannot reach the backend
  // (ENOTFOUND backend-nginx-v2), so without this the homepage is prerendered with the fallback
  // hero and — because a freshly built page counts as fresh — ISR serves that stale fallback for
  // the full 5-minute window after every deploy, hiding the owner's slide. noStore() drops this
  // render from the cache so the very next request re-renders against the reachable backend.
  // Same guard getHomeData() already applies to the /accueil payload.
  if (serverSlides.failed) noStore();

  const heroSlides: HeroSlide[] = serverSlides.slides
    .filter((s) => s.cover)
    .map((s) => ({
      id: s.id,
      imageUrl: getStorageUrl(s.cover as string),
      // No cache-bust param: it would change the URL on every render, breaking both the
      // preload↔paint match and the optimizer's 30-day cache.
      imageMobileUrl: s.cover_mobile ? getStorageUrl(s.cover_mobile) : null,
      // Image, destination, description. Nothing is painted over the artwork any more — see the
      // policy note at the top of components/Hero.tsx.
      href: s.link,
      alt: s.alt,
    }));

  // The LCP preload is derived from the SAME builder the hero renders with, so the preloaded
  // URL and the painted URL can never drift apart (see util/heroImage.ts). Only the first slide
  // produces preloads.
  const heroPreload = buildHeroImageSet(heroSlides[0] ?? null, true, HERO_FALLBACK_ALT).preload;

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
      {/* LCP hero preloads, media-specific per breakpoint. Generated by buildHeroImageSet so
          they always match the <picture> the hero paints — never hand-maintain these. */}
      {heroPreload.map((p) => (
        <link
          key={p.href}
          rel="preload"
          as="image"
          href={p.href}
          {...(p.type ? { type: p.type } : {})}
          media={p.media}
          fetchPriority="high"
        />
      ))}
      <HomePageClient accueil={accueil} heroSlides={heroSlides} brands={brands} />
    </>
  );
}
