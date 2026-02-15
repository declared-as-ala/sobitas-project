import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductDetails, getSimilarProducts } from '@/services/api';
import { ProductDetailClient } from '@/app/products/[id]/ProductDetailClient';
import type { Product } from '@/types';

export type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductDetails(slug);
    const title = product.designation_fr ?? product.slug ?? 'Produit';
    return {
      title: `${title} | SOBITAS Tunisie`,
      description: product.meta_description_fr ?? product.description_fr?.replace(/<[^>]*>/g, '').slice(0, 160) ?? `Acheter ${title} - SOBITAS`,
    };
  } catch {
    return { title: 'Produit | SOBITAS' };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) notFound();

  let product: Product;
  try {
    product = await getProductDetails(cleanSlug);
  } catch (e) {
    console.error('Product fetch error:', e);
    notFound();
  }

  if (!product?.id) notFound();

  let similarProducts: Product[] = [];
  if (product.sous_categorie_id) {
    try {
      const similar = await getSimilarProducts(product.sous_categorie_id);
      similarProducts = similar?.products ?? [];
    } catch {
      // ignore
    }
  }

  return <ProductDetailClient product={product} similarProducts={similarProducts} slugOverride={cleanSlug} />;
}
