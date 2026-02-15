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
import { Filter, Search, X, CircleAlert } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Badge } from '@/app/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Pagination } from '@/app/components/ui/pagination';
import type { Product, Category, Brand } from '@/types';
import { searchProducts, getProductsByCategory, getProductsBySubCategory, getProductsByBrand } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';

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
}

function ShopContent({ productsData, categories, brands, initialCategory, isSubcategory, parentCategory, initialBrand }: ShopPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [debouncedPriceRange, setDebouncedPriceRange] = useState<[number, number]>([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [showFiltersDesktop, setShowFiltersDesktop] = useState(true);
  
  // Provide safe defaults if productsData is undefined
  const safeProductsData = productsData || {
    products: [],
    brands: [],
    categories: [],
  };
  
  // Initialize products from props - if initialCategory is provided, products are already filtered from server
  const [products, setProducts] = useState<Product[]>(() => {
    // If we have initialCategory, products are already filtered from server, use them directly
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

    // Use initialCategory from props if available (new route structure), otherwise use query param
    const categoryToUse = initialCategory || category;

    // Update categories - clear if not in URL, set if present
    if (categoryToUse) {
      const decodedCategory = decodeURIComponent(categoryToUse);
      setSelectedCategories(prev => {
        // Only update if different to avoid unnecessary re-renders
        return prev.length === 1 && prev[0] === decodedCategory ? prev : [decodedCategory];
      });
    } else {
      // Boutique globale (/shop): reset filters and products so we never show "Aucun produit trouvé"
      setSelectedCategories([]);
      setProducts(safeProductsData.products || []);
      setCurrentBrand(null);
    }

    // Use initialBrand from props if available (new route structure), otherwise use query param
    const brandToUse = initialBrand ? initialBrand.toString() : brand;

    // Update brands - clear if not in URL, set if present
    if (brandToUse) {
      const brandId = parseInt(brandToUse);
      setSelectedBrands(prev => {
        // Only update if different to avoid unnecessary re-renders
        return prev.length === 1 && prev[0] === brandId ? prev : [brandId];
      });
    } else {
      setSelectedBrands([]);
    }

    // Update search query
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
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Convert name to slug format (e.g., "Gainers Haute Énergie" -> "gainers-haute-energie")
  const nameToSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .trim();
  };

  // Find subcategory by name (case-insensitive, accent-insensitive, flexible matching)
  const findSubCategoryByName = (name: string): { id: number; name: string; slug: string } | null => {
    const normalizedName = normalizeString(name);

    // First try exact match
    let found = subCategories.find(sub => normalizeString(sub.name) === normalizedName);

    // If no exact match, try partial match (contains)
    if (!found) {
      found = subCategories.find(sub =>
        normalizeString(sub.name).includes(normalizedName) ||
        normalizedName.includes(normalizeString(sub.name))
      );
    }

    return found ? { id: found.id, name: found.name, slug: found.slug } : null;
  };

  // Get min and max prices (use effective price: promo if valid, else prix)
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
      // Count by category
      if (product.sous_categorie?.categorie) {
        const catSlug = product.sous_categorie.categorie.slug;
        categoryCounts.set(catSlug, (categoryCounts.get(catSlug) || 0) + 1);
      }
      // Count by brand
      if (product.brand_id) {
        brandCounts.set(product.brand_id, (brandCounts.get(product.brand_id) || 0) + 1);
      }
    });

    return { categoryCounts, brandCounts };
  }, [safeProductsData.products]);

  // Get applied filters as chips
  const appliedFilters = useMemo(() => {
    const filters: Array<{ type: 'category' | 'brand' | 'price' | 'stock'; label: string; value: string | number }> = [];
    
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

    // Note: inStockOnly is not included in chips as it's a default filter
    // Users can still see it in the filter panel

    return filters;
  }, [selectedCategories, selectedBrands, priceRange, priceBounds, categories, brands, safeProductsData.brands]);

  // Remove a specific filter
  const removeFilter = (type: 'category' | 'brand' | 'price' | 'stock', value: string | number) => {
    if (type === 'category') {
      setSelectedCategories(prev => prev.filter(c => c !== value));
    } else if (type === 'brand') {
      setSelectedBrands(prev => prev.filter(b => b !== value));
    } else if (type === 'price') {
      setPriceRange([priceBounds.min, priceBounds.max]);
    } else if (type === 'stock') {
      setInStockOnly(false);
    }
  };

  // Helper function to check if product matches search query (handles multiple words)
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

    // All search terms must be found in the product text
    return searchTerms.every(term => productText.includes(term));
  };

  // Handle filtering (search, category, brand)
  useEffect(() => {
    // If initialCategory is provided and matches selected category, products are already filtered from server
    // Only re-filter if user manually changes filters (not from initialCategory)
    const isInitialCategoryLoad = initialCategory && 
                                   selectedCategories.length > 0 && 
                                   selectedCategories[0] === initialCategory &&
                                   !searchQuery.trim() && 
                                   selectedBrands.length === 0;

    // If this is the initial load with a category from server, use products from props
    if (isInitialCategoryLoad) {
      // Products are already filtered from server, just ensure they're set
      if (safeProductsData.products) {
        setProducts(safeProductsData.products);
      }
      setIsSearching(false);
      setCurrentBrand(null);
      return;
    }

    // If we have a simple brand/category filter, apply it immediately without debounce
    // If we have a text search, use debounce

    const applyFilters = async () => {
      setFilterError(null);
      // 1. Search Query (Priority, Async Debounced)
      if (searchQuery.trim()) {
        setCurrentBrand(null);
        setIsSearching(true);
        try {
          // When searching, search within current filtered products or all products
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

      // 2. Category/Subcategory Filter (Always use API for accurate results)
      if (selectedCategories.length > 0) {
        setCurrentBrand(null);
        setIsSearching(true);
        try {
          const categoryParam = selectedCategories[0];
          let productsFound = false;
          
          // IMPORTANT: Try category API first (since categories from home page are main categories)
          // This is more efficient and matches the expected behavior
          try {
            const catResult = await getProductsByCategory(categoryParam);
            if (catResult.products !== undefined && catResult.category) {
              // API returned a valid response with category data
              setProducts(catResult.products);
              productsFound = true;
              console.log(`[ShopPageClient] Found ${catResult.products.length} products for category "${categoryParam}"`);
            }
          } catch (e: any) {
            // Category API failed, try as subcategory
            if (e?.response?.status !== 404) {
              console.log(`Category API error for "${categoryParam}":`, e?.response?.status || e?.message);
            }
          }

          // Try as subcategory slug (if category didn't work)
          if (!productsFound) {
            try {
              const subResult = await getProductsBySubCategory(categoryParam);
              if (subResult.products !== undefined && subResult.sous_category) {
                // API returned a valid response with subcategory data
                setProducts(subResult.products);
                productsFound = true;
                console.log(`[ShopPageClient] Found ${subResult.products.length} products for subcategory "${categoryParam}"`);
              }
            } catch (e: any) {
              // Subcategory API also failed
              if (e?.response?.status !== 404) {
                console.log(`Subcategory API error for "${categoryParam}":`, e?.response?.status || e?.message);
              }
            }
          }

          // Final fallback: try client-side filtering only if API completely failed
          if (!productsFound) {
            console.warn(`[ShopPageClient] API failed for "${categoryParam}", trying client-side fallback`);
            const allProducts = safeProductsData.products || [];
            const pParam = normalizeString(categoryParam);

            // Try to match as category first (more common from home page)
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

            // Try to match as subcategory
            const filteredBySubCategory = allProducts.filter(p =>
              p.sous_categorie && (
                normalizeString(p.sous_categorie.designation_fr) === pParam ||
                p.sous_categorie.slug === categoryParam ||
                p.sous_categorie.slug === nameToSlug(categoryParam)
              )
            );

            // Use whichever has results
            const filtered = filteredByCategory.length > 0 ? filteredByCategory : filteredBySubCategory;
            console.log(`[ShopPageClient] Client-side fallback found ${filtered.length} products`);
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

      // 3. Brand Filter (FAST PATH)
      if (selectedBrands.length > 0) {
        setIsSearching(true);
        const brandId = selectedBrands[0];

        // Find brand info from props (temporary, will be replaced by API data)
        const brandInfo = brands.find(b => b.id === brandId) || safeProductsData.brands.find(b => b.id === brandId);
        setCurrentBrand(brandInfo || null);

        // Filter client-side first for fast display
        const allProducts = safeProductsData.products || [];
        const filtered = allProducts.filter(p => p.brand_id === brandId);

        // Always fetch brand data from API to get full info including description
        // This runs in parallel with client-side filtering
        const fetchBrandData = async () => {
          try {
            const result = await getProductsByBrand(brandId);
            // Update brand with full data from API (includes description_fr)
            if (result.brand) {
              setCurrentBrand(result.brand);
            }
            // If no client-side products found, use API products
            if (filtered.length === 0) {
              setProducts(result.products || []);
            }
          } catch (error) {
            console.error('Error fetching brand data:', error);
            // Keep the brand from props if API fails
          }
        };

        // If we found products client-side, use them immediately
        if (filtered.length > 0) {
          setProducts(filtered);
          setIsSearching(false);
          // Still fetch brand data in background for description
          fetchBrandData();
        } else {
          // No client-side products, fetch everything from API
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

      // 4. No Filters - only reset if not coming from a category page
      if (!initialCategory) {
        setProducts(safeProductsData.products || []);
        setCurrentBrand(null);
      }
    };

    if (searchQuery.trim()) {
      // Debounce for search only
      const timeoutId = setTimeout(applyFilters, 500);
      return () => clearTimeout(timeoutId);
    } else {
      // Immediate for others
      applyFilters();
    }
  }, [searchQuery, selectedCategories, selectedBrands, safeProductsData.products, brands, initialCategory, retryCount]);

  // Reset description expanded state when brand changes
  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [currentBrand?.id]);

  // Filter products locally (for price and additional filters)
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Price filter (effective price: promo if valid, else prix) - use debounced value
    filtered = filtered.filter(product => {
      const price = getEffectivePrice(product);
      return price >= debouncedPriceRange[0] && price <= debouncedPriceRange[1];
    });

    // Brand filter (if not already filtered by API)
    if (selectedBrands.length > 0 && !searchQuery && selectedCategories.length === 0) {
      filtered = filtered.filter(product =>
        product.brand_id && selectedBrands.includes(product.brand_id)
      );
    }

    // In stock filter
    if (inStockOnly) {
      filtered = filtered.filter(product => {
        // rupture === 1 means in stock, undefined also means in stock
        const isInStock = (product as any).rupture === 1 || (product as any).rupture === undefined;
        return isInStock;
      });
    }

    return filtered;
  }, [products, priceRange, selectedBrands, searchQuery, selectedCategories, inStockOnly]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

    // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedBrands, debouncedPriceRange, inStockOnly]);

  const toggleCategory = (categorySlug: string) => {
    setSelectedCategories(prev =>
      prev.includes(categorySlug)
        ? prev.filter(c => c !== categorySlug)
        : [categorySlug] // Only one category at a time for API filtering
    );
  };

  const toggleBrand = (brandId: number) => {
    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(b => b !== brandId)
        : [brandId] // Only one brand at a time for API filtering
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([priceBounds.min, priceBounds.max]);
    setInStockOnly(false);
    setCurrentPage(1);
    setProducts(safeProductsData.products || []);
    router.push('/shop');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of products section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Header />

      <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
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
            // Try to find category or subcategory
            const category = categories.find(c => c.slug === initialCategory);
            if (category) {
              breadcrumbItems.push({ label: category.designation_fr });
            } else {
              // Try to find subcategory
              const subcategory = categories
                .flatMap(c => c.sous_categories || [])
                .find(s => s.slug === initialCategory);
              if (subcategory) {
                if (parentCategory) {
                  const parentCat = categories.find(c => c.slug === parentCategory);
                  if (parentCat) {
                    breadcrumbItems.push({ label: parentCat.designation_fr, href: `/category/${parentCategory}` });
                  }
                }
                breadcrumbItems.push({ label: subcategory.designation_fr });
              } else {
                breadcrumbItems.push({ label: initialCategory });
              }
            }
          }
          
          return breadcrumbItems.length > 1 ? <ShopBreadcrumbs items={breadcrumbItems} /> : null;
        })()}

        {/* Brand description – shown when filtering by brand (e.g. /shop?brand=1) */}
        {currentBrand && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mb-6 sm:mb-8 lg:mb-10 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 p-4 sm:p-6 md:p-8 lg:p-10 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden relative"
          >
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-50/30 to-transparent dark:from-red-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 lg:gap-8 relative z-10">
              {currentBrand.logo && (
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-md p-2 sm:p-3 md:p-4">
                  <Image
                    src={getStorageUrl(currentBrand.logo)}
                    alt={currentBrand.designation_fr}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 80px, (max-width: 1024px) 112px, 144px"
                    priority
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight">
                  {currentBrand.designation_fr}
                </h2>
                {currentBrand.description_fr && (
                  <div className="space-y-2">
                    <div
                      className={`prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none 
                        text-gray-600 dark:text-gray-300 
                        prose-headings:text-gray-900 dark:prose-headings:text-white 
                        prose-p:leading-relaxed prose-p:mb-3 sm:prose-p:mb-4
                        prose-a:text-red-600 dark:prose-a:text-red-500 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-gray-900 dark:prose-strong:text-white
                        prose-ul:list-disc prose-ul:ml-4 sm:prose-ul:ml-6
                        prose-ol:list-decimal prose-ol:ml-4 sm:prose-ol:ml-6
                        prose-li:mb-2
                        prose-img:rounded-lg prose-img:shadow-md
                        prose-blockquote:border-l-4 prose-blockquote:border-red-500 prose-blockquote:pl-4 prose-blockquote:italic
                        ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}
                      dangerouslySetInnerHTML={{ __html: currentBrand.description_fr }}
                    />
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm sm:text-base transition-colors"
                    >
                      {isDescriptionExpanded ? 'Lire moins' : 'Lire plus'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Page Header - compact on mobile */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-10"
        >
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {currentBrand ? `Produits ${currentBrand.designation_fr}` : 'Tous nos produits'}
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400">
            {!showSkeleton && (totalPages > 1 ? (
              `Affichage ${(currentPage - 1) * PRODUCTS_PER_PAGE + 1}-${Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} sur ${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''}`
            ) : (
              `${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''} trouvé${filteredProducts.length > 1 ? 's' : ''}`
            ))}
          </p>
        </motion.div>

        {/* Search + Filter Button */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 min-h-[44px] border-gray-200 dark:border-gray-700 focus:border-red-500 dark:focus:border-red-500"
            />
          </div>
          {/* Filter Button - Desktop & Mobile */}
          <div className="flex gap-2">
            {/* Desktop Filter Button */}
            <Button
              variant="outline"
              onClick={() => setShowFiltersDesktop(!showFiltersDesktop)}
              className="hidden md:flex items-center gap-2 min-h-[44px] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Filter className="h-4 w-4" />
              <span>Filtres</span>
              {appliedFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {appliedFilters.length}
                </Badge>
              )}
            </Button>
            {/* Mobile Filter Button */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="md:hidden min-h-[44px] min-w-[44px] flex-shrink-0 border-gray-200 dark:border-gray-700"
                  aria-label="Ouvrir les filtres"
                >
                  <Filter className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filtres</span>
                  {(appliedFilters.length > 0 || inStockOnly) && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                      {appliedFilters.length + (inStockOnly ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <SheetHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 pb-4 border-b border-gray-200 dark:border-gray-800 -mx-6 px-6 pt-6">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-xl font-semibold">Filtres</SheetTitle>
                    <div className="flex items-center gap-2">
                      {appliedFilters.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-sm text-red-600 hover:text-red-700">
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
                <div className="pt-6 pb-8">
                  <Accordion type="multiple" defaultValue={['availability', 'categories']} className="space-y-1">
                    {/* Availability */}
                    <AccordionItem value="availability" className="border border-gray-200 dark:border-gray-800 rounded-lg px-4">
                      <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
                        Disponibilité
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="mobile-in-stock"
                            checked={inStockOnly}
                            onCheckedChange={(checked) => setInStockOnly(checked === true)}
                            className="h-4 w-4"
                          />
                          <label htmlFor="mobile-in-stock" className="text-sm cursor-pointer flex-1 font-normal">
                            En stock uniquement
                          </label>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Categories */}
                    {categories.length > 0 && (
                      <AccordionItem value="categories" className="border border-gray-200 dark:border-gray-800 rounded-lg px-4">
                        <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
                          Catégories
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-3 max-h-64 overflow-y-auto">
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
                                      className="h-4 w-4"
                                    />
                                    <label
                                      htmlFor={`mobile-cat-${category.id}`}
                                      className={`text-sm cursor-pointer flex-1 font-normal truncate ${isSelected ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {category.designation_fr}
                                    </label>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                    {count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Brands */}
                    {brands.length > 0 && (
                      <AccordionItem value="brands" className="border border-gray-200 dark:border-gray-800 rounded-lg px-4">
                        <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
                          Marques
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-3 max-h-64 overflow-y-auto">
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
                                      className="h-4 w-4"
                                    />
                                    <label
                                      htmlFor={`mobile-brand-${brand.id}`}
                                      className={`text-sm cursor-pointer flex-1 font-normal truncate ${isSelected ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {brand.designation_fr}
                                    </label>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                    {count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Price Range */}
                    <AccordionItem value="price" className="border border-gray-200 dark:border-gray-800 rounded-lg px-4">
                      <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
                        Prix
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {priceRange[0]} DT - {priceRange[1]} DT
                            </span>
                          </div>
                          <Slider
                            value={priceRange}
                            onValueChange={(value) => setPriceRange(value as [number, number])}
                            min={priceBounds.min}
                            max={priceBounds.max}
                            step={10}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{priceBounds.min} DT</span>
                            <span>{priceBounds.max} DT</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 -mx-6 px-6 py-4 mt-4">
                  <Button className="w-full min-h-[44px]" onClick={() => setShowFilters(false)}>
                    Voir {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Applied Filters Chips */}
        {appliedFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6"
          >
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Filtres actifs:</span>
            {appliedFilters.map((filter, index) => (
              <Badge
                key={`${filter.type}-${filter.value}-${index}`}
                variant="outline"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span>{filter.label}</span>
                <button
                  onClick={() => removeFilter(filter.type, filter.value)}
                  className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
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
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Tout effacer
            </Button>
          </motion.div>
        )}

        {/* Main Content Area - Filters + Products */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Filter Panel - Collapsible */}
          <AnimatePresence>
            {showFiltersDesktop && (
              <motion.aside
                initial={{ opacity: 0, x: -20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 'auto' }}
                exit={{ opacity: 0, x: -20, width: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden md:block w-72 flex-shrink-0"
              >
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-1 sticky top-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="font-semibold text-base">Filtres</h2>
                    <div className="flex items-center gap-2">
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

                  <Accordion type="multiple" defaultValue={['availability', 'categories']} className="space-y-1">
                    {/* Availability */}
                    <AccordionItem value="availability" className="border border-gray-200 dark:border-gray-800 rounded-lg px-4">
                      <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
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
                          <label
                            htmlFor="desktop-in-stock"
                            className="text-sm cursor-pointer flex-1 font-normal"
                          >
                            En stock uniquement
                          </label>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Categories */}
                    {categories.length > 0 && (
                      <AccordionItem value="categories" className="border border-gray-200 dark:border-gray-800 rounded-lg px-4">
                        <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                          Catégories
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-2 max-h-64 overflow-y-auto">
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
                                      className={`text-sm cursor-pointer flex-1 font-normal truncate ${isSelected ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {category.designation_fr}
                                    </label>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                    {count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Brands */}
                    {brands.length > 0 && (
                      <AccordionItem value="brands" className="border border-gray-200 dark:border-gray-800 rounded-lg px-4">
                        <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                          Marques
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-2 max-h-64 overflow-y-auto">
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
                                      className={`text-sm cursor-pointer flex-1 font-normal truncate ${isSelected ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {brand.designation_fr}
                                    </label>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                    {count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Price Range */}
                    <AccordionItem value="price" className="border border-gray-200 dark:border-gray-800 rounded-lg px-4">
                      <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                        Prix
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {priceRange[0]} DT - {priceRange[1]} DT
                            </span>
                          </div>
                          <Slider
                            value={priceRange}
                            onValueChange={(value) => setPriceRange(value as [number, number])}
                            min={priceBounds.min}
                            max={priceBounds.max}
                            step={10}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
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

          {/* Products Grid - Takes full width when filters closed */}
          <div className="flex-1 min-w-0">
            {filterError ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
                <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4 mb-4">
                  <CircleAlert className="h-10 w-10 text-red-600 dark:text-red-400" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Une erreur s&apos;est produite
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                  {filterError.message}
                </p>
                <Button
                  onClick={() => { setFilterError(null); setRetryCount(c => c + 1); }}
                  variant="default"
                  className="gap-2"
                >
                  Réessayer
                </Button>
              </div>
            ) : showSkeleton ? (
              <ProductsSkeleton showBreadcrumb={false} showFilters={false} />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Aucun produit trouvé
                </p>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7">
                  {paginatedProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="compact"
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
              </>
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
        <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
          <ProductsSkeleton />
        </main>
        <Footer />
      </>
    }>
      <ShopContent {...props} />
    </Suspense>
  );
}
