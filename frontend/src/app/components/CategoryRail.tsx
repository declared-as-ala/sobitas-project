import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { Category } from '@/types';
import { getStorageUrl } from '@/services/api';
import { buildCategoryAlt } from '@/util/productAlt';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';

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
    <Section surface="sunken" spacing="tight" width="wide" aria-labelledby="category-rail-heading">
      {/* SCALE 3, and no kicker (owner: "that's a big title — no need. I just want to show the
          user that they can browse by category and directly do that").

          This band is pure navigation: it sells nothing, it just routes. At scale "2" (30/40px)
          plus a kicker it was announcing itself louder than "Les plus vendus" directly below it,
          which is the rail that actually converts. Scale "3" is 22/28px — enough to label the
          grid, not enough to compete with it. The photographs are the content here. */}
      {/* CENTRED BELOW `sm` (owner set `margin: 0 auto` on it in DevTools). The grid under it is
          full-bleed on phones — it has no left rail for the heading to align to, because the
          container gutters are cancelled by `-mx-4`. A left-aligned label 16px in from the edge,
          over tiles that start at 0, was the only thing in the band not on the same axis. This is
          the one band where centring is right; see the prop's note in SectionHeader. */}
      <SectionHeader
        id="category-rail-heading"
        title="Acheter par objectif"
        viewAllHref="/shop"
        viewAllLabel="Tout voir"
        scale="3"
        centerOnMobile
      />

      {/* FULL-BLEED ON PHONES, CONTAINER-ALIGNED FROM `sm`.
          Owner: "for mobile, browse by category — I want it full width, no padding for the images
          so they can see it, and the text a bit bigger."

          `-mx-4` cancels the Container's own 16px gutters, so at 390px each tile goes 179 → 194px
          wide: +17% image area for zero extra band height. The radius and the side borders come
          off with it, because a rounded card that touches both screen edges reads as a rendering
          fault rather than as a decision. From `sm` the grid returns to the rail and becomes one
          rounded, bordered block again — there, alignment with the heading is what matters, and
          that was the v6 fix the owner asked for on desktop.

          The misalignment complaint and this one are not in conflict: on desktop the heading and
          the grid share a rail; on a phone there is no rail to share, because the band is only
          32px wider than the grid in the first place.

          Still ONE OBJECT, not six cards: `gap-px` over `bg-rule`. Six separately-bordered rounded
          cards is the WordPress category widget.

          `sm:grid-cols-3` is KEPT deliberately: dropping it would regress 640–1023px from three
          tiles to two half-width ones. */}
      <ul className="-mx-4 grid grid-cols-2 gap-px overflow-hidden border-y border-hairline bg-rule sm:mx-0 sm:grid-cols-3 sm:rounded-2xl sm:border-x lg:grid-cols-6">
        {items.map((category) => {
          const href = `/${category.slug}`;
          const label = (category.designation_fr || '').trim();

          return (
            <li key={category.id}>
              <Link
                href={href}
                /* `h-full` + the flex column keep every card the same height when one label
                   wraps to two lines — otherwise the grid rows go ragged.

                   THE TILE NO LONGER LIFTS ON HOVER (owner: "when I hover on them, they grow in
                   a bad way"). `hover:-translate-y-1 hover:shadow-xl` is a CARD gesture, and
                   these are not cards — they are six cells fused into one block by a 1px gap.
                   Lifting one cell tore a 4px hole in the block and dropped a shadow onto its
                   neighbours, which is why it read as broken rather than as responsive.

                   What replaces it is contained entirely INSIDE the cell, so the block never
                   deforms: the photograph scales 1.04, the caption picks up the sand fill, and
                   the arrow steps 4px right. `transition-colors` here; the transform lives on the
                   image where it belongs.

                   `focus-visible:ring-focus` resolves in the CANVAS band's scope (#D53B04,
                   4.71:1). Never put a band scope on a focusable element — the ring resolves in
                   the element's own scope but paints on the parent's surface. */
                className="group flex h-full flex-col overflow-hidden bg-elevated transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
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
                      /* Re-derived for the full-bleed-on-mobile grid. Gaps are 1px (`gap-px`);
                         gutters are 0 below `sm`, then 24/32 per side; `max-w-site` = 1600.
                           mobile  2-up FULL-BLEED, aspect matches the 4:3 source → required =
                                   tile width = (vw − 1)/2 ≈ 50vw.
                           sm      3-up on the rail, into a SQUARE tile from a 4:3 source →
                                   object-cover scales by HEIGHT → required = tile × 4/3 =
                                   (4/3)(vw − 50)/3, peaking at 42.3vw @1023 → 43vw.
                           lg      (1600 − 64 − 5)/6 = 255.2px tile → × 4/3 = 340.2 → 350px
                                   (rounded up; vw includes the scrollbar).
                         Bucket check: Next filters `allSizes` by deviceSizes[0] × min(percent)/100
                         = 480 × 0.43 = 206.4 — unchanged, because `sm` is still the smallest
                         percentage in the string. Same candidate list, no new optimizer variants,
                         nothing re-fetched. */
                      sizes="(min-width: 1024px) 350px, (min-width: 640px) 43vw, 50vw"
                      quality={80}
                      /* Stays lazy on purpose: these sit just under the hero, and letting six
                         tiles compete with the preloaded hero image is how you lose LCP. */
                      loading="lazy"
                      className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
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

                {/* THE CAPTION IS LIGHT (v6). It was `.pt-slab` — a near-black plate under every
                    tile — and six of those in a row under six dark photographs is what turned this
                    band into a black wall. On the page's own `bg-elevated` the label is plain
                    `text-ink-1` (#0A0A0B, 19.8:1) and the whole rail belongs to the light page.

                    PADDING IS REAL AND ON THE GRID (owner: "there's no padding for them"). It was
                    `h-12 px-3` — a fixed 48px box with 12px of side padding and no vertical
                    padding at all, so the type was centred in a box rather than set in a plate.
                    Now `px-4 py-4` (16px, every side) with `min-h` as a floor rather than a fixed
                    height, so a two-line category name grows the plate instead of being squeezed.
                    16px also equals the container gutter, so the label sits on the same left rail
                    as the section heading above it. */}
                <div className="flex min-h-[56px] flex-1 items-center justify-between gap-2 px-3 py-3 transition-colors duration-200 group-hover:bg-sunken sm:min-h-[60px] sm:gap-3 sm:px-4 sm:py-4">
                  {/* 15px on phones (up from 13), 14 from `sm`. That inversion is deliberate: the
                      phone tile is the widest this label ever gets relative to its column, and it
                      is the only place the label is read at arm's length. Owner asked for bigger
                      mobile text specifically. */}
                  <span className="min-w-0 font-display font-compressed text-[15px] font-bold uppercase leading-tight tracking-[0.02em] text-ink-1 sm:text-sm">
                    {label}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-brand transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
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
