import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Hero } from '@/app/components/Hero';
import { CategoryRail } from '@/app/components/CategoryRail';
import { Section } from '@/app/components/layout/Section';

// Below-fold sections: defer JS evaluation until after first paint
const FeaturesSection = dynamic(() => import('@/app/components/FeaturesSection').then(m => ({ default: m.FeaturesSection })), { ssr: true });
const VentesFlashSection = dynamic(() => import('@/app/components/VentesFlashSection').then(m => ({ default: m.VentesFlashSection })), { ssr: true });
const ProductSection = dynamic(() => import('@/app/components/ProductSection').then(m => ({ default: m.ProductSection })), { ssr: true });
const HomeDeferredSections = dynamic(() => import('@/app/components/HomeDeferredSections').then(m => ({ default: m.HomeDeferredSections })), { ssr: true });

import type { AccueilData, Brand, Product } from '@/types';
import { getStorageUrl } from '@/services/api';
import { getProductLink } from '@/util/productUrl';
import type { HeroSlide } from '@/util/heroImage';
import type { HeroBestSeller } from '@/app/components/HeroBestSellers';

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
    brand_id: (product as any).brand_id,
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

  // Resolve brand names once: the grid payload carries only brand_id, but the brands list is
  // already fetched and passed in. Cards read `brandName` off the product (see ProductCard).
  const brandMap = new Map((brands || []).map((b) => [b.id, b.designation_fr]));
  const withBrand = <T extends { brand_id?: number }>(p: T): T & { brandName?: string } => ({
    ...p,
    brandName: p.brand_id != null ? brandMap.get(p.brand_id) : undefined,
  });

  const newProducts = (safeAccueil.new_product || []).slice(0, 8).map(transformProduct).map(withBrand);
  const bestSellers = (safeAccueil.best_sellers || []).slice(0, 4).map(transformProduct).map(withBrand);
  // Top 3 for the hero's wide-screen column. Built from the SAME payload as the rail below, so it
  // adds no request. Promo price wins when live, and the original is passed as oldPrice so the
  // panel can strike it through.
  const heroBestSellers: HeroBestSeller[] = (safeAccueil.best_sellers || [])
    .slice(0, 3)
    .map((p) => {
      const onPromo = Boolean(p.promo && p.promo_expiration_date && new Date(p.promo_expiration_date).getTime() > Date.now());
      return {
        id: p.id,
        name: p.designation_fr || 'Produit',
        href: getProductLink(p),
        image: p.cover ? getStorageUrl(p.cover) : null,
        price: onPromo ? Number(p.promo) : Number(p.prix),
        oldPrice: onPromo ? Number(p.prix) : null,
        ratingValue: (p as { rating_value?: number | null }).rating_value ?? null,
        reviewCount: (p as { review_count?: number | null }).review_count ?? null,
      };
    });
  const packs = (safeAccueil.packs || []).slice(0, 4).map(transformProduct).map(withBrand);
  // Ventes flash: only products with promo + future promo_expiration_date (match backend logic)
  const now = Date.now();
  const flashSales = (safeAccueil.ventes_flash || [])
    .filter((p) => {
      if (p.promo == null || p.promo === undefined) return false;
      if (!p.promo_expiration_date) return false;
      const exp = new Date(p.promo_expiration_date).getTime();
      return !isNaN(exp) && exp > now;
    })
    .map(transformProduct)
    .map(withBrand);

  return (
    /* overflow-x-clip, NOT overflow-x-hidden. `hidden` makes this div a scroll container (a
       `hidden` axis forces the other axis from `visible` to `auto`), and because it wraps the
       whole page every `animation-timeline: view()` inside it bound to THIS element — which has
       no scroll range, so the timeline was inactive and every section reveal silently did
       nothing. Verified in Chrome: the ancestor chain reported `DIV ox=hidden oy=auto` as the
       nearest scroll container. `clip` clips identically without creating a scroller.
       Old-Safari safety net is unchanged: body still carries `overflow-x: hidden`. */
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-canvas">

      <main>
        {/* The page's single <h1>, visually hidden. The owner asked for no copy strip under the
            hero, but the document still needs ONE h1 and it should come before the section h2s for
            a correct outline. sr-only keeps the "Protéine Tunisie" query in the h1 for SEO/screen
            readers without putting a heading back on screen. */}
        <h1 className="sr-only">
          Protéine Tunisie — whey, créatine et compléments de nutrition sportive, livraison partout
          en Tunisie
        </h1>
        {/* Above the fold - Critical content - Hero must render first */}
        {/* bestSellers powers the wide-screen column beside the slider. Same payload the
            "Les plus vendus" rail below already uses, so it costs no extra fetch, and the column
            is dropped entirely under 1280px. Ratings are passed through as-is: the panel renders
            stars only when a product genuinely has reviews. */}
        <Hero
          slides={heroSlides}
          fallbackAlt="Whey, créatine et compléments — Protéine Tunisie"
          bestSellers={heroBestSellers}
        />

        {/*
          ── THE BAND SEQUENCE (DESIGN_SYSTEM v6 §4) ───────────────────────────────────────────
          Read this list top-to-bottom; it is the page's entire colour architecture and it is
          decided HERE, never inside a section component.

              hero            canvas          artwork supplies the darkness
              trust strip     sunken
              catégories      canvas
              plus vendus     sunken
              ventes flash    canvas          + the four black countdown tiles
              nouveautés      sunken
              packs           canvas
              promo strip     ORANGE          the one saturated band
              blog            sunken
              marques         canvas
              bloc SEO        sunken

          TWO INVARIANTS:
            1. No two adjacent bands share a surface, so the automatic 1px seam always has a
               colour change to reinforce and never has to carry a boundary alone.
            2. Exactly ONE saturated band and ZERO dark bands. v5 had five dark bands here; the
               owner's verdict was that black had stopped being emphasis and become the page.
               Black now appears only in the 36px utility bar, the countdown tiles, the hero
               caption plate and the footer.

          THE TRUST STRIP SITS SECOND on purpose: the free-delivery threshold and "paiement à la
          livraison" land BEFORE browsing rather than after it — the order a cash-on-delivery
          shopper needs — and a `strip` band between two others deletes two of the page's measured
          dead gaps (80+80 desktop, 96+48 mobile).

          `pt-defer` is a PROP on the Section, never on a wrapper: `content-visibility: auto`
          skips a subtree's paint but NOT the element's own box decoration, so a surface class on
          a CHILD of a deferred wrapper renders as a bare rectangle until it scrolls in.
          `pt-reveal` stays on the outer div because it drives a `view()` timeline that must not
          sit inside a skipped subtree.
        */}
        <FeaturesSection />

        {/* CategoryRail sits DIRECTLY under the hero (owner request): shopping paths one tap from
            the fold, no copy strip in between. The page's single <h1> used to live in that strip;
            it now lives in the crawlable SEO block near the bottom (still exactly one h1, still
            carrying the "Protéine Tunisie" query), so removing the strip costs no ranking signal. */}
        <CategoryRail categories={safeAccueil.categories || []} />



        {/* Les plus vendus — SUNKEN. The highest-intent rail on the site, so it carries the
            page's largest heading (scale="1"). */}
        {(safeAccueil.best_sellers?.length ?? 0) > 0 && (
          <div className="pt-reveal" data-motion>
            <ProductSection
              id="products"
              kicker="Best-sellers"
              title="Les plus vendus"
              products={bestSellers as any}
              showBadge
              badgeText="Top Vendu"
              surface="sunken"
              defer
            />
          </div>
        )}

        {/* Ventes flash moved ABOVE Nouveaux produits: the discount moment should land before the
            newest, least-discounted rail. SLAB — white product plates punched out of black. */}
        {flashSales.length > 0 && (
          <div className="pt-reveal" data-motion>
            <VentesFlashSection products={flashSales as any} />
          </div>
        )}

        {(safeAccueil.new_product?.length ?? 0) > 0 && (
          <div className="pt-reveal" data-motion>
            <ProductSection
              kicker="Nouveautés"
              title="Nouveaux produits"
              products={newProducts as any}
              showBadge
              badgeText="New"
              surface="sunken"
              defer
            />
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

        {/* Nos packs — canvas, `default` spacing. It was the page's SECOND slab band at `feature`
            spacing, which is what tipped the page from "one dark accent" into "a dark theme": two
            near-black merchandising bands 1,500px apart read as the page's base colour rather
            than as emphasis. It keeps the "Économisez" kicker and a `scale="1"` heading, which is
            what actually marks it as an offer. `feature` is now reserved to Ventes flash alone —
            two dominant bands is zero dominant bands. */}
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
              defer
            />
          </div>
        )}

        {/* Below the fold - idle-loaded client islands */}
        <div className="pt-defer">
          <HomeDeferredSections articles={safeAccueil.last_articles || []} brands={brands} />
        </div>

        {/* SEO text block – visible, crawlable content near bottom of homepage.
            `pt-defer` skips RENDERING it while off-screen; the markup is still fully present in
            the server-rendered HTML, which is what Googlebot reads. Asserted in verification. */}
        <Section
          surface="sunken"
          spacing="tight"
          width="wide"
          defer
          aria-label="Informations sur la protéine en Tunisie"
        >
          {/* TWO COLUMNS at lg: prose left, the internal-link chips right. That halves the height
              without deleting a single crawlable word — these are real internal ranking links and
              the prose is the page's only long-form copy. The `border-t` is gone because the
              automatic band seam draws it now. */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
            <div className="max-w-[62ch]">
            {/* h2, not h1 — the page's single h1 is the visually-hidden one at the top of <main>,
                so this crawlable block leads with a keyword-rich h2. */}
            <h2 className="font-display font-compressed text-[1.875rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 mb-4 lg:text-[2.5rem]">
              Nutrition sportive Tunisie : protéine, whey et créatine de qualité
            </h2>
            <p className="text-sm sm:text-base text-ink-2 leading-relaxed mb-4">
              Chez <strong>Protein.tn</strong>, nous accompagnons les sportifs tunisiens avec une sélection rigoureuse de{' '}
              <strong>protéines</strong>, <strong>whey</strong>, <strong>créatine</strong>, gainers et{' '}
              <strong>compléments alimentaires</strong> (BCAA, oméga 3, vitamines, brûleurs) — pour la performance, la
              prise de masse ou la sèche. Chaque produit est choisi pour son authenticité, son profil nutritionnel et son
              rapport qualité / prix, avec une fiche détaillée pour vous aider à faire le bon choix.
            </p>
            <h2 className="font-display font-compressed text-[1.375rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 mt-8 mb-3 lg:text-[1.75rem]">
              Livraison en Tunisie & avis clients
            </h2>
            <p className="text-sm sm:text-base text-ink-2 leading-relaxed">
              Nous livrons partout en Tunisie via des partenaires fiables, avec un suivi précis de vos colis et des
              délais optimisés pour Sousse, Tunis, Sfax et les autres régions. Les <strong>avis clients</strong> laissés
              sur nos produits vous permettent de vérifier la satisfaction des sportifs qui utilisent déjà nos
              protéines, <strong>whey</strong> et <strong>créatine</strong>. Commandez vos compléments en ligne en toute
              confiance sur <strong>Proteine Tunisie</strong> et rejoignez la communauté Protein.tn.
            </p>
            </div>

            {/* Right column: the six high-intent internal links. */}
            <nav aria-label="Catégories compléments populaires" className="flex flex-wrap gap-2 lg:content-start">
              {PRIORITY_SHOP_CATEGORY_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-hairline bg-elevated px-4 text-xs sm:text-sm font-medium text-ink-1 transition-colors hover:border-brand hover:text-brand"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </Section>
      </main>

    </div>
  );
}
