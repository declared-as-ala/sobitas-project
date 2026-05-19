import { permanentRedirect } from 'next/navigation';

interface LegacySubCategoryRouteProps {
  params: Promise<{ slug: string; subcategory: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Legacy /shop/:category/:subcategory route. 301 to canonical /category/:subcategory
 * — sous-category pages live at /category/{slug} regardless of parent slug.
 * Avoids duplicate indexable URLs (was previously rendered as a distinct page).
 */
export default async function LegacySubCategoryRedirect({ params }: LegacySubCategoryRouteProps) {
  const { subcategory } = await params;
  const slug = (subcategory || '').trim();
  permanentRedirect(slug ? `/category/${encodeURIComponent(slug)}` : '/shop');
}
