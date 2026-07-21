import { ArrowRight, ShieldCheck, Truck, MessageCircle } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { buildHeroImageSet, type HeroSlide, type HeroImageSet } from '@/util/heroImage';

/**
 * Homepage hero — the mobile LCP surface.
 *
 * SERVER component on purpose. The previous HeroSlider was `'use client'` solely to hold a
 * video-modal `useState`, which pushed the entire LCP markup into the client bundle for no
 * rendering benefit. Nothing here needs state.
 *
 * MULTI-SLIDE WITHOUT JAVASCRIPT
 * Slides 2+ live in a CSS scroll-snap track — native horizontal swipe, no carousel library, and
 * it works before (and without) hydration. Embla was the obvious choice but is wrong here: it
 * replaces native scrolling with JS transforms and cannot function until hydrated, which is
 * precisely the window the LCP element must survive. Embla stays for product rails.
 * With a single slide (the common case) no track is rendered at all and the markup is flat.
 *
 * Copy is admin-managed per slide and falls back to the built-in wording, so the hero never
 * renders empty before the owner has filled anything in.
 */

const DEFAULT_TITLE_LINES = ['Nutrition', 'Puissance', 'Résultats'] as const;
const DEFAULT_SUBTITLE =
  'Découvrez notre sélection des meilleures protéines, créatines et compléments pour atteindre vos objectifs.';
const DEFAULT_CTA = 'Découvrir nos produits';
const DEFAULT_HREF = '/shop';

/**
 * The admin's "Lien du bouton" is free text with no URL validation on the Filament side, so two
 * natural mistakes have to be absorbed here rather than shipping a broken CTA:
 *   "www.protein.tn/shop"  → treated by the browser as a RELATIVE path (/…/www.protein.tn/shop)
 *   "shop/proteines"       → same problem, resolves against the current path
 * Anything already absolute or root-relative passes through untouched. Returns null for blank
 * input so the caller can apply its own default.
 */
function normalizeHref(raw?: string | null): string | null {
  const href = raw?.trim();
  if (!href) return null;
  if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(href)) return href;
  // A bare host (contains a dot before the first slash) is an external link missing its scheme.
  if (/^[^/]+\.[^/]+/.test(href)) return `https://${href}`;
  return `/${href}`;
}

const TRUST = [
  { Icon: ShieldCheck, title: 'Produits 100% Authentiques', sub: 'Garantie qualité et origine' },
  { Icon: Truck, title: 'Livraison Rapide', sub: 'Partout en Tunisie' },
  { Icon: MessageCircle, title: "Conseils d'Experts", sub: 'À votre écoute' },
] as const;

interface HeroProps {
  slides: HeroSlide[];
  /** Alt text used when a slide has none — keeps the LCP image described for SEO/a11y. */
  fallbackAlt: string;
}

function HeroPicture({ set, eager }: { set: HeroImageSet; eager: boolean }) {
  return (
    /* pt-hero-art drives the scroll parallax (globals.css). Its FROM keyframe is the identity
       transform, so at scroll offset 0 — the moment LCP is measured — this element is
       geometrically identical to the un-animated version. The animation cannot move the LCP
       paint; it only takes effect once the user has begun scrolling.
       `data-motion` opts out of the global mobile duration clamp, which would otherwise force a
       time onto a progress-driven animation and snap it to its end keyframe. */
    <picture className="pt-hero-art absolute inset-0 block h-full w-full" data-motion>
      {set.sources.map((source) => (
        <source
          key={`${source.media}-${source.type ?? 'auto'}`}
          {...(source.type ? { type: source.type } : {})}
          media={source.media}
          srcSet={source.srcSet}
        />
      ))}
      {/* Raw <img>, not next/image: next/image emits a srcset and the browser picks a candidate
          at runtime, so the server cannot know which URL to preload — the preload would miss and
          the image would download twice. One element, one URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={set.img.src}
        alt={set.img.alt}
        width={set.img.width}
        height={set.img.height}
        decoding="async"
        {...(eager
          ? { fetchPriority: 'high' as const, loading: 'eager' as const }
          : { fetchPriority: 'low' as const, loading: 'lazy' as const })}
        className="h-full w-full object-cover object-[58%_82%] sm:object-[60%_78%] lg:object-[62%_center]"
      />
    </picture>
  );
}

function HeroCopy({ slide, showTrust }: { slide: HeroSlide | null; showTrust: boolean }) {
  // Every field falls back to the built-in copy when the admin leaves it blank.
  //
  // An earlier version rendered nothing for an untitled slide ("blank = image speaks alone").
  // In practice that left the live hero as a bare CTA floating on a photo — it read as broken,
  // not as a deliberate choice, because the existing slide predates these fields and has none
  // of them filled in. A headline is also the one piece of hero copy Google and screen readers
  // can actually use, so defaulting to real text beats defaulting to silence.
  //
  // A slide whose artwork already contains its own headline can be handled later with an
  // explicit "masquer le texte" toggle — an intentional switch, not an empty field.
  const title = slide?.title?.trim() || null;
  const subtitle = slide?.subtitle?.trim() || DEFAULT_SUBTITLE;
  const ctaLabel = slide?.ctaLabel?.trim() || DEFAULT_CTA;
  const href = normalizeHref(slide?.href) || DEFAULT_HREF;

  return (
    <div className="w-full max-w-lg lg:max-w-[34rem] xl:max-w-[40rem]">
      {/* Slogan is a <p>, never an <h1>: the page's single H1 ("Protéine Tunisie") lives in the
          SEO strip below, and a rotating slider headline must not become the document heading. */}
      {/* font-compressed drives Archivo's width axis to 82%. Oswald was condensed by design, so
          it never needed this; Archivo is a normal-width grotesque and would set the headline far
          too wide without it. This is where the athletic compression now comes from. */}
      <p className="font-display font-compressed text-[2.7rem] font-extrabold uppercase leading-[0.86] tracking-[-0.015em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-6xl lg:text-[4.25rem] xl:text-[5rem]">
        {title
          ? title
          : DEFAULT_TITLE_LINES.map((line, i) => (
              <span key={line} className={i === DEFAULT_TITLE_LINES.length - 1 ? 'text-red-600' : undefined}>
                {line}
                {i < DEFAULT_TITLE_LINES.length - 1 && <br />}
              </span>
            ))}
      </p>

      <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:mt-5 sm:text-base">
        {subtitle}
      </p>

      <div className="mt-6 sm:mt-7">
        <LinkWithLoading
          href={href}
          loadingMessage="Chargement..."
          aria-label={ctaLabel}
          className="group inline-flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-red-600 px-8 font-display font-extended text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_30px_rgba(224,27,36,0.4)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-[0_14px_36px_rgba(224,27,36,0.5)] sm:w-auto sm:text-base"
        >
          {ctaLabel}
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </LinkWithLoading>
      </div>

      {/* Trust signals stay in the CONTENT FLOW at every breakpoint, as before. They are the
          hero's conversion payload on mobile — the device driving most traffic — so they must
          not become a desktop-only flourish. Rendered on the first slide only. */}
      {showTrust && (
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
      )}
    </div>
  );
}

function HeroSlideFrame({
  slide,
  eager,
  fallbackAlt,
  showTrust,
}: {
  slide: HeroSlide | null;
  eager: boolean;
  fallbackAlt: string;
  showTrust: boolean;
}) {
  const set = buildHeroImageSet(slide, eager, fallbackAlt);

  return (
    <>
      <HeroPicture set={set} eager={eager} />

      {/* Legibility scrims. Flat gradients only — no backdrop-blur, no decorative orbs (§3). */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-gray-950 from-30% via-gray-950/80 to-transparent lg:hidden"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 hidden bg-gradient-to-r from-gray-950 via-gray-950/85 via-40% to-transparent lg:block"
        aria-hidden="true"
      />

      <div className="absolute inset-0 z-10 flex items-end lg:items-center">
        <div
          className="pt-hero-copy mx-auto w-full max-w-[1400px] px-5 pb-9 sm:px-6 sm:pb-11 lg:px-8 lg:pb-0"
          data-motion
        >
          <HeroCopy slide={slide} showTrust={showTrust} />
        </div>
      </div>

      {/* Scroll-progress hairline pinned to the bottom of the banner. This is the "focus" cue:
          the one moving thing in the accent colour, so the eye is drawn to the ad banner as it is
          scrolled through. scaleX only — a compositor property, so it costs nothing per frame.
          Purely decorative, hence aria-hidden. */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 hidden h-[3px] overflow-hidden bg-white/10 lg:block"
        aria-hidden="true"
      >
        {/* `scale-x-0` is the RESTING state, and that is the whole point. The fill comes only from
            the scroll animation. Without it the resting style was `w-full bg-red-600` — i.e. the
            100%-COMPLETE state — so every browser without scroll-driven animations (Safari,
            Firefox) and every reduced-motion user saw a permanent solid red bar welded across the
            bottom of the banner instead of a progress indicator. Degrading to an invisible bar is
            correct; degrading to a finished one is not. */}
        <div className="pt-hero-progress h-full w-full origin-left scale-x-0 bg-red-600" data-motion />
      </div>
    </>
  );
}

export function Hero({ slides, fallbackAlt }: HeroProps) {
  // Height is fixed and identical in every branch below. Slide images can then vary in intrinsic
  // size with zero CLS. Deliberately NOT an aspect-ratio box — that would resize with the image.
  const frame =
    'relative w-full overflow-hidden bg-gray-950 min-h-[588px] sm:min-h-[620px] lg:h-[600px] xl:h-[640px]';

  // No slides, or exactly one: render flat. No track, no scroll container, no controls — the
  // markup is then equivalent to the hero that shipped before.
  if (slides.length <= 1) {
    return (
      <section className={frame} aria-label="Bannière principale">
        <HeroSlideFrame slide={slides[0] ?? null} eager fallbackAlt={fallbackAlt} showTrust />
      </section>
    );
  }

  return (
    <section className="relative" aria-label="Bannière principale" aria-roledescription="carrousel">
      {/* tabIndex makes the track focusable so keyboard users can scroll it with arrow keys —
          without it, slides 2+ are reachable by touch swipe only. */}
      <div
        tabIndex={0}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            id={`hero-slide-${index + 1}`}
            className={`${frame} w-full shrink-0 snap-center snap-always`}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`Diapositive ${index + 1} sur ${slides.length}`}
          >
            {/* Only slide 1 is eager + preloaded; the rest lazy-load so they never compete with
                the LCP image for bandwidth. Trust signals ride on slide 1 only. */}
            <HeroSlideFrame
              slide={slide}
              eager={index === 0}
              fallbackAlt={fallbackAlt}
              showTrust={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Anchor dots. Plain <a href="#id"> scrolls the nearest scrollable ancestor, so this works
          with zero JavaScript and stays inside a server component — no hydration on the LCP path.
          Without any affordance, slides after the first were undiscoverable on desktop, where
          there is no swipe gesture and the scrollbar is hidden. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2.5 sm:bottom-5">
        {slides.map((slide, index) => (
          <a
            key={slide.id}
            href={`#hero-slide-${index + 1}`}
            aria-label={`Aller à la diapositive ${index + 1}`}
            className="pointer-events-auto flex h-11 w-6 items-center justify-center"
          >
            <span className="h-1.5 w-6 rounded-full bg-white/45 transition-colors hover:bg-white" />
          </a>
        ))}
      </div>
    </section>
  );
}
