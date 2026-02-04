'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Flame, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';

const entryPaths = [
  {
    id: 'build-muscle',
    title: 'Prise de Masse',
    description: 'Gagnez du muscle rapidement avec nos gainers et protéines premium',
    icon: TrendingUp,
    gradient: 'from-red-500 to-orange-500',
    bgGradient: 'from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop&q=80',
    link: '/shop/prise-de-masse',
    color: 'red',
  },
  {
    id: 'lose-fat',
    title: 'Perte de Poids',
    description: 'Brûlez les graisses efficacement avec nos compléments spécialisés',
    icon: Flame,
    gradient: 'from-orange-500 to-yellow-500',
    bgGradient: 'from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&q=80',
    link: '/shop/perte-de-poids',
    color: 'orange',
  },
  {
    id: 'improve-performance',
    title: 'Performance',
    description: 'Optimisez vos performances avec nos pré-workouts et boosters',
    icon: Zap,
    gradient: 'from-blue-500 to-purple-500',
    bgGradient: 'from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=400&fit=crop&q=80',
    link: '/shop/complements-d-entrainement',
    color: 'blue',
  },
];

export function SmartEntryPaths() {
  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-24 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
            Trouvez votre parcours
          </h2>
          <p className="text-sm sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choisissez votre objectif et découvrez les produits parfaitement adaptés à vos besoins
          </p>
        </div>

        {/* Mobile: Horizontal scroll, Tablet: 2 columns, Desktop: 3 columns centered */}
        <div className="max-w-6xl mx-auto">
          {/* Mobile horizontal scroll */}
          <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4">
            {entryPaths.map((path) => {
              const Icon = path.icon;
              return (
                <article key={path.id} className="group relative flex-shrink-0 w-[85vw] snap-start">
                  <LinkWithLoading href={path.link} aria-label={`Découvrir les produits pour ${path.title}`} loadingMessage={`Chargement de ${path.title}...`}>
                    <div className={`relative h-full bg-gradient-to-br ${path.bgGradient} rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 min-h-[280px]`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" />
                      <div className="relative p-4 h-full flex flex-col">
                        <div className={`mb-4 w-12 h-12 rounded-xl bg-gradient-to-br ${path.gradient} flex items-center justify-center shadow-lg`} aria-hidden="true">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {path.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1 line-clamp-3">
                          {path.description}
                        </p>
                        <Button
                          className={`bg-gradient-to-r ${path.gradient} hover:opacity-90 text-white w-full min-h-[44px] text-sm`}
                          size="sm"
                        >
                          Découvrir
                          <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </LinkWithLoading>
                </article>
              );
            })}
          </div>
          
          {/* Tablet: 2 columns, Desktop: 3 columns centered grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 lg:gap-6">
            {entryPaths.map((path) => {
              const Icon = path.icon;
              return (
                <article key={path.id} className="group relative">
                  <LinkWithLoading href={path.link} aria-label={`Découvrir les produits pour ${path.title}`} loadingMessage={`Chargement de ${path.title}...`}>
                    <div className={`relative h-full bg-gradient-to-br ${path.bgGradient} rounded-xl lg:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-800 hover:-translate-y-1`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" />
                      <div className="relative p-5 lg:p-6 h-full flex flex-col">
                        {/* Icon - Smaller on desktop, top-left */}
                        <div className={`mb-3 lg:mb-4 w-12 h-12 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl bg-gradient-to-br ${path.gradient} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0`} aria-hidden="true">
                          <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                        </div>
                        
                        {/* Title - One line on desktop */}
                        <h3 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white mb-2 lg:mb-3 flex-shrink-0 line-clamp-1">
                          {path.title}
                        </h3>
                        
                        {/* Description - Max 2 lines on desktop */}
                        <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mb-4 lg:mb-5 flex-1 line-clamp-2">
                          {path.description}
                        </p>
                        
                        {/* CTA Button - Smaller, inline */}
                        <div className="mt-auto flex-shrink-0">
                          <Button
                            className={`bg-gradient-to-r ${path.gradient} hover:opacity-90 text-white w-full h-9 lg:h-10 text-sm lg:text-base group-hover:translate-x-1 transition-all`}
                            size="sm"
                          >
                            Découvrir
                            <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </LinkWithLoading>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
