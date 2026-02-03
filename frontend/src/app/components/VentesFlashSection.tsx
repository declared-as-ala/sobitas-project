'use client';

import { memo, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ProductCard } from './ProductCard';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, Zap, Flame } from 'lucide-react';

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
  if (products.length === 0) return null;

  // Smart grid logic: 4 or fewer = one row, more than 4 = 4 per row
  const isFourOrLess = products.length <= 4;
  const firstRowProducts = products.slice(0, 4);
  const remainingProducts = products.slice(4);

  // Add dynamic CSS for grid columns on large screens
  useEffect(() => {
    if (isFourOrLess && typeof document !== 'undefined') {
      const styleId = 'ventes-flash-grid-style';
      let styleElement = document.getElementById(styleId);
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = `
        @media (min-width: 1024px) {
          .ventes-flash-first-row {
            grid-template-columns: repeat(${products.length}, minmax(0, 1fr)) !important;
          }
        }
      `;
    }
  }, [isFourOrLess, products.length]);

  return (
    <section
      id="ventes-flash"
      className="relative py-10 sm:py-12 md:py-16 lg:py-20 overflow-hidden bg-gradient-to-br from-red-50 via-orange-50/50 to-white dark:from-red-950/10 dark:via-orange-950/10 dark:to-gray-950"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-200/20 dark:bg-red-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-200/20 dark:bg-orange-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section - Enhanced */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 sm:mb-10 md:mb-12 gap-4 sm:gap-6">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4"
            >
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
                <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-600 dark:from-red-400 dark:via-orange-400 dark:to-red-400 bg-clip-text text-transparent animate-gradient">
                Ventes Flash
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed"
            >
              Offres limitées – Ne manquez pas ces promotions exclusives avec des réductions exceptionnelles
            </motion.p>
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-shrink-0"
          >
            <Button
              variant="outline"
              className="group min-h-[44px] sm:min-h-[48px] border-2 border-red-500 dark:border-red-400 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all duration-300 shadow-md hover:shadow-lg rounded-xl px-4 sm:px-6"
              asChild
            >
              <Link href="/offres" aria-label="Voir toutes les offres et promos">
                <span className="hidden sm:inline">Voir toutes les offres</span>
                <span className="sm:hidden">Toutes les offres</span>
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Products Grid - Smart responsive layout */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* First Row: 4 or fewer = all in one row, more than 4 = first 4 */}
          <div 
            className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 ${isFourOrLess ? 'ventes-flash-first-row' : 'lg:grid-cols-4 xl:grid-cols-4'} gap-3 sm:gap-4 md:gap-5 lg:gap-4 xl:gap-6`}
          >
            {firstRowProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="w-full min-w-0"
              >
                <ProductCard
                  product={product as any}
                  showBadge
                  badgeText="Promo"
                />
              </motion.div>
            ))}
          </div>

          {/* Remaining Products: Only show if more than 4 */}
          {remainingProducts.length > 0 && (
            <div 
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-4 xl:gap-6"
            >
              {remainingProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: (index + 4) * 0.1 }}
                  className="w-full min-w-0"
                >
                  <ProductCard
                    product={product as any}
                    showBadge
                    badgeText="Promo"
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-8 sm:mt-10 text-center md:hidden"
        >
          <Button
            variant="outline"
            className="w-full min-h-[48px] border-2 border-red-500 dark:border-red-400 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all duration-300 shadow-md hover:shadow-lg rounded-xl"
            asChild
          >
            <Link href="/offres" aria-label="Voir toutes les offres et promos">
              Voir toutes les offres
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
});
