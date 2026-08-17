'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { useCart } from '@/app/contexts/CartContext';
import { ProductCard } from '@/app/components/ProductCard';
import { Button } from '@/app/components/ui/button';
import { ProductInfoSection } from '@/app/components/product/ProductInfoSection';
import { ProductIdentifiers } from '@/app/components/product/ProductIdentifiers';
import { ProductGallery } from '@/app/components/product/ProductGallery';
import { ProductLabelGrid } from '@/app/components/product/ProductLabelGrid';
import { ProductHighlights } from '@/app/components/product/ProductHighlights';
import { ProductComparisonTable } from '@/app/components/product/ProductComparisonTable';
import { FrequentlyBoughtTogether } from '@/app/components/product/FrequentlyBoughtTogether';
import { StarRating } from '@/app/components/product/StarRating';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Minus, Plus, ShoppingCart, Star, Shield, Heart, Share2, ZoomIn, CheckCircle2, XCircle, AlertTriangle, Loader2, Zap, X, ChevronLeft, ChevronRight, Sparkles, TrendingUp, Flame, Truck, CreditCard, Mail, BadgeCheck } from 'lucide-react';
import { useQuickOrder } from '@/contexts/QuickOrderContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { QuickOrderProduct } from '@/contexts/QuickOrderContext';
import type { Product, Review } from '@/types';
import { getStorageUrl, addReview, getProductDetails } from '@/services/api';
import { hasValidPromo } from '@/util/productPrice';
import { buildComparison } from '@/util/productComparison';
import { splitHighlights } from '@/util/productHighlights';
import { mergeProductContent } from '@/util/productDescriptionSections';
import { embedUrl, videoId, videoTitle } from '@/util/officialVideo';
import { sanitizeRichHtml } from '@/util/sanitizeRichHtml';
import { generateProductFallbackDescription } from '@/util/productDescriptionFallback';
import {
  hasProductSourceContent,
  productSourceAttribution,
  productSourceFactRows,
  productSourceGallery,
  productSourceNutritionHtml,
  productSourceSections,
  splitPackshotsFromLabels,
} from '@/util/productSourceFacts';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getStockDisponible,
  getMaxAddable,
  getProductStockStatus,
} from '@/util/cartStock';
import { cn } from '@/app/components/ui/utils';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';

export type BreadcrumbItem = { name: string; url: string };

interface ProductDetailClientProps {
  product: Product;
  similarProducts: Product[];
  /** When rendering under /shop/[slug], pass slug so refetch/links work */
  slugOverride?: string;
  /** Breadcrumb path (Accueil > Category > Product). BreadcrumbList schema is output by the server. */
  breadcrumbItems?: BreadcrumbItem[];
}


export function ProductDetailClient({ product: initialProduct, similarProducts, slugOverride, breadcrumbItems = [] }: ProductDetailClientProps) {
  const REVIEW_PAGE_SIZE = 12;
  // Same helper, same columns as CrawlerProductView — content parity is not optional here, because
  // middleware sends Googlebot to that view and a table only one of them can see is a discrepancy.
  const comparisonRows = buildComparison(initialProduct, similarProducts);
  const officialVideoId = videoId(initialProduct.official_video);
  const router = useRouter();
  const params = useParams();
  const productSlug = (slugOverride ?? (params?.slug as string) ?? (params?.id as string)) ?? '';
  const { addToCart, getCartQty } = useCart();
  const { isAuthenticated, user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const { isFavorite: isInFavorites, toggleFavorite } = useFavorites();
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [visibleReviewCount, setVisibleReviewCount] = useState(12);
  const { openQuickOrder } = useQuickOrder();
  /** Selected aroma for display; add to cart / command use this or first aroma. */
  const [selectedAromaId, setSelectedAromaId] = useState<number | null>(null);
  /** Nutrition image lightbox: index of the open image (-1 = closed) */
  const [nutritionLightbox, setNutritionLightbox] = useState<number>(-1);

  // Use state to manage product data so we can update it after adding a review
  const [product, setProduct] = useState<Product>(initialProduct);
  const favoriteProduct = {
    id: product.id,
    designation_fr: product.designation_fr,
    slug: product.slug,
    cover: product.cover,
    prix: product.prix,
    promo: product.promo ?? null,
    rupture: product.rupture,
  };
  // Backend already filters reviews by publier = 1 in the relationship, so use all reviews returned
  // The publier field is hidden in JSON response, so we can't filter on frontend
  const [reviews, setReviews] = useState<Review[]>(initialProduct.reviews || []);

  // Scroll to avis section when URL has #reviews (e.g. after opening shared link)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#reviews') {
      const el = document.getElementById('reviews');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Single source of truth for stock (matches API: rupture true/1 = out of stock, qte <= 0 = out of stock)
  const stockStatus = getProductStockStatus(product as any);
  const stockDisponible = getStockDisponible(product as any);
  const inCartQty = getCartQty(product.id);

  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.debug('[ProductDetail] stock', {
      qte: product.qte,
      rupture: product.rupture,
      low_stock_threshold: (product as any).low_stock_threshold,
      stockStatus,
    });
  }

  // Update product and reviews when initialProduct changes
  useEffect(() => {
    setProduct(initialProduct);
    // Backend's reviews() relationship already filters by publier = 1, so all returned reviews are published
    const productReviews = initialProduct.reviews || [];
    setReviews(productReviews);

    // Aroma: auto-select first (display only; add to cart / command use first or selected)
    const aromes = initialProduct.aromes;
    if (aromes && aromes.length > 0) {
      setSelectedAromaId(aromes[0].id);
    } else {
      setSelectedAromaId(null);
    }

  }, [initialProduct]);

  // Clamp quantity to 1..stockDisponible when stock changes
  useEffect(() => {
    setQuantity((q) => {
      const max = Math.max(1, stockDisponible);
      if (q < 1) return 1;
      if (stockDisponible <= 0) return 1;
      return Math.min(max, q);
    });
  }, [stockDisponible]);

  const basePrice = product.prix || 0;
  const hasPromo = hasValidPromo(product);
  const promoPrice = hasPromo && product.promo != null ? product.promo : null;
  const displayPrice = promoPrice ?? basePrice;
  const oldPrice = promoPrice ? basePrice : null;
  const discount = promoPrice != null && basePrice > 0 ? Math.round(((basePrice - promoPrice) / basePrice) * 100) : 0;
  const rating = product.note || (reviews.length > 0
    ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length
    : 0);
  const reviewCount = reviews.length;

  // Reviews rendered newest-first directly on the product page (no separate reviews page/controls)
  const sortedReviews = [...reviews].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });
  const reviewsToShowOnPage = sortedReviews.slice(0, visibleReviewCount);

  /** Filament stores product FAQ as JSON array `{ q, a }[]` on `faq`; exposed as-is from `GET /product_details/{slug}`. */
  const productFaqItems = useMemo(() => {
    const raw = (product as Product & { faq?: unknown }).faq;
    if (!raw) return [] as Array<{ id: number; q: string; a: string }>;
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .map((item: Record<string, unknown>, idx: number) => ({
        id: idx,
        q: String(item?.q ?? item?.question ?? '').trim(),
        a: String(item?.a ?? item?.answer ?? '').trim(),
      }))
      .filter((item) => item.q.length > 0 || item.a.length > 0);
  }, [product]);

  /*
   * ── THE DESCRIPTION, SPLIT IN TWO ──────────────────────────────────────────────────────────
   * `highlights` is the lead bullet list; `descriptionHtml` is the same description with that list
   * removed so the page never prints it twice. Nothing is written and nothing is dropped — see
   * util/productHighlights.ts, which also explains every case where it declines to split and hands
   * the description back untouched.
   *
   * Measured across 42 imported products in eight categories: 28 yield a panel.
   */
  const descriptionSource =
    product.description_fr || product.description_cover || generateProductFallbackDescription(product);
  const { highlights, rest: descriptionHtml } = useMemo(
    () => splitHighlights(descriptionSource),
    [descriptionSource]
  );

  /*
   * ── ONE COPY OF EACH BLOCK, NOT TWO ────────────────────────────────────────────────────────
   * Owner, 17/08/2026, with the reference storefront beside our page: *"the product page still the
   * same layout"*. He was right, and the reason was in the data rather than the CSS.
   *
   * On the product he screenshotted — NOW Foods Whey Protein Isolate, Creamy Vanilla, 816 g —
   * `description_fr` is 13,746 characters: the entire source page transcribed whole, with its own
   * headings for Aperçu, Spécifications, Poids de l'article, Usage suggéré, Autres ingrédients,
   * Avertissements and a legal notice, plus three tables. All of it inside ONE accordion, open by
   * default, under the word "Description".
   *
   * And two of those blocks were ALSO rendered as their own sections below it, because
   * `source_facts.content.sections` carries them separately — as were all three nutrition tables,
   * which Valeurs nutritionnelles already prints from `nutrition_html`. Roughly 4,500 characters of
   * exact repetition on a single page.
   *
   * `mergeProductContent` routes each block to exactly one place and drops the loser. Measured on
   * that product: the Description body goes 13,746 -> 2,588 characters and nothing is lost, because
   * everything it removed is rendered by a named section instead.
   */
  const merged = useMemo(
    () =>
      mergeProductContent({
        descriptionHtml,
        sourceSections: productSourceSections(product),
        // Valeurs nutritionnelles already has a panel to print, so the description's tables must
        // not become a second one.
        hasCanonicalNutrition:
          productSourceNutritionHtml(product) !== null ||
          (product.nutrition_values != null && String(product.nutrition_values).trim().length > 10),
      }),
    [descriptionHtml, product]
  );

  /*
   * ── THE STICKY BAR ONLY EXISTS WHEN THE REAL ONE IS GONE ───────────────────────────────────
   * With one render tree the CTAs are in the buy box at every width, which they never were on a
   * phone before — mobile had them ONLY in the sticky bar. Leaving that bar permanently up now
   * means two identical "Ajouter au panier" buttons on screen at the same time, one of them
   * covering the page.
   *
   * So the bar tracks the buy box: out of view, bar up; in view, bar down.
   *
   * It starts HIDDEN and the observer's first callback decides. It started visible, on the
   * reasoning that a phone opens with the buy box below the fold — but on a desktop the buy box is
   * in view at scroll 0, so that default meant the bar painted and then slid away. The measurement
   * caught it as a flapping result (visible at 1440, hidden at 1280, same viewport height, same
   * run); a human sees it as a flash. The observer reports within a frame either way, so the cost
   * of starting hidden is at most one frame on a phone, and the cost of starting visible was a
   * glitch on every desktop load.
   */
  const buyBoxRef = useRef<HTMLDivElement | null>(null);
  const [stickyBarVisible, setStickyBarVisible] = useState(false);

  /*
   * ── THIS PAGE OWNS THE BOTTOM OF A PHONE SCREEN ────────────────────────────────────────────
   * Measured on live production at 390px, the day the redesign shipped: the PWA install banner
   * occupied 707-788 and the sticky CTA occupied 711-788. Same band, same z-index (both
   * `z-sticky-cta`, both anchored `bottom-tabbar`), so which one a customer saw came down to DOM
   * order — and on a product page the answer was "Installer l'application" painted over "Ajouter
   * au panier".
   *
   * That is the single highest-intent control on the site, on 81% of its traffic, covered by a
   * prompt to install an app.
   *
   * The flag is one-way and mirrors what InstallAppBanner ALREADY does with `data-install-banner`
   * so the WhatsApp button can lift out of its way. No shared state, no import between the two,
   * and any future page with a bottom-anchored CTA gets the same protection by setting the same
   * attribute.
   *
   * `data-has-sticky-cta` on <body> and `data-sticky-cta` on the bar are deliberately DIFFERENT
   * names. They were the same for one revision, and `querySelector('[data-sticky-cta]')` then
   * matched <body> first and measured a 5,989px-tall "CTA bar". Two different questions — "does
   * this page have one" and "which element is it" — need two different attributes.
   */
  useEffect(() => {
    document.body.setAttribute('data-has-sticky-cta', '');
    return () => document.body.removeAttribute('data-has-sticky-cta');
  }, []);

  useEffect(() => {
    const node = buyBoxRef.current;
    // No observer, no way to know — so show it permanently. The primary CTA is the one thing on
    // this page that must never be the casualty of a missing browser API.
    if (!node || typeof IntersectionObserver === 'undefined') {
      setStickyBarVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setStickyBarVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const imageAltBase = (product.seo?.image_alt || product.alt_cover || product.designation_fr || 'Produit').trim();
  /*
   * ── THE IMPORTED PHOTOGRAPHY, WHICH THIS PAGE HELD AND NEVER SHOWED ─────────────────────────
   *
   * Owner, 16/08/2026: *"I accept to publish all the photos."*
   *
   * 6,437 products carry 23,293 photographs between them, and this page was rendering ONE. The
   * reason is visible in the line this replaces: the array was built from `product.cover` plus
   * `product.images` — a legacy column that is `null` on every imported product — so the source
   * gallery was simply never read. Measured on the live API for
   * `rainbow-light-gummy-vitamin-c-slices…`: `images: null`, and
   * `source_facts.content.gallery: 3 images`. Two of the three were being discarded.
   *
   * NOTHING ELSE HERE HAD TO CHANGE, and that is the point. The thumbnail strip, the swipe
   * handlers, the selected-index clamp and the keyboard controls below were all written for a
   * multi-image gallery and have been running against an array of length 1 since they shipped.
   * `galleryImages.length > 1` guards the strip, so it has never once rendered.
   *
   * COVER FIRST, ALWAYS. It is the photograph the shop chose, and on an imported product it is
   * also `gallery[0]` — which is exactly why the `Set` is load-bearing rather than defensive:
   * without it the primary image would appear twice in the strip.
   *
   * The crawler route (`CrawlerProductView`) has rendered this same gallery all along, so until
   * now Googlebot could see every photograph and a customer could not.
   */
  const galleryImagePaths = useMemo(() => {
    const extra = Array.isArray((product as any).images) ? (product as any).images : [];
    const sourceGallery = productSourceGallery(product as Parameters<typeof productSourceGallery>[0]);
    const paths = [product.cover, ...extra, ...sourceGallery]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    return [...new Set(paths)];
  }, [product]);
  const galleryImages = useMemo(() => {
    return galleryImagePaths
      .map((path) => getStorageUrl(path))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
  }, [galleryImagePaths]);
  /*
   * ── PACKSHOTS IN THE CAROUSEL, LABEL SHOTS IN A GRID ──────────────────────────────────────
   * Owner, 17/08/2026: *"always the first 2 are the front and the back of the products and the rest
   * are instructions … I want the instructions to be shown in the page as a grid of images."*
   *
   * On the product he screenshotted, eight photographs were stacked as eight thumbnails under the
   * main image — so the Supplement Facts panel and the directions, shot close enough to read, were
   * filed as if they were alternate angles of the tub. Six swipes deep, on the most trustworthy
   * content on the page: the manufacturer's own printed words rather than our transcription of
   * them. See splitPackshotsFromLabels for why the rule only applies above two.
   */
  const { packshots, labels: labelImages } = useMemo(
    () => splitPackshotsFromLabels(galleryImages),
    [galleryImages]
  );

  /*
   * The cover, for the CART and the quick-order sheet — not for the gallery.
   *
   * `ProductGallery` owns which photograph is on screen, so this is deliberately index 0 rather
   * than "whatever the customer last tapped": a basket line and an order confirmation should show
   * the product's canonical photograph, not the third angle someone happened to leave open.
   */
  const productImage = galleryImages[0] || '';

  useEffect(() => {
    setVisibleReviewCount(REVIEW_PAGE_SIZE);
  }, [reviews.length, REVIEW_PAGE_SIZE]);

  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    
    // Decode HTML entities (including French characters)
    let decoded = html
      // French characters
      .replace(/&eacute;/g, 'é')
      .replace(/&Eacute;/g, 'É')
      .replace(/&egrave;/g, 'è')
      .replace(/&Egrave;/g, 'È')
      .replace(/&ecirc;/g, 'ê')
      .replace(/&Ecirc;/g, 'Ê')
      .replace(/&agrave;/g, 'à')
      .replace(/&Agrave;/g, 'À')
      .replace(/&acirc;/g, 'â')
      .replace(/&Acirc;/g, 'Â')
      .replace(/&icirc;/g, 'î')
      .replace(/&Icirc;/g, 'Î')
      .replace(/&ocirc;/g, 'ô')
      .replace(/&Ocirc;/g, 'Ô')
      .replace(/&ucirc;/g, 'û')
      .replace(/&Ucirc;/g, 'Û')
      .replace(/&uuml;/g, 'ü')
      .replace(/&Uuml;/g, 'Ü')
      .replace(/&ccedil;/g, 'ç')
      .replace(/&Ccedil;/g, 'Ç')
    // Quotes and apostrophes
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
      // Common entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Numeric entities (common ones)
      .replace(/&#233;/g, 'é')
      .replace(/&#232;/g, 'è')
      .replace(/&#234;/g, 'ê')
      .replace(/&#224;/g, 'à')
      .replace(/&#226;/g, 'â')
      .replace(/&#238;/g, 'î')
      .replace(/&#244;/g, 'ô')
      .replace(/&#251;/g, 'û')
      .replace(/&#231;/g, 'ç');
    
    // Decode numeric entities using browser API if available (client-side only)
    if (typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = decoded;
        decoded = textarea.value;
      } catch (e) {
        // Keep the manually decoded version if browser API fails
      }
    }
    
    // Remove HTML tags
    const withoutTags = decoded.replace(/<[^>]*>/g, '');
    
    // Clean up whitespace
    return withoutTags
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Get meta description for display (strip HTML if needed)
  const metaDescription = product.meta_description_fr 
    ? stripHtml(product.meta_description_fr)
    : product.description_cover 
    ? stripHtml(product.description_cover)
    : null;

  const quickOrderProduct: QuickOrderProduct = {
    id: product.id,
    designation_fr: product.designation_fr ?? '',
    slug: product.slug,
    cover: product.cover,
    prix: product.prix ?? 0,
    promo: product.promo ?? undefined,
    promo_expiration_date: product.promo_expiration_date ?? undefined,
    rupture: product.rupture,
    aromes: product.aromes,
  };

  /** Effective aroma for cart/quick order: selected or first (never block add/command). */
  const effectiveAromaId = selectedAromaId ?? product.aromes?.[0]?.id;

  /** Cart logic. "Commander maintenant" uses shared Quick Order modal. */
  const handleAddToCart = () => {
    if (stockStatus.isOutOfStock || stockDisponible <= 0) {
      toast.error('Rupture de stock - Ce produit n\'est pas disponible');
      return;
    }
    const requestedTotal = inCartQty + quantity;
    if (requestedTotal > stockDisponible) {
      const restant = getMaxAddable(stockDisponible, inCartQty);
      toast.error(
        `Stock insuffisant. Il reste ${restant} unité${restant !== 1 ? 's' : ''}.`
      );
      if (restant > 0) setQuantity(restant);
      return;
    }

    const selectedAroma = product.aromes?.find(a => a.id === effectiveAromaId);
    const cartProduct = {
      ...product,
      name: product.designation_fr,
      price: displayPrice,
      priceText: `${displayPrice} DT`,
      image: productImage,
      ...(selectedAroma && { selectedAroma: { id: selectedAroma.id, designation_fr: selectedAroma.designation_fr } }),
    };
    addToCart(cartProduct as any, quantity);
    toast.success('Produit ajouté au panier');
  };

  /*
   * Add several products in one press, for "Complétez votre commande".
   *
   * Deliberately NOT a loop over `handleAddToCart`: that one is about THIS product and carries its
   * quantity, its selected flavour and its stock guard. A companion is added as one unit of itself,
   * and the only shared requirement is that the cart line looks the same however it was created —
   * hence the same field mapping rather than the same function.
   */
  const handleAddManyToCart = (chosen: Product[]) => {
    const added = chosen.filter((entry) => getStockDisponible(entry as any) > 0);
    if (added.length === 0) {
      toast.error('Ces produits ne sont plus disponibles');
      return;
    }
    added.forEach((entry) => {
      const price = hasValidPromo(entry) && entry.promo != null ? entry.promo : entry.prix || 0;
      addToCart(
        {
          ...entry,
          name: entry.designation_fr,
          price,
          priceText: `${price} DT`,
          image: getStorageUrl(entry.cover || ''),
        } as any,
        1
      );
    });
    toast.success(`${added.length} produits ajoutés au panier`);
  };

  const handleQuickOrderClick = () => {
    openQuickOrder(quickOrderProduct, { initialQty: quantity, initialVariantId: effectiveAromaId ?? undefined });
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour laisser un avis');
      router.push('/login');
      return;
    }

    if (reviewStars === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }

    setIsSubmittingReview(true);

    try {
      // Submit review to backend
      const newReview = await addReview({
        product_id: product.id,
        stars: reviewStars,
        comment: reviewComment,
      });

      // Backend logic: reviews with stars >= 4 are automatically published (publier = 1)
      // Reviews with stars < 4 are not published (publier = 0) and need moderation
      const isPublished = reviewStars >= 4;

      // Reset form immediately for better UX
      setReviewStars(0);
      setReviewComment('');
      setShowReviewForm(false);

      if (isPublished) {
        // Optimistically add the review to UI immediately (will be replaced by server data)
        if (user) {
          const optimisticReview: Review = {
            id: Date.now(), // Temporary ID
            stars: reviewStars,
            comment: reviewComment || undefined,
            publier: 1,
            created_at: new Date().toISOString(),
            user: {
              id: user.id,
              name: user.name || 'Vous',
              avatar: user.avatar,
            },
          };
          setReviews(prev => [...prev, optimisticReview]);
        }

        // For published reviews, refetch product data to get the complete review with user info
        // Add a small delay to ensure backend transaction is committed
        setTimeout(async () => {
          try {
            // Use the slug from URL params for reliable refetching
            const slugToUse = productSlug || product.slug || product.id.toString();

            // Refetch with cache busting to ensure fresh data
            const updatedProduct = await getProductDetails(slugToUse, true);

            // Update product state with fresh data from backend
            setProduct(updatedProduct);

            // Backend's reviews() relationship already filters by publier = 1
            const publishedReviews = updatedProduct.reviews || [];
            setReviews(publishedReviews);

            const newReviewCount = publishedReviews.length;
            const oldReviewCount = reviews.length;

            if (newReviewCount > oldReviewCount) {
              toast.success(`Avis publié avec succès ! (${newReviewCount} avis)`);
            } else if (newReviewCount === oldReviewCount && newReviewCount > 0) {
              // Review count stayed same but we have reviews - might be a timing issue
              toast.success('Avis ajouté avec succès !');
              // Force a full page refresh to ensure consistency
              setTimeout(() => {
                router.refresh();
              }, 1000);
            } else {
              toast.success('Avis ajouté avec succès !');
              // If count didn't increase, force a full page refresh
              router.refresh();
            }
          } catch (fetchError: any) {
            console.error('Error refetching product:', fetchError);
            // If refetch fails, use router.refresh() as fallback to reload server component
            toast.success('Avis ajouté avec succès !');
            setTimeout(() => {
              router.refresh();
            }, 1000);
          }
        }, 1000); // Wait 1 second for backend to commit transaction and propagate
      } else {
        // Review not published (stars < 4) - will be moderated
        toast.success('Avis ajouté avec succès ! Il sera publié après modération.');
        // Still refresh to ensure UI is in sync
        setTimeout(() => {
          router.refresh();
        }, 500);
      }

    } catch (error: any) {
      console.error('Error adding review:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'ajout de l\'avis';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleShare = () => {
    const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname + window.location.search : '';
    const shareUrl = base.replace(/#.*$/, '') + '#reviews';
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: product.designation_fr,
        text: product.description_fr || '',
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl).then(() => {
        toast.success('Lien copié (vers la section Avis)');
      }).catch(() => {
        toast.error('Impossible de copier le lien');
      });
    }
  };

  return (
    <div className="min-h-screen bg-canvas">

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-3 sm:py-6 lg:pt-8 lg:pb-12 pb-36 sm:pb-36">
        {/* Breadcrumb — single scrollable line on mobile (was flex-wrap → 2–3 tall rows); the long
            final crumb truncates on phones and the row swipes horizontally instead of eating height. */}
        {breadcrumbItems.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="mb-3 sm:mb-4 text-xs sm:text-sm text-ink-3">
            <ol className="flex flex-nowrap items-center gap-x-1.5 overflow-x-auto scrollbar-hide">
              {breadcrumbItems.map((item, i) => (
                <li key={i} className="flex shrink-0 items-center gap-x-1.5">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-3 shrink-0" aria-hidden />}
                  {i < breadcrumbItems.length - 1 ? (
                    <Link href={item.url} className="whitespace-nowrap hover:text-red-600 dark:hover:text-red-400 underline-offset-2 hover:underline">
                      {item.name}
                    </Link>
                  ) : (
                    <span className="max-w-[46vw] truncate whitespace-nowrap font-medium text-ink-1 sm:max-w-none" aria-current="page">{item.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {/*
          ── ONE HERO, NOT TWO ───────────────────────────────────────────────────────────────
          This grid used to contain a complete `hidden lg:block` tree and a complete `lg:hidden`
          tree: two galleries, two title elements, two rating rows, two price blocks, two of every
          badge. ~580 lines to render one product.

          It was not a stylistic choice, it was accumulated cost, and it had already produced real
          defects. The rating row was corrected on desktop and missed on mobile, so phones showed
          "(0) · 0 avis" for weeks. Each gallery carried a hand-written `1px` entry in its `sizes`
          string purely to stop the browser preloading the OTHER breakpoint's hidden image at
          fetchPriority=high — a workaround for a problem that only existed because there were two.
          And `<ProductIdentifiers>` had to be called twice, four days ago, for the same reason.

          One tree. The layout difference between a phone and a desktop is a grid change, which is
          what CSS grid is for. Every fix from here lands on both by construction.

          ── THE PROPORTIONS ────────────────────────────────────────────────────────────────
          Gallery 7 of 12, up from 5. The owner's first complaint was that the photographs are too
          small to read the pack labels; a buy column narrower than the product it is selling is
          also simply the better-known proportion for a shop.
        */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:gap-6 lg:mb-12 lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-12">

          {/* ── A) GALLERY ─────────────────────────────────────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-7">
            <ProductGallery
              images={packshots}
              altBase={imageAltBase}
              imageTitle={product.description_cover || product.designation_fr || 'Produit'}
              overlayTopLeft={
                <>
                  {discount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 font-display text-xs font-bold uppercase tracking-wide tabular-nums text-on-brand">
                      <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      -{discount}%
                    </span>
                  )}
                  {product.new_product === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-elevated px-2.5 py-1 font-display text-xs font-semibold uppercase tracking-wide text-ink-1">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                      Nouveau
                    </span>
                  )}
                  {product.best_seller === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-elevated px-2.5 py-1 font-display text-xs font-semibold uppercase tracking-wide text-ink-1">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                      Top vendu
                    </span>
                  )}
                </>
              }
              overlayTopRight={
                <>
                  {/*
                    Favourite and share sit ON the frame rather than in a row above it. That row
                    cost a full line of vertical space above the fold on a phone and contained
                    nothing anybody came for; the gallery has corners going spare.
                    h-11: the 44px tap floor, on controls small enough to want checking.
                  */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(favoriteProduct)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-elevated text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    aria-label={isInFavorites(product.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    aria-pressed={isInFavorites(product.id)}
                  >
                    <Heart className={cn('h-5 w-5', isInFavorites(product.id) && 'fill-brand text-brand')} />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-elevated text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    aria-label="Partager ce produit"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </>
              }
            />

            {/*
              ── THE INFORMATION SECTIONS LIVE HERE NOW, NOT FULL-WIDTH BELOW ────────────────
              This is the reference storefront's structure and it is better for a reason that is
              easy to measure: the buy column is roughly 700px tall and the page is several
              thousand. Putting the accordions full-width under BOTH columns left a column-width
              of empty canvas beside the buy box on every desktop screen, and pushed the first
              line of product information below the fold on a laptop.

              Under the gallery they start about 700px higher, they are the width of the gallery
              rather than the width of the page — so a line of body text is ~75 characters instead
              of ~150, which is the difference between prose and a spreadsheet — and the buy box
              stays beside them while they are read.

              Below `lg` the grid collapses to one column and this is simply the next thing after
              the gallery, which is where it already was.
            */}
            <div className="mt-8 lg:mt-10">
            {(() => {
              const hasNutritionContent = product.nutrition_values != null &&
                String(product.nutrition_values).trim() !== '' &&
                String(product.nutrition_values).trim() !== '<p></p>' &&
                String(product.nutrition_values).trim() !== '<p><br></p>';
              const hasLegacyQuestionsHtml =
                product.questions != null &&
                String(product.questions).trim() !== '' &&
                String(product.questions).trim() !== '<p></p>' &&
                String(product.questions).trim() !== '<p><br></p>';
              const hasProductFaq = productFaqItems.length > 0;
              const hasQuestionsTab = hasLegacyQuestionsHtml || hasProductFaq;

              return (
                /*
                 * ── SEVEN NAMED SECTIONS, NOT TWO TABS ────────────────────────────────────
                 *
                 * Owner, 16/08/2026, holding a reference storefront beside this page: *"a lot of
                 * informations in description that being showed wrong … user can see ingredients
                 * clearly, description clearly and any labels clearly."*
                 *
                 * There were TWO tabs. "Description" carried the marketing overview, the packaging
                 * specs, the directions, the other-ingredients list and the warnings — five
                 * different kinds of information stacked in one scrolling column with <h3>s as the
                 * only separation. A customer asking "how do I take this" read a marketing
                 * paragraph first; a customer checking an allergen hunted for a list below both.
                 *
                 * The data was always structured — `productSourceSections` returns keyed blocks
                 * (overview, suggested_use, other_ingredients, warnings) and has since the import
                 * shipped. Only the presentation flattened them back into prose. Each block is now
                 * its own labelled, collapsible section, in the order the reference uses.
                 *
                 * TABS ARE GONE RATHER THAN RESTYLED, and that is a correctness change as much as
                 * a design one: an inactive Radix tab is ABSENT from the DOM. That cost this page a
                 * live structured-data violation one day ago — FAQPage markup emitted for questions
                 * that were not in the HTML. `ProductInfoSection` is a native <details>, so its
                 * content is in the document whether it is open or shut.
                 */
                <div className="w-full divide-y divide-hairline rounded-2xl border border-hairline bg-elevated px-4 shadow-sm sm:px-6">

                  <ProductInfoSection id="pdp-description" title={product.zone1 || 'Description'} defaultOpen>
                    <div>
                    {/*
                      Transcribed specifications — the format printed on the packaging and the
                      flavour variant, for products imported from the external catalogue.

                      Rendered from the SAME function as /x-crawler/product/[slug], which is the
                      only view Googlebot is served: a fact shown here and missing there is
                      invisible to Google, and a fact shown there and missing here is cloaking.
                      Placed above the description because it is above the description on that route
                      too — parity is about the content, and keeping the order the same is what
                      makes it checkable by reading the two files.

                      It renders NOTHING when product.source_facts is null, which is the permanent
                      state of all 309 hand-made products: no wrapper, no heading, no empty row, so
                      their description tab is byte-identical to what it was.
                    */}
                    {(() => {
                      const sourceFacts = productSourceFactRows(product);
                      if (sourceFacts.length === 0) return null;
                      return (
                        <dl className="mb-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
                          {sourceFacts.map((row) => (
                            <div key={row.key} className="contents">
                              <dt className="font-medium text-ink-1">{row.label}</dt>
                              <dd className="text-ink-2">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      );
                    })()}
                    <div
                      className={`text-base text-ink-2 leading-relaxed prose prose-neutral prose-base max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:dark:text-white prose-p:text-gray-600 prose-p:dark:text-ink-3 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:dark:text-white prose-img:rounded-lg prose-img:shadow-md overflow-hidden transition-[max-height] duration-300 ${descExpanded ? 'max-h-[5000px]' : 'max-h-60'}`}
                      // Sanitised, not raw. These CMS fields carry their own <h1> tags, which rendered as extra
                      // top-level headings on the page whose only h1 should be the product name —
                      // up to thirteen on one product. sanitizeProductHtml demotes them to <h2>.
                      // The crawler view already ran this; the page a customer sees did not.
                      // `merged.body`, not `description_fr`. Two things have been taken out of it and
                      // put somewhere better rather than removed: the lead bullet list is the
                      // benefits panel in the hero (util/productHighlights.ts), and every block with
                      // a named slot is its own section below (util/productDescriptionSections.ts).
                      // What is left is what "Description" should have meant all along — what the
                      // product is, what is in the pack, what it weighs.
                      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(merged.body) }}
                    />
                    <button
                      type="button"
                      onClick={() => setDescExpanded(!descExpanded)}
                      // min-h-[44px] and a negative inline margin: the label was a 57x20 hit area,
                      // and this is the control that reveals the rest of the description.
                      className="-mx-2 mt-2 inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-brand hover:underline"
                    >
                      {descExpanded ? 'Voir moins' : 'Lire plus'}
                    </button>
                    {/*
                      The transcribed source page — the manufacturer's suggested use, ingredient list
                      and warnings, then the photographs the source page listed, then one sentence
                      about where all of it came from.

                      Same blocks, same headings, same order as /x-crawler/product/[slug], from the
                      same functions. That route is the only one Googlebot is served: a block here
                      and not there is invisible to Google, and a block there and not here is
                      cloaking. Keeping the order identical is what makes the parity checkable by
                      reading the two files side by side.

                      The manufacturer's OVERVIEW is deliberately not among them — promotion folded
                      it into `description_fr`, which is the block rendered immediately above.

                      Every one of these is empty for all 309 hand-made products (no staging row, so
                      `source_facts.content` is null), which is why the whole thing is an IIFE that
                      returns null rather than a wrapper with nothing in it: their description tab
                      renders exactly what it rendered before.
                    */}
                    {/*
                      The provenance sentence stays with the description, because it is a statement
                      about where THESE words came from. The blocks it used to introduce are now
                      siblings of this section rather than children of it — see below.
                    */}
                    {/*
                      The source site's accuracy notice. It arrives as a 2,510-character block under
                      its own heading, which put a legal disclaimer at the same visual weight as the
                      ingredient list — and, because it was the LAST heading on the page, the three
                      nutrition tables ended up inside it.

                      It is kept rather than dropped: it is the sentence that tells a customer the
                      printed label governs if it disagrees with this page, which on an imported
                      catalogue is the one piece of legal text that actually matters. It is just no
                      longer shouted.
                    */}
                    {merged.disclaimer && (
                      <details className="mt-4 border-t border-hairline pt-3 text-xs text-ink-3">
                        <summary className="cursor-pointer list-none font-medium hover:text-brand">
                          Clause de non-responsabilité
                        </summary>
                        <div
                          className="prose prose-neutral mt-2 max-w-none text-xs leading-relaxed text-ink-3 prose-p:text-ink-3"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(merged.disclaimer) }}
                        />
                      </details>
                    )}
                    {hasProductSourceContent(product) && productSourceAttribution(product) && (
                      <p className="mt-4 border-t border-hairline pt-3 text-xs text-ink-3">
                        {productSourceAttribution(product)}
                      </p>
                    )}
                    </div>
                  </ProductInfoSection>

                  {/*
                    ── EACH TRANSCRIBED BLOCK IS ITS OWN SECTION NOW ─────────────────────────────
                    `productSourceSections` has always returned KEYED blocks — suggested_use,
                    other_ingredients, warnings — and this page flattened them back into one column
                    of <h3>s inside Description. That is the "informations showed wrong" the owner
                    pointed at: five kinds of information behind one label.

                    ORDER IS DELIBERATE and matches both the reference storefront and
                    /x-crawler/product/[slug]: directions, then ingredients, then warnings. Parity
                    with the crawler route is not cosmetic — a block shown here and missing there is
                    invisible to Google, and a block there and missing here is cloaking. The order
                    staying identical is what keeps that checkable by reading the two files.

                    SOURCE OF EACH BLOCK: `source_facts.content.sections` when the backend
                    transcribed it, otherwise the matching heading inside `description_fr`. Never
                    both — see mergeProductContent. That is what stopped this product printing its
                    ingredient list and its warnings twice.

                    Nothing renders for a product with neither, which is the permanent state of all
                    309 hand-made ones: no empty section, no bare heading.
                  */}
                  {merged.sections.map((section) => {
                    const html = sanitizeRichHtml(section.html);
                    if (!html) return null;
                    return (
                      <ProductInfoSection
                        key={section.key}
                        id={`pdp-${section.key}`}
                        title={section.heading}
                      >
                        <div
                          className="prose prose-neutral prose-base max-w-none text-base leading-relaxed text-ink-2 prose-p:text-gray-600 prose-p:dark:text-ink-3 prose-strong:text-gray-900 prose-strong:dark:text-white"
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      </ProductInfoSection>
                    );
                  })}

                  {/* ── `forceMount`, AND THE STYLING ALREADY ASSUMED IT ─────────────────────
                      Radix renders `present && children`, so without this prop an INACTIVE tab is
                      not in the DOM at all. This panel holds the transcribed Supplement Facts —
                      18,965 rows carry one — and the questions panel below holds the FAQ.

                      Two consequences, and the second is the serious one:
                        · the richest content on the page was absent from the server-rendered HTML
                          of the canonical human URL until a human clicked a tab
                        · FAQPage JSON-LD is emitted UNCONDITIONALLY at
                          app/(shop)/[slug]/[productSlug]/page.tsx:338, so the markup asserted
                          questions and answers that were not on the page. Google's FAQPage rules
                          require the content to be present; markup describing invisible content is
                          the exact shape of a structured-data violation.

                      The `data-[state=inactive]:hidden` classes on this element were already
                      written for mounted-but-hidden content and could never fire without the prop —
                      the styling anticipated the fix and the prop was missing. */}
                  {/* `forceMount` is no longer needed and no longer possible: <details> keeps its
                      content in the DOM by construction, which is the property that fix was buying. */}
                  <ProductInfoSection id="pdp-nutrition" title={product.zone3 || 'Valeurs nutritionnelles'}>
                    {(() => {
                      const nutritionImages = Array.isArray((product as any).nutrition_images)
                        ? ((product as any).nutrition_images as string[]).filter(Boolean)
                        : [];
                      const hasNutritionImages = nutritionImages.length > 0;
                      /*
                       * The transcribed Supplement Facts panel.
                       *
                       * Sanitised here rather than at the point of use so the empty-state test below
                       * asks about the string that will actually render: a panel that sanitises down
                       * to nothing must count as no panel, or the tab would suppress its "not
                       * available" message and then render nothing at all.
                       *
                       * Null for every product with no staging row — all 309 legacy products — so
                       * this whole tab is unchanged for them. The provenance sentence is rendered
                       * once per page, by the description tab, and is deliberately not read here.
                       */
                      /*
                       * `|| merged.nutritionFallback` is the last resort, and it can only ever fire
                       * when there IS no canonical panel — mergeProductContent returns an empty
                       * string otherwise, precisely so this can never become a second copy of the
                       * panel above.
                       *
                       * It matters because the tables trail the last heading of a transcribed page,
                       * so on a product with no `nutrition_html` they were sitting inside whatever
                       * block happened to be last. On the screenshotted product that was the legal
                       * disclaimer.
                       */
                      const sourceNutritionHtml = sanitizeRichHtml(
                        productSourceNutritionHtml(product) || merged.nutritionFallback || ''
                      );
                      return (
                        <div className="p-3 sm:p-5 lg:p-6 pt-4 sm:pt-6 border-t border-hairline">
                          <h2 className="font-display uppercase tracking-tight text-lg sm:text-xl font-bold mb-4 text-ink-1">
                            {product.zone3 || 'Valeurs Nutritionnelles'}
                          </h2>

                          {/* Nutrition Images Gallery */}
                          {hasNutritionImages && (
                            <div className="mb-6">
                              {nutritionImages.length === 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setNutritionLightbox(0)}
                                  className="relative group block w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-hairline shadow-sm hover:shadow-md transition-shadow duration-200 cursor-zoom-in"
                                  aria-label="Agrandir l'image nutritionnelle"
                                >
                                  <Image
                                    src={getStorageUrl(nutritionImages[0])}
                                    alt={`${product.designation_fr || 'Produit'} — valeurs nutritionnelles`}
                                    width={600}
                                    height={400}
                                    className="w-full h-auto object-contain"
                                    quality={90}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" size={32} />
                                  </div>
                                </button>
                              ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {nutritionImages.map((imgPath, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setNutritionLightbox(idx)}
                                      className="relative group aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-zoom-in bg-gray-50 dark:bg-gray-800"
                                      aria-label={`Image nutritionnelle ${idx + 1}`}
                                    >
                                      <Image
                                        src={getStorageUrl(imgPath)}
                                        alt={`${product.designation_fr || 'Produit'} — valeurs nutritionnelles ${idx + 1}`}
                                        fill
                                        sizes="(max-width: 640px) 50vw, 33vw"
                                        className="object-contain p-1"
                                        quality={90}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                                        <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" size={20} />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Nutrition Text Content */}
                          {hasNutritionContent ? (
                            <div className="w-full min-w-0 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                              <div
                                className="nutrition-content text-sm sm:text-base text-ink-2 leading-relaxed prose prose-neutral prose-sm sm:prose-base max-w-none prose-p:leading-relaxed prose-p:my-1 sm:prose-p:my-2 prose-img:rounded-lg prose-img:shadow-md prose-img:max-w-full prose-img:h-auto prose-table:text-left prose-th:py-2 prose-th:px-2 sm:prose-th:px-3 prose-td:py-2 prose-td:px-2 sm:prose-td:px-3 prose-table:w-full min-w-[280px]"
                                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.nutrition_values || '') }}
                              />
                            </div>
                          ) : null}

                          {/*
                            The Supplement Facts panel transcribed from the source product page.

                            Rendered AFTER `nutrition_values`, which is the column an admin fills in
                            by hand from the physical label of the lot we hold: a panel read off that
                            label is evidence about the product in our warehouse, and this one is a
                            transcription of a retailer's rendering of the manufacturer's panel. In
                            practice they never both exist — promotion writes no `nutrition_values`,
                            and no legacy product has a staging row.

                            Same panel, same position relative to `nutrition_values`, as
                            /x-crawler/product/[slug]. Null for all 309 legacy products, so their
                            nutrition tab is unchanged.
                          */}
                          {sourceNutritionHtml && (
                            <div className="w-full min-w-0 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                              <div
                                className="nutrition-content text-sm sm:text-base text-ink-2 leading-relaxed prose prose-neutral prose-sm sm:prose-base max-w-none prose-p:leading-relaxed prose-p:my-1 sm:prose-p:my-2 prose-table:text-left prose-th:py-2 prose-th:px-2 sm:prose-th:px-3 prose-td:py-2 prose-td:px-2 sm:prose-td:px-3 prose-table:w-full min-w-[280px]"
                                dangerouslySetInnerHTML={{ __html: sourceNutritionHtml }}
                              />
                              {/*
                                The provenance sentence is NOT repeated here.

                                It used to render in both places, so the ordinary supplement — prose
                                sections AND a Supplement Facts panel, which is what the fixtures
                                produce — printed "Informations transcrites de la fiche d'origine du
                                fabricant…" twice on one page while /x-crawler/product/[slug] printed
                                it once. One page, one sentence, wherever the transcribed content
                                starts: the description tab block above renders it, and it opens
                                whenever this row publishes anything at all.
                              */}
                            </div>
                          )}

                          {/*
                            "Not available" now has to account for the transcribed panel as well —
                            otherwise a product that ships a full Supplement Facts table would print
                            a sentence, directly above it, saying it has none.
                          */}
                          {!hasNutritionContent && !hasNutritionImages && !sourceNutritionHtml && (
                            <div className="text-center py-6 sm:py-8">
                              <p className="text-ink-3 text-sm sm:text-base">
                                Les valeurs nutritionnelles ne sont pas disponibles pour ce produit.
                              </p>
                            </div>
                          )}

                          {/* Lightbox */}
                          {nutritionLightbox >= 0 && (
                            <div
                              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                              onClick={() => setNutritionLightbox(-1)}
                              role="dialog"
                              aria-modal="true"
                              aria-label="Visionneuse d'image nutritionnelle"
                            >
                              <button
                                type="button"
                                onClick={() => setNutritionLightbox(-1)}
                                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
                                aria-label="Fermer"
                              >
                                <X size={22} />
                              </button>

                              {nutritionImages.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setNutritionLightbox((nutritionLightbox - 1 + nutritionImages.length) % nutritionImages.length); }}
                                    className="absolute left-3 sm:left-6 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
                                    aria-label="Image précédente"
                                  >
                                    <ChevronLeft size={26} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setNutritionLightbox((nutritionLightbox + 1) % nutritionImages.length); }}
                                    className="absolute right-3 sm:right-6 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
                                    aria-label="Image suivante"
                                  >
                                    <ChevronRight size={26} />
                                  </button>
                                </>
                              )}

                              <div
                                className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Image
                                  src={getStorageUrl(nutritionImages[nutritionLightbox] ?? '')}
                                  alt={`${product.designation_fr || 'Produit'} — valeurs nutritionnelles ${nutritionLightbox + 1}`}
                                  width={900}
                                  height={700}
                                  className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                                  quality={90}
                                />
                                {nutritionImages.length > 1 && (
                                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/70 text-xs bg-black/40 px-2 py-0.5 rounded-full">
                                    {nutritionLightbox + 1} / {nutritionImages.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </ProductInfoSection>

                  <ProductInfoSection id="pdp-questions" title={product.zone4 || 'Questions fréquentes'}>
                    <div className="p-4 sm:p-5 lg:p-6 pt-5 sm:pt-6 border-t border-hairline">
                    <h2 className="font-display uppercase tracking-tight text-xl sm:text-2xl font-bold mb-3 text-ink-1">
                      {product.zone4 || 'Questions Fréquentes'}
                    </h2>
                    {hasProductFaq ? (
                      <div className="space-y-5">
                        {productFaqItems.map((item) => (
                          <div
                            key={item.id}
                            className="border-b border-hairline pb-5 last:border-0 last:pb-0"
                          >
                            <h4 className="font-semibold text-ink-1 mb-2 flex items-start gap-2">
                              <span className="text-brand shrink-0">Q.</span>
                              <span>{item.q || '—'}</span>
                            </h4>
                            <div className="pl-6 text-sm sm:text-base text-ink-2 leading-relaxed whitespace-pre-wrap">
                              {item.a}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : hasLegacyQuestionsHtml ? (
                      <div
                        className="text-base text-ink-2 leading-relaxed prose prose-neutral prose-base max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:dark:text-white prose-headings:mb-2 prose-headings:mt-4 prose-p:text-gray-600 prose-p:dark:text-ink-3 prose-p:leading-relaxed prose-p:my-2 prose-strong:text-gray-900 prose-strong:dark:text-white"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.questions || '') }}
                      />
                    ) : null}
                    </div>
                </ProductInfoSection>

                  {/*
                    ── THE LABEL, PHOTOGRAPHED ─────────────────────────────────────────────────
                    Everything after the front and the back of the tub: the Supplement Facts panel,
                    the directions, the warnings, shot close enough to read. `defaultOpen` because
                    a photograph of the printed label is evidence, and evidence that needs a click
                    is evidence most people never see.

                    Renders nothing at all for a product with two photographs or fewer, which is
                    most of them — no heading, no empty grid.
                  */}
                  {labelImages.length > 0 && (
                    <ProductInfoSection
                      id="pdp-label-photos"
                      title="Photos du produit"
                      eyebrow={`${labelImages.length} photo${labelImages.length > 1 ? 's' : ''}`}
                      defaultOpen
                    >
                      <ProductLabelGrid images={labelImages} altBase={imageAltBase} />
                    </ProductInfoSection>
                  )}
              </div>
                );
              })()}
            </div>
          </div>

          {/* ── B) THE BUY COLUMN ──────────────────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">

            {/* 1. Where you are. A link, so the crumb also does work for crawl depth. */}
            {product.sous_categorie?.slug && (
              <Link
                href={`/${product.sous_categorie.slug}`}
                // `-my-3 min-h-[44px]`: this is a flex item, so it is blockified and WCAG 2.5.5's
                // inline-text exemption does not apply — it was an 18px-tall target. The negative
                // margin gives it a 44px hit area without giving the column 26px of dead air.
                className="-my-3 inline-flex min-h-[44px] items-center gap-2 self-start font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand underline-offset-4 hover:underline"
              >
                <span className="h-px w-4 bg-brand" aria-hidden="true" />
                {product.sous_categorie.designation_fr}
              </Link>
            )}

            {/* 2. ONE h1. The old mobile tree rendered the name as a <p> specifically to avoid a
                   second h1 in the document; with one tree that workaround is unnecessary. */}
            <h1 className="font-display text-[1.75rem] font-bold uppercase leading-[0.98] tracking-tight text-ink-1 sm:text-[2rem] xl:text-[2.25rem]">
              {product.designation_fr}
            </h1>

            {/* 3. Brand, rating, authenticity — one row of provenance. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {product.brand?.designation_fr && (
                <Link
                  href={`/${nameToSlug(product.brand.designation_fr)}`}
                  // Same blockification as the eyebrow above — it was 20px tall.
                  className="-my-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-ink-2 underline-offset-2 hover:text-brand hover:underline"
                >
                  {product.brand.designation_fr}
                </Link>
              )}

              {/*
                ZERO REVIEWS MUST NOT LOOK LIKE A ZERO SCORE.

                This row renders nothing at all when there are none, rather than five grey stars
                beside "(0) · 0 avis" — a filled-in scoreboard reading nil, which says "nobody liked
                this" when the truth is "nobody has said anything yet". The ask for a review belongs
                in the reviews section, which already has an honest empty state. Hide it here, ask
                for it there.
              */}
              {reviewCount > 0 && (
                <button
                  type="button"
                  onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group inline-flex items-center gap-1.5"
                >
                  <StarRating rating={rating} size="md" />
                  <span className="text-sm font-medium tabular-nums text-ink-2 transition-colors group-hover:text-brand">
                    {rating.toFixed(1)} · {reviewCount} avis
                  </span>
                </button>
              )}

              {/*
                The shop's OWN guarantee, stated as the shop. Not a third-party verification badge
                and not a rating: importing either would be a claim we cannot substantiate on a page
                Google reads. It is the same promise the trust row below already makes, given the
                weight the owner asked for.
              */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-[11px] font-medium text-ink-2">
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
                Produit authentique
              </span>
            </div>

            {/*
              4. THE BENEFITS PANEL — the reference storefront's signature element, and the reason
                 the owner sent the screenshot. When a product has no extractable list this falls
                 back to the meta description; the two are never both shown, because the meta
                 description of an imported product usually restates the H1 and would read as the
                 page saying the same thing twice.
            */}
            {highlights.length > 0 ? (
              <ProductHighlights highlights={highlights} />
            ) : metaDescription ? (
              <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">
                {metaDescription}
              </p>
            ) : null}

            {/* ── 5. THE BUY BOX ─────────────────────────────────────────────────────────────
                The ref is read by the IntersectionObserver that raises and lowers the mobile
                sticky bar — see the declaration above. */}
            <div ref={buyBoxRef} className="rounded-2xl border border-hairline bg-elevated p-4 shadow-card sm:p-5">

              {/* Price. One number, at a size nothing else on the page competes with. */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-[2rem] font-bold leading-none tracking-tight tabular-nums text-brand sm:text-[2.5rem]">
                  {displayPrice} DT
                </span>
                {oldPrice && (
                  <>
                    <span className="font-display text-lg tracking-tight tabular-nums text-ink-3 line-through">
                      {oldPrice} DT
                    </span>
                    <span className="rounded-full bg-brand px-2 py-0.5 font-display text-xs font-bold tabular-nums text-on-brand">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
              {oldPrice && (
                <p className="mt-1.5 text-xs font-semibold tabular-nums text-ok">
                  Vous économisez {(oldPrice - displayPrice).toFixed(2)} DT
                </p>
              )}

              {/* Reference and barcode, where a buyer looks for them. One call site now, not two. */}
              <ProductIdentifiers product={product} className="mt-2.5" />

              {/*
                Stock, next to the control it qualifies rather than floated as a badge beside the
                price. Icon AND text AND colour: "en stock" green against "rupture" red is invisible
                to a red-green deficiency, and this is the line that decides whether the button
                below is worth pressing.
              */}
              {(() => {
                const StockIcon = stockStatus.isOutOfStock
                  ? XCircle
                  : stockStatus.isLowStock
                    ? AlertTriangle
                    : CheckCircle2;
                return (
                  <p
                    className={cn(
                      'mt-3 flex items-center gap-1.5 border-t border-hairline pt-3 text-sm font-semibold',
                      stockStatus.isOutOfStock ? 'text-ink-3' : stockStatus.isLowStock ? 'text-warn' : 'text-ok'
                    )}
                  >
                    <StockIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {stockStatus.stockLabel}
                    {stockStatus.isLowStock && stockStatus.qte > 0 && (
                      <span className="font-normal tabular-nums text-ink-3">— plus que {stockStatus.qte}</span>
                    )}
                  </p>
                );
              })()}

              {/* Arômes */}
              {product.aromes && product.aromes.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-ink-1">Arôme</p>
                  <div className="flex flex-wrap gap-2">
                    {product.aromes.map((arome) => {
                      const isSelected = selectedAromaId === arome.id;
                      return (
                        <button
                          key={arome.id}
                          type="button"
                          onClick={() => setSelectedAromaId(arome.id)}
                          aria-pressed={isSelected}
                          className={cn(
                            'min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                            isSelected
                              ? 'border-brand bg-brand text-on-brand'
                              : 'border-hairline bg-elevated text-ink-1 hover:border-brand hover:text-brand'
                          )}
                        >
                          {arome.designation_fr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity + running total */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-ink-1">Quantité</span>
                  <div className="flex items-center rounded-xl border border-hairline bg-canvas">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-9 text-center font-display font-bold tabular-nums" aria-live="polite">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl"
                      onClick={() => setQuantity(Math.min(stockDisponible, quantity + 1))}
                      disabled={quantity >= stockDisponible || stockDisponible <= 0}
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <span className="text-sm text-ink-2 tabular-nums">
                  Total{' '}
                  <span className="font-display font-bold text-ink-1">{(displayPrice * quantity).toFixed(2)} DT</span>
                </span>
              </div>

              {/*
                ── THE CTAs, ON EVERY WIDTH ──────────────────────────────────────────────────
                They used to be desktop-only here; a phone got them ONLY from the sticky bar, so
                the one moment a mobile customer has decided — reading the price, having just set a
                quantity — there was no button under their thumb. That is 81% of this site's
                traffic. The sticky bar stays, and now yields while this box is on screen.
              */}
              <div className="mt-4 flex flex-col gap-2">
                {stockStatus.isBackOrder ? (
                  /*
                    SUR COMMANDE — a request, not a purchase.

                    10,535 of 10,669 published products are catalogue entries the shop does not
                    physically hold. Two disabled "Rupture de stock" buttons is both discouraging
                    and inaccurate: these never sold out, they were never stocked, and they CAN be
                    brought in. The owner's decision was request-only, so this must not be a basket
                    — an add-to-cart here would generate real orders for goods nobody has.
                  */
                  <>
                    <Button
                      asChild
                      className="min-h-[52px] w-full font-display text-sm font-bold uppercase tracking-wide"
                    >
                      <Link href={`/contact?produit=${encodeURIComponent(product.designation_fr || '')}`}>
                        <Mail className="me-2 h-4 w-4 shrink-0" />
                        Demander ce produit
                      </Link>
                    </Button>
                    <p className="text-center text-xs text-ink-3">
                      Ce produit n&apos;est pas en stock. Nous le commandons pour vous sur demande — nous vous
                      confirmons le prix et le délai avant toute commande.
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      className="min-h-[52px] w-full font-display text-sm font-bold uppercase tracking-wide"
                      onClick={handleAddToCart}
                      disabled={stockStatus.isOutOfStock}
                    >
                      <ShoppingCart className="me-2 h-4 w-4 shrink-0" />
                      {stockStatus.isOutOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-[52px] w-full border-brand bg-transparent font-display text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand hover:text-on-brand"
                      onClick={handleQuickOrderClick}
                      disabled={stockStatus.isOutOfStock}
                    >
                      <Zap className="me-2 h-4 w-4 shrink-0" />
                      Commander maintenant
                    </Button>
                  </>
                )}
              </div>

              {/* Trust row */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-4">
                {[
                  { Icon: Truck, label: 'Livraison 24–72h' },
                  { Icon: CreditCard, label: 'Paiement à la livraison' },
                  { Icon: Shield, label: '100% authentique' },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center">
                    <Icon className="h-5 w-5 text-brand" strokeWidth={1.75} aria-hidden="true" />
                    <span className="text-[11px] leading-tight text-ink-3">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Tags — de-emphasised, below the buy box, and they earn internal links. */}
            {(product.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                {product.tags?.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/shop?search=${encodeURIComponent(tag.designation_fr)}&sort=relevance`}
                    className="inline-flex items-center rounded-full border border-hairline px-2.5 py-1 transition-colors hover:border-brand hover:text-brand"
                  >
                    #{tag.designation_fr.toLowerCase()}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Avis, comparatif, suggestions — full width, below both columns. */}
        <section className="mx-auto w-full" aria-label="Avis et comparatif">
            {/* Avis clients — below tabs (no longer sidebar) */}
            <div
              id="reviews"
              className="min-w-0 pt-8 sm:pt-10 border-t border-hairline mt-8 sm:mt-10"
            >
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              <h2 className="font-display uppercase tracking-tight leading-[0.95] text-2xl sm:text-3xl font-bold text-ink-1 border-b border-hairline pb-3 sm:pb-4">Avis clients</h2>

              {reviewCount > 0 ? (
                <>
                  {/* Summary — big rating + distribution together in one clean card (stacks on phones) */}
                  <div className="grid gap-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-4 sm:grid-cols-[auto,1fr] sm:items-center sm:gap-8 sm:p-6">
                    <div className="flex flex-col items-center sm:items-start sm:border-r sm:border-gray-200 sm:pr-8 dark:sm:border-gray-800">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display font-bold tracking-tight tabular-nums text-5xl text-ink-1">
                          {rating > 0 ? rating.toFixed(1) : '–'}
                        </span>
                        <span className="text-ink-3 text-base tabular-nums">/ 5</span>
                      </div>
                      <StarRating rating={rating} size="lg" className="mt-1.5 gap-1" />
                      <p className="mt-2 text-xs sm:text-sm text-ink-3">Basé sur {reviewCount} avis</p>
                    </div>
                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map((starLevel) => {
                        const count = reviews.filter(r => r.stars === starLevel).length;
                        const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                        return (
                          <div key={starLevel} className="flex items-center gap-2">
                            <span className="flex w-9 shrink-0 items-center gap-0.5 text-xs text-ink-2 tabular-nums">
                              {starLevel} <Star className="h-3 w-3 fill-current text-amber-400" />
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-7 shrink-0 text-right text-xs text-ink-3 tabular-nums">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Removed: fabricated "Ce que disent les clients" summary + hardcoded
                      "Points forts des avis" badges. They rendered identical, invented review
                      sentiment on EVERY product regardless of real reviews — a trust liability and
                      a Google review-content policy risk. The real, per-product reviews render below. */}

                  {/* Review list — clean divided list with initial avatars (no stacked boxes) */}
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {reviewsToShowOnPage.map((review) => {
                      const reviewerName = review.user?.name?.trim() || 'Client';
                      const initial = reviewerName.slice(0, 1).toUpperCase();
                      return (
                        <li key={review.id} className="flex gap-3 py-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 font-display text-sm font-bold text-brand dark:bg-red-950/40">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-ink-1">{reviewerName}</span>
                              <span className="shrink-0 text-xs text-ink-3">
                                {review.created_at ? new Date(review.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <StarRating rating={review.stars} size="sm" />
                              {/*
                                ── ACHAT VÉRIFIÉ ────────────────────────────────────────────────
                                Owner asked for the reference storefront's verified-purchase badge.
                                It is shown on exactly the reviews that carry evidence — `verified`
                                set, or an order id attached — and on no others.

                                That distinction is the whole value of the badge, and it is not
                                cosmetic here: the catalogue carries a large SEEDED review backlog
                                with `verified = 0` and `commande_id = null` on every row. Printing
                                the badge unconditionally would put "achat vérifié" under thousands
                                of reviews that were never purchases, which is a false statement to
                                a customer before it is anything else. Same test as
                                buildAggregateRatingAndReviews uses to decide what may enter the
                                structured data — one rule, both places.
                              */}
                              {(review.verified === 1 || review.verified === true || review.commande_id != null) && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ok">
                                  <BadgeCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  Achat vérifié
                                </span>
                              )}
                            </div>
                            {review.comment && (
                              <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{review.comment}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {visibleReviewCount < sortedReviews.length ? (
                    <Button
                      variant="outline"
                      className="w-full min-h-[44px] py-2.5 leading-snug text-xs sm:text-sm whitespace-normal border-gray-300 dark:border-gray-600"
                      size="default"
                      onClick={() => setVisibleReviewCount((prev) => prev + REVIEW_PAGE_SIZE)}
                    >
                      Charger plus d'avis ({sortedReviews.length - reviewsToShowOnPage.length} restants sur {reviewCount})
                    </Button>
                  ) : (
                    <p className="text-sm text-center text-ink-3">
                      Tous les avis sont affichés ({reviewCount})
                    </p>
                  )}

                  {/* Add Review Button (logged-in) / login prompt (logged-out) */}
                  {isAuthenticated ? (
                    <Button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="min-h-[48px] w-full bg-brand font-display font-semibold uppercase tracking-wide text-on-brand hover:bg-brand-hover"
                      size="default"
                    >
                      {showReviewForm ? 'Annuler' : 'Écrire un avis'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/login')}
                      variant="outline"
                      className="min-h-[48px] w-full border-brand font-display font-semibold uppercase tracking-wide text-brand hover:bg-brand hover:text-on-brand"
                      size="default"
                    >
                      Connectez-vous pour laisser un avis
                    </Button>
                  )}
                </>
              ) : (
                <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-ink-2 text-center mb-4">
                    Aucun avis pour le moment
                  </p>
                  {isAuthenticated ? (
                    <Button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="min-h-[48px] w-full bg-brand font-display font-semibold uppercase tracking-wide text-on-brand hover:bg-brand-hover"
                      size="default"
                    >
                      {showReviewForm ? 'Annuler' : 'Écrire un avis'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/login')}
                      variant="outline"
                      className="min-h-[48px] w-full border-brand font-display font-semibold uppercase tracking-wide text-brand hover:bg-brand hover:text-on-brand"
                      size="default"
                    >
                      Connectez-vous pour laisser un avis
                    </Button>
                  )}
                </div>
              )}

              {/* Review Form */}
              {showReviewForm && isAuthenticated && (
                <div className="p-3 sm:p-4 lg:p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-red-200 dark:border-red-900/50 min-w-0">
                  <h4 className="font-bold mb-2 sm:mb-3 text-xs sm:text-sm lg:text-base text-ink-1">Votre avis</h4>
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold mb-2 text-ink-1">Note *</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setReviewStars(star)} className="focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`Noter ${star} étoile${star > 1 ? 's' : ''}`}>
                            <Star className={`h-6 w-6 fill-current ${star <= reviewStars ? 'text-amber-400' : 'text-hairline'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold mb-1 text-ink-1">Commentaire (optionnel)</label>
                      <textarea value={reviewComment} onChange={(e) => { if (e.target.value.length <= 500) setReviewComment(e.target.value); }} className="w-full min-w-0 p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-ink-1 text-sm" rows={3} placeholder="Partagez votre expérience..." maxLength={500} />
                      <p className="text-xs mt-0.5 text-ink-3">{reviewComment.length}/500</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSubmitReview} disabled={reviewStars === 0 || isSubmittingReview} className="flex-1 bg-brand hover:bg-brand-hover text-on-brand font-display uppercase tracking-wide font-semibold" size="sm">
                        {isSubmittingReview ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Publication...</> : 'Publier'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setShowReviewForm(false); setReviewStars(0); setReviewComment(''); }}>Annuler</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/*
          Official brand video.

          `loading="lazy"` and youtube-nocookie are both deliberate: the iframe is below the fold on
          every layout, and nocookie sets no tracking cookie until the visitor actually presses play.
          The id is re-validated by videoId() before it reaches this src — the value arrives from a
          JSON column, and the set of things that can write to a JSON column only grows over a
          project's life.
        */}
        {officialVideoId && (
          <div className="min-w-0">
            <SectionHeader kicker="En vidéo" title="Vidéo officielle" />
            <div className="overflow-hidden rounded-xl border border-hairline">
              <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                <iframe
                  src={embedUrl(officialVideoId)}
                  title={videoTitle(initialProduct.official_video, initialProduct.designation_fr ?? '')}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            </div>
            {initialProduct.official_video?.channel && (
              <p className="mt-2 text-sm text-ink-2">
                Vidéo publiée par {initialProduct.official_video.channel}.
              </p>
            )}
          </div>
        )}

        {/*
          Comparison table — content parity with the crawler view.

          The carousel below sells; this answers "which of these, and why". Same data, same helper,
          same columns as CrawlerProductView, so Googlebot and a customer see the same facts. No
          price-per-kilo column here either — see util/productComparison.ts.
        */}
        {comparisonRows.length > 0 && (
          <div className="min-w-0">
            <SectionHeader kicker="Comparatif" title="Comparer avec des produits similaires" />
            <ProductComparisonTable rows={comparisonRows} />
          </div>
        )}

        {/*
          ── COMPLÉTEZ VOTRE COMMANDE ──────────────────────────────────────────────────────────
          Placed after the comparison table and before the carousel on purpose: the table is where
          a shopper finishes deciding WHICH, and the carousel is where they leave. Between the two
          is the only point on this page where "and also…" is a help rather than an interruption.

          It renders nothing unless the current product and two companions are all genuinely
          addable — see the component, which explains why that is strict and why the heading does
          not claim co-occurrence data we do not have.
        */}
        <div className="min-w-0">
          <FrequentlyBoughtTogether
            product={product}
            similar={similarProducts}
            imageFor={(entry) => getStorageUrl(entry.cover || '')}
            onAdd={handleAddManyToCart}
          />
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="min-w-0">
            <SectionHeader kicker="Vous aimerez aussi" title="Produits similaires" />
            {/* Mobile: horizontal carousel with snap; Desktop: grid 4 cols */}
            <div
              className="flex md:grid overflow-x-auto md:overflow-visible gap-3 sm:gap-4 lg:gap-6 pb-2 md:pb-0 snap-x snap-mandatory md:snap-none md:grid-cols-4 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {similarProducts.map((similarProduct, index) => (
                <div key={similarProduct.id || `similar-${index}`} className="shrink-0 w-[min(180px,42vw)] sm:w-[min(200px,45vw)] md:w-auto md:min-w-0 snap-center">
                  <ProductCard
                    product={similarProduct}
                    variant="compact"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky CTAs (Mobile): compact — Total inline with primary CTA, secondary below */}
      <div
        className={cn(
          /*
            NO LONGER `lg:hidden`. The reference storefront keeps a bar like this on desktop and it
            is now necessary here rather than decorative: the information sections moved into the
            gallery column, so a desktop page is several thousand pixels tall and the buy box
            scrolls away after the first screen.

            `bottom-tabbar` already resolves correctly at both ends — `--tabbar-h` is 56px below
            768px and 0px above it (styles/tokens.css), so the same class sits above the mobile tab
            bar and flush to the bottom on a desktop. One element, one IntersectionObserver, no
            second tree.
          */
          'fixed bottom-tabbar left-0 right-0 bg-canvas border-t border-hairline px-3 pt-2 shadow-card z-sticky-cta lg:px-6',
          'transition-transform duration-200 motion-reduce:transition-none',
          // Out of view, not merely translated: a button that is off-screen but still focusable is
          // a tab stop that goes nowhere, and screen readers would announce two "Ajouter au panier".
          stickyBarVisible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        )}
        data-sticky-cta=""
        aria-hidden={!stickyBarVisible}
        // Was z-50 — above the tab bar — so this bar painted over the raised Boutique tile on
        // every product page. Now below it, with `--tabbar-raise` of bottom padding so the tile
        // overlaps this surface and never these buttons. The bar is on `bg-canvas`, which the
        // tab bar also uses, so the tile ring cut-out blends instead of showing a halo.
        // The safe-area inset moved into --tabbar-h itself; padding for it here would double it.
        style={{ paddingBottom: 'calc(var(--tabbar-raise) + 0.5rem)' }}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 lg:flex-row lg:items-center lg:gap-4 lg:py-1.5">
          {/*
            WHICH product, on desktop only. A bar that says "Total 535 DT / Ajouter au panier" is
            unambiguous on a phone, where it is the only thing on screen. On a desktop it floats
            over a page of related products and a comparison table, so it has to name what it is
            about to put in the basket. Below `lg` this costs nothing: it does not render.
          */}
          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            {productImage && (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-hairline bg-elevated">
                <Image src={productImage} alt="" fill sizes="44px" className="object-contain p-0.5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-1">{product.designation_fr}</p>
              {product.brand?.designation_fr && (
                <p className="truncate text-xs text-ink-3">{product.brand.designation_fr}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 lg:shrink-0">
            <div className="flex flex-col leading-tight shrink-0">
              <span className="text-[10px] font-display uppercase tracking-wide text-ink-3">Total</span>
              <span className="font-display font-bold tracking-tight tabular-nums text-lg text-brand">
                {(displayPrice * quantity).toFixed(2)} DT
              </span>
            </div>
            {/* Sur commande: one request CTA instead of two dead buttons. Mirrors the desktop
                block above — the mobile sticky bar is 81% of this site's traffic, so leaving it on
                the old branch would have meant almost nobody saw the change. */}
            {stockStatus.isBackOrder ? (
              <Button
                asChild
                size="default"
                className="flex-1 min-w-0 min-h-[44px] h-auto py-2 text-sm bg-brand hover:bg-brand-hover text-on-brand font-display uppercase tracking-wide font-bold"
              >
                <Link
                  href={`/contact?produit=${encodeURIComponent(product.designation_fr || '')}`}
                  aria-label="Demander ce produit"
                >
                  <Mail className="h-4 w-4 mr-2 shrink-0" />
                  Demander ce produit
                </Link>
              </Button>
            ) : (
              <Button
                size="default"
                className="flex-1 min-w-0 min-h-[44px] h-auto py-2 text-sm bg-brand hover:bg-brand-hover text-on-brand font-display uppercase tracking-wide font-bold"
                onClick={handleAddToCart}
                disabled={stockStatus.isOutOfStock}
                aria-label="Ajouter au panier"
              >
                <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
                {stockStatus.isOutOfStock ? 'Rupture' : 'Ajouter au panier'}
              </Button>
            )}
            {/* On desktop the two CTAs sit side by side in the same row rather than stacked,
                because there is room and a full-width secondary button reads as the primary one. */}
            {!stockStatus.isBackOrder && (
              <Button
                size="default"
                variant="outline"
                className="hidden min-h-[44px] h-auto shrink-0 border-brand bg-transparent py-2 font-display text-sm font-semibold uppercase tracking-wide text-brand hover:bg-brand hover:text-on-brand lg:inline-flex"
                onClick={handleQuickOrderClick}
                disabled={stockStatus.isOutOfStock}
                aria-label="Commander maintenant"
              >
                <Zap className="h-4 w-4 mr-2 shrink-0" />
                Commander maintenant
              </Button>
            )}
          </div>

          {!stockStatus.isBackOrder && (
            <Button
              size="default"
              variant="outline"
              className="w-full min-h-[44px] h-auto border-brand bg-transparent py-2 font-display text-sm font-semibold uppercase tracking-wide text-brand hover:bg-brand hover:text-on-brand lg:hidden"
              onClick={handleQuickOrderClick}
              disabled={stockStatus.isOutOfStock}
              aria-label="Commander maintenant"
            >
              <Zap className="h-4 w-4 mr-2 shrink-0" />
              Commander maintenant
            </Button>
          )}
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
