import { Metadata } from 'next';
import { notFound, permanentRedirect, unstable_rethrow } from 'next/navigation';
import { retiredSlugDestination } from '@/util/retiredSlug';
import dynamic from 'next/dynamic';
import { getSimilarProducts } from '@/services/api';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { ProductDetailSkeleton } from '@/app/components/ProductDetailSkeleton';
import { ApiError } from '@/services/http';
import {
  buildProductJsonLd,
  buildBreadcrumbListSchema,
  buildWebPageSchema,
  buildFAQPageSchemaFromProductFaq,
  sanitizeBackendProductJsonLd,
  validateStructuredData,
} from '@/util/structuredData';
import { buildVideoObjectSchema } from '@/util/officialVideo';
import { buildProductCanonicalUrl, buildProductUrlPath, getProductBreadcrumbs, isReservedRouteSlug, getProductPrimarySubCategory } from '@/util/productUrl';
import { buildShopProductSocialMetadata } from '@/util/productSeo';
import type { Product } from '@/types';
import { buildMetaDescription } from '@/util/sanitizeProductHtml';
import { getComplementProducts } from '@/services/productComplements';
import { getPriceDisplay } from '@/util/productPrice';

const ProductDetailClient = dynamic(() => import('@/app/(shop)/products/[id]/ProductDetailClient').then((m) => ({ default: m.ProductDetailClient })), {
  loading: () => <ProductDetailSkeleton />,
});

export type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

/** Extract HTTP status from error. */
function getErrorStatus(e: unknown): number | null {
  if (e instanceof ApiError) return e.status;
  const ax = e as { response?: { status?: number } };
  if (ax?.response && typeof ax.response.status === 'number') return ax.response.status;
  return null;
}

/** CTR-optimized product title for Tunisia SERP. */
function productTitle(product: Product): string {
  const explicit = product.seo?.title || product.seo_title || product.meta_title;
  if (explicit?.trim()) return explicit.trim();
  const name = product.designation_fr ?? product.slug ?? 'Produit';
  return `${name} – Prix Tunisie & Livraison Rapide | Protéine Tunisie`;
}

/**
 * Meta description: benefit + authenticity + delivery + location (Tunisie). Max 160 chars.
 *
 * Two defects fixed here, both visible in live search results:
 *
 * 1. `.replace(/&[a-z]+;/gi, ' ')` DELETED entities instead of decoding them, so
 *    "MUSCULAIRE &amp; PERFORMANCE" reached Google as "MUSCULAIRE   PERFORMANCE" — the word
 *    silently gone. This is the same bug fixed for categories in #192 and blog posts in #195;
 *    this path was the last one still carrying it. `buildMetaDescription` decodes properly.
 * 2. `.slice(0, 160)` cut mid-word. Google appends its own ellipsis to long descriptions, so a
 *    snippet ending on half a word is damage we inflicted, not Google.
 *
 * It also drops a leading repetition of the product name, which the CMS copy almost always opens
 * with — that name is already the title on the line above, so restating it burned ~40 characters
 * of a 160-character budget.
 */
function productDescription(product: Product, productName: string): string {
  const explicit = product.seo?.description || product.seo_description || product.meta_description || product.meta_description_fr;
  if (explicit?.trim()) {
    const plain = buildMetaDescription(explicit, { title: productName, maxLen: 160 });
    if (plain) {
      /*
       * Imported catalogue rows often carry one identical template with only the category changed:
       * "… en Tunisie. Livraison 24-72h… paiement… authentique." It is valid text but weak SERP
       * copy—the highest-impression example, Omega 3 Fish Oil, earned 3,475 impressions at position
       * 7.4 and only 0.75% CTR. Google explicitly recommends bringing scattered product facts such
       * as price together in a product description, so enrich ONLY that known template. Hand-written
       * benefit copy remains authoritative.
       */
      const isGenericImportTemplate =
        /livraison\s+24\s*[-–]\s*72h/i.test(plain) &&
        /paiement\s+[àa]\s+la\s+livraison/i.test(plain) &&
        /authentique/i.test(plain);

      if (!isGenericImportTemplate) return plain;

      const price = getPriceDisplay(product).finalPrice;
      const priceText = Number.isFinite(price) && price > 0 ? ` : ${Math.round(price)} DT` : '';
      return buildMetaDescription(
        `${productName}${priceText}. Livraison 24–72h partout en Tunisie, paiement à la livraison. Produit authentique.`,
        { maxLen: 160 }
      );
    }
  }
  // Leave room for the trust line rather than truncating it away.
  const plain = buildMetaDescription(product.description_fr, { title: productName, maxLen: 90 });
  if (plain) return `${plain} Prix Tunisie. Livraison 24-72h. Protéine Tunisie.`;
  return `Acheter ${productName} en Tunisie – Meilleur prix, livraison rapide, produits authentiques. Sousse, Tunis, toute la Tunisie. Protéine Tunisie.`;
}

function productKeywords(product: Product): string[] {
  const seed = [
    'proteine tunisie',
    'creatine tunisie',
    'whey tunisie',
    'complément alimentaire tunisie',
    product.designation_fr,
    product.brand?.designation_fr,
    product.sous_categorie?.designation_fr,
    ...(product.tags?.map((tag) => tag.designation_fr) ?? []),
  ];

  return [...new Set(seed.filter((value): value is string => !!value && value.trim().length > 0).map((value) => value.trim()))];
}

/** Ensure URL uses production domain. */
function ensureProductionDomain(url: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  try {
    const parsed = new URL(url);
    if (/sobitas\.tn$/i.test(parsed.hostname)) {
      return `${baseUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    if (url.startsWith('/')) return `${baseUrl}${url}`;
    return `${baseUrl}/shop/${url}`;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const cleanSubCatSlug = slug?.trim();
  const cleanProductSlug = productSlug?.trim();

  // Check for reserved route conflicts - redirect to shop
  if (cleanSubCatSlug && isReservedRouteSlug(cleanSubCatSlug)) {
    permanentRedirect(`/shop/${cleanProductSlug}`);
  }

  if (!cleanProductSlug) return { title: 'Produit | Protéine Tunisie' };

  try {
    const product = await getCachedProductDetails(cleanProductSlug);
    if (!product?.id) {
      return { title: 'Produit | Protéine Tunisie' };
    }

    // Validate product belongs to claimed subcategory
    const subCategory = getProductPrimarySubCategory(product);
    if (subCategory && subCategory.slug !== cleanSubCatSlug) {
      // Product exists but in different subcategory - redirect to correct URL
      const correctUrl = buildProductCanonicalUrl(product);
      return {
        alternates: {
          canonical: correctUrl,
        },
      };
    }

    // If product has no subcategory, redirect to shop
    if (!subCategory) {
      permanentRedirect(`/shop/${cleanProductSlug}`);
    }

    const title = productTitle(product);
    const description = productDescription(product, product.designation_fr ?? product.slug ?? 'Produit');
    // Always compute canonical from subcategory — never trust API's seo.canonical_url
    // which may still point to legacy /shop/ paths causing sitemap/canonical mismatch (C3)
    const canonicalUrl = ensureProductionDomain(buildProductCanonicalUrl(product));

    const publier = product.publier as number | boolean | undefined;
    const isPublished = publier === 1 || publier === true || publier === undefined;

    return {
      title: { absolute: title },
      description,
      keywords: productKeywords(product),
      // Published AND not individually held back. Both must be true.
      //
      // `publier` is the shop's "is this for sale" switch; `seo.robots.index` is the separate
      // "may Google list it" switch. Honouring only the first meant a product could be marked
      // noindex in Filament and still be advertised as indexable here — and this route must agree
      // with x-crawler/product, which bots are rewritten to, or the two views of the same product
      // disagree about whether it belongs in the index.
      robots: {
        index: isPublished && (product.seo?.robots?.index ?? true),
        follow: isPublished && (product.seo?.robots?.follow ?? true),
      },
      alternates: {
        canonical: canonicalUrl,
        languages: {
          'fr-TN': canonicalUrl,
          'x-default': canonicalUrl,
        },
      },
      ...buildShopProductSocialMetadata({ product, title, description, canonicalUrl }),
    };
  } catch (e) {
    unstable_rethrow(e);
    if (getErrorStatus(e) === 404) {
      // Product not found - try legacy shop URL redirect
      permanentRedirect(`/shop/${cleanProductSlug}`);
    }
    // TRANSIENT (429/5xx/timeout). Returning generic metadata here produced the canonical-less
    // "Produit | Protéine Tunisie" shell on the site's primary indexable surface. The page body
    // below already rethrows transient failures for exactly this reason — metadata must match,
    // otherwise the two disagree and a throttled request yields a 200 with a wrong title.
    throw e;
  }
}

/**
 * New product page at /{sousCategorySlug}/{productSlug}
 * Validates product belongs to the claimed subcategory.
 */
export default async function NewProductPage({ params }: PageProps) {
  const { slug, productSlug } = await params;
  const cleanSubCatSlug = slug?.trim();
  const cleanProductSlug = productSlug?.trim();

  // Check for reserved route conflicts
  if (cleanSubCatSlug && isReservedRouteSlug(cleanSubCatSlug)) {
    permanentRedirect(`/shop/${cleanProductSlug}`);
  }

  if (!cleanProductSlug) notFound();

  let product: Product | null = null;
  try {
    product = await getCachedProductDetails(cleanProductSlug);
  } catch (e) {
    unstable_rethrow(e);
    if (getErrorStatus(e) === 404) {
      /**
       * LEGACY NUMERIC SUFFIX — the single largest source of GSC "Not found (404)".
       * The old site emitted hundreds of product URLs with a list index appended to the slug
       * (/creatine/creatine-real-pharm-300g-11, /musculation/leg-press-machine-46). Falling
       * straight through to /shop/{slug} turned each one into a 2-hop chain that still ended in
       * a 404. Retry the slug WITHOUT the trailing -N first: when the base product exists we can
       * send the legacy URL to its canonical page in a single 301.
       *
       * Only reached AFTER the full slug has already 404'd, so real slugs that merely end in a
       * number (omega-3, iso-whey-zero-2-27-kg) resolve normally and never hit this path.
       */
      /**
       * DEAD END, not a detour. We are here only because the API gave a DEFINITIVE 404 for the
       * full slug (and, for a legacy -N slug, for the base slug too). The old fallback redirected
       * to /shop/{slug} — but middleware then re-ran the same lookup there and 301'd again,
       * producing a 308 → 301 → 404 THREE-hop chain for every genuinely deleted product.
       *
       * ── AND THEN IT TRADED THREE HOPS FOR ONE HOP INTO THE SAME 404 ────────────────────
       * The fix for that chain was `permanentRedirect('/' + rootSlug)`, and the comment that
       * shipped with it said the quiet part out loud: it "returns a clean hard 404 when it is
       * not" a category. There is no such thing as a clean 404 behind a 301. Google spends the
       * hop, caches the redirect, still finds nothing, and every report shows the DESTINATION's
       * status instead of the URL that was actually requested — which is exactly how 1,060 pages
       * accumulated in the Search Console "Not found" bucket without anything naming the cause.
       *
       * Measured on production 14/08/2026, after the middleware half of this fix had shipped:
       *
       *     /creatine/gold-creatine-300g   301 → /gold-creatine-300g   404
       *
       * the last surviving failure in `check-dead-product-urls.mjs`, and it was this line.
       *
       * ── SAME RESOLUTION AS MIDDLEWARE, AND DELIBERATELY THE SAME HELPERS ───────────────
       * `isTaxonomySlug` answers the question the old code assumed: /proteines/whey-isolate is a
       * real category and must still redirect; /creatine/gold-creatine-300g is a deleted product
       * whose root segment is a product slug, and must not pretend otherwise.
       *
       *   true   a real category/brand → 301, unchanged behaviour, link equity kept
       *   null   the backend could not answer → 301 anyway. Unknown is not evidence of absence,
       *          and 404-ing live listings during a backend hiccup is far worse than one wasted
       *          hop. Same fail-open contract as util/taxonomySlugs.ts itself.
       *   false  positively not taxonomy → try for a RELEVANT category, else a terminal 404.
       *
       * 404 rather than 410 only because a Server Component cannot set an arbitrary status;
       * `notFound()` is the honest terminal answer available here, and it is strictly better than
       * a redirect into one. For a confirmed-deleted product worth a 410, add the path to
       * Filament → Redirections with code 410 — middleware checks that map FIRST, so it never
       * reaches this route.
       *
       * ── THE FOUR STEPS ABOVE NOW LIVE IN ONE FILE ──────────────────────────────────────
       * They were written here and copied, in half, into x-crawler/product/[slug] — which is the
       * route Googlebot actually gets, since middleware rewrites bot UAs to it. The copy carried
       * the `-N` retry and neither the taxonomy check nor the relevance match, so the same URL
       * answered 200 to Chrome and 404 to Googlebot, and Search Console reports the latter.
       * Sharing `retiredSlugDestination` is what stops that divergence recurring.
       */
      const destination = await retiredSlugDestination(cleanProductSlug, { product: true });
      if (destination) permanentRedirect(destination);
      notFound();
    }
    // Transient failure (429/5xx/timeout): rethrow. This ISR route (revalidate 300) would
    // otherwise CACHE a wrong 404 for a healthy product — the worst affichage bug possible
    // on a commerce page. The error boundary renders instead and is never cached.
    throw e;
  }

  if (!product?.id) {
    notFound();
  }

  // Validate product belongs to the claimed subcategory
  const subCategory = getProductPrimarySubCategory(product);
  
  if (subCategory && subCategory.slug !== cleanSubCatSlug) {
    // Wrong subcategory - redirect to correct URL
    const correctUrl = buildProductCanonicalUrl(product);
    permanentRedirect(correctUrl);
  }

  // If product has no subcategory, redirect to shop
  if (!subCategory) {
    permanentRedirect(`/shop/${cleanProductSlug}`);
  }

  /*
    Two independent lists, fetched TOGETHER rather than one after the other.

    `similarProducts` is the same sub-category — the rail at the bottom of the page and the
    comparison table. `complementProducts` is the other shelves — a creatine and a shaker for a
    whey — and it is what "Complétez votre commande" builds a basket from. Awaiting them in
    sequence would add the second round trip to TTFB for no reason; `Promise.all` overlaps them.

    The complement fetch is four 3 KB queries and returns [] immediately for a product that is not
    itself addable, which is 10,535 of 10,669 of them. See services/productComplements.ts.
  */
  const [similarProducts, complementProducts] = await Promise.all([
    product.sous_categorie_id
      ? getSimilarProducts(product.sous_categorie_id).then((s) => s?.products ?? []).catch(() => [] as Product[])
      : Promise.resolve([] as Product[]),
    getComplementProducts(product).catch(() => [] as Product[]),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  // Always compute from subcategory — never trust legacy seo.canonical_url (C3 fix)
  const canonicalUrl = ensureProductionDomain(buildProductCanonicalUrl(product));
  
  const apiLd = product.json_ld_product;
  const productSchema =
    apiLd != null && typeof apiLd === 'object' && Object.keys(apiLd).length > 0
      ? sanitizeBackendProductJsonLd(product, apiLd, canonicalUrl) ?? buildProductJsonLd(product, canonicalUrl)
      : buildProductJsonLd(product, canonicalUrl);
  if (productSchema) {
    validateStructuredData(productSchema as object, 'Product');
    if (process.env.NODE_ENV === 'development') {
      console.log('[Product JSON-LD]', JSON.stringify(productSchema, null, 2));
    }
  }

  // Build breadcrumbs using the utility
  const breadcrumbItems = getProductBreadcrumbs(product);
  const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, baseUrl);
  validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
  
  const webPageSchema = buildWebPageSchema(product.designation_fr, buildProductUrlPath(product), baseUrl, {
    description: (product.description_fr || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 200),
  });

  // FAQPage ONLY from the product's own FAQ (which the page renders). The old
  // `|| buildFAQPageSchema(getFAQs())` fallback emitted the sitewide /faqs FAQ — invisible on the
  // product page and duplicated across every product — a Google FAQ-policy violation.
  const faqSchema = buildFAQPageSchemaFromProductFaq(product.faq);
  // Only emitted when a validated official video id is present; see util/officialVideo.ts.
  const videoSchema = buildVideoObjectSchema(product?.official_video, product?.designation_fr ?? '', canonicalUrl);
  if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');

  return (
    <>
      {productSchema != null && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      {videoSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }} />
      )}
      <ProductDetailClient 
        product={product} 
        similarProducts={similarProducts} 
        complementProducts={complementProducts}
        slugOverride={cleanProductSlug} 
        breadcrumbItems={breadcrumbItems}
      />
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
export function generateStaticParams(): { slug: string; productSlug: string }[] {
  return [];
}
