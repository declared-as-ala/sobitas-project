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
import {
  buildShopUrl,
  DEFAULT_SHOP_SORT,
  type ShopFacets,
  type ShopQuery,
  type ShopSort,
} from '@/util/shopQuery';
import { ShopFilters, CREATINE_TYPES, CREATINE_GOALS, SORT_OPTIONS } from './ShopFilters';

const SKELETON_MIN_MS = 300;

interface ShopPageClientProps {
  productsData: {
    products: Product[];
    brands: Brand[];
    categories: Category[];
  };
  categories: Category[];
  brands: Brand[];
  /** From getInStockCount — printed beside "En stock uniquement". null when the count failed. */
  inStockCount?: number | null;
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

  /*
   * ── SERVER-DRIVEN MODE: THE THREE PROPS BELOW TRAVEL TOGETHER OR NOT AT ALL ────────────────
   *
   * When they are present, this component STOPS filtering, sorting and paginating. `productsData`
   * is then one page of results that the database has already narrowed, and every control writes to
   * the URL instead of to local state.
   *
   * Why opt-in rather than a rewrite: this component renders FIVE surfaces — /shop, the top-category
   * pages, the subcategory pages, brand pages and the category fallbacks. Only /shop has a server
   * page that parses the query string. Making the new behaviour unconditional would have handed the
   * other four a 12-product array to filter client-side and left them showing 12 products each,
   * which is precisely the failure this migration exists to fix, moved rather than removed.
   *
   * So the legacy path below is untouched and still runs for those four. When these props are absent
   * nothing about this file behaves differently from before.
   *
   * They are one unit because half of it is worse than neither: `serverPagination` without
   * `serverQuery` would page through a grid whose filters still ran locally, and `facets` without
   * `serverPagination` would describe 10,669 products beside a grid showing 12.
   */
  /** The URL's filter state, already parsed by the server page. */
  serverQuery?: ShopQuery;
  /** The whole catalogue's facets — see ApisController::shopFacets for why these cannot come from the page. */
  facets?: ShopFacets;
  serverPagination?: { total: number; totalPages: number; currentPage: number; perPage: number };
  /**
   * The path this listing lives at — '/shop', '/sante-vitalite', '/whey-isolate'.
   *
   * Server mode writes state into the URL, so it has to know WHICH URL. Without this every control
   * on a category page pushed to /shop and navigated the shopper out of the category they were
   * browsing; and the pager, which is the crawl path, emitted /shop?page=2 from /sante-vitalite.
   *
   * The path-implied filter is deliberately NOT repeated in the query string: /sante-vitalite?page=2
   * rather than /sante-vitalite?category=sante-vitalite&page=2. Two URLs for one page is the
   * duplicate-content problem this whole migration exists to reduce.
   */
  serverBasePath?: string;
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
  inStockCount = null,
  initialCategory,
  isSubcategory,
  parentCategory,
  initialBrand,
  categoryBreadcrumbLabel,
  categorySeoLanding,
  categorySeoLandingBottom,
  serverQuery,
  facets,
  serverPagination,
  serverBasePath = '/shop',
}: ShopPageClientProps) {
  /**
   * The one switch. See the prop docblock: everything downstream reads this rather than testing the
   * three props individually, so there is no path on which two of them are honoured and one is not.
   */
  const isServerMode = Boolean(serverQuery && serverPagination);
  // Pulled out as primitives so everything downstream can depend on the VALUES rather than on the
  // `facets` object, whose identity changes on every server render. See priceBounds.
  const facetsMin = facets?.price.min;
  // p99, NOT max. The catalogue runs 11 to 40 000 DT and one outlier put every real price in
  // the first 0.4% of the slider track. A handle at maximum is written as no upper bound, so
  // the 40 000 DT item stays reachable — see ShopFacets.price.
  const facetsMax = facets?.price.p99 ?? facets?.price.max;
  // NOTE: useSearchParams() is deliberately NOT called here — it lives in <UrlFilterSync> below.
  // Calling it at this level is a dynamic API that opts every route rendering this component out of
  // static rendering; on /shop that meant the boutique answered no-store to every visitor. Isolating
  // it in a Suspense-wrapped leaf keeps full reactivity to the URL while letting the product grid
  // render on the server. See the component definition for the full story.
  const [urlFilters, setUrlFilters] = useState<UrlFilters>(EMPTY_URL_FILTERS);
  const router = useRouter();

  /*
   * In server mode these useState calls are still the ones the JSX reads, but the URL is the source
   * of truth: each is SEEDED from serverQuery and re-synced by the effect below whenever the server
   * sends a new page. Keeping the same state variables — rather than reading serverQuery directly at
   * every render site — is what lets the ~700 lines of JSX below stay identical for both modes.
   */
  const [searchQuery, setSearchQuery] = useState(serverQuery?.search ?? '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(serverQuery?.categories ?? []);
  const [selectedBrands, setSelectedBrands] = useState<number[]>(serverQuery?.brands ?? []);
  /*
   * Seeded from the URL and the real catalogue bounds on the FIRST render, not reconciled afterwards.
   *
   * The old `[0, 1000]` literal was a guess that happened to be wrong by a factor of forty — the
   * catalogue runs 11 to 40000 DT — and the reconciliation effect that fixed it up afterwards is
   * what the redirect loop was made of. Starting correct removes the window in which anything could
   * observe the wrong value and act on it.
   */
  const initialPriceRange = (): [number, number] => {
    // facetsMax is p99, matching priceBounds — seeding from the true max would put the handle
    // outside the track the slider actually renders.
    const lo = serverQuery?.minPrice ?? facetsMin ?? 0;
    const hi = serverQuery?.maxPrice ?? facetsMax ?? 1000;
    return [lo, hi];
  };
  const [priceRange, setPriceRange] = useState<[number, number]>(initialPriceRange);
  const [debouncedPriceRange, setDebouncedPriceRange] = useState<[number, number]>(initialPriceRange);
  const [showFilters, setShowFilters] = useState(false);
  const [showFiltersDesktop, setShowFiltersDesktop] = useState(true);

  // Sorting and sub-filters states
  const [sortBy, setSortBy] = useState<string>(serverQuery?.sort ?? 'popularity');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(serverQuery?.flavors ?? []);

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
  const [inStockOnly, setInStockOnly] = useState(serverQuery?.inStock ?? false);
  const [currentPage, setCurrentPage] = useState(serverQuery?.page ?? 1);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  /*
   * Set while a URL navigation is in flight so the grid can show its skeleton instead of the
   * previous page's products. Without it, clicking "page 4" leaves page 3 on screen for the whole
   * round trip with no feedback at all, and on a Tunisian 3G connection that is long enough for a
   * shopper to click again.
   */
  const [isNavigating, setIsNavigating] = useState(false);

  const PRODUCTS_PER_PAGE = serverPagination?.perPage ?? 12;

  /**
   * Write the next filter state to the URL and let the server answer with the matching page.
   *
   * `scroll: false` because the page is already at the top for a filter change and jumping is worse
   * than not; pagination scrolls explicitly in handlePageChange, which is the one case where the
   * shopper's eye must move.
   *
   * Every mutation resets to page 1 unless it IS a page change — filtering to 4 results while
   * sitting on page 7 renders an empty grid that looks like a broken shop.
   */
  const pushQuery = (patch: Partial<ShopQuery>) => {
    if (!serverQuery) return;
    const next: ShopQuery = { ...serverQuery, ...patch, page: patch.page ?? 1 };

    /*
     * ── A CATEGORY CHANGE ON A SCOPED LISTING LEAVES THAT LISTING ───────────────────────────
     *
     * On /sante-vitalite the category filter is not a query parameter — it is the PATH, and the
     * server page re-applies it on every render. So writing `?category=proteines` onto that path
     * would produce a ticked checkbox above a grid that never changed: the parameter is parsed,
     * then overwritten by the scope. A control that visibly does nothing is worse than one that
     * is not offered.
     *
     * Ticking another category is an unambiguous request to browse it, so it goes to the boutique
     * with that filter applied — /shop?category=proteines — which is a URL where the choice is
     * real. Everything else (price, brand, flavour, sort, page) stays on the current path, because
     * those genuinely do narrow the scoped listing.
     */
    const scoped = serverBasePath !== '/shop';
    const changesScope =
      scoped && (patch.categories !== undefined || patch.subcategories !== undefined);

    setIsNavigating(true);
    router.push(
      changesScope
        ? buildShopUrl({ ...next, subcategories: [] }, '/shop')
        : buildShopUrl(next, serverBasePath),
      { scroll: false }
    );
  };

  /*
   * Re-seed local state whenever the server sends a different query.
   *
   * Needed because router.push() re-renders this component with new props but React keeps the
   * existing state — so after navigating to ?brand=72 the grid would be correct and the checkbox
   * beside it unticked. The dependency is the serialised query rather than the object, which is a
   * new identity on every render and would loop.
   */
  const serverQueryKey = serverQuery ? buildShopUrl(serverQuery, serverBasePath) : '';
  useEffect(() => {
    if (!serverQuery) return;
    setSearchQuery(serverQuery.search);
    setSelectedCategories(serverQuery.categories);
    setSelectedBrands(serverQuery.brands);
    setSelectedFlavors(serverQuery.flavors);
    setInStockOnly(serverQuery.inStock);
    setSortBy(serverQuery.sort);
    setCurrentPage(serverQuery.page);
    setIsNavigating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverQueryKey]);

  /*
   * Safety net for the skeleton.
   *
   * `isNavigating` is cleared by the effect above, which only fires when the SERVER QUERY CHANGES.
   * If a control ever produces the URL the page is already on — an unchanged sort, a filter toggled
   * off and straight back on — no navigation happens, that effect never runs, and the boutique sits
   * behind a skeleton forever with no error to explain it. A stuck spinner is one of the few
   * failures a shopper cannot work around, so it gets a hard ceiling rather than an argument about
   * whether the case is reachable.
   */
  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => setIsNavigating(false), 8000);
    return () => clearTimeout(timer);
  }, [isNavigating]);

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

  /*
   * Server mode: the grid IS the server's answer. Track it directly.
   *
   * The legacy effect below cannot do this job. It resets `products` from `safeProductsData` only on
   * the branch where no category is selected, because in client mode `products` is a mutable working
   * set that the category/brand/search fetches below overwrite. In server mode there is no working
   * set — there is the page the server sent — so following the prop is both simpler and the only
   * thing that is correct when the shopper pages from 3 to 4 without changing any filter.
   */
  useEffect(() => {
    if (!isServerMode) return;
    setProducts(safeProductsData.products || []);
  }, [isServerMode, safeProductsData.products]);

  // Initialize from URL params or props
  useEffect(() => {
    // Server mode parses the URL on the server, where it can act on it — see the prop docblock.
    // Letting this run as well would fight that: it collapses multi-select categories to a single
    // slug (`setSelectedCategories([decodedCategory])`) and resets `products` from the props on the
    // no-category branch, so picking a second category would tick one box and show the wrong grid.
    if (isServerMode) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilters, initialCategory, initialBrand, safeProductsData.products, isServerMode]);

  // Get unique subcategories from ALL products (not just filtered) for proper mapping
  /*
   * `subCategories` USED TO BE COMPUTED HERE AND READ BY NOTHING.
   *
   * A useMemo built a Map of every rayon on every render — from all products in client mode, and
   * from facets.subcategories in server mode — and no line in this 1,600-line file ever consumed
   * the result. Dead code is cheap to leave alone right up until it starts costing bytes: it was
   * the only reason `facets.subcategories` was serialised into the page, and it made the facets
   * object look load-bearing when it was not.
   *
   * Removed rather than commented out. If a rayon rail is wanted here later, it should read
   * facets.subcategories directly at the render site, where its cost is visible.
   */

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
    /*
     * THE SLIDER DESCRIBES THE CATALOGUE, NOT THE PAGE.
     *
     * This is the single most damaging thing to get wrong in server mode, because it is silently
     * self-reinforcing. Derived from the 12 products on screen, the bounds collapse to (say)
     * 89–140 DT; the effect below then RESETS priceRange to those bounds; the filter engine then
     * excludes anything outside them. Page 2 recomputes a different range and the shop appears to
     * lose products as you page through it — with no error and a plausible-looking slider.
     */
    if (isServerMode && facetsMin !== undefined && facetsMax !== undefined) {
      return { min: facetsMin, max: facetsMax };
    }

    const prices = products
      .map(p => getEffectivePrice(p))
      .filter((price): price is number => price !== null && price !== undefined);
    if (prices.length === 0) return { min: 0, max: 1000 };
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
    // Depends on the two NUMBERS, not on the `facets` object. The server sends a new object on every
    // render, so depending on it made this memo — and therefore the seeding effect below, and
    // everything downstream of that — re-fire on every navigation. That churn is what turned one
    // bad push into a loop.
  }, [products, isServerMode, facetsMin, facetsMax]);

  // Update price range when bounds change
  useEffect(() => {
    if (priceBounds.max <= 0) return;
    /*
     * In server mode the URL wins. A shopper who shared /shop?min_price=200 must land on a slider
     * showing 200 — this effect running unconditionally would reset it to the catalogue bounds on
     * mount and quietly discard the filter they linked to, while the grid (filtered by the server)
     * still showed the narrowed results. Slider and grid disagreeing is the bug; falling back to the
     * bounds only when the URL is silent is the fix.
     */
    const lo = isServerMode && serverQuery?.minPrice !== null && serverQuery?.minPrice !== undefined
      ? serverQuery.minPrice
      : priceBounds.min;
    const hi = isServerMode && serverQuery?.maxPrice !== null && serverQuery?.maxPrice !== undefined
      ? serverQuery.maxPrice
      : priceBounds.max;
    setPriceRange([lo, hi]);
    setDebouncedPriceRange([lo, hi]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceBounds, isServerMode, serverQuery?.minPrice, serverQuery?.maxPrice]);

  // Debounce price range updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPriceRange(priceRange);
    }, 300);
    return () => clearTimeout(timer);
  }, [priceRange]);

  /*
   * ── THE PRICE FILTER NAVIGATES ON A GESTURE, NEVER FROM AN EFFECT ────────────────────────
   *
   * This was an effect watching `debouncedPriceRange` and pushing whenever it disagreed with the
   * URL. It shipped, and it put /shop into a redirect loop: /shop -> ?max_price=1000 -> /shop -> …
   *
   * The mechanism, because it is worth not rebuilding: `priceRange` initialises to [0, 1000], while
   * the real catalogue bounds are min 11 / max 40000. On mount the effect therefore read a max of
   * 1000, correctly observed that 1000 < 40000, concluded the shopper had narrowed the price, and
   * wrote ?max_price=1000. The seeding effect then reconciled the slider to the true bounds, which
   * changed the debounced value, which re-ran the push effect, which now saw 40000 >= 40000 and
   * wrote the filter back off. Each write is a navigation, each navigation is a new server render
   * with a fresh `facets` object, and a fresh `facets` re-fires the whole chain.
   *
   * No guard on the comparison fixes this, because the bug is not the comparison — it is that an
   * effect reconciling derived state is allowed to change the URL at all. On mount, "the state does
   * not match the URL" means the state has not been seeded yet; it does NOT mean the shopper asked
   * for anything.
   *
   * So the push now hangs off the slider's own handler, exactly like handleSearchChange. It cannot
   * fire on mount, because on mount nobody has touched the slider. Same 400 ms debounce, so dragging
   * is one navigation rather than one per pixel.
   */
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePriceChange = (range: [number, number]) => {
    setPriceRange(range);
    if (!isServerMode) return;
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(() => {
      const [lo, hi] = range;
      // A range at the catalogue bounds is "no filter" (null), not an explicit min/max — that keeps
      // the canonical boutique at /shop rather than /shop?min_price=11&max_price=40000.
      pushQuery({
        minPrice: lo <= priceBounds.min ? null : lo,
        maxPrice: hi >= priceBounds.max ? null : hi,
      });
    }, 400);
  };
  useEffect(() => () => {
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
  }, []);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    // Server mode: counts come from four GROUP BYs over the whole catalogue rather than from a tally
    // of what is on screen. Counting the page would have printed "12" beside every checkbox.
    if (isServerMode && facets) {
      const categoryCounts = new Map<string, number>(
        Object.entries(facets.category_counts).map(([slug, n]) => [slug, Number(n) || 0])
      );
      const brandCounts = new Map<number, number>(
        Object.entries(facets.brand_counts).map(([id, n]) => [Number(id), Number(n) || 0])
      );
      return { categoryCounts, brandCounts };
    }

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
  }, [safeProductsData.products, isServerMode, facets]);

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
    // Server mode: only aromas actually present on a published product (see shopFacets). Reading
    // them off the current page would have offered three flavours on page 1 and three different
    // ones on page 2, and un-ticked the shopper's own selection the moment it left the page.
    if (isServerMode && facets) return facets.flavors;

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
  }, [products, safeProductsData.products, isServerMode, facets]);

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

    /*
     * ── AVAILABILITY WAS THE ONE FILTER WITH NO CHIP, AND IT IS THE ONE THAT CHANGES MOST ───
     * `stock` was declared in the union and in removeFilter, and never pushed here — so ticking
     * "En stock uniquement" left no chip, no count on the Filtres badge and nothing in the rail's
     * "Tout effacer" state. On this catalogue that box takes the boutique from 11,263 products to
     * 133, which is the single largest thing a shopper can do to the grid, and it was also the
     * only one they could not see they had done.
     */
    if (inStockOnly) {
      filters.push({ type: 'stock', label: 'En stock', value: 'stock' });
    }

    return filters;
  }, [selectedCategories, selectedBrands, priceRange, priceBounds, categories, brands, safeProductsData.brands, selectedTypes, selectedGoals, selectedFlavors, inStockOnly]);

  // Remove specific filters
  const removeFilter = (type: 'category' | 'brand' | 'price' | 'stock' | 'type' | 'goal' | 'flavor', value: string | number) => {
    if (isServerMode && serverQuery) {
      // The applied-filter chips are the most-used way to undo a filter, so they have to travel the
      // same road as the checkbox that set it. Dropping only the local state here would clear the
      // chip and leave the URL — and therefore the grid — filtered.
      if (type === 'category') {
        pushQuery({ categories: serverQuery.categories.filter(c => c !== value) });
      } else if (type === 'brand') {
        pushQuery({ brands: serverQuery.brands.filter(b => b !== Number(value)) });
      } else if (type === 'price') {
        setPriceRange([priceBounds.min, priceBounds.max]);
        pushQuery({ minPrice: null, maxPrice: null });
      } else if (type === 'stock') {
        setInStockOnly(false);
        pushQuery({ inStock: false });
      } else if (type === 'flavor') {
        pushQuery({ flavors: serverQuery.flavors.filter(f => f !== value) });
      } else {
        // 'type' and 'goal' are creatine-only refinements with no server filter and no route to
        // /shop — they cannot be applied here, so there is nothing to remove.
        if (type === 'type') setSelectedTypes(prev => prev.filter(t => t !== value));
        if (type === 'goal') setSelectedGoals(prev => prev.filter(g => g !== value));
      }
      return;
    }

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
    /*
     * ── IN SERVER MODE THIS EFFECT MUST NOT RUN AT ALL ──────────────────────────────────────
     *
     * It exists to reproduce the server's filtering in the browser, and in server mode the server
     * has already done it — `productsData` IS the answer for the current URL. Letting it run does
     * two harmful things at once:
     *
     *   · it overwrites the correct server-rendered page with a client-fetched one, so the grid
     *     changes under the shopper a moment after the page appears;
     *   · getProductsByCategory() walks the WHOLE category 100 rows at a time. For sante-vitalite
     *     that is 8,849 products over 88 requests, issued concurrently, FROM THE BROWSER. The same
     *     walk on the server side is the shape that exhausted the php-fpm pool on 12/08 —
     *     ~40 concurrent per_page=100&page=N requests in three seconds, every child busy.
     *
     * The legacy (non-server) surfaces still need it, so this is an early return rather than a
     * deletion.
     */
    if (isServerMode) return;

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
  }, [isServerMode, searchQuery, selectedCategories, selectedBrands, safeProductsData.products, brands, initialCategory, retryCount]);

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
    /*
     * ── SERVER MODE SHORT-CIRCUITS THE WHOLE ENGINE BELOW ────────────────────────────────────
     * Not an optimisation — running it would be actively wrong. The 12 products in `products` are
     * page N of a result set the database has ALREADY narrowed and ordered. Re-applying the price,
     * brand, stock and flavour predicates to them can only ever remove rows, so a page would render
     * 9 of its 12 products; re-sorting them would reorder page N against pages N-1 and N+1, so a
     * product could appear on two pages and another on none.
     *
     * The availability-first rule the sort below ends on is not lost: ApisController::allProducts
     * applies the same expression as orderAvailableFirst() before its own ORDER BY, across the whole
     * result set rather than one page of it — which is stronger, because it means the out-of-stock
     * tail sinks to the LAST pages instead of to the bottom of every page.
     */
    if (isServerMode) return products;

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
    sortBy,
    isServerMode
  ]);

  /*
   * Counts and page totals come from the paginator in server mode.
   *
   * `filteredProducts.length` is 12 there — it is the size of the page, not of the result set — so
   * every use of it below (the "Affichage 25-36 sur 10 669 produits" line, the "Voir N produits"
   * button, the pager) has to read `resultCount` instead. That substitution is the difference
   * between a shop that says it has 10,669 products and one that insists it has 12.
   */
  const resultCount = isServerMode ? (serverPagination?.total ?? 0) : filteredProducts.length;
  const totalPages = isServerMode
    ? (serverPagination?.totalPages ?? 1)
    : Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    // The server already sliced. Slicing again would show 12 of 12 on page 1 and nothing after.
    if (isServerMode) return filteredProducts;
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, isServerMode, PRODUCTS_PER_PAGE]);

  useEffect(() => {
    // In server mode the page number lives in the URL and pushQuery already resets it to 1 on every
    // filter change. Running this as well would fight the re-seeding effect: it fires on the state
    // change that a navigation to ?page=4 causes, snapping currentPage back to 1 while the grid
    // showed page 4 — a pager that highlights the wrong page on every turn.
    if (isServerMode) return;
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedBrands, debouncedPriceRange, inStockOnly, selectedTypes, selectedGoals, selectedFlavors, isServerMode]);

  /*
   * ── EVERY TOGGLE BELOW WRITES TO THE URL IN SERVER MODE ──────────────────────────────────
   * Each keeps its existing local-state behaviour verbatim on the legacy path (category pages,
   * brand pages, subcategory pages) and pushes a new URL on /shop. The push is computed from the
   * CURRENT server query rather than from local state, because local state can be one render behind
   * a navigation and a filter computed from stale state silently drops the shopper's previous
   * choice.
   *
   * Category and brand stay single-select, exactly as they were — `[slug]` not `[...prev, slug]`.
   * The API accepts a list and the URL format carries one, so multi-select is now a UI change away,
   * but changing it here would have made this migration a behaviour change as well as a plumbing
   * one, and only one of those is safe to ship at a time.
   */
  const toggleCategory = (categorySlug: string) => {
    if (isServerMode && serverQuery) {
      const next = serverQuery.categories.includes(categorySlug) ? [] : [categorySlug];
      pushQuery({ categories: next });
      return;
    }
    setSelectedCategories(prev =>
      prev.includes(categorySlug) ? prev.filter(c => c !== categorySlug) : [categorySlug]
    );
  };

  const toggleBrand = (brandId: number) => {
    if (isServerMode && serverQuery) {
      const next = serverQuery.brands.includes(brandId) ? [] : [brandId];
      pushQuery({ brands: next });
      return;
    }
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
    if (isServerMode && serverQuery) {
      const next = serverQuery.flavors.includes(flavor)
        ? serverQuery.flavors.filter(f => f !== flavor)
        : [...serverQuery.flavors, flavor];
      pushQuery({ flavors: next });
      return;
    }
    setSelectedFlavors(prev =>
      prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]
    );
  };

  /** "Disponible uniquement". Server mode turns it into ?in_stock=1 rather than a local predicate. */
  const handleInStockChange = (next: boolean) => {
    if (isServerMode) {
      // Optimistic: the checkbox must tick on the click, not after the round trip.
      setInStockOnly(next);
      pushQuery({ inStock: next });
      return;
    }
    setInStockOnly(next);
  };

  const handleSortChange = (next: string) => {
    setSortBy(next);
    if (isServerMode) pushQuery({ sort: next as ShopSort });
  };

  /*
   * The shop's own search box. Debounced to 400 ms in server mode so typing "whey protein" is one
   * navigation, not twelve — each of which would be a server render and an API call.
   *
   * The input stays fully controlled by local state so there is no lag between the keystroke and
   * the character appearing; only the navigation is deferred.
   */
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (next: string) => {
    setSearchQuery(next);
    if (!isServerMode) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      pushQuery({ search: next.trim() });
    }, 400);
  };
  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([priceBounds.min, priceBounds.max]);
    setInStockOnly(false);
    setSortBy(DEFAULT_SHOP_SORT);
    setSelectedTypes([]);
    setSelectedGoals([]);
    setSelectedFlavors([]);
    setCurrentPage(1);
    if (isServerMode) {
      // Do NOT reset `products` from props here — in server mode the props are the CURRENT filtered
      // page, so seeding from them would leave the old results on screen under a cleared sidebar.
      // The navigation to /shop is what refills the grid.
      setIsNavigating(true);
      router.push('/shop');
      return;
    }
    setProducts(safeProductsData.products || []);
    router.push('/shop');
  };

  const handlePageChange = (page: number) => {
    if (isServerMode) {
      /*
       * NO router.push HERE. In server mode the pager renders <Link href> (see buildHref at the
       * render site) and Next performs the navigation itself — pushing as well would fire the same
       * navigation twice, which shows up as a doubled history entry and a second render of the same
       * page. This handler's whole job is the optimistic state so the button highlights on the
       * click rather than after the round trip; the re-seeding effect then confirms the page number
       * from the server's own `current_page`.
       */
      setCurrentPage(page);
      setIsNavigating(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Shared props for the filter accordion — one source rendered in both the mobile Sheet and the
  // desktop aside (see <ProductFilters>), so the two panels can never drift again.
  const filterProps = {
    inStockOnly,
    // The handler, not the raw setter: in server mode "disponible uniquement" is ?in_stock=1, and
    // passing setInStockOnly here would tick the box while the grid kept every out-of-stock product.
    setInStockOnly: handleInStockChange,
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
    // The handler, not the raw setter. In server mode the price filter is ?min_price/?max_price, and
    // the push has to originate here — from the drag — rather than from an effect watching state.
    setPriceRange: handlePriceChange,
    priceBounds,
    sortBy,
    setSortBy: handleSortChange,
    inStockCount,
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Own boundary, so reading search params defers only this null-rendering leaf (see above).
          Not mounted in server mode: the server page already parsed the query string and passed it
          down as `serverQuery`, so this would be a second, weaker reading of the same URL. */}
      {!isServerMode && (
        <Suspense fallback={null}>
          <UrlFilterSync onChange={setUrlFilters} />
        </Suspense>
      )}

      {/*
        ── THE RAIL IS max-w-site (1600), NOT max-w-7xl (1280) ───────────────────────────────
        Owner, 19/08/2026: *"use the full width — why are we losing all of that white space?"*

        MEASURED on the live page at a 1536 viewport: the content rail was 1,280px, so 256px —
        17% of the window — was margin either side of a product grid. Every other full-width band
        on this site runs on `max-w-site`; the boutique, the page with the most cards on it, was
        the one surface not sharing the site's rail. tailwind.config.ts says exactly this: "if two
        of them disagree their edges visibly step in and out down the page."

        The extra 320px is what pays for the fourth column at `xl` below.

        `py` comes down with it (32/48/64 -> 24/32/40): the old top padding was tuned when the
        page was narrower and the grid shorter, and 64px of nothing above an H1 on a listing page
        is a header, not breathing room.
      */}
      <main className="mx-auto w-full max-w-site px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
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

        {/*
          ── THE HEADING, AND WHY THE COUNT IS BESIDE IT RATHER THAN UNDER IT ────────────────
          The boutique's H1 is a 40px compressed line and the result count was a 12px grey line
          under it with 8px between them — two blocks of type doing one job. On the baseline they
          read as one sentence: what this page is, and how much of it there is.
        */}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6 lg:mb-6">
          <div className="min-w-0">
            {!categorySeoLanding && !isSubcategory && (
              // Must stay in sync with the crawler view's h1 (x-crawler/shop/page.tsx). Googlebot is
              // rewritten to that route, so the two are the same page to a searcher but were two
              // different headings — divergent h1s on one URL are what turns dynamic rendering into
              // cloaking.
              <h1 className="font-display font-compressed text-[1.875rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 lg:text-[2.5rem]">
                {currentBrand
                  ? `Produits ${currentBrand.designation_fr}`
                  : 'Boutique — Protéines & Compléments Alimentaires en Tunisie'}
              </h1>
            )}
          </div>
          {!showSkeleton && (
            <p className="shrink-0 text-[13px] tabular-nums text-ink-2 sm:pb-1">
              {/* resultCount, not filteredProducts.length — in server mode the latter is the size of
                  the page, so this would read "24 produits" on an 11,263-product catalogue. */}
              {totalPages > 1 ? (
                <>
                  <span className="font-semibold text-ink-1">
                    {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–
                    {Math.min(currentPage * PRODUCTS_PER_PAGE, resultCount)}
                  </span>{' '}
                  sur <span className="font-semibold text-ink-1">{resultCount.toLocaleString('fr-FR')}</span> produits
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink-1">{resultCount.toLocaleString('fr-FR')}</span> produit
                  {resultCount > 1 ? 's' : ''}
                </>
              )}
            </p>
          )}
        </div>

        {/*
          ── THE TOOLBAR IS STICKY ─────────────────────────────────────────────────────────
          At 24 products a page the grid is ~2,400px tall, so the sort control and the filter
          button spend most of the page's scroll off-screen. Sticking the toolbar means changing
          your mind about the order does not mean scrolling back to the top — on a listing page
          that is the single most-wanted control and it was the one furthest away.

          `top-[var(--header-h,4rem)]` rather than `top-0`: the site header is sticky too, and a
          toolbar pinned at 0 slides underneath it.
        */}
        <div className="sticky top-[4.25rem] z-30 -mx-4 mb-4 border-y border-hairline bg-canvas/95 px-4 py-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                aria-hidden="true"
              />
              <input
                type="text"
                inputMode="search"
                placeholder="Rechercher dans la boutique…"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Rechercher dans la boutique"
                /* 16px on a phone — iOS Safari zooms the viewport on focusing any input under it. */
                className="h-11 w-full rounded-xl border border-hairline bg-elevated pl-9 pr-9 text-[16px] text-ink-1 placeholder:text-ink-3 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus/15 sm:text-[13.5px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  aria-label="Effacer la recherche"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-brand"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 md:w-auto">
              <div className="min-w-0 flex-1 md:w-52">
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="h-11 rounded-xl border-hairline bg-elevated text-[13.5px] text-ink-1">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop: collapse the rail. It stays OPEN by default now — a filter rail that
                  has to be summoned is a filter rail nobody uses, and this page has 577 brands
                  and six aisles behind it. */}
              <button
                type="button"
                onClick={() => setShowFiltersDesktop(!showFiltersDesktop)}
                aria-pressed={showFiltersDesktop}
                className="hidden h-11 items-center gap-2 rounded-xl border border-hairline bg-elevated px-4 text-[13.5px] font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand lg:flex"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Filtres
                {appliedFilters.length > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-on-brand">
                    {appliedFilters.length}
                  </span>
                )}
              </button>

              {/* Phone: the same rail in a bottom sheet. */}
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Ouvrir les filtres"
                    className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-hairline bg-elevated px-4 text-[13.5px] font-semibold text-ink-1 transition-colors hover:border-brand lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Filtres
                    {appliedFilters.length > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-on-brand">
                        {appliedFilters.length}
                      </span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  showCloseButton={false}
                  className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 rounded-t-2xl border-t border-hairline bg-elevated p-0"
                >
                  <div className="flex shrink-0 justify-center pb-1 pt-3">
                    <span className="h-1.5 w-10 rounded-full bg-rule" aria-hidden="true" />
                  </div>
                  <SheetHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0 border-b border-hairline px-4 pb-3 pt-1">
                    <SheetTitle className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-ink-1">
                      <Filter className="h-4 w-4 text-brand" aria-hidden="true" />
                      Filtres
                      {appliedFilters.length > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-on-brand">
                          {appliedFilters.length}
                        </span>
                      )}
                    </SheetTitle>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      aria-label="Fermer les filtres"
                      className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink-1"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2">
                    <ShopFilters variant="mobile" {...filterProps} />
                  </div>
                  <div className="flex shrink-0 items-center gap-3 border-t border-hairline bg-elevated px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="min-h-[48px] flex-1 rounded-xl border border-rule text-[14px] font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand"
                    >
                      Réinitialiser
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="min-h-[48px] flex-[1.7] rounded-xl bg-brand font-display text-[14px] font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover"
                    >
                      Voir {resultCount.toLocaleString('fr-FR')} produit{resultCount > 1 ? 's' : ''}
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* ── ACTIVE FILTERS ─────────────────────────────────────────────────────────────
              Inside the sticky toolbar, not below it. A chip that scrolls away is a filter the
              shopper stops being able to see they applied — which is the commonest way a
              "nothing matches" screen gets read as a broken shop. */}
          {appliedFilters.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {appliedFilters.map((filter, index) => (
                <button
                  key={`${filter.type}-${filter.value}-${index}`}
                  type="button"
                  onClick={() => removeFilter(filter.type, filter.value)}
                  aria-label={`Retirer le filtre ${filter.label}`}
                  className="group inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.07] pl-3 pr-2 text-[12px] font-semibold text-ink-1 transition-colors hover:border-brand hover:bg-brand/15"
                >
                  {filter.label}
                  <X className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-brand" aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="ml-0.5 inline-flex min-h-[30px] items-center rounded-full px-2.5 text-[12px] font-semibold text-brand transition-colors hover:underline"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>

        {/* Grid and Sidebar main split */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/*
            ── THE RAIL IS 17rem AND IT STICKS ──────────────────────────────────
            272px rather than 288: the extra 16px goes to the grid, where it is the difference
            between four ~296px cards and four ~292px ones at 1600.

            `sticky top-[8.5rem]` clears the site header AND this page's own sticky toolbar, and
            the max-height plus overflow means a rail with two dozen brands open scrolls inside
            itself instead of pushing the page. Without that the aside was 1,800px tall and the
            grid beside it scrolled independently — the classic listing-page fault where the
            filters end up somewhere above the products you are looking at.
          */}
          {showFiltersDesktop && (
            <aside className="hidden w-[17rem] shrink-0 lg:block">
              <div className="sticky top-[8.5rem] max-h-[calc(100dvh-9.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-hairline bg-elevated px-4 py-3">
                <div className="mb-1 flex items-center justify-between gap-2 border-b border-hairline pb-2.5">
                  <h2 className="flex items-center gap-1.5 font-display text-[13px] font-bold uppercase tracking-wide text-ink-1">
                    <Filter className="h-3.5 w-3.5 text-brand" aria-hidden="true" /> Filtres
                  </h2>
                  {appliedFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-lg px-1.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:underline"
                    >
                      Tout effacer
                    </button>
                  )}
                </div>
                <ShopFilters variant="desktop" {...filterProps} />
              </div>
            </aside>
          )}

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {filterError ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-hairline bg-elevated px-4 py-16">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <CircleAlert className="h-7 w-7" aria-hidden="true" />
                </span>
                <h3 className="mb-1 font-display text-lg font-bold uppercase tracking-wide text-ink-1">
                  Une erreur s&apos;est produite
                </h3>
                <p className="mb-6 max-w-md text-center text-sm text-ink-2">{filterError.message}</p>
                <button
                  type="button"
                  onClick={() => { setFilterError(null); setRetryCount(c => c + 1); }}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-6 font-display text-sm font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover"
                >
                  Réessayer
                </button>
              </div>
            ) : showSkeleton || isNavigating ? (
              /* isNavigating: in server mode a filter or a page turn is a real round trip, and
                 without this the previous page's twelve products stay on screen for its whole
                 duration with no feedback — long enough on a Tunisian mobile connection for a
                 shopper to conclude the click did nothing and click again. */
              <ProductsSkeleton showBreadcrumb={false} showFilters={false} gridClassName="lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" />
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-hairline bg-elevated">
                <EmptyState
                  title="Aucun résultat"
                  description="Aucun produit ne correspond à ces filtres."
                  showShopLink={false}
                  className="pb-2"
                />
                <div className="flex justify-center pb-12 sm:pb-16">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-brand px-5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-on-brand"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-12">
                {/*
                  ── THE COLUMN LADDER IS SET BY THE CARD'S WIDTH, NOT BY THE BREAKPOINT NAME ──
                  MEASURED with the 272px filter rail open, at every step:

                      lg   1024   2 cols   344px
                      xl   1280   3 cols   288px
                      2xl  1536   4 cols   274px      <- the owner's screen (1920 at 125%)
                           1920   4 cols   290px      (rail capped at max-w-site)

                  The first attempt was `xl:grid-cols-4`, and that put the fourth column in at
                  1280 where it measured 210px — narrower than the 285px the card was rebuilt at
                  yesterday, and the exact "squeezed" failure that card work was fixing. The
                  breakpoint that can afford four columns beside this rail is 1536, so that is
                  where the fourth column starts.

                  The same string goes to <ProductsSkeleton> below, and that is not tidiness: the
                  skeleton renders through this same primitive, so a mismatch re-columns the grid
                  the moment hydration swaps one for the other — CLS on the page with the most
                  cards on it.
                */}
                <ProductGrid className="pt-grid-stagger min-w-0 w-full lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                      /* Re-derived for the wider rail and the fourth column: at `xl` a card is
                         ~300px of a 1600px rail, which is 19vw, not 30. Declaring 30vw made the
                         browser fetch a file half again too large for every card on the page. */
                      /* Re-derived against the MEASURED card width at every step of the ladder
                         above, not guessed: 46vw (2-up), 32vw (3-up at md), 35vw (2-up at lg
                         beside the rail), 25vw (3-up at xl), 19vw (4-up at 2xl). The previous
                         string declared 30vw where the card is 34 and 19vw where it is 25, so the
                         browser was fetching a file a step too small and painting it into a wider
                         box — which is the softness the bigger cards were meant to cure. */
                      imageSizes="(max-width: 640px) 46vw, (max-width: 1023px) 32vw, (max-width: 1279px) 35vw, (max-width: 1535px) 25vw, 19vw"
                      // Mobile-first: the shop grid is 2-col on phones (81% of traffic), so only
                      // the first 2 cards are above the fold. Eager-loading 4 made cards 3–4
                      // (off-screen on mobile) compete with the LCP image. Prioritize just the
                      // first 2; the rest lazy-load (still prompt near the desktop fold).
                      /* The first ROW, not the first two cards. LCP on this page is a product
                         image, and at 4-up the first row is four of them — leaving cards 3 and 4
                         lazy meant the largest painted element was often one the browser had been
                         told not to hurry. Two on a phone (2-up), four from `lg`, and the cost of
                         being wrong is bounded: `priority` on four 300px images is ~40 KB. */
                      priority={idx < 4}
                    />
                  ))}
                </ProductGrid>
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      /* Real <a href="/shop?page=N"> in server mode. With 10,669 products at 12 a
                         page this pager IS the crawl path to pages 2-890 — as onClick buttons it
                         was a dead end for both Googlebot and anyone trying to open page 4 in a new
                         tab. Omitted on the legacy category/brand views, whose pagination is still
                         client state and has no URL to point at. */
                      buildHref={
                        isServerMode && serverQuery
                          ? (page) => buildShopUrl({ ...serverQuery, page }, serverBasePath)
                          : undefined
                      }
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
        <main className="mx-auto w-full max-w-site px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          <ProductsSkeleton gridClassName="lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" />
        </main>
      </>
    }>
      <ShopContent {...props} />
    </Suspense>
  );
}
