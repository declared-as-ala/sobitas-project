import type { CategorySeoContent } from '@/types/categorySeo';
import { isSubstantivelyDuplicateHtml } from '@/util/categorySeoDedup';
import { sanitizeExtraJsonLd } from '@/util/extraJsonLd';

/** Normalized SEO object from Laravel API (`productsBySubCategoryId` / `productsByCategoryId`). */
export type CategorySeoFromApi = {
  enabled?: boolean;
  title?: string;
  meta_description?: string;
  meta_keywords?: string;
  h1?: string;
  canonical_url?: string;
  robots?: { index?: boolean; follow?: boolean };
  og?: { title?: string; description?: string; image?: string; image_alt?: string };
  twitter?: { title?: string; description?: string; image?: string };
  keywords?: { primary?: string; secondary?: string[]; tags?: string[] };
  breadcrumb_label?: string;
  short_intro_html?: string;
  long_bottom_html?: string;
  faq?: Array<{ question: string; answer: string }>;
  banners?: { desktop?: string; mobile?: string };
  related_category_slugs?: string[];
  extra_json_ld?: Array<Record<string, unknown>>;
  sitemap?: {
    include?: boolean;
    priority?: number | null;
    changefreq?: string | null;
  };
};

export type CategorySeoSourceEntity = {
  designation_fr?: string | null;
  h1_title?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  short_intro?: string | null;
  long_bottom_content?: string | null;
  description_fr?: string | null;
  more_details?: string | null;
  nutrition_values?: string | null;
  seo_enabled?: boolean | null;
  robots_index?: boolean | null;
  robots_follow?: boolean | null;
};

export type MergedCategorySeo = CategorySeoContent & {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  breadcrumbLabel?: string;
  /** Rich HTML block from API (bottom SEO article); not folded into how-to. */
  longBottomHtml?: string;
  banners?: { desktop?: string; mobile?: string };
  extraJsonLd: Array<Record<string, unknown>>;
  relatedCategorySlugs: string[];
};

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function plainTextFromHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The backend category endpoints return both a normalized `seo` block and the
 * raw category/subcategory model. Older admin forms stored visible copy in
 * `description_fr`, while the newer SEO form stores it in `short_intro`.
 * This keeps both generations of dashboard content visible on the public page.
 */
export function withCategorySeoEntityFallbacks(
  api: CategorySeoFromApi | null | undefined,
  entity: CategorySeoSourceEntity | null | undefined
): CategorySeoFromApi | undefined {
  if (!api && !entity) return undefined;

  const source = api ?? {};
  const designation = cleanString(entity?.designation_fr);
  const explicitH1 = cleanString(entity?.h1_title);
  const rawApiH1 = cleanString(source.h1);
  const entityMetaTitle = cleanString(entity?.meta_title);
  const sourceTitle = cleanString(source.title);
  const sourceTitleIsGenericDesignation = sourceTitle !== '' && designation !== '' && sourceTitle === designation;
  const apiH1IsGenericDesignation = rawApiH1 !== '' && designation !== '' && rawApiH1 === designation;
  const h1 =
    explicitH1 ||
    (rawApiH1 && !apiH1IsGenericDesignation ? rawApiH1 : '') ||
    entityMetaTitle ||
    rawApiH1 ||
    designation;

  const sourceMetaDescription = cleanString(source.meta_description);
  const entityMetaDescription = cleanString(entity?.meta_description);
  const entityDescription = cleanString(entity?.description_fr);
  const intro =
    entityDescription ||
    cleanString(source.short_intro_html) ||
    cleanString(entity?.short_intro) ||
    sourceMetaDescription ||
    entityMetaDescription;
  const introPlain = intro ? plainTextFromHtml(intro) : '';
  const metaDescription =
    sourceMetaDescription ||
    entityMetaDescription ||
    (introPlain ? introPlain.slice(0, 500) : '');
  const longBottomHtml =
    cleanString(source.long_bottom_html) ||
    cleanString(entity?.long_bottom_content) ||
    cleanString(entity?.more_details) ||
    cleanString(entity?.nutrition_values);

  return {
    ...source,
    enabled: source.enabled ?? entity?.seo_enabled ?? true,
    title: (sourceTitle && !sourceTitleIsGenericDesignation ? sourceTitle : '') || entityMetaTitle || sourceTitle || h1,
    meta_description: metaDescription || source.meta_description,
    h1: h1 || source.h1,
    short_intro_html: intro || source.short_intro_html,
    long_bottom_html: longBottomHtml || source.long_bottom_html,
    robots: {
      ...source.robots,
      index: source.robots?.index ?? entity?.robots_index ?? true,
      follow: source.robots?.follow ?? entity?.robots_follow ?? true,
    },
  };
}

function apiHasUsableSeo(api: CategorySeoFromApi | null | undefined): boolean {
  if (!api || api.enabled === false) return false;
  return true;
}

/** Visible text length of an HTML fragment — the only fair way to compare two intros. */
function textLength(html: string | undefined | null): number {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/**
 * THE RICHER OF THE TWO INTROS, NOT SIMPLY THE CMS ONE.
 *
 * `content/categories/*.json` holds 47 hand-written category guides. The merge used to read
 * "API if present, else JSON", so wherever the CMS had ANY intro the guide was discarded whole —
 * and on the highest-value commercial pages the CMS copy is the shorter of the two. Measured
 * against production on 17/08/2026:
 *
 *     /whey-proteine   guide 713 words   CMS 262 words rendered   position 35.3
 *     /creatine        guide 1028 words  CMS  40 words rendered   position 25.8
 *     /proteines       guide 435 words   CMS  41 words rendered   position 33.9
 *
 * The blog outranks the shop on the shop's own head terms for exactly this reason:
 * /blog/whey-protein-en-tunisie is 4,495 words at position 11.2 while /proteines rendered 41.
 *
 * THE TRADE, STATED PLAINLY: a deliberately SHORT CMS intro now loses to a longer guide. That is
 * the intended behaviour and it is the reason this is length-based rather than source-based — but
 * it does mean "I shortened it in Filament and nothing changed" is a real possible report. The
 * answer there is to shorten the JSON guide too, or delete it. Ties go to the CMS, so an edit of
 * equal length always wins and the owner keeps control at the margin.
 */
function richerIntro(apiIntro: string, jsonIntro: string): string {
  if (!apiIntro) return jsonIntro;
  if (!jsonIntro) return apiIntro;
  return textLength(jsonIntro) > textLength(apiIntro) ? jsonIntro : apiIntro;
}

/** Compare questions ignoring case, accents, punctuation and spacing. */
function faqKey(q: string): string {
  return String(q ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * BOTH SETS OF FAQs, DEDUPED — they answer different questions, so keeping one was a straight loss.
 *
 * The old rule was "API FAQs if there are any, else JSON". /whey-proteine has 11 questions in its
 * guide and 1 in the CMS, so it published ONE. Every extra answered question is long-tail surface
 * and another FAQPage entity; there is no reason the two sources should be exclusive.
 *
 * CMS entries lead, so the owner's wording is what a reader sees first and what wins a collision.
 */
function mergeFaqs(
  apiFaqs: Array<{ question: string; answer: string }>,
  jsonFaqs: Array<{ question: string; answer: string }>
): Array<{ question: string; answer: string }> {
  const out: Array<{ question: string; answer: string }> = [];
  const seen = new Set<string>();
  for (const f of [...apiFaqs, ...jsonFaqs]) {
    const key = faqKey(f?.question);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function mergeRelatedSlugs(api: CategorySeoFromApi | undefined, jsonSlugs: string[] | undefined): string[] {
  const fromApi = Array.isArray(api?.related_category_slugs)
    ? api!.related_category_slugs!.filter((s): s is string => typeof s === 'string' && s.trim() !== '')
    : [];
  const fromJson = Array.isArray(jsonSlugs) ? jsonSlugs.filter((s) => typeof s === 'string' && s.trim() !== '') : [];
  return [...new Set([...fromApi.map((s) => s.trim()), ...fromJson.map((s) => s.trim())])];
}

function buildMetaKeywordsLine(api: CategorySeoFromApi | undefined, useApi: boolean): string | undefined {
  if (!useApi || !api) return undefined;
  const parts: string[] = [];
  const mk = (api.meta_keywords ?? '').trim();
  if (mk) parts.push(mk);
  const pk = (api.keywords?.primary ?? '').trim();
  if (pk) parts.push(pk);
  const sec = api.keywords?.secondary ?? [];
  parts.push(...sec.filter(Boolean));
  const tags = api.keywords?.tags ?? [];
  parts.push(...tags.filter(Boolean));
  const line = [...new Set(parts.map((p) => p.trim()).filter(Boolean))].join(', ');
  return line || undefined;
}

/**
 * Merge API SEO (preferred when enabled + populated) with static JSON fallback for related products/slugs.
 */
export function mergeCategorySeo(
  json: Partial<CategorySeoContent> | null,
  api: CategorySeoFromApi | null | undefined
): MergedCategorySeo {
  const j: Partial<CategorySeoContent> = json ?? {};
  const useApi = apiHasUsableSeo(api);

  const h1 = useApi ? (api!.h1 ?? '').trim() || (j.h1 ?? '') : (j.h1 ?? '');
  const intro = richerIntro(useApi ? (api!.short_intro_html ?? '').trim() : '', (j.intro ?? '').trim());
  const apiLongBottomHtml = useApi ? (api!.long_bottom_html ?? '').trim() : '';
  const longBottomHtml = isSubstantivelyDuplicateHtml(intro, apiLongBottomHtml) ? '' : apiLongBottomHtml;

  const howToChooseTitle = ((j.howToChooseTitle ?? '') as string).trim();
  const howToChooseBody = ((j.howToChooseBody ?? '') as string).trim();

  const faqsFromApi = Array.isArray(api?.faq)
    ? api!.faq.filter((x) => x && typeof x.question === 'string' && typeof x.answer === 'string')
    : [];
  const faqsFromJson = Array.isArray(j.faqs) ? j.faqs : [];
  const faqs = mergeFaqs(useApi ? faqsFromApi : [], faqsFromJson);

  const metaTitle = useApi ? (api!.title ?? '').trim() || j.metaTitle : j.metaTitle;
  const metaDescription = useApi
    ? (api!.meta_description ?? '').trim() || j.metaDescription
    : j.metaDescription;

  const ogTitle = useApi ? (api!.og?.title ?? '').trim() : '';
  const ogDescription = useApi ? (api!.og?.description ?? '').trim() : '';
  const twitterTitle = useApi ? (api!.twitter?.title ?? '').trim() : '';
  const twitterDescription = useApi ? (api!.twitter?.description ?? '').trim() : '';
  const twitterImage = useApi ? (api!.twitter?.image ?? '').trim() : '';

  const ogImage = useApi ? (api!.og?.image ?? '').trim() || j.ogImage : j.ogImage;

  const canonicalUrl = useApi ? (api!.canonical_url ?? '').trim() : '';
  const robotsIndex = useApi ? (api!.robots?.index !== false ? true : false) : true;
  const robotsFollow = useApi ? (api!.robots?.follow !== false ? true : false) : true;
  const breadcrumbLabel = useApi ? (api!.breadcrumb_label ?? '').trim() : '';

  const banners =
    useApi && api?.banners
      ? {
          desktop: (api.banners.desktop ?? '').trim() || undefined,
          mobile: (api.banners.mobile ?? '').trim() || undefined,
        }
      : undefined;

  const extraJsonLd = sanitizeExtraJsonLd(useApi ? api?.extra_json_ld : undefined);

  const apiForMerge = useApi ? (api ?? undefined) : undefined;
  const relatedCategorySlugs = mergeRelatedSlugs(apiForMerge, j.relatedCategorySlugs);

  const metaKeywords = buildMetaKeywordsLine(apiForMerge, useApi);

  return {
    h1: h1 || '',
    intro: intro || '',
    howToChooseTitle: howToChooseTitle || '',
    howToChooseBody: howToChooseBody || '',
    faqs,
    relatedCategorySlugs,
    bestProductSlugs: Array.isArray(j.bestProductSlugs) ? j.bestProductSlugs : [],
    metaTitle: metaTitle || undefined,
    metaDescription: metaDescription || undefined,
    metaKeywords,
    ogTitle: ogTitle || undefined,
    ogDescription: ogDescription || undefined,
    twitterTitle: twitterTitle || undefined,
    twitterDescription: twitterDescription || undefined,
    twitterImage: twitterImage || undefined,
    ogImage: ogImage || undefined,
    canonicalUrl: canonicalUrl || undefined,
    robotsIndex,
    robotsFollow,
    breadcrumbLabel: breadcrumbLabel || undefined,
    longBottomHtml: longBottomHtml || undefined,
    banners: banners?.desktop || banners?.mobile ? banners : undefined,
    extraJsonLd,
  };
}
