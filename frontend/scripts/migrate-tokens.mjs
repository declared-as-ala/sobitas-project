/**
 * Apply the DESIGN_SYSTEM.md §8 substitution table to className strings.
 *
 * ── WHY A TOOL AND NOT HAND EDITS ──────────────────────────────────────────────────────────
 * The migration is ~5,260 occurrences across 95 files. Done by hand it is thousands of chances to
 * typo a colour, and every one of those typos is invisible until someone opens that page in the
 * theme it broke. Done by rule it is auditable: the table below is the whole behaviour, the diff
 * is mechanical, and a reviewer checks the TABLE once instead of checking 5,260 edits.
 *
 * ── THE ONE RULE THAT KEEPS THIS SAFE ──────────────────────────────────────────────────────
 * A pair is collapsed ONLY when BOTH members are present in the same class string. A lone
 * `bg-white` is never touched, because a lone `bg-white` is usually deliberate — a chip on a dark
 * plate, a logo lockup, something that must stay white in both themes. Rewriting those to
 * `bg-canvas` would silently invert them in dark mode, and that is exactly the class of bug this
 * migration exists to remove rather than create.
 *
 * Consequence: this tool is INCOMPLETE BY DESIGN. It clears the mechanical majority and reports
 * what it did not understand. The remainder is a human decision, per DESIGN_SYSTEM.md §8:
 * "anything uncovered, leave it and note it". It never redesigns.
 *
 *   node scripts/migrate-tokens.mjs --dry src/app/(shop)/qui-sommes-nous/AboutPageClient.tsx
 *   node scripts/migrate-tokens.mjs src/app/(shop)/contact/ContactPageClient.tsx
 */
import fs from 'node:fs';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const files = argv.filter((a) => !a.startsWith('--'));

if (!files.length) {
  console.error('usage: node scripts/migrate-tokens.mjs [--dry] <file...>');
  process.exit(2);
}

/**
 * Verbatim from DESIGN_SYSTEM.md §8. Do NOT add rows here without adding them there first — the
 * document is the authority and a mapping that exists only in a script is a mapping nobody
 * reviewed. Each entry: [classA, classB] -> token.
 */
const PAIRS = [
  [['bg-white', 'dark:bg-gray-950'], 'bg-canvas'],
  [['bg-white', 'dark:bg-gray-900'], 'bg-elevated'],
  [['bg-gray-50', 'dark:bg-gray-900'], 'bg-sunken'],
  [['border-gray-100', 'dark:border-gray-800'], 'border-hairline'],
  [['text-gray-900', 'dark:text-white'], 'text-ink-1'],
  [['text-gray-600', 'dark:text-gray-400'], 'text-ink-2'],
  [['text-gray-500', 'dark:text-gray-400'], 'text-ink-3'],
  [['text-red-600', 'dark:text-red-400'], 'text-brand'],
  [['bg-red-600', 'hover:bg-red-700'], 'bg-brand hover:bg-brand-hover'],
];

/** Collapse pairs inside one whitespace-separated class list. */
function migrateClassList(raw) {
  let tokens = raw.split(/(\s+)/); // keep whitespace so formatting survives
  let hits = 0;

  for (const [[a, b], replacement] of PAIRS) {
    const ia = tokens.indexOf(a);
    const ib = tokens.indexOf(b);
    if (ia === -1 || ib === -1) continue;

    // Put the token where the FIRST member was, so class order stays readable.
    const first = Math.min(ia, ib);
    const second = Math.max(ia, ib);
    tokens[first] = replacement;
    tokens[second] = null; // and drop the separator that preceded it
    if (second > 0 && /^\s+$/.test(tokens[second - 1] ?? '')) tokens[second - 1] = null;
    tokens = tokens.filter((t) => t !== null);
    hits++;
  }

  return { out: tokens.join(''), hits };
}

/** Every string literal that plausibly holds classes: className="…", cn('…'), clsx('…'), `…`. */
const STRING_RE = /(["'`])((?:[^\\\n]|\\.)*?)\1/g;

let totalHits = 0;
const leftovers = new Map();

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`  skip (not found): ${file}`);
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  let hits = 0;

  const after = before.replace(STRING_RE, (whole, quote, body) => {
    // Only touch things that look like a Tailwind class list.
    if (!/(^|\s)(bg|text|border|dark:)[-a-z0-9:/[\]]+/.test(body)) return whole;
    const { out, hits: n } = migrateClassList(body);
    hits += n;
    return n ? `${quote}${out}${quote}` : whole;
  });

  // What is left that the table does not cover — the human queue for this file.
  const rest = (after.match(/dark:(?:bg|text|border|ring|from|to)-[a-z0-9-/[\]]+/g) || []);
  if (rest.length) leftovers.set(file, rest.length);

  totalHits += hits;
  const label = `${String(hits).padStart(4)} collapsed`;
  const tail = rest.length ? `  · ${rest.length} dark: left for review` : '  · clean';
  console.log(`  ${label}${tail}   ${file}`);

  if (!DRY && hits) fs.writeFileSync(file, after);
}

console.log(`\n${DRY ? '[dry run] ' : ''}${totalHits} pair(s) collapsed across ${files.length} file(s)`);
if (leftovers.size) {
  console.log('\nnot covered by the table — decide these by hand (DESIGN_SYSTEM.md §8):');
  for (const [f, n] of [...leftovers].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${f}`);
}
