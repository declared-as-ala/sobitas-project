/**
 * Internal crawler-serving route for products — the render target of the
 * "Feed the Crawler First" rewrite in middleware.ts.
 *
 * HOW IT FITS TOGETHER:
 *   1. A bot requests the real canonical URL, e.g. /whey-isolate/iso-100-dymatize-2-3kg.
 *   2. middleware.ts detects the crawler UA and REWRITES (not redirects) the request
 *      to /x-crawler/product/iso-100-dymatize-2-3kg. The bot's address bar / the URL it
 *      indexes stays the canonical one — a rewrite is invisible to the client.
 *   3. This route resolves the product and renders <CrawlerProductView>: complete,
 *      zero-JS, semantic SSR HTML + the full structured-data graph.
 *
 * WHY A SEPARATE ROUTE (instead of branching inside the product page on a header):
 *   Reading headers() inside the ISR product route would force it fully dynamic for
 *   EVERYONE, destroying the Core Web Vitals win for human visitors. A dedicated route
 *   keeps its own ISR cache namespace (keyed by /x-crawler/product/{slug}), so the
 *   crawler variant is cached independently and never shows up for real users.
 *
 * COMPLIANCE: the canonical URL and robots=index here point back at the real product
 * URL, and the content is a parity projection of the human page (see util/isCrawler.ts).
 */

import type { Metadata } from 'next';
import { notFound, permanentRedirect, unstable_rethrow } from 'next/navigation';
import { getErrorStatus } from '@/util/errorStatus';
import { getSimilarProducts } from '@/services/api';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { CrawlerProductView } from '@/app/components/crawler/CrawlerProductView';
import {
  buildProductJsonLd,
  buildBreadcrumbListSchema,
  buildFAQPageSchemaFromProductFaq,
  sanitizeBackendProductJsonLd,
} from '@/util/structuredData';
import { buildVideoObjectSchema } from '@/util/officialVideo';
import { buildProductCanonicalUrl, getProductBreadcrumbs, getProductPrimarySubCategory } from '@/util/productUrl';
import { retiredSlugDestination } from '@/util/retiredSlug';
import { htmlToText } from '@/util/sanitizeProductHtml';
import { buildShopProductSocialMetadata } from '@/util/productSeo';
import type { Product } from '@/types';

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getCachedProductDetails(slug);
    if (!product?.id) return { robots: { index: false, follow: true } };
    const canonical = buildProductCanonicalUrl(product);
    const title =
      product.seo?.title?.trim() ||
      `${product.designation_fr} – Prix Tunisie & Livraison Rapide | Protéine Tunisie`;
    const description =
      product.seo?.description?.trim() ||
      htmlToText(product.description_fr, 160) ||
      `Acheter ${product.designation_fr} en Tunisie. Prix, avis et livraison rapide.`;
    return {
      title: { absolute: title },
      description,
      // Canonical points at the REAL product URL, never /x-crawler/*.
      alternates: { canonical, languages: { 'fr-TN': canonical, 'x-default': canonical } },
      // The product's OWN robots directive, not a hardcoded yes.
      //
      // This route is the only one Googlebot ever sees for a product (middleware rewrites bot
      // traffic here), so a literal `index: true` meant the `seo_robots_index` column, its
      // Filament toggle and its API field were all decorative — there was no way to keep a single
      // product out of the index, and no way to pull one back once it was in.
      //
      // Harmless at 309 hand-curated products. Not harmless the moment an imported catalogue can
      // be published: publishing in controlled waves, holding thin pages back, and reversing a
      // wave that went badly ALL depend on this one value being real.
      //
      // Default true when the field is absent, so existing products behave exactly as before.
      robots: {
        index: product.seo?.robots?.index ?? true,
        follow: product.seo?.robots?.follow ?? true,
      },
      // Product photo as og:image, identical to the human route. Without this the route emitted no
      // openGraph at all, so the root layout's site-wide banner (og-banner.jpg) was inherited —
      // and since middleware rewrites bots here, GOOGLE saw the generic banner on every product
      // page while a browser saw the product. og:image is a candidate image signal, and a crawler
      // view that describes a different image than the page it stands in for is not parity.
      ...buildShopProductSocialMetadata({ product, title, description, canonicalUrl: canonical }),
    };
  } catch (e) {
    unstable_rethrow(e);
    // Genuine 404: the page body below either 301s a legacy -N slug or notFound()s. noindex is
    // the right interim answer there.
    if (getErrorStatus(e) === 404) return { robots: { index: false, follow: true } };
    // TRANSIENT: never let a throttled backend be the reason we hand Googlebot a noindex for a
    // LIVE product on the only route it is served. Rethrow -> uncached 5xx, which it retries.
    throw e;
  }
}

export default async function CrawlerProductPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) notFound();

  let product: Product | null = null;
  try {
    product = await getCachedProductDetails(cleanSlug);
  } catch (e) {
    unstable_rethrow(e);
    // Genuine 404 → 404 for the bot. Transient failure → rethrow so this ISR route never
    // caches a wrong 404 for a healthy product (Googlebot seeing 404s deindexes pages!).
    if (getErrorStatus(e) === 404) {
      /**
       * THE DEAD END, RESOLVED THE SAME WAY THE HUMAN ROUTE RESOLVES IT.
       *
       * This is the route Googlebot actually reaches: middleware REWRITES /{subcat}/{slug} to this
       * crawler view for bot UAs, so the recovery in app/(shop)/[slug]/[productSlug]/page.tsx never
       * runs for a crawler. Until now this branch carried only the legacy `-N` half of it, and the
       * gap was measurable — the same Search Console URLs, probed on 17/08/2026:
       *
       *     /creatine/gold-creatine-300g                 Chrome 200   Googlebot 404
       *     /gainers/serious-mass-5-45kg                 Chrome 200   Googlebot 404
       *     /vitamines/vegan-vitamin-d3-k2-240-tablets…  Chrome 200   Googlebot 404
       *
       * Search Console reports what Googlebot got, so those stayed in the "Not found (404)" bucket
       * while every check run from a desktop said they were fixed. `retiredSlugDestination` is the
       * shared resolver both routes now use; see util/retiredSlug.ts for the order and why.
       */
      const destination = await retiredSlugDestination(cleanSlug, { product: true });
      if (destination) permanentRedirect(destination);
      notFound();
    }
    throw e;
  }
  if (!product?.id) notFound();
  if (!getProductPrimarySubCategory(product)?.slug) {
    /**
     * A LIVE PRODUCT WITH NO SUBCATEGORY IS NOT A 404 — IT HAS A DIFFERENT URL.
     *
     * This condition used to fall into `notFound()` beside the missing-product case, on the
     * reasoning that a product with no subcategory is "not a resolvable canonical product". It is:
     * `buildProductUrlPath` serves it at /shop/{slug}, and app/(shop)/[slug]/[productSlug] has
     * always redirected there. Only the crawler view treated it as fatal.
     *
     * Measured 17/08/2026: /eaa/beef-aminos-200-tabs answered 200 to Chrome and 404 to Googlebot.
     * The product is API id=122 with `publier: true` — on sale, in the catalogue, and 404 to the
     * only agent whose opinion shows up in Search Console.
     */
    permanentRedirect(`/shop/${product.slug ?? cleanSlug}`);
  }

  const similarProducts = product.sous_categorie_id
    ? await getSimilarProducts(product.sous_categorie_id).then((s) => s?.products ?? []).catch(() => [] as Product[])
    : [];

  const canonicalUrl = buildProductCanonicalUrl(product);
  const apiLd = product.json_ld_product;
  const productSchema =
    apiLd != null && typeof apiLd === 'object' && Object.keys(apiLd).length > 0
      ? sanitizeBackendProductJsonLd(product, apiLd, canonicalUrl) ?? buildProductJsonLd(product, canonicalUrl)
      : buildProductJsonLd(product, canonicalUrl);
  const breadcrumbSchema = buildBreadcrumbListSchema(getProductBreadcrumbs(product), BASE_URL);
  const faqSchema = buildFAQPageSchemaFromProductFaq(product.faq);
  // Only emitted when a validated official video id is present; see util/officialVideo.ts.
  const videoSchema = buildVideoObjectSchema(product?.official_video, product?.designation_fr ?? '', canonicalUrl);

  return (
    <>
      {productSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      {videoSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }} />
      )}
      <CrawlerProductView product={product} similarProducts={similarProducts} />
    </>
  );
}


/**
 * Opt this route into the Full Route Cache. See the long note in app/(shop)/[slug]/page.tsx —
 * Next only registers a dynamic segment in prerenderManifest.dynamicRoutes when the route exports
 * generateStaticParams, and without that entry `export const revalidate` is inert and every
 * request re-renders. An EMPTY array is sufficient: on-demand ISR then covers every path.
 * Deliberately NOT enumerating the catalogue — `next build` runs in CI where Cloudflare 403s the
 * runner, so a fetched list would come back empty or partial and bake bad pages.
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}
