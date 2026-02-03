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
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Minus, Plus, ShoppingCart, Star, Shield, Truck, Award, ArrowLeft, Heart, Share2, ZoomIn, CheckCircle2, Loader2, BadgeCheck, Search, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/app/components/ui/card';
import type { Product, Review, FAQ } from '@/types';
import { getStorageUrl, addReview, getProductDetails, getFAQs } from '@/services/api';
import { hasValidPromo } from '@/util/productPrice';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProductDetailClientProps {
  product: Product;
  similarProducts: Product[];
}

export function ProductDetailClient({ product: initialProduct, similarProducts }: ProductDetailClientProps) {
  const router = useRouter();
  const params = useParams();
  const productSlug = params?.id as string;
  const { addToCart } = useCart();
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

  // Use state to manage product data so we can update it after adding a review
  const [product, setProduct] = useState<Product>(initialProduct);
  // Backend already filters reviews by publier = 1 in the relationship, so use all reviews returned
  // The publier field is hidden in JSON response, so we can't filter on frontend
  const [reviews, setReviews] = useState<Review[]>(initialProduct.reviews || []);
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Update product and reviews when initialProduct changes
  useEffect(() => {
    setProduct(initialProduct);
    // Backend's reviews() relationship already filters by publier = 1, so all returned reviews are published
    const productReviews = initialProduct.reviews || [];
    setReviews(productReviews);

    // Fetch FAQs
    getFAQs().then(data => {
      setFaqs(data);
    }).catch(err => console.error('Error fetching FAQs:', err));
  }, [initialProduct]);

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
  const reviewsToShowOnPage = filteredReviews.slice(0, 5);

  const images = product.cover ? [product.cover] : [];
  const productImage = images[0] ? getStorageUrl(images[0]) : '';

  const handleAddToCart = () => {
    // Check if product is out of stock
    if (product.rupture !== 1) {
      toast.error('Rupture de stock - Ce produit n\'est pas disponible');
      return;
    }

    // Transform product to match cart expectations
    const cartProduct = {
      ...product,
      name: product.designation_fr,
      price: displayPrice,
      priceText: `${displayPrice} DT`,
      image: productImage,
    };

    for (let i = 0; i < quantity; i++) {
      addToCart(cartProduct as any);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-6 lg:py-12 pb-20 lg:pb-12">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 sm:mb-6"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-10 mb-6 sm:mb-10 lg:mb-16">
          {/* LEFT: Product (images + info + description tabs) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-12">
              {/* Product Images */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 sm:space-y-4"
              >
                {/* Main Image */}
                <div className="relative aspect-square bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl border border-gray-200 dark:border-gray-800 group min-h-0">
                  {productImage ? (
                    <Image
                      src={productImage}
                      alt={product.designation_fr}
                      fill
                      className="object-contain p-4 sm:p-6 lg:p-8 group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 50vw"
                      priority
                      onError={(e) => {
                        // Fallback to placeholder if image fails
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
              </motion.div>

              {/* Product Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4 sm:space-y-6 min-w-0"
              >
                {/* Badges */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {discount > 0 && (
                    <Badge className="bg-red-600 text-white text-sm px-3 py-1">
                      -{discount}% OFF
                    </Badge>
                  )}
                  {product.new_product === 1 && (
                    <Badge className="bg-blue-600 text-white text-sm px-3 py-1">
                      Nouveau
                    </Badge>
                  )}
                  {product.best_seller === 1 && (
                    <Badge className="bg-yellow-600 text-white text-sm px-3 py-1">
                      Top Vendu
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {product.rupture === 1 ? 'En Stock' : 'Rupture de stock'}
                  </Badge>
                </div>

                {/* Product Name */}
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 leading-tight break-words">
                    {product.designation_fr}
                  </h1>
                  {product.brand && (
                    <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 mb-1">
                      {product.brand.designation_fr}
                    </p>
                  )}
                  {product.sous_categorie && (
                    <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 mb-2">
                      {product.sous_categorie.designation_fr}
                    </p>
                  )}
                  {product.code_product && (
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mb-2">
                      Code produit: {product.code_product}
                    </p>
                  )}
                </div>

                {/* Aromes (Flavors) */}
                {product.aromes && product.aromes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white">
                      Arômes disponibles
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {product.aromes.map((arome) => (
                        <Badge key={arome.id} variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                          {arome.designation_fr}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rating */}
                {rating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${i < Math.floor(rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">
                      ({rating.toFixed(1)}) • {reviewCount} avis
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="py-4 sm:py-6 border-y border-gray-200 dark:border-gray-800">
                  <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400">
                      {displayPrice} DT
                    </span>
                    {oldPrice && (
                      <span className="text-lg sm:text-xl md:text-2xl text-gray-400 line-through">
                        {oldPrice} DT
                      </span>
                    )}
                  </div>
                  {oldPrice && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      Vous économisez {oldPrice - displayPrice} DT
                    </p>
                  )}
                </div>

                {/* Quantity Selector */}
                <div className="space-y-3 sm:space-y-4">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white">
                    Quantité
                  </label>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-800 rounded-xl p-2 min-h-[44px]">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 min-w-0">
                      Total: <span className="font-bold text-lg text-gray-900 dark:text-white">
                        {(displayPrice * quantity).toFixed(0)} DT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    size="lg"
                    className="flex-1 min-h-[48px] sm:min-h-[56px] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-base sm:text-lg font-bold shadow-lg"
                    onClick={handleAddToCart}
                    disabled={product.rupture !== 1}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    {product.rupture === 1 ? 'Ajouter au panier' : 'Rupture de stock'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-[48px] sm:min-h-[56px] px-4 sm:px-6 shrink-0"
                    onClick={() => setIsFavorite(!isFavorite)}
                  >
                    <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-600 text-red-600' : ''}`} />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-[48px] sm:min-h-[56px] px-4 sm:px-6 shrink-0"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: product.designation_fr,
                          text: product.description_fr || '',
                          url: window.location.href,
                        });
                      }
                    }}
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex flex-col items-center gap-1 sm:gap-2 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl min-w-0">
                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">Paiement Sécurisé</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 sm:gap-2 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl min-w-0">
                    <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">Livraison 2-3 j</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 sm:gap-2 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl min-w-0">
                    <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">Garantie Qualité</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Product Details Tabs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full min-w-0">
              <Tabs defaultValue="description" className="w-full">
                <TabsList className={`grid w-full mb-4 sm:mb-6 bg-gray-100 dark:bg-gray-900 rounded-lg sm:rounded-xl p-1 gap-1 ${product.nutrition_values ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <TabsTrigger value="description" className="rounded-md sm:rounded-lg text-xs sm:text-sm py-2">Description</TabsTrigger>
                  {product.nutrition_values && (
                  <TabsTrigger value="nutrition" className="rounded-md sm:rounded-lg text-xs sm:text-sm py-2">Nutrition</TabsTrigger>
                  )}
                  <TabsTrigger value="questions" className="rounded-md sm:rounded-lg text-xs sm:text-sm py-2">Questions</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-gray-800 mt-0">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Description du produit</h3>
                  <div
                    className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: product.description_fr || product.description_cover || 'Aucune description disponible.' }}
                  />
                </TabsContent>

                {product.nutrition_values && (
                <TabsContent value="nutrition" className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-gray-800 mt-0">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6">Valeurs Nutritionnelles</h3>
                    <div
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.nutrition_values }}
                    />
                </TabsContent>
                )}

                <TabsContent value="questions" className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-gray-800 mt-0">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Questions Fréquentes</h3>
                  {product.questions ? (
                    <div
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed prose prose-sm max-w-none"
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
            </motion.div>
          </div>

          {/* RIGHT: Comprehensive Reviews Section (Sidebar) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-1 min-w-0"
          >
            <div className="lg:sticky lg:top-4 space-y-3 sm:space-y-4 lg:space-y-6">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2 sm:pb-3">Avis clients</h3>

              {reviewCount > 0 ? (
                <>
                  {/* Overall Rating */}
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-900/50">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>100% authentique</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                        {rating > 0 ? rating.toFixed(1) : '–'}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">/ 5</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2 sm:mb-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 shrink-0 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700'}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Basé sur {reviewCount} avis
                    </p>
                  </div>

                  {/* Rating Distribution */}
                  <div className="space-y-2">
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

                  {/* What customers say */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Ce que disent les clients</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      Les clients apprécient la qualité élevée et les ingrédients détaillés de ce produit. 
                      Beaucoup soulignent son efficacité et sa facilité d'utilisation. 
                      La qualité du produit et son rapport qualité-prix sont également salués.
                    </p>
                  </div>

                  {/* Review Highlights */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Points forts des avis</h3>
                    <div className="flex flex-wrap gap-2">
                      {['Qualité élevée', 'Efficace', 'Bon rapport qualité-prix', 'Facile à utiliser'].map((tag) => (
                        <Badge key={tag} className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0 px-2 py-1 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Sample Reviews */}
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

                  {/* See More Reviews Button - Always show to navigate to full reviews page */}
                  <Button variant="outline" className="w-full" size="default" asChild>
                    <Link href={`/products/${product.slug}/reviews`} className="flex items-center justify-center gap-2">
                      Voir tous les avis ({reviewCount})
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  {/* Add Review Button */}
                  {isAuthenticated && (
                    <Button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      size="default"
                    >
                      {showReviewForm ? 'Annuler' : 'Écrire un avis'}
                    </Button>
                  )}
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
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="min-w-0"
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 lg:mb-8">
              Produits similaires
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
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

      {/* Sticky Add to Cart (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 safe-area-pb">
        <div className="max-w-7xl mx-auto flex items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 truncate">
              {(displayPrice * quantity).toFixed(0)} DT
            </p>
          </div>
          <Button
            size="lg"
            className="flex-1 min-h-[48px] sm:min-h-[52px] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-base font-semibold shrink-0"
            onClick={handleAddToCart}
            disabled={product.rupture !== 1}
          >
            <ShoppingCart className="h-5 w-5 mr-2 shrink-0" />
            {product.rupture === 1 ? 'Ajouter' : 'Rupture'}
          </Button>
        </div>
      </div>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
