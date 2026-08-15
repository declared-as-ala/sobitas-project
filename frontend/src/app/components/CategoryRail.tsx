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
    /* `width="full"` (owner, 11/08/2026: "make them full width of the screen"). This band no
       longer shares the `max-w-site` rail the hero and the product grids use — it is the one band
       whose content is photography rather than a list, and it is the only one wide enough to carry
       six tiles without shrinking them. Everything below it keeps the rail. */
    <Section surface="sunken" spacing="tight" width="full" aria-labelledby="category-rail-heading">
      {/* SCALE 3, and no kicker (owner: "that's a big title — no need. I just want to show the
          user that they can browse by category and directly do that").

          This band is pure navigation: it sells nothing, it just routes. At scale "2" (30/40px)
          plus a kicker it was announcing itself louder than "Les plus vendus" directly below it,
          which is the rail that actually converts. Scale "3" is 22/28px — enough to label the
          grid, not enough to compete with it. The photographs are the content here. */}
      {/* CENTRED BELOW `sm`, still — but the ORIGINAL reason is gone with the `-mx-4`. It now
          earns its place on the plainer ground that a two-up grid of square photographs reads as a
          centred composition on a phone, and a label pinned hard left over it does not. */}
      <SectionHeader
        id="category-rail-heading"
        title="Acheter par objectif"
        viewAllHref="/shop"
        viewAllLabel="Tout voir"
        scale="3"
        centerOnMobile
      />

      {/* SEPARATED CARDS, replacing the fused `gap-px over bg-rule` block (owner, 11/08/2026:
          "there's a lot of wide space in there… make the cards away from each other, make margins
          between them… make them full width of the screen").

          The fused block was a deliberate choice and the note above still explains why. What
          changed is the band around it: at `width="full"` the six tiles span the viewport, and a
          single hairline-bordered slab 1900px wide reads as a table, not as navigation. Real gaps
          give each objective its own object, which is what "browse by objective" is.

          `gap-3 sm:gap-4` and not more: the tiles are the content, the gutter is not. Anything
          past 16px starts competing with the band padding above and reintroduces the whitespace
          this change exists to remove. */}
      {/* SIX ACROSS ONLY WHEN SIX ACROSS FITS (owner, 14/08/2026: "the browse by category card
          can be bigger and use the whitespace free… more responsive so they don't have the text
          squeezed").

          `lg:grid-cols-6` put six tiles across from 1024px. On a 1280px laptop that is a ~200px
          tile carrying a two-word uppercase label like SANTÉ & VITALITÉ — the label wrapped, hit
          `line-clamp-2`, and the arrow crowded it. The band looked airy and the type looked
          cramped, which is the exact complaint.

          The breakpoint moves to `xl` (1280px), so 1024–1279 gets THREE tiles instead of six:
          the tile roughly doubles and the label fits on one line. Six items divide evenly by 2,
          3 and 6, so every step is a full row with no ragged tail.

          Gaps grow with the tiles (`gap-3/4/5`) because a 2px gutter between 400px photographs
          reads as a printing error, not as a grid. */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6 xl:gap-5">
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
                /* THE LIFT IS BACK, and only because the cells are no longer fused.
                   It was removed when this was one block ("when I hover on them, they grow in a
                   bad way") — correctly, because lifting one cell tore a 4px hole in the block and
                   dropped a shadow onto its neighbours. With real gaps there is nothing to tear:
                   each tile is its own object and a 2px rise is the ordinary affordance for one.
                   Kept small — `-translate-y-0.5`, not the `-translate-y-1 shadow-xl` that read as
                   a card jumping at you.

                   `rounded-2xl border` per tile, since the shared rounded slab is gone. */
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-elevated transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-rule hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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
                      sizes="(min-width: 1280px) 340px, (min-width: 640px) 44vw, 50vw"
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
                {/* ── THE CAPTION PLATE, RE-MEASURED FOR THE PHONE (owner, 15/08/2026) ────────
                    "the holder of the cards in the mobile the padding right and left to be 0.5em
                     … make the text not squeezing … for their holder bottom padding make it 1em"

                    `px-2` is 8px = 0.5em at the inherited 16px root; `pb-4` is 16px = 1em. The top
                    stays at 12px rather than matching the bottom, and that asymmetry is the point:
                    the label reads as SET ON the photograph above it, so the optical gap to the
                    image should be smaller than the gap to the card edge. Symmetric padding makes
                    a two-line label look like it is floating in the middle of a box.

                    ── WHY THE LABEL WAS BEING CUT ────────────────────────────────────────────
                    "PERFORMANCE" rendered as "PERFORMANC" on a 447px viewport. It is ONE WORD, so
                    `line-clamp-2` cannot help it — there is nowhere to wrap. The arithmetic on that
                    screen: tile = (447 − 32 gutters − 12 gap) / 2 = 201px, minus 32px of `px-4`,
                    minus a 16px arrow and an 8px gap = 145px for the label. The word did not fit.

                    Three changes give it back 28px, which is roughly three characters:
                      px-4 → px-2   +16px   (the owner's number, and it is the largest single gain)
                      arrow 16 → 14  +2px
                      gap-2 → gap-1.5 +2px
                      15px → 14px    ~+8px of glyph width on an 11-character word
                    145 → 173px available for a word that measures ~150px at 14px compressed.

                    `hyphens-auto` is the belt: a category longer than any of today's six can break
                    across the two lines `line-clamp-2` already allows, instead of being clipped.
                    `lang` on the span is what makes it work — the browser needs the language to
                    know where a word may break. */}
                <div className="flex min-h-[56px] flex-1 items-center justify-between gap-1.5 px-2 pb-4 pt-3 transition-colors duration-200 group-hover:bg-sunken sm:min-h-[60px] sm:gap-3 sm:px-4 sm:py-4">
                  <span
                    lang="fr"
                    className="hyphens-auto min-w-0 line-clamp-2 font-display font-compressed text-[14px] font-bold uppercase leading-[1.15] tracking-[0.01em] text-ink-1 sm:text-[15px] xl:text-[14px]"
                  >
                    {label}
                  </span>
                  {/* ── THE ARROW STANDS DOWN BELOW 340px, AND THAT NUMBER WAS MEASURED ───────
                      `scripts/measure-category-rail.mjs` reads `scrollWidth > clientWidth` on the
                      label itself, which is the only way to see this: `line-clamp-2` HIDES the
                      overflow rather than reporting it, so a clipped label changes no status code
                      and throws nothing. With the padding at 0.5em it reported, at 280px:

                          card 118px − 16px padding − 14px arrow − 6px gap = 82px for the label
                          "PERFORMANCE" at 14px Archivo bold caps            ≈ 95px

                      13px does not close a 13px gap either — the word still needs ~88px — so the
                      choice at this width is between shrinking type and dropping a decoration.
                      280px is a 320px phone at Android's largest display-size setting: it is used
                      by people who have asked the system for BIGGER text, and answering that by
                      shrinking type is the wrong way round. The arrow is `aria-hidden` and carries
                      no information the card's own link does not, so it goes instead — 20px back,
                      and the label has 102px for a 95px word.

                      340, not `sm`: at 340px the card is 148px and the label has 112px with the
                      arrow present, so the arrow can come back long before the layout changes. */}
                  <ArrowRight
                    className="hidden h-3.5 w-3.5 shrink-0 text-brand transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none min-[340px]:block sm:h-4 sm:w-4"
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
