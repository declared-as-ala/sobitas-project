'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { SectionHeader } from '@/app/components/SectionHeader';
import { getAllBrands, getStorageUrl } from '@/services/api';
import type { Brand } from '@/types';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';
import { buildBrandAlt } from '@/util/productAlt';

// Helper to generate slug from name
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();
}

// Brand card — resting logo only; navigation feedback is handled by the global loader.
function BrandCard({ brand, onNavigate }: { brand: Brand; onNavigate: (slug: string) => void }) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;
  const brandSlug = nameToSlug(brand.designation_fr);

  return (
    <button
      type="button"
      onClick={() => onNavigate(brandSlug)}
      aria-label={`Voir les produits ${brand.designation_fr}`}
      className="group flex h-32 sm:h-36 w-48 sm:w-56 md:w-64 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6 transition-colors hover:border-red-500 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-red-500"
    >
      {logoUrl && !imageError ? (
        <div className="relative flex h-full w-full min-h-[80px] items-center justify-center">
          <Image
            src={logoUrl}
            alt={buildBrandAlt(brand.designation_fr, brand.alt_cover)}
            width={200}
            height={100}
            className="max-h-full max-w-full object-contain p-1 transition-transform duration-300 group-hover:scale-105 sm:p-2"
            sizes="(max-width: 640px) 192px, (max-width: 768px) 224px, 256px"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <span className="line-clamp-2 px-2 text-center text-xs sm:text-sm font-semibold text-gray-700 transition-colors group-hover:text-red-600 dark:text-gray-300 dark:group-hover:text-red-400">
          {brand.designation_fr}
        </span>
      )}
    </button>
  );
}

export function BrandsSection() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setLoading, setLoadingMessage } = useLoading();

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const brandsData = await getAllBrands();
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching brands:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = 300;
    el.scrollTo({ left: el.scrollLeft + (direction === 'left' ? -amount : amount), behavior: 'smooth' });
  };

  const handleBrandNavigate = async (slug: string) => {
    setLoadingMessage(
      `Chargement de ${brands.find((b) => nameToSlug(b.designation_fr) === slug)?.designation_fr || 'la marque'}...`
    );
    setLoading(true);

    // Prefetch then navigate — the global loader persists until the page loads.
    router.prefetch(`/${slug}`);
    try {
      await router.push(`/${slug}`);
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false);
    }
  };

  // Fixed-height skeleton row while fetching — reserves the final layout, zero layout shift.
  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            kicker="Marques"
            title="Nos marques partenaires"
            subtitle="Distributeur officiel des plus grandes marques internationales."
          />
          <div className="flex gap-4 sm:gap-6 overflow-hidden px-2" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 sm:h-36 w-48 sm:w-56 md:w-64 flex-shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Marques"
          title="Nos marques partenaires"
          subtitle="Distributeur officiel des plus grandes marques internationales."
        />

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 rounded-full bg-white shadow-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 md:flex"
            onClick={() => scroll('left')}
            aria-label="Défiler vers la gauche"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>

          {/* Horizontal scroll — users swipe/drag; no auto-scroll marquee */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth scrollbar-hide px-2 pb-2"
          >
            {brands.map((brand) => (
              <BrandCard key={brand.id} brand={brand} onNavigate={handleBrandNavigate} />
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 rounded-full bg-white shadow-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 md:flex"
            onClick={() => scroll('right')}
            aria-label="Défiler vers la droite"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400 md:hidden">
          Faites glisser pour voir plus
        </p>
      </div>
    </section>
  );
}
