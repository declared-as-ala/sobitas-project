'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronDown } from 'lucide-react';
import { getCategories } from '@/services/api';
import { Category } from '@/types';

/** Header height approx for dropdown max-height (leave room below nav) */
const HEADER_OFFSET_PX = 80;

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

// Helper to find category by name (use returned slug only – never slugify from title)
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

export function ProductsDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const rafScrollRef = useRef<number | null>(null);

  const closeMenu = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: 0,
      });
    }
  }, [isOpen]);

  // Close on scroll (wheel + scrollbar) so the menu never stays stuck over content. Throttled with rAF.
  useEffect(() => {
    if (!isOpen) return;
    const onScrollOrWheel = () => {
      if (rafScrollRef.current != null) return;
      rafScrollRef.current = requestAnimationFrame(() => {
        rafScrollRef.current = null;
        closeMenu();
      });
    };
    window.addEventListener('scroll', onScrollOrWheel, { capture: true, passive: true });
    window.addEventListener('wheel', onScrollOrWheel, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollOrWheel, { capture: true });
      window.removeEventListener('wheel', onScrollOrWheel);
      if (rafScrollRef.current != null) cancelAnimationFrame(rafScrollRef.current);
    };
  }, [isOpen, closeMenu]);

  // Close on click outside (trigger + dropdown)
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, closeMenu]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeMenu]);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    const isNode = relatedTarget != null && relatedTarget instanceof Node;
    const isMovingToDropdown = isNode && (dropdownRef.current?.contains(relatedTarget) ?? false);
    const isMovingToTrigger = isNode && (triggerRef.current?.contains(relatedTarget) ?? false);

    if (!isMovingToDropdown && !isMovingToTrigger) {
      closeTimeoutRef.current = setTimeout(closeMenu, 150);
    }
  };

  const dropdownContent = isOpen && mounted ? (
    <div
      ref={dropdownRef}
      className="fixed left-0 right-0 w-full bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800 shadow-xl z-[100] overflow-y-auto"
      style={{
        top: `${dropdownPosition.top}px`,
        maxHeight: `calc(100vh - ${HEADER_OFFSET_PX}px - 12px)`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
        {menuCategories.map((category, index) => {
          const categoryData = findCategoryByName(category.title, categories);
          const categorySlug = categoryData?.slug ?? null;
          const categoryHref = categorySlug ? `/category/${categorySlug}` : null;

          return (
            <div key={index} className="space-y-2 min-w-0">
              {/* Category title – link only when we have API slug (never slugify from title) */}
              {categoryHref ? (
                <LinkWithLoading
                  href={categoryHref}
                  className="font-semibold text-sm sm:text-base text-red-600 dark:text-red-500 mb-3 leading-tight hover:underline block"
                  loadingMessage={`Chargement de ${category.title}...`}
                  onMouseEnter={() => router.prefetch(categoryHref)}
                  onMouseDown={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                  }}
                  onClick={closeMenu}
                >
                  {category.title}
                </LinkWithLoading>
              ) : (
                <span className="font-semibold text-sm sm:text-base text-red-600 dark:text-red-500 mb-3 leading-tight block">
                  {category.title}
                </span>
              )}
              <ul className="space-y-1.5">
                {category.items.map((item, itemIndex) => {
                  const subCategory = findSubCategoryByName(item, categories);
                  const itemSlug = subCategory?.slug ?? null;
                  const itemHref = itemSlug ? `/category/${itemSlug}` : null;

                  return (
                    <li key={itemIndex}>
                      {itemHref ? (
                        <LinkWithLoading
                          href={itemHref}
                          className="text-sm text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500 transition-colors block py-1 break-words"
                          loadingMessage={`Chargement de ${item}...`}
                          onMouseEnter={() => router.prefetch(itemHref)}
                          onMouseDown={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                          }}
                          onClick={closeMenu}
                        >
                          {item}
                        </LinkWithLoading>
                      ) : (
                        <span className="text-sm text-gray-700 dark:text-gray-300 block py-1 break-words">
                          {item}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
        <LinkWithLoading
          href="/shop"
          className="text-base font-semibold text-red-600 dark:text-red-500 hover:underline"
          loadingMessage="Chargement de la boutique..."
          onMouseEnter={() => router.prefetch('/shop')}
          onMouseDown={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
          }}
          onClick={closeMenu}
        >
          Voir tous les produits →
        </LinkWithLoading>
      </div>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setIsOpen(true)}
      onBlur={(e) => {
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (dropdownRef.current?.contains(relatedTarget)) return;
        if (!e.currentTarget.contains(relatedTarget)) {
          closeTimeoutRef.current = setTimeout(closeMenu, 200);
        }
      }}
    >
      <LinkWithLoading
        href="/shop"
        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1 whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        loadingMessage="Chargement de la boutique..."
        onMouseEnter={() => router.prefetch('/shop')}
      >
        NOS PRODUITS
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </LinkWithLoading>

      {mounted && typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
