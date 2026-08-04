'use client';

/**
 * The wizard shell — progress, transitions, and the one persistent footer.
 *
 * ── WHY LazyMotion + `m` AND NOT `motion` ──────────────────────────────────────────────────
 * `import { motion } from 'motion/react'` pulls the whole feature set — layout projection, drag,
 * SVG path morphing, scroll timelines — into the bundle whether or not the page uses them.
 * `LazyMotion` + the `m` component loads only what is asked for, and `strict` makes that
 * enforceable rather than aspirational: it throws if anyone later imports `motion` here out of
 * habit instead of silently re-adding the difference.
 *
 * The `features` prop takes a LOADER, not the feature set itself — see motionFeatures.ts. Passing
 * `domAnimation` directly is a static import and defeats the whole component; measured here, that
 * mistake cost 42 kB of route JS while the file still said "lazy".
 *
 * ── THE `key` ON AnimatePresence IS LOAD-BEARING ───────────────────────────────────────────
 * It is the STEP KEY, not the index. With an index, changing the goal (which reorders the category
 * steps) leaves you on the same number pointing at different content, so React reconciles in place
 * and the transition never plays — you get a silent content swap, which is exactly the thing this
 * whole redesign exists to stop.
 *
 * ── STATE IS NOT IN THE URL, DELIBERATELY ──────────────────────────────────────────────────
 * A `?step=` param would be shareable, and that is the problem: the URL would be a page whose
 * content depends on a pack the recipient does not have, and Cloudflare's cache key includes the
 * query string, so every step would become a separate cache entry for identical HTML. The
 * canonical URL stays `/pack-builder`, one cache entry, and step 0 is what a crawler reads.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, m, useReducedMotion } from 'motion/react';
import { ArrowLeft, Check } from 'lucide-react';
import type { Product } from '@/types';
import type { Goal } from '@/util/nutritionTargets';
import { buildSteps, stepLabel, type PackGroup, type Step } from './steps';
import { stepVariants, EASE } from './variants';
import { StepWelcome } from './StepWelcome';
import { StepGoal } from './StepGoal';
import { StepCategory } from './StepCategory';
import { StepRecap } from './StepRecap';

/** See motionFeatures.ts — the function form is what makes LazyMotion actually lazy. */
const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default);

export interface PackWizardProps {
  groups: PackGroup[];
  categoryOrder: string[] | null;
  goal: Goal | null;
  pack: Record<number, number>;
  entries: { product: Product; qty: number }[];
  itemCount: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  tierLabel: string | null;
  nextTier: { percent: number; remaining: number } | null;
  quoteLoading: boolean;
  /** Whether a server quote has arrived — see assessPack for why this is not derivable. */
  hasQuote: boolean;
  tiers: { min: number; percent: number }[];
  coveredSlugs: string[];
  onSelectGoal: (goal: Goal) => void;
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
  onRemove: (product: Product) => void;
  onSubmit: () => void;
  /** Set by the shell so the caller can aim the fly-to-pack animation at the footer total. */
  footerRef: React.RefObject<HTMLDivElement | null>;
}

export function PackWizard(props: PackWizardProps) {
  const {
    groups,
    categoryOrder,
    goal,
    pack,
    entries,
    itemCount,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    tierLabel,
    nextTier,
    quoteLoading,
    hasQuote,
    tiers,
    coveredSlugs,
    onSelectGoal,
    onAdd,
    onSetQty,
    onRemove,
    onSubmit,
    footerRef,
  } = props;

  const prefersReduced = useReducedMotion();
  const calm = prefersReduced === true;

  const steps = useMemo(() => buildSteps(groups, categoryOrder), [groups, categoryOrder]);
  const [index, setIndex] = useState(0);
  /** +1 forward, −1 back. Passed to the variants as `custom`; see variants.ts. */
  const [direction, setDirection] = useState(1);

  // Clamp rather than trust: the step list shrinks if a category returns no products on a refetch,
  // and an index past the end would render nothing at all.
  const safeIndex = Math.min(index, steps.length - 1);
  const step = steps[safeIndex] as Step;

  const topRef = useRef<HTMLDivElement>(null);

  /**
   * The heading of the step now on screen. Focus is moved here after every step change.
   *
   * This is not polish. `AnimatePresence mode="wait"` UNMOUNTS the outgoing step, and the control
   * the visitor just activated — "Commencer", a goal card, "Continuer" — lives inside it. When that
   * element is destroyed the browser resets focus to `document.body`, so a keyboard user's next Tab
   * starts again from the top of the document, and a screen-reader user is told nothing at all:
   * the page silently became a different page. Moving focus to the new heading is the standard
   * remedy, and it also makes the heading the thing that gets read aloud, which is the sentence
   * that explains where you now are.
   */
  const headingRef = useRef<HTMLDivElement>(null);
  /** True only after a real navigation, so the first paint does not steal focus on load. */
  const hasNavigatedRef = useRef(false);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(0, next), steps.length - 1);
      setDirection(clamped >= safeIndex ? 1 : -1);
      setIndex(clamped);
      hasNavigatedRef.current = true;
      // Every step starts at its own top. Without this, moving from a long category grid to the
      // recap drops you into the middle of the recap — the new step is shorter than your scroll
      // position, and the page silently looks broken.
      requestAnimationFrame(() => {
        topRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      });
    },
    [safeIndex, steps.length, calm]
  );

  /* Focus lands after the step has actually committed, which is why this is an effect on `step.key`
     and not a line inside `goTo` — at the moment goTo runs, the incoming heading does not exist. */
  useEffect(() => {
    if (!hasNavigatedRef.current) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [step.key]);

  const next = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const back = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);

  const jumpToCategory = useCallback(
    (slug: string) => {
      const i = steps.findIndex((s) => s.kind === 'category' && s.group.slug === slug);
      if (i !== -1) goTo(i);
    },
    [steps, goTo]
  );

  const handleGoal = useCallback(
    (g: Goal) => {
      onSelectGoal(g);
      // The category steps reorder as a result, so advance on the NEXT frame — otherwise `next()`
      // computes against the old list and lands on whichever category used to be second.
      requestAnimationFrame(() => goTo(2));
    },
    [onSelectGoal, goTo]
  );

  const labelBySlug = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.slug, g.label])) as Record<string, string>,
    [groups]
  );
  const availableSlugs = useMemo(() => groups.map((g) => g.slug), [groups]);

  const showFooter = step.kind === 'category';

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      {/* One place to state the reduced-motion contract, so no child can forget it. */}
      <MotionConfig reducedMotion="user">
        <div ref={topRef} className="scroll-mt-20 lg:scroll-mt-32" />

        {/* THE PAGE'S ONLY h1, AND IT LIVES OUT HERE ON PURPOSE.
            It used to be inside StepWelcome, which AnimatePresence unmounts on the first advance —
            so from step 1 onward the document had no h1 at all and its outline started at h2. That
            is invisible to a sighted user and immediately wrong for a screen reader's heading list.
            Rendered by the shell it is always present: full size on the welcome step, `sr-only`
            afterwards, where the step's own h2 is the visible title. */}
        <h1
          className={
            step.kind === 'welcome'
              ? 'text-center font-display text-3xl font-extrabold uppercase leading-[1.03] tracking-tight text-ink-1 sm:text-4xl lg:text-5xl'
              : 'sr-only'
          }
        >
          Composez votre pack
        </h1>

        {/* The focus target for every step change, plus the sentence a screen reader hears when it
            lands. `tabIndex={-1}` makes it programmatically focusable without adding a tab stop;
            `outline-none` because the visible focus ring belongs on controls, not on a heading the
            user did not click. */}
        <div
          ref={headingRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="sr-only outline-none"
        >
          {`Étape ${safeIndex + 1} sur ${steps.length} : ${stepLabel(step)}`}
        </div>

        {/* ── progress rail ─────────────────────────────────────────────────────────────
            Hidden on the welcome step: a progress indicator shown before anyone has done
            anything is furniture, and it would be the first thing a crawler and a first-time
            visitor both see. */}
        {step.kind !== 'welcome' && (
          <nav aria-label="Progression" className="mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={back}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline text-ink-2 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
                aria-label="Étape précédente"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              {/* Segments, not a continuous bar: a wizard has a countable number of steps, and a
                  segmented rail answers "how many are left", where a percentage only says "some".

                  THE SEGMENTS ARE NOT CLICKABLE, and that is a correction rather than an omission.
                  They were buttons. With eight steps at 390px the row has about 290px once the back
                  button and the counter take their share, so each target measured ~30px wide —
                  under the site's own 44px rule, and sitting between two identical neighbours, which
                  is a mis-tap generator rather than a shortcut. Nothing was lost by removing them:
                  back is the button to their left, forward is the step's own Continuer, the footer's
                  Terminer jumps to the recap, and the recap's chips jump to any category.

                  `aria-hidden` because the sentence above the rail already announces "Étape 2 sur 8 :
                  Objectif" — eight unlabelled decorative bars would only add noise after it. */}
              <ol aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-1.5">
                {steps.map((s, i) => {
                  const done = i < safeIndex;
                  const current = i === safeIndex;
                  return (
                    <li key={s.key} className="min-w-0 flex-1">
                      <span
                        className={`block h-1.5 w-full rounded-full transition-colors ${
                          current ? 'bg-brand' : done ? 'bg-brand/45' : 'bg-hairline'
                        }`}
                      />
                    </li>
                  );
                })}
              </ol>

              <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold tabular-nums text-ink-3">
                {safeIndex + 1}/{steps.length}
              </span>
            </div>
          </nav>
        )}

        {/* ── the step ──────────────────────────────────────────────────────────────────
            `mode="wait"` so the outgoing step finishes leaving before the new one arrives. The
            alternative ("popLayout") overlaps them, which on a phone means two full-width
            columns briefly occupying the same 390px — it reads as a flicker, not a transition. */}
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <m.div
            key={step.key}
            custom={direction}
            variants={stepVariants(calm)}
            initial="enter"
            animate="center"
            exit="exit"
            data-motion
          >
            {step.kind === 'welcome' && (
              <StepWelcome tiers={tiers} groups={groups} onStart={next} calm={calm} />
            )}

            {step.kind === 'goal' && (
              <StepGoal goal={goal} onSelect={handleGoal} onSkip={next} calm={calm} />
            )}

            {step.kind === 'category' && (
              <StepCategory
                group={step.group}
                position={step.position}
                count={step.count}
                pack={pack}
                rationaleGoal={step.position === 1 && categoryOrder ? goal : null}
                onAdd={onAdd}
                onSetQty={onSetQty}
                onNext={next}
                calm={calm}
              />
            )}

            {step.kind === 'recap' && (
              <StepRecap
                entries={entries}
                itemCount={itemCount}
                subtotal={subtotal}
                discountPercent={discountPercent}
                discountAmount={discountAmount}
                total={total}
                tierLabel={tierLabel}
                nextTier={nextTier}
                quoteLoading={quoteLoading}
                hasQuote={hasQuote}
                goal={goal}
                coveredSlugs={coveredSlugs}
                availableSlugs={availableSlugs}
                labelBySlug={labelBySlug}
                onRemove={onRemove}
                onJumpToCategory={jumpToCategory}
                onSubmit={onSubmit}
                calm={calm}
              />
            )}
          </m.div>
        </AnimatePresence>

        {/* ── the one persistent bar ────────────────────────────────────────────────────
            Only on category steps, and only once something is in the pack. Everything the old
            layout scattered across the page — total, saving, tier progress, next-tier nudge —
            is stated here, once, out of the way of the grid.

            It is absent on welcome, goal and recap because on each of those the same numbers are
            already the subject of the screen. A summary bar under a summary is noise. */}
        <AnimatePresence>
          {showFooter && itemCount > 0 && (
            <m.div
              key="wizard-footer"
              initial={calm ? { opacity: 0 } : { y: 80, opacity: 0 }}
              animate={calm ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={calm ? { opacity: 0 } : { y: 80, opacity: 0 }}
              transition={EASE}
              data-motion
              className="pt-packbar fixed inset-x-0 z-40 border-t border-hairline bg-elevated shadow-card"
            >
              <div
                className="h-[3px] w-full bg-hairline"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={tiers[tiers.length - 1].min}
                aria-valuenow={Math.round(subtotal)}
                aria-label="Progression vers la remise suivante"
              >
                <m.div
                  className="h-full bg-brand"
                  initial={false}
                  animate={{ width: `${Math.min(100, (subtotal / tiers[tiers.length - 1].min) * 100)}%` }}
                  transition={EASE}
                  data-motion
                />
              </div>

              {/* The nudge sits ABOVE the money row. MobileTabBar's raised centre button rises into
                  whatever is directly above it, and as the last line this text had its middle
                  covered; the money row survives that overlap because its centre is the empty gap
                  between the total and the button. */}
              {nextTier && (
                <p className="px-4 pt-2 text-[11px] font-medium text-ink-2">
                  Ajoutez{' '}
                  <span className="font-display font-bold tabular-nums text-ink-1">
                    {nextTier.remaining.toFixed(2)} DT
                  </span>{' '}
                  pour obtenir −{nextTier.percent}%
                </p>
              )}

              {/* React 18's `LegacyRef` does not accept a `RefObject<T | null>`, which is what
                  `useRef<HTMLDivElement>(null)` produces. React 19 relaxed this; the cast is the
                  narrow, correct bridge until the upgrade — the ref genuinely can be null. */}
              <div ref={footerRef as React.RefObject<HTMLDivElement>} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1" aria-live="polite">
                  <span className="block text-[11px] text-ink-3">
                    {itemCount} article{itemCount !== 1 ? 's' : ''}
                    {discountPercent > 0 && <span className="font-semibold text-brand"> · −{discountPercent}%</span>}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-lg font-bold tabular-nums leading-tight text-ink-1">
                      {total.toFixed(2)} DT
                    </span>
                    {discountAmount > 0 && (
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-ok">
                        −{discountAmount.toFixed(2)} DT
                      </span>
                    )}
                  </span>
                </span>

                <m.button
                  type="button"
                  onClick={() => goTo(steps.length - 1)}
                  whileTap={calm ? undefined : { scale: 0.97 }}
                  className="inline-flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 font-display text-sm font-bold uppercase tracking-wide text-on-brand transition-colors [@media(hover:hover)]:hover:bg-brand-hover"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Terminer
                </m.button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
