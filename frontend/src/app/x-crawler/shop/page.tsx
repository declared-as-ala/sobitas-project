import { getAllProducts, getAllProductsComplete, getCategories } from '@/services/api';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { loadForCache } from '@/util/loadForCache';
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
 */

// Same metadata object as the human page: title, description, canonical, facet noindex rules and
// prev/next. Re-exported rather than re-declared so the two can never disagree.
export { generateMetadata } from '@/app/(shop)/shop/page';

export const revalidate = 300;

export default async function CrawlerShopPage() {
  // loadForCache, not a bare catch: a transient upstream failure (the build runner getting
  // Cloudflare-403'd is the known one) renders empty but must NOT be baked into the ISR cache,
  // or Googlebot gets an empty boutique pinned for the whole revalidate window.
  const [productsResponse, categories] = await Promise.all([
    loadForCache(
      // This route is the ONLY thing Googlebot sees for /shop. At the per_page default of 24 it
      // served a 24-product boutique to the crawler while humans saw the same 24 — consistent, and
      // consistently wrong. Must stay in step with (shop)/shop/page.tsx or it becomes cloaking.
      () => getAllProductsComplete(),
      { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getAllProducts>>
    ),
    getCategories().catch(() => [] as Awaited<ReturnType<typeof getCategories>>),
  ]);

  const rawProducts = Array.isArray(productsResponse.products) ? productsResponse.products : [];

  // Resolve each product's subcategory so every link is the canonical /{subcategory}/{slug} and
  // never the legacy /shop/{slug}, which 301s. Linking 303 products through redirects would have
  // recreated at a stroke the exact problem just fixed across the category pages.
  const products = enrichProductsWithSubcategory(rawProducts, categories);

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
        'équipement. Livraison partout en Tunisie, paiement à la livraison.</p>'
      }
      breadcrumbs={[
        { name: 'Accueil', url: '/' },
        { name: 'Boutique', url: '/shop' },
      ]}
      products={products}
      subCategories={categoryLinks}
    />
  );
}
