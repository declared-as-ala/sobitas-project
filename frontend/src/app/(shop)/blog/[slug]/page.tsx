import { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { getErrorStatus } from '@/util/errorStatus';
import { getLatestArticles, getAllArticles, getCategories } from '@/services/api';
import { relatedArticles as pickRelatedArticles } from '@/util/relatedArticles';
import { excludeLinkedDestinations, targetsFromTaxonomy, type LinkTarget } from '@/util/internalLinks';
// Request-scoped cache: generateMetadata + the page body used to issue TWO separate
// article_details calls, doubling 429 pressure and letting metadata fail while the body succeeded.
import { getCachedArticleDetails as getArticleDetails } from '@/services/getCachedProductDetails';
import { getStorageUrl, toSiteMedia } from '@/services/api';
import { resolveCanonicalUrl } from '@/util/canonical';
import { buildMetaDescription, htmlToText } from '@/util/sanitizeProductHtml';
import { resolveArticleLanguage, buildArticleTitle, localityHint, isArabicArticle } from '@/util/articleLanguage';
import { buildArticleSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { sanitizeArticleHtml } from '@/util/sanitizeArticleHtml';
import { blogHref } from '@/util/blogSlug';
import { BlogSeoBlock } from '@/app/(shop)/blog/BlogSeoBlock';
import { getBlogSeoEntry, resolveBlogSeoLinks } from '@/config/blogSeoConfig';
import { blogCommercialCategory } from '@/util/blogCommercialCategory';
import { taxonomyDepth } from '@/config/catalogTaxonomy';
import { loadCategoryStockFacts } from '@/util/loadCategoryStockFacts';
import { resolveCategoryFaqs, resolveCategoryIntroHtml } from '@/util/resolveCategorySeo';
import { withSeoHeadlines } from '@/util/blogCardTitles';
import { BlogInStockProducts } from '@/app/components/blog/BlogInStockProducts';
import { ArticleDetailClient, type BlogCommerceBridgeData } from './ArticleDetailClient';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// ISR (was force-dynamic → rendered every request, slow TTFB/LCP). Articles rarely change;
// cache the render and revalidate hourly (fetch tags:['blog'] still allow on-demand purge).
// Rendered dynamically (was ISR): the root layout resolves locale via next-intl request-time APIs,
// which throw under ISR/static generation → 500. Force dynamic so every render has a request scope.
// See the fuller note in app/(shop)/[slug]/[productSlug]/page.tsx.
export const dynamic = 'force-dynamic';

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

/** Decode multiply escaped CMS whitespace before the shared, single-pass text sanitizer. */
function buildArticleDescription(raw: string, title: string): string {
  return buildMetaDescription(raw.replace(/&(?:amp;)+(?:nbsp|#160|#x0*a0);/gi, ' '), {
    title,
    maxLen: 500,
  });
}

/**
 * Turn the legacy editorial opening paragraph into one structured commerce bridge.
 *
 * `openingLinkHtml` used to be prepended to the CMS body as raw prose. That gave the category its
 * link, but it also left the page with three separate routes to the same shelf: the opening link,
 * the automatic in-body linker and the generic CTA below the article. One deliberate bridge is
 * clearer for readers and gives crawlers one unambiguous commercial destination.
 */
function buildCommerceBridge(openingLinkHtml?: string, lang?: 'fr' | 'ar'): BlogCommerceBridgeData | undefined {
  const html = openingLinkHtml?.trim();
  if (!html) return undefined;

  const match = html.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if (!match) return undefined;

  const href = match[1]?.trim();
  const label = htmlToText(match[2] ?? '', 120);
  if (!href?.startsWith('/') || !label) return undefined;

  // The legacy paragraph wrapped the anchor in free-form prose. Removing the anchor often leaves
  // broken fragments (for example, "vous pouvez ."), so the component supplies concise,
  // translated supporting copy while this parser keeps the editorial destination and anchor.
  return { href, label, context: '', lang };
}

/**
 * The only shop categories an article body may be linked into.
 *
 * The taxonomy also holds lifestyle hubs — "SANTÉ & VITALITÉ", "Glucides & Énergie",
 * "Sommeil & Stress", "PERFORMANCE", "Digestion & Transit" — whose names reduce to the ordinary
 * words "santé", "énergie", "stress", "performance", "digestion". Those words occur in every
 * article, so those hubs were winning four of the six link slots on anchors that say nothing about
 * where they lead, and the pages that actually sell were left with a bare-word anchor or none
 * (measured on the live bodies, 22/09/2026). This list is the commercial set; everything else in
 * the taxonomy is reachable from the nav and the category pages, not from the prose.
 */
const LINKABLE_CATEGORY_SLUGS = [
  'proteines', 'whey-proteine', 'whey-isolate', 'whey-hydrolysee', 'caseine',
  'proteines-vegetales', 'proteines-multi-sources', 'proteine-de-boeuf', 'barres-proteinees',
  'creatine', 'bcaa', 'eaa', 'acides-amines', 'glutamine', 'beta-alanine', 'citrulline', 'l-arginine',
  'pre-workout', 'post-workout',
  'prise-de-masse', 'mass-gainers', 'gainers-proteines',
  'perte-de-poids', 'bruleurs-de-graisse', 'l-carnitine', 'cla',
  'omega-3', 'vitamines', 'mineraux', 'magnesium', 'zinc', 'collagene',
] as const;

const ARTICLE_TOPIC_PATTERNS = [
  /\bwhey\b/i,
  /cr[eé]atine/i,
  /om[eé]ga\s*3/i,
  /magn[eé]sium/i,
  /\bbcaa\b/i,
  /pre[- ]?workout/i,
  /gainer|prise de masse/i,
  /collag[eè]ne/i,
];

/**
 * Keep a Filament SEO title when it names the article's subject. If a generic campaign title drops
 * that subject, use the concise first clause of the visible H1 instead. This is deliberately an
 * alignment guard, not an override table: editors still control every topic-aligned title.
 */
function topicAlignedArticleHeadline(preferred: string, visibleHeadline: string): string {
  const preferredTitle = preferred.trim();
  const visibleTitle = visibleHeadline.trim();
  if (!visibleTitle) return preferredTitle;

  const visibleIsArabic = /[\u0600-\u06ff]/u.test(visibleTitle);
  const preferredIsArabic = /[\u0600-\u06ff]/u.test(preferredTitle);
  const dropsLanguage = visibleIsArabic && !preferredIsArabic;
  const dropsCoreTopic = ARTICLE_TOPIC_PATTERNS.some(
    (pattern) => pattern.test(visibleTitle) && !pattern.test(preferredTitle)
  );

  if (preferredTitle && !dropsLanguage && !dropsCoreTopic) return preferredTitle;

  const firstClause = visibleTitle.split(/\s+(?:[|—–])\s+|\s*[:?!]\s*/u, 1)[0]?.trim();
  return firstClause && firstClause.length >= 12 ? firstClause : visibleTitle;
}

/**
 * Apply the same alignment rule to snippets. A generic campaign description is useful across a
 * landing page, but on an article it can erase the exact subject that earned the impression.
 * Preserve topic-aligned editor copy; otherwise fall back to the article's own opening text.
 */
function topicAlignedArticleDescription(
  preferred: string,
  articleOpening: string,
  visibleHeadline: string
): string {
  const preferredDescription = preferred.trim();
  const opening = articleOpening.trim();
  const visibleTitle = visibleHeadline.trim();
  if (!preferredDescription) return opening;

  const visibleIsArabic = /[\u0600-\u06ff]/u.test(visibleTitle);
  const preferredIsArabic = /[\u0600-\u06ff]/u.test(preferredDescription);
  const dropsLanguage = visibleIsArabic && !preferredIsArabic;
  const dropsCoreTopic = ARTICLE_TOPIC_PATTERNS.some(
    (pattern) => pattern.test(visibleTitle) && !pattern.test(preferredDescription)
  );

  return !dropsLanguage && !dropsCoreTopic ? preferredDescription : opening || preferredDescription;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getArticleDetails(slug);
    const seoOverlay = getBlogSeoEntry(slug);
    // Same-origin like every rendered image (toSiteMedia): the CMS stores absolute admin URLs.
    const imageUrl = toSiteMedia(
      article.seo?.open_graph?.image ||
      article.seo?.twitter?.image ||
      article.seo?.image ||
      (article.cover ? getStorageUrl(article.cover) : '')
    );
    const description = stripHtml(article.description_fr || article.description || '');
    // The headline, resolved BEFORE the description because the description is built relative to
    // it — an article body opens with its own headline, so stripping tags leaves the title
    // restated as the first words of the snippet.
    const storedHeadline =
      seoOverlay?.headline || article.seo?.title || article.seo_title || article.meta_title || article.designation_fr || 'Blog';
    /*
     * 05/10/2026: the overlay in blogSeoConfig is reviewed copy, and it wins. The alignment guards
     * below were written for Filament campaign titles, so they compare against the CMS
     * `designation_fr` — which on an overlaid post is the STALE title. When the overlay dropped a
     * topic word that old title still had (whey, créatine, gainer, prise de masse), the guard threw
     * the reviewed copy away: live, 5 of 136 posts printed a <title> that was not their H1 (e.g.
     * "ISO 100 de Dymatize | Protéine Tunisie" over the H1 "ISO 100 de Dymatize : avis, composition
     * et alternatives"), and 8 reviewed meta descriptions were discarded. The visible H1 and the
     * Article schema already use the overlay, so the <title> now says the same thing. The guards
     * stay for CMS-only posts, which behave exactly as before.
     */
    const overlayHeadline = seoOverlay?.headline?.trim();
    const articleHeadline = overlayHeadline
      ? overlayHeadline
      : topicAlignedArticleHeadline(storedHeadline, article.designation_fr || storedHeadline);

    // buildMetaDescription wraps the RESOLVED value, not just the fallback: seo.description and
    // meta_description_fr are CMS fields and carry the same raw entities AND the same repeated
    // headline. It decodes, drops that repetition, and truncates on a word boundary.
    const storedDescription =
      seoOverlay?.metaDescription || article.seo?.description || article.seo_description || article.meta_description_fr || '';
    const overlayDescription = seoOverlay?.metaDescription?.trim();
    const alignedDescription = overlayDescription
      ? overlayDescription
      : topicAlignedArticleDescription(storedDescription, description, article.designation_fr || articleHeadline);
    const metaDescription = buildArticleDescription(
      alignedDescription ||
        `Découvrez ${article.designation_fr} sur le blog Protéine Tunisie — conseils nutrition et sport`,
      articleHeadline
    );

    // forceProteinDomain only normalised the HOST — an off-domain host, a dead path or an
    // unparseable value passed through untouched. The guard validates the whole URL.
    const canonicalUrl = await resolveCanonicalUrl(
      article.seo?.canonical_url,
      `/blog/${encodeURIComponent(article.slug || slug)}`
    );
    const articleLanguage = resolveArticleLanguage(article);
    /* Branded here rather than by the root layout's `%s | Protéine Tunisie` template. On an Arabic
       headline that template produces a bidirectional string whose Latin run the bidi algorithm
       moves to the visual START — an Arabic searcher sees the French brand first and the headline
       they typed second. See buildArticleTitle for the five articles this is measured on. */
    const title = buildArticleTitle(articleHeadline, articleLanguage);
    // 05/10/2026: a reviewed overlay description is written to fit the snippet on its own.
    // localityHint appended "Conseils nutrition sportive Tunisie — Protéine Tunisie." and truncated
    // the copy to make room, which cut 124 of 136 overlay descriptions mid-sentence.
    const descriptionWithTunisia = overlayDescription ? metaDescription : localityHint(metaDescription, articleLanguage);
    // CMS social overrides need the same entity decoding, title removal and locality budget.
    const socialDescription = (raw?: string | null) => localityHint(
      buildArticleDescription(raw || metaDescription, articleHeadline),
      articleLanguage
    );
    const twitterImage = toSiteMedia(article.seo?.twitter?.image || imageUrl || '');
    return {
      // absolute: `title` already carries the brand. Without this the template appends it AGAIN,
      // which is the defect on the French side and doubles the French one on the Arabic side.
      title: { absolute: title },
      // localityHint reserves space before word-safe truncation, including the ellipsis.
      description: descriptionWithTunisia,
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
        title: seoOverlay?.headline ? title : article.seo?.open_graph?.title || title,
        description: socialDescription(seoOverlay?.metaDescription || article.seo?.open_graph?.description),
        images: imageUrl ? [imageUrl] : ['/og-banner.jpg'],
        type: 'article',
        url: canonicalUrl,
        locale: articleLanguage.ogLocale,
      },
      twitter: {
        card: (article.seo?.twitter?.card as 'summary' | 'summary_large_image') || article.twitter_card as 'summary' | 'summary_large_image' || 'summary_large_image',
        title: seoOverlay?.headline ? title : article.seo?.twitter?.title || title,
        description: socialDescription(seoOverlay?.metaDescription || article.seo?.twitter?.description),
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
    /*
     * relatedArticles, the article pool and the taxonomy are all incidental — no failure among them
     * may 404 the article itself.
     *
     * getAllArticles() is the pool the related rail is chosen FROM. It is one cached call
     * (next: { tags: ['blog'] }) and it replaces a rail that was the same three URLs on every one of
     * 224 articles — see util/relatedArticles.ts for why that shape was worth spending a call on.
     */
    const [article, latestArticles, articlePool, categories] = await Promise.all([
      getArticleDetails(slug),
      getLatestArticles().catch(() => [] as Awaited<ReturnType<typeof getLatestArticles>>),
      getAllArticles().catch(() => [] as Awaited<ReturnType<typeof getAllArticles>>),
      // 200, not 50: every category must be a candidate link target, or the ones past the 50th
      // (commercial categories the blog should feed) are silently excluded from in-content linking.
      getCategories(undefined, { perPage: 200 }).catch(() => []),
    ]);

    if (!article) {
      notFound();
    }

    const seoOverlay = getBlogSeoEntry(slug);
    const categorySlug = blogCommercialCategory(slug);
    const factToken = /\{(?:prixMin|prixMax|nbEnStock)\}/;
    const hasFaqFactTokens = seoOverlay?.faqs.some((faq) => factToken.test(faq.answer)) ?? false;
    const hasOpeningFactTokens = factToken.test(seoOverlay?.openingLinkHtml ?? '');
    const categoryFacts = categorySlug && (hasFaqFactTokens || hasOpeningFactTokens)
      ? await loadCategoryStockFacts(taxonomyDepth(categorySlug) === 0
        ? { categories: [categorySlug], subcategories: [] }
        : { subcategories: [categorySlug], categories: [] })
      : null;
    const safeFacts = categoryFacts ?? { priceMin: null, priceMax: null, inStockCount: null };
    const resolvedFaqs = seoOverlay && hasFaqFactTokens
      ? resolveCategoryFaqs(seoOverlay.faqs, safeFacts)
      : seoOverlay?.faqs;
    const openingLinkHtml = seoOverlay?.openingLinkHtml && hasOpeningFactTokens
      ? resolveCategoryIntroHtml(seoOverlay.openingLinkHtml, safeFacts)
      : seoOverlay?.openingLinkHtml;
    const commerceBridge = buildCommerceBridge(openingLinkHtml, seoOverlay?.lang);
    const displayArticle = seoOverlay
      ? {
          ...article,
          designation_fr: seoOverlay.headline || article.designation_fr,
          // No year rewriting: `.replace(/2025/g, '2026')` made 2025 price tables read as current. The
          // bodies were refreshed in the DB on 28/09/2026 (resources/seo/product-edits/2026-09-28c-…),
          // so what remains of '2025' is historical and must stay as written.
          description_fr: sanitizeArticleHtml(seoOverlay.bodyOverrideHtml || article.description_fr),
          description: sanitizeArticleHtml(seoOverlay.bodyOverrideHtml || article.description),
          updated_at: seoOverlay.dateModified || article.updated_at,
          schema: {
            ...article.schema,
            headline: seoOverlay.headline || article.schema?.headline || article.designation_fr,
            description: seoOverlay.metaDescription || article.schema?.description,
            date_modified: seoOverlay.dateModified || article.schema?.date_modified,
          },
        }
      : {
          ...article,
          description_fr: sanitizeArticleHtml(article.description_fr),
          description: sanitizeArticleHtml(article.description),
        };

    // Keep the explicit pillar link inside the prose delivered in the initial HTML, even when
    // taxonomy fetching fails. Preserve the CMS body and its French/fallback field selection.
    if (seoOverlay?.bodyLinkHtml) {
      if (displayArticle.description_fr) {
        displayArticle.description_fr += seoOverlay.bodyLinkHtml;
      } else if (displayArticle.description) {
        displayArticle.description += seoOverlay.bodyLinkHtml;
      }
    }

    /*
     * ── LINK TARGETS FOR IN-CONTENT LINKS ────────────────────────────────────────────────────
     * Built on the server so the anchors are in the initial HTML. That is the whole point: the
     * article page's existing route to the shop is BlogRecommendedProducts, which fetches on an
     * IntersectionObserver, so its links do not exist until something scrolls — and Googlebot
     * renders but does not scroll.
     *
     * The synonyms below are the ones a category NAME cannot supply. "Whey Protéine" is the
     * category; "whey" on its own is what the articles say, and it is the term the site is trying
     * to rank for. Everything else is derived from the live taxonomy, so renaming a category in
     * Filament updates the linking with no code change.
     */
    const linkTargets: LinkTarget[] = targetsFromTaxonomy(
      categories,
      {
      // "whey isolate" belongs to /whey-isolate below, not here: the compiler tries the longest
      // phrase first, so leaving it on /whey-proteine handed the isolate page's own query away.
      'whey-proteine': ['whey', 'protéine de lactosérum', 'واي بروتين', 'الواي بروتين', 'مصل اللبن', 'بروتين مصل اللبن'],
      // The longest term here (26 chars) outweighs /whey-proteine's "protéine de lactosérum" (22),
      // so an article whose first whey mention IS an isolate mention now lands on the isolate page.
      'whey-isolate': ['whey isolate', 'isolat de whey', 'whey protein isolate', 'isolat de protéine de whey'],
      creatine: ['créatine monohydrate', 'monohydrate de créatine', 'كرياتين', 'الكرياتين', 'كرياتين مونوهيدرات', 'الكرياتين مونوهيدرات'],
      proteines: ['protéine en poudre', 'poudre de protéine', 'مسحوق البروتين', 'بروتين بودرة'],
      // "gainer"/"mass gainer" moved off /prise-de-masse: docs/seo-opportunity-map.md §P4 names
      // /mass-gainers the winner of the gainer intent and /prise-de-masse the objective hub that
      // must stop competing for it. The hub keeps its own phrase via the category name
      // ("PRISE DE MASSE") plus the Arabic synonyms a name cannot supply.
      'mass-gainers': ['mass gainer', 'weight gainer', 'gainer', 'ماس جينر'],
      'prise-de-masse': ['زيادة الوزن', 'زيادة الكتلة العضلية'],
      // "bcaa" is /bcaa's own name, not a synonym of its sibling /acides-amines; keeping it here
      // meant the parent category took the first BCAA mention whenever it came first in the prose.
      'acides-amines': ['acides aminés', 'الأحماض الأمينية', 'احماض امينية'],
      // Widened 16/09/2026 to route the blog's authority into more category pages — the same
      // de-cannibalization lever, extended. A synonym for a slug not in the live taxonomy is a
      // no-op (targetsFromTaxonomy only emits targets for categories that exist), so this is safe.
      'omega-3': ['oméga 3', 'omega 3', 'huile de poisson', 'أوميغا 3', 'اوميغا 3', 'زيت السمك'],
      'pre-workout': ['pre workout', 'pré-workout', 'preworkout', 'booster d’entraînement', 'ما قبل التمرين', 'بري وركاوت'],
      // A fat burner is a product on the /bruleurs-de-graisse shelf; "perte de poids" is the goal
      // hub. The burner phrases sat on the hub, so an article naming a brûleur linked past the shelf
      // that sells it (audit 28/09/2026).
      'bruleurs-de-graisse': ['brûleur de graisse', 'brûle-graisse', 'fat burner', 'حارق الدهون', 'حرق الدهون'],
      'perte-de-poids': ['perte de poids', 'التخسيس'],
      glutamine: ['glutamine', 'l-glutamine', 'جلوتامين', 'الجلوتامين'],
      caseine: ['caséine', 'caseine', 'protéine caséine', 'كازين', 'الكازين'],
      collagene: ['collagène', 'collagene', 'كولاجين', 'الكولاجين'],
      'proteines-vegetales': ['protéine végétale', 'proteine vegetale', 'protéine vegan', 'بروتين نباتي', 'البروتين النباتي'],
      vitamines: ['vitamine', 'complément vitaminé', 'فيتامينات', 'الفيتامينات'],
      magnesium: ['magnésium', 'magnesium', 'مغنيسيوم', 'المغنيسيوم'],
      },
      { allowSlugs: LINKABLE_CATEGORY_SLUGS }
    );
    /*
     * ── THE AUTOMATIC LINKER YIELDS TO EVERY CURATED LINK THIS PAGE ALREADY CARRIES ──────────
     * "ONE link per destination" is the first rule in util/internalLinks.ts, and 30/09/2026 taught
     * it against the CMS body: a shelf the prose already linked was being linked a second time.
     * The seeding that fixed it can only see the HTML it is handed — the article body — and this
     * page ships two further link blocks the injector never sees:
     *
     *   · the "Lire aussi" chips (BlogSeoBlock, from blogSeoConfig.internalLinks)
     *   · the "Voir aussi sur la boutique" nav (article.related_shop_categories)
     *
     * Measured live on all 223 published articles, 02/10/2026 (Googlebot UA, links inside
     * `<article>`, injected ones identified by `class="article-inline-link"`), after the 30/09 fix
     * had landed:
     *
     *     CMS-body duplicates                                         0   ← 30/09 fix holding
     *     duplicates against these two curated blocks                30   in 25 articles
     *     of those 30: /whey-proteine 13 · /proteines 9 · /whey-isolate 2 ·
     *                  /vitamines 2 · /mass-gainers 2 · /creatine 2
     *     14 of the 25 are at the `max` cap, so the duplicate DISPLACES a first link
     *
     * 22 of the 30 land on /whey-proteine and /proteines — the two pages the ranking objective is
     * written against. And the curated anchor is the better of the two every time: "whey protéine
     * en Tunisie", "prix des whey chez Protein.tn", "comparer les whey en stock" against a bare
     * "whey" lifted out of a sentence. So the injector yields and the shelf keeps the stronger
     * anchor — the same direction the commerce-bridge exclusion, now folded into the one call
     * below, already took: a hand-written link outranks a generated one. On the 14 at-cap articles
     * the freed slot goes to a shelf with no link at all.
     */
    const articleLinkTargets = excludeLinkedDestinations(linkTargets, [
      commerceBridge?.href,
      ...resolveBlogSeoLinks(slug, commerceBridge?.href).map((link) => link.href),
      // Same list, and the same bridge exclusion, that ArticleDetailClient renders as the nav.
      ...(displayArticle.related_shop_categories ?? []).map((category) => `/${category.slug}`),
    ]);

    /*
     * Related by SUBJECT, with the newest posts as the fallback when an article shares no
     * significant term with any other. Six rather than three: the rail is the only inbound link
     * most of these 224 articles have, and 184 of them are currently unindexed.
     */
    // Related-rail titles follow each article's SEO headline — see util/blogCardTitles.
    const pool = withSeoHeadlines(articlePool.length > 0 ? articlePool : latestArticles);
    const filteredRelated = pickRelatedArticles(
      { slug: displayArticle.slug ?? slug, designation_fr: displayArticle.designation_fr },
      pool,
      6
    );
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
    const articleImageUrl = displayArticle.cover ? getStorageUrl(displayArticle.cover) : undefined;
    const articleSchema = buildArticleSchema(displayArticle, baseUrl, articleImageUrl);
    const arabic = isArabicArticle(resolveArticleLanguage(article));
    const breadcrumbSchema = buildBreadcrumbListSchema(
      [
        { name: arabic ? 'الرئيسية' : 'Accueil', url: '/' },
        { name: arabic ? 'المدونة' : 'Blog', url: '/blog' },
        { name: displayArticle.designation_fr || displayArticle.slug || 'Article', url: blogHref(displayArticle.slug || slug) },
      ],
      baseUrl,
      // Same identifier the BlogPosting's mainEntityOfPage carries, so the trail attaches to this
      // article's page rather than floating unattached beside it.
      { pageUrl: blogHref(displayArticle.slug || slug) }
    );

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <ArticleDetailClient
          article={displayArticle}
          relatedArticles={filteredRelated}
          linkTargets={articleLinkTargets}
          commerceBridge={commerceBridge}
          inStockProducts={<BlogInStockProducts slug={slug} arabic={arabic} />}
        >
          <BlogSeoBlock slug={slug} excludeHref={commerceBridge?.href} resolvedFaqs={resolvedFaqs} />
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
// generateStaticParams removed: ISR/static generation is incompatible with the request-time locale
// resolution in the root layout, and cannot coexist with `dynamic = 'force-dynamic'`.
