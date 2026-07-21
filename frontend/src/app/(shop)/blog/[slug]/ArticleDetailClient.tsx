'use client';

import Link from 'next/link';
import { SafeImage } from '@/app/components/SafeImage';
import { Button } from '@/app/components/ui/button';
import { BlogRecommendedProducts } from '@/app/(shop)/blog/BlogRecommendedProducts';
import { BlogCard } from '@/app/(shop)/blog/BlogCard';
import { ArrowLeft, Calendar, Clock, Share2, Sparkles, FolderOpen, Tag } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import type { Article, BlogTagSummary } from '@/types';
import { getStorageUrl } from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface ArticleDetailClientProps {
  article: Article;
  relatedArticles: Article[];
  /** Optional SEO block (FAQ + internal links) rendered between content and related articles */
  children?: React.ReactNode;
}

// Decode HTML entities properly (server-safe, no window/document)
function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  // Server-safe decoding (no window/document to avoid hydration mismatch)
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&egrave;/g, 'è')
    .replace(/&Egrave;/g, 'È')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&Ecirc;/g, 'Ê')
    .replace(/&euml;/g, 'ë')
    .replace(/&Euml;/g, 'Ë')
    .replace(/&agrave;/g, 'à')
    .replace(/&Agrave;/g, 'À')
    .replace(/&acirc;/g, 'â')
    .replace(/&Acirc;/g, 'Â')
    .replace(/&auml;/g, 'ä')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&Ocirc;/g, 'Ô')
    .replace(/&ouml;/g, 'ö')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&Ugrave;/g, 'Ù')
    .replace(/&ucirc;/g, 'û')
    .replace(/&Ucirc;/g, 'Û')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&iacute;/g, 'í')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&iuml;/g, 'ï')
    .replace(/&Iuml;/g, 'Ï');
}

// Strip HTML to plain text (for reading time and ChatGPT prompt)
function stripHtmlToText(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Calculate reading time based on content
function calculateReadingTime(content: string): number {
  if (!content) return 1;
  const text = stripHtmlToText(content);
  const words = text.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/** Split article HTML so we can insert "Produits recommandés" in the middle (after ~2nd paragraph). */
function splitContentForMiddleInsert(html: string): [string, string] {
  if (!html || !html.trim()) return ['', ''];
  const closeP = /<\/p\s*>/gi;
  let match: RegExpExecArray | null;
  let count = 0;
  let lastIndex = 0;
  while ((match = closeP.exec(html)) !== null && count < 2) {
    count++;
    lastIndex = match.index + match[0].length;
  }
  if (count >= 2) {
    return [html.slice(0, lastIndex), html.slice(lastIndex)];
  }
  if (count === 1) {
    return [html.slice(0, lastIndex), html.slice(lastIndex)];
  }
  return [html, ''];
}

const CHATGPT_BASE = 'https://chat.openai.com/';
/** Max length for ChatGPT ?q= param (browser URL limits); longer prompts go to clipboard only */
const CHATGPT_QUERY_MAX_LEN = 2000;

const articleBodyProseClass =
  'article-content prose prose-neutral prose-base lg:prose-lg dark:prose-invert max-w-none ' +
  // Responsive CMS content: wide tables scroll inside themselves (no horizontal body scroll on phones)
  '[&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto [&_pre]:overflow-x-auto ' +
  'prose-headings:text-gray-900 dark:prose-headings:text-white ' +
  'prose-p:text-gray-700 dark:prose-p:text-gray-300 ' +
  'prose-strong:text-gray-900 dark:prose-strong:text-white ' +
  'prose-ul:text-gray-700 dark:prose-ul:text-gray-300 ' +
  'prose-ol:text-gray-700 dark:prose-ol:text-gray-300 ' +
  'prose-li:text-gray-700 dark:prose-li:text-gray-300 ' +
  'prose-img:rounded-lg prose-img:shadow-md ' +
  'prose-blockquote:border-l-red-600 dark:prose-blockquote:border-l-red-400 ' +
  'prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 ' +
  'prose-code:text-red-600 dark:prose-code:text-red-400 ' +
  'prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800';

/** Resolved `dir` for the article body (explicit CMS value, or auto from `content_lang`). */
function resolveArticleBodyDir(article: Article): 'ltr' | 'rtl' | undefined {
  const raw = (article.content_text_direction ?? 'auto').toString().toLowerCase();
  if (raw === 'rtl' || raw === 'ltr') {
    return raw;
  }
  const lang = (article.content_lang ?? '').toString().toLowerCase();
  if (
    lang.startsWith('ar') ||
    lang.startsWith('he') ||
    lang.startsWith('fa') ||
    lang.startsWith('ur') ||
    lang.startsWith('yi')
  ) {
    return 'rtl';
  }
  return undefined;
}

export function ArticleDetailClient({ article, relatedArticles, children }: ArticleDetailClientProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const articleDate = article.created_at ? new Date(article.created_at) : new Date();
  const content = article.description_fr || article.description || '';
  const readingTime = useMemo(() => calculateReadingTime(content), [content]);
  const [contentBefore, contentAfter] = useMemo(() => splitContentForMiddleInsert(content), [content]);

  // Real taxonomy links for this article → gives every /blog/category & /blog/tag page an
  // inbound link (fixes orphaned taxonomy pages). Only render fields the API actually returns.
  const articleCategories = (article.categories ?? []).filter((c) => c?.slug && c?.name);
  const articleTags = (article.tags ?? []).filter(
    (t): t is BlogTagSummary => typeof t === 'object' && t !== null && !!t.slug && !!t.name
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Make links in article content open in new tab and look clickable (backlinks)
  useEffect(() => {
    if (!mounted || !contentRef.current) return;
    const links = contentRef.current.querySelectorAll('a[href^="http"]');
    links.forEach((el) => {
      const a = el as HTMLAnchorElement;
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      a.classList.add('article-link');
    });
  }, [mounted, content]);

  const handleShare = () => {
    if (!mounted || typeof window === 'undefined') return;
    
    if (navigator.share) {
      navigator.share({
        title: article.designation_fr,
        text: article.description_fr || '',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papiers !');
    }
  };

  const handleSummarizeWithChatGPT = () => {
    if (typeof window === 'undefined') return;
    const title = decodeHtmlEntities(article.designation_fr || '');
    const url = window.location.href;
    const plainText = stripHtmlToText(content);
    const fullPrompt = `Résume cet article en quelques points clés.\n\nTitre: ${title}\nURL: ${url}\n\n--- Contenu ---\n\n${plainText}`;

    const copyAndOpen = (chatUrl: string, message: string) => {
      navigator.clipboard.writeText(fullPrompt).then(() => {
        window.open(chatUrl, '_blank', 'noopener,noreferrer');
        toast.success(message);
      }).catch(() => {
        window.open(chatUrl, '_blank', 'noopener,noreferrer');
        toast.info('Ouvrez ChatGPT et collez le contenu depuis le presse-papiers (Ctrl+V).');
      });
    };

    if (fullPrompt.length <= CHATGPT_QUERY_MAX_LEN) {
      const chatUrl = `${CHATGPT_BASE}?q=${encodeURIComponent(fullPrompt)}`;
      copyAndOpen(chatUrl, 'ChatGPT ouvert avec le contenu dans la zone de dialogue.');
    } else {
      const shortPrompt = `Résume l'article suivant. Le contenu complet est déjà copié dans le presse-papiers : collez (Ctrl+V) ici puis envoyez.\n\nTitre: ${title}\nURL: ${url}`;
      const chatUrl = `${CHATGPT_BASE}?q=${encodeURIComponent(shortPrompt)}`;
      copyAndOpen(chatUrl, 'Contenu copié. Collez (Ctrl+V) dans la zone de dialogue puis envoyez pour le résumé.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div>
          {/* Back to blog — real link so the "Retour au blog" label is truthful for search/social arrivals */}
          <Button
            asChild
            variant="ghost"
            className="mb-4 sm:mb-6 min-h-11 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <Link href="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au blog
            </Link>
          </Button>

          <article className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Article Header */}
            <header className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
              <span className="inline-flex items-center gap-2 mb-3 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400">
                <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
                Blog
              </span>
              <h1 className="font-display uppercase tracking-tight leading-[1.1] sm:leading-[1.05] font-bold text-gray-900 dark:text-white text-2xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-balance break-words">
                {decodeHtmlEntities(article.designation_fr || '')}
              </h1>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
                  <span>{format(articleDate, 'd MMMM yyyy', { locale: fr })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
                  <span>{readingTime} min de lecture</span>
                </div>
                <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSummarizeWithChatGPT}
                    className="min-h-11 w-full justify-center border-gray-200 text-gray-700 hover:border-red-600 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-400 dark:hover:text-red-400 sm:w-auto"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Résumer avec ChatGPT
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="min-h-11 w-full justify-center text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 sm:w-auto"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                </div>
              </div>
            </header>

            {/* Cover Image */}
            {article.cover && (
              <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 mb-6 sm:mb-8 overflow-hidden">
                <SafeImage
                  src={getStorageUrl(article.cover, article.updated_at || article.created_at)}
                  alt={article.designation_fr || 'Article cover'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 896px"
                  priority
                />
              </div>
            )}

            {/* Article Content – first part, then "Achetez les produits de cet article" in the middle, then rest of content */}
            <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
              <div
                ref={contentRef}
                dir={resolveArticleBodyDir(article)}
                lang={article.content_lang?.trim() ? article.content_lang.trim() : undefined}
                className="article-body-root min-w-0 [dir=rtl]:text-right"
              >
                {contentBefore && (
                  <div
                    className={articleBodyProseClass}
                    dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(contentBefore) }}
                  />
                )}
                <BlogRecommendedProducts
                  article={article}
                  categorySlug={article.category_slug}
                  recommendedProductSlugs={article.recommended_product_slugs ?? []}
                  title="Achetez les produits de cet article"
                  variant="inline"
                />
                {contentAfter && (
                  <div
                    className={articleBodyProseClass}
                    dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(contentAfter) }}
                  />
                )}
              </div>
              {article.related_shop_categories && article.related_shop_categories.length > 0 ? (
                <nav
                  className="mt-8 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 sm:p-6"
                  aria-label="Catégories boutique liées"
                >
                  <h2 className="font-display uppercase tracking-tight text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Voir aussi sur la boutique
                  </h2>
                  <ul className="flex flex-wrap gap-2 sm:gap-3">
                    {article.related_shop_categories.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/${encodeURIComponent(c.slug)}`}
                          className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-100 hover:border-red-300 hover:text-red-600 dark:hover:border-red-800 dark:hover:text-red-400 transition-colors"
                        >
                          {c.slug.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
              {(articleCategories.length > 0 || articleTags.length > 0) && (
                <nav
                  className="mt-8 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-800 pt-6"
                  aria-label="Catégorie et tags de l'article"
                >
                  {articleCategories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="inline-flex items-center gap-1.5 font-display text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                        <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        Catégorie
                      </span>
                      {articleCategories.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/blog/category/${c.slug}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-100 transition-colors hover:border-red-600 hover:text-red-600 dark:hover:border-red-400 dark:hover:text-red-400"
                        >
                          {decodeHtmlEntities(c.name)}
                        </Link>
                      ))}
                    </div>
                  )}
                  {articleTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 font-display text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                        <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                        Tags
                      </span>
                      {articleTags.map((t) => (
                        <Link
                          key={t.slug}
                          href={`/blog/tag/${t.slug}`}
                          className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-1 text-sm text-gray-700 dark:text-gray-300 transition-colors hover:border-red-600 hover:text-red-600 dark:hover:border-red-400 dark:hover:text-red-400"
                        >
                          {decodeHtmlEntities(t.name)}
                        </Link>
                      ))}
                    </div>
                  )}
                </nav>
              )}
              {children}
            </div>
          </article>

          {/* Internal linking: creatine category CTA for creatine-related articles */}
          {/\bcréatine\b|\bcreatine\b/i.test(`${article.designation_fr ?? ''} ${article.description_fr ?? ''}`) && (
            <div className="mt-6 p-4 sm:p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Prêt à passer à l'action ?</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <Link href="/creatine" className="text-red-600 dark:text-red-400 font-medium hover:underline">Voir toutes nos créatines disponibles en Tunisie</Link> : monohydrate, micronisée, Creapure®, capsules — livraison rapide et paiement à la livraison partout en Tunisie.
              </p>
            </div>
          )}
          {/* Internal linking: whey category for whey-related articles */}
          {/\bwhey\b|\bprot[eé]ine\s+(lactos[eé]rum|lait)\b/i.test(`${article.designation_fr ?? ''} ${article.description_fr ?? ''}`) && (
            <div className="mt-6 p-4 sm:p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <Link href="/proteine-whey" className="text-red-600 dark:text-red-400 font-medium hover:underline">Whey protein Tunisie</Link> au meilleur prix : livraison rapide, produits originaux. <Link href="/proteine-whey" className="text-red-600 dark:text-red-400 hover:underline">Acheter whey en Tunisie</Link> – découvrez notre sélection de <Link href="/proteine-whey" className="text-red-600 dark:text-red-400 hover:underline">meilleure whey protein</Link> sur Proteine Tunisie.
              </p>
            </div>
          )}

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-8 sm:mt-12 lg:mt-16 pt-8 sm:pt-12 border-t border-gray-200 dark:border-gray-800">
              <h2 className="font-display uppercase tracking-tight leading-[0.95] text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">
                Articles similaires
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {relatedArticles.map((related) => (
                  <BlogCard key={related.id} article={related} titleAs="h3" />
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog Button */}
          <div className="mt-8 sm:mt-12 text-center">
            <Button
              asChild
              variant="outline"
              className="min-h-11 rounded-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-500 dark:hover:bg-red-500"
            >
              <Link href="/blog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voir tous les articles
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <ScrollToTop />
    </div>
  );
}
