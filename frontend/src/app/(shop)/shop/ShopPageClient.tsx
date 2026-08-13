'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/app/components/ProductCard';
import { ProductGrid } from '@/app/components/ProductGrid';
import { ProductsSkeleton } from '@/app/components/ProductsSkeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { ShopBreadcrumbs } from '@/app/components/ShopBreadcrumbs';
import { PageHeader } from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Slider } from '@/app/components/ui/slider';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Filter, Search, X, CircleAlert, Check, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Badge } from '@/app/components/ui/badge';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Pagination } from '@/app/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { Product, Category, Brand } from '@/types';
import { searchProducts, getProductsByCategory, getProductsBySubCategory, getProductsByBrand } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { generateBrandDescriptionFallback } from '@/util/brandDescriptionFallback';

const SKELETON_MIN_MS = 300;

const CREATINE_TYPES = ['Monohydrate', 'Micronisée', 'Capsules', 'Creapure'];
const CREATINE_GOALS = ['Force', 'Masse', 'Performance', 'Récupération'];

/** Sort options — single source shared by the desktop top-bar select and the mobile sheet's "Trier par" group. */
const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'popularity', label: 'Popularité' },
  { value: 'price-asc', label: 'Prix : croissant' },
  { value: 'price-desc', label: 'Prix : décroissant' },
  { value: 'newest', label: 'Nouveautés' },
  { value: 'best-sellers', label: 'Meilleures ventes' },
];

interface ProductFiltersProps {
  variant: 'mobile' | 'desktop';
  inStockOnly: boolean;
  setInStockOnly: (value: boolean) => void;
  isCreatineCategory: boolean;
  selectedTypes: string[];
  toggleType: (type: string) => void;
  selectedGoals: string[];
  toggleGoal: (goal: string) => void;
  uniqueFlavors: string[];
  selectedFlavors: string[];
  toggleFlavor: (flavor: string) => void;
  categories: Category[];
  brands: Brand[];
  filterCounts: { categoryCounts: Map<string, number>; brandCounts: Map<number, number> };
  selectedCategories: string[];
  toggleCategory: (slug: string) => void;
  selectedBrands: number[];
  toggleBrand: (id: number) => void;
  priceRange: [number, number];
  setPriceRange: (value: [number, number]) => void;
  priceBounds: { min: number; max: number };
  sortBy: string;
  setSortBy: (value: string) => void;
}

/**
 * The shop filter accordion (Disponibilité, Type/Objectif Créatine, Arômes, Catégories, Marques,
 * Prix). Rendered in BOTH the mobile Sheet and the desktop aside from this single source so the two
 * can no longer drift. `variant` only tunes density (checkbox size, paddings, default-open groups);
 * all state + handlers are owned by ShopContent and passed in, so the filter behavior is identical.
 */
function ProductFilters({
  variant,
  inStockOnly,
  setInStockOnly,
  isCreatineCategory,
  selectedTypes,
  toggleType,
  selectedGoals,
  toggleGoal,
  uniqueFlavors,
  selectedFlavors,
  toggleFlavor,
  categories,
  brands,
  filterCounts,
  selectedCategories,
  toggleCategory,
  selectedBrands,
  toggleBrand,
  priceRange,
  setPriceRange,
  priceBounds,
  sortBy,
  setSortBy,
}: ProductFiltersProps) {
  const isMobile = variant === 'mobile';
  const idPrefix = isMobile ? 'mobile' : 'desktop';
  const itemClass = 'border border-gray-200 dark:border-gray-800 rounded-xl px-4';
  const triggerClass = `${isMobile ? 'py-3.5 text-sm' : 'py-2.5 text-xs sm:text-sm'} font-semibold hover:no-underline`;
  const listClass = isMobile ? 'space-y-0.5' : 'space-y-2';
  const scrollListClass = `${listClass} ${isMobile ? 'max-h-72' : 'max-h-60'} overflow-y-auto overflow-x-hidden -mr-2 pr-2`;
  const checkboxClass = isMobile ? 'h-5 w-5' : 'h-4 w-4';
  // On mobile every option row is a ≥44px tap target; the label pads to fill the row height.
  const rowClass = isMobile ? 'flex items-center gap-3 min-h-[44px]' : 'flex items-center gap-3';
  const rowBetweenClass = isMobile
    ? 'flex items-center justify-between gap-3 min-h-[44px] group'
    : 'flex items-center justify-between gap-3 group';
  const labelBase = isMobile ? 'text-sm' : 'text-xs sm:text-sm';
  const labelPad = isMobile ? 'py-2' : '';
  const labelState = (selected: boolean) =>
    selected ? 'font-semibold text-gray-900 dark:text-white' : 'font-normal text-gray-700 dark:text-gray-300';
  const defaultOpen = isMobile
    ? ['sort', 'availability', 'categories', 'brands']
    : ['availability', 'types', 'goals', 'flavors'];

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className={isMobile ? 'space-y-2.5' : 'space-y-1'}>
      {/* Trier — mobile only (the desktop top-bar select stays the sort control on ≥md) */}
      {isMobile && (
        <AccordionItem value="sort" className={itemClass}>
          <AccordionTrigger className={triggerClass}>Trier par</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="space-y-0.5">
              {SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortBy(opt.value)}
                    aria-pressed={active}
                    className={`flex w-full items-center justify-between gap-3 min-h-[44px] px-3 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active && <Check className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Availability */}
      <AccordionItem value="availability" className={itemClass}>
        <AccordionTrigger className={triggerClass}>Disponibilité</AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className={rowClass}>
            <Checkbox
              id={`${idPrefix}-in-stock`}
              checked={inStockOnly}
              onCheckedChange={(checked) => setInStockOnly(checked === true)}
              className={checkboxClass}
            />
            <label htmlFor={`${idPrefix}-in-stock`} className={`${labelBase} ${labelPad} cursor-pointer flex-1 font-normal`}>
              En stock uniquement
            </label>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Créatine Type */}
      {isCreatineCategory && (
        <AccordionItem value="types" className={itemClass}>
          <AccordionTrigger className={triggerClass}>Type de Créatine</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className={listClass}>
              {CREATINE_TYPES.map((type) => (
                <div key={type} className={rowClass}>
                  <Checkbox
                    id={`${idPrefix}-type-${type}`}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                    className={checkboxClass}
                  />
                  <label
                    htmlFor={`${idPrefix}-type-${type}`}
                    className={`${labelBase} ${labelPad} cursor-pointer flex-1 ${labelState(selectedTypes.includes(type))}`}
                  >
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Créatine Goal */}
      {isCreatineCategory && (
        <AccordionItem value="goals" className={itemClass}>
          <AccordionTrigger className={triggerClass}>Objectif</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className={listClass}>
              {CREATINE_GOALS.map((goal) => (
                <div key={goal} className={rowClass}>
                  <Checkbox
                    id={`${idPrefix}-goal-${goal}`}
                    checked={selectedGoals.includes(goal)}
                    onCheckedChange={() => toggleGoal(goal)}
                    className={checkboxClass}
                  />
                  <label
                    htmlFor={`${idPrefix}-goal-${goal}`}
                    className={`${labelBase} ${labelPad} cursor-pointer flex-1 ${labelState(selectedGoals.includes(goal))}`}
                  >
                    {goal}
                  </label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Arômes */}
      {uniqueFlavors.length > 0 && (
        <AccordionItem value="flavors" className={itemClass}>
          <AccordionTrigger className={triggerClass}>Arômes</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className={scrollListClass}>
              {uniqueFlavors.map((flavor) => (
                <div key={flavor} className={rowClass}>
                  <Checkbox
                    id={`${idPrefix}-flavor-${flavor}`}
                    checked={selectedFlavors.includes(flavor)}
                    onCheckedChange={() => toggleFlavor(flavor)}
                    className={checkboxClass}
                  />
                  <label
                    htmlFor={`${idPrefix}-flavor-${flavor}`}
                    className={`${labelBase} ${labelPad} cursor-pointer flex-1 ${labelState(selectedFlavors.includes(flavor))}`}
                  >
                    {flavor}
                  </label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Catégories */}
      {categories.length > 0 && (
        <AccordionItem value="categories" className={itemClass}>
          <AccordionTrigger className={triggerClass}>Catégories</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className={scrollListClass}>
              {categories.map((category) => {
                const count = filterCounts.categoryCounts.get(category.slug) || 0;
                const isSelected = selectedCategories.includes(category.slug);
                return (
                  <div key={category.id} className={rowBetweenClass}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        id={`${idPrefix}-cat-${category.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleCategory(category.slug)}
                        className={checkboxClass}
                      />
                      <label
                        htmlFor={`${idPrefix}-cat-${category.id}`}
                        className={`${labelBase} ${labelPad} cursor-pointer flex-1 truncate ${labelState(isSelected)}`}
                      >
                        {category.designation_fr}
                      </label>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Marques */}
      {brands.length > 0 && (
        <AccordionItem value="brands" className={itemClass}>
          <AccordionTrigger className={triggerClass}>Marques</AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className={scrollListClass}>
              {brands.map((brand) => {
                const count = filterCounts.brandCounts.get(brand.id) || 0;
                const isSelected = selectedBrands.includes(brand.id);
                return (
                  <div key={brand.id} className={rowBetweenClass}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        id={`${idPrefix}-brand-${brand.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleBrand(brand.id)}
                        className={checkboxClass}
                      />
                      <label
                        htmlFor={`${idPrefix}-brand-${brand.id}`}
                        className={`${labelBase} ${labelPad} cursor-pointer flex-1 truncate ${labelState(isSelected)}`}
                      >
                        {brand.designation_fr}
                      </label>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Prix */}
      <AccordionItem value="price" className={itemClass}>
        <AccordionTrigger className={triggerClass}>Prix</AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900 dark:text-white">
                {priceRange[0]} DT - {priceRange[1]} DT
              </span>
            </div>
            <Slider
              value={priceRange}
              onValueChange={(value) => setPriceRange(value as [number, number])}
              min={priceBounds.min}
              max={priceBounds.max}
              step={10}
              className="w-full [&_[data-slot=slider-range]]:bg-red-600 [&_[data-slot=slider-thumb]]:border-red-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{priceBounds.min} DT</span>
              <span>{priceBounds.max} DT</span>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

interface ShopPageClientProps {
  productsData: {
    products: Product[];
    brands: Brand[];
    categories: Category[];
  };
  categories: Category[];
  brands: Brand[];
  initialCategory?: string;
  isSubcategory?: boolean;
  parentCategory?: string;
  initialBrand?: number;
  /** Overrides last breadcrumb label on category/subcategory shop views when set in admin (SEO). */
  categoryBreadcrumbLabel?: string;
  /** Optional SEO landing block (H1, intro, how-to, FAQs). Rendered after breadcrumb. */
  categorySeoLanding?: React.ReactNode;
  /** Optional SEO block for bottom of page (Catégories associées + Produits phares). Rendered after product grid. */
  categorySeoLandingBottom?: React.ReactNode;
}

type UrlFilters = { category: string | null; brand: string | null; search: string | null };
const EMPTY_URL_FILTERS: UrlFilters = { category: null, brand: null, search: null };

/**
 * Reads the filter query params and reports them upward. Renders nothing.
 *
 * This exists so that `useSearchParams()` is called in a LEAF wrapped in its own Suspense boundary
 * rather than at the top of ShopContent. Next renders the nearest Suspense fallback instead of the
 * real subtree when a component below it reads search params during static generation — with the
 * hook at the top of ShopContent, that meant the entire boutique (h1, product grid, every product
 * link) was replaced by <ProductsSkeleton /> in the prerendered HTML, and the catalogue only
 * appeared after hydration. Measured on the live page: 0 product links and no h1 in the server HTML.
 *
 * With the hook down here, the nearest boundary is the one around this component, which renders
 * null either way — so ShopContent prerenders in full and the URL sync still works, with the same
 * reactivity to client-side navigation the top-level hook had.
 */
function UrlFilterSync({ onChange }: { onChange: (f: UrlFilters) => void }) {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const search = searchParams.get('search');

  useEffect(() => {
    onChange({ category, brand, search });
  }, [category, brand, search, onChange]);

  return null;
}

function ShopContent({
  productsData,
  categories,
  brands,
  initialCategory,
  isSubcategory,
  parentCategory,
  initialBrand,
  categoryBreadcrumbLabel,
  categorySeoLanding,
  categorySeoLandingBottom,
}: ShopPageClientProps) {
  // NOTE: useSearchParams() is deliberately NOT called here — it lives in <UrlFilterSync> below.
  // Calling it at this level is a dynamic API that opts every route rendering this component out of
  // static rendering; on /shop that meant the boutique answered no-store to every visitor. Isolating
  // it in a Suspense-wrapped leaf keeps full reactivity to the URL while letting the product grid
  // render on the server. See the component definition for the full story.
  const [urlFilters, setUrlFilters] = useState<UrlFilters>(EMPTY_URL_FILTERS);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [debouncedPriceRange, setDebouncedPriceRange] = useState<[number, number]>([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [showFiltersDesktop, setShowFiltersDesktop] = useState(true);
  
  // Sorting and sub-filters states
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);

  // Provide safe defaults if productsData is undefined
  const safeProductsData = productsData || {
    products: [],
    brands: [],
    categories: [],
  };
  
  // Initialize products from props - if initialCategory is provided, products are already filtered from server
  const [products, setProducts] = useState<Product[]>(() => {
    if (initialCategory) {
      return safeProductsData.products || [];
    }
    return safeProductsData.products || [];
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const skeletonShownAtRef = useRef<number | null>(null);
  const [filterError, setFilterError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  // Default OFF, so a category shows everything it contains.
  //
  // This defaulted to true, which hid every out-of-stock product across the shop and all category
  // pages. Measured: Équipement showed 46 of 79, Protéines 19 of 60, Santé & Vitalité 28 of 65,
  // Performance 23 of 51 — 42% of the catalogue invisible, and the "Rupture de stock" chip on the
  // product card could never appear anywhere, because nothing out of stock was ever rendered.
  //
  // It also silently orphaned those products: their detail pages are indexable but no category
  // page linked to them, and a shopper had no way to learn we carry the item at all.
  //
  // The filter itself stays — the checkbox is still there for anyone who wants it. Out-of-stock
  // items are sorted last (see the sorting engine) so they never push a buyable product down.
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const PRODUCTS_PER_PAGE = 12;

  // Keep skeleton visible at least SKELETON_MIN_MS to avoid flicker on fast loads
  useEffect(() => {
    if (isSearching) {
      setShowSkeleton(true);
      skeletonShownAtRef.current = Date.now();
    } else {
      if (skeletonShownAtRef.current === null) {
        setShowSkeleton(false);
        return;
      }
      const elapsed = Date.now() - skeletonShownAtRef.current;
      const remaining = Math.max(0, SKELETON_MIN_MS - elapsed);
      const t = setTimeout(() => {
        setShowSkeleton(false);
        skeletonShownAtRef.current = null;
      }, remaining);
      return () => clearTimeout(t);
    }
  }, [isSearching]);

  // Initialize from URL params or props
  useEffect(() => {
    const { category, brand, search } = urlFilters;

    const categoryToUse = initialCategory || category;

    if (categoryToUse) {
      const decodedCategory = decodeURIComponent(categoryToUse);
      setSelectedCategories(prev => {
        return prev.length === 1 && prev[0] === decodedCategory ? prev : [decodedCategory];
      });
    } else {
      setSelectedCategories([]);
      setProducts(safeProductsData.products || []);
      setCurrentBrand(null);
    }

    const brandToUse = initialBrand ? initialBrand.toString() : brand;

    if (brandToUse) {
      const brandId = parseInt(brandToUse);
      setSelectedBrands(prev => {
        return prev.length === 1 && prev[0] === brandId ? prev : [brandId];
      });
    } else {
      setSelectedBrands([]);
    }

    if (search) {
      setSearchQuery(decodeURIComponent(search));
    } else {
      setSearchQuery('');
    }
  }, [urlFilters, initialCategory, initialBrand, safeProductsData.products]);

  // Get unique subcategories from ALL products (not just filtered) for proper mapping
  const subCategories = useMemo(() => {
    const subs = new Map<string, { id: number; name: string; slug: string; categoryId?: number }>();
    const allProducts = safeProductsData.products || [];
    allProducts.forEach(p => {
      if (p.sous_categorie) {
        const key = p.sous_categorie.id.toString();
        if (!subs.has(key)) {
          subs.set(key, {
            id: p.sous_categorie.id,
            name: p.sous_categorie.designation_fr,
            slug: p.sous_categorie.slug,
            categoryId: p.sous_categorie.categorie_id,
          });
        }
      }
    });
    return Array.from(subs.values());
  }, [safeProductsData.products]);

  // Real, crawlable SSR links to this TOP category's subcategories. On a top-category view the
  // subcategories are otherwise only reachable through filter checkboxes (client state) or bot-only
  // markup, so they were never real anchors in the human DOM. Rendered as on-system pills below the
  // SEO hero so search engines can discover/relate the subcategory pages.
  const topCategorySubcategories = useMemo(() => {
    if (isSubcategory || !initialCategory) return [];
    const cat = categories.find((c) => c.slug === initialCategory);
    return (cat?.sous_categories ?? []).filter((s) => Boolean(s?.slug) && Boolean(s?.designation_fr));
  }, [categories, initialCategory, isSubcategory]);

  // Helper to normalize strings for comparison (remove accents, lowercase, remove extra spaces)
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Convert name to slug format
  const nameToSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();
  };

  // Get min and max prices
  const priceBounds = useMemo(() => {
    const prices = products
      .map(p => getEffectivePrice(p))
      .filter((price): price is number => price !== null && price !== undefined);
    if (prices.length === 0) return { min: 0, max: 1000 };
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  // Update price range when bounds change
  useEffect(() => {
    if (priceBounds.max > 0) {
      setPriceRange([priceBounds.min, priceBounds.max]);
      setDebouncedPriceRange([priceBounds.min, priceBounds.max]);
    }
  }, [priceBounds]);

  // Debounce price range updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPriceRange(priceRange);
    }, 300);
    return () => clearTimeout(timer);
  }, [priceRange]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const allProducts = safeProductsData.products || [];
    const categoryCounts = new Map<string, number>();
    const brandCounts = new Map<number, number>();

    allProducts.forEach(product => {
      if (product.sous_categorie?.categorie) {
        const catSlug = product.sous_categorie.categorie.slug;
        categoryCounts.set(catSlug, (categoryCounts.get(catSlug) || 0) + 1);
      }
      if (product.brand_id) {
        brandCounts.set(product.brand_id, (brandCounts.get(product.brand_id) || 0) + 1);
      }
    });

    return { categoryCounts, brandCounts };
  }, [safeProductsData.products]);

  // Check if Creatine category is active
  const isCreatineCategory = useMemo(() => {
    return (
      initialCategory === 'creatine' ||
      initialCategory === 'creatine-tunisie' ||
      selectedCategories.includes('creatine') ||
      selectedCategories.includes('creatine-tunisie')
    );
  }, [initialCategory, selectedCategories]);

  // Dynamic flavor extraction from products
  const uniqueFlavors = useMemo(() => {
    const flavors = new Set<string>();
    const list = products.length > 0 ? products : (safeProductsData.products || []);
    list.forEach(p => {
      const aromes = (p as any).aromes || [];
      if (Array.isArray(aromes)) {
        aromes.forEach((a: any) => {
          if (a?.designation_fr) {
            flavors.add(a.designation_fr);
          }
        });
      }
    });
    return Array.from(flavors);
  }, [products, safeProductsData.products]);

  // Dynamic category SEO Applied filters chips
  const appliedFilters = useMemo(() => {
    const filters: Array<{ type: 'category' | 'brand' | 'price' | 'stock' | 'type' | 'goal' | 'flavor'; label: string; value: string | number }> = [];
    
    selectedCategories.forEach(slug => {
      const category = categories.find(c => c.slug === slug);
      if (category) {
        filters.push({ type: 'category', label: category.designation_fr, value: slug });
      }
    });

    selectedBrands.forEach(id => {
      const brand = brands.find(b => b.id === id) || safeProductsData.brands.find(b => b.id === id);
      if (brand) {
        filters.push({ type: 'brand', label: brand.designation_fr, value: id });
      }
    });

    if (priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max) {
      filters.push({ 
        type: 'price', 
        label: `${priceRange[0]} - ${priceRange[1]} DT`, 
        value: `${priceRange[0]}-${priceRange[1]}` 
      });
    }

    selectedTypes.forEach(type => {
      filters.push({ type: 'type', label: type, value: type });
    });

    selectedGoals.forEach(goal => {
      filters.push({ type: 'goal', label: goal, value: goal });
    });

    selectedFlavors.forEach(flavor => {
      filters.push({ type: 'flavor', label: flavor, value: flavor });
    });

    return filters;
  }, [selectedCategories, selectedBrands, priceRange, priceBounds, categories, brands, safeProductsData.brands, selectedTypes, selectedGoals, selectedFlavors]);

  // Remove specific filters
  const removeFilter = (type: 'category' | 'brand' | 'price' | 'stock' | 'type' | 'goal' | 'flavor', value: string | number) => {
    if (type === 'category') {
      setSelectedCategories(prev => prev.filter(c => c !== value));
    } else if (type === 'brand') {
      setSelectedBrands(prev => prev.filter(b => b !== value));
    } else if (type === 'price') {
      setPriceRange([priceBounds.min, priceBounds.max]);
    } else if (type === 'stock') {
      setInStockOnly(false);
    } else if (type === 'type') {
      setSelectedTypes(prev => prev.filter(t => t !== value));
    } else if (type === 'goal') {
      setSelectedGoals(prev => prev.filter(g => g !== value));
    } else if (type === 'flavor') {
      setSelectedFlavors(prev => prev.filter(f => f !== value));
    }
  };

  const matchesSearch = (product: Product, query: string): boolean => {
    if (!query.trim()) return true;
    const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
    if (searchTerms.length === 0) return true;
    const productText = [
      product.designation_fr || '',
      product.designation_ar || '',
      product.brand?.designation_fr || '',
      product.sous_categorie?.designation_fr || '',
    ].join(' ').toLowerCase();
    return searchTerms.every(term => productText.includes(term));
  };

  // Creatine Sub-filters matching helpers
  const matchesType = (product: Product, type: string): boolean => {
    const text = (product.designation_fr || '').toLowerCase();
    if (type === 'Monohydrate') return text.includes('monohydrate') || text.includes('pure');
    if (type === 'Micronisée') return text.includes('micronized') || text.includes('micronisee') || text.includes('micronisée');
    if (type === 'Capsules') return text.includes('capsule') || text.includes('gelule') || text.includes('gélule') || text.includes('caps') || text.includes('gélules');
    if (type === 'Creapure') return text.includes('creapure');
    return true;
  };

  const matchesGoal = (product: Product, goal: string): boolean => {
    const text = ((product.designation_fr || '') + ' ' + ((product as any).description_fr || '')).toLowerCase();
    if (goal === 'Force') return true;
    if (goal === 'Masse') return text.includes('masse') || text.includes('mass') || text.includes('volum');
    if (goal === 'Performance') return text.includes('performance') || text.includes('endurance') || text.includes('energie') || text.includes('énergie');
    if (goal === 'Récupération') return text.includes('recup') || text.includes('récup') || text.includes('recover');
    return true;
  };

  // Handle filtering
  useEffect(() => {
    const isInitialCategoryLoad = initialCategory && 
                                   selectedCategories.length > 0 && 
                                   selectedCategories[0] === initialCategory &&
                                   !searchQuery.trim() && 
                                   selectedBrands.length === 0;

    if (isInitialCategoryLoad) {
      if (safeProductsData.products) {
        setProducts(safeProductsData.products);
      }
      setIsSearching(false);
      setCurrentBrand(null);
      return;
    }

    const applyFilters = async () => {
      setFilterError(null);
      if (searchQuery.trim()) {
        setCurrentBrand(null);
        setIsSearching(true);
        try {
          const baseProducts = products.length > 0 ? products : (safeProductsData.products || []);
          const foundProducts = baseProducts.filter(product => matchesSearch(product, searchQuery));
          setProducts(foundProducts);
        } catch (error) {
          console.error('Search error:', error);
          setProducts([]);
        } finally {
          setIsSearching(false);
        }
        return;
      }

      if (selectedCategories.length > 0) {
        setCurrentBrand(null);
        setIsSearching(true);
        try {
          const categoryParam = selectedCategories[0];
          let productsFound = false;
          
          try {
            const catResult = await getProductsByCategory(categoryParam);
            if (catResult.products !== undefined && catResult.category) {
              setProducts(catResult.products);
              productsFound = true;
            }
          } catch (e: any) {
            if (e?.response?.status !== 404) {
              console.log(`Category API error for "${categoryParam}":`, e?.response?.status || e?.message);
            }
          }

          if (!productsFound) {
            try {
              const subResult = await getProductsBySubCategory(categoryParam);
              if (subResult.products !== undefined && subResult.sous_category) {
                setProducts(subResult.products);
                productsFound = true;
              }
            } catch (e: any) {
              if (e?.response?.status !== 404) {
                console.log(`Subcategory API error for "${categoryParam}":`, e?.response?.status || e?.message);
              }
            }
          }

          if (!productsFound) {
            const allProducts = safeProductsData.products || [];
            const pParam = normalizeString(categoryParam);

            const filteredByCategory = allProducts.filter(p => {
              if (p.sous_categorie?.categorie) {
                const cat = p.sous_categorie.categorie;
                return (
                  normalizeString(cat.designation_fr) === pParam ||
                  cat.slug === categoryParam ||
                  cat.slug === nameToSlug(categoryParam)
                );
              }
              return false;
            });

            const filteredBySubCategory = allProducts.filter(p =>
              p.sous_categorie && (
                normalizeString(p.sous_categorie.designation_fr) === pParam ||
                p.sous_categorie.slug === categoryParam ||
                p.sous_categorie.slug === nameToSlug(categoryParam)
              )
            );

            const filtered = filteredByCategory.length > 0 ? filteredByCategory : filteredBySubCategory;
            setProducts(filtered);
          }

        } catch (error) {
          console.error('Error filtering by category:', error);
          setProducts([]);
          setFilterError(error instanceof Error ? error : new Error('Erreur lors du chargement des produits'));
        } finally {
          setIsSearching(false);
        }
        return;
      }

      if (selectedBrands.length > 0) {
        setIsSearching(true);
        const brandId = selectedBrands[0];

        const brandInfo = brands.find(b => b.id === brandId) || safeProductsData.brands.find(b => b.id === brandId);
        setCurrentBrand(brandInfo || null);

        const allProducts = safeProductsData.products || [];
        const filtered = allProducts.filter(p => p.brand_id === brandId);

        const fetchBrandData = async () => {
          try {
            const result = await getProductsByBrand(brandId);
            if (result.brand) {
              setCurrentBrand(result.brand);
            }
            if (filtered.length === 0) {
              setProducts(result.products || []);
            }
          } catch (error) {
            console.error('Error fetching brand data:', error);
          }
        };

        if (filtered.length > 0) {
          setProducts(filtered);
          setIsSearching(false);
          fetchBrandData();
        } else {
          try {
            const result = await getProductsByBrand(brandId);
            setProducts(result.products || []);
            if (result.brand) {
              setCurrentBrand(result.brand);
            }
          } catch (error) {
            setProducts([]);
            setFilterError(error instanceof Error ? error : new Error('Erreur lors du chargement de la marque'));
          } finally {
            setIsSearching(false);
          }
        }
        return;
      }

      if (!initialCategory) {
        setProducts(safeProductsData.products || []);
        setCurrentBrand(null);
      }
    };

    if (searchQuery.trim()) {
      const timeoutId = setTimeout(applyFilters, 500);
      return () => clearTimeout(timeoutId);
    } else {
      applyFilters();
    }
  }, [searchQuery, selectedCategories, selectedBrands, safeProductsData.products, brands, initialCategory, retryCount]);

  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [currentBrand?.id]);

  // Brand description fallback (thin-content): when a brand has no `description_fr`, the panel
  // rendered nothing. Synthesize a unique paragraph from the brand's OWN product data (real count,
  // real parent-category names, real min price) so the brand page always carries distinct copy.
  const brandDescriptionFallback = useMemo(() => {
    if (!currentBrand) return '';
    const brandProducts = products.filter((p) => p.brand_id === currentBrand.id);
    const list = brandProducts.length > 0 ? brandProducts : products;
    const catFreq = new Map<string, number>();
    let priceMin: number | null = null;
    list.forEach((p) => {
      const catName = p.sous_categorie?.categorie?.designation_fr?.trim();
      if (catName) catFreq.set(catName, (catFreq.get(catName) || 0) + 1);
      const price = getEffectivePrice(p);
      if (typeof price === 'number' && price > 0) {
        priceMin = priceMin === null ? price : Math.min(priceMin, price);
      }
    });
    const topCategories = [...catFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([n]) => n)
      .slice(0, 3);
    return generateBrandDescriptionFallback({
      name: currentBrand.designation_fr,
      productCount: list.length,
      topCategories,
      priceMin,
    });
  }, [currentBrand, products]);

  // Compute filtered & sorted products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Price Filter
    filtered = filtered.filter(product => {
      const price = getEffectivePrice(product);
      return price >= debouncedPriceRange[0] && price <= debouncedPriceRange[1];
    });

    // Brand Filter
    if (selectedBrands.length > 0 && !searchQuery && selectedCategories.length === 0) {
      filtered = filtered.filter(product =>
        product.brand_id && selectedBrands.includes(product.brand_id)
      );
    }

    // Availability (Stock) Filter
    if (inStockOnly) {
      filtered = filtered.filter(product => isInStock(product as any));
    }

    // Custom Type Filter
    if (isCreatineCategory && selectedTypes.length > 0) {
      filtered = filtered.filter(product =>
        selectedTypes.some(type => matchesType(product, type))
      );
    }

    // Custom Goal Filter
    if (isCreatineCategory && selectedGoals.length > 0) {
      filtered = filtered.filter(product =>
        selectedGoals.some(goal => matchesGoal(product, goal))
      );
    }

    // Custom Flavor Filter
    if (selectedFlavors.length > 0) {
      filtered = filtered.filter(product => {
        const aromes = (product as any).aromes || [];
        return aromes.some((a: any) => selectedFlavors.includes(a.designation_fr));
      });
    }

    // Sorting Engine
    if (sortBy === 'price-asc') {
      filtered = [...filtered].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (sortBy === 'price-desc') {
      filtered = [...filtered].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    } else if (sortBy === 'newest') {
      filtered = [...filtered].sort((a, b) => (b.new_product ?? 0) - (a.new_product ?? 0));
    } else if (sortBy === 'best-sellers') {
      filtered = [...filtered].sort((a, b) => (b.best_seller ?? 0) - (a.best_seller ?? 0));
    } else if (sortBy === 'popularity') {
      filtered = [...filtered].sort((a, b) => {
        const scoreA = (a.best_seller ?? 0) * 2 + (a.new_product ?? 0);
        const scoreB = (b.best_seller ?? 0) * 2 + (b.new_product ?? 0);
        return scoreB - scoreA;
      });
    }

    // Buyable first, always. Out-of-stock products are now shown rather than hidden, but they must
    // never outrank something a customer can actually put in the basket — otherwise "show
    // everything" would degrade the top of every grid.
    //
    // Runs AFTER the sort engine so it takes precedence, and relies on Array#sort being stable
    // (guaranteed since ES2019) so the chosen sort still orders products within each group.
    filtered = [...filtered].sort(
      (a, b) => Number(isInStock(b as never)) - Number(isInStock(a as never))
    );

    return filtered;
  }, [
    products, 
    debouncedPriceRange, 
    selectedBrands, 
    searchQuery, 
    selectedCategories, 
    inStockOnly, 
    isCreatineCategory, 
    selectedTypes, 
    selectedGoals, 
    selectedFlavors, 
    sortBy
  ]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedBrands, debouncedPriceRange, inStockOnly, selectedTypes, selectedGoals, selectedFlavors]);

  const toggleCategory = (categorySlug: string) => {
    setSelectedCategories(prev =>
      prev.includes(categorySlug) ? prev.filter(c => c !== categorySlug) : [categorySlug]
    );
  };

  const toggleBrand = (brandId: number) => {
    setSelectedBrands(prev =>
      prev.includes(brandId) ? prev.filter(b => b !== brandId) : [brandId]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const toggleFlavor = (flavor: string) => {
    setSelectedFlavors(prev =>
      prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([priceBounds.min, priceBounds.max]);
    setInStockOnly(false);
    setSortBy('popularity');
    setSelectedTypes([]);
    setSelectedGoals([]);
    setSelectedFlavors([]);
    setCurrentPage(1);
    setProducts(safeProductsData.products || []);
    router.push('/shop');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Shared props for the filter accordion — one source rendered in both the mobile Sheet and the
  // desktop aside (see <ProductFilters>), so the two panels can never drift again.
  const filterProps = {
    inStockOnly,
    setInStockOnly,
    isCreatineCategory,
    selectedTypes,
    toggleType,
    selectedGoals,
    toggleGoal,
    uniqueFlavors,
    selectedFlavors,
    toggleFlavor,
    categories,
    brands,
    filterCounts,
    selectedCategories,
    toggleCategory,
    selectedBrands,
    toggleBrand,
    priceRange,
    setPriceRange,
    priceBounds,
    sortBy,
    setSortBy,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Own boundary, so reading search params defers only this null-rendering leaf (see above). */}
      <Suspense fallback={null}>
        <UrlFilterSync onChange={setUrlFilters} />
      </Suspense>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 animate-fade-in">
        {/* Breadcrumbs */}
        {(() => {
          const breadcrumbItems = [];
          breadcrumbItems.push({ label: 'Boutique', href: '/shop' });
          
          if (initialBrand) {
            const brand = brands.find(b => b.id === initialBrand) || safeProductsData.brands.find(b => b.id === initialBrand);
            if (brand) {
              breadcrumbItems.push({ label: brand.designation_fr });
            }
          } else if (initialCategory) {
            const category = categories.find(c => c.slug === initialCategory);
            if (category) {
              breadcrumbItems.push({
                label: categoryBreadcrumbLabel?.trim() || category.designation_fr,
              });
            } else {
              const subcategory = categories
                .flatMap(c => c.sous_categories || [])
                .find(s => s.slug === initialCategory);
              if (subcategory) {
                if (parentCategory) {
                  const parentCat = categories.find(c => c.slug === parentCategory);
                  if (parentCat) {
                    breadcrumbItems.push({ label: parentCat.designation_fr, href: `/${parentCategory}` });
                  }
                }
                breadcrumbItems.push({
                  label: categoryBreadcrumbLabel?.trim() || subcategory.designation_fr,
                });
              } else {
                breadcrumbItems.push({ label: categoryBreadcrumbLabel?.trim() || initialCategory });
              }
            }
          }
          
          return breadcrumbItems.length > 1 ? (
            <div className="mb-4">
              <ShopBreadcrumbs items={breadcrumbItems} />
            </div>
          ) : null;
        })()}

        {/* ── Subcategory header ── */}
        {isSubcategory && !categorySeoLanding && (() => {
          const subcat = categories
            .flatMap(c => c.sous_categories || [])
            .find(s => s.slug === initialCategory);
          const catName = subcat?.designation_fr || initialCategory?.replace(/-/g, ' ') || '';
          return (
            <div className="mb-6 sm:mb-8">
              <PageHeader kicker="Catégorie" title={catName} />
            </div>
          );
        })()}

        {/* Category SEO Section */}
        {categorySeoLanding && <div className="mb-6">{categorySeoLanding}</div>}

        {/* Sous-catégories — real, crawlable SSR internal links (top category only) */}
        {topCategorySubcategories.length > 0 && (
          <nav aria-label="Sous-catégories" className="mb-6 sm:mb-8">
            <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-3">
              Sous-catégories
            </h2>
            <ul className="flex flex-wrap gap-2">
              {topCategorySubcategories.map((sub) => (
                <li key={sub.slug}>
                  <Link
                    href={`/${sub.slug}`}
                    className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition-colors hover:border-red-500 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400"
                  >
                    {sub.designation_fr}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Brand description panel */}
        {currentBrand && (
          <div className="mb-6 sm:mb-8 lg:mb-10 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6 md:p-8 lg:p-10 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 lg:gap-8">
              {currentBrand.logo && (
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-2">
                  <Image
                    src={getStorageUrl(currentBrand.logo)}
                    alt={currentBrand.designation_fr}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 80px, 112px"
                    priority
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-display uppercase tracking-tight text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                  {currentBrand.designation_fr}
                </h2>
                {currentBrand.description_fr ? (
                  <div className="space-y-2">
                    <div
                      className={`prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}
                      dangerouslySetInnerHTML={{ __html: currentBrand.description_fr }}
                    />
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold text-xs sm:text-sm transition-colors"
                    >
                      {isDescriptionExpanded ? 'Lire moins' : 'Lire plus'}
                    </button>
                  </div>
                ) : brandDescriptionFallback ? (
                  <p className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed">
                    {brandDescriptionFallback}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Page title and product counts */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            {!categorySeoLanding && !isSubcategory && (
              // Must stay in sync with the crawler view's h1 (x-crawler/shop/page.tsx). Googlebot is
              // rewritten to that route, so the two are the same page to a searcher but were two
              // different headings: "Boutique — Protéines & Compléments Alimentaires en Tunisie" for
              // the bot, "Tous nos produits" for everyone else. Divergent h1s on one URL are the
              // thing that turns dynamic rendering into cloaking, and "Tous nos produits" names no
              // product, category or country — nothing a Tunisian searcher would ever type.
              <h1 className="font-display uppercase tracking-tight leading-[0.95] text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                {currentBrand
                  ? `Produits ${currentBrand.designation_fr}`
                  : 'Boutique — Protéines & Compléments Alimentaires en Tunisie'}
              </h1>
            )}
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
              {!showSkeleton && (totalPages > 1 ? (
                `Affichage ${(currentPage - 1) * PRODUCTS_PER_PAGE + 1}-${Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} sur ${filteredProducts.length} produits`
              ) : (
                `${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''} trouvé${filteredProducts.length > 1 ? 's' : ''}`
              ))}
            </p>
          </div>
        </div>

        {/* Search, Filter & Sort Row */}
        <div className="flex flex-col md:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 min-h-[44px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:border-red-500 dark:focus:border-red-500 rounded-xl shadow-sm placeholder:text-gray-400 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Dynamic Sorting Select dropdown (Radix Select) */}
            <div className="flex-1 md:w-56 min-w-[155px]">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="min-h-[44px] h-auto border-gray-200 dark:border-gray-700 focus:ring-red-500 rounded-xl">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Popularité</SelectItem>
                  <SelectItem value="price-asc">Prix : croissant</SelectItem>
                  <SelectItem value="price-desc">Prix : décroissant</SelectItem>
                  <SelectItem value="newest">Nouveautés</SelectItem>
                  <SelectItem value="best-sellers">Meilleures ventes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop toggle filters view */}
            <Button
              variant="outline"
              onClick={() => setShowFiltersDesktop(!showFiltersDesktop)}
              className="hidden lg:flex items-center gap-2 min-h-[44px] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
            >
              <Filter className="h-4 w-4" />
              <span>Filtres</span>
              {appliedFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                  {appliedFilters.length}
                </Badge>
              )}
            </Button>

            {/* Mobile filter drawer sheet */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="lg:hidden shrink-0 min-h-[44px] px-4 border-gray-200 dark:border-gray-700 rounded-xl"
                  aria-label="Ouvrir les filtres"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <span>Filtres</span>
                  {(appliedFilters.length > 0) && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                      {appliedFilters.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                showCloseButton={false}
                className="h-[92dvh] max-h-[92dvh] rounded-t-2xl p-0 gap-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex flex-col"
              >
                {/* Grab handle */}
                <div className="shrink-0 flex justify-center pt-3 pb-1">
                  <span className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700" aria-hidden="true" />
                </div>

                {/* Header: title + active count + close (44px) */}
                <SheetHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0 px-4 pb-3 pt-1 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <SheetTitle className="flex items-center gap-2 font-display uppercase tracking-tight text-lg font-bold text-gray-900 dark:text-white">
                      <Filter className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                      Filtres
                    </SheetTitle>
                    {appliedFilters.length > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                        {appliedFilters.length}
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    aria-label="Fermer les filtres"
                    className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </SheetHeader>

                {/* Scrollable filter body */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
                  <ProductFilters variant="mobile" {...filterProps} />
                </div>

                {/* Sticky action footer: Réinitialiser + Appliquer */}
                <div className="shrink-0 flex items-center gap-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="min-h-[48px] flex-1 rounded-xl border-gray-300 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Réinitialiser
                  </Button>
                  <Button
                    onClick={() => setShowFilters(false)}
                    className="min-h-[48px] flex-[1.7] rounded-xl font-display uppercase tracking-wide font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm"
                  >
                    Voir {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Applied Filters Badges / Chips */}
        {appliedFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Filtres actifs :</span>
            {appliedFilters.map((filter, index) => (
              <Badge
                key={`${filter.type}-${filter.value}-${index}`}
                variant="outline"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 rounded-xl"
              >
                <span className="text-gray-900 dark:text-gray-100 font-medium">{filter.label}</span>
                <button
                  onClick={() => removeFilter(filter.type, filter.value)}
                  className="-mr-1 ml-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-1 transition-colors"
                  aria-label={`Retirer le filtre ${filter.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 rounded-lg"
            >
              Tout effacer
            </Button>
          </div>
        )}

        {/* Grid and Sidebar main split */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Collapsible Desktop Filter Panel */}
          {showFiltersDesktop && (
              <aside className="hidden lg:block w-72 flex-shrink-0">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-5 pt-5 pb-8 space-y-1 sticky top-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="font-display font-bold text-sm tracking-wide uppercase text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /> Filtres
                    </h2>
                    <div className="flex items-center gap-1.5">
                      {appliedFilters.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-xs text-red-600 hover:text-red-700 h-7 px-2"
                        >
                          Tout effacer
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFiltersDesktop(false)}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <ProductFilters variant="desktop" {...filterProps} />
                </div>
              </aside>
            )}

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {filterError ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
                <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 mb-4">
                  <CircleAlert className="h-10 w-10 text-red-600 dark:text-red-400" aria-hidden />
                </div>
                <h3 className="font-display uppercase tracking-tight text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Une erreur s&apos;est produite
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                  {filterError.message}
                </p>
                <Button
                  onClick={() => { setFilterError(null); setRetryCount(c => c + 1); }}
                  className="gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide min-h-[44px]"
                >
                  Réessayer
                </Button>
              </div>
            ) : showSkeleton ? (
              <ProductsSkeleton showBreadcrumb={false} showFilters={false} gridClassName="lg:grid-cols-3" />
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                <EmptyState
                  title="Aucun résultat"
                  description="Aucun produit ne correspond à ces filtres."
                  showShopLink={false}
                  className="pb-2"
                />
                <div className="flex justify-center pb-12 sm:pb-16">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="rounded-xl border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950/40 min-h-[44px]"
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-12">
                {/*
                  THREE ACROSS ON DESKTOP, NOT FOUR.

                  Owner, 13/08/2026: "make them more bigger on /shop to show 3 beside each other so
                  the image is clear." The complaint is about the PACKSHOT, not the column count —
                  three columns is the means.

                  ── WHY AN OVERRIDE AND NOT AN EDIT TO ProductGrid ──────────────────────────
                  ProductGrid is the one canonical grid for six surfaces: the homepage rails, this
                  page, /offres, /packs, /favoris and the skeletons. Changing its constant would
                  re-column the homepage too, which nobody asked for. `cn` is tailwind-merge, so
                  `lg:grid-cols-3` here replaces `lg:grid-cols-4` for THIS grid only and leaves the
                  1/2/3 steps below `lg` exactly as the docblock reasoned them out.

                  The same string is passed to <ProductsSkeleton gridClassName> below. That is not
                  tidiness: the skeleton renders through this same primitive, so if it stayed 4-up
                  the grid would visibly re-column the moment hydration swapped one for the other —
                  CLS on the page with the most cards on it.
                */}
                <ProductGrid className="min-w-0 w-full lg:grid-cols-3">
                  {paginatedProducts.map((product, idx) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="compact"
                      imageContext="packs"
                      /* Three columns, so the card is 285px with the filter rail open and 389px
                         with it closed at 1280 — against the default declaration's 205px. Without
                         this the browser keeps fetching the 4-up file and paints it into a box
                         nearly twice as wide, which is exactly the softness the wider cards were
                         meant to cure. Steps below `lg` are unchanged because the grid is. */
                      imageSizes="(max-width: 640px) 46vw, (max-width: 768px) 32vw, (max-width: 1024px) 26vw, 30vw"
                      // Mobile-first: the shop grid is 2-col on phones (81% of traffic), so only
                      // the first 2 cards are above the fold. Eager-loading 4 made cards 3–4
                      // (off-screen on mobile) compete with the LCP image. Prioritize just the
                      // first 2; the rest lazy-load (still prompt near the desktop fold).
                      priority={idx < 2}
                    />
                  ))}
                </ProductGrid>
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
                {categorySeoLandingBottom && (
                  <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-gray-200 dark:border-gray-800">
                    {categorySeoLandingBottom}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <ScrollToTop />
    </div>
  );
}

export function ShopPageClient(props: ShopPageClientProps) {
  return (
    <Suspense fallback={
      <>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <ProductsSkeleton gridClassName="lg:grid-cols-3" />
        </main>
      </>
    }>
      <ShopContent {...props} />
    </Suspense>
  );
}
