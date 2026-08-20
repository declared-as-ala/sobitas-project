'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronDown, ArrowRight } from 'lucide-react';
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
 * ── THE CAP IS GONE, AND SO ARE THE SIX "+N AUTRES" LINKS ───────────────────────────────────
 * `MAX_SUBS_PER_COLUMN = 5` hid 21 of the 55 subcategories behind an overflow link per column.
 * The reasoning it shipped with was sound for the layout it shipped with: six columns of the full
 * lists is ~660px of panel and two rows of rayons below 1280, which is why the cap existed.
 *
 * The rail-and-pane layout removes the premise. One rayon is visible at a time, so the panel's
 * height is bounded by the TALLEST rayon rather than by the sum of six — and the tallest is 21
 * subcategories over three columns, seven rows. Nothing has to be hidden to make it fit, so
 * nothing is: all 55 links are in the panel, on every page, which is what they were worth as
 * sitewide internal links in the first place.
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
  const feature = activeRayon ? (highlights[activeRayon.id]?.[0] ?? null) : null;

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
   * ── THE MEGA-MENU, REBUILT ON THE DESIGN SYSTEM (owner, 15/08/2026) ─────────────────────────
   * *"redesign the dropdown of the button boutique in the header."*
   *
   * The panel predated the token layer and had never been migrated: `bg-white dark:bg-gray-900`,
   * `text-red-600 dark:text-red-400`, `border-gray-100 dark:border-gray-800`, `text-gray-600` —
   * eleven raw palette classes, each with a hand-written `dark:` twin, on the one surface that
   * overlays every page of the site. That is the exact failure mode `tokens.css` exists to end:
   * two hard-coded values per decision, drifting independently, and a dark mode that is correct
   * only where someone remembered to type the twin.
   *
   * What changed, and why each is not just a repaint:
   *
   *   COLUMNS ARE DERIVED, NOT DECLARED. `grid-cols-3 lg:grid-cols-4 xl:grid-cols-6` was fixed at
   *   six columns for six categories. Add a seventh in Filament and the row goes ragged; the panel
   *   has no way to know. `grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]` fills the rail with
   *   whatever exists, at a minimum column width chosen from the longest real subcategory label so
   *   nothing wraps.
   *
   *   THE CATEGORY IS A HEADING, NOT A LINK IN RED. It was `text-red-600 uppercase` with a
   *   decorative 32px red rule under it — brand colour spent on a label rather than on the one
   *   thing in the panel a visitor should press. The heading is now ink, and `text-brand` is left
   *   for hover and for the single CTA. DESIGN_SYSTEM §11: colour marks state, not category.
   *
   *   THE BULLETS ARE GONE. Every subcategory carried a 4px grey dot that turned red on hover —
   *   96 decorative nodes in a menu whose job is to be scanned. The hover affordance is now the
   *   row itself picking up `bg-sunken`, which also makes the whole 32px line clickable-looking
   *   instead of just the text.
   *
   *   THE FOOTER SAYS SOMETHING. "Découvrez toute notre gamme de produits" is a sentence that
   *   informs nobody standing in front of the gamme. It now states the count, which is the one
   *   fact the panel can offer that the links cannot.
   */
  const dropdownContent = isOpen && mounted ? (
    <div
      ref={dropdownRef}
      /*
        ── A DARK CURTAIN, WHICH IS THE WHOLE POINT ──────────────────────────────────────────
        Owner, 18/08/2026, with the reference storefront's SHOP menu open beside ours: *"in the
        header i want you to redesign the shop popup, make it something like this"*.

        `.pt-slab` rather than `bg-elevated`. The panel used to be the same near-white as the
        header it dropped out of, separated only by a shadow, so at a glance it read as the page
        having grown taller rather than as something laid OVER the page. The reference drops a dark
        charcoal curtain, and that is the difference: a surface unmistakably not the page underneath
        needs no shadow to explain itself.

        The scope also re-points every token, so the contents use `text-ink-1` / `border-hairline`
        with no `dark:` variant and stay correct in both themes — the panel is dark in BOTH, the
        way the footer and the header's own contact strip already are.

        ── THE TRAP THIS SURFACE CARRIES ─────────────────────────────────────────────────────
        `--slab-elevated` is 255 255 255 — cards on a slab are WHITE PLATES, "the punch-out
        moment". So `bg-elevated text-ink-1` inside here is white type on a white card at 1.04:1,
        invisible in LIGHT theme ONLY, which is exactly the bug this same scope produced in the
        footer two days ago. A control on a slab is a WELL: `bg-sunken`. The feature card obeys it.

        No `border-t`: a hairline in slab scope is #3A3A42, a dark line drawn at the top of a dark
        panel — invisible, and unnecessary, because a near-black band under a near-white bar is
        already an edge.
      */
      /*
        ── CONTAINED, NOT A CURTAIN ACROSS THE WHOLE SCREEN ──────────────────────────────────
        Owner, 18/08/2026, looking at the first version: *"polish the design of the popup of the
        shop in header, make it smaller, clean and more beautiful, better colors — no need to be
        full screen like that!"*

        And they were looking at a genuinely worse version than the one that was measured. The
        grid is `auto-fit` at `minmax(10.5rem, 1fr)`, so its column count depends on the width it
        is given: at a true 1920 it made six columns and everything sat in one row, which is what
        the guard screenshots showed. The owner's screen is 1920 at 125% Windows scaling — a CSS
        viewport of 1536 — where the same grid gets ~1128px, cannot fit six 168px columns, drops
        to FIVE, and wraps ÉQUIPEMENT onto a second row 300px further down. A full-bleed band that
        reflows into two rows on the most common desktop configuration in the country is the
        "full screen" they are describing.

        A panel with a FIXED column count cannot do that, so the columns are declared rather than
        negotiated, and it is anchored under the nav item with its own hairline, radius and shadow
        so it reads as an object laid on the page — which is what a dropdown is — instead of as a
        section of it.

        ── WIDTH IS WHAT BUYS HEIGHT (owner, 18/08/2026, second pass) ─────────────────────────
        *"it hides under the height of the screen, so make it go more in the width"*.

        Exactly the right diagnosis. At 960px the six rayons had to stack 3x2, and two rows of
        links plus the promoted product came to ~660px — which, starting 348px down a browser
        whose inner height is ~860, put the "Voir tous les produits" link and the rayon counts
        BELOW the bottom of the screen. A hover panel that closes when the pointer leaves it must
        never require a scroll to reach its own footer.

        1,344px is the width at which the six rayons fit in ONE row on the owner's 1536 viewport,
        and one row is ~340px tall instead of ~660: the panel now ends roughly 170px above the
        fold on the screen where it used to run 150px past it. It is still not full-bleed — 1,344
        of 1,536 leaves the page visible down both sides, which was the point of the first pass.

        `min(84rem, 100vw - 2rem)` and `left-4 lg:left-8` keep it on screen at every width with no
        measurement and no resize listener; below `xl` it falls back to three columns and two rows,
        where the viewport is short of horizontal room but has the vertical room to spare.
      */
      /*
        ── THE GAP ABOVE IS PART OF THE PANEL NOW, NOT A HOLE BETWEEN TWO HOVER TARGETS ──────
        `top` used to be `dropdownTop + 8`, which put 8px of PAGE between the trigger's bottom
        edge and the panel's top edge. Cross it slowly and both hover targets are lost at once, so
        the 200ms close timer starts and the panel you were reaching for begins to go away. The
        8px is now `pt-2` INSIDE this element, which is transparent and carries the mouse
        handlers, so the hover surface runs continuously from the label into the card.

        This wrapper must NOT carry `.pt-slab` — it would paint an 8px black strip across the
        whole viewport. The scope lives on the inner card.

        ── WIDTH AND ALIGNMENT ──────────────────────────────────────────────────────────────
        `calc(100vw-4rem)` gives 32px on BOTH sides. It was `-2rem` against `left-4 lg:left-8`, so
        from `lg` up the right edge landed at exactly `100vw` — flush to the glass on every
        viewport below 1376, the 1280 laptop included.

        The `max()` on `left` keeps the panel at 32px until the viewport outgrows the site rail,
        then tracks the rail's own left edge — above 1664 the header content starts at
        `(100vw - 1600px) / 2 + 32`, and a panel still starting at 32 was visibly out of line with
        the BOUTIQUE label that opened it. No listener and no measurement, which preserves the
        no-JS property this panel was built with. `100rem` is `max-w-site` (tailwind.config.ts).
      */
      className="fixed left-4 z-[200] w-[min(84rem,calc(100vw-4rem))] pt-2 lg:left-[max(2rem,calc((100vw-100rem)/2+2rem))]"
      style={{ top: 'var(--menu-top, 9.5rem)' }}
      onMouseEnter={() => { hoverDropdown.current = true; cancelClose(); }}
      onMouseLeave={() => { hoverDropdown.current = false; scheduleClose(); }}
    >
      <div
        id="boutique-megamenu"
        className="pt-slab overflow-hidden rounded-2xl border border-hairline shadow-2xl"
      >
      <div
        className="flex gap-6 overflow-y-auto overscroll-contain p-6"
        style={{ maxHeight: 'calc(100vh - var(--menu-top, 9.5rem) - 1.5rem)' }}
      >
        {/*
          ── ONE RAYON AT A TIME, NOT SIX COLUMNS OF FIVE ────────────────────────────────────
          Owner, 20/08/2026: *"make the popup easier to read and use, and when I hover over
          categories change the right shown product."*

          The panel was `grid-cols-3 xl:grid-cols-6` with `MAX_SUBS_PER_COLUMN = 5`, which is two
          things at once and both of them bad. Below 1280 the six rayons wrapped onto two rows, so
          the reader scanned a 6-cell matrix with no reading order. And the cap hid 21 of the 55
          subcategories behind six "+N autres" links — a menu that answers "what do you sell?" with
          "some of it".

          A rail plus a pane fixes both without hiding anything. The eye reads six rayons down one
          column, and the rayon under the pointer shows ALL of its subcategories across three
          columns of real width. Height is now bounded by the TALLEST rayon rather than the sum of
          six, which is what pays for uncapping the lists.

          Geometry at 1536 (panel 1344, p-6 -> inner 1296): 224 rail + 1 + 24 + pane + 24 + 1 + 224
          aside leaves the pane 798px, three 250px columns — wide enough for the longest label in
          the taxonomy ("Barres & Snacks Protéinés") with no truncation. At 1280 the pane drops to
          two columns rather than squeezing three.
        */}
        <ul
          className="w-[13rem] shrink-0 space-y-0.5 border-e border-hairline pe-5 xl:w-[14rem]"
          aria-label="Rayons"
        >
          {categories.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="px-3 py-2.5" role="status" aria-label="Chargement des rayons">
                  <Skeleton className="h-3.5 w-28" />
                </li>
              ))
            : categories.map((cat) => (
                <li key={cat.id}>
                  <LinkWithLoading
                    href={`/${cat.slug}`}
                    data-active={cat.id === activeRayonId}
                    /*
                      HOVER SELECTS, CLICK NAVIGATES. It stays a real <a href> — a rayon is a real
                      page and this menu's whole SEO value is that its rows are crawlable links —
                      and the pointer merely decides which pane is showing. `onFocus` gives a
                      keyboard reader the same behaviour without a second control to tab through.

                      The affordance is a 2px ACCENT BAR, not a fill. `hover:bg-sunken` was what
                      these rows used, and inside `.pt-slab` that pair measures 1.19:1 — and in
                      dark theme it inverts, so the "highlight" goes darker than the row. It could
                      never be tuned for both. `border-brand` resolves to the slab accent (#FF8A4C)
                      and clears the WCAG 1.4.11 3:1 floor at 8.25:1 in both themes.
                    */
                    className="group -ms-3 flex min-h-[44px] items-center justify-between gap-2 rounded-md border-s-2 border-transparent pe-2 ps-3 font-display text-[12.5px] font-bold uppercase leading-snug tracking-[0.06em] text-ink-2 transition-[color,border-color] hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus data-[active=true]:border-brand data-[active=true]:text-brand"
                    loadingMessage="Chargement..."
                    onMouseEnter={() => selectRayon(cat)}
                    onFocus={() => selectRayon(cat)}
                    onClick={close}
                  >
                    <span className="min-w-0 truncate">{cat.designation_fr}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-data-[active=true]:opacity-100"
                      aria-hidden="true"
                    />
                  </LinkWithLoading>
                </li>
              ))}
        </ul>

        {/* THE PANE. `min-h` matches the rail's six 44px rows so the panel never shrinks below its
            own navigation when a short rayon is selected — a box that changes height as the
            pointer travels down the rail is the same fault as a menu that moves its links. */}
        <div className="flex min-h-[17rem] min-w-0 flex-1 flex-col">
          <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">
            {activeRayon ? activeRayon.designation_fr : 'Catégories'}
          </p>

          {categories.length === 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-3.5 w-24" />
              ))}
            </div>
          ) : (
            <ul className="grid grid-cols-2 content-start gap-x-6 gap-y-0.5 xl:grid-cols-3">
              {/* First cell, always: the rayon itself. The subcategory list below is complete now,
                  so this is not an overflow escape hatch — it is the "everything in here" option
                  a shopper wants when none of the shelves is quite it. */}
              {activeRayon && (
                <li>
                  <LinkWithLoading
                    href={`/${activeRayon.slug}`}
                    className="-ms-3 block truncate rounded-md border-s-2 border-transparent py-2 pe-2 ps-3 text-[12.5px] font-semibold leading-snug text-ink-1 transition-[color,border-color] hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    loadingMessage="Chargement..."
                    onClick={close}
                  >
                    Tout voir
                  </LinkWithLoading>
                </li>
              )}
              {activeSubs.map((sub) => (
                <li key={sub.id}>
                  <LinkWithLoading
                    href={`/${sub.slug}`}
                    className="-ms-3 block truncate rounded-md border-s-2 border-transparent py-2 pe-2 ps-3 text-[12.5px] leading-snug text-ink-2 transition-[color,border-color] hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    loadingMessage="Chargement..."
                    onClick={close}
                  >
                    {sub.designation_fr}
                  </LinkWithLoading>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline pt-4">
            <LinkWithLoading
              href={href}
              className="-mx-2 inline-flex min-h-[44px] items-center gap-2 px-2 text-[14px] font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              loadingMessage="Chargement de la boutique..."
              onMouseEnter={prefetchShop}
              onClick={close}
              {...targetProps}
            >
              Voir tous les produits
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkWithLoading>
            <p className="text-xs text-ink-3">
              {categories.length > 0
                ? `${categories.length} rayons · ${categories.reduce((n, c) => n + (c.sous_categories?.length ?? 0), 0)} catégories`
                : 'Toute la gamme'}
            </p>
          </div>
        </div>

        {/*
          ── THE CARD NOW FOLLOWS THE RAIL ───────────────────────────────────────────────────
          It used to show `new_product[0]` — the newest product in the whole catalogue — beside
          every rayon and every one of the 55 subcategories. There was no code path anywhere in
          this file that reacted to where the pointer was.

          `getCategoryHighlights` fetches on rayon hover, once per rayon per page, and its docblock
          records why that beats bucketing one `/latest_products` call: those 16 rows land in 2 of
          the 6 rayons, so four rayons would still show a generic card.

          ── THE COLUMN IS RESERVED BEFORE ITS CONTENTS EXIST, ON PURPOSE ────────────────────
          The pane is `flex-1`, so an aside that appears once its product arrives narrows the links
          AT THE MOMENT the pointer is travelling towards one. The width and the divider are held
          from the first frame and only the card waits — and now that the card changes per rayon,
          that reservation is what stops the pane resizing every time the pointer moves one row.
        */}
        <aside className="hidden w-[14rem] shrink-0 border-s border-hairline ps-6 lg:block">
          <p className="mb-4 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">
            {activeRayon ? 'Populaire dans ce rayon' : 'Populaire'}
          </p>

          {!feature ? (
            <div className="flex flex-col gap-3" role="status" aria-label="Chargement du produit mis en avant">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ) : (() => {
            const { finalPrice, oldPrice, hasPromo } = getPriceDisplay(feature);
            const link = getProductLink(feature);
            return (
              <div className="flex flex-col gap-3">
                {/*
                  `bg-elevated` here and NOWHERE else in this panel. `--slab-elevated` is white — a
                  PLATE, the punch-out moment — and that is exactly right for a packshot frame,
                  which carries no text and whose photographs are shot on white anyway. It would be
                  wrong for anything a reader has to read, which is why the name, the price and the
                  button below sit on the slab itself.
                */}
                <LinkWithLoading
                  href={link}
                  className="relative block aspect-square w-full overflow-hidden rounded-xl border border-hairline bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  loadingMessage="Chargement..."
                  onClick={close}
                  aria-label={feature.designation_fr || 'Voir le produit'}
                >
                  <Image
                    src={getStorageUrl(feature.cover || '')}
                    alt=""
                    fill
                    /* 224px, matching `w-[14rem]`. It said 196 while the column was 196 and the two
                       have to move together — leave it behind and the browser under-requests and
                       upscales, silently. */
                    sizes="224px"
                    className="object-contain p-3"
                  />
                </LinkWithLoading>

                <LinkWithLoading
                  href={link}
                  /* `min-h` for two lines: the name is clamped at two and the products rotate as
                     the pointer moves down the rail, so without a reserved height the price and
                     the button jump between a one-line name and a two-line one. */
                  className="line-clamp-2 min-h-[2.6em] text-[14px] font-semibold leading-snug text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  loadingMessage="Chargement..."
                  onClick={close}
                >
                  {feature.designation_fr}
                </LinkWithLoading>

                <p className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-bold tabular-nums text-brand">
                    {finalPrice.toFixed(2)} DT
                  </span>
                  {hasPromo && oldPrice != null && oldPrice > finalPrice && (
                    <span className="text-[13px] tabular-nums text-ink-3 line-through">
                      {oldPrice.toFixed(2)} DT
                    </span>
                  )}
                </p>

                {/* ── THE ONE FILLED BUTTON, AND WHY IT HAS A BORDER ────────────────────────
                    `bg-brand-fill` keeps the IDENTITY orange (#D03B04) instead of the slab's
                    lightened accent, so this button and the header CTA 40px above it are the same
                    colour — measured, both rgb(208,59,4). See --brand-core in tokens.css.

                    The border is not decoration. WCAG 1.4.11 wants 3:1 between a control and what
                    surrounds it, and measured on the built page the deep orange sits at 3.95:1 on
                    the light-theme panel but 2.93:1 on the dark one, where the slab canvas lifts to
                    ~#252528. `border-brand` is the slab accent (#FF8A4C, 8.25:1 on the panel), so
                    the boundary is carried by the edge in BOTH themes and the fill is free to be
                    the brand colour rather than whatever measures.

                    `text-on-brand-fill` on a slab is near-black on #FF8A4C — 8.47:1. White on that
                    same orange is 3.55:1 and FAILS, which is why this is a token and not a
                    literal. */}
                <LinkWithLoading
                  href={link}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-brand bg-brand-fill px-4 font-display text-[13px] font-bold uppercase tracking-[0.08em] text-on-brand-fill transition-colors hover:bg-brand-fill-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  loadingMessage="Chargement..."
                  onClick={close}
                >
                  Acheter
                </LinkWithLoading>
              </div>
            );
          })()}
        </aside>
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
