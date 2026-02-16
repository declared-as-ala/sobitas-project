import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getProductDetails, getSimilarProducts, getFAQs, fetchCategoryOrSubCategory } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import {
  buildProductSchema,
  buildBreadcrumbListSchema,
  buildWebPageSchema,
  buildFAQPageSchema,
  validateStructuredData,
} from '@/util/structuredData';
import { ProductDetailClient } from '@/app/products/[id]/ProductDetailClient';
import type { Product } from '@/types';

export type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** CTR-optimized product title for Tunisia SERP (aim: position #1). */
function productTitle(product: { designation_fr?: string; slug?: string }): string {
  const name = product.designation_fr ?? product.slug ?? 'Produit';
  return `${name} – Meilleur Prix & Livraison Tunisie`;
}

/** Meta description with Tunisia intent (prix, livraison, SOBITAS). */
function productDescription(product: { meta_description_fr?: string; description_fr?: string; designation_fr?: string }, title: string): string {
  if (product.meta_description_fr?.trim()) return product.meta_description_fr.slice(0, 160);
  const plain = (product.description_fr || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  if (plain) return `${plain} Prix Tunisie. Livraison rapide SOBITAS.`;
  return `Acheter ${title} en Tunisie – Meilleur prix, livraison rapide Sousse Tunis. SOBITAS.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (cleanSlug) {
    try {
      await fetchCategoryOrSubCategory(cleanSlug);
      permanentRedirect(`/category/${cleanSlug}`);
    } catch {
      // Not a category slug, continue to product metadata
    }
  }
  try {
    const product = await getProductDetails(cleanSlug ?? slug);
    const title = productTitle(product);
    return {
      title,
      description: productDescription(product, product.designation_fr ?? product.slug ?? 'Produit'),
      alternates: {
        canonical: buildCanonicalUrl(`/shop/${slug}`),
      },
      openGraph: {
        title,
        description: productDescription(product, product.designation_fr ?? product.slug ?? 'Produit'),
      },
    };
  } catch {
    return { title: 'Produit | SOBITAS Tunisie' };
  }
}

/** Product detail page – official URL: /shop/:slug */
export default async function ShopProductPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) notFound();

  // Legacy: /shop/fat-burner etc. were category URLs; redirect to /category/slug so we don't lose links (301/308)
  try {
    await fetchCategoryOrSubCategory(cleanSlug);
    permanentRedirect(`/category/${cleanSlug}`);
  } catch {
    // Not a category, treat as product slug
  }

  let product: Product;
  try {
    product = await getProductDetails(cleanSlug);
  } catch (e) {
    console.error('Product fetch error:', e);
    notFound();
  }

  if (!product?.id) notFound();

  let similarProducts: Product[] = [];
  if (product.sous_categorie_id) {
    try {
      const similar = await getSimilarProducts(product.sous_categorie_id);
      similarProducts = similar?.products ?? [];
    } catch {
      // ignore
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';
  const productSchema = buildProductSchema(product, baseUrl);
  validateStructuredData(productSchema, 'Product');

  const breadcrumbItems = [
    { name: 'Accueil', url: '/' },
    { name: 'Boutique', url: '/shop' },
  ];
  const cat = product.sous_categorie?.categorie;
  const sub = product.sous_categorie;
  if (cat?.slug) breadcrumbItems.push({ name: cat.designation_fr || cat.slug, url: `/category/${cat.slug}` });
  if (sub?.slug && sub.slug !== cat?.slug) breadcrumbItems.push({ name: sub.designation_fr || sub.slug, url: `/category/${sub.slug}` });
  breadcrumbItems.push({ name: product.designation_fr, url: `/shop/${cleanSlug}` });
  const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, baseUrl);
  validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
  const webPageSchema = buildWebPageSchema(product.designation_fr, `/shop/${cleanSlug}`, baseUrl, {
    description: (product.description_fr || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 200),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <ProductDetailClient product={product} similarProducts={similarProducts} slugOverride={cleanSlug} />
    </>
  );
}
