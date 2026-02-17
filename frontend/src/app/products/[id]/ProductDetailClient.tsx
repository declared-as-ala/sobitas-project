'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { useCart } from '@/app/contexts/CartContext';
import { ProductCard } from '@/app/components/ProductCard';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Minus, Plus, ShoppingCart, Star, Shield, Truck, Award, ArrowLeft, Heart, Share2, ZoomIn, CheckCircle2, Loader2, BadgeCheck, Search, ChevronRight, Zap } from 'lucide-react';
import { QuickOrderDrawer } from '@/app/components/QuickOrderDrawer';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/app/components/ui/card';
import type { Product, Review, FAQ } from '@/types';
import { getStorageUrl, addReview, getProductDetails, getFAQs } from '@/services/api';
import { hasValidPromo } from '@/util/productPrice';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getStockDisponible,
  getMaxAddable,
} from '@/util/cartStock';

interface ProductDetailClientProps {
  product: Product;
  similarProducts: Product[];
  /** When rendering under /shop/[slug], pass slug so refetch/links work */
  slugOverride?: string;
}

export function ProductDetailClient({ product: initialProduct, similarProducts, slugOverride }: ProductDetailClientProps) {
  const router = useRouter();
  const params = useParams();
  const productSlug = (slugOverride ?? (params?.slug as string) ?? (params?.id as string)) ?? '';
  const { addToCart, getCartQty, setCartDrawerOpen, getTotalItems } = useCart();
  const { isAuthenticated, user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSort, setReviewSort] = useState<'recent' | 'helpful'>('recent');
  const [reviewSearch, setReviewSearch] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  // Use state to manage product data so we can update it after adding a review
  const [product, setProduct] = useState<Product>(initialProduct);
  // Backend already filters reviews by publier = 1 in the relationship, so use all reviews returned
  // The publier field is hidden in JSON response, so we can't filter on frontend
  const [reviews, setReviews] = useState<Review[]>(initialProduct.reviews || []);
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Scroll to avis section when URL has #reviews (e.g. after opening shared link)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#reviews') {
      const el = document.getElementById('reviews');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Stock disponible (qte from API or rupture-based)
  const stockDisponible = getStockDisponible(product as any);
  const inCartQty = getCartQty(product.id);

  // Update product and reviews when initialProduct changes
  useEffect(() => {
    setProduct(initialProduct);
    // Backend's reviews() relationship already filters by publier = 1, so all returned reviews are published
    const productReviews = initialProduct.reviews || [];
    setReviews(productReviews);

    // Debug: Log nutrition_values to check if it's being returned
    if (process.env.NODE_ENV === 'development') {
      console.log('Product nutrition_values:', initialProduct.nutrition_values);
      console.log('Product questions:', initialProduct.questions);
    }

    // Fetch FAQs
    getFAQs().then(data => {
      setFaqs(data);
    }).catch(err => console.error('Error fetching FAQs:', err));
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

  // Filter and sort reviews for display (on product page show first N; full list on reviews page)
  const filteredReviews = [...reviews]
    .filter(r => !reviewSearch || (r.comment?.toLowerCase().includes(reviewSearch.toLowerCase())))
    .sort((a, b) => {
      if (reviewSort === 'recent') {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      }
      return 0;
    });
  const reviewsToShowOnPage = filteredReviews.slice(0, 3);

  const images = product.cover ? [product.cover] : [];
  const productImage = images[0] ? getStorageUrl(images[0]) : '';

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

  /** Cart logic: unchanged. "Commande rapide" uses QuickOrderDrawer and does not add to or clear cart. */
  const handleAddToCart = () => {
    if (stockDisponible <= 0) {
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

    const cartProduct = {
      ...product,
      name: product.designation_fr,
      price: displayPrice,
      priceText: `${displayPrice} DT`,
      image: productImage,
    };
    addToCart(cartProduct as any, quantity);
    toast.success('Produit ajouté au panier');
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-0 sm:py-6 lg:py-12 pb-24 lg:pb-12">
        {/* Mobile: Sticky top bar — Back + Logo + Cart */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 h-12 px-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 shrink-0" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center min-w-0 flex-1 justify-center" aria-label="Accueil">
            <span className="text-base font-semibold text-gray-900 dark:text-white truncate">SOBITAS</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setCartDrawerOpen(true)} className="relative h-10 w-10 shrink-0" aria-label="Panier">
            <ShoppingCart className="h-5 w-5" />
            {getTotalItems() > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center">
                {getTotalItems() > 99 ? '99+' : getTotalItems()}
              </span>
            )}
          </Button>
        </div>

        {/* Back Button — desktop only */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 sm:mb-6 hidden lg:block"
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </motion.div>

        {/* Desktop: 2 cols — left ~40% image (sticky), right ~60% info + tabs + reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-10 mb-6 sm:mb-10 lg:mb-16">
          {/* LEFT (desktop only): Image column — narrower, sticky */}
          <div className="hidden lg:block lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-800 group"
              style={{ aspectRatio: '1 / 1.15' }}
            >
              {productImage ? (
                <Image
                  src={productImage}
                  alt={product.designation_fr}
                  fill
                  className="object-contain p-4 lg:p-5 group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  priority
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
            </motion.div>
          </div>

          {/* RIGHT: Info + tabs + reviews (mobile: full flow with image first) */}
          <div className="lg:col-span-3 min-w-0 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Mobile Layout: compact, conversion-focused */}
            <div className="lg:hidden space-y-3">
              {/* Gallery: full-width, aspect ratio reserved */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                style={{ aspectRatio: '1 / 1' }}
              >
                {productImage ? (
                  <Image
                    src={productImage}
                    alt={product.designation_fr}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 768px) 100vw, 60vw"
                    priority
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.error-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'error-placeholder absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800';
                        placeholder.innerHTML = '<svg class="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </motion.div>

              <div className="px-1 space-y-2">
                {/* Title: max 2 lines */}
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                  {product.designation_fr}
                </h1>

                {/* Rating: clickable → #reviews */}
                {rating > 0 && (
                  <button
                    type="button"
                    onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700'}`}
                        />
                      ))}
                    </div>
                    <span>({reviewCount} avis)</span>
                  </button>
                )}

                {/* Price: big current + small old + discount badge */}
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">{displayPrice} DT</span>
                  {oldPrice && (
                    <>
                      <span className="text-base text-gray-400 line-through">{oldPrice} DT</span>
                      {discount > 0 && (
                        <Badge className="bg-red-600 text-white text-xs px-1.5 py-0">-{discount}%</Badge>
                      )}
                    </>
                  )}
                </div>

                {/* Stock + promo badges: small, one line */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                    {product.rupture === 1 ? 'En stock' : 'Rupture'}
                  </span>
                  {product.new_product === 1 && <Badge className="text-[10px] px-1.5 py-0 bg-blue-600">Nouveau</Badge>}
                  {product.best_seller === 1 && <Badge className="text-[10px] px-1.5 py-0 bg-amber-600">Top</Badge>}
                </div>
              </div>

              {/* Compact trust row: 3 items, one line */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <Shield className="h-3.5 w-3.5 text-green-600" /> Paiement à la livraison
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <Truck className="h-3.5 w-3.5 text-blue-600" /> 24–72h
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <Award className="h-3.5 w-3.5 text-amber-600" /> Authentiques
                </span>
              </div>

              {/* Variants (arômes): pills */}
              {product.aromes && product.aromes.length > 0 && (
                <div className="px-1">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Arômes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.aromes.map((arome) => (
                      <Badge key={arome.id} variant="outline" className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-800">
                        {arome.designation_fr}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity: compact stepper + total */}
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="Diminuer"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center text-sm font-semibold" aria-live="polite">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={() => setQuantity(Math.min(stockDisponible, quantity + 1))}
                    disabled={quantity >= stockDisponible || stockDisponible <= 0}
                    aria-label="Augmenter"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Total <strong className="text-gray-900 dark:text-white">{(displayPrice * quantity).toFixed(0)} DT</strong>
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setIsFavorite(!isFavorite)} aria-label="Favoris">
                    <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-600 text-red-600' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleShare} aria-label="Partager">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop Layout: Info only (image in left column). Order: Title → Rating → Price → Meta Description */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:block space-y-3 min-w-0"
            >
                {/* Badges (stock, promo) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {product.rupture === 1 ? 'En Stock' : 'Rupture de stock'}
                  </Badge>
                  {discount > 0 && <Badge className="bg-red-600 text-white">-{discount}% OFF</Badge>}
                  {product.new_product === 1 && <Badge className="bg-blue-600 text-white">Nouveau</Badge>}
                  {product.best_seller === 1 && <Badge className="bg-yellow-600 text-white">Top Vendu</Badge>}
                </div>

                {/* 1. Title (H1) only */}
                <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white leading-snug line-clamp-3 break-words">
                  {product.designation_fr}
                </h1>

                {/* 2. Rating */}
                {rating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-5 w-5 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 dark:fill-gray-700 text-gray-200 dark:text-gray-700'}`} />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">({rating.toFixed(1)}) · {reviewCount} avis</span>
                  </div>
                )}

                {/* 3. Price — prominent */}
                <div className="py-3 border-y border-gray-200 dark:border-gray-800">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl lg:text-4xl font-bold text-red-600 dark:text-red-400">{displayPrice} DT</span>
                    {oldPrice && <span className="text-xl text-gray-400 line-through">{oldPrice} DT</span>}
                  </div>
                  {oldPrice && <p className="text-sm text-green-600 dark:text-green-400 mt-1">Vous économisez {oldPrice - displayPrice} DT</p>}
                </div>

                {/* 4. Meta Description - short SEO snippet */}
                {metaDescription && (
                  <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                    {metaDescription}
                  </p>
                )}

                {/* Category, Code, Brand - lighter metadata */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                  {product.brand && <span>{product.brand.designation_fr}</span>}
                  {product.sous_categorie?.slug && (
                    <Link href={`/category/${product.sous_categorie!.slug}`} className="text-red-600 dark:text-red-400 hover:underline">
                      {product.sous_categorie.designation_fr}
                    </Link>
                  )}
                  {product.code_product && <span>Code: {product.code_product}</span>}
                </div>

                {/* 5. Quantity + CTA — visible without scroll */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-1.5 min-h-[44px]">
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Diminuer la quantité">
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-semibold" aria-live="polite">{quantity}</span>
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQuantity(Math.min(stockDisponible, quantity + 1))} disabled={quantity >= stockDisponible || stockDisponible <= 0} aria-label="Augmenter la quantité">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total: <strong className="text-gray-900 dark:text-white">{(displayPrice * quantity).toFixed(0)} DT</strong></span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      size="lg"
                      className="flex-1 min-h-[52px] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-base font-bold shadow-lg"
                      onClick={handleAddToCart}
                      disabled={stockDisponible <= 0}
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {stockDisponible <= 0 ? 'Rupture de stock' : 'Ajouter au panier'}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 min-h-[52px] border-2 border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-base font-bold"
                      onClick={() => setQuickOrderOpen(true)}
                      disabled={stockDisponible <= 0}
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      Commande rapide
                    </Button>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setIsFavorite(!isFavorite)} aria-label="Favoris">
                        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-600 text-red-600' : ''}`} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-11 w-11" onClick={handleShare} aria-label="Partager">
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 7. Aromes */}
                {product.aromes && product.aromes.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white">Arômes disponibles</label>
                    <div className="flex flex-wrap gap-2">
                      {product.aromes.map((arome) => (
                        <Badge key={arome.id} variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {arome.designation_fr}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. Trust badges — desktop: 3 cols */}
                <div className="grid grid-cols-3 gap-4 border-t border-gray-200 dark:border-gray-800 pt-5">
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 shadow-sm min-h-[80px]">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-green-600 dark:text-green-400" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Paiement</p>
                      <p className="text-sm text-green-700 dark:text-green-400">Sécurisé</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 shadow-sm min-h-[80px]">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Livraison</p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">2-3 jours</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 shadow-sm min-h-[80px]">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Garantie</p>
                      <p className="text-sm text-amber-700 dark:text-amber-400">Qualité</p>
                    </div>
                  </div>
                </div>
              </motion.div>
          </div>
        </div>

        {/* Description / Nutrition / Questions — mobile: accordions; desktop: tabs */}
        <section className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 lg:pt-8 pb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full">
            {(() => {
              const hasNutritionContent = product.nutrition_values != null &&
                String(product.nutrition_values).trim() !== '' &&
                String(product.nutrition_values).trim() !== '<p></p>' &&
                String(product.nutrition_values).trim() !== '<p><br></p>';
              const hasQuestions = product.questions != null &&
                String(product.questions).trim() !== '' &&
                String(product.questions).trim() !== '<p></p>' &&
                String(product.questions).trim() !== '<p><br></p>';
              const tabCount = hasQuestions ? 3 : 2;

              const descriptionHtml = product.description_fr || product.description_cover || 'Aucune description disponible.';
              const livraisonPaiement = (
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p><strong className="text-gray-900 dark:text-white">Paiement :</strong> À la livraison (espèces ou carte). Paiement sécurisé en ligne possible.</p>
                  <p><strong className="text-gray-900 dark:text-white">Livraison :</strong> 24–72h en Tunisie. Livraison gratuite à partir de 300 DT.</p>
                </div>
              );

              return (
                <>
                  {/* Mobile: Accordions */}
                  <div className="md:hidden">
                    <Accordion type="multiple" defaultValue={[]} className="w-full space-y-0 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                      <AccordionItem value="description" className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                        <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-left">
                          {product.zone1 || 'Description'}
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div
                            className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed prose prose-sm max-w-none overflow-hidden ${descExpanded ? '' : 'max-h-32'}`}
                            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                          />
                          <button type="button" onClick={() => setDescExpanded(!descExpanded)} className="text-xs font-medium text-red-600 dark:text-red-400 mt-2">
                            {descExpanded ? 'Voir moins' : 'Lire plus'}
                          </button>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="nutrition" className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                        <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-left">
                          {product.zone3 || 'Valeurs nutritionnelles'}
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          {hasNutritionContent ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.nutrition_values || '' }} />
                          ) : (
                            <p className="text-sm text-gray-500">Non disponible.</p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                      {hasQuestions && (
                        <AccordionItem value="questions" className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                          <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-left">
                            {product.zone4 || 'Questions'}
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            {product.questions?.trim() ? (
                              <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.questions }} />
                            ) : faqs.length > 0 ? (
                              <div className="space-y-3">
                                {faqs.map((faq) => (
                                  <div key={faq.id}>
                                    <p className="font-medium text-gray-900 dark:text-white">{faq.question}</p>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{faq.reponse}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">Aucune question.</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      <AccordionItem value="livraison" className="last:border-b-0">
                        <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-left">
                          Livraison & paiement
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">{livraisonPaiement}</AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  {/* Desktop: Tabs */}
                  <div className="hidden md:block">
                    <Tabs defaultValue="description" className="w-full">
                      <TabsList className={`grid w-full mb-3 sm:mb-4 bg-gray-100 dark:bg-gray-900 rounded-lg sm:rounded-xl p-1 gap-1 ${tabCount === 3 ? 'grid-cols-3' : tabCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <TabsTrigger value="description" className="rounded-md sm:rounded-lg text-xs sm:text-sm py-2">
                          {product.zone1 || 'Description'}
                        </TabsTrigger>
                        <TabsTrigger value="nutrition" className="rounded-md sm:rounded-lg text-xs sm:text-sm py-2">
                          {product.zone3 || 'Valeurs Nutritionnelles'}
                        </TabsTrigger>
                        {hasQuestions && (
                          <TabsTrigger value="questions" className="rounded-md sm:rounded-lg text-xs sm:text-sm py-2">
                            {product.zone4 || 'Questions'}
                          </TabsTrigger>
                        )}
                      </TabsList>

                      <TabsContent value="description" className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-800 mt-0">
                        <h3 className="text-lg sm:text-xl font-bold mb-3 text-gray-900 dark:text-white">
                          {product.zone1 || 'Description du produit'}
                        </h3>
                        <div
                          className={`text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-base max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:dark:text-white prose-p:text-gray-600 prose-p:dark:text-gray-400 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:dark:text-white prose-img:rounded-lg prose-img:shadow-md overflow-hidden transition-[max-height] duration-300 ${descExpanded ? 'max-h-[5000px]' : 'max-h-60'}`}
                          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                        />
                        <button
                          type="button"
                          onClick={() => setDescExpanded(!descExpanded)}
                          className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline mt-3"
                        >
                          {descExpanded ? 'Voir moins' : 'Lire plus'}
                        </button>
                      </TabsContent>

                      <TabsContent value="nutrition" className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-800 mt-0">
                        <h3 className="text-lg sm:text-xl font-bold mb-3 text-gray-900 dark:text-white">
                          {product.zone3 || 'Valeurs Nutritionnelles'}
                        </h3>
                        {hasNutritionContent ? (
                          <div
                            className="text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-base max-w-none prose-p:leading-relaxed prose-img:rounded-lg prose-img:shadow-md prose-img:w-full prose-img:h-auto"
                            dangerouslySetInnerHTML={{ __html: product.nutrition_values || '' }}
                          />
                        ) : (
                          <div className="text-center py-6 sm:py-8">
                            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                              Les valeurs nutritionnelles ne sont pas disponibles pour ce produit.
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="questions" className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-800 mt-0">
                        <h3 className="text-lg sm:text-xl font-bold mb-3 text-gray-900 dark:text-white">
                          {product.zone4 || 'Questions Fréquentes'}
                        </h3>
                        {product.questions && product.questions.trim() !== '' ? (
                          <div
                            className="text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-base max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:dark:text-white prose-headings:mb-2 prose-headings:mt-4 prose-p:text-gray-600 prose-p:dark:text-gray-400 prose-p:leading-relaxed prose-p:my-2 prose-strong:text-gray-900 prose-strong:dark:text-white"
                            dangerouslySetInnerHTML={{ __html: product.questions }}
                          />
                        ) : faqs.length > 0 ? (
                        <div className="space-y-4">
                          {faqs.map((faq) => (
                            <div key={faq.id} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-start gap-2">
                                <span className="text-red-600 dark:text-red-400 shrink-0">Q.</span>
                                {faq.question}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 pl-6">
                                {faq.reponse}
                              </p>
                            </div>
                          ))}
                        </div>
                  ) : (
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      Aucune question pour le moment. N'hésitez pas à nous contacter si vous avez des questions spécifiques.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
                  </div>
                </>
              );
            })()}
          </motion.div>

            {/* Avis clients — compact on mobile */}
            <motion.div
              id="reviews"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="min-w-0 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-800"
            >
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white pb-2 sm:pb-3">Avis clients</h3>

              {reviewCount > 0 ? (
                <>
                  {/* Overall Rating — compact on mobile */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {rating > 0 ? rating.toFixed(1) : '–'}
                      </span>
                      <span className="text-gray-500 text-sm">/ 5</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 shrink-0 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {reviewCount} avis
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-9 text-xs" asChild>
                        <Link href={`/shop/${encodeURIComponent(product.slug ?? '')}#reviews`}>
                          Voir tous les avis
                        </Link>
                      </Button>
                      {isAuthenticated && (
                        <Button size="sm" className="h-9 text-xs bg-red-600 hover:bg-red-700" onClick={() => setShowReviewForm(!showReviewForm)}>
                          {showReviewForm ? 'Annuler' : 'Écrire un avis'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Rating Distribution — compact on mobile */}
                  <div className="space-y-1.5 sm:space-y-2">
                    {[5, 4, 3, 2, 1].map((starLevel) => {
                      const count = reviews.filter(r => r.stars === starLevel).length;
                      const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                      return (
                        <div key={starLevel} className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300 w-6 shrink-0">{starLevel}</span>
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right shrink-0">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sample Reviews — 2–3 preview */}
                  <div className="space-y-2 sm:space-y-3">
                    {reviewsToShowOnPage.map((review) => (
                      <div key={review.id} className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${i <= review.stars ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200 dark:fill-gray-700'}`} />
                            ))}
                          </div>
                          <span className="text-[10px] sm:text-xs font-semibold text-gray-900 dark:text-white truncate">{review.user?.name || 'Client'}</span>
                          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>

                </>
              ) : (
                <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                    Aucun avis pour le moment
                  </p>
                  {isAuthenticated && (
                    <Button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      size="default"
                    >
                      {showReviewForm ? 'Annuler' : 'Écrire un avis'}
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
                            <Star className={`h-6 w-6 ${star <= reviewStars ? 'fill-orange-500 text-orange-500' : 'fill-gray-300 text-gray-300 dark:fill-gray-600'}`} />
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
                      <Button onClick={handleSubmitReview} disabled={reviewStars === 0 || isSubmittingReview} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" size="sm">
                        {isSubmittingReview ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Publication...</> : 'Publier'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setShowReviewForm(false); setReviewStars(0); setReviewComment(''); }}>Annuler</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* Similar Products: mobile horizontal carousel (1.2 cards), desktop grid */}
        {similarProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="min-w-0"
          >
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 md:mb-6 px-1">
              Produits similaires
            </h2>
            <div className="md:hidden overflow-x-auto snap-x snap-mandatory flex gap-3 pb-2 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {similarProducts.map((similarProduct, index) => (
                <div key={similarProduct.id || `similar-${index}`} className="flex-shrink-0 w-[78%] sm:w-[72%] snap-start">
                  <ProductCard product={similarProduct} variant="compact" />
                </div>
              ))}
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
              {similarProducts.map((similarProduct, index) => (
                <ProductCard
                  key={similarProduct.id || `similar-${index}`}
                  product={similarProduct}
                  variant="compact"
                />
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Sticky bottom buy bar (mobile only): Total + Ajouter + Commande rapide, safe-area */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400 truncate">
              {(displayPrice * quantity).toFixed(0)} DT
            </p>
          </div>
          <Button
            size="lg"
            className="flex-1 min-h-[44px] sm:min-h-[48px] bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shrink-0"
            onClick={handleAddToCart}
            disabled={stockDisponible <= 0}
          >
            <ShoppingCart className="h-4 w-4 mr-1.5 shrink-0" />
            {stockDisponible <= 0 ? 'Rupture' : 'Ajouter'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="min-h-[44px] w-11 sm:w-auto sm:min-h-[48px] sm:px-3 border border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium shrink-0"
            onClick={() => setQuickOrderOpen(true)}
            disabled={stockDisponible <= 0}
            aria-label="Commande rapide"
          >
            <Zap className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline text-sm">Rapide</span>
          </Button>
        </div>
      </div>

      <QuickOrderDrawer
        open={quickOrderOpen}
        onOpenChange={setQuickOrderOpen}
        productId={product.id}
        productName={product.designation_fr || ''}
        quantity={quantity}
        unitPrice={displayPrice}
        onSuccess={() => {}}
      />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
