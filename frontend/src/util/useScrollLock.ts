'use client';

import { useEffect } from 'react';

/**
 * Freeze the page behind an overlay.
 *
 * ── WHY THIS EXISTS WHEN THE OVERLAY LIBRARIES ALREADY "DO" IT ──────────────────────────────
 * Owner, 18/08/2026: *"when on the desktop and we open the panier, the screen scroll should
 * stop"*. Measured before writing anything — open the cart at 1536 and `window.scrollBy(0, 600)`:
 *
 *     { bodyOverflow: "hidden", htmlOverflow: "hidden auto", scrollY: 0 -> 580 }
 *
 * The lock WAS applied and it was applied to the wrong element. Vaul (and Radix, and every other
 * overlay primitive that ships one) sets `overflow: hidden` on `document.body`, which works on the
 * document structure those libraries assume. This page's scroller is the ROOT element: globals.css
 * puts `overflow-x: hidden` on body, and a `hidden` axis forces the other one to `auto`, so the
 * body cannot scroll anyway — the viewport scrollbar belongs to `<html>`, and nothing was touching
 * `<html>`. A lock that measures as applied and does not hold is worse than none, because nobody
 * re-tests it.
 *
 * ── THE SCROLLBAR IS THE OTHER HALF ─────────────────────────────────────────────────────────
 * Hiding the root's overflow removes the scrollbar, which widens the viewport by ~15px on desktop
 * Windows and shifts the entire page right the instant the drawer opens — a visible jolt behind a
 * panel that is supposed to be calm. The compensating `padding-right` puts those pixels back.
 *
 * The header survives this because it is `position: sticky`, i.e. still in normal flow, so it is
 * inset by the same padding as everything else. A `position: fixed` header would NOT be — its
 * containing block is the viewport — and would need `right: <scrollbar>px` of its own. Worth
 * knowing before anyone changes that.
 *
 * Restores the exact previous inline values rather than clearing the properties, so two overlays
 * open at once (cart over mobile menu) unwind in the right order.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;

    const html = document.documentElement;
    /* innerWidth includes the scrollbar; clientWidth does not. The difference IS the scrollbar,
       and it is 0 on every overlay-scrollbar platform (macOS, touch), where no compensation is
       wanted and none is applied. */
    const scrollbar = window.innerWidth - html.clientWidth;
    const prevOverflow = html.style.overflow;
    const prevPadding = html.style.paddingRight;

    html.style.overflow = 'hidden';
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;

    return () => {
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPadding;
    };
  }, [locked]);
}
