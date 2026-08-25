import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowUpRight, BookOpen, ChevronDown } from 'lucide-react';
import { Section } from '@/app/components/layout/Section';
import { getAllArticles, getBlogCategories, getBlogTags } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildCollectionPageSchema, buildItemListSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { decodeHtmlEntities } from '@/util/htmlEntities';
import { loadForCache } from '@/util/loadForCache';
import { BlogPageClient } from './BlogPageClient';
import { BlogListSkeleton } from './BlogListSkeleton';

const ARTICLES_PER_PAGE = 9;

type BlogSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(props: { searchParams?: BlogSearchParams }): Promise<Metadata> {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const pageNum = Math.max(1, parseInt(String(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page || '1'), 10) || 1);
  const search = stripTrackingFromSearch(searchParams);
  const path = '/blog';
  const canonical = buildCanonicalUrl(path, search ? `?${search}` : undefined);
  const totalArticles = await getTotalArticles();
  const totalPages = Math.max(1, Math.ceil(totalArticles / ARTICLES_PER_PAGE));
  const { prev, next } = getBlogPrevNext(path, search, pageNum, totalPages);

  return {
    title: { absolute: 'Blog Nutrition Sportive & Compléments | Protéine Tunisie' },
    description: 'Guides, conseils prise de masse, choix whey et créatine. Tout pour la nutrition sportive en Tunisie.',
    alternates: {
      canonical,
      ...(prev && { prev }),
      ...(next && { next }),
    },
    openGraph: {
      title: { absolute: 'Blog Nutrition Sportive & Compléments | Protéine Tunisie' },
      description: 'Guides, conseils prise de masse, choix whey et créatine. Tout pour la nutrition sportive en Tunisie.',
      type: 'website',
      url: canonical,
      images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'Blog Nutrition Sportive | Protéine Tunisie' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Blog Nutrition Sportive & Compléments',
      description: 'Guides, conseils prise de masse, choix whey et créatine.',
      images: ['/og-banner.jpg'],
    },
    robots: {
      index: pageNum === 1,
      follow: true,
    },
  };
}

function stripTrackingFromSearch(searchParams: Record<string, string | string[] | undefined>): string {
  const p = new URLSearchParams();
  const skip = /^(utm_[a-z_]*|fbclid|gclid|srsltid|msclkid|mc_[a-z_]*|ref|source)$/i;
  Object.entries(searchParams).forEach(([key, value]) => {
    if (skip.test(key)) return;
    const v = Array.isArray(value) ? value[0] : value;
    if (v != null && v !== '') p.set(key, v);
  });
  return p.toString();
}

async function getTotalArticles(): Promise<number> {
  try {
    const articles = await getAllArticles();
    return Array.isArray(articles) ? articles.length : 0;
  } catch {
    return 0;
  }
}

function getBlogPrevNext(path: string, search: string, page: number, totalPages: number): { prev?: string; next?: string } {
  const params = new URLSearchParams(search || '');
  const prevParams = new URLSearchParams(params);
  if (page > 1) {
    if (page === 2) prevParams.delete('page');
    else prevParams.set('page', String(page - 1));
  }
  const nextParams = new URLSearchParams(params);
  nextParams.set('page', String(page + 1));
  const prev = page > 1 ? buildCanonicalUrl(path, prevParams.toString() ? `?${prevParams.toString()}` : undefined) : undefined;
  const next = page < totalPages ? buildCanonicalUrl(path, `?${nextParams.toString()}`) : undefined;
  return { prev, next };
}

// ISR: the /blog index is cached in the Full Route Cache and re-rendered at most every
// 5 min (was force-dynamic → a fresh RSC render + 100-article fetch on EVERY request, plus
// a full client-side corpus re-download on mount). The article fetch uses next:{tags:['blog']}
// so an admin edit still propagates instantly via revalidateTag('blog') (POST /api/revalidate-blog).
export const revalidate = 300;

async function getBlogData() {
  // Articles are the PRIMARY content: getAllArticles() throws on a bad response. Wrapping in
  // loadForCache means a transient failure (e.g. the build runner getting Cloudflare-403'd)
  // renders empty but is NOT baked into the ISR cache — the route re-renders next request
  // (runtime reaches the API) instead of serving an empty blog for the whole revalidate window.
  // Taxonomy is incidental and fails soft without poisoning the cache.
  return loadForCache(
    async () => {
      // Fetch the real taxonomy alongside the articles so the /blog index can render crawlable
      // /blog/category & /blog/tag links (the article LIST payload omits categories/tags).
      const [articles, blogCategories, blogTags] = await Promise.all([
        getAllArticles(),
        getBlogCategories().catch(() => []),
        getBlogTags().catch(() => []),
      ]);
      return { articles, blogCategories, blogTags };
    },
    { articles: [], blogCategories: [], blogTags: [] } as {
      articles: Awaited<ReturnType<typeof getAllArticles>>;
      blogCategories: Awaited<ReturnType<typeof getBlogCategories>>;
      blogTags: Awaited<ReturnType<typeof getBlogTags>>;
    }
  );
}

export default async function BlogPage() {
  const { articles, blogCategories, blogTags } = await getBlogData();
  const baseUrl = getBaseUrl();
  const list = Array.isArray(articles) ? articles : [];

  const collectionSchema = buildCollectionPageSchema(
    'Blog Nutrition Sportive & Compléments Alimentaires en Tunisie',
    '/blog',
    baseUrl,
    { description: 'Guides, conseils prise de masse, choix whey et créatine. Tout pour la nutrition sportive en Tunisie.' }
  );
  const itemListSchema = list.length > 0
    ? buildItemListSchema(
        list.slice(0, 20).map((a: { designation_fr?: string; slug?: string }) => ({
          name: decodeHtmlEntities(a.designation_fr || a.slug || 'Article'),
          url: `/blog/${encodeURIComponent(a.slug || '')}`,
        })),
        baseUrl,
        { name: 'Articles' }
      )
    : null;
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'Blog', url: '/blog' }],
    baseUrl
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Suspense fallback={<BlogListSkeleton />}>
        <BlogPageClient articles={articles} blogCategories={blogCategories} blogTags={blogTags} />
      </Suspense>

      {/*
        Server-rendered archive index.

        BlogPageClient paginates in the browser with <button onClick>, so the SSR HTML only ever
        contains the first page: measured live, /blog gave Googlebot 9 unique article links out of
        100 articles, and /blog?page=2 returned the same 9. The other 91 articles had NO internal
        anchor pointing at them from anywhere on the site — they were reachable only via the
        sitemap, which is discovery without any link equity or crawl priority.

        This is a real, user-accessible archive rather than hidden markup or a duplicate paginated
        surface: every article gets one honest internal link, it needs no extra fetch (the server
        component already has the full list for the JSON-LD above), and it stays correct as the
        blog grows. Native <details> keeps the full list in the server HTML while letting visitors
        choose when to expand the library instead of forcing a 100-link wall into the page flow.
      */}
      {list.length > 0 && (
        <Section surface="base" spacing="tight" width="wide" last>
          <nav aria-labelledby="blog-archive-title">
            <h2 id="blog-archive-title" className="sr-only">Archive complète du blog</h2>
            <details className="group overflow-hidden rounded-2xl border border-hairline bg-elevated">
              <summary className="flex min-h-[88px] cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus sm:gap-4 sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                    Archives du blog
                  </span>
                  <span className="mt-1 block font-display text-lg font-bold leading-tight text-ink-1 sm:text-xl">
                    Explorer tous nos guides
                  </span>
                  <span className="mt-1 block text-sm text-ink-2">
                    {list.length} articles, réunis dans une bibliothèque facile à parcourir.
                  </span>
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-hairline bg-canvas p-3 sm:p-5">
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((a: { designation_fr?: string; slug?: string }) => {
                    const slug = (a.slug ?? '').trim();
                    if (!slug) return null;
                    return (
                      <li key={slug} className="min-w-0">
                        <Link
                          href={`/blog/${encodeURIComponent(slug)}`}
                          className="group/link flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm leading-snug text-ink-2 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          <span>{decodeHtmlEntities(a.designation_fr || slug)}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          </nav>
        </Section>
      )}
    </>
  );
}
