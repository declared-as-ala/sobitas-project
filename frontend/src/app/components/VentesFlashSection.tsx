'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { FlashProductCard } from './FlashProductCard';
import { Button } from '@/app/components/ui/button';
import { SectionHeader } from '@/app/components/SectionHeader';
import { ArrowRight, Clock } from 'lucide-react';

interface FlashProduct {
  id: number;
  slug?: string;
  designation_fr?: string;
  prix?: number;
  promo?: number;
  promo_expiration_date?: string;
  cover?: string;
  discount_percent?: number;
  promo_percent?: number;
  [key: string]: unknown;
}

function clampDiscount(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0) return 0;
  return Math.min(90, Math.round(percent));
}

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

// Isolated memo so the 1-second interval only re-renders this compact strip, not the product list.
const CountdownDisplay = memo(function CountdownDisplay({ expirationDate }: { expirationDate: Date }) {
  // Start as null: computing the real remaining time needs Date.now(), which differs between the
  // server render and the client. Initialising to zeros made SSR paint "00:00:00" (looks like the
  // sale already ended) and then jump to the real time on hydration. Rendering a neutral "--"
  // placeholder until the effect runs is deterministic on server + first client render (no
  // hydration mismatch) and keeps the strip's height (no layout shift).
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const diff = Math.max(0, expirationDate.getTime() - Date.now());
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (24 * 3600 * 1000)),
        hours: Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000)),
        minutes: Math.floor((diff % (3600 * 1000)) / (60 * 1000)),
        seconds: Math.floor((diff % (60 * 1000)) / 1000),
        isExpired: false,
      });
    };
    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [expirationDate]);

  if (countdown?.isExpired) return null;

  // Before the effect runs (SSR + first client render), show H/Min/Sec placeholders. Once mounted,
  // the J unit is added only when there are whole days left.
  const units: { value: number | null; label: string }[] = countdown
    ? ([
        countdown.days > 0 ? { value: countdown.days, label: 'J' } : null,
        { value: countdown.hours, label: 'H' },
        { value: countdown.minutes, label: 'Min' },
        { value: countdown.seconds, label: 'Sec' },
      ].filter(Boolean) as { value: number; label: string }[])
    : [
        { value: null, label: 'H' },
        { value: null, label: 'Min' },
        { value: null, label: 'Sec' },
      ];

  return (
    <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-red-600 px-4 py-2.5 text-white shadow-sm">
      <span className="inline-flex items-center gap-1.5 font-display uppercase tracking-wide text-xs font-semibold">
        <Clock className="h-4 w-4" aria-hidden="true" />
        Se termine dans
      </span>
      <div className="flex items-center gap-1.5">
        {units.map(({ value, label }) => (
          <div key={label} className="flex min-w-[2.75rem] flex-col items-center rounded-lg bg-white/15 px-2 py-1">
            <span className="font-display text-lg font-bold leading-none tabular-nums">
              {value == null ? '--' : String(value).padStart(2, '0')}
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wide text-white/80">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

interface VentesFlashSectionProps {
  products: FlashProduct[];
}

export const VentesFlashSection = memo(function VentesFlashSection({ products }: VentesFlashSectionProps) {
  // Gate the countdown block on a STABLE value — whether any promo has an expiration date at all —
  // NOT on `> Date.now()`. Under ISR the page is baked minutes before hydration; a Date.now()
  // comparison in render could keep the block on the server but drop it on the client (or vice-versa)
  // when a promo expires inside the cache window → React hydration mismatch + a torn-down block.
  // The parent already filters ventes_flash to future promos, and CountdownDisplay resolves the
  // actual time (and returns null once expired) client-side after mount.
  const earliestExpiration = useMemo(() => {
    const validDates = products
      .map(p => p.promo_expiration_date)
      .filter((d): d is string => !!d)
      .map(d => new Date(d).getTime())
      .filter(t => !Number.isNaN(t));
    if (validDates.length === 0) return null;
    return new Date(Math.min(...validDates));
  }, [products]);

  const maxDiscount = useMemo(() => {
    const discounts: number[] = [];
    for (const p of products) {
      const oldPrice = Number((p as any).prix ?? (p as any).price ?? 0) || 0;
      const newPrice = Number((p as any).promo ?? 0) || 0;
      if (oldPrice <= 0 || newPrice <= 0 || newPrice >= oldPrice) continue;
      const computed = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
      const apiPercent = p.discount_percent ?? p.promo_percent;
      const fromApi = typeof apiPercent === 'number' && Number.isFinite(apiPercent) ? clampDiscount(apiPercent) : 0;
      const percent = clampDiscount(Math.max(computed, fromApi));
      if (percent > 0) discounts.push(percent);
    }
    return discounts.length > 0 ? Math.max(...discounts) : 0;
  }, [products]);

  if (products.length === 0) return null;

  const subtitle =
    maxDiscount > 0
      ? `Réductions jusqu'à ${maxDiscount}% sur nos meilleurs produits — pour une durée limitée.`
      : 'Réductions exceptionnelles sur nos meilleurs produits — pour une durée limitée.';

  return (
    <section id="ventes-flash" className="py-12 sm:py-16 lg:py-20 bg-red-50/60 dark:bg-red-950/10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Offres limitées"
          title="Ventes flash"
          subtitle={subtitle}
          viewAllHref="/offres"
          viewAllLabel="Voir toutes les offres"
        />

        {earliestExpiration && (
          <div className="mb-8 sm:mb-10">
            <CountdownDisplay expirationDate={earliestExpiration} />
          </div>
        )}

        {/* Shared grid rhythm — matches ProductGrid (2 → 3 → 4, no orphan rows) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {products.map((product) => (
            <div key={product.id} className="w-full min-w-0">
              <FlashProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Mobile CTA — SectionHeader's "Voir tout" link is hidden below sm */}
        <div className="mt-10 sm:hidden">
          <Button
            variant="outline"
            className="w-full min-h-[48px] justify-start rounded-xl border-2 border-red-500 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-500 font-display uppercase tracking-wide font-semibold"
            asChild
          >
            <Link href="/offres" aria-label="Voir toutes les offres et promos">
              Voir toutes les offres
              <ArrowRight className="h-5 w-5 ml-2" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
