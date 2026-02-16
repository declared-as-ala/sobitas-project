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
  if (!cleanSlug) return { title: 'Produit | SOBITAS Tunisie' };
  try {
    const product = await getProductDetails(cleanSlug);
    if (product?.id) {
      const title = productTitle(product);
      return {
        title,
        description: productDescription(product, product.designation_fr ?? product.slug ?? 'Produit'),
        alternates: { canonical: buildCanonicalUrl(`/shop/${slug}`) },
        openGraph: { title, description: productDescription(product, product.designation_fr ?? product.slug ?? 'Produit') },
      };
    }
  } catch {
    // Not a product, try legacy category redirect
  }
  try {
    await fetchCategoryOrSubCategory(cleanSlug);
    permanentRedirect(`/category/${cleanSlug}`);
  } catch {
    // Not a category either
  }
  return { title: 'Produit | SOBITAS Tunisie' };
}

/** Product detail page – official URL: /shop/:slug */
export default async function ShopProductPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) notFound();

  // 1) Try product first (primary use of /shop/:slug)
  let product: Product | null = null;
  try {
    product = await getProductDetails(cleanSlug);
  } catch (e) {
    // Not a product or API error
  }

  if (product?.id) {
    // Slug is a product → show product page (no redirect)
  } else {
    // 2) Legacy: slug might be a category that used to live at /shop (e.g. /shop/fat-burner → /category/fat-burner)
    try {
      await fetchCategoryOrSubCategory(cleanSlug);
      permanentRedirect(`/category/${cleanSlug}`);
    } catch {
      // Not a category either → 404
      notFound();
    }
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';
  const productSchema = buildProductSchema(safeProduct, baseUrl);
  validateStructuredData(productSchema, 'Product');

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <ProductDetailClient product={safeProduct} similarProducts={similarProducts} slugOverride={cleanSlug} />
    </>
  );
}
