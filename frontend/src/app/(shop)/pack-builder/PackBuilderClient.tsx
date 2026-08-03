'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/button';
import { EmptyState } from '@/app/components/EmptyState';
import { useCart } from '@/app/contexts/CartContext';
import { packQuote, getStorageUrl, isStorageImageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import type { Product, PackQuote } from '@/types';
import { toast } from 'sonner';
import { Plus, Minus, Trash2, ShoppingCart, Percent, Loader2, Package, TrendingUp, BadgeCheck, ChevronUp, Sparkles } from 'lucide-react';
import { PackAdvisor, type AdvisorResult } from './PackAdvisor';

export interface PackBuilderGroup {
  slug: string;
  label: string;
  products: Product[];
}

interface PackBuilderClientProps {
  groups: PackBuilderGroup[];
}

/** Display-only mirror of the backend PackDiscountService tiers (authoritative amount comes from /pack/quote). */
const PACK_TIERS: { min: number; percent: number }[] = [
  { min: 200, percent: 5 },
  { min: 350, percent: 8 },
  { min: 500, percent: 12 },
];

export function PackBuilderClient({ groups }: PackBuilderClientProps) {
  const router = useRouter();
  const { addToCart, setPackDiscount } = useCart();

  // Selected quantities keyed by product id.
  const [pack, setPack] = useState<Record<number, number>>({});
  const [quote, setQuote] = useState<PackQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Flat product lookup so we can resolve ids → product without re-scanning groups each time.
  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    groups.forEach((g) => g.products.forEach((p) => map.set(p.id, p)));
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

  const addOne = useCallback(
    (product: Product) => {
      const stock = getStockDisponible(product as never);
      if (stock <= 0) {
        toast.error('Rupture de stock');
        return;
      }
      setQty(product, (pack[product.id] ?? 0) + 1);
    },
    [pack, setQty]
  );

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

  /**
   * The advisor's answer, applied to the picker below: the recommended categories are reordered
   * to the top and the first one is scrolled to.
   *
   * REORDERING, NOT FILTERING. Hiding the other categories would make the advisor a gate rather
   * than a suggestion — a visitor whose goal is "perte de poids" can still want a pre-workout,
   * and a recommendation that removes options is a recommendation people learn to distrust.
   */
  const [categoryOrder, setCategoryOrder] = useState<string[] | null>(null);
  /** Mobile summary panel. Closed by default — the bar already shows count, total, discount. */
  const [summaryOpen, setSummaryOpen] = useState(false);

  const availableSlugs = useMemo(() => groups.map((g) => g.slug), [groups]);

  const orderedGroups = useMemo(() => {
    if (!categoryOrder) return groups;
    const rank = new Map(categoryOrder.map((slug, i) => [slug, i]));
    return [...groups].sort((a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99));
  }, [groups, categoryOrder]);

  const handleAdvisorApply = useCallback((result: AdvisorResult) => {
    setCategoryOrder(result.categoryOrder);
    // Let the reorder commit before scrolling, or we scroll to where the group used to be.
    requestAnimationFrame(() => {
      const first = result.categoryOrder[0];
      if (!first) return;
      document.getElementById(`group-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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

  return (
    <div className="min-h-screen bg-canvas">
      {/* Room for the sticky mobile summary bar, which is fixed and therefore out of flow. Without
          this the last row of products sits underneath it and cannot be tapped. */}
      <main className="max-w-site mx-auto px-4 pb-40 pt-6 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20">
        <PageHeader
          kicker="Pack sur mesure"
          title="Composez votre pack"
          subtitle="Choisissez vos produits : la remise groupée s'applique automatiquement, et grandit avec votre pack."
          action={
            /* Coaches and gyms buy packs repeatedly and at volume — this page is where they
               already are. Outlined, not filled: the filled brand button here is the add-to-cart,
               and two solid orange CTAs competing for the same eye is how the primary one gets
               ignored. */
            <Link
              href="/partenaires"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-hairline bg-canvas px-4 text-sm font-semibold text-ink-1 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
            >
              <BadgeCheck className="h-4 w-4 text-brand" aria-hidden="true" />
              <span>
                Accès Pro
                <span className="hidden text-ink-3 sm:inline"> — coachs &amp; salles</span>
              </span>
            </Link>
          }
        />

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
            {/* One strip, not three cards. The three cards were static, took a full screen on a
                phone, and never told you where you actually were. This shows the live position. */}
            <TierProgress subtotal={subtotal} percent={discountPercent} nextTier={nextTier} />

            <div className="mt-5">
              <PackAdvisor onApply={handleAdvisorApply} availableSlugs={availableSlugs} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
              <div className="min-w-0">
                {/* Jump nav. Five stacked category sections is a long scroll on a phone with no
                    map; these chips are the map. Horizontal scroll rather than wrap, so the row
                    height is constant however many categories the admin publishes. */}
                <nav
                  aria-label="Catégories du composeur"
                  className="scrollbar-hide -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
                >
                  {orderedGroups.map((group, i) => (
                    <a
                      key={group.slug}
                      href={`#group-${group.slug}`}
                      className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
                        i === 0 && categoryOrder
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-hairline bg-canvas text-ink-2 [@media(hover:hover)]:hover:border-brand/40'
                      }`}
                    >
                      {i === 0 && categoryOrder && <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                      {group.label}
                    </a>
                  ))}
                </nav>

                <div className="space-y-9">
                  {orderedGroups.map((group) => (
                    <section
                      key={group.slug}
                      id={`group-${group.slug}`}
                      aria-labelledby={`group-${group.slug}-h`}
                      className="scroll-mt-24"
                    >
                      <h2
                        id={`group-${group.slug}-h`}
                        className="mb-3 font-display text-xl font-extrabold uppercase tracking-tight text-ink-1 sm:text-2xl"
                      >
                        {group.label}
                      </h2>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                        {group.products.map((product) => {
                          const qty = pack[product.id] ?? 0;
                          const price = getEffectivePrice(product as never);
                          const stock = getStockDisponible(product as never);
                          const outOfStock = stock <= 0;
                          const image = product.cover ? getStorageUrl(product.cover) : '';
                          return (
                            <article
                              key={product.id}
                              className={`font-poppins flex flex-col overflow-hidden rounded-2xl border transition-colors ${
                                qty > 0 ? 'border-brand bg-brand/5' : 'border-hairline bg-canvas'
                              }`}
                            >
                              <div className="relative aspect-square w-full bg-sunken">
                                {image ? (
                                  <Image
                                    src={image}
                                    alt={product.designation_fr}
                                    fill
                                    className="object-contain p-3"
                                    sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
                                    unoptimized={isStorageImageUrl(image)}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-ink-3">
                                    <Package className="h-8 w-8" aria-hidden="true" />
                                  </div>
                                )}
                                {qty > 0 && (
                                  <span className="absolute left-2 top-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand px-1.5 font-display text-xs font-bold tabular-nums text-white">
                                    {qty}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-1 flex-col p-3">
                                <h3
                                  title={product.designation_fr}
                                  className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-snug text-ink-1 sm:text-sm"
                                >
                                  {product.designation_fr}
                                </h3>
                                <p className="mt-1 font-display text-base font-bold tabular-nums tracking-tight text-brand">
                                  {price.toFixed(2)} DT
                                </p>

                                <div className="mt-2.5">
                                  {outOfStock ? (
                                    <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-sunken text-xs font-semibold text-ink-3">
                                      Rupture
                                    </span>
                                  ) : qty > 0 ? (
                                    <div className="flex items-center justify-between rounded-xl border border-hairline bg-canvas">
                                      <button
                                        type="button"
                                        onClick={() => setQty(product, qty - 1)}
                                        className="flex h-11 w-11 items-center justify-center rounded-l-xl text-ink-2 [@media(hover:hover)]:hover:text-brand"
                                        aria-label={qty === 1 ? 'Retirer du pack' : 'Diminuer la quantité'}
                                      >
                                        {qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                                      </button>
                                      <span className="font-display text-base font-bold tabular-nums text-ink-1">
                                        {qty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => addOne(product)}
                                        disabled={stock > 0 && qty >= stock}
                                        className="flex h-11 w-11 items-center justify-center rounded-r-xl text-ink-2 disabled:opacity-40 [@media(hover:hover)]:hover:text-brand"
                                        aria-label="Augmenter la quantité"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => addOne(product)}
                                      className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-brand text-sm font-semibold text-white transition-colors [@media(hover:hover)]:hover:bg-brand-hover"
                                    >
                                      <Plus className="h-4 w-4" aria-hidden="true" />
                                      Ajouter
                                    </button>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              {/* Desktop rail. Hidden below lg, where the sticky bar takes over — rendering both
                  would duplicate every line item into the DOM for no one. */}
              <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
                <div className="overflow-hidden rounded-2xl border border-hairline bg-elevated">
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
                  />
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {/* ── Mobile: the pack follows you ─────────────────────────────────────────────────────
          It used to sit BELOW every product, so on a phone you had to scroll past the entire
          catalogue to discover what your pack cost — and the tier nudge that drives the whole
          mechanic was invisible exactly when it should be working on you.

          It expands INLINE rather than opening a drawer: the drawer primitive (vaul) is only
          loaded lazily elsewhere, so using it here would pull a dialog library into this route's
          bundle. A transform and a boolean cost nothing, and keeping the products visible behind
          it is better anyway on a page whose whole job is adjusting quantities. */}
      {groups.length > 0 && (
        <div className="pt-packbar fixed inset-x-0 z-40 lg:hidden" aria-live="polite">
          <div
            id="pack-summary-mobile"
            className={`overflow-hidden border-t border-hairline bg-elevated transition-[max-height] duration-300 ease-out ${
              summaryOpen ? 'max-h-[60svh] overflow-y-auto' : 'max-h-0'
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

          <div className="border-t border-hairline bg-elevated px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3">
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
                <span className="min-w-0">
                  <span className="block text-xs text-ink-3">
                    {itemCount} article{itemCount !== 1 ? 's' : ''}
                    {discountPercent > 0 && (
                      <span className="ml-1.5 font-semibold text-brand">−{discountPercent}%</span>
                    )}
                  </span>
                  <span className="block font-display text-lg font-bold tabular-nums leading-tight text-ink-1">
                    {total.toFixed(2)} DT
                  </span>
                </span>
              </button>

              <Button
                type="button"
                onClick={handleAddPackToCart}
                disabled={entries.length === 0}
                className="min-h-[48px] shrink-0 rounded-xl px-5 font-display uppercase tracking-wide disabled:opacity-40"
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Ajouter
              </Button>
            </div>

            {nextTier && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
                <TrendingUp className="h-3 w-3 shrink-0 text-brand" aria-hidden="true" />
                Ajoutez {nextTier.remaining.toFixed(2)} DT pour obtenir −{nextTier.percent}%
              </p>
            )}
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
}

/**
 * The discount mechanic, as a position rather than a price list.
 *
 * The three cards this replaces stated the tiers and nothing else: they were identical whether the
 * pack was empty or one dinar short of the next tier, and on a phone they cost a full screen
 * before a single product appeared. A progress bar answers the only question the shopper actually
 * has — how close am I — and it is the thing that makes the mechanic persuasive instead of
 * merely documented.
 */
function TierProgress({
  subtotal,
  percent,
  nextTier,
}: {
  subtotal: number;
  percent: number;
  nextTier: { percent: number; remaining: number } | null;
}) {
  const max = PACK_TIERS[PACK_TIERS.length - 1].min;
  const pct = Math.min(100, (subtotal / max) * 100);

  return (
    <section aria-label="Progression de la remise" className="mt-5 rounded-2xl border border-hairline bg-sunken p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-tight text-ink-1">
          <Percent className="h-4 w-4 text-brand" aria-hidden="true" />
          Remise groupée
        </h2>
        <p className="text-xs text-ink-2">
          {percent > 0 ? (
            <>
              <span className="font-display text-base font-bold text-brand">−{percent}%</span> appliqué
            </>
          ) : (
            <>Dès {PACK_TIERS[0].min} DT d&apos;achat</>
          )}
        </p>
      </div>

      {/* The bar is scaled to the LAST tier, so each tier's true position is min/max — 40%, 70%,
          100% for 200/350/500. Laying the labels out with `justify-between` would put them at
          0/50/100% and point "350 DT" at a place the bar never treats as 350 DT: a progress
          indicator that lies about where the goal is, which is worse than no indicator. Both the
          ticks and the labels are therefore positioned from the same number the fill uses. */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-hairline">
        <div
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

      <ol className="relative mt-2 h-4">
        {PACK_TIERS.map((tier, i) => {
          const reached = subtotal >= tier.min;
          const isLast = i === PACK_TIERS.length - 1;
          return (
            <li
              key={tier.min}
              className={`absolute whitespace-nowrap text-[11px] font-semibold tabular-nums ${
                reached ? 'text-brand' : 'text-ink-3'
              }`}
              style={
                isLast
                  ? { right: 0 }
                  : { left: `${(tier.min / max) * 100}%`, transform: 'translateX(-50%)' }
              }
            >
              {/* Below `sm` the track is ~324px and three "200 DT · −5%" labels physically cannot
                  fit — measured, they overlapped by ~19px. Dropping the amount on a phone is the
                  right thing to drop: the percentage is what the tick MARKS, and the exact dinars
                  needed are spelled out in the "Ajoutez … DT" line directly below, where they are
                  actionable rather than decorative. */}
              <span className="sm:hidden">−{tier.percent}%</span>
              <span className="hidden sm:inline">
                {tier.min} DT · −{tier.percent}%
              </span>
            </li>
          );
        })}
      </ol>

      {nextTier && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-2">
          <TrendingUp className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
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
 * total says one thing on a phone and another on a laptop. `compact` only drops the heading and
 * the CTA (the mobile bar already carries both), so the numbers cannot diverge.
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

        {!compact && (
          <>
            <Button
              type="button"
              size="lg"
              onClick={onSubmit}
              disabled={entries.length === 0}
              className="min-h-[52px] w-full rounded-xl font-display uppercase tracking-wide disabled:opacity-50"
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
