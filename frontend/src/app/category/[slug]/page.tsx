import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories } from '@/services/api';
import { fetchCategoryOrSubCategory } from '@/services/api';
import { ShopPageClient } from '@/app/shop/ShopPageClient';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductsSkeleton } from '@/app/components/ProductsSkeleton';
import { Suspense } from 'react';

export type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { type, data } = await fetchCategoryOrSubCategory(slug);
    const title =
      type === 'subcategory'
        ? (data as any).sous_category?.designation_fr
        : (data as any).category?.designation_fr;
    return {
      title: title ? `${title} | SOBITAS Tunisie` : 'Catégorie | SOBITAS',
      description: `Découvrez notre sélection ${title ? `- ${title}` : ''}. Qualité premium, livraison rapide.`,
    };
  } catch {
    return { title: 'Catégorie | SOBITAS' };
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug) notFound();

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    categories = await getCategories();
  } catch (e) {
    console.error('Error fetching categories:', e);
  }

  try {
    const { type, data } = await fetchCategoryOrSubCategory(cleanSlug);

    if (type === 'subcategory') {
      const sub = data as {
        sous_category: any;
        products: any[];
        brands: any[];
        sous_categories: any[];
        pagination?: any;
      };
      const productsData = {
        products: sub.products ?? [],
        brands: sub.brands ?? [],
        categories: [],
      };
      return (
        <Suspense
          fallback={
            <>
              <Header />
              <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
                <ProductsSkeleton />
              </main>
              <Footer />
            </>
          }
        >
          <ShopPageClient
            productsData={productsData}
            categories={categories}
            brands={sub.brands ?? []}
            initialCategory={cleanSlug}
            isSubcategory
            parentCategory={sub.sous_category?.categorie?.slug ?? undefined}
          />
        </Suspense>
      );
    }

    if (type === 'category') {
      const cat = data as {
        category: any;
        sous_categories: any[];
        products: any[];
        brands: any[];
      };
      const productsData = {
        products: cat.products ?? [],
        brands: cat.brands ?? [],
        categories: [],
      };
      return (
        <Suspense
          fallback={
            <>
              <Header />
              <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
                <ProductsSkeleton />
              </main>
              <Footer />
            </>
          }
        >
          <ShopPageClient
            productsData={productsData}
            categories={categories}
            brands={cat.brands ?? []}
            initialCategory={cleanSlug}
          />
        </Suspense>
      );
    }
  } catch (err) {
    console.error('Category/SubCategory fetch error:', err);
    notFound();
  }

  notFound();
}
