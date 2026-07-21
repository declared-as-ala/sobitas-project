import { permanentRedirect } from 'next/navigation';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { buildProductUrlPath, getProductPrimarySubCategory } from '@/util/productUrl';

export type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Legacy: /product/:slug.
 * Resolves the product and 301s directly to the new canonical /{sousCategorySlug}/{productSlug}
 * — single hop, no chain through /shop/.
 */
export default async function ProductRedirectPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) permanentRedirect('/shop');

  const sp = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  Object.entries(sp).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value != null && value !== '') query.set(key, value);
  });
  const queryString = query.toString();

  let target = `/shop/${encodeURIComponent(cleanSlug)}`;
  try {
    const product = await getCachedProductDetails(cleanSlug);
    if (product?.slug && getProductPrimarySubCategory(product)?.slug) {
      target = buildProductUrlPath(product);
    }
  } catch {
    // fall through to /shop/{slug} which will itself 301 if it can resolve
  }
  permanentRedirect(`${target}${queryString ? `?${queryString}` : ''}`);
}
