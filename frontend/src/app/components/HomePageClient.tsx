'use client';

import { useMemo, Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { HeroSlider } from '@/app/components/HeroSlider';

import type { AccueilData, Product } from '@/types';
import { getStorageUrl, getProductDetails } from '@/services/api';

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

function getReviewCountFromProduct(p: { reviews?: { stars?: number; publier?: number }[]; avis?: { stars?: number; publier?: number }[] }): number {
  const arr = p.reviews ?? p.avis ?? [];
  if (!Array.isArray(arr)) return 0;
  return arr.filter((r: any) => typeof r?.stars === 'number' && (r.publier === undefined || r.publier === 1)).length;
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

  const [reviewCountsById, setReviewCountsById] = useState<Record<number, number>>({});

  useEffect(() => {
    const products = [
      ...(safeAccueil.new_product || []).slice(0, 8),
      ...(safeAccueil.best_sellers || []).slice(0, 4),
      ...(safeAccueil.packs || []).slice(0, 4),
      ...(safeAccueil.ventes_flash || []).slice(0, 4),
    ];
    const bySlug = new Map<string, { id: number }>();
    products.forEach((p: any) => {
      if (p?.slug && p?.id) bySlug.set(p.slug, { id: p.id });
    });
    const slugs = Array.from(bySlug.keys());
    if (slugs.length === 0) return;
    Promise.all(slugs.map((slug) => getProductDetails(slug).catch(() => null)))
      .then((results) => {
        const next: Record<number, number> = {};
        results.forEach((product) => {
          if (product?.id) {
            const count = getReviewCountFromProduct(product);
            if (count > 0) next[product.id] = count;
          }
        });
        setReviewCountsById((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {});
  }, [safeAccueil.new_product, safeAccueil.best_sellers, safeAccueil.packs, safeAccueil.ventes_flash]);

  // Memoize product transformations to prevent unnecessary recalculations
  const transformProduct = useMemo(() => (product: Product) => {
    const p = product as any;
    const reviewsArray = p.reviews ?? p.avis ?? [];
    const countFromArray = Array.isArray(reviewsArray)
      ? reviewsArray.filter((r: any) => typeof r?.stars === 'number' && (r.publier === undefined || r.publier === 1)).length
      : 0;
    const countFromObj =
      reviewsArray && typeof reviewsArray === 'object' && !Array.isArray(reviewsArray)
        ? Math.max(0, Number((reviewsArray as any).count ?? (reviewsArray as any).total ?? 0) || 0)
        : 0;
    const reviewCount =
      p.reviews_count ?? p.review_count ?? p.avis_count ?? p.nombre_avis ?? p.nb_avis ?? p.total_reviews ?? p.reviewsCount;
    let normalizedCount =
      reviewCount != null && reviewCount !== ''
        ? Math.max(0, Number(reviewCount) || 0)
        : countFromArray > 0
          ? countFromArray
          : countFromObj;
    return {
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
      review_count: normalizedCount > 0 ? normalizedCount : null,
      reviews_count: normalizedCount > 0 ? normalizedCount : null,
      reviews: Array.isArray(reviewsArray) && reviewsArray.length > 0 ? reviewsArray : undefined,
    };
  }, []);

  const mergeReviewCounts = useMemo(() => (product: ReturnType<typeof transformProduct extends (p: Product) => infer R ? R : never>) => {
    const fetchedCount = reviewCountsById[product.id];
    if (fetchedCount != null && fetchedCount > 0) {
      return { ...product, review_count: fetchedCount, reviews_count: fetchedCount };
    }
    return product;
  }, [reviewCountsById]);

  const newProducts = useMemo(
    () => (safeAccueil.new_product || []).slice(0, 8).map(transformProduct).map(mergeReviewCounts),
    [safeAccueil.new_product, transformProduct, mergeReviewCounts]
  );
  const bestSellers = useMemo(
    () => (safeAccueil.best_sellers || []).slice(0, 4).map(transformProduct).map(mergeReviewCounts),
    [safeAccueil.best_sellers, transformProduct, mergeReviewCounts]
  );
  const packs = useMemo(
    () => (safeAccueil.packs || []).slice(0, 4).map(transformProduct).map(mergeReviewCounts),
    [safeAccueil.packs, transformProduct, mergeReviewCounts]
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
    return valid.map(transformProduct).map(mergeReviewCounts);
  }, [safeAccueil.ventes_flash, transformProduct, mergeReviewCounts]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white dark:bg-gray-950">
      <Header />

      <main>
        {/* Above the fold - Critical content - Hero must render first */}
        <HeroSlider slides={slides} />
        {/* SEO: single visible H1 for main query "proteine tunisie" */}
        <section className="text-center py-4 px-4 bg-white dark:bg-gray-950" aria-label="Titre principal">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Proteine Tunisie – Votre partenaire nutrition
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Whey protein, creatine et compléments – Livraison rapide Sousse, Tunis, Sfax
          </p>
        </section>
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
