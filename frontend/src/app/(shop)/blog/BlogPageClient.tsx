'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, FolderOpen, ListFilter, Tag } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Section } from '@/app/components/layout/Section';
import type { Article } from '@/types';
import { type BlogTaxonomyItem } from '@/services/api';
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

  // Articles come straight from the ISR server render (revalidate=300, fetch tag 'blog').
  // We no longer re-download the whole 100-article corpus (full HTML bodies) client-side on
  // every mount — that was a large per-visit payload with no SEO value. Freshness after an
  // admin edit is handled server-side via revalidateTag('blog') (POST /api/revalidate-blog).

  // On mount: mark hydrated and adopt the page number from the URL.
  useEffect(() => {
    setMounted(true);
    const pageParam = searchParams.get('page');
    const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
    if (!isNaN(urlPage) && urlPage >= 1) {
      setCurrentPage(urlPage);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Crawlable taxonomy links (SEO) ───
  // Derive real /blog/category & /blog/tag links from the articles' own taxonomy so those
  // pages (previously orphaned → "crawled, currently not indexed") get inbound links in the
  // SSR DOM. Sourced from the server-provided `articles` prop so the <a href> are present
  // on first paint.
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
    <>
      <main className="min-h-screen bg-canvas">
        <Section first spacing="tight" width="wide">
          <PageHeader
            kicker="Blog"
            title="Blog nutrition sportive & compléments en Tunisie"
            subtitle="Conseils, guides et actualités : whey, créatine, prise de masse et compléments alimentaires."
          >
            <div className="overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm">
              <div className="flex items-center gap-4 p-3 sm:p-4">
                <div className="hidden shrink-0 items-center gap-3 border-e border-rule pe-4 lg:flex">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
                    <ListFilter className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="pt-kicker block text-brand">Explorer</span>
                    <span className="mt-0.5 block text-sm font-semibold text-ink-1">Choisir un thème</span>
                  </span>
                </div>

                {/* Category filters – client-side filtering, presented as the same compact control
                    rail used by the shop instead of a detached row of oversized pills. */}
                <nav
                  className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Catégories du blog"
                >
                  {BLOG_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      aria-pressed={activeCategory === cat.id}
                      aria-controls="blog-articles"
                      className={`inline-flex min-h-11 shrink-0 items-center rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                        activeCategory === cat.id
                          ? 'border-brand bg-brand text-on-brand'
                          : 'border-hairline bg-canvas text-ink-2 hover:border-brand/40 hover:text-brand'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Crawlable taxonomy navigation → real /blog/category & /blog/tag pages.
                  Real <Link href> (unlike the client filter buttons above) so search engines
                  can discover and index the taxonomy pages. */}
              {(blogCategoryLinks.length > 0 || blogTagLinks.length > 0) && (
                <div className="grid gap-4 border-t border-hairline px-4 pb-4 pt-4 lg:grid-cols-2">
                  {blogCategoryLinks.length > 0 && (
                    <nav className="min-w-0" aria-label="Parcourir les catégories du blog">
                      <span className="mb-2 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                        <FolderOpen className="h-4 w-4" aria-hidden="true" />
                        Catégories
                      </span>
                      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {blogCategoryLinks.map((cat) => (
                          <Link
                            key={cat.slug}
                            href={`/blog/category/${cat.slug}`}
                            className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-hairline bg-canvas px-3.5 text-sm font-medium text-ink-2 transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                          >
                            {decodeHtmlEntities(cat.name)}
                          </Link>
                        ))}
                      </div>
                    </nav>
                  )}
                  {blogTagLinks.length > 0 && (
                    <nav className="min-w-0" aria-label="Parcourir les tags du blog">
                      <span className="mb-2 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                        <Tag className="h-4 w-4" aria-hidden="true" />
                        Sujets
                      </span>
                      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {blogTagLinks.map((t) => (
                          <Link
                            key={t.slug}
                            href={`/blog/tag/${t.slug}`}
                            className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-hairline bg-sunken px-3.5 text-sm text-ink-2 transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                          >
                            {decodeHtmlEntities(t.name)}
                          </Link>
                        ))}
                      </div>
                    </nav>
                  )}
                </div>
              )}
            </div>
          </PageHeader>
        </Section>

        <Section id="blog-articles" surface="sunken" spacing="default" width="wide">
          <SectionHeader
            kicker="Publications"
            title={BLOG_CATEGORIES.find((cat) => cat.id === activeCategory)?.label ?? 'Tous les articles'}
            scale="3"
            trailing={(
              <span className="inline-flex min-h-11 items-center rounded-full border border-hairline bg-elevated px-4 text-sm font-semibold tabular-nums text-ink-2">
                {sortedArticles.length} article{sortedArticles.length > 1 ? 's' : ''}
              </span>
            )}
            trailingAllWidths
          />

          {sortedArticles.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-elevated px-6 py-12 text-center">
              <p className="text-ink-3">Aucun article dans cette catégorie.</p>
            </div>
          ) : (
            <>
              {/* Article grid: 1 col mobile, 2 tablet, 3 desktop */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:gap-6">
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
                <nav className="mt-6 flex justify-center lg:mt-8" aria-label="Pagination du blog">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-hairline bg-elevated p-1.5">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Page précédente"
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <span
                      className="min-w-[4.5rem] text-center font-display text-sm font-bold tabular-nums text-ink-1"
                      aria-live="polite"
                    >
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Page suivante"
                    >
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </Section>
      </main>

      <ScrollToTop />
    </>
  );
}
