'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Search, ArrowRight, Star, Zap, Building2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAllBrands, getStorageUrl } from '@/services/api';
import type { Brand } from '@/types';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function BrandsPageClient() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [navigatingToBrand, setNavigatingToBrand] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    getAllBrands()
      .then(data => setBrands(data))
      .catch(err => console.error('Error fetching brands:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    return brands.filter(b =>
      b.designation_fr?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [brands, searchQuery]);

  const groupedBrands = useMemo(() => {
    const groups: Record<string, Brand[]> = {};
    filteredBrands.forEach(brand => {
      const firstChar = (brand.designation_fr || '#')[0].toUpperCase();
      const key = LETTERS.includes(firstChar) ? firstChar : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(brand);
    });
    Object.values(groups).forEach(arr =>
      arr.sort((a, b) => a.designation_fr.localeCompare(b.designation_fr))
    );
    return groups;
  }, [filteredBrands]);

  const activeLetters = useMemo(() => new Set(Object.keys(groupedBrands)), [groupedBrands]);
  const sortedLetters = useMemo(() => [...Object.keys(groupedBrands)].sort(), [groupedBrands]);

  const scrollToLetter = (letter: string) => {
    setActiveLetter(letter);
    sectionRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBrandClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setNavigatingToBrand(true);
    router.push(href);
  };

  if (isLoading) return <LoadingSpinner fullScreen message="Chargement des marques..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading overlay */}
      {navigatingToBrand && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <LoadingSpinner fullScreen message="Chargement de la marque..." />
        </div>
      )}

      <Header />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-yellow-100 to-amber-50 opacity-80 blur-2xl" />
        {/* Gold accent top line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-16 sm:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-5">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span className="text-amber-700 text-[11px] font-bold uppercase tracking-[0.18em]">
                Distributeur Officiel
              </span>
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight mb-3 tracking-tight">
              <span className="bg-gradient-to-r from-gray-900 via-amber-800 to-orange-700 bg-clip-text text-transparent">
                Nos Marques
              </span>
            </h1>
            <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed">
              {brands.length} marques premium de nutrition sportive sélectionnées pour vous
            </p>

            {/* Search */}
            <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher une marque..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white border border-amber-200 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 text-gray-800 placeholder-gray-400 text-sm shadow-sm transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-amber-100 flex items-center justify-center transition-colors"
                  aria-label="Effacer"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="mt-8 flex items-center justify-center gap-6 sm:gap-10">
              {[
                { value: `${brands.length}+`, label: 'Marques' },
                { value: '100%', label: 'Officielles' },
                { value: 'Rapide', label: 'Livraison' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-lg sm:text-2xl font-black text-amber-600">{value}</div>
                  <div className="text-gray-400 text-[11px] sm:text-xs font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── A–Z Sticky Nav ── */}
      <AnimatePresence>
        {!searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm"
          >
            <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-2.5">
              <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none">
                {LETTERS.map(letter => {
                  const isActive = activeLetters.has(letter);
                  const isCurrent = activeLetter === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => isActive && scrollToLetter(letter)}
                      disabled={!isActive}
                      className={`
                        flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[11px] sm:text-xs font-bold transition-all duration-150
                        ${isCurrent
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200'
                          : isActive
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          : 'text-gray-300 cursor-default'
                        }
                      `}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Search result count */}
        {searchQuery && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-gray-500 mb-6"
          >
            <span className="font-bold text-amber-600">{filteredBrands.length}</span>{' '}
            marque{filteredBrands.length !== 1 ? 's' : ''} pour{' '}
            <span className="font-semibold text-gray-700">"{searchQuery}"</span>
          </motion.p>
        )}

        {/* Empty state */}
        {filteredBrands.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
              <Search className="h-7 w-7 text-amber-400" />
            </div>
            <p className="text-gray-700 font-semibold mb-1">Aucune marque trouvée</p>
            <p className="text-gray-400 text-sm mb-5">Essayez avec d'autres mots-clés</p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
            >
              Voir toutes les marques
            </button>
          </motion.div>

        ) : searchQuery ? (
          /* ── Search results grid ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredBrands.map((brand, i) => (
              <BrandCard key={brand.id} brand={brand} index={i} onBrandClick={handleBrandClick} />
            ))}
          </div>

        ) : (
          /* ── A–Z grouped sections ── */
          <div className="space-y-12 sm:space-y-16">
            {sortedLetters.map(letter => (
              <div
                key={letter}
                ref={el => { sectionRefs.current[letter] = el; }}
                className="scroll-mt-20"
              >
                {/* Letter divider */}
                <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-7">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-100 flex-shrink-0">
                    <span className="text-lg sm:text-xl font-black text-white">{letter}</span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-transparent" />
                  <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                    {groupedBrands[letter].length} marque{groupedBrands[letter].length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {groupedBrands[letter].map((brand, i) => (
                    <BrandCard key={brand.id} brand={brand} index={i} onBrandClick={handleBrandClick} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Bottom CTA ── */}
      <div className="border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <p className="text-gray-900 font-bold text-base sm:text-lg mb-0.5 text-center sm:text-left">
              Vous ne trouvez pas votre marque ?
            </p>
            <p className="text-gray-400 text-sm text-center sm:text-left">Contactez-nous pour une demande spéciale</p>
          </div>
          <Link
            href="/contact"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md shadow-amber-100 hover:shadow-lg hover:shadow-amber-200"
          >
            <Zap className="h-4 w-4" />
            Nous contacter
          </Link>
        </div>
      </div>

      <Footer />
      <ScrollToTop />
    </div>
  );
}

/* ── Brand Card ── */
function BrandCard({
  brand,
  index,
  onBrandClick,
}: {
  brand: Brand;
  index: number;
  onBrandClick: (e: React.MouseEvent, href: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;
  const href = `/${nameToSlug(brand.designation_fr)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.35), ease: 'easeOut' }}
    >
      <Link
        href={href}
        onClick={e => onBrandClick(e, href)}
        className="group flex flex-col bg-white rounded-2xl border border-gray-100 hover:border-amber-300 shadow-sm hover:shadow-md hover:shadow-amber-50 transition-all duration-250 overflow-hidden hover:-translate-y-0.5 active:scale-[0.98]"
      >
        {/* Logo zone */}
        <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          {logoUrl && !imageError ? (
            <Image
              src={logoUrl}
              alt={brand.designation_fr || brand.alt_cover || 'Brand logo'}
              fill
              className="object-contain p-3 sm:p-4 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 480px) 44vw, (max-width: 640px) 44vw, (max-width: 1024px) 22vw, 18vw"
              loading="lazy"
              unoptimized
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 p-3">
              <Building2 className="h-7 w-7 sm:h-8 sm:h-8 text-gray-300" />
              <span className="text-xs text-gray-400 font-medium text-center leading-tight line-clamp-2">
                {brand.designation_fr}
              </span>
            </div>
          )}
          {/* Amber bottom shimmer on hover */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </div>

        {/* Name + CTA */}
        <div className="px-2.5 sm:px-3 py-2.5 sm:py-3 border-t border-gray-50">
          <p className="text-gray-800 group-hover:text-amber-700 text-[11px] sm:text-xs font-bold text-center leading-tight line-clamp-2 mb-1.5 min-h-[2.2em] flex items-center justify-center transition-colors">
            {brand.designation_fr}
          </p>
          <div className="flex items-center justify-center gap-0.5 text-gray-400 group-hover:text-amber-500 transition-colors text-[10px] font-medium">
            <span>Voir</span>
            <ArrowRight className="h-2.5 w-2.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
