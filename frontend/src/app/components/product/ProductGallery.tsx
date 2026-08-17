'use client';

/**
 * The product gallery — ONE of them, for every width.
 *
 * ── WHY ONE ─────────────────────────────────────────────────────────────────────────────────
 * `ProductDetailClient` carried two complete galleries, `hidden lg:block` and `lg:hidden`, each
 * with its own `<Image priority>`. That cost three things, and the third is the expensive one:
 *
 *   1. Two copies of every fix. The rating row two elements below them had already drifted — the
 *      desktop copy was corrected and the phone kept showing "(0) · 0 avis" for weeks.
 *   2. Two `sizes` strings, each carrying a hand-written `1px` candidate for the breakpoint where
 *      its own gallery is display:none, purely to stop the browser preloading a hidden image at
 *      fetchPriority=high and starving the real LCP. That hack existed only because there were two.
 *   3. TWO PRELOADS on every product page. `priority` emits a `<link rel=preload>` into the head,
 *      and `display:none` does not remove it — the phone fetched the desktop candidate and the
 *      desktop fetched the phone's.
 *
 * One element, one preload, one honest `sizes`. The hack is deleted rather than tuned.
 *
 * ── WHY IT IS SO MUCH BIGGER ────────────────────────────────────────────────────────────────
 * Owner, 16/08/2026: *"user can see product images gallery clearly and can read the texts in the
 * image gallery clearly."*
 *
 * The mobile gallery was capped at `max-w-[260px]` and padded `p-3`, so on a 390px phone the actual
 * packshot occupied 236 CSS pixels — and the type on a supplement tub (the flavour, "24 G PROTEIN",
 * the serving count) is set at roughly a twenty-fifth of the pack height. At 236px that is
 * sub-pixel. It was not a small image, it was an unreadable one, and on this catalogue the label IS
 * the product information.
 *
 * Now it is the full content column at every width, padded `p-2` on phones. Same viewport, ~342px
 * of packshot: 45% larger on the side, 2.1x the area. Tapping opens a viewer where it fills the
 * screen.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

/** A packshot with no image, drawn rather than imported so an empty gallery costs no request. */
function PackshotPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-sunken">
      <svg className="h-20 w-20 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    </div>
  );
}

export function ProductGallery({
  images,
  altBase,
  imageTitle,
  overlayTopLeft,
  railTrailing,
}: {
  images: string[];
  /** Base alt text; views after the first get " – vue N" appended. */
  altBase: string;
  imageTitle?: string;
  /** Stock / promo badges, painted over the top-left corner of the frame. */
  overlayTopLeft?: ReactNode;
  /**
   * A last tile in the thumbnail rail, same size as a thumbnail. The page uses it for the
   * "+N photos" jump to the label grid — see the note on the rail below.
   */
  railTrailing?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const count = images.length;
  const safeIndex = index >= 0 && index < count ? index : 0;
  const current = images[safeIndex] || '';

  const step = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setIndex((prev) => (prev + delta + count) % count);
    },
    [count]
  );

  /*
   * Escape closes the viewer, arrows move it. Bound only while it is open, so a product page nobody
   * zooms into has no key listener attached at all — this renders on the heaviest route on the site
   * and the default state is "closed".
   */
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false);
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed, step]);

  const onTouchStart = (event: React.TouchEvent) => setTouchStartX(event.touches[0]?.clientX ?? null);
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX == null) return;
    const delta = touchStartX - (event.changedTouches[0]?.clientX ?? touchStartX);
    setTouchStartX(null);
    // 50px, so a vertical scroll that drifts sideways does not change the image under the thumb.
    if (Math.abs(delta) < 50) return;
    step(delta > 0 ? 1 : -1);
  };

  const altFor = (i: number) => (i === 0 ? altBase : `${altBase} – vue ${i + 1}`);

  const showRail = count > 1 || Boolean(railTrailing);

  return (
    /*
      ── THE RAIL MOVES, IT IS NOT WRITTEN TWICE ───────────────────────────────────────────────
      The reference storefront stacks its thumbnails VERTICALLY to the left of the main photograph;
      this page had them in a horizontal strip underneath. Both are right for their width — a
      column of 80px tiles beside a 590px frame is free (the frame is square, the column is not,
      so the rail costs no page height at all), and on a 390px phone that same column would eat
      a fifth of the only axis that matters.

      The obvious implementation is `hidden lg:flex` beside `lg:hidden`, and that is precisely the
      mistake this component was created to undo — this file's header records what two parallel
      trees cost the hero. So there is ONE list, in ONE place in the DOM, and the CHANGE OF AXIS
      is the whole implementation: `flex-col` → `lg:flex-row` on the wrapper, plus `order` to move
      the rail from below the frame to before it. Same nodes, same state, same keyboard order.
    */
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:gap-3 xl:gap-4">
      {showRail && (
        /*
          `order-2 lg:order-1`: under the frame on a phone, to its left on a desktop.
          `max-h` + `overflow-y-auto` because the count is genuinely variable — 23,293 photographs
          across 6,437 products — and a rail longer than the frame it navigates would set the
          height of the hero.
        */
        <div
          className="scrollbar-hide order-2 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:gap-2.5 lg:order-1 lg:mx-0 lg:max-h-[36rem] lg:w-[4.5rem] lg:shrink-0 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:px-0 lg:pb-0 xl:w-20"
          role="group"
          aria-label="Miniatures du produit"
        >
          {images.map((image, i) => (
            <button
              key={`${image}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'relative aspect-square w-16 shrink-0 snap-start overflow-hidden rounded-xl border bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:w-[4.5rem] lg:w-full',
                i === safeIndex ? 'border-brand ring-1 ring-brand' : 'border-hairline hover:border-brand'
              )}
              aria-label={`Voir la photo ${i + 1}`}
              aria-current={i === safeIndex}
            >
              <Image
                src={image}
                alt={`${altBase} – miniature ${i + 1}`}
                fill
                loading="lazy"
                sizes="80px"
                className="object-contain p-1"
              />
            </button>
          ))}
          {railTrailing}
        </div>
      )}

      <div className="order-1 min-w-0 lg:order-2 lg:flex-1">
      {/*
        `bg-elevated`, not `bg-sunken`. Supplement packshots are cut out on white, so a grey plate
        behind them prints a visible rectangle around every product on the site.
      */}
      <div
        className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-card"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {current ? (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
            aria-label="Agrandir la photo du produit"
          >
            <Image
              src={current}
              alt={altFor(safeIndex)}
              title={imageTitle}
              fill
              /*
               * `p-2` on phones is the point of this rewrite. The old tree padded `p-3` INSIDE a
               * 260px cap, and with `object-contain` padding is subtracted from the packshot itself
               * — every pixel of it is a pixel of label the customer cannot read.
               */
              className="object-contain object-center p-2 transition-transform duration-300 sm:p-4 lg:p-6 [@media(hover:hover)]:group-hover:scale-[1.04]"
              /*
               * ONE image, so ONE honest `sizes` — and it depends on whether the rail is there,
               * because the rail is what decides how wide this frame is.
               *
               * MEASURED at 1280, 1440 and 1920, and RE-MEASURED after the page moved from the
               * 1280 rail to the site's 1600 one — which is the whole point of the guard that
               * watches this, because the string had gone stale within the hour and nothing about
               * the page looked wrong. With the rail the frame renders 593 / 685 / 780px; without
               * it, 689 / 783 / 876. Below `lg` the gallery is the full content width either way,
               * because the rail is underneath it there rather than beside it.
               *
               * A single string for both would be wrong in one direction or the other on every
               * product page on the site: 600px against a 687px box is a 15% upscale of the LCP
               * image, and 690px against a 591px box is a candidate 36% larger in area than the
               * box it lands in. Neither is visible in a screenshot and both are paid for on
               * every load.
               */
              sizes={
                showRail
                  ? '(min-width: 1600px) 780px, (min-width: 1024px) 48vw, 100vw'
                  : '(min-width: 1600px) 880px, (min-width: 1024px) 55vw, 100vw'
              }
              priority={safeIndex === 0}
              loading={safeIndex === 0 ? 'eager' : 'lazy'}
              fetchPriority={safeIndex === 0 ? 'high' : 'auto'}
              quality={90}
            />
          </button>
        ) : (
          <PackshotPlaceholder />
        )}

        {overlayTopLeft && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
            {overlayTopLeft}
          </div>
        )}
        {/* Arrows are desktop-only: on a phone the frame is swipeable, and an arrow there would sit
            on top of the packshot, which is the thing this rewrite exists to make bigger. */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              className="absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-elevated text-ink-2 opacity-0 shadow-card transition-opacity hover:text-brand focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus group-hover:opacity-100 lg:flex"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              className="absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-elevated text-ink-2 opacity-0 shadow-card transition-opacity hover:text-brand focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus group-hover:opacity-100 lg:flex"
              aria-label="Photo suivante"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* The zoom affordance. Without it, a viewer that only opens on tap is a feature nobody
            discovers. */}
        {current && (
          <span className="pointer-events-none absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-elevated px-2.5 py-1 text-[11px] font-medium text-ink-2">
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            Agrandir
          </span>
        )}
        {count > 1 && (
          <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-hairline bg-elevated px-2.5 py-1 text-[11px] font-medium tabular-nums text-ink-2">
            {safeIndex + 1} / {count}
          </span>
        )}
      </div>

      </div>

      {/*
        ── THE VIEWER ────────────────────────────────────────────────────────────────────────
        `z-50` matches the nutrition lightbox already on this page and the shadcn Sheet overlay, so
        the three can never fight. Below it sit the sticky CTA bar (30) and the tab bar (40), both of
        which must be covered while a photo is open.
      */}
      {zoomed && current && (
        /*
          `.pt-scrim` rather than a hand-written `bg-black/90` with white children.

          It is the design system's one dark-over-content scope (styles/tokens.css): it paints its
          own near-black fill at 86% AND re-points every token underneath it, so `text-ink-1`,
          `border-hairline` and `ring-focus` resolve to their dark-surface values for everything
          inside. The controls below are therefore written exactly as they would be on a white card
          — no `text-white`, no `bg-white/10`, no theme branch — and their contrast is the ratio
          that scope was measured at rather than one I picked by eye.

          `z-50` matches the nutrition lightbox already on this page and the shadcn Sheet overlay,
          so the three can never fight. Below them sit the sticky CTA bar (30) and the tab bar (40),
          both of which must be covered while a photo is open.
        */
        <div
          className="pt-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photos du produit"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); step(-1); }}
                className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:left-6"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); step(1); }}
                className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:right-6"
                aria-label="Photo suivante"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative h-full max-h-[82vh] w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <Image src={current} alt={altFor(safeIndex)} fill sizes="100vw" quality={95} className="object-contain" />
          </div>

          {count > 1 && (
            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-hairline px-3 py-1 text-sm tabular-nums text-ink-1">
              {safeIndex + 1} / {count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
