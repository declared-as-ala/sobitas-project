'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderOpen,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { BLOG_TOPICS, type BlogTopicId } from '@/content/blogTopics';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import type { BlogTaxonomyItem } from '@/services/api';
import type { BlogIndexArticle } from '@/util/blogIndex';
import { decodeHtmlEntities } from '@/util/htmlEntities';
import { BlogCard } from './BlogCard';

interface BlogPageClientProps {
  /** Lean index records: the 100 full HTML bodies never enter the client bundle. */
  articles: BlogIndexArticle[];
  blogCategories?: BlogTaxonomyItem[];
  blogTags?: BlogTaxonomyItem[];
  initialPage?: number;
}

const ARTICLES_PER_PAGE = 9;

function topicName(id: BlogTopicId): string {
  return BLOG_TOPICS.find((topic) => topic.id === id)?.shortLabel || 'Guide';
}

function articleMatchesSearch(article: BlogIndexArticle, query: string): boolean {
  if (!query) return true;
  const tags = (article.tags || [])
    .map((tag) => (typeof tag === 'string' ? tag : tag?.name || ''))
    .join(' ');
  return `${article.designation_fr} ${article.excerpt} ${tags}`.toLocaleLowerCase('fr').includes(query);
}

export function BlogPageClient({
  articles,
  blogCategories,
  blogTags,
  initialPage = 1,
}: BlogPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingRef = useRef<HTMLDivElement | null>(null);
  const [activeTopic, setActiveTopic] = useState<BlogTopicId>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('fr'));
  const [currentPage, setCurrentPage] = useState(Math.max(1, initialPage));

  const sortedArticles = useMemo(
    () =>
      [...articles].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }),
    [articles]
  );

  const blogCategoryLinks = useMemo(() => {
    if (blogCategories?.length) return blogCategories.filter((category) => category?.slug && category?.name);
    const map = new Map<string, BlogTaxonomyItem>();
    for (const article of articles) {
      for (const category of article.categories || []) {
        if (category?.slug && category?.name) map.set(category.slug, category);
      }
    }
    return Array.from(map.values());
  }, [articles, blogCategories]);

  const blogTagLinks = useMemo(() => {
    if (blogTags?.length) return blogTags.filter((tag) => tag?.slug && tag?.name).slice(0, 12);
    const map = new Map<string, BlogTaxonomyItem>();
    for (const article of articles) {
      for (const tag of article.tags || []) {
        if (typeof tag === 'object' && tag?.slug && tag?.name) map.set(tag.slug, tag);
      }
    }
    return Array.from(map.values()).slice(0, 12);
  }, [articles, blogTags]);

  const isDefaultScope = activeTopic === 'all' && deferredQuery === '';
  const featuredArticles = isDefaultScope ? sortedArticles.slice(0, 3) : [];

  const filteredArticles = useMemo(() => {
    const source = activeTopic === 'all'
      ? sortedArticles
      : sortedArticles.filter((article) => article.topicId === activeTopic);
    return source.filter((article) => articleMatchesSearch(article, deferredQuery));
  }, [activeTopic, deferredQuery, sortedArticles]);

  // Lead stories stay removed from the default archive on every page; page 2 cannot repeat them.
  const listingSource = isDefaultScope ? filteredArticles.slice(3) : filteredArticles;
  const totalPages = Math.max(1, Math.ceil(listingSource.length / ARTICLES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageArticles = listingSource.slice(
    (safeCurrentPage - 1) * ARTICLES_PER_PAGE,
    safeCurrentPage * ARTICLES_PER_PAGE
  );

  useEffect(() => {
    const value = Number.parseInt(searchParams.get('page') || '1', 10);
    if (Number.isFinite(value) && value >= 1) setCurrentPage(Math.min(value, totalPages));
  }, [searchParams, totalPages]);

  const replacePageInUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete('page');
    else params.set('page', String(page));
    router.replace(params.size ? `/blog?${params.toString()}` : '/blog', { scroll: false });
  };

  const focusListing = () => {
    requestAnimationFrame(() => listingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const selectTopic = (topic: BlogTopicId) => {
    setActiveTopic(topic);
    setCurrentPage(1);
    replacePageInUrl(1);
    focusListing();
  };

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    replacePageInUrl(page);
    focusListing();
  };

  return (
    <>
      <Section first spacing="default" width="wide">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)] lg:items-center lg:gap-10">
          <div className="min-w-0">
            <span className="pt-kicker mb-3 inline-flex items-center gap-2.5 text-brand">
              <span className="h-px w-7 bg-brand" aria-hidden="true" />
              Le guide Protein.tn
            </span>
            <h1 className="max-w-[18ch] font-display font-compressed text-[2.125rem] font-extrabold uppercase leading-[0.94] tracking-[-0.025em] text-ink-1 sm:text-5xl lg:text-[3.375rem]">
              Blog nutrition sportive & compléments en Tunisie
            </h1>
            <p className="mt-3.5 max-w-2xl text-[15px] leading-7 text-ink-2 sm:text-[17px]">
              Des réponses claires pour comprendre la whey, la créatine, la nutrition et choisir selon votre objectif — sans jargon inutile.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-ink-2">
              <span className="rounded-full border border-hairline bg-elevated px-3 py-1.5 tabular-nums">{articles.length} guides</span>
              <span className="rounded-full border border-hairline bg-elevated px-3 py-1.5">Français & arabe</span>
              <span className="rounded-full border border-hairline bg-elevated px-3 py-1.5">Lecture gratuite</span>
            </div>
          </div>

          <nav aria-label="Choisir un objectif" className="overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm">
            <div className="flex items-center gap-3 border-b border-rule px-4 py-3 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <span className="pt-kicker block text-brand">Commencer ici</span>
                <span className="mt-0.5 block text-sm font-semibold text-ink-1">Quel sujet vous intéresse ?</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2">
              {BLOG_TOPICS.filter((topic) => topic.id !== 'all').slice(0, 4).map((topic, index) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => selectTopic(topic.id)}
                  className={`group flex min-h-[82px] items-center justify-between gap-4 px-4 py-3 text-start transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus sm:px-5 ${
                    index > 0 ? 'border-t border-rule' : ''
                  } ${index === 1 ? 'sm:border-l sm:border-t-0' : ''} ${index === 3 ? 'sm:border-l' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-bold text-ink-1 group-hover:text-brand">{topic.label}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-ink-3">{topic.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              ))}
            </div>
          </nav>
        </div>
      </Section>

      {featuredArticles.length >= 3 && safeCurrentPage === 1 && (
        <Section surface="sunken" spacing="default" width="wide" aria-labelledby="featured-guides-title">
          <SectionHeader id="featured-guides-title" scale="2" kicker="À la une" title="Trois guides à lire maintenant" subtitle="Les publications les plus récentes, mises en avant sans masquer le reste de la bibliothèque." />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(24rem,0.85fr)] lg:gap-6">
            <BlogCard article={featuredArticles[0]} excerpt={featuredArticles[0].excerpt} readingMinutes={featuredArticles[0].readingMinutes} eyebrow={topicName(featuredArticles[0].topicId)} variant="feature" priority />
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-1">
              {featuredArticles.slice(1).map((article) => (
                <BlogCard key={article.id} article={article} readingMinutes={article.readingMinutes} eyebrow={topicName(article.topicId)} variant="compact" />
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section id="blog-articles" spacing="default" width="wide" aria-labelledby="all-guides-title">
        <div ref={listingRef} className="scroll-mt-28">
          <SectionHeader
            id="all-guides-title"
            scale="2"
            kicker="Bibliothèque"
            title={activeTopic === 'all' ? 'Tous les guides' : topicName(activeTopic)}
            subtitle="Filtrez par thème ou recherchez un mot précis."
            trailing={<span className="inline-flex min-h-11 items-center rounded-full border border-hairline bg-elevated px-4 text-sm font-semibold tabular-nums text-ink-2" aria-live="polite">{listingSource.length} résultat{listingSource.length > 1 ? 's' : ''}</span>}
            trailingAllWidths
          />

          <div className="mb-5 overflow-hidden rounded-2xl border border-rule bg-elevated shadow-sm">
            <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)] lg:items-center">
              <label className="relative block min-w-0">
                <span className="sr-only">Rechercher dans le blog</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    if (currentPage > 1) replacePageInUrl(1);
                    setCurrentPage(1);
                  }}
                  placeholder="Rechercher : créatine, whey, masse…"
                  className="min-h-12 w-full rounded-xl border border-hairline bg-canvas pl-11 pr-11 text-sm text-ink-1 outline-none placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-focus/20"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" aria-label="Effacer la recherche">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </label>

              <nav className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrer les guides">
                {BLOG_TOPICS.map((topic) => (
                  <button key={topic.id} type="button" onClick={() => selectTopic(topic.id)} aria-pressed={activeTopic === topic.id} className={`inline-flex min-h-11 shrink-0 items-center rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${activeTopic === topic.id ? 'border-brand bg-brand text-on-brand' : 'border-hairline bg-canvas text-ink-2 hover:border-brand/40 hover:text-brand'}`}>
                    {topic.shortLabel}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {pageArticles.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-elevated px-5 py-12 text-center sm:px-8">
              <BookOpen className="mx-auto h-9 w-9 text-brand" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-bold text-ink-1">Aucun guide trouvé</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-2">Essayez un autre mot ou revenez à l’ensemble des sujets.</p>
              <button type="button" onClick={() => { setQuery(''); selectTopic('all'); }} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">Voir tous les guides</button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:gap-6">
              {pageArticles.map((article) => (
                <BlogCard key={article.id} article={article} excerpt={article.excerpt} readingMinutes={article.readingMinutes} eyebrow={topicName(article.topicId)} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-6 flex justify-center lg:mt-8" aria-label="Pagination du blog">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-hairline bg-elevated p-1.5">
                <button type="button" onClick={() => changePage(safeCurrentPage - 1)} disabled={safeCurrentPage === 1} className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40" aria-label="Page précédente"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
                <span className="min-w-[5rem] text-center font-display text-sm font-bold tabular-nums text-ink-1" aria-live="polite">{safeCurrentPage} / {totalPages}</span>
                <button type="button" onClick={() => changePage(safeCurrentPage + 1)} disabled={safeCurrentPage === totalPages} className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40" aria-label="Page suivante"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
              </div>
            </nav>
          )}

          {(blogCategoryLinks.length > 0 || blogTagLinks.length > 0) && (
            <div className="mt-6 grid gap-5 rounded-2xl border border-rule bg-elevated p-4 sm:p-5 lg:mt-8 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-rule">
              {blogCategoryLinks.length > 0 && (
                <nav className="min-w-0" aria-label="Catégories éditoriales">
                  <span className="mb-2 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-brand"><FolderOpen className="h-4 w-4" aria-hidden="true" /> Catégories</span>
                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {blogCategoryLinks.map((category) => <Link key={category.slug} href={`/blog/category/${category.slug}`} className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-hairline bg-canvas px-3.5 text-sm font-medium text-ink-2 hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{decodeHtmlEntities(category.name)}</Link>)}
                  </div>
                </nav>
              )}
              {blogTagLinks.length > 0 && (
                <nav className="min-w-0 border-t border-rule pt-5 lg:border-t-0 lg:pl-5 lg:pt-0" aria-label="Sujets populaires">
                  <span className="mb-2 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-brand"><Tag className="h-4 w-4" aria-hidden="true" /> Sujets populaires</span>
                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {blogTagLinks.map((tag) => <Link key={tag.slug} href={`/blog/tag/${tag.slug}`} className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-hairline bg-sunken px-3.5 text-sm text-ink-2 hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{decodeHtmlEntities(tag.name)}</Link>)}
                  </div>
                </nav>
              )}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
