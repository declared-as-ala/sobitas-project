'use client';

import React, { useState, useEffect, memo, useMemo } from 'react';
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

function resolveSlideImageUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('/') || /^(https?:|data:|blob:)/i.test(path)) return path;
  return getStorageUrl(path);
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
  // q=50 on mobile matches the preload hint in page.tsx — ensures preload cache hit.
  const mobileSrcSet = buildSrcSet(mobileFirst.imageUrl, [640, 750, 828], 50);
  const desktopSrcSet = buildSrcSet(desktopFirst.imageUrl, [1080, 1200], 75);

  return (
    <picture
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
      {/* Mobile: q=50 keeps file size small on slow connections */}
      <source media="(max-width: 767px)" srcSet={mobileSrcSet} sizes="100vw" />
      {/* Desktop: q=75 for high fidelity on large screens */}
      <source media="(min-width: 768px)" srcSet={desktopSrcSet} sizes="100vw" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={nextImgUrl(mobileFirst.imageUrl, 828, 50)}
        alt={mobileFirst.title}
        width={828}
        height={466}
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

// Viewport hint used after hydration; the first LCP image is selected by <picture>.
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
        lien: slide.lien || slide.link || slide.btn_link || '/shop',
        image: imagePath ? resolveSlideImageUrl(imagePath) : '/hero/webp/hero1.webp',
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
  const heroHref = currentSlideData.lien || '/shop';

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
      className="relative w-full overflow-hidden bg-gray-900 h-[82dvh] min-h-[500px] sm:h-[70vh] sm:min-h-0 md:h-[80vh] md:min-h-[420px] lg:h-[520px] xl:h-[600px] 2xl:h-[680px]"
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
            className="object-cover object-[68%_52%] sm:object-[62%_46%] md:object-center brightness-[0.84] contrast-[1.08] saturate-[0.92] md:brightness-100 md:contrast-100 md:saturate-100"
          />
        )}

        {/* Mobile-first cinematic overlays for text readability and cleaner hierarchy */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/42 to-black/24 md:bg-gradient-to-r md:from-black/58 md:via-black/24 md:to-transparent"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 top-0 h-[44%] bg-gradient-to-b from-black/88 via-black/68 to-transparent backdrop-blur-[1px] md:hidden"
          aria-hidden="true"
        />
        <div
          className="absolute -right-20 top-[22%] h-64 w-64 rounded-full bg-amber-200/10 blur-3xl md:hidden"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/62 via-black/28 to-transparent md:h-44 md:from-black/30 md:via-black/10"
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-5 pb-24 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-6 sm:pb-20 md:pb-16 md:pt-16 lg:flex-row lg:items-center lg:px-8 lg:pb-10 lg:pt-0">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-start justify-start text-left lg:max-w-2xl lg:flex-none lg:justify-center xl:max-w-3xl">
            <h2 className="max-w-[13ch] text-[2.05rem] font-extrabold leading-[1.04] tracking-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.65)] sm:max-w-[14ch] sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl">
              {currentSlideData.titre}
            </h2>
            <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-white/92 drop-shadow-[0_2px_10px_rgba(0,0,0,0.58)] sm:mt-4 sm:max-w-[32ch] sm:text-base md:text-lg lg:text-xl">
              {currentSlideData.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 sm:mt-6 md:mt-7 md:gap-4">
              <Button
                size="lg"
                className="min-h-[50px] min-w-[178px] rounded-xl bg-gradient-to-b from-red-500 to-red-600 px-7 text-base font-semibold text-white shadow-[0_12px_28px_rgba(239,68,68,0.34)] transition-all hover:from-red-500 hover:to-red-700 hover:shadow-[0_14px_30px_rgba(239,68,68,0.45)] sm:min-h-[52px] sm:min-w-[190px] sm:px-8 md:min-h-[60px] md:px-10 md:text-lg lg:px-12 lg:text-xl"
                asChild
              >
                <LinkWithLoading href={heroHref} aria-label="Découvrir nos produits" loadingMessage="Chargement...">
                  Découvrir nos produits
                </LinkWithLoading>
              </Button>
            </div>
            <div className="mt-6 hidden lg:block">
              <HeroTrustGuarantee layout="inline" />
            </div>
          </div>
        </div>

        {/* Mobile trust card: visible on phones with safe spacing */}
        <div className="absolute inset-x-0 bottom-[2rem] z-[2] mx-auto w-[86%] max-w-sm scale-[0.96] sm:bottom-[2rem] sm:w-[82%] sm:scale-100 lg:hidden">
          <HeroTrustGuarantee layout="docked" />
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-2 top-[58%] hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-2 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/20 sm:left-4 sm:top-1/2 sm:flex sm:p-3"
        aria-label="Slide précédent"
        type="button"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 top-[58%] hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-2 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/20 sm:right-4 sm:top-1/2 sm:flex sm:p-3"
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
