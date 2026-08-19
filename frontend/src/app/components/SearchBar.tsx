'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';
import { buildProductUrlPath } from '@/util/productUrl';
import { MIN_QUERY_LENGTH, useProductSearch } from './search/useProductSearch';
import { useSearchSuggestions } from './search/useSearchSuggestions';
import { SearchResults, SearchRestingPanel } from './search/SearchPanel';

const PLACEHOLDER = 'Rechercher un produit, une marque...';

interface SearchBarProps {
  /** Desktop: full input with a dropdown. Mobile: an icon that opens a panel under the header. */
  variant?: 'desktop' | 'mobile';
  className?: string;
}

/**
 * ── THE HEADER SEARCH ───────────────────────────────────────────────────────────────────────
 * Owner, 19/08/2026, with the reference storefront beside ours: *"upgrade the search input. On
 * focus, make the background kind of dark like ESN does, and show a small popup with the top
 * searches and one or two products. When it searches, show the product cards in a beautiful way.
 * And not just the UI — focus on performance, fastness, memory, and that it works on low
 * internet."*
 *
 * The four asks map to four changes, and only the first is visual.
 *
 * 1. THE SCRIM. Focusing the field dims the page BELOW the header, so the panel reads as the only
 *    live thing on screen without the field ever becoming a modal. It is a portal at z-40 — under
 *    the header's z-50 — which is what keeps the bar, the nav row and the panel lit while
 *    everything under them recedes. Clicking it closes.
 *
 * 2. THE RESTING PANEL. Six entry points and two real best-sellers, shown before a keystroke —
 *    see search/SearchPanel. A search field is focused far more often than it is completed.
 *
 * 3. THE RESULT ROW. 52px, with the price right-aligned and a stock line under the name, because
 *    "en stock" is what makes a search result actionable in a shop that sells out.
 *
 * 4. THE NETWORK, which is where the real work is. Measured against production:
 *
 *        before   67,113 bytes per query   (94% of it a 577-row brand list nothing renders)
 *        after     8,895 bytes per query   `light=1`, an existing switch nobody had wired up
 *
 *    Plus: every request is abortable and the previous one is cancelled before the next is sent,
 *    so a slow connection can no longer land "wh" on top of "whey"; results are cached in a
 *    BOUNDED module-level map, so backspacing costs nothing; and a query under two characters
 *    never leaves the browser. See search/useProductSearch — each of those is one clause of
 *    "works on low internet".
 *
 * ── KEYBOARD ────────────────────────────────────────────────────────────────────────────────
 * Arrow keys move through the results, Enter opens the highlighted one (or submits the query when
 * nothing is highlighted), Escape closes. `role="combobox"` + `aria-activedescendant` is the
 * pattern screen readers expect, and it costs one piece of state.
 */
export function SearchBar({ variant = 'desktop', className }: SearchBarProps) {
  const router = useRouter();
  const isMobile = variant === 'mobile';

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  /** Latched: once the panel has been opened, the suggestion fetch is allowed. */
  const [everOpened, setEverOpened] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /*
   * A CONSTANT, NOT `useId()`, and the difference is a hydration error.
   *
   * `useId` is only stable across SSR and hydration while the tree shape is identical on both
   * sides, and this header's is not: the mobile SearchBar returns a bare trigger until `mounted`,
   * which shifts React's id counter between the server render and the first client one. The
   * server sent `aria-controls="_R_1ad5r4qilb_"` and the client produced `"_R_aj9ep6ilb_"` —
   * caught by check-console, invisible on screen, and it dirties the whole hydration pass.
   *
   * There is exactly one desktop field and one mobile field on a page, so two fixed strings are
   * unique by construction and cannot drift.
   */
  const listboxId = isMobile ? 'pt-search-results-mobile' : 'pt-search-results-desktop';

  const { products, total, isStale, tooShort, failed, reset } = useProductSearch(query);
  const suggestions = useSearchSuggestions(everOpened);

  const showingResults = !tooShort;
  const optionId = useCallback((i: number) => `${listboxId}-opt-${i}`, [listboxId]);

  const openPanel = useCallback(() => {
    setOpen(true);
    setEverOpened(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const clearAll = useCallback(() => {
    setQuery('');
    setActiveIndex(-1);
    reset();
  }, [reset]);

  const afterNavigate = useCallback(() => {
    clearAll();
    close();
  }, [clearAll, close]);

  // A new result set invalidates the highlight — index 3 of the old list is not index 3 of the new.
  useEffect(() => setActiveIndex(-1), [products]);

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const q = query.trim();
      if (!q) return;
      router.push(`/shop?search=${encodeURIComponent(q)}`);
      afterNavigate();
      inputRef.current?.blur();
    },
    [query, router, afterNavigate]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        close();
        inputRef.current?.blur();
        return;
      }
      if (!open || !showingResults || products.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((i) => {
          const next = i + delta;
          if (next < -1) return products.length - 1;
          if (next >= products.length) return -1;
          return next;
        });
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        const product = products[activeIndex];
        if (product) {
          e.preventDefault();
          router.push(buildProductUrlPath(product));
          afterNavigate();
          inputRef.current?.blur();
        }
      }
    },
    [open, showingResults, products, activeIndex, close, router, afterNavigate]
  );

  /*
   * Closing on an OUTSIDE POINTERDOWN rather than on the input's blur.
   *
   * The previous version closed the dropdown from `onBlur` behind a 150ms timeout, so that a click
   * on a result would land before the panel unmounted. That timeout is a guess about how fast a
   * browser dispatches events, and it loses on a slow machine — the panel disappears out from
   * under the pointer and the click hits whatever the page put there instead. Watching for a
   * pointerdown outside the component has no race in it: a press on a result is by definition
   * inside.
   */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      if (target && panelRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  const panelRef = useRef<HTMLDivElement>(null);

  /*
   * ── THE SCRIM IS PINNED TO THE HEADER'S MEASURED BOTTOM ──────────────────────────────────
   * Not a constant: the utility strip scrolls away, `[data-compact]` shrinks the bar on scroll,
   * and the mobile bar is a different height from the desktop one. A hard-coded 64 would be wrong
   * in three ways inside a single scroll gesture. Measured on open and on resize/scroll.
   */
  const [headerBottom, setHeaderBottom] = useState(0);
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const header = document.querySelector('header');
      setHeaderBottom(header ? Math.round(header.getBoundingClientRect().bottom) : 64);
    };
    measure();
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [open]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const scrim =
    mounted && open
      ? createPortal(
          <div
            /* `rgb(0 0 0 / …)`, never `bg-ink-1/…`: the ink token INVERTS with the theme, so in
               dark mode an ink-based scrim would brighten the page it is meant to recede. */
            className="pt-search-scrim fixed inset-x-0 bottom-0 z-40 bg-black/45"
            style={{ top: `${headerBottom}px` }}
            onClick={close}
            aria-hidden="true"
          />,
          document.body
        )
      : null;

  const panelBody = useMemo(
    () => (
      <>
        {showingResults ? (
          <SearchResults
            query={query}
            products={products}
            total={total}
            isStale={isStale}
            failed={failed}
            activeIndex={activeIndex}
            optionId={optionId}
            onNavigate={afterNavigate}
            rows={isMobile ? 5 : 6}
            listClassName={isMobile ? 'max-h-[38vh]' : 'max-h-[19rem]'}
          />
        ) : (
          <SearchRestingPanel
            suggestions={suggestions}
            compact={isMobile}
            onPickTerm={(term) => {
              setQuery(term);
              inputRef.current?.focus();
            }}
            onNavigate={afterNavigate}
          />
        )}
      </>
    ),
    [
      showingResults, query, products, total, isStale, failed, activeIndex, optionId,
      afterNavigate, isMobile, suggestions,
    ]
  );

  /** Shared between both anchors so the two fields cannot drift apart again. */
  const inputProps = {
    ref: inputRef,
    /* `text`, not `search`: the latter draws a browser-native X on top of ours, differently on
       every OS. */
    type: 'text' as const,
    inputMode: 'search' as const,
    value: query,
    autoComplete: 'off',
    role: 'combobox' as const,
    'aria-expanded': open,
    'aria-controls': listboxId,
    'aria-autocomplete': 'list' as const,
    'aria-activedescendant': activeIndex >= 0 ? optionId(activeIndex) : undefined,
    'aria-label': 'Rechercher un produit',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      openPanel();
    },
    onFocus: openPanel,
    onKeyDown,
  };

  // ── MOBILE ────────────────────────────────────────────────────────────────────────────────
  if (isMobile) {
    const trigger = (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => (open ? (close(), clearAll()) : openPanel())}
        aria-expanded={open}
        aria-label={open ? 'Fermer la recherche' : 'Rechercher un produit'}
        className={cn(
          'h-12 w-12 min-h-12 min-w-12 rounded-xl transition-transform hover:bg-ink-1/[0.04] active:scale-95',
          open && 'bg-sunken text-brand',
          className
        )}
      >
        {open ? <X className="h-[26px] w-[26px]" /> : <Search className="h-[26px] w-[26px]" />}
      </Button>
    );

    if (!mounted) return trigger;

    return (
      <div ref={rootRef}>
        {trigger}
        {scrim}
        {open &&
          createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Recherche produits"
              className="pt-search-panel fixed inset-x-0 z-50 border-b border-hairline bg-elevated shadow-lg"
              style={{ top: `${headerBottom}px` }}
            >
              <form onSubmit={submit} role="search" className="px-3 py-2.5">
                <div className="relative flex items-center">
                  <Search
                    className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-ink-3"
                    aria-hidden="true"
                  />
                  <input
                    {...inputProps}
                    placeholder="Rechercher un produit..."
                    /* 16px EXACTLY, written as a literal. iOS Safari zooms the viewport on focusing
                       any input under 16px — that is the whole of the owner's "it zooms in so bad",
                       and it is a documented behaviour with one fix. Not `text-base`: a rename of
                       that utility must not silently re-arm the zoom. */
                    className="h-12 w-full rounded-xl border border-hairline bg-sunken pl-11 pr-11 text-[16px] text-ink-1 transition-colors placeholder:text-ink-3 focus:border-brand focus:bg-elevated focus:outline-none focus:ring-2 focus:ring-focus/20"
                  />
                  <button
                    type={query ? 'button' : 'submit'}
                    onClick={query ? () => { clearAll(); inputRef.current?.focus(); } : undefined}
                    aria-label={query ? 'Effacer la recherche' : 'Rechercher'}
                    className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-elevated hover:text-brand"
                  >
                    {query ? <X className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </form>

              {/* 45vh, and the scroll is INSIDE this box. A list that grew the panel past the fold
                  would put the page's scroll and the list's scroll in one gesture — the one thing a
                  dropdown must never do. */}
              <div id={listboxId} className="border-t border-hairline">
                {panelBody}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────────────────────
  return (
    <div ref={rootRef} className={cn('relative flex-1', className)}>
      {scrim}
      <form onSubmit={submit} role="search" className="relative z-50">
        <input
          {...inputProps}
          placeholder={PLACEHOLDER}
          /* The boundary is carried by an ALWAYS-VISIBLE hairline, not by fill contrast. Relying on
             fill is what made this field invisible twice: white-on-white once the header bar
             stopped being a red slab, then `bg-gray-100` inside a `bg-gray-950` bar at 1.14:1.
             Tokens, so it follows whatever surface the bar is given later with no `dark:` pair. */
          className={cn(
            'h-11 w-full rounded-xl border bg-sunken pl-4 pr-20 text-ink-1 placeholder:text-ink-3',
            'shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] outline-none',
            'transition-[background-color,border-color,box-shadow] duration-200',
            open
              ? 'border-brand bg-canvas ring-4 ring-focus/10'
              : 'border-hairline hover:border-rule'
          )}
        />
        {/* GHOST, NOT FILLED. A saturated orange square here would be the second brand-coloured
            button in a 64px bar — the first being COMPOSEZ VOTRE PACK, which is the one action in
            this chrome worth spending the accent on. */}
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-2 transition-colors duration-150 hover:bg-ink-1/[0.05] hover:text-brand active:scale-95"
          aria-label="Rechercher"
        >
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { clearAll(); inputRef.current?.focus(); }}
            className="absolute right-11 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-brand"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </form>

      {open && (
        <div
          ref={panelRef}
          id={listboxId}
          /* ── 42rem, ANCHORED LEFT ────────────────────────────────────────────────────────
             The field is ~1,130px on a 1536 screen because it fills the header bar, and the
             dropdown used to inherit that width. A 1,130px row holding a 300px name and a 60px
             price put ~700px of nothing between the two things the reader is comparing. 672px,
             pinned to the field's left edge, which is where the caret is and where every name
             starts. */
          className="pt-search-panel absolute left-0 top-full z-50 mt-2 w-full max-w-[42rem] overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-xl"
        >
          {panelBody}
        </div>
      )}
    </div>
  );
}
