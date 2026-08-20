'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getCategories, getCategoryHighlights, getStorageUrl } from '@/services/api';
import { useSiteChrome } from '@/contexts/SiteChromeContext';
import { getPriceDisplay } from '@/util/productPrice';
import { getProductLink } from '@/util/productUrl';
import { Category, Product } from '@/types';

type ProductsDropdownProps = {
  label?: string;
  href?: string;
  opensNewTab?: boolean;
};

function canPrefetch(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * ── NOTHING IS HIDDEN BEHIND A "+N AUTRES" LINK ─────────────────────────────────────────────
 * `MAX_SUBS_PER_COLUMN = 5` used to hide 21 of the 55 subcategories behind an overflow link per
 * column. The cap made sense for the layout it shipped with — six columns of full lists is ~660px
 * of panel — and the rail-and-pane layout removes the premise entirely: one rayon is visible at a
 * time, so the panel's height is bounded by the TALLEST rayon rather than the sum of six. The
 * tallest is 21 subcategories over four columns, six rows. Nothing has to be hidden to make it
 * fit, so nothing is — which is what those links were worth as sitewide internal links in the
 * first place.
 */
export function ProductsDropdown({
  label = 'NOS PRODUITS',
  href = '/shop',
  opensNewTab = false,
}: ProductsDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Active when on the shop route (or any of its sub-paths), so BOUTIQUE lights up like the other
  // nav items when the user is browsing products.
  const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Server-fetched categories (root layout → SiteChromeProvider): the mega-menu is populated
  // without a client API call; fetch-on-mount remains only as fallback when SSR data is empty.
  const { categories: ssrCategories } = useSiteChrome();
  const [categories, setCategories] = useState<Category[]>(ssrCategories);

  /*
    ── THE FEATURE CARD'S PRODUCT, FETCHED ON FIRST HOVER AND NEVER BEFORE ────────────────────
    `/new_product` is 8 KB and returns eight products, all of them in stock. It is small, but it is
    still a request that every single page of this site would otherwise pay for at mount, to
    populate a panel most visitors never open. `featureLoaded` makes it a cost that only a reader
    who hovers BOUTIQUE incurs, and only once per page.

    A failure is silent and total: `feature` stays null, the card is not rendered, the divider
    beside it is not rendered, and the categories take the full width. A menu must not degrade
    into a hole where a card should be.
  */
  /*
    THE RAIL'S SELECTION, AND ITS PRODUCT CACHE.

    `activeRayonId` is what the pane and the card both read. It defaults to the first rayon so the
    panel is never showing an empty right-hand side on open — a menu whose content only appears
    once you move the pointer reads as broken for the first 200ms of every visit.

    `highlights` is a plain object keyed by rayon id, filled by `getCategoryHighlights` on hover
    and never evicted: six rayons is the ceiling and the panel lives as long as the page does.
    `inFlight` stops a pointer sweeping down the rail from firing six overlapping requests — the
    ref is checked and set synchronously, so it holds even though the state update behind it is
    not.
  */
  const [activeRayonId, setActiveRayonId] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Record<number, Product[]>>({});
  const inFlight = useRef<Set<number>>(new Set());

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);
  const hoverTrigger = useRef(false);
  const hoverDropdown = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (ssrCategories.length === 0) {
      getCategories().then(setCategories).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Derived, not stored: three values the panel reads and nothing else owns. `activeRayon` falls
     back to the first rayon so the pane and the card are populated on the very first frame. */
  const activeRayon =
    categories.find((c) => c.id === activeRayonId) ?? categories[0] ?? null;
  const activeSubs = (activeRayon?.sous_categories ?? []) as Array<{
    id: number;
    slug: string;
    designation_fr: string;
  }>;
  /* The whole highlight list, not `[0]`. The strip shows three; the previous single-card
     aside used one and threw the other three away. */
  const feature = activeRayon ? (highlights[activeRayon.id] ?? []) : [];

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!hoverTrigger.current && !hoverDropdown.current) setIsOpen(false);
    }, 200);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  /*
    Hovering a rayon switches the pane AND the card. The fetch is fired once per rayon per page;
    every later hover is a cache read, which is what keeps "more alive" from meaning "one request
    per pointer movement".
  */
  const selectRayon = useCallback((cat: Category) => {
    setActiveRayonId(cat.id);
    if (!cat.slug || highlights[cat.id] || inFlight.current.has(cat.id)) return;
    inFlight.current.add(cat.id);
    getCategoryHighlights(cat.slug, 4)
      .then((rows: Product[]) => setHighlights((prev) => ({ ...prev, [cat.id]: rows })))
      .finally(() => inFlight.current.delete(cat.id));
  }, [highlights]);

  /*
    ── THE PANEL'S TOP IS A CSS VARIABLE, WRITTEN BY A REF, NOT REACT STATE ──────────────────
    It was captured ONCE, in `open()`, into `useState`. Two consequences, and the panel had both:

      DRIFT.  The sticky header collapses on scroll — 114px to 94 on desktop, and the 36px utility
              bar above it scrolls away entirely — so the header's bottom edge travels ~55px while
              a `top` captured on open does not. Scroll with the menu open and a gap of page opens
              between the label and the panel.
      AN UNREACHABLE FOOTER. `maxHeight` was the constant `calc(100vh - 96px)`, which takes no
              account of where the panel STARTS. Opened at 157px, a maximally tall panel ended
              63px below the fold, and its own "Voir tous les produits" row could not be scrolled
              to by any means.

    One variable fixes both: `--menu-top` is the trigger's live bottom edge, and the max-height is
    expressed against it. Written straight to the node's style — React is never told, so a scroll
    event costs one property write and no render. That is the pattern HeaderClient already uses for
    exactly this reason.
  */
  const syncMenuTop = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = dropdownRef.current;
    if (!trigger || !panel) return;
    panel.style.setProperty('--menu-top', `${Math.round(trigger.getBoundingClientRect().bottom)}px`);
  }, []);

  const open = useCallback(() => {
    cancelClose();
    setIsOpen(true);
  }, [cancelClose]);

  useEffect(() => {
    if (!isOpen) return;
    /*
      SELECT THE FIRST RAYON ON OPEN, not on the first hover. `activeRayon` already FALLS BACK to
      `categories[0]` so the pane is populated on the first frame — but `activeRayonId` stayed null,
      so no row carried the active mark and, more visibly, nothing had fetched a product for the
      card. The panel opened with its rail unhighlighted and a skeleton on the right until the
      pointer happened to land on a row.
    */
    if (activeRayonId === null && categories.length > 0) selectRayon(categories[0]);
    syncMenuTop();
    let frame = 0;
    const onMove = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        syncMenuTop();
      });
    };
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
    };
  }, [isOpen, syncMenuTop, activeRayonId, categories, selectRayon]);

  /*
    ── 120ms OF INTENT BEFORE A FULL-WIDTH PANEL APPEARS ─────────────────────────────────────
    `open()` was called synchronously from `onMouseEnter`. There was a 200ms CLOSE delay and no
    open delay at all — so a pointer merely travelling across the nav row to reach CONTACT
    detonated a 1,344px near-black curtain on the way past. 120ms is below the threshold where a
    deliberate hover feels laggy and above the time a pointer spends crossing a 90px label.

    `prefetchShop` on the trigger is deliberately NOT delayed: it is one cheap request for a
    destination the label itself points at, and it is wanted the moment the pointer lands.
  */
  const openTimer = useRef<NodeJS.Timeout | null>(null);
  const openWithIntent = useCallback(() => {
    cancelClose();
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(open, 120);
  }, [cancelClose, open]);

  const cancelOpen = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);


  const close = useCallback(() => {
    hoverTrigger.current = false;
    hoverDropdown.current = false;
    cancelClose();
    setIsOpen(false);
  }, [cancelClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerUp = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener('pointerup', onPointerUp, { capture: true });
    return () => document.removeEventListener('pointerup', onPointerUp, { capture: true });
  }, [isOpen, close]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const prefetchShop = () => {
    if (canPrefetch(href)) router.prefetch(href);
  };
  const targetProps = opensNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  /**
   * ── THE PANEL, LIGHT AND FULL-WIDTH (owner, 20/08/2026) ─────────────────────────────────────
   * *"the dropdown of the shop looks kind of dark with a dark background of the slider, that's so
   * bad… the tabs inside it look AI generated… the border left of Santé & Vitalité looks super
   * noob. Change the design, make it pro and fit the design of the landing page, like Impact made
   * it — clean, easy and simple. Use the full width."*
   *
   * ── THE DARK CURTAIN IS GONE, AND THE EARLIER ARGUMENT FOR IT WAS WRONG ────────────────────
   * It was `.pt-slab`: near-black in both themes, chosen on 18/08 to make the panel read as
   * something laid OVER the page rather than as the page having grown taller. That reasoning only
   * holds if the page underneath is light. It is not — the panel opens directly over the hero
   * slider, which is a dark photograph, so a near-black card on a near-black image is two dark
   * masses with a hairline between them. The owner's screenshot is exactly that.
   *
   * `bg-elevated` inverts the relationship: white on the light page, and the shadow does the
   * separating. It is also what tokens.css v6 asks for in as many words — dark arrives as OBJECTS
   * inside a ~12% painted-area budget, never as a full-width surface, and 1,472 x 500px of
   * near-black hanging off the header spends that budget several times over on one hover.
   *
   * A side effect worth naming: in page scope `--c-brand` is #D03B04, the identity orange. In slab
   * scope it was #FF8A4C, a lightened salmon, because small text needs 8.25:1 on near-black. So
   * the whole panel was rendering in a different orange from the header 40px above it. Nothing in
   * here has to compensate for that any more.
   *
   * ── WHY THE "NOOB BORDER" WAS THE ONLY AFFORDANCE, AND WHAT REPLACED IT ────────────────────
   * The active rayon was marked by a 2px orange bar and orange text, on a black rail, next to
   * orange text. One cue, in one colour, at 2px. It is now a TILE: the row takes the pane's own
   * surface, so the selected rayon reads as physically continuous with the panel it controls —
   * the tab-and-body relationship every desktop menu has used for thirty years — plus a hairline
   * (which carries it in dark theme, where the fill delta is only 1.14:1), brand ink, and the
   * chevron. Four redundant cues instead of one.
   *
   * ── IMAGES, BECAUSE THE TAXONOMY ALREADY HAS THEM ──────────────────────────────────────────
   * *"add some icons or images to it."* Every one of the six rayons has a `cover` in the API —
   * the same 4:3 photography the homepage category rail uses — and this panel was rendering none
   * of it. 44px thumbnails in the rail and 56px packshots in the popular strip; no new asset, no
   * icon set, and nothing invented.
   *
   * ── FULL WIDTH MEANS THE PAGE RAIL, NOT THE VIEWPORT ───────────────────────────────────────
   * `min(96rem, 100vw - 4rem)` with `left` tracking `max-w-site` is byte-for-byte the box the
   * header content sits in (`max-w-site mx-auto px-4 lg:px-8`), so the panel's edges line up with
   * the logo above it and the footer below it. It was 84rem (1,344px) against a 1,536px rail —
   * 96px short on each side, which is the "small" the owner is pointing at.
   */
  const dropdownContent = isOpen && mounted ? (
    <div
      ref={dropdownRef}
      /*
        The 8px above is `pt-2` INSIDE this element rather than a gap in `top`, so the hover
        surface runs continuously from the label into the card. This wrapper must stay transparent
        and unstyled — it spans the full rail, and any fill on it paints a strip across the page.
      */
      className="fixed left-4 z-[200] w-[min(96rem,calc(100vw-2rem))] pt-2 lg:left-[max(2rem,calc((100vw-100rem)/2+2rem))] lg:w-[min(96rem,calc(100vw-4rem))]"
      style={{ top: 'var(--menu-top, 9.5rem)' }}
      onMouseEnter={() => { hoverDropdown.current = true; cancelClose(); }}
      onMouseLeave={() => { hoverDropdown.current = false; scheduleClose(); }}
    >
      <div
        id="boutique-megamenu"
        /* `border-rule`, not `border-hairline`: on a white page a white card needs the heavier of
           the two boundary weights or its edge disappears into the canvas. */
        className="overflow-hidden rounded-2xl border border-rule bg-elevated shadow-card-hover"
      >
        <div
          className="flex overflow-y-auto overscroll-contain"
          style={{ maxHeight: 'calc(100vh - var(--menu-top, 9.5rem) - 1.5rem)' }}
        >
          {/* ── THE RAIL ──────────────────────────────────────────────────────────────────── */}
          <div className="flex w-[15.5rem] shrink-0 flex-col bg-sunken py-2 xl:w-[17rem]">
            <ul aria-label="Rayons">
              {categories.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-2" role="status" aria-label="Chargement des rayons">
                      <Skeleton className="h-11 w-14 shrink-0 rounded-lg" />
                      <Skeleton className="h-3.5 w-24" />
                    </li>
                  ))
                : categories.map((cat) => {
                    const isActive = cat.id === activeRayon?.id;
                    const subCount = cat.sous_categories?.length ?? 0;
                    return (
                      <li key={cat.id}>
                        <LinkWithLoading
                          href={`/${cat.slug}`}
                          data-active={isActive}
                          /*
                            HOVER SELECTS, CLICK NAVIGATES — a rayon is a real page and this menu's
                            SEO value is that its rows are crawlable links. `onFocus` gives a
                            keyboard reader the same behaviour with no second control to tab past.
                          */
                          className="group mx-2 flex min-h-[56px] items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-hairline hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus data-[active=true]:border-hairline data-[active=true]:bg-elevated"
                          loadingMessage="Chargement..."
                          onMouseEnter={() => selectRayon(cat)}
                          onFocus={() => selectRayon(cat)}
                          onClick={close}
                        >
                          <span className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                            {cat.cover ? (
                              <Image
                                src={getStorageUrl(cat.cover)}
                                alt=""
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-ink-3" aria-hidden="true">
                                {cat.designation_fr.trim().charAt(0)}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-display text-[12.5px] font-bold uppercase leading-tight tracking-[0.04em] text-ink-1 transition-colors group-hover:text-brand group-data-[active=true]:text-brand">
                              {cat.designation_fr}
                            </span>
                            <span className="mt-0.5 block text-[11.5px] leading-tight text-ink-3">
                              {subCount} {subCount > 1 ? 'catégories' : 'catégorie'}
                            </span>
                          </span>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-data-[active=true]:text-brand group-data-[active=true]:opacity-100"
                            aria-hidden="true"
                          />
                        </LinkWithLoading>
                      </li>
                    );
                  })}
            </ul>

            {/* The one filled control in the panel, and it sits at the end of the rail where the
                eye lands after reading the six rayons. */}
            <div className="mt-auto px-4 pb-2 pt-4">
              <LinkWithLoading
                href={href}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 font-display text-[12.5px] font-bold uppercase tracking-[0.08em] text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                loadingMessage="Chargement de la boutique..."
                onMouseEnter={prefetchShop}
                onClick={close}
                {...targetProps}
              >
                Voir tous les produits
              </LinkWithLoading>
              <p className="mt-2 text-center text-[11.5px] text-ink-3">
                {categories.length > 0
                  ? `${categories.length} rayons · ${categories.reduce((n, c) => n + (c.sous_categories?.length ?? 0), 0)} catégories`
                  : 'Toute la gamme'}
              </p>
            </div>
          </div>

          {/* ── THE PANE ──────────────────────────────────────────────────────────────────────
              `min-h` matches the rail's six 56px rows plus its CTA, so the panel never shrinks
              below its own navigation when a short rayon is selected. A box that changes height
              as the pointer travels down the rail is the same fault as a menu that moves its
              links. */}
          <div className="flex min-h-[25rem] min-w-0 flex-1 flex-col p-6">
            <div className="flex items-center justify-between gap-4 border-b border-hairline pb-3">
              <h2 className="min-w-0 truncate font-display text-[15px] font-bold uppercase tracking-[0.04em] text-ink-1">
                {activeRayon ? activeRayon.designation_fr : 'Catégories'}
              </h2>
              {activeRayon && (
                <LinkWithLoading
                  href={`/${activeRayon.slug}`}
                  className="-my-2 inline-flex shrink-0 items-center gap-1.5 rounded py-2 text-[13px] font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  loadingMessage="Chargement..."
                  onClick={close}
                >
                  Tout voir
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </LinkWithLoading>
              )}
            </div>

            {categories.length === 0 ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-4 lg:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-24" />
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-2 content-start gap-x-4 pt-2 lg:grid-cols-3 2xl:grid-cols-4">
                {activeSubs.map((sub) => (
                  <li key={sub.id}>
                    <LinkWithLoading
                      href={`/${sub.slug}`}
                      /* The row is the hover target, not the words. `bg-sunken` on a white pane is
                         a 1.08:1 tint — deliberately quiet, because 21 of these are on screen at
                         once and the brand ink is what actually marks the one under the pointer. */
                      className="-mx-2 block truncate rounded-lg px-2 py-2 text-[13px] leading-snug text-ink-2 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      loadingMessage="Chargement..."
                      onClick={close}
                    >
                      {sub.designation_fr}
                    </LinkWithLoading>
                  </li>
                ))}
              </ul>
            )}

            {/*
              ── THE POPULAR STRIP ─────────────────────────────────────────────────────────────
              Was a single 224px column pinned to the right of the panel, showing ONE product —
              and until 20/08 the same product beside every rayon, because nothing in this file
              reacted to where the pointer was.

              Horizontal, at the foot of the pane, is what the extra 128px of width bought: three
              products instead of one, each with its packshot, in the space a single portrait card
              used to occupy. `getCategoryHighlights` fetches once per rayon per page, so a pass
              down the whole rail is six small requests and every hover after that is a cache read.
            */}
            <div className="mt-auto border-t border-hairline pt-4">
              <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">
                Populaire dans ce rayon
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(feature.length > 0 ? feature : Array.from({ length: 3 }).map(() => null)).slice(0, 3).map((p, i) => {
                  if (!p) {
                    return (
                      <div key={`sk-${i}`} className="flex items-center gap-3 rounded-xl border border-hairline p-2" role="status" aria-label="Chargement">
                        <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3.5 w-16" />
                        </div>
                      </div>
                    );
                  }
                  const { finalPrice, oldPrice, hasPromo } = getPriceDisplay(p);
                  return (
                    <LinkWithLoading
                      key={p.id}
                      href={getProductLink(p)}
                      className="group flex items-center gap-3 rounded-xl border border-hairline p-2 transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      loadingMessage="Chargement..."
                      onClick={close}
                    >
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-sunken">
                        <Image
                          src={getStorageUrl(p.cover || '')}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-contain p-1"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[12.5px] font-medium leading-snug text-ink-1 transition-colors group-hover:text-brand">
                          {p.designation_fr}
                        </span>
                        <span className="mt-1 flex items-baseline gap-1.5">
                          <span className="font-display text-[14px] font-bold tabular-nums text-brand">
                            {finalPrice.toFixed(0)} DT
                          </span>
                          {hasPromo && oldPrice != null && oldPrice > finalPrice && (
                            <span className="text-[11.5px] tabular-nums text-ink-3 line-through">
                              {oldPrice.toFixed(0)} DT
                            </span>
                          )}
                        </span>
                      </span>
                    </LinkWithLoading>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={triggerRef}
      className="relative h-full flex items-center"
      onMouseEnter={() => { hoverTrigger.current = true; openWithIntent(); }}
      onMouseLeave={() => { hoverTrigger.current = false; cancelOpen(); scheduleClose(); }}
    >
      <LinkWithLoading
        href={href}
        /* In lockstep with the sibling nav links in HeaderClient.tsx (label at 13.5px, ink,
           brand hover/active + 2px underline) — this is the one nav item that renders through a
           different component, so it has to mirror their styling BY HAND, which is exactly how it
           kept its shopping-bag glyph for one commit after the other six lost theirs. Anything
           changed on the nav-link className in HeaderClient must be changed here in the same
           breath; there is no shared constant to forget. */
        className={cn(
          // Mirrors the sibling nav links' shared underline vocabulary (HeaderClient.tsx): a 2px
          // accent bar that wipes in on hover and stays pinned when active. Desktop-only row, so the
          // 300ms after: transition is never hit by the mobile 0.2s clamp.
          'group relative inline-flex items-center gap-1 h-full text-[13.5px] font-semibold tracking-[0.02em] whitespace-nowrap transition-colors duration-200 after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100',
          active ? 'text-brand after:scale-x-100' : 'text-ink-1 dark:text-gray-200 hover:text-brand'
        )}
        loadingMessage="Chargement de la boutique..."
        onMouseEnter={prefetchShop}
        {...(active ? { 'aria-current': 'page' as const } : {})}
        {...targetProps}
      >
        {/* The bag glyph went with the other six — see the note on the nav links in
            HeaderClient.tsx. The chevron STAYS: it is not decoration, it is the only thing telling
            a reader this item opens a panel rather than navigating. */}
        <span>{label}</span>
      </LinkWithLoading>

      {/*
        ── THE PANEL COULD NOT BE OPENED BY A KEYBOARD AT ALL ────────────────────────────────
        The trigger carried `onMouseEnter`/`onMouseLeave` and nothing else — no `onFocus`, no
        `onKeyDown`, no `aria-haspopup`, no `aria-expanded`. Escape closed it, but only a panel a
        mouse had already opened. That is WCAG 2.1.1 failing on the site's primary navigation, on
        every page.

        The chevron becomes a real `<button>` beside the link rather than a glyph inside it,
        because the two are different actions: the link goes to /shop, the button opens the menu.
        Merging them is what forces a keyboard user to choose between navigating and browsing.

        `<nav>` semantics, deliberately not `role="menu"`: the panel is a list of ordinary links,
        and `menu` would hijack the arrow keys and take Tab away from them.

        Known limitation, documented rather than papered over: the panel is portaled to
        `document.body`, so its links sit at the END of the tab order, after the footer. Tabbing
        out of this button does not enter it. Escape returning focus here is the mitigation until
        the panel can live inside the header's DOM — which is blocked by `.pt-hdr-nav
        { overflow: hidden }` clipping it, and is its own change.
      */}
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="boutique-megamenu"
        aria-label={isOpen ? 'Fermer le menu des rayons' : 'Ouvrir le menu des rayons'}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            open();
          }
        }}
        /* `text-ink-1` alone — no `dark:` pair. The sibling anchor still carries one as baselined
           debt; a second copy would raise this file's DS003 count, which the ratchet fails on. */
        className="-ms-1 flex h-full w-7 items-center justify-center text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {mounted && typeof window !== 'undefined' && dropdownContent &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
}
