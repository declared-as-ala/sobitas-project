import { ArrowRight } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { HeroSliderControls } from '@/app/components/HeroSliderIndicator';
import { HeroBestSellers, type HeroBestSeller } from '@/app/components/HeroBestSellers';
import { FeaturesSection } from '@/app/components/FeaturesSection';
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
 * LEGIBILITY POLICY. The artwork is shown at full opacity when the slide has NO caption — the
 * owner bakes copy into some banners and a scrim over those would dim their own text.
 *
 * When a caption IS present the copy sits on a SOLID PLATE, not on a gradient. The admin uploads
 * arbitrary artwork, so a scrim's contrast is unknowable: measured over a blown-out white banner,
 * the old gradient's mid-stop composited to #BFBFBF and white text on it was 1.84:1 — a severe AA
 * failure that appeared only for certain uploads, which is the worst kind of bug to own. The plate
 * composites to at worst #2F2F30, where white text is 13.4:1 no matter what the photograph is.
 * Contrast is a floor, not a preference (WCAG 1.4.3). The gradient is kept purely as a blend.
 *
 * COLOUR. The BAND is the page canvas; only the caption PLATE is dark, and it carries `.pt-scrim`,
 * so `bg-brand` / `text-brand` / `text-on-brand` inside it resolve to the slab-scoped accent
 * (#FF8A4C, 8.47:1 with near-black on it) while everything outside the plate stays in page scope.
 * They used to be `bg-brand-500` with white on top — #F8480C under white is 3.55:1 and fails AA
 * outright. brand-500 remains a GRAPHICAL accent only; it must never carry text.
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
      {/* THE LEFT PADDING CLEARS THE ARROW RAIL. Measured on the live site, the previous values
          put the caption UNDERNEATH the previous-slide button at every width from 768px up:

            768px   28px of overlap        1280px   4px
            1024px  12px of overlap        1440px   4px

          The arrow is `absolute left-2 sm:left-4` at 44x44 (HeroSliderIndicator), so from `sm` it
          occupies 16–60px. The caption padded 32/48/56px — always short of 60. On phones the
          caption is bottom-anchored while the arrows are vertically centred, so there is no
          collision there and `px-5` is kept to let the copy use the full width of a small screen.
          72px from `sm` clears the button with 12px to spare. */}
      <div
        className={`w-full px-5 sm:pl-[4.5rem] sm:pr-8 md:pb-0 lg:pl-20 lg:pr-12 xl:pl-24 xl:pr-14 ${hasControls ? 'pb-24' : 'pb-8 sm:pb-10'}`}
      >
        {/* A SOLID PLATE, not a gradient.
            The admin uploads arbitrary artwork, so a scrim's contrast is unknowable: over a
            blown-out white banner a `from-black/70` gradient composites to roughly #4D4D4D and
            white body copy on it measures ~2.9:1 — a hard AA failure that only appears for
            certain uploads, which is the worst kind. #0A0A0B at 85% composites to at worst
            #2F2F30 over pure white; white on that is 13.4:1 and the brand accent 5.7:1,
            regardless of the photograph. Legibility becomes a property of the component instead
            of a property of the image someone happened to upload.
            `inline-block` so the plate hugs the copy rather than always painting a full-width
            slab — an image-only slide already renders nothing at all (see the guard above). */}
        {/* `.pt-scrim` (tokens.css) is the plate AND the token scope in one class — the fill and
            the ink can no longer disagree. Everything inside is written in plain tokens, so the
            same markup would be correct if this plate were ever moved onto a light surface. */}
        {/* THE PLATE HUGS THE COPY (owner: "the text zone looks so big, and its background covers
            the images of the slider").

            It was `max-w-[34rem] px-5 py-4` growing to `38rem px-6 py-5` — a 608px-wide, ~180px-tall
            rectangle over the middle of every banner. Two changes, no loss of legibility:
              · max-width 34→26rem (30→30rem at lg). The copy is a subtitle, not a paragraph; at
                26rem it still sets two comfortable lines and covers ~40% less artwork.
              · padding 20/24 → 16/20. The plate is a legibility device, not a card.
            The 86% fill is UNCHANGED and is not negotiable — it is the only reason the contrast on
            this copy is knowable at all over an arbitrary upload (see .pt-scrim in tokens.css).

            No `backdrop-blur`. At 86% opacity it is invisible, and it forces a compositing layer
            directly over the LCP image on every page load — DESIGN_SYSTEM §9, lint rule DS009. */}
        <div className="pt-scrim inline-block max-w-[26rem] rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 lg:max-w-[30rem]">
          {badge && (
            <span className="mb-3 inline-flex items-center rounded-md bg-brand px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-on-brand sm:mb-4 sm:text-[11px]">
              {badge}
            </span>
          )}

          {title && (
            /* <p>, not a heading: the page's single <h1> is the SEO block in HomePageClient, and a
               rotating banner must not compete with it for the document outline. */
            <p className="font-display font-compressed text-[1.875rem] font-extrabold uppercase leading-[0.92] tracking-tight text-ink-1 sm:text-[2.75rem] lg:text-[3.25rem]">
              {lead}
              {accent && (
                <>
                  <br />
                  <span className="text-brand">{accent}</span>
                </>
              )}
            </p>
          )}

          {subtitle && (
            /* line-clamp-3: the admin field is free text and a long paragraph would grow the plate
               back to the size this change just removed. Three lines is a subtitle; more is a
               landing page, and it belongs on the page the banner links to. */
            <p className="mt-2.5 line-clamp-3 text-[13px] font-medium leading-snug text-ink-2 sm:mt-3 sm:text-[15px]">
              {subtitle}
            </p>
          )}

          {ctaLabel && (
            <span className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-5 font-display text-[13px] font-bold uppercase tracking-[0.08em] text-on-brand transition-colors duration-200 group-hover:bg-brand-hover sm:mt-5 sm:px-6 sm:text-sm">
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
      {/* The gradient stays as a BLEND between the artwork and the caption plate, but it is no
          longer what makes the copy legible — the solid plate in HeroCaption does that. A gradient
          over an arbitrary admin upload can never be proven to clear 4.5:1; a solid plate can. */}
      {hasCaption && (
        <span
          aria-hidden="true"
          className="absolute inset-0 z-10 bg-gradient-to-t from-black/70 via-black/25 to-transparent md:bg-gradient-to-r md:from-black/70 md:via-black/25 md:to-transparent"
        />
      )}

      <HeroCaption slide={slide} hasControls={hasControls} />
    </LinkWithLoading>
  );
}

/* The slider viewport. `.pt-hero` (globals.css) sets a DEFINITE height, so the box is reserved
   before the image loads (zero CLS) and the absolutely-filled slide resolves against it. The
   neutral placeholder shows only for the instant before the preloaded LCP image paints. */
/* `bg-sunken` is the colour that shows for the instant before the preloaded LCP image paints —
   warm sand rather than a cold grey, so the pre-paint frame belongs to the page.

   `sm:rounded-2xl` is BACK. v5 removed it because the artwork sat inside a full-bleed black stage
   where a rounded corner had nothing to round against. On a white page the frame is the only thing
   giving the banner an edge, and a hard-cornered full-width photograph butted against a white
   header reads as a browser rendering a raw image. Phones stay square: there the banner IS
   full-bleed, so there are no corners to round. */
const FRAME_BASE = 'pt-hero relative w-full overflow-hidden bg-sunken sm:rounded-2xl';

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
    /*
     * THE HERO IS A LIGHT BAND HOLDING DARK ARTWORK (DESIGN_SYSTEM v6 §4).
     *
     * v5 made this band `pt-slab` so the header, the hero and the trust strip fused into ~700px of
     * near-black. That is the single change the owner pushed back on hardest, and they were right:
     * the artwork the admin uploads is ALREADY dark and high-contrast, so painting the band behind
     * it black adds no contrast and simply doubles the black. Here the band is the page's own
     * canvas and the photograph supplies the darkness — the same visual weight, a tenth of the ink.
     *
     * VERTICAL RHYTHM:
     *   phones     pt-0  — the artwork is full-bleed and must start at the header's edge
     *   sm+        pt-4 (16px). The frame is rounded from `sm`, and a rounded rectangle butted
     *              against the header's horizontal rule reads as a rendering fault; 16px is the
     *              least that separates them. It is deliberately the `strip` value from the
     *              spacing scale rather than a fourth number — scripts/measure-bands.mjs asserts
     *              that every band padding on the page is one of the scale's values, and the
     *              first draft of this band failed that check with a bespoke 32px.
     *   bottom     pb-0 always. The trust strip below supplies the separation with its own fill.
     *
     * LCP CONTRACT UNTOUCHED. buildHeroImageSet, the <picture> sources, fetchPriority="high",
     * loading="eager" and the <link rel=preload> pair are all unchanged, and `.pt-hero` keeps its
     * exact clamps, so the box stays a DEFINITE height at every breakpoint and CLS stays 0.
     */
    <section
      data-band=""
      // First band on the page: the header supplies its own edge, so no top rule here.
      data-band-first=""
      aria-label="Bannière principale"
      {...(slides.length > 1 ? { 'aria-roledescription': 'carrousel' } : {})}
      /* `pb-0` on phones (owner, in DevTools: "I took off the padding bottom so it looks like it's
         connected with the category section"). Same rule as the band scale in Section.tsx — below
         `sm` a band's bottom padding is zero and the gap is the NEXT band's top padding alone.
         The hero is not a `<Section>` (it owns its own full-bleed frame), so it states the rule
         itself rather than inheriting it. */
      className="w-full bg-canvas pb-0 pt-0 sm:pb-6 sm:pt-4 lg:pb-8"
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
              ? 'grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6'
              : 'w-full'
          }
        >
          {slider}
          {showAside && <HeroBestSellers products={bestSellers} />}
        </div>

        {/* THE TRUST ROW LIVES HERE, inside the hero band and on the hero's own container.
            It used to be a separate full-bleed `sunken` band, which is what made it read as both
            "glued to the slider" (bands have no gap by design) and "wider than the header" (its
            fill ran to the screen edges while the header's content stops at the rail). As a card
            in this container it is exactly as wide as the header above it, and it carries its own
            `mt-4 lg:mt-6`. See FeaturesSection for the rest.

            The one wrinkle: on phones the slider is full-bleed (`px-0` above) while this row is
            not, so it needs the gutters back. `px-4 sm:px-0` does that without giving the artwork
            side padding it must not have. */}
        <div className="px-4 sm:px-0">
          <FeaturesSection />
        </div>
      </div>
    </section>
  );
}
