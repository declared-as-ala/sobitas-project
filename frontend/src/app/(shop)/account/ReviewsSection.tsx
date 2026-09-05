'use client';

import Image from 'next/image';
import { LinkWithLoading as Link } from '@/app/components/LinkWithLoading';
import { useEffect, useState } from 'react';
import { BadgeCheck, Clock3, MessageSquare, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { StarRating } from '@/app/components/product/StarRating';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { getMyReviewDashboard, getStorageUrl } from '@/services/api';
import type { CustomerReview, ReviewAccess } from '@/types';
import { ProtinaAmount } from '@/app/components/loyalty/Protina';

function formatDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [access, setAccess] = useState<ReviewAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboard = await getMyReviewDashboard();
      setReviews(Array.isArray(dashboard.reviews) ? dashboard.reviews : []);
      setAccess(dashboard.access);
    } catch {
      setError('Impossible de charger vos avis pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-hairline bg-elevated py-12 shadow-sm">
        <LoadingSpinner message="Chargement de vos avis…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-hairline bg-elevated px-4 py-10 text-center shadow-sm">
        <p className="text-sm text-ink-2">{error}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          className="mt-4 min-h-11 rounded-xl border-brand/30 text-brand hover:bg-brand/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Réessayer
        </Button>
      </div>
    );
  }

  const monthlyLimit = Math.max(1, access?.monthly_limit ?? 3);
  const usedThisMonth = Math.min(monthlyLimit, access?.used_this_month ?? 0);
  const remainingThisMonth = Math.max(0, access?.remaining_this_month ?? monthlyLimit);

  return (
    <div className="space-y-4">
      {!access?.phone_verified && <div className="flex flex-col gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:flex-row sm:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elevated text-brand"><ShieldAlert className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-ink-1">Vos avis peuvent être publiés dès maintenant</p><p className="mt-0.5 text-xs leading-relaxed text-ink-2">Vérifiez votre téléphone seulement si vous souhaitez gagner des Protinas.</p></div><Link href="/verify-phone" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-on-brand">Vérifier et gagner</Link></div>}
      <div className="grid overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm md:grid-cols-[1fr_auto]">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Quota mensuel</p><p className="mt-1 text-sm font-semibold text-ink-1">{remainingThisMonth} avis encore disponible{remainingThisMonth !== 1 ? 's' : ''}</p></div>
            <span className="rounded-full bg-sunken px-3 py-1.5 text-xs font-bold tabular-nums text-ink-2">{usedThisMonth}/{monthlyLimit}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2" aria-label={`${usedThisMonth} avis utilisés sur ${monthlyLimit}`}>
            {Array.from({ length: monthlyLimit }).map((_, index) => (
              <span key={index} className={`h-2 rounded-full ${index < usedThisMonth ? 'bg-brand' : 'bg-ink-1/10'}`} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-hairline bg-sunken md:w-[290px] md:border-s md:border-t-0">
          <div className="flex flex-col justify-center border-e border-hairline p-4"><p className="font-display text-2xl font-bold tabular-nums text-brand">10</p><p className="text-[11px] leading-snug text-ink-3">Protinas par avis éligible</p></div>
          <div className="flex flex-col justify-center p-4"><p className="font-display text-2xl font-bold tabular-nums text-ok">50</p><p className="text-[11px] leading-snug text-ink-3">Protinas si achat livré</p></div>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-hairline bg-elevated px-4 py-10 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand/10 text-brand" aria-hidden="true"><MessageSquare className="h-6 w-6" /></span>
          <h2 className="mt-4 font-display text-xl font-bold uppercase tracking-tight text-ink-1">Votre première contribution</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-2">Ouvrez un produit que vous connaissez, donnez une note honnête et ajoutez une photo si vous le souhaitez.</p>
          <Link href="/shop" className="mx-auto mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-on-brand hover:bg-brand-hover">Choisir un produit</Link>
        </div>
      ) : <ul className="space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-xl border border-hairline bg-elevated p-4 shadow-sm sm:p-5">
            <div className="flex gap-3 sm:gap-4">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-hairline bg-canvas sm:h-16 sm:w-16">
                {review.product?.cover ? (
                  <Image
                    src={getStorageUrl(review.product.cover)}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                ) : null}
              </span>

              <div className="min-w-0 flex-1">
                {review.product ? (
                  <Link
                    href={`/products/${review.product.slug}`}
                    className="-m-1 block min-h-11 rounded-lg p-1 text-sm font-semibold leading-snug text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {review.product.designation}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold text-ink-1">Produit indisponible</p>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StarRating rating={review.stars} size="sm" />
                  {review.verified_purchase && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-ok/40 bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ok">
                      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                      Achat vérifié
                    </span>
                  )}
                  {review.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      Retiré du public
                    </span>
                  )}
                </div>
              </div>
            </div>

            {review.comment && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2">{review.comment}</p>
            )}
            {review.images && review.images.length > 0 && <ul className="mt-3 grid max-w-md grid-cols-3 gap-2">{review.images.map((photo, index) => <li key={photo.id} className="relative aspect-square overflow-hidden rounded-xl border border-hairline bg-sunken"><Image src={getStorageUrl(photo.path)} alt={`Votre photo ${index + 1}`} fill sizes="140px" className="object-cover" /></li>)}</ul>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
              <p className="text-xs tabular-nums text-ink-3">{formatDate(review.created_at)}</p>
              <p className={`text-xs font-semibold ${review.points_awarded ? 'text-ok' : 'text-ink-3'}`}>{review.points_awarded ? <><ProtinaAmount value={review.reward_points ?? (review.verified_purchase ? 50 : 10)} signed /> créditées</> : access?.phone_verified ? `${review.reward_points ?? (review.verified_purchase ? 50 : 10)} Protinas après contrôle` : 'Aucune récompense sans téléphone vérifié'}</p>
            </div>
          </li>
        ))}
      </ul>}
    </div>
  );
}
