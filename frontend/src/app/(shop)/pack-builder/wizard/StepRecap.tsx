'use client';

import Image from 'next/image';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, Loader2, Package, Percent, ShoppingCart, X } from 'lucide-react';
import { getStorageUrl, isStorageImageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import type { Product } from '@/types';
import { childVariants, popVariants, tap, EASE } from './variants';

export interface StepRecapProps {
  entries: { product: Product; qty: number }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  tierLabel: string | null;
  nextTier: { percent: number; remaining: number } | null;
  quoteLoading: boolean;
  submitting: boolean;
  onRemove: (product: Product) => void;
  onModify: () => void;
  onSubmit: () => void;
  calm: boolean;
}

export function StepRecap({
  entries,
  subtotal,
  discountPercent,
  discountAmount,
  total,
  tierLabel,
  nextTier,
  quoteLoading,
  submitting,
  onRemove,
  onModify,
  onSubmit,
  calm,
}: StepRecapProps) {
  const child = childVariants(calm);
  const pop = popVariants(calm);

  return (
    <div>
      <m.div variants={child} className="mb-5 sm:mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Dernière étape</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold uppercase leading-none tracking-tight text-ink-1 sm:text-4xl">
          Vérifiez votre pack
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          {nextTier
            ? `Remise de −${discountPercent}% · encore ${nextTier.remaining.toFixed(2)} DT pour −${nextTier.percent}%.`
            : discountPercent > 0
              ? `Vous profitez de la remise maximale de −${discountPercent}%.`
              : 'Ajoutez des produits pour débloquer votre première remise.'}
        </p>
      </m.div>

      <m.div variants={child} className="overflow-hidden rounded-2xl border border-hairline bg-elevated">
        {entries.length === 0 ? (
          <div className="p-6 text-center">
            <Package className="mx-auto h-7 w-7 text-ink-3" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-ink-1">Votre pack est vide</p>
            <button type="button" onClick={onModify} className="mt-3 min-h-[44px] rounded-lg px-4 text-sm font-semibold text-brand">
              Choisir des produits
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            <AnimatePresence initial={false}>
              {entries.map(({ product, qty }) => {
                const image = product.cover ? getStorageUrl(product.cover) : '';
                return (
                  <m.li
                    key={product.id}
                    initial={calm ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={calm ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={EASE}
                    data-motion
                    className="flex items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-sunken">
                      {image ? (
                        <Image
                          src={image}
                          alt=""
                          aria-hidden="true"
                          fill
                          sizes="56px"
                          className="object-contain p-1.5"
                          unoptimized={isStorageImageUrl(image)}
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-ink-3" aria-hidden="true">
                          <Package className="h-5 w-5" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink-1">{product.designation_fr}</span>
                      <span className="mt-0.5 block text-xs tabular-nums text-ink-3">
                        {qty} × {getEffectivePrice(product as never).toFixed(2)} DT
                      </span>
                    </span>
                    <span className="hidden shrink-0 font-display text-sm font-bold tabular-nums text-ink-1 sm:block">
                      {(getEffectivePrice(product as never) * qty).toFixed(2)} DT
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(product)}
                      aria-label={`Retirer ${product.designation_fr} du pack`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors [@media(hover:hover)]:hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </m.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        <div className="space-y-2 border-t border-hairline bg-sunken p-4 sm:p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-2">Sous-total</span>
            <span className="font-display font-semibold tabular-nums text-ink-1">{subtotal.toFixed(2)} DT</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-ink-2">
                <Percent className="h-4 w-4 text-brand" aria-hidden="true" />
                Remise{tierLabel ? ` ${tierLabel}` : ` −${discountPercent}%`}
              </span>
              <m.span key={discountAmount} variants={pop} initial="enter" animate="center" data-motion className="font-display font-semibold tabular-nums text-ok">
                −{discountAmount.toFixed(2)} DT
              </m.span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="flex items-center gap-1.5 font-display text-base font-extrabold uppercase text-ink-1">
              Total
              {quoteLoading && <Loader2 data-motion className="h-4 w-4 animate-spin text-ink-3" aria-hidden="true" />}
            </span>
            <m.span key={total} variants={pop} initial="enter" animate="center" data-motion className="font-display text-2xl font-bold tabular-nums text-brand sm:text-3xl">
              {total.toFixed(2)} DT
            </m.span>
          </div>
        </div>
      </m.div>

      <m.div variants={child} className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr]">
        <m.button
          type="button"
          onClick={onModify}
          whileTap={tap(calm)}
          className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl border border-hairline bg-elevated px-5 font-display text-sm font-bold uppercase tracking-wide text-ink-1 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Modifier
        </m.button>
        <m.button
          type="button"
          onClick={onSubmit}
          disabled={entries.length === 0 || submitting}
          aria-busy={submitting}
          whileTap={submitting ? undefined : tap(calm)}
          className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-brand px-5 font-display text-base font-bold uppercase tracking-wide text-on-brand transition-colors disabled:cursor-not-allowed disabled:opacity-60 [@media(hover:hover)]:hover:bg-brand-hover"
        >
          {submitting ? (
            <><Loader2 data-motion className="h-5 w-5 animate-spin" aria-hidden="true" /> Ajout en cours…</>
          ) : (
            <><ShoppingCart className="h-5 w-5" aria-hidden="true" /> Ajouter au panier</>
          )}
        </m.button>
      </m.div>
      <p className="mt-2 text-center text-xs text-ink-3">La remise est appliquée automatiquement.</p>
    </div>
  );
}
