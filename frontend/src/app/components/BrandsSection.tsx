'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { getAllBrands, getStorageUrl } from '@/services/api';
import type { Brand } from '@/types';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';

// Helper to generate slug from name
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();
}

// Brand Card Component
function BrandCard({ brand, index, onNavigate }: { brand: Brand; index: number; onNavigate: (slug: string) => void }) {
  const [imageError, setImageError] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;
  const brandSlug = nameToSlug(brand.designation_fr);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsNavigating(true);
    onNavigate(brandSlug);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="flex-shrink-0 group relative"
    >
      <button
        onClick={handleClick}
        disabled={isNavigating}
        className="block bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 h-32 sm:h-36 w-48 sm:w-56 md:w-64 flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 hover:shadow-xl transition-all duration-300 cursor-pointer disabled:opacity-75 disabled:cursor-wait flex-shrink-0"
      >
        {isNavigating ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 text-red-600 dark:text-red-400 animate-spin" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Chargement...</span>
          </div>
        ) : (
          <>
            {logoUrl && !imageError ? (
              <div className="relative w-full h-full min-h-[80px] flex items-center justify-center">
                <Image
                  src={logoUrl}
                  alt={brand.designation_fr || brand.alt_cover || 'Brand logo'}
                  width={200}
                  height={100}
                  className="object-contain max-w-full max-h-full p-1 sm:p-2 group-hover:scale-110 transition-transform duration-300"
                  sizes="(max-width: 640px) 192px, (max-width: 768px) 224px, 256px"
                  loading={index < 5 ? "eager" : "lazy"}
                  unoptimized
                  onError={() => {
                    console.error('Brand image failed to load:', logoUrl);
                    setImageError(true);
                  }}
                  onLoad={() => {
                    // Image loaded successfully
                  }}
                />
              </div>
            ) : (
              <div className="text-center w-full px-2">
                <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
                  {brand.designation_fr}
                </p>
              </div>
            )}
          </>
        )}
      </button>
    </motion.div>
  );
}

const SCROLL_AMOUNT = 280;
const AUTO_SCROLL_INTERVAL_MS = 2500;

export function BrandsSection() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
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

  // Auto-scroll in real-time, pause on hover; duplicate list for seamless loop
  const brandsForScroll = brands.length > 0 ? [...brands, ...brands] : [];

  useEffect(() => {
    if (brands.length === 0 || isPaused) return;

    const el = scrollContainerRef.current;
    if (!el) return;

    const tick = () => {
      const { scrollWidth } = el;
      const halfWidth = scrollWidth / 2;
      const scrollLeft = el.scrollLeft;
      if (scrollLeft >= halfWidth) el.scrollLeft = scrollLeft - halfWidth;
      const next = el.scrollLeft + SCROLL_AMOUNT;
      el.scrollTo({ left: next, behavior: 'smooth' });
    };

    const id = setInterval(tick, AUTO_SCROLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [brands.length, isPaused]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth',
      });
    }
  };

  const handleBrandNavigate = async (slug: string) => {
    setIsNavigating(true);
    setLoadingMessage(`Chargement de ${brands.find(b => nameToSlug(b.designation_fr) === slug)?.designation_fr || 'la marque'}...`);
    setLoading(true);
    
    // Prefetch the page for faster navigation
    router.prefetch(`/brand/${slug}`);
    // Navigate immediately - the loading state will persist until page loads
    try {
      await router.push(`/brand/${slug}`);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      setLoading(false);
    }
  };

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (brands.length === 0) {
    return null; // Don't show section if no brands
  }

  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Nos Marques Partenaires
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Distributeur officiel des plus grandes marques internationales
          </p>
        </motion.div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Left Scroll Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full h-10 w-10 hidden md:flex"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Scrollable Brands Container - auto-scroll, pause on hover */}
          <div
            ref={scrollContainerRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex gap-6 overflow-x-auto scroll-smooth pb-4 px-2 scrollbar-hide"
          >
            {brandsForScroll.map((brand, index) => (
              <BrandCard 
                key={`${brand.id}-${index}`} 
                brand={brand} 
                index={index} 
                onNavigate={handleBrandNavigate}
              />
            ))}
          </div>

          {/* Right Scroll Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full h-10 w-10 hidden md:flex"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Scroll Indicator (for mobile) */}
        <div className="flex justify-center mt-4 md:hidden">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Faites glisser pour voir plus
          </p>
        </div>
      </div>
    </section>
  );
}
