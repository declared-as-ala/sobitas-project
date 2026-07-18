'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductCard } from '@/app/components/ProductCard';
import { ProductGrid } from '@/app/components/ProductGrid';
import { EmptyState } from '@/app/components/EmptyState';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Search, ChevronDown } from 'lucide-react';
import type { Product } from '@/types';

const PAGE_SIZE = 24;

interface OffresPageClientProps {
  products: Product[];
}

export function OffresPageClient({ products }: OffresPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => p.designation_fr?.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(PAGE_SIZE); // reset pagination on new search
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="mb-8 sm:mb-10">
          <PageHeader
            kicker="Offres"
            title="Toutes les offres"
            subtitle={`${filteredProducts.length} produit${filteredProducts.length !== 1 ? 's' : ''} en promotion`}
          />

          {/* Search */}
          <div className="relative max-w-md mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Rechercher un produit en promo..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 h-12 rounded-xl border-gray-200 dark:border-gray-800"
              aria-label="Rechercher dans les offres"
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            title={searchQuery.trim() ? 'Aucun résultat' : 'Aucune offre disponible'}
            description={
              searchQuery.trim()
                ? 'Aucun produit en promo ne correspond à votre recherche.'
                : 'Aucune offre disponible pour le moment. Revenez bientôt.'
            }
            showShopLink={!searchQuery.trim()}
          />
        ) : (
          <>
            <ProductGrid>
              {visibleProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product as any}
                  variant="compact"
                  // Mobile-first: 2-col grid on phones → only 2 cards above the fold. Eager-loading
                  // 4 made the off-screen ones compete with the LCP image on mobile.
                  priority={idx < 2}
                />
              ))}
            </ProductGrid>

            {hasMore && (
              <div className="flex justify-center mt-10">
                <Button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="min-h-[44px] gap-2 px-8 rounded-xl font-display uppercase tracking-wide font-semibold text-sm bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  Voir plus ({filteredProducts.length - visibleCount} restants)
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
