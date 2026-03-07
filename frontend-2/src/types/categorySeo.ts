/**
 * Schema for category SEO landing content.
 * Stored per category/subcategory slug in content/categories/{slug}.json
 * or via API (admin). All text is server-rendered for SEO.
 */

export interface CategorySeoFaq {
  question: string;
  answer: string;
}

export interface CategorySeoContent {
  /** Unique H1 for the page (defaults to category name if omitted) */
  h1: string;
  /**
   * Intro section: 400–800 words recommended for SEO.
   * Plain text or simple HTML (paragraphs, bold, lists).
   */
  intro: string;
  /** "How to choose" block title */
  howToChooseTitle: string;
  /** "How to choose" body (tips, criteria). Plain text or HTML. */
  howToChooseBody: string;
  /** FAQs for this category (shown in accordion + optional FAQPage schema) */
  faqs: CategorySeoFaq[];
  /**
   * Related category slugs (3–6). Resolved to names/URLs at render time.
   * Use slugs from API (category or subcategory).
   */
  relatedCategorySlugs: string[];
  /**
   * Best product slugs (3–6). Resolved to names/URLs at render time.
   * Products must belong to this category or subcategory.
   */
  bestProductSlugs: string[];
  /** Optional: override meta title (55–60 chars, keyword-first for CTR). */
  metaTitle?: string;
  /** Optional: meta description (150–160 chars). */
  metaDescription?: string;
  /** Optional: absolute URL for og:image (category hero or best-seller). */
  ogImage?: string;
}

export const CATEGORY_SEO_CONTENT_DEFAULTS: Partial<CategorySeoContent> = {
  howToChooseTitle: 'Comment choisir ?',
  faqs: [],
  relatedCategorySlugs: [],
  bestProductSlugs: [],
};
