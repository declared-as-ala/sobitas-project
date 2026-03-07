import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export default function BrandLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <LoadingSpinner fullScreen message="Chargement de la marque..." />
    </div>
  );
}
