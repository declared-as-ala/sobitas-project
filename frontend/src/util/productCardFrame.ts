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
  // SQUARE for object-contain. Supplement packshots (tubs, bottles) are roughly square, so a 4:5
  // portrait frame left big empty top/bottom margins that read as "dirty / half-empty". A square
  // frame hugs the product, is consistent at every breakpoint, and is the standard e-commerce
  // packshot box. The whole packshot still stays visible (object-contain).
  contain: 'aspect-square',
  cover: 'h-[220px] sm:h-[240px] lg:h-[260px] xl:h-[280px]',
  'cover-zoom': 'h-[220px] sm:h-[240px] lg:h-[260px] xl:h-[280px]',
};

export function productImageFrame(mode: ProductImageMode = 'contain'): string {
  return PRODUCT_IMAGE_FRAME[mode] ?? PRODUCT_IMAGE_FRAME.contain;
}
