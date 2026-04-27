import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getSimilarProducts, getFAQs } from '@/services/api';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { ApiError } from '@/services/http';
import { buildCanonicalUrl } from '@/util/canonical';
import { buildShopProductSocialMetadata } from '@/util/productSeo';

/** Extract HTTP status from error. Only use for deciding redirect: redirect only when status === 404 (never on 5xx/timeout/network). */
function getErrorStatus(e: unknown): number | null {
  if (e instanceof ApiError) return e.status;
  const ax = e as { response?: { status?: number } };
  if (ax?.response && typeof ax.response.status === 'number') return ax.response.status;
  return null;
}
import {
  buildProductJsonLd,
  buildBreadcrumbListSchema,
  buildWebPageSchema,
  buildFAQPageSchema,
  buildFAQPageSchemaFromProductFaq,
  sanitizeBackendProductJsonLd,
  validateStructuredData,
} from '@/util/structuredData';
import { ProductDetailClient } from '@/app/products/[id]/ProductDetailClient';
import type { Product } from '@/types';

export type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// ISR: revalidate every 5min for product pages
export const revalidate = 300;

/** Build /category/:slug URL and preserve query params (UTM, etc.) for 301 redirect. */
function buildCategoryRedirectUrl(
  slug: string,
  searchParams: Record<string, string | string[] | undefined> | undefined
): string {
  const base = `/category/${encodeURIComponent(slug)}`;
  if (!searchParams || Object.keys(searchParams).length === 0) return base;
  const q = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((v) => q.append(key, String(v)));
    else if (value != null && value !== '') q.set(key, String(value));
  });
  const query = q.toString();
  return query ? `${base}?${query}` : base;
}

/** CTR-optimized product title for Tunisia SERP (aim: position #1). Format: Product Name – Prix Tunisie & Livraison Rapide | Protein Tunisie */
function productTitle(product: Product): string {
  const explicit = product.seo?.title || product.seo_title || product.meta_title;
  if (explicit?.trim()) return explicit.trim();
  const name = product.designation_fr ?? product.slug ?? 'Produit';
  return `${name} – Prix Tunisie & Livraison Rapide | Protein Tunisie`;
}

/** Meta description: benefit + authenticity + delivery + location (Tunisie). Max 160 chars. */
function productDescription(product: Product, productName: string): string {
  const explicit = product.seo?.description || product.seo_description || product.meta_description || product.meta_description_fr;
  if (explicit?.trim()) {
    const plain = explicit.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (plain) return plain.slice(0, 160);
  }
  const plain = (product.description_fr || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (plain) return `${plain} Prix Tunisie. Produits authentiques. Livraison 24-72h. Protein Tunisie.`;
  return `Acheter ${productName} en Tunisie – Meilleur prix, livraison rapide, produits authentiques. Sousse, Tunis, toute la Tunisie. Protein Tunisie.`;
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
  if (!cleanSlug) return { title: 'Produit | Protein Tunisie' };
  const search = searchParams ? await searchParams : undefined;
  try {
    const product = await getCachedProductDetails(cleanSlug);
    if (product?.id) {
      const title = productTitle(product);
      const description = productDescription(product, product.designation_fr ?? product.slug ?? 'Produit');
      const canonicalUrl = ensureProductionDomain(
        product.seo?.canonical_url?.trim() || buildCanonicalUrl(`/shop/${product.slug || cleanSlug}`),
        `/shop/${product.slug || cleanSlug}`
      );
      return {
        title: { absolute: title },
        description,
        keywords: productKeywords(product),
        robots: {
          index: product.seo?.robots?.index ?? true,
          follow: product.seo?.robots?.follow ?? true,
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
    if (getErrorStatus(e) === 404) {
      permanentRedirect(buildCategoryRedirectUrl(cleanSlug, search));
    }
    return { title: 'Produit | Protein Tunisie' };
  }
  return { title: 'Produit | Protein Tunisie' };
}

/** Product detail page – official URL: /shop/:slug. Anti-404: if slug is not a product, try 301 to /category/:slug (preserve query). */
export default async function ShopProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) notFound();

  const search = searchParams ? await searchParams : undefined;

  // 1) Try product first – if found, always 200 (never redirect a valid product)
  let product: Product | null = null;
  try {
    product = await getCachedProductDetails(cleanSlug);
  } catch (e) {
    if (getErrorStatus(e) === 404) {
      permanentRedirect(buildCategoryRedirectUrl(cleanSlug, search));
    }
    notFound();
  }

  if (product?.id) {
    // Valid product → render product page (no redirect)
  } else {
    // 2) Product not found → redirect to /category/:slug (old /shop/* links). Category page will 404 if slug doesn't exist.
    permanentRedirect(buildCategoryRedirectUrl(cleanSlug, search));
  }

  // From here product is defined and has id
  const safeProduct = product!;

  const similarPromise = safeProduct.sous_categorie_id
    ? getSimilarProducts(safeProduct.sous_categorie_id).then((s) => s?.products ?? []).catch(() => [] as Product[])
    : Promise.resolve([] as Product[]);
  const faqsPromise = getFAQs().catch(() => [] as Awaited<ReturnType<typeof getFAQs>>);

  const [similarProducts, faqs] = await Promise.all([similarPromise, faqsPromise]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  const canonicalUrl = ensureProductionDomain(
    safeProduct.seo?.canonical_url?.trim() || buildCanonicalUrl(`/shop/${safeProduct.slug || cleanSlug}`),
    `/shop/${safeProduct.slug || cleanSlug}`
  );
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

  const breadcrumbItems = [
    { name: 'Accueil', url: '/' },
    { name: 'Boutique', url: '/shop' },
  ];
  const cat = safeProduct.sous_categorie?.categorie;
  const sub = safeProduct.sous_categorie;
  if (cat?.slug) breadcrumbItems.push({ name: cat.designation_fr || cat.slug, url: `/category/${cat.slug}` });
  if (sub?.slug && sub.slug !== cat?.slug) breadcrumbItems.push({ name: sub.designation_fr || sub.slug, url: `/category/${sub.slug}` });
  breadcrumbItems.push({ name: safeProduct.designation_fr || safeProduct.slug || 'Produit', url: `/shop/${safeProduct.slug || cleanSlug}` });
  const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, baseUrl);
  validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
  const webPageSchema = buildWebPageSchema(safeProduct.designation_fr, `/shop/${cleanSlug}`, baseUrl, {
    description: (safeProduct.description_fr || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 200),
  });

  const faqSchema = buildFAQPageSchemaFromProductFaq(safeProduct.faq) || buildFAQPageSchema(faqs);
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
