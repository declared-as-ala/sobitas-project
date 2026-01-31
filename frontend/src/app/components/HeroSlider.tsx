'use client';

import React, { useState, useEffect, memo, useMemo } from 'react';
import type { TouchEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { getStorageUrl } from '@/services/api';
import type { Slide } from '@/types';

// Breakpoint: show mobile slides below this width, web slides at or above
const MOBILE_BREAKPOINT_PX = 768;

// Fallback static slides (used only if API returns no slides)
const fallbackSlides = [
  {
    id: 1,
    titre: "Protéines Premium",
    description: "Commencez votre journée avec l'énergie parfaite : protéines premium de qualité pour booster vos performances et atteindre vos objectifs",
    lien: "/shop",
    image: "/hero/webp/hero1.webp",
  },
];

interface HeroSliderProps {
  slides?: Slide[] | any[];
}

// Optimized slide image component - optimized for production performance
const SlideImage = memo(({ 
  src, 
  alt, 
  isFirst, 
  className 
}: { 
  src: string; 
  alt: string; 
  isFirst: boolean;
  className?: string;
}) => {
  // Mobile: cover + center (no vertical gap). sm+: contain for full image.
  const imageClass = 'object-cover object-center sm:object-contain';
  if (!isFirst) {
    // Lazy load non-first slides for faster initial load (quality 75 for mobile PageSpeed)
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className || imageClass}
        sizes="100vw"
        quality={75}
        loading="lazy"
      />
    );
  }
  
  // First slide - critical for LCP; quality 75 saves ~9 KiB and improves LCP on mobile
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority
      fetchPriority="high"
      className={className || imageClass}
      sizes="(max-width: 768px) 100vw, 100vw"
      quality={75}
    />
  );
});
SlideImage.displayName = 'SlideImage';

// Hook: true when viewport is mobile (< MOBILE_BREAKPOINT_PX)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isMobile;
}

export const HeroSlider = memo(function HeroSlider({ slides }: HeroSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // Transform API slides: use getStorageUrl, sort by ordre, filter by type (mobile vs web)
  const slidesToUse = useMemo(() => {
    if (!slides || slides.length === 0) return fallbackSlides;

    const withImage = slides.filter((slide: any) => {
      if (!slide) return false;
      const hasImage = slide.image || slide.image_path || slide.cover || slide.url;
      return !!hasImage;
    });

    // Filter by device: mobile view → type 'mobile', desktop → type 'web'
    const typeFilter = isMobile ? 'mobile' : 'web';
    let filtered = withImage.filter((slide: any) => (slide.type || '').toLowerCase() === typeFilter);
    // If no slides for this device type, use the other type so the slider never breaks
    if (filtered.length === 0) filtered = withImage;

    const sorted = [...filtered].sort((a: any, b: any) => (a.ordre || a.order || 0) - (b.ordre || b.order || 0));
    const transformed = sorted.map((slide: any) => {
      const imagePath = slide.image || slide.image_path || slide.cover || slide.url || '';
      return {
        id: slide.id || Math.random(),
        titre: slide.titre || slide.title || slide.designation_fr || 'Protéines Premium',
        description: slide.description || slide.description_fr || 'Découvrez nos produits premium',
        lien: slide.lien || slide.link || slide.btn_link || slide.url || '/shop',
        image: imagePath ? getStorageUrl(imagePath) : '/hero/webp/hero1.webp',
      };
    });

    return transformed.length > 0 ? transformed : fallbackSlides;
  }, [slides, isMobile]);

  // Reset currentSlide if out of bounds or when switching mobile ↔ web
  useEffect(() => {
    if (currentSlide >= slidesToUse.length) {
      setCurrentSlide(0);
    }
  }, [slidesToUse.length, currentSlide]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [isMobile]);

  useEffect(() => {
    if (slidesToUse.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev: number) => (prev + 1) % slidesToUse.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slidesToUse.length]);

  const nextSlide = () => {
    setCurrentSlide((prev: number) => (prev + 1) % slidesToUse.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev: number) => (prev - 1 + slidesToUse.length) % slidesToUse.length);
  };

  // Safety check: ensure currentSlideData exists and slidesToUse is not empty
  if (!slidesToUse || slidesToUse.length === 0) {
    return null; // Don't render if no slides
  }

  const currentSlideData = slidesToUse[currentSlide] || slidesToUse[0];
  
  // Final safety check
  if (!currentSlideData || !currentSlideData.image) {
    return null;
  }

  const isFirstSlide = currentSlide === 0;
  // Photos 4 and 7 (indices 3, 6) should be wider
  const isWideSlide = currentSlide === 3 || currentSlide === 6;
  // Photo 1 (index 0) - minimized width
  const isPhoto1 = currentSlide === 0;
  // Photo 3 (index 2) uses minimal scale
  const isPhoto3 = currentSlide === 2;

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
  };

  return (
    <section 
      className="relative w-full overflow-hidden bg-gray-900 min-h-[100dvh] h-[100dvh] sm:h-[65vh] sm:min-h-0 md:h-[75vh] md:min-h-[380px] lg:h-[85vh] xl:h-[90vh]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label="Hero carousel"
    >
      <div 
        key={currentSlide}
        className="absolute inset-0 transition-opacity duration-300 ease-in-out"
        style={{ willChange: 'opacity' }}
      >
        {/* Mobile: cover + centered (no letterboxing). Tablet+: contain for full image. */}
        <SlideImage
          src={currentSlideData.image}
          alt={currentSlideData.titre}
          isFirst={isFirstSlide}
          className="object-cover object-center sm:object-contain"
        />
        
        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" aria-hidden="true" />

        {/* Content - Responsive and centered */}
        <div className="relative h-full w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="max-w-2xl lg:max-w-3xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight drop-shadow-lg">
              {currentSlideData.titre}
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-100 mb-4 sm:mb-6 md:mb-8 max-w-xl drop-shadow-md line-clamp-2 sm:line-clamp-none">
              {currentSlideData.description}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4">
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 md:px-8 h-10 sm:h-12 text-xs sm:text-sm md:text-base min-h-[44px] sm:min-h-[48px] min-w-[100px] sm:min-w-[120px] shadow-lg hover:shadow-xl transition-colors"
                asChild
              >
                <Link href={currentSlideData.lien} aria-label="Découvrir nos produits">
                  Découvrir
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-4 sm:px-6 md:px-8 h-10 sm:h-12 text-xs sm:text-sm md:text-base min-h-[44px] sm:min-h-[48px] min-w-[140px] sm:min-w-[160px] backdrop-blur-sm shadow-lg hover:shadow-xl transition-colors"
                asChild
              >
                <Link href="/shop" aria-label="Voir toutes les catégories de produits">Voir Catégories</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows - Responsive and accessible */}
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 sm:p-3 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center z-10 shadow-lg hover:shadow-xl"
        aria-label="Slide précédent"
        type="button"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 sm:p-3 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center z-10 shadow-lg hover:shadow-xl"
        aria-label="Slide suivant"
        type="button"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </button>

      {/* Indicators - Much smaller on mobile, subtle opacity */}
      <div className="absolute bottom-3 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-3 z-10 items-center" role="tablist" aria-label="Indicateurs de diapositives">
        {slidesToUse.map((slide: { id: number }, index: number) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlide(index)}
            role="tab"
            aria-selected={index === currentSlide}
            aria-label={`Aller à la diapositive ${index + 1}`}
            className={`rounded-full transition-all flex items-center justify-center ${
              index === currentSlide 
                ? 'h-2 w-8 sm:h-3 sm:w-12 bg-red-600 shadow-lg opacity-100' 
                : 'h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white/30 hover:bg-white/50 opacity-60'
            }`}
            type="button"
          >
            <span className="sr-only">Diapositive {index + 1}</span>
          </button>
        ))}
      </div>
    </section>
  );
});
