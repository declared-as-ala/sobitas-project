import { Metadata } from 'next';
import { getBestSellers, getNewProducts } from '@/services/api';
import { FavorisPageClient } from './FavorisPageClient';

export const metadata: Metadata = {
  title: 'Favoris',
  description: 'Vos produits favoris – Proteine Tunisie',
  // Personal wishlist — must not be indexed. This was the only private page with no
  // protection on EITHER layer (no robots meta AND not in robots.txt), so it must stay
  // crawlable (do NOT add to robots.txt disallow) for Googlebot to see this noindex.
  robots: { index: false, follow: false },
};

/**
 * ── THE SUGGESTION RAILS ARE FETCHED ON THE SERVER, NOT IN THE BROWSER ──────────────────────
 * Owner, 20/08/2026: *"on mobile and desktop redesign the favoris page and add in it suggested
 * products and better products and related products etc."*
 *
 * The wishlist itself cannot come from here — it lives in localStorage and the server has no idea
 * what is in it. The RECOMMENDATIONS can, and they are the part that matters most on the screen
 * this page shows most often: an EMPTY favourites list. That state used to be a box, one sentence
 * and a button, on a page with nothing else on it. Now the shop is under it.
 *
 * Two calls, both already cached and both already used by the homepage, so this adds no new
 * endpoint and no new query. They are deliberately NOT wrapped in `loadForCache`: they are
 * secondary content by that helper's own rule — the page's primary content is the wishlist, which
 * is client-side — so a momentary API failure should drop a rail, never poison the route cache.
 *
 * `revalidate = 600` matches /packs. Best sellers and new arrivals do not move minute to minute.
 */
export const revalidate = 600;

export default async function FavorisPage() {
  const [bestSellers, newProducts] = await Promise.all([
    getBestSellers().catch(() => []),
    getNewProducts().catch(() => []),
  ]);

  return (
    <FavorisPageClient
      bestSellers={Array.isArray(bestSellers) ? bestSellers : []}
      newProducts={Array.isArray(newProducts) ? newProducts : []}
    />
  );
}
