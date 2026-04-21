import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getProductDetails, getSimilarProducts, getStorageUrl } from '@/services/api';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductDetailFallbackClient } from '@/app/shop/ProductDetailFallbackClient';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getProductDetails(id);
    const imageUrl = product.cover ? getStorageUrl(product.cover) : '';
    
    return {
      title: product.designation_fr,
      description: product.description_cover || product.description_fr || `Achetez ${product.designation_fr} en Tunisie – SOBITAS, protéines et compléments à Sousse.`,
      openGraph: {
        title: product.designation_fr,
        description: product.description_cover || product.description_fr || '',
        images: imageUrl ? [imageUrl] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: product.designation_fr,
        description: product.description_cover || product.description_fr || '',
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Produit | SOBITAS Tunisie',
      description: 'Protéines, whey, créatine et compléments alimentaires en Tunisie.',
    };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;

  if (!id?.trim()) {
    notFound();
  }

  try {
    const product = await getProductDetails(id);
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
