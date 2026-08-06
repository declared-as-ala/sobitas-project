'use client';

/**
 * Steps 2..n — one category, and nothing else on screen.
 *
 * ── WHAT CAME OFF THIS STEP, AND WHY ───────────────────────────────────────────────────────
 * Owner, looking at v1 live: *"there is a lot of text and a lot of numbers and a lot of icons…
 * try to make the screen less distributed so the user doesn't get confused."*
 *
 * Three things were removed rather than shrunk, because each was a SECOND place to read something
 * that is already stated once:
 *
 *   "Catégorie 3 sur 5"    the progress rail directly above it is that sentence, drawn.
 *   "2 sélectionnés"       every selected tile carries a filled tick and a quantity stepper. The
 *                          badge was a count of things that are each individually marked.
 *   the bottom "Continuer" this is the one the owner named. It sat below twelve products, so
 *                          advancing meant scrolling the whole grid, and the always-visible control
 *                          at the bottom of the screen said "Terminer" — the wrong verb entirely.
 *                          The step bar now owns advancing; see PackWizard.
 *
 * What is left is a heading and a grid of products. That is the whole job of this step.
 *
 * ── THE TYPE IS THE LANDING PAGE'S ─────────────────────────────────────────────────────────
 * `font-display font-compressed … leading-[0.94] tracking-[-0.02em]` at the SectionHeader scale-2
 * step is not a lookalike — it is the exact string `SectionHeader` emits for a support band. The
 * kicker uses the shared `.pt-kicker` class with the same 28px brand rule before it. A visitor
 * arriving from the homepage meets the same voice.
 */

import Image from 'next/image';
import { m } from 'motion/react';
import { GOAL_RATIONALE, type Goal } from '@/util/nutritionTargets';
import type { Product } from '@/types';
import { ProductPicker } from './ProductPicker';
import { childVariants } from './variants';
import type { PackGroup } from './steps';

export interface StepCategoryProps {
  group: PackGroup;
  pack: Record<number, number>;
  /** Non-null only on the FIRST category step, where the goal actually explains the ordering. */
  rationaleGoal: Goal | null;
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
  calm: boolean;
}

export function StepCategory({ group, pack, rationaleGoal, onAdd, onSetQty, calm }: StepCategoryProps) {
  const child = childVariants(calm);

  return (
    /* `max-w-5xl`, wider than the reading steps. Those are a question and a verdict — prose past
       ~70 characters gets hard to track, so they stay narrow. This one is a LOOKING step: at 1440
       a `max-w-2xl` column showed three products in a strip half the width of the window. */
    <div className="mx-auto max-w-5xl">
      {/* THE CATEGORY'S OWN PHOTOGRAPH, WHEN THERE IS ONE.
          Rendered exactly the way CategoryRail renders a category: `object-cover` in a fixed frame
          with the label UNDERNEATH, never over it — overlaid text needs a scrim, the scrim darkens
          the photograph, and the result is a muddy band.

          It is conditional because four of the five builder slugs are subcategories with no cover
          in the admin today (see the note in page.tsx). This is the plumbing, and the picture
          arrives on the next revalidation after somebody uploads one. A step with no cover shows a
          heading over a grid of twelve product photographs, which is a perfectly good screen —
          which is why this renders NOTHING rather than a placeholder box. */}
      {group.cover && (
        <m.div
          variants={child}
          className="relative mb-5 aspect-[16/5] w-full overflow-hidden rounded-2xl bg-sunken sm:aspect-[24/5]"
        >
          <Image
            src={group.cover}
            /* Decorative: the h2 immediately below names the category, so alt text here would make
               a screen reader read it twice. */
            alt=""
            aria-hidden="true"
            fill
            /* Full container width at every breakpoint: `max-w-5xl` caps at 1024, and below that
               it is the viewport minus 32/48px of gutter. Rounded up a bucket rather than down —
               this is a wide crop of a 4:3 source, so it is scaled by WIDTH and softness shows. */
            sizes="(min-width: 1024px) 1024px, 100vw"
            quality={80}
            loading="lazy"
            className="object-cover object-center"
          />
        </m.div>
      )}

      <m.header variants={child}>
        <span className="pt-kicker inline-flex items-center gap-2.5 text-brand">
          <span className="h-px w-7 bg-brand" aria-hidden="true" />
          Choisissez
        </span>
        <h2 className="mt-2.5 font-display font-compressed text-[1.875rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 lg:text-[2.5rem]">
          {group.label}
        </h2>
      </m.header>

      {/* Shown once, on the first category only. The goal reordered the steps, and an unexplained
          reorder reads as arbitrary; repeating the explanation on every step reads as nagging. */}
      {rationaleGoal && (
        <m.p
          variants={child}
          className="mt-3 border-l-2 border-brand/40 pl-3 text-xs leading-relaxed text-ink-2 sm:text-sm"
        >
          {GOAL_RATIONALE[rationaleGoal]}
        </m.p>
      )}

      <div className="mt-5 sm:mt-6">
        <ProductPicker products={group.products} pack={pack} onAdd={onAdd} onSetQty={onSetQty} calm={calm} />
      </div>
    </div>
  );
}
