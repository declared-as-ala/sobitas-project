import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import CategoryPage, { generateMetadata as generateCategoryMetadata } from '@/app/(shop)/category/[slug]/page';
import { PageContentClient } from '@/app/(shop)/page/[slug]/PageContentClient';
import { ShopPageClient } from '@/app/(shop)/shop/ShopPageClient';
import { fetchCategoryOrSubCategory, getAllBrands, getCategories, getPageBySlug, getProductsByBrand, getStorageUrl } from '@/services/api';
import { ApiError } from '@/services/http';
import { buildCanonicalUrl, getBaseUrl, forceProteinDomain } from '@/util/canonical';
import { isReservedRouteSlug, buildProductUrlPath } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { buildCollectionPageSchema, buildItemListSchema, buildBreadcrumbListSchema, buildWebPageSchema } from '@/util/structuredData';
import type { Brand, Page } from '@/types';

export type RootSlugPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// ISR instead of force-dynamic: category/brand/CMS pages are the primary ranking
// targets, so their HTML must be cacheable. force-dynamic + revalidate:0 forced a
// live multi-call Laravel render on EVERY crawl — a direct cause of the fleet-wide
// "needs improvement" Core Web Vitals (slow TTFB, 0 "good" URLs). 10-min ISR keeps
// content fresh enough for a catalog while serving cached HTML to bots and users.
export const revalidate = 600;

function isNotFoundError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 404;
  const maybeAxios = error as { response?: { status?: number }; status?: number };
  return maybeAxios?.response?.status === 404 || maybeAxios?.status === 404;
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

async function hasCategoryOrSubCategory(slug: string): Promise<boolean> {
  try {
    await fetchCategoryOrSubCategory(slug);
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}

async function findBrandBySlug(slug: string): Promise<Brand | null> {
  const brands = await getAllBrands();
  return brands.find((brand) => nameToSlug(brand.designation_fr) === slug) ?? null;
}

async function findPageBySlug(slug: string): Promise<Page | null> {
  try {
    return await getPageBySlug(slug);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

function metadataForPage(page: Page, slug: string): Metadata {
  const title = page.meta_title?.trim() || page.title || 'Page | Proteine Tunisie';
  const description =
    page.meta_description?.trim() ||
    page.excerpt?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
    `Decouvrez ${page.title} sur Proteine Tunisie`;
  const canonical = page.canonical_url?.trim() || buildCanonicalUrl(`/${encodeURIComponent(slug)}`);
  const ogImage = page.og_image ? getStorageUrl(page.og_image) : undefined;

  return {
    title: { absolute: title },
    description: description.slice(0, 155),
    keywords: page.meta_keywords || undefined,
    alternates: { canonical },
    robots: {
      index: page.robots_index ?? true,
      follow: page.robots_follow ?? true,
    },
    openGraph: {
      title: page.og_title?.trim() || title,
      description: (page.og_description?.trim() || description).slice(0, 200),
      url: canonical,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

function metadataForBrand(brand: Brand, slug: string): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  // Force the apex protein.tn domain so the canonical can never point at a host that 301s
  // (www / legacy sobitas), which Search Console flags as "Google chose a different canonical".
  const canonical = forceProteinDomain(`${baseUrl}/${slug}`);
  // Accented + consistent with the page's own JSON-LD/CollectionPage ("Protéine", not "Proteine"),
  // so the <title>/description no longer mismatch the structured data on the same page.
  const title = `${brand.designation_fr} — Protéines & Compléments en Tunisie | Protéine Tunisie`;
  const description = `Découvrez tous les produits ${brand.designation_fr} en Tunisie : qualité premium, produits 100% authentiques, livraison rapide.`;
  const ogImage = '/slides/home-hero-web.webp';
  const ogAlt = `${brand.designation_fr} — Protéine Tunisie`;

  return {
    // absolute: the brand title already ends with "| Protéine Tunisie"; without this the root
    // layout template would append the brand a second time on these ranking-surface pages.
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export async function generateMetadata({ params }: RootSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug || isReservedRouteSlug(cleanSlug)) {
    return { title: 'Proteine Tunisie' };
  }

  if (await hasCategoryOrSubCategory(cleanSlug)) {
    return generateCategoryMetadata({ params });
  }

  const brand = await findBrandBySlug(cleanSlug);
  if (brand) {
    return metadataForBrand(brand, cleanSlug);
  }

  const page = await findPageBySlug(cleanSlug);
  if (page) {
    return metadataForPage(page, cleanSlug);
  }

  return { title: 'Page introuvable | Proteine Tunisie' };
}

export default async function RootSlugPage({ params }: RootSlugPageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();

  if (!cleanSlug || isReservedRouteSlug(cleanSlug)) {
    notFound();
  }

  if (await hasCategoryOrSubCategory(cleanSlug)) {
    return <CategoryPage params={params} />;
  }

  const brand = await findBrandBySlug(cleanSlug);
  if (brand?.id) {
    const result = await getProductsByBrand(brand.id);
    const categories = result.categories || await getCategories();
    // Resolve each product's subcategory so links + the ItemList below are canonical
    // /{subcat}/{slug} (not the /shop/{slug} 301). No-op if categories lack sous_categories.
    const brandProductsList = enrichProductsWithSubcategory(result.products, categories);
    const productsData = {
      products: brandProductsList,
      brands: result.brands,
      categories,
    };
    // Brand landing SEO: Breadcrumb + CollectionPage + ItemList (the product grid). Previously only
    // a bare BreadcrumbList was emitted, so brand pages (a primary ranking surface) were nearly
    // schema-less; the ItemList also gives Google the product URLs for internal-link discovery.
    const baseUrl = getBaseUrl();
    const brandTitle = `${brand.designation_fr} — Protéines & Compléments en Tunisie | Protéine Tunisie`;
    const brandDesc = `Tous les produits ${brand.designation_fr} en Tunisie : qualité premium, produits authentiques, livraison rapide partout dans le pays.`;
    const breadcrumbSchema = buildBreadcrumbListSchema(
      [
        { name: 'Accueil', url: '/' },
        { name: 'Boutique', url: '/shop' },
        { name: brand.designation_fr, url: `/${cleanSlug}` },
      ],
      baseUrl
    );
    const collectionSchema = buildCollectionPageSchema(brandTitle, `/${cleanSlug}`, baseUrl, { description: brandDesc });
    const brandProducts = Array.isArray(brandProductsList) ? brandProductsList : [];
    const itemListSchema = brandProducts.length > 0
      ? buildItemListSchema(
          brandProducts.slice(0, 20).map((p) => ({ name: p.designation_fr || 'Produit', url: buildProductUrlPath(p) })),
          baseUrl,
          { name: `Produits ${brand.designation_fr}` }
        )
      : null;

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
        {itemListSchema && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
        )}
        <ShopPageClient
          productsData={productsData}
          categories={categories}
          brands={result.brands}
          initialBrand={brand.id}
        />
      </>
    );
  }

  const page = await findPageBySlug(cleanSlug);
  if (page) {
    // CMS page: emit WebPage + Breadcrumb so this branch has parity with the dedicated
    // /page/[slug] route (which already does). Canonical mirrors metadataForPage above.
    const baseUrl = getBaseUrl();
    const canonical = page.canonical_url?.trim() || buildCanonicalUrl(`/${encodeURIComponent(cleanSlug)}`);
    const rawDesc = page.meta_description ?? page.excerpt ?? '';
    const description = rawDesc ? String(rawDesc).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) : undefined;
    const webPageSchema = buildWebPageSchema(page.title || 'Page', canonical, baseUrl, { description });
    const breadcrumbSchema = buildBreadcrumbListSchema(
      [{ name: 'Accueil', url: '/' }, { name: page.title || 'Page', url: `/${page.slug || cleanSlug}` }],
      baseUrl
    );
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <PageContentClient page={page} />
      </>
    );
  }

  /**
   * LEGACY NUMERIC SUFFIX on a listing slug (/creatine-2, /vitamines-2, /whey-isolate-5, …).
   * The old site paginated/duplicated category, subcategory and brand URLs by appending an index.
   * Every one of them is a hard 404 today (56 of them in the current Search Console export).
   *
   * This runs ONLY after category, subcategory, brand and CMS-page resolution have all failed, so
   * a real slug that happens to end in a number (omega-3, whey-80-2kg) is resolved above and never
   * reaches here. Sending the dead URL to its base listing in one 301 recovers the link equity
   * instead of dropping it.
   */
  const baseSlug = cleanSlug.replace(/-\d+$/, '');
  if (baseSlug && baseSlug !== cleanSlug) {
    permanentRedirect(`/${baseSlug}`);
  }

  notFound();
}
