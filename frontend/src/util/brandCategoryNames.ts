import type { Product } from '@/types';

/** Brand subcategories ranked by the number of listed products in each one. */
export function getBrandCategoryNames(products: Product[]): string[] {
  const counts = new Map<string, { name: string; count: number }>();

  for (const product of products) {
    const seen = new Set<string>();
    for (const category of [product.sous_categorie, ...(product.sous_categories ?? [])]) {
      const name = category?.designation_fr?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { name, count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'))
    .map(({ name }) => name);
}
