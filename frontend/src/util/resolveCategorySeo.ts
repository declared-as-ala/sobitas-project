import type { CategorySeoContent } from '@/types/categorySeo';
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

function apiHasUsableSeo(api: CategorySeoFromApi | null | undefined): boolean {
  if (!api || api.enabled === false) return false;
  const title = (api.title ?? '').trim();
  const desc = (api.meta_description ?? '').trim();
  const intro = (api.short_intro_html ?? '').trim();
  const bottom = (api.long_bottom_html ?? '').trim();
  const h1 = (api.h1 ?? '').trim();
  const kw = (api.meta_keywords ?? '').trim();
  const rel = api.related_category_slugs?.length ?? 0;
  return Boolean(h1 || title || desc || intro || bottom || (api.faq && api.faq.length > 0) || kw || rel > 0);
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
  const j = json ?? {};
  const useApi = apiHasUsableSeo(api);

  const h1 = useApi ? (api!.h1 ?? '').trim() || (j.h1 ?? '') : (j.h1 ?? '');
  const intro = useApi ? (api!.short_intro_html ?? '').trim() || (j.intro ?? '') : (j.intro ?? '');
  const longBottomHtml = useApi ? (api!.long_bottom_html ?? '').trim() : '';

  const howToChooseTitle = ((j.howToChooseTitle ?? '') as string).trim();
  const howToChooseBody = ((j.howToChooseBody ?? '') as string).trim();

  const faqsFromApi = Array.isArray(api?.faq)
    ? api!.faq.filter((x) => x && typeof x.question === 'string' && typeof x.answer === 'string')
    : [];
  const faqsFromJson = Array.isArray(j.faqs) ? j.faqs : [];
  const faqs = useApi && faqsFromApi.length > 0 ? faqsFromApi : faqsFromJson;

  const metaTitle = useApi ? (api!.title ?? '').trim() || (j as any).metaTitle : (j as any).metaTitle;
  const metaDescription = useApi
    ? (api!.meta_description ?? '').trim() || (j as any).metaDescription
    : (j as any).metaDescription;

  const ogTitle = useApi ? (api!.og?.title ?? '').trim() : '';
  const ogDescription = useApi ? (api!.og?.description ?? '').trim() : '';
  const twitterTitle = useApi ? (api!.twitter?.title ?? '').trim() : '';
  const twitterDescription = useApi ? (api!.twitter?.description ?? '').trim() : '';
  const twitterImage = useApi ? (api!.twitter?.image ?? '').trim() : '';

  const ogImage = useApi ? (api!.og?.image ?? '').trim() || (j as any).ogImage : (j as any).ogImage;

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
