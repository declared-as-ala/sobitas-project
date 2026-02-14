'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';
import { Button } from '@/app/components/ui/button';
import { getCategories } from '@/services/api';
import { Category } from '@/types';
import { motion, AnimatePresence } from 'motion/react';

const menuCategories = [
  {
    title: 'COMPLÉMENTS ALIMENTAIRES',
    items: [
      'Acides Aminés',
      'Bcaa',
      'Citrulline',
      'Creatine',
      'EAA',
      'Glutamine',
      'HMB',
      'L-Arginine',
      'Mineraux',
      'Omega 3',
      'Boosters Hormonaux',
      'Vitamines',
      'ZMA',
      'Beta Alanine',
      'Ashwagandha',
      'Tribulus',
      'Collagene',
      'Zinc',
      'Magnésium',
    ],
  },
  {
    title: 'PERTE DE POIDS',
    items: ['CLA', 'Fat Burner', 'L-Carnitine', 'Brûleurs De Graisse'],
  },
  {
    title: 'PRISE DE MASSE',
    items: [
      'Gainers Haute Énergie',
      'Gainers Riches En Protéines',
      'Protéines',
      'Carbohydrates',
    ],
  },
  {
    title: 'PROTÉINES',
    items: [
      'Protéine Whey',
      'Isolat De Whey',
      'Protéine De Caséine',
      'Protéines Complètes',
      'Protéine De Bœuf',
      'Protéines Pour Cheveux',
      'Whey Hydrolysée',
    ],
  },
  {
    title: 'COMPLEMENTS D\'ENTRAINEMENT',
    items: [
      'Pré-Workout',
      'Pendant L\'entraînement',
      'Récupération Après Entraînement',
    ],
  },
  {
    title: 'ÉQUIPEMENTS ET ACCESSOIRES SPORTIFS',
    items: [
      'Bandages De Soutien Musculaire',
      'Ceinture De Musculation',
      'Gants De Musculation Et Fitness',
      'Shakers Et Bouteilles Sportives',
      'T-Shirts De Sport',
      'Matériel De Musculation',
      'Équipement Cardio Fitness',
    ],
  },
];

// Helper to convert name to slug format
const nameToSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
};

// Helper to find category by name
const findCategoryByName = (name: string, categories: Category[]): Category | null => {
  const normalizedName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return categories.find(cat => 
    cat.designation_fr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() === normalizedName
  ) || null;
};

// Helper to find subcategory by name
const findSubCategoryByName = (name: string, categories: Category[]): { slug: string; name: string } | null => {
  const normalizedName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  for (const category of categories) {
    if (category.sous_categories) {
      const found = category.sous_categories.find((sub: any) => 
        sub.designation_fr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() === normalizedName
      );
      if (found) {
        return { slug: found.slug, name: found.designation_fr };
      }
    }
  }
  return null;
};

interface MobileProductsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileProductsMenu({ open, onOpenChange }: MobileProductsMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  const handleCategoryClick = (categoryTitle: string) => {
    setSelectedCategory(categoryTitle);
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  const handleClose = () => {
    setSelectedCategory(null);
    onOpenChange(false);
  };

  // Reset when menu closes
  useEffect(() => {
    if (!open) {
      setSelectedCategory(null);
    }
  }, [open]);

  const closedByBackRef = useRef(false);

  // Android back button: pushState when opening so back closes the sheet
  useEffect(() => {
    if (!open) {
      closedByBackRef.current = false;
      return;
    }
    closedByBackRef.current = false;
    const id = 'mobile-products-menu-' + Date.now();
    const state = { [id]: true };
    window.history.pushState(state, '');
    const onPopState = () => {
      closedByBackRef.current = true;
      onOpenChange(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (!closedByBackRef.current && window.history.state && (window.history.state as Record<string, unknown>)[id]) {
        window.history.back();
      }
    };
  }, [open, onOpenChange]);

  const selectedCategoryData = selectedCategory 
    ? menuCategories.find(cat => cat.title === selectedCategory)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="left-0 right-0 mx-0 w-full max-h-[90vh] rounded-t-2xl p-0 flex flex-col overflow-hidden z-[60] border-t border-gray-200 dark:border-gray-800"
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Drag handle (bottom sheet affordance) */}
          <div className="flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Header: one back (when in subcategory) + centered title + single close (X) */}
          <SheetHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="flex items-center gap-2 min-h-[44px]">
              {selectedCategory ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 -ml-1"
                  aria-label="Retour aux catégories"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <span className="w-11 shrink-0" aria-hidden />
              )}
              <SheetTitle className="flex-1 text-center text-base font-bold text-gray-900 dark:text-white line-clamp-2 px-2">
                {selectedCategory || 'Nos Produits'}
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 -mr-1"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Content Area - scrolls inside sheet; body stays fixed */}
          <div className="flex-1 overflow-y-auto overscroll-contain py-2 min-h-0">
            <AnimatePresence mode="wait">
              {!selectedCategory ? (
                // Main Categories View
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <div className="space-y-1 px-2">
                    {menuCategories.map((category, index) => {
                      return (
                        <motion.button
                          key={index}
                          onClick={() => handleCategoryClick(category.title)}
                          className="w-full flex items-center justify-between py-4 px-4 text-left bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-200 dark:border-gray-800 mb-2"
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-red-600 dark:text-red-400 mb-1">
                              {category.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {category.items.length} {category.items.length === 1 ? 'sous-catégorie' : 'sous-catégories'}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 ml-2" />
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* View All Products Link */}
                  <div className="px-4 pt-4 pb-2 border-t border-gray-200 dark:border-gray-800 mt-4">
                    <LinkWithLoading
                      href="/shop"
                      onClick={handleClose}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors"
                      loadingMessage="Chargement de la boutique..."
                    >
                      Voir tous les produits
                      <ChevronRight className="h-4 w-4" />
                    </LinkWithLoading>
                  </div>
                </motion.div>
              ) : (
                // Subcategories View
                <motion.div
                  key="subcategories"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <div className="space-y-1 px-2">
                    {selectedCategoryData?.items.map((item, itemIndex) => {
                      const subCategory = findSubCategoryByName(item, categories);
                      const itemSlug = subCategory?.slug || nameToSlug(item);
                      
                      return (
                        <LinkWithLoading
                          key={itemIndex}
                          href={`/shop/${itemSlug}`}
                          onClick={handleClose}
                          className="block py-3 px-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-200 dark:border-gray-800 mb-2"
                          loadingMessage={`Chargement de ${item}...`}
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item}
                          </span>
                        </LinkWithLoading>
                      );
                    })}
                  </div>

                  {/* Category Link */}
                  {selectedCategoryData && (() => {
                    const categoryData = findCategoryByName(selectedCategoryData.title, categories);
                    const categorySlug = categoryData?.slug || nameToSlug(selectedCategoryData.title);
                    
                    return (
                      <div className="px-4 pt-4 pb-2 border-t border-gray-200 dark:border-gray-800 mt-4">
                        <LinkWithLoading
                          href={`/shop/${categorySlug}`}
                          onClick={handleClose}
                          className="flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors"
                          loadingMessage={`Chargement de ${selectedCategoryData?.title}...`}
                        >
                          Voir tous les produits de cette catégorie
                          <ChevronRight className="h-4 w-4" />
                        </LinkWithLoading>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
