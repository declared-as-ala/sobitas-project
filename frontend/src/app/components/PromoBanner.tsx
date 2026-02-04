'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ArrowRight } from 'lucide-react';

export function PromoBanner() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=600&fit=crop&q=80)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-red-900/50" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="inline-block">
              <span className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                Offre Limitée
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Transformez Votre Corps Maintenant
            </h2>
            
            <p className="text-xl text-gray-200">
              Jusqu'à <span className="text-red-400 font-bold text-3xl">-30%</span> sur une sélection de produits premium
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 h-14 text-lg group" asChild>
                <LinkWithLoading href="/offres" loadingMessage="Chargement des offres...">
                  Voir les Offres
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </LinkWithLoading>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black px-8 h-14 text-lg" asChild>
                <LinkWithLoading href="/shop" loadingMessage="Chargement de la boutique...">
                  En Savoir Plus
                </LinkWithLoading>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-red-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-1/4 w-40 h-40 bg-red-600/10 rounded-full blur-3xl" />
    </section>
  );
}
