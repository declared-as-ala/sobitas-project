import type { Product } from '@/types';

/**
 * ── WHICH NUTRIENTS ARE WORTH A ROW, PER TABLE ──────────────────────────────────────────────
 * Owner, 07/09/2026: *"if a product doesn't have something, make it smart — creatine can't have
 * protein."*
 *
 * Measured on `/creatine/creatine-real-pharm-300g` at 390px before this existed: the table was
 * **3 294px tall** for six rows, and **30 of its 42 fact cells were an em-dash — 71 %**. The five
 * nutrient labels printed on that page were Protéines, Glucides, Sucres, Lipides, Énergie, on
 * creatine monohydrate.
 *
 * And the footnote under the table said a dash means *"le fabricant ne communique pas cette
 * valeur"*. On a creatine page that is not true. Nobody withheld the protein content of creatine
 * monohydrate; there is none to withhold. The table was stating a fact about the manufacturer
 * that was really a fact about chemistry, 30 times.
 *
 * The fix is not a hardcoded map of category → nutrients, which would need a new branch for every
 * product family this shop ever adds and would be wrong the first time a category is mixed. It is
 * to ask the products themselves: a nutrient earns a row when **at least one of the compared
 * products declares a value for it**. Six creatines declare no protein between them, so no protein
 * row is drawn. A whey compared against whey keeps all five. A creatine-with-carbs blend in the
 * set brings the carbohydrate row back for everyone, which is correct — there the blank IS a real
 * difference between the products.
 *
 * When nothing survives, the caller drops the nutrition column outright rather than printing an
 * empty one, and the comparison becomes brand, format, tolerance, price and availability — which
 * on a shelf of creatine monohydrate is the entire real comparison anyway.
 */
export const COMPARISON_NUTRIENTS = [
  { key: 'protein', label: 'Protéines' },
  { key: 'carbohydrates', label: 'Glucides' },
  { key: 'sugars', label: 'Sucres' },
  { key: 'fat', label: 'Lipides' },
  { key: 'energy', label: 'Énergie' },
] as const;

export type ComparisonNutrientKey = (typeof COMPARISON_NUTRIENTS)[number]['key'];

/** True when this product declares at least one of the compared nutrients. */
export function declaresNutrition(facts: ComparisonFacts): boolean {
  return COMPARISON_NUTRIENTS.some(({ key }) => Boolean(facts[key]));
}

/** The nutrients at least one product in the table declares, in canonical order. */
export function visibleNutrients(all: ComparisonFacts[]): readonly { key: ComparisonNutrientKey; label: string }[] {
  return COMPARISON_NUTRIENTS.filter(({ key }) => all.some((facts) => Boolean(facts[key])));
}

export type ComparisonFacts = {
  basis: string;
  protein: string;
  carbohydrates: string;
  sugars: string;
  fat: string;
  energy: string;
  gluten: string;
  lactose: string;
};
const text = (value: unknown): string => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() : '';
const folded = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Only transcribed nutrition panels and explicit claims; never infer an allergen's absence. */
export function comparisonFacts(product: Product): ComparisonFacts {
  const facts = product.nutrition_facts ?? {};
  const html = product.nutrition_values || product.source_facts?.content?.nutrition_html || '';
  const rows = Array.isArray(facts.rows) ? facts.rows as Record<string, unknown>[] : [];
  const panel = text(html) || rows.map(row => text(row.name)).join(' ');
  const normalized = folded(panel);
  const amount = (value: unknown, unit: unknown, units: string) => {
    const n = String(value ?? '').replace(',', '.');
    return /^\d+(?:\.\d+)?$/.test(n) && new RegExp(`^(${units})$`, 'i').test(String(unit)) ? `${n.replace('.', ',')} ${unit}` : '';
  };
  const nutrient = (names: string[], label: string, units = 'g|mg') => {
    const row = rows.find(r => names.includes(folded(text(r.name))));
    if (row && (!row.kind || row.kind === 'value')) {
      const value = amount(row.quantity, row.unit, units);
      if (value) return value;
    }
    if (ambiguousPanel) return '';
    // Legacy panels sometimes store a whole table in one row's name. Read the explicitly
    // labelled amount, not that malformed row's unrelated quantity or the % daily value.
    const match = normalized.match(new RegExp(`(?:^|\\s)(?:${label})\\s*:?\\s*(<?\\s*\\d+(?:[.,]\\d+)?)\\s*(${units})\\b`, 'i'));
    return match ? `${match[1].replace('.', ',')} ${match[2]}` : '';
  };
  const serving = amount(facts.serving_quantity, facts.serving_unit, 'g|ml');
  const portion = normalized.match(/(?:portion|dose|mesure)(?:\s*de)?\s*:?\s*(\d+(?:[.,]\d+)?\s*(?:g|ml))\b/)
    || normalized.match(/portion\s*:[^:]{0,65}?\((\d+(?:[.,]\d+)?\s*g)\)/);
  const per100 = /(?:pour|par|per)\s*100\s*g\b/.test(normalized);
  // Flattened multi-column panels lose the association between quantity and column.
  // Refuse those amounts instead of presenting a 100 g value as a serving value.
  const ambiguousPanel = per100 && Boolean(portion || /par portion|per serving/.test(normalized));
  const basis = serving ? `Par portion de ${serving}` : ambiguousPanel ? 'Base à vérifier sur la fiche' : per100 ? 'Pour 100 g' : portion ? `Par portion de ${portion[1]}` : /par portion|per serving/.test(normalized) ? 'Par portion (taille non précisée)' : 'Base non précisée';
  const statements = [facts.claims, facts.allergens, facts.other_ingredients, ...(product.source_facts?.content?.sections ?? []).filter(s => s.key === 'other_ingredients').map(s => s.html)]
    .flat().flatMap(s => typeof s === 'string' ? s.split(/\r?\n|<\/p>|<\/li>|<br\s*\/?>/i) : []).map(text).filter(Boolean).map(folded);
  const freeFrom = (name: string) => {
    if (statements.some(s => new RegExp(`(?:traces?[^.]{0,35}|peut contenir[^.]{0,35}|may contain[^.]{0,35})\\b${name}\\b`).test(s))) return 'Traces possibles';
    if (statements.some(s => new RegExp(`(?:contient|contains)\\s*:?[^.]{0,25}\\b${name}\\b`).test(s))) return 'Contient';
    // Do not turn "non garanti sans gluten" / facility warnings into a safety promise.
    if (statements.some(s => new RegExp(`^(?:sans ${name}|${name}[- ]free)(?:[.!]|$)`).test(s.trim()))) return 'Oui, indiqué sur la fiche';
    return 'Non renseigné';
  };
  return {
    basis,
    protein: nutrient(['proteines', 'protein'], 'proteines|protein'),
    carbohydrates: nutrient(['glucides', 'carbohydrates', 'carbohydrate'], 'glucides|carbohydrates?|carbs'),
    sugars: nutrient(['sucres', 'dont sucres', 'sugars', 'total sugars'], 'dont sucres|total des sucres|sucres|total sugars'),
    fat: nutrient(['matieres grasses', 'lipides', 'fat', 'total fat'], 'matieres grasses|lipides|total fat|fat'),
    energy: nutrient(['energie', 'calories', 'energy'], 'energie|calories|energy', 'kcal|kj'),
    gluten: freeFrom('gluten'),
    lactose: freeFrom('lactose'),
  };
}
