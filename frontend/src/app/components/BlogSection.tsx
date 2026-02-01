'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { getStorageUrl } from '@/services/api';
import type { Article } from '@/types';

interface BlogSectionProps {
  articles: Article[];
}

export function BlogSection({ articles }: BlogSectionProps) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="text-center md:text-left">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            >
              Nos Derniers Articles
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl"
            >
              Découvrez nos conseils d'experts en nutrition, entraînement et santé pour optimiser vos performances.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hidden md:block"
          >
            <Button asChild variant="outline" className="rounded-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-500 dark:hover:bg-red-500 group">
              <Link href="/blog" className="flex items-center gap-2">
                Voir tous les articles
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          {articles.slice(0, 4).map((article, index) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-red-900/10 transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100 dark:border-gray-700/50"
            >
              <Link href={`/blog/${article.slug}`} className="relative block aspect-[4/3] overflow-hidden">
                <Image
                  src={article.cover ? getStorageUrl(article.cover) : '/assets/img/placeholder.webp'}
                  alt={article.designation_fr}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>

              <div className="p-3 sm:p-5 flex flex-col flex-grow">
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {article.created_at ? new Date(article.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : 'Récent'}
                </div>

                <h3 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  <Link href={`/blog/${article.slug}`}>
                    {article.designation_fr}
                  </Link>
                </h3>

                <div
                  className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4 flex-grow prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: article.description_fr || article.description || 'Découvrez cet article intéressant sur la nutrition et le sport.'
                  }}
                />

                <Link
                  href={`/blog/${article.slug}`}
                  className="inline-flex items-center text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors mt-auto group/link"
                >
                  Lire la suite
                  <ArrowRight className="h-4 w-4 ml-1 transform group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button asChild variant="outline" className="w-full rounded-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white group">
            <Link href="/blog" className="flex items-center justify-center gap-2">
              Voir tous les articles
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
