import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Hero } from '@/app/components/Hero';
import { CategoryRail } from '@/app/components/CategoryRail';

// Below-fold sections: defer JS evaluation until after first paint
const FeaturesSection = dynamic(() => import('@/app/components/FeaturesSection').then(m => ({ default: m.FeaturesSection })), { ssr: true });
const VentesFlashSection = dynamic(() => import('@/app/components/VentesFlashSection').then(m => ({ default: m.VentesFlashSection })), { ssr: true });
const ProductSection = dynamic(() => import('@/app/components/ProductSection').then(m => ({ default: m.ProductSection })), { ssr: true });
const HomeDeferredSections = dynamic(() => import('@/app/components/HomeDeferredSections').then(m => ({ default: m.HomeDeferredSections })), { ssr: true });

import type { AccueilData, Brand, Product } from '@/types';
import { getStorageUrl } from '@/services/api';
import type { HeroSlide } from '@/util/heroImage';

interface HomePageClientProps {
  accueil: AccueilData | null | undefined;
  /** Admin-managed hero slides (empty = hero uses its built-in static image). */
  heroSlides: HeroSlide[];
  /** Server-fetched brands for the (now SSR) brands wall. */
  brands?: Brand[];
}

/** High-intent category URLs — reinforces internal linking for rankings (créatine, whey, etc.). */
const PRIORITY_SHOP_CATEGORY_LINKS = [
  { href: '/creatine', label: 'Créatine Tunisie' },
  { href: '/proteine-whey', label: 'Whey protein Tunisie' },
  { href: '/bcaa', label: 'BCAA Tunisie' },
  { href: '/glutamine', label: 'Glutamine Tunisie' },
  { href: '/pre-workout', label: 'Pre workout Tunisie' },
  { href: '/acides-amines', label: 'Acides aminés Tunisie' },
] as const;

function transformProduct(product: Product) {
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
    qte: product.qte,
    rupture: product.rupture,
    review_count: normalizedCount > 0 ? normalizedCount : null,
    reviews_count: normalizedCount > 0 ? normalizedCount : null,
    reviews: Array.isArray(reviewsArray) && reviewsArray.length > 0 ? reviewsArray : undefined,
    aromes: p.aromes,
    sous_categorie: product.sous_categorie,
    sous_categories: product.sous_categories,
  };
}

export function HomePageClient({ accueil, heroSlides, brands }: HomePageClientProps) {
  // Provide default empty structure if accueil is undefined/null
  const safeAccueil: AccueilData = accueil || {
    categories: [],
    last_articles: [],
    ventes_flash: [],
    new_product: [],
    packs: [],
    best_sellers: [],
  };

  const newProducts = (safeAccueil.new_product || []).slice(0, 8).map(transformProduct);
  const bestSellers = (safeAccueil.best_sellers || []).slice(0, 4).map(transformProduct);
  const packs = (safeAccueil.packs || []).slice(0, 4).map(transformProduct);
  // Ventes flash: only products with promo + future promo_expiration_date (match backend logic)
  const now = Date.now();
  const flashSales = (safeAccueil.ventes_flash || [])
    .filter((p) => {
      if (p.promo == null || p.promo === undefined) return false;
      if (!p.promo_expiration_date) return false;
      const exp = new Date(p.promo_expiration_date).getTime();
      return !isNaN(exp) && exp > now;
    })
    .map(transformProduct);

  return (
    /* overflow-x-clip, NOT overflow-x-hidden. `hidden` makes this div a scroll container (a
       `hidden` axis forces the other axis from `visible` to `auto`), and because it wraps the
       whole page every `animation-timeline: view()` inside it bound to THIS element — which has
       no scroll range, so the timeline was inactive and every section reveal silently did
       nothing. Verified in Chrome: the ancestor chain reported `DIV ox=hidden oy=auto` as the
       nearest scroll container. `clip` clips identically without creating a scroller.
       Old-Safari safety net is unchanged: body still carries `overflow-x: hidden`. */
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-white dark:bg-gray-950">

      <main>
        {/* Above the fold - Critical content - Hero must render first */}
        <Hero slides={heroSlides} fallbackAlt="Whey, créatine et compléments — Protéine Tunisie" />
        {/* SEO: single visible H1 for main query "proteine tunisie" + internal link creatine.
            Left-aligned lede inside the rail so it does not read as a second hero title. */}
        {/* Compact SEO strip — keeps the single H1 + whey/créatine internal links, but small so it
            doesn't eat the fold right under the hero. */}
        <section className="py-3 sm:py-4 bg-white dark:bg-gray-950" aria-label="Titre principal">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="font-display uppercase tracking-tight text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              Protéine Tunisie
              <span className="ml-2 align-middle font-sans text-[11px] sm:text-xs font-medium normal-case tracking-normal text-red-600 dark:text-red-400">
                Nutrition sportive · Tunisie
              </span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <Link href="/proteine-whey" className="text-red-600 dark:text-red-400 hover:underline font-medium">Whey protein</Link>
              {', '}
              <Link href="/creatine" className="text-red-600 dark:text-red-400 hover:underline font-medium">créatine</Link>
              {' '}et compléments — livraison rapide partout en Tunisie.
            </p>
          </div>
        </section>

        {/* Immediate shopping paths, one tap from the fold. Sits after the hero rather than above
            it so the LCP element stays first — see the note in CategoryRail.tsx. */}
        <CategoryRail categories={safeAccueil.categories || []} />

        {/* Best-sellers FIRST — shoppers reach the most-sold products immediately after the hero,
            then the "what we do" trust band, then the rest of the rails. */}
        {(safeAccueil.best_sellers?.length ?? 0) > 0 && (
          <div className="pt-reveal" data-motion>
            <ProductSection
              id="products"
              kicker="Best-sellers"
              title="Les plus vendus"
              products={bestSellers as any}
              showBadge
              badgeText="Top Vendu"
              tightTop
            />
          </div>
        )}

        {/* "Ce que nous faisons" / trust badges — after the flagship products */}
        <div className="pt-reveal" data-motion>
          <FeaturesSection />
        </div>

        {(safeAccueil.new_product?.length ?? 0) > 0 && (
          <div className="pt-reveal" data-motion>
            <ProductSection
              kicker="Nouveautés"
              title="Nouveaux produits"
              products={newProducts as any}
              showBadge
              badgeText="New"
            />
          </div>
        )}

        {flashSales.length > 0 && (
          <div className="pt-reveal" data-motion>
            <VentesFlashSection products={flashSales as any} />
          </div>
        )}

        {/* CategoryGrid used to sit here. It is gone because CategoryRail above renders the SAME
            six categories from the same array with the same hrefs — the page showed one identical
            set of categories twice in one scroll, which reads as a bug rather than as navigation.
            The rail wins: it is higher up, it is a server component (no client JS), and it does
            not need a scrim over the photography.

            This leaves CategoryGrid.tsx with NO consumers anywhere in src/. It is kept rather than
            deleted because the category landing pages are the next phase and it is the natural
            block for them — but it is dead code today, so do not assume it is exercised. */}

        {(safeAccueil.packs?.length ?? 0) > 0 && (
          <div className="pt-reveal" data-motion>
            <ProductSection
              id="packs"
              kicker="Économisez"
              title="Nos packs"
              products={packs as any}
              viewAllHref="/packs"
              viewAllLabel="Voir tous les packs"
              imageContext="packs"
            />
          </div>
        )}

        {/* Below the fold - idle-loaded client islands */}
        <HomeDeferredSections articles={safeAccueil.last_articles || []} brands={brands} />

        {/* SEO text block – visible, crawlable content near bottom of homepage */}
        <section
          className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800"
          aria-label="Informations sur la protéine en Tunisie"
        >
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Nutrition sportive Tunisie : protéine, whey et créatine de qualité
            </h2>
            <nav aria-label="Catégories compléments populaires" className="mb-6 flex flex-wrap gap-2 sm:gap-3">
              {PRIORITY_SHOP_CATEGORY_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 hover:border-red-400 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Chez <strong>Protein.tn</strong>, nous accompagnons les sportifs tunisiens avec une sélection rigoureuse de{' '}
              <strong>protéines</strong>, <strong>whey</strong>, <strong>créatine</strong>, gainers et{' '}
              <strong>compléments alimentaires</strong> (BCAA, oméga 3, vitamines, brûleurs) — pour la performance, la
              prise de masse ou la sèche. Chaque produit est choisi pour son authenticité, son profil nutritionnel et son
              rapport qualité / prix, avec une fiche détaillée pour vous aider à faire le bon choix.
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
              Livraison en Tunisie & avis clients
            </h2>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Nous livrons partout en Tunisie via des partenaires fiables, avec un suivi précis de vos colis et des
              délais optimisés pour Sousse, Tunis, Sfax et les autres régions. Les <strong>avis clients</strong> laissés
              sur nos produits vous permettent de vérifier la satisfaction des sportifs qui utilisent déjà nos
              protéines, <strong>whey</strong> et <strong>créatine</strong>. Commandez vos compléments en ligne en toute
              confiance sur <strong>Proteine Tunisie</strong> et rejoignez la communauté Protein.tn.
            </p>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
