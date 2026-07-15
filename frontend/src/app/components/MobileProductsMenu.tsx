'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronRight, ChevronLeft, X, ArrowRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Button } from '@/app/components/ui/button';
import { getCategories } from '@/services/api';
import { useSiteChrome } from '@/contexts/SiteChromeContext';
import { Category } from '@/types';

interface MobileProductsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileProductsMenu({ open, onOpenChange }: MobileProductsMenuProps) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  // Server-fetched categories (root layout → SiteChromeProvider): populated without a client
  // API call; fetch-on-mount remains only as fallback when SSR data is empty.
  const { categories: ssrCategories } = useSiteChrome();
  const [categories, setCategories] = useState<Category[]>(ssrCategories);
  const [loading, setLoading] = useState(ssrCategories.length === 0);

  useEffect(() => {
    if (ssrCategories.length > 0) return;
    getCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setSelectedCategory(null);
    onOpenChange(false);
  };

  // Close on route change (navigation completed)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (open) {
        onOpenChange(false);
        setSelectedCategory(null);
      }
    }
  }, [pathname, open, onOpenChange]);

  useEffect(() => {
    if (!open) setSelectedCategory(null);
  }, [open]);

  const closedByBackRef = useRef(false);

  useEffect(() => {
    if (!open) { closedByBackRef.current = false; return; }
    closedByBackRef.current = false;
    const id = 'mobile-products-menu-' + Date.now();
    window.history.pushState({ [id]: true }, '');
    const onPopState = () => { closedByBackRef.current = true; onOpenChange(false); };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (!closedByBackRef.current && window.history.state?.[id]) window.history.back();
    };
  }, [open, onOpenChange]);

  const subCategories = (selectedCategory?.sous_categories ?? []) as Array<{ id: number; slug: string; designation_fr: string }>;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="left-0 right-0 mx-0 w-full h-[90dvh] max-h-[90dvh] rounded-t-2xl p-0 flex flex-col overflow-hidden z-[60] border-t-2 border-red-600"
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Header */}
          <SheetHeader className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="flex items-center gap-2 min-h-[44px]">
              {selectedCategory ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCategory(null)}
                  className="h-10 w-10 shrink-0 -ml-1 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600"
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <span className="w-10 shrink-0" aria-hidden />
              )}

              <SheetTitle className="flex-1 text-center font-display uppercase tracking-tight text-gray-900 dark:text-white line-clamp-1 px-1">
                {selectedCategory ? (
                  <span className="text-red-600 dark:text-red-400 text-sm">{selectedCategory.designation_fr}</span>
                ) : (
                  'Nos Produits'
                )}
              </SheetTitle>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-10 w-10 shrink-0 -mr-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">

            {/* Loading state — skeletons shaped like the category rows */}
            {loading ? (
              <div className="px-3 pt-3 pb-1 space-y-2" role="status" aria-label="Chargement des catégories">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-2 h-2 rounded-full" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-2.5 w-20 ml-4" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded ml-3 shrink-0" />
                  </div>
                ))}
                <span className="sr-only">Chargement des catégories…</span>
              </div>
            ) : (
              <>
                {!selectedCategory ? (
                  /* ── Category list ── */
                  <div className="px-3 pt-3 pb-4 space-y-2">
                    {categories.map((cat) => {
                      const subCount = cat.sous_categories?.length ?? 0;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat)}
                          className="w-full min-h-[56px] flex items-center gap-3 py-3 px-4 text-left bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors"
                        >
                          <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden />
                          <div className="flex-1 min-w-0">
                            <span className="block font-display text-caption tracking-wide text-red-600 dark:text-red-400 uppercase leading-snug">
                              {cat.designation_fr}
                            </span>
                            {subCount > 0 && (
                              <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {subCount} sous-catégorie{subCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* ── Subcategory list ── */
                  <div>
                    {/* "Tout voir" for the parent category */}
                    <div className="px-3 pt-3 pb-2">
                      <LinkWithLoading
                        href={`/${selectedCategory.slug}`}
                        className="min-h-[52px] flex items-center justify-between gap-3 py-3 px-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 font-semibold text-sm active:bg-red-100 dark:active:bg-red-950/50 transition-colors"
                        loadingMessage="Chargement..."
                      >
                        <span className="min-w-0 truncate">Tout voir — {selectedCategory.designation_fr}</span>
                        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                      </LinkWithLoading>
                    </div>

                    {/* Subcategory items — slug comes directly from API */}
                    {subCategories.length > 0 ? (
                      <div className="px-3 pb-4 space-y-1.5">
                        {subCategories.map((sub) => (
                          <LinkWithLoading
                            key={sub.id}
                            href={`/${sub.slug}`}
                            className="min-h-[52px] flex items-center gap-3 py-3 px-4 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors"
                            loadingMessage="Chargement..."
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" aria-hidden />
                            <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                              {sub.designation_fr}
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" aria-hidden />
                          </LinkWithLoading>
                        ))}
                      </div>
                    ) : (
                      <p className="px-6 pb-4 text-sm text-gray-500 dark:text-gray-400">
                        Aucune sous-catégorie. Utilisez « Tout voir » ci-dessus.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky footer CTA — always reachable */}
          {!loading && (
            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <LinkWithLoading
                href="/shop"
                className="flex min-h-[48px] items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-display uppercase tracking-wide font-semibold text-sm transition-colors shadow-sm"
                loadingMessage="Chargement..."
              >
                Voir tous les produits
                <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkWithLoading>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
