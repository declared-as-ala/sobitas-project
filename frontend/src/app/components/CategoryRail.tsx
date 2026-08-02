import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { Category } from '@/types';
import { getStorageUrl } from '@/services/api';
import { buildCategoryAlt } from '@/util/productAlt';
import { Section } from '@/app/components/layout/Section';

/**
 * Category rail — the fastest path from landing to a product list.
 *
 * SERVER component, deliberately. It renders links and images and needs no state, so it costs
 * zero client JS. The existing CategoryGrid is `'use client'` only because it holds an
 * `imageError` useState; that trade is worth it for large hero-ish tiles further down the page,
 * but not for a strip whose whole job is to be instantly present.
 *
 * WHY IT SITS BELOW THE HERO, NOT ABOVE IT
 * The reference sites put this rail directly under the nav, above the banner. Copying that here
 * would push the hero — the LCP element — down behind six lazy images, and hand LCP candidacy
 * to whichever tile happened to paint first. Performance is a stated priority, so the rail goes
 * immediately *after* the hero: same "shop in one tap" intent, first screen on most desktops,
 * and the LCP element stays exactly where the preload points.
 *
 * LAYOUT (approved design)
 *   mobile   2-up grid. Replaces a horizontal scroll strip of 104px tiles: the strip hid three of
 *            six categories behind a swipe most people never make, and shrank the photography to
 *            thumbnails. Two columns show everything in one glance with no interaction.
 *   ≥1024    6-up grid, one row.
 * Image and label live inside ONE card so each category reads as a single object; the label used
 * to float under a detached tile with nothing tying the two together.
 *
 * NO OUTER CARD (owner call). This used to wrap the grid in a second box —
 * `rounded-2xl p-4 sm:p-6 ring-1` — nested INSIDE the site container. Its padding was additive on
 * the container's `px-4`, so on a 360px phone the tiles sat 32px in from each edge instead of 16.
 * Deleting the box therefore does two jobs at once: it removes the border, and it hands 32px back
 * to the grid — each of the two mobile tiles goes ~142px → ~158px wide with nothing else changed.
 * The tiles keep their own hairline ring; that is what defines a card here now.
 *
 * FIRST CONSUMER OF `<Section>`. The rail used to hand-roll `py-7 sm:py-9` — the only section on
 * the homepage running at roughly half the site's `py-12 sm:py-16 lg:py-20` rhythm, with no `lg:`
 * step at all. Worse, `ProductSection` below it carried a bespoke `tightTop` prop whose entire
 * purpose was to compensate for that. Two components deformed to cover for one wrong number.
 * `spacing="tight"` is an EXISTING token (`py-6 sm:py-8 lg:py-10`), not a new bespoke value: the
 * rail should read as attached to the hero (Hero deliberately has no bottom padding), while its
 * own bottom padding plus ProductSection's normal top restores the site rhythm below.
 *
 * Label sits UNDER the photo rather than over it. Overlaid text needs a scrim, the scrim darkens
 * the photograph, and at this size the result is six muddy squares.
 */

interface CategoryRailProps {
  categories?: Category[];
}

export function CategoryRail({ categories = [] }: CategoryRailProps) {
  if (!Array.isArray(categories) || categories.length === 0) return null;

  // 6, matching `lg:grid-cols-6` below. At 8 a 7th/8th category wrapped onto a ragged second row
  // on desktop — the two numbers have to agree.
  const items = categories.slice(0, 6);

  return (
    /* `width="wide"` is `max-w-site` — the same rail as the hero and every other homepage band.
       No `surface`: HomePageClient already paints the page background, so a second one here was
       a redundant `dark:` pair. */
    <Section spacing="tight" width="wide" aria-labelledby="category-rail-heading">
      {/* `items-end`, not `items-start`: it baselines "Tout voir" against the accent rule instead
          of against the top of the heading, which is why the link needed a magic `pt-1` before. */}
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
        <div>
          <h2
            id="category-rail-heading"
            className="font-display text-lg font-extrabold uppercase leading-none tracking-tight text-ink-1 sm:text-2xl lg:text-[26px]"
          >
            Acheter par objectif
          </h2>
          {/* The accent rule from the approved design. Purely decorative — hidden from the
              accessibility tree so it is not announced between the heading and the links. */}
          <span
            aria-hidden="true"
            className="mt-2 block h-[3px] w-9 rounded-full bg-brand-500 sm:mt-2.5 sm:w-11"
          />
        </div>

        {/* min-h-[44px]: the hit box was the height of 12px text — roughly 20px, under the 44px
            minimum. The text itself does not grow; only the tappable area does. */}
        <Link
          href="/shop"
          className="group inline-flex min-h-[44px] shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-2 transition-colors hover:text-brand sm:text-sm"
        >
          Tout voir
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {items.map((category) => {
          const href = `/${category.slug}`;
          const label = (category.designation_fr || '').trim();

          return (
            <li key={category.id}>
              <Link
                href={href}
                /* `h-full` + the flex column keep every card the same height when one label
                   wraps to two lines — otherwise the grid rows go ragged.
                   `transition-[transform,box-shadow]`, not `transition-all`: `all` also animates
                   `ring-color`, so every hover on a six-tile grid recalculated a property that
                   changes instantly anyway. */
                className="group flex h-full flex-col overflow-hidden rounded-xl bg-elevated ring-1 ring-hairline transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {/* `aspect-[4/3]` on phones, MATCHING the 4:3 source exactly, so nothing is
                    cropped in either axis. The old `16/10` (=1.60) was WIDER than the source
                    (=1.33), so it silently cropped top and bottom — a letterboxed slice of the
                    photograph. Combined with the deleted outer box, the mobile image goes
                    142×88.8 → 158×118.5, i.e. +49% area.
                    Square from `sm`, where six sit in a row: at lg a square tile is 243px tall
                    against 182px for 4:3, so the square is the bigger presentation there and it
                    is the approved 6-up design. It does crop horizontally at sm+; that is the
                    accepted trade. */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-sunken sm:aspect-square">
                  {category.cover ? (
                    <Image
                      src={getStorageUrl(category.cover)}
                      alt={buildCategoryAlt(label)}
                      fill
                      /* Re-derived after the outer card was removed — the tiles are wider now, so
                         the old string under-fetched. Gutters 16/24/32 per side, gaps 12 then 16,
                         `max-w-site` = 1600.
                           mobile  2-up, aspect matches the 4:3 source → required = tile width.
                                   (vw − 44)/2 peaks at 46.6vw @639 → 47vw, unchanged.
                           sm      3-up into a SQUARE tile from a 4:3 source → object-cover scales
                                   by HEIGHT → required = tile × 4/3 = (4/9)(1 − 80/vw), peaking at
                                   41.0vw @1023 → 42vw. The old 31vw asked 317px where 419px was
                                   needed: a visible 1.09× upscale.
                           lg      (1600 − 64 − 80)/6 = 242.7px tile → × 4/3 = 323.6 → 340px
                                   (rounded up; vw includes the scrollbar). Still the 384 bucket.
                         Both old and new filter to the same candidate list, so the srcset is
                         unchanged and no new optimizer variants are generated. */
                      sizes="(min-width: 1024px) 340px, (min-width: 640px) 42vw, 47vw"
                      quality={80}
                      /* Stays lazy on purpose: these sit just under the hero, and letting six
                         tiles compete with the preloaded hero image is how you lose LCP. */
                      loading="lazy"
                      className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    /* Branded fallback, not an empty box. A category with no cover sits in the
                       same row as ones that have photography, so a flat grey square reads as a
                       broken image. Verified necessary: the build-time payload had covers for
                       only 3 of the 6 categories even though all 6 have one now, so this branch
                       WILL render whenever a cover is added late.

                       `neutral-*` is a deliberate literal, not a missed migration: this tile must
                       read as an intentional dark surface in BOTH themes, so it must NOT follow
                       the canvas token the way every other surface here does. */
                    <div
                      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-800"
                      aria-hidden="true"
                    >
                      <span className="font-display font-compressed text-3xl font-extrabold uppercase text-white/25">
                        {label.charAt(0) || '•'}
                      </span>
                    </div>
                  )}
                </div>

                <p className="flex flex-1 items-center justify-center border-t border-hairline px-2 py-2.5 text-center font-display text-[11px] font-bold uppercase leading-tight tracking-wide text-ink-1 transition-colors group-hover:text-brand sm:py-3 sm:text-[12px]">
                  {label}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
