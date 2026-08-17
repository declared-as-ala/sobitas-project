'use client';

/**
 * "Complétez votre commande" — this product plus two or three others, one button.
 *
 * ── WHAT IT CLAIMS, AND WHAT IT DOES NOT ────────────────────────────────────────────────────
 * The reference storefront calls this "Frequently bought together", which is a claim about
 * behaviour, and we do not have order-line co-occurrence data to back one: 1,082 orders exist but
 * none has ever been marked `livree`, so there is no settled basket history to mine. Inventing
 * "customers also bought" from a category join would be fabricated social proof of exactly the
 * kind already deleted from the reviews block on this page.
 *
 * So the heading is honest about being a suggestion. The commercial value is real without the
 * claim, because the mechanic is the value: three or four products, one running total, one tap.
 *
 * When the co-occurrence data exists — Phase 5.3 of the roadmap starts review and delivery
 * collection — the ranking can change and the heading can become true. Until then the heading
 * matches the data.
 *
 * ── THE COMPANIONS COME FROM ANOTHER SHELF NOW ──────────────────────────────────────────────
 * Owner, 17/08/2026: *"why putting all of them as protéine!!!! put real things that they usually
 * bought together like mass gainer with protéine with créatine etc! shaker etc"*.
 *
 * This block used to be handed `similarProducts`, which is `getSimilarProducts(sous_categorie_id)`
 * — the same sub-category by definition. A whey page therefore offered to complete your order with
 * three more wheys, 400px above the rail that shows similar products on purpose. It was a bundle
 * builder that could not build a bundle.
 *
 * It now takes `complements`, resolved shelf-by-shelf: creatine, then a shaker, then aminos for a
 * protein; collagen and omega-3 for a joint supplement. util/productComplements.ts holds the map
 * and the reasoning, services/productComplements.ts the fetch. There is no fallback to
 * `similarProducts` when that comes back empty — the block simply does not render, because three
 * wheys was the bug and quietly restoring it under load would hide the fix.
 *
 * ── WHY A LIST AND NOT A ROW OF PACKSHOTS ───────────────────────────────────────────────────
 * The first version drew the three products side by side with plus signs between them, the way
 * the pattern is usually drawn. The reference storefront stacks them as ROWS instead, and having
 * built both, the row is plainly the better one for this catalogue:
 *
 *   - A packshot column 1/3 of the card wide leaves the NAME about 90px, which on this catalogue
 *     ("TANTOR WHEY PROTEIN 2267 G - SCENIT NUTRITION") is two clamped lines of nothing. A row
 *     gives the name the full width of the card and the price its own column.
 *   - Adding a fourth product to a row of packshots costs a quarter of every tile; adding a fourth
 *     ROW costs 72px of page and nothing else. That is why the reference can show five.
 *   - The checkbox, the thing that actually drives the total, sits at the start of a 72px-tall row
 *     instead of under a tile. It is the easiest target in the block rather than the smallest.
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
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import type { Product } from '@/types';
import { getPriceDisplay } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { getProductLink } from '@/util/productUrl';
import { cn } from '@/app/components/ui/utils';

/** Two is the floor for the block to exist at all; the third is taken when it is available. */
const MIN_COMPANIONS = 2;
const MAX_COMPANIONS = 3;

export function FrequentlyBoughtTogether({
  product,
  complements,
  imageFor,
  onAdd,
}: {
  product: Product;
  /**
   * One product per complementary shelf, best first, already stock-filtered server-side.
   * The order is meaningful — it is the shelf order from util/productComplements.ts — so it is
   * NOT re-sorted here. Sorting by price is what used to surface the 39 DT unknown creatine over
   * the Optimum Nutrition the shelf is ranked by.
   */
  complements: Product[];
  /** Resolves a product to a renderable image URL — the page already owns that logic. */
  imageFor: (product: Product) => string;
  onAdd: (products: Product[]) => void;
}) {
  const companions = useMemo(
    () =>
      complements
        .filter((candidate) => candidate?.id && candidate.id !== product.id && isInStock(candidate))
        .slice(0, MAX_COMPANIONS),
    [complements, product.id]
  );

  const items = useMemo(() => [product, ...companions], [product, companions]);

  /* The current product starts ticked and cannot be unticked — it is the page you are on, and a
     bundle that excludes it is just a different product's bundle. */
  const [selected, setSelected] = useState<Set<number | string>>(() => new Set(items.map((p) => p.id)));

  if (!isInStock(product) || companions.length < MIN_COMPANIONS) return null;

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
      {/*
        Centred heading and one line of explanation, matching the reference. The explanation is
        doing real work: without it the block reads as an advert, and with it the reader knows the
        checkboxes are theirs to change before anything is added.
      */}
      <div className="border-b border-hairline px-4 py-5 text-center sm:px-6">
        <h2 className="font-display text-xl font-bold uppercase leading-tight tracking-tight text-ink-1 sm:text-2xl">
          Complétez votre commande
        </h2>
        <p className="mt-1.5 text-sm text-ink-2">
          Décochez ce dont vous n&apos;avez pas besoin — le total se met à jour.
        </p>
      </div>

      <ul className="divide-y divide-hairline px-4 sm:px-6">
        {items.map((item) => {
          const isCurrent = item.id === product.id;
          const ticked = selected.has(item.id);
          const { finalPrice, oldPrice, hasPromo } = getPriceDisplay(item);
          const image = imageFor(item);

          return (
            <li key={item.id} className={cn('flex items-center gap-2 py-3 sm:gap-3', !ticked && 'opacity-55')}>
              {/*
                The <label> wraps ONLY the checkbox, never the row. A label containing the product
                link makes a tap near the name ambiguous between "follow" and "toggle", and browsers
                and screen readers do not resolve that ambiguity the same way.

                It exists because the input itself renders 20x20 — measured, by the page guard, at
                all five widths — and 20px is well under the 44px floor. The box stays 20px because
                that is the size a checkbox should look; the LABEL is the target.
              */}
              <label
                className={cn(
                  'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center',
                  isCurrent ? 'cursor-default' : 'cursor-pointer'
                )}
              >
                <input
                  type="checkbox"
                  checked={ticked}
                  disabled={isCurrent}
                  onChange={() => toggle(item.id)}
                  className="h-5 w-5 accent-brand"
                  aria-label={
                    isCurrent
                      ? `${item.designation_fr} — cet article est toujours inclus`
                      : `Inclure ${item.designation_fr}`
                  }
                />
              </label>

              {/* THE PACKSHOT IS THE LINK, and it is over 56px on every width. It was the product
                  NAME at `text-xs`, which measured 16px tall on a laptop — a navigation target
                  thinner than a finger. */}
              {isCurrent ? (
                <Thumb image={image} />
              ) : (
                <Link
                  href={getProductLink(item)}
                  className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  aria-label={item.designation_fr || 'Voir le produit'}
                >
                  <Thumb image={image} />
                </Link>
              )}

              <div className="min-w-0 flex-1">
                {isCurrent && (
                  <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                    Cet article
                  </span>
                )}
                {isCurrent ? (
                  <span className="line-clamp-2 text-sm font-semibold text-ink-1">{item.designation_fr}</span>
                ) : (
                  /*
                    `-my-3 py-3`: the name renders on ONE line on a desktop row, which is a 20px-tall
                    navigation target — measured. The padding takes its box to 44px and the negative
                    margin gives that back to the layout, so the row keeps its height and the link
                    keeps its floor. Same trick, and the same reason, as the brand link in the buy
                    column.
                  */
                  <Link
                    href={getProductLink(item)}
                    className="-my-3 line-clamp-2 py-3 text-sm font-semibold text-ink-1 underline-offset-2 hover:text-brand hover:underline"
                  >
                    {item.designation_fr}
                  </Link>
                )}
                {/*
                  THE SHELF, NOT THE BRAND. A row reading "OSTROVIT" under a product name tells a
                  reader nothing about why it is in this list; "Créatine", "Accessoires",
                  "Oméga 3" tells them the three rows are three different things — which is the
                  whole argument for the block existing. The brand is one tap away on the product
                  itself, and `light=1` does not send the brand object anyway.
                */}
                {(item.sous_categorie?.designation_fr || item.brand?.designation_fr) && (
                  <span className="mt-0.5 block truncate text-xs text-ink-3">
                    {item.sous_categorie?.designation_fr || item.brand?.designation_fr}
                  </span>
                )}
              </div>

              <div className="shrink-0 text-end">
                <span className="block font-display text-sm font-bold tabular-nums text-ink-1">
                  {finalPrice.toFixed(2)} DT
                </span>
                {hasPromo && oldPrice != null && oldPrice > finalPrice && (
                  <span className="block text-xs tabular-nums text-ink-3 line-through">{oldPrice.toFixed(2)} DT</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col items-center gap-3 border-t border-hairline px-4 py-5 sm:px-6">
        <p className="text-sm text-ink-2">
          Total pour {chosen.length} article{chosen.length > 1 ? 's' : ''} :{' '}
          <span className="font-display text-xl font-bold tabular-nums text-brand">{total.toFixed(2)} DT</span>
        </p>
        {saving > 0 && (
          <p className="-mt-1.5 text-xs font-semibold tabular-nums text-ok">
            Vous économisez {saving.toFixed(2)} DT sur cette sélection
          </p>
        )}
        <Button
          className="min-h-[48px] w-full max-w-sm font-display font-bold uppercase tracking-wide"
          disabled={chosen.length === 0}
          onClick={() => onAdd(chosen)}
        >
          <ShoppingCart className="me-2 h-4 w-4 shrink-0" aria-hidden="true" />
          Ajouter la sélection
        </Button>
      </div>
    </div>
  );
}

/**
 * `alt=""` deliberately. The product name is set in text immediately to the right of this
 * thumbnail, and the link around it already carries an aria-label; a third announcement of the
 * same string is noise, so the image is marked decorative and the text carries the meaning.
 */
function Thumb({ image }: { image: string }) {
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-hairline bg-elevated sm:h-16 sm:w-16">
      {image ? (
        <Image src={image} alt="" fill loading="lazy" sizes="64px" className="object-contain p-1" />
      ) : null}
    </div>
  );
}
