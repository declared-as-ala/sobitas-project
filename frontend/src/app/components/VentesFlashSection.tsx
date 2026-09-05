'use client';

import Image from 'next/image';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock3 } from 'lucide-react';
import { FlashDealCard } from './FlashDealCard';
import { LinkWithLoading } from './LinkWithLoading';
import { Section } from './layout/Section';
import type { Product } from '@/types';

interface FlashProduct extends Product {
  discount_percent?: number;
  promo_percent?: number;
}

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

const TICK_ROOT_MARGIN = '200px';

function clampDiscount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(90, Math.round(value));
}

const CountdownDisplay = memo(function CountdownDisplay({ expirationDate }: { expirationDate: Date }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: TICK_ROOT_MARGIN }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, expirationDate.getTime() - Date.now());
      setCountdown({
        days: Math.floor(remaining / 86_400_000),
        hours: Math.floor((remaining % 86_400_000) / 3_600_000),
        minutes: Math.floor((remaining % 3_600_000) / 60_000),
        seconds: Math.floor((remaining % 60_000) / 1000),
        expired: remaining <= 0,
      });
    };
    update();
    if (!visible) return;
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [expirationDate, visible]);

  if (countdown?.expired) return <span className="text-sm font-semibold text-ink-3">Offre terminée</span>;

  const segments = [
    { value: countdown?.days, label: 'Jours' },
    { value: countdown?.hours, label: 'Heures' },
    { value: countdown?.minutes, label: 'Min' },
    { value: countdown?.seconds, label: 'Sec' },
  ];

  return (
    <div ref={rootRef} className="flex min-w-0 items-center gap-2" aria-hidden="true">
      <span className="hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3 sm:inline-flex">
        <Clock3 className="h-4 w-4 text-brand" aria-hidden="true" />
        Fin dans
      </span>
      <div className="pt-slab flex items-center gap-1 rounded-xl px-2 py-1.5 sm:gap-1.5 sm:px-2.5">
        {segments.map((segment, index) => (
          <div key={segment.label} className="flex items-center gap-1 sm:gap-1.5">
            <span className="flex min-w-8 flex-col items-center sm:min-w-9">
              <span className="font-display text-base font-bold tabular-nums leading-none text-brand">
                {segment.value == null ? '--' : String(segment.value).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-wide text-ink-3">
                {segment.label}
              </span>
            </span>
            {index < segments.length - 1 && <span className="text-xs font-bold text-ink-3">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
});

function FlashDeadline({ expirationDate }: { expirationDate: Date }) {
  return (
    <span className="sr-only">
      Offre valable jusqu&apos;au{' '}
      <time dateTime={expirationDate.toISOString()}>
        {expirationDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Tunis' })}
      </time>
    </span>
  );
}

export const VentesFlashSection = memo(function VentesFlashSection({ products }: { products: FlashProduct[] }) {
  const earliestExpiration = useMemo(() => {
    const dates = products
      .map((product) => product.promo_expiration_date)
      .filter((date): date is string => Boolean(date))
      .map((date) => new Date(date).getTime())
      .filter(Number.isFinite);
    return dates.length ? new Date(Math.min(...dates)) : null;
  }, [products]);

  const maxDiscount = useMemo(() => products.reduce((highest, product) => {
    const oldPrice = Number(product.prix ?? 0);
    const promoPrice = Number(product.promo ?? 0);
    const calculated = oldPrice > 0 && promoPrice > 0 && promoPrice < oldPrice
      ? ((oldPrice - promoPrice) / oldPrice) * 100
      : 0;
    return Math.max(
      highest,
      clampDiscount(calculated),
      clampDiscount(Number(product.discount_percent ?? product.promo_percent ?? 0))
    );
  }, 0), [products]);

  if (!products.length) return null;

  const hasDeadline = Boolean(earliestExpiration);

  return (
    <Section id="ventes-flash" surface="sunken" spacing="tight" width="wide" defer aria-labelledby="ventes-flash-heading">
      <div className="overflow-hidden rounded-2xl border border-brand/25 bg-elevated">
        <div className="grid gap-4 border-b border-hairline px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-soft sm:h-16 sm:w-16">
              <Image src="/home/flash-sale-mark.svg" alt="" fill sizes="64px" loading="lazy" className="object-contain p-1" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
                {hasDeadline ? 'Offres en direct' : 'Prix réduits'}{maxDiscount > 0 ? ` · jusqu’à −${maxDiscount}%` : ''}
              </p>
              <h2 id="ventes-flash-heading" className="mt-1 font-display text-2xl font-extrabold uppercase leading-none text-ink-1 sm:text-3xl">
                {hasDeadline ? 'Ventes flash' : 'Meilleures promos'}
              </h2>
              <p className="mt-1.5 text-sm text-ink-3">
                {hasDeadline ? 'Choisissez votre offre avant la fin du chrono.' : 'Nos remises les plus intéressantes du moment.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 lg:justify-end">
            {earliestExpiration && <CountdownDisplay expirationDate={earliestExpiration} />}
            <LinkWithLoading
              href="/offres"
              loadingMessage="Chargement des offres"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-on-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:flex-none [@media(hover:hover)]:hover:bg-brand-hover"
            >
              Voir toutes les offres
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkWithLoading>
          </div>
        </div>

        {earliestExpiration && <FlashDeadline expirationDate={earliestExpiration} />}

        <ul role="list" className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto p-3 sm:grid sm:grid-cols-2 sm:overflow-visible sm:p-4 xl:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <li key={product.id} className="w-[86%] min-w-0 flex-none snap-start sm:w-auto">
              <FlashDealCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
});
