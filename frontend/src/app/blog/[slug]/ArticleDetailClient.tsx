'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft, Calendar, Clock, ArrowRight, Share2 } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { motion } from 'motion/react';
import type { Article } from '@/types';
import { getStorageUrl } from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';

interface ArticleDetailClientProps {
  article: Article;
  relatedArticles: Article[];
}

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

// Calculate reading time based on content
function calculateReadingTime(content: string): number {
  if (!content) return 1;
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function ArticleDetailClient({ article, relatedArticles }: ArticleDetailClientProps) {
  const router = useRouter();
  const articleDate = article.created_at ? new Date(article.created_at) : new Date();
  const content = article.description_fr || article.description || '';
  const readingTime = useMemo(() => calculateReadingTime(content), [content]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.designation_fr,
        text: article.description_fr || '',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papiers !');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 sm:mb-6 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au blog
          </Button>

          <article className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
            {/* Article Header */}
            <header className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight">
                {decodeHtmlEntities(article.designation_fr || '')}
              </h1>
              
              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{format(articleDate, 'd MMMM yyyy', { locale: fr })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{readingTime} min de lecture</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="ml-auto text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Partager
                </Button>
              </div>
            </header>

            {/* Cover Image */}
            {article.cover && (
              <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 mb-6 sm:mb-8 overflow-hidden">
                <Image
                  src={getStorageUrl(article.cover, article.updated_at || article.created_at)}
                  alt={article.designation_fr}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 896px"
                  priority
                  unoptimized
                />
              </div>
            )}

            {/* Article Content */}
            <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
              <div 
                className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none
                  prose-headings:text-gray-900 dark:prose-headings:text-white
                  prose-p:text-gray-700 dark:prose-p:text-gray-300
                  prose-a:text-red-600 dark:prose-a:text-red-400
                  prose-strong:text-gray-900 dark:prose-strong:text-white
                  prose-ul:text-gray-700 dark:prose-ul:text-gray-300
                  prose-ol:text-gray-700 dark:prose-ol:text-gray-300
                  prose-li:text-gray-700 dark:prose-li:text-gray-300
                  prose-img:rounded-lg prose-img:shadow-md
                  prose-blockquote:border-l-red-600 dark:prose-blockquote:border-l-red-400
                  prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
                  prose-code:text-red-600 dark:prose-code:text-red-400
                  prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800"
                dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(content) }}
              />
            </div>
          </article>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-8 sm:mt-12 lg:mt-16 pt-8 sm:pt-12 border-t border-gray-200 dark:border-gray-800">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">
                Articles similaires
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {relatedArticles.map((related) => (
                  <Link key={related.id} href={`/blog/${related.slug}`}>
                    <motion.article
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                      className="group bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-red-900/10 transition-all duration-300 overflow-hidden h-full flex flex-col border border-gray-100 dark:border-gray-700/50"
                    >
                      {related.cover && (
                        <div className="relative h-40 sm:h-48 overflow-hidden">
                          <Image
                            src={getStorageUrl(related.cover, related.updated_at || related.created_at)}
                            alt={related.designation_fr}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      )}
                      <div className="p-4 sm:p-5 flex flex-col flex-grow">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          {related.created_at ? format(new Date(related.created_at), 'd MMM yyyy', { locale: fr }) : 'Récent'}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors flex-grow">
                          {decodeHtmlEntities(related.designation_fr || '')}
                        </h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 justify-start"
                        >
                          Lire la suite
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </motion.article>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog Button */}
          <div className="mt-8 sm:mt-12 text-center">
            <Button
              variant="outline"
              onClick={() => router.push('/blog')}
              className="rounded-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-500 dark:hover:bg-red-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voir tous les articles
            </Button>
          </div>
        </motion.div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
