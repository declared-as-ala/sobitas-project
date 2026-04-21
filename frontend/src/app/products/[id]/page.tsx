import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getSimilarProducts } from '@/services/api';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductDetailFallbackClient } from '@/app/shop/ProductDetailFallbackClient';
import { buildCanonicalUrl } from '@/util/canonical';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getCachedProductDetails(id);
    const description =
      (product.description_cover || product.description_fr || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
      || `Achetez ${product.designation_fr} en Tunisie – SOBITAS, protéines et compléments.`;
    const canonical = product.slug?.trim() ? buildCanonicalUrl(`/shop/${product.slug.trim()}`) : undefined;

    return {
      title: product.designation_fr,
      description,
      robots: { index: false, follow: true },
      ...(canonical ? { alternates: { canonical } } : {}),
    };
  } catch (error) {
    return {
      title: 'Produit | SOBITAS Tunisie',
      description: 'Protéines, whey, créatine et compléments alimentaires en Tunisie.',
      robots: { index: false, follow: true },
    };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;

  if (!id?.trim()) {
    notFound();
  }

  try {
    const product = await getCachedProductDetails(id);
    if (!product?.id) {
      notFound();
    }
    // Canonical product URL is /shop/:slug; permanently redirect /products/:id to consolidate SEO
    if (product.slug) {
      permanentRedirect(`/shop/${encodeURIComponent(product.slug)}`);
    }
    const similarData = product.sous_categorie_id
      ? await getSimilarProducts(product.sous_categorie_id).catch(() => ({ products: [] }))
      : { products: [] };

    return (
      <>
        <ProductDetailClient product={product} similarProducts={similarData.products || []} />
      </>
    );
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.message === 'Product not found') {
      notFound();
    }
    console.warn('Error fetching product (network/retry on client):', error?.message || error);
    return <ProductDetailFallbackClient slug={String(id)} />;
  }
}
