'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getCategories, getNewProducts, getStorageUrl } from '@/services/api';
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
 * How many sub-categories a column lists before it stops and points at the rayon instead.
 *
 * ── WHY THERE IS A CAP AT ALL ───────────────────────────────────────────────────────────────
 * The taxonomy is wildly uneven: SANTÉ & VITALITÉ has 21 sub-categories and PERTE DE POIDS has 3.
 * Uncapped, the first column sets the height of the whole panel, so the menu opened 900px tall
 * with 700px of empty space beside a three-item column — and the "Voir tous les produits" link at
 * the bottom of it was BELOW THE FOLD on a 900px viewport, reachable only by scrolling inside a
 * panel that closes when the pointer leaves it. That is the state the owner was looking at.
 *
 * Five, since 18/08. Eight was chosen while the panel was a full-width band six columns across;
 * in a contained panel three columns wide, six rayons make TWO rows, and eight rows of links in
 * each would put the panel back over the fold it was shortened to clear. Five sub-categories plus
 * a "+N autres" is what makes two rows of rayons fit in ~430px.
 *
 * ── WHAT IS LOST, AND WHY IT IS ACCEPTABLE ──────────────────────────────────────────────────
 * Twenty-one of the fifty-five sub-category links leave this menu, and this menu is on every page,
 * so those are sitewide internal links. They are NOT deleted from the site: each column's overflow
 * becomes a link to the rayon, whose own page lists every sub-category it holds, so every one of
 * them stays reachable one hop deeper and stays in the sitemap. Boilerplate navigation links are
 * also the kind Google discounts most. A menu that fits the screen is worth one hop.
 */
const MAX_SUBS_PER_COLUMN = 5;

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
  const [dropdownTop, setDropdownTop] = useState(0);
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
  const [feature, setFeature] = useState<Product | null>(null);
  const [featureFailed, setFeatureFailed] = useState(false);
  const featureLoaded = useRef(false);

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

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!hoverTrigger.current && !hoverDropdown.current) setIsOpen(false);
    }, 200);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const open = useCallback(() => {
    cancelClose();
    if (triggerRef.current) {
      setDropdownTop(triggerRef.current.getBoundingClientRect().bottom);
    }
    setIsOpen(true);
    if (!featureLoaded.current) {
      featureLoaded.current = true;
      getNewProducts()
        .then((list) => {
          const first = Array.isArray(list) ? list.find((p) => p?.id && p.cover) : null;
          if (first) setFeature(first);
          return first;
        })
        .then((first) => {
          if (!first) setFeatureFailed(true);
        })
        .catch(() => setFeatureFailed(true));
    }
  }, [cancelClose]);

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
      className="pt-slab fixed left-4 z-[200] w-[min(84rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-hairline shadow-2xl lg:left-8"
      style={{ top: `${dropdownTop + 8}px`, maxHeight: 'calc(100vh - 96px)' }}
      onMouseEnter={() => { hoverDropdown.current = true; cancelClose(); }}
      onMouseLeave={() => { hoverDropdown.current = false; scheduleClose(); }}
    >
      <div className="flex max-h-[calc(100vh-96px)] gap-8 overflow-y-auto overscroll-contain p-6">

        {/*
          ── THE LINKS, AND WHY THERE ARE STILL FIFTY-FIVE OF THEM ───────────────────────────
          The reference's panel lists seven items because seven is its whole taxonomy. Ours is six
          rayons and fifty-five sub-categories, and they are not decoration: this menu is on every
          page, so those are sitewide internal links into the exact category pages the SEO plan is
          trying to rank.

FIXED COLUMN COUNTS, not `auto-fit`. The auto-fit version silently changed its own
          count with the width it was handed — six at 1920, five at 1536 — which is how it came to
          wrap onto a second row on the owner's screen and nowhere in the guard's screenshots.

          Six across from `xl` and three below it, and both are exact: at 1,344px the left region
          is ~1,067px, so six columns with a 16px gap are 164px each, which holds the longest label
          in the taxonomy ("Barres & Snacks Protéinés", ~145px at 12.5px) without truncating. Below
          `xl` the panel is clamped by the viewport instead, and three columns of ~200px is the
          same trade made the other way round.
        */}
        <div className="min-w-0 flex-1">
          <p className="mb-4 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">
            Catégories
          </p>

          <div className="grid grid-cols-3 gap-x-4 gap-y-6 xl:grid-cols-6">
            {categories.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="min-w-0" role="status" aria-label="Chargement des catégories">
                  <Skeleton className="mb-3 h-3.5 w-28" />
                  <div className="space-y-2.5">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-3 w-20" />
                    ))}
                  </div>
                </div>
              ))
            ) : categories.map((cat) => {
              const subs = (cat.sous_categories ?? []) as Array<{ id: number; slug: string; designation_fr: string }>;
              return (
                <div key={cat.id} className="min-w-0">
                  <LinkWithLoading
                    href={`/${cat.slug}`}
                    className="group mb-2.5 flex items-center justify-between gap-2 border-b border-hairline pb-2 font-display text-[12px] font-bold uppercase leading-snug tracking-[0.06em] text-ink-1 transition-colors hover:text-brand"
                    loadingMessage="Chargement..."
                    onMouseEnter={() => router.prefetch(`/${cat.slug}`)}
                    onClick={close}
                  >
                    <span className="min-w-0 truncate">{cat.designation_fr}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-brand opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </LinkWithLoading>

                  <ul className="space-y-0.5">
                    {subs.slice(0, MAX_SUBS_PER_COLUMN).map((sub) => (
                      <li key={sub.id}>
                        <LinkWithLoading
                          href={`/${sub.slug}`}
                          /* `-mx-2 px-2` pulls the hover surface out to the column edge so the row
                             highlight aligns with the heading rule above it rather than being
                             inset by its own padding. */
                          className="-mx-2 block truncate rounded-md px-2 py-1 text-[12.5px] leading-snug text-ink-2 transition-colors hover:bg-sunken hover:text-brand"
                          loadingMessage="Chargement..."
                          onMouseEnter={() => router.prefetch(`/${sub.slug}`)}
                          onClick={close}
                        >
                          {sub.designation_fr}
                        </LinkWithLoading>
                      </li>
                    ))}
                    {subs.length > MAX_SUBS_PER_COLUMN && (
                      <li>
                        {/* The overflow, as a link to the rayon rather than as a truncation notice.
                            "+13 autres" states the count so the reader knows the list is not the
                            whole shelf, and pressing it lands on the page that lists all of them. */}
                        <LinkWithLoading
                          href={`/${cat.slug}`}
                          className="-mx-2 block truncate rounded-md px-2 py-1 text-[12.5px] font-semibold leading-snug text-ink-3 transition-colors hover:bg-sunken hover:text-brand"
                          loadingMessage="Chargement..."
                          onMouseEnter={() => router.prefetch(`/${cat.slug}`)}
                          onClick={close}
                        >
                          +{subs.length - MAX_SUBS_PER_COLUMN} autres
                        </LinkWithLoading>
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>

          {/*
            A TEXT LINK, not the filled pill it was. That pill was the only button in the panel and
            it sat at the far end of a list of fifty-five links, competing with nothing — while the
            reference puts a quiet "View All Products →" under its list and spends its one filled
            button on the promoted product. That is the better allocation and it is the one used
            here: the way out is a link, and the card's "Acheter" is the button.
          */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline pt-4">
            <LinkWithLoading
              href={href}
              className="-mx-2 inline-flex min-h-[44px] items-center gap-2 px-2 text-[14px] font-semibold text-brand transition-colors hover:text-brand-hover"
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
          ── THE PROMOTED PRODUCT ────────────────────────────────────────────────────────────
          `lg` and up. Below that the panel is clamped by the viewport and every pixel the card
          takes comes off the links beside it, so it stands down rather than squeezing them.

          ── THE COLUMN IS MOUNTED BEFORE ITS CONTENTS EXIST, ON PURPOSE ─────────────────────
          The first version rendered this whole <aside> only once the product had arrived, which
          looked correct and was not: the category grid is `flex-1`, so the aside appearing ~400ms
          after the panel opened narrowed all six columns AT THE MOMENT the reader's pointer was
          travelling towards one of them. A menu that moves its own links out from under the cursor
          is worse than a menu with a placeholder in it.

          So the 264px and the divider are reserved from the first frame and only the CARD waits.
          The one case that still collapses the column is a failed fetch, which is the right
          trade: reflowing once on an exception beats reflowing once on every first open.
        */}
        {!featureFailed && (
          <aside className="hidden w-[196px] shrink-0 border-s border-hairline ps-8 lg:block">
            <p className="mb-4 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">
              Nouveauté
            </p>

            {!feature ? (
              <div className="flex flex-col gap-3" role="status" aria-label="Chargement de la nouveauté">
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
                    `bg-elevated` here and NOWHERE else in this panel, and the distinction is the
                    one the trap in the docblock above is about. `--slab-elevated` is white — a
                    PLATE, the punch-out moment — and that is exactly right for a packshot frame,
                    which carries no text and whose photographs are shot on white anyway. It would
                    be wrong for anything a reader has to read, which is why the name, the price
                    and the button below sit on the slab itself.
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
                      sizes="196px"
                      className="object-contain p-3"
                    />
                  </LinkWithLoading>

                  <LinkWithLoading
                    href={link}
                    className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink-1 transition-colors hover:text-brand"
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
                      lightened accent, so this button and the header CTA 40px above it are the
                      same colour — measured, both rgb(208,59,4). See --brand-core in tokens.css.

                      The border is not decoration. WCAG 1.4.11 wants 3:1 between a control and
                      what surrounds it, and measured on the built page the deep orange sits at
                      3.95:1 on the light-theme panel but 2.93:1 on the dark one, where the slab
                      canvas lifts to ~#252528. `border-brand` is the slab accent (#FF8A4C, 8.25:1
                      on the panel), so the boundary is carried by the edge in BOTH themes and the
                      fill is free to be the brand colour rather than whatever measures. */}
                  {/* Previously: `text-on-brand` on a slab is near-black on
                      #FF8A4C — 8.47:1. White on that same orange is 3.55:1 and FAILS, which is why
                      this is a token and not a literal. */}
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
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={triggerRef}
      className="relative h-full flex items-center"
      onMouseEnter={() => { hoverTrigger.current = true; open(); }}
      onMouseLeave={() => { hoverTrigger.current = false; scheduleClose(); }}
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
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </LinkWithLoading>

      {mounted && typeof window !== 'undefined' && dropdownContent &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
}
