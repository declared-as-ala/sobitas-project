'use client';

import { useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { HeroSlider } from '@/app/components/HeroSlider';

import type { AccueilData, Product } from '@/types';
import { getStorageUrl } from '@/services/api';

// Defer header and topbar - they're not critical for LCP but keep SSR for SEO
const Header = dynamic(() => import('@/app/components/Header').then(mod => ({ default: mod.Header })), {
  ssr: true,
});

// Below-the-fold: dynamic import to reduce main bundle and TBT on mobile (PageSpeed)
const FeaturesSection = dynamic(
  () => import('@/app/components/FeaturesSection').then(mod => ({ default: mod.FeaturesSection })),
  { ssr: true, loading: () => <div className="min-h-[200px]" aria-hidden /> }
);
const CategoryGrid = dynamic(
  () => import('@/app/components/CategoryGrid').then(mod => ({ default: mod.CategoryGrid })),
  { ssr: true, loading: () => <div className="py-8 min-h-[240px]" aria-hidden /> }
);
const VentesFlashSection = dynamic(
  () => import('@/app/components/VentesFlashSection').then(mod => ({ default: mod.VentesFlashSection })),
  { ssr: true, loading: () => null }
);
const ProductSection = dynamic(
  () => import('@/app/components/ProductSection').then(mod => ({ default: mod.ProductSection })),
  { ssr: true, loading: () => null }
);

// Lazy load non-critical below-the-fold components
const PromoBanner = dynamic(() => import('@/app/components/PromoBanner').then(mod => ({ default: mod.PromoBanner })), {
  ssr: false,
  loading: () => null, // Don't show loading for banner
});
const BlogSection = dynamic(() => import('@/app/components/BlogSection').then(mod => ({ default: mod.BlogSection })), {
  ssr: false,
  loading: () => null,
});
const BrandsSection = dynamic(() => import('@/app/components/BrandsSection').then(mod => ({ default: mod.BrandsSection })), {
  ssr: false,
  loading: () => null,
});
const Footer = dynamic(() => import('@/app/components/Footer').then(mod => ({ default: mod.Footer })), {
  loading: () => <div className="h-64 bg-gray-50 dark:bg-gray-900" />, // Placeholder height
});
const ScrollToTop = dynamic(() => import('@/app/components/ScrollToTop').then(mod => ({ default: mod.ScrollToTop })), {
  ssr: false,
});

interface HomePageClientProps {
  accueil: AccueilData | null | undefined;
  slides: any[];
}

export function HomePageClient({ accueil, slides }: HomePageClientProps) {
  // Provide default empty structure if accueil is undefined/null
  const safeAccueil: AccueilData = accueil || {
    categories: [],
    last_articles: [],
    ventes_flash: [],
    new_product: [],
    packs: [],
    best_sellers: [],
  };

  // Memoize product transformations to prevent unnecessary recalculations
  const transformProduct = useMemo(() => (product: Product) => ({
    id: product.id,
    name: product.designation_fr,
    price: product.promo && product.promo_expiration_date ? product.promo : product.prix,
    priceText: `${product.prix} DT`,
    image: product.cover ? getStorageUrl(product.cover) : undefined,
    category: product.sous_categorie?.designation_fr || '',
    slug: product.slug,
    designation_fr: product.designation_fr,
    prix: product.prix,
    promo: product.promo,
    promo_expiration_date: product.promo_expiration_date,
    cover: product.cover,
    new_product: product.new_product,
    best_seller: product.best_seller,
    note: product.note,
    reviews_count: (product as any).reviews_count ?? null,
  }), []);

  const newProducts = useMemo(() =>
    (safeAccueil.new_product || []).slice(0, 8).map(transformProduct),
    [safeAccueil.new_product, transformProduct]
  );
  const bestSellers = useMemo(() =>
    (safeAccueil.best_sellers || []).slice(0, 4).map(transformProduct),
    [safeAccueil.best_sellers, transformProduct]
  );
  const packs = useMemo(() =>
    (safeAccueil.packs || []).slice(0, 4).map(transformProduct),
    [safeAccueil.packs, transformProduct]
  );
  // Ventes flash: only products with promo + future promo_expiration_date (match backend logic)
  const flashSales = useMemo(() => {
    const now = new Date();
    const valid = (safeAccueil.ventes_flash || []).filter((p) => {
      if (p.promo == null || p.promo === undefined) return false;
      if (!p.promo_expiration_date) return false;
      const exp = new Date(p.promo_expiration_date);
      return !isNaN(exp.getTime()) && exp.getTime() > now.getTime();
    });
    return valid.map(transformProduct);
  }, [safeAccueil.ventes_flash, transformProduct]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white dark:bg-gray-950">
      <Header />

      <main>
        {/* Above the fold - Critical content - Hero must render first */}
        <HeroSlider slides={slides} />
        {/* FeaturesSection - Fixed height to prevent CLS */}
        <div style={{ minHeight: '200px' }}>
          <FeaturesSection />
        </div>
        <CategoryGrid categories={safeAccueil.categories || []} />

        {/* Product sections – order: Nouveaux Produits → Meilleurs Ventes → Ventes Flash */}
        {(safeAccueil.new_product?.length ?? 0) > 0 && (
          <ProductSection
            id="products"
            title="Nouveaux Produits"
            subtitle="Découvrez nos dernières nouveautés"
            products={newProducts as any}
            showBadge
            badgeText="New"
          />
        )}

        {(safeAccueil.best_sellers?.length ?? 0) > 0 && (
          <ProductSection
            title="Meilleurs Ventes"
            subtitle="Les produits les plus populaires"
            products={bestSellers as any}
            showBadge
            badgeText="Top Vendu"
          />
        )}

        {flashSales.length > 0 && (
          <VentesFlashSection products={flashSales as any} />
        )}

        {(safeAccueil.packs?.length ?? 0) > 0 && (
          <ProductSection
            id="packs"
            title="Nos Packs"
            subtitle="Économisez avec nos packs spéciaux"
            products={packs as any}
            viewAllHref="/packs"
            viewAllLabel="Voir tous les packs"
          />
        )}

        {/* Below the fold - Lazy loaded */}
        <Suspense fallback={null}>
          <PromoBanner />
        </Suspense>

        <Suspense fallback={null}>
          <BlogSection articles={safeAccueil.last_articles || []} />
        </Suspense>

        <Suspense fallback={null}>
          <BrandsSection />
        </Suspense>
      </main>

      <Suspense fallback={<div className="h-64 bg-gray-50 dark:bg-gray-900" />}>
        <Footer />
      </Suspense>
      <ScrollToTop />
    </div>
  );
}
