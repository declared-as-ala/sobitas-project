/**
 * Hero LCP image contract (DESIGN_SYSTEM.md v3 §12).
 *
 * The homepage hero is the mobile LCP element, and its speed depends on ONE invariant:
 * the `<link rel="preload">` in app/page.tsx and the `<source>`/`<img>` the browser actually
 * paints must resolve to the BYTE-IDENTICAL URL, under the same media query. If they drift,
 * the browser downloads the image twice and the preload is wasted ("preloaded but not used").
 *
 * Previously those were two hand-maintained copies of the same 767/768 breakpoints and the
 * same hardcoded /slides/hero-*.avif paths. This module makes them one derived object, so
 * drift is structurally impossible: page.tsx renders `set.preload`, Hero renders `set.sources`.
 *
 * WHY THE OPTIMIZER FOR ADMIN SLIDES
 * Admin uploads land on admin.protein.tn as a single full-size WebP. Serving that directly
 * would (a) put a DNS + TCP + TLS handshake to another origin on the critical path and
 * (b) ship a 2400px desktop image to a 390px phone. Routing through Next's optimizer at a
 * FIXED width makes the URL same-origin (no extra handshake, no CORS-mode mismatch between
 * preload and fetch), correctly sized, and AVIF-negotiated — while staying deterministic
 * enough to preload, which `next/image` is not (it emits a srcset and picks a candidate at
 * runtime, so the server cannot know which URL will be requested).
 */

const MOBILE_MEDIA = '(max-width: 767px)';
const DESKTOP_MEDIA = '(min-width: 768px)';

/**
 * Must be members of `images.deviceSizes` in next.config.js or the optimizer returns 400.
 *
 * MOBILE_WIDTH is calibrated to a PORTRAIT phone crop: the shipped /slides/hero-m.webp is
 * 828×1471, and object-cover on a ~390px-wide frame scales such an image by WIDTH, so 828 real
 * px across ~390 CSS px is roughly 2.1× density — right for a DPR-2 phone.
 *
 * DESKTOP_WIDTH is 1920 rather than 1200 because the hero is full-bleed: at 1200 it replaced a
 * 1707px static asset and visibly softened on wide displays. Mobile is untouched, so the extra
 * bytes only ever land on ≥768px viewports.
 */
const MOBILE_WIDTH = 828;
const DESKTOP_WIDTH = 1920;
/**
 * Must be a member of `images.qualities` in next.config.js.
 *
 * 80, raised from 70. The hero is the largest thing on the page and the first thing anyone sees,
 * and at 70 — on top of the lossy WebP the upload already produced — it visibly mushed.
 *
 * Measured on the real slides rather than guessed. AVIF, which is what browsers actually get:
 *
 *   mobile 828px    q70 37.0kB   q75 46.4kB   q80 54.9kB   q85 63.8kB   q90 72.4kB
 *   desktop 1920px  q70 56.5kB   q75 69.9kB   q80 82.3kB   q85 93.9kB   q90 105.7kB
 *
 * 80 costs +18kB on mobile and is where the curve flattens: 85 and 90 add another 9kB and 18kB
 * for far less visible gain. A 55kB hero is cheap by any standard, and the ~870kB of dead
 * JavaScript removed from every route pays for it many times over.
 */
const QUALITY = 80;

/**
 * Pre-generated static hero, used when the admin has no active slide (and as the safety net if
 * the slides fetch fails). These are the exact assets and dimensions the hero shipped with, so
 * the zero-slides path is byte-for-byte what is live today — no regression before the owner
 * uploads anything.
 */
const STATIC_HERO = {
  mobileAvif: '/slides/hero-m.avif',
  mobileWebp: '/slides/hero-m.webp',
  desktopAvif: '/slides/hero-d.avif',
  desktopWebp: '/slides/hero-d.webp',
  width: 1672,
  height: 941,
} as const;

export type HeroSlide = {
  id: number | string;
  /** Absolute desktop image URL (already through getStorageUrl). */
  imageUrl: string;
  /** Optional dedicated phone crop; falls back to imageUrl. */
  imageMobileUrl?: string | null;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  href?: string | null;
  alt?: string | null;
};

export type HeroSource = { media: string; srcSet: string; type?: string };
export type HeroPreload = { href: string; media: string; type?: string };

export type HeroImageSet = {
  /** Ordered exactly as the <source> elements must appear inside <picture>. */
  sources: HeroSource[];
  img: { src: string; width: number; height: number; alt: string };
  /** Emitted as <link rel="preload"> by the page. Empty for non-LCP slides. */
  preload: HeroPreload[];
};

/** Build a deterministic Next image-optimizer URL. Same-origin, fixed width, AVIF-negotiated. */
function optimized(url: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${QUALITY}`;
}

/**
 * @param slide  the slide to render, or null for the built-in static hero
 * @param eager  true only for the FIRST slide — it alone is the LCP element and gets preloads.
 *               Slides 2+ pass false and are lazy-loaded.
 */
export function buildHeroImageSet(slide: HeroSlide | null, eager: boolean, fallbackAlt: string): HeroImageSet {
  if (!slide?.imageUrl) {
    const alt = fallbackAlt;
    return {
      sources: [
        { type: 'image/avif', media: MOBILE_MEDIA, srcSet: STATIC_HERO.mobileAvif },
        { type: 'image/webp', media: MOBILE_MEDIA, srcSet: STATIC_HERO.mobileWebp },
        { type: 'image/avif', media: DESKTOP_MEDIA, srcSet: STATIC_HERO.desktopAvif },
        { type: 'image/webp', media: DESKTOP_MEDIA, srcSet: STATIC_HERO.desktopWebp },
      ],
      img: { src: STATIC_HERO.desktopWebp, width: STATIC_HERO.width, height: STATIC_HERO.height, alt },
      // Direct-static AVIF, edge-cached by Cloudflare — exactly the current live behaviour.
      preload: eager
        ? [
            { href: STATIC_HERO.mobileAvif, media: MOBILE_MEDIA, type: 'image/avif' },
            { href: STATIC_HERO.desktopAvif, media: DESKTOP_MEDIA, type: 'image/avif' },
          ]
        : [],
    };
  }

  const desktopSrc = optimized(slide.imageUrl, DESKTOP_WIDTH);

  // Only downscale to MOBILE_WIDTH when there is a DEDICATED portrait crop. Falling back to the
  // landscape desktop image flips which axis object-cover scales by — it then scales by HEIGHT,
  // stretching 828 real px across ~1045 CSS px (under 1:1 even at DPR 1) and cropping to ~37% of
  // the frame. Reusing the desktop URL keeps it sharp and, because both entries are then the same
  // string, collapses the two preloads into one request instead of two.
  const mobileSrc = slide.imageMobileUrl ? optimized(slide.imageMobileUrl, MOBILE_WIDTH) : desktopSrc;
  const alt = slide.alt || slide.title || fallbackAlt;

  // When there is no dedicated phone crop both breakpoints resolve to the same URL, so the
  // <source> and the second preload would be pure duplication — and two <link>s sharing an href
  // collide on the React key. Collapse to a single unconditional preload and no <source>.
  const oneImageForBoth = mobileSrc === desktopSrc;

  return {
    // No `type`: the optimizer content-negotiates AVIF/WebP from the Accept header, so pinning
    // a type here would be a lie and could make the browser skip a source it can actually use.
    sources: oneImageForBoth ? [] : [{ media: MOBILE_MEDIA, srcSet: mobileSrc }],
    img: { src: desktopSrc, width: DESKTOP_WIDTH, height: Math.round((DESKTOP_WIDTH * 5) / 12), alt },
    // No `type` and deliberately no `crossOrigin`: the <img> fetch is same-origin and
    // non-CORS, and a preload whose CORS mode differs from the fetch is downloaded twice.
    preload: eager
      ? oneImageForBoth
        ? [{ href: desktopSrc, media: 'all' }]
        : [
            { href: mobileSrc, media: MOBILE_MEDIA },
            { href: desktopSrc, media: DESKTOP_MEDIA },
          ]
      : [],
  };
}
