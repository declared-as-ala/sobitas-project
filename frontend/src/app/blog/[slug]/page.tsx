import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleDetails, getLatestArticles } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { ArticleDetailClient } from './ArticleDetailClient';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// Force dynamic rendering & disable ALL fetch caching for this route.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
    
    return {
      title: `${article.designation_fr} | Blog Sobitas`,
      description: metaDescription,
      openGraph: {
        title: article.designation_fr,
        description: metaDescription,
        images: imageUrl ? [imageUrl] : [],
        type: 'article',
        url: `https://protein.tn/blog/${slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: article.designation_fr,
        description: metaDescription,
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

    // Filter out current article from related
    const filteredRelated = relatedArticles.filter(a => a.slug !== slug).slice(0, 3);

    return <ArticleDetailClient article={article} relatedArticles={filteredRelated} />;
  } catch (error) {
    console.error('Error fetching article:', error);
    notFound();
  }
}
