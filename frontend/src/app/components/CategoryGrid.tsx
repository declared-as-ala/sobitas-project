'use client';

import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Category } from '@/types';
import { getStorageUrl } from '@/services/api';

interface CategoryGridProps {
  categories?: Category[];
}

export function CategoryGrid({ categories = [] }: CategoryGridProps) {
  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
            Nos Catégories
          </h2>
          <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explorez notre large gamme de produits pour tous vos objectifs
          </p>
        </div>

        {/* Categories Grid - 2 columns on mobile */}
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {categories.map((category, index) => (
              <article
                key={category.id}
                className="group relative h-40 sm:h-48 md:h-64 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
                style={{ minHeight: '160px' }} // Fixed min height for CLS
              >
                <Link href={`/shop?category=${category.slug}`} aria-label={`Voir les produits de ${category.designation_fr}`}>
                  {/* Background Image Container */}
                  <div className="absolute inset-0">
                    {category.cover ? (
                      <Image
                        src={getStorageUrl(category.cover)}
                        alt={category.designation_fr}
                        fill
                        className="object-cover transition-transform duration-300 sm:group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                        quality={70}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-800" aria-hidden="true" />
                    )}
                  </div>
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" aria-hidden="true" />
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-end p-3 sm:p-6">
                    <h3 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2 group-hover:translate-x-1 transition-transform line-clamp-2">
                      {category.designation_fr}
                    </h3>
                    <div className="flex items-center text-white/90 group-hover:text-red-400 transition-colors">
                      <span className="text-xs sm:text-sm font-medium">Découvrir</span>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 ring-2 ring-transparent group-hover:ring-red-500 rounded-2xl transition-all pointer-events-none" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            Aucune catégorie disponible
          </div>
        )}
      </div>
    </section>
  );
}
