'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Skeleton } from '@/app/components/ui/skeleton';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Section } from '@/app/components/layout/Section';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { getAllBrands, getStorageUrl } from '@/services/api';
import type { Brand } from '@/types';
import { buildBrandAlt } from '@/util/productAlt';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';

// How many logos to show on the homepage before "Toutes les marques".
const MAX_BRANDS = 12;


// Brand tile — a clean logo-wall cell (colored logo, subtle lift on hover).
// A real <a> (LinkWithLoading) so it is a crawlable internal link from the homepage and supports
// middle-click / open-in-new-tab / hover-prefetch — the old <button onClick={router.push}> did none.
function BrandCard({ brand }: { brand: Brand }) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = brand.logo ? getStorageUrl(brand.logo) : null;
  const brandSlug = nameToSlug(brand.designation_fr);

  return (
    <LinkWithLoading
      href={`/${brandSlug}`}
      loadingMessage={`Chargement de ${brand.designation_fr}...`}
      aria-label={`Voir les produits ${brand.designation_fr}`}
      className="pt-plate group flex aspect-[3/2] items-center justify-center p-4 transition-colors duration-300 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
    >
      {logoUrl && !imageError ? (
        <Image
          src={logoUrl}
          alt={buildBrandAlt(brand.designation_fr, brand.alt_cover)}
          width={200}
          height={100}
          className="max-h-[68%] max-w-[80%] object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          /* Re-derived for the 3 / 4 / 6 matrix — the old string was written for a 2 / 3 / 4 / 6
             grid and over-fetched by roughly 2x on phones.
             Container gutters 16 / 24 / 32 per side, `gap-px`, `max-w-site` = 1600. The LOGO is
             capped at `max-w-[80%]` of its cell, so the required width is 0.8 x cell, not the cell:
               mobile  3-up  cell = (vw - 34)/3   -> 0.8x = 24.3vw @390   -> 26vw
               sm      4-up  cell = (vw - 51)/4   -> 0.8x = 19.0vw @1023  -> 20vw
               lg      6-up  cell = (1600-69)/6 = 255px -> 0.8x = 204px   -> 210px
             All three still resolve inside the existing imageSizes buckets, so no new optimizer
             variants are generated and nothing is re-fetched. */
          sizes="(min-width: 1024px) 210px, (min-width: 640px) 20vw, 26vw"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="line-clamp-2 px-2 text-center text-xs font-semibold text-ink-1 transition-colors group-hover:text-brand sm:text-sm">
          {brand.designation_fr}
        </span>
      )}
    </LinkWithLoading>
  );
}

/**
 * Homepage brands wall. Now SERVER-RENDERED: `brands` comes as a prop from the homepage server
 * fetch, so the logos + their links are in the SSR HTML (crawlable, zero layout shift). The
 * client fetch remains only as a fallback for when the server didn't supply brands.
 */
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

  /*
   * ONE OBJECT, NOT TWELVE. `gap-px` over `bg-rule-strong` lets the rule colour through the 1px
   * gaps, so the wall is a single rectangle divided into cells rather than twelve cards floating
   * on a surface. That deletes twelve `border` + twelve `shadow-sm` + twelve `hover:shadow-md` +
   * twelve `hover:-translate-y-0.5` declarations.
   *
   * `rule-strong`, not `hairline`: here the rule is the SOLE boundary between two otherwise
   * identical white cells, so WCAG 1.4.11 applies and it must clear 3:1. Measured 3.34:1 on white
   * and 4.10:1 on the dark plate. `hairline` would look fine and measure 1.26:1.
   *
   * 3-up on phones rather than 2-up: brand marks are wide and short, so a 129x86 cell at 390px is
   * ample for a wordmark and twelve brands become FOUR rows instead of six.
   */
  const gridClass =
    'grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-rule-strong sm:grid-cols-4 lg:grid-cols-6';

  // Fixed grid skeleton while fetching — reserves the final layout, zero layout shift.
  if (isLoading) {
    return (
      <Section spacing="tight" width="wide" defer>
          <SectionHeader
            kicker="Partenaires officiels"
            title="Nos marques partenaires"
            subtitle="Distributeur officiel des plus grandes marques internationales."
            scale="3"
          />
          <div className={gridClass} aria-hidden="true">
            {Array.from({ length: MAX_BRANDS }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/2] rounded-none" />
            ))}
          </div>
      </Section>
    );
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <Section spacing="tight" width="wide" defer>
        <SectionHeader
          kicker="Partenaires officiels"
          title="Nos marques partenaires"
          subtitle="Distributeur officiel des plus grandes marques internationales."
          viewAllHref="/brands"
          viewAllLabel="Toutes les marques"
          scale="3"
        />

        <div className={gridClass}>
          {brands.slice(0, MAX_BRANDS).map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
    </Section>
  );
}
