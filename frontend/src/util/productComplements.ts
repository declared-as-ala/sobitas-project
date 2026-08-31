/**
 * What actually goes WITH this product — the shelf next to it, not more of the same shelf.
 *
 * ── THE COMPLAINT ───────────────────────────────────────────────────────────────────────────
 * Owner, 17/08/2026, pointing at "Complétez votre commande" on a whey page: *"why putting all of
 * them as protéine!!!! put real things that they usually bought together like mass gainer with
 * protéine with créatine etc! shaker etc"*.
 *
 * Exactly right, and the cause was one line: the block was handed `similarProducts`, which is
 * `getSimilarProducts(product.sous_categorie_id)` — the SAME sub-category by definition. So a whey
 * page offered to complete your order with three more wheys. That is not a bundle, it is the
 * "similar products" rail with checkboxes, 400px above the actual similar products rail.
 *
 * ── WHY A CURATED MAP AND NOT A COMPUTED ONE ───────────────────────────────────────────────
 * The honest computation would be order-line co-occurrence, and we do not have it: 1,082 orders
 * exist and not one has ever been marked `livree`, so there is no settled basket history to mine.
 * The previous version of this file's docblock said so and refused to claim otherwise — that still
 * holds, and it is why the heading says "complétez votre commande" rather than "frequently bought
 * together".
 *
 * What we CAN state without data is which products are taken alongside which, because supplement
 * stacking is a published, uncontroversial convention rather than a behavioural claim: protein
 * and creatine are the two most-taken sports supplements in the world and are taken together;
 * anybody buying powder needs something to shake it in; a cutting stack is a burner, a carnitine
 * and a lean protein. This map is that convention, written down, per sub-category. It is editorial
 * judgement — the kind a shop assistant makes — and the copy presents it as a suggestion.
 *
 * When delivery marking starts and co-occurrence data exists (roadmap Phase 5.3), this map becomes
 * the FALLBACK for products with too little history, and the ranking comes from the data.
 *
 * ── THE SLUGS ARE THE LIVE TAXONOMY ────────────────────────────────────────────────────────
 * Every slug below was read from /api/categories on 17/08/2026, not invented. Two traps in it:
 *
 *   - `Intra-Workout` is capitalised in the database while every other slug is lower-case. It is
 *     spelled here exactly as stored, because the endpoint matches on the string.
 *   - `glucides` and `glucides-energie` are two separate sub-categories under PRISE DE MASSE, as
 *     are `gainers-proteines` and `mass-gainers`. Both of each pair are mapped; dropping one would
 *     silently give those products the universal fallback.
 *
 * A sub-category that disappears from the taxonomy costs nothing: the fetch for it fails, that one
 * slot is skipped, and the block falls back to the next slug in the list.
 */

/** Ordered best-first. The fetcher takes the first few that actually yield an addable product. */
const BY_SUB_CATEGORY: Record<string, string[]> = {
  // ── PROTÉINES ─────────────────────────────────────────────────────────────────────────────
  // Creatine first on every protein: it is the single most common second item in a sports basket,
  // it is cheap next to a 2kg tub, and it does not compete with what is already in the cart.
  'whey-proteine': ['creatine', 'accessoires', 'bcaa'],
  'whey-isolate': ['creatine', 'accessoires', 'bcaa'],
  'whey-hydrolysee': ['creatine', 'accessoires', 'bcaa'],
  caseine: ['whey-proteine', 'accessoires', 'creatine'],
  'proteines-multi-sources': ['creatine', 'accessoires', 'bcaa'],
  'proteine-de-boeuf': ['creatine', 'accessoires', 'bcaa'],
  'proteines-vegetales': ['creatine', 'accessoires', 'vitamines'],
  'barres-proteinees': ['whey-proteine', 'accessoires', 'creatine'],

  // ── PRISE DE MASSE ────────────────────────────────────────────────────────────────────────
  'mass-gainers': ['creatine', 'accessoires', 'whey-proteine'],
  'gainers-proteines': ['creatine', 'accessoires', 'whey-proteine'],
  glucides: ['creatine', 'whey-proteine', 'accessoires'],
  'glucides-energie': ['creatine', 'whey-proteine', 'accessoires'],

  // ── PERFORMANCE ───────────────────────────────────────────────────────────────────────────
  creatine: ['whey-proteine', 'accessoires', 'bcaa'],
  bcaa: ['whey-proteine', 'creatine', 'accessoires'],
  eaa: ['whey-proteine', 'creatine', 'accessoires'],
  'acides-amines': ['whey-proteine', 'creatine', 'accessoires'],
  glutamine: ['whey-proteine', 'creatine', 'accessoires'],
  hmb: ['creatine', 'whey-proteine', 'accessoires'],
  'pre-workout': ['creatine', 'whey-proteine', 'accessoires'],
  'Intra-Workout': ['bcaa', 'creatine', 'whey-proteine'],
  'post-workout': ['whey-proteine', 'creatine', 'accessoires'],
  'beta-alanine': ['creatine', 'pre-workout', 'whey-proteine'],
  citrulline: ['creatine', 'pre-workout', 'whey-proteine'],
  'l-arginine': ['creatine', 'pre-workout', 'whey-proteine'],

  // ── PERTE DE POIDS ────────────────────────────────────────────────────────────────────────
  // A cutting basket is a burner, a carnitine and a LEAN protein — isolate rather than a gainer.
  'bruleurs-de-graisse': ['l-carnitine', 'whey-isolate', 'accessoires'],
  'l-carnitine': ['bruleurs-de-graisse', 'whey-isolate', 'accessoires'],
  cla: ['l-carnitine', 'whey-isolate', 'accessoires'],

  // ── SANTÉ & VITALITÉ ──────────────────────────────────────────────────────────────────────
  // No shaker and no creatine in here: somebody buying magnesium for sleep is not in a gym basket,
  // and offering them a 5kg tub is the same category error as offering a whey buyer more whey.
  vitamines: ['omega-3', 'magnesium', 'probiotiques'],
  mineraux: ['vitamines', 'omega-3', 'magnesium'],
  magnesium: ['vitamines', 'zinc', 'omega-3'],
  zinc: ['magnesium', 'vitamines', 'omega-3'],
  zma: ['vitamines', 'magnesium', 'omega-3'],
  'omega-3': ['vitamines', 'articulations', 'magnesium'],
  articulations: ['collagene', 'omega-3', 'vitamines'],
  collagene: ['articulations', 'vitamines', 'beaute-cheveux'],
  'beaute-cheveux': ['collagene', 'vitamines', 'zinc'],
  probiotiques: ['digestion', 'vitamines', 'omega-3'],
  digestion: ['probiotiques', 'vitamines', 'omega-3'],
  immunite: ['vitamines', 'probiotiques', 'omega-3'],
  'sommeil-stress': ['magnesium', 'ashwagandha', 'vitamines'],
  ashwagandha: ['sommeil-stress', 'magnesium', 'vitamines'],
  tribulus: ['zma', 'vitamines', 'creatine'],
  'boosters-hormonaux': ['zma', 'vitamines', 'creatine'],
  'plantes-et-herbes': ['vitamines', 'omega-3', 'magnesium'],
  antioxydants: ['vitamines', 'omega-3', 'magnesium'],
  enfants: ['vitamines', 'omega-3', 'probiotiques'],

  // ── ÉQUIPEMENT ────────────────────────────────────────────────────────────────────────────
  accessoires: ['whey-proteine', 'creatine', 'bcaa'],
  vetements: ['accessoires', 'whey-proteine', 'creatine'],
  'materiel-de-musculation': ['accessoires', 'whey-proteine', 'creatine'],
  'cardio-fitness': ['accessoires', 'whey-proteine', 'l-carnitine'],
};

/** Used when the sub-category is unmapped — a new one, or a product filed only at category level. */
const BY_CATEGORY: Record<string, string[]> = {
  proteines: ['creatine', 'accessoires', 'bcaa'],
  performance: ['whey-proteine', 'creatine', 'accessoires'],
  'prise-de-masse': ['creatine', 'accessoires', 'whey-proteine'],
  'perte-de-poids': ['l-carnitine', 'whey-isolate', 'accessoires'],
  'sante-vitalite': ['vitamines', 'omega-3', 'magnesium'],
  equipement: ['whey-proteine', 'creatine', 'accessoires'],
};

/**
 * The last resort, and it is deliberately the shaker first. An accessory is the only suggestion
 * that is never wrong for an unknown product: it is 35 DT, it is always in stock, and nobody has
 * ever been offended by being offered a bottle.
 */
const UNIVERSAL = ['accessoires', 'whey-proteine', 'creatine'];

type TaxonomyLike = {
  slug?: string | null;
  sous_categorie?: { slug?: string | null; categorie?: { slug?: string | null } | null } | null;
  sous_categories?: Array<{ slug?: string | null; categorie?: { slug?: string | null } | null }> | null;
  categorie?: { slug?: string | null } | null;
  categories?: Array<{ slug?: string | null }> | null;
};

function firstSlug(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const v = (c || '').trim();
    if (v) return v;
  }
  return '';
}

/**
 * The complement sub-category slugs for a product, best first, never including its own.
 *
 * Excluding the product's own sub-category is the whole point of the exercise and is done HERE
 * rather than in the fetcher, so a map entry that accidentally points at itself (`creatine:
 * ['creatine', …]`) cannot reproduce the bug this file exists to fix.
 */
export function complementSubCategorySlugs(product: TaxonomyLike | null | undefined): string[] {
  if (!product) return UNIVERSAL;

  /* `sous_categories[0]` BEFORE `sous_categorie`, matching getProductPrimarySubCategory exactly.
     The two fields disagree on products filed in more than one sub-category, and reading them in
     the other order would give a product a complement set from a shelf its own URL is not on. */
  const subSlug = firstSlug(
    product.sous_categories?.[0]?.slug,
    product.sous_categorie?.slug
  );
  const catSlug = firstSlug(
    product.sous_categories?.[0]?.categorie?.slug,
    product.sous_categorie?.categorie?.slug,
    product.categorie?.slug,
    product.categories?.[0]?.slug
  );

  const mapped =
    (subSlug && BY_SUB_CATEGORY[subSlug]) ||
    (catSlug && BY_CATEGORY[catSlug]) ||
    UNIVERSAL;

  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of [...mapped, ...UNIVERSAL]) {
    if (!slug || slug === subSlug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}
