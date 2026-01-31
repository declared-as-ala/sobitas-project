'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductCard } from '@/app/components/ProductCard';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Slider } from '@/app/components/ui/slider';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Filter, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { motion } from 'motion/react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Pagination } from '@/app/components/ui/pagination';
import type { Product, Category, Brand } from '@/types';
import { searchProducts, getProductsByCategory, getProductsBySubCategory, getProductsByBrand } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';

interface ShopPageClientProps {
  productsData: {
    products: Product[];
    brands: Brand[];
    categories: Category[];
  };
  categories: Category[];
  brands: Brand[];
}

function ShopContent({ productsData, categories, brands }: ShopPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>(productsData.products || []);
  const [isSearching, setIsSearching] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  
  const PRODUCTS_PER_PAGE = 12;

  // Initialize from URL params
  useEffect(() => {
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const search = searchParams.get('search');
    
    if (category) {
      setSelectedCategories([decodeURIComponent(category)]);
    }
    if (brand) {
      setSelectedBrands([parseInt(brand)]);
    }
    if (search) {
      setSearchQuery(decodeURIComponent(search));
    }
  }, [searchParams]);

  // Get unique subcategories from ALL products (not just filtered) for proper mapping
  const subCategories = useMemo(() => {
    const subs = new Map<string, { id: number; name: string; slug: string; categoryId?: number }>();
    const allProducts = productsData.products || [];
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
  }, [productsData.products]);

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
    }
  }, [priceBounds]);

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

  // Handle search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim()) {
        setCurrentBrand(null);
        setIsSearching(true);
        try {
          // For better multi-word search, always use client-side filtering on all products
          // This handles cases like "isolate whey" where words might be in different positions
          const allProducts = productsData.products || [];
          const foundProducts = allProducts.filter(product => matchesSearch(product, searchQuery));
          setProducts(foundProducts);
          
          // Also try backend search as fallback for single word queries (faster)
          if (searchQuery.trim().split(/\s+/).length === 1) {
            try {
              const result = await searchProducts(searchQuery);
              if (result.products && result.products.length > 0) {
                // Merge results, removing duplicates
                const backendIds = new Set(foundProducts.map(p => p.id));
                const newProducts = result.products.filter(p => !backendIds.has(p.id));
                setProducts([...foundProducts, ...newProducts]);
              }
            } catch (backendError) {
              // Ignore backend errors, use client-side results
            }
          }
        } catch (error) {
          console.error('Search error:', error);
          setProducts([]);
        } finally {
          setIsSearching(false);
        }
      } else if (selectedCategories.length > 0) {
        setCurrentBrand(null);
        // Filter by category/subcategory
        try {
          const categoryParam = selectedCategories[0];
          
          // Strategy: Try multiple approaches in order
          // 1. Try as category slug FIRST (for category titles like "prise-de-masse")
          // 2. Try as subcategory slug (for subcategory items like "gainers-haute-energie")
          // 3. Convert name to slug and try subcategory
          // 4. Find subcategory by name and use its slug
          // 5. Fallback to client-side filtering
          
          let productsFound = false;
          
          // First: Try as category slug (e.g., "prise-de-masse", "perte-de-poids")
          // This handles category titles from ProductsDropdown
          try {
            const result = await getProductsByCategory(categoryParam);
            if (result.products && result.products.length > 0) {
              setProducts(result.products);
              productsFound = true;
            } else if (result.products && result.products.length === 0) {
              // API returned empty but valid response - category exists but has no products
              setProducts([]);
              productsFound = true;
            }
          } catch (catError: any) {
            // Not a valid category slug, continue to next attempt
            if (catError.response?.status !== 404) {
              console.warn('Category API error:', catError);
            }
          }
          
          // Second: Try as subcategory slug directly (e.g., "gainers-haute-energie", "carbohydrates")
          if (!productsFound) {
            try {
              const result = await getProductsBySubCategory(categoryParam);
              if (result.products && result.products.length > 0) {
                setProducts(result.products);
                productsFound = true;
              } else if (result.products && result.products.length === 0) {
                // API returned empty but valid response - subcategory exists but has no products
                setProducts([]);
                productsFound = true;
              }
            } catch (subError: any) {
              // Not a valid subcategory slug or API error, continue to next attempt
              if (subError.response?.status !== 404) {
                console.warn('Subcategory API error:', subError);
              }
            }
          }
          
          // Third: Convert name to slug format and try subcategory (e.g., "Gainers Haute Énergie" -> "gainers-haute-energie")
          if (!productsFound) {
            const slugFromName = nameToSlug(categoryParam);
            if (slugFromName && slugFromName !== categoryParam) {
              try {
                const result = await getProductsBySubCategory(slugFromName);
                if (result.products && result.products.length > 0) {
                  setProducts(result.products);
                  productsFound = true;
                }
              } catch (slugError: any) {
                // Slug conversion didn't work, continue
              }
            }
          }
          
          // Fourth: Find subcategory by name and use its slug
          if (!productsFound) {
            const subCategory = findSubCategoryByName(categoryParam);
            if (subCategory) {
              try {
                const result = await getProductsBySubCategory(subCategory.slug);
                setProducts(result.products || []);
                productsFound = true;
              } catch (subError: any) {
                // API failed, will try other methods
                console.warn(`Subcategory found by name but API failed: ${subCategory.slug}`, subError);
              }
            }
          }
          
          // Fifth: Final fallback - client-side filtering by subcategory name
          if (!productsFound) {
            const allProducts = productsData.products || [];
            const filtered = allProducts.filter(p => 
              p.sous_categorie && (
                normalizeString(p.sous_categorie.designation_fr) === normalizeString(categoryParam) ||
                p.sous_categorie.slug === categoryParam ||
                p.sous_categorie.slug === nameToSlug(categoryParam)
              )
            );
            setProducts(filtered);
            if (filtered.length > 0) {
              productsFound = true;
            }
          }
          
          if (!productsFound) {
            console.warn(`No products found for category/subcategory: ${categoryParam}`);
          }
        } catch (error: any) {
          console.error('Category filter error:', error);
          setProducts([]);
        }
      } else if (selectedBrands.length > 0) {
        // Filter by brand
        try {
          const brandId = selectedBrands[0];
          const result = await getProductsByBrand(brandId);
          setProducts(result.products || []);
          setCurrentBrand(result.brand || null);
        } catch (error) {
          console.error('Brand filter error:', error);
          setCurrentBrand(null);
        }
      } else {
        // Reset to all products
        setProducts(productsData.products || []);
        setCurrentBrand(null);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategories, selectedBrands, productsData.products]);

  // Filter products locally (for price and additional filters)
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Price filter (effective price: promo if valid, else prix)
    filtered = filtered.filter(product => {
      const price = getEffectivePrice(product);
      return price >= priceRange[0] && price <= priceRange[1];
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
  }, [searchQuery, selectedCategories, selectedBrands, priceRange, inStockOnly]);

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
    setProducts(productsData.products || []);
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
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12">
        {/* Brand description – shown when filtering by brand (e.g. /shop?brand=1) */}
        {currentBrand && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 p-6 md:p-8 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
              {currentBrand.logo && (
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={getStorageUrl(currentBrand.logo)}
                    alt={currentBrand.designation_fr}
                    fill
                    className="object-contain p-2"
                    sizes="112px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {currentBrand.designation_fr}
                </h2>
                {currentBrand.description_fr && (
                  <div
                    className="prose prose-sm md:prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: currentBrand.description_fr }}
                  />
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
            {isSearching ? (
              'Recherche en cours...'
            ) : totalPages > 1 ? (
              `Affichage ${(currentPage - 1) * PRODUCTS_PER_PAGE + 1}-${Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} sur ${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''}`
            ) : (
              `${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''} trouvé${filteredProducts.length > 1 ? 's' : ''}`
            )}
          </p>
        </motion.div>

        {/* Search + Sticky Filter (mobile: bottom sheet) */}
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 min-h-[44px]"
            />
          </div>
          {/* Mobile: Filter/Sort opens bottom sheet */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="md:hidden min-h-[44px] min-w-[44px] flex-shrink-0"
                aria-label="Ouvrir les filtres"
              >
                <Filter className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Filtres</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              <SheetHeader className="sr-only">
                <SheetTitle>Filtres et tri</SheetTitle>
              </SheetHeader>
              <div className="p-4 pb-8 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">Filtres</h2>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-sm">
                    Réinitialiser
                  </Button>
                </div>

                {/* In Stock */}
                <div>
                  <h3 className="font-medium mb-2 text-sm">Disponibilité</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mobile-in-stock"
                      checked={inStockOnly}
                      onCheckedChange={(checked) => setInStockOnly(checked === true)}
                    />
                    <label htmlFor="mobile-in-stock" className="text-sm cursor-pointer flex-1">
                      En stock uniquement
                    </label>
                  </div>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2 text-sm">Catégories</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {categories.map(category => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mobile-cat-${category.id}`}
                            checked={selectedCategories.includes(category.slug)}
                            onCheckedChange={() => toggleCategory(category.slug)}
                          />
                          <label htmlFor={`mobile-cat-${category.id}`} className="text-sm cursor-pointer flex-1">
                            {category.designation_fr}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brands */}
                {brands.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2 text-sm">Marques</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {brands.map(brand => (
                        <div key={brand.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mobile-brand-${brand.id}`}
                            checked={selectedBrands.includes(brand.id)}
                            onCheckedChange={() => toggleBrand(brand.id)}
                          />
                          <label htmlFor={`mobile-brand-${brand.id}`} className="text-sm cursor-pointer flex-1">
                            {brand.designation_fr}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Range */}
                <div>
                  <h3 className="font-medium mb-2 text-sm">Prix: {priceRange[0]} – {priceRange[1]} DT</h3>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{priceBounds.min} DT</span>
                    <span>{priceBounds.max} DT</span>
                  </div>
                </div>

                <Button className="w-full min-h-[44px]" onClick={() => setShowFilters(false)}>
                  Voir les produits
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden md:block w-64 flex-shrink-0 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 space-y-6 sticky top-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Filtres</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-sm"
                >
                  Réinitialiser
                </Button>
              </div>

              {/* In Stock Filter - Moved to top for visibility */}
              <div>
                <h3 className="font-medium mb-3">Disponibilité</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="desktop-in-stock"
                    checked={inStockOnly}
                    onCheckedChange={(checked) => setInStockOnly(checked === true)}
                  />
                  <label
                    htmlFor="desktop-in-stock"
                    className="text-sm cursor-pointer flex-1"
                  >
                    En stock uniquement
                  </label>
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Catégories</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {categories.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`desktop-cat-${category.id}`}
                          checked={selectedCategories.includes(category.slug)}
                          onCheckedChange={() => toggleCategory(category.slug)}
                        />
                        <label
                          htmlFor={`desktop-cat-${category.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {category.designation_fr}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brands */}
              {brands.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Marques</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {brands.map(brand => (
                      <div key={brand.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`desktop-brand-${brand.id}`}
                          checked={selectedBrands.includes(brand.id)}
                          onCheckedChange={() => toggleBrand(brand.id)}
                        />
                        <label
                          htmlFor={`desktop-brand-${brand.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {brand.designation_fr}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div>
                <h3 className="font-medium mb-3">
                  Prix: {priceRange[0]} DT - {priceRange[1]} DT
                </h3>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{priceBounds.min} DT</span>
                  <span>{priceBounds.max} DT</span>
                </div>
              </div>
            </motion.div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {isSearching ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Recherche en cours...
                </p>
              </div>
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
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
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

import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export function ShopPageClient(props: ShopPageClientProps) {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen message="Chargement des produits..." />}>
      <ShopContent {...props} />
    </Suspense>
  );
}
