'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import {
  Star,
  Shield,
  Search,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Product, Review } from '@/types';
import { getStorageUrl, addReview } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';


interface ProductReviewsPageClientProps {
  product: Product;
}

function ReviewCard({
  review,
  showFullComment,
  onToggleComment,
}: {
  review: Review;
  showFullComment: boolean;
  onToggleComment: () => void;
}) {
  const comment = review.comment || '';
  const isLong = comment.length > 300;
  const displayComment = showFullComment || !isLong ? comment : comment.slice(0, 300) + '…';
  const dateStr = review.created_at
    ? new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '–';
  const initials = review.user?.name
    ? review.user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <article className="p-3 sm:p-4 lg:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm min-w-0">
      <div className="flex gap-2 sm:gap-3 lg:gap-4">
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs sm:text-sm lg:text-base font-semibold text-gray-600 dark:text-gray-300">
          {initials}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
            <span className="font-bold text-xs sm:text-sm lg:text-base text-gray-900 dark:text-white truncate">{review.user?.name || 'Client'}</span>
            <span className="text-gray-400 dark:text-gray-500 shrink-0">•</span>
            <span className="text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 shrink-0 ${i <= review.stars ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700'}`}
              />
            ))}
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{review.stars}/5</span>
          </div>
          {comment && (
            <>
              <p className="text-xs sm:text-sm lg:text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                {displayComment}
              </p>
              {isLong && (
                <button
                  type="button"
                  onClick={onToggleComment}
                  className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium mt-1.5 sm:mt-2 hover:underline min-h-[44px]"
                >
                  {showFullComment ? 'Voir moins' : 'Voir plus'}
                </button>
              )}
            </>
          )}
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3">Avis à titre informatif, non médical.</p>
        </div>
      </div>
    </article>
  );
}

export function ProductReviewsPageClient({ product }: ProductReviewsPageClientProps) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(product.reviews || []);
  const [reviewSort, setReviewSort] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [reviewSearch, setReviewSearch] = useState('');
  const [starFilter, setStarFilter] = useState<number[]>([]);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    setReviews(product.reviews || []);
  }, [product]);

  const rating =
    product.note ?? (reviews.length > 0 ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0);
  const reviewCount = reviews.length;

  const filteredReviews = useMemo(() => {
    let list = [...reviews];
    if (reviewSearch.trim()) {
      const q = reviewSearch.toLowerCase();
      list = list.filter((r) => r.comment?.toLowerCase().includes(q));
    }
    if (starFilter.length > 0) {
      list = list.filter((r) => starFilter.includes(r.stars));
    }
    if (reviewSort === 'recent') {
      list.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    } else if (reviewSort === 'highest') {
      list.sort((a, b) => b.stars - a.stars);
    } else {
      list.sort((a, b) => a.stars - b.stars);
    }
    return list;
  }, [reviews, reviewSearch, starFilter, reviewSort]);

  const topPositive = useMemo(
    () => filteredReviews.filter((r) => r.stars >= 4 && r.comment).sort((a, b) => b.stars - a.stars)[0],
    [filteredReviews]
  );
  const topCritical = useMemo(
    () => filteredReviews.filter((r) => r.stars <= 2 && r.comment).sort((a, b) => a.stars - b.stars)[0],
    [filteredReviews]
  );

  const toggleStarFilter = (star: number) => {
    setStarFilter((prev) => (prev.includes(star) ? prev.filter((s) => s !== star) : [...prev, star]));
  };

  const toggleCommentExpand = (id: number) => {
    setExpandedComments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour laisser un avis');
      return;
    }
    if (reviewStars === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await addReview({
        product_id: product.id,
        stars: reviewStars,
        comment: reviewComment,
      });
      toast.success('Avis enregistré. Merci !');
      setReviewStars(0);
      setReviewComment('');
      setShowReviewForm(false);
      // Refetch would require getProductDetails again – parent could pass setProduct or we refetch
      const { getProductDetails } = await import('@/services/api');
      const updated = await getProductDetails(product.slug, true);
      setReviews(updated.reviews || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi de l\'avis');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (r.stars >= 1 && r.stars <= 5) counts[r.stars as keyof typeof counts]++;
    });
    return counts;
  }, [reviews]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-12">
        {/* Breadcrumb */}
        <nav className="mb-3 sm:mb-4 lg:mb-6 text-sm min-w-0">
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 min-h-[44px] items-center break-words"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="line-clamp-2">{product.designation_fr}</span>
          </Link>
        </nav>

        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white px-1 line-clamp-2">
            {product.designation_fr}
          </h1>
        </div>
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 lg:mb-6 px-1">
          Avis clients
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-8">
          {/* Left sidebar – Rating Summary & Filters */}
          <aside className="lg:col-span-4 space-y-3 sm:space-y-4 lg:space-y-6 min-w-0">
            {/* Rating Summary */}
            <div className="p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>100% authentique</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
                  {rating > 0 ? rating.toFixed(1) : '–'}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">/ 5</span>
              </div>
              <div className="flex items-center gap-1 mb-2 sm:mb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700'}`}
                  />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                Basé sur {reviewCount} avis
              </p>

              {/* Rating breakdown */}
              <div className="space-y-2">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = starCounts[star] ?? 0;
                  const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleStarFilter(star)}
                        className="flex items-center gap-1 w-16 text-left min-h-[44px] shrink-0"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{star}</span>
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      </button>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>

              {isAuthenticated && (
                <Button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  {showReviewForm ? 'Annuler' : 'Écrire un avis'}
                </Button>
              )}
            </div>

            {/* What customers say */}
            <div className="p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2 sm:mb-3">Ce que disent les clients</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Les clients apprécient la qualité élevée et les ingrédients détaillés de ce produit. 
                Beaucoup soulignent son efficacité et sa facilité d'utilisation. 
                La qualité du produit et son rapport qualité-prix sont également salués.
              </p>
            </div>

            {/* Review Highlights */}
            <div className="p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2 sm:mb-3">Points forts des avis</h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {['Qualité élevée', 'Efficace', 'Bon rapport qualité-prix', 'Facile à utiliser', 'Livraison rapide'].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {/* Search Reviews */}
            <div className="p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-900 dark:text-white mb-2 sm:mb-3">Rechercher dans les avis</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9 min-h-[44px] text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Write review form */}
            {showReviewForm && isAuthenticated && (
              <div className="p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 min-w-0">
                <h3 className="font-bold text-sm sm:text-base lg:text-lg text-gray-900 dark:text-white mb-2 sm:mb-3">Votre avis</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Note *</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewStars(star)}
                          className="focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            className={`h-7 w-7 sm:h-8 sm:w-8 ${star <= reviewStars ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700'}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Commentaire (optionnel)</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value.slice(0, 500))}
                      className="w-full min-w-0 p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      rows={4}
                      placeholder="Partagez votre expérience..."
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-0.5">{reviewComment.length}/500</p>
                  </div>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={reviewStars === 0 || isSubmittingReview}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isSubmittingReview ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publication...</>
                    ) : (
                      'Publier mon avis'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Star filter checkboxes */}
            <div className="p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-900 dark:text-white mb-2 sm:mb-3">Filtrer par note</h3>
              <div className="space-y-1.5 sm:space-y-2">
                {([5, 4, 3, 2, 1] as const).map((star) => (
                  <label key={star} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <Checkbox
                      checked={starFilter.includes(star)}
                      onCheckedChange={() => toggleStarFilter(star)}
                      className="shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      {star} étoile{star > 1 ? 's' : ''} ({starCounts[star] ?? 0})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Main – Reviews List */}
          <div className="lg:col-span-8 space-y-3 sm:space-y-4 lg:space-y-6 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
                Avis clients ({filteredReviews.length})
              </h3>
              <div className="flex items-center gap-3">
                <Select value={reviewSort} onValueChange={(v: 'recent' | 'highest' | 'lowest') => setReviewSort(v)}>
                  <SelectTrigger className="w-full sm:w-48 min-h-[44px]">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Plus récents</SelectItem>
                    <SelectItem value="highest">Mieux notés</SelectItem>
                    <SelectItem value="lowest">Moins bien notés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Review list */}
            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                  <p className="text-gray-600 dark:text-gray-400">Aucun avis ne correspond à vos filtres.</p>
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    showFullComment={expandedComments[review.id] ?? false}
                    onToggleComment={() => toggleCommentExpand(review.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
