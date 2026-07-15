import type { Product } from '@/types';
import { getEffectivePrice } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';

/**
 * SEO fallback content for products that have no `description_fr` / `description_cover`.
 *
 * Google refuses to index "thin" pages — a product page whose body says only
 * "Aucune description disponible." is the #1 cause of "Crawled, currently not
 * indexed" in Search Console. This builds a UNIQUE, attribute-driven French
 * paragraph from the product's own data (name, brand, category, flavours,
 * price) so every page carries real indexable text instead of boilerplate.
 *
 * Returns sanitized HTML (safe: only product data + static copy, no user input).
 */
export function generateProductFallbackDescription(product: Product): string {
  const name = (product.designation_fr || '').trim() || 'Ce produit';
  const brand = product.brand?.designation_fr?.trim();
  const subCat =
    product.sous_categorie?.designation_fr?.trim() ||
    product.sous_categories?.[0]?.designation_fr?.trim();
  const category =
    product.sous_categorie?.categorie?.designation_fr?.trim() ||
    product.sous_categories?.[0]?.categorie?.designation_fr?.trim();
  const flavours = (product.aromes ?? [])
    .map((a) => a?.designation_fr?.trim())
    .filter((v): v is string => Boolean(v));
  // Use the shared utils so the indexable SEO text can't contradict the visible price/stock badge:
  // getEffectivePrice honours promo_expiration_date + the promo<prix guard (the old inline check
  // ignored expiry → baked an expired promo price into the body); isInStock handles boolean/'1'
  // rupture and qte<=0 consistently with the badge.
  const price = getEffectivePrice(product as never);
  const inStock = isInStock(product as never);

  const sentences: string[] = [];

  // 1) Lead sentence — always unique because it embeds the product name + brand + category.
  const segs: string[] = [`<strong>${name}</strong>`];
  if (brand) segs.push(`de la marque ${brand}`);
  if (subCat) segs.push(`fait partie de notre gamme ${subCat}`);
  else if (category) segs.push(`fait partie de notre gamme ${category}`);
  sentences.push(
    `${segs.join(' ')} disponible chez Protéine Tunisie, votre référence en compléments alimentaires et matériel de musculation en Tunisie.`
  );

  // 2) Flavours.
  if (flavours.length === 1) {
    sentences.push(`Disponible au goût ${flavours[0]}.`);
  } else if (flavours.length > 1) {
    sentences.push(`Disponible en plusieurs saveurs : ${flavours.join(', ')}.`);
  }

  // 3) Price + availability (Tunisia intent keywords).
  if (Number.isFinite(price) && price > 0) {
    const priceTxt = `${price.toLocaleString('fr-TN')} DT`;
    sentences.push(
      inStock
        ? `Achetez ${name} au meilleur prix en Tunisie (${priceTxt}), produit 100% authentique, en stock et prêt à être livré.`
        : `Découvrez ${name} (${priceTxt}), produit 100% authentique. Contactez-nous pour la disponibilité.`
    );
  } else {
    sentences.push(`Produit 100% authentique, importé et garanti par Protéine Tunisie.`);
  }

  // 4) Delivery / trust block (shared, but appended after unique content above).
  sentences.push(
    `Livraison rapide 24-72h à Sousse, Tunis et partout en Tunisie. Paiement à la livraison disponible. Pour tout conseil sur ${name}, notre équipe est à votre écoute.`
  );

  return `<p>${sentences.join(' ')}</p>`;
}
