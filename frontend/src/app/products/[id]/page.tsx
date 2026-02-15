import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductDetails, getSimilarProducts } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductDetailFallbackClient } from '@/app/shop/ProductDetailFallbackClient';
import type { Product } from '@/types';

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

function buildProductJsonLd(product: Product, baseUrl: string) {
  const imageUrl = product.cover ? getStorageUrl(product.cover) : '';
  const price = product.promo ?? product.prix;
  const inStock = (product as { rupture?: number }).rupture !== 1;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.designation_fr,
    description: (product.description_cover || product.description_fr || '').slice(0, 500),
    image: imageUrl || undefined,
    sku: String(product.id),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.designation_fr } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/product/${product.slug}`,
      priceCurrency: 'TND',
      price: price ?? 0,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'SOBITAS' },
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';

  if (!id?.trim()) {
    notFound();
  }

  try {
    const product = await getProductDetails(id);
    if (!product?.id) {
      notFound();
    }
    const similarData = product.sous_categorie_id
      ? await getSimilarProducts(product.sous_categorie_id).catch(() => ({ products: [] }))
      : { products: [] };

    const productSchema = buildProductJsonLd(product, baseUrl);

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
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
