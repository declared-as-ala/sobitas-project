import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCategories, getProductsByCategory, getProductsBySubCategory, getAllBrands } from '@/services/api';
import { ShopPageClient } from '../ShopPageClient';
import type { Category } from '@/types';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to generate slug from name
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

  try {
    // Try as category first
    let categoryData;
    try {
      const result = await getProductsByCategory(categorySlug);
      categoryData = result.category;
    } catch {
      // Try as subcategory
      try {
        const result = await getProductsBySubCategory(categorySlug);
        categoryData = result.sous_category;
      } catch {
        return {
          title: 'Catégorie non trouvée | SOBITAS',
          description: 'La catégorie demandée n\'existe pas.',
        };
      }
    }

    if (!categoryData || !categoryData.designation_fr) {
      return {
        title: 'Catégorie non trouvée | SOBITAS',
        description: 'La catégorie demandée n\'existe pas.',
      };
    }

    const title = `${categoryData.designation_fr} - Protéines & Compléments Tunisie | SOBITAS`;
    const description = `Découvrez notre sélection de ${categoryData.designation_fr.toLowerCase()} en Tunisie. Qualité premium, livraison rapide.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${baseUrl}/shop/${categorySlug}`,
      },
      openGraph: {
        title,
        description,
        url: `${baseUrl}/shop/${categorySlug}`,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'Catégorie | SOBITAS',
      description: 'Découvrez nos produits par catégorie.',
    };
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const { page } = await searchParams;

  try {
    // Try as category first
    let categoryData;
    let productsData;
    let categories;
    let brands;
    let isSubcategory = false;

    try {
      const result = await getProductsByCategory(categorySlug);
      categoryData = result.category;
      productsData = { products: result.products, brands: result.brands, categories: [] };
      categories = await getCategories();
      brands = result.brands;
    } catch {
      // Try as subcategory
      try {
        const result = await getProductsBySubCategory(categorySlug);
        categoryData = result.sous_category;
        productsData = { products: result.products, brands: result.brands, categories: [] };
        categories = await getCategories();
        brands = result.brands;
        isSubcategory = true;
      } catch {
        notFound();
      }
    }

    if (!categoryData || !categoryData.designation_fr) {
      notFound();
    }

    // Generate breadcrumb JSON-LD
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
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
        {
          '@type': 'ListItem',
          position: 3,
          name: categoryData.designation_fr,
          item: `${baseUrl}/shop/${categorySlug}`,
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
          initialCategory={categorySlug}
          isSubcategory={isSubcategory}
        />
      </>
    );
  } catch (error) {
    console.error('Error fetching category data:', error);
    notFound();
  }
}
