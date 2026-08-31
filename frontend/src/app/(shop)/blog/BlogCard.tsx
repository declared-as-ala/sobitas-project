import Link from 'next/link';
import { Calendar, Clock, ArrowRight, Newspaper } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Article } from '@/types';
import { SafeImage } from '@/app/components/SafeImage';
import { getStorageUrl } from '@/services/api';
import { blogHref } from '@/util/blogSlug';
import { decodeHtmlEntities } from '@/util/htmlEntities';

interface BlogCardProps {
  article: Article;
  /** Prioritize the cover image (above-the-fold cards only). */
  priority?: boolean;
  /** Pre-computed excerpt — index listing only (avoids re-parsing full bodies here). */
  excerpt?: string;
  /** Pre-computed reading time in minutes — index listing only. */
  readingMinutes?: number;
  /** Heading level for the card title. Defaults to h2 (h3 inside a titled section). */
  titleAs?: 'h2' | 'h3';
  /** One article component, three editorial roles. */
  variant?: 'standard' | 'feature' | 'compact';
  /** Human topic label, computed once by the blog index. */
  eyebrow?: string;
}

/**
 * The single canonical blog article card. Used by the index listing, related-articles rail,
 * and the category/tag pages so every blog surface shares one anatomy: 4:3 cover (Newspaper
 * fallback), line-clamped title, date + optional reading-time meta, and a "Lire la suite" link.
 */
export function BlogCard({
  article,
  priority = false,
  excerpt,
  readingMinutes,
  titleAs = 'h2',
  variant = 'standard',
  eyebrow,
}: BlogCardProps) {
  const Title = titleAs;
  const date = article.created_at ? new Date(article.created_at) : null;
  const title = decodeHtmlEntities(article.designation_fr || '');

  return (
    <article className="group h-full min-w-0">
      <Link
        href={blogHref(article.slug)}
        className={`h-full overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transform-none motion-reduce:transition-none ${
          variant === 'compact'
            ? 'grid grid-cols-[7.5rem_minmax(0,1fr)] sm:grid-cols-[9rem_minmax(0,1fr)]'
            : 'flex flex-col'
        }`}
      >
        <div
          className={`relative overflow-hidden bg-sunken ${
            variant === 'compact'
              ? 'h-full min-h-[10.5rem]'
              : variant === 'feature'
                ? 'aspect-[16/9] lg:aspect-[16/8.4]'
                : 'aspect-[16/10]'
          }`}
        >
          {article.cover ? (
            <SafeImage
              src={getStorageUrl(article.cover, article.updated_at || article.created_at)}
              alt={title || 'Article'}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
              sizes={
                variant === 'feature'
                  ? '(max-width: 1024px) 100vw, 66vw'
                  : variant === 'compact'
                    ? '(max-width: 640px) 35vw, 18vw'
                    : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
              }
              priority={priority}
              fallbackSrc="/images/blog/article-fallback.svg"
              retryOnError={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-sunken">
              <Newspaper className="h-10 w-10 text-ink-3/40" strokeWidth={1.5} aria-hidden="true" />
            </div>
          )}
          {/* Floating date pill (magazine style) — moves the date onto the cover, freeing the footer.
              Opaque chip rather than bg-white/90 + backdrop-blur-sm: `backdrop-blur` is banned
              (DESIGN_SYSTEM §9) and on a blog grid it was one compositing layer per card. At 90%
              opacity the blur was doing almost nothing anyway; solid reads more crisply. */}
          {date && variant !== 'compact' && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-elevated px-2.5 py-1 text-[11px] font-semibold text-ink-1 shadow-sm">
              <Calendar className="h-3 w-3 text-brand" strokeWidth={2} aria-hidden="true" />
              {format(date, 'd MMM yyyy', { locale: fr })}
            </span>
          )}
        </div>
        <div className={`flex min-w-0 flex-1 flex-col ${variant === 'compact' ? 'p-4' : 'p-4 sm:p-5'}`}>
          {eyebrow && (
            <span className="mb-2 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
              {eyebrow}
            </span>
          )}
          <Title
            className={`line-clamp-2 font-display font-bold leading-snug tracking-tight text-ink-1 transition-colors group-hover:text-brand ${
              variant === 'feature' ? 'mb-3 text-xl sm:text-2xl lg:text-[1.75rem]' : 'mb-2 text-base sm:text-lg'
            }`}
          >
            {title}
          </Title>
          {excerpt && variant !== 'compact' && (
            <p className={`mb-4 flex-1 text-sm leading-relaxed text-ink-2 ${variant === 'feature' ? 'line-clamp-3 max-w-3xl sm:text-base' : 'line-clamp-2'}`}>
              {excerpt}
            </p>
          )}
          <div className={`mt-auto flex items-center justify-between gap-3 border-t border-hairline ${variant === 'compact' ? 'pt-3' : 'pt-3.5'}`}>
            {typeof readingMinutes === 'number' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {readingMinutes} min de lecture
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <span className={`inline-flex shrink-0 items-center gap-1.5 font-semibold text-brand ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
              {variant === 'compact' ? 'Lire' : 'Lire le guide'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
