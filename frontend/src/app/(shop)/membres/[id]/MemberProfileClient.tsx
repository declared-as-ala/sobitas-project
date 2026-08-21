'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MessageSquare, Star, UserRound, ArrowLeft } from 'lucide-react';
import { getMemberProfile, getStorageUrl } from '@/services/api';
import type { MemberProfile } from '@/types';
import { Section } from '@/app/components/layout/Section';
import { PageHeader } from '@/app/components/PageHeader';
import { StarRating } from '@/app/components/product/StarRating';
import { Skeleton } from '@/app/components/ui/skeleton';

/**
 * What a member has published, and nothing else.
 *
 * ── THE THREE NUMBERS, AND WHY THE THIRD ONE IS NOT A PRODUCT RATING ────────────────────────
 * `average_given` is this member's own average ACROSS THE PRODUCTS THEY REVIEWED. It is labelled
 * "note moyenne donnée" rather than "note", because a number next to a person that looks like a
 * rating gets read as a rating OF that person. It is also never used as one anywhere: product
 * ratings come from `Review::scopeAttested`, which this page never touches.
 *
 * `verified_count` is the interesting one for a reader. It is how many of these reviews are backed
 * by an order, and it is the only signal on the page that separates a customer from a stranger
 * with a keyboard.
 */

function initialOf(name: string): string {
  const c = (name || '').trim().charAt(0);
  return c ? c.toUpperCase() : '?';
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:flex-1">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-xl font-bold leading-tight tracking-tight tabular-nums text-ink-1">
          {value}
        </span>
        <span className="block text-[12.5px] leading-snug text-ink-3">{label}</span>
      </span>
    </div>
  );
}

export default function MemberProfileClient({ id }: { id: string }) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let ignore = false;
    const numeric = Number(id);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    getMemberProfile(numeric)
      .then((data) => {
        if (!ignore) setProfile(data);
      })
      .catch(() => {
        // The API 404s a member with nothing published, which is the same outcome as a member who
        // does not exist — and deliberately indistinguishable. Whether an account exists is not a
        // fact worth confirming to somebody typing ids into the address bar.
        if (!ignore) setNotFound(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-sunken">
        <Section as="div" spacing="default" first last>
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-56" />
          </div>
          <Skeleton className="mt-6 h-[13rem] w-full rounded-2xl sm:h-[5.5rem]" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </Section>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-dvh bg-sunken">
        <Section as="div" spacing="feature" first last>
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-elevated">
              <UserRound className="h-5 w-5 text-ink-3" aria-hidden="true" />
            </div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-ink-1">Profil introuvable</h1>
            <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-relaxed text-ink-3">
              Ce membre n’a pas encore publié d’avis, ou le profil n’existe pas.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-5 font-display text-[13px] font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              Retour à la boutique
            </Link>
          </div>
        </Section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-sunken">
      <Section as="div" spacing="default" first last>
        <PageHeader kicker="Membre" title={profile.name} />

        {profile.member_since && (
          <p className="mt-2 text-sm text-ink-3">Membre depuis le {formatDate(profile.member_since)}</p>
        )}

        {/* The stat strip, in the same shape `AccountSummary` uses: rows on a phone, cells with a
            rule between them from `sm`. Reusing that shape is most of what keeps a page nobody
            visits often feeling like the rest of the site. */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-card">
          <div className="divide-y divide-hairline sm:flex sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-3.5 px-4 py-3.5 sm:flex-1">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand font-display text-base font-bold text-on-brand"
                aria-hidden="true"
              >
                {initialOf(profile.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-base font-bold uppercase tracking-wide text-ink-1">
                  {profile.name}
                </span>
                <span className="block text-[12.5px] text-ink-3">Membre Protein.tn</span>
              </span>
            </div>

            <Stat
              icon={<MessageSquare className="h-5 w-5" strokeWidth={2} />}
              value={String(profile.review_count)}
              label={profile.review_count === 1 ? 'avis publié' : 'avis publiés'}
            />
            <Stat
              icon={<BadgeCheck className="h-5 w-5" strokeWidth={2} />}
              value={String(profile.verified_count)}
              label={profile.verified_count === 1 ? 'achat vérifié' : 'achats vérifiés'}
            />
            {profile.average_given != null && (
              <Stat
                icon={<Star className="h-5 w-5" strokeWidth={2} />}
                value={profile.average_given.toFixed(1)}
                label="note moyenne donnée"
              />
            )}
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl font-bold uppercase tracking-tight text-ink-1">
          Ses avis
        </h2>

        <ul className="mt-4 space-y-4">
          {profile.reviews.map((review) => (
            <li key={review.id} className="rounded-2xl border border-hairline bg-elevated p-4 shadow-card sm:p-5">
              {review.product && (
                <Link
                  href={`/products/${review.product.slug}`}
                  className="group -m-1 mb-2 flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-hairline bg-canvas">
                    {review.product.cover ? (
                      <Image
                        src={getStorageUrl(review.product.cover)}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-1 transition-colors group-hover:text-brand">
                      {review.product.designation}
                    </span>
                    <span className="block text-xs text-ink-3">Voir le produit</span>
                  </span>
                </Link>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StarRating rating={review.stars} size="sm" />
                {review.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-ok/40 bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ok">
                    <BadgeCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                    Achat vérifié
                  </span>
                )}
                <span className="text-xs tabular-nums text-ink-3">{formatDate(review.created_at)}</span>
              </div>

              {review.comment && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{review.comment}</p>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
