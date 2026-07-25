import { ArrowRight } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { HeroSliderIndicator } from '@/app/components/HeroSliderIndicator';
import { buildHeroImageSet, type HeroSlide, type HeroImageSet } from '@/util/heroImage';

/**
 * Homepage hero — the mobile LCP surface.
 *
 * FULL-BLEED, FULL-HEIGHT (owner request, 2026-07). The hero fills the ENTIRE viewport width and
 * all the space AVAILABLE between the sticky header and the fixed mobile tab bar on first paint, so
 * the whole banner shows with nothing cropped by the chrome. The uploaded artwork is shown at FULL
 * OPACITY with NO dark scrim over it — the image IS the slide (the owner bakes the headline, price
 * and product shot into the artwork in the admin, then uploads it). The frontend's job is to display
 * that artwork edge-to-edge and get out of its way. Any admin text overlay (titre / sous-titre /
 * bouton) is drawn with a text-shadow only, never a dark box.
 *
 * HEIGHT MATH — lives in `.pt-hero` (globals.css): 100svh − header stack − tab bar − safe-area.
 *   header stack mobile  = utility h-9 (36) + main h-14 (56)                    = 92px
 *   header stack desktop = utility h-9 (36) + main h-[72px] (72) + nav h-12 (48) = 156px
 *   tab bar (--tabbar-h) = 56px below 768px, 0px above.
 * `svh` (small viewport height) is used so the mobile URL bar can't cover the hero and there is no
 * resize jank on scroll (a `vh` line is the fallback). Keep the header numbers in sync with the
 * header if it ever changes.
 *
 * FULL WIDTH: the hero renders directly inside <main> (no max-width wrapper, no side padding), so
 * `w-full` already spans the whole viewport — there is nothing to break out of.
 *
 * LCP INVARIANT (unchanged): the <img> URL and the page's <link rel=preload> are one derived
 * object (util/heroImage.ts). This file only sets the frame box and the optional overlay — it never
 * touches the image pipeline — so the preload↔paint coupling is untouched.
 *
 * SERVER component. Nothing here needs state; keeping it server-side keeps the LCP markup out of
 * the client bundle. Multi-slide uses a CSS scroll-snap track (no carousel JS on the LCP path).
 */

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

interface HeroProps {
  slides: HeroSlide[];
  /** Alt text used when a slide has none — keeps the LCP image described for SEO/a11y. */
  fallbackAlt: string;
}

function HeroPicture({ set, eager }: { set: HeroImageSet; eager: boolean }) {
  return (
    <picture className="absolute inset-0 block h-full w-full">
      {set.sources.map((source) => (
        <source
          key={`${source.media}-${source.type ?? 'auto'}`}
          {...(source.type ? { type: source.type } : {})}
          media={source.media}
          srcSet={source.srcSet}
        />
      ))}
      {/* Raw <img>, not next/image: next/image emits a srcset and the browser picks a candidate at
          runtime, so the server cannot know which URL to preload — the preload would miss and the
          image would download twice. One element, one URL. Full opacity, no filter: the artwork is
          shown exactly as uploaded (owner request — "no darkness"). */}
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
        className="h-full w-full object-cover object-center"
      />
    </picture>
  );
}

/**
 * Optional admin text overlay. Renders NOTHING unless the admin filled at least one text field —
 * blank = the artwork alone, which is the common case (the owner bakes copy into the image). When
 * present it is drawn over the LIVING image with a text-SHADOW only: no dark scrim, no box, so the
 * "full opacity, no darkness" contract holds. The whole slide is one link, so the CTA is a styled
 * <span>, not a nested <a>.
 */
function HeroCaption({ slide }: { slide: HeroSlide | null }) {
  const title = slide?.title?.trim() || '';
  const subtitle = slide?.subtitle?.trim() || '';
  const ctaLabel = slide?.ctaLabel?.trim() || '';

  if (!title && !subtitle && !ctaLabel) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-end">
      {/* Extra bottom padding on mobile (pb-20) lifts the CTA clear of the slider indicator, which
          is pinned to the bottom-centre — otherwise the two stack on a phone. Desktop has room, so
          it keeps its tighter bottom padding. */}
      <div className="w-full px-5 pb-20 sm:px-10 sm:pb-14 lg:px-16 lg:pb-20">
        <div className="max-w-2xl">
          {title && (
            <p className="font-display font-compressed text-3xl font-extrabold uppercase leading-[0.95] tracking-tight text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="mt-3 max-w-lg text-sm font-medium leading-snug text-white [text-shadow:0_1px_14px_rgba(0,0,0,0.65)] sm:mt-4 sm:text-base lg:text-lg">
              {subtitle}
            </p>
          )}
          {ctaLabel && (
            <span className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#FF5A00] px-6 font-display font-extended text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_12px_30px_rgba(255,90,0,0.45)] transition-colors group-hover:bg-[#E85200] sm:mt-6 sm:text-base">
              {ctaLabel}
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** One banner: fills its parent, shows the image at full opacity, plus the optional caption. */
function HeroSlideFrame({
  slide,
  eager,
  fallbackAlt,
  position,
}: {
  slide: HeroSlide | null;
  eager: boolean;
  fallbackAlt: string;
  /** 1-based index + total, passed only in the multi-slide slider so links get distinct names. */
  position?: { index: number; total: number };
}) {
  const set = buildHeroImageSet(slide, eager, fallbackAlt);
  // A commerce hero should always be tappable; default to the shop when the admin left the link
  // blank. The banner is one big link, so the caption's button is a <span> (no nested anchors).
  const href = normalizeHref(slide?.href) || '/shop';

  const hasCaption = Boolean(slide?.title?.trim() || slide?.subtitle?.trim() || slide?.ctaLabel?.trim());
  // aria-label is set ONLY for an image-only banner. When a caption is present its visible text —
  // crucially the CTA — must FORM the link's accessible name (WCAG 2.5.3, Label-in-Name). For
  // image-only slides in a multi-slide track, append the position so each link is distinguishable
  // (WCAG 2.4.4).
  const baseLabel = slide?.title?.trim() || slide?.alt?.trim() || fallbackAlt;
  const ariaLabel = hasCaption
    ? undefined
    : position && position.total > 1
      ? `${baseLabel} — diapositive ${position.index} sur ${position.total}`
      : baseLabel;

  return (
    <LinkWithLoading
      href={href}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
      loadingMessage="Chargement..."
      /* ring-INSET: the frame is overflow-hidden, which would clip a normal focus outline drawn at
         the border box. An inset ring paints inside the box so the keyboard focus indicator on this
         primary banner link stays visible (WCAG 2.4.7). */
      className="group absolute inset-0 block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white"
    >
      <HeroPicture set={set} eager={eager} />
      <HeroCaption slide={slide} />
    </LinkWithLoading>
  );
}

// FULL-BLEED, FULL-HEIGHT frame. `.pt-hero` (globals.css) sets a DEFINITE height — 100svh minus the
// header stack — so the box is reserved before the image loads (zero CLS) and the absolutely-filled
// slide + any percentage-height slider track resolve against it. The neutral placeholder shows only
// for the instant before the (preloaded) LCP image paints — deliberately light, never dark.
const FRAME_BASE = 'pt-hero relative w-full overflow-hidden bg-gray-100 dark:bg-gray-900';

export function Hero({ slides, fallbackAlt }: HeroProps) {
  if (slides.length <= 1) {
    return (
      <section aria-label="Bannière principale">
        <div className={FRAME_BASE}>
          <HeroSlideFrame slide={slides[0] ?? null} eager fallbackAlt={fallbackAlt} />
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Bannière principale" aria-roledescription="carrousel">
      {/* The frame IS the slider viewport. Slides live in a horizontal scroll-snap track that fills
          it, so swipe/dots work at any size with no carousel JS on the LCP path. */}
      <div className={FRAME_BASE}>
        <div
          id="hero-track"
          tabIndex={0}
          className="scrollbar-hide flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              id={`hero-slide-${index + 1}`}
              className="relative h-full w-full shrink-0 snap-center snap-always"
              role="group"
              aria-roledescription="diapositive"
              aria-label={`Diapositive ${index + 1} sur ${slides.length}`}
            >
              <HeroSlideFrame
                slide={slide}
                eager={index === 0}
                fallbackAlt={fallbackAlt}
                position={{ index: index + 1, total: slides.length }}
              />
            </div>
          ))}
        </div>

        {/* State indicator (client island): active-slide ticks with click/keyboard nav + autoplay.
            It observes #hero-track by scroll position, so a manual swipe keeps it in sync. Centered
            at the bottom so it clears the bottom-left caption CTA and the bottom-right FAB stack. */}
        <HeroSliderIndicator count={slides.length} autoplayMs={6500} />
      </div>
    </section>
  );
}
