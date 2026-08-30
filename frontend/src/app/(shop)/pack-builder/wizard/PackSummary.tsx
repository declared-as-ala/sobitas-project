'use client';

import Image from 'next/image';
import { Loader2, Package, Percent, ShoppingBag, X } from 'lucide-react';
import { getStorageUrl, isStorageImageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import type { Product } from '@/types';

interface PackSummaryProps {
  entries: { product: Product; qty: number }[];
  itemCount: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  nextTier: { percent: number; remaining: number } | null;
  quoteLoading: boolean;
  tiers: { min: number; percent: number }[];
  onRemove: (product: Product) => void;
  onReview: () => void;
  actionRef: React.RefObject<HTMLDivElement | null>;
  tierTrackRef: React.RefObject<HTMLDivElement | null>;
}

function TierProgress({
  subtotal,
  discountPercent,
  nextTier,
  tiers,
  trackRef,
}: Pick<PackSummaryProps, 'subtotal' | 'discountPercent' | 'nextTier' | 'tiers'> & {
  trackRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const maximum = tiers[tiers.length - 1]?.min ?? 1;
  const progress = Math.min(100, Math.max(0, (subtotal / maximum) * 100));

  return (
    <div>
      <div
        ref={trackRef as React.RefObject<HTMLDivElement> | undefined}
        data-motion
        className="h-1.5 overflow-hidden rounded-full bg-rule-strong"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maximum}
        aria-valuenow={Math.min(maximum, Math.round(subtotal))}
        aria-label="Progression vers la remise maximale"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-2">
        {nextTier ? (
          <>
            Encore <strong className="font-semibold tabular-nums text-ink-1">{nextTier.remaining.toFixed(2)} DT</strong>{' '}
            pour −{nextTier.percent}%
          </>
        ) : discountPercent > 0 ? (
          <span className="font-semibold text-ok">Remise maximale atteinte</span>
        ) : (
          <>La remise augmente avec le montant du pack.</>
        )}
      </p>
    </div>
  );
}

function PackLine({
  product,
  qty,
  onRemove,
}: {
  product: Product;
  qty: number;
  onRemove: (product: Product) => void;
}) {
  const image = product.cover ? getStorageUrl(product.cover) : '';

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sunken">
        {image ? (
          <Image
            src={image}
            alt=""
            aria-hidden="true"
            fill
            sizes="48px"
            className="object-contain p-1"
            unoptimized={isStorageImageUrl(image)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-ink-3" aria-hidden="true">
            <Package className="h-5 w-5" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-xs font-semibold leading-snug text-ink-1">
          {product.designation_fr}
        </span>
        <span className="mt-0.5 block text-[11px] tabular-nums text-ink-3">
          {qty} × {getEffectivePrice(product as never).toFixed(2)} DT
        </span>
      </span>
      <button
        type="button"
        onClick={() => onRemove(product)}
        aria-label={`Retirer ${product.designation_fr} du pack`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors [@media(hover:hover)]:hover:text-destructive"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}

export function PackSummary({
  entries,
  itemCount,
  subtotal,
  discountPercent,
  discountAmount,
  total,
  nextTier,
  quoteLoading,
  tiers,
  onRemove,
  onReview,
  actionRef,
  tierTrackRef,
}: PackSummaryProps) {
  const hasItems = itemCount > 0;

  return (
    <>
      <aside className="hidden lg:block" aria-label="Résumé du pack">
        <div data-pack-target className="sticky top-6 overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-card">
          <div className="border-b border-hairline p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-extrabold uppercase tracking-tight text-ink-1">Votre pack</p>
                <p className="mt-0.5 text-xs text-ink-3">
                  {hasItems ? `${itemCount} article${itemCount !== 1 ? 's' : ''}` : 'Prêt à être composé'}
                </p>
              </div>
              {discountPercent > 0 && (
                <span className="inline-flex min-h-[44px] items-center rounded-full border border-brand px-3 text-xs font-bold text-brand">
                  −{discountPercent}%
                </span>
              )}
            </div>
            <div className="mt-4">
              <TierProgress
                subtotal={subtotal}
                discountPercent={discountPercent}
                nextTier={nextTier}
                tiers={tiers}
                trackRef={tierTrackRef}
              />
            </div>
          </div>

          <div className="p-5">
            {hasItems ? (
              <ul className="divide-y divide-hairline">
                {entries.slice(0, 4).map(({ product, qty }) => (
                  <PackLine key={product.id} product={product} qty={qty} onRemove={onRemove} />
                ))}
              </ul>
            ) : (
              <div className="rounded-xl bg-sunken p-4 text-center">
                <ShoppingBag className="mx-auto h-6 w-6 text-ink-3" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-ink-1">Commencez par un produit</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">Vous pouvez changer de catégorie à tout moment.</p>
              </div>
            )}

            {entries.length > 4 && (
              <p className="mt-3 text-xs font-medium text-ink-3">+ {entries.length - 4} autre{entries.length - 4 > 1 ? 's' : ''}</p>
            )}

            <div className="mt-5 space-y-2 border-t border-hairline pt-4 text-sm">
              <div className="flex justify-between gap-4 text-ink-2">
                <span>Sous-total</span>
                <span className="font-semibold tabular-nums text-ink-1">{subtotal.toFixed(2)} DT</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between gap-4 text-ok">
                  <span className="flex items-center gap-1.5">
                    <Percent className="h-4 w-4" aria-hidden="true" /> Remise pack
                  </span>
                  <span className="font-semibold tabular-nums">−{discountAmount.toFixed(2)} DT</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-3">
                <span className="font-display font-bold uppercase text-ink-1">Total</span>
                <span className="flex items-center gap-2 font-display text-xl font-bold tabular-nums text-brand">
                  {quoteLoading && <Loader2 data-motion className="h-4 w-4 animate-spin text-ink-3" aria-hidden="true" />}
                  {total.toFixed(2)} DT
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onReview}
              disabled={!hasItems}
              className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand px-5 font-display text-sm font-bold uppercase tracking-wide text-on-brand transition-colors disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-brand-hover"
            >
              Vérifier mon pack
            </button>
          </div>
        </div>
      </aside>

      <div
        ref={actionRef as React.RefObject<HTMLDivElement>}
        data-pack-target
        className="pt-packbar fixed inset-x-0 z-40 border-t border-hairline bg-elevated shadow-card lg:hidden"
      >
        {hasItems && (
          <div className="h-1 w-full bg-rule-strong" aria-hidden="true">
            <div
              className="h-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${Math.min(100, (subtotal / (tiers[tiers.length - 1]?.min ?? 1)) * 100)}%` }}
            />
          </div>
        )}
        <div data-packbar-rail className="max-w-site mx-auto flex items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-ink-3">
              {hasItems ? `${itemCount} article${itemCount !== 1 ? 's' : ''}` : 'Votre pack est vide'}
              {discountPercent > 0 ? ` · −${discountPercent}%` : ''}
            </p>
            <p className="flex items-center gap-1.5 font-display text-lg font-bold tabular-nums leading-tight text-ink-1">
              {quoteLoading && <Loader2 data-motion className="h-3.5 w-3.5 animate-spin text-ink-3" aria-hidden="true" />}
              {total.toFixed(2)} DT
            </p>
          </div>
          <button
            type="button"
            onClick={onReview}
            disabled={!hasItems}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl bg-brand px-5 font-display text-sm font-bold uppercase tracking-wide text-on-brand transition-colors disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-brand-hover"
          >
            Vérifier
          </button>
        </div>
      </div>
    </>
  );
}
