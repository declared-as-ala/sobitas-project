'use client';

/**
 * Steps 2..n — one category, and nothing else on screen.
 *
 * ── WHAT CAME OFF THIS STEP, AND WHY ───────────────────────────────────────────────────────
 * Owner, looking at v1 live: *"there is a lot of text and a lot of numbers and a lot of icons…
 * try to make the screen less distributed so the user doesn't get confused."* Then, on v2:
 * *"make it simpler, take off the texts that aren't needed."*
 *
 * Five things were removed rather than shrunk, because each was a SECOND place to read something
 * already stated once:
 *
 *   "Catégorie 3 sur 5"    the progress rail directly above it is that sentence, drawn.
 *   "2 sélectionnés"       every selected tile carries a filled tick and a quantity stepper. The
 *                          badge was a count of things that are each individually marked.
 *   the bottom "Continuer" this is the one the owner named first. It sat below twelve products, so
 *                          advancing meant scrolling the whole grid, and the always-visible control
 *                          at the bottom of the screen said "Terminer" — the wrong verb entirely.
 *                          The step bar now owns advancing; see PackWizard.
 *   the kicker             it said "Choisissez", on a screen whose entire content is a choice.
 *   the goal rationale     ~200 characters of nutrition prose explaining why the categories had
 *                          been reordered — an explanation of something invisible, since nobody
 *                          ever saw the order it was reordered FROM. The goal question itself
 *                          already promised "on classe les catégories dans l'ordre qui vous
 *                          concerne", so the reorder is not unexplained; it is just not narrated a
 *                          second time on the screen where the visitor is trying to look at
 *                          products. `GOAL_RATIONALE` is untouched in nutritionTargets.ts.
 *
 * What is left is a heading and a grid of products. That is the whole job of this step.
 *
 * ── THE HEADING IS THE LANDING PAGE'S COMPONENT, NOT A COPY OF ITS OUTPUT ──────────────────
 * `SectionHeader scale="2"` is the exact support-band heading "Acheter par objectif" uses. It used
 * to be that class string written out by hand here, which is how a codebase acquires a heading
 * scale that drifts one component at a time.
 *
 * NO "Tout voir" LINK, deliberately, even though `SectionHeader` offers one and every landing-page
 * band has it. The wizard's pack lives in React state and nothing persists it: a tap on a link out
 * to /whey-proteine mid-flow silently discards everything the visitor has chosen. On the homepage
 * that link costs nothing; here it would cost the basket.
 */

import Image from 'next/image';
import { m } from 'motion/react';
import { SectionHeader } from '@/app/components/SectionHeader';
import type { Product } from '@/types';
import { ProductPicker } from './ProductPicker';
import { childVariants } from './variants';
import type { PackGroup } from './steps';

export interface StepCategoryProps {
  group: PackGroup;
  pack: Record<number, number>;
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
  calm: boolean;
}

export function StepCategory({ group, pack, onAdd, onSetQty, calm }: StepCategoryProps) {
  const child = childVariants(calm);

  return (
    /* No `mx-auto max-w-5xl` — the shell owns the rail, and it is already this width on a category
       step. See PackWizard. */
    <div>
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
            /* Full container width at every breakpoint: the shell's rail caps at 1024, and below
               that it is the viewport minus 32/48px of gutter. Rounded up a bucket rather than
               down — this is a wide crop of a 4:3 source, so it is scaled by WIDTH and softness
               shows. */
            sizes="(min-width: 1024px) 1024px, 100vw"
            quality={80}
            loading="lazy"
            className="object-cover object-center"
          />
        </m.div>
      )}

      <m.div variants={child}>
        <SectionHeader title={group.label} scale="2" />
      </m.div>

      <ProductPicker products={group.products} pack={pack} onAdd={onAdd} onSetQty={onSetQty} calm={calm} />
    </div>
  );
}
