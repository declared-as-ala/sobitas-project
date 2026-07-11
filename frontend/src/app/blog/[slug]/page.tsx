import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleDetails, getLatestArticles } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { buildCanonicalUrl, forceProteinDomain } from '@/util/canonical';
import { buildArticleSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { blogHref } from '@/util/blogSlug';
import { BlogSeoBlock } from '@/app/blog/BlogSeoBlock';
import { ArticleDetailClient } from './ArticleDetailClient';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// ISR (was force-dynamic → rendered every request, slow TTFB/LCP). Articles rarely change;
// cache the render and revalidate hourly (fetch tags:['blog'] still allow on-demand purge).
export const revalidate = 3600;

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
    const imageUrl =
      article.seo?.open_graph?.image ||
      article.seo?.twitter?.image ||
      article.seo?.image ||
      (article.cover ? getStorageUrl(article.cover) : '');
    const description = stripHtml(article.description_fr || article.description || '');
    const metaDescription =
      article.seo?.description ||
      article.seo_description ||
      article.meta_description_fr ||
      description ||
      `Découvrez ${article.designation_fr} sur le blog Protéine Tunisie — conseils nutrition et sport`;

    const canonicalUrl = article.seo?.canonical_url?.trim()
      ? forceProteinDomain(article.seo.canonical_url.trim())
      : buildCanonicalUrl(`/blog/${encodeURIComponent(article.slug || slug)}`);
    const title = article.seo?.title || article.seo_title || article.meta_title || article.designation_fr || 'Blog';
    const descriptionWithTunisia = metaDescription.includes('Tunisie') ? metaDescription : `${metaDescription} Conseils nutrition sportive Tunisie — Protéine Tunisie.`;
    const twitterImage = article.seo?.twitter?.image || imageUrl || '';
    return {
      title,
      description: descriptionWithTunisia.slice(0, 160),
      robots: {
        index: article.seo?.robots?.index ?? article.seo_robots_index ?? true,
        follow: article.seo?.robots?.follow ?? article.seo_robots_follow ?? true,
      },
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: article.seo?.open_graph?.title || title,
        description: article.seo?.open_graph?.description || descriptionWithTunisia.slice(0, 160),
        images: imageUrl ? [imageUrl] : ['/slides/home-hero-web.webp'],
        type: 'article',
        url: canonicalUrl,
      },
      twitter: {
        card: (article.seo?.twitter?.card as 'summary' | 'summary_large_image') || article.twitter_card as 'summary' | 'summary_large_image' || 'summary_large_image',
        title: article.seo?.twitter?.title || title,
        description: article.seo?.twitter?.description || descriptionWithTunisia.slice(0, 160),
        images: twitterImage ? [twitterImage] : ['/slides/home-hero-web.webp'],
      },
    };
  } catch (error) {
    return {
      title: 'Article | Blog Protéine Tunisie',
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
    const articleImageUrl = article.cover ? getStorageUrl(article.cover) : undefined;
    const articleSchema = buildArticleSchema(article, baseUrl, articleImageUrl);
    const breadcrumbSchema = buildBreadcrumbListSchema(
      [
        { name: 'Accueil', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: article.designation_fr || article.slug || 'Article', url: blogHref(article.slug || slug) },
      ],
      baseUrl
    );

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
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
