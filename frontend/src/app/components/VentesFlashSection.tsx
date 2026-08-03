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
import { Section } from '@/app/components/layout/Section';
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
    <div className="flex flex-col gap-2">
      {/*
        THE VISIBLE CLOCK IS HIDDEN FROM ASSISTIVE TECH, AND THAT IS THE ACCESSIBLE CHOICE.

        These digits change every second. Exposed, they are either a screen-reader firehose (with
        aria-live) or an unlabelled cluster of numbers that a user lands on mid-count and cannot
        interpret (without it). The pre-hydration placeholder makes it worse: "-- -- --" is a real
        announced string that means nothing.

        So the tiles are aria-hidden and a single static sentence carries the same information in a
        form that is actually useful — an absolute date, in a <time> element, announced once. No
        aria-live anywhere.
      */}
      <span className="pt-kicker inline-flex items-center gap-1.5 text-ink-3" aria-hidden="true">
        <Clock className="h-4 w-4" aria-hidden="true" />
        Se termine dans
      </span>
      <div className="grid grid-cols-4 gap-2" aria-hidden="true">
        {units.map(({ value, label }) => (
          // A well on the slab (#202027 light / #101012 dark) with its own hairline, so the tile
          // reads as inset rather than relying on the fill alone. Digits are `text-brand`: 6.93:1
          // on the well in light, 8.14:1 in dark.
          <div
            key={label}
            className="flex min-w-[3.75rem] flex-col items-center justify-center rounded-lg border border-hairline bg-sunken px-2 py-2 sm:min-w-[4.25rem] sm:py-2.5"
          >
            <span className="font-display font-compressed text-[1.75rem] font-extrabold leading-none tabular-nums text-brand sm:text-[2.25rem]">
              {value == null ? '--' : String(value).padStart(2, '0')}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-ink-3">{label}</span>
          </div>
        ))}
      </div>
      <p className="sr-only">
        Offre valable jusqu&apos;au{' '}
        {/* `timeZone` is PINNED, and that is not decoration. Without it the server formats in the
            container's UTC and the browser formats in the visitor's local zone, so any promo
            expiring near midnight renders a different date on each side — a hydration mismatch,
            and exactly the class of bug the CountdownDisplay comment above already documents for
            Date.now(). An explicit zone is deterministic everywhere. */}
        <time dateTime={expirationDate.toISOString()}>
          {expirationDate.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Africa/Tunis',
          })}
        </time>
      </p>
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
    /* THE FLAGSHIP SLAB BAND. `border-t-2 border-red-600` is deleted: the colour change from the
       white rail above IS the edge (19.26:1), and a red hairline on black says nothing. The white
       product cards are punched out of it, which is the treatment a discount moment deserves and
       which no amount of white-on-white typography can buy. */
    <Section
      id="ventes-flash"
      surface="slab"
      spacing="feature"
      width="wide"
      defer
    >
        {/* Distinctive flash header: flame + compressed title on the left, live countdown on the
            right (drops below the title on phones). All copy on white ⇒ clean AA contrast. */}
        <div className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <span className="pt-kicker mb-2.5 inline-flex items-center gap-2 text-brand">
              <Flame className="h-4 w-4" aria-hidden="true" />
              Offres limitées
            </span>
            <h2 className="font-display font-compressed text-[2rem] font-extrabold uppercase leading-[0.92] tracking-[-0.015em] text-ink-1 sm:text-[2.75rem] lg:text-[3.5rem]">
              Ventes flash
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink-2 sm:text-base">{subtitle}</p>
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

        <div className="mt-8 flex justify-center">
          <Button
            className="min-h-[52px] w-full justify-center rounded-full bg-brand px-10 font-display font-extended uppercase tracking-wide font-semibold text-on-brand hover:bg-brand-hover sm:w-auto"
            asChild
          >
            <Link href="/offres" aria-label="Voir toutes les offres et promos">
              Voir toutes les offres
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
    </Section>
  );
});
