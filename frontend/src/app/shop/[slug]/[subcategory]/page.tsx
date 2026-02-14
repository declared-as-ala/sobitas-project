import { Metadata } from 'next';
import { getProductsBySubCategory } from '@/services/api';
import { SubCategoryPageClient } from '@/app/shop/SubCategoryPageClient';

interface SubCategoryPageProps {
  params: Promise<{ slug: string; subcategory: string }>;
  searchParams: Promise<{ page?: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: SubCategoryPageProps): Promise<Metadata> {
  const { slug: categorySlug, subcategory: subcategorySlug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

  try {
    const result = await getProductsBySubCategory(subcategorySlug, { per_page: 1 });
    const subcategoryData = result.sous_category;

    if (!subcategoryData || !subcategoryData.designation_fr) {
      return {
        title: 'Sous-catégorie | SOBITAS',
        description: 'Découvrez nos produits par sous-catégorie.',
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
  } catch {
    return {
      title: 'Sous-catégorie | SOBITAS',
      description: 'Découvrez nos produits par sous-catégorie.',
    };
  }
}

/**
 * Sous-catégorie : tout le chargement et états (loading/empty/error) sont gérés côté client.
 * On ne fait jamais notFound() pour éviter 404 à tort (race, 0 produit, erreur réseau).
 */
export default async function SubCategoryPage({ params }: SubCategoryPageProps) {
  const { slug: categorySlug, subcategory: subcategorySlug } = await params;
  return (
    <SubCategoryPageClient
      categorySlug={categorySlug}
      subcategorySlug={subcategorySlug}
    />
  );
}
