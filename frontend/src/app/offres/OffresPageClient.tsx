'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductCard } from '@/app/components/ProductCard';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';
import { Input } from '@/app/components/ui/input';
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
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery.trim()
                ? 'Aucun produit en promo ne correspond à votre recherche.'
                : 'Aucune offre disponible pour le moment.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product as any}
                  showBadge
                  badgeText="Promo"
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-display uppercase tracking-wide font-semibold text-sm bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  Voir plus ({filteredProducts.length - visibleCount} restants)
                </button>
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
