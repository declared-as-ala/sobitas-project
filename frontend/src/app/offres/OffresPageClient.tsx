'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductCard } from '@/app/components/ProductCard';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Input } from '@/app/components/ui/input';
import { Search, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import type { Product } from '@/types';

interface OffresPageClientProps {
  products: Product[];
}

export function OffresPageClient({ products }: OffresPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.designation_fr?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Tag className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Toutes les offres
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {products.length} produit{products.length !== 1 ? 's' : ''} en promotion
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un produit en promo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl border-gray-300 dark:border-gray-700"
              aria-label="Rechercher dans les offres"
            />
          </div>
        </motion.div>

        {filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery.trim()
                ? 'Aucun produit en promo ne correspond à votre recherche.'
                : 'Aucune offre disponible pour le moment.'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product as any}
                showBadge
                badgeText="Promo"
              />
            ))}
          </motion.div>
        )}
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
