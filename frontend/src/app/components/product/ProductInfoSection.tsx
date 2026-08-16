/**
 * One labelled, collapsible block of product information.
 *
 * ── WHY `<details>` AND NOT THE ACCORDION PRIMITIVE ─────────────────────────────────────────
 * `components/ui/accordion.tsx` wraps Radix, and Radix returns `present && children` — a closed
 * panel is not hidden, it is ABSENT FROM THE DOM. That is the exact defect fixed on this page one
 * day ago: the Supplement Facts panel and the FAQ were inside inactive tabs, so they were missing
 * from the server-rendered HTML while `FAQPage` JSON-LD was emitted unconditionally. Markup
 * describing content that is not on the page is a Google structured-data violation.
 *
 * Rebuilding that same trap in accordion form, over the richest content on the site — 21,273
 * transcribed overviews, 18,965 Supplement Facts panels, 19,963 directions — would undo it at
 * nine times the scale. Radix can be forced open with `forceMount`, but then every panel needs a
 * hand-written CSS hide and the animation has to be re-derived; the native element simply does not
 * have the problem.
 *
 * `<details>` gives, for free:
 *   • content ALWAYS in the DOM, open or closed — indexable by construction, not by remembering
 *   • the disclosure widget role, keyboard support and screen-reader semantics, with no JS
 *   • zero hydration cost on a page that is already the heaviest route on the site
 *   • Ctrl+F opens it in Chrome, which a Radix panel cannot do
 *
 * ── WHY THIS SHAPE AT ALL ───────────────────────────────────────────────────────────────────
 * Owner, 16/08/2026, against a reference storefront: *"a lot of informations in description that
 * being showed wrong … user can see ingredients clearly, description clearly and any labels
 * clearly."*
 *
 * The page had TWO tabs. "Description" carried the overview, the packaging specs, the directions,
 * the other-ingredients list and the warnings — five distinct kinds of information stacked into
 * one scrolling column with `<h3>`s as the only separation. A customer looking for "how do I take
 * this" had to read a marketing paragraph first, and a customer checking an allergen had to find a
 * list buried below both. The reference splits exactly these into named, collapsible sections, and
 * so does this.
 */
import type { ReactNode } from 'react';

export function ProductInfoSection({
  id,
  title,
  children,
  defaultOpen = false,
  eyebrow,
}: {
  id: string;
  title: string;
  children: ReactNode;
  /** The overview opens by default; everything else is one tap away. */
  defaultOpen?: boolean;
  /** Optional short qualifier shown beside the title, e.g. a count or a source note. */
  eyebrow?: string;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group border-b border-hairline last:border-b-0 [&_summary::-webkit-details-marker]:hidden"
    >
      {/*
        `min-h-[56px]` is the row, not the text: this is the primary control of the section and it
        has to clear the 44px tap floor with room, the same floor measure-flash asserts on the
        homepage. `list-none` plus the webkit marker rule above removes the default triangle in
        every engine — Safari uses `::-webkit-details-marker`, everything else uses `list-style`.
      */}
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 py-4 text-left transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-display text-base font-bold uppercase leading-tight tracking-tight text-ink-1 sm:text-lg">
            {title}
          </span>
          {eyebrow && <span className="shrink-0 text-xs font-medium text-ink-3">{eyebrow}</span>}
        </span>
        {/*
          A rotating chevron drawn in CSS rather than an icon import: this component renders up to
          seven times per page and the marker is the one part that must not cost a component.
          `group-open:` is Tailwind's `[open]` variant on the parent <details>.
        */}
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline text-ink-2 transition-transform duration-200 group-open:rotate-180 group-hover:border-brand group-hover:text-brand motion-reduce:transition-none"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>

      <div className="pb-6 pt-1 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </details>
  );
}
