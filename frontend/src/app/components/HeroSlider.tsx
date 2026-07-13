'use client';

import { useState } from 'react';
import { ArrowRight, Play, ShieldCheck, Truck, MessageCircle, X } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import type { Slide } from '@/types';
import type { HeroFirstSlide } from '@/app/page';

// Optimized, right-sized hero variants (pre-generated with sharp), served DIRECT-static so
// Cloudflare edge-caches them. Breakpoints match the <link rel=preload> in app/page.tsx (767/768)
// so the preloaded AVIF IS the one the browser paints → fast LCP.
const HERO_M_AVIF = '/slides/hero-m.avif';
const HERO_M_WEBP = '/slides/hero-m.webp';
const HERO_D_AVIF = '/slides/hero-d.avif';
const HERO_D_WEBP = '/slides/hero-d.webp';

// Optional promo video: set NEXT_PUBLIC_HERO_VIDEO_ID to a YouTube id to make "Voir la vidéo" open a
// player; otherwise the button gracefully scrolls to the best-sellers rail (#products).
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

// Split hero: solid black content panel beside the athletes-and-products photo, with a red diagonal
// accent — desktop side-by-side, mobile stacked (image banner on top, content below).
export function HeroSlider({ mobileFirst }: HeroSliderProps) {
  const [videoOpen, setVideoOpen] = useState(false);
  const alt = mobileFirst?.title || 'Whey, créatine et compléments — Protéine Tunisie';

  const onVideo = () => {
    if (VIDEO_ID) setVideoOpen(true);
    else document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative w-full overflow-hidden bg-gray-950" aria-label="Bannière principale">
      <div className="grid grid-cols-1 lg:grid-cols-[46%_54%]">
        {/* IMAGE — top banner on mobile, right panel on desktop */}
        <div className="relative order-1 h-[34vh] min-h-[230px] w-full sm:h-[42vh] lg:order-2 lg:h-auto lg:min-h-[560px] xl:min-h-[600px]">
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
              className="h-full w-full object-cover object-[56%_40%] lg:object-[54%_center]"
            />
          </picture>
          {/* Blend the image edge into the black panel: bottom fade on mobile, left fade on desktop */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/10 to-transparent lg:bg-gradient-to-r lg:from-gray-950 lg:via-gray-950/10 lg:to-transparent"
            aria-hidden="true"
          />
          {/* Red diagonal accent at the seam (desktop) */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-[3px] -translate-x-1/2 -skew-x-12 bg-gradient-to-b from-transparent via-red-600 to-transparent lg:block"
            aria-hidden="true"
          />
        </div>

        {/* CONTENT — below on mobile, left on desktop */}
        <div className="relative order-2 flex flex-col justify-center bg-gray-950 px-5 py-9 sm:px-8 sm:py-12 lg:order-1 lg:px-12 lg:py-16 xl:px-16">
          <span className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-red-500 sm:text-xs">
            100% Authentique • Livraison partout en Tunisie
          </span>
          {/* Slogan rendered as <p> (not <h1>) — the SEO H1 "Protéine Tunisie" lives in the lede below. */}
          <p className="font-display text-[2.75rem] font-bold uppercase leading-[0.86] tracking-tight text-white sm:text-6xl xl:text-7xl">
            Nutrition<br />Puissance<br />
            <span className="text-red-600">Résultats</span>
          </p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-gray-300 sm:text-base">
            Découvrez notre sélection des meilleures protéines, créatines et compléments pour atteindre vos objectifs.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
              className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] px-6 font-display text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/10 sm:w-auto sm:text-base"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600">
                <Play className="h-3 w-3 fill-white text-white" aria-hidden="true" />
              </span>
              Voir la vidéo
            </button>
          </div>

          <div className="mt-9 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
            {TRUST.map(({ Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                  <Icon className="h-5 w-5 text-red-500" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight text-white">{title}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
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
