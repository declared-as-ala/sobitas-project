import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageBySlug, getStorageUrl } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildWebPageSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
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
  const { slug } = await params;
  const apiSlug = slugMapping[slug] ?? slug;

  try {
    const page = await getPageBySlug(apiSlug);
    const canonical = page.canonical_url?.trim() || buildCanonicalUrl(`/${encodeURIComponent(page.slug || apiSlug)}`);
    const description = page.meta_description ?? page.excerpt ?? `Decouvrez ${page.title} sur Proteine Tunisie`;
    const ogImage = page.og_image ? getStorageUrl(page.og_image) : undefined;

    return {
      title: { absolute: page.meta_title?.trim() || page.title || 'Page' },
      description,
      keywords: page.meta_keywords ?? undefined,
      alternates: { canonical },
      robots: {
        index: page.robots_index ?? true,
        follow: page.robots_follow ?? true,
      },
      openGraph: {
        title: page.og_title?.trim() || page.meta_title?.trim() || page.title || 'Page',
        description: page.og_description?.trim() || description,
        url: canonical,
        type: 'website',
        ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      },
    };
  } catch {
    return {
      title: 'Page | Proteine Tunisie',
      description: 'Decouvrez notre page sur Proteine Tunisie',
    };
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const apiSlug = slugMapping[slug] ?? slug;

  try {
    const page = await getPageBySlug(apiSlug);
    if (!page) notFound();
    const baseUrl = getBaseUrl();
    const canonical = page.canonical_url?.trim() || buildCanonicalUrl(`/${encodeURIComponent(page.slug || apiSlug)}`);
    const rawDesc = page.meta_description ?? page.excerpt ?? '';
    const description = rawDesc ? String(rawDesc).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) : undefined;
    const webPageSchema = buildWebPageSchema(page.title || 'Page', canonical, baseUrl, { description });
    const breadcrumbSchema = buildBreadcrumbListSchema(
      [{ name: 'Accueil', url: '/' }, { name: page.title || 'Page', url: `/${page.slug || apiSlug}` }],
      baseUrl
    );
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <PageContentClient page={page} />
      </>
    );
  } catch (error) {
    console.error('Error fetching page:', error);
    notFound();
  }
}
