import { ProductsSkeleton } from '@/app/components/ProductsSkeleton';
import { SHOP_GRID_COLS, SHOP_PER_PAGE } from '@/util/shopQuery';

/**
 * The route-level loading state for /shop.
 *
 * ── IT WAS THE PRE-CORRECTION GEOMETRY, AND THAT IS CLS ─────────────────────────────────────
 * This rendered `max-w-7xl … py-8 sm:py-12 lg:py-16` around a bare `<ProductsSkeleton />` — the
 * container the boutique used before it went full width, with the skeleton's default 12 cards in
 * its default 4-up ladder. The page it stands in for is `max-w-site … py-6 sm:py-8 lg:py-10` with
 * 24 cards in a 2/3/4 ladder.
 *
 * So every navigation into /shop drew a 1,280px-wide 4-up grid of 12 cards and then replaced it
 * with a 1,536px-wide 2/3/4 grid of 24 — a 320px horizontal jump at 1536 and a doubling of grid
 * height, on the page with the most cards on the site. A skeleton whose only job is to hold the
 * shape the content will take was holding a different one.
 *
 * `SHOP_GRID_COLS` and `SHOP_PER_PAGE` are imported rather than retyped so this cannot drift
 * again — the previous version drifted because the page changed and this file did not.
 */
export default function ShopLoading() {
  return (
    <main className="mx-auto w-full max-w-site px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <ProductsSkeleton gridClassName={SHOP_GRID_COLS} cardCount={SHOP_PER_PAGE} />
    </main>
  );
}
