import { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { getAllBrands } from '@/services/api';

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
        title: 'Marque non trouvée | Proteine Tunisie',
        description: 'La marque demandée n\'existe pas.',
      };
    }

    const title = `${brand.designation_fr} - Protéines & Compléments Tunisie | Proteine Tunisie`;
    const description = `Découvrez tous les produits ${brand.designation_fr} en Tunisie. Qualité premium, livraison rapide.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${baseUrl}/${brandSlug}`,
      },
      openGraph: {
        title,
        description,
        url: `${baseUrl}/${brandSlug}`,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'Marque | Proteine Tunisie',
      description: 'Découvrez nos produits par marque.',
    };
  }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug: brandSlug } = await params;
  // /brand/{slug} is a legacy duplicate of the canonical brand URL /{slug} (its rel=canonical
  // already pointed there). 301 so Google consolidates on a single indexable brand URL instead
  // of crawling a second identical copy.
  permanentRedirect(`/${encodeURIComponent(brandSlug)}`);
}
