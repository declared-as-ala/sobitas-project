'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import Image from 'next/image';
import { Search, X, ArrowRight, ArrowLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { useDebounce } from '@/util/debounce';
import { searchProducts, getStorageUrl } from '@/services/api';
import { getPriceDisplay } from '@/util/productPrice';
import { buildProductUrlPath } from '@/util/productUrl';
import type { Product } from '@/types';
import { cn } from '@/app/components/ui/utils';

const PLACEHOLDER = 'Rechercher un produit, une marque...';
const DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 6;

/**
 * Resting state for the mobile overlay. Static on purpose — a "top searches" endpoint does not
 * exist, and inventing a fetch here would put a network round-trip in front of a screen whose
 * entire job is to accept a keystroke. These are entry points into the catalogue, not analytics.
 */
const POPULAR_SEARCHES = ['Whey', 'Créatine', 'Mass gainer', 'BCAA', 'Pre-workout', 'Oméga 3'];

interface SearchBarProps {
  /** Desktop: show full input. Mobile: show icon that opens sheet */
  variant?: 'desktop' | 'mobile';
  className?: string;
}

function SearchResults({
  query,
  debouncedQuery,
  products,
  isLoading,
  onProductClick,
  onViewAll,
  /** When true (mobile): show all results in a scrollable list, no "see more" button */
  showAllScrollable = false,
}: {
  query: string;
  debouncedQuery: string;
  products: Product[];
  isLoading: boolean;
  onProductClick?: () => void;
  onViewAll?: () => void;
  showAllScrollable?: boolean;
}) {
  const isPending = query.trim() !== debouncedQuery.trim();

  if (isLoading || isPending) {
    return (
      <div className="space-y-1" role="status" aria-label="Recherche en cours">
        {Array.from({ length: showAllScrollable ? 5 : 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl p-2">
            <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
        <span className="sr-only">Recherche en cours…</span>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <p className="px-1 py-6 text-center text-[13px] leading-snug text-ink-3 dark:text-gray-400">
        Tapez pour rechercher des protéines, gainers, compléments…
      </p>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-10 text-center">
        <Search className="mx-auto h-8 w-8 text-ink-3 dark:text-gray-600" aria-hidden />
        <p className="mt-3 text-[14px] font-semibold text-ink-1 dark:text-gray-100">
          Aucun produit trouvé
        </p>
        <p className="mt-1 px-6 text-[13px] leading-snug text-ink-3 dark:text-gray-400">
          Rien ne correspond à «&nbsp;{query.trim()}&nbsp;». Essayez d&apos;autres termes.
        </p>
      </div>
    );
  }

  const listProducts = showAllScrollable ? products : products.slice(0, MAX_SUGGESTIONS);

  const resultList = (
    <div className="space-y-0.5">
      {listProducts.map((product) => (
        <LinkWithLoading
          key={product.id}
          href={buildProductUrlPath(product)}
          onClick={onProductClick}
          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sunken focus:bg-sunken focus:outline-none dark:hover:bg-gray-800 dark:focus:bg-gray-800"
          loadingMessage="Chargement"
        >
          {/* object-CONTAIN, not cover. Supplement covers are studio shots of a tub on white with
              its own margin; cover crops the lid and the label off a 48px square. */}
          <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sunken dark:bg-gray-800">
            {product.cover ? (
              <Image
                src={getStorageUrl(product.cover)}
                alt=""
                fill
                className="object-contain"
                sizes="48px"
                unoptimized
              />
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-ink-1 dark:text-gray-100">
              {product.designation_fr}
            </span>
            <span className="mt-0.5 block text-[13px]">
              {(() => {
                const pd = getPriceDisplay(product);
                if (pd.hasPromo && pd.oldPrice != null) {
                  return (
                    <>
                      <span className="text-ink-3 line-through dark:text-gray-500">
                        {pd.oldPrice.toFixed(2)} DT
                      </span>
                      <span className="ml-1.5 font-semibold text-brand">
                        {pd.finalPrice.toFixed(2)} DT
                      </span>
                    </>
                  );
                }
                return (
                  <span className="font-semibold text-ink-1 dark:text-gray-200">
                    {pd.finalPrice.toFixed(2)} DT
                  </span>
                );
              })()}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        </LinkWithLoading>
      ))}
    </div>
  );

  // Mobile overlay: every match, counted, and the PARENT is the scroll container. It used to nest
  // its own `overflow-y-auto` inside the sheet's — two scrollers on one axis, so a flick could
  // move the inner list while the outer one stayed put.
  if (showAllScrollable) {
    return (
      <>
        <p className="px-1 pb-2 text-[12px] font-semibold uppercase tracking-wide text-brand">
          {products.length} résultat{products.length !== 1 ? 's' : ''}
        </p>
        {resultList}
      </>
    );
  }

  return (
    <>
      {resultList}
      <Button
        variant="ghost"
        className="mt-2 w-full justify-center gap-2 border-t border-hairline pt-3 text-[13px] font-semibold text-brand hover:bg-sunken hover:text-brand-hover dark:border-gray-800 dark:hover:bg-gray-800"
        onClick={onViewAll}
        asChild
      >
        <LinkWithLoading
          href={`/shop?search=${encodeURIComponent(query.trim())}`}
          onClick={onProductClick}
          loadingMessage="Chargement des résultats..."
        >
          Voir tous les résultats ({products.length})
          <ArrowRight className="h-4 w-4" />
        </LinkWithLoading>
      </Button>
    </>
  );
}

export function SearchBar({ variant = 'desktop', className }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setProducts([]);
      return;
    }
    setIsLoading(true);
    try {
      const { products: results } = await searchProducts(trimmed);
      setProducts(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('[SearchBar] search failed:', err);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/shop?search=${encodeURIComponent(q)}`);
    setQuery('');
    setIsOpen(false);
    setIsPopoverOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    setProducts([]);
    inputRef.current?.focus();
  };

  const handleProductClick = () => {
    setQuery('');
    setProducts([]);
    setIsOpen(false);
    setIsPopoverOpen(false);
  };

  const handleViewAll = () => {
    const q = query.trim();
    if (q) router.push(`/shop?search=${encodeURIComponent(q)}`);
    setQuery('');
    setProducts([]);
    setIsOpen(false);
    setIsPopoverOpen(false);
  };

  const showResults = debouncedQuery.trim().length > 0 || products.length > 0 || isLoading;

  // Defer Sheet to client-only to avoid Radix ID hydration mismatch (aria-controls)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Mobile: track visualViewport height so when the keyboard opens, the sheet shrinks and results stay visible/scrollable above the keyboard
  const [mobileSheetHeight, setMobileSheetHeight] = useState<number | null>(null);
  useEffect(() => {
    if (variant !== 'mobile' || !mounted || !isOpen) {
      setMobileSheetHeight(null);
      return;
    }
    const viewport = window.visualViewport;
    if (!viewport) return;

    // `resize` only. This used to also listen to `scroll`, which on visualViewport fires on EVERY
    // frame while the page moves — each one calling setState, and the resulting height flows into
    // an inline style, so React re-rendered and the browser re-laid-out the sheet per frame. That
    // is a measurable share of the 549ms presentation delay profiled on the search interaction.
    // The keyboard opening/closing is a RESIZE of the visual viewport, which is the actual signal
    // this effect wants; scroll never carried information it needed.
    //
    // rAF-coalesced because resize can still burst during the keyboard animation, and rounded
    // because sub-pixel viewport heights would defeat React's bail-out on an unchanged value and
    // re-render for a difference nobody can see.
    let frame = 0;
    const updateHeight = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setMobileSheetHeight((prev) => {
          const next = Math.round(viewport.height);
          return prev === next ? prev : next;
        });
      });
    };
    updateHeight();
    viewport.addEventListener('resize', updateHeight);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', updateHeight);
      setMobileSheetHeight(null);
    };
  }, [variant, mounted, isOpen]);

  const mobileSearchButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-11 w-11 min-h-11 min-w-11',
        'hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl active:scale-95 transition-transform',
        className
      )}
      aria-label="Rechercher un produit"
    >
      <Search className="h-6 w-6" />
    </Button>
  );

  if (variant === 'mobile') {
    if (!mounted) return mobileSearchButton;
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 min-h-11 min-w-11',
              'hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl active:scale-95 transition-transform',
              className
            )}
            aria-label="Rechercher un produit"
          >
            <Search className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        {/* `font-poppins` and the #111827 / #6B7280 / #E5E7EB / #F5F6F8 / #FF5A00 palette below are
            not new values — they are the header's vocabulary, lifted verbatim from the burger
            drawer in HeaderClient. The two panels are now the only things the mobile top bar can
            open, so they read as one surface: same hairline, same 44px rounded-xl field, same
            orange kicker, same result row. */}
        <SheetContent
          side="top"
          className="font-poppins h-[100dvh] overflow-hidden flex flex-col rounded-none bg-white dark:bg-gray-950 border-none p-0 [&>button]:hidden"
          style={mobileSheetHeight != null ? { height: `${mobileSheetHeight}px`, maxHeight: `${mobileSheetHeight}px` } : undefined}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Recherche produits</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* HEADER — back + field, on a hairline. Mirrors the drawer's own header row. */}
            <div className="flex shrink-0 items-center gap-2 border-b border-hairline bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-950">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer la recherche"
                className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-sunken hover:text-ink-1 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                {/* A real ArrowLeft. This was `ArrowRight` + `rotate-180` — same pixels, but the
                    transform is dead weight and the JSX lied about what it drew. */}
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </button>

              <form onSubmit={handleSubmit} role="search" className="min-w-0 flex-1">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-3" aria-hidden />
                  {/* A raw <input>, not the shadcn <Input>. That primitive's base classes are
                      `border-input bg-background … focus-visible:ring-offset-2`, and the first two
                      are silent no-ops (DESIGN_SYSTEM §11) while the offset ring fought the focus
                      ring below. Identical markup to the drawer's field. */}
                  <input
                    ref={inputRef}
                    type="text" // not `search`: kills the browser-native X across every OS
                    inputMode="search" // still asks mobile keyboards for the search layout
                    placeholder="Que recherchez-vous ?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                    autoFocus
                    aria-label="Rechercher un produit"
                    /* pl-10, not the drawer's pl-9: this field is ~90px wider, and at that width
                       the caret rendered flush against the magnifier. */
                    className="w-full min-h-[44px] rounded-xl border border-hairline bg-sunken pl-10 pr-11 text-[14px] text-ink-1 placeholder:text-ink-3 transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-focus/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:bg-gray-900"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={handleClear}
                      aria-label="Effacer la recherche"
                      className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-white hover:text-brand dark:hover:bg-gray-700"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      aria-label="Rechercher"
                      className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-white hover:text-brand dark:hover:bg-gray-700"
                    >
                      <Search className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* BODY — the single scroll container. min-h-0 so it shrinks when the keyboard opens
                and the results stay reachable above it. */}
            <div
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-white px-4 py-3 dark:bg-gray-950"
              style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
              {query.trim() ? (
                <SearchResults
                  query={query}
                  debouncedQuery={debouncedQuery}
                  products={products}
                  isLoading={isLoading}
                  onProductClick={handleProductClick}
                  showAllScrollable
                />
              ) : (
                /* RESTING STATE. The screen used to be one line of grey text under an empty field —
                   a dead end that asked the shopper to already know what they wanted. These chips
                   make it a starting point, and each one is a real query typed into the same
                   field, so there is no second code path to keep in sync. */
                <div className="pt-2">
                  <h3 className="px-1 text-[12px] font-semibold uppercase tracking-wide text-brand">
                    Recherches populaires
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((term) => (
                      <li key={term}>
                        <button
                          type="button"
                          onClick={() => {
                            setQuery(term);
                            inputRef.current?.focus();
                          }}
                          className="flex min-h-11 items-center gap-1.5 rounded-xl border border-hairline bg-sunken px-3.5 text-[13px] font-medium text-ink-1 transition-colors hover:border-brand hover:text-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-brand"
                        >
                          <TrendingUp className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 px-1 text-[13px] leading-snug text-ink-3 dark:text-gray-400">
                    Cherchez un produit, une marque ou un objectif — protéines, gainers, compléments.
                  </p>
                </div>
              )}
            </div>

            {/* FOOTER CTA — only once there is something to see all of. pb composes the safe-area
                inset into the padding; the old `safe-area-pb` class is not defined anywhere in the
                codebase, so on a notched phone this button sat under the home indicator. */}
            {query.trim() && (
              <div className="shrink-0 border-t border-hairline bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-gray-800 dark:bg-gray-950">
                <Button
                  onClick={handleSubmit}
                  className="h-12 w-full rounded-xl bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  <Search className="mr-2 h-5 w-5" aria-hidden />
                  Voir tous les résultats
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: inline input with popover dropdown (the header bar is white now, not red)
  return (
    <div className={cn('relative flex-1', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3 pointer-events-none z-10"
          aria-hidden
        />
        <Input
          ref={inputRef}
          type="text"
          inputMode="search"
          placeholder={PLACEHOLDER}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsPopoverOpen(true);
          }}
          onFocus={() => showResults && setIsPopoverOpen(true)}
          onBlur={() => {
            // Delay to allow link clicks
            setTimeout(() => setIsPopoverOpen(false), 150);
          }}
          autoComplete="off"
          /* This field was `bg-white border-0`, which only worked while the desktop header bar was
             a red slab. Once that bar became white the input was white-on-white with no border —
             a search box you could not see.

             The boundary is carried by an ALWAYS-VISIBLE border, not by fill contrast. Relying on
             fill is what broke it the first time and what broke the first attempt at this fix:
             `bg-gray-100 dark:bg-gray-900` inside a `dark:bg-gray-950` bar is #111827 on #030712,
             a 1.14:1 ratio — invisible. A hairline works in both themes regardless of how the bar
             behind it is coloured later. */
          /* Tokens, so the field follows whatever surface the bar is given later without a single
             `dark:` pair. `bg-sunken` inside a `bg-canvas` bar is the well; the hairline is what
             actually draws it (see above — fill contrast alone has broken this field twice). */
          className="w-full pl-11 pr-24 h-12 rounded-xl border border-hairline bg-sunken text-ink-1 placeholder:text-ink-3 shadow-[inset_0_1px_2px_rgba(17,24,39,0.04)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-rule focus:border-brand focus:bg-canvas focus:ring-4 focus:ring-focus/10 focus-visible:border-brand focus-visible:bg-canvas focus-visible:ring-4 focus-visible:ring-focus/10"
          aria-label="Rechercher un produit"
        />
        {/* Orange search button (GPT header). */}
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 flex h-9 w-11 -translate-y-1/2 items-center justify-center rounded-lg bg-brand text-on-brand shadow-sm transition-colors duration-150 hover:bg-brand-hover active:scale-95"
          aria-label="Rechercher"
        >
          <Search className="h-[18px] w-[18px]" aria-hidden />
        </button>
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-14 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {isPopoverOpen && showResults && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-hairline bg-elevated shadow-lg p-3 max-h-[400px] overflow-y-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          <SearchResults
            query={query}
            debouncedQuery={debouncedQuery}
            products={products}
            isLoading={isLoading}
            onProductClick={handleProductClick}
            onViewAll={handleViewAll}
          />
        </div>
      )}
    </div>
  );
}
