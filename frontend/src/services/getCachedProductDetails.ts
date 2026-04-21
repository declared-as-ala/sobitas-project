import { cache } from 'react';

import { getProductDetails } from '@/services/api';

/**
 * Dedupe `getProductDetails` within one RSC request (e.g. `generateMetadata` + page).
 * Import only from Server Components / server-only modules — not from client components.
 */
export const getCachedProductDetails = cache((slug: string) => getProductDetails(slug));
