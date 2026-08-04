'use client';

/**
 * "Composez votre pack" — state and money. The screen is `wizard/PackWizard`.
 *
 * ── WHY THIS FILE IS NOW THIN ──────────────────────────────────────────────────────────────
 * It used to be 730 lines of layout, presentation and pricing in one component, and every change
 * to how a product tile looked risked the quote. The split is along the only line that matters
 * here: this file owns what the pack IS and what it COSTS; everything under `wizard/` owns how
 * that is presented. The wizard receives numbers and callbacks and computes no prices at all.
 *
 * ── THE PRICE RULE, UNCHANGED THROUGH THREE REDESIGNS ──────────────────────────────────────
 * The authoritative discount comes from `/pack/quote` on the server, debounced. `PACK_TIERS` below
 * is a DISPLAY MIRROR of the backend's PackDiscountService, used only to draw progress — never to
 * compute a price the customer is shown as final. `total` reads `quote.total` and falls back to
 * the raw subtotal, never to a locally-computed discount, so a disagreement between client and
 * server can only ever show the customer a price that is too HIGH, which they will query, rather
 * than one that is too low, which they will accept and we will have to honour.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/app/components/EmptyState';
import { useCart } from '@/app/contexts/CartContext';
import { packQuote } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import type { Product, PackQuote } from '@/types';
import { toast } from 'sonner';
import { GOAL_CATEGORY_EMPHASIS, type Goal } from '@/util/nutritionTargets';
import { flyToPack } from './packMotion';
import { PackWizard } from './wizard/PackWizard';

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
  const [goal, setGoal] = useState<Goal | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[] | null>(null);

  /** Where a flying product thumbnail lands — the wizard's footer total. */
  const footerRef = useRef<HTMLDivElement>(null);

  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    groups.forEach((g) => g.products.forEach((p) => map.set(p.id, p)));
    return map;
  }, [groups]);

  /**
   * Which categories the pack covers.
   *
   * Derived by asking each GROUP whether it holds a selected product — not by mapping each product
   * to a category. A product can legitimately sit in more than one (a mass gainer is in both
   * `gainers-proteines` and `prise-de-masse`), and a product→slug map keeps only the last write.
   * That shipped a visible lie: adding a gainer from the Gainers step produced "vous avez Prise de
   * masse, il manque Gainers" on the recap — the page telling the customer they had not done the
   * thing they had just done.
   */
  const coveredSlugs = useMemo(
    () => groups.filter((g) => g.products.some((p) => (pack[p.id] ?? 0) > 0)).map((g) => g.slug),
    [groups, pack]
  );

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

  /**
   * Add one, and throw the thumbnail at the footer total.
   *
   * The flight is the reason this is not just `setQty`. On a phone the footer sits under the thumb,
   * so adding an item changes numbers the hand is covering — the tap reads as "nothing happened",
   * which is how people tap twice and end up with a quantity they did not choose.
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
      flyToPack(img, footerRef.current);
    },
    [pack, setQty]
  );

  const removeProduct = useCallback((product: Product) => setQty(product, 0), [setQty]);

  // Debounced authoritative quote: the server recomputes the subtotal + tier from real prices.
  const quoteTokenRef = useRef(0);
  useEffect(() => {
    const items = entries.map(({ product, qty }) => ({ produit_id: product.id, quantite: qty }));

    /* THE TOKEN IS BUMPED FIRST, BEFORE THE EMPTY-PACK RETURN.
       It used to be bumped after, and that one ordering shipped a price for an empty pack: emptying
       the pack was the ONE transition that left an in-flight request's token still equal to the
       current one, so its response passed the `token === quoteTokenRef.current` guard and
       overwrote the `setQuote(null)` two lines below it. The recap then read "Aucun produit
       sélectionné" and "Total 179.55 DT" at the same time, and stayed that way until the next
       quote resolved. The debounce timer's cleanup does not help — once it has fired, clearTimeout
       is a no-op and the request is already unguarded. */
    const token = ++quoteTokenRef.current;

    if (items.length === 0) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
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
   * The goal REORDERS the category steps; it never filters. Someone losing weight can still want a
   * pre-workout, and a recommendation that removes options is one people learn to distrust.
   */
  const availableSlugs = useMemo(() => groups.map((g) => g.slug), [groups]);
  const handleSelectGoal = useCallback(
    (g: Goal) => {
      const emphasis = GOAL_CATEGORY_EMPHASIS[g].filter((s) => availableSlugs.includes(s));
      setGoal(g);
      setCategoryOrder([...emphasis, ...availableSlugs.filter((s) => !emphasis.includes(s))]);
    },
    [availableSlugs]
  );

  const handleSubmit = useCallback(() => {
    if (entries.length === 0) {
      toast.error('Ajoutez au moins un produit à votre pack');
      return;
    }
    entries.forEach(({ product, qty }) => addToCart(product, qty));
    setPackDiscount(true);
    toast.success('Pack ajouté au panier — la remise sera appliquée au paiement');
    router.push('/cart');
  }, [entries, addToCart, setPackDiscount, router]);

  if (groups.length === 0) {
    return (
      <div className="min-h-screen bg-canvas">
        <main className="max-w-site mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          {/* The H1 still renders when the catalogue is unavailable. The page must not become
              heading-less because an upstream fetch failed — that is a permanent SEO loss caused by
              a transient outage. */}
          <h1 className="sr-only">Composez votre pack</h1>
          <EmptyState
            title="Aucun produit disponible"
            description="Les produits du composeur de pack ne sont pas disponibles pour le moment. Revenez bientôt."
            showShopLink
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* The bottom reserve, and why it steps where it does.
          Two fixed things stack at the bottom: the pack bar (~95px: a 3px track, a nudge line, and
          a 46px CTA row) and MobileTabBar (56px + safe area). The tab bar is `md:hidden`, so both
          are present all the way to 767px — but the reserve used to drop to `sm:pb-16` (64px) at
          640px, which is less than the tab bar alone. Between 640 and 767 the step's own "Continuer"
          button sat under the bar and could not be tapped.
          Now: 144px to 767px (both present), 64px from `md` (neither). */}
      <main className="max-w-site mx-auto px-4 pb-36 pt-6 sm:px-6 sm:pt-10 md:pb-16 lg:px-8 lg:pb-20">
        <PackWizard
          groups={groups}
          categoryOrder={categoryOrder}
          goal={goal}
          pack={pack}
          entries={entries}
          itemCount={itemCount}
          subtotal={subtotal}
          discountPercent={discountPercent}
          discountAmount={discountAmount}
          total={total}
          tierLabel={quote?.tier_label ?? null}
          nextTier={nextTier}
          quoteLoading={quoteLoading}
          hasQuote={quote !== null}
          tiers={PACK_TIERS}
          coveredSlugs={coveredSlugs}
          onSelectGoal={handleSelectGoal}
          onAdd={addOne}
          onSetQty={setQty}
          onRemove={removeProduct}
          onSubmit={handleSubmit}
          footerRef={footerRef}
        />
      </main>
    </div>
  );
}
