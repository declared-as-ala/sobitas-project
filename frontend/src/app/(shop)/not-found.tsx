import { NotFoundContent } from '@/app/components/NotFoundContent';

/**
 * 404 for storefront routes — i.e. any notFound() thrown from inside the (shop) group, such as an
 * unknown category or product slug from the [slug] catch-all.
 *
 * Deliberately renders NO Header/Footer: this boundary sits inside (shop)/layout.tsx and inherits
 * them. Adding them here would render the chrome twice, which is the exact bug the route group
 * was created to remove.
 */
export default function ShopNotFound() {
  return <div className="min-h-[60vh] flex flex-col">
    <NotFoundContent />
  </div>;
}
