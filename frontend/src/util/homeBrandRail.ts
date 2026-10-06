import type { Brand } from '@/types';
import { getBrandSeoEntry } from '@/config/brandSeoConfig';
import { brandNameToSlug } from '@/util/brandSlug';
import { brandLogoAlt } from '@/util/brandDisplayName';

// Matches the insertion order of the curated entries in brandSeoConfig.ts.
const CURATED_ORDER = [
  'dymatize', 'muscletech', 'ostrovit', 'kevin-levrone', 'optimum-nutrition',
  'biotech-usa', 'gsn-great-sport-nutrition', 'real-pharm', 'ultimate-nutrition',
  'weightworld', 'c4-cellucor', 'proactive', 'big-ramy-labs', 'william-bonac',
  'victor-martinez', 'challenger-nutrition', 'now-foods', 'doctor-s-best',
  'rule-one-proteins', 'vital-proteins', 'universal-nutrition',
  'olimp-sport-nutrition', 'mr-x-v-shape-supps', 'jx-fitness',
  'kong-sport-nutrition', 'nutrex-research', 'redcon1', 'hx-nutrition',
  'mnd-fitness', 'eric-favre', 'zumub', 'quamtrax', 'scenit-nutrition',
  'muscle-care', 'applied-nutrition', 'musclepharm', 'xtend',
] as const;

type RailBrand = Pick<Brand, 'id' | 'logo' | 'designation_fr' | 'alt_cover' | 'logo_alt'>;

export function selectHomeRailBrands(brands: Brand[]): RailBrand[] {
  const rank = (brand: Brand) => {
    const slug = brandNameToSlug(brand.designation_fr);
    if (!getBrandSeoEntry(slug)) return CURATED_ORDER.length;
    const index = CURATED_ORDER.findIndex((entry) => entry === slug);
    return index < 0 ? CURATED_ORDER.length : index;
  };
  return brands
    // A tile IS a logo — a curated brand without one would render an empty tile, so logo first.
    .filter((brand) => Boolean(brand.logo))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 24)
    // The alt is resolved HERE, on the server, with the same brandLogoAlt as /brands and every
    // brand page: the client tile cannot read brandSeoConfig, and its own builder printed
    // « Logo DYMATIZE » / « Logo Big Ramy Labs » for files /brands calls « Logo Dymatize » /
    // « Logo Red Rex, gamme Big Ramy Labs » (6 of 24 tiles, 06/10/2026).
    .map(({ id, logo, designation_fr, alt_cover }) => ({ id, logo, designation_fr, alt_cover, logo_alt: brandLogoAlt(designation_fr) }));
}
