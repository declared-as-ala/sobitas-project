import type { CategorySeoContent } from '@/types/categorySeo';

/** Normalized SEO object from Laravel API (`productsBySubCategoryId` / `productsByCategoryId`). */
export type CategorySeoFromApi = {
  enabled?: boolean;
  title?: string;
  meta_description?: string;
  h1?: string;
  canonical_url?: string;
  robots?: { index?: boolean; follow?: boolean };
  og?: { title?: string; description?: string; image?: string; image_alt?: string };
  keywords?: { primary?: string; secondary?: string[] };
  breadcrumb_label?: string;
  short_intro_html?: string;
  long_bottom_html?: string;
  faq?: Array<{ question: string; answer: string }>;
};

export type MergedCategorySeo = CategorySeoContent & {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  breadcrumbLabel?: string;
};

function apiHasUsableSeo(api: CategorySeoFromApi | null | undefined): boolean {
  if (!api || api.enabled === false) return false;
  const title = (api.title ?? '').trim();
  const desc = (api.meta_description ?? '').trim();
  const intro = (api.short_intro_html ?? '').trim();
  const bottom = (api.long_bottom_html ?? '').trim();
  const h1 = (api.h1 ?? '').trim();
  return Boolean(h1 || title || desc || intro || bottom || (api.faq && api.faq.length > 0));
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
  const longBottom = useApi ? (api!.long_bottom_html ?? '').trim() : '';
  let howToChooseTitle = ((j.howToChooseTitle ?? '') as string).trim();
  let howToChooseBody = ((j.howToChooseBody ?? '') as string).trim();
  if (useApi && longBottom) {
    howToChooseTitle = 'Informations complémentaires';
    howToChooseBody = longBottom;
  }

  const faqsFromApi = Array.isArray(api?.faq)
    ? api!.faq.filter((x) => x && typeof x.question === 'string' && typeof x.answer === 'string')
    : [];
  const faqsFromJson = Array.isArray(j.faqs) ? j.faqs : [];
  const faqs = useApi && faqsFromApi.length > 0 ? faqsFromApi : faqsFromJson;

  const metaTitle = useApi ? (api!.title ?? '').trim() || (j as any).metaTitle : (j as any).metaTitle;
  const metaDescription = useApi
    ? (api!.meta_description ?? '').trim() || (j as any).metaDescription
    : (j as any).metaDescription;

  const ogImage = useApi
    ? (api!.og?.image ?? '').trim() || (j as any).ogImage
    : (j as any).ogImage;

  const canonicalUrl = useApi ? (api!.canonical_url ?? '').trim() : '';
  const robotsIndex = useApi ? (api!.robots?.index !== false ? true : false) : true;
  const robotsFollow = useApi ? (api!.robots?.follow !== false ? true : false) : true;
  const breadcrumbLabel = useApi ? (api!.breadcrumb_label ?? '').trim() : '';

  return {
    h1: h1 || '',
    intro: intro || '',
    howToChooseTitle: howToChooseTitle || '',
    howToChooseBody: howToChooseBody || '',
    faqs,
    relatedCategorySlugs: Array.isArray(j.relatedCategorySlugs) ? j.relatedCategorySlugs : [],
    bestProductSlugs: Array.isArray(j.bestProductSlugs) ? j.bestProductSlugs : [],
    metaTitle: metaTitle || undefined,
    metaDescription: metaDescription || undefined,
    ogImage: ogImage || undefined,
    canonicalUrl: canonicalUrl || undefined,
    robotsIndex,
    robotsFollow,
    breadcrumbLabel: breadcrumbLabel || undefined,
  };
}
