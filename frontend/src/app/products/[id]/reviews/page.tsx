import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductDetails } from '@/services/api';
import { ProductReviewsPageClient } from './ProductReviewsPageClient';

interface ProductReviewsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductReviewsPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getProductDetails(id);
    return {
      title: `Avis clients – ${product.designation_fr} | SOBITAS`,
      description: `Lisez les avis et notes des clients pour ${product.designation_fr}. SOBITAS Tunisie.`,
    };
  } catch {
    return { title: 'Avis clients | SOBITAS' };
  }
}

export default async function ProductReviewsPage({ params }: ProductReviewsPageProps) {
  const { id } = await params;
  try {
    const product = await getProductDetails(id);
    if (!product) notFound();
    return <ProductReviewsPageClient product={product} />;
  } catch {
    notFound();
  }
}
