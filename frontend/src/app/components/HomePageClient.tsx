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
    const normalizedCount =
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
      aromes: p.aromes,
    };
  }, []);

  const mergeReviewCounts = useMemo(() => (product: ReturnType<typeof transformProduct>) => {
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
            Protéine Tunisie – Votre partenaire nutrition sportive
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Whey protein, créatine et compléments alimentaires – Livraison rapide à Sousse, Tunis, Sfax et dans toute la Tunisie
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
            title="Produits les plus vendus"
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

        {/* SEO text block – visible, crawlable content near bottom of homepage */}
        <section
          className="py-10 sm:py-14 md:py-16 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800"
          aria-label="Informations sur la protéine en Tunisie"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Nutrition sportive Tunisie : protéine, whey et créatine de qualité
            </h2>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Chez <strong>SOBITAS</strong>, nous accompagnons depuis plusieurs années les athlètes et passionnés de
              fitness à travers toute la <strong>nutrition sportive Tunisie</strong>. Sur <strong>Protein.tn</strong>,
              vous trouvez une sélection rigoureuse de protéines, gainers, acides aminés et vitamines pensée pour la
              performance, la prise de masse ou la sèche. Chaque référence est choisie pour sa traçabilité, son profil
              nutritionnel et son rapport qualité / prix afin de vous garantir une expérience fiable à chaque
              commande.
            </p>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Notre gamme <strong>proteine Tunisie</strong> couvre tous les besoins : <strong>whey Tunisie</strong> pour
              une assimilation rapide après l&apos;entraînement, isolates pour les sportifs exigeants, protéines multi-sources
              pour les collations, mais aussi options végétales pour ceux qui privilégient une alimentation plant-based.
              Nous proposons également une large sélection de <strong>créatine Tunisie</strong> (monohydrate, en poudre ou
              en capsules) afin de soutenir la force, la récupération et les performances sur le long terme.
            </p>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Pour compléter votre programme, découvrez nos formules ciblées de
              <strong> complément alimentaire Tunisie</strong> : BCAA, oméga 3, multivitamines, brûleurs de graisses et
              boosters pré-workout. Chaque <strong>complément alimentaire</strong> est détaillé avec sa fiche produit,
              ses dosages et ses conseils d&apos;utilisation afin de vous aider à faire le bon choix en fonction de votre
              niveau et de vos objectifs.
            </p>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              En choisissant SOBITAS, vous profitez d&apos;une expertise locale sur la
              <strong> nutrition sportive Tunisie</strong>, d&apos;un service client réactif et d&apos;une livraison rapide dans
              tout le pays. Que vous soyez débutant en musculation, athlète confirmé ou coach sportif, notre équipe est
              disponible pour vous orienter vers les meilleurs produits et vous aider à construire une routine efficace
              et durable.
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
              Livraison en Tunisie & avis clients
            </h2>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Nous livrons partout en Tunisie via des partenaires fiables, avec un suivi précis de vos colis et des
              délais optimisés pour Sousse, Tunis, Sfax et les autres régions. Les <strong>avis clients</strong> laissés
              sur nos produits vous permettent de vérifier la satisfaction des sportifs qui utilisent déjà nos
              protéines, <strong>whey</strong> et <strong>crÉatine</strong>. Commandez vos compléments en ligne en toute
              confiance sur <strong>Protein.tn</strong> et rejoignez la communauté SOBITAS.
            </p>
          </div>
        </section>
      </main>

      <Suspense fallback={<div className="h-64 bg-gray-50 dark:bg-gray-900" />}>
        <Footer />
      </Suspense>
      <ScrollToTop />
    </div>
  );
}
