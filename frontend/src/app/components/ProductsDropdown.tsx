'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronDown } from 'lucide-react';
import { getCategories } from '@/services/api';
import { Category } from '@/types';

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
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
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

export function ProductsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    setMounted(true);
    // Fetch categories to get slugs
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

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // relatedTarget can be null or not a Node (e.g. when leaving to window) - contains() requires a Node
    const relatedTarget = e.relatedTarget as Node | null;
    const isNode = relatedTarget != null && relatedTarget instanceof Node;

    const isMovingToDropdown = isNode && (dropdownRef.current?.contains(relatedTarget) ?? false);
    const isMovingToTrigger = isNode && (triggerRef.current?.contains(relatedTarget) ?? false);

    if (!isMovingToDropdown && !isMovingToTrigger) {
      // Add a small delay to allow smooth transition
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
  };

  const dropdownContent = isOpen && mounted ? (
    <div
      ref={dropdownRef}
      className="fixed left-0 right-0 w-full bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800 shadow-xl z-[100] max-h-[85vh] overflow-y-auto"
      style={{
        top: `${dropdownPosition.top}px`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
        {menuCategories.map((category, index) => {
          // Find the category by title to get its slug
          const categoryData = findCategoryByName(category.title, categories);
          const categorySlug = categoryData?.slug || nameToSlug(category.title);
          
          return (
            <div key={index} className="space-y-2 min-w-0">
              {/* Category title - link to category page using slug */}
              <LinkWithLoading
                href={`/shop/${categorySlug}`}
                className="font-semibold text-sm sm:text-base text-red-600 dark:text-red-500 mb-3 leading-tight hover:underline block"
                loadingMessage={`Chargement de ${category.title}...`}
                onMouseDown={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                }}
                onClick={() => {
                  setTimeout(() => setIsOpen(false), 100);
                }}
              >
                {category.title}
              </LinkWithLoading>
              <ul className="space-y-1.5">
                {category.items.map((item, itemIndex) => {
                  // Try to find subcategory by name first
                  const subCategory = findSubCategoryByName(item, categories);
                  // Use subcategory slug if found, otherwise convert name to slug
                  const itemSlug = subCategory?.slug || nameToSlug(item);
                  
                  return (
                    <li key={itemIndex}>
                      <LinkWithLoading
                        href={`/shop/${itemSlug}`}
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500 transition-colors block py-1 break-words"
                        loadingMessage={`Chargement de ${item}...`}
                        onMouseDown={(e: React.MouseEvent<HTMLAnchorElement>) => {
                          // Prevent blur from closing menu when clicking
                          e.preventDefault();
                        }}
                        onClick={() => {
                          // Close menu after navigation
                          setTimeout(() => setIsOpen(false), 100);
                        }}
                      >
                        {item}
                      </LinkWithLoading>
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
          onMouseDown={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
          }}
          onClick={() => {
            setTimeout(() => setIsOpen(false), 100);
          }}
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
        // Don't close on blur when clicking links inside dropdown
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (dropdownRef.current?.contains(relatedTarget)) {
          return;
        }
        // Only close if focus is moving outside both trigger and dropdown
        if (!e.currentTarget.contains(relatedTarget)) {
          // Add delay to allow click events to process
          closeTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
          }, 200);
        }
      }}
    >
      <LinkWithLoading
        href="/shop"
        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1 whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        loadingMessage="Chargement de la boutique..."
      >
        NOS PRODUITS
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </LinkWithLoading>

      {mounted && typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
