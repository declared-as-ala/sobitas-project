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
        className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300 hover:shadow-xl"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
          {article.cover ? (
            <SafeImage
              src={getStorageUrl(article.cover, article.updated_at || article.created_at)}
              alt={title || 'Article'}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
              <Newspaper className="h-10 w-10 text-gray-300 dark:text-gray-700" strokeWidth={1.5} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <Title className="mb-2 line-clamp-2 text-base sm:text-lg font-bold leading-snug text-gray-900 dark:text-white transition-colors group-hover:text-red-600 dark:group-hover:text-red-400">
            {title}
          </Title>
          {excerpt && (
            <p className="mb-4 line-clamp-2 sm:line-clamp-3 flex-1 text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400">
              {excerpt}
            </p>
          )}
          <div className="mt-auto flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {date ? format(date, 'd MMM yyyy', { locale: fr }) : 'Récent'}
              </span>
              {typeof readingMinutes === 'number' && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  {readingMinutes} min
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
              Lire la suite
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
