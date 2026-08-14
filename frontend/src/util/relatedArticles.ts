/**
 * RELATE ARTICLES BY WHAT THEY ARE ABOUT, NOT BY WHEN THEY WERE PUBLISHED.
 *
 * ── THE SHAPE THIS REPLACES ───────────────────────────────────────────────────────────────────
 * /blog/[slug] filled its "related articles" rail from getLatestArticles(), which returns the four
 * newest posts. Every one of 224 articles therefore linked to the same three URLs.
 *
 * As a link graph that is the worst available shape. Three articles collect 223 inbound links each
 * and the other 221 collect none, so the blog is a hub-and-spoke around whatever was published most
 * recently — and it stops being about anything the moment someone publishes a fifth post. It is also
 * a plausible contributor to the standing "184 of 224 published articles are unindexed": Google
 * discovers a page through links, and 221 of these have exactly one inbound link, from a paginated
 * listing.
 *
 * Relating by SUBJECT gives every article a handful of inbound links from posts about the same
 * thing, which is both a real crawl path and a topical signal. It costs one extra API call that was
 * already cached.
 *
 * ── WHY TITLE OVERLAP, RATHER THAN CATEGORIES ─────────────────────────────────────────────────
 * Because there are no categories. /api/blog_categories and /api/blog_tags both return `[]` — 224
 * articles with no taxonomy between them, which is why the taxonomy chips on the article page
 * render nothing and why /blog/category/{slug} is a 200 with no content.
 *
 * Building the taxonomy is the better long-term answer and is a separate job. This works today, on
 * the data that exists, with no migration and nothing for anyone to fill in.
 */
import type { Article } from '@/types';

/**
 * Words that carry no subject. French function words plus the terms that appear in nearly every
 * title on this blog — "tunisie" is in a large share of them, so scoring on it would relate every
 * article to every other one and rank them by length.
 */
const STOPWORDS = new Set([
  'avec', 'sans', 'pour', 'dans', 'chez', 'vers', 'plus', 'moins', 'tout', 'tous', 'toute', 'toutes',
  'cette', 'cette', 'votre', 'notre', 'leur', 'quel', 'quelle', 'quels', 'quelles', 'quoi', 'dont',
  'est', 'sont', 'etre', 'avoir', 'fait', 'faire', 'peut', 'peuvent', 'doit', 'doivent',
  'les', 'des', 'une', 'aux', 'par', 'sur', 'que', 'qui', 'pas', 'ses', 'son', 'sa', 'ce', 'ces',
  'comment', 'pourquoi', 'quand', 'combien', 'meilleur', 'meilleure', 'meilleurs', 'meilleures',
  'guide', 'top', 'bien', 'mieux', 'vraiment', 'aussi', 'entre', 'apres', 'avant',
  // Site-wide terms. Present in most titles, so they carry no discriminating power here.
  'tunisie', 'tunisien', 'tunisienne', 'prix', 'acheter', 'vente', 'boutique', 'protein', 'proteine',
]);

/** Accent-fold to a single ASCII character each, so "créatine" and "creatine" are one token. */
const FOLD: Record<string, string> = {
  à: 'a', â: 'a', ä: 'a', á: 'a', ã: 'a', å: 'a',
  ç: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', ö: 'o', õ: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ÿ: 'y', ñ: 'n',
};

function tokens(text: string): Set<string> {
  const folded = [...text.toLowerCase()].map((c) => FOLD[c] ?? c).join('');
  return new Set(
    folded
      .split(/[^a-z0-9]+/)
      // 4+ characters: "bcaa" and "whey" matter, "de"/"la"/"en" do not, and a 3-letter cutoff
      // lets "gym"/"kcal" in while keeping the stopword list from having to be exhaustive.
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  );
}

/**
 * Articles about the same subject as `current`, best first.
 *
 * Scoring is deliberately simple — shared significant tokens between titles — because the input is
 * a title, not a document. Anything cleverer (TF-IDF, embeddings) needs a corpus pass this page
 * cannot afford at render time, and would change what "related" means without anyone being able to
 * check it.
 *
 * Ties break towards the NEWER article, so an evergreen post surfaces the current take on a subject
 * rather than the oldest one.
 */
export function relatedArticles(
  current: Pick<Article, 'slug' | 'designation_fr'>,
  pool: Article[],
  limit = 6
): Article[] {
  const currentSlug = current.slug ?? '';
  const currentTokens = tokens(current.designation_fr ?? '');

  const scored = pool
    .filter((a) => a?.slug && a.slug !== currentSlug)
    .map((a) => {
      const t = tokens(a.designation_fr ?? '');
      let shared = 0;
      for (const token of currentTokens) if (t.has(token)) shared++;
      return { article: a, shared, at: a.created_at ? Date.parse(a.created_at) : 0 };
    })
    .filter((s) => s.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.at - a.at);

  /*
   * An article that shares nothing with any other gets the newest posts instead of an empty rail.
   * That is the OLD behaviour, kept deliberately as the fallback rather than the default: a rail
   * with nothing in it is a dead end for the reader and for the crawler, and "newest" is a weak
   * answer but not a wrong one.
   */
  if (scored.length < limit) {
    const have = new Set(scored.map((s) => s.article.slug));
    for (const a of pool) {
      if (scored.length >= limit) break;
      if (!a?.slug || a.slug === currentSlug || have.has(a.slug)) continue;
      scored.push({ article: a, shared: 0, at: a.created_at ? Date.parse(a.created_at) : 0 });
      have.add(a.slug);
    }
  }

  return scored.slice(0, limit).map((s) => s.article);
}
