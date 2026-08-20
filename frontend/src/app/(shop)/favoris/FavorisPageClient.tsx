'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { PageHeader } from '@/app/components/PageHeader';
import { ProductCard } from '@/app/components/ProductCard';
import { ProductCardSkeleton } from '@/app/components/ProductCardSkeleton';
import { ProductGrid } from '@/app/components/ProductGrid';
import { ProductSection } from '@/app/components/ProductSection';
import { Section } from '@/app/components/layout/Section';
import { useCartActions } from '@/app/contexts/CartContext';
import { useFavorites, useFavoritesActions } from '@/contexts/FavoritesContext';
import { getProductDetails, getSimilarProducts, getStorageUrl } from '@/services/api';
import { getProductStockStatus, getStockDisponible } from '@/util/cartStock';
import { getPriceDisplay } from '@/util/productPrice';
import type { Product } from '@/types';

/**
 * ── /favoris (owner, 20/08/2026) ────────────────────────────────────────────────────────────
 * *"on mobile and desktop redesign the favoris page and add in it suggested products and better
 * products and related products etc."*
 *
 * ── THE GRID WAS BREAKING THE CARD, AND THE SCREENSHOT SHOWS IT ────────────────────────────
 * This page did not use `ProductGrid`. It carried its own copy of the class string, and the copy
 * had drifted to `grid-cols-2` on phones — two columns — while every other listing on the site
 * runs ONE. That was not a cosmetic difference. `ProductCard` is `flex-row sm:flex-col`: below
 * `sm` it is a horizontal ROW, a 124px thumbnail with the text beside it, sized for a full-width
 * card. Put two of those side by side on a 390px phone and the text column is ~60px, so the
 * owner's screenshot reads
 *
 *      NIT      AN
 *      WHE      WHI
 *      P...     8...
 *
 * — the product names clipped to three characters, the price column cut off mid-number, the
 * "Ajouter" button sliced in half. The page was rendering the card in a box a third of the width
 * it is designed for.
 *
 * `ProductGrid` is imported now, which is also the fix for the next time the ladder changes: the
 * grid is defined in one file and six surfaces read it. A hand-rolled copy is how this one got a
 * whole breakpoint wrong and nobody noticed.
 *
 * ── AND THE PAGE WAS THE LAST ONE STILL WRITTEN IN RAW PALETTE ────────────────────────────
 * `bg-gray-50 dark:bg-gray-950`, `max-w-7xl`, `bg-red-600`, `text-gray-600 dark:text-gray-400` —
 * 23 design-lint violations across 76 lines, the worst density on the site outside /account. It
 * is bands and tokens now, so it matches the boutique it sends people back to.
 *
 * ── WHAT AN EMPTY WISHLIST SHOULD DO ──────────────────────────────────────────────────────
 * This page's most common state, by a distance, is EMPTY — a shopper lands on it from the tab bar
 * before they have hearted anything. It used to answer with a box, one sentence and a button, and
 * nothing else: a dead end on the one screen where somebody is already browsing.
 *
 * The recommendation rails render in BOTH states. Empty, they are the page. Full, they are what a
 * wishlist is for — the shopper has just told us exactly what they are shopping for, and the
 * shelf next to it is the single most relevant thing we can put in front of them.
 */

/** A suggestion band. Assembled in one list so the surface alternation below cannot drift. */
type Rail = {
  key: string;
  kicker: string;
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref: string;
};

/**
 * A rail needs enough products to look like a shelf.
 *
 * Four is `ProductGrid`'s widest step, so at `lg` a rail of four is exactly one full row and a
 * rail of three is a row with a hole in it. Below that the band is dropped rather than rendered
 * sparse — a heading over two cards reads as a failed fetch, which is worse than no band.
 */
const MIN_RAIL = 4;
const RAIL_SIZE = 8;

export function FavorisPageClient({
  bestSellers,
  newProducts,
}: {
  bestSellers: Product[];
  newProducts: Product[];
}) {
  const { favoriteProducts, count, isLoaded } = useFavorites();
  const { clearFavorites } = useFavoritesActions();
  const { addToCart, setCartDrawerOpen } = useCartActions();
  const [similar, setSimilar] = useState<Product[]>([]);
  /** Set once we have asked a product for its aisle, so a wishlist of ten never fires ten times. */
  const aisleProbed = useRef(false);
  const [probedAisleId, setProbedAisleId] = useState<number | null>(null);

  const productsAsProduct: Product[] = useMemo(
    () =>
      favoriteProducts.map((p) => ({
        id: p.id,
        designation_fr: p.designation_fr,
        slug: p.slug ?? '',
        cover: p.cover,
        prix: p.prix ?? 0,
        promo: p.promo ?? undefined,
        // Carry the persisted promo expiry + stock so ProductCard behaves exactly as elsewhere:
        // without promo_expiration_date, isPromoActive treats an EXPIRED promo as active and shows
        // the promo price while checkout charges the real prix (a show-low/charge-full
        // discrepancy); without qte, getStockDisponible falls back to 1 and caps every favorite at
        // a single unit.
        promo_expiration_date: p.promo_expiration_date ?? undefined,
        qte: p.qte,
        rupture: p.rupture,
        sous_categorie_id: p.sous_categorie_id,
        brand_id: p.brand_id,
        publier: 1,
      })) as Product[],
    [favoriteProducts],
  );

  /**
   * The aisle to recommend from: whichever subcategory the shopper has hearted most.
   *
   * A wishlist of "whey, whey, creatine" should suggest whey. Ties break on the first-seen entry,
   * which is the oldest favourite — deliberately, so the rail does not swap around every time a
   * new heart is tapped.
   */
  const aisleId = useMemo(() => {
    const tally = new Map<number, number>();
    for (const p of favoriteProducts) {
      if (typeof p.sous_categorie_id === 'number' && p.sous_categorie_id > 0) {
        tally.set(p.sous_categorie_id, (tally.get(p.sous_categorie_id) ?? 0) + 1);
      }
    }
    let best: number | null = null;
    let bestN = 0;
    for (const [id, n] of tally) {
      if (n > bestN) {
        best = id;
        bestN = n;
      }
    }
    return best ?? probedAisleId;
  }, [favoriteProducts, probedAisleId]);

  /*
   * ── ONE REQUEST FOR THE FAVOURITES SAVED BEFORE THE AISLE WAS PERSISTED ──────────────────
   * `sous_categorie_id` is written into localStorage from today onward (see FavoriteProduct), so
   * a list saved last week has none of them and the "same rayon" rail would simply never appear
   * for the people who have used the feature longest.
   *
   * So: if nothing in the list knows its aisle, ask ONE product for its detail and use that. It is
   * a single request, fired once per page, only on the legacy path, and it stops costing anything
   * the moment the shopper hearts one new product. A loop over the whole list would have been the
   * obvious version of this and it is exactly the wrong trade — ten requests to decorate a band
   * that is not the reason anyone opened the page.
   */
  useEffect(() => {
    if (!isLoaded || aisleProbed.current) return;
    if (favoriteProducts.some((p) => typeof p.sous_categorie_id === 'number' && p.sous_categorie_id > 0)) return;
    const withSlug = favoriteProducts.find((p) => p.slug);
    if (!withSlug?.slug) return;
    aisleProbed.current = true;
    getProductDetails(withSlug.slug)
      .then((full) => {
        const id = (full as { sous_categorie_id?: number } | null)?.sous_categorie_id;
        if (typeof id === 'number' && id > 0) setProbedAisleId(id);
      })
      .catch(() => {
        /* A missing rail is not an error worth showing anyone. */
      });
  }, [isLoaded, favoriteProducts]);

  useEffect(() => {
    if (!aisleId) {
      setSimilar([]);
      return;
    }
    let cancelled = false;
    getSimilarProducts(aisleId)
      .then((res) => {
        if (cancelled) return;
        setSimilar(Array.isArray(res?.products) ? res.products : []);
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });
    return () => {
      cancelled = true;
    };
  }, [aisleId]);

  /**
   * Every suggestion band, deduplicated against the wishlist AND against each other.
   *
   * Both halves matter. A "you might also like" rail that offers a product already sitting in the
   * grid above it is the clearest possible signal that nothing is actually being computed; and
   * `best_sellers` and `new_product` overlap in this catalogue, so without the running `seen` set
   * the same tub appears twice on one screen under two different headings.
   */
  const rails = useMemo<Rail[]>(() => {
    const seen = new Set<number>(favoriteProducts.map((p) => p.id));
    const take = (rows: Product[]): Product[] => {
      const out: Product[] = [];
      for (const p of rows) {
        if (!p || typeof p.id !== 'number' || seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
        if (out.length === RAIL_SIZE) break;
      }
      return out;
    };

    const candidates: Rail[] = [
      {
        key: 'similar',
        kicker: 'Dans le même rayon',
        title: 'Vous aimerez aussi',
        subtitle: 'Des produits du rayon que vous consultez le plus dans vos favoris.',
        products: take(similar),
        viewAllHref: '/shop',
      },
      {
        key: 'best',
        kicker: 'Les plus vendus',
        title: 'Ce que les autres achètent',
        products: take(bestSellers),
        viewAllHref: '/shop?sort=best-sellers',
      },
      {
        key: 'new',
        kicker: 'Nouveautés',
        title: 'Derniers arrivages',
        products: take(newProducts),
        viewAllHref: '/shop?sort=newest',
      },
    ];

    return candidates.filter((r) => r.products.length >= MIN_RAIL);
  }, [similar, bestSellers, newProducts, favoriteProducts]);

  /**
   * ── "TOUT AJOUTER AU PANIER", AND WHAT IT REFUSES TO DO ─────────────────────────────────
   * A wishlist's whole point is that the decision has already been made, so the one action worth
   * putting on this page is turning the list into a basket.
   *
   * It adds only what is genuinely available. 11,130 of the 11,263 products in this catalogue are
   * `rupture=1, qte=0` — back-order items that the card renders as "Sur commande" with a *request*
   * button rather than an add-to-cart — so a naive "add everything" would silently drop most
   * wishlists into a basket that checkout then cannot fulfil. Skipped items stay in the list and
   * the toast says how many, rather than the count quietly disagreeing with the basket.
   */
  const addAllToCart = useCallback(() => {
    let added = 0;
    let skipped = 0;
    for (const product of productsAsProduct) {
      const stock = getProductStockStatus(product as never);
      const disponible = getStockDisponible(product as never);
      if (stock.isOutOfStock || disponible <= 0) {
        skipped += 1;
        continue;
      }
      const price = getPriceDisplay(product as never).finalPrice;
      // Same shape ProductCard builds — the cart stores a display price and a resolved image URL
      // alongside the raw row, so the drawer never has to re-derive either.
      const row = product as unknown as Record<string, unknown>;
      addToCart(
        {
          ...row,
          name: product.designation_fr,
          price,
          priceText: `${price} DT`,
          image: product.cover ? getStorageUrl(product.cover) : '',
        } as unknown as Product,
        1,
      );
      added += 1;
    }

    if (added === 0) {
      toast.error('Aucun de vos favoris n’est disponible immédiatement.');
      return;
    }
    toast.success(
      skipped > 0
        ? `${added} produit${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} — ${skipped} sur commande, non ajouté${skipped > 1 ? 's' : ''}.`
        : `${added} produit${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} au panier`,
    );
    setCartDrawerOpen(true);
  }, [productsAsProduct, addToCart, setCartDrawerOpen]);

  const onClear = useCallback(() => {
    clearFavorites();
    toast.success('Liste de favoris vidée');
  }, [clearFavorites]);

  const hasFavorites = isLoaded && count > 0;

  return (
    <>
      {/* ── 1. THE HEADER BAND ─────────────────────────────────────────────────────────────
          `first` because it sits against the site header and needs no seam of its own. */}
      <Section spacing="tight" width="wide" first>
        <PageHeader
          kicker="Ma sélection"
          title="Favoris"
          subtitle={
            !isLoaded
              ? undefined
              : count === 0
                ? 'Touchez le cœur sur un produit pour le garder ici — votre liste vous suit d’un appareil à l’autre sur ce navigateur.'
                : `${count} produit${count > 1 ? 's' : ''} mis de côté.`
          }
        >
          {hasFavorites && (
            /* Full width and stacked on a phone, content-width and inline from `sm`. The two
               actions are not equals: one builds a basket, the other destroys the list, so only
               one of them is filled and the destructive one never sits under a thumb by accident
               at the end of a row it did not expect. */
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={addAllToCart}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand px-5 font-display text-[14px] font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
                Tout ajouter au panier
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-rule px-5 text-[14px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand"
              >
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                Vider la liste
              </button>
            </div>
          )}
        </PageHeader>
      </Section>

      {/* ── 2. THE WISHLIST ITSELF ─────────────────────────────────────────────────────────── */}
      <Section spacing="default" surface="sunken" width="wide">
        {!isLoaded ? (
          <ProductGrid aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </ProductGrid>
        ) : count > 0 ? (
          <ProductGrid>
            {productsAsProduct.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        ) : (
          /* The empty state is a PLATE on the sunken band, not a second full-width surface — the
             band already carries the colour change, and a white box the width of the page would
             read as a third band with nothing in it. Everything below it still renders, so this
             is a message on a shop rather than the whole screen. */
          <div className="mx-auto max-w-xl rounded-2xl border border-hairline bg-elevated p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-hairline bg-sunken">
              <Heart className="h-7 w-7 text-brand" aria-hidden="true" />
            </div>
            <h2 className="font-display font-compressed text-xl font-extrabold uppercase tracking-tight text-ink-1">
              Votre liste est vide
            </h2>
            <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-ink-3">
              Le cœur sur une fiche produit ou sur une vignette met l’article de côté ici, avec son prix
              et sa disponibilité. En attendant, voici ce qui part le plus.
            </p>
            <LinkWithLoading
              href="/shop"
              loadingMessage="Chargement de la boutique..."
              className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand px-6 font-display text-[14px] font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover"
            >
              Découvrir la boutique
            </LinkWithLoading>
          </div>
        )}
      </Section>

      {/* ── 3. THE SUGGESTION RAILS ────────────────────────────────────────────────────────
          The band above is `sunken`, so the first rail must be `base` and they alternate from
          there — DESIGN_SYSTEM §3, rule 2: no two adjacent bands may share a surface, because the
          automatic 1px seam has nothing to separate when they do. Deriving it from the index is
          what keeps that true no matter which rails actually have enough products to render. */}
      {rails.map((rail, index) => (
        <ProductSection
          key={rail.key}
          id={`favoris-${rail.key}`}
          kicker={rail.kicker}
          title={rail.title}
          subtitle={rail.subtitle}
          products={rail.products}
          viewAllHref={rail.viewAllHref}
          surface={index % 2 === 0 ? 'base' : 'sunken'}
          spacing="default"
          /* Defer everything below the first rail: they are all off-screen at load on every
             viewport this site serves, and this page already renders a full grid above them. */
          defer={index > 0}
          last={index === rails.length - 1}
        />
      ))}
    </>
  );
}
