import Image from 'next/image';
import Link from 'next/link';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { getStorageUrl } from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, ArrowLeft, Clock, ChevronRight, Home } from 'lucide-react';
import type { Page } from '@/types';

interface PageContentClientProps {
  page: Page & {
    excerpt?: string | null;
    body?: string | null;
    image?: string | null;
    meta_description?: string | null;
    meta_keywords?: string | null;
    status?: string;
    created_at?: string;
    updated_at?: string;
  };
}

export function PageContentClient({ page }: PageContentClientProps) {
  const hasContent = page.body || page.excerpt;
  const imageUrl = page.image ? getStorageUrl(page.image) : null;
  // Does the admin-authored body open with its own <h1>? If so this template must not add a
  // second one — see the note on the title element below.
  const bodyHasOwnH1 = /<h1[\s>]/i.test(String(page.body ?? ''));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* ── Hero Section ── */}
      <section className="relative bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        {/* Cover image banner */}
        {imageUrl && (
          <div className="relative w-full h-40 sm:h-56 md:h-72 lg:h-80 overflow-hidden">
            <Image
              src={imageUrl}
              alt={page.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
              quality={85}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
          </div>
        )}

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-14 sm:pb-16">
          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-7 flex-wrap"
            aria-label="Fil d'Ariane"
          >
            <Link href="/" className="flex items-center gap-1 transition-colors hover:text-red-600 dark:hover:text-red-400 font-medium">
              <Home className="h-3 w-3" />
              Accueil
            </Link>
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-gray-900 dark:text-white font-semibold truncate max-w-[200px] sm:max-w-none">{page.title}</span>
          </nav>

          {/* Red eyebrow label */}
          <span className="inline-flex items-center gap-2 mb-3 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400">
            <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
            Page
          </span>

          {/* Title.
              Rendered as <h1> ONLY when the CMS body has no <h1> of its own. Several pages are
              long-form guides whose body opens with its own heading, so this template emitted a
              SECOND h1 — /proteine-tunisie, the page that should own the "protéine tunisie" query,
              was shipping:
                 h1: "Proteine Tunisie"                                        (this element)
                 h1: "Protéine Tunisie : Guide complet pour bien choisir…"     (the body)
              Two h1s split the topical signal, and the weaker, unaccented one came first. When the
              author has written a heading, theirs is the better one and this becomes a <p> that
              keeps the visual design identical. */}
          {bodyHasOwnH1 ? (
            <p
              className="font-display uppercase tracking-tight leading-[0.95] font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-5 text-gray-900 dark:text-white"
              aria-hidden="true"
            >
              {page.title}
            </p>
          ) : (
            <h1 className="font-display uppercase tracking-tight leading-[0.95] font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-5 text-gray-900 dark:text-white">
              {page.title}
            </h1>
          )}

          {/* Excerpt */}
          {page.excerpt && (
            <p
              className="text-gray-600 dark:text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mb-5"
              dangerouslySetInnerHTML={{ __html: page.excerpt.replace(/<[^>]*>/g, '') }}
            />
          )}

          {/* Date badge */}
          {page.updated_at && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
              <Calendar className="h-3.5 w-3.5 text-red-600 dark:text-red-400 flex-shrink-0" strokeWidth={1.75} />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Mis à jour le{' '}
                <span className="text-gray-700 dark:text-gray-300 font-semibold">
                  {format(new Date(page.updated_at), 'd MMMM yyyy', { locale: fr })}
                </span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Content Section ── */}
      <main className="relative bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
          {hasContent ? (
            <article>
              {/* Prose content — flat, one-accent red */}
              <div
                className="
                  prose prose-base sm:prose-lg max-w-none dark:prose-invert
                  prose-headings:font-display prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white
                  prose-h1:text-2xl sm:prose-h1:text-3xl md:prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-10 prose-h1:pb-4 prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-800 [&>h1:first-child]:hidden
                  prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-gray-900 dark:prose-h2:text-white
                  prose-h3:text-lg sm:prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-gray-900 dark:prose-h3:text-white
                  prose-h4:text-base prose-h4:mt-6 prose-h4:mb-2 prose-h4:text-gray-800 dark:prose-h4:text-gray-100
                  prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-7 sm:prose-p:leading-8 prose-p:mb-5
                  prose-a:text-red-600 dark:prose-a:text-red-400 prose-a:font-semibold prose-a:no-underline hover:prose-a:text-red-700 hover:prose-a:underline prose-a:transition-colors
                  prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold
                  prose-em:text-gray-700 dark:prose-em:text-gray-300 prose-em:italic
                  prose-ul:text-gray-600 dark:prose-ul:text-gray-400 prose-ul:my-5 prose-ul:space-y-1.5
                  prose-ol:text-gray-600 dark:prose-ol:text-gray-400 prose-ol:my-5 prose-ol:space-y-1.5
                  prose-li:text-gray-600 dark:prose-li:text-gray-400 prose-li:leading-7
                  prose-blockquote:border-l-4 prose-blockquote:border-red-500 prose-blockquote:pl-5 prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400 prose-blockquote:bg-red-50 dark:prose-blockquote:bg-red-950/20 prose-blockquote:py-3 prose-blockquote:pr-4 prose-blockquote:rounded-r-xl prose-blockquote:my-8 prose-blockquote:not-italic
                  prose-code:bg-red-50 dark:prose-code:bg-red-950/30 prose-code:text-red-700 dark:prose-code:text-red-400 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:border prose-code:border-red-100 dark:prose-code:border-red-900/40
                  prose-pre:bg-gray-900 prose-pre:rounded-xl prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-800
                  prose-img:rounded-xl prose-img:shadow-sm prose-img:my-8 prose-img:border prose-img:border-gray-100 dark:prose-img:border-gray-800
                  prose-hr:border-gray-200 dark:prose-hr:border-gray-800 prose-hr:my-10
                  prose-table:text-gray-600 dark:prose-table:text-gray-400 prose-table:border-collapse prose-table:text-sm
                  prose-thead:bg-gray-50 dark:prose-thead:bg-gray-900
                  prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-bold prose-th:text-gray-700 dark:prose-th:text-gray-200 prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-800
                  prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-gray-100 dark:prose-td:border-gray-800
                  [&>h2]:flex [&>h2]:items-center [&>h2]:gap-3 [&>h2]:before:content-[''] [&>h2]:before:block [&>h2]:before:w-1 [&>h2]:before:h-5 [&>h2]:before:bg-red-600 [&>h2]:before:rounded-full [&>h2]:before:flex-shrink-0
                  [&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto [&_pre]:overflow-x-auto
                "
                dangerouslySetInnerHTML={{ __html: page.body || page.excerpt || '' }}
              />
            </article>
          ) : (
            <div className="text-center py-20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-5">
                <Clock className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">
                Le contenu de cette page sera bientôt disponible.
              </p>
            </div>
          )}

          {/* Back button */}
          <div className="mt-12 sm:mt-16 pt-8 border-t border-gray-100 dark:border-gray-800">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </main>

      <ScrollToTop />
    </div>
  );
}
