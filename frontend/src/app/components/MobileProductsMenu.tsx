'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronRight, ChevronLeft, X, ArrowRight, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';
import { Button } from '@/app/components/ui/button';
import { getCategories } from '@/services/api';
import { Category } from '@/types';
import { motion, AnimatePresence } from 'motion/react';

const menuCategories = [
  {
    title: 'COMPLÉMENTS ALIMENTAIRES',
    items: [
      'Acides Aminés', 'Bcaa', 'Citrulline', 'Creatine', 'EAA', 'Glutamine',
      'HMB', 'L-Arginine', 'Mineraux', 'Omega 3', 'Boosters Hormonaux',
      'Vitamines', 'ZMA', 'Beta Alanine', 'Ashwagandha', 'Tribulus',
      'Collagene', 'Zinc', 'Magnésium',
    ],
  },
  {
    title: 'PERTE DE POIDS',
    items: ['CLA', 'Fat Burner', 'L-Carnitine', 'Brûleurs De Graisse'],
  },
  {
    title: 'PRISE DE MASSE',
    items: ['Gainers Haute Énergie', 'Gainers Riches En Protéines', 'Protéines', 'Carbohydrates'],
  },
  {
    title: 'PROTÉINES',
    items: [
      'Protéine Whey', 'Isolat De Whey', 'Protéine De Caséine',
      'Protéines Complètes', 'Protéine De Bœuf', 'Protéines Pour Cheveux', 'Whey Hydrolysée',
    ],
  },
  {
    title: "COMPLÉMENTS D'ENTRAÎNEMENT",
    items: ["Pré-Workout", "Pendant L'entraînement", 'Récupération Après Entraînement'],
  },
  {
    title: 'ÉQUIPEMENTS ET ACCESSOIRES',
    items: [
      'Bandages De Soutien Musculaire', 'Ceinture De Musculation',
      'Gants De Musculation Et Fitness', 'Shakers Et Bouteilles Sportives',
      'T-Shirts De Sport', 'Matériel De Musculation', 'Équipement Cardio Fitness',
    ],
  },
];

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const subCategoryLabelToSlug: Record<string, string> = {
  'bandages de soutien musculaire': 'bandes-de-soutien-musculaire',
};

function findCategorySlug(name: string, cats: Category[]): string | null {
  const n = normalize(name);
  return cats.find(c => normalize(c.designation_fr) === n)?.slug ?? null;
}

function findSubCategorySlug(name: string, cats: Category[]): string | null {
  const n = normalize(name);
  for (const cat of cats) {
    const found = (cat.sous_categories as any[])?.find(s => normalize(s.designation_fr) === n);
    if (found?.slug) return found.slug;
  }
  const alias = subCategoryLabelToSlug[n];
  if (alias) {
    for (const cat of cats) {
      const sub = (cat.sous_categories as any[])?.find(s => s.slug === alias);
      if (sub) return sub.slug;
    }
  }
  return null;
}

interface MobileProductsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileProductsMenu({ open, onOpenChange }: MobileProductsMenuProps) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setCategoriesLoading(false));
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

  const selectedCategoryData = selectedCategory
    ? menuCategories.find(c => c.title === selectedCategory) ?? null
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="left-0 right-0 mx-0 w-full max-h-[90vh] rounded-t-2xl p-0 flex flex-col overflow-hidden z-[60] border-t-2 border-red-600"
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

              <SheetTitle className="flex-1 text-center text-base font-bold text-gray-900 dark:text-white line-clamp-1 px-1">
                {selectedCategory ? (
                  <span className="text-red-600 dark:text-red-400 text-sm">{selectedCategory}</span>
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
            <AnimatePresence mode="wait">
              {!selectedCategory ? (
                /* ── Category list ── */
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="px-3 pt-3 pb-1 space-y-2">
                    {menuCategories.map((cat, i) => (
                      <motion.button
                        key={i}
                        onClick={() => setSelectedCategory(cat.title)}
                        className="w-full flex items-center justify-between py-3.5 px-4 text-left bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
                        whileTap={{ scale: 0.985 }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="font-bold text-[11px] tracking-wide text-red-600 dark:text-red-400 uppercase leading-tight">
                              {cat.title}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 pl-4">
                            {cat.items.length} sous-catégorie{cat.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 ml-3" />
                      </motion.button>
                    ))}
                  </div>

                  <div className="px-3 pt-3 pb-6">
                    <LinkWithLoading
                      href="/shop"
                      className="flex items-center justify-center gap-2 py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl font-semibold text-sm transition-colors shadow-md shadow-red-200 dark:shadow-red-950/40"
                      loadingMessage="Chargement..."
                    >
                      Voir tous les produits
                      <ArrowRight className="h-4 w-4" />
                    </LinkWithLoading>
                  </div>
                </motion.div>
              ) : (
                /* ── Subcategory list ── */
                <motion.div
                  key={`sub-${selectedCategory}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* Loading skeleton while API resolves slugs */}
                  {categoriesLoading ? (
                    <div className="px-3 pt-4 space-y-2">
                      <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Chargement des catégories…</span>
                      </div>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* "Tout voir" for the parent category */}
                      {(() => {
                        const slug = findCategorySlug(selectedCategoryData?.title ?? '', categories);
                        const href = slug ? `/category/${slug}` : '/shop';
                        return (
                          <div className="px-3 pt-3 pb-2">
                            <LinkWithLoading
                              href={href}
                              className="flex items-center justify-between py-3 px-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-2xl text-red-600 dark:text-red-400 font-semibold text-sm"
                              loadingMessage="Chargement..."
                            >
                              <span>Tout voir — {selectedCategoryData?.title}</span>
                              <ArrowRight className="h-4 w-4 shrink-0" />
                            </LinkWithLoading>
                          </div>
                        );
                      })()}

                      {/* Subcategory items — always a real link now */}
                      <div className="px-3 pb-6 space-y-1.5">
                        {selectedCategoryData?.items.map((item, ii) => {
                          const slug = findSubCategorySlug(item, categories);
                          // Use the matched slug; fall back to the parent category or /shop — never a dead search
                          const parentSlug = findCategorySlug(selectedCategoryData.title, categories);
                          const href = slug
                            ? `/category/${slug}`
                            : parentSlug
                              ? `/category/${parentSlug}`
                              : '/shop';

                          return (
                            <LinkWithLoading
                              key={ii}
                              href={href}
                              className="flex items-center gap-3 py-3.5 px-4 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm group"
                              loadingMessage="Chargement..."
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                              <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                                {item}
                              </span>
                              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
                            </LinkWithLoading>
                          );
                        })}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
