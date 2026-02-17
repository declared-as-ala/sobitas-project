'use client';

import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { useFavorites } from '@/contexts/FavoritesContext';
import { ProductCard } from '@/app/components/ProductCard';
import type { Product } from '@/types';

export function FavorisPageClient() {
  const { favoriteProducts, count } = useFavorites();

  const productsAsProduct: Product[] = favoriteProducts.map((p) => ({
    id: p.id,
    designation_fr: p.designation_fr,
    slug: p.slug ?? '',
    cover: p.cover,
    prix: p.prix ?? 0,
    promo: p.promo ?? undefined,
    rupture: p.rupture,
    publier: 1,
  })) as Product[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Favoris
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">
          {count === 0
            ? 'Aucun produit en favoris. Ajoutez des produits depuis la boutique ou les fiches produit.'
            : `${count} produit${count > 1 ? 's' : ''} en favoris`}
        </p>
        {count > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {productsAsProduct.map((product) => (
              <ProductCard key={product.id} product={product} variant="compact" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 sm:p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Votre liste de favoris est vide.</p>
            <Link href="/shop" className="mt-4 inline-block text-red-600 dark:text-red-400 font-medium hover:underline">
              Découvrir la boutique
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
