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
    /* `,` added 09/09/2026: the CMS copy contains "créatine monohydrate pure micronisée ," and
       "Gainer hautement calorique ,", and that space survived into the live snippet. French takes
       no space before a comma (unlike ; : ! ?), so this is a typo in the source, not a
       typographic convention to preserve. Only the comma is added here — the existing set is left
       exactly as it was. */
    .replace(/\s+([.!?,])/g, '$1').replace(/(?:\.\s*){2,}/g, '. ')
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
    /*
     * ── PREFER A CLAUSE BOUNDARY. A WORD BOUNDARY IS NOT ENOUGH ─────────────────────────────
     * Cutting on the last space is word-safe and still produces a broken sentence. Measured live
     * on /omega-3/omega-3-fish-oil-240-softgel-weightworld — the biggest zero-CTR line in the
     * whole Search Console export, 2,827 impressions on `omega 3 fish oil` at position 7.5 and
     * 3,475 on the page at 0.75%:
     *
     *   "…riche en EPA et DHA, deux acides gras essentiels reconnus pour leurs… Prix : 179 DT."
     *
     * It ends on a possessive with nothing to possess. Every word is whole and the sentence is
     * still nonsense, which is worse than a hard cut because it reads as a fault in the product
     * rather than a fault in the truncation.
     *
     * So: take the last sentence end inside the budget when it leaves at least 55% of the
     * available characters used — a complete sentence needs no ellipsis and reads as deliberate.
     * Below that threshold the sentence is too short to be worth the lost characters, and the
     * word-boundary cut with an ellipsis stays as the fallback. The `.` in the lookbehind is
     * excluded when it follows a digit so a dose ("1,5 g.") or a decimal cannot end the snippet
     * on half a fact.
     */
    const MIN_CLAUSE_RATIO = 0.55;
    const clause = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('! '),
      window.lastIndexOf('? ')
    );
    const clauseUsable =
      clause > 0 &&
      clause + 1 >= Math.floor(budget * MIN_CLAUSE_RATIO) &&
      !/\d\s*$/.test(window.slice(0, clause));

    /*
     * Tier 2, added in the same pass after measuring tier 1: a comma or semicolon.
     *
     * The sentence tier fixed /whey-proteine/100-whey-gold-standard-2-27kg, whose first sentence
     * ends inside the budget. It did nothing for the omega-3 page this was written for, because
     * that copy's FIRST sentence is longer than 160 characters — there is no sentence end to
     * find, so it fell straight through to the word cut and still read "reconnus pour leurs…".
     *
     * A comma is not a sentence, so the ellipsis stays. But "…riche en EPA et DHA…" is a whole
     * idea and "…reconnus pour leurs…" is not, and that is the difference the reader sees.
     */
    const softClause = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '));
    const softUsable =
      !clauseUsable &&
      softClause > 0 &&
      softClause >= Math.floor(budget * MIN_CLAUSE_RATIO) &&
      !/\d\s*$/.test(window.slice(0, softClause));

    if (clauseUsable) {
      excerpt = window.slice(0, clause + 1);
    } else if (softUsable) {
      excerpt = `${window.slice(0, softClause)}…`;
    } else {
      const boundary = /\s/.test(excerpt[budget - 1]) ? window.length : window.lastIndexOf(' ');
      excerpt = boundary > 0 ? `${window.slice(0, boundary).replace(/[\s,;:.–—-]+$/u, '')}…` : '';
    }
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

/**
 * SHARED WITH THE CRAWLER ROUTE ON PURPOSE.
 *
 * `x-crawler/product/[...slug]` is what middleware rewrites a bot to, and it used to build its
 * own title from `product.seo.title`. So the curated map below — assembled from a Search Console
 * export precisely to raise CTR — was served to browsers and never to Google. Measured on
 * 08/09/2026, the same URL answered differently by user agent:
 *
 *   browser   "Omega 3 Fish Oil WeightWorld 240 capsules – Prix Tunisie"   (the curated one)
 *   Googlebot "Omega 3 fish oil 240 softgel - weightworld – Prix Tunisie"  (the backend's)
 *
 * Both routes now call this, so a title change cannot reach one audience and miss the other.
 */
export function productTitle(product: Product): string {
  /*
   * Search Console opportunity titles (3-month export, 31/08/2026).
   *
   * These are deliberately limited to products with meaningful impressions where the imported
   * catalogue title does not answer the actual query.  They do not invent discounts, stock or
   * delivery promises; price and availability remain in Product/Offer structured data.  Keeping
   * this as a small reviewed map also avoids turning every PDP into the same keyword template.
   */
  const searchOpportunityTitles: Record<string, string> = {
    'omega-3-fish-oil-240-softgel-weightworld':
      'Omega 3 Fish Oil WeightWorld 240 capsules – Prix Tunisie',
    '100-whey-gold-standard-2-27kg':
      'Gold Standard Whey 2,27 kg – Prix Tunisie | Protein.tn',
    'anabolic-whey-80-2-25kg-proactive':
      'Anabolic Whey 80 ProActive 2,25 kg – Prix Tunisie',
    'serious-mass-2-7-kg':
      'Serious Mass 2,7 kg – Prix Tunisie | Optimum Nutrition',
    'serious-mass-5-45-kg-optimum-nutrition':
      'Serious Mass 5,45 kg – Prix Tunisie | Optimum Nutrition',
  };
  const opportunityTitle = product.slug ? searchOpportunityTitles[product.slug] : undefined;
  if (opportunityTitle) return opportunityTitle;

  const explicit = product.seo?.title || product.seo_title || product.meta_title;
  if (explicit?.trim()) return explicit.trim();
  const name = product.designation_fr ?? product.slug ?? 'Produit';
  return `${name} – Prix Tunisie & Livraison Rapide | Protéine Tunisie`;
}
