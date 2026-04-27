import { permanentRedirect } from 'next/navigation';

interface ProductReviewsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductReviewsPage({ params }: ProductReviewsPageProps) {
  const { id } = await params;
  const safeId = encodeURIComponent((id || '').trim());
  permanentRedirect(`/products/${safeId}#reviews`);
}
