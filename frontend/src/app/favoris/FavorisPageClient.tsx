'use client';

import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { useFavorites } from '@/contexts/FavoritesContext';
import { ProductCard } from '@/app/components/ProductCard';
import { ProductCardSkeleton } from '@/app/components/ProductCardSkeleton';
import { PageHeader } from '@/app/components/PageHeader';
import { Heart } from 'lucide-react';
import type { Product } from '@/types';

const FAVORIS_GRID_CLASS =
  'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-[360px]:gap-1.5 sm:gap-4 lg:gap-6';

export function FavorisPageClient() {
  const { favoriteProducts, count, isLoaded } = useFavorites();

  const productsAsProduct: Product[] = favoriteProducts.map((p) => ({
    id: p.id,
    designation_fr: p.designation_fr,
    slug: p.slug ?? '',
    cover: p.cover,
    prix: p.prix ?? 0,
    promo: p.promo ?? undefined,
    // Carry the persisted promo expiry + stock so ProductCard behaves exactly as elsewhere:
    // without promo_expiration_date, isPromoActive treats an EXPIRED promo as active and shows the
    // promo price while checkout charges the real prix (a show-low/charge-full discrepancy);
    // without qte, getStockDisponible falls back to 1 and caps every favorite at a single unit.
    promo_expiration_date: p.promo_expiration_date ?? undefined,
    qte: p.qte,
    rupture: p.rupture,
    publier: 1,
  })) as Product[];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-6 sm:mb-8">
          <PageHeader
            kicker="Ma sélection"
            title="Favoris"
            subtitle={!isLoaded || count === 0 ? undefined : `${count} produit${count > 1 ? 's' : ''} en favoris`}
          />
        </div>
        {!isLoaded ? (
          <div className={FAVORIS_GRID_CLASS} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : count > 0 ? (
          <div className={FAVORIS_GRID_CLASS}>
            {productsAsProduct.map((product) => (
              <ProductCard key={product.id} product={product} variant="compact" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-8 sm:p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 mb-4">
              <Heart className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <h2 className="font-display uppercase tracking-tight text-xl text-gray-900 dark:text-white mb-2">Votre liste de favoris est vide</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Ajoutez des produits depuis la boutique ou les fiches produit.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide px-6 py-3 transition-colors"
            >
              Découvrir la boutique
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
