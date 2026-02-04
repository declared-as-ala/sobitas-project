'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Search, Grid, List, ArrowRight, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getAllBrands, getStorageUrl } from '@/services/api';
import type { Brand } from '@/types';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

// Helper to generate slug from name
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();
}

export default function BrandsPageClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const brandsData = await getAllBrands();
        setBrands(brandsData);
        setFilteredBrands(brandsData);
      } catch (error) {
        console.error('Error fetching brands:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBrands(brands);
    } else {
      const filtered = brands.filter((brand) =>
        brand.designation_fr?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBrands(filtered);
    }
  }, [searchQuery, brands]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Chargement des marques..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Nos Marques Partenaires
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Découvrez toutes nos marques officielles de compléments alimentaires et nutrition sportive
          </p>
        </motion.div>

        {/* Search and View Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between"
        >
          {/* Search Bar */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher une marque..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl border-gray-300 dark:border-gray-700"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-lg"
            >
              <Grid className="h-4 w-4 mr-2" />
              Grille
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-lg"
            >
              <List className="h-4 w-4 mr-2" />
              Liste
            </Button>
          </div>
        </motion.div>

        {/* Results Count */}
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredBrands.length} marque{filteredBrands.length > 1 ? 's' : ''} trouvée{filteredBrands.length > 1 ? 's' : ''}
            </p>
          </motion.div>
        )}

        {/* Brands Display */}
        {filteredBrands.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aucune marque trouvée
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Essayez avec d'autres mots-clés
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
            >
              Réinitialiser la recherche
            </Button>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredBrands.map((brand, index) => (
              <BrandCard key={brand.id} brand={brand} index={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBrands.map((brand, index) => (
              <BrandListItem key={brand.id} brand={brand} index={index} />
            ))}
          </div>
        )}
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}

// Brand Card Component (Grid View)
function BrandCard({ brand, index }: { brand: Brand; index: number }) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Link
        href={`/brand/${nameToSlug(brand.designation_fr)}`}
        className="block bg-white dark:bg-gray-800 rounded-2xl p-6 h-48 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 hover:shadow-xl transition-all duration-300"
      >
        {logoUrl && !imageError ? (
          <div className="relative w-full h-full">
            <Image
              src={logoUrl}
              alt={brand.designation_fr || brand.alt_cover || 'Brand logo'}
              fill
              className="object-contain p-3 group-hover:scale-110 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
              loading="lazy"
              unoptimized
              onError={() => {
                console.error('Image failed to load:', logoUrl);
                setImageError(true);
              }}
            />
          </div>
        ) : (
          <div className="text-center w-full">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
              {brand.designation_fr}
            </p>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

// Brand List Item Component (List View)
function BrandListItem({ brand, index }: { brand: Brand; index: number }) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/brand/${nameToSlug(brand.designation_fr)}`}
        className="block bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 hover:shadow-lg transition-all duration-300 group"
      >
        <div className="flex items-center gap-6">
          {/* Brand Logo */}
          <div className="relative w-32 h-32 flex-shrink-0 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
            {logoUrl && !imageError ? (
              <Image
                src={logoUrl}
                alt={brand.designation_fr || brand.alt_cover || 'Brand logo'}
                fill
                className="object-contain p-3 group-hover:scale-110 transition-transform duration-300"
                sizes="128px"
                loading="lazy"
                unoptimized
                onError={() => {
                  console.error('Image failed to load:', logoUrl);
                  setImageError(true);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>

          {/* Brand Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
              {brand.designation_fr}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Distributeur officiel
            </p>
            <div className="flex items-center text-red-600 dark:text-red-400 font-semibold text-sm">
              <span>Voir les produits</span>
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
