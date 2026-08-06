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
 * ── THE CARDS ARE PHOTOGRAPHS NOW, AND THEY ARE THE LANDING PAGE'S OWN ─────────────────────
 * Owner: *"maybe you can use the photos of the category that we used on the landing page… use the
 * same design as the landing page, literally the same tokens."*
 *
 * These four tiles are `CategoryRail` — the same fused `gap-px` block over `bg-rule`, the same 4:3
 * frame matching the 4:3 source exactly, the same 1.04 image scale contained inside the cell so the
 * block never deforms, the same caption plate under the photo rather than over it. Not a copy of
 * its look: the same construction, so a change to the rail's language is a change to both.
 *
 * The mapping from goal to photograph is in `goalCovers.ts`, together with the reason it is a hand
 * written map rather than a category walk. Short version: the builder's own subcategories carry no
 * covers, and the naive parent lookup produces the same picture twice.
 *
 * A goal whose category has no cover falls back to the rail's branded initial tile rather than to
 * an empty grey box — a photo-less card sitting in a row of photographs reads as a broken image.
 */

import Image from 'next/image';
import { m } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { GOAL_LABELS, type Goal } from '@/util/nutritionTargets';
import type { GoalCovers } from './goalCovers';
import { childVariants, tap } from './variants';

const GOALS = Object.keys(GOAL_LABELS) as Goal[];

/**
 * Derived per DESIGN_SYSTEM §7, not guessed.
 *
 * The grid is 2-up at every width inside a `max-w-3xl` (768px) column; the fused block uses
 * `gap-px`, and the container gutters are 16px below `sm` then 24px. The frame is `aspect-[4/3]`
 * against a 4:3 source, so `object-cover` scales by neither axis in particular — the required width
 * IS the rendered tile width, with no 4/3 correction of the kind the rail needs at `sm`.
 *
 *   >=800px  column capped at 768 → (768 − 1)/2 = 383.5 → 384px
 *   below    tile = (vw − gutters − 1)/2, which peaks at 47.0vw @799 and 45.6vw @390.
 *            48vw covers both with one bucket of slack; under-declaring would make the browser
 *            upscale a smaller file and these are the largest photographs in the flow.
 */
const COVER_SIZES = '(min-width: 800px) 384px, 48vw';

export interface StepGoalProps {
  goal: Goal | null;
  covers: GoalCovers;
  onSelect: (goal: Goal) => void;
  onSkip: () => void;
  calm: boolean;
}

export function StepGoal({ goal, covers, onSelect, onSkip, calm }: StepGoalProps) {
  const child = childVariants(calm);

  return (
    <div className="mx-auto max-w-3xl">
      <m.div variants={child} className="text-center">
        <span className="pt-kicker inline-flex items-center gap-2.5 text-brand">
          <span className="h-px w-7 bg-brand" aria-hidden="true" />
          Étape 1
        </span>
        <h2 className="mt-2.5 font-display font-compressed text-[1.875rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 lg:text-[2.5rem]">
          Quel est votre objectif&nbsp;?
        </h2>
        <p className="mx-auto mt-2.5 max-w-md text-sm text-ink-2">
          On classe les catégories dans l&apos;ordre qui vous concerne. Vous gardez accès à tout.
        </p>
      </m.div>

      {/* ONE OBJECT, NOT FOUR CARDS — the rail's construction, for the reason stated there: four
          separately-bordered rounded cards is the WordPress category widget. The 1px `bg-rule`
          showing through `gap-px` is the only divider. */}
      <m.div
        variants={child}
        className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-rule"
      >
        {GOALS.map((g) => {
          const active = goal === g;
          const cover = covers[g];
          const { label, hint } = GOAL_LABELS[g];

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

              <span className="flex flex-1 items-center justify-between gap-2 px-3 py-3 transition-colors sm:px-4 sm:py-4 [@media(hover:hover)]:group-hover:bg-sunken">
                <span className="min-w-0">
                  <span
                    className={`block font-display font-compressed text-[15px] font-bold uppercase leading-tight tracking-[0.02em] sm:text-base ${
                      active ? 'text-brand' : 'text-ink-1'
                    }`}
                  >
                    {label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-ink-2 sm:text-xs">{hint}</span>
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
          exactly what they want has to answer a personal question to reach a shop. */}
      <m.div variants={child} className="mt-5 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-ink-3 underline-offset-4 transition-colors [@media(hover:hover)]:hover:text-brand [@media(hover:hover)]:hover:underline"
        >
          Je sais déjà ce que je veux
        </button>
      </m.div>
    </div>
  );
}
