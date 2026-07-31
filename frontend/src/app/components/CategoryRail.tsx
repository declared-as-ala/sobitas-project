import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { Category } from '@/types';
import { getStorageUrl } from '@/services/api';
import { buildCategoryAlt } from '@/util/productAlt';

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
 * The card wrapper aligns with the hero above it — the outer container is the site's
 * `max-w-[1400px] px-4 sm:px-6 lg:px-8`, and the card fills it edge to edge. Tiles are then inset
 * by the card's own padding, which is what the design intends.
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
    <section
      aria-labelledby="category-rail-heading"
      className="bg-white py-7 dark:bg-gray-950 sm:py-9"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* No drop shadow on this wrapper (owner call, both breakpoints) — the hairline ring alone
            defines the card. The individual tiles keep their hover shadow; only the outer box is flat. */}
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/[0.06] sm:p-6 dark:bg-gray-900 dark:ring-white/10">
          <div className="mb-4 flex items-start justify-between gap-4 sm:mb-6">
            <div>
              <h2
                id="category-rail-heading"
                className="font-display text-lg font-extrabold uppercase leading-none tracking-tight text-gray-900 dark:text-white sm:text-2xl lg:text-[26px]"
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

            <Link
              href="/shop"
              className="group inline-flex shrink-0 items-center gap-1.5 pt-1 text-xs font-semibold text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-500 sm:text-sm"
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
                       wraps to two lines — otherwise the grid rows go ragged. */
                    className="group flex h-full flex-col overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.07] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-gray-950 dark:ring-white/10"
                  >
                    {/* Landscape on phones (these are wide product arrangements — a square crop
                        cuts the outer bottles off), square from sm where six sit in a row. */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100 sm:aspect-square dark:bg-gray-900">
                      {category.cover ? (
                        <Image
                          src={getStorageUrl(category.cover)}
                          alt={buildCategoryAlt(label)}
                          fill
                          /* Must track the grid: 2-up ≈ half the viewport on phones, 3-up from sm,
                             and a ~210px cell at lg (1400 container / 6 minus gaps and card
                             padding). The previous values described the old 104px scroll strip and
                             would have under-fetched badly after this layout change.
                             lg asks for 280, not 210, ON PURPOSE: the covers are 4:3 and the tile
                             is square from `sm`, so object-cover scales by HEIGHT — filling a
                             201px-tall box from a 4:3 source needs 201 × 4/3 ≈ 268px of width.
                             At 210 the optimizer returned 209×157 and the browser upscaled it
                             1.28×, which is visible. 280 lands on the 384 imageSize bucket
                             (next.config.js), so it covers DPR-1 comfortably. */
                          sizes="(min-width: 1024px) 280px, (min-width: 640px) 31vw, 47vw"
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
                           WILL render whenever a cover is added late. */
                        <div
                          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-900 dark:to-black"
                          aria-hidden="true"
                        >
                          <span className="font-display font-compressed text-3xl font-extrabold uppercase text-white/25">
                            {label.charAt(0) || '•'}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="flex flex-1 items-center justify-center border-t border-gray-100 px-2 py-2.5 text-center font-display text-[11px] font-bold uppercase leading-tight tracking-wide text-gray-900 transition-colors group-hover:text-brand-600 dark:border-white/10 dark:text-gray-100 dark:group-hover:text-brand-500 sm:py-3 sm:text-[12px]">
                      {label}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
