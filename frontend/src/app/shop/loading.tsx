import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductsSkeleton } from '@/app/components/ProductsSkeleton';

export default function ShopLoading() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <ProductsSkeleton />
      </main>
      <Footer />
    </>
  );
}
