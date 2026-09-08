'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ArrowRight, ImageOff } from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Section } from '@/app/components/layout/Section';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { getAllBrands, getStorageUrl } from '@/services/api';
import type { Brand } from '@/types';
import { buildBrandAlt } from '@/util/productAlt';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';

/** Keep the same 24 selected brands; a native rail needs no duplicate animation tiles. */
const SELECTED_BRANDS = 24;
const SKELETON_TILES = SELECTED_BRANDS;

// Content-box reservations are measured separately from Section padding and its seam.
const BAND_LAYOUT = '[&.pt-defer]:[contain-intrinsic-size:auto_256px] sm:[&.pt-defer]:[contain-intrinsic-size:auto_231px] lg:[&.pt-defer]:[contain-intrinsic-size:auto_316px]';
const RAIL_LAYOUT = 'scrollbar-hide grid grid-flow-col grid-rows-2 auto-cols-[44%] gap-px overflow-x-auto snap-x snap-proximity rounded-xl border border-rule-strong bg-rule-strong sm:auto-cols-[24%] lg:grid-flow-row lg:grid-rows-none lg:grid-cols-8 lg:auto-cols-auto lg:overflow-hidden';
const TILE_LAYOUT = 'flex h-full min-w-0 flex-col bg-elevated';

/** Original artwork and one named, crawlable link per brand. */
function BrandTile({ brand }: { brand: Brand }) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;
  const hasLogo = Boolean(logoUrl) && !imageError;

  const inner =
    logoUrl && !imageError ? (
      <Image
        src={logoUrl}
        alt={buildBrandAlt(brand.designation_fr, brand.alt_cover)}
        width={200}
        height={100}
        sizes="130px"
        className="max-h-14 max-w-full object-contain"
        loading="lazy"
        onError={() => setImageError(true)}
      />
    ) : (
      <span className="flex flex-col items-center gap-1 text-xs text-ink-3">
        <ImageOff className="h-4 w-4" aria-hidden="true" />
        Logo indisponible
      </span>
    );

  // Keep the real artwork on its existing frozen white well, without filters or cropping.
  // Missing-logo notices use the theme surface; the link's accessible name always survives.
  const content = (
    <>
      <span className={`${hasLogo ? 'pt-logo-well' : 'bg-elevated'} flex h-20 shrink-0 items-center justify-center px-4`}>
        {inner}
      </span>
    </>
  );
  const className = `${TILE_LAYOUT} group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus`;

  return (
    <LinkWithLoading
      href={`/${nameToSlug(brand.designation_fr)}`}
      loadingMessage={`Chargement de ${brand.designation_fr}...`}
      aria-label={`Voir les produits ${brand.designation_fr}`}
      className={className}
    >
      {content}
    </LinkWithLoading>
  );
}

/** Server-supplied brands and the fallback fetch stay intact. A static rail makes every logo
 * directly reachable by swipe, trackpad or keyboard, including for reduced-motion users. */
export function BrandsSection({ brands: brandsProp }: { brands?: Brand[] }) {
  const [brands, setBrands] = useState<Brand[]>(brandsProp ?? []);
  const [isLoading, setIsLoading] = useState((brandsProp ?? []).length === 0);

  useEffect(() => {
    if ((brandsProp ?? []).length > 0) return; // already have server data
    let active = true;
    getAllBrands()
      .then((brandsData) => {
        if (active) setBrands(brandsData);
      })
      .catch((error) => {
        console.error('Error fetching brands:', error);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Logos first, and only fall back to the raw list if the API stops sending them — as before. `slice` AFTER the filter, or the filter would run on twelve alphabetical names and
     return two. */
  const selectedBrands = useMemo(() => {
    const withLogo = brands.filter((b) => Boolean(b.logo));
    const source = withLogo.length >= 8 ? withLogo : brands;
    return source.slice(0, SELECTED_BRANDS);
  }, [brands]);

  if (isLoading) {
    return (
      <Section surface="sunken" spacing="tight" width="wide" defer className={BAND_LAYOUT}>
        <SectionHeader title="Nos marques partenaires" scale="3" viewAllHref="/brands" viewAllLabel="Toutes les marques" />
        <div className={RAIL_LAYOUT} aria-hidden="true">
          {Array.from({ length: SKELETON_TILES }).map((_, i) => (
            <div key={i} className="min-w-0">
              <div className={TILE_LAYOUT}>
                <Skeleton className="h-20 w-full rounded-none" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 h-11 sm:hidden" aria-hidden="true" />
      </Section>
    );
  }

  if (selectedBrands.length === 0) return null;

  return (
    <Section surface="sunken" spacing="tight" width="wide" defer className={BAND_LAYOUT}>
      {/* No kicker, no subtitle. "Partenaires officiels" above "Nos marques partenaires" above
          "Distributeur officiel des plus grandes marques internationales" is the same sentence
          three times, and it pushed a logo wall — which explains itself instantly — down by
          ~70px. The heading alone labels the strip; the logos are the content. */}
      <SectionHeader
        title="Nos marques partenaires"
        viewAllHref="/brands"
        viewAllLabel="Toutes les marques"
        scale="3"
      />

      {/* All 24 marks form a credential wall on desktop. On phones, two rows retain
          readable artwork and a partial next column signals native horizontal scrolling. */}
      <ul className={RAIL_LAYOUT} aria-label="Marques partenaires" role="list">
        {selectedBrands.map((brand) => (
          <li key={brand.id} className="min-w-0 snap-start">
            <BrandTile brand={brand} />
          </li>
        ))}
      </ul>
      <LinkWithLoading
        href="/brands"
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:hidden"
      >
        Toutes les marques
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </LinkWithLoading>
    </Section>
  );
}
