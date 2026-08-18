'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import Image from 'next/image';
import { Search, X, ArrowRight, ChevronRight, TrendingUp } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';

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
      /* The skeleton has to be the same height as the row it stands in for, or the panel jumps
         when results land — the one thing a skeleton exists to prevent. 40px thumb, one line. */
      <div role="status" aria-label="Recherche en cours">
        {Array.from({ length: showAllScrollable ? 5 : 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-12 shrink-0" />
          </div>
        ))}
        <span className="sr-only">Recherche en cours…</span>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <p className="px-1 py-4 text-center text-[13px] leading-snug text-ink-3">
        Tapez pour rechercher des protéines, gainers, compléments…
      </p>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-6 text-center">
        <Search className="mx-auto h-6 w-6 text-ink-3" aria-hidden />
        <p className="mt-2 text-[14px] font-semibold text-ink-1">Aucun produit trouvé</p>
        <p className="mt-1 px-6 text-[13px] leading-snug text-ink-3">
          Rien ne correspond à «&nbsp;{query.trim()}&nbsp;». Essayez d&apos;autres termes.
        </p>
      </div>
    );
  }

  const listProducts = showAllScrollable ? products : products.slice(0, MAX_SUGGESTIONS);

  /*
    ── THE ROW IS 56px, NOT 76 (owner, 18/08/2026) ──────────────────────────────────────────
    *"on mobile the search result is so high and big, make it smaller like Impact made"*, and for
    the desktop dropdown *"redesign and polish the results shower of the search bar"*. One row
    serves both surfaces, so it is one change.

    What made it tall: a 48px thumbnail, `p-2` around it, and the PRICE ON ITS OWN LINE under the
    name. Six of those is 456px of dropdown for six product names — the reference fits eight in the
    same space by putting the name and the price on ONE line, which they can be, because a price is
    four characters and a name truncates anyway.

    40px thumbnail, `py-1.5`, name and price on one baseline with the price hugging the right edge
    where the eye already goes for it. 76 -> 56px a row: the same six results now cost 336px, and
    the whole panel fits above the fold on a 390px phone.

    The chevron goes. It pointed right on a row that is entirely a link, and at 16px it was the
    third thing competing for the row's right edge with the price.
  */
  const resultList = (
    <div>
      {listProducts.map((product) => {
        const pd = getPriceDisplay(product);
        return (
          <LinkWithLoading
            key={product.id}
            href={buildProductUrlPath(product)}
            onClick={onProductClick}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-sunken focus:bg-sunken focus:outline-none"
            loadingMessage="Chargement"
          >
            {/* object-CONTAIN, not cover. Supplement covers are studio shots of a tub on white with
                its own margin; cover crops the lid and the label off a small square. */}
            <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-md bg-sunken">
              {product.cover ? (
                <Image
                  src={getStorageUrl(product.cover)}
                  alt=""
                  fill
                  className="object-contain p-0.5"
                  sizes="40px"
                  unoptimized
                />
              ) : null}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium leading-snug text-ink-1">
              {product.designation_fr}
            </span>
            <span className="flex shrink-0 items-baseline gap-1.5 text-[13px] tabular-nums">
              {pd.hasPromo && pd.oldPrice != null && (
                <span className="text-[11.5px] text-ink-3 line-through">{Math.round(pd.oldPrice)} DT</span>
              )}
              <span className={pd.hasPromo ? 'font-semibold text-brand' : 'font-semibold text-ink-1'}>
                {Math.round(pd.finalPrice)} DT
              </span>
            </span>
          </LinkWithLoading>
        );
      })}
    </div>
  );

  // Mobile overlay: every match, counted, and the PARENT is the scroll container. It used to nest
  // its own `overflow-y-auto` inside the sheet's — two scrollers on one axis, so a flick could
  // move the inner list while the outer one stayed put.
  if (showAllScrollable) {
    return (
      <>
        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
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
        className="mt-1.5 h-10 w-full justify-center gap-2 border-t border-hairline text-[13px] font-semibold text-brand hover:bg-sunken hover:text-brand-hover"
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

  /*
    ── THE PANEL IS ANCHORED UNDER THE HEADER, SO IT NEEDS THE HEADER'S BOTTOM ───────────────
    Measured on open (and on resize), not hard-coded: the mobile bar is 64px today, the utility
    strip above it scrolls away, and `[data-compact]` shrinks the whole thing on scroll. A constant
    would be wrong in three different ways within one scroll.
  */
  const [panelTop, setPanelTop] = useState(0);
  useEffect(() => {
    if (variant !== 'mobile' || !isOpen) return;
    const measure = () => {
      const header = document.querySelector('header');
      setPanelTop(header ? Math.round(header.getBoundingClientRect().bottom) : 64);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [variant, isOpen]);

  /* Escape closes it, the way the dialog it replaced did for free. */
  useEffect(() => {
    if (variant !== 'mobile' || !isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variant, isOpen]);

  /* Autofocus once the panel exists. `autoFocus` on the input would fight React's remounting and
     scroll the page on some Android builds; focusing the ref after paint does not. */
  useEffect(() => {
    if (variant !== 'mobile' || !isOpen) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [variant, isOpen]);


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

    /*
      ── A BAR UNDER THE HEADER, NOT A NEW PAGE (owner, 18/08/2026) ─────────────────────────
      *"don't open a full page when I click on the search icon on mobile in the header — do like
      Impact does it, just add a search input under the header"*, and separately *"when I open it
      on mobile it zooms in so bad, I don't want that zoom"*.

      What was here: a `Sheet side="top"` at `h-[100dvh]`, i.e. a full-screen takeover with its own
      back arrow, its own footer CTA and a `visualViewport` listener to survive the keyboard. Three
      things wrong with it on a phone:

        1. it REPLACED the page, so tapping the magnifier felt like navigation and closing it felt
           like going back — for an action that is meant to be a glance;
        2. the resting state had to fill 800px with something, so it filled it with a heading, a
           wall of chips and a paragraph of advice;
        3. the field was 14px, and iOS Safari ZOOMS THE VIEWPORT on focusing any input under 16px.
           That is the entire "it zooms in so bad": not a bug in our CSS, a documented behaviour
           with one fix — `text-[16px]`, which is what the field now is. (Not `text-base`: the
           value is load-bearing and a rename of that utility must not silently re-arm the zoom.)

      What replaces it: a panel anchored to the header's own bottom edge, the width of the screen,
      as tall as its content. The page stays where it was, dimmed. Results cap at 55vh and scroll
      inside themselves — never the page.
    */
    const close = () => {
      setIsOpen(false);
      setQuery('');
      setProducts([]);
    };

    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (isOpen ? close() : setIsOpen(true))}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Fermer la recherche' : 'Rechercher un produit'}
          className={cn(
            'h-12 w-12 min-h-12 min-w-12',
            'hover:bg-ink-1/[0.04] rounded-xl active:scale-95 transition-transform',
            isOpen && 'bg-sunken text-brand',
            className
          )}
        >
          {isOpen ? <X className="h-[26px] w-[26px]" /> : <Search className="h-[26px] w-[26px]" />}
        </Button>

        {isOpen &&
          createPortal(
            <>
              {/* The scrim closes on tap and dims the page WITHOUT hiding it — the point of not
                  being a full-screen sheet is that you can still see where you are. */}
              <div
                className="fixed inset-0 z-[190] bg-black/40"
                style={{ top: `${panelTop}px` }}
                onClick={close}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="Recherche produits"
                className="fixed inset-x-0 z-[200] border-b border-hairline bg-elevated shadow-lg"
                style={{ top: `${panelTop}px` }}
              >
                <form onSubmit={handleSubmit} role="search" className="px-3 py-2.5">
                  <div className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-ink-3" aria-hidden />
                    <input
                      ref={inputRef}
                      type="text" /* not `search`: kills the browser-native X across every OS */
                      inputMode="search"
                      placeholder="Rechercher un produit..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoComplete="off"
                      aria-label="Rechercher un produit"
                      /* 16px EXACTLY — see the note above. Below it, iOS zooms on focus. */
                      className="h-12 w-full rounded-xl border border-hairline bg-sunken pl-11 pr-11 text-[16px] text-ink-1 placeholder:text-ink-3 transition-colors focus:border-brand focus:bg-elevated focus:outline-none focus:ring-2 focus:ring-focus/20"
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Effacer la recherche"
                        className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-elevated hover:text-brand"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        aria-label="Rechercher"
                        className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-elevated hover:text-brand"
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </form>

                {query.trim() ? (
                  <>
                    {/* 55vh, and the scroll is INSIDE this box. A results list that grows the panel
                        past the fold would put the page's scroll and the list's scroll in the same
                        gesture, which is the one thing a dropdown must never do. */}
                    <div className="max-h-[45vh] overflow-y-auto overscroll-contain border-t border-hairline px-2 py-1.5">
                      <SearchResults
                        query={query}
                        debouncedQuery={debouncedQuery}
                        products={products}
                        isLoading={isLoading}
                        onProductClick={handleProductClick}
                        showAllScrollable
                      />
                    </div>
                    <div className="border-t border-hairline px-3 py-2.5">
                      <Button
                        onClick={handleViewAll}
                        className="h-11 w-full rounded-xl bg-brand text-[14px] font-semibold text-on-brand transition-colors hover:bg-brand-hover"
                      >
                        Voir tous les résultats
                        <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </>
                ) : (
                  /* ── POPULAR SEARCHES, ON ONE LINE ────────────────────────────────────────
                     Owner: *"find an innovative way to show popular searches without fully filling
                     the page and looking miserable"*.

                     They were a wrapped grid of six 44px chips under a heading and above a
                     paragraph — ~180px of a screen whose job is to accept a keystroke. Here they
                     are ONE horizontally-scrollable row, 36px tall, with the label inline at the
                     start of it: the whole resting state is 56px, the panel stays close to the
                     header, and the page behind it is still visible. Scrolling sideways for more
                     is a gesture a phone user already has; scrolling a full page of chips is not
                     one they should need.

                     `-mx-3 px-3` lets the row bleed to both edges so the last chip is visibly cut
                     rather than ending in a suspiciously neat gap — the affordance that says
                     "there is more this way". */
                  <div className="flex items-center gap-2 overflow-x-auto border-t border-hairline px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <span className="flex shrink-0 items-center gap-1 pr-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                      Populaire
                    </span>
                    {POPULAR_SEARCHES.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="flex h-9 shrink-0 items-center rounded-full border border-hairline bg-sunken px-3.5 text-[13px] font-medium text-ink-1 transition-colors hover:border-brand hover:text-brand"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>,
            document.body
          )}
      </>
    );
  }

  // Desktop: inline input with popover dropdown (the header bar is white now, not red)
  return (
    <div className={cn('relative flex-1', className)}>
      {/*
        ── ONE MAGNIFIER, AND IT IS THE BUTTON ────────────────────────────────────────────────
        Owner, 17/08/2026: make the header *"more minimalistic but same functionality, like the
        design of the header of impact"*.

        This field carried TWO magnifying glasses 700px apart: a decorative one pinned inside the
        left edge, and a second one inside a filled orange square on the right that actually
        submitted. The left one was pure decoration on a field whose placeholder already reads
        "Rechercher un produit, une marque…", and having the same glyph appear twice in one control
        is what made a 700px-wide input look busy.

        The decoration is gone and the submit keeps the glyph, which is also the reference's
        arrangement. Nothing about the behaviour changed: Enter submitted before and submits now,
        and the button is still a real <button type="submit">.
      */}
      <form onSubmit={handleSubmit} className="relative">
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
          className="w-full pl-4 pr-20 h-11 rounded-xl border border-hairline bg-sunken text-ink-1 placeholder:text-ink-3 shadow-[inset_0_1px_2px_rgba(17,24,39,0.04)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-rule focus:border-brand focus:bg-canvas focus:ring-4 focus:ring-focus/10 focus-visible:border-brand focus-visible:bg-canvas focus-visible:ring-4 focus-visible:ring-focus/10"
          aria-label="Rechercher un produit"
        />
        {/*
          GHOST, NOT FILLED. A saturated orange square inside the search field is the second
          brand-coloured button in a 64px-tall bar — the first being COMPOSEZ VOTRE PACK, which is
          the one action in this chrome worth spending the accent on. Two of them competing is the
          same mistake the WhatsApp pill made in the nav row a day ago, and it was fixed there for
          the same reason. `text-ink-2` resting, brand on hover: the control is exactly as
          discoverable and stops shouting.
        */}
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-2 transition-colors duration-150 hover:bg-ink-1/[0.05] hover:text-brand active:scale-95"
          aria-label="Rechercher"
        >
          <Search className="h-[18px] w-[18px]" aria-hidden />
        </button>
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-11 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {isPopoverOpen && showResults && (
        <div
          /* ── THE DROPDOWN STOPS BEING AS WIDE AS THE FIELD ──────────────────────────────
             The search field is ~1,130px on a 1536 screen because it fills the header bar, and
             the dropdown inherited that width with `right-0`. A 1,130px row holding a 300px
             product name and a 60px price put roughly 700px of nothing between the two things a
             reader is comparing — the eye has to travel the width of the screen to pair a name
             with its price.

             `max-w-[42rem]` (672px) anchors it to the field's LEFT edge, which is where the caret
             is and where every name starts. The rows are the same rows; they just stop being
             stretched. `max-h` comes down with the row height: 400px held five of the old 76px
             rows and holds seven of the new 52px ones. */
          className="absolute left-0 top-full z-50 mt-2 max-h-[380px] w-full max-w-[42rem] overflow-y-auto overscroll-contain rounded-xl border border-hairline bg-elevated p-2 shadow-lg"
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
