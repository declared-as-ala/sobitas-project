import { getShopPage, getCategories } from '@/services/api';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { loadForCache } from '@/util/loadForCache';
import { parseShopQuery, buildShopUrl, type RawSearchParams } from '@/util/shopQuery';
import { CrawlerCategoryView, type CrawlerListLink } from '@/app/components/crawler/CrawlerCategoryView';

/**
 * Crawler view of /shop — the boutique, for bots.
 *
 * WHY THIS ROUTE EXISTS
 * /shop is the natural landing page for the head term this business wants ("proteine tunisie"),
 * and it was the one listing Googlebot could not read. Measured: a Googlebot fetch of /shop
 * returned ~1MB of HTML containing exactly TWELVE product links, all from an editorial block. The
 * catalogue itself lives in ShopPageClient behind a useSearchParams Suspense bailout, so it exists
 * only in the RSC flight payload — never as crawlable anchors.
 *
 * Category and product pages already had this treatment; /shop was excluded because middleware
 * gates the crawler rewrite on `!isReservedRouteSlug()`, and 'shop' is a reserved slug. That guard
 * is right for /blog, /cart and friends — it just also caught the one page that most needed the
 * rewrite. The middleware now names /shop explicitly rather than loosening the guard.
 *
 * CONTENT PARITY, NOT CLOAKING
 * This renders the SAME catalogue the human page renders, linked with the SAME canonical URLs, and
 * reuses the human page's generateMetadata verbatim so title, description and canonical cannot
 * drift. A bot sees the products a shopper sees; it just gets them as plain anchors instead of a
 * client-side grid. Divergence between the two views is what makes dynamic rendering indefensible,
 * and it has bitten this codebase repeatedly — keep them equal.
 *
 * ── NOW PAGINATED, AND PARITY IS WHY ──────────────────────────────────────────────────────────
 * This fetched the whole catalogue in one page, which was right when the catalogue was 410 products
 * and became wrong at 10,669. Two things broke at once:
 *
 *   1. getAllProductsComplete() caps at 3,000, so the crawler view silently listed 3,097 products
 *      and no link existed to the other 7,572 — from anywhere on the site.
 *   2. Even at the cap, a 3,000-anchor document is one Googlebot truncates, and it flattens the
 *      catalogue into a single undifferentiated list.
 *
 * The human page now reads ?page=N and renders twelve. This does the same, from the same parser and
 * the same URL builder, so the two views cannot drift on which twelve. That is the parity rule
 * above applied to pagination rather than abandoned because of it.
 */

// Same metadata object as the human page: title, description, canonical, facet noindex rules and
// prev/next. Re-exported rather than re-declared so the two can never disagree — including the
// page-N canonical and the "— Page N" title suffix that arrived with server-side pagination.
export { generateMetadata } from '@/app/(shop)/shop/page';

type PageProps = { searchParams: Promise<RawSearchParams> };

export default async function CrawlerShopPage({ searchParams }: PageProps) {
  const query = parseShopQuery(await searchParams);

  // loadForCache, not a bare catch: a transient upstream failure (the build runner getting
  // Cloudflare-403'd is the known one) renders empty but must NOT be baked into any cache entry,
  // or Googlebot gets an empty boutique pinned for the whole window.
  const [productsResponse, categories] = await Promise.all([
    loadForCache(
      () => getShopPage(query),
      { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getShopPage>>
    ),
    getCategories().catch(() => [] as Awaited<ReturnType<typeof getCategories>>),
  ]);

  const rawProducts = Array.isArray(productsResponse.products) ? productsResponse.products : [];

  // Resolve each product's subcategory so every link is the canonical /{subcategory}/{slug} and
  // never the legacy /shop/{slug}, which 301s. Linking products through redirects would have
  // recreated at a stroke the exact problem just fixed across the category pages.
  const products = enrichProductsWithSubcategory(rawProducts, categories);

  const totalPages = Math.max(1, productsResponse.pagination?.last_page ?? 1);
  const currentPage = Math.min(Math.max(1, productsResponse.pagination?.current_page ?? query.page), totalPages);
  const total = productsResponse.pagination?.total ?? products.length;

  const categoryLinks: CrawlerListLink[] = (categories ?? [])
    .filter((c): c is typeof c & { slug: string; designation_fr: string } =>
      Boolean(c?.slug && c?.designation_fr)
    )
    .map((c) => ({ name: c.designation_fr.trim(), url: `/${c.slug}` }));

  return (
    <CrawlerCategoryView
      kind="category"
      title="Boutique — Protéines & Compléments Alimentaires en Tunisie"
      introHtml={
        '<p>Tout le catalogue Protéine Tunisie : whey, créatine, gainers, BCAA, vitamines et ' +
        `équipement — ${total} références. Livraison partout en Tunisie, paiement à la livraison.</p>`
      }
      breadcrumbs={[
        { name: 'Accueil', url: '/' },
        { name: 'Boutique', url: '/shop' },
      ]}
      products={products}
      subCategories={categoryLinks}
      pagination={{
        currentPage,
        totalPages,
        // The same builder the human pager uses, so /shop?page=7 and the bot's "page suivante" are
        // byte-identical URLs rather than two spellings of one page.
        buildHref: (page) => buildShopUrl({ ...query, page }),
      }}
    />
  );
}
