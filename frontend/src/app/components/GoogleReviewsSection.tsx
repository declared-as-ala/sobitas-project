import { ArrowUpRight, BadgeCheck, Star } from 'lucide-react';
import { GOOGLE_BUSINESS_REVIEWS } from '@/content/googleBusinessReviews';
import { GOOGLE_PROFILE } from '@/util/company';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';

type GoogleReviewsSectionProps = {
  surface?: 'base' | 'sunken';
  /** The About page uses a slightly more explicit title than the homepage. */
  context?: 'home' | 'about';
};

/**
 * Visible, attributable social proof from Google — never review rich-result markup.
 *
 * On phones the testimonials form a CSS-only snap rail. That keeps the proof compact without a
 * carousel dependency, hidden slides or auto-motion. At `sm` they become a stable three-column
 * grid. The summary remains visible at every width and owns the single external CTA.
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
        <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-4 p-4 sm:p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <BadgeCheck className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <strong className="font-display font-compressed text-[2rem] font-extrabold leading-none tabular-nums text-ink-1">
                  {rating}/5
                </strong>
                <span className="text-sm font-semibold text-ink-2">sur Google</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-rating" aria-label="5 étoiles sur 5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" strokeWidth={1.5} aria-hidden="true" />
                ))}
                <span className="ml-2 text-xs font-medium text-ink-3">
                  {GOOGLE_PROFILE.reviewCountLabel} avis publics
                </span>
              </div>
            </div>
          </div>

          <a
            href={GOOGLE_PROFILE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-[52px] items-center justify-between gap-3 border-t border-rule px-4 text-sm font-semibold text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus sm:min-h-[88px] sm:border-l sm:border-t-0 sm:px-6"
          >
            Voir les avis sur Google
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>

      <div className="-mx-4 grid snap-x snap-mandatory auto-cols-[minmax(16.5rem,84vw)] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {GOOGLE_BUSINESS_REVIEWS.map((review) => (
          <blockquote
            key={review.author}
            className="flex min-h-[12.5rem] snap-start flex-col rounded-2xl border border-hairline bg-elevated p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-0.5 text-rating" aria-label="5 étoiles sur 5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-3.5 w-3.5 fill-current" strokeWidth={1.5} aria-hidden="true" />
                ))}
              </div>
              <span className="rounded-full border border-hairline bg-sunken px-2.5 py-1 text-[11px] font-semibold text-ink-3">
                Avis Google
              </span>
            </div>
            <p lang={review.language} className="mt-5 flex-1 text-base font-medium leading-relaxed text-ink-1">
              “{review.excerpt}”
            </p>
            <footer className="mt-5 border-t border-rule pt-3">
              <cite className="not-italic text-sm font-semibold text-ink-1">{review.author}</cite>
              <span className="ml-2 text-xs text-ink-3">· {review.dateLabel}</span>
            </footer>
          </blockquote>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        Extraits de notre profil public Google Maps, vérifiés le 31 août 2026. Avis affichés dans leur langue d’origine.
      </p>
    </Section>
  );
}
