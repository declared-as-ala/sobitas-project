'use client';

import { categoryAnchor } from '@/util/categoryAnchor';
import { canonicalCategoryPath } from '@/util/resolveCategorySeo';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronRight, ChevronLeft, X, ArrowRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';
import { Button } from '@/app/components/ui/button';
import { navTaxonomy, taxonomyDescendantCount, taxonomyLabel, type TaxonomyNode } from '@/config/catalogTaxonomy';

interface MobileProductsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ── THE PHONE STATES THE SAME TREE AS THE DESKTOP MEGA-MENU ─────────────────────────────────
 * This sheet used to render `GET /api/categories` directly: six rayons, then whatever flat list of
 * `sous_categories` the back office happened to hold, labelled with the raw `designation_fr` the
 * catalogue stores (shouted, with trailing spaces — "PROTÉINES "). Two consequences:
 *
 *   1. It disagreed with the desktop panel about what the catalogue's shape IS. `acides-amines`
 *      appeared as a SIBLING of `bcaa` and `eaa` rather than their parent, and `glutamine` / `hmb`
 *      appeared under Santé & vitalité rather than with the amino acids.
 *   2. Ten listings whose every product is out of stock took up ten of the rows a phone has room
 *      for, which is the scarcest navigation surface on the site.
 *
 * `navTaxonomy()` is the same pruned tree the header reads (src/config/catalogTaxonomy.ts), so the
 * two surfaces cannot drift again, and it is static data — no fetch, no skeletons, no empty state.
 * A GROUP (`Acides aminés`, `Vitamines & minéraux`) is a real page AND a parent: its heading is a
 * link and its children are listed, indented, beneath it.
 *
 * Labels: `categoryAnchor(slug, taxonomyLabel(slug))` — the declared commercial anchor where one
 * exists, the declared taxonomy label otherwise, and the raw API string never.
 */
const NAV_TREE: TaxonomyNode[] = navTaxonomy();

function navLabel(slug: string): string {
  return categoryAnchor(slug, taxonomyLabel(slug));
}

export function MobileProductsMenu({ open, onOpenChange }: MobileProductsMenuProps) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const [selectedRayon, setSelectedRayon] = useState<TaxonomyNode | null>(null);

  const handleClose = () => {
    setSelectedRayon(null);
    onOpenChange(false);
  };

  // Close on route change (navigation completed)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (open) {
        onOpenChange(false);
        setSelectedRayon(null);
      }
    }
  }, [pathname, open, onOpenChange]);

  useEffect(() => {
    if (!open) setSelectedRayon(null);
  }, [open]);

  /*
   * Do not add the sheet to `window.history`.
   *
   * The old implementation pushed a second entry with the SAME URL whenever this menu opened.
   * Navigating from the menu therefore produced A → A → B. Chrome Back correctly moved from B
   * to the duplicate A entry, but the address and page did not visibly change on the following
   * step, which made Back look broken. In some route-change timings the cleanup also called
   * history.back() while Next was navigating, creating an additional race.
   *
   * The sheet already has explicit close and category-return controls plus Radix's Escape handling.
   * Keeping overlays out of browser history makes every native Back action represent a real page.
   */

  const children = selectedRayon?.children ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="left-0 right-0 mx-0 w-full h-[90dvh] max-h-[90dvh] rounded-t-2xl p-0 flex flex-col overflow-hidden z-[60] border-t-2 border-brand"
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
            <div className="w-10 h-1 rounded-full bg-rule" />
          </div>

          {/* Header */}
          <SheetHeader className="px-4 py-2 border-b border-hairline shrink-0">
            <div className="flex items-center gap-2 min-h-[44px]">
              {selectedRayon ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedRayon(null)}
                  className="h-11 w-11 shrink-0 -ml-1 rounded-full hover:bg-sunken hover:text-brand"
                  aria-label="Retour aux rayons"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <span className="w-11 shrink-0" aria-hidden />
              )}

              <SheetTitle className="flex-1 text-center font-display uppercase tracking-tight text-ink-1 line-clamp-1 px-1">
                {selectedRayon ? (
                  <span className="text-brand text-sm">{taxonomyLabel(selectedRayon.slug)}</span>
                ) : (
                  'Nos produits'
                )}
              </SheetTitle>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                /* 44, not 40 — the site's close-control size. */
                className="h-11 w-11 shrink-0 -mr-1 rounded-full hover:bg-sunken"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Scrollable content. No loading branch: the tree is static config, so there is never a
              frame where this sheet does not know what the catalogue contains. */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            {!selectedRayon ? (
              /* ── LEVEL 1 — the six rayons ── */
              <ul className="px-3 pt-3 pb-4 space-y-2">
                {NAV_TREE.map((rayon) => {
                  const subCount = taxonomyDescendantCount(rayon);
                  return (
                    <li key={rayon.slug}>
                      <button
                        type="button"
                        onClick={() => setSelectedRayon(rayon)}
                        aria-label={`Afficher les catégories ${taxonomyLabel(rayon.slug)}`}
                        className="w-full min-h-[56px] flex items-center gap-3 py-3 px-4 text-left bg-elevated active:bg-sunken rounded-xl border border-hairline shadow-card transition-colors"
                      >
                        <span className="h-2 w-2 rounded-full bg-brand flex-shrink-0" aria-hidden />
                        <span className="flex-1 min-w-0">
                          <span className="block font-display text-caption tracking-wide text-brand uppercase leading-snug">
                            {taxonomyLabel(rayon.slug)}
                          </span>
                          <span className="block text-xs text-ink-3 mt-0.5">
                            {subCount} catégorie{subCount > 1 ? 's' : ''}
                          </span>
                        </span>
                        <ChevronRight className="h-5 w-5 text-ink-3 shrink-0" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              /* ── LEVEL 2 AND 3 — the rayon's children, with groups stating their own ── */
              <div>
                <div className="px-3 pt-3 pb-2">
                  <LinkWithLoading
                    href={canonicalCategoryPath(selectedRayon.slug)}
                    className="min-h-[52px] flex items-center justify-between gap-3 py-3 px-4 bg-brand/10 border border-brand/30 rounded-xl text-brand font-semibold text-sm active:bg-brand/20 transition-colors"
                    loadingMessage="Chargement..."
                  >
                    <span className="min-w-0">
                      {categoryAnchor(selectedRayon.slug, `Tout voir — ${taxonomyLabel(selectedRayon.slug)}`)}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </LinkWithLoading>
                </div>

                <ul className="px-3 pb-4 space-y-1.5">
                  {children.map((child) => {
                    const grandChildren = child.children ?? [];

                    /* A LEAF: one row, one destination. */
                    if (grandChildren.length === 0) {
                      return (
                        <li key={child.slug}>
                          <LinkWithLoading
                            href={canonicalCategoryPath(child.slug)}
                            className="min-h-[52px] flex items-center gap-3 py-3 px-4 bg-elevated active:bg-sunken rounded-xl border border-hairline shadow-card transition-colors"
                            loadingMessage="Chargement..."
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" aria-hidden />
                            <span className="flex-1 min-w-0 text-sm font-medium text-ink-1 leading-snug">
                              {navLabel(child.slug)}
                            </span>
                            <ChevronRight className="h-4 w-4 text-ink-3 shrink-0" aria-hidden />
                          </LinkWithLoading>
                        </li>
                      );
                    }

                    /* A GROUP: the heading is itself a page, so it is a LINK, and the third level
                       is listed under it rather than hidden behind another drill-in. Two taps to
                       reach `/bcaa` on a phone, and the relationship to `/acides-amines` is on
                       screen while you make the second one. */
                    return (
                      <li key={child.slug} className="rounded-xl border border-hairline bg-elevated shadow-card overflow-hidden">
                        <LinkWithLoading
                          href={canonicalCategoryPath(child.slug)}
                          className="min-h-[52px] flex items-center gap-3 py-3 px-4 border-b border-hairline active:bg-sunken transition-colors"
                          loadingMessage="Chargement..."
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" aria-hidden />
                          <span className="flex-1 min-w-0 font-display text-caption uppercase tracking-wide text-brand leading-snug">
                            {navLabel(child.slug)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-ink-3 shrink-0" aria-hidden />
                        </LinkWithLoading>
                        <ul className="px-2 py-1">
                          {grandChildren.map((leaf) => (
                            <li key={leaf.slug}>
                              <LinkWithLoading
                                href={canonicalCategoryPath(leaf.slug)}
                                className="min-h-11 flex items-center gap-3 px-2 rounded-lg active:bg-sunken transition-colors"
                                loadingMessage="Chargement..."
                              >
                                <span className="h-px w-3 shrink-0 bg-rule" aria-hidden />
                                <span className="flex-1 min-w-0 text-sm text-ink-2 leading-snug">
                                  {navLabel(leaf.slug)}
                                </span>
                              </LinkWithLoading>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Sticky footer CTA — always reachable */}
          <div className="shrink-0 border-t border-hairline bg-elevated px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <LinkWithLoading
              href="/shop"
              className="flex min-h-[48px] items-center justify-center gap-2 py-3 px-4 bg-brand hover:bg-brand-hover text-on-brand rounded-xl font-display uppercase tracking-wide font-semibold text-sm transition-colors shadow-card"
              loadingMessage="Chargement..."
            >
              Voir tous les produits
              <ArrowRight className="h-4 w-4" aria-hidden />
            </LinkWithLoading>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
