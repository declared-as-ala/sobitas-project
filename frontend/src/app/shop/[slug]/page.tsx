import { redirect } from 'next/navigation';

export type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Legacy route: /shop/[slug] now redirects to /category/[slug].
 * Use /category/[slug] for categories/subcategories and /product/[slug] for products.
 */
export default async function ShopSlugRedirect({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) redirect('/shop');
  redirect(`/category/${encodeURIComponent(cleanSlug)}`);
}
