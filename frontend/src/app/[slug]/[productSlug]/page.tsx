import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSimilarProducts, getFAQs } from '@/services/api';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { ApiError } from '@/services/http';
import {
  buildProductJsonLd,
  buildBreadcrumbListSchema,
  buildWebPageSchema,
  buildFAQPageSchema,
  buildFAQPageSchemaFromProductFaq,
  sanitizeBackendProductJsonLd,
  validateStructuredData,
} from '@/util/structuredData';
import { buildProductCanonicalUrl, buildProductUrlPath, getProductBreadcrumbs, isReservedRouteSlug, getProductPrimarySubCategory } from '@/util/productUrl';
import { buildShopProductSocialMetadata } from '@/util/productSeo';
import type { Product } from '@/types';

const ProductDetailClient = dynamic(() => import('@/app/products/[id]/ProductDetailClient').then((m) => ({ default: m.ProductDetailClient })), {
  loading: () => <div className="min-h-screen animate-pulse bg-gray-50" />,
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

/** Meta description: benefit + authenticity + delivery + location (Tunisie). Max 160 chars. */
function productDescription(product: Product, productName: string): string {
  const explicit = product.seo?.description || product.seo_description || product.meta_description || product.meta_description_fr;
  if (explicit?.trim()) {
    const plain = explicit.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (plain) return plain.slice(0, 160);
  }
  const plain = (product.description_fr || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (plain) return `${plain} Prix Tunisie. Produits authentiques. Livraison 24-72h. Protéine Tunisie.`;
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
      robots: {
        index: isPublished,
        follow: isPublished,
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
    if (getErrorStatus(e) === 404) {
      // Product not found - try legacy shop URL redirect
      permanentRedirect(`/shop/${cleanProductSlug}`);
    }
    return { title: 'Produit | Protéine Tunisie' };
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
    if (getErrorStatus(e) === 404) {
      // Product not found - redirect to legacy shop URL
      permanentRedirect(`/shop/${cleanProductSlug}`);
    }
    notFound();
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

  const similarPromise = product.sous_categorie_id
    ? getSimilarProducts(product.sous_categorie_id).then((s) => s?.products ?? []).catch(() => [] as Product[])
    : Promise.resolve([] as Product[]);
  const faqsPromise = getFAQs().catch(() => [] as Awaited<ReturnType<typeof getFAQs>>);

  const [similarProducts, faqs] = await Promise.all([similarPromise, faqsPromise]);

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

  const faqSchema = buildFAQPageSchemaFromProductFaq(product.faq) || buildFAQPageSchema(faqs);
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
      <ProductDetailClient 
        product={product} 
        similarProducts={similarProducts} 
        slugOverride={cleanProductSlug} 
        breadcrumbItems={breadcrumbItems}
      />
    </>
  );
}
