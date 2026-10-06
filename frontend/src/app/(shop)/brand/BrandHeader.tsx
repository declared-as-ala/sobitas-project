import type { buildBrandPageCopy } from '@/util/brandTemplate';

type BrandPageCopy = ReturnType<typeof buildBrandPageCopy>;

/**
 * The top of every brand page — eyebrow, the ONLY <h1>, the factual lead and the logo.
 *
 * ── ONE COMPONENT, BOTH RENDERS ─────────────────────────────────────────────────────────────
 * middleware.ts rewrites crawler user agents on /{brand-slug} to /x-crawler/category/{slug}. Until
 * 05/10/2026 the two routes drew this block separately and disagreed: Googlebot got an H1 and then
 * 51 product cards with no words between them (the intro came after the grid, and on /now-foods
 * after 517 cards), while a shopper got an H1, an intro AND a second panel with the logo and a
 * paragraph claiming « importés officiellement » that the bot never saw. This server component is
 * mounted by both routes with the same `copy`, so the two renders are the same bytes.
 *
 * ── THE LOGO IS A PLAIN <img>, ON PURPOSE ───────────────────────────────────────────────────
 * next/image would rewrite the URL to /_next/image?url=…, and the page's Brand JSON-LD `logo`
 * names the original file. One URL in both places is what lets Google tie the picture to the
 * entity. `fetchPriority="low"`: the LCP of a listing is a product packshot, and an 80–112px
 * wordmark must not compete with it. React 19's server renderer turns every eager <img> that is not
 * fetchPriority="low" into a `<link rel="preload" as="image">` in <head> (or a `Link:` header),
 * and the logo was preloaded ahead of the first packshots on /dymatize and /optimum-nutrition
 * (06/10/2026). "low" is the one value React skips; the image still loads eagerly, from the same
 * URL as Brand.logo. The file ships as stored, so its weight is the
 * upload's: scripts/audit-brand-copy-live.mjs lists logos over 20 KB (Muscle Care 131 KB and
 * William Bonac 77 KB on 06/10/2026) for a ≤400 px re-export in the admin. `.pt-logo-well` is the fixed-white well every brand
 * logo on the site sits in (see globals.css) — most of the artwork has a white background baked in.
 */
export function BrandHeader({ copy }: { copy: BrandPageCopy }) {
  return (
    <header className="rounded-2xl border border-hairline bg-elevated px-5 py-6 sm:px-7 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="mb-3 flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            <span aria-hidden className="h-px w-5 bg-brand" />
            Marque
          </p>
          <h1 className="max-w-4xl font-display text-3xl font-extrabold uppercase leading-[0.96] tracking-[-0.02em] text-ink-1 sm:text-4xl lg:text-5xl">
            {copy.heading}
          </h1>
          <div
            className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-2 sm:text-base [&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-brand-hover [&_a:focus-visible]:rounded-sm [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-focus"
            dangerouslySetInnerHTML={{ __html: copy.leadHtml }}
          />
        </div>
        {copy.logo && (
          // order-first: on a phone the wordmark sits above the eyebrow instead of squeezing the
          // H1 into the 250px beside it; from `sm` it moves to the right. Visual order only — an
          // image is not focusable, so tab order is unaffected.
          <div className="pt-logo-well order-first flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-hairline p-2 sm:order-last sm:h-28 sm:w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={copy.logo.src}
              alt={copy.logo.alt}
              width={copy.logo.width}
              height={copy.logo.height}
              loading="eager"
              fetchPriority="low"
              decoding="async"
              className="h-auto max-h-full w-auto max-w-full object-contain"
            />
          </div>
        )}
      </div>
    </header>
  );
}
