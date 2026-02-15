import { redirect } from 'next/navigation';

export type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Legacy: /product/:slug redirects to official product URL /shop/:slug.
 * Uses replace to avoid doubling history. Preserves query params.
 */
export default async function ProductRedirectPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) redirect('/shop');

  const sp = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  Object.entries(sp).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v));
    } else if (value != null && value !== '') {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  const dest = `/shop/${encodeURIComponent(cleanSlug)}${queryString ? `?${queryString}` : ''}`;
  redirect(dest, 'replace');
}
