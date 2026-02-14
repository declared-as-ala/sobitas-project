import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories, getProductsBySubCategory } from '@/services/api';
import { ShopPageClient } from '../../ShopPageClient';
import { SubCategoryFallbackClient } from '@/app/shop/SubCategoryFallbackClient';
import type { Category } from '@/types';

interface SubCategoryPageProps {
  params: Promise<{ slug: string; subcategory: string }>;
  searchParams: Promise<{ page?: string }>;
}

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: SubCategoryPageProps): Promise<Metadata> {
  const { slug: categorySlug, subcategory: subcategorySlug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

  try {
    const result = await getProductsBySubCategory(subcategorySlug);
    const subcategoryData = result.sous_category;

    if (!subcategoryData || !subcategoryData.designation_fr) {
      return {
        title: 'Sous-catégorie non trouvée | SOBITAS',
        description: 'La sous-catégorie demandée n\'existe pas.',
      };
    }

    const categoryName = subcategoryData.categorie?.designation_fr || '';
    const title = `${subcategoryData.designation_fr} - ${categoryName} | SOBITAS Tunisie`;
    const description = `Découvrez notre sélection de ${subcategoryData.designation_fr.toLowerCase()} en Tunisie. Qualité premium, livraison rapide.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${baseUrl}/shop/${categorySlug}/${subcategorySlug}`,
      },
      openGraph: {
        title,
        description,
        url: `${baseUrl}/shop/${categorySlug}/${subcategorySlug}`,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'Sous-catégorie | SOBITAS',
      description: 'Découvrez nos produits par sous-catégorie.',
    };
  }
}

export default async function SubCategoryPage({ params, searchParams }: SubCategoryPageProps) {
  const { slug: categorySlug, subcategory: subcategorySlug } = await params;
  const { page } = await searchParams;

  console.log(`[SubCategoryPage] Resolving category: "${categorySlug}", subcategory: "${subcategorySlug}"`);

  try {
    const result = await getProductsBySubCategory(subcategorySlug);
    const subcategoryData = result.sous_category;

    if (!subcategoryData || !subcategoryData.designation_fr) {
      console.warn(`[SubCategoryPage] Subcategory "${subcategorySlug}" returned empty data`);
      notFound();
    }

    // Verify that the category slug matches
    if (subcategoryData.categorie?.slug !== categorySlug) {
      console.warn(`[SubCategoryPage] Category slug mismatch: expected "${categorySlug}", got "${subcategoryData.categorie?.slug}"`);
      // Redirect to correct URL if category doesn't match
      notFound();
    }

    console.log(`[SubCategoryPage] Found subcategory: "${subcategoryData.designation_fr}"`);

    const productsData = {
      products: result.products,
      brands: result.brands,
      categories: [],
    };
    const categories = await getCategories();
    const brands = result.brands;

    // Generate breadcrumb JSON-LD
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
    const parentCategory = categories.find(c => c.slug === categorySlug);
    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: baseUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Boutique',
          item: `${baseUrl}/shop`,
        },
        ...(parentCategory ? [{
          '@type': 'ListItem',
          position: 3,
          name: parentCategory.designation_fr,
          item: `${baseUrl}/shop/${categorySlug}`,
        }] : []),
        {
          '@type': 'ListItem',
          position: parentCategory ? 4 : 3,
          name: subcategoryData.designation_fr,
          item: `${baseUrl}/shop/${categorySlug}/${subcategorySlug}`,
        },
      ],
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <ShopPageClient
          productsData={productsData}
          categories={categories}
          brands={brands}
          initialCategory={subcategorySlug}
          isSubcategory={true}
          parentCategory={categorySlug}
        />
      </>
    );
  } catch (error: any) {
    console.warn('[SubCategoryPage] Fetch error:', error?.message || error);
    if (error?.response?.status === 404 || error?.message === 'Subcategory not found') {
      notFound();
    }
    return (
      <SubCategoryFallbackClient
        categorySlug={categorySlug}
        subcategorySlug={subcategorySlug}
      />
    );
  }
}
