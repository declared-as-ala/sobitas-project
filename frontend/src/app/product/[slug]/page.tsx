import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductDetails, getSimilarProducts } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { ProductDetailClient } from '@/app/products/[id]/ProductDetailClient';
import type { Product } from '@/types';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  
  try {
    const product = await getProductDetails(slug);
    const imageUrl = product.cover ? getStorageUrl(product.cover) : '';
    
    const title = `${product.designation_fr} - Protéines & Compléments Tunisie | SOBITAS`;
    const description = product.description_cover || product.description_fr || `Achetez ${product.designation_fr} en Tunisie – SOBITAS, protéines et compléments à Sousse.`;
    
    return {
      title,
      description,
      alternates: {
        canonical: `${baseUrl}/product/${slug}`,
      },
      openGraph: {
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
        url: `${baseUrl}/product/${slug}`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
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
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

  console.log(`[ProductPage] Resolving slug: "${slug}"`);

  try {
    const product = await getProductDetails(slug);
    
    if (!product || !product.id) {
      console.warn(`[ProductPage] Product "${slug}" returned empty data`);
      notFound();
    }

    console.log(`[ProductPage] Found product: "${product.designation_fr}"`);

    // Fetch similar products
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
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
