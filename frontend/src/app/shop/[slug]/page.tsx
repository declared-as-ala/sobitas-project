import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductDetails, getSimilarProducts, getCategories, getProductsByCategory, getProductsBySubCategory } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { ProductDetailClient } from '@/app/products/[id]/ProductDetailClient';
import { ShopPageClient } from '@/app/shop/ShopPageClient';
import { CategoryFallbackClient } from '@/app/shop/CategoryFallbackClient';
import type { Product } from '@/types';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  // Decode HTML entities (including French characters)
  let decoded = text
    // French characters
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&egrave;/g, 'è')
    .replace(/&Egrave;/g, 'È')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&Ecirc;/g, 'Ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&Agrave;/g, 'À')
    .replace(/&acirc;/g, 'â')
    .replace(/&Acirc;/g, 'Â')
    .replace(/&icirc;/g, 'î')
    .replace(/&Icirc;/g, 'Î')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&Ocirc;/g, 'Ô')
    .replace(/&ucirc;/g, 'û')
    .replace(/&Ucirc;/g, 'Û')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    // Quotes and apostrophes
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    // Common entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Numeric entities (common ones)
    .replace(/&#233;/g, 'é')
    .replace(/&#232;/g, 'è')
    .replace(/&#234;/g, 'ê')
    .replace(/&#224;/g, 'à')
    .replace(/&#226;/g, 'â')
    .replace(/&#238;/g, 'î')
    .replace(/&#244;/g, 'ô')
    .replace(/&#251;/g, 'û')
    .replace(/&#231;/g, 'ç');
  
  // Decode numeric entities using browser API if available (client-side only)
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = decoded;
      decoded = textarea.value;
    } catch (e) {
      // Keep the manually decoded version if browser API fails
    }
  }
  
  return decoded;
}

// Helper function to extract meta tags from HTML string or custom format
function extractMetaFromHtml(metaHtml: string | undefined): {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
} {
  if (!metaHtml) return {};
  
  const result: any = {};
  
  // Check if it's the custom format (title; ... | description; ...)
  if (metaHtml.includes('title;') || metaHtml.includes('description;')) {
    // Custom format: "title; ... | description; ..."
    const titleMatch = metaHtml.match(/title;\s*([^|]+)/i);
    if (titleMatch) {
      result.title = decodeHtmlEntities(titleMatch[1].trim());
    }
    
    const descMatch = metaHtml.match(/description;\s*([^|]+)/i);
    if (descMatch) {
      result.description = decodeHtmlEntities(descMatch[1].trim());
    }
    
    // Also check for other fields in custom format if they exist
    const ogTitleMatch = metaHtml.match(/og:title;\s*([^|]+)/i);
    if (ogTitleMatch) result.ogTitle = decodeHtmlEntities(ogTitleMatch[1].trim());
    
    const ogDescMatch = metaHtml.match(/og:description;\s*([^|]+)/i);
    if (ogDescMatch) result.ogDescription = decodeHtmlEntities(ogDescMatch[1].trim());
    
    return result;
  }
  
  // Otherwise, treat it as HTML format
  // Extract title
  const titleMatch = metaHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) result.title = decodeHtmlEntities(titleMatch[1]);
  
  // Extract description - handle both single and double quotes, and escaped quotes
  const descMatch = metaHtml.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                    metaHtml.match(/<meta\s+name=["']description["']\s+content=[""]([^""]+)[""]/i);
  if (descMatch) result.description = decodeHtmlEntities(descMatch[1]);
  
  // Extract canonical
  const canonicalMatch = metaHtml.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (canonicalMatch) result.canonical = canonicalMatch[1];
  
  // Extract robots
  const robotsMatch = metaHtml.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  if (robotsMatch) result.robots = robotsMatch[1];
  
  // Extract OG title
  const ogTitleMatch = metaHtml.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitleMatch) result.ogTitle = decodeHtmlEntities(ogTitleMatch[1]);
  
  // Extract OG description
  const ogDescMatch = metaHtml.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  if (ogDescMatch) result.ogDescription = decodeHtmlEntities(ogDescMatch[1]);
  
  // Extract OG URL
  const ogUrlMatch = metaHtml.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
  if (ogUrlMatch) result.ogUrl = ogUrlMatch[1];
  
  // Extract Twitter title
  const twitterTitleMatch = metaHtml.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i);
  if (twitterTitleMatch) result.twitterTitle = decodeHtmlEntities(twitterTitleMatch[1]);
  
  // Extract Twitter description
  const twitterDescMatch = metaHtml.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i);
  if (twitterDescMatch) result.twitterDescription = decodeHtmlEntities(twitterDescMatch[1]);
  
  return result;
}

// Helper function to strip HTML tags and decode HTML entities
function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // Decode HTML entities (including French characters)
  let decoded = html
    // French characters
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&egrave;/g, 'è')
    .replace(/&Egrave;/g, 'È')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&Ecirc;/g, 'Ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&Agrave;/g, 'À')
    .replace(/&acirc;/g, 'â')
    .replace(/&Acirc;/g, 'Â')
    .replace(/&icirc;/g, 'î')
    .replace(/&Icirc;/g, 'Î')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&Ocirc;/g, 'Ô')
    .replace(/&ucirc;/g, 'û')
    .replace(/&Ucirc;/g, 'Û')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    // Quotes and apostrophes
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    // Common entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Numeric entities (common ones)
    .replace(/&#233;/g, 'é')
    .replace(/&#232;/g, 'è')
    .replace(/&#234;/g, 'ê')
    .replace(/&#224;/g, 'à')
    .replace(/&#226;/g, 'â')
    .replace(/&#238;/g, 'î')
    .replace(/&#244;/g, 'ô')
    .replace(/&#251;/g, 'û')
    .replace(/&#231;/g, 'ç');
  
  // Decode numeric entities using browser API if available (client-side only)
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = decoded;
      decoded = textarea.value;
    } catch (e) {
      // Keep the manually decoded version if browser API fails
    }
  }
  
  // Remove HTML tags
  const withoutTags = decoded.replace(/<[^>]*>/g, '');
  
  // Clean up whitespace and limit length
  return withoutTags
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160); // Limit to 160 characters for meta description
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

  // Try product first
  try {
    const product = await getProductDetails(slug);
    if (product?.id) {
      const imageUrl = product.cover ? getStorageUrl(product.cover) : '';
      const metaTags = extractMetaFromHtml(product.meta);
      const title = metaTags.title || `${product.designation_fr} - Protéines & Compléments Tunisie | SOBITAS`;
      let description = metaTags.description;
      if (!description && product.meta_description_fr) description = stripHtml(product.meta_description_fr);
      if (!description && product.description_cover) description = stripHtml(product.description_cover);
      if (!description && product.description_fr) description = stripHtml(product.description_fr);
      if (!description) description = `Achetez ${product.designation_fr} en Tunisie – SOBITAS, protéines et compléments à Sousse.`;
      const canonical = metaTags.canonical || `${baseUrl}/shop/${slug}`;
      const ogUrl = metaTags.ogUrl || `${baseUrl}/shop/${slug}`;
      return {
        title,
        description,
        robots: metaTags.robots ? { index: metaTags.robots.includes('index'), follow: metaTags.robots.includes('follow') } : undefined,
        alternates: { canonical },
        openGraph: { title: metaTags.ogTitle || title, description: metaTags.ogDescription || description, images: imageUrl ? [imageUrl] : [], url: ogUrl, type: 'website' },
        twitter: { card: 'summary_large_image', title: metaTags.twitterTitle || title, description: metaTags.twitterDescription || description, images: imageUrl ? [imageUrl] : [] },
      };
    }
  } catch {
    // Not a product, try category
  }

  // Try as category or subcategory
  try {
    let categoryData;
    try {
      const result = await getProductsByCategory(slug);
      categoryData = result?.category;
    } catch {
      const result = await getProductsBySubCategory(slug);
      categoryData = result?.sous_category;
    }
    if (categoryData?.designation_fr) {
      const title = `${categoryData.designation_fr} - Protéines & Compléments Tunisie | SOBITAS`;
      const description = `Découvrez notre sélection de ${categoryData.designation_fr.toLowerCase()} en Tunisie. Qualité premium, livraison rapide.`;
      return {
        title,
        description,
        alternates: { canonical: `${baseUrl}/shop/${slug}` },
        openGraph: { title, description, url: `${baseUrl}/shop/${slug}`, type: 'website' },
      };
    }
  } catch {
    // ignore
  }

  return {
    title: 'Produit | SOBITAS Tunisie',
    description: 'Protéines, whey, créatine et compléments alimentaires en Tunisie.',
  };
}

function buildProductJsonLd(product: Product, baseUrl: string) {
  // If content_seo is provided, try to parse it as JSON-LD
  if (product.content_seo) {
    try {
      // Extract JSON-LD from script tag if present
      const scriptMatch = product.content_seo.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch) {
        const jsonLdContent = scriptMatch[1].trim();
        try {
          const parsed = JSON.parse(jsonLdContent);
          // Update URL and image if needed
          if (parsed.offers && parsed.offers.url) {
            parsed.offers.url = `${baseUrl}/shop/${product.slug}`;
          }
          if (parsed.image && product.cover) {
            parsed.image = getStorageUrl(product.cover);
          }
          // Update price if available
          const price = product.promo ?? product.prix;
          if (parsed.offers && price) {
            parsed.offers.price = String(price);
          }
          // Update availability
          const inStock = product.rupture === 1;
          if (parsed.offers) {
            parsed.offers.availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
          }
          return parsed;
        } catch (e) {
          console.warn('Failed to parse content_seo JSON-LD:', e);
        }
      }
    } catch (e) {
      console.warn('Failed to extract JSON-LD from content_seo:', e);
    }
  }
  
  // Fallback to building JSON-LD from product data
  const imageUrl = product.cover ? getStorageUrl(product.cover) : '';
  const price = product.promo ?? product.prix;
  const inStock = product.rupture === 1;
  
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.designation_fr,
    description: (product.description_cover || product.description_fr || '').slice(0, 500),
    image: imageUrl || undefined,
    sku: product.code_product || String(product.id),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.designation_fr } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/shop/${product.slug}`,
      priceCurrency: 'TND',
      price: String(price ?? 0),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'SOBITAS' },
    },
  };
  
  // Add aggregateRating if available
  if (product.aggregateRating) {
    try {
      const ratingMatch = product.aggregateRating.match(/"ratingValue":\s*([\d.]+)/);
      const reviewCountMatch = product.aggregateRating.match(/"reviewCount":\s*(\d+)/);
      if (ratingMatch && reviewCountMatch) {
        jsonLd.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: parseFloat(ratingMatch[1]),
          reviewCount: parseInt(reviewCountMatch[1], 10),
        };
      }
    } catch (e) {
      // Ignore parsing errors
    }
  } else if (product.reviews && product.reviews.length > 0) {
    // Calculate aggregate rating from reviews
    const totalStars = product.reviews.reduce((sum, r) => sum + (r.stars || 0), 0);
    const avgRating = totalStars / product.reviews.length;
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating.toFixed(1),
      reviewCount: product.reviews.length,
    };
  }
  
  // Add reviews if available
  if (product.reviews && product.reviews.length > 0) {
    jsonLd.review = product.reviews.slice(0, 5).map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.user?.name || 'Client',
      },
      datePublished: review.created_at || new Date().toISOString(),
      reviewBody: review.comment || '',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.stars,
        bestRating: 5,
      },
    }));
  }
  
  return jsonLd;
}

// Only call notFound() when API explicitly returns 404. Never show 404 for network/5xx (avoids random 404s).
// loading.tsx shows skeleton while RSC is loading; error.tsx shows "Réessayer" on non-404 errors.
export default async function ProductDetailPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

  // Do not fetch with empty slug — invalid URL
  if (!slug || !String(slug).trim()) {
    notFound();
  }

  const slugStr = String(slug).trim();
  console.log(`[ShopSlugPage] Resolving slug: "${slugStr}"`);

  // 1) Try as product first (product detail page). Only treat as "not a product" on explicit 404.
  try {
    const product = await getProductDetails(slugStr);
    if (product?.id) {
      console.log(`[ShopSlugPage] Found product: "${product.designation_fr}"`);
      const similarData = product.sous_categorie_id
        ? await getSimilarProducts(product.sous_categorie_id).catch(() => ({ products: [] }))
        : { products: [] };
      const productSchema = buildProductJsonLd(product, baseUrl);
      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
          {product.content_seo && (
            <div dangerouslySetInnerHTML={{ __html: product.content_seo }} style={{ display: 'none' }} />
          )}
          <ProductDetailClient product={product} similarProducts={similarData.products || []} />
        </>
      );
    }
  } catch (productError: any) {
    // Only try category when API explicitly returned 404 for product. Do not treat network/5xx as "not found".
    if (productError?.response?.status !== 404) {
      console.error('[ShopSlugPage] Product fetch error (not 404):', productError?.message || productError);
      throw productError;
    }
  }

  // 2) Try as category or subcategory (shop listing)
  try {
    let categoryData;
    let productsData: { products: any[]; brands: any[]; categories: any[] };
    let categories;
    let brands;
    let isSubcategory = false;

    try {
      const result = await getProductsByCategory(slugStr);
      if (!result?.category?.designation_fr) notFound();
      categoryData = result.category;
      productsData = { products: result.products, brands: result.brands, categories: [] };
      categories = await getCategories();
      brands = result.brands;
    } catch (categoryError: any) {
      if (categoryError?.response?.status === 404 || categoryError?.message === 'Category not found') {
        try {
          const result = await getProductsBySubCategory(slugStr);
          if (!result?.sous_category?.designation_fr) notFound();
          categoryData = result.sous_category;
          productsData = { products: result.products, brands: result.brands, categories: [] };
          categories = await getCategories();
          brands = result.brands;
          isSubcategory = true;
        } catch (subError: any) {
          if (subError?.response?.status === 404 || subError?.message === 'Subcategory not found') notFound();
          throw subError;
        }
      } else {
        throw categoryError;
      }
    }

    if (!categoryData?.designation_fr) notFound();

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'Boutique', item: `${baseUrl}/shop` },
        { '@type': 'ListItem', position: 3, name: categoryData.designation_fr, item: `${baseUrl}/shop/${slugStr}` },
      ],
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <ShopPageClient
          productsData={productsData}
          categories={categories}
          brands={brands}
          initialCategory={slugStr}
          isSubcategory={isSubcategory}
        />
      </>
    );
  } catch (error: any) {
    console.error('[ShopSlugPage] Error resolving slug:', error?.message || error);
    if (error?.response?.status === 404) notFound();
    // Category fetch failed (network/5xx): let client show loading → list/empty or small error banner (no full-page error)
    return <CategoryFallbackClient slug={slugStr} />;
  }
}
