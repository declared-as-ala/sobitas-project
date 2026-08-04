'use client';

/**
 * "Composez votre pack" — the builder.
 *
 * ── WHAT THIS LAYOUT IS ANSWERING ─────────────────────────────────────────────────────────
 * Measured on the live page before this rewrite (`scripts/measure-packbuilder.mjs`, iPhone 13 at
 * the real 390x746 small viewport):
 *
 *     document                        13,035 px   17.5 screens
 *     scroll before the first Ajouter  1,117 px    1.5 screens
 *     whey -> pre-workout              8,104 px   10.9 screens
 *     screen under fixed chrome           30.2%   (39.9% on a 360x566 Android)
 *
 * Three structural changes, each aimed at one of those numbers:
 *
 *   1. CATEGORIES ARE SHELVES, NOT GRIDS. Twelve products in two columns is six rows and ~2,026 px
 *      per category; a horizontal shelf is ~330 px whatever the count. See PackRail for the
 *      discoverability requirements that make a shelf safe (peek, stated size, escape hatch).
 *   2. THE PREAMBLE IS ONE SCREEN, NOT ONE AND A HALF. The advisor's four hint-carrying cards
 *      became four chips (PackGoalBar); the tier card became one row; the jump nav is gone,
 *      because with shelves the whole page is under four screens and a map of four screens is
 *      furniture.
 *   3. ONE PIECE OF BOTTOM CHROME. The WhatsApp bubble and the back-to-top button are suppressed on
 *      this route and the tier progress moved INTO the pack bar as a 3px fill along its top edge,
 *      so the persistent UI is the pack bar and the tab bar rather than five overlapping layers.
 *
 * ── WHAT DID NOT CHANGE, DELIBERATELY ─────────────────────────────────────────────────────
 * The authoritative discount still comes from `/pack/quote` on the server, debounced. `PACK_TIERS`
 * below is a DISPLAY MIRROR of PackDiscountService and is used only to draw the bar — never to
 * compute a price the customer is shown as final. If the two ever disagree the server wins, which
 * is why `total` reads `quote.total` and falls back to the raw subtotal rather than to a
 * locally-computed discount.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { EmptyState } from '@/app/components/EmptyState';
import { useCart } from '@/app/contexts/CartContext';
import { packQuote } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import type { Product, PackQuote } from '@/types';
import { toast } from 'sonner';
import { ShoppingCart, Percent, Loader2, TrendingUp, BadgeCheck, ChevronUp, Sparkles } from 'lucide-react';
import { PackRail } from './PackRail';
import { PackTray } from './PackTray';
import { PackGoalBar } from './PackGoalBar';
import type { AdvisorResult } from './PackAdvisor';
import { GOAL_CATEGORY_EMPHASIS, type Goal } from '@/util/nutritionTargets';
import { flyToPack, pulseTierUnlocked } from './packMotion';

export interface PackBuilderGroup {
  slug: string;
  label: string;
  products: Product[];
}

interface PackBuilderClientProps {
  groups: PackBuilderGroup[];
}

/** Display-only mirror of the backend PackDiscountService tiers. See the header note. */
const PACK_TIERS: { min: number; percent: number }[] = [
  { min: 200, percent: 5 },
  { min: 350, percent: 8 },
  { min: 500, percent: 12 },
];

export function PackBuilderClient({ groups }: PackBuilderClientProps) {
  const router = useRouter();
  const { addToCart, setPackDiscount } = useCart();

  const [pack, setPack] = useState<Record<number, number>>({});
  const [quote, setQuote] = useState<PackQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  /* Where a flying product thumbnail lands. Two targets because two summaries exist and only one is
     ever on screen: the sticky bar below `lg`, the rail above it. `offsetParent` is null for a
     `display: none` element, which is the cheapest reliable visibility test that does not force a
     layout of both. */
  const mobileTargetRef = useRef<HTMLDivElement>(null);
  const desktopTargetRef = useRef<HTMLDivElement>(null);
  const flyTarget = useCallback(() => {
    const mobile = mobileTargetRef.current;
    if (mobile && mobile.offsetParent !== null) return mobile;
    return desktopTargetRef.current;
  }, []);

  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    groups.forEach((g) => g.products.forEach((p) => map.set(p.id, p)));
    return map;
  }, [groups]);

  /** Which category each product came from — needed by the tray to say what the pack is missing. */
  const slugByProductId = useMemo(() => {
    const map = new Map<number, string>();
    groups.forEach((g) => g.products.forEach((p) => map.set(p.id, g.slug)));
    return map;
  }, [groups]);

  const entries = useMemo(
    () =>
      Object.entries(pack)
        .map(([id, qty]) => ({ product: productById.get(Number(id)), qty }))
        .filter((e): e is { product: Product; qty: number } => !!e.product && e.qty > 0),
    [pack, productById]
  );

  const subtotal = useMemo(
    () => entries.reduce((sum, { product, qty }) => sum + getEffectivePrice(product as never) * qty, 0),
    [entries]
  );

  const itemCount = useMemo(() => entries.reduce((n, e) => n + e.qty, 0), [entries]);

  const coveredSlugs = useMemo(
    () => [...new Set(entries.map(({ product }) => slugByProductId.get(product.id)).filter(Boolean))] as string[],
    [entries, slugByProductId]
  );

  const setQty = useCallback((product: Product, qty: number) => {
    setPack((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[product.id];
      } else {
        const stock = getStockDisponible(product as never);
        next[product.id] = stock > 0 ? Math.min(qty, stock) : qty;
      }
      return next;
    });
  }, []);

  /**
   * Add one, and throw the thumbnail into the pack.
   *
   * The animation is the point of this handler existing separately from `setQty`. On a phone the
   * summary sits under the thumb, so adding an item changes two numbers the hand is covering — the
   * tap reads as "nothing happened", and people tap again. The flight says *it worked* and *that is
   * where it went*, which is the whole reason a second tap stops happening.
   */
  const addOne = useCallback(
    (product: Product, img: HTMLElement | null) => {
      const stock = getStockDisponible(product as never);
      if (stock <= 0) {
        toast.error('Rupture de stock');
        return;
      }
      const current = pack[product.id] ?? 0;
      if (current >= stock) return;
      setQty(product, current + 1);
      flyToPack(img, flyTarget());
    },
    [pack, setQty, flyTarget]
  );

  const removeProduct = useCallback((product: Product) => setQty(product, 0), [setQty]);

  // Debounced authoritative quote: the server recomputes the subtotal + tier from real prices.
  const quoteTokenRef = useRef(0);
  useEffect(() => {
    const items = entries.map(({ product, qty }) => ({ produit_id: product.id, quantite: qty }));
    if (items.length === 0) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    const token = ++quoteTokenRef.current;
    setQuoteLoading(true);
    const timer = setTimeout(() => {
      packQuote(items)
        .then((q) => {
          if (token === quoteTokenRef.current) setQuote(q);
        })
        .catch(() => {
          if (token === quoteTokenRef.current) setQuote(null);
        })
        .finally(() => {
          if (token === quoteTokenRef.current) setQuoteLoading(false);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [entries]);

  const discountPercent = quote?.discount_percent ?? 0;
  const discountAmount = quote?.discount_amount ?? 0;
  const total = quote ? quote.total : subtotal;
  const nextTier = quote?.next_tier ?? null;

  /* Celebrate crossing a tier, once, on the way up only. Tracking the previous percent in a ref
     rather than in state keeps this out of the render path — a tier change already re-renders the
     whole builder, and adding a second render to play an animation is how a page gets janky at
     exactly the moment it is meant to feel rewarding. */
  const tierBarRef = useRef<HTMLDivElement>(null);
  const prevPercentRef = useRef(0);
  useEffect(() => {
    if (discountPercent > prevPercentRef.current) pulseTierUnlocked(tierBarRef.current);
    prevPercentRef.current = discountPercent;
  }, [discountPercent]);

  /**
   * The advisor REORDERS, it never filters. Hiding the other categories would make a suggestion
   * into a gate — someone losing weight can still want a pre-workout — and a recommendation that
   * removes options is one people learn to distrust.
   */
  const [categoryOrder, setCategoryOrder] = useState<string[] | null>(null);
  const [appliedGoal, setAppliedGoal] = useState<Goal | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const availableSlugs = useMemo(() => groups.map((g) => g.slug), [groups]);

  const orderedGroups = useMemo(() => {
    if (!categoryOrder) return groups;
    const rank = new Map(categoryOrder.map((slug, i) => [slug, i]));
    return [...groups].sort((a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99));
  }, [groups, categoryOrder]);

  const scrollToGroup = useCallback((slug: string) => {
    // Two frames, not one: the reorder and any collapse commit in the same frame as the state
    // change, so a single rAF scrolls to where the section used to be.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(`group-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, []);

  const applyGoal = useCallback(
    (goal: Goal) => {
      const emphasis = GOAL_CATEGORY_EMPHASIS[goal].filter((s) => availableSlugs.includes(s));
      const order = [...emphasis, ...availableSlugs.filter((s) => !emphasis.includes(s))];
      setCategoryOrder(order);
      setAppliedGoal(goal);
      if (order[0]) scrollToGroup(order[0]);
    },
    [availableSlugs, scrollToGroup]
  );

  const handleAdvisorApply = useCallback(
    (result: AdvisorResult) => {
      setCategoryOrder(result.categoryOrder);
      setAppliedGoal(result.goal);
      if (result.categoryOrder[0]) scrollToGroup(result.categoryOrder[0]);
    },
    [scrollToGroup]
  );

  const clearGoal = useCallback(() => {
    setAppliedGoal(null);
    setCategoryOrder(null);
  }, []);

  const handleAddPackToCart = useCallback(() => {
    if (entries.length === 0) {
      toast.error('Ajoutez au moins un produit à votre pack');
      return;
    }
    entries.forEach(({ product, qty }) => addToCart(product, qty));
    setPackDiscount(true);
    toast.success('Pack ajouté au panier — la remise sera appliquée au paiement');
    router.push('/cart');
  }, [entries, addToCart, setPackDiscount, router]);

  const maxTier = PACK_TIERS[PACK_TIERS.length - 1].min;
  const tierPct = Math.min(100, (subtotal / maxTier) * 100);

  /** Categories with nothing in them yet — the "complete your pack" nudge, in both summaries. */
  const missingGroups = useMemo(
    () => orderedGroups.filter((g) => !coveredSlugs.includes(g.slug)).slice(0, 3).map(({ slug, label }) => ({ slug, label })),
    [orderedGroups, coveredSlugs]
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* `pb-36` reserves the sticky bar's height plus the tab bar's. Without it the last shelf sits
          underneath them and its "Ajouter" buttons cannot be tapped at all. */}
      <main className="max-w-site mx-auto px-4 pb-36 pt-5 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pb-20">
        {/* The H1 block, tightened. It stays because it is the page's only H1 and the canonical/OG
            title depend on this reading as a page — but `Accès Pro` is no longer a top-right sibling
            of the heading on mobile, where it was squeezing the subtitle onto three lines. */}
        <header>
          {/* Accès Pro rides the KICKER's row, not the heading block's. As a sibling of the whole
              block it wrapped onto a line of its own below the subtitle on a phone — 84px of screen
              for a secondary link, on the page whose measured problem was preamble. Beside a
              one-line eyebrow it costs nothing and still reads as deliberate. */}
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              Pack sur mesure
            </p>
            {/* Outlined, never filled: the filled brand button on this page is the add-to-cart, and
                two solid orange CTAs competing for the same eye is how the primary one gets ignored. */}
            <Link
              href="/partenaires"
              className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl border border-hairline bg-canvas px-3.5 text-xs font-semibold text-ink-1 transition-colors sm:text-sm [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
            >
              <BadgeCheck className="h-4 w-4 text-brand" aria-hidden="true" />
              <span>
                Accès Pro
                <span className="hidden text-ink-3 sm:inline"> — coachs &amp; salles</span>
              </span>
            </Link>
          </div>

          <h1 className="mt-1.5 font-display text-2xl font-extrabold uppercase leading-[1.05] tracking-tight text-ink-1 sm:text-3xl lg:text-4xl">
            Composez votre pack
          </h1>
          {/* One line at 390px. The previous copy wrapped to two and the second line said nothing
              the first had not already implied. */}
          <p className="mt-1.5 max-w-xl text-sm text-ink-2">
            Plus vous ajoutez, plus la remise grandit.
          </p>
        </header>

        {groups.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="Aucun produit disponible"
              description="Les produits du composeur de pack ne sont pas disponibles pour le moment. Revenez bientôt."
              showShopLink
            />
          </div>
        ) : (
          <>
            <PackGoalBar
              goal={appliedGoal}
              onSelect={applyGoal}
              onApplyAdvisor={handleAdvisorApply}
              onClear={clearGoal}
              availableSlugs={availableSlugs}
            />

            <TierStrip barRef={tierBarRef} subtotal={subtotal} percent={discountPercent} nextTier={nextTier} />

            <PackTray
              entries={entries}
              groups={orderedGroups.map(({ slug, label }) => ({ slug, label }))}
              coveredSlugs={coveredSlugs}
              onRemove={removeProduct}
              onJumpTo={scrollToGroup}
            />

            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
              <div className="min-w-0 space-y-7">
                {orderedGroups.map((group, i) => (
                  <PackRail
                    key={group.slug}
                    slug={group.slug}
                    label={group.label}
                    products={group.products}
                    href={`/${group.slug}`}
                    pack={pack}
                    onAdd={addOne}
                    onSetQty={setQty}
                    recommended={i === 0 && categoryOrder !== null}
                  />
                ))}
              </div>

              {/* Desktop rail. Hidden below lg, where the sticky bar takes over — rendering both
                  would duplicate every line item into the DOM for no one. `top-32` clears the
                  desktop header, measured at 122px. */}
              <aside className="hidden h-fit lg:sticky lg:top-32 lg:block">
                <div
                  ref={desktopTargetRef}
                  className="overflow-hidden rounded-2xl border border-hairline bg-elevated"
                >
                  <PackSummary
                    entries={entries}
                    itemCount={itemCount}
                    subtotal={subtotal}
                    discountPercent={discountPercent}
                    discountAmount={discountAmount}
                    total={total}
                    tierLabel={quote?.tier_label ?? null}
                    nextTier={nextTier}
                    quoteLoading={quoteLoading}
                    onSubmit={handleAddPackToCart}
                    missing={missingGroups}
                    onJumpTo={scrollToGroup}
                  />
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {/* ── Mobile: one bar, carrying everything ─────────────────────────────────────────────
          It expands INLINE rather than opening a drawer: the drawer primitive (vaul) is loaded
          lazily elsewhere, so using it here would pull a dialog library into this route's bundle.
          A transform and a boolean cost nothing, and keeping the shelves visible behind it is
          better anyway on a page whose whole job is adjusting quantities. */}
      {groups.length > 0 && (
        <div className="pt-packbar fixed inset-x-0 z-40 lg:hidden">
          <div
            id="pack-summary-mobile"
            className={`overflow-hidden border-t border-hairline bg-elevated transition-[max-height] duration-300 ease-out ${
              summaryOpen ? 'max-h-[58svh] overflow-y-auto' : 'max-h-0'
            }`}
          >
            <PackSummary
              entries={entries}
              itemCount={itemCount}
              subtotal={subtotal}
              discountPercent={discountPercent}
              discountAmount={discountAmount}
              total={total}
              tierLabel={quote?.tier_label ?? null}
              nextTier={nextTier}
              quoteLoading={quoteLoading}
              onSubmit={handleAddPackToCart}
              compact
            />
          </div>

          <div className="border-t border-hairline bg-elevated shadow-card">
            {/* The tier progress, absorbed into the bar. It used to be a second sticky element; as
                a 3px fill along the top edge it costs no height at all and is in the one place a
                phone user is guaranteed to be looking — beside the total. */}
            <div
              className="h-[3px] w-full bg-hairline"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={maxTier}
              aria-valuenow={Math.round(subtotal)}
              aria-label="Progression vers la remise suivante"
            >
              <div
                data-motion
                className="h-full bg-brand transition-[width] duration-500 ease-out"
                style={{ width: `${tierPct}%` }}
              />
            </div>

            {/* The nudge sits ABOVE the total row, and that position is load-bearing rather than
                aesthetic. MobileTabBar's raised centre button rises ~24px into whatever is directly
                above it; as the bar's LAST line this text ran the full width and its middle — the
                "−12%" — was covered by that button. The total row survives the same overlap because
                its centre is the empty gap between the price and the CTA. */}
            {nextTier && (
              <p className="flex items-center gap-1.5 px-4 pt-2 text-[11px] font-medium text-ink-2">
                <TrendingUp className="h-3 w-3 shrink-0 text-brand" aria-hidden="true" />
                Ajoutez {nextTier.remaining.toFixed(2)} DT pour obtenir −{nextTier.percent}%
              </p>
            )}

            <div ref={mobileTargetRef} className="flex items-center gap-3 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setSummaryOpen((v) => !v)}
                aria-expanded={summaryOpen}
                aria-controls="pack-summary-mobile"
                className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ChevronUp
                  className={`h-4 w-4 shrink-0 text-ink-3 transition-transform ${summaryOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
                <span className="min-w-0" aria-live="polite">
                  <span className="block text-[11px] text-ink-3">
                    {itemCount} article{itemCount !== 1 ? 's' : ''}
                    {discountPercent > 0 && <span className="font-semibold text-brand"> · −{discountPercent}%</span>}
                  </span>
                  {/* The saving sits BESIDE the total, not above it. Measured at 390px: with the CTA
                      and the chevron taking their share, this label row has ~184px, and stacking
                      them wrapped to two lines and shoved the total down. */}
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-lg font-bold tabular-nums leading-tight text-ink-1">
                      {total.toFixed(2)} DT
                    </span>
                    {discountAmount > 0 && (
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        −{discountAmount.toFixed(2)} DT
                      </span>
                    )}
                  </span>
                </span>
              </button>

              <Button
                type="button"
                onClick={handleAddPackToCart}
                disabled={entries.length === 0}
                className="min-h-[46px] shrink-0 rounded-xl px-4 font-display uppercase tracking-wide transition-transform active:scale-95 disabled:opacity-40"
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The discount mechanic as a position, in ONE row.
 *
 * It was a bordered card with a heading row, a bar, a label row and a nudge line: ~210px, on the
 * screen where the measured cost of preamble was the complaint. The information that earns its
 * place is *where am I* and *what is the next step*, and both fit on one line beside the bar.
 *
 * The bar is scaled to the LAST tier, so each tier's true position is min/max — 40%, 70%, 100% for
 * 200/350/500. Laying the labels out with `justify-between` would put them at 0/50/100% and point
 * "350 DT" at a place the bar never treats as 350 DT: an indicator that lies about where the goal
 * is, which is worse than no indicator. Ticks and labels are therefore positioned from the same
 * number the fill uses.
 */
function TierStrip({
  barRef,
  subtotal,
  percent,
  nextTier,
}: {
  /* NOT named `ref`. React 18 strips a prop called `ref` before it reaches a function component and
     warns "Function components cannot be given refs" — the pulse would silently never fire. React
     19 changed this; this codebase is on 18.3.1. */
  barRef: React.RefObject<HTMLElement | null>;
  subtotal: number;
  percent: number;
  nextTier: { percent: number; remaining: number } | null;
}) {
  const max = PACK_TIERS[PACK_TIERS.length - 1].min;
  const pct = Math.min(100, (subtotal / max) * 100);

  return (
    <section
      ref={barRef as React.RefObject<HTMLElement>}
      aria-label="Progression de la remise"
      className="mt-4 rounded-xl border border-hairline bg-sunken px-3.5 py-3 sm:px-4"
    >
      <div className="flex items-center gap-3">
        <h2 className="flex shrink-0 items-center gap-1.5 font-display text-xs font-extrabold uppercase tracking-tight text-ink-1">
          <Percent className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          <span className="hidden sm:inline">Remise groupée</span>
          <span className="sm:hidden">Remise</span>
        </h2>

        <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-hairline">
          <div
            data-motion
            className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
          {PACK_TIERS.slice(0, -1).map((tier) => (
            <span
              key={tier.min}
              aria-hidden="true"
              className="absolute top-0 h-full w-px bg-canvas"
              style={{ left: `${(tier.min / max) * 100}%` }}
            />
          ))}
        </div>

        <p className="shrink-0 whitespace-nowrap text-xs tabular-nums text-ink-2">
          {percent > 0 ? (
            <span className="font-display text-sm font-bold text-brand">−{percent}%</span>
          ) : (
            <span className="text-ink-3">dès {PACK_TIERS[0].min} DT</span>
          )}
        </p>
      </div>

      {/* `lg:flex`, not `flex`. Below lg the sticky pack bar carries this identical sentence, and it
          was appearing twice about 400px apart — the same instruction, in two voices, which reads
          as a bug rather than as emphasis. The bar wins on mobile because it is where the thumb
          already is; this strip wins on desktop because there is no bar there. */}
      {nextTier && (
        <p className="mt-1.5 hidden items-center gap-1.5 text-xs font-medium text-ink-2 lg:flex">
          <TrendingUp className="h-3 w-3 shrink-0 text-brand" aria-hidden="true" />
          Ajoutez <span className="font-display font-bold text-ink-1">{nextTier.remaining.toFixed(2)} DT</span> pour
          passer à −{nextTier.percent}%
        </p>
      )}
    </section>
  );
}

/**
 * One summary, rendered in two places — the desktop rail and the mobile expanding panel.
 *
 * Written once because these two used to be the same markup maintained separately, which is how a
 * total says one thing on a phone and another on a laptop. `compact` only drops the heading and the
 * CTA (the mobile bar already carries both), so the numbers cannot diverge.
 */
function PackSummary({
  entries,
  itemCount,
  subtotal,
  discountPercent,
  discountAmount,
  total,
  tierLabel,
  nextTier,
  quoteLoading,
  onSubmit,
  compact = false,
  missing = [],
  onJumpTo,
}: {
  entries: { product: Product; qty: number }[];
  itemCount: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  tierLabel: string | null;
  nextTier: { percent: number; remaining: number } | null;
  quoteLoading: boolean;
  onSubmit: () => void;
  compact?: boolean;
  /** Categories with nothing in them yet. Rendered on the desktop rail only — below lg the tray
   *  above the shelves already offers them, and the mobile panel is a summary, not a shop. */
  missing?: { slug: string; label: string }[];
  onJumpTo?: (slug: string) => void;
}) {
  return (
    <>
      {!compact && (
        <div className="border-b border-hairline px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold uppercase tracking-tight text-ink-1">
            <ShoppingCart className="h-5 w-5 text-brand" aria-hidden="true" />
            Votre pack
          </h2>
          <p className="mt-1 text-xs text-ink-3">
            {itemCount} article{itemCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="space-y-4 p-4 sm:p-5">
        {entries.length === 0 ? (
          <p className="py-3 text-center text-sm text-ink-3">
            Aucun produit sélectionné. Ajoutez des produits pour composer votre pack.
          </p>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {entries.map(({ product, qty }) => (
              <li key={product.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink-2">
                  <span className="tabular-nums text-ink-3">{qty}×</span> {product.designation_fr}
                </span>
                <span className="shrink-0 font-display font-semibold tabular-nums text-ink-1">
                  {(getEffectivePrice(product as never) * qty).toFixed(2)} DT
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t border-hairline pt-4">
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
              {/* Green, not brand orange: this is money BACK, and the site's orange means "action".
                  Colouring a saving with the same hue as the buttons is how it stops registering. */}
              <span className="font-display font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                −{discountAmount.toFixed(2)} DT
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-hairline pt-2">
            <span className="flex items-center gap-1.5 font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
              Total
              {quoteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" aria-hidden="true" />}
            </span>
            <span className="font-display text-2xl font-bold tabular-nums tracking-tight text-brand">
              {total.toFixed(2)} DT
            </span>
          </div>
        </div>

        {nextTier && !compact && (
          <div className="flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/5 p-3">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <p className="text-xs font-medium text-ink-2">
              Ajoutez {nextTier.remaining.toFixed(2)} DT pour obtenir −{nextTier.percent}%
            </p>
          </div>
        )}

        {!compact && missing.length > 0 && entries.length > 0 && onJumpTo && (
          <div className="border-t border-hairline pt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
              <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              Complétez votre pack
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missing.map((g) => (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => onJumpTo(g.slug)}
                  className="inline-flex min-h-[32px] items-center rounded-full border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-2 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!compact && (
          <>
            <Button
              type="button"
              size="lg"
              onClick={onSubmit}
              disabled={entries.length === 0}
              className="min-h-[52px] w-full rounded-xl font-display uppercase tracking-wide transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
              Ajouter le pack au panier
            </Button>
            <p className="text-center text-[11px] leading-snug text-ink-3">
              La remise groupée est recalculée et appliquée automatiquement lors du paiement.
            </p>
          </>
        )}
      </div>
    </>
  );
}
