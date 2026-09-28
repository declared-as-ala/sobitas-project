import { unstable_cache } from 'next/cache';
import { getInStockCount } from '@/services/api';

/** Shared five-minute shop-wide count for the shop page and homepage snippet. */
export const loadInStockCount = unstable_cache(() => getInStockCount(), ['shop-in-stock-count'], {
  revalidate: 300,
  tags: ['shop', 'products'],
});
