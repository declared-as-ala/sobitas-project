'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Section } from '@/app/components/layout/Section';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { getAllBrands, getStorageUrl } from '@/services/api';
import type { Brand } from '@/types';
import { buildBrandAlt } from '@/util/productAlt';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';

/** Keep the same 24 selected brands; a native rail needs no duplicate animation tiles. */
const MARQUEE_BRANDS = 24;
const SKELETON_TILES = 10;

// Below 1024px globals.css reserves 600px for each deferred band. With tight's 20 + 8px
// padding and 1px seam that reports exactly 629px, even though this list does not wrap.
// Keep the optimisation, with a local estimate of this compact band's content.
const BAND_LAYOUT = '[&.pt-defer]:[contain-intrinsic-size:auto_156px]';
const RAIL_LAYOUT = 'scrollbar-hide flex flex-nowrap gap-3 overflow-x-auto snap-x snap-proximity';

/**
 * One brand plate.
 *
 * `interactive={false}` renders the same box WITHOUT a link, for the duplicated half of the track:
 * the copy exists to make the loop seamless, and duplicating 24 crawlable <a href> on the homepage
 * would double this band's internal-link count for zero benefit to a reader or to Google.
 */
function BrandTile({ brand, interactive = true }: { brand: Brand; interactive?: boolean }) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;
  const hasLogo = Boolean(logoUrl) && !imageError;

  const inner =
    logoUrl && !imageError ? (
      <Image
        src={logoUrl}
        alt={interactive ? buildBrandAlt(brand.designation_fr, brand.alt_cover) : ''}
        width={200}
        height={100}
        sizes="130px"
        className="max-h-10 max-w-full object-contain"
        loading="lazy"
        onError={() => setImageError(true)}
      />
    ) : (
      /* Fallback for a logo that 404s at runtime. The wordmark is set in the display face and
         compressed, so a text tile reads as a deliberate mark rather than as a broken image —
         which is exactly what the old wall looked like, twelve cells deep. */
      <span className="line-clamp-2 px-3 text-center font-display text-[13px] font-bold uppercase leading-tight tracking-[0.02em] text-ink-1 transition-colors group-hover:text-brand">
        {brand.designation_fr}
      </span>
    );

  /*
    `.pt-logo-well` WHEN THERE IS A LOGO, `.pt-plate` WHEN THERE IS NOT.

    Same defect, found on /brands and fixed here because this strip has it too: a brand wordmark
    is black artwork with no dark variant, so Optimum Nutrition, Nutrex, Universal and BioTech USA
    render as near-empty tiles in dark theme on a plate that follows the theme. The well is a
    frozen light background (globals.css). The TEXT fallback keeps `.pt-plate`, because its colour
    is a theme token and near-white type on a frozen light well is the same bug one layer down.
  */
  const className = `${
    hasLogo ? 'pt-logo-well' : 'pt-plate'
  } group flex h-16 w-36 shrink-0 items-center justify-center rounded-xl border border-hairline px-4 transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus`;

  if (!interactive) {
    return (
      <div className={className} aria-hidden="true">
        {inner}
      </div>
    );
  }

  return (
    <LinkWithLoading
      href={`/${nameToSlug(brand.designation_fr)}`}
      loadingMessage={`Chargement de ${brand.designation_fr}...`}
      aria-label={`Voir les produits ${brand.designation_fr}`}
      className={className}
    >
      {inner}
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
  const marqueeBrands = useMemo(() => {
    const withLogo = brands.filter((b) => Boolean(b.logo));
    const source = withLogo.length >= 8 ? withLogo : brands;
    return source.slice(0, MARQUEE_BRANDS);
  }, [brands]);

  if (isLoading) {
    return (
      <Section surface="sunken" spacing="tight" width="wide" defer className={BAND_LAYOUT}>
        <SectionHeader title="Nos marques partenaires" scale="3" viewAllHref="/brands" viewAllLabel="Toutes les marques" />
        <div className={RAIL_LAYOUT} aria-hidden="true">
          {Array.from({ length: SKELETON_TILES }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-36 shrink-0 rounded-xl" />
          ))}
        </div>
        <div className="mt-2 h-11 sm:hidden" aria-hidden="true" />
      </Section>
    );
  }

  if (marqueeBrands.length === 0) return null;

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

      {/* A single bounded row at every breakpoint. No mask hides a clickable logo. */}
      <ul className={RAIL_LAYOUT} aria-label="Marques partenaires">
        {marqueeBrands.map((brand) => (
          <li key={brand.id} className="shrink-0 snap-start">
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
