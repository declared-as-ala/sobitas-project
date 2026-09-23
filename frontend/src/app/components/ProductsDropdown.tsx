'use client';

import { categoryAnchor } from '@/util/categoryAnchor';
import { canonicalCategoryPath } from '@/util/resolveCategorySeo';
import { useState, useRef, useEffect, useCallback } from 'react';
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
import { navTaxonomy, taxonomyDescendantCount, taxonomyLabel, type TaxonomyNode } from '@/config/catalogTaxonomy';
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
 * ── THE TREE IS STATIC DATA, NOT A FETCH — AND THAT IS THE WHOLE POINT ──────────────────────
 * Measured 23/09/2026 with a Googlebot UA against production: of the 56 live taxonomy URLs the
 * homepage exposed 19. This component was the reason. It held ONE rayon's children in the DOM at
 * a time (`activeSubs.map`, driven by `activeRayonId`), the panel itself was gated on
 * `isOpen && mounted`, and the whole thing was portaled to `document.body` — which cannot render
 * on the server at all. So the served HTML of every page on this site contained ZERO category
 * links from the mega-menu, and a rendering crawler that never hovers saw, at best, one rayon.
 *
 * Three changes, in order of how much each is worth:
 *
 *   1. THE PANEL IS ALWAYS IN THE DOM. `isOpen` now toggles `hidden`/`block`, not existence. The
 *      markup is therefore server-rendered on every page, hover or no hover.
 *   2. ALL SIX RAYON PANELS ARE IN THE DOM AT ONCE. `activeRayonSlug` selects which one is
 *      DISPLAYED; the other five are `hidden`, still parsed, still crawled, still followed.
 *   3. THE GROUP LEVEL IS RENDERED. `Acides aminés` and `Vitamines & minéraux` are real pages
 *      AND parents; their labels are links with their children nested beneath them. A nested list
 *      is how a hierarchy is stated to a crawler — a flat row of siblings states nothing.
 *
 * ── WHY THE PORTAL IS GONE ──────────────────────────────────────────────────────────────────
 * `createPortal` was introduced because `.pt-hdr-nav { overflow: hidden }` (globals.css) and the
 * nav row's own `overflow-x-auto` scroller were believed to clip the panel. They do not: the panel
 * is `position: fixed`, its containing block is the viewport, and overflow clipping only applies
 * to descendants whose containing-block chain passes through the clipping element. Verified in
 * isolation against exactly this ancestor stack (sticky header > overflow:hidden > overflow-x:auto)
 * — the fixed child hit-tests at full size 150px below the 48px row. No ancestor of the header
 * sets `transform`, `filter`, `perspective`, `contain` or `will-change`, which are the only things
 * that would make a fixed element clippable here.
 *
 * Dropping the portal is what makes SSR possible, and it also retires the documented a11y defect
 * that came with it: the panel's links no longer sit at the very end of the tab order, after the
 * footer, and `aria-controls="boutique-megamenu"` now resolves to an element that actually exists.
 *
 * ── WHAT STILL COMES FROM THE API ───────────────────────────────────────────────────────────
 * Only pixels: the rayon COVER images and the "populaire dans ce rayon" product strip. Neither is
 * a link to a category, so neither may gate one. A rayon the API has never heard of still renders
 * its full sub-tree with a letter tile where the photograph would be (`catalogTaxonomy` is the
 * source of truth); an API rayon absent from the tree is ignored, because the tree is the
 * commercial taxonomy and the API tree is a stock-keeping convenience.
 *
 * ── LABELS ──────────────────────────────────────────────────────────────────────────────────
 * Never `designation_fr`. The catalogue stores shouted values with trailing spaces ("PROTÉINES ").
 * `categoryAnchor(slug, taxonomyLabel(slug))` keeps the commercial anchor text where one is
 * declared (src/util/categoryAnchor.ts) and falls back to the declared taxonomy label everywhere
 * else — so the raw API string is never rendered and the anchor-text programme is not undone.
 */
const NAV_TREE: TaxonomyNode[] = navTaxonomy();

const NAV_CATEGORY_COUNT = NAV_TREE.reduce((n, rayon) => n + taxonomyDescendantCount(rayon), 0);

/**
 * Short rayons need a different rhythm from a thirteen-link taxonomy: four destinations or fewer,
 * none of them a group, become larger cards and share the pane with a rayon overview. Presentation
 * only — every link is rendered either way. A rayon that grows a GROUP falls back to the dense
 * list, because a group's children have nowhere to go inside a card.
 */
function isSparseRayon(rayon: TaxonomyNode): boolean {
  const children = rayon.children ?? [];
  return children.length > 0 && children.length <= 4 && children.every((c) => !c.children?.length);
}

function navLabel(slug: string): string {
  return categoryAnchor(slug, taxonomyLabel(slug));
}

/** A leaf destination in the dense pane. 44px tall because it is a pointer AND a touch target. */
function LeafLink({ slug, onNavigate }: { slug: string; onNavigate: () => void }) {
  return (
    <LinkWithLoading
      href={canonicalCategoryPath(slug)}
      /* The row is the hover target, not the words. `bg-sunken` on a white pane is a 1.08:1 tint —
         deliberately quiet, because up to thirteen of these are on screen at once and the brand ink
         is what actually marks the one under the pointer. */
      className="-mx-2 flex min-h-[44px] items-center whitespace-normal rounded-lg px-2 py-1 text-[13px] leading-snug text-ink-2 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      loadingMessage="Chargement..."
      onClick={onNavigate}
    >
      {navLabel(slug)}
    </LinkWithLoading>
  );
}

/**
 * A GROUP: a real page that is also a parent. The heading is a LINK, not a caption — that is the
 * entire reason this level exists. `/acides-amines` was rendered as a SIBLING of `/bcaa` and
 * `/eaa` by the API tree; stating it as their parent turns seven unrelated links into one cluster
 * with a named hub, which is the relationship a crawler reads off navigation.
 */
function GroupBlock({ group, onNavigate }: { group: TaxonomyNode; onNavigate: () => void }) {
  return (
    <div className="pb-2">
      <LinkWithLoading
        href={canonicalCategoryPath(group.slug)}
        className="group -mx-2 flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 py-1 font-display text-[12px] font-bold uppercase leading-snug tracking-[0.05em] text-ink-1 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        loadingMessage="Chargement..."
        onClick={onNavigate}
      >
        <span className="min-w-0 whitespace-normal">{navLabel(group.slug)}</span>
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-brand"
          aria-hidden="true"
        />
      </LinkWithLoading>
      <ul className="ms-2 border-s border-hairline ps-3">
        {(group.children ?? []).map((leaf) => (
          <li key={leaf.slug}>
            <LeafLink slug={leaf.slug} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  // Server-fetched categories (root layout → SiteChromeProvider). These supply COVER IMAGES only;
  // the navigation tree itself never waits on them.
  const { categories: ssrCategories } = useSiteChrome();
  const [categories, setCategories] = useState<Category[]>(ssrCategories);

  /*
    THE RAIL'S SELECTION, AND ITS PRODUCT CACHE.

    `activeRayonSlug` is what the pane and the strip both read, and it defaults to the FIRST rayon
    rather than to null — so the server-rendered panel already has one rayon displayed and five
    parsed behind it, and a reader who opens the menu never sees an empty right-hand side.

    `highlights` is keyed by rayon slug, filled by `getCategoryHighlights` on hover and never
    evicted: six rayons is the ceiling and the panel lives as long as the page does. `inFlight`
    stops a pointer sweeping down the rail from firing six overlapping requests — the ref is
    checked and set synchronously, so it holds even though the state update behind it is not.
  */
  const [activeRayonSlug, setActiveRayonSlug] = useState<string>(NAV_TREE[0]?.slug ?? '');
  const [highlights, setHighlights] = useState<Record<string, Product[]>>({});
  const inFlight = useRef<Set<string>>(new Set());

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);
  const hoverTrigger = useRef(false);
  const hoverDropdown = useRef(false);

  useEffect(() => {
    if (ssrCategories.length === 0) {
      getCategories().then(setCategories).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Covers, by slug. An API rayon with no node in the tree is simply never looked up — the tree
     decides what is navigable, the API only decorates it. */
  const coverBySlug = new Map<string, string | undefined>(
    categories.map((c) => [String(c.slug ?? '').trim(), c.cover])
  );

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
    Hovering a rayon switches the pane AND the strip. The fetch is fired once per rayon per page;
    every later hover is a cache read, which is what keeps "more alive" from meaning "one request
    per pointer movement".
  */
  const loadHighlights = useCallback((slug: string) => {
    if (!slug || highlights[slug] || inFlight.current.has(slug)) return;
    inFlight.current.add(slug);
    getCategoryHighlights(slug, 4)
      .then((rows: Product[]) => setHighlights((prev) => ({ ...prev, [slug]: rows })))
      .finally(() => inFlight.current.delete(slug));
  }, [highlights]);

  const selectRayon = useCallback((slug: string) => {
    setActiveRayonSlug(slug);
    loadHighlights(slug);
  }, [loadHighlights]);

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
  }, [isOpen, syncMenuTop]);

  /*
    THE STRIP IS FETCHED ON OPEN, NOT AT MOUNT. `/all_products` is a real request and every page of
    this site would otherwise pay for it to populate a panel most visitors never open. The tree is
    already on screen by then — it is static — so nothing the crawler needs waits on this.
  */
  useEffect(() => {
    if (!isOpen) return;
    loadHighlights(activeRayonSlug);
  }, [isOpen, activeRayonSlug, loadHighlights]);

  /*
    ── 120ms OF INTENT BEFORE A FULL-WIDTH PANEL APPEARS ─────────────────────────────────────
    `open()` was called synchronously from `onMouseEnter`. There was a 200ms CLOSE delay and no
    open delay at all — so a pointer merely travelling across the nav row to reach CONTACT
    detonated a 1,344px curtain on the way past. 120ms is below the threshold where a deliberate
    hover feels laggy and above the time a pointer spends crossing a 90px label.

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

      {/**
       * ── THE PANEL, LIGHT AND FULL-WIDTH (owner, 20/08/2026) ───────────────────────────────
       * *"the dropdown of the shop looks kind of dark with a dark background of the slider, that's
       * so bad… the tabs inside it look AI generated… the border left of Santé & Vitalité looks
       * super noob. Change the design, make it pro and fit the design of the landing page, like
       * Impact made it — clean, easy and simple. Use the full width."*
       *
       * `bg-elevated`, not a near-black slab: the panel opens directly over the hero slider, which
       * is a dark photograph, so a near-black card on a near-black image is two dark masses with a
       * hairline between them. tokens.css v6 also asks for dark to arrive as OBJECTS inside a ~12%
       * painted-area budget, never as a full-width surface.
       *
       * The active rayon is marked by a TILE — the row takes the pane's own surface, so it reads as
       * physically continuous with the panel it controls — plus a hairline (which carries it in dark
       * theme, where the fill delta is only 1.14:1), brand ink, and the chevron. Four redundant cues
       * instead of the one 2px orange bar the owner called noob.
       *
       * FULL WIDTH MEANS THE PAGE RAIL, NOT THE VIEWPORT: `min(96rem, 100vw - 4rem)` with `left`
       * tracking `max-w-site` is byte-for-byte the box the header content sits in
       * (`max-w-site mx-auto px-4 lg:px-8`), so the panel's edges line up with the logo above it
       * and the footer below it.
       *
       * `hidden`/`block` — NOT a conditional render. The whole taxonomy has to be in the served
       * HTML of every page whether or not anyone hovers; see the note at the top of this file.
       */}
      <div
        ref={dropdownRef}
        /*
          The 8px above is `pt-2` INSIDE this element rather than a gap in `top`, so the hover
          surface runs continuously from the label into the card. This wrapper must stay transparent
          and unstyled — it spans the full rail, and any fill on it paints a strip across the page.
        */
        /*
          `z-[60]`, NOT `z-[200]`. Losing the portal moved this element inside the header, and the
          header is `sticky top-0 z-50` — which establishes a stacking context. Every z-index in
          here is therefore scoped to that context: it orders the panel against the nav row and the
          search panel (`fixed inset-x-0 z-50`, also inside the header — hence 60, which clears
          it), and against nothing on the page. `z-[200]` still worked, but it read like a global
          winner and it is not one; the header's own z-50 is what puts all of this above the page.

          The page-level elements that outrank the header are the ones that should: the route
          loader and spinner at z-[9999], the quick-order drawer at z-[100], the gallery and label
          lightboxes at `fixed inset-0 z-50` (a tie the header loses on DOM order). All of those
          are modal surfaces the shopper opened deliberately, and none of them is reachable while
          the pointer is in the header opening this menu.
        */
        className={cn(
          'fixed left-4 z-[60] w-[min(96rem,calc(100vw-2rem))] pt-2 lg:left-[max(2rem,calc((100vw-100rem)/2+2rem))] lg:w-[min(96rem,calc(100vw-4rem))]',
          isOpen ? 'block' : 'hidden'
        )}
        style={{ top: 'var(--menu-top, 9.5rem)' }}
        onMouseEnter={() => { hoverDropdown.current = true; cancelClose(); }}
        onMouseLeave={() => { hoverDropdown.current = false; scheduleClose(); }}
      >
        <nav
          id="boutique-megamenu"
          aria-label="Rayons et catégories"
          /* `border-rule`, not `border-hairline`: on a white page a white card needs the heavier of
             the two boundary weights or its edge disappears into the canvas. */
          className="overflow-hidden rounded-2xl border border-rule bg-elevated shadow-card-hover"
        >
          <div
            className="flex overflow-y-auto overscroll-contain"
            style={{ maxHeight: 'calc(100vh - var(--menu-top, 9.5rem) - 1.5rem)' }}
          >
            {/* ── THE RAIL ────────────────────────────────────────────────────────────────── */}
            <div className="flex w-[15.5rem] shrink-0 flex-col bg-sunken py-2 xl:w-[17rem]">
              <ul aria-label="Rayons">
                {NAV_TREE.map((rayon) => {
                  const isActive = rayon.slug === activeRayonSlug;
                  const subCount = taxonomyDescendantCount(rayon);
                  const cover = coverBySlug.get(rayon.slug);
                  return (
                    <li key={rayon.slug}>
                      <LinkWithLoading
                        href={canonicalCategoryPath(rayon.slug)}
                        data-active={isActive}
                        /*
                          HOVER SELECTS, CLICK NAVIGATES — a rayon is a real page and this menu's
                          SEO value is that its rows are crawlable links. `onFocus` gives a
                          keyboard reader the same behaviour with no second control to tab past.

                          `aria-controls` names the pane this row reveals. All six panes are in the
                          DOM at once now, five of them `hidden`, so without this the relationship
                          between a rail row and the pane it swaps in is stated nowhere — the ids
                          were being written and referenced by nothing.
                        */
                        aria-controls={`megamenu-rayon-${rayon.slug}`}
                        aria-expanded={isActive}
                        className="group mx-2 flex min-h-[56px] items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-hairline hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus data-[active=true]:border-hairline data-[active=true]:bg-elevated"
                        loadingMessage="Chargement..."
                        onMouseEnter={() => selectRayon(rayon.slug)}
                        onFocus={() => selectRayon(rayon.slug)}
                        onClick={close}
                      >
                        <span className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                          {cover ? (
                            <Image
                              src={getStorageUrl(cover)}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-ink-3" aria-hidden="true">
                              {taxonomyLabel(rayon.slug).charAt(0)}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block whitespace-normal font-display text-[12.5px] font-bold uppercase leading-tight tracking-[0.04em] text-ink-1 transition-colors group-hover:text-brand group-data-[active=true]:text-brand">
                            {navLabel(rayon.slug)}
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
                  {NAV_TREE.length} rayons · {NAV_CATEGORY_COUNT} catégories
                </p>
              </div>
            </div>

            {/* ── THE PANES, ALL SIX OF THEM ────────────────────────────────────────────────
                `min-h` matches the rail's six 56px rows plus its CTA, so the panel never shrinks
                below its own navigation when a short rayon is selected. A box that changes height
                as the pointer travels down the rail is the same fault as a menu that moves its
                links.

                One pane per rayon, all in the DOM, five of them `hidden`. `hidden` is display:none,
                which is exactly right here: the anchors stay in the document for a crawler to
                follow, the covers and packshots inside them stay lazy and never fetch, and assistive
                technology is not handed five panes it cannot see. */}
            <div className="min-w-0 flex-1">
              {NAV_TREE.map((rayon) => {
                const children = rayon.children ?? [];
                const rows = highlights[rayon.slug] ?? [];
                const cover = coverBySlug.get(rayon.slug);
                return (
                  <div
                    key={rayon.slug}
                    id={`megamenu-rayon-${rayon.slug}`}
                    className={cn(
                      'min-h-[25rem] min-w-0 flex-col p-6',
                      rayon.slug === activeRayonSlug ? 'flex' : 'hidden'
                    )}
                  >
                    <div className="flex items-center justify-between gap-4 border-b border-hairline pb-3">
                      {/*
                        A <p>, NOT an <h2> — and the reason is the whole point of this component.
                        All six panes are now in the served HTML of every page on the site, so an
                        <h2> here is not one heading in an open menu, it is SIX headings in the
                        header of every URL, ahead of that page's own <h1>: a creatine listing
                        would announce PROTÉINES, PRISE DE MASSE, PERFORMANCE, PERTE DE POIDS,
                        SANTÉ & VITALITÉ and ÉQUIPEMENT before it said "Créatine en Tunisie".
                        The panel states the taxonomy through its LINKS; it must not also claim
                        six headings in every page's document outline. The <nav aria-label> and
                        the <ul aria-label> below carry the accessible naming instead.
                      */}
                      <p className="min-w-0 truncate font-display text-[15px] font-bold uppercase tracking-[0.04em] text-ink-1">
                        {taxonomyLabel(rayon.slug)}
                      </p>
                      <LinkWithLoading
                        href={canonicalCategoryPath(rayon.slug)}
                        className="-my-2 inline-flex shrink-0 items-center gap-1.5 rounded py-2 text-[13px] font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        loadingMessage="Chargement..."
                        onClick={close}
                      >
                        {categoryAnchor(rayon.slug, 'Tout voir')}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </LinkWithLoading>
                    </div>

                    {isSparseRayon(rayon) ? (
                      <div className="flex min-h-0 flex-1 flex-col py-4">
                        <ul
                          className={cn(
                            'grid content-start gap-3',
                            children.length === 1 && 'grid-cols-1',
                            children.length === 2 && 'grid-cols-2',
                            children.length === 3 && 'grid-cols-3',
                            children.length === 4 && 'grid-cols-2'
                          )}
                        >
                          {children.map((sub) => (
                            <li key={sub.slug}>
                              <LinkWithLoading
                                href={canonicalCategoryPath(sub.slug)}
                                className="group flex min-h-[72px] items-center justify-between gap-3 rounded-xl border border-hairline bg-sunken px-4 py-3 transition-colors hover:border-brand hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                loadingMessage="Chargement..."
                                onClick={close}
                              >
                                <span className="min-w-0">
                                  <span className="block whitespace-normal font-display text-[15px] font-semibold leading-snug text-ink-1 transition-colors group-hover:text-brand">
                                    {navLabel(sub.slug)}
                                  </span>
                                  <span className="mt-1 block text-[11.5px] leading-none text-ink-3">
                                    Découvrir
                                  </span>
                                </span>
                                <ArrowRight
                                  className="h-4 w-4 shrink-0 text-ink-3 transition-colors group-hover:text-brand"
                                  aria-hidden="true"
                                />
                              </LinkWithLoading>
                            </li>
                          ))}
                        </ul>

                        <LinkWithLoading
                          href={canonicalCategoryPath(rayon.slug)}
                          className="group mt-4 flex min-h-[104px] flex-1 overflow-hidden rounded-xl border border-hairline bg-elevated transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                          loadingMessage="Chargement..."
                          onClick={close}
                          aria-label={`Voir tous les produits ${taxonomyLabel(rayon.slug)}`}
                        >
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-5 p-5">
                            <span className="min-w-0">
                              <span className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
                                Tout le rayon
                              </span>
                              <span className="mt-2 block font-display text-xl font-bold uppercase leading-tight text-ink-1">
                                {taxonomyLabel(rayon.slug)}
                              </span>
                              <span className="mt-2 inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink-2 transition-colors group-hover:text-brand">
                                Voir tous les produits
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                              </span>
                            </span>
                          </span>
                          <span className="relative w-52 shrink-0 overflow-hidden bg-sunken xl:w-64">
                            {cover ? (
                              <Image
                                src={getStorageUrl(cover)}
                                alt=""
                                fill
                                sizes="(min-width: 1280px) 256px, 208px"
                                className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-ink-3" aria-hidden="true">
                                {taxonomyLabel(rayon.slug).charAt(0)}
                              </span>
                            )}
                          </span>
                        </LinkWithLoading>
                      </div>
                    ) : (
                      /* THE DENSE PANE. Declared order is kept exactly as `catalogTaxonomy` writes
                         it, because that order is the order a crawler reads the links in — within
                         a rayon the pages carrying commercial intent come first. A child that has
                         children of its own becomes a GROUP: heading link plus a nested list. */
                      <ul
                        aria-label={`Catégories ${taxonomyLabel(rayon.slug)}`}
                        className="grid grid-cols-2 content-start items-start gap-x-6 pt-2 lg:grid-cols-3 2xl:grid-cols-4"
                      >
                        {children.map((child) => (
                          <li key={child.slug}>
                            {child.children?.length ? (
                              <GroupBlock group={child} onNavigate={close} />
                            ) : (
                              <LeafLink slug={child.slug} onNavigate={close} />
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/*
                      ── THE POPULAR STRIP ───────────────────────────────────────────────────
                      Was a single 224px column pinned to the right of the panel, showing ONE
                      product — and until 20/08 the same product beside every rayon, because
                      nothing in this file reacted to where the pointer was.

                      Horizontal, at the foot of the pane, is what the extra 128px of width bought:
                      three products instead of one, each with its packshot, in the space a single
                      portrait card used to occupy. `getCategoryHighlights` fetches once per rayon
                      per page, so a pass down the whole rail is six small requests and every hover
                      after that is a cache read.
                    */}
                    <div className="mt-auto border-t border-hairline pt-4">
                      <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">
                        Populaire dans ce rayon
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {(rows.length > 0 ? rows : Array.from({ length: 3 }).map(() => null)).slice(0, 3).map((p, i) => {
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
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
