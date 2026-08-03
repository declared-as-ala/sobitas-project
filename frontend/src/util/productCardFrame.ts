import type { ProductImageMode } from '@/util/productImagePresentation';

/**
 * The product card's image-frame geometry, defined ONCE.
 *
 * ProductCard (via PackCardImage) and ProductCardSkeleton must reserve the exact same box or the
 * skeleton→card swap shifts layout. They previously each hardcoded their own copy, and had already
 * drifted: the skeleton pinned the contain-mode aspect ratio while PackCardImage switched to fixed
 * pixel heights in cover mode, so any cover-mode card shifted on load.
 *
 * That bug is currently latent — nothing sets `image_mode`, so every card resolves to 'contain' —
 * which is exactly why it needed fixing structurally rather than by matching strings again: the
 * day someone adds image_mode to the API, CLS would regress silently.
 *
 * Plain module (no 'use client') so the server-rendered skeleton can import it without pulling a
 * client boundary along with it.
 */
export const PRODUCT_IMAGE_FRAME: Record<ProductImageMode, string> = {
  /**
   * 5:4 LANDSCAPE for object-contain, down from `aspect-square`.
   *
   * The square frame made the image box as tall as the card was wide — 350px on a 4-up desktop
   * grid — which is what made the card ~608px tall and the page long enough that the owner asked
   * to "use the width better than the height".
   *
   * 5:4 is the widest ratio that does not shrink the PRODUCT. The packshot is `object-contain`
   * inside `inset-[9%]`, so a tub roughly 1:1 is height-constrained in both frames: at 350px wide
   * the rendered packshot is ~286px square in a square box and ~229px square in a 5:4 box. That
   * is a 20% smaller product for 70px less card — a bad trade on its own, which is why the inset
   * drops from 9% to 5% at the same time (PackCardImage). Net: ~271px of packshot, 5% smaller,
   * for a card that is 70px shorter. Across the homepage's five card rows that is ~350px of
   * scrolling removed.
   *
   * `aspect-[5/4]`, not a fixed height: the box must scale with the column so the grid stays
   * fluid, and a definite ratio still reserves the box before the image loads (CLS 0).
   */
  contain: 'aspect-[5/4]',
  cover: 'h-[200px] sm:h-[220px] lg:h-[240px]',
  'cover-zoom': 'h-[200px] sm:h-[220px] lg:h-[240px]',
};

export function productImageFrame(mode: ProductImageMode = 'contain'): string {
  return PRODUCT_IMAGE_FRAME[mode] ?? PRODUCT_IMAGE_FRAME.contain;
}
