import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticlesByBlogTag } from '@/services/api';
import { buildCanonicalUrl, forceProteinDomain } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildItemListSchema, buildCollectionPageSchema } from '@/util/structuredData';
import { blogHref } from '@/util/blogSlug';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';
import { BlogCard } from '@/app/blog/BlogCard';
import { BlogPager } from '@/app/blog/BlogPager';
import { EmptyState } from '@/app/components/EmptyState';

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
    const total = Number(data.meta?.total);
    const countText =
      Number.isFinite(total) && total > 0 ? `${total} article${total > 1 ? 's' : ''}` : 'nos articles';
    const title = data.tag.seo?.title || `Blog tag ${data.tag.name} | Proteine Tunisie`;
    const description =
      data.tag.seo?.description ||
      `Explorez ${countText} associés au tag ${data.tag.name} : conseils nutrition & sport, guides et actualités sur Proteine Tunisie.`;
    const canonical = data.tag.seo?.canonical_url
      ? forceProteinDomain(data.tag.seo.canonical_url)
      : buildCanonicalUrl(`/blog/tag/${data.tag.slug}${page > 1 ? `?page=${page}` : ''}`);
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
      openGraph: {
        title,
        description,
        url: canonical,
        type: 'website',
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

  const perPage = 9;
  const currentPage = Math.max(1, Number(data.meta?.current_page) || page);
  const total = Number(data.meta?.total);
  const totalPages = Math.max(
    1,
    Number(data.meta?.last_page) || (Number.isFinite(total) ? Math.ceil(total / perPage) : 1)
  );

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

  // Unique intro copy so the tag page isn't a thin, templated listing (SEO: avoids "thin content").
  const introText =
    data.tag.seo?.description?.trim() ||
    `Tous nos articles associés au tag ${data.tag.name} : conseils nutrition & sport, astuces et guides pratiques signés Proteine Tunisie pour vous accompagner dans vos objectifs.`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <nav aria-label="Fil d'Ariane" className="mb-6 flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="transition-colors hover:text-red-600 dark:hover:text-red-400">Accueil</Link>
            <ChevronRight className="mx-1 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Link href="/blog" className="transition-colors hover:text-red-600 dark:hover:text-red-400">Blog</Link>
            <ChevronRight className="mx-1 h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="text-gray-800 dark:text-gray-200">Tag: {data.tag.name}</span>
          </nav>
          <div className="mb-8 sm:mb-10">
            <PageHeader kicker="Tag" title={data.tag.name} />
            <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              {introText}
            </p>
          </div>
          {data.articles.length === 0 ? (
            <div className="flex flex-col items-center pb-12">
              <EmptyState
                title="Aucun article"
                description="Aucun article avec ce tag pour le moment."
                showShopLink={false}
              />
              <Link
                href="/blog"
                className="-mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-red-600 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Retour au blog
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {data.articles.map((article) => (
                  <BlogCard key={article.id} article={article} />
                ))}
              </div>
              <BlogPager page={currentPage} totalPages={totalPages} basePath={`/blog/tag/${data.tag.slug}`} />
            </>
          )}
        </main>
        <Footer />
        <ScrollToTop />
      </div>
    </>
  );
}

