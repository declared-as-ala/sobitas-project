'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductCard } from '@/app/components/ProductCard';
import { ProductsSkeleton } from '@/app/components/ProductsSkeleton';
import { ShopBreadcrumbs } from '@/app/components/ShopBreadcrumbs';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Slider } from '@/app/components/ui/slider';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Filter, Search, X, CircleAlert, Sparkles, TrendingUp, Heart, Trophy, Zap } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Badge } from '@/app/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
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

const SKELETON_MIN_MS = 300;

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
  const searchParams = useSearchParams();
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
  const [inStockOnly, setInStockOnly] = useState(true);
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
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const search = searchParams.get('search');

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
  }, [searchParams, initialCategory, initialBrand, safeProductsData.products]);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#080808] dark:via-[#0a0a0a] dark:to-[#080808]">
      <Header />

      <main className="w-full mx-auto px-2.5 sm:px-4 md:px-5 lg:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12 animate-fade-in">
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

        {/* ── Subcategory Gold Hero Banner ── */}
        {isSubcategory && !categorySeoLanding && (() => {
          const subcat = categories
            .flatMap(c => c.sous_categories || [])
            .find(s => s.slug === initialCategory);
          const parentCat = categories.find(c =>
            (c.sous_categories || []).some(s => s.slug === initialCategory)
          );
          const catName = subcat?.designation_fr || initialCategory?.replace(/-/g, ' ') || '';
          return (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative mb-5 sm:mb-8 rounded-2xl sm:rounded-3xl overflow-hidden"
            >
              {/* Dark gold layered bg */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#100c00] via-[#1a1200] to-[#0d0900]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_65%_0%,rgba(212,175,55,0.2),transparent)]" />
              {/* Gold border lines */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
              {/* Decorative circles */}
              <div className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-amber-500/5 blur-2xl" />
              <div className="pointer-events-none absolute -left-8 bottom-0 w-40 h-40 rounded-full bg-orange-500/5 blur-2xl" />

              <div className="relative px-4 py-6 sm:px-10 sm:py-12 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex-1 min-w-0">
                  {/* Breadcrumb inside banner */}
                  {parentCat && (
                    <div className="flex items-center gap-1.5 mb-3 text-amber-400/60 text-xs">
                      <span>{parentCat.designation_fr}</span>
                      <span>›</span>
                      <span className="text-amber-400">{catName}</span>
                    </div>
                  )}
                  {/* Gold eyebrow */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px w-6 bg-amber-400" />
                    <span className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                      Collection Premium
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-2 leading-tight capitalize">
                    {catName}
                  </h1>
                  <p className="text-amber-100/40 text-xs sm:text-sm">
                    {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} disponible{filteredProducts.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Right badges — hidden on very small screens */}
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  {[
                    { icon: Trophy, label: 'Qualité Premium' },
                    { icon: Zap, label: 'Livraison Rapide' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 border border-amber-500/15">
                      <Icon className="h-4 w-4 text-amber-400" />
                      <span className="text-white/50 text-[10px] font-medium text-center whitespace-nowrap">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Category SEO Section */}
        {categorySeoLanding && <div className="mb-6">{categorySeoLanding}</div>}

        {/* Brand description panel */}
        {currentBrand && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mb-6 sm:mb-8 lg:mb-10 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 p-4 sm:p-6 md:p-8 lg:p-10 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-50/20 to-transparent dark:from-amber-900/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 lg:gap-8 relative z-10">
              {currentBrand.logo && (
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 shadow-sm p-2">
                  <Image
                    src={getStorageUrl(currentBrand.logo)}
                    alt={currentBrand.designation_fr}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 80px, 112px"
                    priority
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                  {currentBrand.designation_fr}
                </h2>
                {currentBrand.description_fr && (
                  <div className="space-y-2">
                    <div
                      className={`prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}
                      dangerouslySetInnerHTML={{ __html: currentBrand.description_fr }}
                    />
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold text-xs sm:text-sm transition-colors"
                    >
                      {isDescriptionExpanded ? 'Lire moins' : 'Lire plus'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Page title and product counts */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <div>
            {!categorySeoLanding && !isSubcategory && (
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
                {currentBrand ? `Produits ${currentBrand.designation_fr}` : 'Tous nos produits'}
              </h1>
            )}
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              {!showSkeleton && (totalPages > 1 ? (
                `Affichage ${(currentPage - 1) * PRODUCTS_PER_PAGE + 1}-${Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} sur ${filteredProducts.length} produits`
              ) : (
                `${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''} trouvé${filteredProducts.length > 1 ? 's' : ''}`
              ))}
            </p>
          </div>
        </motion.div>

        {/* Search, Filter & Sort Row */}
        <div className="flex flex-col md:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 pointer-events-none" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 min-h-[44px] bg-white dark:bg-gray-900 border-amber-200 dark:border-amber-900/30 focus:border-amber-500 dark:focus:border-amber-500 rounded-xl shadow-sm placeholder:text-gray-400 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Dynamic Sorting Select dropdown (Radix Select) */}
            <div className="flex-1 md:w-56 min-w-[155px]">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="min-h-[44px] h-auto border-gray-200 dark:border-gray-700 focus:ring-amber-500 rounded-xl">
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
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  {appliedFilters.length}
                </Badge>
              )}
            </Button>

            {/* Mobile filter drawer sheet */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="lg:hidden w-full sm:w-auto min-h-[44px] border-gray-200 dark:border-gray-700 rounded-xl"
                  aria-label="Ouvrir les filtres"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Filtres</span>
                  {(appliedFilters.length > 0) && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                      {appliedFilters.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <SheetHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 pb-4 border-b border-gray-200 dark:border-gray-800 -mx-6 px-6 pt-4">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-lg font-bold">Filtres</SheetTitle>
                    <div className="flex items-center gap-2">
                      {appliedFilters.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-amber-600 hover:text-amber-700 h-8">
                          Tout effacer
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </SheetHeader>
                <div className="pt-4 pb-8 space-y-4">
                  <Accordion type="multiple" defaultValue={['availability', 'categories', 'types', 'goals', 'flavors']} className="space-y-2">
                    
                    {/* Availability */}
                    <AccordionItem value="availability" className="border border-gray-250 dark:border-gray-800 rounded-xl px-4">
                      <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                        Disponibilité
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="mobile-in-stock"
                            checked={inStockOnly}
                            onCheckedChange={(checked) => setInStockOnly(checked === true)}
                            className="h-4.5 w-4.5"
                          />
                          <label htmlFor="mobile-in-stock" className="text-sm cursor-pointer flex-1 font-normal">
                            En stock uniquement
                          </label>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Creatine Type */}
                    {isCreatineCategory && (
                      <AccordionItem value="types" className="border border-gray-250 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                          Type de Créatine
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-3">
                            {['Monohydrate', 'Micronisée', 'Capsules', 'Creapure'].map(type => (
                              <div key={type} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`mobile-type-${type}`}
                                  checked={selectedTypes.includes(type)}
                                  onCheckedChange={() => toggleType(type)}
                                  className="h-4.5 w-4.5"
                                />
                                <label htmlFor={`mobile-type-${type}`} className="text-sm cursor-pointer flex-1 font-normal">
                                  {type}
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Creatine Goal */}
                    {isCreatineCategory && (
                      <AccordionItem value="goals" className="border border-gray-250 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                          Objectif
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-3">
                            {['Force', 'Masse', 'Performance', 'Récupération'].map(goal => (
                              <div key={goal} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`mobile-goal-${goal}`}
                                  checked={selectedGoals.includes(goal)}
                                  onCheckedChange={() => toggleGoal(goal)}
                                  className="h-4.5 w-4.5"
                                />
                                <label htmlFor={`mobile-goal-${goal}`} className="text-sm cursor-pointer flex-1 font-normal">
                                  {goal}
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Dynamic Flavors */}
                    {uniqueFlavors.length > 0 && (
                      <AccordionItem value="flavors" className="border border-gray-250 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                          Arômes
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {uniqueFlavors.map(flavor => (
                              <div key={flavor} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`mobile-flavor-${flavor}`}
                                  checked={selectedFlavors.includes(flavor)}
                                  onCheckedChange={() => toggleFlavor(flavor)}
                                  className="h-4.5 w-4.5"
                                />
                                <label htmlFor={`mobile-flavor-${flavor}`} className="text-sm cursor-pointer flex-1 font-normal">
                                  {flavor}
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Categories */}
                    {categories.length > 0 && (
                      <AccordionItem value="categories" className="border border-gray-250 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                          Catégories
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {categories.map(category => {
                              const count = filterCounts.categoryCounts.get(category.slug) || 0;
                              const isSelected = selectedCategories.includes(category.slug);
                              return (
                                <div key={category.id} className="flex items-center justify-between space-x-3 group">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <Checkbox
                                      id={`mobile-cat-${category.id}`}
                                      checked={isSelected}
                                      onCheckedChange={() => toggleCategory(category.slug)}
                                      className="h-4.5 w-4.5"
                                    />
                                    <label
                                      htmlFor={`mobile-cat-${category.id}`}
                                      className={`text-sm cursor-pointer flex-1 font-normal truncate ${isSelected ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {category.designation_fr}
                                    </label>
                                  </div>
                                  <span className="text-xs text-gray-400 tabular-nums">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Brands */}
                    {brands.length > 0 && (
                      <AccordionItem value="brands" className="border border-gray-250 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                          Marques
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {brands.map(brand => {
                              const count = filterCounts.brandCounts.get(brand.id) || 0;
                              const isSelected = selectedBrands.includes(brand.id);
                              return (
                                <div key={brand.id} className="flex items-center justify-between space-x-3 group">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <Checkbox
                                      id={`mobile-brand-${brand.id}`}
                                      checked={isSelected}
                                      onCheckedChange={() => toggleBrand(brand.id)}
                                      className="h-4.5 w-4.5"
                                    />
                                    <label
                                      htmlFor={`mobile-brand-${brand.id}`}
                                      className={`text-sm cursor-pointer flex-1 font-normal truncate ${isSelected ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {brand.designation_fr}
                                    </label>
                                  </div>
                                  <span className="text-xs text-gray-400 tabular-nums">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Price Range */}
                    <AccordionItem value="price" className="border border-gray-250 dark:border-gray-800 rounded-xl px-4">
                      <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                        Prix
                      </AccordionTrigger>
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
                            className="w-full [&_[data-slot=slider-range]]:bg-amber-500 [&_[data-slot=slider-thumb]]:border-amber-500"
                          />
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{priceBounds.min} DT</span>
                            <span>{priceBounds.max} DT</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>
                </div>
                <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-150 dark:border-gray-800 -mx-6 px-6 py-4 mt-4">
                  <Button className="w-full min-h-[46px] rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]" onClick={() => setShowFilters(false)}>
                    Voir {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Applied Filters Badges / Chips */}
        {appliedFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 mb-6"
          >
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Filtres actifs :</span>
            {appliedFilters.map((filter, index) => (
              <Badge
                key={`${filter.type}-${filter.value}-${index}`}
                variant="outline"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 rounded-xl"
              >
                <span className="text-gray-900 dark:text-gray-150 font-medium">{filter.label}</span>
                <button
                  onClick={() => removeFilter(filter.type, filter.value)}
                  className="ml-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-0.5 transition-colors"
                  aria-label={`Retirer le filtre ${filter.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 h-8 rounded-lg"
            >
              Tout effacer
            </Button>
          </motion.div>
        )}

        {/* Grid and Sidebar main split */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Collapsible Desktop Filter Panel */}
          <AnimatePresence>
            {showFiltersDesktop && (
              <motion.aside
                initial={{ opacity: 0, x: -15, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 'auto' }}
                exit={{ opacity: 0, x: -15, width: 0 }}
                transition={{ duration: 0.25 }}
                className="hidden lg:block w-72 flex-shrink-0"
              >
                <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-amber-100 dark:border-amber-500/10 px-5 pt-5 pb-8 space-y-1 sticky top-4 shadow-[0_4px_20px_rgba(245,158,11,0.06)] dark:shadow-[0_0_30px_rgba(0,0,0,0.4)]">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-amber-100 dark:border-gray-800">
                    <h2 className="font-black text-sm tracking-wide uppercase bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-amber-500" /> Filtres
                    </h2>
                    <div className="flex items-center gap-1.5">
                      {appliedFilters.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-xs text-amber-600 hover:text-amber-700 h-7 px-2"
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

                  <Accordion type="multiple" defaultValue={['availability', 'types', 'goals', 'flavors']} className="space-y-1">
                    
                    {/* Availability */}
                    <AccordionItem value="availability" className="border border-gray-150 dark:border-gray-800 rounded-xl px-4">
                      <AccordionTrigger className="py-2.5 text-xs sm:text-sm font-semibold hover:no-underline">
                        Disponibilité
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="desktop-in-stock"
                            checked={inStockOnly}
                            onCheckedChange={(checked) => setInStockOnly(checked === true)}
                            className="h-4 w-4"
                          />
                          <label htmlFor="desktop-in-stock" className="text-xs sm:text-sm cursor-pointer flex-1 font-normal">
                            En stock uniquement
                          </label>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Creatine Type */}
                    {isCreatineCategory && (
                      <AccordionItem value="types" className="border border-gray-150 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-2.5 text-xs sm:text-sm font-semibold hover:no-underline">
                          Type de Créatine
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-2">
                            {['Monohydrate', 'Micronisée', 'Capsules', 'Creapure'].map(type => (
                              <div key={type} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`desktop-type-${type}`}
                                  checked={selectedTypes.includes(type)}
                                  onCheckedChange={() => toggleType(type)}
                                  className="h-4 w-4"
                                />
                                <label
                                  htmlFor={`desktop-type-${type}`}
                                  className={`text-xs sm:text-sm cursor-pointer flex-1 font-normal ${selectedTypes.includes(type) ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                  {type}
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Creatine Goal */}
                    {isCreatineCategory && (
                      <AccordionItem value="goals" className="border border-gray-150 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-2.5 text-xs sm:text-sm font-semibold hover:no-underline">
                          Objectif
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-2">
                            {['Force', 'Masse', 'Performance', 'Récupération'].map(goal => (
                              <div key={goal} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`desktop-goal-${goal}`}
                                  checked={selectedGoals.includes(goal)}
                                  onCheckedChange={() => toggleGoal(goal)}
                                  className="h-4 w-4"
                                />
                                <label
                                  htmlFor={`desktop-goal-${goal}`}
                                  className={`text-xs sm:text-sm cursor-pointer flex-1 font-normal ${selectedGoals.includes(goal) ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                  {goal}
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Dynamic Flavors */}
                    {uniqueFlavors.length > 0 && (
                      <AccordionItem value="flavors" className="border border-gray-150 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-2.5 text-xs sm:text-sm font-semibold hover:no-underline">
                          Arômes
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {uniqueFlavors.map(flavor => (
                              <div key={flavor} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`desktop-flavor-${flavor}`}
                                  checked={selectedFlavors.includes(flavor)}
                                  onCheckedChange={() => toggleFlavor(flavor)}
                                  className="h-4 w-4"
                                />
                                <label
                                  htmlFor={`desktop-flavor-${flavor}`}
                                  className={`text-xs sm:text-sm cursor-pointer flex-1 font-normal ${selectedFlavors.includes(flavor) ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                  {flavor}
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Categories */}
                    {categories.length > 0 && (
                      <AccordionItem value="categories" className="border border-gray-150 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-2.5 text-xs sm:text-sm font-semibold hover:no-underline">
                          Catégories
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-2">
                            {categories.map(category => {
                              const count = filterCounts.categoryCounts.get(category.slug) || 0;
                              const isSelected = selectedCategories.includes(category.slug);
                              return (
                                <div key={category.id} className="flex items-center justify-between space-x-3 group">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <Checkbox
                                      id={`desktop-cat-${category.id}`}
                                      checked={isSelected}
                                      onCheckedChange={() => toggleCategory(category.slug)}
                                      className="h-4 w-4"
                                    />
                                    <label
                                      htmlFor={`desktop-cat-${category.id}`}
                                      className={`text-xs sm:text-sm cursor-pointer flex-1 font-normal truncate ${isSelected ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {category.designation_fr}
                                    </label>
                                  </div>
                                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Brands */}
                    {brands.length > 0 && (
                      <AccordionItem value="brands" className="border border-gray-150 dark:border-gray-800 rounded-xl px-4">
                        <AccordionTrigger className="py-2.5 text-xs sm:text-sm font-semibold hover:no-underline">
                          Marques
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-2">
                            {brands.map(brand => {
                              const count = filterCounts.brandCounts.get(brand.id) || 0;
                              const isSelected = selectedBrands.includes(brand.id);
                              return (
                                <div key={brand.id} className="flex items-center justify-between space-x-3 group">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <Checkbox
                                      id={`desktop-brand-${brand.id}`}
                                      checked={isSelected}
                                      onCheckedChange={() => toggleBrand(brand.id)}
                                      className="h-4 w-4"
                                    />
                                    <label
                                      htmlFor={`desktop-brand-${brand.id}`}
                                      className={`text-xs sm:text-sm cursor-pointer flex-1 font-normal truncate ${isSelected ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {brand.designation_fr}
                                    </label>
                                  </div>
                                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Price Range */}
                    <AccordionItem value="price" className="border border-gray-150 dark:border-gray-800 rounded-xl px-4">
                      <AccordionTrigger className="py-2.5 text-xs sm:text-sm font-semibold hover:no-underline">
                        Prix
                      </AccordionTrigger>
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
                            className="w-full [&_[data-slot=slider-range]]:bg-amber-500 [&_[data-slot=slider-thumb]]:border-amber-500"
                          />
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{priceBounds.min} DT</span>
                            <span>{priceBounds.max} DT</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {filterError ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4 mb-4 animate-bounce">
                  <CircleAlert className="h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Une erreur s&apos;est produite
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                  {filterError.message}
                </p>
                <Button
                  onClick={() => { setFilterError(null); setRetryCount(c => c + 1); }}
                  className="gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black min-h-[44px]"
                >
                  Réessayer
                </Button>
              </div>
            ) : showSkeleton ? (
              <ProductsSkeleton showBreadcrumb={false} showFilters={false} />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Aucun produit ne correspond à ces critères
                </p>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl border-gray-250 dark:border-gray-700 min-h-[44px]"
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-12">
                {/* 2-column mobile, 3-column tablet, 3/4-column desktop responsive grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-[360px]:gap-2 sm:gap-4 md:gap-5 lg:gap-6 min-w-0 w-full">
                  {paginatedProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="compact"
                      imageContext="packs"
                    />
                  ))}
                </div>
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

      <Footer />
      <ScrollToTop />
    </div>
  );
}

export function ShopPageClient(props: ShopPageClientProps) {
  return (
    <Suspense fallback={
      <>
        <Header />
        <main className="w-full mx-auto px-2.5 sm:px-4 md:px-5 lg:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
          <ProductsSkeleton />
        </main>
        <Footer />
      </>
    }>
      <ShopContent {...props} />
    </Suspense>
  );
}
