'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
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
    // The absolute deadline labels this clock. Keep a single timer and the deliberate SSR
    // placeholders: only the client can supply an honest remaining duration.
    <div ref={rootRef} className="shrink-0" aria-hidden="true">
      <div className="pt-slab flex items-center gap-1 rounded-xl p-2 sm:px-3">
        {segments.map((segment, index) => (
          <div key={segment.label} className="flex items-center gap-1">
            <span className="flex min-w-7 flex-col items-center sm:min-w-9">
              <span className="font-display text-2xl font-bold tabular-nums leading-none text-ink-1 sm:text-3xl">
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
    // Phase 14: between `md` and `lg` the date sits ABOVE the clock, and that stack now hangs off
    // the band's RIGHT edge — so the label rags right there and only there. At `lg` the pair is a
    // row again and the label reads left-to-right into the clock, as it always did.
    <span className="min-w-32 flex-1 text-xs text-ink-2 sm:flex-initial md:text-right lg:text-left">
      <span className="block font-semibold">Prochaine échéance</span>
      <time className="block" dateTime={expirationDate.toISOString()}>
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
      {/* Phase 12 shrank this row to `sm:w-fit` so the title and the CTA would stand next to each
          other. That closed the gap between them by making the HEADER narrower than the grid it
          sits on — the void moved from the middle of the row to the right of it, and the band ended
          up as the one place on the site where the header and its content disagree about how wide
          the section is. Phase 14 removes `w-fit`: SectionHeader's own `sm:justify-between` puts
          the title on the grid's left edge and "Voir toutes les offres" on its right edge, which is
          the arrangement every other `viewAllHref` header on the site already uses.
          `[&>div]:mb-4` still overrides SectionHeader's mb-5/lg:mb-6 — this band's rows are 16px
          apart, not 20/24 — and `sm:[&>div]:gap-8` keeps a 32px floor between title and CTA. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 sm:block [&>div]:mb-4 sm:[&>div]:gap-8">
        <SectionHeader
          id="ventes-flash-heading"
          title={earliestExpiration || !offers.length ? 'Ventes flash' : 'Meilleures promos'}
          scale="1"
          viewAllHref="/offres"
          viewAllLabel="Voir toutes les offres"
        />
        {/* One mobile CTA, beside the title rather than repeated beneath the cards. */}
        <LinkWithLoading
          href="/offres"
          loadingMessage="Chargement des offres"
          className="-mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:hidden"
        >
          Voir les offres <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LinkWithLoading>
      </div>
      {offers.length > 0 ? (
        <>
          {/* Phase 12: offer + deadline read together from tablet up — now 24px either side of the
              rule below, so the separation between them is unchanged at 48px.
              The tablet date sits above its clock so neither group is squeezed. On phones,
              keep the compact two-row summary and the single CTA beside the section title.
              The maxima remain independent: the deepest percentage need not be the largest
              dinar saving. Give the leading number its own space before the supporting copy. */}
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className="flex min-w-0 items-center gap-6 sm:gap-8">
              <p className="shrink-0 font-display font-extrabold uppercase leading-none text-brand">
                <span className="mb-1 block text-xs font-semibold tracking-wide">Jusqu’à</span>
                <span className="text-4xl sm:text-5xl">−{maxDiscount}%</span>
              </p>
              <p className="min-w-0 text-sm text-ink-2">
                <span className="mb-1 block font-semibold text-ink-1">Jusqu’à {formatTnd(maxSaving)} d’économie</span>
                Sur {offers.length} produit{offers.length > 1 ? 's' : ''} sélectionné{offers.length > 1 ? 's' : ''}
              </p>
            </div>
            {earliestExpiration && (
              <>
                {/* Phase 14: the offer anchors the left edge, the deadline and its clock anchor the
                    right one, and this rule is what occupies the measure between them. Pushing the
                    two groups apart with `justify-between` alone would put the same ~850px of
                    nothing back in the middle that Phase 12 was asked to remove — a hole either
                    end of the row is still a hole. DESIGN_SYSTEM: separation is a colour change
                    plus a 1px rule, never emptiness. It also says something true — this offer runs
                    until that date — and, being a flex item in a row that already exists, it costs
                    zero height, which is what keeps 390 and 768 at their Phase 12 numbers.
                    `bg-rule`, the cell-divider weight, per AuthShell's identical leader. Hidden
                    below `md`, where the two groups stack and there is no gap to fill. */}
                <span aria-hidden="true" className="hidden h-px flex-1 bg-rule md:block" />
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:flex-col md:items-end lg:flex-row lg:items-center">
                  <FlashDeadline expirationDate={earliestExpiration} />
                  <CountdownDisplay expirationDate={earliestExpiration} />
                </div>
              </>
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
    </Section>
  );
});
