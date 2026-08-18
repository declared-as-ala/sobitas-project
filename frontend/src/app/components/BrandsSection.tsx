'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Skeleton } from '@/app/components/ui/skeleton';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Section } from '@/app/components/layout/Section';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { getAllBrands, getStorageUrl } from '@/services/api';
import type { Brand } from '@/types';
import { buildBrandAlt } from '@/util/productAlt';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';

/**
 * How many brands ride the loop.
 *
 * ── THE NUMBER IS ABOUT DOM WEIGHT, NOT ABOUT SUPPLY ────────────────────────────────────────
 * The track renders its list TWICE (that is what makes the loop seamless), so 24 brands is 48
 * tiles and 48 lazy images on a band that sits ~5,000px down the homepage. The catalogue has 57
 * brands with a logo — the rest are one tap away behind "Toutes les marques", which is what that
 * link is for.
 */
const MARQUEE_BRANDS = 24;

/** Skeleton count. Matches roughly what one screen of the strip shows at desktop. */
const SKELETON_TILES = 10;

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

  const inner =
    logoUrl && !imageError ? (
      <Image
        src={logoUrl}
        alt={interactive ? buildBrandAlt(brand.designation_fr, brand.alt_cover) : ''}
        width={200}
        height={100}
        /* The tile is a fixed 160x80 box at every width, so the logo's required width is a
           CONSTANT — no `vw` maths and no re-derivation when the grid changes, because there is no
           longer a grid. 80% of 160 = 128 → 130px, which resolves inside an existing imageSizes
           bucket, so no new optimizer variants are generated. */
        sizes="130px"
        className="max-h-[56%] max-w-[78%] object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        loading="lazy"
        onError={() => setImageError(true)}
      />
    ) : (
      /* Fallback for a logo that 404s at runtime. The wordmark is set in the display face and
         compressed, so a text tile reads as a deliberate mark rather than as a broken image —
         which is exactly what the old wall looked like, twelve cells deep. */
      <span className="line-clamp-2 px-3 text-center font-display font-compressed text-[13px] font-bold uppercase leading-tight tracking-[0.02em] text-ink-1 transition-colors group-hover:text-brand">
        {brand.designation_fr}
      </span>
    );

  const className =
    'pt-plate group flex h-20 w-40 shrink-0 items-center justify-center rounded-xl border border-hairline px-3 transition-colors duration-200 hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

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

/**
 * Homepage brands wall. SERVER-RENDERED: `brands` comes as a prop from the homepage server fetch,
 * so the logos and their links are in the SSR HTML (crawlable, zero layout shift). The client
 * fetch remains only as a fallback for when the server didn't supply brands.
 *
 * ── WHY THIS STOPPED BEING A GRID (owner, 18/08/2026) ───────────────────────────────────────
 * *"redesign this section, make it polished, match the vibe of the website, and show the partner
 * marks in a good way — you can add a micro animation loop."*
 *
 * The wall was twelve 3:2 cells fused by `gap-px`, and the screenshot that came with that message
 * shows what it actually rendered: 21st Century, ABE, Absolute Nutrition, Action Labs, Advance
 * Physician Formulas, Advanced Orthomolecular Research AOR… ten cells of small black text and two
 * logos.
 *
 * That is not a styling problem. Measured against the live API on 18/08/2026:
 *
 *     589 brands in the catalogue
 *      57 of them have a logo
 *      12 were shown — `brands.slice(0, MAX_BRANDS)` off an ALPHABETICAL list
 *
 * So the band was showing the first twelve names in the alphabet, which are precisely the obscure
 * ones nobody stocks, while Optimum Nutrition, MuscleTech, BioTech USA, Dymatize, Scitec, Myprotein
 * and Cellucor sat further down the same array with artwork ready to render. A "partner brands"
 * wall whose selection rule is `sort by name` is not a selection rule.
 *
 * `hasLogo` IS the selection: a brand with a logo in the admin is a brand somebody deliberately
 * onboarded. It needs no new endpoint, no new column and no editorial list to maintain, and it
 * degrades safely — if the logos ever disappear from the API the band falls back to the full list
 * rather than rendering empty.
 *
 * The loop is the owner's "micro animation": one continuous strip beats a static grid here because
 * the point of this band is BREADTH ("we carry the brands you have heard of"), and breadth is
 * exactly what a fixed 12-cell grid cannot show. See `.pt-marquee` in globals.css for the motion,
 * the pause rules and the reduced-motion fallback.
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

  /* Logos first, and only fall back to the raw list if the API stops sending them — see the
     docblock. `slice` AFTER the filter, or the filter would run on twelve alphabetical names and
     return two. */
  const marqueeBrands = useMemo(() => {
    const withLogo = brands.filter((b) => Boolean(b.logo));
    const source = withLogo.length >= 8 ? withLogo : brands;
    return source.slice(0, MARQUEE_BRANDS);
  }, [brands]);

  if (isLoading) {
    return (
      <Section surface="sunken" spacing="tight" width="wide" defer>
        <SectionHeader title="Nos marques partenaires" scale="3" />
        <div className="flex gap-3 overflow-hidden" aria-hidden="true">
          {Array.from({ length: SKELETON_TILES }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-40 shrink-0 rounded-xl" />
          ))}
        </div>
      </Section>
    );
  }

  if (marqueeBrands.length === 0) return null;

  return (
    <Section surface="sunken" spacing="tight" width="wide" defer>
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

      {/*
        ── THE EDGES FADE RATHER THAN CUT ────────────────────────────────────────────────────
        A marquee that ends at a hard border reads as a clipped grid; a fade says "this continues".
        The mask is 6% of the width at each end — enough to soften a 160px tile, small enough that
        no logo is ever half-invisible where a reader might try to click it.

        `-mx-4 px-4 … lg:-mx-8 lg:px-8` cancels the Container's gutter and re-adds it as padding
        INSIDE the scroller, so the strip travels the full width of the band while the first tile
        still lines up with the heading above it.
      */}
      <div
        className="pt-marquee-viewport relative -mx-4 overflow-hidden px-4 [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)] [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {/* `w-max` so the track is as wide as its content rather than as wide as the viewport —
            without it the flex children shrink and -50% lands in the wrong place. */}
        <ul className="pt-marquee flex w-max gap-3" data-motion>
          {marqueeBrands.map((brand) => (
            <li key={brand.id}>
              <BrandTile brand={brand} />
            </li>
          ))}
          {/* THE SECOND HALF. `aria-hidden` + non-interactive tiles: it exists so the strip can
              wrap without a visible seam, and a screen reader announcing all 24 brands twice —
              or a keyboard tabbing through 48 links to reach the footer — is the cost of getting
              that wrong. */}
          {marqueeBrands.map((brand) => (
            <li key={`dup-${brand.id}`} aria-hidden="true">
              <BrandTile brand={brand} interactive={false} />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
