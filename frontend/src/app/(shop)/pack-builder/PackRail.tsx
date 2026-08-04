'use client';

/**
 * A category, as a horizontal shelf.
 *
 * ── THE PROBLEM IT REPLACES ────────────────────────────────────────────────────────────────
 * Twelve products in a 2-column grid is six rows, and five of those stacked measured **8,104 px —
 * 10.9 iPhone screens** from the first category to the last (scripts/measure-packbuilder.mjs).
 * Owner: "I keep scrolling, scrolling, scrolling to see just créatine." A shelf is ~330 px
 * whatever the product count, so the same five categories fit in roughly 1,650 px and comparing a
 * créatine with a whey is a thumb flick instead of a four-screen round trip.
 *
 * ── THE THREE THINGS THAT MAKE A SHELF WORK ────────────────────────────────────────────────
 * Baymard's carousel research is blunt about horizontal content: users miss what they cannot see.
 * (Their headline finding is about auto-rotating hero banners, which is a different animal — but
 * the discoverability half transfers exactly.) Three requirements answer it, and all three are
 * load-bearing rather than decorative:
 *
 *   1. A VISIBLE PEEK. A card cut off at the right edge is the only signal that survives touch —
 *      scrollbars are hidden and arrows go unread. Card widths are picked so the peek is 28–98 px
 *      at every phone width in the matrix; see the table in docs/PACK-BUILDER-REDESIGN.md §3.2.
 *   2. THE SHELF STATES ITS OWN SIZE. "12 produits" in the header, so three visible cards are never
 *      mistaken for the whole category.
 *   3. AN ESCAPE HATCH. "Voir tout" goes to the real category page for anyone who wants a grid.
 *
 * `scroll-snap-type: x mandatory` with `snap-start` on each card is what makes a flick land on a
 * card edge rather than mid-product. It is native, so it keeps the momentum physics of the platform
 * — a JS carousel here would replace correct iOS scrolling with an approximation of it.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Check, Minus, Package, Plus, Trash2 } from 'lucide-react';
import { getStorageUrl, isStorageImageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import type { Product } from '@/types';

export interface PackRailProps {
  slug: string;
  label: string;
  products: Product[];
  /** Quantity currently in the pack, per product id. */
  pack: Record<number, number>;
  /** `img` is the tile's image element, so the caller can fly it into the pack summary. */
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
  /** Marks the shelf the advisor put first, so the reordering is explained rather than mysterious. */
  recommended?: boolean;
  /** Href of the real category page. */
  href: string;
}

/**
 * Image `sizes`, derived per DESIGN_SYSTEM §7 rather than guessed.
 *
 * The frame is square and the image is `object-contain`, so the required width is exactly the card
 * width — no `object-cover` scale factor to apply. Card widths are 144 / 168 / 184 CSS px.
 */
const IMAGE_SIZES = '(min-width: 1024px) 184px, (min-width: 640px) 168px, 144px';

/** One product. Extracted and memoised because a shelf re-renders on every quantity change in the
 *  whole builder, and re-rendering twelve tiles to update one of them is how a stepper starts to
 *  feel laggy under a phone's CPU. */
const PackTile = memo(function PackTile({
  product,
  qty,
  onAdd,
  onSetQty,
}: {
  product: Product;
  qty: number;
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
}) {
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const price = getEffectivePrice(product as never);
  const stock = getStockDisponible(product as never);
  const outOfStock = stock <= 0;
  const image = product.cover ? getStorageUrl(product.cover) : '';
  const atStockLimit = stock > 0 && qty >= stock;

  const handleAdd = useCallback(() => {
    onAdd(product, imgWrapRef.current?.querySelector('img') ?? null);
  }, [onAdd, product]);

  return (
    <article
      data-pack-tile
      data-selected={qty > 0 ? 'true' : undefined}
      /* 144 / 168 / 184 CSS px. Chosen from the peek table in docs/PACK-BUILDER-REDESIGN.md §3.2,
         not from the Tailwind scale: at 144 the shelf shows two whole cards plus 28px of a third
         at 360px wide, which is the narrowest phone in the matrix and therefore the one that
         decides whether the "this scrolls" signal exists at all. */
      className={`font-poppins flex w-36 shrink-0 snap-start flex-col overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow] sm:w-[10.5rem] lg:w-[11.5rem] ${
        qty > 0
          ? 'border-brand bg-brand/5 shadow-card'
          : 'border-hairline bg-elevated [@media(hover:hover)]:hover:border-brand/40 [@media(hover:hover)]:hover:shadow-card'
      }`}
    >
      <div ref={imgWrapRef} className="relative aspect-square w-full bg-sunken">
        {image ? (
          <Image
            src={image}
            alt={product.designation_fr}
            fill
            className="object-contain p-2.5"
            sizes={IMAGE_SIZES}
            loading="lazy"
            unoptimized={isStorageImageUrl(image)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-3">
            <Package className="h-7 w-7" aria-hidden="true" />
          </div>
        )}

        {qty > 0 && (
          /* `key={qty}` remounts the badge on every change, which restarts `pt-pop`. That is the
             cheapest possible way to replay a CSS animation on a value change — no state, no timer,
             no cleanup to leak. `data-motion` opts out of the global 200ms mobile clamp so the pop
             keeps its shape on the device where this feedback matters most. */
          <span
            key={qty}
            data-motion
            className="pt-pop absolute left-1.5 top-1.5 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand px-1.5 font-display text-xs font-bold tabular-nums text-on-brand"
          >
            {qty}
          </span>
        )}

        {outOfStock && (
          <span className="pt-slab absolute inset-x-1.5 bottom-1.5 rounded-lg px-2 py-1 text-center text-[11px] font-semibold text-ink-1">
            Rupture
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <h3
          title={product.designation_fr}
          className="line-clamp-2 min-h-[2.1rem] text-[11px] font-semibold leading-snug text-ink-1 sm:text-xs"
        >
          {product.designation_fr}
        </h3>
        <p className="mt-1 font-display text-sm font-bold tabular-nums tracking-tight text-brand sm:text-base">
          {price.toFixed(2)} DT
        </p>

        <div className="mt-2">
          {outOfStock ? (
            <span className="flex min-h-[40px] items-center justify-center rounded-lg bg-sunken text-[11px] font-semibold text-ink-3">
              Indisponible
            </span>
          ) : qty > 0 ? (
            <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-canvas">
              <button
                type="button"
                onClick={() => onSetQty(product, qty - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-l-lg text-ink-2 transition-transform active:scale-90 [@media(hover:hover)]:hover:text-brand"
                aria-label={qty === 1 ? `Retirer ${product.designation_fr} du pack` : 'Diminuer la quantité'}
              >
                {qty === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              </button>
              <span className="font-display text-sm font-bold tabular-nums text-ink-1">{qty}</span>
              <button
                type="button"
                onClick={handleAdd}
                disabled={atStockLimit}
                className="flex h-10 w-10 items-center justify-center rounded-r-lg text-ink-2 transition-transform active:scale-90 disabled:opacity-40 [@media(hover:hover)]:hover:text-brand"
                aria-label="Augmenter la quantité"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="flex min-h-[40px] w-full items-center justify-center gap-1 rounded-lg bg-brand text-xs font-semibold text-on-brand transition-[transform,background-color] active:scale-95 [@media(hover:hover)]:hover:bg-brand-hover"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Ajouter
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

export function PackRail({ slug, label, products, pack, onAdd, onSetQty, recommended, href }: PackRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /** How many of this shelf's products are already in the pack — the per-category KPI. */
  const selected = products.reduce((n, p) => n + (pack[p.id] ? 1 : 0), 0);

  /* Arrow enablement is read from the scroll position rather than tracked in state on every event,
     and it is deliberately tolerant: sub-pixel widths mean `scrollLeft + clientWidth` never exactly
     equals `scrollWidth`, so a strict comparison leaves the right arrow permanently enabled at the
     end of the shelf. */
  const syncArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    syncArrows();
    const el = trackRef.current;
    if (!el) return;
    // ResizeObserver as well as scroll: a shelf that fits entirely at 1440 does not at 1024, and
    // arrows that stay enabled on a shelf with nothing to scroll to are a dead control.
    const ro = new ResizeObserver(syncArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncArrows]);

  const nudge = useCallback((direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by just under a viewport so one card of overlap survives the jump — a full-width page
    // means the card you were looking at vanishes, and people lose their place.
    el.scrollBy({ left: direction * (el.clientWidth * 0.82), behavior: 'smooth' });
  }, []);

  return (
    <section id={`group-${slug}`} aria-labelledby={`group-${slug}-h`} className="scroll-mt-20 lg:scroll-mt-36">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2
            id={`group-${slug}-h`}
            className="truncate font-display text-lg font-extrabold uppercase tracking-tight text-ink-1 sm:text-xl"
          >
            {label}
          </h2>
          {/* Requirement 2: the shelf states its own size, so three visible cards are never taken
              for the whole category. */}
          <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-ink-3">{products.length} produits</span>
          {recommended && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
              Conseillé
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {selected > 0 && (
            <span
              key={selected}
              data-motion
              className="pt-pop mr-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand"
            >
              <Check className="h-3 w-3" aria-hidden="true" />
              {selected}
            </span>
          )}
          {/* Arrows are a desktop affordance only. On touch they are a 40px target competing with
              the gesture that already works, and hiding them is what buys the shelf its full width
              on the screen that has least of it. */}
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label={`${label} : produits précédents`}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink-2 transition-colors disabled:opacity-30 lg:flex [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label={`${label} : produits suivants`}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink-2 transition-colors disabled:opacity-30 lg:flex [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {/* Requirement 3: the escape hatch to a real grid. */}
          <Link
            href={href}
            className="ml-1 inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap text-xs font-semibold text-ink-2 transition-colors [@media(hover:hover)]:hover:text-brand"
          >
            Voir tout
          </Link>
        </div>
      </div>

      {/* The track bleeds to the viewport edge on mobile (`-mx-4 px-4`) so the peek is a card
          genuinely running off the screen rather than one clipped by a container's padding —
          the second reads as a layout mistake. `px-4` restores the alignment of the first card
          with the heading above it. */}
      <div
        ref={trackRef}
        onScroll={syncArrows}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:gap-4 lg:px-0"
        style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {products.map((product) => (
          <PackTile
            key={product.id}
            product={product}
            qty={pack[product.id] ?? 0}
            onAdd={onAdd}
            onSetQty={onSetQty}
          />
        ))}
      </div>
    </section>
  );
}
