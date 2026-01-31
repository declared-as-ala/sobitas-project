'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import type { Article } from '@/types';
import { getStorageUrl } from '@/services/api';
import { format } from 'date-fns';

interface BlogSectionProps {
  articles?: Article[];
}

export function BlogSection({ articles = [] }: BlogSectionProps) {
  return (
    <section id="blog" className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Blog & Conseils
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Découvrez nos articles et guides pour optimiser vos performances
          </motion.p>
        </div>

        {/* Blog Grid */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {articles.map((article, index) => {
              const articleDate = article.created_at ? new Date(article.created_at) : new Date();
              return (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300"
                >
                  <Link href={`/blog/${article.slug}`}>
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-200 dark:bg-gray-700">
                      {article.cover ? (
                        <Image
                          src={getStorageUrl(article.cover)}
                          alt={article.designation_fr}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-800" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <Calendar className="h-4 w-4" />
                        <span>{format(articleDate, 'd MMMM yyyy')}</span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors line-clamp-2">
                        {article.designation_fr}
                      </h3>
                      
                      {article.description_fr && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                          {article.description_fr}
                        </p>
                      )}

                      <Button
                        variant="ghost"
                        className="p-0 h-auto text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 group/btn"
                        asChild
                      >
                        <span>
                          Lire plus
                          <ArrowRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform inline-block" />
                        </span>
                      </Button>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            Aucun article disponible
          </div>
        )}
      </div>
    </section>
  );
}
