import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticlesByBlogTag, getStorageUrl } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildItemListSchema, buildCollectionPageSchema } from '@/util/structuredData';
import { blogHref } from '@/util/blogSlug';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const page = Math.max(1, parseInt(String(Array.isArray(sp.page) ? sp.page[0] : sp.page || '1'), 10) || 1);

  try {
    const data = await getArticlesByBlogTag(slug, page, 9);
    const title = data.tag.seo?.title || `Blog tag ${data.tag.name} | Proteine Tunisie`;
    const description = data.tag.seo?.description || `Articles de blog avec le tag ${data.tag.name}.`;
    const canonical = data.tag.seo?.canonical_url || buildCanonicalUrl(`/blog/tag/${data.tag.slug}${page > 1 ? `?page=${page}` : ''}`);
    return {
      title,
      description,
      alternates: { canonical },
      robots: {
        // Tag pages are thin / duplicate index-bloat by default — index only when the tag's
        // SEO config explicitly opts in.
        index: data.tag.seo?.robots?.index === true,
        follow: data.tag.seo?.robots?.follow ?? true,
      },
    };
  } catch {
    return { title: 'Tag blog | Proteine Tunisie' };
  }
}

export default async function BlogTagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const page = Math.max(1, parseInt(String(Array.isArray(sp.page) ? sp.page[0] : sp.page || '1'), 10) || 1);
  const data = await getArticlesByBlogTag(slug, page, 9).catch(() => null);
  if (!data) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [
      { name: 'Accueil', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: `Tag: ${data.tag.name}`, url: `/blog/tag/${data.tag.slug}` },
    ],
    baseUrl
  );
  const itemListSchema = buildItemListSchema(
    data.articles.map((a) => ({ name: a.designation_fr, url: blogHref(a.slug) })),
    baseUrl,
    { name: `Articles tag ${data.tag.name}` }
  );
  const collectionSchema = buildCollectionPageSchema(
    `Tag: ${data.tag.name}`,
    `/blog/tag/${data.tag.slug}`,
    baseUrl,
    { description: data.tag.seo?.description || `Articles de blog avec le tag ${data.tag.name}.` }
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="transition-colors hover:text-red-600 dark:hover:text-red-400">Accueil</Link>
            <span className="mx-1">›</span>
            <Link href="/blog" className="transition-colors hover:text-red-600 dark:hover:text-red-400">Blog</Link>
            <span className="mx-1">›</span>
            <span className="text-gray-800 dark:text-gray-200">Tag: {data.tag.name}</span>
          </nav>
          <div className="mb-8 sm:mb-10">
            <PageHeader kicker="Tag" title={data.tag.name} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {data.articles.map((article) => (
              <Link
                key={article.id}
                href={blogHref(article.slug)}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300 hover:shadow-xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {article.cover ? (
                    <Image
                      src={getStorageUrl(article.cover, article.updated_at || article.created_at)}
                      alt={article.designation_fr || 'Article'}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-100 dark:bg-gray-800" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug transition-colors group-hover:text-red-600 dark:group-hover:text-red-400">
                    {article.designation_fr}
                  </h2>
                  <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                    Lire la suite
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </main>
        <Footer />
        <ScrollToTop />
      </div>
    </>
  );
}

