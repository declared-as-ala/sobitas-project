'use client';

import Image from 'next/image';
import { ArrowRight, PackageX, Search, TrendingUp } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getStorageUrl } from '@/services/api';
import { getPriceDisplay } from '@/util/productPrice';
import { buildProductUrlPath } from '@/util/productUrl';
import { isInStock } from '@/util/cartStock';
import type { Product } from '@/types';

/**
 * Everything the search panel can show, on both surfaces.
 *
 * ── ONE PANEL, TWO ANCHORS ──────────────────────────────────────────────────────────────────
 * The desktop dropdown and the mobile sheet had grown two copies of the same list with different
 * row heights, different skeletons and different empty states. They differ in exactly one thing —
 * where the box is pinned — so the box stays in SearchBar and everything inside it lives here.
 *
 * ── THE RESTING STATE IS THE PART PEOPLE SEE MOST ───────────────────────────────────────────
 * A search field is focused far more often than it is completed, so the panel that appears before
 * a single keystroke is the one that gets looked at. It offers the six entry points into the
 * catalogue and two real products — the reference storefront's arrangement, and the right one:
 * a list of words is navigation, a product with a price is proof the search leads somewhere.
 */

/**
 * Static on purpose. A "top searches" endpoint does not exist, and inventing a fetch here would
 * put a network round-trip in front of a panel whose entire job is to accept a keystroke. These
 * are entry points into the catalogue, not analytics.
 */
export const POPULAR_SEARCHES = ['Whey', 'Créatine', 'Mass gainer', 'BCAA', 'Pre-workout', 'Oméga 3'];

/**
 * ONE row shape, and it is 52px.
 *
 * `object-contain`, not cover: supplement covers are studio shots of a tub on white with its own
 * margin, and cover crops the lid and the label off a small square.
 *
 * `loading="lazy"` plus `sizes="44px"` matters more here than anywhere else on the site — eight of
 * these mount and unmount on every keystroke batch, and a 44px slot must never pull a 600px file.
 */
export function SearchResultRow({
  product,
  active = false,
  onNavigate,
  id,
}: {
  product: Product;
  active?: boolean;
  onNavigate?: () => void;
  id?: string;
}) {
  const pd = getPriceDisplay(product);
  const inStock = isInStock(product);

  return (
    <LinkWithLoading
      id={id}
      href={buildProductUrlPath(product)}
      onClick={onNavigate}
      role="option"
      aria-selected={active}
      className={`group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${
        active ? 'bg-sunken' : 'hover:bg-sunken'
      }`}
      loadingMessage="Chargement"
    >
      <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-hairline bg-elevated">
        {product.cover ? (
          <Image
            src={getStorageUrl(product.cover)}
            alt=""
            fill
            className="object-contain p-1"
            sizes="44px"
            loading="lazy"
            unoptimized
          />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium leading-snug text-ink-1 transition-colors group-hover:text-brand">
          {product.designation_fr}
        </span>
        {/* The second line is the one signal a shopper checks before clicking a search result, and
            it is the reason the row grew by 4px rather than staying at 48: "en stock" is what makes
            a result actionable in a shop that sells out. */}
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-none">
          <span className={inStock ? 'text-ok' : 'text-ink-3'}>{inStock ? 'En stock' : 'Sur commande'}</span>
          {pd.hasPromo && pd.oldPrice != null && (
            <>
              <span className="text-ink-3" aria-hidden="true">
                ·
              </span>
              <span className="font-semibold text-brand">
                −{Math.max(0, Math.round(pd.oldPrice - pd.finalPrice))} DT
              </span>
            </>
          )}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end tabular-nums">
        <span className={`text-[13.5px] font-bold ${pd.hasPromo ? 'text-brand' : 'text-ink-1'}`}>
          {Math.round(pd.finalPrice)} DT
        </span>
        {pd.hasPromo && pd.oldPrice != null && (
          <span className="text-[11px] leading-none text-ink-3 line-through">{Math.round(pd.oldPrice)} DT</span>
        )}
      </span>
    </LinkWithLoading>
  );
}

/** The skeleton must be the row's exact height, or the panel jumps when results land. */
function ResultSkeleton({ rows }: { rows: number }) {
  return (
    <div role="status" aria-label="Recherche en cours">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5">
          <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-2.5 w-20 rounded" />
          </div>
          <Skeleton className="h-3.5 w-12 shrink-0 rounded" />
        </div>
      ))}
      <span className="sr-only">Recherche en cours…</span>
    </div>
  );
}

/**
 * The resting panel: entry points on the left, two real products on the right.
 *
 * The products are best-sellers, fetched ONCE per tab on the first focus and held at module level
 * (see useSearchSuggestions) — 4 KB, and never re-requested. They are deliberately not fetched at
 * mount: a header renders on every page of the site and this panel is opened on a minority of them.
 */
export function SearchRestingPanel({
  suggestions,
  onPickTerm,
  onNavigate,
  compact = false,
}: {
  suggestions: Product[];
  onPickTerm: (term: string) => void;
  onNavigate?: () => void;
  /** Phone: the products are dropped and the terms become one scrollable row. */
  compact?: boolean;
}) {
  if (compact) {
    /* ── ONE LINE, NOT A WALL OF CHIPS ──────────────────────────────────────────────────────
       Owner, 18/08/2026: *"find an innovative way to show popular searches without fully filling
       the page and looking miserable."* Six 44px chips under a heading was ~180px of a screen
       whose job is to accept a keystroke. One 36px scrollable row is 56px, and the page behind
       stays visible. `-mx-1 px-1` lets the last chip be visibly cut — the affordance that says
       there is more this way. */
    return (
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex shrink-0 items-center gap-1 pr-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          Populaire
        </span>
        {POPULAR_SEARCHES.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onPickTerm(term)}
            className="flex h-9 shrink-0 items-center rounded-full border border-hairline bg-sunken px-3.5 text-[13px] font-medium text-ink-1 transition-colors hover:border-brand hover:text-brand"
          >
            {term}
          </button>
        ))}
      </div>
    );
  }

  const hasSuggestions = suggestions.length > 0;

  return (
    <div className={`grid gap-x-6 gap-y-4 p-3 ${hasSuggestions ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : ''}`}>
      <div className="min-w-0">
        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Recherches populaires
        </p>
        <ul className="divide-y divide-hairline">
          {POPULAR_SEARCHES.map((term) => (
            <li key={term}>
              <button
                type="button"
                onClick={() => onPickTerm(term)}
                className="group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-[14px] text-ink-1 transition-colors hover:bg-sunken hover:text-brand"
              >
                {term}
                {/* The arrow only exists on hover: six permanent chevrons in a 200px column is a
                    row of decoration competing with the words it points at. */}
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-brand opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {hasSuggestions && (
        <div className="min-w-0">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Les plus vendus
          </p>
          <div className="space-y-0.5">
            {suggestions.slice(0, 3).map((p) => (
              <SearchResultRow key={p.id} product={p} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The results state.
 *
 * `isStale` rather than `isLoading` decides whether to draw the skeleton: between a keystroke and
 * the debounce firing there is no request in flight, but the list on screen describes a different
 * query. Keying off `isLoading` alone left the previous query's results sitting there looking
 * settled for a quarter of a second on every keystroke.
 */
export function SearchResults({
  query,
  products,
  total,
  isStale,
  failed,
  activeIndex = -1,
  optionId,
  onNavigate,
  rows = 6,
  listClassName = '',
}: {
  query: string;
  products: Product[];
  total: number;
  isStale: boolean;
  failed: boolean;
  activeIndex?: number;
  optionId?: (i: number) => string;
  onNavigate?: () => void;
  rows?: number;
  /** Caps the LIST, not the panel — see below. */
  listClassName?: string;
}) {
  const trimmed = query.trim();

  if (isStale) return <div className="p-2"><ResultSkeleton rows={rows} /></div>;

  if (failed) {
    return (
      <div className="px-6 py-8 text-center">
        <PackageX className="mx-auto h-6 w-6 text-ink-3" aria-hidden="true" />
        <p className="mt-2 text-[14px] font-semibold text-ink-1">Recherche indisponible</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-3">
          Vérifiez votre connexion, puis réessayez.
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <Search className="mx-auto h-6 w-6 text-ink-3" aria-hidden="true" />
        <p className="mt-2 text-[14px] font-semibold text-ink-1">Aucun produit trouvé</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-3">
          Rien ne correspond à «&nbsp;{trimmed}&nbsp;». Essayez une marque ou un type de produit.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── THE SCROLL IS ON THE LIST, THE FOOTER IS OUTSIDE IT ──────────────────────────
          First version put `max-h` + `overflow` on the whole panel, so "Voir les N résultats"
          scrolled away with the rows: the one control that tells a shopper their query has 246
          matches was reachable only by scrolling past eight of them. It is pinned now, and the
          rows scroll under it. */}
      <div
        className={`space-y-0.5 overflow-y-auto overscroll-contain p-2 ${listClassName}`}
        role="listbox"
        aria-label="Résultats de recherche"
      >
        {products.map((p, i) => (
          <SearchResultRow
            key={p.id}
            id={optionId?.(i)}
            product={p}
            active={i === activeIndex}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      {/* The count is `pagination.total`, not `products.length`. This footer used to promise
          "(10)" for a query with 246 matches, because ten was the page size. */}
      <LinkWithLoading
        href={`/shop?search=${encodeURIComponent(trimmed)}`}
        onClick={onNavigate}
        loadingMessage="Chargement des résultats…"
        className="flex h-11 items-center justify-center gap-2 border-t border-hairline text-[13px] font-semibold text-brand transition-colors hover:bg-sunken"
      >
        Voir les {total} résultats
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </LinkWithLoading>
    </>
  );
}
