import { Metadata } from 'next';
import { getAllBrands, getInStockBrandCounts, getShopFacets } from '@/services/api';
import { loadForCache } from '@/util/loadForCache';
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
  buildFAQPageSchemaFromProductFaq,
  buildItemListSchema,
} from '@/util/structuredData';
import { buildBrandEntries } from './brandEntries';
import { BRAND_FAQ, BrandsPageContent } from './BrandsPageContent';

// ISR: the brand list changes rarely, so cache the server-rendered page. The three fetches below
// therefore cost three queries an hour across all visitors, not three per visit.
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

/**
 * ── THE TITLE NAMES THE NUMBER, BECAUSE THE NUMBER IS THE REASON TO CLICK ──────────────────
 * The old title was "Marques — Compléments Alimentaires | Protéine Tunisie" and the description
 * listed three brands. A brand-index page competes on breadth: what a searcher wants to know
 * from the SERP is whether their brand is in there, and "570+" answers that better than any
 * three names can. The names still appear — after the count, where they are evidence rather
 * than the whole claim.
 */
export const metadata: Metadata = {
  title: { absolute: 'Toutes nos marques — 570+ marques de compléments | Protein.tn' },
  description:
    'Répertoire A–Z de plus de 570 marques de protéines et compléments alimentaires disponibles en Tunisie : Optimum Nutrition, BioTech USA, MuscleTech, Dymatize, Nutrex et bien d’autres. Prix en dinars, livraison dans les 24 gouvernorats.',
  openGraph: {
    title: 'Toutes nos marques — 570+ marques de compléments | Protein.tn',
    description:
      'Répertoire A–Z des marques de protéines et compléments alimentaires en Tunisie. Optimum Nutrition, BioTech USA, MuscleTech et bien d’autres.',
    url: 'https://protein.tn/brands',
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
    title: 'Toutes nos marques — 570+ marques de compléments | Protein.tn',
    description:
      'Répertoire A–Z des marques de protéines et compléments alimentaires en Tunisie.',
    images: ['https://protein.tn/og-banner.jpg'],
  },
  alternates: {
    canonical: 'https://protein.tn/brands',
  },
};

export default async function BrandsPage() {
  /*
    ── THREE FETCHES, IN PARALLEL, EACH ALLOWED TO FAIL ON ITS OWN ──────────────────────────
    The brands are the page; the counts and the availability decorate it. So only the first is
    wrapped in `loadForCache` — a failed getAllBrands() during `next build` must not bake an
    empty brand grid into a cached page (that is what made /brands unindexable once already),
    and noStore() defers the render to runtime instead. The other two already fail soft, to `{}`
    and to an empty facet set, and buildBrandEntries degrades the UI accordingly rather than
    dropping every brand whose count it could not look up.
  */
  const [initialBrands, facets, stockCounts] = await Promise.all([
    loadForCache(() => getAllBrands(), [] as Awaited<ReturnType<typeof getAllBrands>>),
    getShopFacets().catch(() => null),
    getInStockBrandCounts().catch(() => ({} as Record<number, number>)),
  ]);

  const { entries, hasCounts, hasStockData } = buildBrandEntries(
    initialBrands,
    facets?.brand_counts ?? {},
    stockCounts
  );

  /*
    ── THE FEATURED TIER ────────────────────────────────────────────────────────────────────
    `logo != null` is the selection rule — see FeaturedBrands for why that is the right proxy
    for "a brand somebody deliberately onboarded". Sorted by catalogue depth, so the plates read
    as the shop's roster rather than as the first names in the alphabet, which is exactly the
    fault the homepage brand strip was fixed for last week.
  */
  const featured = entries
    .filter((e) => e.logo)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));

  const inStockBrandCount = entries.filter((e) => e.stock > 0).length;
  const totalProducts = facets?.total_published ?? 0;

  const breadcrumbSchema = buildBreadcrumbListSchema(
    [
      { name: 'Accueil', url: '/' },
      { name: 'Marques', url: '/brands' },
    ],
    BASE_URL
  );
  const collectionSchema = buildCollectionPageSchema(
    'Toutes nos marques de compléments alimentaires',
    '/brands',
    BASE_URL,
    {
      description:
        'Répertoire alphabétique des marques de protéines et compléments alimentaires disponibles en Tunisie, avec le nombre de produits et la disponibilité de chacune.',
    }
  );
  /*
    ITEMLIST CARRIES THE FEATURED TIER, NOT ALL 577. buildItemListSchema slices to 20 by design,
    and that is the right 20 to give: a list of every brand in the catalogue would be ~60 KB of
    JSON-LD on every render describing rows that are already in the HTML as ordinary links —
    which is what Google reads them from anyway.
  */
  const itemListSchema =
    featured.length > 0
      ? buildItemListSchema(
          featured.slice(0, 20).map((b) => ({ name: b.name, url: `/${b.slug}` })),
          BASE_URL,
          { name: 'Marques en vedette' }
        )
      : null;
  // The same array the page renders visibly, which is the condition Google puts on FAQPage.
  const faqSchema = buildFAQPageSchemaFromProductFaq(
    BRAND_FAQ.map(({ q, a }) => ({ q, a }))
  );

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
        hasCounts={hasCounts}
        hasStockData={hasStockData}
        totalProducts={totalProducts}
        inStockBrandCount={inStockBrandCount}
      />
    </>
  );
}
