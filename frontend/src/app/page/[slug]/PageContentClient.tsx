'use client';

import Image from 'next/image';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { getStorageUrl } from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-8 sm:py-12 md:py-16 lg:py-20">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 md:mb-16 lg:mb-20">
          {page.image && (
            <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[500px] mb-6 sm:mb-8 md:mb-10 lg:mb-12 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-lg">
              <Image
                src={getStorageUrl(page.image)}
                alt={page.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, (max-width: 1400px) 85vw, 1600px"
                priority
              />
            </div>
          )}

          {/* Title - More impactful on desktop */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 md:mb-8 leading-tight">
            {page.title}
          </h1>

          {/* Meta Information */}
          {(page.created_at || page.updated_at) && (
            <div className="flex items-center gap-4 text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 md:mb-8">
              {page.updated_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>
                    Mis à jour le {format(new Date(page.updated_at), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Excerpt - Larger and more readable on desktop */}
          {page.excerpt && (
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-600 dark:text-gray-300 leading-relaxed mb-6 sm:mb-8 md:mb-10 lg:mb-12 max-w-4xl">
              {page.excerpt}
            </p>
          )}
        </div>

        {/* Content - Optimized for readability with max-width on very large screens */}
        {hasContent ? (
          <article className="prose prose-lg md:prose-xl lg:prose-2xl dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-red-600 dark:prose-a:text-red-400 prose-strong:text-gray-900 dark:prose-strong:text-white prose-headings:font-bold prose-p:leading-relaxed">
            <div
              className="text-gray-700 dark:text-gray-300 leading-relaxed text-base sm:text-lg md:text-xl lg:text-2xl max-w-5xl [&>p]:mb-4 md:[&>p]:mb-6 [&>h1]:text-3xl md:[&>h1]:text-4xl lg:[&>h1]:text-5xl [&>h1]:font-bold [&>h1]:mt-8 md:[&>h1]:mt-12 [&>h1]:mb-4 md:[&>h1]:mb-6 [&>h2]:text-2xl md:[&>h2]:text-3xl lg:[&>h2]:text-4xl [&>h2]:font-bold [&>h2]:mt-6 md:[&>h2]:mt-10 [&>h2]:mb-3 md:[&>h2]:mb-5 [&>h3]:text-xl md:[&>h3]:text-2xl lg:[&>h3]:text-3xl [&>h3]:font-semibold [&>h3]:mt-4 md:[&>h3]:mt-8 [&>h3]:mb-2 md:[&>h3]:mb-4 [&>ul]:list-disc [&>ul]:ml-6 md:[&>ul]:ml-8 [&>ul]:mb-4 md:[&>ul]:mb-6 [&>ol]:list-decimal [&>ol]:ml-6 md:[&>ol]:ml-8 [&>ol]:mb-4 md:[&>ol]:mb-6 [&>li]:mb-2 md:[&>li]:mb-3 [&>img]:rounded-lg [&>img]:my-4 md:[&>img]:my-8 [&>img]:shadow-lg [&>img]:max-w-full [&>img]:h-auto [&>img]:w-full"
              dangerouslySetInnerHTML={{ __html: page.body || page.excerpt || '' }}
            />
          </article>
        ) : (
          <div className="text-center py-16 sm:py-20 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900 rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 max-w-3xl mx-auto">
            <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl md:text-2xl px-4 sm:px-6 md:px-8">
              Le contenu de cette page sera bientôt disponible.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
