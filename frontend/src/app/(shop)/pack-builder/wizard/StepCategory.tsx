'use client';

/**
 * Steps 2..n — one category, and nothing else on screen.
 *
 * ── WHAT THIS STEP DELIBERATELY DOES NOT SHOW ──────────────────────────────────────────────
 * No running total, no discount percentage, no next-tier nudge, no selection tray, no other
 * category. All of those exist; they live in the wizard's footer, stated once. The owner's
 * complaint was that a shopper faced "a lot of text and a lot of numbers and a lot of icons" at
 * the moment they were trying to choose a whey — so the step that asks you to choose a whey shows
 * you whey and a heading.
 *
 * ── THE ONE NUMBER THAT DID EARN ITS PLACE ─────────────────────────────────────────────────
 * "2 sélectionnés" for THIS category. It answers a question the visitor is actually holding while
 * looking at this grid ("have I done this one?"), and it is the only feedback that a skipped step
 * was skipped on purpose. Everything else is about the pack, which is the footer's job.
 *
 * ── SKIPPING IS A FIRST-CLASS ACTION ───────────────────────────────────────────────────────
 * Most visitors will not want all five categories, and a flow that treats an empty category as an
 * incomplete task teaches people to add something they do not need to make the interface stop
 * asking. "Passer" and "Continuer" are the same size, and which one is offered depends only on
 * whether anything is selected.
 */

import { m } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { GOAL_RATIONALE, type Goal } from '@/util/nutritionTargets';
import type { Product } from '@/types';
import { ProductPicker } from './ProductPicker';
import { childVariants, tap } from './variants';
import type { PackGroup } from './steps';

export interface StepCategoryProps {
  group: PackGroup;
  position: number;
  count: number;
  pack: Record<number, number>;
  /** Non-null only on the FIRST category step, where the goal actually explains the ordering. */
  rationaleGoal: Goal | null;
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
  onNext: () => void;
  calm: boolean;
}

export function StepCategory({
  group,
  position,
  count,
  pack,
  rationaleGoal,
  onAdd,
  onSetQty,
  onNext,
  calm,
}: StepCategoryProps) {
  const child = childVariants(calm);
  const selected = group.products.reduce((n, p) => n + (pack[p.id] ? 1 : 0), 0);

  return (
    /* `max-w-5xl`, wider than the other steps. Those are reading steps — a question, a verdict —
       and prose past ~70 characters gets hard to track, so they stay at `max-w-2xl`. This one is a
       LOOKING step: at 768px a 1440 screen showed three products in a column half the width of the
       window, with the rest empty. Different content, different rail. */
    <div className="mx-auto max-w-5xl">
      <m.header variants={child} className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            Catégorie {position} sur {count}
          </p>
          <h2 className="mt-0.5 font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-ink-1 sm:text-3xl">
            {group.label}
          </h2>
        </div>

        {selected > 0 && (
          <m.span
            key={selected}
            initial={calm ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 26 }}
            data-motion
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {selected} sélectionné{selected > 1 ? 's' : ''}
          </m.span>
        )}
      </m.header>

      {/* Shown once, on the first category only. The goal reordered the steps, and an unexplained
          reorder reads as arbitrary; explaining it on every step would read as nagging. */}
      {/* Three lines of explanation cost ~180px on a phone and pushed the first product row below
          the fold — on the step whose entire job is showing products. Smaller type, tighter box,
          and no border fill: it reads as a note beside the heading rather than as a panel. */}
      {rationaleGoal && (
        <m.p
          variants={child}
          className="mt-2.5 border-l-2 border-brand/40 pl-3 text-[11px] leading-relaxed text-ink-2 sm:text-xs"
        >
          {GOAL_RATIONALE[rationaleGoal]}
        </m.p>
      )}

      <div className="mt-5">
        <ProductPicker products={group.products} pack={pack} onAdd={onAdd} onSetQty={onSetQty} calm={calm} />
      </div>

      <m.div variants={child} className="mt-6 flex justify-center">
        <m.button
          type="button"
          onClick={onNext}
          whileTap={tap(calm)}
          className={`inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl px-8 font-display text-sm font-bold uppercase tracking-wide transition-colors sm:w-auto ${
            selected > 0
              ? 'bg-brand text-on-brand [@media(hover:hover)]:hover:bg-brand-hover'
              : 'border border-hairline bg-canvas text-ink-2 [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand'
          }`}
        >
          {selected > 0 ? 'Continuer' : 'Passer cette catégorie'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </m.button>
      </m.div>
    </div>
  );
}
