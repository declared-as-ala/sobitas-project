import { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { getErrorStatus } from '@/util/errorStatus';
import { getLatestArticles } from '@/services/api';
// Request-scoped cache: generateMetadata + the page body used to issue TWO separate
// article_details calls, doubling 429 pressure and letting metadata fail while the body succeeded.
import { getCachedArticleDetails as getArticleDetails } from '@/services/getCachedProductDetails';
import { getStorageUrl } from '@/services/api';
import { resolveCanonicalUrl } from '@/util/canonical';
import { htmlToText, truncateAtWord } from '@/util/sanitizeProductHtml';
import { resolveArticleLanguage } from '@/util/articleLanguage';
import { buildArticleSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { blogHref } from '@/util/blogSlug';
import { BlogSeoBlock } from '@/app/(shop)/blog/BlogSeoBlock';
import { ArticleDetailClient } from './ArticleDetailClient';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// ISR (was force-dynamic → rendered every request, slow TTFB/LCP). Articles rarely change;
// cache the render and revalidate hourly (fetch tags:['blog'] still allow on-demand purge).
export const revalidate = 3600;

/**
 * Plain text for a meta description.
 *
 * Delegates to htmlToText because it DECODES entities. The hand-rolled version here stripped tags
 * and left "&eacute;" alone, so it survived into the description and was escaped a second time on
 * its way into the attribute — Google was served, and showed searchers, the literal text
 * "Meilleure prot&eacute;ine pour maigrir". Measured across the blog sitemap: 21 of 40 posts
 * sampled were affected, and the blog carries this site's largest impression counts.
 *
 * Same defect, same cause and same fix as the category descriptions in #192; this path was simply
 * missed. There is now one decoder, so a third copy of this bug has nowhere to live.
 */
function stripHtml(html: string): string {
  return htmlToText(html, 160);
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
    // htmlToText wraps the RESOLVED value, not just the fallback: seo.description and
    // meta_description_fr are CMS fields and carry the same raw entities.
    const metaDescription = htmlToText(
      article.seo?.description ||
        article.seo_description ||
        article.meta_description_fr ||
        description ||
        `Découvrez ${article.designation_fr} sur le blog Protéine Tunisie — conseils nutrition et sport`,
      500
    );

    // forceProteinDomain only normalised the HOST — an off-domain host, a dead path or an
    // unparseable value passed through untouched. The guard validates the whole URL.
    const canonicalUrl = await resolveCanonicalUrl(
      article.seo?.canonical_url,
      `/blog/${encodeURIComponent(article.slug || slug)}`
    );
    const articleLanguage = resolveArticleLanguage(article);
    const title = article.seo?.title || article.seo_title || article.meta_title || article.designation_fr || 'Blog';
    const descriptionWithTunisia = metaDescription.includes('Tunisie') ? metaDescription : `${metaDescription} Conseils nutrition sportive Tunisie — Protéine Tunisie.`;
    const twitterImage = article.seo?.twitter?.image || imageUrl || '';
    return {
      title,
      // truncateAtWord, not .slice(): the top Arabic article (5,834 impressions, 0.29% CTR)
      // was ending its snippet on a dangling single letter because 160 landed mid-word.
      description: truncateAtWord(descriptionWithTunisia, 160),
      robots: {
        index: article.seo?.robots?.index ?? article.seo_robots_index ?? true,
        follow: article.seo?.robots?.follow ?? article.seo_robots_follow ?? true,
      },
      alternates: {
        canonical: canonicalUrl,
        // Declare the language this article is ACTUALLY written in. 31 of 100 posts are Arabic and
        // were all announced as French, which asks Google to judge Arabic prose against French
        // queries. resolveArticleLanguage prefers the CMS content_lang column and falls back to
        // script detection, because that column is NULL on every Arabic article.
        languages: { [articleLanguage.code]: canonicalUrl },
      },
      openGraph: {
        title: article.seo?.open_graph?.title || title,
        description: article.seo?.open_graph?.description || truncateAtWord(descriptionWithTunisia, 160),
        images: imageUrl ? [imageUrl] : ['/og-banner.jpg'],
        type: 'article',
        url: canonicalUrl,
        locale: articleLanguage.ogLocale,
      },
      twitter: {
        card: (article.seo?.twitter?.card as 'summary' | 'summary_large_image') || article.twitter_card as 'summary' | 'summary_large_image' || 'summary_large_image',
        title: article.seo?.twitter?.title || title,
        description: article.seo?.twitter?.description || truncateAtWord(descriptionWithTunisia, 160),
        images: twitterImage ? [twitterImage] : ['/og-banner.jpg'],
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    // Genuine 404: the page body below calls notFound() and Next serves a real 404. Mark the
    // interim metadata noindex so the shell is never indexable.
    if (getErrorStatus(error) === 404) {
      return {
        title: 'Article introuvable | Blog Protéine Tunisie',
        robots: { index: false, follow: false },
      };
    }
    // TRANSIENT (429/5xx/network). Swallowing it here is what emitted a cacheable HTTP 200 with
    // the generic title "Article | Blog Protéine Tunisie" and NO canonical while the article
    // body rendered fine — the duplicate, canonical-less shell measured under crawl load.
    // Rethrow so Next returns an uncached 5xx (revalidate=3600 would otherwise pin it an hour).
    throw error;
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  
  try {
    // relatedArticles is incidental — its failure must not 404 the article itself.
    const [article, relatedArticles] = await Promise.all([
      getArticleDetails(slug),
      getLatestArticles().catch(() => [] as Awaited<ReturnType<typeof getLatestArticles>>),
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
    // Preserve the notFound() thrown for a genuinely missing article inside the try.
    unstable_rethrow(error);
    console.error('Error fetching article:', error);
    // Genuine backend 404 → real 404. Transient failure → rethrow so this ISR route doesn't
    // cache a wrong 404 for a healthy article for the whole revalidate window (1h here).
    if (getErrorStatus(error) === 404) notFound();
    throw error;
  }
}


/**
 * Opt this route into the Full Route Cache. See the long note in app/(shop)/[slug]/page.tsx —
 * Next only registers a dynamic segment in prerenderManifest.dynamicRoutes when the route exports
 * generateStaticParams, and without that entry `export const revalidate` is inert and every
 * request re-renders. An EMPTY array is sufficient: on-demand ISR then covers every path.
 * Deliberately NOT enumerating the catalogue — `next build` runs in CI where Cloudflare 403s the
 * runner, so a fetched list would come back empty or partial and bake bad pages.
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}
