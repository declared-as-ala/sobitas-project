'use client';

/**
 * The product grid inside a category step.
 *
 * ── WHY A GRID, WHEN AN EARLIER VERSION USED A HORIZONTAL SHELF ────────────────────────────
 * The shelf existed to solve a problem the wizard deletes. Five categories stacked vertically
 * measured 8,104 px — 10.9 iPhone screens — from the first to the last, so reaching créatine meant
 * scrolling past everything else. A shelf collapsed that, at the cost of hiding most of each
 * category behind a sideways gesture people have to notice first.
 *
 * With one category per step there is nothing to scroll past: créatine is a tap, not 8,000 px. So
 * the grid comes back, and with it the thing a shelf can never give — you can see the whole
 * category at once and compare six products without moving anything.
 *
 * ── THE TILE IS QUIET ON PURPOSE ───────────────────────────────────────────────────────────
 * Owner: *"a lot of text and a lot of numbers and a lot of icons."* Each tile carries four things
 * and no more: the picture, the name, the price, one control. No badges, no icons in the button, no
 * per-tile stock language unless it is actually out of stock. The information that was removed did
 * not disappear — it moved to the step bar, where it is stated once instead of twelve times.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { m } from 'motion/react';
import { Check, Minus, Package, Plus } from 'lucide-react';
import { getStorageUrl, isStorageImageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import type { Product } from '@/types';
import { childVariants, tap } from './variants';

export interface ProductPickerProps {
  products: Product[];
  pack: Record<number, number>;
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
  calm: boolean;
}

/**
 * Image `sizes`, derived per DESIGN_SYSTEM §7 rather than guessed.
 *
 * The frame is square and the image is `object-contain`, so the required width IS the rendered
 * width — there is no `object-cover` scale factor to apply. The step column is `max-w-5xl`
 * (1024px), gaps are 12px below `sm` and 16px above.
 *
 *   lg+   4 columns, column capped at 1024   (1024 − 3×16) / 4 = 244px
 *   sm    3 columns, container = vw − 48     at 1023: (975 − 32)/3 = 314px → 32vw = 327px ✓
 *   base  2 columns, container = vw − 32     at 390:  (358 − 12)/2 = 173px → 44vw = 172px ✓
 *
 * `32vw` rather than the arithmetic 31vw at `sm`: over-declaring costs at most one bucket, while
 * under-declaring makes the browser upscale a smaller file and the product photo goes soft.
 */
const IMAGE_SIZES = '(min-width: 1024px) 244px, (min-width: 640px) 32vw, 44vw';

/**
 * The product photograph, faded in over its own frame.
 *
 * ── WHY THIS IS A FADE AND NOT A SHIMMER ───────────────────────────────────────────────────
 * A shimmering skeleton is the fashionable answer and it is the wrong one here. It is a LOOPING
 * animation, and this grid renders twelve of them at once on the page the project has already had
 * to fix for mobile INP. Worse, `globals.css` clamps every animation without `data-motion` to 0.2s
 * on phones — so a 1.4s sweep becomes a 0.2s strobe, twelve times over, which is not a loading
 * state but a fault. Opting each one out of the clamp would mean twelve unclamped loops instead.
 *
 * The fade costs one compositor-only property on a transition that already ends, and it fixes the
 * thing that actually looked cheap: tiles popping in hard against a flat grey square.
 *
 * ── THE `complete` CHECK IS NOT DEFENSIVE PADDING ──────────────────────────────────────────
 * `onLoad` does not fire for an image the browser already has in cache and decodes before React
 * attaches the handler. On a back-navigation, or on the second visit to a category step, that is
 * the NORMAL path — so without this the tile would keep `opacity-0` forever and the grid would
 * render twelve invisible products. Reading `.complete` once on mount is what makes the cached
 * case the fast case instead of the broken one.
 */
function ProductImage({ src, alt, unoptimized }: { src: string; alt: string; unoptimized: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    <>
      <Image
        ref={ref}
        src={src}
        alt={alt}
        fill
        onLoad={() => setLoaded(true)}
        /* Deliberately NOT `data-motion`: the mobile clamp shortening this to 0.2s is an
           improvement, not a regression, and twelve unclamped transitions is the thing the clamp
           exists to prevent. */
        className={`object-contain p-2.5 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        sizes={IMAGE_SIZES}
        loading="lazy"
        unoptimized={unoptimized}
      />
      {!loaded && (
        <span className="absolute inset-0 flex items-center justify-center text-ink-3/40" aria-hidden="true">
          <Package className="h-7 w-7" />
        </span>
      )}
    </>
  );
}

const Tile = memo(function Tile({
  product,
  qty,
  onAdd,
  onSetQty,
  calm,
}: {
  product: Product;
  qty: number;
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
  calm: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const price = getEffectivePrice(product as never);
  const stock = getStockDisponible(product as never);
  const outOfStock = stock <= 0;
  const image = product.cover ? getStorageUrl(product.cover) : '';
  const atLimit = stock > 0 && qty >= stock;
  const selected = qty > 0;

  const handleAdd = useCallback(() => {
    onAdd(product, frameRef.current?.querySelector('img') ?? null);
  }, [onAdd, product]);

  return (
    <m.article
      variants={childVariants(calm)}
      data-motion
      data-pack-tile
      data-selected={selected ? 'true' : undefined}
      className={`font-poppins flex flex-col overflow-hidden rounded-xl border transition-[border-color,background-color] ${
        selected ? 'border-brand bg-brand/5' : 'border-hairline bg-elevated'
      }`}
    >
      <div ref={frameRef} className="relative aspect-square w-full bg-sunken">
        {image ? (
          <ProductImage src={image} alt={product.designation_fr} unoptimized={isStorageImageUrl(image)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-3">
            <Package className="h-7 w-7" aria-hidden="true" />
          </div>
        )}

        {/* One mark, not a badge cluster: a filled tick when this is in the pack. The quantity is
            already the large number in the stepper directly below it. */}
        {selected && (
          <m.span
            initial={calm ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 560, damping: 24 }}
            data-motion
            className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-on-brand"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </m.span>
        )}

        {outOfStock && (
          <span className="pt-slab absolute inset-x-2 bottom-2 rounded-lg px-2 py-1 text-center text-[11px] font-semibold text-ink-1">
            Rupture
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3
          title={product.designation_fr}
          className="line-clamp-2 min-h-[2.2rem] text-xs font-semibold leading-snug text-ink-1"
        >
          {product.designation_fr}
        </h3>
        {/* THE PRICE IS BRAND ORANGE — BUT ONLY WHEN THE TILE IS NOT SELECTED.
            Every price on the site is `text-brand` (ProductCard.tsx:355); this grid was the one
            place a price rendered in plain ink, so the pack builder's products read as a different
            product than the same tub on /shop.

            The selected branch stays `text-ink-1`, and that is not an inconsistency — it is the
            rule ProductCard.tsx:366 already documents. A selected tile is filled `bg-brand/5`, and
            the accent on a 10% tint of ITSELF composites to #D03B04 on #FBEBE6 = 4.07:1 in light
            theme: an AA failure that is invisible to review, because both values are "the brand
            colour" and the tile obviously reads as orange. The TINT carries the colour, so the
            number does not have to. */}
        <p
          className={`mt-1 font-display text-base font-bold tabular-nums tracking-tight ${
            selected ? 'text-ink-1' : 'text-brand'
          }`}
        >
          {price.toFixed(2)}{' '}
          {/* The currency suffix steps UP to ink-2 on a selected tile. `bg-brand/5` composites to
              #F5EDE8, and ink-3 (#6C6C73) measures 4.50:1 on it at 12px — landing exactly on the AA
              minimum, i.e. failing on the next rounding. ink-2 (#57575E) is 6.4:1 there. Only the
              selected branch moves: on the unselected tile's white, ink-3 is 5.21:1 and correct.
              Found by walking the wizard in the contrast auditor — a selected tile does not exist
              on first paint, so the step-0-only audit had never once measured this element. */}
          <span className={`text-xs font-semibold ${selected ? 'text-ink-2' : 'text-ink-3'}`}>DT</span>
        </p>

        <div className="mt-2.5">
          {outOfStock ? (
            <span className="flex min-h-[44px] items-center justify-center rounded-lg bg-sunken text-xs font-semibold text-ink-3">
              Indisponible
            </span>
          ) : selected ? (
            <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-elevated">
              <m.button
                type="button"
                whileTap={tap(calm)}
                onClick={() => onSetQty(product, qty - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-l-lg text-ink-2"
                aria-label={
                  qty === 1
                    ? `Retirer ${product.designation_fr} du pack`
                    : `Diminuer la quantité de ${product.designation_fr}`
                }
              >
                <Minus className="h-4 w-4" />
              </m.button>
              {/* Keyed on `qty` so the figure re-plays its pop on every change. Remounting the node
                  is the cheapest way to restart an animation: no state, no timer, nothing to
                  clean up. */}
              <m.span
                key={qty}
                initial={calm ? false : { scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 620, damping: 22 }}
                data-motion
                className="font-display text-base font-bold tabular-nums text-ink-1"
              >
                {qty}
              </m.span>
              <m.button
                type="button"
                whileTap={tap(calm)}
                onClick={handleAdd}
                disabled={atLimit}
                className="flex h-11 w-11 items-center justify-center rounded-r-lg text-ink-2 disabled:opacity-40"
                aria-label={`Augmenter la quantité de ${product.designation_fr}`}
              >
                <Plus className="h-4 w-4" />
              </m.button>
            </div>
          ) : (
            /* The visible label stays "Ajouter" — twelve buttons each repeating a 60-character
               product name would be unreadable. The ACCESSIBLE name carries the product, because a
               screen reader's element list would otherwise offer twelve controls called "Ajouter"
               with no way to tell which tile each belongs to. */
            <m.button
              type="button"
              whileTap={tap(calm)}
              onClick={handleAdd}
              aria-label={`Ajouter ${product.designation_fr} au pack`}
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-on-brand transition-colors [@media(hover:hover)]:hover:bg-brand-hover"
            >
              Ajouter
            </m.button>
          )}
        </div>
      </div>
    </m.article>
  );
});

export function ProductPicker({ products, pack, onAdd, onSetQty, calm }: ProductPickerProps) {
  /**
   * Buyable products first.
   *
   * The catalogue order put a "Rupture" tile in the very first slot of the Gainers step — the first
   * thing the visitor saw after answering the goal question was something they could not buy. This
   * is a stable partition, not a re-rank: within each half the catalogue's own order is preserved,
   * so merchandising decisions made in the admin still hold.
   */
  const ordered = useMemo(() => {
    const inStock: Product[] = [];
    const out: Product[] = [];
    for (const p of products) (getStockDisponible(p as never) > 0 ? inStock : out).push(p);
    return [...inStock, ...out];
  }, [products]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {ordered.map((product) => (
        <Tile
          key={product.id}
          product={product}
          qty={pack[product.id] ?? 0}
          onAdd={onAdd}
          onSetQty={onSetQty}
          calm={calm}
        />
      ))}
    </div>
  );
}
