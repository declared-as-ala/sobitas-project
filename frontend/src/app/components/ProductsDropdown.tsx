'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronDown, ArrowRight, ShoppingBag } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getCategories } from '@/services/api';
import { useSiteChrome } from '@/contexts/SiteChromeContext';
import { Category } from '@/types';

type ProductsDropdownProps = {
  label?: string;
  href?: string;
  opensNewTab?: boolean;
};

function canPrefetch(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
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
  const [dropdownTop, setDropdownTop] = useState(0);
  const [mounted, setMounted] = useState(false);
  // Server-fetched categories (root layout → SiteChromeProvider): the mega-menu is populated
  // without a client API call; fetch-on-mount remains only as fallback when SSR data is empty.
  const { categories: ssrCategories } = useSiteChrome();
  const [categories, setCategories] = useState<Category[]>(ssrCategories);

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
      /* `border-t border-hairline`, not the old `border-t-2 border-red-600`. A 2px brand rule
         directly under a header that already carries a 2px brand underline on the active item
         read as two competing edges 4px apart. The panel is separated by its shadow and its
         elevated surface, which is how every other overlay on this site separates itself. */
      className="fixed left-0 right-0 z-[200] w-full border-b border-t border-hairline bg-elevated shadow-2xl"
      style={{ top: `${dropdownTop}px`, maxHeight: 'calc(100vh - 80px)' }}
      onMouseEnter={() => { hoverDropdown.current = true; cancelClose(); }}
      onMouseLeave={() => { hoverDropdown.current = false; scheduleClose(); }}
    >
      <div className="mx-auto max-h-[calc(100vh-80px)] max-w-site overflow-y-auto overscroll-contain px-4 py-8 lg:px-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-8 gap-y-8">
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
                  /* `pb-2 border-b border-hairline` replaces the floating 32px red dash. A rule
                     that spans the column groups the list under its heading; a 32px stub under a
                     140px word is decoration that points at nothing. */
                  className="group mb-3 flex items-center justify-between gap-2 border-b border-hairline pb-2 font-display text-[13px] font-bold uppercase leading-snug tracking-[0.06em] text-ink-1 transition-colors hover:text-brand"
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
                  {subs.map((sub) => (
                    <li key={sub.id}>
                      <LinkWithLoading
                        href={`/${sub.slug}`}
                        /* `-mx-2 px-2` pulls the hover surface out to the column edge so the row
                           highlight aligns with the heading rule above it rather than being inset
                           by its own padding. */
                        className="-mx-2 block truncate rounded-md px-2 py-1.5 text-[13px] leading-snug text-ink-2 transition-colors hover:bg-sunken hover:text-brand"
                        loadingMessage="Chargement..."
                        onMouseEnter={() => router.prefetch(`/${sub.slug}`)}
                        onClick={close}
                      >
                        {sub.designation_fr}
                      </LinkWithLoading>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-hairline pt-5">
          <p className="text-xs text-ink-3">
            {categories.length > 0
              ? `${categories.length} rayons · ${categories.reduce((n, c) => n + (c.sous_categories?.length ?? 0), 0)} catégories`
              : 'Toute la gamme'}
          </p>
          <LinkWithLoading
            href={href}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-elevated"
            loadingMessage="Chargement de la boutique..."
            onMouseEnter={prefetchShop}
            onClick={close}
            {...targetProps}
          >
            Voir tous les produits
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </LinkWithLoading>
        </div>
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
        /* In lockstep with the sibling nav links in HeaderClient.tsx (icon + label, 14px, ink
           #111827, orange #FF5A00 hover/active + 2px underline) — this is the one nav item that
           renders through a different component, so it has to mirror their styling by hand. */
        className={cn(
          // Mirrors the sibling nav links' shared underline vocabulary (HeaderClient.tsx): a 2px
          // accent bar that wipes in on hover and stays pinned when active. Desktop-only row, so the
          // 300ms after: transition is never hit by the mobile 0.2s clamp.
          'group relative inline-flex items-center gap-1.5 h-full text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100',
          active ? 'text-brand after:scale-x-100' : 'text-ink-1 dark:text-gray-200 hover:text-brand'
        )}
        loadingMessage="Chargement de la boutique..."
        onMouseEnter={prefetchShop}
        {...(active ? { 'aria-current': 'page' as const } : {})}
        {...targetProps}
      >
        <ShoppingBag className="h-4 w-4" aria-hidden />
        <span>{label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </LinkWithLoading>

      {mounted && typeof window !== 'undefined' && dropdownContent &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
}
