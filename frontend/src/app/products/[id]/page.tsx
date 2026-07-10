import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { getSimilarProducts } from '@/services/api';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { ProductDetailFallbackClient } from '@/app/shop/ProductDetailFallbackClient';
import { ProductDetailSkeleton } from '@/app/components/ProductDetailSkeleton';
import { buildCanonicalUrl } from '@/util/canonical';
import { buildProductUrlPath, getProductPrimarySubCategory, buildProductCanonicalUrl } from '@/util/productUrl';

const ProductDetailClient = nextDynamic(() => import('./ProductDetailClient').then((m) => ({ default: m.ProductDetailClient })), {
  loading: () => <ProductDetailSkeleton />,
});

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
      || `Achetez ${product.designation_fr} en Tunisie – Proteine Tunisie, protéines et compléments.`;
    const canonical = product.slug?.trim()
      ? (getProductPrimarySubCategory(product)?.slug
          ? buildProductCanonicalUrl(product)
          : buildCanonicalUrl(`/shop/${product.slug.trim()}`))
      : undefined;

    return {
      title: product.designation_fr,
      description,
      robots: { index: false, follow: true },
      ...(canonical ? { alternates: { canonical } } : {}),
    };
  } catch (error) {
    return {
      title: 'Produit | Proteine Tunisie',
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
    // Canonical product URL is /{sousCategorySlug}/{productSlug}.
    // Permanent 301 directly to the new URL — no chain through /shop/.
    if (product.slug) {
      const sub = getProductPrimarySubCategory(product);
      const dest = sub?.slug
        ? buildProductUrlPath(product)
        : `/shop/${encodeURIComponent(product.slug)}`;
      permanentRedirect(dest);
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
