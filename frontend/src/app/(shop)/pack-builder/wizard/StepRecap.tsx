'use client';

/**
 * The last step — what you built, whether it holds together, and one optional extra.
 *
 * ── ORDER OF THE SCREEN, AND WHY ───────────────────────────────────────────────────────────
 *   1. the verdict            answers the question the visitor arrived at this step holding
 *   2. the items and the money the thing they are about to buy
 *   3. the CTA                 reachable without scrolling past anything optional
 *   4. the needs check         collapsed; it is an extra, and extras go after the exit
 *
 * The needs check is fourth on purpose. It is the most interesting thing on the page and the least
 * important: putting a five-field form between a finished pack and the "add to cart" button would
 * cost orders from everyone who does not want it, which is most people.
 */

import { useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { Check, ChevronDown, Loader2, Percent, Plus, ShoppingCart, X } from 'lucide-react';
import { getEffectivePrice } from '@/util/productPrice';
import { GOAL_LABELS, type Goal } from '@/util/nutritionTargets';
import type { Product } from '@/types';
import { CoachFigure } from './CoachFigure';
import { NeedsCheck } from './NeedsCheck';
import { assessPack } from './assessPack';
import { childVariants, popVariants, tap, EASE } from './variants';

export interface StepRecapProps {
  entries: { product: Product; qty: number }[];
  itemCount: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  tierLabel: string | null;
  nextTier: { percent: number; remaining: number } | null;
  quoteLoading: boolean;
  /** Whether a server quote has arrived. See assessPack — null nextTier is otherwise ambiguous. */
  hasQuote: boolean;
  /** The cart write + navigation is in flight. Owned by PackBuilderClient. */
  submitting: boolean;
  goal: Goal | null;
  coveredSlugs: string[];
  availableSlugs: string[];
  labelBySlug: Record<string, string>;
  onRemove: (product: Product) => void;
  onJumpToCategory: (slug: string) => void;
  /** Sets the goal WITHOUT navigating — used by the needs check when step 1 was skipped. */
  onSelectGoal: (goal: Goal) => void;
  onSubmit: () => void;
  calm: boolean;
}

export function StepRecap({
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
  goal,
  coveredSlugs,
  availableSlugs,
  labelBySlug,
  onRemove,
  onJumpToCategory,
  onSelectGoal,
  onSubmit,
  calm,
}: StepRecapProps) {
  const [needsOpen, setNeedsOpen] = useState(false);
  const child = childVariants(calm);
  const pop = popVariants(calm);

  const assessment = assessPack({
    goal,
    coveredSlugs,
    availableSlugs,
    labelBySlug,
    itemCount,
    subtotal,
    discountPercent,
    nextTier,
    hasQuote,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <m.div variants={child} className="text-center">
        {/* The SectionHeader scale-2 string, verbatim. This was a fourth heading size — `text-2xl
            sm:text-3xl` with `leading-tight tracking-tight` and no width axis — stepping at `sm`
            where every other heading on the site steps at `lg`. Intermediate sizes with no rule
            behind them are exactly what makes a page look like a purchased theme. */}
        <h2 className="font-display font-compressed text-[1.875rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 lg:text-[2.5rem]">
          {assessment.headline}
        </h2>
        {itemCount > 0 && (
          <p className="mt-1.5 text-sm text-ink-2">
            {itemCount} article{itemCount !== 1 ? 's' : ''} · {coveredSlugs.length} catégorie
            {coveredSlugs.length !== 1 ? 's' : ''}
          </p>
        )}
      </m.div>

      {/* ── 1 · the verdict ───────────────────────────────────────────────────────────────
          ONE card containing a list, not one card per point. Four bordered boxes stacked read as
          four separate warnings competing for attention — the exact "lot of boxes" the whole
          redesign is answering. Inside a single plate they read as what they are: a short report. */}
      {assessment.points.length > 0 && (
        <m.ul variants={child} className="mt-5 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-elevated">
          {assessment.points.map((point, i) => (
            <m.li key={i} variants={child} className="flex items-start gap-2.5 px-4 py-3">
              <span
                className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  point.ok ? 'bg-brand/10 text-brand' : 'bg-sunken text-ink-3'
                }`}
              >
                {point.ok ? <Check className="h-3 w-3" aria-hidden="true" /> : <Plus className="h-3 w-3" aria-hidden="true" />}
              </span>
              <span className="text-xs leading-relaxed text-ink-2 sm:text-sm">{point.text}</span>
            </m.li>
          ))}
        </m.ul>
      )}

      {assessment.suggestions.length > 0 && (
        <m.div variants={child} className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-3">Ajouter&nbsp;:</span>
          {assessment.suggestions.map((slug) => (
            <m.button
              key={slug}
              type="button"
              whileTap={tap(calm)}
              onClick={() => onJumpToCategory(slug)}
              /* 44px, up from 36. The row is `flex-wrap` and has no vertical constraint, so the
                 old height was not buying anything — it was simply under the site's own floor. */
              className="inline-flex min-h-[44px] items-center rounded-full border border-hairline bg-elevated px-4 text-xs font-semibold text-ink-2 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
            >
              {labelBySlug[slug] ?? slug}
            </m.button>
          ))}
        </m.div>
      )}

      {/* ── 2 · the pack and the money ──────────────────────────────────────────────────── */}
      <m.div variants={child} className="mt-6 overflow-hidden rounded-2xl border border-hairline bg-elevated">
        {entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-3">
            Aucun produit sélectionné. Revenez en arrière pour en choisir.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            <AnimatePresence initial={false}>
              {entries.map(({ product, qty }) => (
                <m.li
                  key={product.id}
                  /* No `layout`: projection is a `domMax` feature and this route loads
                     `domAnimation`, so it was a silent no-op. The height animation below is a plain
                     animated property and works without it. */
                  initial={calm ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={calm ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={EASE}
                  data-motion
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-1">{product.designation_fr}</span>
                    <span className="block text-xs tabular-nums text-ink-3">
                      {qty} × {getEffectivePrice(product as never).toFixed(2)} DT
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-sm font-bold tabular-nums text-ink-1">
                    {(getEffectivePrice(product as never) * qty).toFixed(2)} DT
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(product)}
                    aria-label={`Retirer ${product.designation_fr} du pack`}
                    /* 44px, up from 36. This is the DESTRUCTIVE control on the screen: an
                       under-sized target next to a product name is how someone removes the wrong
                       line. The row is already ~62px tall, so nothing had to move to make room. */
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors [@media(hover:hover)]:hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <div className="space-y-2 border-t border-hairline p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-2">Sous-total</span>
            <span className="font-display font-semibold tabular-nums text-ink-1">{subtotal.toFixed(2)} DT</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-ink-2">
                <Percent className="h-4 w-4 text-brand" aria-hidden="true" />
                Remise pack{tierLabel ? ` (${tierLabel})` : ` (−${discountPercent}%)`}
              </span>
              {/* Green, not brand orange: this is money BACK, and the site's orange means "action". */}
              <m.span
                key={discountAmount}
                variants={pop}
                initial="enter"
                animate="center"
                data-motion
                className="font-display font-semibold tabular-nums text-ok"
              >
                −{discountAmount.toFixed(2)} DT
              </m.span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-hairline pt-2.5">
            <span className="flex items-center gap-1.5 font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
              Total
              {/* `data-motion` opts this out of the mobile clamp in globals.css, which forces
                  every animation without it to 0.2s under 768px — five revolutions a second, which
                  reads as a fault rather than as waiting. */}
              {quoteLoading && (
                <Loader2 data-motion className="h-3.5 w-3.5 animate-spin text-ink-3" aria-hidden="true" />
              )}
            </span>
            <m.span
              key={total}
              variants={pop}
              initial="enter"
              animate="center"
              data-motion
              className="font-display text-2xl font-bold tabular-nums tracking-tight text-brand"
            >
              {total.toFixed(2)} DT
            </m.span>
          </div>
        </div>
      </m.div>

      {/* ── 3 · the exit ──────────────────────────────────────────────────────────────────
          THE PENDING STATE IS NOT DECORATION. `onSubmit` writes every line into the cart context,
          sets the pack-discount flag and then `router.push('/cart')` — a client navigation that has
          to fetch and render the cart route. On a Tunisian 3G connection that is comfortably long
          enough for the button to look inert, and an inert button on the one screen where money
          changes hands is how a pack gets added twice. The `disabled` attribute is what actually
          prevents the second tap; the spinner and the label are what explain it. */}
      <m.div variants={child} className="mt-5">
        <m.button
          type="button"
          onClick={onSubmit}
          disabled={entries.length === 0 || submitting}
          aria-busy={submitting}
          whileTap={submitting ? undefined : tap(calm)}
          className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-brand font-display text-base font-bold uppercase tracking-wide text-on-brand transition-colors disabled:cursor-not-allowed disabled:opacity-60 [@media(hover:hover)]:hover:bg-brand-hover"
        >
          {submitting ? (
            <>
              <Loader2 data-motion className="h-5 w-5 animate-spin" aria-hidden="true" />
              Ajout en cours…
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              Ajouter le pack au panier
            </>
          )}
        </m.button>
        <p className="mt-2 text-center text-[11px] leading-snug text-ink-3">
          La remise groupée est recalculée et appliquée automatiquement lors du paiement.
        </p>
      </m.div>

      {/* ── 4 · the optional extra ────────────────────────────────────────────────────────
          IT NO LONGER REQUIRES A GOAL TO EXIST. It used to be wrapped in `{goal && …}`, so anyone
          who took the "Je sais déjà ce que je veux" escape on step 1 — the shopper who knows what
          they want, i.e. the best customer on the page — reached the end and the calculator was
          simply not there. Nothing explained its absence, because nothing had been said about it.
          The calculator genuinely needs a goal (the protein band is goal-dependent), so it asks for
          one HERE, inside the panel, in context: one tap, instead of walking six steps backwards to
          answer a question they had deliberately declined. */}
      <m.section variants={child} className="mt-7 overflow-hidden rounded-2xl border border-hairline bg-elevated">
          <button
            type="button"
            onClick={() => setNeedsOpen((v) => !v)}
            aria-expanded={needsOpen}
            aria-controls="needs-check"
            className="flex w-full items-center gap-3.5 p-4 text-left sm:p-5"
          >
            <CoachFigure className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-sm font-extrabold uppercase tracking-tight text-ink-1 sm:text-base">
                Vos besoins quotidiens&nbsp;?
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-2">
                Calcul en 4 champs, à partir d&apos;équations publiées. Rien n&apos;est enregistré.
              </span>
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-ink-3 transition-transform ${needsOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          <AnimatePresence initial={false}>
            {needsOpen && (
              <m.div
                id="needs-check"
                key="needs"
                initial={calm ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={calm ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                exit={calm ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={EASE}
                data-motion
                className="overflow-hidden"
              >
                <div className="border-t border-hairline p-4 sm:p-5">
                  {goal ? (
                    <NeedsCheck goal={goal} calm={calm} />
                  ) : (
                    <div>
                      <p className="text-sm text-ink-2">
                        Le calcul dépend de votre objectif. Lequel vous correspond&nbsp;?
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                          <m.button
                            key={g}
                            type="button"
                            whileTap={tap(calm)}
                            onClick={() => onSelectGoal(g)}
                            className="flex min-h-[52px] items-center rounded-xl border border-hairline bg-sunken px-4 text-left text-sm font-semibold text-ink-1 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
                          >
                            {GOAL_LABELS[g].label}
                          </m.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </m.section>
    </div>
  );
}
