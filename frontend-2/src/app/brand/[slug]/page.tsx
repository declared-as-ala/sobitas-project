import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllBrands, getProductsByBrand, getCategories } from '@/services/api';
import { ShopPageClient } from '@/app/shop/ShopPageClient';
import type { Brand } from '@/types';

interface BrandPageProps {
  params: Promise<{ slug: string }>;
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

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug: brandSlug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

  try {
    const brands = await getAllBrands();
    const brand = brands.find(b => {
      // Try to match by slug if brand has slug, otherwise generate from name
      const brandSlugFromName = nameToSlug(b.designation_fr);
      return brandSlugFromName === brandSlug;
    });

    if (!brand) {
      return {
        title: 'Marque non trouvée | SOBITAS',
        description: 'La marque demandée n\'existe pas.',
      };
    }

    const title = `${brand.designation_fr} - Protéines & Compléments Tunisie | SOBITAS`;
    const description = `Découvrez tous les produits ${brand.designation_fr} en Tunisie. Qualité premium, livraison rapide.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${baseUrl}/brand/${brandSlug}`,
      },
      openGraph: {
        title,
        description,
        url: `${baseUrl}/brand/${brandSlug}`,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'Marque | SOBITAS',
      description: 'Découvrez nos produits par marque.',
    };
  }
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { slug: brandSlug } = await params;
  const { page } = await searchParams;

  try {
    const brands = await getAllBrands();
    const brand = brands.find(b => {
      const brandSlugFromName = nameToSlug(b.designation_fr);
      return brandSlugFromName === brandSlug;
    });

    if (!brand || !brand.id) {
      notFound();
    }

    const result = await getProductsByBrand(brand.id);
    const productsData = {
      products: result.products,
      brands: result.brands,
      categories: result.categories || [],
    };
    const categories = result.categories || await getCategories();

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
          name: brand.designation_fr,
          item: `${baseUrl}/brand/${brandSlug}`,
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
          brands={result.brands}
          initialBrand={brand.id}
        />
      </>
    );
  } catch (error) {
    console.error('Error fetching brand data:', error);
    notFound();
  }
}
