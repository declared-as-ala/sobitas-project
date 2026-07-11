'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';
import { EmptyState } from '@/app/components/EmptyState';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Search, ArrowRight, Zap, Building2, X } from 'lucide-react';
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

export default function BrandsPageClient({ initialBrands = [] }: { initialBrands?: Brand[] }) {
  const router = useRouter();
  // Seed from the server-rendered brands so the list is present on first paint (SEO + no CLS).
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [isLoading, setIsLoading] = useState(initialBrands.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [navigatingToBrand, setNavigatingToBrand] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    // Server already provided the brands — no client refetch needed. Only fetch as a
    // fallback if the server fetch failed (initialBrands empty).
    if (initialBrands.length > 0) return;
    getAllBrands()
      .then(data => setBrands(data))
      .catch(err => console.error('Error fetching brands:', err))
      .finally(() => setIsLoading(false));
  }, [initialBrands.length]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="flex flex-col items-center gap-3 mb-10 sm:mb-12">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-10 w-56 sm:w-72" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="px-2.5 py-3">
                  <Skeleton className="h-3 w-3/4 mx-auto" />
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Loading overlay */}
      {navigatingToBrand && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/90 dark:bg-gray-950/90">
          <LoadingSpinner fullScreen message="Chargement de la marque..." />
        </div>
      )}

      <Header />

      {/* ── Hero ── */}
      <section className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-16 sm:pb-16">
          <PageHeader
            align="center"
            kicker="Distributeur Officiel"
            title="Nos Marques"
            subtitle={`${brands.length} marques premium de nutrition sportive sélectionnées pour vous`}
          />

          {/* Search */}
          <div className="relative w-full max-w-sm sm:max-w-md mx-auto mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" aria-hidden="true" />
            {/* z-10 keeps the icon above the Input's own background */}
            <Input
              type="text"
              placeholder="Rechercher une marque..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Rechercher une marque"
              className="w-full pl-11 pr-10 h-12 rounded-xl border-gray-200 dark:border-gray-800 focus:border-red-500 dark:focus:border-red-500 shadow-sm text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors"
                aria-label="Effacer"
              >
                <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
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
                <div className="font-display uppercase tracking-tight text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{value}</div>
                <div className="text-gray-400 dark:text-gray-500 text-[11px] sm:text-xs font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── A–Z Sticky Nav ── */}
      {!searchQuery && (
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-950/95 border-b border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-1.5 sm:py-2.5">
            <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none scroll-px-2">
              {LETTERS.map(letter => {
                const isActive = activeLetters.has(letter);
                const isCurrent = activeLetter === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => isActive && scrollToLetter(letter)}
                    disabled={!isActive}
                    aria-label={`Aller à la lettre ${letter}`}
                    className={`
                      flex-shrink-0 w-9 h-11 sm:w-8 sm:h-8 rounded-lg font-display text-xs sm:text-xs font-bold transition-colors duration-150
                      ${isCurrent
                        ? 'bg-red-600 text-white shadow-sm'
                        : isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-950/60'
                        : 'text-gray-300 dark:text-gray-600 cursor-default'
                      }
                    `}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Search result count */}
        {searchQuery && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            <span className="font-bold text-red-600 dark:text-red-400">{filteredBrands.length}</span>{' '}
            marque{filteredBrands.length !== 1 ? 's' : ''} pour{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-200">"{searchQuery}"</span>
          </p>
        )}

        {/* Empty state */}
        {filteredBrands.length === 0 ? (
          <div>
            <EmptyState
              title="Aucune marque trouvée"
              description="Essayez avec d'autres mots-clés."
              showShopLink={false}
              className="pb-2"
            />
            <div className="flex justify-center pb-12 sm:pb-16">
              <button
                onClick={() => setSearchQuery('')}
                className="min-h-[44px] px-5 rounded-xl border border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 text-sm font-display uppercase tracking-wide font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                Voir toutes les marques
              </button>
            </div>
          </div>

        ) : searchQuery ? (
          /* ── Search results grid ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredBrands.map((brand) => (
              <BrandCard key={brand.id} brand={brand} onBrandClick={handleBrandClick} />
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
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-red-600 flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="font-display text-lg sm:text-xl font-bold text-white">{letter}</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">
                    {groupedBrands[letter].length} marque{groupedBrands[letter].length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {groupedBrands[letter].map((brand) => (
                    <BrandCard key={brand.id} brand={brand} onBrandClick={handleBrandClick} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Bottom CTA ── */}
      <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <p className="text-gray-900 dark:text-white font-bold text-base sm:text-lg mb-0.5 text-center sm:text-left">
              Vous ne trouvez pas votre marque ?
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center sm:text-left">Contactez-nous pour une demande spéciale</p>
          </div>
          <Link
            href="/contact"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide font-semibold text-sm transition-colors shadow-sm hover:shadow-md"
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
  onBrandClick,
}: {
  brand: Brand;
  onBrandClick: (e: React.MouseEvent, href: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;
  const href = `/${nameToSlug(brand.designation_fr)}`;

  return (
    <Link
      href={href}
      onClick={e => onBrandClick(e, href)}
      className="group flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-500/40 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {/* Logo zone */}
      <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
        {logoUrl && !imageError ? (
          <Image
            src={logoUrl}
            alt={brand.designation_fr || brand.alt_cover || 'Brand logo'}
            fill
            className="object-contain p-3 sm:p-4 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 480px) 44vw, (max-width: 640px) 44vw, (max-width: 1024px) 22vw, 18vw"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 p-3">
            <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-gray-300 dark:text-gray-600" />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium text-center leading-tight line-clamp-2">
              {brand.designation_fr}
            </span>
          </div>
        )}
        {/* Red underline reveal on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </div>

      {/* Name + CTA */}
      <div className="px-2.5 sm:px-3 py-2.5 sm:py-3 border-t border-gray-50 dark:border-gray-800">
        <p className="text-gray-800 dark:text-gray-100 group-hover:text-red-600 dark:group-hover:text-red-400 text-[11px] sm:text-xs font-bold text-center leading-tight line-clamp-2 mb-1.5 min-h-[2.2em] flex items-center justify-center transition-colors">
          {brand.designation_fr}
        </p>
        <div className="flex items-center justify-center gap-0.5 text-gray-400 dark:text-gray-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors text-[10px] font-medium">
          <span>Voir</span>
          <ArrowRight className="h-2.5 w-2.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
