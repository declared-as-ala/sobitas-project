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
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/app/components/EmptyState';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { useCart } from '@/app/contexts/CartContext';
import { packQuote } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import type { Product, PackQuote } from '@/types';
import { notify as toast } from '@/lib/notify';
import { flyToPack, pulseTierUnlocked } from './packMotion';
import { PackWizard } from './wizard/PackWizard';

export interface PackBuilderGroup {
  slug: string;
  label: string;
  /** Absolute URL of the category's own cover photograph, or null when the admin has none. */
  cover: string | null;
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

function FocusedBuilderHeader() {
  return (
    <header className="border-b border-hairline bg-elevated">
      <div className="max-w-site mx-auto flex min-h-[72px] items-center px-4 sm:px-6 lg:px-8">
        <LinkWithLoading
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-sm font-semibold text-ink-2 transition-colors [@media(hover:hover)]:hover:bg-sunken [@media(hover:hover)]:hover:text-ink-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour à la boutique
        </LinkWithLoading>
      </div>
    </header>
  );
}

export function PackBuilderClient({ groups }: PackBuilderClientProps) {
  const router = useRouter();
  const { addToCart, setPackDiscount, setCartDrawerOpen } = useCart();

  const [pack, setPack] = useState<Record<number, number>>({});
  const [quote, setQuote] = useState<PackQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  /** Add one and aim the confirmation motion at whichever pack summary is currently visible. */
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
      const visibleTarget = Array.from(document.querySelectorAll<HTMLElement>('[data-pack-target]'))
        .find((element) => element.getClientRects().length > 0);
      flyToPack(img, visibleTarget ?? footerRef.current);
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

  /**
   * A QUOTE MAY ONLY DESCRIBE THE PACK IT WAS ASKED ABOUT.
   *
   * ── THE BUG THIS ONE LINE FIXES ────────────────────────────────────────────────────────
   * `quote` is never cleared on the way out — it is only overwritten when the next response
   * lands. So for the 400 ms debounce plus a round trip after every single add, the previous
   * basket's discount was being applied to the new basket's contents. Three numbers on the recap
   * came off two different clocks:
   *
   *     Sous-total   428.00 DT   ← recomputed locally, instant
   *     Remise pack  −34.24 DT   ← the PREVIOUS basket's discount
   *     Total       393.76 DT   ← the PREVIOUS basket's total
   *
   * Add a second 179 DT item to a 249 DT pack and, for that second or two, "Total" printed 249's
   * total under a subtotal of 428 — a figure lower than the sum of the lines directly above it,
   * on the screen where the customer decides to buy. On a slow connection it is a visibly wrong
   * price sitting under the shopper's thumb, and it is wrong in the one direction this file's own
   * header rule forbids: too LOW, which they will accept and we would have to honour.
   *
   * Treating an in-flight quote as ABSENT rather than as current is the whole fix, and it is
   * one line. Everything downstream already knows how to render "no quote yet": the total falls
   * back to the raw subtotal, the discount row disappears, the tier nudge disappears, and
   * `assessPack` withholds every money claim (it takes `hasQuote` for exactly this reason). The
   * customer sees an undiscounted price settle INTO a discount, which is both honest and the
   * better story.
   */
  const liveQuote = quoteLoading ? null : quote;
  const discountPercent = liveQuote?.discount_percent ?? 0;
  const discountAmount = liveQuote?.discount_amount ?? 0;
  const total = liveQuote ? liveQuote.total : subtotal;
  const nextTier = liveQuote?.next_tier ?? null;

  /**
   * One expanding ring on the tier track the moment a discount tier is actually reached.
   *
   * `pulseTierUnlocked` and its `.pt-tier-hit` keyframes were written for this and then had zero
   * call sites — the single most requested kind of feedback on this page ("make it alive when the
   * user interacts") existed in the codebase and was never connected to anything.
   *
   * It fires only when the percentage INCREASES. Firing on any change would replay the ring while
   * the shopper removes items, turning a reward into a notification that they have lost something.
   * The ref holds the previous value across renders without causing one of its own.
   */
  const tierTrackRef = useRef<HTMLDivElement>(null);
  const prevDiscountRef = useRef(0);
  useEffect(() => {
    if (discountPercent > prevDiscountRef.current) pulseTierUnlocked(tierTrackRef.current);
    prevDiscountRef.current = discountPercent;
  }, [discountPercent]);

  /**
   * Commit the pack to the cart and leave.
   *
   * `submitting` is never reset on the success path, and that is deliberate rather than a leak: the
   * only way out of this branch is `router.push('/cart')`, which unmounts this component. Clearing
   * the flag first would un-disable the button for the length of the navigation, which is precisely
   * the window in which a second tap adds every line to the cart twice.
   *
   * The guard on the ref rather than on the state variable is what makes that airtight — two taps
   * inside one React batch both see the old `submitting === false`, so state alone does not
   * serialise them.
   */
  const submittingRef = useRef(false);
  const handleSubmit = useCallback(() => {
    if (submittingRef.current) return;
    if (entries.length === 0) {
      toast.error('Ajoutez au moins un produit à votre pack');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    entries.forEach(({ product, qty }) => addToCart(product, qty));
    setPackDiscount(true);
    /* `addToCart` opens the cart drawer (CartContext's `openDrawerDeferred`), which is right
       everywhere else on the site and wrong here: the very next line navigates to /cart, so the
       drawer slid open over the top of the page it was taking the shopper to — the same cart,
       twice, one of them a sheet they now have to dismiss. Closing it after the writes and before
       the push means the drawer never paints. */
    setCartDrawerOpen(false);
    toast.success('Pack ajouté au panier — la remise sera appliquée au paiement');
    router.push('/cart');
  }, [entries, addToCart, setPackDiscount, setCartDrawerOpen, router]);

  if (groups.length === 0) {
    return (
      <div className="pt-no-chrome min-h-screen bg-canvas">
        <FocusedBuilderHeader />
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
    /* THE PAGE IS SAND, NOT WHITE (owner: "use the colors of the landing page… literally the same
       tokens"). The landing page is not a white page — it is an alternation of `canvas` and
       `sunken` bands with white `elevated` plates sitting on them, and CategoryRail specifically is
       a sunken band carrying elevated tiles. This page was a flat `bg-canvas` for all eight steps,
       so every card on it was white-on-white and the plates had to be drawn with borders alone.
       On sand the same cards read as objects, exactly as they do on the homepage, and the borders
       become an edge rather than the only thing defining a card. */
    <div className="pt-no-chrome min-h-screen bg-sunken">
      <FocusedBuilderHeader />
      <main className="max-w-site mx-auto px-4 pb-32 pt-4 sm:px-6 sm:pt-6 lg:h-[calc(100dvh-72px)] lg:overflow-hidden lg:px-8 lg:pb-5 lg:pt-5">
        <PackWizard
          groups={groups}
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
          submitting={submitting}
          tiers={PACK_TIERS}
          onAdd={addOne}
          onSetQty={setQty}
          onRemove={removeProduct}
          onSubmit={handleSubmit}
          footerRef={footerRef}
          tierTrackRef={tierTrackRef}
        />
      </main>
    </div>
  );
}
