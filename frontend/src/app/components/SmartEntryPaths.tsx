'use client';

import { Flame, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { SectionHeader } from '@/app/components/SectionHeader';

const entryPaths = [
  {
    id: 'build-muscle',
    title: 'Prise de Masse',
    description: 'Gagnez du muscle rapidement avec nos gainers et protéines premium',
    icon: TrendingUp,
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop&q=80',
    link: '/prise-de-masse',
  },
  {
    id: 'lose-fat',
    title: 'Perte de Poids',
    description: 'Brûlez les graisses efficacement avec nos compléments spécialisés',
    icon: Flame,
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&q=80',
    link: '/bruleurs-de-graisse',
  },
  {
    id: 'improve-performance',
    title: 'Performance',
    description: 'Optimisez vos performances avec nos pré-workouts et boosters',
    icon: Zap,
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=400&fit=crop&q=80',
    link: '/pre-workout',
  },
];

export function SmartEntryPaths() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Objectifs"
          title="Trouvez votre parcours"
          subtitle="Choisissez votre objectif et découvrez les produits parfaitement adaptés à vos besoins"
        />

        {/* Mobile: Horizontal scroll, Tablet: 2 columns, Desktop: 3 columns centered */}
        <div className="max-w-6xl mx-auto">
          {/* Mobile horizontal scroll */}
          <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4">
            {entryPaths.map((path) => {
              const Icon = path.icon;
              return (
                <article key={path.id} className="group relative flex-shrink-0 w-[85vw] snap-start">
                  <LinkWithLoading href={path.link} aria-label={`Découvrir les produits pour ${path.title}`} loadingMessage={`Chargement de ${path.title}...`}>
                    <div className="relative h-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 min-h-[280px]">
                      <div className="relative p-4 h-full flex flex-col">
                        <div className="mb-4 w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center" aria-hidden="true">
                          <Icon className="h-6 w-6" strokeWidth={1.75} />
                        </div>
                        <h3 className="font-display uppercase tracking-tight text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {path.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1 line-clamp-3">
                          {path.description}
                        </p>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide w-full min-h-[44px] text-sm"
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
                    <div className="relative h-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-800">
                      <div className="relative p-5 lg:p-6 h-full flex flex-col">
                        {/* Icon - top-left red chip */}
                        <div className="mb-3 lg:mb-4 w-12 h-12 lg:w-14 lg:h-14 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                          <Icon className="h-6 w-6 lg:h-7 lg:w-7" strokeWidth={1.75} />
                        </div>

                        {/* Title - One line on desktop */}
                        <h3 className="font-display uppercase tracking-tight text-lg lg:text-xl font-bold text-gray-900 dark:text-white mb-2 lg:mb-3 flex-shrink-0 line-clamp-1">
                          {path.title}
                        </h3>

                        {/* Description - Max 2 lines on desktop */}
                        <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mb-4 lg:mb-5 flex-1 line-clamp-2">
                          {path.description}
                        </p>

                        {/* CTA Button */}
                        <div className="mt-auto flex-shrink-0">
                          <Button
                            className="bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide w-full h-9 lg:h-10 text-sm lg:text-base"
                            size="sm"
                          >
                            Découvrir
                            <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5 ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true" />
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
