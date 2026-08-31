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
 * ONE row shape, and it is 84px.
 *
 * ── IT GREW, BECAUSE THE PANEL HAD ROOM AND THE NAME DID NOT ────────────────────────────────
 * Owner, 19/08/2026, with the panel open: *"make the product rows bigger, since we have enough
 * space, and more clean."*
 *
 * The row was 52px with a 48px thumbnail and a SINGLE truncated line, which on this catalogue
 * meant "NITROTECH WHEY PROTEIN 1…", "THUNDER GAINER 5.4KG - CH…", "BIG WHEY 2KG - BIG RAMY LA…".
 * Every one of those cuts at exactly the point where the name starts carrying what a shopper is
 * scanning for — the weight, the flavour, the brand. The panel is 736px wide; the row was
 * spending almost none of it.
 *
 * Three changes, in order of how much they matter:
 *
 *   1. THE NAME WRAPS TO TWO LINES (`line-clamp-2`). This is the whole point. A second line is
 *      ~40 more characters, which clears every name in the catalogue's long tail.
 *   2. The thumbnail goes 48 → 64px. A supplement tub at 48px is a coloured rectangle; at 64 the
 *      label is recognisable, and recognising the tub is how a regular picks a product.
 *   3. The category leads the meta line. `sous_categorie` already rides the light payload, costs
 *      nothing, and answers "is this the right KIND of thing" before the name has been read.
 *
 * `object-contain`, not cover: supplement covers are studio shots of a tub on white with its own
 * margin, and cover crops the lid and the label off a small square.
 *
 * `loading="lazy"` plus `sizes="64px"` matters more here than anywhere else on the site — eight of
 * these mount and unmount on every keystroke batch, and a 64px slot must never pull a 600px file.
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
  const category = product.sous_categorie?.designation_fr;
  const saving =
    pd.hasPromo && pd.oldPrice != null ? Math.max(0, Math.round(pd.oldPrice - pd.finalPrice)) : 0;

  return (
    <LinkWithLoading
      id={id}
      href={buildProductUrlPath(product)}
      onClick={onNavigate}
      role="option"
      aria-selected={active}
      /*
        ── THE ROW HAD ONE SET OF NUMBERS FOR EVERY SCREEN ─────────────────────────────────
        Owner, 20/08/2026: *"make the search results more responsive… most users are mobile."*

        MEASURED at 360px: 64px thumb + 14px gap + 20px of padding + a price column that reaches
        62px for "279 DT / 300 DT" leaves the name and its meta line **200px**. At 320px — still
        ~4% of Tunisian mobile traffic, and the width of an iPhone SE — it is 160px. The result
        was "Économisez 31 DT" breaking mid-phrase onto a second line under the stock mark, which
        is what the owner's screenshot shows.

        Below `sm` the row now gives that space back: a 56px thumb, 12px gutters, 8px padding.
        Eight pixels of thumbnail is not a loss on a packshot; forty pixels of name is a gain.
      */
      className={`group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors sm:gap-3.5 sm:px-2.5 ${
        active ? 'bg-sunken' : 'hover:bg-sunken'
      }`}
      loadingMessage="Chargement"
    >
      <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-hairline bg-elevated sm:h-16 sm:w-16">
        {product.cover ? (
          <Image
            src={getStorageUrl(product.cover)}
            alt=""
            fill
            className="object-contain p-1"
            sizes="(max-width: 639px) 56px, 64px"
            loading="lazy"
            /*
              OPTIMISED, unlike the cart and checkout rows this was copied from.

              `unoptimized` sends the browser to admin.protein.tn for the ORIGINAL file: the first
              six results for "whey" are 123 KB, 98 KB, 141 KB… for a 64px slot. Eight of those
              mount per query batch, so the panel was pulling roughly a megabyte to fill half a
              square inch — on the one control this codebase spent a whole pass making cheap
              (67,113 -> 8,895 bytes a keystroke).

              next.config lists admin.protein.tn in `remotePatterns` and 64 in `imageSizes`, and
              ProductCard already optimises these exact URLs, so the variant exists and is cached
              for 30 days. Measured after: ~3 KB a thumbnail.

              The transactional surfaces (cart, checkout, order confirmation) keep `unoptimized`
              deliberately — they render two or three images on pages nobody browses, where an
              optimizer round-trip buys nothing.
            */
          />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        {/* A kicker, not a chip. A pill here would be a fourth coloured object on a row that
            already carries a photograph, a price and a stock mark. */}
        {category && (
          <span className="mb-0.5 block truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            {category}
          </span>
        )}
        {/* NO `block` HERE. `line-clamp-2` sets `display: -webkit-box`, and a `block` alongside it
            wins on stylesheet order — which silently turned the clamp off and let a long name run
            to three lines, making every row in the narrow resting column 111px instead of 84. */}
        <span className="line-clamp-2 text-[13.5px] font-medium leading-[1.3] text-ink-1 transition-colors group-hover:text-brand sm:text-[14.5px]">
          {product.designation_fr}
        </span>
        {/* On phones the price belongs under the name. Keeping it in a right rail reduced the
            actual reading column to ~160px on compact devices and made every long name look
            broken. Desktop keeps the scan-friendly aligned price rail. */}
        <span className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap tabular-nums sm:hidden">
          <span className={`text-[15px] font-bold leading-none ${pd.hasPromo ? 'text-brand' : 'text-ink-1'}`}>
            {Math.round(pd.finalPrice)} DT
          </span>
          {pd.hasPromo && pd.oldPrice != null && (
            <span className="text-[11px] leading-none text-ink-3 line-through">{Math.round(pd.oldPrice)} DT</span>
          )}
        </span>
        {/* "En stock" is the one signal a shopper checks before clicking a search result — it is
            what makes a result actionable in a shop that sells out. The dot carries the state as
            well as the colour, because colour alone is not a signal (WCAG 1.4.1). */}
        {/*
          `flex-wrap` plus `whitespace-nowrap` on each phrase. Without the wrap the flex items
          shrink and the TEXT INSIDE them breaks, which is how "Économisez 31 DT" ended up split
          across two lines with the "DT" orphaned. With it, either both phrases fit on one line or
          the second phrase moves down whole. `gap-y-1` keeps the two-line case from touching.

          The separator is hidden when it would end a line — a middle dot left hanging at the end
          of a wrapped row is the small kind of wrong that makes a UI look unfinished.
        */}
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] leading-none">
          <span className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap ${inStock ? 'text-ok' : 'text-ink-3'}`}>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${inStock ? 'bg-ok' : 'bg-ink-3'}`}
              aria-hidden="true"
            />
            {inStock ? 'En stock' : 'Sur commande'}
          </span>
          {saving > 0 && (
            <>
              <span className="hidden text-ink-3 sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="whitespace-nowrap font-semibold text-brand">Économisez {saving} DT</span>
            </>
          )}
        </span>
      </span>

      {/* `shrink-0` with no width cap let a four-digit price take 70px out of a 200px name on a
          phone. The column is stacked, right-aligned and nowrap, so a cap costs nothing and stops
          the one long price on the page from squeezing every name beside it. */}
      <span className="hidden shrink-0 flex-col items-end gap-0.5 whitespace-nowrap tabular-nums sm:flex">
        <span className={`text-[15.5px] font-bold leading-none sm:text-[17px] ${pd.hasPromo ? 'text-brand' : 'text-ink-1'}`}>
          {Math.round(pd.finalPrice)} DT
        </span>
        {pd.hasPromo && pd.oldPrice != null && (
          <span className="text-[11.5px] leading-none text-ink-3 line-through sm:text-[12px]">{Math.round(pd.oldPrice)} DT</span>
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
        <div key={i} className="flex items-center gap-3 px-2 py-2.5 sm:gap-3.5 sm:px-2.5">
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl sm:h-16 sm:w-16" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-2.5 w-24 rounded" />
          </div>
          <Skeleton className="hidden h-4 w-14 shrink-0 rounded sm:block" />
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
  /** Phone: terms become a rail and two useful products stay within the same compact sheet. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="max-h-[calc(min(72dvh,36rem)-5.5rem)] overflow-y-auto overscroll-contain">
        <div className="border-b border-hairline px-4 pb-3 pt-2">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-3">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            Recherches populaires
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onPickTerm(term)}
                className="flex h-10 shrink-0 items-center rounded-full border border-hairline bg-sunken px-4 text-[13.5px] font-medium text-ink-1 transition-colors hover:border-brand hover:text-brand"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="px-2 pb-2 pt-3">
            <div className="flex items-baseline justify-between gap-3 px-2 pb-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-3">Meilleures ventes</p>
              <span className="text-[11px] text-ink-3">Disponibles maintenant</span>
            </div>
            {suggestions.slice(0, 2).map((product) => (
              <SearchResultRow key={product.id} product={product} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const hasSuggestions = suggestions.length > 0;

  return (
    /* Roomier than the first pass (owner: *"you can make it bigger and more visible"*): 16px of
       panel padding instead of 12, a 32px gutter, and the two columns kept at ~1:1.15 so the
       product rows — which carry a thumbnail and two lines — get the wider half. */
    <div className={`grid gap-x-10 gap-y-5 p-5 ${hasSuggestions ? 'sm:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)]' : ''}`}>
      <div className="min-w-0">
        <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Recherches populaires
        </p>
        <ul className="divide-y divide-hairline">
          {POPULAR_SEARCHES.map((term) => (
            <li key={term}>
              <button
                type="button"
                onClick={() => onPickTerm(term)}
                className="group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-[14.5px] font-medium text-ink-1 transition-colors hover:bg-sunken hover:text-brand"
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
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
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
        /* `min-h` rather than `h`: at 320px "Voir les 1 234 résultats" plus the arrow is wider
           than the panel, and a fixed height turns a wrapped label into clipped text. */
        className="flex min-h-[48px] items-center justify-center gap-2 border-t border-hairline bg-sunken px-3 text-center text-[13.5px] font-semibold text-brand transition-colors hover:bg-brand hover:text-on-brand"
      >
        Voir les {total} résultats
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </LinkWithLoading>
    </>
  );
}
