/**
 * JSON-LD structured data for Google rich results.
 * Use build* functions and inject via <script type="application/ld+json">.
 * In development, use validateStructuredData(schema, type) to log errors and Rich Results Test checklist.
 */

import { getStorageUrl } from '@/services/api';
import type { Product, FAQ } from '@/types';

const RICH_RESULTS_TEST = 'https://search.google.com/test/rich-results';

export type BreadcrumbItem = { name: string; url: string };

/** Strip HTML tags for plain-text description (max length). */
function stripHtml(html: string, maxLen: number = 500): string {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

/**
 * Product schema: name, image, description, sku, brand, offers (price, priceCurrency=TND, availability, url).
 * When reviews exist: aggregateRating + review snippets (up to 5).
 */
export function buildProductSchema(product: Product, baseUrl: string): object {
  const imageUrl = product.cover ? getStorageUrl(product.cover) : '';
  const price = product.promo ?? product.prix;
  const inStock = (product as { rupture?: number }).rupture !== 1;
  const productUrl = `${baseUrl}/shop/${product.slug}`;
  const description = stripHtml(
    product.description_cover || product.description_fr || '',
    500
  );

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.designation_fr,
    description: description || undefined,
    image: imageUrl || undefined,
    sku: String(product.id),
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand.designation_fr }
      : undefined,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'TND',
      price: price ?? 0,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'SOBITAS' },
    },
  };

  const reviews = (product.reviews || []).filter((r) => r.publier === 1);
  if (reviews.length > 0) {
    const sum = reviews.reduce((s, r) => s + r.stars, 0);
    const ratingValue = sum / reviews.length;
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(ratingValue * 10) / 10,
      bestRating: 5,
      worstRating: 1,
      ratingCount: reviews.length,
      reviewCount: reviews.length,
    };
    const reviewSnippets = reviews
      .slice(0, 5)
      .filter((r) => r.comment && r.comment.trim())
      .map((r) => ({
        '@type': 'Review' as const,
        author: { '@type': 'Person', name: (r.user?.name || 'Client').trim() || 'Client' },
        datePublished: r.created_at || undefined,
        reviewRating: { '@type': 'Rating', ratingValue: r.stars, bestRating: 5, worstRating: 1 },
        reviewBody: (r.comment || '').trim().slice(0, 1000),
      }));
    if (reviewSnippets.length > 0) {
      schema.review = reviewSnippets;
    }
  }

  return schema;
}

/**
 * BreadcrumbList schema for category and product pages.
 * items[].url can be relative (e.g. /shop) or absolute; baseUrl is used to resolve to absolute.
 */
export function buildBreadcrumbListSchema(
  items: BreadcrumbItem[],
  baseUrl: string
): object {
  const base = baseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${base}${item.url.startsWith('/') ? item.url : '/' + item.url}`,
    })),
  };
}

/**
 * Organization schema: name, logo, address (Tunisia), contactPoint, sameAs.
 * Use sitewide (e.g. in layout).
 */
export function buildOrganizationSchema(baseUrl: string): object {
  const base = baseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SOBITAS',
    url: base,
    logo: `${base}/icon.png`,
    description:
      'Distributeur officiel de protéines et compléments alimentaires en Tunisie. Whey, créatine, gainer, BCAA à Sousse. Livraison Tunis, Sousse et toute la Tunisie.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rue Rihab',
      addressLocality: 'Sousse',
      postalCode: '4000',
      addressCountry: 'TN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+21627612500',
      email: 'contact@protein.tn',
      contactType: 'customer service',
      areaServed: 'TN',
      availableLanguage: 'French',
    },
    sameAs: [
      'https://www.facebook.com/sobitass/',
      'https://www.instagram.com/sobitass/',
      'https://twitter.com/TunisieProteine',
      'https://www.tiktok.com/@sobitassousse',
    ],
  };
}

/**
 * LocalBusiness schema (extends Organization for local SEO).
 */
export function buildLocalBusinessSchema(baseUrl: string): object {
  const base = baseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${base}/#localbusiness`,
    name: 'SOBITAS – Protéines & Compléments Alimentaires Tunisie',
    image: `${base}/icon.png`,
    url: base,
    telephone: '+21627612500',
    email: 'contact@protein.tn',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rue Rihab',
      addressLocality: 'Sousse',
      postalCode: '4000',
      addressCountry: 'TN',
    },
    priceRange: '$$',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '19:00',
    },
  };
}

/**
 * WebSite schema (sitewide) with SearchAction for sitelinks search box.
 */
export function buildWebSiteSchema(baseUrl: string): object {
  const base = baseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SOBITAS – Protéine Tunisie',
    url: base,
    description:
      'Boutique de protéines, whey, créatine et compléments alimentaires en Tunisie. Livraison Sousse, Tunis.',
    publisher: {
      '@type': 'Organization',
      name: 'SOBITAS',
      logo: { '@type': 'ImageObject', url: `${base}/icon.png` },
    },
    inLanguage: 'fr-TN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/shop?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * WebPage schema for generic pages (name, description, url).
 */
export function buildWebPageSchema(
  name: string,
  url: string,
  baseUrl: string,
  options?: { description?: string }
): object {
  const base = baseUrl.replace(/\/$/, '');
  const fullUrl = url.startsWith('http') ? url : `${base}${url.startsWith('/') ? url : '/' + url}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    url: fullUrl,
    description: options?.description || undefined,
    inLanguage: 'fr-TN',
    isPartOf: { '@type': 'WebSite', url: base },
  };
}

/**
 * ItemList schema for category pages (list of products).
 */
export function buildItemListSchema(
  items: Array<{ name: string; url: string }>,
  baseUrl: string,
  options?: { name?: string; description?: string }
): object {
  const base = baseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: options?.name || 'Produits',
    description: options?.description || undefined,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 20).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url.startsWith('http') ? item.url : `${base}${item.url.startsWith('/') ? item.url : '/' + item.url}`,
    })),
  };
}

/**
 * Article/BlogPosting schema for blog posts (rich results, author, date).
 */
export function buildArticleSchema(article: {
  designation_fr?: string;
  description_fr?: string;
  description?: string;
  cover?: string;
  created_at?: string;
  updated_at?: string;
  slug?: string;
}, baseUrl: string, imageUrl?: string): object {
  const base = baseUrl.replace(/\/$/, '');
  const url = article.slug ? `${base}/blog/${article.slug}` : `${base}/blog`;
  const plainDesc = (article.description_fr || article.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.designation_fr || 'Article',
    description: plainDesc || undefined,
    image: imageUrl || undefined,
    url,
    datePublished: article.created_at || undefined,
    dateModified: article.updated_at || article.created_at || undefined,
    publisher: { '@type': 'Organization', name: 'SOBITAS', logo: { '@type': 'ImageObject', url: `${base}/icon.png` } },
    inLanguage: 'fr-TN',
  };
}

/**
 * FAQPage schema. Match visible questions/answers (e.g. from getFAQs() or product FAQs).
 */
export function buildFAQPageSchema(faqs: FAQ[]): object | null {
  const list = faqs.filter((f) => f.question && f.reponse);
  if (!list.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((f) => ({
      '@type': 'Question',
      name: (f.question || '').trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: (f.reponse || '').trim(),
      },
    })),
  };
}

/** FAQPage schema from { question, answer } pairs (e.g. blog SEO config). */
export function buildFAQPageSchemaFromQA(
  faqs: Array<{ question: string; answer: string }>
): object | null {
  const list = faqs.filter((f) => (f.question || '').trim() && (f.answer || '').trim());
  if (!list.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((f) => ({
      '@type': 'Question',
      name: (f.question || '').trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: (f.answer || '').trim(),
      },
    })),
  };
}

export type StructuredDataType = 'Product' | 'BreadcrumbList' | 'Organization' | 'FAQPage' | 'LocalBusiness' | 'WebSite';

/** Required fields per type for Google rich results (simplified checklist). */
const REQUIRED: Record<StructuredDataType, string[]> = {
  Product: ['name', 'image', 'offers', 'offers.price', 'offers.priceCurrency', 'offers.availability', 'offers.url'],
  BreadcrumbList: ['itemListElement'],
  Organization: ['name', 'url'],
  FAQPage: ['mainEntity'],
  LocalBusiness: ['name', 'address'],
  WebSite: ['name', 'url'],
};

/**
 * In development: validate JSON-LD and log a Rich Results Test checklist.
 * Call after building schema, e.g. validateStructuredData(productSchema, 'Product').
 */
/**
 * Returns a short checklist for testing with Google Rich Results Test.
 * Use: https://search.google.com/test/rich-results
 */
export function getRichResultsChecklist(): string[] {
  return [
    '1. Open https://search.google.com/test/rich-results',
    '2. Enter your page URL (e.g. production or ngrok) and run the test',
    '3. Product: expect Product + optional AggregateRating/Review',
    '4. Category/Product: expect BreadcrumbList',
    '5. Sitewide: Organization, LocalBusiness, WebSite',
    '6. FAQ page / product with FAQs: expect FAQPage',
  ];
}

export function validateStructuredData(
  schema: object,
  type: StructuredDataType
): void {
  if (process.env.NODE_ENV !== 'development' || typeof window !== 'undefined') {
    return;
  }
  const s = schema as Record<string, unknown>;
  const errors: string[] = [];

  if (type === 'Product') {
    if (!s.name) errors.push('Product: missing name');
    if (!s.image) errors.push('Product: missing image');
    const offers = s.offers as Record<string, unknown> | undefined;
    if (!offers) errors.push('Product: missing offers');
    else {
      if (offers.price === undefined || offers.price === null) errors.push('Product.offers: missing price');
      if (!offers.priceCurrency) errors.push('Product.offers: missing priceCurrency');
      if (!offers.availability) errors.push('Product.offers: missing availability');
      if (!offers.url) errors.push('Product.offers: missing url');
    }
  } else if (type === 'BreadcrumbList') {
    const list = s.itemListElement as unknown[] | undefined;
    if (!Array.isArray(list) || list.length === 0) errors.push('BreadcrumbList: missing or empty itemListElement');
  } else if (type === 'Organization') {
    if (!s.name) errors.push('Organization: missing name');
    if (!s.url) errors.push('Organization: missing url');
  } else if (type === 'FAQPage') {
    const main = s.mainEntity as unknown[] | undefined;
    if (!Array.isArray(main) || main.length === 0) errors.push('FAQPage: missing or empty mainEntity');
  } else if (type === 'LocalBusiness') {
    if (!s.name) errors.push('LocalBusiness: missing name');
    if (!s.address) errors.push('LocalBusiness: missing address');
  } else if (type === 'WebSite') {
    if (!s.name) errors.push('WebSite: missing name');
    if (!s.url) errors.push('WebSite: missing url');
  }

  if (errors.length > 0) {
    console.warn('[structured-data]', type, 'validation issues:', errors);
  }
  console.info(
    `[structured-data] Rich Results Test: ${RICH_RESULTS_TEST} — Test your page URL to verify ${type} eligibility.`
  );
}
