import type { Metadata } from 'next';
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
  permanentRedirect(slug ? `/${encodeURIComponent(slug)}` : '/shop');
}

/**
 * Middleware now answers this path BEFORE the page renders (see the "THREE-SEGMENT /shop PATHS"
 * block in middleware.ts) — a real 301, or 410 when the target is definitively gone. This route
 * survives only as the fail-open path for when the backend is unreachable and middleware
 * deliberately declines to guess.
 *
 * On that path `permanentRedirect()` degrades to `<meta http-equiv="refresh">` at HTTP 200, so the
 * metadata below is what a crawler would judge. noindex is the only safe answer for a URL whose
 * destination could not be resolved.
 */
export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: true } };
}
