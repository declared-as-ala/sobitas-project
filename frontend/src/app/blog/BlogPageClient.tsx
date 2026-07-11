'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ChevronLeft, ChevronRight, FolderOpen, Tag } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';
import type { Article } from '@/types';
import { getAllArticlesClient, type BlogTaxonomyItem } from '@/services/api';
import { BlogCard } from './BlogCard';

interface BlogPageClientProps {
  articles: Article[];
  /** Real blog taxonomy from the server (the article LIST payload omits categories/tags, so the
   *  taxonomy nav must be fed from the dedicated endpoints to render its crawlable links). */
  blogCategories?: BlogTaxonomyItem[];
  blogTags?: BlogTaxonomyItem[];
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

// Decode HTML entities properly (server-safe, no window/document)
function decodeHtmlEntities(text: string): string {
  if (!text) return '';
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

// Normalize for comparison: single spaces, trimmed, NFC unicode
function normalizeForCompare(s: string): string {
  return (s || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getExcerpt(article: Article, maxLength: number = 140): string {
  const raw = article.description || article.description_fr || '';
  let text = stripHtml(raw).trim();
  if (!text) return '';

  // Remove duplicated title from the start so the excerpt shows only content, not the title again
  const title = decodeHtmlEntities(article.designation_fr || '').trim();
  if (title) {
    const normalizedTitle = normalizeForCompare(title);

    // 1) Exact prefix: first N chars match title (case/space insensitive)
    if (text.length >= title.length && normalizeForCompare(text.slice(0, title.length)) === normalizedTitle) {
      text = text.slice(title.length).replace(/^[\s.,?!:;-]+/, '').trim();
    } else {
      // 2) Normalized starts-with: find title as prefix in normalized form (handles encoding differences)
      const normalizedText = normalizeForCompare(text);
      if (normalizedText.startsWith(normalizedTitle)) {
        // Remove roughly the title from the start (same length in original text to preserve accents)
        const after = text.slice(title.length).replace(/^[\s.,?!:;-]+/, '').trim();
        if (after.length > 0) text = after;
      } else {
        // 3) First sentence equals title (e.g. "Title. Rest of content")
        const firstSentence = text.split(/[.?!]/)[0]?.trim() || '';
        if (firstSentence && normalizeForCompare(firstSentence) === normalizedTitle) {
          text = text.slice(firstSentence.length).replace(/^[\s.,?!:;-]+/, '').trim();
        }
      }
    }
  }

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
  const typed = article.blog_type != null && String(article.blog_type).trim() !== '';
  if (typed) {
    return String(article.blog_type).trim() === categoryId;
  }
  const searchText = [
    article.designation_fr || '',
    stripHtml(article.description || ''),
    stripHtml(article.description_fr || ''),
  ].join(' ').toLowerCase();
  return cat.keywords.some(kw => searchText.includes(kw.toLowerCase()));
}

export function BlogPageClient({ articles, blogCategories, blogTags }: BlogPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('all');
  const [mounted, setMounted] = useState(false);
  const isUserAction = useRef(false);
  // Timestamp of the last successful client re-fetch — used to skip redundant
  // refetches on tab-refocus (only refresh if the data is older than STALE_MS).
  const lastFetchRef = useRef(0);

  // ─── Client-side re-fetch: ensures data is ALWAYS fresh ───
  // The server component provides `articles` for the initial SSR/SEO render.
  // On mount (client-side), we re-fetch from the API to guarantee freshness,
  // which fixes the "deleted article reappears after F5" bug caused by
  // Next.js server-side caching layers (Full Route Cache, Data Cache, CDN).
  const [liveArticles, setLiveArticles] = useState<Article[]>(articles);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshArticles = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const fresh = await getAllArticlesClient();
      setLiveArticles(fresh);
      lastFetchRef.current = Date.now();
    } catch {
      // Silently fall back to server-provided data
      console.warn('[Blog] Client-side re-fetch failed, using server data');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Re-fetch on mount (client-side)
  useEffect(() => {
    setMounted(true);

    // Read page from URL on initial mount
    const pageParam = searchParams.get('page');
    const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
    if (!isNaN(urlPage) && urlPage >= 1) {
      setCurrentPage(urlPage);
    }

    // Fetch fresh data from API (bypasses all server-side caching)
    refreshArticles();

    // Also re-fetch when user returns to this tab (handles admin edits in another
    // tab), but only if the data is stale — avoids re-downloading the whole corpus
    // on every focus/blur.
    const STALE_MS = 60_000;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > STALE_MS) {
        refreshArticles();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Crawlable taxonomy links (SEO) ───
  // Derive real /blog/category & /blog/tag links from the articles' own taxonomy so those
  // pages (previously orphaned → "crawled, currently not indexed") get inbound links in the
  // SSR DOM. Sourced from the server-provided `articles` prop (not `liveArticles`) so the
  // <a href> are present on first paint, before any client re-fetch.
  const blogCategoryLinks = useMemo(() => {
    // Prefer the dedicated /blog_categories payload (complete); fall back to the taxonomy embedded
    // in the articles (empty when the list API omits it).
    if (blogCategories && blogCategories.length > 0) {
      return blogCategories.filter((c) => c?.slug && c?.name).map((c) => ({ slug: c.slug, name: c.name }));
    }
    const map = new Map<string, { slug: string; name: string }>();
    for (const a of articles) {
      for (const c of a.categories ?? []) {
        if (c?.slug && c?.name && !map.has(c.slug)) map.set(c.slug, { slug: c.slug, name: c.name });
      }
    }
    return Array.from(map.values());
  }, [articles, blogCategories]);

  const blogTagLinks = useMemo(() => {
    if (blogTags && blogTags.length > 0) {
      return blogTags.filter((t) => t?.slug && t?.name).slice(0, 15).map((t) => ({ slug: t.slug, name: t.name, count: 0 }));
    }
    const counts = new Map<string, { slug: string; name: string; count: number }>();
    for (const a of articles) {
      for (const t of a.tags ?? []) {
        if (typeof t === 'object' && t?.slug && t?.name) {
          const existing = counts.get(t.slug);
          if (existing) existing.count += 1;
          else counts.set(t.slug, { slug: t.slug, name: t.name, count: 1 });
        }
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [articles, blogTags]);

  // Filter by category (keyword-based)
  const filteredArticles = useMemo(() => {
    return liveArticles.filter(a => articleMatchesCategory(a, activeCategory));
  }, [liveArticles, activeCategory]);

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

  // Derive excerpt + reading time once per visible slice (they strip the full HTML body),
  // instead of recomputing on every render. Recomputes only when the page slice changes.
  const cardData = useMemo(
    () =>
      paginatedArticles.map((article) => ({
        article,
        excerpt: getExcerpt(article),
        readingMinutes: getReadingTimeMinutes(article),
      })),
    [paginatedArticles]
  );

  // Sync currentPage from URL params (on URL change from external navigation)
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const urlPage = pageParam ? parseInt(pageParam, 10) : 1;

    if (!isUserAction.current && !isNaN(urlPage) && urlPage >= 1 && urlPage <= totalPages) {
      setCurrentPage(prevPage => (urlPage !== prevPage ? urlPage : prevPage));
    }
    isUserAction.current = false;
  }, [searchParams, totalPages]);

  // Reset to page 1 when category changes
  useEffect(() => {
    setCurrentPage(1);
    isUserAction.current = true;
  }, [activeCategory]);

  // Update URL when currentPage changes from user interaction
  useEffect(() => {
    if (!mounted) return;

    const pageParam = searchParams.get('page');
    const urlPage = pageParam ? parseInt(pageParam, 10) : 1;

    if (currentPage !== urlPage && isUserAction.current) {
      const params = new URLSearchParams(searchParams.toString());
      if (currentPage === 1) {
        params.delete('page');
      } else {
        params.set('page', currentPage.toString());
      }
      const newUrl = params.toString() ? `/blog?${params.toString()}` : '/blog';
      router.replace(newUrl, { scroll: false });
    }
  }, [currentPage, router, searchParams, mounted]);

  // Scroll to top on page change (client-side only)
  useEffect(() => {
    if (!mounted) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, mounted]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      isUserAction.current = true;
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="mb-10 sm:mb-12">
          <PageHeader
            kicker="Blog"
            title="Blog nutrition sportive & compléments en Tunisie"
            subtitle="Conseils, guides et actualités : whey, créatine, prise de masse et compléments alimentaires."
          >
            {/* Category filters – pills, red accent (client-side filter UX) */}
            <nav className="flex flex-wrap gap-2.5 md:gap-3" aria-label="Catégories du blog">
              {BLOG_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={activeCategory === cat.id}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    activeCategory === cat.id
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-red-600 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-red-400 dark:hover:text-red-400'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </nav>

            {/* Crawlable taxonomy navigation → real /blog/category & /blog/tag pages.
                Real <Link href> (unlike the client filter buttons above) so search engines
                can discover and index the taxonomy pages. */}
            {(blogCategoryLinks.length > 0 || blogTagLinks.length > 0) && (
              <div className="mt-5 flex flex-col gap-3">
                {blogCategoryLinks.length > 0 && (
                  <nav className="flex flex-wrap items-center gap-2 sm:gap-2.5" aria-label="Parcourir les catégories du blog">
                    <span className="inline-flex items-center gap-1.5 font-display text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                      <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Catégories
                    </span>
                    {blogCategoryLinks.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/blog/category/${cat.slug}`}
                        className="inline-flex min-h-9 items-center rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-red-600 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-red-400 dark:hover:text-red-400"
                      >
                        {decodeHtmlEntities(cat.name)}
                      </Link>
                    ))}
                  </nav>
                )}
                {blogTagLinks.length > 0 && (
                  <nav className="flex flex-wrap items-center gap-2" aria-label="Parcourir les tags du blog">
                    <span className="inline-flex items-center gap-1.5 font-display text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                      <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                      Tags
                    </span>
                    {blogTagLinks.map((t) => (
                      <Link
                        key={t.slug}
                        href={`/blog/tag/${t.slug}`}
                        className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-600 transition-colors hover:border-red-600 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:border-red-400 dark:hover:text-red-400"
                      >
                        {decodeHtmlEntities(t.name)}
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
            )}
          </PageHeader>
        </div>

        {sortedArticles.length === 0 && !isRefreshing ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">Aucun article dans cette catégorie.</p>
          </div>
        ) : (
          <>
            {/* Article grid: 1 col mobile, 2 tablet, 3 desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-8 sm:mb-12">
              {cardData.map(({ article, excerpt, readingMinutes }, index) => (
                <BlogCard
                  key={`blog-${currentPage}-${article.id}`}
                  article={article}
                  excerpt={excerpt}
                  readingMinutes={readingMinutes}
                  priority={index < 3}
                />
              ))}
            </div>

            {/* Compact pagination – "‹ 1/37 ›" style */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:border-red-600 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:border-red-400 dark:hover:text-red-400"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <span
                  className="min-w-[4rem] text-center font-display font-semibold tabular-nums text-gray-900 dark:text-white"
                  aria-live="polite"
                >
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:border-red-600 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:border-red-400 dark:hover:text-red-400"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
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
