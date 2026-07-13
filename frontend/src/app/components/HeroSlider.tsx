'use client';

import { useState } from 'react';
import { ArrowRight, Play, ShieldCheck, Truck, MessageCircle, X } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import type { Slide } from '@/types';
import type { HeroFirstSlide } from '@/app/page';

// Optimized, right-sized hero variants (pre-generated with sharp), served DIRECT-static so
// Cloudflare edge-caches them. Breakpoints match the <link rel=preload> in app/page.tsx (767/768)
// so the preloaded AVIF IS the one the browser paints → fast LCP. ONE image element = no double load.
const HERO_M_AVIF = '/slides/hero-m.avif';
const HERO_M_WEBP = '/slides/hero-m.webp';
const HERO_D_AVIF = '/slides/hero-d.avif';
const HERO_D_WEBP = '/slides/hero-d.webp';

// Optional promo video: set NEXT_PUBLIC_HERO_VIDEO_ID to a YouTube id to make "Voir la vidéo" open a
// player; otherwise it gracefully scrolls to the best-sellers rail (#products).
const VIDEO_ID = process.env.NEXT_PUBLIC_HERO_VIDEO_ID || '';

interface HeroSliderProps {
  slides?: Slide[] | any[];
  mobileFirst?: HeroFirstSlide;
  desktopFirst?: HeroFirstSlide;
}

const TRUST = [
  { Icon: ShieldCheck, title: 'Produits 100% Authentiques', sub: 'Garantie qualité et origine' },
  { Icon: Truck, title: 'Livraison Rapide', sub: 'Partout en Tunisie' },
  { Icon: MessageCircle, title: "Conseils d'Experts", sub: 'À votre écoute' },
] as const;

// Split hero: solid black content panel with a DIAGONAL edge over the athletes-and-products photo,
// red accent at the seam. Desktop = diagonal split; mobile = photo on top, content over a bottom scrim.
export function HeroSlider({ mobileFirst }: HeroSliderProps) {
  const [videoOpen, setVideoOpen] = useState(false);
  const alt = mobileFirst?.title || 'Whey, créatine et compléments — Protéine Tunisie';

  const onVideo = () => {
    if (VIDEO_ID) setVideoOpen(true);
    else document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const content = (
    <div className="w-full max-w-md lg:max-w-[27rem] xl:max-w-[32rem]">
      <span className="mb-3 block font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-red-500 sm:text-xs">
        100% Authentique • Livraison partout en Tunisie
      </span>
      {/* Slogan is a <p> (not <h1>) — the SEO H1 "Protéine Tunisie" lives in the lede below. */}
      <p className="font-display text-[2.6rem] font-bold uppercase leading-[0.85] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-6xl lg:text-[4rem] xl:text-7xl">
        Nutrition<br />Puissance<br />
        <span className="text-red-600">Résultats</span>
      </p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-300 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:mt-5 sm:text-base">
        Découvrez notre sélection des meilleures protéines, créatines et compléments pour atteindre vos objectifs.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap">
        <LinkWithLoading
          href="/shop"
          loadingMessage="Chargement..."
          aria-label="Découvrir nos produits"
          className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-lg bg-red-600 px-6 font-display text-sm font-semibold uppercase tracking-wide text-white shadow-[0_10px_24px_rgba(220,38,38,0.35)] transition-colors hover:bg-red-700 sm:w-auto sm:text-base"
        >
          Découvrir nos produits
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </LinkWithLoading>
        <button
          type="button"
          onClick={onVideo}
          className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-lg border border-white/20 bg-white/[0.06] px-6 font-display text-sm font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-white/10 sm:w-auto sm:text-base"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600">
            <Play className="h-3 w-3 fill-white text-white" aria-hidden="true" />
          </span>
          Voir la vidéo
        </button>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-x-5 gap-y-3.5 sm:mt-9 sm:grid-cols-3">
        {TRUST.map(({ Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
              <Icon className="h-5 w-5 text-red-500" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight text-white">{title}</p>
              <p className="text-[11px] leading-tight text-gray-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section
      className="relative w-full overflow-hidden bg-gray-950 min-h-[588px] sm:min-h-[620px] lg:h-[600px] xl:h-[640px]"
      aria-label="Bannière principale"
    >
      {/* ONE full-bleed image (products + athlete). Kept bright — the black panel/scrim below sit over
          the copy area only, so the photo itself never gets muddied. */}
      <picture className="absolute inset-0 block h-full w-full">
        <source type="image/avif" media="(max-width: 767px)" srcSet={HERO_M_AVIF} />
        <source type="image/webp" media="(max-width: 767px)" srcSet={HERO_M_WEBP} />
        <source type="image/avif" media="(min-width: 768px)" srcSet={HERO_D_AVIF} />
        <source type="image/webp" media="(min-width: 768px)" srcSet={HERO_D_WEBP} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_D_WEBP}
          alt={alt}
          width={1707}
          height={960}
          fetchPriority="high"
          decoding="async"
          loading="eager"
          className="h-full w-full object-cover object-[58%_82%] sm:object-[60%_78%] lg:object-[62%_center]"
        />
      </picture>

      {/* MOBILE: bottom scrim so the copy is legible over the lower half; photo stays clear up top */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-gray-950 from-30% via-gray-950/80 to-transparent lg:hidden"
        aria-hidden="true"
      />

      {/* DESKTOP: solid black panel with a diagonal right edge (48% at top → 40% at bottom) */}
      <div
        className="absolute inset-0 hidden bg-gray-950 lg:block"
        style={{ clipPath: 'polygon(0 0, 48% 0, 40% 100%, 0 100%)' }}
        aria-hidden="true"
      />
      {/* DESKTOP: thin red accent along the diagonal seam */}
      <div
        className="absolute inset-y-0 left-[44.5%] hidden w-[2px] -skew-x-[13deg] bg-gradient-to-b from-transparent via-red-600 to-transparent lg:block"
        aria-hidden="true"
      />

      {/* CONTENT — bottom on mobile, vertically-centered in the black panel on desktop */}
      <div className="absolute inset-0 z-10 flex items-end lg:items-center">
        <div className="mx-auto w-full max-w-7xl px-5 pb-9 sm:px-6 sm:pb-11 lg:px-8 lg:pb-0">
          {content}
        </div>
      </div>

      {videoOpen && VIDEO_ID && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vidéo de présentation"
          onClick={() => setVideoOpen(false)}
        >
          <div className="relative aspect-video w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setVideoOpen(false)}
              className="absolute -top-11 right-0 text-white/80 transition-colors hover:text-white"
              aria-label="Fermer la vidéo"
            >
              <X className="h-7 w-7" />
            </button>
            <iframe
              className="h-full w-full rounded-xl"
              src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
              title="Protéine Tunisie"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
}
