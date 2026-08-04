'use client';

/**
 * The product grid inside a category step.
 *
 * ── WHY A GRID, WHEN THE PREVIOUS VERSION USED A HORIZONTAL SHELF ──────────────────────────
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
 * Owner: *"a lot of text and a lot of numbers and a lot of icons."* Each tile now carries four
 * things and no more: the picture, the name, the price, one control. No badges, no icons in the
 * button, no per-tile stock language unless it is actually out of stock. The information that was
 * removed did not disappear — it moved to the step footer, where it is stated once instead of
 * twelve times.
 */

import { memo, useCallback, useMemo, useRef } from 'react';
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
        <p className="mt-1 font-display text-base font-bold tabular-nums tracking-tight text-ink-1">
          {price.toFixed(2)} <span className="text-xs font-semibold text-ink-3">DT</span>
        </p>

        <div className="mt-2.5">
          {outOfStock ? (
            <span className="flex min-h-[44px] items-center justify-center rounded-lg bg-sunken text-xs font-semibold text-ink-3">
              Indisponible
            </span>
          ) : selected ? (
            <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-canvas">
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
              <span className="font-display text-base font-bold tabular-nums text-ink-1">{qty}</span>
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
