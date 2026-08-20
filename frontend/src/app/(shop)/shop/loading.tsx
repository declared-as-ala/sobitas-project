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
 *
 * ── AND IT DRIFTED AGAIN, ONE LEVEL DOWN ────────────────────────────────────────────────────
 * The container matched. What did not was everything inside it: the real page puts its grid in
 * `<div className="flex-1 min-w-0">` beside a `<aside className="hidden w-[17rem] shrink-0
 * lg:block">`, inside `<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">` — and that
 * rail is OPEN by default (`showFiltersDesktop = useState(true)`). This file rendered the grid
 * straight into `<main>` with no rail at all.
 *
 * At a 1536 viewport: skeleton grid 1,472px, real grid 1,472 − 272 (17rem) − 32 (lg:gap-8) =
 * 1,168px. A 304px horizontal jump and ~76px per card the instant the content arrives — the same
 * order as the 320px jump the paragraph above claims to have removed, reintroduced by the layer
 * nobody re-measured. Fixed by holding the split rather than by matching another string: the rail
 * placeholder is `lg:block`, exactly like the real one, so below `lg` this renders as it always
 * did and only the desktop case changes.
 */
export default function ShopLoading() {
  return (
    <main className="mx-auto w-full max-w-site px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* The filter rail's box. Empty on purpose — a skeleton for 577 brand checkboxes would be
            a wall of grey bars pretending to be information; what has to be reserved is the
            WIDTH, so the grid beside it lands where it will actually sit. */}
        <div className="hidden w-[17rem] shrink-0 lg:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <ProductsSkeleton gridClassName={SHOP_GRID_COLS} cardCount={SHOP_PER_PAGE} />
        </div>
      </div>
    </main>
  );
}
