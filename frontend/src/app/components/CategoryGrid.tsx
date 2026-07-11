'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { SectionHeader } from '@/app/components/SectionHeader';
import Image from 'next/image';
import type { Category } from '@/types';
import { getStorageUrl } from '@/services/api';

// Placeholder when category has no cover or image fails (404/504) – sports/fitness themed
const CATEGORY_PLACEHOLDER_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23b91c1c"/><stop offset="100%" style="stop-color:%237f1d1d"/></linearGradient></defs><rect width="400" height="300" fill="url(%23g)"/><g fill="%23fff" opacity="0.15"><path d="M200 120h-24v60h24v-60zm-80 20h-20v40h20v-40zm160 0h-20v40h20v-40zm-100-30l-15 50h20l12-50h-17zm66 0l-12 50h20l15-50h-23z"/></g></svg>'
  );

interface CategoryGridProps {
  categories?: Category[];
}

function CategoryCard({ category }: { category: Category }) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const showImage = category.cover && !imageError;
  const imageUrl = category.cover ? getStorageUrl(category.cover) : '';
  const href = `/${category.slug}`;

  return (
    <article className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-200 ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
      <LinkWithLoading
        href={href}
        aria-label={`Voir les produits de ${category.designation_fr}`}
        loadingMessage={`Chargement de ${category.designation_fr}...`}
        onMouseEnter={() => router.prefetch(href)}
        className="absolute inset-0"
      >
        {/* Consistent aspect ratio for every tile across breakpoints. */}
        {showImage ? (
          <Image
            src={imageUrl}
            alt={category.designation_fr}
            fill
            className="object-cover object-center transition-transform duration-500 ease-out sm:group-hover:scale-105"
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 31vw, 23vw"
            loading="lazy"
            quality={70}
            onError={() => setImageError(true)}
          />
        ) : (
          <Image
            src={CATEGORY_PLACEHOLDER_SVG}
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 31vw, 23vw"
            aria-hidden="true"
            unoptimized
          />
        )}

        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" aria-hidden="true" />

        {/* Content */}
        <div className="relative flex h-full flex-col justify-end p-3 sm:p-5">
          <h3 className="font-display uppercase tracking-tight leading-none text-white text-base sm:text-xl md:text-2xl line-clamp-2">
            {category.designation_fr}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-white/80 transition-colors group-hover:text-red-400">
            <span className="font-display uppercase tracking-wide text-[11px] sm:text-xs font-semibold">Découvrir</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </div>
        </div>
      </LinkWithLoading>
    </article>
  );
}

export function CategoryGrid({ categories = [] }: CategoryGridProps) {
  // Never render an empty "Aucune catégorie disponible" state: if the section has no categories
  // (e.g. a transient API hiccup captured by ISR), hide the whole block instead of showing a
  // broken-looking message. The homepage server fetch also falls back to /categories.
  if (!Array.isArray(categories) || categories.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader kicker="Par objectif" title="Catégories populaires" viewAllHref="/shop" />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}
