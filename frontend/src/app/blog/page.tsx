import { Metadata } from 'next';
import { Suspense } from 'react';
import { getAllArticles } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildCollectionPageSchema, buildItemListSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { decodeHtmlEntities } from '@/util/htmlEntities';
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

// dynamic = 'force-dynamic': page is rendered on every request (no Full Route Cache).
// Individual fetch() calls use next:{tags:['blog']} → cached in Data Cache until
// the admin triggers revalidateTag('blog') via POST /api/revalidate-blog.
export const dynamic = 'force-dynamic';

async function getBlogData() {
  try {
    const articles = await getAllArticles();
    return { articles };
  } catch (error) {
    console.error('Error fetching blog data:', error);
    return { articles: [] };
  }
}

export default async function BlogPage() {
  const { articles } = await getBlogData();
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
        <BlogPageClient articles={articles} />
      </Suspense>
    </>
  );
}
