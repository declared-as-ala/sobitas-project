import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageBySlug } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { PageContentClient } from './PageContentClient';
import type { Page } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await getPageBySlug(slug);
    return {
      title: page.title || 'Page',
      description: page.meta_description || page.excerpt || `Découvrez ${page.title} sur SOBITAS - Protéine Tunisie`,
      keywords: page.meta_keywords || undefined,
    };
  } catch (error) {
    return {
      title: 'Page | SOBITAS',
      description: 'Découvrez notre page sur SOBITAS - Protéine Tunisie',
    };
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;

  try {
    const page = await getPageBySlug(slug);
    
    if (!page) {
      notFound();
    }

    return <PageContentClient page={page} />;
  } catch (error) {
    console.error('Error fetching page:', error);
    notFound();
  }
}
