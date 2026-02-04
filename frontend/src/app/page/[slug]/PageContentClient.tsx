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

        {/* Content - Enhanced styling for legal/policy pages */}
        {hasContent ? (
          <article className="max-w-5xl mx-auto">
            <div
              className="prose prose-lg md:prose-xl dark:prose-invert max-w-none
                prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
                prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                prose-a:text-red-600 dark:prose-a:text-red-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold
                prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300
                prose-li:text-gray-700 dark:prose-li:text-gray-300
                [&>h1]:text-3xl md:[&>h1]:text-4xl lg:[&>h1]:text-5xl [&>h1]:font-bold [&>h1]:mt-12 md:[&>h1]:mt-16 [&>h1]:mb-6 md:[&>h1]:mb-8 [&>h1]:text-gray-900 dark:[&>h1]:text-white [&>h1]:border-b-2 [&>h1]:border-red-600 [&>h1]:pb-4
                [&>h2]:text-2xl md:[&>h2]:text-3xl lg:[&>h2]:text-4xl [&>h2]:font-bold [&>h2]:mt-10 md:[&>h2]:mt-12 [&>h2]:mb-4 md:[&>h2]:mb-6 [&>h2]:text-gray-900 dark:[&>h2]:text-white [&>h2]:flex [&>h2]:items-center [&>h2]:gap-3
                [&>h3]:text-xl md:[&>h3]:text-2xl lg:[&>h3]:text-3xl [&>h3]:font-semibold [&>h3]:mt-8 md:[&>h3]:mt-10 [&>h3]:mb-3 md:[&>h3]:mb-5 [&>h3]:text-gray-800 dark:[&>h3]:text-gray-200
                [&>h4]:text-lg md:[&>h4]:text-xl [&>h4]:font-semibold [&>h4]:mt-6 md:[&>h4]:mt-8 [&>h4]:mb-3 [&>h4]:text-gray-800 dark:[&>h4]:text-gray-200
                [&>p]:mb-5 md:[&>p]:mb-6 [&>p]:text-base md:[&>p]:text-lg [&>p]:leading-relaxed
                [&>ul]:list-disc [&>ul]:ml-6 md:[&>ul]:ml-8 [&>ul]:mb-6 md:[&>ul]:mb-8 [&>ul]:space-y-2
                [&>ol]:list-decimal [&>ol]:ml-6 md:[&>ol]:ml-8 [&>ol]:mb-6 md:[&>ol]:mb-8 [&>ol]:space-y-2
                [&>li]:mb-2 md:[&>li]:mb-3 [&>li]:text-base md:[&>li]:text-lg [&>li]:leading-relaxed
                [&>li>p]:mb-2
                [&>img]:rounded-xl [&>img]:my-6 md:[&>img]:my-8 [&>img]:shadow-xl [&>img]:max-w-full [&>img]:h-auto [&>img]:w-full
                [&>div]:my-4
                [&>hr]:my-8 md:[&>hr]:my-12 [&>hr]:border-gray-300 dark:[&>hr]:border-gray-700
                [&>blockquote]:border-l-4 [&>blockquote]:border-red-600 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-6
                [&>code]:bg-gray-100 dark:[&>code]:bg-gray-800 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>code]:text-sm
                [&>table]:w-full [&>table]:my-6 [&>table]:border-collapse
                [&>table>thead]:bg-gray-100 dark:[&>table>thead]:bg-gray-800
                [&>table>tbody>tr]:border-b [&>table>tbody>tr]:border-gray-200 dark:[&>table>tbody>tr]:border-gray-700
                [&>table>tbody>tr:hover]:bg-gray-50 dark:[&>table>tbody>tr:hover]:bg-gray-900
                [&>table>th]:p-3 [&>table>th]:text-left [&>table>th]:font-bold
                [&>table>td]:p-3"
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
