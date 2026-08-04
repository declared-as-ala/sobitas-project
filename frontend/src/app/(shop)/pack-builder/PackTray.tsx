'use client';

/**
 * The tray — "what is in my pack" and "what would complete it", above the fold, without a tap.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────────────────────
 * Owner brief: *"easy KPIs for user to see what you've already added, suggestions of what you can
 * add, making a complete pack."* Before this, a phone showed a count and a total in the sticky bar
 * and nothing else — the contents of the pack were one tap away behind a chevron, which means that
 * in practice nobody saw them until checkout. A shopper who cannot see what they picked cannot
 * decide what to pick next, and "what to pick next" is the entire economics of a bundle page.
 *
 * ── THE LINE THIS COMPONENT DOES NOT CROSS ────────────────────────────────────────────────
 * The suggestions name CATEGORIES, never quantities and never doses. Converting a protein target
 * into "buy N pots" needs each product's protein-per-serving, which this project deliberately does
 * not synthesise — the same standing constraint that governs `nutritionTargets.ts`. So the nudge is
 * merchandising ("your pack has no créatine"), stated as a fact about the pack rather than as
 * advice about a body. That distinction is why this can ship without a nutritionist reviewing it.
 */

import Image from 'next/image';
import { Sparkles, X } from 'lucide-react';
import { getStorageUrl, isStorageImageUrl } from '@/services/api';
import type { Product } from '@/types';

export interface PackTrayProps {
  entries: { product: Product; qty: number }[];
  /** Every category the builder offers, in the order it is currently rendering them. */
  groups: { slug: string; label: string }[];
  /** Slugs that already have at least one product in the pack. */
  coveredSlugs: string[];
  onRemove: (product: Product) => void;
  onJumpTo: (slug: string) => void;
}

/** How many "you could still add…" chips to offer. */
const MAX_SUGGESTIONS = 3;

export function PackTray({ entries, groups, coveredSlugs, onRemove, onJumpTo }: PackTrayProps) {
  // An empty pack renders nothing at all. A tray that says "vous n'avez rien ajouté" is a row of
  // chrome whose only content is the absence of content — on the screen that has least room for it.
  if (entries.length === 0) return null;

  const missing = groups.filter((g) => !coveredSlugs.includes(g.slug)).slice(0, MAX_SUGGESTIONS);

  return (
    /* `lg:hidden`. Above lg the sticky summary rail is permanently on screen and already names
       every line item with its price, so the tray became a 1,900px-wide box holding three 56px
       thumbnails — the same information, worse, occupying a band of desktop the shelves wanted.
       The completion suggestions it also carries are duplicated into PackSummary for that
       breakpoint, so nothing is lost, only un-repeated. */
    <section
      aria-label="Votre sélection"
      className="mt-3 rounded-xl border border-hairline bg-elevated p-3 sm:p-4 lg:hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xs font-extrabold uppercase tracking-tight text-ink-1">
          Votre sélection
        </h2>
        <span className="shrink-0 text-xs tabular-nums text-ink-3">
          {entries.length} produit{entries.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Thumbnails, horizontal. A wrapping grid would change the tray's height as the pack grows
          and push the shelves down mid-session — the layout must not move under a thumb that is
          mid-tap. Fixed height, scrolls sideways. */}
      {/* `gap-3`, not `gap-2`. The remove control overhangs its thumbnail by 4px on each side, so at
          8px spacing the × of one tile sat visually on top of the next one. 12px leaves 4px of
          clearance and the row still reads as a group. */}
      <ul className="scrollbar-hide -mx-3 mt-2.5 flex gap-3 overflow-x-auto px-3 pt-1 sm:-mx-4 sm:px-4">
        {entries.map(({ product, qty }) => {
          const image = product.cover ? getStorageUrl(product.cover) : '';
          return (
            <li key={product.id} className="relative shrink-0">
              <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-hairline bg-sunken">
                {image && (
                  <Image
                    src={image}
                    alt={product.designation_fr}
                    fill
                    className="object-contain p-1"
                    sizes="56px"
                    unoptimized={isStorageImageUrl(image)}
                  />
                )}
                {qty > 1 && (
                  <span
                    key={qty}
                    data-motion
                    className="pt-pop absolute bottom-0 left-0 rounded-tr-md bg-brand px-1 font-display text-[10px] font-bold tabular-nums text-on-brand"
                  >
                    {qty}
                  </span>
                )}
              </div>
              {/* 28px visually, but the tap target is padded out to 44 via a negative-inset
                  pseudo-element on the button itself — see the `before:` classes. A 28px control on
                  a phone fails the site's own ≥44px rule, and this one deletes a purchase. */}
              <button
                type="button"
                onClick={() => onRemove(product)}
                aria-label={`Retirer ${product.designation_fr} du pack`}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-hairline bg-canvas text-ink-2 shadow-card transition-transform active:scale-90 before:absolute before:-inset-2.5 before:content-[''] [@media(hover:hover)]:hover:border-destructive [@media(hover:hover)]:hover:text-destructive"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* One row that scrolls, never a wrapping one. `flex-wrap` made the tray's height depend on
          how many categories were missing, so removing a product could grow the box and push every
          shelf down under a thumb that was mid-tap. A constant height is worth more here than
          seeing all three chips at once. */}
      {missing.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-3">
          <div className="scrollbar-hide -mx-3 flex items-center gap-2 overflow-x-auto px-3 sm:-mx-4 sm:px-4">
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-ink-2">
              <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              Complétez votre pack
            </span>
            {missing.map((g) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => onJumpTo(g.slug)}
                className="inline-flex min-h-[32px] shrink-0 items-center whitespace-nowrap rounded-full border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-2 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
