import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticlesByBlogTag, getStorageUrl } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildItemListSchema, buildCollectionPageSchema } from '@/util/structuredData';
import { blogHref } from '@/util/blogSlug';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';

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
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-red-700">Accueil</Link>
          <span className="mx-1">›</span>
          <Link href="/blog" className="hover:text-red-700">Blog</Link>
          <span className="mx-1">›</span>
          <span className="text-gray-800">Tag: {data.tag.name}</span>
        </nav>
        <h1 className="text-3xl font-bold mb-8">Tag: {data.tag.name}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.articles.map((article) => (
            <Link key={article.id} href={blogHref(article.slug)} className="border rounded-xl p-4 hover:shadow-md transition">
              {article.cover && (
                <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-3 bg-gray-100">
                  <Image
                    src={getStorageUrl(article.cover, article.updated_at || article.created_at)}
                    alt={article.designation_fr || 'Article'}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              )}
              <h2 className="font-semibold text-lg">{article.designation_fr}</h2>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}

