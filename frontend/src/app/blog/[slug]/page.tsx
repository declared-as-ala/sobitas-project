import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleDetails, getLatestArticles } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { ArticleDetailClient } from './ArticleDetailClient';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getArticleDetails(slug);
    const imageUrl = article.cover ? getStorageUrl(article.cover) : '';
    
    return {
      title: `${article.designation_fr} | Blog Sobitas`,
      description: article.description_fr || `Découvrez ${article.designation_fr} sur le blog Sobitas`,
      openGraph: {
        title: article.designation_fr,
        description: article.description_fr || '',
        images: imageUrl ? [imageUrl] : [],
        type: 'article',
      },
    };
  } catch (error) {
    return {
      title: 'Article | Blog Sobitas',
      description: 'Découvrez nos articles',
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
