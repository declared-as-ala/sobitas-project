'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock3 } from 'lucide-react';
import { FlashDealCard } from './FlashDealCard';
import { LinkWithLoading } from './LinkWithLoading';
import { Section } from './layout/Section';
import { SectionHeader } from './SectionHeader';
import { formatTnd, getPriceDisplay, parsePromoDate } from '@/util/productPrice';
import type { Product } from '@/types';

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

const TICK_ROOT_MARGIN = '200px';

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
    <div ref={rootRef} className="flex min-w-0 flex-col items-start gap-3" aria-hidden="true">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2">
        <Clock3 className="h-4 w-4 text-brand" aria-hidden="true" />
        Prochaine fin d’offre dans
      </span>
      <div className="pt-slab flex items-center gap-1 rounded-xl px-3 py-3 sm:gap-1.5 sm:px-4">
        {segments.map((segment, index) => (
          <div key={segment.label} className="flex items-center gap-1 sm:gap-1.5">
            <span className="flex min-w-11 flex-col items-center sm:min-w-12">
              <span className="font-display text-3xl font-bold tabular-nums leading-none text-ink-1">
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
    <span className="text-xs text-ink-2">
      Prochaine échéance :{' '}
      <time dateTime={expirationDate.toISOString()}>
        {expirationDate.toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' })}
      </time>
    </span>
  );
}

export const VentesFlashSection = memo(function VentesFlashSection({ products }: { products: Product[] }) {
  // Named logic change: the offer summary uses exactly the card price reader. Re-evaluate at
  // the next deadline, even off-screen, so an expired discount cannot survive a paused clock.
  const [revision, refresh] = useState(0);
  const offers = useMemo(() => products.filter(product => {
    const price = getPriceDisplay(product);
    return price.hasPromo && price.oldPrice != null && price.oldPrice > price.finalPrice;
    // revision invalidates the time-sensitive shared price reader after expiration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }).slice(0, 4), [products, revision]);
  const earliestExpiration = useMemo(() => {
    const dates = offers.map(product => parsePromoDate(product.promo_expiration_date))
      .filter((date): date is number => date != null);
    return dates.length ? new Date(Math.min(...dates)) : null;
  }, [offers]);

  useEffect(() => {
    const update = () => refresh(value => value + 1);
    // A timeout is only a wake-up signal. Every wake-up reads the wall clock again; browsers
    // may suspend background tabs, and the next deadline may exceed the maximum timeout.
    const timer = earliestExpiration ? window.setTimeout(update,
      Math.min(2_147_483_647, Math.max(0, earliestExpiration.getTime() - Date.now()) + 25)) : null;
    const onVisible = () => { if (document.visibilityState === 'visible') update(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', update);
    update();
    return () => {
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', update);
    };
  // Depend on the timestamp, not the Date object recreated after each price refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, earliestExpiration?.getTime()]);

  const maxDiscount = offers.reduce((highest, product) => {
    const price = getPriceDisplay(product);
    return Math.max(highest, Math.round(((price.oldPrice! - price.finalPrice) / price.oldPrice!) * 100));
  }, 0);
  const maxSaving = offers.reduce((highest, product) => {
    const price = getPriceDisplay(product);
    return Math.max(highest, price.oldPrice! - price.finalPrice);
  }, 0);

  return (
    // Four stateful cards render directly: deadline/empty states have different heights, so a
    // single deferred placeholder would move the page whenever the offer changes.
    <Section id="ventes-flash" surface="sunken" spacing="tight" width="wide" aria-labelledby="ventes-flash-heading">
      <SectionHeader
        id="ventes-flash-heading"
        title={earliestExpiration || !offers.length ? 'Ventes flash' : 'Meilleures promos'}
        scale="1"
        viewAllHref="/offres"
        viewAllLabel="Voir toutes les offres"
      />
      {offers.length > 0 ? (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="font-display font-extrabold uppercase leading-none text-brand">
                <span className="mb-2 block text-xs font-semibold tracking-wide">Jusqu’à</span>
                <span className="text-5xl sm:text-6xl">−{maxDiscount}%</span>
              </p>
              <div className="border-l border-rule pl-6">
                <p className="text-sm font-semibold text-ink-1">Jusqu’à {formatTnd(maxSaving)} d’économie</p>
                <p className="mt-1 text-sm text-ink-2">Sur une sélection de {offers.length} produit{offers.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            {earliestExpiration && (
              <div className="flex flex-col gap-2">
                <CountdownDisplay expirationDate={earliestExpiration} />
                <FlashDeadline expirationDate={earliestExpiration} />
              </div>
            )}
          </div>
          <ul role="list" className="scrollbar-hide flex snap-x snap-proximity gap-4 overflow-x-auto py-1 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-4">
            {offers.map(product => (
              <li key={product.id} className="w-[86%] min-w-0 flex-none snap-start sm:w-auto">
                <FlashDealCard product={product} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-ink-2">Aucune vente flash en cours. Retrouvez nos produits et les offres disponibles dans la boutique.</p>
      )}
      <LinkWithLoading
        href="/offres"
        loadingMessage="Chargement des offres"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:hidden"
      >
        Voir toutes les offres <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </LinkWithLoading>
    </Section>
  );
});
