import { Metadata } from 'next';
import { notFound, permanentRedirect, unstable_rethrow } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSimilarProducts } from '@/services/api';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { ApiError } from '@/services/http';
import { buildCanonicalUrl } from '@/util/canonical';
import { buildShopProductSocialMetadata } from '@/util/productSeo';
import { buildProductCanonicalUrl, buildProductUrlPath, getProductPrimarySubCategory } from '@/util/productUrl';
import {
  buildProductJsonLd,
  buildBreadcrumbListSchema,
  buildWebPageSchema,
  buildFAQPageSchemaFromProductFaq,
  sanitizeBackendProductJsonLd,
  validateStructuredData,
} from '@/util/structuredData';
import type { Product } from '@/types';
import { buildMetaDescription } from '@/util/sanitizeProductHtml';

const ProductDetailClient = dynamic(() => import('@/app/(shop)/products/[id]/ProductDetailClient').then((m) => ({ default: m.ProductDetailClient })), {
  loading: () => <div className="min-h-screen animate-pulse bg-gray-50" />,
});

/** Extract HTTP status from error. Only use for deciding redirect: redirect only when status === 404 (never on 5xx/timeout/network). */
function getErrorStatus(e: unknown): number | null {
  if (e instanceof ApiError) return e.status;
  const ax = e as { response?: { status?: number } };
  if (ax?.response && typeof ax.response.status === 'number') return ax.response.status;
  return null;
}

export type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// ISR: revalidate every 5min for product pages
export const revalidate = 300;

/** Build /:slug category URL and preserve query params (UTM, etc.) for redirect. */
function buildCategoryRedirectUrl(
  slug: string,
  searchParams: Record<string, string | string[] | undefined> | undefined
): string {
  const base = `/${encodeURIComponent(slug)}`;
  if (!searchParams || Object.keys(searchParams).length === 0) return base;
  const q = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((v) => q.append(key, String(v)));
    else if (value != null && value !== '') q.set(key, String(value));
  });
  const query = q.toString();
  return query ? `${base}?${query}` : base;
}

/** CTR-optimized product title for Tunisia SERP (aim: position #1). Format: Product Name – Prix Tunisie & Livraison Rapide | Protéine Tunisie */
function productTitle(product: Product): string {
  const explicit = product.seo?.title || product.seo_title || product.meta_title;
  if (explicit?.trim()) return explicit.trim();
  const name = product.designation_fr ?? product.slug ?? 'Produit';
  return `${name} – Prix Tunisie & Livraison Rapide | Protéine Tunisie`;
}

/** Meta description: benefit + authenticity + delivery + location (Tunisie). Max 160 chars. */
function productDescription(product: Product, productName: string): string {
  const explicit = product.seo?.description || product.seo_description || product.meta_description || product.meta_description_fr;
  if (explicit?.trim()) {
    // Same two defects as the canonical product route: entities were DELETED rather than decoded
    // (dropping words), and .slice() cut mid-word. See (shop)/[slug]/[productSlug]/page.tsx.
    const plain = buildMetaDescription(explicit, { title: productName, maxLen: 160 });
    if (plain) return plain;
  }
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

function ensureProductionDomain(url: string, fallbackPath: string): string {
  try {
    const parsed = new URL(url);
    if (/sobitas\.tn$/i.test(parsed.hostname)) {
      return `https://protein.tn${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    if (url.startsWith('/')) return `https://protein.tn${url}`;
    return `https://protein.tn${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
  }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) return { title: 'Produit | Protéine Tunisie' };
  const search = searchParams ? await searchParams : undefined;
  try {
    const product = await getCachedProductDetails(cleanSlug);
    if (product?.id) {
      const title = productTitle(product);
      const description = productDescription(product, product.designation_fr ?? product.slug ?? 'Produit');
      
      // Always compute canonical from subcategory — never trust seo.canonical_url (C3 fix)
      const canonicalUrl = ensureProductionDomain(
        buildProductCanonicalUrl(product),
        buildProductUrlPath(product)
      );
      
      return {
        title: { absolute: title },
        description,
        keywords: productKeywords(product),
        robots: {
          index: (product.publier as any) === 1 || (product.publier as any) === true || product.publier === undefined,
          follow: (product.publier as any) === 1 || (product.publier as any) === true || product.publier === undefined,
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
    }
  } catch (e) {
    unstable_rethrow(e);
    if (getErrorStatus(e) === 404) {
      permanentRedirect(buildCategoryRedirectUrl(cleanSlug, search));
    }
    // TRANSIENT: rethrow so a throttled backend yields an uncached 5xx, not a 200 titled
    // "Produit | Protéine Tunisie" with no canonical. Matches the page body, which already rethrows.
    throw e;
  }
  // Reached only when the API returned a body with no id — unresolvable, never indexable.
  return { title: 'Produit | Protéine Tunisie', robots: { index: false, follow: false } };
}

/** Product detail page – legacy URL /shop/:slug. 
 * Now redirects with 301 to new SEO-friendly URL /{sousCategorySlug}/{productSlug}
 * unless the product has no subcategory (edge case).
 */
export default async function ShopProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) notFound();

  const search = searchParams ? await searchParams : undefined;

  // 1) Try product first
  let product: Product | null = null;
  try {
    product = await getCachedProductDetails(cleanSlug);
  } catch (e) {
    unstable_rethrow(e);
    if (getErrorStatus(e) === 404) {
      // Product not found → try category redirect
      permanentRedirect(buildCategoryRedirectUrl(cleanSlug, search));
    }
    // Transient failure: rethrow instead of caching a wrong 404 on this ISR route.
    throw e;
  }

  if (!product?.id) {
    // Product not found → redirect to category
    permanentRedirect(buildCategoryRedirectUrl(cleanSlug, search));
  }

  const safeProduct = product!;
  
  // 2) Check if product has a subcategory - if yes, redirect to new URL with 301
  const subCategory = getProductPrimarySubCategory(safeProduct);
  if (subCategory?.slug) {
    // Product has subcategory → permanent 301 redirect to new URL
    const newUrl = buildProductCanonicalUrl(safeProduct);
    permanentRedirect(newUrl);
  }
  
  // Edge case: product has no subcategory → stay on legacy URL (no redirect)
  // This handles products that don't belong to any subcategory

  const similarPromise = safeProduct.sous_categorie_id
    ? getSimilarProducts(safeProduct.sous_categorie_id).then((s) => s?.products ?? []).catch(() => [] as Product[])
    : Promise.resolve([] as Product[]);

  const similarProducts = await similarPromise;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  
  // Use new canonical URL even for legacy display (edge case products)
  const newCanonicalUrl = buildProductCanonicalUrl(safeProduct);
  // C3 policy, already enforced on the canonical /{subcat}/{slug} route: the product canonical is
  // ALWAYS computed from the live subcategory, never from products.seo_canonical_url — those rows
  // still hold pre-migration /shop/... and sobitas.tn values that 301 or 404 today.
  const canonicalUrl = ensureProductionDomain(newCanonicalUrl, buildProductUrlPath(safeProduct));
  const apiLd = safeProduct.json_ld_product;
  const productSchema =
    apiLd != null && typeof apiLd === 'object' && Object.keys(apiLd).length > 0
      ? sanitizeBackendProductJsonLd(safeProduct, apiLd, canonicalUrl) ?? buildProductJsonLd(safeProduct, canonicalUrl)
      : buildProductJsonLd(safeProduct, canonicalUrl);
  if (productSchema) {
    validateStructuredData(productSchema as object, 'Product');
    if (process.env.NODE_ENV === 'development') {
      console.log('[Product JSON-LD]', JSON.stringify(productSchema, null, 2));
    }
  }

  // Build breadcrumbs with new URLs where applicable
  const breadcrumbItems = [
    { name: 'Accueil', url: '/' },
    { name: 'Boutique', url: '/shop' },
  ];
  const cat = safeProduct.sous_categorie?.categorie;
  const sub = safeProduct.sous_categorie;
  if (cat?.slug) breadcrumbItems.push({ name: cat.designation_fr || cat.slug, url: `/${cat.slug}` });
  if (sub?.slug && sub.slug !== cat?.slug) breadcrumbItems.push({ name: sub.designation_fr || sub.slug, url: `/${sub.slug}` });
  // For products with subcategory, use new URL; otherwise use legacy
  const productUrl = sub?.slug 
    ? buildProductUrlPath(safeProduct) 
    : `/shop/${safeProduct.slug || cleanSlug}`;
  breadcrumbItems.push({ name: safeProduct.designation_fr || safeProduct.slug || 'Produit', url: productUrl });
  const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, baseUrl);
  validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
  const webPageSchema = buildWebPageSchema(safeProduct.designation_fr, productUrl, baseUrl, {
    description: (safeProduct.description_fr || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 200),
  });

  const faqSchema = buildFAQPageSchemaFromProductFaq(safeProduct.faq);
  if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');

  return (
    <>
      {/* Single Product JSON-LD per page (Google Rich Results – Product snippets). Only one script when schema is valid. */}
      {productSchema != null && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <ProductDetailClient product={safeProduct} similarProducts={similarProducts} slugOverride={cleanSlug} breadcrumbItems={breadcrumbItems} />
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
