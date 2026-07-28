import { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { getErrorStatus } from '@/util/errorStatus';
import { getStorageUrl } from '@/services/api';
// Request-scoped cache: generateMetadata + the page body issued two separate page/{slug} calls.
import { getCachedPageBySlug as getPageBySlug } from '@/services/getCachedProductDetails';
import { getBaseUrl, resolveCanonicalUrl } from '@/util/canonical';
import { buildWebPageSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { PageContentClient } from './PageContentClient';

export type PageProps = {
  params: Promise<{ slug: string }>;
};

// Legal/CMS pages (cookies, mentions légales, CGV…) are effectively static — cache with ISR
// (revalidate hourly) instead of re-fetching on every request. Rendered output is identical.
export const revalidate = 3600;

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
    // Guarded: a CMS canonical_url pointing at a dead or redirecting path falls back to self.
    const canonical = await resolveCanonicalUrl(page.canonical_url, `/${encodeURIComponent(page.slug || apiSlug)}`);
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
  } catch (e) {
    unstable_rethrow(e);
    // Genuine 404: the page body below calls notFound(); keep the interim shell out of the index.
    if (getErrorStatus(e) === 404) {
      return { title: 'Page introuvable | Proteine Tunisie', robots: { index: false, follow: false } };
    }
    // TRANSIENT: rethrow. revalidate=3600 here, so a swallowed 429 pinned a generic,
    // canonical-less shell for a full hour. The page body already rethrows — metadata must agree.
    throw e;
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const apiSlug = slugMapping[slug] ?? slug;

  try {
    const page = await getPageBySlug(apiSlug);
    if (!page) notFound();
    const baseUrl = getBaseUrl();
    // Guarded, and identical to the value generateMetadata emits — JSON-LD @id must not diverge.
    const canonical = await resolveCanonicalUrl(page.canonical_url, `/${encodeURIComponent(page.slug || apiSlug)}`);
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
    // Preserve the notFound() thrown for a genuinely missing page inside the try.
    unstable_rethrow(error);
    console.error('Error fetching page:', error);
    // Genuine 404 → 404. Transient failure → rethrow (never cache a wrong 404 on this ISR route).
    if (getErrorStatus(error) === 404) notFound();
    throw error;
  }
}
