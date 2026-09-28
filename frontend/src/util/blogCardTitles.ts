import type { Article } from '@/types';
import { getBlogSeoEntry } from '@/config/blogSeoConfig';

/**
 * The title a LINK to an article shows — its current SEO headline, not the raw database title.
 *
 * SERVER ONLY. This imports config/blogSeoConfig.ts (~180 KB). Call it in the server page that
 * fetches the list and hand the result to the client component; never import it from a
 * 'use client' module, or every visitor downloads the whole config.
 *
 * ── WHY ────────────────────────────────────────────────────────────────────────────────────────
 * Articles were retitled away from commercial "X Tunisie / prix / meilleur" queries so they stop
 * competing with the category that should own them — but only through `blogSeoConfig`, which the
 * article page reads for its own <title>/H1. Every card that LINKS to the article (the /blog index,
 * the homepage band, the related rail, blog category/tag pages) rendered `designation_fr`, the old
 * title. Audit 28/09/2026: 42 of 89 crawled posts showed a different title on their card than on
 * their page; of 556 blog→blog links, 193 carried "créatine/whey/protéine/gainer + tunisie/prix/
 * meilleur" anchor text — the retitles never reached the internal links that carry the most weight.
 *
 * Same precedence as the article page (blog/[slug]/page.tsx): the overlay's headline wins.
 */
export function withSeoHeadlines<T extends Pick<Article, 'slug' | 'designation_fr'>>(
  articles: T[] | null | undefined
): T[] {
  if (!Array.isArray(articles)) return [];
  return articles.map((article) => {
    const headline = getBlogSeoEntry(article?.slug)?.headline?.trim();
    return headline && headline !== article.designation_fr ? { ...article, designation_fr: headline } : article;
  });
}
