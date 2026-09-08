import type { Product } from '@/types';
import { buildMetaDescription, htmlToText } from './sanitizeProductHtml';
import { formatTnd, getPriceDisplay } from './productPrice';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Imports vary punctuation and sometimes omit flavour/size tokens from the title. */
function withoutLeadingName(text: string, name: string, prose = false): string {
  const original = text;
  if (prose) text = text.replace(/^(?:(?:le|la|les|de|du)\s+|[ld][’'])/i, '');
  const nameWords = normalize(name).split(' ');
  const words = [...text.matchAll(/[\p{L}\p{N}]+/gu)];
  if (!words.length || normalize(words[0][0]) !== nameWords[0]) return original;
  let next = 0;
  let end = 0;
  let matched = 0;
  for (const word of words) {
    const normalized = normalize(word[0]);
    if (prose && matched > 0 && /^(?:de|d|du)$/.test(normalized)) continue;
    const at = nameWords.indexOf(normalized, next);
    if (at < 0) break;
    next = at + 1;
    end = word.index! + word[0].length;
    matched++;
  }
  if (matched < Math.min(prose ? 2 : 3, nameWords.length)) return original;
  return text.slice(end).replace(/^[\s\-–—:,.®™]+/u, '').trim();
}

/**
 * Classify the FULL explicit text, before its 160-character cut. Uniqueness is irrelevant:
 * remove identity and commerce-only clauses; any remaining words preserve the editor's copy.
 * Unlike a marker count, this keeps benefit copy even when followed by every delivery marker.
 * Identity values come from the product, so an arbitrary sentence after "marque" is not eaten.
 */
export function isFormulaicProductDescription(raw: string, product: Product, productName: string): boolean {
  let text = normalize(withoutLeadingName(htmlToText(raw, Infinity), productName));
  if (!normalize(raw)) return false;

  const identities = [
    product.brand?.designation_fr,
    product.sous_categorie?.designation_fr,
    product.sous_categorie?.categorie?.designation_fr,
    ...(product.sous_categories ?? []).flatMap((sub) => [sub.designation_fr, sub.categorie?.designation_fr]),
  ].filter((value): value is string => !!value).map(normalize).filter(Boolean);
  for (const identity of [...new Set(identities)].sort((a, b) => b.length - a.length)) {
    text = ` ${text} `.split(` ${identity} `).join(' ').trim();
  }
  const shopClauses = [
    /\bboutique de complements(?: alimentaires)? a sousse en tunisie\b/g,
    /\blivraison (?:24 72\s*h|rapide)(?: partout)?(?: en|dans toute la) tunisie\b/g,
    /\blivraison 24 72\s*h\b/g,
    /\bpaiement a la livraison\b/g,
    /\b(?:produits? )?(?:100 )?authentiques?\b/g,
    /\b(?:(?:sur|chez) )?(?:proteine tunisie|protein tn)\b/g,
    /\b(?:en vente |disponible )?en tunisie\b/g,
    /\bfiche produit du rayon\b/g,
    /\b(?:rayon|categorie|marque)\b/g,
    /\b\d+(?: \d+)? dt\b/g,
  ];
  for (const clause of shopClauses) text = text.replace(clause, ' ');
  return !text.trim();
}

/** Reserve the price first; never cut a word (including unusually long unbroken tokens). */
function enrichDescription(product: Product, productName: string): string {
  const price = getPriceDisplay(product).finalPrice;
  const suffix = price > 0 && Number.isFinite(price) ? ` Prix : ${formatTnd(price)}.` : '';
  // Skip section labels and title headings; the paragraphs/list items carry the real copy.
  const body = (product.description_fr ?? '')
    .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]\s*>/gi, ' ')
    .replace(/<\/(?:li|p)>/gi, '. ');
  const plain = buildMetaDescription(body, { maxLen: Infinity })
    .replace(/\s+([.!?])/g, '$1').replace(/(?:\.\s*){2,}/g, '. ')
    .replace(/([!?])\./g, '$1')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => {
      let fact = withoutLeadingName(sentence, productName, true);
      if (product.brand?.designation_fr) fact = withoutLeadingName(fact, product.brand.designation_fr, true);
      if (fact !== sentence) fact = fact.replace(/^est (?:un|une)\s+/i, '');
      return fact ? fact[0].toUpperCase() + fact.slice(1) : '';
    }).filter(Boolean).join(' ').trim();
  const budget = 160 - suffix.length;
  let excerpt = plain;
  if (excerpt.length > budget) {
    const window = excerpt.slice(0, budget - 1);
    const boundary = /\s/.test(excerpt[budget - 1]) ? window.length : window.lastIndexOf(' ');
    excerpt = boundary > 0 ? `${window.slice(0, boundary).replace(/[\s,;:.–—-]+$/u, '')}…` : '';
  }
  return `${excerpt || 'Consultez la composition et les conseils d’utilisation sur la fiche produit.'}${suffix}`;
}

/**
 * Meta description: benefit + authenticity + delivery + location (Tunisie). Max 160 chars.
 *
 * Two defects fixed here, both visible in live search results:
 *
 * 1. `.replace(/&[a-z]+;/gi, ' ')` DELETED entities instead of decoding them, so
 *    "MUSCULAIRE &amp; PERFORMANCE" reached Google as "MUSCULAIRE   PERFORMANCE" — the word
 *    silently gone. This is the same bug fixed for categories in #192 and blog posts in #195;
 *    this path was the last one still carrying it. `buildMetaDescription` decodes properly.
 * 2. `.slice(0, 160)` cut mid-word. Google appends its own ellipsis to long descriptions, so a
 *    snippet ending on half a word is damage we inflicted, not Google.
 *
 * It also drops a leading repetition of the product name, which the CMS copy almost always opens
 * with — that name is already the title on the line above, so restating it burned ~40 characters
 * of a 160-character budget.
 */
export function productDescription(product: Product, productName: string): string {
  const explicit = product.seo?.description || product.seo_description || product.meta_description || product.meta_description_fr;
  if (explicit?.trim()) {
    /*
     * Imported catalogue templates are valid text but weak SERP copy: Omega 3 Fish Oil earned
     * 3,475 impressions at position 7.4 and only 0.75% CTR. Bringing scattered product facts
     * and price into the snippet makes those characters useful. Enrich formulaic identity +
     * shop copy only; hand-written benefit copy remains authoritative.
     */
    // A name-only explicit field can become empty after title removal; it still needs enrichment.
    if (isFormulaicProductDescription(explicit, product, productName)) return enrichDescription(product, productName);
    const plain = buildMetaDescription(explicit, { title: productName, maxLen: 160 });
    if (plain) return plain;
  }
  // Preserve the pre-existing non-template fallback behavior.
  const plain = buildMetaDescription(product.description_fr, { title: productName, maxLen: 90 });
  if (plain) return `${plain} Prix Tunisie. Livraison 24-72h. Protéine Tunisie.`;
  return `Acheter ${productName} en Tunisie – Meilleur prix, livraison rapide, produits authentiques. Sousse, Tunis, toute la Tunisie. Protéine Tunisie.`;
}
