'use client';

import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductCard } from '@/app/components/ProductCard';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';
import type { Product } from '@/types';

interface PacksPageClientProps {
  packs: Product[];
}

export function PacksPageClient({ packs }: PacksPageClientProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="mb-8 sm:mb-10 lg:mb-12">
          <PageHeader
            align="center"
            kicker="Packs"
            title="Nos Packs"
            subtitle="Économisez avec nos packs spéciaux conçus pour répondre à vos objectifs spécifiques"
          />
        </div>

        {packs.length === 0 ? (
          <div className="text-center py-10 sm:py-12">
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-lg">
              Aucun pack disponible pour le moment
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {packs.map((pack) => (
              <ProductCard key={pack.id} product={pack} showDescription={true} imageContext="packs" />
            ))}
          </div>
        )}
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
