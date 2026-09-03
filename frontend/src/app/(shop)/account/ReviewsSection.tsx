'use client';

import Image from 'next/image';
import { LinkWithLoading as Link } from '@/app/components/LinkWithLoading';
import { useEffect, useState } from 'react';
import { BadgeCheck, Clock3, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { StarRating } from '@/app/components/product/StarRating';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { getMyReviews, getStorageUrl } from '@/services/api';
import type { CustomerReview } from '@/types';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setReviews(await getMyReviews());
    } catch (requestError) {
      const status = (requestError as { response?: { status?: number } })?.response?.status;
      setError(status === 403
        ? 'Vérifiez votre adresse email pour retrouver vos avis.'
        : 'Impossible de charger vos avis pour le moment.');
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

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-hairline bg-elevated px-4 py-12 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand/10 text-brand" aria-hidden="true">
          <MessageSquare className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold uppercase tracking-tight text-ink-1">Aucun avis</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-2">
          Après avoir reçu une commande, vous pourrez partager votre expérience depuis la fiche du produit.
        </p>
      </div>
    );
  }

  const verifiedCount = reviews.filter((review) => review.verified_purchase).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-elevated px-4 py-3 shadow-sm">
        <p className="text-sm font-semibold text-ink-1">{reviews.length} avis</p>
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ok">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          {verifiedCount} {verifiedCount === 1 ? 'achat vérifié' : 'achats vérifiés'}
        </p>
      </div>

      <ul className="space-y-3">
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
                      En vérification
                    </span>
                  )}
                </div>
              </div>
            </div>

            {review.comment && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2">{review.comment}</p>
            )}
            <p className="mt-2 text-xs tabular-nums text-ink-3">{formatDate(review.created_at)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
