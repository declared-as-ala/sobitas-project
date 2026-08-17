'use client';

/**
 * The label photographs, as a grid you can read rather than thumbnails you have to swipe.
 *
 * ── WHY THEY ARE NOT IN THE CAROUSEL ────────────────────────────────────────────────────────
 * Owner, 17/08/2026: *"always the first 2 are the front and the back of the products and the rest
 * are instructions … I want the instructions to be shown in the page as a grid of images well
 * designed and integrated with the page."*
 *
 * He is describing a real category error. The main gallery answers "what does this look like"; a
 * photograph of the Supplement Facts panel answers "what is in it and how do I take it". Filing the
 * second behind six thumbnails of the first means the label is technically on the page and
 * practically unreachable — and on an imported catalogue where we do not physically hold the stock,
 * a legible photograph of the printed label is the most trustworthy thing on the whole page,
 * because it is the manufacturer's own words rather than our transcription of them.
 *
 * ── THE TILE IS SQUARE BECAUSE THE PHOTOGRAPHS ARE ──────────────────────────────────────────
 * This shipped as `aspect-[3/4]` on the reasoning that a panel printed on a cylinder photographs
 * portrait. Then it was measured: every label frame the source serves is 220x220, and a 3:4 tile
 * rendered them at 146x195 — letterboxed, with the readable area cut by a quarter. That is exactly
 * the failure this component exists to fix, reintroduced one level down by an assumption nobody
 * had checked.
 *
 * ── AND WHY THREE ACROSS AT MOST ────────────────────────────────────────────────────────────
 * The grid sits in the gallery column, which is 7 of 12 — about 680px at 1440. Four across put
 * each tile at ~155px, and a Supplement Facts panel set in 6pt type is not a legible thing at
 * 155px, it is a picture OF text. Three gives ~215px, where the headings read and the enlarge is a
 * convenience rather than the only way to use the section.
 *
 * ── WHY ITS OWN VIEWER ──────────────────────────────────────────────────────────────────────
 * Sharing the main gallery's viewer would mean lifting its index state into the page and threading
 * two image arrays through it, which is how the two render trees this page used to have got
 * started. It is thirty lines, it uses the same `.pt-scrim` scope so the two look identical, and
 * neither can drift into the other.
 */
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

/** Cells a row of `cols` would leave empty for `count` items — 0 when the last row is full. */
function emptyCells(count: number, cols: number): number {
  const remainder = count % cols;
  return remainder === 0 ? 0 : cols - remainder;
}

export function ProductLabelGrid({ images, altBase }: { images: string[]; altBase: string }) {
  const [open, setOpen] = useState(-1);
  const count = images.length;

  const step = useCallback(
    (delta: number) => setOpen((prev) => (prev < 0 ? prev : (prev + delta + count) % count)),
    [count]
  );

  useEffect(() => {
    if (open < 0) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(-1);
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  if (count === 0) return null;

  return (
    <>
      {/*
        ── THREE OR FOUR ACROSS, DECIDED BY THE COUNT ──────────────────────────────────────
        This grid is a full-width band now rather than a drawer in the 591px gallery column, so
        `lg` has room for either. Fixing it at four left six photographs — the single most common
        count on this catalogue, because a product with eight images has two packshots and six
        labels — drawn as a row of four and a row of two, with half the second row empty.

        So the column count is chosen to leave the FEWEST empty cells, preferring three on a tie
        because three is also the larger tile (392px against 289px) and these are photographs of
        printed text: a Supplement Facts panel, a directions paragraph, an allergen line. Bigger is
        not decoration here, it is whether the words resolve.

          3 photos → 3 across   ·   4 → 4   ·   5 → 3 (one gap, not three)
          6        → 3          ·   7 → 4   ·   8 → 4

        Both class strings are written out in full rather than composed, because Tailwind's scanner
        reads SOURCE TEXT: a class name assembled at runtime from a variable is a class that exists
        in the DOM and in no stylesheet.
      */}
      <ul
        className={
          emptyCells(count, 3) <= emptyCells(count, 4)
            ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 lg:gap-5'
            : 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5'
        }
      >
        {images.map((image, i) => (
          <li key={`${image}-${i}`}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl border border-hairline bg-elevated transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              aria-label={`Agrandir la photo ${i + 1}`}
            >
              <Image
                src={image}
                alt={`${altBase} – étiquette ${i + 1}`}
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 400px, (min-width: 640px) 30vw, 45vw"
                className="object-contain p-1.5"
              />
              <span className="pointer-events-none absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full border border-hairline bg-elevated text-ink-2 opacity-0 transition-opacity group-hover:opacity-100">
                <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open >= 0 && (
        <div
          className="pt-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photos de l'étiquette"
          onClick={() => setOpen(-1)}
        >
          <button
            type="button"
            onClick={() => setOpen(-1)}
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

          <div className="relative h-full max-h-[86vh] w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <Image
              src={images[open]}
              alt={`${altBase} – étiquette ${open + 1}`}
              fill
              sizes="100vw"
              quality={95}
              className="object-contain"
            />
          </div>

          {count > 1 && (
            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-hairline px-3 py-1 text-sm tabular-nums text-ink-1">
              {open + 1} / {count}
            </span>
          )}
        </div>
      )}
    </>
  );
}
