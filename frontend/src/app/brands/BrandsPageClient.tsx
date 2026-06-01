'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Search, ArrowRight, Star, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Navigation overlay */}
      {navigatingToBrand && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-md">
          <LoadingSpinner fullScreen message="Chargement de la marque..." />
        </div>
      )}

      <Header />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-[#080808] pt-14 pb-16 border-b border-white/5">
        {/* Ambient gold glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/8 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-80 h-80 bg-yellow-600/5 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-64 bg-amber-400/5 rounded-full blur-3xl" />

        {/* Gold top border line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="text-center"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 mb-7">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-amber-400 text-[11px] font-bold uppercase tracking-[0.2em]">
                Distributeur Officiel
              </span>
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] mb-5 tracking-tight">
              <span className="bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent">
                Nos Marques
              </span>
            </h1>

            <p className="text-gray-400 text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
              {brands.length} marques premium de nutrition sportive sélectionnées pour vous
            </p>

            {/* Search Bar */}
            <div className="relative max-w-sm sm:max-w-md mx-auto">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 blur-md opacity-60" />
              <div className="relative flex items-center bg-white/5 border border-white/10 hover:border-amber-500/30 focus-within:border-amber-400/50 rounded-2xl transition-all duration-300">
                <Search className="ml-4 h-5 w-5 text-amber-400/60 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Rechercher une marque..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-4 text-white placeholder-gray-500 focus:outline-none text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mr-4 text-gray-500 hover:text-white transition-colors text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-10 flex items-center justify-center gap-8 sm:gap-12">
              {[
                { value: brands.length + '+', label: 'Marques' },
                { value: '100%', label: 'Officielles' },
                { value: 'Livraison', label: 'Rapide' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-xl sm:text-2xl font-black text-amber-400">{value}</div>
                  <div className="text-gray-500 text-xs font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── A–Z Sticky Navigation ── */}
      <AnimatePresence>
        {!searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {LETTERS.map(letter => {
                  const isActive = activeLetters.has(letter);
                  const isCurrent = activeLetter === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => isActive && scrollToLetter(letter)}
                      disabled={!isActive}
                      className={`
                        flex-shrink-0 w-9 h-9 rounded-xl text-sm font-bold transition-all duration-200
                        ${isCurrent
                          ? 'bg-amber-500 text-black shadow-[0_0_16px_rgba(245,158,11,0.5)]'
                          : isActive
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 border border-amber-500/20 hover:border-amber-400/40'
                          : 'text-gray-700 cursor-default'
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">

        {/* Search results count */}
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <p className="text-gray-400 text-sm">
              <span className="text-amber-400 font-bold">{filteredBrands.length}</span> marque{filteredBrands.length > 1 ? 's' : ''} pour{' '}
              <span className="text-white">"{searchQuery}"</span>
            </p>
          </motion.div>
        )}

        {/* Empty state */}
        {filteredBrands.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-28"
          >
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <Search className="h-8 w-8 text-amber-400/50" />
            </div>
            <p className="text-gray-400 text-lg mb-3">Aucune marque trouvée</p>
            <p className="text-gray-600 text-sm mb-6">Essayez avec d'autres mots-clés</p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-6 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all text-sm font-semibold"
            >
              Voir toutes les marques
            </button>
          </motion.div>
        ) : searchQuery ? (
          /* Search grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredBrands.map((brand, i) => (
              <BrandCard key={brand.id} brand={brand} index={i} onBrandClick={handleBrandClick} />
            ))}
          </div>
        ) : (
          /* A–Z Grouped sections */
          <div className="space-y-16">
            {sortedLetters.map(letter => (
              <div
                key={letter}
                ref={el => { sectionRefs.current[letter] = el; }}
                className="scroll-mt-24"
              >
                {/* Section header */}
                <div className="flex items-center gap-5 mb-8">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-sm" />
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-700/15 border border-amber-500/30 flex items-center justify-center">
                      <span className="text-2xl font-black text-amber-400">{letter}</span>
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 via-amber-500/10 to-transparent" />
                  <span className="text-gray-600 text-xs font-medium flex-shrink-0">
                    {groupedBrands[letter].length} marque{groupedBrands[letter].length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {groupedBrands[letter].map((brand, i) => (
                    <BrandCard key={brand.id} brand={brand} index={i} onBrandClick={handleBrandClick} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Bottom CTA strip ── */}
      <div className="border-t border-white/5 bg-[#0c0c0c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white font-bold text-lg mb-1">Vous ne trouvez pas votre marque ?</p>
            <p className="text-gray-500 text-sm">Contactez-nous pour une demande spéciale</p>
          </div>
          <Link
            href="/contact"
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm hover:from-amber-400 hover:to-yellow-400 transition-all shadow-[0_0_24px_rgba(245,158,11,0.3)] hover:shadow-[0_0_32px_rgba(245,158,11,0.45)]"
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.4), ease: 'easeOut' }}
    >
      <Link
        href={href}
        onClick={e => onBrandClick(e, href)}
        className="group block relative rounded-2xl overflow-hidden bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] hover:border-amber-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)] hover:-translate-y-0.5"
      >
        {/* Logo area */}
        <div className="relative w-full aspect-square bg-white/5">
          {logoUrl && !imageError ? (
            <Image
              src={logoUrl}
              alt={brand.designation_fr || brand.alt_cover || 'Brand logo'}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-400"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 15vw"
              loading="lazy"
              unoptimized
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-amber-400/30 select-none">
                {brand.designation_fr?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}

          {/* Gold shimmer on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/0 via-transparent to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-400/5 transition-all duration-500" />
        </div>

        {/* Name + CTA */}
        <div className="px-3 py-3 border-t border-white/5">
          <p className="text-white/75 group-hover:text-white text-xs sm:text-sm font-semibold text-center leading-tight transition-colors line-clamp-2 mb-1.5 min-h-[2.5em] flex items-center justify-center">
            {brand.designation_fr}
          </p>
          <div className="flex items-center justify-center gap-1 text-amber-500/40 group-hover:text-amber-400 transition-colors text-[10px] sm:text-xs font-medium">
            <span>Voir les produits</span>
            <ArrowRight className="h-2.5 w-2.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Gold corner accent */}
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-400/0 group-hover:bg-amber-400/60 transition-all duration-300 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
      </Link>
    </motion.div>
  );
}
