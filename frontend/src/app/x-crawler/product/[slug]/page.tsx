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
import { buildProductCanonicalUrl, getProductBreadcrumbs, getProductPrimarySubCategory } from '@/util/productUrl';
import { htmlToText } from '@/util/sanitizeProductHtml';
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
      robots: { index: true, follow: true },
    };
  } catch {
    return { robots: { index: false, follow: true } };
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
       * LEGACY NUMERIC SUFFIX — recovered HERE because this is the route Googlebot actually
       * reaches: middleware REWRITES /{subcat}/{slug} to this crawler view for bot UAs, so the
       * equivalent recovery in app/(shop)/[slug]/[productSlug]/page.tsx never runs for a crawler.
       * The old site emitted product URLs with a list index appended
       * (/creatine/creatine-real-pharm-300g-11); retrying without the trailing -N sends the bot
       * to the live product in ONE 301 instead of serving it a 404.
       *
       * Only reached after the FULL slug already 404'd, so real slugs ending in a number are
       * resolved normally above and never rewritten.
       */
      const baseSlug = cleanSlug.replace(/-\d+$/, '');
      if (baseSlug && baseSlug !== cleanSlug) {
        let fallback: Product | null = null;
        try {
          fallback = await getCachedProductDetails(baseSlug);
        } catch (retryError) {
          unstable_rethrow(retryError);
          fallback = null;
        }
        if (fallback?.id) permanentRedirect(buildProductCanonicalUrl(fallback));
      }
      notFound();
    }
    throw e;
  }
  if (!product?.id || !getProductPrimarySubCategory(product)?.slug) {
    // Not a resolvable canonical product — let the bot fall through to a 404 rather
    // than serve a half-empty page.
    notFound();
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

  return (
    <>
      {productSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <CrawlerProductView product={product} similarProducts={similarProducts} />
    </>
  );
}
