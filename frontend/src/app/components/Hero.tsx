import { ArrowRight } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { buildHeroImageSet, type HeroSlide, type HeroImageSet } from '@/util/heroImage';

/**
 * Homepage hero — the mobile LCP surface.
 *
 * DESIGN CONTRACT: THE IMAGE IS THE SLIDE.
 * The owner designs finished ad banners in the admin (headline, price, product shot — all baked
 * into the artwork) and uploads them. The frontend's job is to display that artwork cleanly and
 * get out of its way. It must NOT stamp its own headline, subtitle or scrim on top — an earlier
 * version did exactly that and the result was two competing sets of text with a dark gradient
 * covering half the banner. So:
 *   - No slide text fields filled  → the image alone, no overlay, no scrim.
 *   - Text fields filled           → a SMALL caption pinned to the bottom, near the button, over
 *                                    a shallow bottom scrim only. Never a full-bleed headline.
 * The whole banner is one link, so the caption's button is a styled <span>, not a nested <a>.
 *
 * CONTAINED, NOT FULL-BLEED (this is also what fixes the cropping).
 * A designed banner has a fixed aspect ratio. A full-bleed hero on a wide monitor is ~3.4:1 and
 * crops ~30% off the top and bottom of any 2.4:1 banner. A max-width frame whose ratio MATCHES
 * the banner spec (12:5 desktop, 4:5 mobile) shows the artwork almost whole — the ESN pattern.
 *
 * SERVER component. Nothing here needs state; keeping it server-side keeps the LCP markup out of
 * the client bundle. Multi-slide uses a CSS scroll-snap track (no carousel JS on the LCP path).
 *
 * LCP INVARIANT (unchanged): the <img> URL and the page's <link rel=preload> are one derived
 * object (util/heroImage.ts). This rewrite only touches overlay markup and the frame box, never
 * the image pipeline, so the preload↔paint coupling is untouched.
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
          image would download twice. One element, one URL. */}
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
 * Optional caption. Renders NOTHING unless the admin filled at least one text field — that blank
 * = no overlay is the whole point of the redesign. When present it is deliberately small and
 * bottom-anchored so a banner's own baked-in artwork stays legible above it.
 */
function HeroCaption({ slide }: { slide: HeroSlide | null }) {
  const title = slide?.title?.trim() || '';
  const subtitle = slide?.subtitle?.trim() || '';
  const ctaLabel = slide?.ctaLabel?.trim() || '';

  if (!title && !subtitle && !ctaLabel) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-end">
      {/* Scrim anchored to the BOTTOM-LEFT only (darkest at the caption's corner, transparent by
          ~55% toward the top-right). A full-width bottom scrim would darken the right side of a
          designed banner — exactly where owners bake their price ("259 DT") — so the legibility
          wash is kept off the artwork. Strengthened (from/72→85, via/12→28) so the caption title,
          which sits highest where the scrim is weakest, keeps ~4.5:1 against a light photo. No
          backdrop-blur (§3). */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/85 via-black/28 via-55% to-transparent"
        aria-hidden="true"
      />
      <div className="relative px-4 pb-5 sm:px-8 sm:pb-8 lg:px-12 lg:pb-10">
        <div className="max-w-md">
          {title && (
            <p className="font-display font-compressed text-xl font-extrabold uppercase leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:text-2xl lg:text-[2rem]">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="mt-1.5 line-clamp-2 max-w-sm text-xs leading-snug text-gray-100 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:text-sm">
              {subtitle}
            </p>
          )}
          {ctaLabel && (
            <span className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-red-600 px-5 font-display font-extended text-xs font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_26px_rgba(218,62,6,0.42)] transition-colors group-hover:bg-red-700 sm:mt-4 sm:text-sm">
              {ctaLabel}
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** One banner: the rounded frame, the image, and (only if the admin added copy) the caption. */
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
  // crucially the CTA ("Acheter") — must FORM the link's accessible name, or a voice-control user
  // saying "click Acheter" matches nothing (WCAG 2.5.3, Label-in-Name, Level A). Leaving aria-label
  // off lets the DOM content (img alt + caption) name the link, so the visible CTA is included.
  //
  // For image-only slides the name comes from a label; when several such slides sit in the slider
  // they would otherwise share one identical name (the fallback), so append the position — this
  // makes each link's purpose distinguishable (WCAG 2.4.4).
  const baseLabel = slide?.title?.trim() || slide?.alt?.trim() || fallbackAlt;
  const ariaLabel = hasCaption
    ? undefined
    : position && position.total > 1
      ? `${baseLabel} — diapositive ${position.index} sur ${position.total}`
      : baseLabel;

  // HeroSlideFrame now FILLS its parent (the pin frame or a slider cell) rather than self-sizing —
  // the size lives on the pin frame so the takeover animation can grow one element.
  return (
    <LinkWithLoading
      href={href}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
      loadingMessage="Chargement..."
      /* ring-INSET, not an outline: the frame is overflow-hidden (+ contain: layout paint during
         the pin), which clips a normal focus outline drawn at/outside the border box. An inset ring
         paints inside the box, so the keyboard focus indicator on this primary banner link stays
         visible (WCAG 2.4.7). */
      className="group absolute inset-0 block bg-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white"
    >
      <HeroPicture set={set} eager={eager} />
      <HeroCaption slide={slide} />
    </LinkWithLoading>
  );
}

// Base sizing for the banner "frame". Phones: full-bleed 4:5 (flush under the header). sm+: a
// contained rounded card. md+: a fixed height (so the desktop takeover animates size without the
// height depending on the image). The pin frame is `relative` so the absolutely-filled
// HeroSlideFrame inside has a containing block.
const FRAME_BASE =
  'pt-pin-frame relative w-full overflow-hidden bg-gray-950 aspect-[4/5] sm:mx-auto sm:w-[min(1340px,calc(100%-4rem))] sm:rounded-3xl md:aspect-auto md:h-[540px] lg:h-[560px]';

export function Hero({ slides, fallbackAlt }: HeroProps) {
  /**
   * THE SCROLL TAKEOVER (desktop).
   * `.pt-pin-track` gives the section extra scroll height; `.pt-pin-stage` is `position: sticky`
   * so the hero PINS to the top and does not scroll away; and `.pt-pin-frame` grows from the
   * contained card to the full viewport as the user scrolls through the pinned range — then the
   * track ends, the pin releases and the page scrolls on to the rest of the site. All of that is
   * gated to capable desktop browsers (globals.css `@supports`); phones, Safari/Firefox and
   * reduced-motion users get the plain contained hero (the track/pin styles simply don't apply).
   */
  if (slides.length <= 1) {
    return (
      <section aria-label="Bannière principale" className="bg-white dark:bg-gray-950 sm:pt-4">
        <div className="pt-pin-track">
          <div className="pt-pin-stage">
            <div className={FRAME_BASE} data-motion>
              <HeroSlideFrame slide={slides[0] ?? null} eager fallbackAlt={fallbackAlt} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Bannière principale"
      aria-roledescription="carrousel"
      className="bg-white dark:bg-gray-950 sm:pt-4"
    >
      <div className="pt-pin-track">
        <div className="pt-pin-stage">
          {/* The pin frame IS the slider viewport; it grows in the takeover. Slides live in a
              horizontal scroll-snap track that fills it, so swipe/dots still work at any size. */}
          <div className={FRAME_BASE} data-motion>
            <div
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

            {/* Dots overlaid at the bottom of the pinned frame so they stay visible during the
                takeover (they can't sit "below" a pinned element). The row sits on a small
                translucent-dark pill so the white dots keep ≥3:1 contrast even over a light banner
                (WCAG 1.4.11) — the banners can be light at bottom-centre by design. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
              <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/30 px-2.5 py-1.5">
                {slides.map((slide, index) => (
                  <a
                    key={slide.id}
                    href={`#hero-slide-${index + 1}`}
                    aria-label={`Aller à la diapositive ${index + 1}`}
                    className="flex h-5 w-6 items-center justify-center"
                  >
                    <span className="h-1.5 w-6 rounded-full bg-white/90 transition-colors hover:bg-white" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
