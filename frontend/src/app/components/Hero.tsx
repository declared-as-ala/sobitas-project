import { ArrowRight } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { HeroSliderControls } from '@/app/components/HeroSliderIndicator';
import { HeroBestSellers, type HeroBestSeller } from '@/app/components/HeroBestSellers';
import { buildHeroImageSet, type HeroSlide, type HeroImageSet } from '@/util/heroImage';

/**
 * Homepage hero — the LCP surface and, per the owner, the page's whole job: "the slider is the most
 * important thing for us, it is the conversion and the leads."
 *
 * LAYOUT (approved design, three breakpoints):
 *   ≥1280px  slider + a "Meilleures ventes" column beside it, sharing one height. The dead margin
 *            on wide screens becomes three shoppable products above the fold.
 *   768–1279 slider alone, full width of the container.
 *   <768px   slider alone, full-bleed edge-to-edge — no side padding, no rounding, so the artwork
 *            gets every pixel of a phone screen.
 *
 * LCP INVARIANT (unchanged, and the reason this file never touches image URLs): the <img> and the
 * page's <link rel=preload> are one derived object (util/heroImage.ts). page.tsx renders
 * `set.preload`, this renders `set.sources`. They cannot drift, so the preload is never wasted.
 *
 * SERVER COMPONENT. All of the above is static markup — it stays out of the client bundle so the
 * LCP path ships no JavaScript. Exactly one client island (HeroSliderControls) drives the
 * scroll-snap track for arrows/dots/autoplay, and it renders nothing at all for a single slide.
 *
 * SCRIM POLICY. The artwork is shown at full opacity when the slide has NO caption — the owner
 * bakes copy into some banners and a scrim over those would dim their own text. When a caption IS
 * present the copy must stay legible over an arbitrary upload, so the slide gets a gradient
 * weighted to the side the text sits on. Contrast is a floor, not a preference (WCAG 1.4.3).
 *
 * Brand colour is `brand-500` (#F8480C, the logo orange) via the semantic token, not a hardcoded
 * hex — see tailwind.config.ts. Large display type and pill CTAs are the graphical-accent case the
 * token is meant for.
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

/**
 * Split the admin's title into its white first line and the accent-orange remainder.
 * "Alimente\nTa performance" → ["Alimente", "Ta performance"]. A single-line title stays all
 * white, so the two-tone headline is opt-in and no existing slide changes appearance.
 */
function splitTitle(title: string): { lead: string; accent: string } {
  const lines = title.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return { lead: lines[0] ?? '', accent: '' };
  return { lead: lines[0], accent: lines.slice(1).join(' ') };
}

interface HeroProps {
  slides: HeroSlide[];
  /** Alt text used when a slide has none — keeps the LCP image described for SEO/a11y. */
  fallbackAlt: string;
  /** Optional wide-screen "Meilleures ventes" column. Omit/empty = slider spans full width. */
  bestSellers?: HeroBestSeller[];
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
 * Caption block: badge → two-tone headline → subtitle → CTA. Anchored to the bottom on phones and
 * vertically centred from `md` up, which is where the approved design puts it.
 *
 * Renders NOTHING when every field is blank — an image-only banner stays exactly as uploaded.
 * The whole slide is one link, so the CTA is a styled <span>, never a nested <a>.
 */
function HeroCaption({ slide, hasControls }: { slide: HeroSlide | null; hasControls: boolean }) {
  const badge = slide?.badge?.trim() || '';
  const title = slide?.title?.trim() || '';
  const subtitle = slide?.subtitle?.trim() || '';
  const ctaLabel = slide?.ctaLabel?.trim() || '';

  if (!badge && !title && !subtitle && !ctaLabel) return null;

  const { lead, accent } = splitTitle(title);

  return (
    <div className="absolute inset-0 z-20 flex items-end md:items-center">
      {/* On phones the copy sits at the bottom, so it must clear the controls rail — but ONLY when
          there is a rail. A single-slide banner renders no controls, and reserving the space anyway
          left a visible band of dead pixels under the CTA. */}
      <div
        className={`w-full px-5 sm:px-8 md:pb-0 lg:px-12 xl:px-14 ${hasControls ? 'pb-24' : 'pb-8 sm:pb-10'}`}
      >
        <div className="max-w-[34rem] lg:max-w-[38rem]">
          {badge && (
            <span className="mb-3 inline-flex items-center rounded-md bg-brand-500 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-white sm:mb-4 sm:text-[11px]">
              {badge}
            </span>
          )}

          {title && (
            /* <p>, not a heading: the page's single <h1> is the SEO block in HomePageClient, and a
               rotating banner must not compete with it for the document outline. */
            <p className="font-display font-compressed text-[2.1rem] font-extrabold uppercase leading-[0.92] tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.5)] sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
              {lead}
              {accent && (
                <>
                  <br />
                  <span className="text-brand-500">{accent}</span>
                </>
              )}
            </p>
          )}

          {subtitle && (
            <p className="mt-3 max-w-md text-sm font-medium leading-snug text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)] sm:mt-4 sm:text-base">
              {subtitle}
            </p>
          )}

          {ctaLabel && (
            <span className="mt-5 inline-flex min-h-[48px] items-center gap-2.5 rounded-full bg-brand-500 px-6 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_28px_-6px_rgba(248,72,12,0.6)] transition-colors duration-200 group-hover:bg-brand-600 sm:mt-6 sm:px-7 sm:text-[15px]">
              {ctaLabel}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** One banner: image, legibility scrim (captioned slides only), caption. */
function HeroSlideFrame({
  slide,
  eager,
  fallbackAlt,
  position,
  hasControls = false,
}: {
  slide: HeroSlide | null;
  eager: boolean;
  fallbackAlt: string;
  /** 1-based index + total, passed only in the multi-slide slider so links get distinct names. */
  position?: { index: number; total: number };
  /** True when the controls rail is rendered, so the caption reserves room for it. */
  hasControls?: boolean;
}) {
  const set = buildHeroImageSet(slide, eager, fallbackAlt);
  // A commerce hero should always be tappable; default to the shop when the admin left the link
  // blank. The banner is one big link, so the caption's button is a <span> (no nested anchors).
  const href = normalizeHref(slide?.href) || '/shop';

  const hasCaption = Boolean(
    slide?.badge?.trim() || slide?.title?.trim() || slide?.subtitle?.trim() || slide?.ctaLabel?.trim()
  );

  // aria-label is set ONLY for an image-only banner. When a caption is present its visible text —
  // crucially the CTA — must FORM the link's accessible name (WCAG 2.5.3, Label-in-Name). For
  // image-only slides in a multi-slide track, append the position so each link is distinguishable
  // (WCAG 2.4.4). The title may contain the two-tone newline, so collapse whitespace first.
  const baseLabel = slide?.title?.trim().replace(/\s+/g, ' ') || slide?.alt?.trim() || fallbackAlt;
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

      {/* Legibility scrim, captioned slides only. Vertical on phones (copy sits at the bottom),
          left-weighted from md up (copy sits left of centre) — so it darkens the text area and
          leaves the product shot on the right of the artwork untouched. */}
      {hasCaption && (
        <span
          aria-hidden="true"
          className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/35 to-transparent md:bg-gradient-to-r md:from-black/80 md:via-black/40 md:to-transparent"
        />
      )}

      <HeroCaption slide={slide} hasControls={hasControls} />
    </LinkWithLoading>
  );
}

/* The slider viewport. `.pt-hero` (globals.css) sets a DEFINITE height, so the box is reserved
   before the image loads (zero CLS) and the absolutely-filled slide resolves against it. The
   neutral placeholder shows only for the instant before the preloaded LCP image paints. */
const FRAME_BASE = 'pt-hero relative w-full overflow-hidden bg-gray-100 dark:bg-gray-900 sm:rounded-2xl';

export function Hero({ slides, fallbackAlt, bestSellers = [] }: HeroProps) {
  const showAside = bestSellers.length > 0;

  const slider =
    slides.length <= 1 ? (
      <div className={FRAME_BASE}>
        <HeroSlideFrame slide={slides[0] ?? null} eager fallbackAlt={fallbackAlt} />
      </div>
    ) : (
      <div className={FRAME_BASE}>
        {/* Slides live in a horizontal scroll-snap track, so swipe works natively and the LCP path
            carries no carousel JavaScript. The controls island only scrolls this element. */}
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
                hasControls
              />
            </div>
          ))}
        </div>

        <HeroSliderControls count={slides.length} autoplayMs={6500} />
      </div>
    );

  return (
    <section
      aria-label="Bannière principale"
      {...(slides.length > 1 ? { 'aria-roledescription': 'carrousel' } : {})}
      className="w-full sm:pt-4 lg:pt-6"
    >
      {/*
        The SITE container, byte-for-byte: `mx-auto max-w-site px-4 sm:px-6 lg:px-8`. The header,
        the footer and every homepage section use exactly this, and the padding must live on the
        SAME element as max-w — putting it on the parent instead makes the content box the full
        max-width rather than max-width-minus-padding, which is precisely how the hero ended up
        hanging 32px wider per side than the category rail below it. `max-w-site` is defined once
        in tailwind.config.ts; never hardcode a pixel width here.

        The one deliberate deviation: `px-0` below `sm`, so the artwork stays full-bleed on phones.
        Everything else on the page keeps px-4 there. Change this only together with the other twelve.
      */}
      <div className="mx-auto w-full max-w-site px-0 sm:px-6 lg:px-8">
        <div
          className={
            showAside
              ? 'grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'
              : 'w-full'
          }
        >
          {slider}
          {showAside && <HeroBestSellers products={bestSellers} />}
        </div>
      </div>
    </section>
  );
}
