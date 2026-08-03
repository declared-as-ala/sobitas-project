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
 * ── A SLIDE IS AN IMAGE. THAT IS THE WHOLE POLICY. ────────────────────────────────────────
 * Owner, 2026-08-03, after reviewing with a client: "take off all the text shown on the slide —
 * the slide will be edge to edge. Generate an image in any graphic-design tool, put it in the
 * slider, and that's all. No descriptions, no buttons, no badges. Just the image and its alt."
 *
 * So the badge, the two-tone headline, the subtitle, the CTA button, the solid legibility plate
 * and the gradient scrim are all DELETED — not hidden behind a flag, not left as unused props.
 * The type in util/heroImage.ts no longer carries the fields, so there is nowhere for an overlay
 * to come back from without a deliberate change.
 *
 * Three things follow from that, and all three are improvements rather than costs:
 *
 *   LEGIBILITY STOPS BEING OUR PROBLEM. The plate existed because a scrim over an arbitrary admin
 *   upload can never be proven to clear 4.5:1 — measured over a blown-out banner the old gradient
 *   composited to #BFBFBF and white copy on it was 1.84:1. With no copy on the artwork there is no
 *   contrast ratio to fail. Whoever designs the banner controls its own legibility, in the tool
 *   where they can see it.
 *
 *   THE ARROWS STOP COLLIDING. Measured at 390px, the two 44px chevrons sat at x 8–52 and 338–382
 *   while the caption plate spanned x 20–370 — both arrows overlapped the copy on every slide.
 *   With no copy, they overlap nothing.
 *
 *   THE LCP PAINT GETS SIMPLER. The band no longer stacks a full-bleed gradient and an 86%-opaque
 *   rounded plate over the LCP image, so the largest paint is the image and nothing else.
 *
 * `alt` is the only text a slide carries and it is never drawn — it describes the artwork for
 * search engines and screen readers, which is the job the title was doing badly.
 */

/**
 * The admin's slide link is free text with no URL validation on the Filament side, so two natural
 * mistakes have to be absorbed here rather than shipping a broken banner:
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
 * One banner: an image, wrapped in a link. Nothing is drawn on top of it.
 *
 * There is no caption, no scrim and no `hasControls` prop any more. `hasControls` existed solely
 * to reserve bottom padding so the copy cleared the arrows/dots rail; with no copy there is
 * nothing to clear, and the slider's own controls sit over artwork the designer laid out knowing
 * they would be there.
 */
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
  // blank. The whole banner is the link — that is what replaces the CTA button.
  const href = normalizeHref(slide?.href) || '/shop';

  // The link has no visible text, so it needs an accessible name, and `alt` is now the only place
  // one can come from. In a multi-slide track the position is appended so two banners can never
  // present as the same link (WCAG 2.4.4). The <img> keeps the same alt; a screen reader announces
  // the link by its aria-label, so the two do not double up.
  const baseLabel = slide?.alt?.trim() || fallbackAlt;
  const ariaLabel =
    position && position.total > 1
      ? `${baseLabel} — diapositive ${position.index} sur ${position.total}`
      : baseLabel;

  return (
    <LinkWithLoading
      href={href}
      aria-label={ariaLabel}
      loadingMessage="Chargement..."
      /* ring-INSET: the frame is overflow-hidden, which would clip a normal focus outline drawn at
         the border box. An inset ring paints inside the box so the keyboard focus indicator on this
         primary banner link stays visible (WCAG 2.4.7). */
      className="group absolute inset-0 block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white"
    >
      <HeroPicture set={set} eager={eager} />
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
