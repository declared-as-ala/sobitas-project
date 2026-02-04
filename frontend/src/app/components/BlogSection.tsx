'use client';

import Link from 'next/link';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/app/components/ui/carousel';
import { getStorageUrl } from '@/services/api';
import type { Article } from '@/types';

interface BlogSectionProps {
  articles: Article[];
}

export function BlogSection({ articles }: BlogSectionProps) {
  if (!articles || articles.length === 0) return null;

  // Show all articles in the carousel, not just 4
  const displayArticles = articles;

  return (
    <section className="py-8 sm:py-10 bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-8 gap-4">
          <div className="text-center md:text-left">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2"
            >
              Nos Derniers Articles
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl"
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

        {/* Carousel Container */}
        <div className="relative">
          <Carousel
            opts={{
              align: 'start',
              loop: false,
              slidesToScroll: 1,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {displayArticles.map((article, index) => (
                <CarouselItem
                  key={article.id}
                  className="pl-2 md:pl-4 basis-full md:basis-[40%] lg:basis-[38%]"
                >
                  <motion.article
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="group bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-red-900/10 transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100 dark:border-gray-700/50"
                  >
                    <LinkWithLoading 
                      href={`/blog/${article.slug}`} 
                      className="relative block aspect-[4/3] overflow-hidden"
                      loadingMessage={`Chargement de ${article.designation_fr}...`}
                    >
                      <Image
                        src={article.cover ? getStorageUrl(article.cover) : '/assets/img/placeholder.webp'}
                        alt={article.designation_fr}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </LinkWithLoading>

                    <div className="p-2 sm:p-3 flex flex-col flex-grow">
                      <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
                        <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {article.created_at ? new Date(article.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : 'Récent'}
                      </div>

                      <h3 className="text-xs sm:text-base font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        <LinkWithLoading 
                          href={`/blog/${article.slug}`}
                          loadingMessage={`Chargement de ${article.designation_fr}...`}
                        >
                          {article.designation_fr}
                        </LinkWithLoading>
                      </h3>

                      <div
                        className="text-gray-600 dark:text-gray-300 text-[11px] sm:text-xs line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-3 flex-grow prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: article.description_fr || article.description || 'Découvrez cet article intéressant sur la nutrition et le sport.'
                        }}
                      />

                      <LinkWithLoading
                        href={`/blog/${article.slug}`}
                        className="inline-flex items-center text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors mt-auto group/link"
                        loadingMessage={`Chargement de ${article.designation_fr}...`}
                      >
                        Lire la suite
                        <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1 transform group-hover/link:translate-x-1 transition-transform" />
                      </LinkWithLoading>
                    </div>
                  </motion.article>
                </CarouselItem>
              ))}
            </CarouselContent>
            {displayArticles.length > 1 && (
              <>
                <CarouselPrevious className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 md:h-10 md:w-10 bg-white dark:bg-gray-800 shadow-lg hover:bg-red-600 hover:text-white dark:hover:bg-red-600 border-2 border-gray-200 dark:border-gray-700 hover:border-red-600 dark:hover:border-red-600 transition-all" />
                <CarouselNext className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 md:h-10 md:w-10 bg-white dark:bg-gray-800 shadow-lg hover:bg-red-600 hover:text-white dark:hover:bg-red-600 border-2 border-gray-200 dark:border-gray-700 hover:border-red-600 dark:hover:border-red-600 transition-all" />
              </>
            )}
          </Carousel>
        </div>

        <div className="mt-4 sm:mt-6 text-center md:hidden">
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
