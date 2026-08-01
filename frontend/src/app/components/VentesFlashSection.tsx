'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
// ProductCard, not the old FlashProductCard: that fork had drifted into a buggy near-duplicate
// (no i18n localisation, no shared image presentation, ignored aroma variants, and rendered the
// discount twice). Reusing ProductCard fixes all of that and gives flash cards the same polished
// square image + no-cramping treatment as every other rail. The promo -%\ badge already renders
// from ProductCard's own price logic.
import { ProductCard } from './ProductCard';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, Clock, Flame } from 'lucide-react';

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
    <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-red-600 px-3.5 py-2 text-white shadow-sm sm:px-4 sm:py-2.5">
      <span className="inline-flex items-center gap-1.5 font-display uppercase tracking-wide text-[11px] font-semibold sm:text-xs">
        <Clock className="h-4 w-4" aria-hidden="true" />
        Se termine dans
      </span>
      <div className="flex items-center gap-1 sm:gap-1.5">
        {units.map(({ value, label }) => (
          // bg-black/15 not white/15: a translucent-white chip over the orange pill lifted the
          // effective background to a light orange, dropping white digits to ~3.9:1. Darkening the
          // chip instead keeps white ≥4.5:1.
          <div key={label} className="flex min-w-[2.5rem] flex-col items-center rounded-lg bg-black/15 px-1.5 py-1 sm:min-w-[2.75rem] sm:px-2">
            <span className="font-display text-base font-bold leading-none tabular-nums sm:text-lg">
              {value == null ? '--' : String(value).padStart(2, '0')}
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wide text-white">{label}</span>
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
    // White surface (not a red tint): the tint pushed the small kicker text below AA contrast, and
    // the section reads as distinctive from the plain rails via its own bold header + the orange
    // top rule + the live countdown — not via a background wash.
    <section
      id="ventes-flash"
      className="border-t-2 border-red-600 bg-white py-12 dark:bg-gray-950 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        {/* Distinctive flash header: flame + compressed title on the left, live countdown on the
            right (drops below the title on phones). All copy on white ⇒ clean AA contrast. */}
        <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <span className="pt-kicker mb-3 inline-flex items-center gap-2 text-red-600 dark:text-red-400">
              <Flame className="h-4 w-4" aria-hidden="true" />
              Offres limitées
            </span>
            <h2 className="font-display font-compressed text-[2rem] font-extrabold uppercase leading-[0.92] tracking-[-0.015em] text-gray-950 dark:text-white sm:text-[2.75rem] lg:text-[3.25rem]">
              Ventes flash
            </h2>
            <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">{subtitle}</p>
          </div>

          {earliestExpiration && (
            <div className="shrink-0">
              <CountdownDisplay expirationDate={earliestExpiration} />
            </div>
          )}
        </div>

        {/* Shared grid rhythm — matches ProductGrid (2 → 3 → 4, no orphan rows) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {products.map((product) => (
            <div key={product.id} className="w-full min-w-0">
              <ProductCard product={product as any} showBadge badgeText="Flash" />
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            className="min-h-[48px] w-full justify-center rounded-full border-2 border-red-600 px-6 font-display font-extended uppercase tracking-wide font-semibold text-red-600 hover:bg-red-600 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-500 sm:w-auto"
            asChild
          >
            <Link href="/offres" aria-label="Voir toutes les offres et promos">
              Voir toutes les offres
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
