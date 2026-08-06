'use client';

/**
 * The wizard shell — progress, transitions, and the one persistent step bar.
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
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import type { Product } from '@/types';
import type { Goal } from '@/util/nutritionTargets';
import { buildSteps, stepLabel, type PackGroup, type Step } from './steps';
import { stepVariants, popVariants, EASE } from './variants';
import type { GoalCovers } from './goalCovers';
import { StepWelcome } from './StepWelcome';
import { StepGoal } from './StepGoal';
import { StepCategory } from './StepCategory';
import { StepRecap } from './StepRecap';

/** See motionFeatures.ts — the function form is what makes LazyMotion actually lazy. */
const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default);

export interface PackWizardProps {
  groups: PackGroup[];
  goalCovers: GoalCovers;
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
  submitting: boolean;
  tiers: { min: number; percent: number }[];
  coveredSlugs: string[];
  onSelectGoal: (goal: Goal) => void;
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
  onRemove: (product: Product) => void;
  onSubmit: () => void;
  /** Set by the shell so the caller can aim the fly-to-pack animation at the step bar's total. */
  footerRef: React.RefObject<HTMLDivElement | null>;
  /** The tier track, so the caller can ring it when a discount tier is crossed. */
  tierTrackRef: React.RefObject<HTMLDivElement | null>;
}

export function PackWizard(props: PackWizardProps) {
  const {
    groups,
    goalCovers,
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
    submitting,
    tiers,
    coveredSlugs,
    onSelectGoal,
    onAdd,
    onSetQty,
    onRemove,
    onSubmit,
    footerRef,
    tierTrackRef,
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
   * the visitor just activated — "Commencer", a goal card — lives inside it. When that element is
   * destroyed the browser resets focus to `document.body`, so a keyboard user's next Tab starts
   * again from the top of the document, and a screen-reader user is told nothing at all: the page
   * silently became a different page. Moving focus to the new heading is the standard remedy, and
   * it also makes the heading the thing that gets read aloud, which is the sentence that explains
   * where you now are.
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
  const goToRecap = useCallback(() => goTo(steps.length - 1), [goTo, steps.length]);

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

  const onCategory = step.kind === 'category';
  /** The recap is always last, so the final category is the one immediately before it. */
  const isLastCategory = onCategory && safeIndex === steps.length - 2;
  /** How many products of THIS category are in the pack — decides "Continuer" vs "Passer". */
  const selectedHere = onCategory ? step.group.products.reduce((n, p) => n + (pack[p.id] ? 1 : 0), 0) : 0;

  const advanceLabel = isLastCategory ? 'Voir mon pack' : selectedHere > 0 ? 'Continuer' : 'Passer';

  /**
   * ── THE WIZARD HAS ONE RAIL, AND THE SHELL OWNS IT ─────────────────────────────────────────
   * Every step used to set its own column: `max-w-2xl` on welcome, `max-w-3xl` on goal,
   * `max-w-5xl` on category, `max-w-2xl` again on the recap. Four widths in eight steps, so the
   * content box visibly grew and shrank on every advance — the single loudest reason the flow did
   * not read like the rest of the site, where every band shares `max-w-site`.
   *
   * Worse, the two pieces of persistent chrome were on NEITHER of those rails. The progress bar
   * and the step bar are rendered here, so they inherited `main`'s `max-w-site` — 1600px. On a
   * 1600px monitor the progress rail was 1536px wide above a 672px column, and the step bar's
   * total sat ~1,450px from its own button. Chrome that does not line up with the content it
   * describes is the thing that makes a page feel unfinished, and no amount of token work fixes it.
   *
   * Now there are TWO widths and the step decides which, so the rail always agrees with what is
   * under it: WIDE for the two steps whose job is looking at pictures, NARROW for the two whose
   * job is reading. Welcome→goal and last-category→recap are the only transitions where it moves,
   * and both are exactly the point where the screen's job changes.
   */
  const wide = step.kind === 'goal' || step.kind === 'category';
  const rail = wide ? 'max-w-5xl' : 'max-w-2xl';

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      {/* One place to state the reduced-motion contract, so no child can forget it. */}
      <MotionConfig reducedMotion="user">
        <div ref={topRef} className="scroll-mt-20 lg:scroll-mt-32" />

        <div className={`mx-auto w-full ${rail}`}>
        {/* THE KICKER IS RENDERED HERE, NOT INSIDE StepWelcome — and that is a fix, not a
            preference. It lived at the top of StepWelcome, which the shell renders BELOW the h1,
            so the page opened with "COMPOSEZ VOTRE PACK" and then put "Pack sur mesure" underneath
            it, followed by a `mt-2` spacer whose own comment said it was "keeping the rhythm the h1
            used to occupy". The h1 had been moved out here two revisions earlier and nobody
            re-looked: the landing page's kicker-over-title construction had been silently inverted.

            One kicker in the whole flow, on the one step that is also the page's SEO surface. The
            two that were deleted said "Étape 1" (the progress rail directly beneath it is that
            sentence, drawn) and "Choisissez" (a verb for a screen whose entire content is a choice).
            A kicker that names the band earns its line; a kicker that narrates the obvious does not. */}
        {step.kind === 'welcome' && (
          <p className="flex justify-center">
            <span className="pt-kicker inline-flex items-center gap-2.5 text-brand">
              <span className="h-px w-7 bg-brand" aria-hidden="true" />
              Pack sur mesure
            </span>
          </p>
        )}

        {/* THE PAGE'S ONLY h1, AND IT LIVES OUT HERE ON PURPOSE.
            It used to be inside StepWelcome, which AnimatePresence unmounts on the first advance —
            so from step 1 onward the document had no h1 at all and its outline started at h2. That
            is invisible to a sighted user and immediately wrong for a screen reader's heading list.
            Rendered by the shell it is always present: full size on the welcome step, `sr-only`
            afterwards, where the step's own h2 is the visible title. */}
        <h1
          className={
            step.kind === 'welcome'
              ? 'mt-2.5 text-center font-display font-compressed text-[2rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 lg:text-[3.5rem]'
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
            visitor both see.

            THE "3/8" COUNTER IS GONE. Owner: "a lot of text and a lot of numbers." The eight
            segments already answer "how far am I" without asking anyone to read a fraction, and
            the sr-only live region above states the position in words for anyone who cannot see
            them. A number that duplicates a picture is the cheapest thing on the screen to cut. */}
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
                  button takes its share, so each target measured ~33px wide — under the site's own
                  44px rule, and sitting between two identical neighbours, which is a mis-tap
                  generator rather than a shortcut. Nothing was lost: back is the button to their
                  left, forward is the step bar's own button, the bar's summary jumps to the recap,
                  and the recap's chips jump to any category.

                  `aria-hidden` because the live region above already announces "Étape 2 sur 8 :
                  Objectif" — eight unlabelled decorative bars would only add noise after it. */}
              <ol aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-1.5">
                {steps.map((s, i) => {
                  const done = i < safeIndex;
                  const current = i === safeIndex;
                  return (
                    <li key={s.key} className="min-w-0 flex-1">
                      {/* `bg-rule-strong` for the steps still to come, NOT `bg-hairline`.
                          #E8E5E1 on the sand page measures 1.05:1 — the remaining segments were
                          effectively invisible, so the rail showed how far you had come and said
                          nothing about how much was left, which is the half a visitor actually
                          wants. `--c-rule-strong` is the token that exists precisely for a
                          boundary carrying meaning on its own (3.34:1 on white, theme-aware). */}
                      <span
                        className={`block h-1.5 w-full rounded-full transition-colors ${
                          current ? 'bg-brand' : done ? 'bg-brand/45' : 'bg-rule-strong'
                        }`}
                      />
                    </li>
                  );
                })}
              </ol>
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
              <StepGoal goal={goal} covers={goalCovers} onSelect={handleGoal} onSkip={next} calm={calm} />
            )}

            {step.kind === 'category' && (
              <StepCategory
                group={step.group}
                pack={pack}
                onAdd={onAdd}
                onSetQty={onSetQty}
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
                submitting={submitting}
                goal={goal}
                coveredSlugs={coveredSlugs}
                availableSlugs={availableSlugs}
                labelBySlug={labelBySlug}
                onRemove={onRemove}
                onJumpToCategory={jumpToCategory}
                /* The RAW setter, not `handleGoal` — answering the question inside the needs check
                   must not navigate the wizard back to the category steps. */
                onSelectGoal={onSelectGoal}
                onSubmit={onSubmit}
                calm={calm}
              />
            )}
          </m.div>
        </AnimatePresence>
        </div>

        {/* ── THE STEP BAR ──────────────────────────────────────────────────────────────
            This is the fix the owner named, and the change is one of PURPOSE rather than of style.
            It used to be a SUMMARY bar that happened to carry a "Terminer" button, and it only
            appeared once something was in the pack. Two consequences, both bad:

              - the always-visible action was FINISH. Advancing to the next category meant scrolling
                past twelve products to a button at the bottom of the grid. Owner: "the user should
                continue, not directly finish the pack."
              - on a category where you had selected nothing, there was no persistent control at
                all — the bar was hidden, so the only way onward was, again, the bottom of the grid.

            It is now the STEP BAR: present on every category step regardless of what is in the
            pack, and its primary action always moves you forward. The verb follows the situation —
            "Continuer" when this category has a selection, "Passer" when it does not, "Voir mon
            pack" on the last one — so the button never lies about where it goes.

            Finishing did not disappear; it moved to where finishing happens. The summary on the
            left is a button to the recap, and the recap is the screen with "Ajouter le pack au
            panier" on it.

            It is absent on welcome, goal and recap because on each of those the primary action is
            already the subject of the screen. A step bar under a step whose whole content is one
            button is furniture. */}
        <AnimatePresence>
          {onCategory && (
            <m.div
              key="wizard-stepbar"
              initial={calm ? { opacity: 0 } : { y: 80, opacity: 0 }}
              animate={calm ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={calm ? { opacity: 0 } : { y: 80, opacity: 0 }}
              transition={EASE}
              data-motion
              className="pt-packbar fixed inset-x-0 z-40 border-t border-hairline bg-elevated shadow-card"
            >
              {/* The tier track, only once there is progress to draw. At zero it is a bar reading
                  empty, which states the mechanic without ever being persuasive — the welcome
                  step's three figures do that job better. */}
              {itemCount > 0 && (
                <div
                  ref={tierTrackRef as React.RefObject<HTMLDivElement>}
                  data-motion
                  className="h-[3px] w-full bg-rule-strong"
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
              )}

              {/* THE CONTENT SITS ON THE STEP'S OWN RAIL. The bar is `inset-x-0` because a fixed
                  element that stops short of the edges reads as a floating card, but its CONTENTS
                  must not be: unconstrained, the total pinned to the far left and the action to the
                  far right, roughly 1,450px apart on a 1600px screen — the eye cannot hold a number
                  and its button at opposite ends of a monitor.

                  TWO nested boxes, mirroring `main` exactly: `max-w-site` + the page gutters, and
                  then the wizard's own `rail` inside it. One box with `max-w-5xl` + gutters would
                  be 64px NARROWER than the content, because the padding would come out of the 1024
                  instead of out of the 1600 — the bar would miss the grid it sits under by half a
                  gutter at every width above 1088px. The 3px track above stays full-bleed on
                  purpose: it is a page-level progress indicator, and one that stops 200px from each
                  edge looks broken. */}
              <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
                {/* `data-packbar-rail` is a test hook, matching the existing `data-pack-tile`. The
                    gate asserts this box has the same left and right edges as `data-pack-grid` —
                    the invariant this whole change exists to establish, and one that a width
                    number alone cannot express. */}
                <div data-packbar-rail className={`mx-auto w-full ${rail}`}>
                {/* The nudge sits ABOVE the money row. MobileTabBar's raised centre button rises
                    into whatever is directly above it, and as the last line this text had its
                    middle covered; the money row survives that overlap because its centre is the
                    empty gap between the total and the button. */}
                {nextTier && itemCount > 0 && (
                  <p className="pt-2 text-[11px] font-medium text-ink-2">
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
                <div
                  ref={footerRef as React.RefObject<HTMLDivElement>}
                  className="flex items-center gap-3 py-2.5"
                >
                {itemCount > 0 ? (
                  /* THE SUMMARY IS A BUTTON, and its first line says so in words rather than with
                     a chevron. A running total that silently happens to be tappable is a feature
                     only the people who try it ever find. */
                  <button
                    type="button"
                    onClick={goToRecap}
                    className="group -my-1 min-w-0 flex-1 rounded-lg py-1 pr-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    aria-label={`Voir mon pack : ${itemCount} article${itemCount !== 1 ? 's' : ''}, total ${total.toFixed(2)} dinars`}
                  >
                    <span className="block truncate text-[11px] text-ink-3 underline-offset-2 [@media(hover:hover)]:group-hover:text-brand [@media(hover:hover)]:group-hover:underline">
                      Voir mon pack · {itemCount} article{itemCount !== 1 ? 's' : ''}
                      {discountPercent > 0 && <span className="font-semibold text-brand"> · −{discountPercent}%</span>}
                    </span>
                    <span className="flex items-baseline gap-2" aria-hidden="true">
                      {/* Keyed on `total` so the number re-plays its pop each time it changes —
                          the confirmation that a tap landed, on the one element a thumb is
                          usually covering. `quoteLoading` dims it while the server is still
                          deciding, because until the quote lands this figure is the raw subtotal
                          and the discount is not in it yet. */}
                      <m.span
                        key={total}
                        variants={popVariants(calm)}
                        initial="enter"
                        animate="center"
                        data-motion
                        className={`font-display text-lg font-bold tabular-nums leading-tight text-ink-1 transition-opacity ${
                          quoteLoading ? 'opacity-50' : 'opacity-100'
                        }`}
                      >
                        {total.toFixed(2)} DT
                      </m.span>
                      {quoteLoading ? (
                        /* `data-motion` is not optional on a spinner. globals.css clamps every
                           animation without it to 0.2s under 768px, which turns a 1s revolution
                           into five per second — a strobe that reads as a fault rather than as
                           waiting. The attribute is the documented per-component opt-out. */
                        <Loader2
                          data-motion
                          className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-3"
                          aria-hidden="true"
                        />
                      ) : (
                        discountAmount > 0 && (
                          <span className="shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-ok">
                            −{discountAmount.toFixed(2)} DT
                          </span>
                        )
                      )}
                    </span>
                  </button>
                ) : (
                  /* Nothing in the pack yet, and the bar says nothing about it.
                     It used to read "Ajoutez ce que vous voulez, ou passez à la catégorie
                     suivante." — 58 characters restating what the button to its right already
                     says in one word, permanently parked under the visitor's thumb on the screen
                     whose whole job is showing products.
                     The empty span stays because it is the SPACER: without `flex-1` here the
                     advance button slides from the right edge to the left the instant the first
                     product is added, so the control moves out from under the finger that just
                     used it. */
                  <span className="min-w-0 flex-1" aria-hidden="true" />
                )}

                <m.button
                  type="button"
                  onClick={next}
                  whileTap={calm ? undefined : { scale: 0.97 }}
                  className={`inline-flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-xl px-4 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
                    selectedHere > 0 || isLastCategory
                      ? 'bg-brand text-on-brand [@media(hover:hover)]:hover:bg-brand-hover'
                      : 'border border-hairline bg-elevated text-ink-2 [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand'
                  }`}
                >
                    {advanceLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </m.button>
                </div>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
