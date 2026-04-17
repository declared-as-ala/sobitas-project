import type { Product } from '@/types';

export type ProductImageMode = 'cover' | 'contain' | 'cover-zoom';

export interface ProductImagePresentation {
  mode: ProductImageMode;
  objectPosition: string;
  scale: number;
}

export interface ProductImagePresentationOptions {
  visualContext?: 'default' | 'packs';
}

type ProductImageMeta = Partial<{
  image_mode: ProductImageMode;
  imageMode: ProductImageMode;
  image_position: string;
  imagePosition: string;
  image_zoom: number;
  imageZoom: number;
  category: string;
  pack: number;
  image: string;
  cover: string;
  slug: string;
  name: string;
  designation_fr: string;
}>;

/** Listing cards: packshots stay fully visible (no cover crop). Per-product API fields can still override. */
const DEFAULT_PRESENTATION: ProductImagePresentation = {
  mode: 'contain',
  objectPosition: 'center center',
  scale: 1,
};

const IMAGE_PRESENTATION_OVERRIDES: Record<string, Partial<ProductImagePresentation>> = {
  // Prefer full-frame packshots; fine-tune framing only via position if ever needed.
  'pack-seche-extreme': { mode: 'contain', objectPosition: 'center center', scale: 1 },
  'pack-muscle-sec': { mode: 'contain', objectPosition: 'center center', scale: 1 },
};

function clampScale(value?: number): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.min(1.3, Math.max(1, value));
}

function resolveMode(product: ProductImageMeta, _imageLower: string): ProductImageMode {
  const modeFromProduct = product.image_mode || product.imageMode;
  if (modeFromProduct === 'cover' || modeFromProduct === 'contain' || modeFromProduct === 'cover-zoom') {
    return modeFromProduct;
  }

  return 'contain';
}

export function getProductImagePresentation(
  product: ProductImageMeta,
  options: ProductImagePresentationOptions = {}
): ProductImagePresentation {
  // Packs listing page: always show the full product (Shopify-style cards, no cropping).
  if (options.visualContext === 'packs') {
    return {
      mode: 'contain',
      objectPosition: 'center center',
      scale: 1,
    };
  }

  const imageRaw = product.image || product.cover || '';
  const imageLower = imageRaw.toLowerCase();

  const fallback = { ...DEFAULT_PRESENTATION, mode: resolveMode(product, imageLower) };
  const identifier = (product.slug || '').toLowerCase();
  const fileName = imageLower.split('/').pop() || '';
  const override = IMAGE_PRESENTATION_OVERRIDES[identifier] || IMAGE_PRESENTATION_OVERRIDES[fileName];

  const objectPosition =
    (product.image_position || product.imagePosition || override?.objectPosition || fallback.objectPosition).trim();

  const scale =
    clampScale(product.image_zoom || product.imageZoom) ??
    clampScale(override?.scale) ??
    (fallback.mode === 'contain' ? 1 : fallback.mode === 'cover-zoom' ? 1.12 : fallback.scale);

  const mode = product.image_mode || product.imageMode || override?.mode || fallback.mode;

  return {
    mode,
    objectPosition: objectPosition || 'center center',
    scale: Math.min(1.3, Math.max(1, scale)),
  };
}
