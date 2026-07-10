import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export default function BrandLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <LoadingSpinner fullScreen message="Chargement de la marque..." />
    </div>
  );
}
