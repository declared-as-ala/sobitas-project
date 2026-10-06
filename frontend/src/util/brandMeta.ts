/**
 * Brand landing-page title, description and social card, in ONE place.
 *
 * A brand page is served by two different route files — `(shop)/[slug]/page.tsx` for humans and
 * `x-crawler/category/[slug]/page.tsx` for crawler user-agents, which middleware rewrites to.
 * Each had its own copy of these strings, and they had drifted:
 *
 *   human : "ACTIVLAB — Protéines & Compléments en Tunisie | Protéine Tunisie"
 *   bot   : "ACTIVLAB - Protéines & Compléments Tunisie | Protéine Tunisie"
 *
 * Same URL, two different titles depending on who asked. Google indexes the crawler variant, so
 * the title that ranks was the one nobody was reviewing. Dynamic rendering is only defensible
 * while both views say the SAME thing — divergence is what separates it from cloaking.
 *
 * ── THE NAME IN THE GENERIC STRINGS IS THE DISPLAY NAME (05/10/2026) ─────────────────────────
 * The generic builders printed `brands.designation_fr` as stored, so Googlebot read
 * « BIOTECH USA en Tunisie : 17 produits » and « SCITEC NUTRITION Tunisie : Mineraux ». They now
 * print brandDisplayName() (curated casing, else humanizeBrandName), and the family names come
 * from the taxonomy (util/brandCategoryNames.ts). Curated titles and descriptions are untouched.
 */
import type { Product } from '@/types';
import { getBrandSeoEntry } from '@/config/brandSeoConfig';
import { resolveCategoryMetaDescription } from '@/util/resolveCategorySeo';
import { brandNameToSlug } from '@/util/brandSlug';
import { brandDisplayName, brandLogoAlt } from '@/util/brandDisplayName';
import { orderBrandListing } from '@/util/brandListingOrder';
import { isInStock } from '@/util/cartStock';
import { getStorageUrl } from '@/services/api';
import { buildProductAlt } from '@/util/productAlt';
import { DELIVERY } from '@/util/company';

function configEntryFor(brandName: string) {
  return getBrandSeoEntry(brandNameToSlug(brandName));
}

/** ~60 characters is where Google starts truncating a French SERP title on mobile. */
const TITLE_BUDGET = 60;

/** The meta-description budget every builder here respects. */
const DESCRIPTION_BUDGET = 155;

/**
 * ── THE DEFAULT TITLE HAD TO FORM "{MARQUE} TUNISIE" ─────────────────────────────────────────
 * 579 brand URLs are in the sitemap and only 17 had a curated entry, so the others all carried
 * `"{Brand} — Protéines & Compléments en Tunisie | Protéine Tunisie"` — the same string every
 * time, whose only variable is the name, and which never puts the brand next to the country.
 * The query shape that converts on this site is the bigram: `dymatize tunisie`, `ostrovit
 * tunisie`, `biotech usa tunisie`, `muscletech tunisie` (GSC), and every curated title leads with
 * it.
 *
 * It was also factually wrong on a large part of the catalogue: Boiron (homéopathie), Centrum,
 * OLLY and Pink Stork sell no protein at all, and stamping "Protéines" on them repeated a weak
 * generic signal against /proteines hundreds of times.
 *
 * `categoryNames` is the brand's OWN family names (getBrandCategoryNames, taxonomy-cased), read
 * off its product listing, so the title states what the page actually lists. Both routes must
 * pass the same list, or the two views of one URL would announce different titles.
 *
 * ── EVERY RUNG OF THE LADDER FITS THE BUDGET (06/10/2026) ────────────────────────────────────
 * The last resort used to be `{Marque} Tunisie | Compléments alimentaires — Protein.tn` whatever
 * its length: 48 characters plus the name, so any name over 12 characters went past 60 — and it
 * is the rung that carries NO category. Run over the live API, 55 of 524 generic titles landed
 * on it, 54 over 60 characters (max 84, « Advanced Orthomolecular Research AOR »), and the SERP
 * cut the brand's only query term. Rungs, first that fits wins:
 *   1. `{Marque} Tunisie : {1–3 familles} | Protein.tn`
 *   2. `{Marque} Tunisie : {famille}` — the family is the query term; the suffix is not
 *   3. `{Marque} Tunisie | Compléments alimentaires — Protein.tn` — a brand with no family
 *   4. `{Marque} Tunisie | Protein.tn`
 *   5. `{Marque} Tunisie` — only a name of 53+ characters gets here; it is never cut mid-word.
 */
export function buildBrandMetaTitle(brandName: string, categoryNames?: string[]): string {
  const configured = configEntryFor(brandName);
  if (configured) return configured.metaTitle;

  const name = brandDisplayName(brandName);
  const cats = normaliseCategoryNames(categoryNames);
  const candidates: string[] = [];
  // Drop trailing categories rather than let the brand+geo part be the thing that gets cut off.
  for (let take = Math.min(cats.length, 3); take > 0; take -= 1) {
    candidates.push(`${name} Tunisie : ${cats.slice(0, take).join(', ')} | Protein.tn`);
  }
  if (cats.length > 0) candidates.push(`${name} Tunisie : ${cats[0]}`);
  candidates.push(`${name} Tunisie | Compléments alimentaires — Protein.tn`, `${name} Tunisie | Protein.tn`);

  return candidates.find((candidate) => candidate.length <= TITLE_BUDGET) ?? `${name} Tunisie`;
}

/**
 * The description TEMPLATE: a curated entry's text with its tokens still in it, or the generic
 * sentence. Resolve it (brandDescriptionWithFacts, resolveBrandMetaDescription) before printing.
 */
export function buildBrandMetaDescription(brandName: string, categoryNames?: string[]): string {
  const configured = configEntryFor(brandName);
  if (configured) return configured.metaDescription;
  return buildGenericBrandMetaDescription(brandName, categoryNames ?? []);
}

/** Live generic SERP copy; keep whole clauses within the 155-character budget. */
export function buildGenericBrandMetaDescription(
  brandName: string,
  categoryNames: string[],
  productCount?: number,
  facts?: { priceMin: number | null; priceMax: number | null; inStockCount: number | null } | null
): string {
  /* A SENTENCE, not a dotted list: a snippet that reads like an answer earns the click a list of
     tokens does not. Built from whole clauses that are dropped — never cut mid-word — until it fits
     155 characters: the delivery tail goes first, then families one by one, the price range last. Every
     number is live and a clause disappears when its fact is unknown, 0, or min = max. */
  const displayName = brandDisplayName(brandName);
  const name = displayName.length > 60 ? `${displayName.slice(0, 59).trimEnd()}…` : displayName;
  const count = typeof productCount === 'number' && productCount > 0 ? productCount : null;
  const stock = facts?.inStockCount && facts.inStockCount > 0 ? facts.inStockCount : null;
  const range = stock && facts?.priceMin && facts.priceMax && facts.priceMax > facts.priceMin
    ? `de ${facts.priceMin} à ${facts.priceMax} DT` : null;
  const families = normaliseCategoryNames(categoryNames).slice(0, 3);
  const tail = ` Livraison ${DELIVERY.windowLabel} partout en Tunisie${DELIVERY.cashOnDelivery ? ', paiement à la livraison' : ''}.`;
  const build = (withFamilies: number, withRange: boolean, withTail: boolean) => {
    let out = `${name} en Tunisie`;
    if (count) {
      out += ` : ${count} produit${count > 1 ? 's' : ''}`;
      if (withFamilies) out += ` (${families.slice(0, withFamilies).join(', ')})`;
      if (stock) out += `, dont ${stock} en stock${withRange && range ? ` ${range}` : ''}`;
    } else if (withFamilies) {
      out += ` : ${families.slice(0, withFamilies).join(', ')}`;
    }
    out += '.';
    if (withTail) out += tail;
    return out;
  };
  for (const withRange of [true, false]) {
    for (let f = families.length; f >= 0; f--) {
      for (const withTail of [true, false]) {
        const candidate = build(f, withRange, withTail);
        if (candidate.length <= DESCRIPTION_BUDGET) return candidate;
      }
    }
  }
  return build(0, false, false).slice(0, DESCRIPTION_BUDGET);
}

export function resolveBrandMetaDescription(
  brandName: string,
  categoryNames: string[],
  facts: { priceMin: number | null; priceMax?: number | null; inStockCount: number | null; productCount?: number | null }
): string {
  return resolveCategoryMetaDescription(buildBrandMetaDescription(brandName, categoryNames), facts);
}

/**
 * Rule D3 for a CURATED description, after its tokens are resolved.
 *
 * A curated description that quotes the stock (« Dès {prixMin} DT, {nbEnStock} produits en
 * stock. ») loses that sentence on the day nothing is in stock: /dymatize shipped 83 characters
 * on 05/10/2026 (0 of 21 in stock). A short snippet leaves SERP room unused, so when the resolved
 * text is 130 characters or fewer and does not already say it, the one delivery fact that holds
 * for every order is appended. The 130 cap keeps the result inside the 155 budget.
 */
export function withCashOnDeliveryTail(description: string): string {
  const text = String(description ?? '').replace(/\s+/g, ' ').trim();
  if (!text || text.length > 130 || !DELIVERY.cashOnDelivery || /paiement à la livraison/i.test(text)) return text;
  return `${/[.!?…]$/.test(text) ? text : `${text}.`} Paiement à la livraison.`;
}

/** Trim, drop blanks, de-duplicate case-insensitively, preserve the caller's order. */
function normaliseCategoryNames(names: string[] | undefined): string[] {
  if (!Array.isArray(names)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = String(raw ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** An image hosted by us, as opposed to an iHerb catalogue photo proxied under /media/iherb. */
function isOwnPhoto(url: string): boolean {
  return !url.includes('/media/iherb') && !url.includes('images-iherb.com');
}

/**
 * The image that represents a brand page — og:image, twitter:image and the CollectionPage's
 * primaryImageOfPage — taken from what the page actually shows, first match wins, in the grid's
 * own order (orderBrandListing):
 *   a) an in-stock product photographed by us (not an iHerb catalogue photo);
 *   b) any in-stock product with a cover;
 *   c) the first product with a cover;
 *   d) the brand logo the admin filed (~8% of brands have one), flagged `isLogo`;
 *   e) none — the caller keeps the site banner.
 * Every URL goes through getStorageUrl, i.e. https://protein.tn/media/…, our own origin.
 *
 * A product photo beats the logo even when nothing is in stock: the logos are wordmarks of
 * 447×165 (Dymatize, Scitec) or 360×120 (BPI), under Facebook's 200 px og:image minimum and X's
 * 300×157, so /dymatize (0 of 21 in stock) lost its share card to its own logo (06/10/2026).
 */
export function pickBrandShareImage(
  brand: { id?: number; designation_fr: string; logo?: string | null },
  products: Product[]
): { url: string; alt: string; isLogo?: boolean } | null {
  const ordered = orderBrandListing(products, { id: Number(brand.id ?? 0), designation_fr: brand.designation_fr, logo: brand.logo });
  const withCover = ordered
    .map((product) => ({ product, url: product.cover ? getStorageUrl(product.cover) : '' }))
    .filter((row) => row.url);
  const inStock = withCover.filter((row) => isInStock(row.product));

  const own = inStock.find((row) => isOwnPhoto(row.url)) ?? inStock[0];
  if (own) return { url: own.url, alt: buildProductAlt(own.product) };

  const first = withCover[0];
  if (first) return { url: first.url, alt: buildProductAlt(first.product) };

  const logo = brand.logo ? getStorageUrl(brand.logo) : '';
  return logo ? { url: logo, alt: brandLogoAlt(brand.designation_fr), isLogo: true } : null;
}

/**
 * The social card, here for the same reason the title is. The human route once declared
 * `/slides/home-hero-web.webp` while the crawler route declared no openGraph at all (caught
 * 08/09/2026 by check-crawler-parity.mjs), so both routes take it from here.
 *
 * With a product image (pickBrandShareImage) the card shows the brand's own product; its pixel
 * size is unknown for a remote upload, so no width/height is declared rather than a wrong one. A
 * logo is NOT used here (`isLogo`): the admin logos are wordmarks too small for Facebook and X,
 * so the card keeps the reviewed site banner, with its real 1200×630 — the logo stays the
 * page's Brand.logo and primaryImageOfPage.
 *
 * og:title and og:description are the SAME strings as <title> and <meta description>.
 */
export function buildBrandSocialMetadata(
  brandName: string,
  canonicalUrl: string,
  categoryNames?: string[],
  resolvedDescription?: string,
  image?: { url: string; alt: string; isLogo?: boolean } | null
) {
  const title = buildBrandMetaTitle(brandName, categoryNames);
  // A fallback must never print a raw {token}: resolve with "unknown" facts, which drops them.
  const description = resolvedDescription ?? resolveCategoryMetaDescription(
    buildBrandMetaDescription(brandName, categoryNames),
    { priceMin: null, priceMax: null, inStockCount: null, productCount: null }
  );
  const fallback = '/slides/home-hero-web.webp';
  const shareable = image?.url && !image.isLogo ? image : null;
  return {
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website' as const,
      images: shareable
        ? [{ url: shareable.url, alt: shareable.alt }]
        : [{ url: fallback, width: 1200, height: 630, alt: `${brandDisplayName(brandName)} — Protein.tn` }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [shareable?.url || fallback],
    },
  };
}
