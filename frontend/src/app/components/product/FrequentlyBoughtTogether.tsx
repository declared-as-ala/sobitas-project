'use client';

/**
 * "Fréquemment achetés ensemble" — this product plus two others, one button.
 *
 * ── WHAT IT CLAIMS, AND WHAT IT DOES NOT ────────────────────────────────────────────────────
 * The heading is a claim about behaviour, and we do not have order-line co-occurrence data to back
 * one: 1,082 orders exist but none has ever been marked `livree`, so there is no settled basket
 * history to mine. Inventing "customers also bought" from a category join would be a fabricated
 * social proof of exactly the kind already deleted from the reviews block on this page.
 *
 * So it says "Complétez votre commande" and it is honest about being a suggestion: same category,
 * in stock, cheapest first, from `similar_products` — the same list the carousel at the foot of the
 * page already renders. The commercial value is real without the claim, because the mechanic is the
 * value: three products, one running total, one tap.
 *
 * When the co-occurrence data exists — Phase 5.3 of the roadmap starts review and delivery
 * collection — the ranking can change and the heading can become true. Until then the heading
 * matches the data.
 *
 * ── WHEN IT REFUSES TO RENDER ───────────────────────────────────────────────────────────────
 * 10,535 of 10,669 published products are catalogue entries the shop does not physically hold, and
 * those cannot be added to a basket at all — their CTA is a request form. A bundle builder whose
 * button cannot fire is worse than no bundle builder, so the whole block requires the current
 * product AND at least two companions to be genuinely addable.
 */
import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import type { Product } from '@/types';
import { getPriceDisplay } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { getProductLink } from '@/util/productUrl';
import { cn } from '@/app/components/ui/utils';

const COMPANIONS = 2;

function Thumb({ product, image }: { product: Product; image: string }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-hairline bg-elevated">
      {image ? (
        <Image
          src={image}
          alt={product.designation_fr || 'Produit'}
          fill
          loading="lazy"
          /* MEASURED, not guessed: the tile renders 275px wide at 1440 and ~105px at 390. The first
             value here was 140px, which made next/image serve a 140px candidate into a 275px box —
             a 2x upscale, on the one block whose whole job is to make three products recognisable
             at a glance. */
          sizes="(min-width: 1024px) 300px, 30vw"
          className="object-contain p-1.5"
        />
      ) : null}
    </div>
  );
}

export function FrequentlyBoughtTogether({
  product,
  similar,
  imageFor,
  onAdd,
}: {
  product: Product;
  similar: Product[];
  /** Resolves a product to a renderable image URL — the page already owns that logic. */
  imageFor: (product: Product) => string;
  onAdd: (products: Product[]) => void;
}) {
  const companions = useMemo(
    () =>
      similar
        .filter((candidate) => candidate?.id && candidate.id !== product.id && isInStock(candidate))
        .sort((a, b) => getPriceDisplay(a).finalPrice - getPriceDisplay(b).finalPrice)
        .slice(0, COMPANIONS),
    [similar, product.id]
  );

  const items = useMemo(() => [product, ...companions], [product, companions]);

  /* The current product starts ticked and cannot be unticked — it is the page you are on, and a
     bundle that excludes it is just a different product's bundle. */
  const [selected, setSelected] = useState<Set<number | string>>(() => new Set(items.map((p) => p.id)));

  if (!isInStock(product) || companions.length < COMPANIONS) return null;

  const chosen = items.filter((item) => selected.has(item.id));
  const total = chosen.reduce((sum, item) => sum + getPriceDisplay(item).finalPrice, 0);
  const wasTotal = chosen.reduce((sum, item) => {
    const { finalPrice, oldPrice, hasPromo } = getPriceDisplay(item);
    return sum + (hasPromo && oldPrice != null && oldPrice > finalPrice ? oldPrice : finalPrice);
  }, 0);
  const saving = wasTotal - total;

  const toggle = (id: number | string) => {
    if (id === product.id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-card">
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8 lg:p-6">
        {/*
          The row of packshots with plus signs between them. This is the entire idea of the section
          expressed as a picture, and it survives being the only thing a visitor looks at.
        */}
        <ul className="flex items-start gap-2 sm:gap-3">
          {items.map((item, i) => {
            const isCurrent = item.id === product.id;
            const ticked = selected.has(item.id);
            const { finalPrice } = getPriceDisplay(item);

            return (
              <li key={item.id} className="contents">
                {i > 0 && (
                  <span className="mt-8 shrink-0 text-ink-3 sm:mt-10" aria-hidden="true">
                    <Plus className="h-4 w-4" />
                  </span>
                )}
                <div className={cn('min-w-0 flex-1', !ticked && 'opacity-50')}>
                  {/*
                    THE PACKSHOT IS THE LINK. It was the product NAME, set at `text-xs` with a
                    two-line clamp, which measured 16px tall on a laptop — a navigation target
                    thinner than a finger. The thumbnail is over 100px on every width, and it was
                    already the thing people aim at.

                    It is also no longer inside the <label>: an <a> nested in a label makes a tap
                    near it ambiguous between "follow" and "toggle", and neither browsers nor
                    screen readers resolve that the same way.
                  */}
                  {isCurrent ? (
                    <Thumb product={item} image={imageFor(item)} />
                  ) : (
                    <Link
                      href={getProductLink(item)}
                      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      aria-label={item.designation_fr || 'Voir le produit'}
                    >
                      <Thumb product={item} image={imageFor(item)} />
                    </Link>
                  )}
                  {/* The whole row is the checkbox's target, and it clears 44px. */}
                  <label
                    className={cn(
                      'mt-1.5 flex min-h-[44px] items-center gap-2 rounded-lg',
                      isCurrent ? 'cursor-default' : 'cursor-pointer'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={ticked}
                      disabled={isCurrent}
                      onChange={() => toggle(item.id)}
                      className="h-5 w-5 shrink-0 accent-brand"
                      aria-label={`Inclure ${item.designation_fr}`}
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-xs font-medium text-ink-2">
                        {isCurrent ? 'Cet article' : item.designation_fr}
                      </span>
                      <span className="mt-0.5 block font-display text-xs font-bold tabular-nums text-ink-1">
                        {finalPrice.toFixed(2)} DT
                      </span>
                    </span>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2 border-t border-hairline pt-4 lg:w-56 lg:border-s lg:border-t-0 lg:ps-8 lg:pt-0">
          <span className="text-xs text-ink-3">
            Total pour {chosen.length} article{chosen.length > 1 ? 's' : ''}
          </span>
          <span className="font-display text-2xl font-bold tabular-nums text-brand">{total.toFixed(2)} DT</span>
          {saving > 0 && (
            <span className="text-xs font-semibold tabular-nums text-ok">
              Vous économisez {saving.toFixed(2)} DT
            </span>
          )}
          <Button
            className="mt-1 min-h-[48px] w-full font-display font-bold uppercase tracking-wide"
            disabled={chosen.length === 0}
            onClick={() => onAdd(chosen)}
          >
            <ShoppingCart className="me-2 h-4 w-4 shrink-0" aria-hidden="true" />
            Tout ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}
