import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticlesByBlogTag, getStorageUrl } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildItemListSchema } from '@/util/structuredData';

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
    const title = data.tag.seo?.title || `Blog tag ${data.tag.name} | SOBITAS`;
    const description = data.tag.seo?.description || `Articles de blog avec le tag ${data.tag.name}.`;
    const canonical = data.tag.seo?.canonical_url || buildCanonicalUrl(`/blog/tag/${data.tag.slug}${page > 1 ? `?page=${page}` : ''}`);
    return {
      title,
      description,
      alternates: { canonical },
      robots: {
        index: data.tag.seo?.robots?.index ?? page === 1,
        follow: data.tag.seo?.robots?.follow ?? true,
      },
    };
  } catch {
    return { title: 'Tag blog | SOBITAS' };
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
    data.articles.map((a) => ({ name: a.designation_fr, url: `/blog/${a.slug}` })),
    baseUrl,
    { name: `Articles tag ${data.tag.name}` }
  );

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <h1 className="text-3xl font-bold mb-8">Tag: {data.tag.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.articles.map((article) => (
          <Link key={article.id} href={`/blog/${article.slug}`} className="border rounded-xl p-4 hover:shadow-md transition">
            {article.cover && (
              <img
                src={getStorageUrl(article.cover, article.updated_at || article.created_at)}
                alt={article.designation_fr}
                className="w-full h-48 object-cover rounded-lg mb-3"
              />
            )}
            <h2 className="font-semibold text-lg">{article.designation_fr}</h2>
          </Link>
        ))}
      </div>
    </main>
  );
}

