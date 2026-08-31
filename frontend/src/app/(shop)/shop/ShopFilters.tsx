'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import type { Brand, Category } from '@/types';

/**
 * ── THE BOUTIQUE'S FILTER RAIL ──────────────────────────────────────────────────────────────
 * Owner, 19/08/2026: *"the filters are broken, I want them to get real data from the backend."*
 *
 * They were getting real data — /api/shop_facets returns price bounds, 21 flavours, 577 brands
 * with per-brand counts and per-category counts, computed over the whole published catalogue —
 * and the rail was rendering it in a way that made it unusable. What was actually wrong, measured
 * against the live page:
 *
 *   1. 577 BRANDS IN A 240px SCROLL BOX WITH NO SEARCH. Finding "Optimum Nutrition" meant
 *      scrolling an alphabetical list of 577 checkboxes through a window that shows nine at a
 *      time. There is a search field now, and the brands a shopper is most likely to want — the
 *      ones with the most products — are offered first instead of whatever starts with a digit.
 *   2. NO COUNT ON "EN STOCK UNIQUEMENT". Ticking it takes the boutique from 11,263 products to
 *      133, because 98.8% of the catalogue is flagged `rupture` (a data problem, reported
 *      separately). A shopper who ticks a box and loses 99% of the shop assumes the site broke.
 *      The number is on the row now, before the click.
 *   3. ARÔMES OPENED BY DEFAULT and covers a few dozen products; Catégories and Marques, which
 *      cover all of them, were collapsed. The default-open set is now the two that matter.
 *   4. EVERY COLOUR WAS HARDCODED — `text-gray-700 dark:text-gray-300`, `bg-red-50`,
 *      `border-gray-200`. This file is tokens only, so it is correct on both themes with no
 *      `dark:` pair anywhere.
 *
 * ── ONE COMPONENT, TWO DENSITIES ────────────────────────────────────────────────────────────
 * `variant` tunes size and which groups start open, nothing else. Every piece of state and every
 * handler is owned by ShopContent and passed in, so the phone sheet and the desktop aside cannot
 * drift the way the old two-tree header did.
 *
 * ── AND IT IS ITS OWN FILE NOW ──────────────────────────────────────────────────────────────
 * It was 280 lines inside a 2,050-line component that is the repo's worst design-lint offender.
 * Extracting it is what makes it possible for this to be a clean file rather than a slightly less
 * dirty part of a dirty one.
 */

export const CREATINE_TYPES = ['Monohydrate', 'Micronisée', 'Capsules', 'Creapure'];
export const CREATINE_GOALS = ['Force', 'Masse', 'Performance', 'Récupération'];

export const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'popularity', label: 'Popularité' },
  { value: 'price-asc', label: 'Prix : croissant' },
  { value: 'price-desc', label: 'Prix : décroissant' },
  { value: 'newest', label: 'Nouveautés' },
  { value: 'best-sellers', label: 'Meilleures ventes' },
];

/** How many brands render before the "voir plus" step. 577 checkboxes is not a list, it is a wall. */
const BRAND_PAGE = 24;

export interface ShopFiltersProps {
  variant: 'mobile' | 'desktop';
  inStockOnly: boolean;
  setInStockOnly: (value: boolean) => void;
  /** From the facets endpoint — how many of the catalogue are actually available. */
  inStockCount?: number | null;
  isCreatineCategory: boolean;
  selectedTypes: string[];
  toggleType: (type: string) => void;
  selectedGoals: string[];
  toggleGoal: (goal: string) => void;
  uniqueFlavors: string[];
  selectedFlavors: string[];
  toggleFlavor: (flavor: string) => void;
  categories: Category[];
  brands: Brand[];
  filterCounts: { categoryCounts: Map<string, number>; brandCounts: Map<number, number> };
  selectedCategories: string[];
  toggleCategory: (slug: string) => void;
  selectedBrands: number[];
  toggleBrand: (id: number) => void;
  priceRange: [number, number];
  setPriceRange: (value: [number, number]) => void;
  priceBounds: { min: number; max: number };
  sortBy: string;
  setSortBy: (value: string) => void;
  /**
   * What is currently applied, and how to take it off. Phone sheet only.
   *
   * The chips already exist on the toolbar behind the sheet — where, on a phone, they are covered
   * by the sheet the moment it opens. So the one surface on which a shopper is actively changing
   * filters was the one surface that could not show them which filters were on. See the note on
   * the sticky bar below.
   */
  appliedFilters?: Array<{ type: string; label: string; value: string | number }>;
  removeFilter?: (type: never, value: string | number) => void;
  clearFilters?: () => void;
}

/* ── PIECES ───────────────────────────────────────────────────────────────────────────────── */

/**
 * A native `<details>`, not the Radix accordion this replaced.
 *
 * Three reasons, and the third is the one that decided it: it needs no JavaScript to open, so the
 * rail is usable in the server HTML before hydration; it costs nothing in bundle on the page that
 * already ships the most; and `<details open>` is a plain attribute, so "which groups start open"
 * is a render-time decision rather than a piece of client state that has to be seeded, kept in
 * sync and reset. The Radix version needed `defaultValue` plus a `type="multiple"` controller for
 * exactly that.
 */
function Group({
  label,
  count,
  defaultOpen = false,
  sticky = false,
  children,
}: {
  label: string;
  /** Rendered right of the label — how many options, or how many are selected. */
  count?: React.ReactNode;
  defaultOpen?: boolean;
  /**
   * Pin the group's own heading to the top of the scroller while its body scrolls past.
   *
   * Phone sheet only, and it is the cheapest orientation cue available here: Marques alone is 24
   * rows plus a search field, so on a 390px screen you scroll for four viewports through
   * undifferentiated checkbox rows with no indication of which group you are in or how to get out
   * of it. The pinned header is both the label AND the control that closes it.
   */
  sticky?: boolean;
  children: React.ReactNode;
}) {
  return (
    /* No `border-b` of its own — the parent draws `divide-y`, and carrying both painted a DOUBLE
       hairline on every boundary between two groups. */
    <details open={defaultOpen} className="group [&_summary::-webkit-details-marker]:hidden">
      <summary
        className={`flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-ink-1 transition-colors hover:text-brand ${
          sticky ? 'sticky top-0 z-[1] -mx-4 border-b border-hairline bg-elevated px-4' : ''
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {label}
          {count != null && count !== '' && (
            <span className="shrink-0 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="pb-4 pt-0.5">{children}</div>
    </details>
  );
}

/**
 * A checkbox row, drawn rather than composed from the shadcn primitive.
 *
 * The primitive is a Radix `<Checkbox>` plus a `<label htmlFor>` plus a count `<span>` — three
 * elements and a generated id per option, times 577 brands. This is one `<button>` with
 * `aria-pressed`, which is the correct role for a filter toggle anyway (a filter is a pressed
 * state, not a form value being submitted), and it renders ~40% fewer DOM nodes on the group that
 * has the most of them.
 */
function OptionRow({
  label,
  count,
  selected,
  onToggle,
  dense,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onToggle: () => void;
  dense: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 text-left transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        dense ? 'min-h-[34px] py-1' : 'min-h-[44px] py-1.5'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
          selected ? 'border-brand bg-brand text-on-brand' : 'border-rule bg-elevated'
        }`}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-[13px] ${
          selected ? 'font-semibold text-ink-1' : 'text-ink-2'
        }`}
      >
        {label}
      </span>
      {count != null && (
        <span className="shrink-0 text-[11px] tabular-nums text-ink-3">{count}</span>
      )}
    </button>
  );
}

/* ── THE RAIL ─────────────────────────────────────────────────────────────────────────────── */

export function ShopFilters({
  variant,
  inStockOnly,
  setInStockOnly,
  inStockCount,
  isCreatineCategory,
  selectedTypes,
  toggleType,
  selectedGoals,
  toggleGoal,
  uniqueFlavors,
  selectedFlavors,
  toggleFlavor,
  categories,
  brands,
  filterCounts,
  selectedCategories,
  toggleCategory,
  selectedBrands,
  toggleBrand,
  priceRange,
  setPriceRange,
  priceBounds,
  sortBy,
  setSortBy,
  appliedFilters = [],
  removeFilter,
  clearFilters,
}: ShopFiltersProps) {
  const isMobile = variant === 'mobile';
  const dense = !isMobile;
  const [brandQuery, setBrandQuery] = useState('');
  const [brandLimit, setBrandLimit] = useState(BRAND_PAGE);

  /**
   * Selected first, then by product count, then alphabetically.
   *
   * Alphabetical alone put "21st Century" and "ABE" — two brands with a handful of products
   * between them — at the top of a 577-row list, and Optimum Nutrition 300 rows down. Sorting by
   * how much of the catalogue a brand actually accounts for is the difference between a list you
   * scan and a list you scroll. Selected brands are pinned so a chosen filter never scrolls out of
   * its own group when the search box is cleared.
   */
  const rankedBrands = useMemo(() => {
    const counts = filterCounts.brandCounts;
    return [...brands].sort((a, b) => {
      const aSel = selectedBrands.includes(a.id) ? 1 : 0;
      const bSel = selectedBrands.includes(b.id) ? 1 : 0;
      if (aSel !== bSel) return bSel - aSel;
      const diff = (counts.get(b.id) || 0) - (counts.get(a.id) || 0);
      if (diff !== 0) return diff;
      return (a.designation_fr || '').localeCompare(b.designation_fr || '', 'fr');
    });
  }, [brands, filterCounts.brandCounts, selectedBrands]);

  const visibleBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return rankedBrands.slice(0, brandLimit);
    // Searching shows every match — a search that silently truncates is worse than no search.
    return rankedBrands.filter((b) => (b.designation_fr || '').toLowerCase().includes(q));
  }, [rankedBrands, brandQuery, brandLimit]);

  const listClass = 'space-y-0.5 pt-1';
  /*
    ── A SCROLL BOX INSIDE A SCROLLING SHEET IS A TRAP ON A PHONE, SO THERE ISN'T ONE ────────
    `max-h-[17rem] overflow-y-auto` is right on the desktop rail: the rail is pinned beside a
    grid, and a 577-brand list has to be bounded or it runs off the bottom of the page.

    On a phone the same class is the single most frustrating thing in this sheet. The sheet is
    ALREADY a scroller, so a drag that starts anywhere over the brand list scrolls the brand list
    — and when it reaches its end, `overscroll-contain` stops the gesture dead instead of handing
    it to the sheet. The shopper's flick does nothing, twice, and the only way out is to find the
    ~24px of padding beside the list and drag there.

    So on mobile the group just renders its rows and the sheet scrolls, with "voir plus" doing the
    bounding instead of a fixed height. One scroller, one gesture.
  */
  const scrollClass = isMobile ? listClass : `${listClass} max-h-[17rem] overflow-y-auto overscroll-contain pr-1`;

  return (
    <>
      {/*
        ── WHAT IS ALREADY ON, AT THE TOP OF THE SHEET (owner, 20/08/2026) ──────────────
        *"as you provided the screenshot, analyse and make the filter on mobile easier and better
        to use."*

        The applied-filter chips already existed — on the toolbar BEHIND this sheet. On a phone the
        sheet is 92dvh, so opening it covers them completely: the one screen where a shopper is
        actively choosing filters was the one screen that could not show which filters were on. To
        check, you closed the sheet; to change one, you opened it again and hunted for the group it
        came from, which for a brand is 24 rows down a collapsed section.

        Pinned to the top of the scroller, so it survives the scroll it is there to orient. Each
        chip removes its own filter, and "Tout effacer" is here rather than only in the footer
        because it belongs next to the thing it clears.
      */}
      {isMobile && appliedFilters.length > 0 && (
        <div className="sticky top-0 z-[2] -mx-4 border-b border-hairline bg-elevated px-4 pb-2.5 pt-1">
          <div className="flex items-center justify-between gap-2 pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              {appliedFilters.length} filtre{appliedFilters.length > 1 ? 's' : ''} actif{appliedFilters.length > 1 ? 's' : ''}
            </span>
            {clearFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="-my-2 py-2 text-[12px] font-semibold text-brand"
              >
                Tout effacer
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {appliedFilters.map((filter, index) => (
              <button
                key={`${filter.type}-${filter.value}-${index}`}
                type="button"
                onClick={() => removeFilter?.(filter.type as never, filter.value)}
                aria-label={`Retirer le filtre ${filter.label}`}
                className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 pe-2 ps-3 text-[12.5px] font-semibold text-brand transition-colors hover:bg-brand/20"
              >
                <span className="truncate">{filter.label}</span>
                <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/*
        ── SORT IS FIVE PILLS, NOT FIVE ROWS ────────────────────────────────────
        In the owner's screenshot the sheet opens on TRIER PAR and five full-width rows, and the
        first actual filter — Disponibilité — starts 290px down. CATÉGORIES, which is what most
        people came to use, is below the fold on a 390px phone before anything has been touched.

        The same five options wrap into three rows of pills: ~144px instead of ~220, and more
        importantly they read as ONE control rather than as a list you have to scan. A row that
        spans the full width of a sheet looks like a destination; a pill looks like a choice.

        It is not inside a `<details>` any more either. Sort is the one group with exactly one
        answer and no possibility of being long, so a disclosure around it was a tap that could
        only ever hide something small.
      */}
      {isMobile && (
        <div className="border-b border-hairline pb-3 pt-2">
          <p className="pb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-1">Trier par</p>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSortBy(opt.value)}
                  aria-pressed={active}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
                    active
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-hairline bg-elevated text-ink-2 hover:border-brand hover:text-brand'
                  }`}
                >
                  {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

    <div className="divide-y divide-hairline">
      {/* ── DISPONIBILITÉ ─────────────────────────────────────────────────────────────────── */}
      <Group label="Disponibilité" defaultOpen sticky={isMobile}>
        <div className={listClass}>
          <OptionRow
            label="En stock uniquement"
            count={inStockCount ?? undefined}
            selected={inStockOnly}
            onToggle={() => setInStockOnly(!inStockOnly)}
            dense={dense}
          />
        </div>
        {/* The honest warning. 133 of 11,263 products are available, so this checkbox removes 99%
            of the boutique — and without the number beside it, that reads as a broken filter. */}
        {inStockCount != null && inStockCount > 0 && (
          <p className="mt-1.5 px-1.5 text-[11px] leading-snug text-ink-3">
            {inStockCount} produits sont expédiables immédiatement. Les autres sont commandables sur demande.
          </p>
        )}
      </Group>

      {/* ── CRÉATINE (only on that aisle) ─────────────────────────────────────────────────── */}
      {isCreatineCategory && (
        <Group label="Type de créatine" defaultOpen sticky={isMobile}>
          <div className={listClass}>
            {CREATINE_TYPES.map((type) => (
              <OptionRow
                key={type}
                label={type}
                selected={selectedTypes.includes(type)}
                onToggle={() => toggleType(type)}
                dense={dense}
              />
            ))}
          </div>
        </Group>
      )}
      {isCreatineCategory && (
        <Group label="Objectif" sticky={isMobile}>
          <div className={listClass}>
            {CREATINE_GOALS.map((goal) => (
              <OptionRow
                key={goal}
                label={goal}
                selected={selectedGoals.includes(goal)}
                onToggle={() => toggleGoal(goal)}
                dense={dense}
              />
            ))}
          </div>
        </Group>
      )}

      {/* ── CATÉGORIES ────────────────────────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <Group label="Catégories" count={selectedCategories.length || undefined} defaultOpen sticky={isMobile}>
          <div className={listClass}>
            {categories.map((category) => (
              <OptionRow
                key={category.id}
                label={category.designation_fr}
                // Missing means the facet service is unavailable, not "zero products". Omitting
                // the badge is honest degradation; a real zero still renders because Map#get
                // returns the numeric 0 when the backend supplied it.
                count={filterCounts.categoryCounts.get(category.slug)}
                selected={selectedCategories.includes(category.slug)}
                onToggle={() => toggleCategory(category.slug)}
                dense={dense}
              />
            ))}
          </div>
        </Group>
      )}

      {/* ── MARQUES ───────────────────────────────────────────────────────────────────────── */}
      {/*
          ── MARQUES STARTS CLOSED ON A PHONE, AND IT IS THE BIGGEST SINGLE WIN HERE ────────
          577 brands. Open, this group is a 16px search field plus 24 rows plus a "voir plus"
          button — roughly 1,200px, which is THREE phone viewports of checkboxes sitting between
          Catégories and Prix. A shopper scrolling to reach the price slider scrolls past every
          brand in the shop to get there.

          Closed it is one 44px row with a chevron, so the whole sheet — sort, availability,
          categories, brands, flavours, price — fits in about a screen and a half and can be READ.
          That is what "easier to use" means on a 390px screen: seeing the choices before making
          one. Selected brands still show as chips in the pinned bar at the top, so nothing a
          shopper has already chosen is hidden by this.

          The desktop rail is unchanged and stays open: it is 280px pinned beside the grid with its
          own bounded scroller, where the list costs nothing anyone has to scroll past.
      */}
      {brands.length > 0 && (
        <Group
          label="Marques"
          count={selectedBrands.length || undefined}
          defaultOpen={!isMobile}
          sticky={isMobile}
        >
          <div className="relative mt-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
              aria-hidden="true"
            />
            <input
              type="text"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder={`Chercher parmi ${brands.length} marques…`}
              aria-label="Filtrer les marques"
              /* 16px on a phone: iOS Safari zooms the viewport on focusing any input under 16px,
                 and this one sits inside a bottom sheet where that zoom is especially disorienting. */
              className={`w-full rounded-lg border border-hairline bg-sunken py-1.5 pl-8 pr-7 text-ink-1 placeholder:text-ink-3 focus:border-brand focus:outline-none ${
                isMobile ? 'h-11 text-[16px]' : 'h-9 text-[13px]'
              }`}
            />
            {brandQuery && (
              <button
                type="button"
                onClick={() => setBrandQuery('')}
                aria-label="Effacer"
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink-3 hover:text-brand"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className={scrollClass}>
            {visibleBrands.map((brand) => (
              <OptionRow
                key={brand.id}
                label={brand.designation_fr}
                count={filterCounts.brandCounts.get(brand.id)}
                selected={selectedBrands.includes(brand.id)}
                onToggle={() => toggleBrand(brand.id)}
                dense={dense}
              />
            ))}
            {visibleBrands.length === 0 && (
              <p className="px-1.5 py-3 text-[12px] text-ink-3">Aucune marque ne correspond.</p>
            )}
          </div>

          {!brandQuery && brandLimit < rankedBrands.length && (
            <button
              type="button"
              onClick={() => setBrandLimit((n) => n + BRAND_PAGE * 2)}
              className="mt-1.5 flex min-h-[36px] w-full items-center justify-center rounded-lg border border-hairline text-[12px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand"
            >
              Voir {Math.min(BRAND_PAGE * 2, rankedBrands.length - brandLimit)} marques de plus
            </button>
          )}
        </Group>
      )}

      {/* ── ARÔMES ────────────────────────────────────────────────────────────────────────── */}
      {uniqueFlavors.length > 0 && (
        <Group label="Arômes" count={selectedFlavors.length || undefined} sticky={isMobile}>
          <div className={scrollClass}>
            {uniqueFlavors.map((flavor) => (
              <OptionRow
                key={flavor}
                label={flavor}
                selected={selectedFlavors.includes(flavor)}
                onToggle={() => toggleFlavor(flavor)}
                dense={dense}
              />
            ))}
          </div>
        </Group>
      )}

      {/* ── PRIX ──────────────────────────────────────────────────────────────────────────── */}
      <Group label="Prix" defaultOpen sticky={isMobile}>
        <div className="space-y-3 px-1.5 pt-2">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-semibold tabular-nums text-ink-1">
              {priceRange[0]} – {priceRange[1]} DT
            </span>
            {(priceRange[0] > priceBounds.min || priceRange[1] < priceBounds.max) && (
              <button
                type="button"
                onClick={() => setPriceRange([priceBounds.min, priceBounds.max])}
                className="text-[11px] font-semibold text-brand hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
          <Slider
            value={priceRange}
            onValueChange={(value) => setPriceRange(value as [number, number])}
            min={priceBounds.min}
            max={priceBounds.max}
            step={5}
            aria-label="Fourchette de prix"
            className="w-full [&_[data-slot=slider-range]]:bg-brand [&_[data-slot=slider-thumb]]:border-brand"
          />
          <div className="flex justify-between text-[11px] tabular-nums text-ink-3">
            <span>{priceBounds.min} DT</span>
            <span>{priceBounds.max} DT</span>
          </div>
        </div>
      </Group>
    </div>
    </>
  );
}
