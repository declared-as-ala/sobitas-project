'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock3 } from 'lucide-react';
import { FlashDealCard } from './FlashDealCard';
import { LinkWithLoading } from './LinkWithLoading';
import { Section } from './layout/Section';
import { SectionHeader } from './SectionHeader';
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
    <div ref={rootRef} className="flex min-w-0 flex-wrap items-center gap-2" aria-hidden="true">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2">
        <Clock3 className="h-4 w-4 text-brand" aria-hidden="true" />
        Fin dans
      </span>
      <div className="pt-slab flex items-center gap-1 rounded-xl px-2 py-2 sm:gap-1.5 sm:px-2.5">
        {segments.map((segment, index) => (
          <div key={segment.label} className="flex items-center gap-1 sm:gap-1.5">
            <span className="flex min-w-8 flex-col items-center sm:min-w-9">
              <span className="font-display text-xl font-bold tabular-nums leading-none text-ink-1">
                {segment.value == null ? '--' : String(segment.value).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-ink-2">
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
    <Section id="ventes-flash" surface="sunken" spacing="tight" width="wide" defer aria-labelledby="ventes-flash-heading" className="[&.pt-defer]:[contain-intrinsic-size:auto_320px]">
      {/* The offer owns the emphasis; decorative artwork and instructions no longer compete
          with the discount. One clock instance, above the products at every width. */}
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <SectionHeader
            id="ventes-flash-heading"
            title={hasDeadline ? 'Ventes flash' : 'Meilleures promos'}
            scale="2"
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {maxDiscount > 0 && (
              <p className="font-display text-2xl font-extrabold uppercase leading-none text-brand sm:text-3xl">
                <span className="mr-2 text-xs font-semibold">Jusqu’à</span>−{maxDiscount}%
              </p>
            )}
            {earliestExpiration && <CountdownDisplay expirationDate={earliestExpiration} />}
          </div>
        </div>
            <LinkWithLoading
              href="/offres"
              loadingMessage="Chargement des offres"
              className="order-last inline-flex min-h-11 items-center justify-center gap-2 justify-self-start rounded-xl px-3 text-sm font-semibold text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:order-none lg:border lg:border-rule"
            >
              Voir toutes les offres
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkWithLoading>
        {earliestExpiration && <FlashDeadline expirationDate={earliestExpiration} />}
        <ul role="list" className="scrollbar-hide flex snap-x snap-proximity gap-3 overflow-x-auto py-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:col-span-2 xl:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <li key={product.id} className="w-[94%] min-w-0 flex-none snap-start sm:w-auto">
              <FlashDealCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
});
