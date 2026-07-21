import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { Category } from '@/types';
import { getStorageUrl } from '@/services/api';
import { buildCategoryAlt } from '@/util/productAlt';

/**
 * Compact category rail — the fastest path from landing to a product list.
 *
 * SERVER component, deliberately. It renders links and images and needs no state, so it costs
 * zero client JS. The existing CategoryGrid is `'use client'` only because it holds an
 * `imageError` useState; that trade is worth it for large hero-ish tiles further down the page,
 * but not for a strip whose whole job is to be instantly present.
 *
 * WHY IT SITS BELOW THE HERO, NOT ABOVE IT
 * The reference sites put this rail directly under the nav, above the banner. Copying that here
 * would push the hero — the LCP element — down behind seven lazy images, and hand LCP candidacy
 * to whichever tile happened to paint first. Performance is a stated priority, so the rail goes
 * immediately *after* the hero: same "shop in one tap" intent, first screen on most desktops,
 * and the LCP element stays exactly where the preload points.
 *
 * Label sits UNDER the tile rather than over the artwork. Overlaid text needs a scrim, the scrim
 * darkens the photograph, and at this size the result is six muddy squares. Underneath, the
 * photography stays clean and the type stays crisp.
 */

interface CategoryRailProps {
  categories?: Category[];
}

export function CategoryRail({ categories = [] }: CategoryRailProps) {
  if (!Array.isArray(categories) || categories.length === 0) return null;

  // 6, matching `lg:grid-cols-6` below. At 8 a 7th/8th category wrapped onto a ragged second row
  // on desktop while the mobile track scrolled fine — the two numbers have to agree.
  const items = categories.slice(0, 6);

  return (
    <section
      aria-labelledby="category-rail-heading"
      className="border-b border-gray-100 bg-white py-7 dark:border-gray-900 dark:bg-gray-950 sm:py-9"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-baseline justify-between gap-4 sm:mb-6">
          <h2 id="category-rail-heading" className="pt-kicker text-gray-500 dark:text-gray-400">
            Acheter par objectif
          </h2>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            Tout voir
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Horizontal scroll-snap below lg, then a fixed 6-up grid. `-mx-4 px-4` lets the track
            bleed to the screen edge on mobile so a partially-visible tile signals scrollability
            without needing a scrollbar or arrows. */}
        <ul className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
          {items.map((category) => {
            const href = `/${category.slug}`;
            const label = (category.designation_fr || '').trim();

            return (
              <li
                key={category.id}
                className="w-[104px] shrink-0 snap-start sm:w-[124px] lg:w-auto"
              >
                <Link href={href} className="group block focus:outline-none">
                  {/* Fixed square frame. NOT aspect-ratio driven by the image — covers arrive at
                      mixed intrinsic sizes and an aspect box would resize per tile. */}
                  <div className="relative overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-black/5 transition-shadow duration-300 group-hover:ring-red-600/40 group-focus-visible:ring-2 group-focus-visible:ring-red-600 dark:bg-gray-900 dark:ring-white/10">
                    <div className="relative aspect-square">
                      {category.cover ? (
                        <Image
                          src={getStorageUrl(category.cover)}
                          alt={buildCategoryAlt(label)}
                          fill
                          sizes="(max-width: 640px) 104px, (max-width: 1024px) 124px, 200px"
                          quality={70}
                          loading="lazy"
                          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.07]"
                        />
                      ) : (
                        /* Branded fallback, not an empty box. A category with no cover sits in the
                           same row as ones that have photography, so a flat grey square reads as
                           a broken image. Setting the initial in the display face makes the tile
                           look intentional. Verified necessary: the build-time payload had covers
                           for only 3 of the 6 categories even though all 6 have one now, so this
                           branch WILL render in production whenever a cover is added late. */
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
                  </div>

                  <p className="mt-2.5 text-center font-display text-[12px] font-semibold uppercase leading-tight tracking-wide text-gray-800 transition-colors group-hover:text-red-600 dark:text-gray-200 dark:group-hover:text-red-400 sm:text-[13px]">
                    {label}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
