'use client';

import React, { useState, useEffect, useLayoutEffect, memo, useMemo } from 'react';
import type { TouchEvent } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { HeroTrustGuarantee } from '@/app/components/HeroTrustGuarantee';
import { getStorageUrl } from '@/services/api';
import type { Slide } from '@/types';
import type { HeroFirstSlide } from '@/app/page';

const MOBILE_BREAKPOINT_PX = 768;

const fallbackSlides = [
  {
    id: 1,
    titre: 'Protéines Premium',
    description:
      "Commencez votre journée avec l'énergie parfaite : protéines premium de qualité pour booster vos performances et atteindre vos objectifs",
    lien: '/shop',
    image: '/hero/webp/hero1.webp',
  },
];

// Build a Next.js image optimization URL
function nextImgUrl(src: string, w: number, q = 75) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

// Build srcset string: "url 640w, url 828w, ..."
function buildSrcSet(src: string, widths: number[], q = 75) {
  return widths.map((w) => `${nextImgUrl(src, w, q)} ${w}w`).join(', ');
}

interface HeroSliderProps {
  slides?: Slide[] | any[];
  mobileFirst?: HeroFirstSlide;
  desktopFirst?: HeroFirstSlide;
}

// ─── Static first-frame component ────────────────────────────────────────────
// Renders as a native <picture> element in SSR HTML.
// The browser picks the right image source (mobile/desktop) WITHOUT any JS.
// This is what gets measured as LCP — it loads in parallel with the JS bundle.
const HeroFirstPicture = memo(function HeroFirstPicture({
  mobileFirst,
  desktopFirst,
}: {
  mobileFirst: HeroFirstSlide;
  desktopFirst: HeroFirstSlide;
}) {
  const mobileSrcSet = buildSrcSet(mobileFirst.imageUrl, [640, 750, 828, 1080]);
  const desktopSrcSet = buildSrcSet(desktopFirst.imageUrl, [1080, 1200]);

  return (
    <picture
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
      {/* Mobile: portrait / mobile-specific slide */}
      <source media="(max-width: 767px)" srcSet={mobileSrcSet} sizes="100vw" />
      {/* Desktop: landscape slide */}
      <source media="(min-width: 768px)" srcSet={desktopSrcSet} sizes="100vw" />
      {/* Fallback img — fetchPriority="high" so browser treats this as LCP resource */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={nextImgUrl(desktopFirst.imageUrl, 1200)}
        alt={desktopFirst.title}
        fetchPriority="high"
        decoding="async"
        loading="eager"
        className="object-cover object-center"
        style={{ width: '100%', height: '100%' }}
      />
    </picture>
  );
});

// ─── Non-first slides (not LCP critical) ─────────────────────────────────────
const SlideImage = memo(
  ({ src, alt, isFirst, className }: { src: string; alt: string; isFirst: boolean; className?: string }) => {
    const cls = 'object-cover object-center';
    if (!isFirst) {
      return (
        <Image src={src} alt={alt} fill className={className || cls} sizes="100vw" quality={75} loading="lazy" />
      );
    }
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority
        fetchPriority="high"
        className={className || cls}
        sizes="100vw"
        quality={75}
      />
    );
  }
);
SlideImage.displayName = 'SlideImage';

// ─── useIsMobile — fires before first browser paint via useLayoutEffect ──────
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isMobile;
}

// ─── Main HeroSlider ──────────────────────────────────────────────────────────
export const HeroSlider = memo(function HeroSlider({ slides, mobileFirst, desktopFirst }: HeroSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  // firstFrameActive: true until any carousel navigation happens.
  // While true and both hero props are set, renders <picture> (SSR-safe, no JS).
  // After first navigation, switches to next/image for carousel slides.
  const [firstFrameActive, setFirstFrameActive] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const finalSlidesToUse = useMemo(() => {
    if (!slides || slides.length === 0) return fallbackSlides;
    const withImage = slides.filter((s: any) => !!(s?.cover || s?.image || s?.image_path || s?.url));
    const typeFilter = isMobile ? 'mobile' : 'web';
    let filtered = withImage.filter((s: any) => (s.type || '').toLowerCase() === typeFilter);
    if (filtered.length === 0) filtered = withImage;
    if (filtered.length === 0) return fallbackSlides;
    const sorted = [...filtered].sort((a: any, b: any) => (a.ordre ?? a.order ?? 0) - (b.ordre ?? b.order ?? 0));
    return sorted.map((slide: any, index: number) => {
      const imagePath = slide.cover || slide.image || slide.image_path || slide.url || '';
      const stableId =
        slide.id != null && slide.id !== ''
          ? slide.id
          : slide.ordre != null || slide.order != null
          ? `ordre-${slide.ordre ?? slide.order}-${index}`
          : `slide-${index}`;
      return {
        id: stableId,
        titre: slide.titre || slide.title || slide.designation_fr || 'Protéines Premium',
        description: slide.description || slide.description_fr || 'Découvrez nos produits premium',
        lien: slide.lien || slide.link || slide.btn_link || slide.url || '/shop',
        image: imagePath ? getStorageUrl(imagePath) : '/hero/webp/hero1.webp',
      };
    });
  }, [slides, isMobile]);

  useEffect(() => {
    if (currentSlide >= finalSlidesToUse.length) setCurrentSlide(0);
  }, [finalSlidesToUse.length, currentSlide]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [isMobile]);

  // Autoplay — deactivates the <picture> first-frame so carousel takes over
  useEffect(() => {
    if (finalSlidesToUse.length <= 1) return;
    const timer = setInterval(() => {
      setFirstFrameActive(false);
      setCurrentSlide((prev) => (prev + 1) % finalSlidesToUse.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [finalSlidesToUse.length]);

  const goToSlide = (index: number) => {
    setFirstFrameActive(false);
    setCurrentSlide(index);
  };
  const nextSlide = () => goToSlide((currentSlide + 1) % finalSlidesToUse.length);
  const prevSlide = () => goToSlide((currentSlide - 1 + finalSlidesToUse.length) % finalSlidesToUse.length);

  if (!finalSlidesToUse.length) return null;

  const currentSlideData = finalSlidesToUse[currentSlide] || finalSlidesToUse[0];
  if (!currentSlideData?.image) return null;

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) nextSlide();
    if (distance < -minSwipeDistance) prevSlide();
  };

  // Whether we can use the native <picture> first-frame.
  // Both mobileFirst and desktopFirst must be provided from the server.
  const canUseFirstPicture = firstFrameActive && currentSlide === 0 && !!mobileFirst && !!desktopFirst;

  return (
    <section
      className="relative w-full overflow-hidden bg-gray-900 h-[85dvh] min-h-[480px] sm:h-[70vh] sm:min-h-0 md:h-[80vh] md:min-h-[420px] lg:h-[520px] xl:h-[600px] 2xl:h-[680px]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label="Hero carousel"
    >
      <div key={currentSlide} className="absolute inset-0 transition-opacity duration-300 ease-in-out">
        {canUseFirstPicture ? (
          // Static <picture> — renders in SSR HTML, browser picks mobile/desktop image natively.
          // Image starts downloading BEFORE any JavaScript runs → fast LCP.
          <HeroFirstPicture mobileFirst={mobileFirst!} desktopFirst={desktopFirst!} />
        ) : (
          <SlideImage
            src={currentSlideData.image}
            alt={currentSlideData.titre}
            isFirst={currentSlide === 0}
            className="object-cover object-center"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" aria-hidden="true" />

        {/* Content */}
        <div className="relative flex h-full w-full max-w-7xl mx-auto flex-col pl-14 pr-14 pb-28 pt-4 sm:pl-6 sm:pr-6 sm:pb-20 md:pb-16 lg:flex-row lg:items-center lg:px-8 lg:pb-10 lg:pt-0">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center lg:max-w-2xl lg:flex-none lg:justify-center xl:max-w-3xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight drop-shadow-lg">
              {currentSlideData.titre}
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-100 mb-4 sm:mb-6 md:mb-8 max-w-xl drop-shadow-md line-clamp-2 sm:line-clamp-none">
              {currentSlideData.description}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 md:px-10 lg:px-12 h-12 sm:h-14 md:h-16 text-sm sm:text-base md:text-lg lg:text-xl min-h-[56px] sm:min-h-[64px] md:min-h-[72px] min-w-[140px] sm:min-w-[160px] md:min-w-[180px] shadow-lg hover:shadow-xl transition-colors font-semibold"
                asChild
              >
                <LinkWithLoading href="/shop" aria-label="Découvrir nos produits" loadingMessage="Chargement...">
                  Découvrir nos produits
                </LinkWithLoading>
              </Button>
            </div>
            <div className="mt-6 hidden lg:block">
              <HeroTrustGuarantee layout="inline" />
            </div>
          </div>
          <div className="mb-1 shrink-0 pt-3 sm:mb-2 sm:pt-4 lg:hidden">
            <HeroTrustGuarantee layout="docked" />
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 sm:p-3 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center z-10 shadow-lg"
        aria-label="Slide précédent"
        type="button"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 sm:p-3 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center z-10 shadow-lg"
        aria-label="Slide suivant"
        type="button"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-3 z-10 items-center" role="tablist" aria-label="Indicateurs de diapositives">
        {finalSlidesToUse.map((slide, index) => (
          <button
            key={`hero-dot-${String(slide.id)}-${index}`}
            onClick={() => goToSlide(index)}
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
