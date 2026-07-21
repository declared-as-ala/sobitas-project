import { permanentRedirect } from 'next/navigation';

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * /brand/{slug} is a legacy duplicate of the canonical brand URL /{slug}. Issue a 301 so Google
 * consolidates on the single indexable brand URL instead of crawling a second identical copy.
 * The page only redirects, so it needs NO metadata — the previous generateMetadata ran a full
 * getAllBrands() fetch on every legacy hit only to have the result thrown away by the redirect.
 */
export default async function BrandPage({ params }: BrandPageProps) {
  const { slug: brandSlug } = await params;
  permanentRedirect(`/${encodeURIComponent(brandSlug)}`);
}
