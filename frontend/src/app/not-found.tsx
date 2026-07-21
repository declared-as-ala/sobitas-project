import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { NotFoundContent } from '@/app/components/NotFoundContent';

/**
 * Root 404 — used for URLs that match no route at all.
 *
 * This file lives outside every route group, so it does NOT inherit (shop)/layout.tsx and must
 * render its own chrome. Storefront 404s (a notFound() from inside the group) are handled by
 * app/(shop)/not-found.tsx instead, which inherits chrome from the group layout.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Header />
      <NotFoundContent />
      <Footer />
    </div>
  );
}
