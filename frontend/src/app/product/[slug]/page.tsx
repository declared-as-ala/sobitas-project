import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductDetails, getSimilarProducts } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { ProductDetailClient } from '@/app/products/[id]/ProductDetailClient';
import type { Product } from '@/types';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
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
  
  try {
    const product = await getProductDetails(slug);
    const imageUrl = product.cover ? getStorageUrl(product.cover) : '';
    
    // Extract meta tags from product.meta if available
    const metaTags = extractMetaFromHtml(product.meta);
    
    // Use meta tags from API if available, otherwise fallback to defaults
    const title = metaTags.title || `${product.designation_fr} - Protéines & Compléments Tunisie | SOBITAS`;
    
    // Build description with proper fallback chain and HTML stripping
    let description = metaTags.description;
    if (!description && product.meta_description_fr) {
      description = stripHtml(product.meta_description_fr);
    }
    if (!description && product.description_cover) {
      description = stripHtml(product.description_cover);
    }
    if (!description && product.description_fr) {
      description = stripHtml(product.description_fr);
    }
    if (!description) {
      description = `Achetez ${product.designation_fr} en Tunisie – SOBITAS, protéines et compléments à Sousse.`;
    }
    
    const canonical = metaTags.canonical || `${baseUrl}/product/${slug}`;
    const ogTitle = metaTags.ogTitle || title;
    const ogDescription = metaTags.ogDescription || description;
    const ogUrl = metaTags.ogUrl || `${baseUrl}/product/${slug}`;
    const twitterTitle = metaTags.twitterTitle || title;
    const twitterDescription = metaTags.twitterDescription || description;
    
    return {
      title,
      description,
      robots: metaTags.robots ? {
        index: metaTags.robots.includes('index'),
        follow: metaTags.robots.includes('follow'),
      } : undefined,
      alternates: {
        canonical,
      },
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        images: imageUrl ? [imageUrl] : [],
        url: ogUrl,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: twitterTitle,
        description: twitterDescription,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Produit | SOBITAS Tunisie',
      description: 'Protéines, whey, créatine et compléments alimentaires en Tunisie.',
    };
  }
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
            parsed.offers.url = `${baseUrl}/product/${product.slug}`;
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
      url: `${baseUrl}/product/${product.slug}`,
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

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

  console.log(`[ProductPage] Resolving slug: "${slug}"`);

  try {
    const product = await getProductDetails(slug);
    
    if (!product || !product.id) {
      console.warn(`[ProductPage] Product "${slug}" returned empty data`);
      notFound();
    }

    console.log(`[ProductPage] Found product: "${product.designation_fr}"`);

    // Fetch similar products
    const similarData = product.sous_categorie_id 
      ? await getSimilarProducts(product.sous_categorie_id).catch(() => ({ products: [] }))
      : { products: [] };

    const productSchema = buildProductJsonLd(product, baseUrl);

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
        {/* Render additional SEO content if provided */}
        {product.content_seo && (
          <div dangerouslySetInnerHTML={{ __html: product.content_seo }} style={{ display: 'none' }} />
        )}
        <ProductDetailClient product={product} similarProducts={similarData.products || []} />
      </>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
