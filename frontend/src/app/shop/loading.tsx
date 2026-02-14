import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProductsSkeleton } from '@/app/components/ProductsSkeleton';

export default function ShopLoading() {
  return (
    <>
      <Header />
      <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
        <ProductsSkeleton />
      </main>
      <Footer />
    </>
  );
}
