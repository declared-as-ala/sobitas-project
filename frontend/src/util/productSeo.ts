import type { Metadata } from 'next';

import { getStorageUrl, toSiteMedia } from '@/services/api';
import type { Product } from '@/types';
import { productImageAlt } from '@/util/productAlt';

/** Absolute HTTPS image URL for OG/Twitter when the API already exposes one. */
export function productImageForMetadata(product: Product): string | undefined {
  const direct = product.seo?.image?.trim() || product.schema?.image?.trim();
  if (direct && /^https?:\/\//i.test(direct) && !/\s/.test(direct)) {
    // Same-origin like every rendered image — see toSiteMedia.
    return toSiteMedia(direct);
  }
  const path = product.cover?.trim();
  if (!path) return undefined;
  const u = getStorageUrl(path);
  if (!u || /\s/.test(u) || !/^https?:\/\//i.test(u)) return undefined;
  return u;
}

export function buildShopProductSocialMetadata(params: {
  product: Product;
  title: string;
  description: string;
  canonicalUrl: string;
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const { product, title, description, canonicalUrl } = params;
  const imageUrl = productImageForMetadata(product);
  // The page's main-image alt, from the builder both renders use (util/productAlt.ts) — not the
  // backend's « NAME — Brand — Tunisie » template, which doubled the brand and kept mojibake.
  const alt = productImageAlt(product, { role: 'main' });
  const desc = description.trim();
  const openGraph: NonNullable<Metadata['openGraph']> = {
    type: 'website',
    url: canonicalUrl,
    title,
    ...(desc ? { description: desc } : {}),
    ...(imageUrl
      ? {
          images: [{ url: imageUrl, alt: alt || 'Produit' }],
        }
      : {}),
  };
  const twitter: NonNullable<Metadata['twitter']> = {
    card: 'summary_large_image',
    title,
    ...(desc ? { description: desc } : {}),
    ...(imageUrl ? { images: [imageUrl] } : {}),
  };
  return { openGraph, twitter };
}
