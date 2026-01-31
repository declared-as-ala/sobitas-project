import { Metadata } from 'next';
import { getAllProducts, getCategories, getAllBrands } from '@/services/api';
import { ShopPageClient } from './ShopPageClient';

export const metadata: Metadata = {
  title: 'Boutique Protéines & Compléments Alimentaires Tunisie | SOBITAS',
  description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide. Filtrez par marque et catégorie.',
};

async function getShopData() {
  try {
    const [productsData, categories, brands] = await Promise.all([
      getAllProducts(),
      getCategories(),
      getAllBrands(),
    ]);
    return { productsData, categories, brands };
  } catch (error) {
    console.error('Error fetching shop data:', error);
    return {
      productsData: { products: [], brands: [], categories: [] },
      categories: [],
      brands: [],
    };
  }
}

export default async function ShopPage() {
  const { productsData, categories, brands } = await getShopData();

  return <ShopPageClient productsData={productsData} categories={categories} brands={brands} />;
}
