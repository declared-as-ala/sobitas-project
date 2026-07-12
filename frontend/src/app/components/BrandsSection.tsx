'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Skeleton } from '@/app/components/ui/skeleton';
import { SectionHeader } from '@/app/components/SectionHeader';
import { getAllBrands, getStorageUrl } from '@/services/api';
import type { Brand } from '@/types';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';
import { buildBrandAlt } from '@/util/productAlt';

// How many logos to show on the homepage before "Toutes les marques".
const MAX_BRANDS = 12;

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

// Brand tile — a clean logo-wall cell (colored logo, subtle lift on hover).
function BrandCard({ brand, onNavigate }: { brand: Brand; onNavigate: (slug: string) => void }) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;
  const brandSlug = nameToSlug(brand.designation_fr);

  return (
    <button
      type="button"
      onClick={() => onNavigate(brandSlug)}
      aria-label={`Voir les produits ${brand.designation_fr}`}
      className="group flex aspect-[3/2] items-center justify-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-red-500/30"
    >
      {logoUrl && !imageError ? (
        <Image
          src={logoUrl}
          alt={buildBrandAlt(brand.designation_fr, brand.alt_cover)}
          width={200}
          height={100}
          className="max-h-[70%] max-w-[82%] object-contain opacity-90 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw"
          loading="lazy"
          onError={() => setImageError(true)}
        />
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

  const gridClass = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6';

  // Fixed grid skeleton while fetching — reserves the final layout, zero layout shift.
  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            kicker="Marques"
            title="Nos marques partenaires"
            subtitle="Distributeur officiel des plus grandes marques internationales."
          />
          <div className={gridClass} aria-hidden="true">
            {Array.from({ length: MAX_BRANDS }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/2] rounded-2xl" />
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
          viewAllHref="/brands"
          viewAllLabel="Toutes les marques"
        />

        <div className={gridClass}>
          {brands.slice(0, MAX_BRANDS).map((brand) => (
            <BrandCard key={brand.id} brand={brand} onNavigate={handleBrandNavigate} />
          ))}
        </div>
      </div>
    </section>
  );
}
