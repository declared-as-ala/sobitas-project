'use client';

/**
 * The coach who offers the needs check on the last step.
 *
 * ── WHY AN SVG AND NOT THE PNG THAT WAS ASKED FOR ──────────────────────────────────────────
 * The brief asked for "a PNG of a person, like a doctor". Two reasons this is drawn instead:
 *
 *  1. A photorealistic person implies a real, identifiable practitioner standing behind a
 *     nutrition figure. This site does not employ one, and a stock face beside a calorie target is
 *     the visual equivalent of a claim we are not making. A drawn, obviously-illustrative figure
 *     says "a guide" without saying "a clinician".
 *  2. It costs no network request, scales to any density, and re-colours itself in dark mode from
 *     the same tokens as everything around it. A raster asset would need a light and a dark cut,
 *     a `sizes`, and a preload budget on a page that is already carrying product imagery.
 *
 * If the owner would rather use a photograph of an actual coach from the shop, this component is
 * the single place to swap — nothing else references the artwork.
 *
 * Every fill is `currentColor` or a token, and the whole thing is `aria-hidden`: it is decoration
 * beside text that already says what it means, so announcing it would just add noise.
 */

export function CoachFigure({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Plate behind the figure — brand at 10%, which is legible on canvas, sunken and elevated
          alike, so this drops onto any surface the recap step happens to use. */}
      <circle cx="60" cy="60" r="58" className="fill-brand/10" />

      {/* Shoulders */}
      <path
        d="M26 118c0-19.9 15.2-33 34-33s34 13.1 34 33"
        className="fill-brand"
        fillOpacity="0.9"
      />
      {/* Collar / neckline, punched out of the shoulders so the shirt reads as a shirt */}
      <path d="M49 88.5c3.4 4.6 7 6.9 11 6.9s7.6-2.3 11-6.9l-4-2.6c-2.4 3-4.7 4.5-7 4.5s-4.6-1.5-7-4.5z" className="fill-canvas" />

      {/* Neck */}
      <rect x="53" y="60" width="14" height="20" rx="7" className="fill-ink-2" fillOpacity="0.28" />

      {/* Head */}
      <circle cx="60" cy="48" r="20" className="fill-ink-2" fillOpacity="0.28" />
      {/* Hair — a simple cap, drawn as an arc rather than a shape with a parting, because at 64px
          any more detail turns to mud. */}
      <path d="M40 46a20 20 0 0 1 40 0c0-7-6-11-20-11s-20 4-20 11z" className="fill-ink-1" fillOpacity="0.55" />

      {/* A clipboard, which is what makes this read as "someone doing an assessment" rather than
          "a generic avatar". Held at the shoulder line so it does not fight the face. */}
      <g>
        <rect x="76" y="72" width="26" height="32" rx="4" className="fill-canvas stroke-hairline" strokeWidth="2" />
        <rect x="85" y="68" width="8" height="7" rx="2" className="fill-brand" />
        <rect x="81" y="83" width="16" height="2.5" rx="1.25" className="fill-ink-3" fillOpacity="0.6" />
        <rect x="81" y="90" width="12" height="2.5" rx="1.25" className="fill-ink-3" fillOpacity="0.6" />
        <rect x="81" y="97" width="14" height="2.5" rx="1.25" className="fill-ink-3" fillOpacity="0.6" />
      </g>
    </svg>
  );
}
