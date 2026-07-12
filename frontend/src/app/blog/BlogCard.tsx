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
}

/**
 * The single canonical blog article card. Used by the index listing, related-articles rail,
 * and the category/tag pages so every blog surface shares one anatomy: 4:3 cover (Newspaper
 * fallback), line-clamped title, date + optional reading-time meta, and a "Lire la suite" link.
 */
export function BlogCard({ article, priority = false, excerpt, readingMinutes, titleAs = 'h2' }: BlogCardProps) {
  const Title = titleAs;
  const date = article.created_at ? new Date(article.created_at) : null;
  const title = decodeHtmlEntities(article.designation_fr || '');

  return (
    <article className="group h-full">
      <Link
        href={blogHref(article.slug)}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-800">
          {article.cover ? (
            <SafeImage
              src={getStorageUrl(article.cover, article.updated_at || article.created_at)}
              alt={title || 'Article'}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
              <Newspaper className="h-10 w-10 text-gray-300 dark:text-gray-700" strokeWidth={1.5} aria-hidden="true" />
            </div>
          )}
          {/* Floating date pill (magazine style) — moves the date onto the cover, freeing the footer */}
          {date && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow-sm backdrop-blur-sm dark:bg-gray-950/80 dark:text-gray-100">
              <Calendar className="h-3 w-3 text-red-600 dark:text-red-400" strokeWidth={2} aria-hidden="true" />
              {format(date, 'd MMM yyyy', { locale: fr })}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <Title className="mb-2 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-gray-900 transition-colors group-hover:text-red-600 dark:text-white dark:group-hover:text-red-400">
            {title}
          </Title>
          {excerpt && (
            <p className="mb-5 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {excerpt}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3.5 dark:border-gray-800">
            {typeof readingMinutes === 'number' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {readingMinutes} min de lecture
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
              Lire l'article
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
