'use client';

/**
 * Step 1 — one question, four answers, no typing.
 *
 * ── WHY THE ANSWER ADVANCES IMMEDIATELY ────────────────────────────────────────────────────
 * There is no "Continuer" here. Choosing a goal only REORDERS the category steps — it never
 * filters, never hides a product, and can be changed by walking back. An action that is fully
 * reversible and has no destructive branch does not need a confirmation, and a confirm button on
 * one is a step the visitor pays for and gets nothing back from.
 *
 * ── THE CARDS ARE CategoryRail, NOW INCLUDING ITS LAYOUT ───────────────────────────────────
 * Owner: *"maybe you can use the photos of the category that we used on the landing page… use the
 * same design as the landing page, literally the same tokens."*
 *
 * These four tiles were already the rail's construction — the fused `gap-px` block over `bg-rule`,
 * the 4:3 frame matching the 4:3 source exactly, the 1.04 image scale contained inside the cell so
 * the block never deforms, the caption plate under the photo rather than over it.
 *
 * What they were NOT was the rail's SHAPE. They stayed 2-up at every width inside a `max-w-3xl`
 * column, so on a laptop this step showed four 383px tiles in a 2×2 block while the landing page
 * shows six 255px tiles in one row. Now: 2-up on phones, 4-up from `lg`, on the shell's wide rail —
 * which puts the tile at (1024 − 3)/4 = 255px, the same number CategoryRail lands on at `lg`. Same
 * construction AND the same tile, so the two screens are recognisably one design.
 *
 * The mapping from goal to photograph is in `goalCovers.ts`, together with the reason it is a hand
 * written map rather than a category walk. Short version: the builder's own subcategories carry no
 * covers, and the naive parent lookup produces the same picture twice.
 *
 * A goal whose category has no cover falls back to the rail's branded initial tile rather than to
 * an empty grey box — a photo-less card sitting in a row of photographs reads as a broken image.
 *
 * ── THE PER-CARD HINT IS GONE ──────────────────────────────────────────────────────────────
 * Each tile carried a second line: "Gagner du muscle et du poids", "Perdre du gras en gardant le
 * muscle", and so on. Four photographs, four names, four explanations of the name, on a screen
 * whose question is already in a 40px heading above it — and CategoryRail, the thing this is
 * modelled on, carries a label and an arrow and nothing else. Removing them is what lets the tile
 * become the rail's tile rather than a card that resembles it. `GOAL_LABELS[g].hint` still exists
 * and is still used by the needs check, where the reader is choosing from a list with no pictures.
 */

import Image from 'next/image';
import { m } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/app/components/SectionHeader';
import { GOAL_LABELS, type Goal } from '@/util/nutritionTargets';
import type { GoalCovers } from './goalCovers';
import { childVariants, tap } from './variants';

const GOALS = Object.keys(GOAL_LABELS) as Goal[];

/**
 * Derived per DESIGN_SYSTEM §7, not guessed. Re-derived for the 4-up `lg` row.
 *
 * The frame is `aspect-[4/3]` against a 4:3 source, so `object-cover` scales by neither axis in
 * particular — the required width IS the rendered tile width, with no 4/3 correction of the kind
 * the rail needs at `sm`. Gaps are 1px (`gap-px`); gutters are 16px below `sm`, then 24, then 32;
 * the shell's rail caps the column at `max-w-5xl` = 1024.
 *
 *   >=1024   4-up, column = min(1024, vw − 64) → tile = (1024 − 3)/4 = 255.25 → 256px.
 *            Over-declared between 1024 and 1087 where the column is still gutter-bound (239px at
 *            1024); over-declaring costs at most one bucket, under-declaring makes the browser
 *            upscale and these are the largest photographs in the flow.
 *   below    2-up, tile = (vw − gutters − 1)/2 → 45.8vw @390, 47.4vw @639, 47.6vw @1023.
 *            48vw covers all three with one bucket of slack.
 *
 * Bucket check: the smallest percentage in the string is unchanged at 48vw, so Next's
 * `allSizes` filter (deviceSizes[0] × 0.48) is unchanged — same candidate list, no new optimizer
 * variants, nothing already cached is re-fetched.
 */
const COVER_SIZES = '(min-width: 1024px) 256px, 48vw';

export interface StepGoalProps {
  goal: Goal | null;
  covers: GoalCovers;
  onSelect: (goal: Goal) => void;
  onSkip: () => void;
  calm: boolean;
  showHeader?: boolean;
}

export function StepGoal({ goal, covers, onSelect, onSkip, calm, showHeader = true }: StepGoalProps) {
  const child = childVariants(calm);

  return (
    /* No `mx-auto max-w-3xl` — the shell owns the rail. See PackWizard. */
    <div>
      {/* THE LANDING PAGE'S OWN COMPONENT, not a copy of the string it emits.
          This was `font-display font-compressed text-[1.875rem] … lg:text-[2.5rem]` written out by
          hand, which is exactly how the homepage ended up with seven heading sizes nobody chose:
          five components each hardcoding their own clamp. Rendering `SectionHeader` means a change
          to the site's heading scale reaches this page for free, and it CANNOT drift.

          `scale="2"` is the support-band step — the same one "Acheter par objectif" uses on the
          homepage, which is the band this step is modelled on.

          Left-aligned, where it used to be centred. Centring was inherited from a narrower column;
          the fused tile block below it is a left-aligned grid, and a centred heading over
          left-aligned content is the thing that makes a page look like a template. */}
      {showHeader && (
        <m.div variants={child}>
          <SectionHeader
            title="Quel est votre objectif ?"
            subtitle="Vous gardez accès à toutes les catégories."
            scale="2"
          />
        </m.div>
      )}

      {/* ONE OBJECT, NOT FOUR CARDS — the rail's construction, for the reason stated there: four
          separately-bordered rounded cards is the WordPress category widget. The 1px `bg-rule`
          showing through `gap-px` is the only divider. */}
      <m.div
        variants={child}
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-rule lg:grid-cols-4"
      >
        {GOALS.map((g) => {
          const active = goal === g;
          const cover = covers[g];
          const { label } = GOAL_LABELS[g];

          return (
            <m.button
              key={g}
              type="button"
              variants={child}
              whileTap={tap(calm)}
              onClick={() => onSelect(g)}
              aria-pressed={active}
              /* `focus-visible:ring-inset`: the tiles are fused, so an outset ring would be clipped
                 by the block's `overflow-hidden` on the two edges that touch a neighbour. */
              className={`group flex h-full flex-col text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
                active ? 'bg-brand/5' : 'bg-elevated'
              }`}
            >
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-sunken">
                {cover ? (
                  <Image
                    src={cover}
                    /* The photograph illustrates the label directly beneath it, so describing it
                       again would make a screen reader read the goal twice. */
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes={COVER_SIZES}
                    quality={80}
                    loading="lazy"
                    className="object-cover object-center transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:group-hover:scale-100 [@media(hover:hover)]:group-hover:scale-[1.04]"
                  />
                ) : (
                  /* The rail's own fallback. `neutral-*` is a deliberate literal there and here:
                     this tile must read as an intentional dark surface in BOTH themes, so it must
                     NOT follow the canvas token the way every other surface does. */
                  <span
                    className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-800"
                    aria-hidden="true"
                  >
                    <span className="font-display font-compressed text-3xl font-extrabold uppercase text-white/25">
                      {label.charAt(0)}
                    </span>
                  </span>
                )}

                {active && (
                  <m.span
                    initial={calm ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.28, ease: [0.32, 0.72, 0.24, 1] }}
                    data-motion
                    className="absolute inset-x-0 bottom-0 h-1 origin-left bg-brand"
                  />
                )}
              </span>

              {/* CategoryRail's caption plate, verbatim: the same `min-h`, the same padding step,
                  the same 15px-on-phones / 14px-from-sm inversion, the same arrow. */}
              <span className="flex min-h-[56px] flex-1 items-center justify-between gap-2 px-3 py-3 transition-colors sm:min-h-[60px] sm:gap-3 sm:px-4 sm:py-4 [@media(hover:hover)]:group-hover:bg-sunken">
                <span
                  className={`min-w-0 font-display font-compressed text-[15px] font-bold uppercase leading-tight tracking-[0.02em] sm:text-sm ${
                    active ? 'text-brand' : 'text-ink-1'
                  }`}
                >
                  {label}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-brand transition-transform duration-200 motion-reduce:transition-none [@media(hover:hover)]:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </m.button>
          );
        })}
      </m.div>

      {/* An explicit way past a question that is genuinely optional. Without it, someone who knows
          exactly what they want has to answer a personal question to reach a shop.

          "Passer cette étape", down from "Je sais déjà ce que je veux". The old label was warm and
          it was also nine words explaining a decision the visitor has already made by the time
          they are looking for the way out. */}
      <m.div variants={child} className="mt-5 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-ink-3 underline-offset-4 transition-colors [@media(hover:hover)]:hover:text-brand [@media(hover:hover)]:hover:underline"
        >
          Passer cette étape
        </button>
      </m.div>
    </div>
  );
}
