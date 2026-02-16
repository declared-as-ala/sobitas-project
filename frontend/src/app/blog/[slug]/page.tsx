import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleDetails, getLatestArticles } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { buildArticleSchema } from '@/util/structuredData';
import { BlogSeoBlock } from '@/app/blog/BlogSeoBlock';
import { ArticleDetailClient } from './ArticleDetailClient';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// dynamic = 'force-dynamic': page is rendered on every request.
// fetch calls use next:{tags:['blog']} for on-demand revalidation.
export const dynamic = 'force-dynamic';

// Helper to strip HTML and get plain text
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160);
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getArticleDetails(slug);
    const imageUrl = article.cover ? getStorageUrl(article.cover) : '';
    const description = stripHtml(article.description_fr || article.description || '');
    const metaDescription = description || `Découvrez ${article.designation_fr} sur le blog Sobitas - Conseils nutrition et sport`;
    
    const canonicalUrl = buildCanonicalUrl(`/blog/${encodeURIComponent(slug)}`);
    const title = article.designation_fr || 'Blog';
    const descriptionWithTunisia = metaDescription.includes('Tunisie') ? metaDescription : `${metaDescription} Conseils nutrition sportive Tunisie – SOBITAS.`;
    return {
      title,
      description: descriptionWithTunisia.slice(0, 160),
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description: descriptionWithTunisia.slice(0, 160),
        images: imageUrl ? [imageUrl] : [],
        type: 'article',
        url: canonicalUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: descriptionWithTunisia.slice(0, 160),
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Article | Blog Sobitas',
      description: 'Découvrez nos articles sur la nutrition et le sport',
    };
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  
  try {
    const [article, relatedArticles] = await Promise.all([
      getArticleDetails(slug),
      getLatestArticles(),
    ]);

    if (!article) {
      notFound();
    }

    const filteredRelated = relatedArticles.filter(a => a.slug !== slug).slice(0, 3);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';
    const articleImageUrl = article.cover ? getStorageUrl(article.cover) : undefined;
    const articleSchema = buildArticleSchema(article, baseUrl, articleImageUrl);

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
        <ArticleDetailClient article={article} relatedArticles={filteredRelated}>
          <BlogSeoBlock slug={slug} />
        </ArticleDetailClient>
      </>
    );
  } catch (error) {
    console.error('Error fetching article:', error);
    notFound();
  }
}
