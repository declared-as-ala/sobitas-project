import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCategories } from '@/services/api';
import { fetchCategoryOrSubCategory } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildWebPageSchema, buildItemListSchema, validateStructuredData } from '@/util/structuredData';
import { getCategorySeoContent } from '@/util/categorySeoContent';
import { CategorySeoLanding } from '@/app/category/CategorySeoLanding';
import { ShopPageClient } from '@/app/shop/ShopPageClient';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductsSkeleton } from '@/app/components/ProductsSkeleton';
import { Suspense } from 'react';
import type { Category, SubCategory } from '@/types';

export type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Legacy/wrong slugs → canonical slug (from API). Ensures correct API response and SEO. */
const slugAliases: Record<string, string> = {
  'bandages-de-soutien-musculaire': 'bandes-de-soutien-musculaire',
};

function getCanonicalSlug(slug: string): string {
  return slugAliases[slug] ?? slug;
}

/** Resolve category/subcategory slugs to links (name + url). */
function resolveRelatedCategories(
  slugs: string[],
  categories: Category[]
): Array<{ slug: string; name: string; url: string }> {
  const out: Array<{ slug: string; name: string; url: string }> = [];
  for (const s of slugs.slice(0, 6)) {
    const cat = categories.find((c) => c.slug === s);
    if (cat) {
      out.push({ slug: cat.slug, name: cat.designation_fr, url: `/category/${cat.slug}` });
      continue;
    }
    for (const c of categories) {
      const sub = (c.sous_categories || []).find((sc: SubCategory) => sc.slug === s);
      if (sub) {
        out.push({ slug: sub.slug, name: sub.designation_fr, url: `/category/${sub.slug}` });
        break;
      }
    }
  }
  return out;
}

/** Resolve product slugs to links from a product list. */
function resolveBestProducts(
  slugs: string[],
  products: Array<{ slug?: string; designation_fr?: string }>
): Array<{ slug: string; name: string; url: string }> {
  const bySlug = new Map(products.map((p) => [p.slug ?? '', p]));
  return slugs.slice(0, 6).reduce<Array<{ slug: string; name: string; url: string }>>((acc, s) => {
    const p = bySlug.get(s);
    if (p) acc.push({ slug: s, name: p.designation_fr ?? s, url: `/shop/${s}` });
    return acc;
  }, []);
}

/** CTR-optimized meta title: 55–60 chars, keyword + Tunisia + brand. */
const META_TITLE_MAX_LEN = 60;

function toMetaTitle(seoH1: string | undefined, fallbackName: string | undefined): string {
  if (seoH1?.trim()) {
    const trimmed = seoH1.trim();
    if (trimmed.length <= META_TITLE_MAX_LEN) return trimmed;
    const cut = trimmed.slice(0, META_TITLE_MAX_LEN - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  }
  return fallbackName ? `${fallbackName} | SOBITAS Tunisie` : 'Catégorie | SOBITAS';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = getCanonicalSlug(slug?.trim() ?? '');
  try {
    const { type, data } = await fetchCategoryOrSubCategory(canonicalSlug);
    const apiTitle =
      type === 'subcategory'
        ? (data as any).sous_category?.designation_fr
        : (data as any).category?.designation_fr;
    const seoContent = await getCategorySeoContent(canonicalSlug);
    const metaTitle = toMetaTitle(seoContent?.h1, apiTitle);
    const description = seoContent?.intro?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
      || `Découvrez notre sélection ${apiTitle ? `- ${apiTitle}` : ''}. Qualité premium, livraison rapide Tunisie.`;
    return {
      title: metaTitle,
      description,
      alternates: {
        canonical: buildCanonicalUrl(`/category/${encodeURIComponent(canonicalSlug)}`),
      },
      openGraph: { title: metaTitle, description: description.slice(0, 160) },
    };
  } catch {
    return { title: 'Catégorie | SOBITAS' };
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) notFound();

  const canonicalSlug = getCanonicalSlug(cleanSlug);
  if (canonicalSlug !== cleanSlug) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[category] Slug alias: "${cleanSlug}" → "${canonicalSlug}"`);
    }
    redirect(`/category/${encodeURIComponent(canonicalSlug)}`);
  }

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    categories = await getCategories();
  } catch (e) {
    console.error('Error fetching categories:', e);
  }

  try {
    const { type, data } = await fetchCategoryOrSubCategory(canonicalSlug);

    if (type === 'subcategory') {
      const sub = data as {
        sous_category: any;
        products: any[];
        brands: any[];
        sous_categories: any[];
        pagination?: any;
      };
      const productsData = {
        products: sub.products ?? [],
        brands: sub.brands ?? [],
        categories: [],
      };
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';
      const parentCat = sub.sous_category?.categorie;
      const breadcrumbItems = [
        { name: 'Accueil', url: '/' },
        ...(parentCat?.slug
          ? [
              { name: parentCat.designation_fr || parentCat.slug, url: `/category/${parentCat.slug}` },
              { name: sub.sous_category?.designation_fr || canonicalSlug, url: `/category/${canonicalSlug}` },
            ]
          : [{ name: sub.sous_category?.designation_fr || canonicalSlug, url: `/category/${canonicalSlug}` }]),
      ];
      const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, baseUrl);
      validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
      const pageTitle = sub.sous_category?.designation_fr || canonicalSlug;
      const webPageSchema = buildWebPageSchema(pageTitle, `/category/${canonicalSlug}`, baseUrl);
      const productList = (sub.products ?? []).slice(0, 20).map((p: any) => ({ name: p.designation_fr || p.slug, url: `/shop/${p.slug}` })).filter((p: { name: string; url: string }) => p.url !== '/shop/');
      const itemListSchema = productList.length > 0 ? buildItemListSchema(productList, baseUrl, { name: pageTitle }) : null;

      const seoContent = await getCategorySeoContent(canonicalSlug);
      const title = seoContent?.h1?.trim() || sub.sous_category?.designation_fr || canonicalSlug;
      const relatedCategories = resolveRelatedCategories(
        seoContent?.relatedCategorySlugs ?? [],
        categories
      );
      const bestProducts = resolveBestProducts(
        seoContent?.bestProductSlugs?.length ? seoContent.bestProductSlugs : (productsData.products as any[]).slice(0, 6).map((p: any) => p.slug).filter(Boolean),
        productsData.products as any[]
      );
      const categorySeoLanding = (
        <CategorySeoLanding
          title={title}
          intro={seoContent?.intro ?? null}
          howToChooseTitle={seoContent?.howToChooseTitle ?? null}
          howToChooseBody={seoContent?.howToChooseBody ?? null}
          faqs={seoContent?.faqs ?? []}
          relatedCategories={relatedCategories}
          bestProducts={bestProducts}
          section="top"
        />
      );
      const categorySeoLandingBottom = (relatedCategories.length > 0 || bestProducts.length > 0) ? (
        <CategorySeoLanding
          title={title}
          intro={null}
          howToChooseTitle={null}
          howToChooseBody={null}
          faqs={[]}
          relatedCategories={relatedCategories}
          bestProducts={bestProducts}
          section="bottom"
        />
      ) : null;

      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
          {itemListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />}
          <Suspense
            fallback={
              <>
                <Header />
                <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
                  <ProductsSkeleton />
                </main>
                <Footer />
              </>
            }
          >
            <ShopPageClient
              productsData={productsData}
              categories={categories}
              brands={sub.brands ?? []}
              initialCategory={canonicalSlug}
              isSubcategory
              parentCategory={sub.sous_category?.categorie?.slug ?? undefined}
              categorySeoLanding={categorySeoLanding}
              categorySeoLandingBottom={categorySeoLandingBottom}
            />
          </Suspense>
        </>
      );
    }

    if (type === 'category') {
      const cat = data as {
        category: any;
        sous_categories: any[];
        products: any[];
        brands: any[];
      };
      const productsData = {
        products: cat.products ?? [],
        brands: cat.brands ?? [],
        categories: [],
      };
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';
      const breadcrumbItems = [
        { name: 'Accueil', url: '/' },
        { name: cat.category?.designation_fr || canonicalSlug, url: `/category/${canonicalSlug}` },
      ];
      const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, baseUrl);
      validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
      const pageTitleCat = cat.category?.designation_fr || canonicalSlug;
      const webPageSchemaCat = buildWebPageSchema(pageTitleCat, `/category/${canonicalSlug}`, baseUrl);
      const productListCat = (cat.products ?? []).slice(0, 20).map((p: any) => ({ name: p.designation_fr || p.slug, url: `/shop/${p.slug}` })).filter((p: { name: string; url: string }) => p.url !== '/shop/');
      const itemListSchemaCat = productListCat.length > 0 ? buildItemListSchema(productListCat, baseUrl, { name: pageTitleCat }) : null;

      const seoContent = await getCategorySeoContent(canonicalSlug);
      const title = seoContent?.h1?.trim() || cat.category?.designation_fr || canonicalSlug;
      const relatedSlugs = (seoContent?.relatedCategorySlugs?.length ? seoContent.relatedCategorySlugs : categories.filter((c) => c.slug !== canonicalSlug).slice(0, 6).map((c) => c.slug)) as string[];
      const relatedCategories = resolveRelatedCategories(relatedSlugs, categories);
      const bestProducts = resolveBestProducts(
        seoContent?.bestProductSlugs?.length ? seoContent.bestProductSlugs : (productsData.products as any[]).slice(0, 6).map((p: any) => p.slug).filter(Boolean),
        productsData.products as any[]
      );
      const categorySeoLanding = (
        <CategorySeoLanding
          title={title}
          intro={seoContent?.intro ?? null}
          howToChooseTitle={seoContent?.howToChooseTitle ?? null}
          howToChooseBody={seoContent?.howToChooseBody ?? null}
          faqs={seoContent?.faqs ?? []}
          relatedCategories={relatedCategories}
          bestProducts={bestProducts}
          section="top"
        />
      );
      const categorySeoLandingBottom = (relatedCategories.length > 0 || bestProducts.length > 0) ? (
        <CategorySeoLanding
          title={title}
          intro={null}
          howToChooseTitle={null}
          howToChooseBody={null}
          faqs={[]}
          relatedCategories={relatedCategories}
          bestProducts={bestProducts}
          section="bottom"
        />
      ) : null;

      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchemaCat) }} />
          {itemListSchemaCat && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchemaCat) }} />}
          <Suspense
            fallback={
              <>
                <Header />
                <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
                  <ProductsSkeleton />
                </main>
                <Footer />
              </>
            }
          >
            <ShopPageClient
              productsData={productsData}
              categories={categories}
              brands={cat.brands ?? []}
              initialCategory={canonicalSlug}
              categorySeoLanding={categorySeoLanding}
              categorySeoLandingBottom={categorySeoLandingBottom}
            />
          </Suspense>
        </>
      );
    }
  } catch (err) {
    console.error('Category/SubCategory fetch error:', err);
    notFound();
  }

  notFound();
}
