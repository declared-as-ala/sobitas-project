'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { useDebounce } from '@/util/debounce';
import { searchProducts } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import type { Product } from '@/types';
import { cn } from '@/app/components/ui/utils';

const PLACEHOLDER = 'Rechercher un produit...';
const DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 6;

interface SearchBarProps {
  /** Desktop: show full input. Mobile: show icon that opens sheet */
  variant?: 'desktop' | 'mobile';
  className?: string;
}

function SearchResults({
  query,
  products,
  isLoading,
  onProductClick,
  onViewAll,
}: {
  query: string;
  products: Product[];
  isLoading: boolean;
  onProductClick?: () => void;
  onViewAll?: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <span className="sr-only">Recherche en cours</span>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Tapez pour rechercher des protéines, gainers, compléments...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        <p>Aucun produit trouvé pour &quot;{query}&quot;</p>
        <p className="mt-1">Essayez d&apos;autres termes</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {products.slice(0, MAX_SUGGESTIONS).map((product) => (
        <Link
          key={product.id}
          href={`/products/${product.slug}`}
          onClick={onProductClick}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 focus:outline-none"
        >
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            {product.cover ? (
              <Image
                src={getStorageUrl(product.cover)}
                alt={product.designation_fr}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="h-full w-full bg-muted-foreground/20" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {product.designation_fr}
            </p>
            <p className="text-xs text-muted-foreground">
              {product.prix} DT
              {product.promo != null && product.promo < product.prix && (
                <span className="ml-1 text-red-600 dark:text-red-400">
                  → {product.promo} DT
                </span>
              )}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      ))}
      <Button
        variant="ghost"
        className="w-full justify-center gap-2 border-t pt-3 mt-2"
        onClick={onViewAll}
        asChild
      >
        <Link href={`/shop?search=${encodeURIComponent(query.trim())}`} onClick={onProductClick}>
          Voir tous les résultats ({products.length})
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export function SearchBar({ variant = 'desktop', className }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setProducts([]);
      return;
    }
    setIsLoading(true);
    try {
      const { products: results } = await searchProducts(trimmed);
      setProducts(results || []);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/shop?search=${encodeURIComponent(q)}`);
    setQuery('');
    setIsOpen(false);
    setIsPopoverOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    setProducts([]);
    inputRef.current?.focus();
  };

  const handleProductClick = () => {
    setQuery('');
    setProducts([]);
    setIsOpen(false);
    setIsPopoverOpen(false);
  };

  const handleViewAll = () => {
    const q = query.trim();
    if (q) router.push(`/shop?search=${encodeURIComponent(q)}`);
    setQuery('');
    setProducts([]);
    setIsOpen(false);
    setIsPopoverOpen(false);
  };

  const showResults = debouncedQuery.trim().length > 0 || products.length > 0 || isLoading;

  // Defer Sheet to client-only to avoid Radix ID hydration mismatch (aria-controls)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const mobileSearchButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-11 w-11 min-h-[44px] min-w-[44px]',
        'hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl active:scale-95 transition-transform',
        className
      )}
      aria-label="Rechercher un produit"
    >
      <Search className="h-5 w-5" />
    </Button>
  );

  if (variant === 'mobile') {
    if (!mounted) return mobileSearchButton;
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 min-h-[44px] min-w-[44px]',
              'hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl active:scale-95 transition-transform',
              className
            )}
            aria-label="Rechercher un produit"
          >
            <Search className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="top"
          className="h-[100dvh] overflow-hidden flex flex-col rounded-none sm:rounded-b-2xl bg-white dark:bg-gray-950 border-none p-0 [&>button]:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Recherche produits</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full overflow-hidden">
            {/* Header / Search Input Area */}
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 shrink-0 bg-white dark:bg-gray-950">
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <ArrowRight className="h-6 w-6 rotate-180 text-gray-500" />
              </Button>
              <form onSubmit={handleSubmit} className="flex-1 relative group">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none group-focus-within:text-red-500 transition-colors" aria-hidden />
                  <Input
                    ref={inputRef}
                    type="text" // Use text instead of search to fully disable browser-native X buttons across all OS
                    inputMode="search" // Still tells mobile OS to show search keyboard
                    placeholder="Que recherchez-vous ?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                    autoFocus
                    className="w-full pl-11 pr-11 h-12 text-base rounded-full bg-gray-100 dark:bg-gray-900 border-none focus:ring-2 focus:ring-red-500/20 focus:bg-white dark:focus:bg-gray-800 transition-all font-medium py-0"
                    aria-label="Rechercher un produit"
                  />
                  {query && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 active:scale-90 transition-transform"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClear();
                      }}
                      aria-label="Effacer la recherche"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-gray-50/50 dark:bg-gray-950">
              <SearchResults
                query={debouncedQuery}
                products={products}
                isLoading={isLoading}
                onProductClick={handleProductClick}
                onViewAll={handleViewAll}
              />
            </div>

            {/* Bottom Action (optional, only show if query exists) */}
            {query && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 safe-area-pb">
                <Button
                  onClick={handleSubmit}
                  className="w-full h-12 rounded-xl text-base font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Voir tous les résultats
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: inline input with popover dropdown
  return (
    <div className={cn('relative flex-1 max-w-xl', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <Input
          ref={inputRef}
          type="text"
          inputMode="search"
          placeholder={PLACEHOLDER}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsPopoverOpen(true);
          }}
          onFocus={() => showResults && setIsPopoverOpen(true)}
          onBlur={() => {
            // Delay to allow link clicks
            setTimeout(() => setIsPopoverOpen(false), 150);
          }}
          autoComplete="off"
          className="w-full pl-10 pr-10 h-10 bg-muted/50 dark:bg-muted/30 border-gray-200 dark:border-gray-700 focus:bg-background transition-colors"
          aria-label="Rechercher un produit"
          aria-expanded={isPopoverOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {isPopoverOpen && showResults && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 max-h-[400px] overflow-y-auto"
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
        >
          <SearchResults
            query={debouncedQuery}
            products={products}
            isLoading={isLoading}
            onProductClick={handleProductClick}
            onViewAll={handleViewAll}
          />
        </div>
      )}
    </div>
  );
}
