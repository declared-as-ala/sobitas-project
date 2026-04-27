import { permanentRedirect } from 'next/navigation';

interface ProductReviewsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductReviewsPage({ params }: ProductReviewsPageProps) {
  const { slug } = await params;
  const safeSlug = encodeURIComponent((slug || '').trim());
  permanentRedirect(`/shop/${safeSlug}#reviews`);
}
