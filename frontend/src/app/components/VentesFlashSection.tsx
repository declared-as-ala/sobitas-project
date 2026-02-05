'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
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
  [key: string]: unknown;
}

interface VentesFlashSectionProps {
  products: FlashProduct[];
}

export const VentesFlashSection = memo(function VentesFlashSection({ products }: VentesFlashSectionProps) {
  // Find the earliest expiration date for the main countdown timer
  const earliestExpiration = useMemo(() => {
    const validDates = products
      .map(p => p.promo_expiration_date)
      .filter((date): date is string => !!date && new Date(date).getTime() > Date.now())
      .map(date => new Date(date).getTime());
    
    if (validDates.length === 0) return null;
    return new Date(Math.min(...validDates));
  }, [products]);

  // Real-time countdown timer state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  // Update countdown every second
  useEffect(() => {
    if (!earliestExpiration) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      return;
    }

    const updateCountdown = () => {
      const currentTime = new Date();
      const diff = Math.max(0, earliestExpiration.getTime() - currentTime.getTime());
      
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      setCountdown({ days, hours, minutes, seconds, isExpired: false });
    };

    // Update immediately
    updateCountdown();
    // Then update every second
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [earliestExpiration]);

  // Early return after hooks
  if (products.length === 0) return null;

  // Calculate average discount for stats
  const averageDiscount = useMemo(() => {
    const discounts = products
      .map(p => {
        const prix = p.prix ?? 0;
        const promo = p.promo ?? 0;
        if (prix > 0 && promo > 0 && promo < prix) {
          return Math.round(((prix - promo) / prix) * 100);
        }
        return 0;
      })
      .filter(d => d > 0);
    return discounts.length > 0 
      ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length)
      : 0;
  }, [products]);

  return (
    <section
      id="ventes-flash"
      className="relative py-16 sm:py-20 md:py-24 lg:py-28 overflow-hidden"
    >
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient overlay with animation */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-orange-500/10 to-red-600/10 dark:from-red-900/20 dark:via-orange-900/20 dark:to-red-900/20"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
        
        {/* Animated orbs */}
        <motion.div
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-400/20 dark:bg-red-900/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-400/20 dark:bg-orange-900/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Sparkle effects */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-red-500/40 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + (i % 3) * 30}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Container with increased max-width */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Header Section - Completely Redesigned */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8 mb-8">
            {/* Left: Title & Stats */}
            <div className="flex-1 space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-4 flex-wrap"
              >
                <motion.div
                  className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-red-600 shadow-2xl"
                  animate={{
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Flame className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-red-500/50 blur-xl"
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                </motion.div>
                
                <div>
                  <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-red-600 via-orange-600 to-red-600 dark:from-red-400 dark:via-orange-400 dark:to-red-400 bg-clip-text text-transparent leading-tight">
                    VENTES FLASH
                  </h2>
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    whileInView={{ opacity: 1, width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-full mt-2"
                  />
                </div>
              </motion.div>

              {/* Stats Bar */}
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
                    Jusqu'à <span className="text-red-600 dark:text-red-400">{averageDiscount}%</span> de réduction
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

            {/* Right: Countdown Timer - Large & Prominent */}
            {!countdown.isExpired && earliestExpiration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="lg:flex-shrink-0"
              >
                <div className="relative bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-2xl p-6 sm:p-8 shadow-2xl border-2 border-red-400/50 dark:border-red-600/50">
                  {/* Pulsing background effect */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-red-500/30 blur-2xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      <span className="text-white/90 text-sm sm:text-base font-semibold uppercase tracking-wider">
                        Temps restant
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                      {countdown.days > 0 && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={countdown.days}
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              className="text-2xl sm:text-3xl md:text-4xl font-black text-white tabular-nums"
                            >
                              {String(countdown.days).padStart(2, '0')}
                            </motion.div>
                          </AnimatePresence>
                          <div className="text-[10px] sm:text-xs text-white/80 mt-1 uppercase">Jours</div>
                        </div>
                      )}
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={countdown.hours}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-black text-white tabular-nums"
                          >
                            {String(countdown.hours).padStart(2, '0')}
                          </motion.div>
                        </AnimatePresence>
                        <div className="text-[10px] sm:text-xs text-white/80 mt-1 uppercase">Heures</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={countdown.minutes}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-black text-white tabular-nums"
                          >
                            {String(countdown.minutes).padStart(2, '0')}
                          </motion.div>
                        </AnimatePresence>
                        <div className="text-[10px] sm:text-xs text-white/80 mt-1 uppercase">Minutes</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={countdown.seconds}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-black text-white tabular-nums"
                          >
                            {String(countdown.seconds).padStart(2, '0')}
                          </motion.div>
                        </AnimatePresence>
                        <div className="text-[10px] sm:text-xs text-white/80 mt-1 uppercase">Secondes</div>
                      </div>
                    </div>
                  </div>
                </div>
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

        {/* Products Grid - Enhanced with staggered animations */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.08,
                type: 'spring',
                stiffness: 100
              }}
              className="w-full min-w-0"
            >
              <FlashProductCard product={product} />
            </motion.div>
          ))}
        </div>

        {/* Mobile CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 sm:mt-16 text-center md:hidden"
        >
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
        </motion.div>
      </div>
    </section>
  );
});
