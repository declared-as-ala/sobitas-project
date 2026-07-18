'use client';

import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductCard } from '@/app/components/ProductCard';
import { ProductGrid } from '@/app/components/ProductGrid';
import { EmptyState } from '@/app/components/EmptyState';
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
          <EmptyState
            title="Aucun pack disponible"
            description="Aucun pack disponible pour le moment. Revenez bientôt."
            showShopLink
          />
        ) : (
          <ProductGrid>
            {packs.map((pack, idx) => (
              <ProductCard
                key={pack.id}
                product={pack}
                variant="compact"
                imageContext="packs"
                showDescription
                // Mobile-first: 2-col grid on phones → only 2 cards above the fold. Eager-loading
                // 4 made the off-screen ones compete with the LCP image on mobile.
                priority={idx < 2}
              />
            ))}
          </ProductGrid>
        )}
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
