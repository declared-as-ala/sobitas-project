'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { useCart } from '@/app/contexts/CartContext';
import { ProductCard } from '@/app/components/ProductCard';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Minus, Plus, ShoppingCart, Star, Shield, Heart, Share2, ZoomIn, CheckCircle2, XCircle, AlertTriangle, Loader2, Zap, X, ChevronLeft, ChevronRight, Sparkles, TrendingUp, Flame, Truck, CreditCard } from 'lucide-react';
import { useQuickOrder } from '@/contexts/QuickOrderContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { QuickOrderProduct } from '@/contexts/QuickOrderContext';
import type { Product, Review } from '@/types';
import { getStorageUrl, addReview, getProductDetails } from '@/services/api';
import { formatTnd, hasValidPromo } from '@/util/productPrice';
import { buildComparison } from '@/util/productComparison';
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


/**
 * Stock / promo / "Nouveau" / "Top Vendu" badges.
 * Rendered once here and reused by both the mobile and desktop buy-box trees so their
 * French labels and the state-aware stock icon can never diverge again.
 */
function ProductBadges({
  stockStatus,
  discount,
  isNew,
  isBestSeller,
  textSize,
}: {
  stockStatus: ReturnType<typeof getProductStockStatus>;
  discount: number;
  isNew: boolean;
  isBestSeller: boolean;
  textSize: string;
}) {
  const StockIcon = stockStatus.isOutOfStock ? XCircle : stockStatus.isLowStock ? AlertTriangle : CheckCircle2;
  return (
    <>
      <Badge
        variant="outline"
        className={cn(
          stockStatus.isOutOfStock
            ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
            : stockStatus.isLowStock
              ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              : 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
          'font-display uppercase tracking-wide px-2.5 py-1',
          textSize
        )}
      >
        <StockIcon className="h-3 w-3 mr-1" />
        {stockStatus.stockLabel}
        {stockStatus.isLowStock && stockStatus.qte > 0 && (
          <span className="ml-1 tabular-nums">({stockStatus.qte})</span>
        )}
      </Badge>
      {discount > 0 && (
        <Badge className={cn('gap-1 bg-red-600 text-white font-display uppercase tracking-wide tabular-nums px-2.5 py-1', textSize)}>
          <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />-{discount}%
        </Badge>
      )}
      {isNew && (
        <Badge variant="outline" className={cn('gap-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 font-display uppercase tracking-wide px-2.5 py-1', textSize)}>
          <Sparkles className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />Nouveau
        </Badge>
      )}
      {isBestSeller && (
        <Badge variant="outline" className={cn('gap-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 font-display uppercase tracking-wide px-2.5 py-1', textSize)}>
          <TrendingUp className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />Top Vendu
        </Badge>
      )}
    </>
  );
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
  const [selectedImage, setSelectedImage] = useState(0);
  const { isFavorite: isInFavorites, toggleFavorite } = useFavorites();
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
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

  const imageAltBase = (product.seo?.image_alt || product.alt_cover || product.designation_fr || 'Produit').trim();
  const galleryImagePaths = useMemo(() => {
    const extra = Array.isArray((product as any).images) ? (product as any).images : [];
    const paths = [product.cover, ...extra]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    return [...new Set(paths)];
  }, [product]);
  const galleryImages = useMemo(() => {
    return galleryImagePaths
      .map((path) => getStorageUrl(path))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
  }, [galleryImagePaths]);
  const safeSelectedImage = selectedImage >= 0 && selectedImage < galleryImages.length ? selectedImage : 0;
  const productImage = galleryImages[safeSelectedImage] || '';

  useEffect(() => {
    if (selectedImage >= galleryImages.length) {
      setSelectedImage(0);
    }
  }, [galleryImages.length, selectedImage]);

  useEffect(() => {
    setVisibleReviewCount(REVIEW_PAGE_SIZE);
  }, [reviews.length, REVIEW_PAGE_SIZE]);

  const handleGalleryTouchStart = (event: React.TouchEvent) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleGalleryTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX == null || galleryImages.length <= 1) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = touchStartX - endX;
    if (Math.abs(delta) < 35) return;

    setSelectedImage((prev) => {
      if (delta > 0) return (prev + 1) % galleryImages.length;
      return (prev - 1 + galleryImages.length) % galleryImages.length;
    });
    setTouchStartX(null);
  };

  // Helper function to strip HTML tags and decode HTML entities for meta description
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
    <div className="min-h-screen bg-white dark:bg-gray-950">

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-3 sm:py-6 lg:py-12 pb-36 sm:pb-36 lg:pb-12">
        {/* Breadcrumb — single scrollable line on mobile (was flex-wrap → 2–3 tall rows); the long
            final crumb truncates on phones and the row swipes horizontally instead of eating height. */}
        {breadcrumbItems.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <ol className="flex flex-nowrap items-center gap-x-1.5 overflow-x-auto scrollbar-hide">
              {breadcrumbItems.map((item, i) => (
                <li key={i} className="flex shrink-0 items-center gap-x-1.5">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden />}
                  {i < breadcrumbItems.length - 1 ? (
                    <Link href={item.url} className="whitespace-nowrap hover:text-red-600 dark:hover:text-red-400 underline-offset-2 hover:underline">
                      {item.name}
                    </Link>
                  ) : (
                    <span className="max-w-[46vw] truncate whitespace-nowrap font-medium text-gray-900 dark:text-white sm:max-w-none" aria-current="page">{item.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {/* Layout: 2 cols desktop (Image left, larger | Info + buy right), mobile single col. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 xl:gap-10 mb-6 sm:mb-8 lg:mb-10">
          {/* A) COLONNE GAUCHE — Gallery (desktop): image slightly smaller */}
          <div className="hidden lg:block lg:col-span-5 min-w-0">
            <div className="sticky top-24 max-w-[520px] xl:max-w-[560px]">
              <div
                className="relative w-full rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm group aspect-square min-h-[290px] xl:min-h-[350px] bg-gray-50 dark:bg-gray-900"
                onTouchStart={handleGalleryTouchStart}
                onTouchEnd={handleGalleryTouchEnd}
              >
                {productImage ? (
                  <Image
                    src={productImage}
                    alt={safeSelectedImage === 0 ? imageAltBase : `${imageAltBase} – vue ${safeSelectedImage + 1}`}
                    title={product.description_cover || product.designation_fr || 'Produit'}
                    fill
                    className="object-contain object-center p-4 sm:p-6 xl:p-8 transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-[1.03]"
                    // This gallery is `hidden lg:block` (visible only ≥1024px). Declare ~1px below
                    // 1024px so on mobile Next still emits its `priority` preload but for a 16px
                    // candidate (~1KB) instead of a ~750px image — otherwise the phone downloads
                    // this display:none image at fetchPriority=high and starves the real mobile LCP
                    // image, inflating LCP. See the mobile <Image> below for the visible counterpart.
                    sizes="(max-width: 1023px) 1px, (max-width: 1400px) 40vw, 560px"
                    priority={safeSelectedImage === 0}
                    loading={safeSelectedImage === 0 ? 'eager' : 'lazy'}
                    fetchPriority={safeSelectedImage === 0 ? 'high' : 'auto'}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.error-placeholder')) {
                        const ph = document.createElement('div');
                        ph.className = 'error-placeholder absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800';
                        ph.innerHTML = '<svg class="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>';
                        parent.appendChild(ph);
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <svg className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>
              {galleryImages.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {galleryImages.map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden border transition-colors',
                        index === safeSelectedImage
                          ? 'border-red-600 ring-2 ring-red-100 dark:ring-red-950'
                          : 'border-gray-100 dark:border-gray-800 hover:border-red-300'
                      )}
                      aria-label={`Voir image ${index + 1}`}
                    >
                      <Image
                        src={img}
                        alt={`${imageAltBase} – miniature ${index + 1}`}
                        title={product.description_cover || product.designation_fr || 'Produit'}
                        fill
                        loading="lazy"
                        sizes="96px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* B) COLONNE DROITE — Infos + prix + quantité + CTAs (mobile & desktop trees) */}
          <div className="lg:col-span-7 min-w-0 space-y-3 sm:space-y-4">
            {/* Mobile Layout: Image First then badges, title, etc. */}
            <div className="lg:hidden space-y-4">
              {/* Row 1: category eyebrow (context) + favoris/share pulled out of the buy flow */}
              <div className="flex items-center justify-between gap-3 px-1">
                {product.sous_categorie?.slug ? (
                  <Link
                    href={`/${product.sous_categorie.slug}`}
                    className="inline-flex items-center gap-2 font-display uppercase tracking-[0.18em] text-[11px] font-semibold text-red-600 dark:text-red-400"
                  >
                    <span className="h-px w-4 bg-red-600 dark:bg-red-400" aria-hidden="true" />
                    {product.sous_categorie.designation_fr}
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-lg" onClick={() => toggleFavorite(favoriteProduct)} aria-label="Ajouter aux favoris">
                    <Heart className={`h-5 w-5 ${isInFavorites(product.id) ? 'fill-red-600 text-red-600' : ''}`} />
                  </Button>
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-lg" onClick={handleShare} aria-label="Partager">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              {/* Product Image - slightly smaller on mobile */}
              <div className="w-full max-w-[260px] sm:max-w-[320px] mx-auto">
                <div
                  className="relative rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 group w-full aspect-square bg-gray-50 dark:bg-gray-900"
                  onTouchStart={handleGalleryTouchStart}
                  onTouchEnd={handleGalleryTouchEnd}
                >
                  {productImage ? (
                    <Image
                      src={productImage}
                      alt={safeSelectedImage === 0 ? imageAltBase : `${imageAltBase} – vue ${safeSelectedImage + 1}`}
                      title={product.description_cover || product.designation_fr || 'Produit'}
                      fill
                      className="object-contain object-center p-3 sm:p-4 transition-transform duration-500 group-hover:scale-[1.03]"
                      // This gallery is `lg:hidden` (visible only <1024px) and capped at max-w-[260px]
                      // (sm:320px). Declare ~1px at ≥1024px so on desktop its `priority` preload
                      // collapses to a 16px candidate instead of a hidden 560px image competing with
                      // the visible desktop LCP. Mobile sizes stay matched to the real slot width.
                      sizes="(min-width: 1024px) 1px, (max-width: 640px) 260px, 320px"
                      priority={safeSelectedImage === 0}
                      loading={safeSelectedImage === 0 ? 'eager' : 'lazy'}
                      fetchPriority={safeSelectedImage === 0 ? 'high' : 'auto'}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.error-placeholder')) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'error-placeholder absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800';
                          placeholder.innerHTML = '<svg class="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>';
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <svg className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                {galleryImages.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {galleryImages.map((img, index) => (
                      <button
                        key={`mobile-${img}-${index}`}
                        type="button"
                        onClick={() => setSelectedImage(index)}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden border transition-colors',
                          index === safeSelectedImage
                            ? 'border-red-600 ring-2 ring-red-100 dark:ring-red-950'
                            : 'border-gray-100 dark:border-gray-800'
                        )}
                        aria-label={`Voir image ${index + 1}`}
                      >
                        <Image
                          src={img}
                          alt={`${imageAltBase} – miniature ${index + 1}`}
                          title={product.description_cover || product.designation_fr || 'Produit'}
                          fill
                          loading="lazy"
                          sizes="80px"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 1. Title — mobile mirror of desktop H1; rendered as <p> to avoid duplicate H1 in DOM */}
              <div className="min-w-0 px-1">
                <p className="font-display uppercase tracking-tight text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-[0.95] break-words line-clamp-3">
                  {product.designation_fr}
                </p>
              </div>

              {/* 2. Rating + brand — MOBILE.
                  This is a second, independent copy of the desktop row below. It is the one the
                  owner actually saw: the desktop copy was fixed first and this was missed, so the
                  phone kept showing "(0) · 0 avis" while the desktop looked fine.
                  Keep the two in lockstep — every change here needs the same change at the
                  desktop row, and vice versa. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
                {reviewCount > 0 && (
                  <button
                    type="button"
                    onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                    className="group flex items-center gap-1.5 text-left"
                  >
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium tabular-nums transition-colors group-hover:text-red-600 dark:group-hover:text-red-400">
                      ({rating.toFixed(1)}) · {reviewCount} avis
                    </span>
                  </button>
                )}
                {product.brand?.designation_fr && (
                  <>
                    {/* Separator only when there is something to its left. */}
                    {reviewCount > 0 && <span className="text-gray-300 dark:text-gray-700" aria-hidden="true">|</span>}
                    <Link href={`/${nameToSlug(product.brand.designation_fr)}`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                      {product.brand.designation_fr}
                    </Link>
                  </>
                )}
              </div>

              {/* Meta Description - directly under reviews count */}
              {metaDescription && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed px-1 line-clamp-4 whitespace-pre-wrap break-words">
                  {metaDescription}
                </p>
              )}

              {/* BUY CARD — price, variant, quantity grouped (main CTAs live in the sticky bar) */}
              <div className="mx-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-4">
                {/* Price + stock/discount badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-display font-bold tracking-tight tabular-nums text-3xl sm:text-4xl text-red-600 dark:text-red-400">{displayPrice} DT</span>
                      {oldPrice && (
                        <span className="font-display tracking-tight tabular-nums text-lg sm:text-xl text-gray-400 dark:text-gray-500 line-through">{oldPrice} DT</span>
                      )}
                    </div>
                    {oldPrice && (
                      <p className="mt-1 text-xs font-semibold text-green-700 dark:text-green-400 tabular-nums">Vous économisez {(oldPrice - displayPrice).toFixed(2)} DT</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <ProductBadges
                      stockStatus={stockStatus}
                      discount={discount}
                      isNew={product.new_product === 1}
                      isBestSeller={product.best_seller === 1}
                      textSize="text-xs"
                    />
                  </div>
                </div>

                {/* Arômes */}
                {product.aromes && product.aromes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Arôme</p>
                    <div className="flex flex-wrap gap-2">
                      {product.aromes.map((arome) => {
                        const isSelected = selectedAromaId === arome.id;
                        return (
                          <Button
                            key={arome.id}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            size="default"
                            className={cn(
                              'min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl',
                              isSelected && 'bg-red-600 hover:bg-red-700 text-white'
                            )}
                            onClick={() => setSelectedAromaId(arome.id)}
                          >
                            {arome.designation_fr}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity + running total */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Quantité</span>
                    <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 min-h-[44px] min-w-[44px]"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-bold text-base tabular-nums" aria-live="polite">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 min-h-[44px] min-w-[44px]"
                        onClick={() => setQuantity(Math.min(stockDisponible, quantity + 1))}
                        disabled={quantity >= stockDisponible || stockDisponible <= 0}
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">Total <span className="font-bold text-gray-900 dark:text-white">{(displayPrice * quantity).toFixed(2)} DT</span></span>
                </div>
              </div>

              {/* Reference — one quiet line (tags kept in the description/footer to keep mobile clean) */}
              {(product.sku || product.code_product) && (
                <p className="px-1 text-xs text-gray-400 dark:text-gray-500">
                  Réf. {product.sku || product.code_product}
                </p>
              )}

              {/* Trust row — borderless so the mobile column reads as clean content, not stacked cards */}
              <div className="mx-1 grid grid-cols-3 gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                {[
                  { Icon: Truck, label: 'Livraison 24–72h' },
                  { Icon: CreditCard, label: 'Paiement à la livraison' },
                  { Icon: Shield, label: '100% authentique' },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center">
                    <Icon className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={1.75} aria-hidden="true" />
                    <span className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">{label}</span>
                  </div>
                ))}
              </div>

            </div>

            {/* Desktop Layout: context eyebrow → title → rating/brand → lede → grouped buy card → meta */}
            <div className="hidden lg:flex lg:flex-col gap-3.5 min-w-0">
                {/* Row 1: category eyebrow (context) + favoris/share pulled out of the buy flow */}
                <div className="flex items-center justify-between gap-3">
                  {product.sous_categorie?.slug ? (
                    <Link
                      href={`/${product.sous_categorie.slug}`}
                      className="inline-flex items-center gap-2 font-display uppercase tracking-[0.18em] text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline"
                    >
                      <span className="h-px w-4 bg-red-600 dark:bg-red-400" aria-hidden="true" />
                      {product.sous_categorie.designation_fr}
                    </Link>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => toggleFavorite(favoriteProduct)} aria-label="Ajouter aux favoris">
                      <Heart className={`h-4 w-4 ${isInFavorites(product.id) ? 'fill-red-600 text-red-600' : ''}`} />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={handleShare} aria-label="Partager">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <h1 className="font-display uppercase tracking-tight text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white leading-[0.95] line-clamp-3 break-words">
                  {product.designation_fr}
                </h1>

                {/* Rating + brand on one line — DESKTOP. Mirrored by the mobile copy above;
                    change both together.

                    ZERO REVIEWS MUST NOT LOOK LIKE A ZERO SCORE. This row used to render
                    unconditionally, so every product showed five grey stars next to "(0) · 0 avis"
                    — a filled-in scoreboard reading nil. That says "nobody liked this" when the
                    truth is "nobody has said anything yet".

                    At zero it now renders NOTHING here, rather than an invitation. The buy box is
                    where purchase intent forms, so anything sitting in it is read as a product
                    attribute — and a "be the first to review" label placed beside the price names
                    the emptiness and turns a neutral absence into an explicit negative. The ask
                    belongs in the reviews section further down, which already has an honest empty
                    state ("Aucun avis pour le moment" + a write-a-review button). Hide it here,
                    ask for it there. */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {reviewCount > 0 && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                      className="flex items-center gap-1.5 text-left"
                    >
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className={`h-4 w-4 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700 text-gray-200 dark:text-gray-700'}`} />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium tabular-nums transition-colors hover:text-red-600 dark:hover:text-red-400">({rating.toFixed(1)}) · {reviewCount} avis</span>
                    </button>
                  )}
                  {product.brand?.designation_fr && (
                    <>
                      {/* Separator only when there is something to its left. */}
                      {reviewCount > 0 && <span className="text-gray-300 dark:text-gray-700" aria-hidden="true">|</span>}
                      <Link href={`/${nameToSlug(product.brand.designation_fr)}`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                        {product.brand.designation_fr}
                      </Link>
                    </>
                  )}
                </div>

                {metaDescription && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">{metaDescription}</p>
                )}

                {/* BUY CARD — price, variant, quantity, CTAs, trust grouped into one clean block */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-5 space-y-4">
                  {/* Price + stock/discount badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-display font-bold tracking-tight tabular-nums text-3xl xl:text-4xl text-red-600 dark:text-red-400">{displayPrice} DT</span>
                        {oldPrice && (
                          <span className="font-display tracking-tight tabular-nums text-lg text-gray-400 dark:text-gray-500 line-through">{oldPrice} DT</span>
                        )}
                      </div>
                      {oldPrice && (
                        <p className="mt-1 text-xs font-semibold text-green-700 dark:text-green-400 tabular-nums">Vous économisez {(oldPrice - displayPrice).toFixed(2)} DT</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <ProductBadges
                        stockStatus={stockStatus}
                        discount={discount}
                        isNew={product.new_product === 1}
                        isBestSeller={product.best_seller === 1}
                        textSize="text-xs"
                      />
                    </div>
                  </div>

                  {/* Arômes */}
                  {product.aromes && product.aromes.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Arôme</p>
                      <div className="flex flex-wrap gap-2">
                        {product.aromes.map((arome) => {
                          const isSelected = selectedAromaId === arome.id;
                          return (
                            <Button
                              key={arome.id}
                              type="button"
                              variant={isSelected ? 'default' : 'outline'}
                              size="default"
                              className={cn(
                                'min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl',
                                isSelected && 'bg-red-600 hover:bg-red-700 text-white'
                              )}
                              onClick={() => setSelectedAromaId(arome.id)}
                            >
                              {arome.designation_fr}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity + running total on one row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Quantité</span>
                      <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Diminuer la quantité">
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-10 text-center font-semibold text-sm tabular-nums" aria-live="polite">{quantity}</span>
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQuantity(Math.min(stockDisponible, quantity + 1))} disabled={quantity >= stockDisponible || stockDisponible <= 0} aria-label="Augmenter la quantité">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">Total <span className="font-bold text-gray-900 dark:text-white">{(displayPrice * quantity).toFixed(2)} DT</span></span>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="default"
                      className="w-full min-h-[48px] h-auto py-3 text-sm bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide font-bold"
                      onClick={handleAddToCart}
                      disabled={stockStatus.isOutOfStock}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {stockStatus.isOutOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
                    </Button>
                    <Button
                      size="default"
                      variant="outline"
                      className="w-full min-h-[48px] h-auto py-3 text-sm bg-transparent border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:text-red-400 dark:border-red-400 font-display uppercase tracking-wide font-semibold"
                      onClick={handleQuickOrderClick}
                      disabled={stockStatus.isOutOfStock}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Commander maintenant
                    </Button>
                  </div>

                  {/* Trust row — icons instead of bullet text */}
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-200 dark:border-gray-800 pt-3">
                    {[
                      { Icon: Truck, label: 'Livraison 24–72h' },
                      { Icon: CreditCard, label: 'Paiement à la livraison' },
                      { Icon: Shield, label: '100% authentique' },
                    ].map(({ Icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1 text-center">
                        <Icon className="h-4 w-4 text-red-600 dark:text-red-400" strokeWidth={1.75} aria-hidden="true" />
                        <span className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secondary meta: tags + SKU (de-emphasized, below the buy card) */}
                {((product.tags?.length ?? 0) > 0 || product.sku || product.code_product) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {product.tags?.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/shop?search=${encodeURIComponent(tag.designation_fr)}&sort=relevance`}
                        className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-2 py-0.5 hover:border-red-300 hover:text-red-600"
                      >
                        #{tag.designation_fr.toLowerCase()}
                      </Link>
                    ))}
                    {(product.sku || product.code_product) && (
                      <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-2 py-0.5">
                        SKU: {product.sku || product.code_product}
                      </span>
                    )}
                  </div>
                )}
              </div>
          </div>
        </div>

        {/* Description / Nutrition / Questions — full width; spacing so sections never overlap */}
        <section className="mx-auto w-full pt-8 sm:pt-10 lg:pt-12 pb-6 sm:pb-8 border-t border-gray-100 dark:border-gray-800 mt-8 sm:mt-10" aria-label="Description et informations produit">
          <div className="w-full mb-0">
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
                <Tabs defaultValue="description" className="w-full flex flex-col gap-4 sm:gap-5">
                  {/* On mobile: horizontal scroll with spacing so tabs never touch on very small screens; on sm+: equal-width tabs */}
                  <TabsList className="flex w-full shrink-0 bg-gray-100 dark:bg-gray-900 rounded-lg sm:rounded-xl p-2 sm:p-1.5 gap-3 min-[400px]:gap-2 sm:gap-1.5 min-h-[44px] overflow-x-auto overflow-y-hidden flex-nowrap scrollbar-hide sm:overflow-visible">
                    <TabsTrigger value="description" className="rounded-md sm:rounded-lg text-xs sm:text-sm py-2.5 sm:py-2 min-h-[40px] sm:min-h-0 flex-shrink-0 sm:flex-1 min-w-0 px-4 min-[400px]:px-3 sm:px-2 whitespace-nowrap sm:truncate mr-0" title={product.zone1 || 'Description'}>
                      {product.zone1 || 'Description'}
                    </TabsTrigger>
                    <TabsTrigger value="nutrition" className="rounded-md sm:rounded-lg text-xs sm:text-sm py-2.5 sm:py-2 min-h-[40px] sm:min-h-0 flex-shrink-0 sm:flex-1 min-w-0 px-4 min-[400px]:px-3 sm:px-2 whitespace-nowrap sm:truncate mr-0" title={product.zone3 || 'Valeurs nutritionnelles'}>
                      {product.zone3 || 'Valeurs nutritionnelles'}
                    </TabsTrigger>
                    {hasQuestionsTab && (
                      <TabsTrigger value="questions" className="rounded-md sm:rounded-lg text-xs sm:text-sm py-2.5 sm:py-2 min-h-[40px] sm:min-h-0 flex-shrink-0 sm:flex-1 min-w-0 px-4 min-[400px]:px-3 sm:px-2 whitespace-nowrap sm:truncate mr-0" title={product.zone4 || 'Questions'}>
                        {product.zone4 || 'Questions'}
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="description" className="mt-0 pt-0 flex-1 min-h-0 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden focus-visible:outline-none data-[state=inactive]:hidden">
                    <div className="p-4 sm:p-5 lg:p-6 pt-5 sm:pt-6 border-t border-gray-100 dark:border-gray-800">
                    <h2 className="font-display uppercase tracking-tight text-xl sm:text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                      {product.zone1 || 'Description du produit'}
                    </h2>
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
                              <dt className="font-medium text-gray-900 dark:text-white">{row.label}</dt>
                              <dd className="text-gray-600 dark:text-gray-400">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      );
                    })()}
                    <div
                      className={`text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-neutral prose-base max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:dark:text-white prose-p:text-gray-600 prose-p:dark:text-gray-400 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:dark:text-white prose-img:rounded-lg prose-img:shadow-md overflow-hidden transition-[max-height] duration-300 ${descExpanded ? 'max-h-[5000px]' : 'max-h-60'}`}
                      // Sanitised, not raw. These CMS fields carry their own <h1> tags, which rendered as extra
                      // top-level headings on the page whose only h1 should be the product name —
                      // up to thirteen on one product. sanitizeProductHtml demotes them to <h2>.
                      // The crawler view already ran this; the page a customer sees did not.
                      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.description_fr || product.description_cover || generateProductFallbackDescription(product)) }}
                    />
                    <button
                      type="button"
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline mt-3"
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
                    {(() => {
                      const sections = productSourceSections(product);
                      const gallery = productSourceGallery(product);
                      const attribution = productSourceAttribution(product);
                      /*
                       * hasProductSourceContent(), not a hand-written test of two of the four
                       * things this block can render.
                       *
                       * The inline `sections.length === 0 && gallery.length === 0` this replaces
                       * dropped the provenance sentence for any product whose transcribed content is
                       * a Supplement Facts panel and/or specification rows and nothing else — while
                       * /x-crawler/product/[slug] printed it, because that route gates it on nothing
                       * but the sentence existing. Same page, two routes, different facts, which is
                       * the one outcome this pipeline is built to prevent.
                       */
                      if (!hasProductSourceContent(product)) return null;

                      return (
                        <div className="mt-8 space-y-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                          {sections.map((section) => {
                            const html = sanitizeRichHtml(section.html);
                            if (!html) return null;
                            return (
                              <section key={section.key}>
                                <h3 className="font-display uppercase tracking-tight text-lg font-bold mb-2 text-gray-900 dark:text-white">
                                  {section.heading}
                                </h3>
                                <div
                                  className="text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-neutral prose-base max-w-none prose-p:text-gray-600 prose-p:dark:text-gray-400 prose-strong:text-gray-900 prose-strong:dark:text-white"
                                  dangerouslySetInnerHTML={{ __html: html }}
                                />
                              </section>
                            );
                          })}

                          {gallery.length > 0 && (
                            <section>
                              <h3 className="font-display uppercase tracking-tight text-lg font-bold mb-3 text-gray-900 dark:text-white">
                                Photos du produit
                              </h3>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {gallery.map((url, i) => (
                                  <div
                                    key={url}
                                    className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800"
                                  >
                                    <Image
                                      src={url}
                                      alt={`${product.designation_fr || 'Produit'} — photo ${i + 1}/${gallery.length}`}
                                      fill
                                      sizes="(max-width: 640px) 50vw, 33vw"
                                      className="object-contain p-1"
                                      quality={85}
                                    />
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {attribution && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">{attribution}</p>
                          )}
                        </div>
                      );
                    })()}
                    </div>
                  </TabsContent>

                  <TabsContent value="nutrition" className="mt-0 pt-0 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden focus-visible:outline-none data-[state=inactive]:hidden data-[state=inactive]:absolute data-[state=inactive]:pointer-events-none">
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
                      const sourceNutritionHtml = sanitizeRichHtml(productSourceNutritionHtml(product) || '');
                      return (
                        <div className="p-3 sm:p-5 lg:p-6 pt-4 sm:pt-6 border-t border-gray-100 dark:border-gray-800">
                          <h2 className="font-display uppercase tracking-tight text-lg sm:text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            {product.zone3 || 'Valeurs Nutritionnelles'}
                          </h2>

                          {/* Nutrition Images Gallery */}
                          {hasNutritionImages && (
                            <div className="mb-6">
                              {nutritionImages.length === 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setNutritionLightbox(0)}
                                  className="relative group block w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-zoom-in"
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
                                className="nutrition-content text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-neutral prose-sm sm:prose-base max-w-none prose-p:leading-relaxed prose-p:my-1 sm:prose-p:my-2 prose-img:rounded-lg prose-img:shadow-md prose-img:max-w-full prose-img:h-auto prose-table:text-left prose-th:py-2 prose-th:px-2 sm:prose-th:px-3 prose-td:py-2 prose-td:px-2 sm:prose-td:px-3 prose-table:w-full min-w-[280px]"
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
                                className="nutrition-content text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-neutral prose-sm sm:prose-base max-w-none prose-p:leading-relaxed prose-p:my-1 sm:prose-p:my-2 prose-table:text-left prose-th:py-2 prose-th:px-2 sm:prose-th:px-3 prose-td:py-2 prose-td:px-2 sm:prose-td:px-3 prose-table:w-full min-w-[280px]"
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
                              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
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
                  </TabsContent>

                  <TabsContent value="questions" className="mt-0 pt-0 flex-1 min-h-0 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden focus-visible:outline-none data-[state=inactive]:hidden">
                    <div className="p-4 sm:p-5 lg:p-6 pt-5 sm:pt-6 border-t border-gray-100 dark:border-gray-800">
                    <h2 className="font-display uppercase tracking-tight text-xl sm:text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                      {product.zone4 || 'Questions Fréquentes'}
                    </h2>
                    {hasProductFaq ? (
                      <div className="space-y-5">
                        {productFaqItems.map((item) => (
                          <div
                            key={item.id}
                            className="border-b border-gray-100 dark:border-gray-800 pb-5 last:border-0 last:pb-0"
                          >
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-start gap-2">
                              <span className="text-red-600 dark:text-red-400 shrink-0">Q.</span>
                              <span>{item.q || '—'}</span>
                            </h4>
                            <div className="pl-6 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                              {item.a}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : hasLegacyQuestionsHtml ? (
                      <div
                        className="text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-neutral prose-base max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:dark:text-white prose-headings:mb-2 prose-headings:mt-4 prose-p:text-gray-600 prose-p:dark:text-gray-400 prose-p:leading-relaxed prose-p:my-2 prose-strong:text-gray-900 prose-strong:dark:text-white"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.questions || '') }}
                      />
                    ) : null}
                    </div>
                </TabsContent>
              </Tabs>
                );
              })()}
            </div>

            {/* Avis clients — below tabs (no longer sidebar) */}
            <div
              id="reviews"
              className="min-w-0 pt-8 sm:pt-10 border-t border-gray-100 dark:border-gray-800 mt-8 sm:mt-10"
            >
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              <h2 className="font-display uppercase tracking-tight leading-[0.95] text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 sm:pb-4">Avis clients</h2>

              {reviewCount > 0 ? (
                <>
                  {/* Summary — big rating + distribution together in one clean card (stacks on phones) */}
                  <div className="grid gap-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-4 sm:grid-cols-[auto,1fr] sm:items-center sm:gap-8 sm:p-6">
                    <div className="flex flex-col items-center sm:items-start sm:border-r sm:border-gray-200 sm:pr-8 dark:sm:border-gray-800">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display font-bold tracking-tight tabular-nums text-5xl text-gray-900 dark:text-white">
                          {rating > 0 ? rating.toFixed(1) : '–'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-base tabular-nums">/ 5</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 shrink-0 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700'}`}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">Basé sur {reviewCount} avis</p>
                    </div>
                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map((starLevel) => {
                        const count = reviews.filter(r => r.stars === starLevel).length;
                        const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                        return (
                          <div key={starLevel} className="flex items-center gap-2">
                            <span className="flex w-9 shrink-0 items-center gap-0.5 text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                              {starLevel} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-7 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400 tabular-nums">{count}</span>
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
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 font-display text-sm font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{reviewerName}</span>
                              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                                {review.created_at ? new Date(review.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className={`h-3.5 w-3.5 ${i <= review.stars ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200 dark:fill-gray-700'}`} />
                              ))}
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
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                      Tous les avis sont affichés ({reviewCount})
                    </p>
                  )}

                  {/* Add Review Button (logged-in) / login prompt (logged-out) */}
                  {isAuthenticated ? (
                    <Button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide font-semibold"
                      size="default"
                    >
                      {showReviewForm ? 'Annuler' : 'Écrire un avis'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/login')}
                      variant="outline"
                      className="w-full border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:text-red-400 dark:border-red-400 font-display uppercase tracking-wide font-semibold"
                      size="default"
                    >
                      Connectez-vous pour laisser un avis
                    </Button>
                  )}
                </>
              ) : (
                <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                    Aucun avis pour le moment
                  </p>
                  {isAuthenticated ? (
                    <Button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide font-semibold"
                      size="default"
                    >
                      {showReviewForm ? 'Annuler' : 'Écrire un avis'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/login')}
                      variant="outline"
                      className="w-full border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:text-red-400 dark:border-red-400 font-display uppercase tracking-wide font-semibold"
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
                  <h4 className="font-bold mb-2 sm:mb-3 text-xs sm:text-sm lg:text-base text-gray-900 dark:text-white">Votre avis</h4>
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-900 dark:text-white">Note *</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setReviewStars(star)} className="focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`Noter ${star} étoile${star > 1 ? 's' : ''}`}>
                            <Star className={`h-6 w-6 ${star <= reviewStars ? 'fill-amber-400 text-amber-400' : 'fill-gray-300 text-gray-300 dark:fill-gray-600'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold mb-1 text-gray-900 dark:text-white">Commentaire (optionnel)</label>
                      <textarea value={reviewComment} onChange={(e) => { if (e.target.value.length <= 500) setReviewComment(e.target.value); }} className="w-full min-w-0 p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" rows={3} placeholder="Partagez votre expérience..." maxLength={500} />
                      <p className="text-xs mt-0.5 text-gray-500">{reviewComment.length}/500</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSubmitReview} disabled={reviewStars === 0 || isSubmittingReview} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide font-semibold" size="sm">
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
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
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
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
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
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <th scope="col" className="p-3 text-left font-semibold">Produit</th>
                    <th scope="col" className="p-3 text-left font-semibold">Marque</th>
                    <th scope="col" className="p-3 text-left font-semibold">Format</th>
                    <th scope="col" className="p-3 text-left font-semibold">Prix</th>
                    <th scope="col" className="p-3 text-left font-semibold">Disponibilité</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr
                      key={row.id}
                      className={row.isCurrent ? 'bg-orange-50/60 dark:bg-orange-950/20' : undefined}
                    >
                      <th scope="row" className="border-t border-gray-100 p-3 text-left font-normal dark:border-gray-800">
                        {row.isCurrent ? (
                          <span aria-current="true" className="font-semibold">
                            {row.name} <span className="font-normal text-gray-500">(cette page)</span>
                          </span>
                        ) : (
                          <Link href={row.url} className="text-red-700 hover:underline dark:text-red-400">
                            {row.name}
                          </Link>
                        )}
                      </th>
                      <td className="border-t border-gray-100 p-3 dark:border-gray-800">{row.brand || '—'}</td>
                      <td className="border-t border-gray-100 p-3 dark:border-gray-800">{row.format || '—'}</td>
                      <td className="border-t border-gray-100 p-3 dark:border-gray-800">
                        {formatTnd(row.price)}
                        {row.hasPromo && <span className="ml-1 text-green-700 dark:text-green-400">promo</span>}
                      </td>
                      <td className="border-t border-gray-100 p-3 dark:border-gray-800">
                        {row.inStock ? 'En stock' : 'En rupture'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
        className="lg:hidden fixed bottom-tabbar left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 px-3 pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-sticky-cta"
        // Was z-50 — above the tab bar — so this bar painted over the raised Boutique tile on
        // every product page. Now below it, with `--tabbar-raise` of bottom padding so the tile
        // overlaps this surface and never these buttons. dark:bg-gray-950 matches the tab bar so
        // the tile's ring cut-out blends instead of showing a halo.
        // The safe-area inset moved into --tabbar-h itself; padding for it here would double it.
        style={{ paddingBottom: 'calc(var(--tabbar-raise) + 0.5rem)' }}
      >
        <div className="w-full mx-auto max-w-7xl flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex flex-col leading-tight shrink-0">
              <span className="text-[10px] font-display uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</span>
              <span className="font-display font-bold tracking-tight tabular-nums text-lg text-red-600 dark:text-red-400">
                {(displayPrice * quantity).toFixed(2)} DT
              </span>
            </div>
            <Button
              size="default"
              className="flex-1 min-w-0 min-h-[44px] h-auto py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide font-bold"
              onClick={handleAddToCart}
              disabled={stockStatus.isOutOfStock}
              aria-label="Ajouter au panier"
            >
              <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
              {stockStatus.isOutOfStock ? 'Rupture' : 'Ajouter au panier'}
            </Button>
          </div>
          <Button
            size="default"
            variant="outline"
            className="w-full min-h-[44px] h-auto py-2 text-sm bg-transparent border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:text-red-400 dark:border-red-400 font-display uppercase tracking-wide font-semibold"
            onClick={handleQuickOrderClick}
            disabled={stockStatus.isOutOfStock}
            aria-label="Commander maintenant"
          >
            <Zap className="h-4 w-4 mr-2 shrink-0" />
            Commander maintenant
          </Button>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
