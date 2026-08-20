'use client';

import { memo } from 'react';
import { ProductCard } from './ProductCard';
import { ProductGrid } from './ProductGrid';
import { SectionHeader, type SectionHeaderScale } from './SectionHeader';
import { Section, type SectionProps } from './layout/Section';
import type { Product as DataProduct } from '@/data/products';
import type { Product as ApiProduct } from '@/types';

type Product = ApiProduct | DataProduct;

interface ProductSectionProps {
  title: string;
  /** Small brand-coloured uppercase kicker above the title. */
  kicker?: string;
  subtitle?: string;
  products: Product[];
  showBadge?: boolean;
  badgeText?: string;
  id?: string;
  /** Link for "Voir tout" button (default /shop). Use e.g. /packs for packs section. */
  viewAllHref?: string;
  /** Label for "Voir tout" button (default "Voir tout"). */
  viewAllLabel?: string;
  /** Image presentation context for product cards. */
  imageContext?: 'default' | 'packs';
  /** The band this rail paints. See DESIGN_SYSTEM v5 §4 for the homepage sequence. */
  surface?: SectionProps['surface'];
  spacing?: SectionProps['spacing'];
  /** Heading size. The four selling rails pass "1"; see SectionHeader for why. */
  scale?: SectionHeaderScale;
  /** Skip rendering while off-screen. Must be on the Section, never on a wrapper — see Section. */
  defer?: boolean;
  /**
   * Passthrough for Section's `last`. Set on the page's FINAL band, which is the one whose
   * neighbour is the footer rather than another band — below `sm` every band has `pb-0` so it
   * reads as connected to the one under it, and without this the last rail's bottom row of cards
   * touches the dark footer with zero space.
   *
   * A passthrough rather than a `:last-child` rule for the reason Section already gives: bands are
   * rendered by different components on different pages, so which one is last is a fact only the
   * page knows.
   */
  last?: boolean;
  /**
   * Band-level override, merged onto the Section by tailwind-merge.
   *
   * Exists for ONE case and should stay rare: a band whose neighbour above it has given up its
   * own padding, so the boundary is this band's `pt` alone and the scale's value is measured
   * against nothing. Anything that is true of every product rail belongs in Section's SPACING,
   * not here — see the three rules at the top of that file.
   */
  className?: string;
}

export const ProductSection = memo(function ProductSection({
  title,
  kicker,
  subtitle,
  products,
  showBadge,
  badgeText,
  id,
  viewAllHref = '/shop',
  viewAllLabel = 'Voir tout',
  imageContext = 'default',
  surface = 'base',
  spacing = 'default',
  scale = '1',
  defer = false,
  last = false,
  className,
}: ProductSectionProps) {
  return (
    /* This used to hardcode `bg-white py-12 dark:bg-gray-950 sm:py-16 lg:py-20` plus its own
       `max-w-site` div — i.e. it owned its rhythm, its surface and its rail privately, which is
       how the page ended up with three 160px voids between identical white bands. All three now
       come from `Section`, so the band sequence is decided in ONE place (HomePageClient) and
       this component only knows how to render a rail of products.

       It also carried a `tightTop` prop that existed solely to absorb the CategoryRail's
       undersized padding above it. That compensation is gone: DESIGN_SYSTEM §3 says the gap
       between two bands is the upper band's `pb` plus the lower band's `pt` — never add a prop
       here to fix a neighbour's spacing. */
    <Section id={id} surface={surface} spacing={spacing} width="wide" defer={defer} last={last} className={className}>
      <SectionHeader
        kicker={kicker}
        title={title}
        subtitle={subtitle}
        viewAllHref={viewAllHref}
        viewAllLabel={viewAllLabel}
        scale={scale}
      />

      {/* Shared canonical ProductGrid (2 → 3 → 4, no orphan rows) */}
      <ProductGrid>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showBadge={showBadge}
            badgeText={badgeText}
            imageContext={imageContext}
          />
        ))}
      </ProductGrid>
    </Section>
  );
});
