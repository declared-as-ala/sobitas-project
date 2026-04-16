import type { Product } from '@/types';

export type ProductImageMode = 'cover' | 'contain' | 'cover-zoom';

export interface ProductImagePresentation {
  mode: ProductImageMode;
  objectPosition: string;
  scale: number;
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

const DEFAULT_PRESENTATION: ProductImagePresentation = {
  mode: 'cover',
  objectPosition: 'center center',
  scale: 1.04,
};

const IMAGE_PRESENTATION_OVERRIDES: Record<string, Partial<ProductImagePresentation>> = {
  // Use slug (preferred) or image filename keys for difficult assets.
  'pack-seche-extreme': { mode: 'cover-zoom', objectPosition: 'center 46%', scale: 1.14 },
  'pack-muscle-sec': { mode: 'cover-zoom', objectPosition: 'center 48%', scale: 1.12 },
};

function clampScale(value?: number): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.min(1.3, Math.max(1, value));
}

function resolveMode(product: ProductImageMeta, imageLower: string, nameLower: string): ProductImageMode {
  const modeFromProduct = product.image_mode || product.imageMode;
  if (modeFromProduct === 'cover' || modeFromProduct === 'contain' || modeFromProduct === 'cover-zoom') {
    return modeFromProduct;
  }

  const category = (product.category || '').toLowerCase();
  const isPackLike = category.includes('pack') || nameLower.includes('pack') || imageLower.includes('pack') || product.pack === 1;
  const hasTransparentVisualHint =
    imageLower.endsWith('.png') ||
    imageLower.includes('transparent') ||
    imageLower.includes('logo') ||
    imageLower.includes('white-bg');

  if (!isPackLike || hasTransparentVisualHint) {
    return 'contain';
  }

  const hasLikelyBakedPadding =
    imageLower.includes('isolate') ||
    imageLower.includes('whey') ||
    imageLower.includes('gainer') ||
    imageLower.includes('creatine');

  return hasLikelyBakedPadding ? 'cover-zoom' : 'cover';
}

export function getProductImagePresentation(product: ProductImageMeta): ProductImagePresentation {
  const imageRaw = product.image || product.cover || '';
  const imageLower = imageRaw.toLowerCase();
  const nameLower = (product.name || product.designation_fr || '').toLowerCase();

  const fallback = { ...DEFAULT_PRESENTATION, mode: resolveMode(product, imageLower, nameLower) };
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
    scale,
  };
}
