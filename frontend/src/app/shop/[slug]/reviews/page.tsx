import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { ProductReviewsPageClient } from '@/app/products/[id]/reviews/ProductReviewsPageClient';

interface ProductReviewsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductReviewsPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getCachedProductDetails(slug);
    return {
      title: `Avis clients – ${product.designation_fr} | Proteine Tunisie`,
      description: `Lisez les avis et notes des clients pour ${product.designation_fr}. Proteine Tunisie Tunisie.`,
    };
  } catch {
    return { title: 'Avis clients | Proteine Tunisie' };
  }
}

export default async function ProductReviewsPage({ params }: ProductReviewsPageProps) {
  const { slug } = await params;
  try {
    const product = await getCachedProductDetails(slug);
    if (!product?.id) notFound();
    return <ProductReviewsPageClient product={product} />;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.message === 'Product not found') notFound();
    throw error;
  }
}
