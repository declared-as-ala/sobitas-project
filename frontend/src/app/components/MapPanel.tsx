'use client';

import { useState } from 'react';
import { ArrowUpRight, Map as MapIcon, MapPin } from 'lucide-react';

/**
 * The shop's location: an address, two buttons, and a Google Maps embed only once asked for.
 *
 * ── WHY THE MAP DOES NOT LOAD ITSELF ──────────────────────────────────────────────────────
 * A Maps embed is a third-party iframe that pulls several hundred kilobytes of script, issues a
 * dozen tile requests and runs its own main thread. The footer used to mount one from an
 * IntersectionObserver, which is the standard "lazy" pattern and here was close to no saving at
 * all: a footer is at the bottom of every page, so "near the viewport" means "the reader
 * scrolled", which is most sessions. Paid on every page, for a picture of a street almost nobody
 * came for.
 *
 * So it is a poster with the address on it and two controls. "Itinéraire" needs no iframe at all
 * and is the better answer on a phone anyway, because it hands the address to whichever
 * navigation app the visitor actually uses.
 *
 * Written once and shared by /qui-sommes-nous and /contact — the two pages that had grown their
 * own copies of this, with different heights, different button shapes and, on the About page, a
 * version that mounted the iframe unconditionally on first paint.
 */
export function MapPanel({
  embedHtml,
  address,
  name = 'PROTEIN.TN — Protéine Tunisie',
  className = '',
  /** Poster height. The two call sites sit in different columns and want different ratios. */
  mapClassName = 'h-64 sm:h-80',
}: {
  embedHtml?: string | null;
  address: string;
  name?: string;
  className?: string;
  mapClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `PROTEIN.TN ${address}`
  )}`;

  return (
    <div className={`overflow-hidden rounded-2xl border border-hairline bg-elevated ${className}`}>
      {open && embedHtml ? (
        <div
          className={`w-full ${mapClassName} [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0`}
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      ) : (
        /* ── THE POSTER IS THE BUTTON ──────────────────────────────────────────────────────
           First version was a grey rectangle with a small glyph centred in it and a text button
           below. On a screenshot that is indistinguishable from an image that failed to load —
           the exact impression this page is trying not to give — and it asks the reader to find
           a 40px control to act on a 320px object. The whole panel is the affordance now, with
           the label inside it. */
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!embedHtml}
          aria-label="Afficher la carte"
          className={`group flex w-full flex-col items-center justify-center gap-2 bg-sunken transition-colors hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus disabled:cursor-default disabled:hover:bg-sunken ${mapClassName}`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-elevated text-brand transition-transform group-hover:scale-105">
            <MapIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">
            Afficher la carte
          </span>
        </button>
      )}

      <div className="flex flex-col gap-3 border-t border-hairline p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug text-ink-1">{name}</p>
            <p className="mt-0.5 break-words text-sm leading-snug text-ink-2">{address}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {embedHtml && open && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-expanded
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rule px-3.5 text-[13px] font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Masquer la carte
            </button>
          )}
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rule px-3.5 text-[13px] font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Itinéraire
            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
