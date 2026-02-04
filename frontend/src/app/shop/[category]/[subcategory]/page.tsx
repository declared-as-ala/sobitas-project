import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories, getProductsBySubCategory, getAllBrands } from '@/services/api';
import { ShopPageClient } from '../../ShopPageClient';
import type { Category } from '@/types';

interface SubCategoryPageProps {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ page?: string }>;
}

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: SubCategoryPageProps): Promise<Metadata> {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
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
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  const { page } = await searchParams;

  try {
    const result = await getProductsBySubCategory(subcategorySlug);
    const subcategoryData = result.sous_category;

    if (!subcategoryData || !subcategoryData.designation_fr) {
      notFound();
    }

    // Verify that the category slug matches
    if (subcategoryData.categorie?.slug !== categorySlug) {
      // Redirect to correct URL if category doesn't match
      notFound();
    }

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
  } catch (error) {
    console.error('Error fetching subcategory data:', error);
    notFound();
  }
}
