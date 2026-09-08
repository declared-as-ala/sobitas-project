import { ArrowUpRight, PenLine, Star } from 'lucide-react';
import { GOOGLE_BUSINESS_REVIEWS } from '@/content/googleBusinessReviews';
import { GOOGLE_PROFILE } from '@/util/company';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import { ReviewMarquee } from '@/app/components/ReviewMarquee';

type GoogleReviewsSectionProps = {
  surface?: 'base' | 'sunken';
  /** The About page uses a slightly more explicit title than the homepage. */
  context?: 'home' | 'about';
};

const REVIEW_ROWS = [GOOGLE_BUSINESS_REVIEWS.slice(0, 10), GOOGLE_BUSINESS_REVIEWS.slice(10)];

/**
 * ── THE GOOGLE PROFILE, AS AUTHORITY ────────────────────────────────────────────────────────
 * Owner, 07/09/2026: *"show 3 rows not one, clicking should take you to the page where you can
 * directly put a review on Google, add more data about the review, and add the Google icon in
 * big for more authority."*
 *
 * Three things changed and one of them is not visual.
 *
 * THE LINK NOW LANDS ON THE COMPOSE DIALOG. Every link here pointed at
 * `maps.app.goo.gl/…`, which opens the listing — leaving a review from there is three taps
 * further in, behind a Reviews tab. `GOOGLE_PROFILE.writeReviewUrl` is Google's own
 * `search.google.com/local/writereview?placeid=…` entry point and opens the box directly. The
 * cards still link to the profile, because a card is an invitation to *read* the source; the
 * one control that asks for a review is the one that goes to the composer.
 *
 * THE MARK IS GOOGLE'S, NOT A GENERIC BADGE. It was a lucide `BadgeCheck` in the site's own
 * green with the word "Google" beside it — a shape that carries none of the recognition the
 * request is asking for. Borrowed authority only works when the mark is the real one, so this
 * draws the actual four-colour G. It is inline SVG with `fill` attributes rather than Tailwind
 * arbitrary colours: those are Google's brand values, not tokens of this design system, and
 * putting them in a className would be both a DS006 violation and a lie about where they came
 * from.
 *
 * Owner, 08/09/2026: two compact moving rows. Opposite directions distinguish the two rows
 * without making them look like one sliding block. Hover pauses; keyboard focus uses a native
 * stationary rail; reduced motion expands every original quote into a readable static grid.
 */
export function GoogleReviewsSection({
  surface = 'base',
  context = 'home',
}: GoogleReviewsSectionProps) {
  const rating = GOOGLE_PROFILE.ratingValue.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <Section
      surface={surface}
      spacing="default"
      width="wide"
      defer
      aria-labelledby="google-reviews-title"
    >
      <SectionHeader
        id="google-reviews-title"
        scale="2"
        kicker="Avis clients vérifiés"
        title={context === 'about' ? 'La confiance se vérifie' : 'Ils nous font confiance'}
        subtitle="Des avis publics, consultables directement sur notre profil Google."
      />

      <div className="mb-4 overflow-hidden rounded-2xl border border-hairline bg-elevated sm:mb-5">
        <div className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:p-5">
          <div className="flex items-center gap-4">
            <GoogleMark className="h-11 w-11 shrink-0 sm:h-14 sm:w-14" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <strong className="font-display text-[2rem] font-extrabold leading-none tabular-nums text-ink-1">
                  {rating}
                </strong>
                <span className="text-sm font-semibold text-ink-2">sur 5</span>
              </div>
              {/* `text-amber-400`, not `text-rating`. `rating` is not a colour in tailwind.config.ts
                  and not a token in tokens.css — Tailwind emitted NOTHING for it, confirmed by
                  grepping the deployed CSS (0 occurrences), so these five stars have been
                  rendering in inherited ink rather than gold. That is DESIGN_SYSTEM's named trap:
                  an undefined colour fails silently and the element takes its band's text colour.
                  `StarRating.tsx` is canonical and uses amber-400; matched here. */}
              <div className="mt-1 flex items-center gap-1 text-amber-400" aria-label={`${rating} étoiles sur 5`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" strokeWidth={1.5} aria-hidden="true" />
                ))}
              </div>
            </div>
          </div>

          {/* The counts that make the rating mean something. A 4.9 from eleven people and a 4.9
              from twelve hundred are different claims, and only the second one is ours. */}
          <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-hairline pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <div>
              <dt className="text-xs text-ink-3">Avis publics</dt>
              <dd className="font-display text-lg font-bold tabular-nums text-ink-1">{GOOGLE_PROFILE.reviewCountLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Source</dt>
              <dd className="text-sm font-semibold text-ink-1">Google Maps</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Vérifié le</dt>
              <dd className="text-sm font-semibold tabular-nums text-ink-1">
                {new Date(GOOGLE_PROFILE.ratingCheckedOn).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </dd>
            </div>
          </dl>

          <a
            href={GOOGLE_PROFILE.writeReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 font-display text-sm font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <PenLine className="h-4 w-4 shrink-0" aria-hidden="true" />
            Laisser un avis
          </a>
        </div>
      </div>

      <div className="space-y-1">
        {REVIEW_ROWS.map((reviews, row) => (
          <ReviewMarquee key={row} reverse={row === 1}>
            {reviews.map((review) => <ReviewCard key={review.author} review={review} />)}
            {reviews.map((review) => <ReviewCard key={`copy-${review.author}`} review={review} copy />)}
          </ReviewMarquee>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        Extraits de notre profil public Google Maps, vérifiés le 2 septembre 2026. Avis affichés dans leur langue d’origine.
      </p>
    </Section>
  );
}

/**
 * Google's four-colour G, drawn rather than imported.
 *
 * `fill` attributes, not Tailwind classes: these are Google's brand values and they must not
 * change with our theme, which is exactly what a token would do. They are also the one place in
 * this codebase where a literal colour is correct — DS006 bans arbitrary hex in classNames
 * because it means somebody skipped the palette; here the palette is not ours to use.
 */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Google">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

type GoogleReview = (typeof GOOGLE_BUSINESS_REVIEWS)[number];

function ReviewCard({ review, copy = false }: { review: GoogleReview; copy?: boolean }) {
  return (
    <li lang={review.language} aria-hidden={copy || undefined} data-review-copy={copy || undefined}>
      <a
        href={GOOGLE_PROFILE.url}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={copy ? -1 : undefined}
        lang="fr"
        aria-label={`Lire l’avis de ${review.author} sur Google`}
        className="group flex h-full flex-col rounded-xl border border-hairline bg-elevated p-3 transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Gold, not `text-ok` green. This section's whole function is borrowed authority from
              Google — it carries Google's four-colour mark two lines up — and Google renders its
              own rating stars gold. Green is this site's trust colour, but on a card claiming to
              quote Google it reads as "not actually Google". Matches `StarRating.tsx` and the
              header rating above. Reverting is this one token. */}
          <div className="flex items-center gap-0.5 text-amber-400" aria-label="5 étoiles sur 5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-3.5 w-3.5 fill-current" strokeWidth={1.5} aria-hidden="true" />
            ))}
          </div>
          <GoogleMark className="h-4 w-4 shrink-0" />
        </div>
        <blockquote lang={review.language} dir="auto" className="mt-2 flex-1 text-sm leading-snug text-ink-1">
          “{review.excerpt}”
        </blockquote>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink-1">{review.author}</p>
            <p className="mt-0.5 text-xs text-ink-3">{review.dateLabel}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 group-hover:text-brand" aria-hidden="true" />
        </div>
      </a>
    </li>
  );
}
