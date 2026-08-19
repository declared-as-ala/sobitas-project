'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';

import { cn } from '@/app/components/ui/utils';
import type { ProductImageMode } from '@/util/productImagePresentation';
import { productImageFrame } from '@/util/productCardFrame';
import { buildProductUrlPath } from '@/util/productUrl';
import type { Product } from '@/types';

interface PackCardImageProps {
  imageSrc: string;
  productName: string;
  /** SEO/a11y alt for the <Image>. Defaults to productName; pass an enriched alt (brand + locality). */
  imageAlt?: string;
  productId: number;
  slug?: string;
  mode: ProductImageMode;
  objectPosition?: string;
  scale?: number;
  product?: Product;
  /** Eager-load this image (above-the-fold cards) to speed up LCP. */
  priority?: boolean;
  /** Image-frame background. 'dark' = the GPT card's dark gradient (product pops); 'light' keeps
   *  the previous white surface. */
  surface?: 'light' | 'dark';
  /**
   * The SECOND product photograph, revealed on hover.
   *
   * On an iHerb listing the first image is the front of the pack and the second is the back —
   * which on a supplement is the Supplement Facts panel. Putting it one mouse-move from the grid
   * is the single most useful thing a shopper can see without opening the page.
   *
   * Absent for the 309 legacy products (no staging row, so the API sends null) and the card
   * behaves exactly as it did before.
   */
  hoverImageSrc?: string | null;
  /**
   * `sizes` for the packshot, when this surface's columns differ from the default grid.
   *
   * The default describes ProductGrid's 1/2/3/4 steps. /shop overrides its own grid to 3-up, where
   * a card is 389px at 1280 rather than 286px — against a declared 16vw (205px) that is a 1.9x
   * upscale, i.e. three columns would have made the packshot BLURRIER, which is the opposite of
   * what widening the cards was for. A surface that changes its column count must declare it here.
   */
  sizes?: string;
}

export function PackCardImage({
  imageSrc,
  productName,
  imageAlt,
  productId,
  slug,
  mode,
  objectPosition = 'center center',
  scale = 1,
  product,
  priority = false,
  surface = 'light',
  hoverImageSrc = null,
  sizes = '(max-width: 640px) 46vw, (max-width: 768px) 32vw, (max-width: 1024px) 26vw, (max-width: 1280px) 20vw, 16vw',
}: PackCardImageProps) {
  const [hasError, setHasError] = useState(false);
  // A hover image that 404s must not leave a hole where the packshot was: on error we simply stop
  // rendering the second layer and the front image, which is underneath it, shows through.
  const [hoverFailed, setHoverFailed] = useState(false);
  const productHref = product ? buildProductUrlPath(product) : `/shop/${encodeURIComponent(slug || String(productId))}`;

  const isContain = mode === 'contain';
  const isDark = surface === 'dark';

  // Geometry comes from the shared source of truth so ProductCardSkeleton reserves an identical
  // box — see util/productCardFrame.ts. Never inline these dimensions again.
  //
  // Background is WHITE to match the card body (ProductCard root is bg-white). It used to be
  // gray-50 while the body was white, drawing a visible two-tone seam across every card in light
  // mode. One surface, no seam.
  // No corner radius of its own. The card is `overflow-hidden rounded-2xl`, so it clips this box
  // correctly whichever way round the layout is — `rounded-t-2xl` was right for the vertical card
  // and wrong for the horizontal phone row, where the image is on the LEFT.
  const wrapperClasses = cn(
    'relative h-full w-full flex-shrink-0 overflow-hidden',
    // 'dark' = the GPT card's diagonal charcoal gradient so packshots pop; 'light' = white.
    isDark
      ? 'bg-gradient-to-br from-[#1b1f2a] to-[#0e1118]'
      /*
        ── WHY THIS FRAME MUST STAY FLAT WHITE, AND WHAT THAT COSTS ──────────────────────────
        Owner, 18/08/2026: *"give the image of the product a soul — don't make it look AI
        generated."* The obvious first move — a soft `elevated -> sunken` wash so the packshot sits
        in a lit space instead of on a blank rectangle — was written, rendered, and reverted, and
        the screenshot is the reason:

            THE PACKSHOTS ARE NOT TRANSPARENT. They are photographs on a baked-in WHITE
            background, so the moment the frame is any colour other than #FFFFFF, every card shows
            a hard white rectangle floating inside a tinted box.

        Same reason there is no contact shadow under the product: it would be painted UNDER the
        image's own opaque white, i.e. invisible on the cards it was drawn for. Any lighting this
        frame gets has to be applied OVER the image (see the vignette below) or not at all.

        `bg-elevated` rather than the old `bg-white dark:bg-gray-900`: identical in light theme
        (elevated IS #FFFFFF), and in dark it drops a cool slate that sat visibly cooler than the
        warm neutral card around it.

        THE REAL FIX, when someone has the time, is upstream: background-removed PNGs. ~23,000
        images, so it is a backend job, and it is the single change that would let this card light
        its products properly.
      */
      : 'bg-elevated',
    productImageFrame(mode)
  );

  const imageClasses = cn(
    'transition-transform duration-300 ease-out',
    isContain
      /* The packshot LIFTS as well as growing. A pure scale reads as a zoom — a picture getting
         bigger; a small rise with a shadow that spreads underneath it reads as an object being
         picked up. Same two composited properties, no extra cost, and it is the gesture the
         ground below is drawn for. */
      ? 'object-contain object-center [@media(hover:hover)]:group-hover:-translate-y-[3%] [@media(hover:hover)]:group-hover:scale-[1.04]'
      : 'object-cover [@media(hover:hover)]:group-hover:scale-[1.06]'
  );

  return (
    <div className={wrapperClasses}>
      <LinkWithLoading
        href={productHref}
        className="absolute inset-0 block"
        aria-label={`Voir ${productName}`}
        loadingMessage="Chargement"
      >
        {/*
          ── THE ONE PIECE OF LIGHT THAT WORKS ON AN OPAQUE PACKSHOT ───────────────────────
          A vignette, painted OVER the image rather than behind it: transparent across the middle
          55% and 5% black at the corners. It is what a softbox does to a white sweep — the edges
          fall off — and it is the difference between a photograph and a cut-out pasted on a page.

          Black, not `--c-ink-1`: the ink token INVERTS with the theme, so on a dark card it would
          brighten the corners instead of deepening them. This overlay must darken in both themes,
          because what it is darkening is the packshot's own white background, which does not flip.

          5% is deliberately at the edge of perceptible. Anything you can point at on a product
          grid is a filter, and a filter over 23 photographs the brands supplied is the thing that
          makes a page look generated.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(120%_90%_at_50%_38%,transparent_55%,rgb(0_0_0/0.05)_100%)]"
        />
        {imageSrc && !hasError ? (
          // The padded box. This is a POSITIONED, SIZED element, so the Image `fill` (which sets
          // inline `inset:0`) fills THIS inset box — the old approach put padding on the link and
          // it was silently ignored, because fill's containing block was the padding box, so the
          // packshot went edge-to-edge. Cover mode fills the whole frame (inset-0).
          //
          // inset-[5%], down from 9%. The frame went square → 5:4 to shorten the card; dropping
          // the inset gives most of that height back TO THE PACKSHOT rather than to padding, so
          // the product shrinks ~5% instead of ~20%.
          <span className={cn('absolute block', isContain ? 'inset-[4%]' : 'inset-0')}>
            <Image
              src={imageSrc}
              alt={imageAlt || productName}
              fill
              className={imageClasses}
              style={{
                objectPosition: isContain ? 'center center' : objectPosition,
                transform: !isContain && scale > 1 ? `scale(${scale})` : undefined,
              }}
              {...(priority ? { priority: true, fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
              sizes={sizes}
              quality={75}
              onError={() => setHasError(true)}
            />

            {/*
              THE BACK OF THE PACK, ON HOVER.

              Stacked over the front image and faded in by the card's `group` hover, so the two
              cross-fade in place rather than the layout shifting.

              ── WHY IT IS GATED ON `[@media(hover:hover)]` ──────────────────────────────────
              A touch device has no hover, and browsers emulate one on tap: without the gate the
              first tap on a phone would swap the image instead of opening the product, which reads
              as a broken card. The same guard is already used on this card's title colour and its
              shadow, so the rule is consistent across the component.

              `loading="lazy"` always — never `priority`. This image is invisible until a deliberate
              hover, so preloading it on an above-the-fold card would compete with the LCP image for
              bandwidth to show something nobody has asked for yet.

              aria-hidden and an empty alt: it is the same product, and a screen reader announcing
              the packshot twice is noise. The alt text on the front image already names it.
            */}
            {hoverImageSrc && !hoverFailed && (
              <Image
                src={hoverImageSrc}
                alt=""
                aria-hidden="true"
                fill
                className={cn(
                  imageClasses,
                  'pointer-events-none opacity-0 transition-opacity duration-300 ease-out',
                  '[@media(hover:hover)]:group-hover:opacity-100'
                )}
                style={{ objectPosition: 'center center' }}
                loading="lazy"
                sizes={sizes}
                quality={75}
                onError={() => setHoverFailed(true)}
              />
            )}
          </span>
        ) : (
          <div
            className={cn('size-full flex items-center justify-center', isDark ? 'bg-transparent' : 'bg-white dark:bg-gray-900')}
            aria-hidden="true"
          >
            <ShoppingCart className={cn('h-12 w-12', isDark ? 'text-white/25' : 'text-gray-300 dark:text-gray-600')} />
          </div>
        )}
      </LinkWithLoading>
    </div>
  );
}
