'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { FlashProductCard } from './FlashProductCard';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, Flame, Clock, Zap, TrendingDown } from 'lucide-react';

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

// Isolated memo so the 1-second interval only re-renders this component, not the product list
const CountdownDisplay = memo(function CountdownDisplay({ expirationDate }: { expirationDate: Date }) {
  const [countdown, setCountdown] = useState<CountdownState>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

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

  if (countdown.isExpired) return null;

  const units = [
    countdown.days > 0 ? { value: countdown.days, label: 'Jours', short: 'J' } : null,
    { value: countdown.hours, label: 'Heures', short: 'H' },
    { value: countdown.minutes, label: 'Min', short: 'Min' },
    { value: countdown.seconds, label: 'Sec', short: 'Sec' },
  ].filter(Boolean) as { value: number; label: string; short: string }[];

  return (
    <div className="relative bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-red-400/50 dark:border-red-600/50">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-white flex-shrink-0" />
        <span className="text-white/90 text-sm font-semibold uppercase tracking-wide">Temps restant</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {units.map(({ value, label, short }) => (
          <div
            key={label}
            className="bg-white/10 rounded-lg p-2 sm:p-3 text-center border border-white/20"
          >
            <div className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none">
              {String(value).padStart(2, '0')}
            </div>
            <div className="text-xs text-white/80 mt-1 uppercase">
              <span className="hidden sm:block">{label}</span>
              <span className="sm:hidden">{short}</span>
            </div>
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
  const earliestExpiration = useMemo(() => {
    const validDates = products
      .map(p => p.promo_expiration_date)
      .filter((d): d is string => !!d && new Date(d).getTime() > Date.now())
      .map(d => new Date(d).getTime());
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

  return (
    <section
      id="ventes-flash"
      className="relative py-16 sm:py-20 md:py-24 lg:py-28 overflow-hidden"
    >
      {/* Static background — no animated orbs to reduce TBT */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.06) 0%, rgba(249,115,22,0.06) 50%, rgba(220,38,38,0.06) 100%)' }}
      />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8 mb-8">
            {/* Left: Title & Stats */}
            <div className="flex-1 min-w-0 space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-4 flex-wrap"
              >
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-red-600 shadow-lg flex-shrink-0">
                  <Flame className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h2 className="font-display uppercase tracking-tight leading-none text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white">
                    Ventes flash
                  </h2>
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-1 w-24 origin-left bg-red-600 rounded-full mt-2 will-change-transform"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center gap-4 sm:gap-6 flex-wrap"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-200 dark:border-red-900">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                    {maxDiscount > 0 ? (
                      <>Jusqu'à <span className="text-red-600 dark:text-red-400">{maxDiscount}%</span> de réduction</>
                    ) : (
                      <>Offres du moment</>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-orange-200 dark:border-orange-900">
                  <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                    {products.length} produits
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right: Countdown (isolated memo — only this re-renders every second) */}
            {earliestExpiration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="w-full shrink-0 lg:max-w-[min(100%,22rem)] xl:max-w-[min(100%,26rem)]"
              >
                <CountdownDisplay expirationDate={earliestExpiration} />
              </motion.div>
            )}
          </div>

          {/* Subtitle & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 max-w-2xl leading-relaxed">
              ⚡ <strong>Offres limitées dans le temps</strong> – Profitez de réductions exceptionnelles sur nos meilleurs produits.
              Ne manquez pas cette opportunité unique !
            </p>
            <Button
              variant="outline"
              className="group min-h-[48px] sm:min-h-[52px] border-2 border-red-500 dark:border-red-400 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl px-6 sm:px-8 font-semibold"
              asChild
            >
              <Link href="/offres" aria-label="Voir toutes les offres et promos">
                <span className="hidden sm:inline">Voir toutes les offres</span>
                <span className="sm:hidden">Toutes les offres</span>
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Products Grid — no per-card motion wrapper; FlashProductCard already has its own animation */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-5 lg:gap-6">
          {products.map((product) => (
            <div key={product.id} className="w-full min-w-0">
              <FlashProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-12 sm:mt-16 text-center md:hidden">
          <Button
            variant="outline"
            className="w-full min-h-[52px] border-2 border-red-500 dark:border-red-400 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl font-semibold"
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
