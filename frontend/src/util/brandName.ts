/**
 * A brand name as a reader should see it, from the raw `brands.designation_fr` row.
 *
 * ── WHY ──────────────────────────────────────────────────────────────────────────────────────
 * The database stores some brands the way a wholesaler's price list shouts them, and those strings
 * reached Googlebot verbatim (measured on the live crawler HTML, 05/10/2026):
 *
 *     « BIOTECH USA en Tunisie : 17 produits »
 *     « SCITEC NUTRITION Tunisie : Mineraux | Protein.tn »
 *     « MR.X  V-Shape Supps Tunisie »            (double space included)
 *
 * ── THE RULE ─────────────────────────────────────────────────────────────────────────────────
 * Only a name of TWO OR MORE words that is written ENTIRELY in capitals is re-cased; one word
 * (« BSN », « DYMATIZE ») may well be the brand's own styling, and a name that already contains a
 * lowercase letter (« BioTRUST », « weightworld », « PERFECT Sports ») was typed on purpose.
 * Inside a re-cased name:
 *   - a word of more than 3 letters is title-cased, segment by segment across « - » and « ’ »
 *     (a lone letter after an apostrophe stays lowercase: « GOLD’S » → « Gold’s »);
 *   - a word of 3 letters or fewer is an initialism (« BPI », « USA », « JNX », « MND », « G »)
 *     and is kept — EXCEPT a consonant-vowel-consonant word (Y counts as a vowel), which reads as
 *     a word, not letters: « BIG » → « Big », « GYM » → « Gym ». Measured against the 25 all-caps
 *     multi-word rows of /api/all_brands (05/10/2026), that is exactly BIG and GYM;
 *   - a word containing a digit (« RULE 1 », « REDCON1 ») is kept.
 * Whitespace is always collapsed.
 *
 * NO IMPORTS: this file is shared by server routes, client components and the Node guards
 * (scripts/check-brand-template.mjs). Curated display names (« BioTech USA », « NOW Foods ») live
 * in util/brandDisplayName.ts, which builds on this.
 */
export function humanizeBrandName(raw: string | null | undefined): string {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!name) return '';
  const words = name.split(' ');
  if (words.length < 2) return name;
  if (!/\p{L}/u.test(name) || /\p{Ll}/u.test(name)) return name;
  return words.map(caseWord).join(' ');
}

const VOWEL = /^[AEIOUY]$/;

function letterCount(word: string): number {
  return (word.match(/\p{L}/gu) ?? []).length;
}

/** « BIG », « GYM », « MAX » — pronounced as a word, so not an initialism. */
function readsAsWord(word: string): boolean {
  const plain = word.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!/^[A-Z]{3}$/.test(plain)) return false;
  const [a, b, c] = plain.split('');
  return !VOWEL.test(a) && VOWEL.test(b) && !VOWEL.test(c);
}

function caseWord(word: string): string {
  if (/\d/.test(word)) return word;
  const letters = letterCount(word);
  if (letters <= 3 && !readsAsWord(word)) return word;
  const parts = word.split(/([-'’])/);
  return parts
    .map((part, i) => {
      if (!part || /^[-'’]$/.test(part)) return part;
      const afterApostrophe = i > 0 && /^['’]$/.test(parts[i - 1]);
      if (afterApostrophe && letterCount(part) === 1) return part.toLowerCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}
