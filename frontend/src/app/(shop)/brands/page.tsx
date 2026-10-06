import { Metadata } from 'next';
import { cache } from 'react';
import { unstable_cache, unstable_noStore as noStore } from 'next/cache';
import { getAllBrands, getShopFacets } from '@/services/api';
import { loadForCache } from '@/util/loadForCache';
import {
  buildBrandSchema,
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
  buildFAQPageSchemaFromProductFaq,
} from '@/util/structuredData';
import {
  buildBrandEntries,
  pickFeaturedBrands,
  pickTextFeaturedBrands,
  type BrandRow,
} from './brandEntries';
import { loadBrandRayons, loadBrandStock } from './brandRayons';
import { BRANDS_H1, brandFaq, BrandsPageContent } from './BrandsPageContent';

/*
  `revalidate` is kept but does NOTHING today, and it must not be read as the page's caching:
  i18n/request.ts reads headers(), which makes every route in the app dynamic, so this page is
  rendered per request. The caching that actually exists is the `unstable_cache` entries below
  and in brandRayons.ts — one hour each, tagged `brands` / `shop` / `products`.
*/
export const revalidate = 3600;

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn').replace(/\/$/, '');
const PAGE_PATH = '/brands';
const CANONICAL = 'https://protein.tn/brands';

/**
 * ── THE TITLE NAMES THE QUERY, NOT THE COUNT (05/10/2026) ──────────────────────────────────
 * The previous title led with « Toutes nos marques — 578 marques de compléments ». Search Console
 * says what this page actually ranks for: #5 on `marques protéine tunisie` and on
 * `marques nutrition sportive tunisie` (gl=tn, hl=fr). The title now carries both phrases, and
 * it is a FIXED string — 61 characters, no number that shifts every time a brand is published.
 * The count moved to the description, after four names a searcher recognises, which is where it
 * is evidence rather than the whole claim. `marques whey tunisie` and `marques compléments
 * alimentaires tunisie` are category and parapharmacy intent and are deliberately not chased.
 */
const TITLE = 'Marques protéine & nutrition sportive en Tunisie | Protein.tn';

function buildDescription(brandCount: number): string {
  const lead = 'Optimum Nutrition, Dymatize, BioTech USA, MuscleTech…';
  const subject =
    brandCount > 0
      ? `${brandCount} marques de protéines et compléments en Tunisie`
      : 'Les marques de protéines et compléments en Tunisie';
  // 153 characters at 578 brands; four-digit counts stay at 154.
  return `${lead} ${subject}, classées de A à Z et par rayon. Prix en dinars.`;
}

/* ─────────────────────────────────────────────────────────────────────────────────────────────
 * DATA
 * ───────────────────────────────────────────────────────────────────────────────────────────── */

/** Exactly what the page reads from /all_brands and /shop_facets — the cached shape. */
type BrandsIndex = {
  brands: BrandRow[];
  brandCounts: Record<string, number>;
  totalPublished: number;
};

const EMPTY_INDEX: BrandsIndex = { brands: [], brandCounts: {}, totalPublished: 0 };

/**
 * A complete brand list whose facet counts did not arrive. Thrown — so unstable_cache stores
 * nothing — but carrying the list, so this ONE render can still show every brand (without counts)
 * instead of falling all the way back to an empty page.
 */
class DegradedBrandsIndex extends Error {
  constructor(readonly index: BrandsIndex) {
    super('/shop_facets returned no brand_counts');
    this.name = 'DegradedBrandsIndex';
  }
}

/**
 * The brand list and the facet counts, projected to the four fields the page reads (~25 KB
 * cached rather than ~140 KB of raw rows and facets).
 *
 * ── NOTHING EMPTY OR HALF-EMPTY IS EVER CACHED ──────────────────────────────────────────────
 * An empty brand list THROWS (the util/brandIndex.ts pattern): unstable_cache stores nothing,
 * loadForCache below marks the render uncached, and the next request tries again. A list with no
 * facet counts throws too, as DegradedBrandsIndex — /shop_facets fails soft to `{}`, and caching
 * that for an hour would show every brand with no count and re-list the empty brands the counts
 * exist to filter out.
 */
async function readBrandsIndex(): Promise<BrandsIndex> {
  const [brands, facets] = await Promise.all([getAllBrands(), getShopFacets()]);
  if (!Array.isArray(brands) || brands.length === 0) {
    throw new Error('[brands] /all_brands returned no rows — not caching an empty directory');
  }
  const index: BrandsIndex = {
    brands: brands.map(({ id, designation_fr, logo }) => ({ id, designation_fr, logo: logo || null })),
    brandCounts: facets?.brand_counts ?? {},
    totalPublished: Number(facets?.total_published ?? 0) || 0,
  };
  if (Object.keys(index.brandCounts).length === 0) throw new DegradedBrandsIndex(index);
  return index;
}

/*
  Before this, every view made 9 uncached API calls — six pages of /all_brands, /shop_facets and
  two pages of the in-stock index — for a TTFB of 0.49–0.74 s. Now it is one cache read for the
  list and counts, and one (loadBrandStock, brandRayons.ts) for the stock maps that both the
  directory and the rayon cards use: the in-stock index is read once an hour, not twice a view.
*/
const cachedBrandsIndex = unstable_cache(readBrandsIndex, ['brands-index-v2'], {
  revalidate: 3600,
  tags: ['brands', 'shop', 'products'],
});

async function loadBrandsIndex(): Promise<BrandsIndex> {
  try {
    return await cachedBrandsIndex();
  } catch (err) {
    if (err instanceof DegradedBrandsIndex) {
      noStore();
      console.error('[brands] rendering without facet counts, uncached:', err.message);
      return err.index;
    }
    throw err;
  }
}

/**
 * Per-request dedupe: generateMetadata and the page both need the directory, and React `cache()`
 * makes that one read. `loadForCache` stays the outer guard — a brand-list failure renders the
 * empty fallback uncached instead of throwing the page away.
 */
const loadDirectory = cache(async () => {
  const [index, stock] = await Promise.all([
    loadForCache(() => loadBrandsIndex(), EMPTY_INDEX),
    loadBrandStock(),
  ]);
  return {
    ...buildBrandEntries(index.brands, index.brandCounts, stock.byBrand),
    totalProducts: index.totalPublished,
    stock,
  };
});

/* ─────────────────────────────────────────────────────────────────────────────────────────────
 * METADATA
 * ───────────────────────────────────────────────────────────────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  const { entries } = await loadDirectory();
  const description = buildDescription(entries.length);
  return {
    title: { absolute: TITLE },
    description,
    openGraph: {
      title: TITLE,
      description,
      url: CANONICAL,
      siteName: 'Protéine Tunisie',
      images: [
        {
          url: 'https://protein.tn/og-banner.jpg',
          width: 1200,
          height: 630,
          alt: 'Protéine Tunisie — marques compléments',
        },
      ],
      locale: 'fr_FR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description,
      images: ['https://protein.tn/og-banner.jpg'],
    },
    alternates: {
      canonical: CANONICAL,
    },
  };
}

/* ─────────────────────────────────────────────────────────────────────────────────────────────
 * PAGE
 * ───────────────────────────────────────────────────────────────────────────────────────────── */

export default async function BrandsPage() {
  const { entries, hasCounts, hasStockData, totalProducts, stock } = await loadDirectory();

  /*
    ── THE FEATURED TIER ────────────────────────────────────────────────────────────────────
    24 logo plates: FEATURED_ORDER (Search Console click order) first, then what ships today,
    then catalogue depth — see brandEntries.ts. Then the text row for the brands with demand and
    no logo (NOW Foods, Nutricost, Floradix…).
  */
  const featured = pickFeaturedBrands(entries);
  const textFeatured = pickTextFeaturedBrands(entries);
  const rayons = await loadBrandRayons(entries);

  const inStockBrandCount = hasStockData ? entries.filter((e) => e.stock > 0).length : 0;

  // ONE list for the visible FAQ and the FAQPage block — Google's condition for FAQPage.
  const faq = brandFaq(entries, rayons, stock);

  /*
    ── THE TRAIL IS RENDERED, NOT JUST DECLARED ──────────────────────────────────────────────
    BrandsPageContent renders `ShopBreadcrumbs`, whose visible labels are « Accueil » and
    « Marques » — the same two strings, character for character, as the ListItem names here.
  */
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [
      { name: 'Accueil', url: '/' },
      { name: 'Marques', url: PAGE_PATH },
    ],
    BASE_URL,
    { pageUrl: PAGE_PATH }
  );

  /*
    ── THE ITEMLIST IS THE 24 PLATES, AS BRAND NODES ────────────────────────────────────────
    Built inline rather than through buildItemListSchema, because its items are ENTITIES: each
    ListItem.item is the same Brand node the brand page itself defines — `@id` the brand-page URL
    derived from the RAW admin name (the identifier every product's `brand.@id` already uses),
    `name` the display name the plate shows, `logo` the exact URL the plate's <img> loads. A list
    of {name, url} pairs said "here are links"; this says "here are these brands".

    (buildItemListSchema caps its list at 30 items — structuredData.ts — not 20 as this comment
    used to claim. Neither cap matters here: the list is the 24 plates and nothing else. Listing
    every brand would be ~60 KB of JSON-LD describing rows that are already ordinary links.)
  */
  const featuredNodes = featured
    .map((b) => buildBrandSchema({ designation_fr: b.rawName, logo: b.logo }, BASE_URL, { name: b.name }))
    .filter((node): node is object => node !== null);
  const itemListSchema =
    featuredNodes.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          '@id': `${BASE_URL}${PAGE_PATH}#itemlist`,
          name: 'Marques en vedette',
          numberOfItems: featuredNodes.length,
          itemListElement: featuredNodes.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item,
          })),
        }
      : null;

  const collectionSchema = buildCollectionPageSchema(BRANDS_H1, PAGE_PATH, BASE_URL, {
    description:
      'Répertoire des marques de protéines et compléments alimentaires disponibles en Tunisie, classées de A à Z et par rayon, avec le nombre de produits et la disponibilité de chacune.',
    withBreadcrumb: true,
    // mainEntity → `${url}#itemlist`, the @id above. Only claimed when the list is emitted.
    withItemList: itemListSchema !== null,
  });

  const faqSchema = buildFAQPageSchemaFromProductFaq(faq.map(({ q, a }) => ({ q, a })));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <BrandsPageContent
        entries={entries}
        featured={featured}
        textFeatured={textFeatured}
        rayons={rayons}
        faq={faq}
        hasCounts={hasCounts}
        hasStockData={hasStockData}
        totalProducts={totalProducts}
        inStockBrandCount={inStockBrandCount}
      />
    </>
  );
}
