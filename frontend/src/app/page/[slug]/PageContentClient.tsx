'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { getStorageUrl } from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, ArrowLeft, Clock, ChevronRight, Home } from 'lucide-react';
import { motion } from 'motion/react';
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-50 text-gray-900">
      <Header />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-50 dark:via-amber-50 dark:to-yellow-50 border-b border-amber-100">
        {/* Decorative background shapes */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-gradient-to-tr from-yellow-200/40 to-amber-100/30 blur-2xl" />

        {/* Gold top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />

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
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-900/10 to-amber-50/80" />
          </div>
        )}

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-14 sm:pb-16">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-1.5 text-xs text-gray-500 mb-7 flex-wrap"
            aria-label="Fil d'Ariane"
          >
            <Link href="/" className="flex items-center gap-1 hover:text-amber-600 transition-colors font-medium">
              <Home className="h-3 w-3" />
              Accueil
            </Link>
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-amber-700 font-semibold truncate max-w-[200px] sm:max-w-none">{page.title}</span>
          </motion.nav>

          {/* Gold eyebrow label */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-400/30 mb-5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
            <span className="text-amber-700 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em]">Page</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-[1.08] mb-4 sm:mb-5 tracking-tight text-gray-900"
          >
            <span className="bg-gradient-to-r from-gray-900 via-amber-900 to-orange-800 bg-clip-text text-transparent">
              {page.title}
            </span>
          </motion.h1>

          {/* Excerpt */}
          {page.excerpt && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mb-5"
              dangerouslySetInnerHTML={{ __html: page.excerpt.replace(/<[^>]*>/g, '') }}
            />
          )}

          {/* Date badge */}
          {page.updated_at && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-amber-200 shadow-sm"
            >
              <Calendar className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-gray-500">
                Mis à jour le{' '}
                <span className="text-gray-700 font-semibold">
                  {format(new Date(page.updated_at), 'd MMMM yyyy', { locale: fr })}
                </span>
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Content Section ── */}
      <main className="relative bg-white">
        {/* Top orange/gold accent strip */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-18">
          {hasContent ? (
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              {/* Prose content — white bg, orange/gold accents */}
              <div
                className="
                  prose prose-base sm:prose-lg max-w-none
                  prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-gray-900
                  prose-h1:text-2xl sm:prose-h1:text-3xl md:prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-10 prose-h1:pb-4 prose-h1:border-b-2 prose-h1:border-amber-200 [&>h1:first-child]:hidden
                  prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-gray-800
                  prose-h3:text-lg sm:prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-gray-800
                  prose-h4:text-base prose-h4:font-bold prose-h4:mt-6 prose-h4:mb-2 prose-h4:text-gray-700
                  prose-p:text-gray-600 prose-p:leading-7 sm:prose-p:leading-8 prose-p:mb-5
                  prose-a:text-amber-600 prose-a:font-semibold prose-a:no-underline hover:prose-a:text-orange-600 hover:prose-a:underline prose-a:transition-colors
                  prose-strong:text-gray-900 prose-strong:font-bold
                  prose-em:text-gray-700 prose-em:italic
                  prose-ul:text-gray-600 prose-ul:my-5 prose-ul:space-y-1.5
                  prose-ol:text-gray-600 prose-ol:my-5 prose-ol:space-y-1.5
                  prose-li:text-gray-600 prose-li:leading-7
                  prose-blockquote:border-l-4 prose-blockquote:border-amber-400 prose-blockquote:pl-5 prose-blockquote:italic prose-blockquote:text-gray-500 prose-blockquote:bg-amber-50 prose-blockquote:py-3 prose-blockquote:pr-4 prose-blockquote:rounded-r-xl prose-blockquote:my-8 prose-blockquote:not-italic
                  prose-code:bg-amber-50 prose-code:text-orange-700 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:border prose-code:border-amber-200
                  prose-pre:bg-gray-900 prose-pre:rounded-xl prose-pre:border prose-pre:border-gray-200
                  prose-img:rounded-2xl prose-img:shadow-lg prose-img:my-8 prose-img:border prose-img:border-gray-100
                  prose-hr:border-amber-100 prose-hr:my-10
                  prose-table:text-gray-600 prose-table:border-collapse prose-table:text-sm
                  prose-thead:bg-gradient-to-r prose-thead:from-amber-50 prose-thead:to-orange-50
                  prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-bold prose-th:text-gray-700 prose-th:border prose-th:border-amber-200
                  prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-gray-100
                  [&>h2]:flex [&>h2]:items-center [&>h2]:gap-3 [&>h2]:before:content-[''] [&>h2]:before:block [&>h2]:before:w-1 [&>h2]:before:h-5 [&>h2]:before:bg-gradient-to-b [&>h2]:before:from-amber-500 [&>h2]:before:to-orange-500 [&>h2]:before:rounded-full [&>h2]:before:flex-shrink-0
                "
                dangerouslySetInnerHTML={{ __html: page.body || page.excerpt || '' }}
              />
            </motion.article>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/50"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
                <Clock className="h-7 w-7 sm:h-8 sm:h-8 text-amber-500" />
              </div>
              <p className="text-gray-500 text-base sm:text-lg font-medium">
                Le contenu de cette page sera bientôt disponible.
              </p>
            </motion.div>
          )}

          {/* Back button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-12 sm:mt-16 pt-8 border-t border-amber-100"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Retour à l'accueil
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
