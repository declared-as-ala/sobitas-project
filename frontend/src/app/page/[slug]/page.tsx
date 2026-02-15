import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageBySlug } from '@/services/api';
import { PageContentClient } from './PageContentClient';

export type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const slugMapping: Record<string, string> = {
  cookies: 'politique-des-cookies',
  'conditions-generales': 'conditions-generale-de-ventes-protein.tn',
  'politique-de-remboursement': 'politique-de-remboursement',
  'mentions-legales': 'mentions-legales',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params;
  const apiSlug = slugMapping[slug] ?? slug;
  try {
    const page = await getPageBySlug(apiSlug);
    return {
      title: page.title ?? 'Page',
      description:
        page.meta_description ??
        page.excerpt ??
        `Découvrez ${page.title} sur SOBITAS - Protéine Tunisie`,
      keywords: page.meta_keywords ?? undefined,
    };
  } catch {
    return {
      title: 'Page | SOBITAS',
      description: 'Découvrez notre page sur SOBITAS - Protéine Tunisie',
    };
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const apiSlug = slugMapping[slug] ?? slug;

  try {
    const page = await getPageBySlug(apiSlug);
    if (!page) notFound();
    return <PageContentClient page={page} />;
  } catch (error) {
    console.error('Error fetching page:', error);
    notFound();
  }
}
