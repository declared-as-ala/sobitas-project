'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { motion } from 'motion/react';
import type { Article } from '@/types';
import { getStorageUrl } from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BlogPageClientProps {
  articles: Article[];
}

const ARTICLES_PER_PAGE = 9;
const WORDS_PER_MINUTE = 200;

// Category slugs for filtering (keyword-based; backend has no category field)
const BLOG_CATEGORIES = [
  { id: 'all', label: 'Tous les articles' },
  { id: 'complements', label: 'Compléments', keywords: ['complément', 'compléments', 'whey', 'créatine', 'protéine', 'supplément'] },
  { id: 'lifestyle', label: 'Lifestyle', keywords: ['salle', 'sport', 'entraînement', 'fitness', 'objectif'] },
  { id: 'nutrition', label: 'Nutrition', keywords: ['nutrition', 'régime', 'alimentaire', 'protéines', 'keto', 'masse', 'perte de poids'] },
  { id: 'recettes', label: 'Recettes', keywords: ['recette', 'recettes'] },
  { id: 'sport', label: 'Sport', keywords: ['sport', 'musculation', 'performance', 'athlète', 'bodybuilding'] },
];

// Decode HTML entities properly
function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  // Use browser's built-in decoder
  if (typeof window !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }
  // Fallback for server-side: decode common entities
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&egrave;/g, 'è')
    .replace(/&Egrave;/g, 'È')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&Ecirc;/g, 'Ê')
    .replace(/&euml;/g, 'ë')
    .replace(/&Euml;/g, 'Ë')
    .replace(/&agrave;/g, 'à')
    .replace(/&Agrave;/g, 'À')
    .replace(/&acirc;/g, 'â')
    .replace(/&Acirc;/g, 'Â')
    .replace(/&auml;/g, 'ä')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&Ocirc;/g, 'Ô')
    .replace(/&ouml;/g, 'ö')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&Ugrave;/g, 'Ù')
    .replace(/&ucirc;/g, 'û')
    .replace(/&Ucirc;/g, 'Û')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&iacute;/g, 'í')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&iuml;/g, 'ï')
    .replace(/&Iuml;/g, 'Ï');
}

function stripHtml(html: string): string {
  if (!html) return '';
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return decodeHtmlEntities(text);
}

function getExcerpt(article: Article, maxLength: number = 140): string {
  const raw = article.description || article.description_fr || '';
  const text = stripHtml(raw);
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

function getReadingTimeMinutes(article: Article): number {
  const raw = article.description || article.description_fr || '';
  const text = stripHtml(raw);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function articleMatchesCategory(article: Article, categoryId: string): boolean {
  if (categoryId === 'all') return true;
  const cat = BLOG_CATEGORIES.find(c => c.id === categoryId);
  if (!cat?.keywords?.length) return true;
  const searchText = [
    article.designation_fr || '',
    stripHtml(article.description || ''),
    stripHtml(article.description_fr || ''),
  ].join(' ').toLowerCase();
  return cat.keywords.some(kw => searchText.includes(kw.toLowerCase()));
}

export function BlogPageClient({ articles }: BlogPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(() => {
    // Read from URL on initial mount
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const page = urlParams.get('page');
      return page ? parseInt(page, 10) : 1;
    }
    return 1;
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const isUserAction = useRef(false);

  // Filter by category (keyword-based)
  const filteredArticles = useMemo(() => {
    return articles.filter(a => articleMatchesCategory(a, activeCategory));
  }, [articles, activeCategory]);

  // Sort by date (latest first)
  const sortedArticles = useMemo(() => {
    return [...filteredArticles].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredArticles]);

  const totalPages = Math.max(1, Math.ceil(sortedArticles.length / ARTICLES_PER_PAGE));
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;
  const paginatedArticles = useMemo(
    () => sortedArticles.slice(startIndex, endIndex),
    [sortedArticles, startIndex, endIndex]
  );

  // Sync currentPage from URL params (on refresh or URL change)
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
    
    // Only sync from URL if it's a valid page
    // Skip if this was triggered by a user action
    if (!isUserAction.current && !isNaN(urlPage) && urlPage >= 1 && urlPage <= totalPages) {
      setCurrentPage(prevPage => {
        // Only update if different to avoid unnecessary re-renders
        return urlPage !== prevPage ? urlPage : prevPage;
      });
    }
    // Reset the flag after processing
    isUserAction.current = false;
  }, [searchParams, totalPages]);

  // Reset to page 1 when category changes
  useEffect(() => {
    setCurrentPage(1);
    isUserAction.current = true; // Mark as user action to prevent URL sync effect from interfering
  }, [activeCategory]);

  // Update URL when currentPage changes from user interaction
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
    
    // Only update URL if it doesn't match currentPage
    if (currentPage !== urlPage) {
      isUserAction.current = true;
      const params = new URLSearchParams(searchParams.toString());
      if (currentPage === 1) {
        params.delete('page');
      } else {
        params.set('page', currentPage.toString());
      }
      const newUrl = params.toString() ? `/blog?${params.toString()}` : '/blog';
      router.replace(newUrl, { scroll: false });
    }
  }, [currentPage, router, searchParams]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      isUserAction.current = true;
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-6 sm:py-10 lg:py-14">
        {/* Hero title – centered, GreenFacts-style */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">
            Blog
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-8">
            Conseils, guides et actualités nutrition sportive & compléments alimentaires
          </p>

          {/* Category tabs – horizontal, centered */}
          <nav className="flex flex-wrap justify-center gap-2 md:gap-3" aria-label="Catégories du blog">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </nav>
        </motion.div>

        {sortedArticles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">Aucun article dans cette catégorie.</p>
          </div>
        ) : (
          <>
            {/* 1 col on mobile, 2 on tablet, 3 on desktop – responsive cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-7 lg:gap-8 xl:gap-9 mb-8 sm:mb-12">
              {paginatedArticles.map((article, index) => {
                const articleDate = article.created_at ? new Date(article.created_at) : new Date();
                const excerpt = getExcerpt(article);
                const readingMin = getReadingTimeMinutes(article);
                return (
                  <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <Link href={`/blog/${article.slug}`} className="block h-full">
                      <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-2xl hover:border-red-500/40 dark:hover:border-red-500/40 transition-all duration-300 h-full flex flex-col group-hover:-translate-y-1">
                        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800 min-h-[200px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px]">
                          {article.cover ? (
                            <Image
                              src={getStorageUrl(article.cover)}
                              alt={article.designation_fr}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-800" />
                          )}
                        </div>
                        <div className="p-4 sm:p-5 md:p-6 lg:p-7 flex flex-col flex-1 min-w-0">
                          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4 line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors leading-tight">
                            {decodeHtmlEntities(article.designation_fr || '')}
                          </h2>
                          {excerpt && (
                            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-4 md:mb-5 flex-1">
                              {excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-3 sm:gap-4 md:gap-5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-auto flex-wrap">
                            <span className="flex items-center gap-1.5 sm:gap-2">
                              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                              {format(articleDate, 'd MMM yyyy', { locale: fr })}
                            </span>
                            <span className="flex items-center gap-1.5 sm:gap-2">
                              <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                              {readingMin} min
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                );
              })}
            </div>

            {/* Compact pagination – "← 1/37 →" style */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[4rem] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
