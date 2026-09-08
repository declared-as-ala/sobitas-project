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
const MARQUEE_BRANDS = 24;
const SKELETON_TILES = 10;

// Content-box estimates, excluding Section padding and its 1px seam. The framed rail is
// 106px (64px logo + 40px caption + 2px border), 42px taller than the previous rail.
// Expected band heights: ~228px at 320/390, ~227px at 1440, including the mobile link.
const BAND_LAYOUT = '[&.pt-defer]:[contain-intrinsic-size:auto_198px] sm:[&.pt-defer]:[contain-intrinsic-size:auto_174px] lg:[&.pt-defer]:[contain-intrinsic-size:auto_178px]';
const RAIL_LAYOUT = 'scrollbar-hide flex flex-nowrap overflow-x-auto snap-x snap-proximity rounded-xl border border-hairline bg-elevated';
const TILE_LAYOUT = 'flex w-40 shrink-0 flex-col';

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
      <span className="flex flex-col items-center gap-1 text-xs text-ink-3">
        <ImageOff className="h-4 w-4" aria-hidden="true" />
        Logo indisponible
      </span>
    );

  // Keep the real artwork on its existing frozen white well, without filters or cropping.
  // Captions and missing-logo notices use the theme surface; neither impersonates a wordmark.
  const content = (
    <>
      <span className={`${hasLogo ? 'pt-logo-well' : 'bg-elevated'} flex h-16 shrink-0 items-center justify-center px-4`}>
        {inner}
      </span>
      <span className="flex h-10 items-center justify-between gap-2 px-3 text-xs font-medium text-ink-2 transition-colors group-hover:text-brand group-focus-visible:text-brand">
        <span className="line-clamp-2">{brand.designation_fr}</span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </span>
    </>
  );
  const className = `${TILE_LAYOUT} group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus`;

  if (!interactive) {
    return (
      <div className={className} aria-hidden="true">
        {content}
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
            <div key={i} className="shrink-0 border-r border-rule-strong last:border-r-0">
              <div className={TILE_LAYOUT}>
                <Skeleton className="h-16 w-full rounded-none" />
                <div className="flex h-10 items-center px-3">
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
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

      {/* One framed roster, with captions for recognition and every original brand link.
          Native overflow leaves a partial next tile visible; no mask hides clickable artwork. */}
      <ul className={RAIL_LAYOUT} aria-label="Marques partenaires" role="list">
        {marqueeBrands.map((brand) => (
          <li key={brand.id} className="shrink-0 snap-start border-r border-rule-strong last:border-r-0">
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
