import { unstable_cache } from 'next/cache';
import { getAllBrands } from '@/services/api';
import type { Brand } from '@/types';

/** Shared name lookup for category links and comparison tables. Never cache an empty response. */
export const loadBrands = unstable_cache(
  async (): Promise<Brand[]> => {
    const rows = await getAllBrands();
    if (rows.length === 0) throw new Error('empty brand list');
    return rows.map(({ id, designation_fr }) => ({ id, designation_fr }) as Brand);
  },
  ['category-brand-links-brands'],
  { revalidate: 3600, tags: ['brands'] }
);
