'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft, Calendar, ArrowRight } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { motion } from 'motion/react';
import type { Article } from '@/types';
import { getStorageUrl } from '@/services/api';
import { format } from 'date-fns';

interface ArticleDetailClientProps {
  article: Article;
  relatedArticles: Article[];
}

export function ArticleDetailClient({ article, relatedArticles }: ArticleDetailClientProps) {
  const router = useRouter();
  const articleDate = article.created_at ? new Date(article.created_at) : new Date();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au blog
          </Button>

          <article>
            <header className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                {article.designation_fr}
              </h1>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(articleDate, 'dd MMMM yyyy')}</span>
                </div>
              </div>
            </header>

            {article.cover && (
              <div className="relative h-96 mb-8 rounded-2xl overflow-hidden">
                <Image
                  src={getStorageUrl(article.cover)}
                  alt={article.designation_fr}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 896px"
                  priority
                />
              </div>
            )}

            <div 
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: article.description_fr || '' }}
            />
          </article>

          {relatedArticles.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
              <h2 className="text-2xl font-bold mb-6">Articles similaires</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <Link key={related.id} href={`/blog/${related.slug}`}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                    >
                      {related.cover && (
                        <div className="relative h-40 overflow-hidden">
                          <Image
                            src={getStorageUrl(related.cover)}
                            alt={related.designation_fr}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {related.designation_fr}
                        </h3>
                        <Button variant="ghost" size="sm" className="w-full">
                          Lire la suite
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
