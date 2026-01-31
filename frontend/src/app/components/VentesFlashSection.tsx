'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, Clock } from 'lucide-react';
interface FlashProduct {
  id: number;
  slug?: string;
  designation_fr?: string;
  prix?: number;
  promo?: number;
  promo_expiration_date?: string;
  cover?: string;
  [key: string]: unknown;
}

interface VentesFlashSectionProps {
  products: FlashProduct[];
}

function useCountdown(endDate: Date | null): { days: number; hours: number; minutes: number; seconds: number; isExpired: boolean; isClient: boolean } {
  const [isClient, setIsClient] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setIsClient(true);
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!isClient || !endDate || endDate.getTime() <= Date.now()) return;
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [isClient, endDate]);

  if (!isClient || now === null) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false, isClient: false };
  }
  if (!endDate || endDate.getTime() <= now.getTime()) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, isClient: true };
  }
  const diff = Math.max(0, endDate.getTime() - now.getTime());
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);
  return { days, hours, minutes, seconds, isExpired: false, isClient: true };
}

export const VentesFlashSection = memo(function VentesFlashSection({ products }: VentesFlashSectionProps) {
  const endDate = useMemo(() => {
    const dates = products
      .map((p) => (p.promo_expiration_date ? new Date(p.promo_expiration_date) : null))
      .filter((d): d is Date => d != null && !isNaN(d.getTime()));
    if (dates.length === 0) return null;
    return new Date(Math.min(...dates.map((d) => d.getTime())));
  }, [products]);

  const { days, hours, minutes, seconds, isExpired, isClient } = useCountdown(endDate);

  if (products.length === 0) return null;

  const countdownUnits = [
    { value: days, label: 'j' },
    { value: hours, label: 'h' },
    { value: minutes, label: 'min' },
    { value: seconds, label: 's' },
  ] as const;

  return (
    <section
      id="ventes-flash"
      className="py-8 sm:py-12 md:py-20 bg-gradient-to-b from-orange-50/80 via-white to-white dark:from-orange-950/20 dark:via-gray-950 dark:to-gray-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 md:mb-14">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 bg-gradient-to-r from-orange-600 to-orange-500 dark:from-orange-500 dark:to-orange-400 bg-clip-text text-transparent">
              Ventes Flash
            </h2>
            <p className="text-sm sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-3">
              Offres limitées – Ne manquez pas ces promotions
            </p>
            {!isExpired && endDate && (
              <div className="flex items-center gap-2 flex-wrap">
                <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400 shrink-0" aria-hidden />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Se termine dans :</span>
                <div className="flex items-center gap-2 sm:gap-3" role="timer" aria-live="polite" suppressHydrationWarning>
                  {countdownUnits.map(({ value, label }) => (
                    <span
                      key={label}
                      className="inline-flex flex-col items-center min-w-[2.5rem] sm:min-w-[3rem] py-1.5 px-2 rounded-lg bg-orange-500/15 dark:bg-orange-500/20 border border-orange-300/50 dark:border-orange-500/30"
                    >
                      <span className="text-lg sm:text-xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
                        {isClient ? String(value).padStart(2, '0') : '00'}
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                        {label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="hidden sm:block">
            <Button variant="outline" className="group min-h-[44px] border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30" asChild>
              <Link href="/offres" aria-label="Voir toutes les offres et promos">
                Voir toutes les offres
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product as any}
              showBadge
              badgeText="Promo"
            />
          ))}
        </div>
      </div>
    </section>
  );
});
