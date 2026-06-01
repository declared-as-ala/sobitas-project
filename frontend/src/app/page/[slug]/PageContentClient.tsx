'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { getStorageUrl } from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, ArrowLeft, Clock, ChevronRight } from 'lucide-react';
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
    <div className="min-h-screen bg-[#080808] text-white">
      <Header />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Dark gold layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0900] via-[#0a0a0a] to-[#080808]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(212,175,55,0.12),transparent)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />

        {/* Background image with overlay if present */}
        {imageUrl && (
          <>
            <div className="absolute inset-0">
              <Image
                src={imageUrl}
                alt={page.title}
                fill
                className="object-cover opacity-15"
                sizes="100vw"
                priority
                unoptimized
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/80 to-[#080808]/50" />
          </>
        )}

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-20">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-1.5 text-xs text-gray-500 mb-8"
            aria-label="Fil d'Ariane"
          >
            <Link href="/" className="hover:text-amber-400 transition-colors">Accueil</Link>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <span className="text-gray-400 truncate">{page.title}</span>
          </motion.nav>

          {/* Gold label */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex items-center gap-2 mb-5"
          >
            <div className="h-px w-8 bg-amber-500" />
            <span className="text-amber-500 text-[11px] font-bold uppercase tracking-[0.2em]">Page</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] mb-6 tracking-tight"
          >
            <span className="bg-gradient-to-br from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              {page.title}
            </span>
          </motion.h1>

          {/* Excerpt */}
          {page.excerpt && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl mb-6"
              dangerouslySetInnerHTML={{ __html: page.excerpt.replace(/<[^>]*>/g, '') }}
            />
          )}

          {/* Meta row */}
          {page.updated_at && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-4"
            >
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <Calendar className="h-3.5 w-3.5 text-amber-500/70" />
                <span>
                  Mis à jour le{' '}
                  <span className="text-gray-400 font-medium">
                    {format(new Date(page.updated_at), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Content Section ── */}
      <main className="relative bg-[#080808]">
        {/* Subtle top separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {hasContent ? (
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              {/* Featured image (large, inside content area) */}
              {imageUrl && (
                <div className="relative w-full aspect-[16/7] mb-12 rounded-2xl overflow-hidden border border-white/5">
                  <Image
                    src={imageUrl}
                    alt={page.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 896px"
                    priority
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080808]/30 to-transparent" />
                </div>
              )}

              {/* Prose content — gold-accented typography on dark */}
              <div
                className="
                  prose prose-invert max-w-none
                  prose-headings:font-black prose-headings:tracking-tight
                  prose-h1:text-4xl prose-h1:text-white prose-h1:mt-14 prose-h1:mb-6 prose-h1:pb-4 prose-h1:border-b prose-h1:border-amber-500/20 first:prose-h1:hidden
                  prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:text-white prose-h2:mt-12 prose-h2:mb-5
                  prose-h3:text-xl sm:prose-h3:text-2xl prose-h3:text-gray-100 prose-h3:mt-10 prose-h3:mb-4
                  prose-h4:text-lg prose-h4:text-gray-200 prose-h4:mt-8 prose-h4:mb-3
                  prose-p:text-gray-400 prose-p:leading-8 prose-p:text-base sm:prose-p:text-lg prose-p:mb-6
                  prose-a:text-amber-400 prose-a:font-semibold prose-a:no-underline hover:prose-a:text-amber-300 hover:prose-a:underline prose-a:transition-colors
                  prose-strong:text-white prose-strong:font-bold
                  prose-em:text-gray-300 prose-em:italic
                  prose-ul:text-gray-400 prose-ul:space-y-2 prose-ul:my-6
                  prose-ol:text-gray-400 prose-ol:space-y-2 prose-ol:my-6
                  prose-li:text-gray-400 prose-li:leading-7
                  prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:pl-5 prose-blockquote:italic prose-blockquote:text-gray-400 prose-blockquote:bg-amber-500/5 prose-blockquote:py-3 prose-blockquote:pr-4 prose-blockquote:rounded-r-lg prose-blockquote:my-8
                  prose-code:bg-white/5 prose-code:text-amber-400 prose-code:px-2 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                  prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
                  prose-img:rounded-2xl prose-img:shadow-2xl prose-img:my-10 prose-img:border prose-img:border-white/5
                  prose-hr:border-white/10 prose-hr:my-12
                  prose-table:text-gray-400 prose-table:border-collapse
                  prose-thead:bg-white/5 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-bold prose-th:text-white prose-th:border prose-th:border-white/10
                  prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-white/5
                  [&>h2]:flex [&>h2]:items-center [&>h2]:gap-3 [&>h2]:before:content-[''] [&>h2]:before:block [&>h2]:before:w-1 [&>h2]:before:h-6 [&>h2]:before:bg-amber-500 [&>h2]:before:rounded-full [&>h2]:before:flex-shrink-0
                "
                dangerouslySetInnerHTML={{ __html: page.body || page.excerpt || '' }}
              />
            </motion.article>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 rounded-3xl border border-white/5 bg-white/[0.02]"
            >
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                <Clock className="h-8 w-8 text-amber-400/60" />
              </div>
              <p className="text-gray-500 text-lg">
                Le contenu de cette page sera bientôt disponible.
              </p>
            </motion.div>
          )}

          {/* Back button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-14 pt-8 border-t border-white/5"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-amber-400 transition-colors group"
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
