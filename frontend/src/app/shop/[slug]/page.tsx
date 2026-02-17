import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getProductDetails, getSimilarProducts, getFAQs, getStorageUrl } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import {
  buildProductJsonLd,
  buildBreadcrumbListSchema,
  buildWebPageSchema,
  buildFAQPageSchema,
  validateStructuredData,
} from '@/util/structuredData';
import { ProductDetailClient } from '@/app/products/[id]/ProductDetailClient';
import type { Product } from '@/types';

export type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

/** CTR-optimized product title for Tunisia SERP (aim: position #1). Format: Product Name – Prix Tunisie & Livraison Rapide | Protein.tn */
function productTitle(product: { designation_fr?: string; slug?: string }): string {
  const name = product.designation_fr ?? product.slug ?? 'Produit';
  return `${name} – Prix Tunisie & Livraison Rapide | Protein.tn`;
}

/** Meta description: benefit + authenticity + delivery + location (Tunisie). Max 160 chars. */
function productDescription(product: { meta_description_fr?: string; description_fr?: string; designation_fr?: string }, productName: string): string {
  if (product.meta_description_fr?.trim()) return product.meta_description_fr.slice(0, 160);
  const plain = (product.description_fr || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (plain) return `${plain} Prix Tunisie. Produits authentiques. Livraison 24-72h. SOBITAS Protein.tn`;
  return `Acheter ${productName} en Tunisie – Meilleur prix, livraison rapide, produits authentiques. Sousse, Tunis, toute la Tunisie. Protein.tn`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) return { title: 'Produit | SOBITAS Tunisie' };
  const search = searchParams ? await searchParams : undefined;
  try {
    const product = await getProductDetails(cleanSlug);
    if (product?.id) {
      const title = productTitle(product);
      const description = productDescription(product, product.designation_fr ?? product.slug ?? 'Produit');
      const canonicalUrl = buildCanonicalUrl(`/shop/${cleanSlug}`);
      // Use only this product's cover so Google shows the correct image (never another product's).
      // Add ?for=<slug> so the image URL is unique per product and caches don't mix results.
      const baseImageUrl = product.cover ? getStorageUrl(product.cover) : null;
      const imageUrl =
        baseImageUrl && (baseImageUrl.startsWith('http://') || baseImageUrl.startsWith('https://'))
          ? `${baseImageUrl}${baseImageUrl.includes('?') ? '&' : '?'}for=${encodeURIComponent(cleanSlug)}`
          : null;
      const productName = product.designation_fr ?? product.slug ?? 'Produit';
      const ogImage = imageUrl
        ? { url: imageUrl, width: 1200, height: 1200, alt: productName }
        : undefined;
      return {
        title,
        description,
        robots: { index: true, follow: true },
        alternates: { canonical: canonicalUrl },
        openGraph: {
          type: 'website',
          url: canonicalUrl,
          title,
          description,
          siteName: 'Protein.tn',
          images: ogImage ? [ogImage] : undefined,
          locale: 'fr_TN',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: imageUrl ? [imageUrl] : undefined,
        },
      };
    }
  } catch {
    permanentRedirect(buildCategoryRedirectUrl(cleanSlug, search));
  }
  return { title: 'Produit | SOBITAS Tunisie' };
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
    product = await getProductDetails(cleanSlug);
  } catch {
    // Product not found or API error
  }

  if (product?.id) {
    // Valid product → render product page (no redirect)
  } else {
    // 2) Product not found → redirect to /category/:slug (old /shop/* links). Category page will 404 if slug doesn't exist.
    permanentRedirect(buildCategoryRedirectUrl(cleanSlug, search));
  }

  // From here product is defined and has id
  const safeProduct = product!;

  let similarProducts: Product[] = [];
  if (safeProduct.sous_categorie_id) {
    try {
      const similar = await getSimilarProducts(safeProduct.sous_categorie_id);
      similarProducts = similar?.products ?? [];
    } catch {
      // ignore
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  const canonicalUrl = buildCanonicalUrl(`/shop/${cleanSlug}`);
  const productSchema = buildProductJsonLd(safeProduct, canonicalUrl);
  if (productSchema) {
    validateStructuredData(productSchema, 'Product');
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
  breadcrumbItems.push({ name: safeProduct.designation_fr, url: `/shop/${cleanSlug}` });
  const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, baseUrl);
  validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
  const webPageSchema = buildWebPageSchema(safeProduct.designation_fr, `/shop/${cleanSlug}`, baseUrl, {
    description: (safeProduct.description_fr || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 200),
  });

  let faqSchema: ReturnType<typeof buildFAQPageSchema> = null;
  try {
    const faqs = await getFAQs();
    faqSchema = buildFAQPageSchema(faqs);
    if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');
  } catch {
    // ignore
  }

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
