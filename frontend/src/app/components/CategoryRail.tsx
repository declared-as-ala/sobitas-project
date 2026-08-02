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
      <SectionHeader
        id="category-rail-heading"
        kicker="Par objectif"
        title="Acheter par objectif"
        viewAllHref="/shop"
        viewAllLabel="Tout voir"
        /* "2" — a support band that carries navigation rather than merchandising. It goes
           18/26px → 30/40px, which is the "make the font bigger" ask, but it stays a step below
           the four rails that actually sell. */
        scale="2"
      />

      {/* THE 3px BRAND RULE UNDER THE HEADING IS GONE. The kicker already carries the brand mark,
          and two accent devices stacked on one heading is a theme tell — it is the single most
          common ornament on a purchased WordPress template. One accent per heading.

          THE GRID IS NOW FULL-BLEED AND GUTTERLESS. `-mx-4 sm:-mx-6 lg:-mx-8` cancels the
          Container's own padding, and `gap-px` on `bg-rule` turns the six tiles into ONE object
          divided by hairlines instead of six cards scattered on a surface.

          What that buys, measured at 390px: the tile goes 158×118.5 → 194×146 (+51% image area)
          purely by reclaiming the 32px of side padding and the 12px gaps — the owner's "we have
          a lot of space where we can make the images wider", delivered without making the band
          any taller. At 1440 the tile goes 243 → 266px wide.

          The `sm:grid-cols-3` tier is KEPT deliberately: dropping it would regress 640–1023px
          from three tiles to two half-width ones. */}
      <ul className="-mx-4 grid grid-cols-2 gap-px bg-rule sm:-mx-6 sm:grid-cols-3 lg:-mx-8 lg:grid-cols-6">
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
                /* The bordered card is gone: no ring, no rounding, no shadow at rest. Six white
                   boxes with hairline borders on a white page is a WordPress grid; six
                   photographs butted together with black caption plates is merchandising.
                   `focus-visible:ring-focus` resolves in the CANVAS band's scope (#D53B04,
                   4.71:1) because the slab class below is on the PLATE, never on this link —
                   putting a scope on a focusable element paints its ring on the parent band. */
                className="group flex h-full flex-col overflow-hidden bg-elevated transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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

                {/* A SOLID CAPTION PLATE, not a hairline-bordered strip.
                    `.pt-slab` re-points the token scope for this subtree only, so `text-ink-1`
                    resolves to #F5F4F2 on #0E0E12 — 17.52:1 in light, 12.98:1 in dark. That is
                    PROVABLE regardless of which photograph the admin uploads, which is precisely
                    what a gradient scrim over arbitrary artwork can never be.
                    h-12/h-14 is also the tap-target guarantee, and the label goes 11px → 13/14px. */}
                <div className="pt-slab flex h-12 flex-1 items-center justify-between gap-2 px-3 sm:h-14 sm:px-4">
                  <span className="min-w-0 font-display font-compressed text-[13px] font-bold uppercase leading-tight tracking-[0.03em] text-ink-1 sm:text-sm">
                    {label}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-brand transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
