#!/usr/bin/env node
/**
 * title-case-check.mjs — the product-title casing contract, asserted against the real builder
 * and the real catalogue.
 *
 * WHY THIS TOOL EXISTS
 * `humanizeProductName` in `frontend/src/util/productMetaDescription.ts` rewrites the wholesaler
 * strings the catalogue is full of ("100% CREATINE MONOHYDRATE 300G - BIOTECH USA") into the
 * <title> and the meta description of almost every product page. On 24/09/2026 it was measured
 * over 7,389 live catalogue names and three defects were found and fixed: it re-cased all 7,389
 * names when only 243 (3.3 %) are shouting, so "NOW Foods" shipped as "Now Foods" and
 * "MuscleTech" as "Muscletech"; `KEEP_UPPER` lookups missed any token carrying punctuation, so
 * "Liquid HMB," shipped as "Liquid Hmb,"; the glued-unit rule was uppercase-only, so
 * /creatine/gsn-creatine-monohydrate-200g titled itself "Gsn – Creatine Monohydrate – 200g" while
 * sitting at position 7.0 on 272 impressions with 0 clicks (GSC 28 d to 22/09/2026). A side
 * effect of the old caser also uppercased the micro sign `µ` into Greek capital `Μ` on 99
 * products ("100 Μg of selenium").
 *
 * That fix was validated by a one-off before/after diff. Nothing in the repo holds it: the next
 * edit to `caseToken`, `KEEP_UPPER` or `normalizeUnits` can silently undo any of it, and the only
 * place it would show is the SERP, weeks later. This tool is the contract in executable form.
 *
 * HOW IT MEASURES
 * It imports the ACTUAL builder — no reimplementation, no golden HTML — through a resolve hook
 * that lets Node load the `.ts` sources directly, and runs it over real catalogue names pulled
 * from `productsBySubCategoryId/<slug>` for a daily-seeded sample of the listings in
 * `sitemaps/listings.xml` (plus the money categories, always). Brand names come from the same
 * payload's `brands` table, so each name is humanized exactly as its page humanizes it.
 *
 * THE EXPECTATIONS ARE DUPLICATED ON PURPOSE
 * `FROZEN_KEEP_UPPER` below is a copy of the builder's list as it stood on 24/09/2026, not an
 * import of it. A check that reads its expectations out of the thing it checks cannot catch a
 * deletion. Adding a brand to the builder and not to this list is safe (the new one is simply
 * not asserted yet); REMOVING one from the builder is what this catches. Update this list only
 * when the contract itself is deliberately changed, and say so in the run log.
 *
 * WHAT IS A FAILURE AND WHAT IS A CANDIDATE
 *   FAIL       a regression against the 24/09 contract — the four rules below.
 *   CANDIDATE  a name the contract does not yet cover (a brand the shop capitalises as "OstroVit"
 *              that a SHOUTING name flattens to "Ostrovit"; a unit the builder never normalised,
 *              like "2L"). Printed as context so the next casing pass has its worklist, never
 *              budgeted — a gate that is always red is a gate nobody reads.
 *
 * THE FOUR RULES (all on the builder's OUTPUT)
 *   a  a token the contract pins uppercase (FROZEN_KEEP_UPPER), shouted in the catalogue name,
 *      must not come out Titlecased — "GSN" must never render "Gsn".
 *   b  the micro sign must survive: no Greek capital `Μ` (U+039C) the input did not have, and a
 *      name with `µ`/`μ` must still carry one.
 *   c  no glued unit the builder claims to normalise — "200g", "2.3KG", "60CAPS".
 *   d  a name the catalogue already cased intentionally (`needsRecasing` false: it is neither
 *      shouting nor all-lowercase) must keep its capitals. Unit words are exempt: lowercasing
 *      "500GR" to "500 g" is the repair, not a regression.
 * Rule (e) is the negative control: ten frozen golden pairs, checked offline before the network
 * is touched, so a change that simply DISABLES the humanizer cannot pass the other four.
 *
 * EXIT CODES
 *   0  contract holds
 *   1  at least one FAIL — fix the builder, never the catalogue row
 *   2  could not measure (no builder, no network, empty catalogue) — never a P0, re-run tomorrow
 *
 * Not wired into `prebuild`: a live-API dependency in the build would break deploys the day the
 * API is slow. This is a routine tool, run from the daily/Friday sweep.
 *
 * Usage:
 *   node seo-agent/tools/title-case-check.mjs                 # golden pairs + 45 sub-category listings
 *   node seo-agent/tools/title-case-check.mjs --listings=120  # wider sweep (Fridays)
 *   node seo-agent/tools/title-case-check.mjs --slug=creatine --slug=whey-proteine
 *   node seo-agent/tools/title-case-check.mjs --offline       # golden pairs only, no network
 *   node seo-agent/tools/title-case-check.mjs --json --show=10
 */

import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..');
const BUILDER = path.join(REPO, 'frontend', 'src', 'util', 'productMetaDescription.ts');

const ORIGIN = 'https://protein.tn';
const API = 'https://admin.protein.tn/api';
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/*
 * Always read first, whatever the daily draw: the pages the objective is written against. They are
 * also the cheapest way to DISCOVER sub-category slugs — every payload carries the `sous_categories`
 * of its parent, and `productsBySubCategoryId` answers 404 for a parent category, so roughly nine
 * in ten `sitemaps/listings.xml` slugs are not addressable there. `/proteines` is one of those
 * parents: it is a listing page but not a sub-category, which is a classification, not an error.
 */
const MONEY = ['creatine', 'whey-proteine', 'mass-gainers', 'pre-workout', 'bcaa', 'whey-isolate'];

/*
 * The builder's KEEP_UPPER as of 24/09/2026 — a frozen COPY, see the header. The six brand
 * initialisms at the end were added that day from the shop's own brand table, limited to the ones
 * measured flattened inside shouting names (25 products).
 */
const FROZEN_KEEP_UPPER = new Set([
  'USA', 'UK', 'EU', 'BCAA', 'BCAAS', 'EAA', 'EAAS', 'ZMA', 'HMB', 'CLA', 'MSM', 'ISO', 'XT', 'EFX',
  'HGH', 'ATP', 'GABA', 'CBD', 'MCT', 'XL', 'XXL', 'DHA', 'EPA', 'DAA', 'HCL', 'HCA', 'Q10', 'MK7',
  'NO2', 'ZMB6', 'TNT', 'V8', 'C4',
  'GSN', 'HX', 'MND', 'JX', 'BPI', 'IHS',
]);

/*
 * Units the builder's `normalizeUnits` claims to split from the number. A glued one of THESE in
 * the output is rule (c). Anything else glued ("2L", "5000IU", "60 gommes" typed "60gommes") is a
 * candidate: the builder never promised it, and promoting it to a failure would make the gate red
 * on names nobody has decided about.
 */
const COVERED_UNITS = ['kg', 'gr', 'g', 'mg', 'ml', 'caps', 'capsules', 'gelules', 'gélules', 'tabs',
  'tablets', 'comprimes', 'comprimés', 'servings', 'softgels', 'softgel', 'doses', 'sachets'];
const GLUED_COVERED = new RegExp(`(?<![\\p{L}])(\\d+(?:[.,]\\d+)?)(${COVERED_UNITS.join('|')})\\b(?![\\p{L}])`, 'giu');
/*
 * Units the builder never promised, listed explicitly rather than matched as "digits + any
 * letters": the loose pattern reported "21st", "4X" and "30B" as units, and a candidates column
 * full of ordinals is a column nobody reads.
 */
const UNCOVERED_UNITS = ['litres', 'litre', 'l', 'oz', 'lbs', 'lb', 'iu', 'ui', 'gommes', 'gomme',
  'patches', 'patch', 'portions', 'portion', 'pieces', 'pièces', 'pcs', 'barres', 'barre', 'bars',
  'sticks', 'stick', 'ampoules', 'shots', 'count', 'ct'];
const GLUED_UNCOVERED = new RegExp(`(?<![\\p{L}])(\\d+(?:[.,]\\d+)?)(${UNCOVERED_UNITS.join('|')})\\b(?![\\p{L}])`, 'giu');

/** Exempt from rule (d): lowercasing a unit word is the repair the builder exists for. */
const UNIT_WORDS = new Set([...COVERED_UNITS, 'l', 'litre', 'litres', 'oz', 'lb', 'iu', 'ui', 'gommes',
  'comprime', 'gelule', 'gélule', 'capsule', 'portions', 'patches', 'pieces', 'pièces']);

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : dflt;
};
const asJson = argv.includes('--json');
const offline = argv.includes('--offline');
const show = Math.max(1, Number(flag('show', '6')) || 6);
const listingsN = Math.max(0, Math.min(627, Number(flag('listings', '45')) || 45));
const explicitSlugs = argv.filter((a) => a.startsWith('--slug=')).map((a) => a.slice(7)).filter(Boolean);

function die(code, msg) {
  console.error(msg);
  process.exit(code);
}

/*
 * ── LOADING THE REAL BUILDER ────────────────────────────────────────────────────────────────
 * `productMetaDescription.ts` imports `./sanitizeProductHtml` and `./productPrice` without an
 * extension, which Node's type stripping does not resolve on its own. A synchronous resolve hook
 * adds the `.ts` back for relative specifiers that exist on disk. Nothing is copied, nothing is
 * transpiled to a temp file: the file under test is the file that ships.
 */
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(spec) && ctx.parentURL) {
      const u = new URL(spec, ctx.parentURL);
      if (existsSync(fileURLToPath(`${u.href}.ts`))) return next(`${spec}.ts`, ctx);
    }
    return next(spec, ctx);
  },
});

if (!existsSync(BUILDER)) die(2, `could not measure: ${path.relative(REPO, BUILDER)} not found`);
let humanizeProductName;
try {
  ({ humanizeProductName } = await import(pathToFileURL(BUILDER).href));
} catch (err) {
  die(2, `could not measure: cannot load the builder (${err.message})\n` +
        'Node 22.18+ strips types by default; on an older 22.x re-run with --experimental-strip-types.');
}
if (typeof humanizeProductName !== 'function') die(2, 'could not measure: humanizeProductName is no longer exported');

/* ── RULE (e): THE NEGATIVE CONTROL ──────────────────────────────────────────────────────────
 * Verified against the live builder on 25/09/2026. Rows 1–2 and 5–7 are the wholesaler style the
 * humanizer exists for and MUST keep being rewritten; rows 3–4 and 8 are intentional catalogue
 * capitals that must survive untouched. Together they fail any change that disables the
 * humanizer as loudly as one that over-applies it. */
const GOLDEN = [
  ['100% CREATINE MONOHYDRATE 300G - BIOTECH USA', 'Biotech USA', '100% Creatine Monohydrate 300 g'],
  ['GSN - CREATINE MONOHYDRATE | 200g', 'GSN', 'GSN – Creatine Monohydrate – 200 g'],
  ['NOW Foods L-Theanine – 120 gélules végétales', 'NOW Foods', 'NOW Foods L-Theanine – 120 gélules végétales'],
  ['MuscleTech Clear Muscle, Liquid HMB, 84 Liquid Softgels', 'MuscleTech', 'MuscleTech Clear Muscle, Liquid HMB, 84 Liquid Softgels'],
  ['ISO 100 DYMATIZE â€“ 2.3KG', 'Dymatize', 'ISO 100 Dymatize – 2,3 kg'],
  ['SELENIUM 100µG - 90 CAPS', 'Now Foods', 'Selenium 100µg – 90 caps'],
  ['BPI SPORTS BEST BCAA 300G', 'BPI Sports', 'BPI Sports Best BCAA 300 g'],
  ['EVLution Nutrition Resveratrol', 'EVLution Nutrition', 'EVLution Nutrition Resveratrol'],
  /* The SPACED micro sign, found live by this tool on 25/09/2026 and repaired the same day:
     the glued form already went down the digit branch, the standalone token did not. */
  ['NATURELO Vitamin D3 \u2013 62,5 \u00b5g', 'NATURELO', 'Naturelo Vitamin D3 \u2013 62,5 \u00b5g'],
  ['100% WHEY GOLD STANDARD 2.27KG - OPTIMUM NUTRITION', 'Optimum Nutrition', '100% Whey Gold Standard 2,27 kg'],
  /* An all-lowercase name passes through UNTOUCHED. The builder's own comment says a name
     "typed entirely in lower case" still gets the full treatment, but `needsRecasing` tests
     `lower === 0` (which `upper > lower` already covers) where it would need `upper === 0`,
     so that branch has no implementation. Measured 25/09/2026: 0 all-lowercase names in the
     live catalogue, so it is latent, not a live defect — pinned here as the CURRENT
     behaviour, and counted below so the day one appears it is visible. */
  ['c4 original pre workout cellucor', 'Cellucor', 'c4 original pre workout'],
];

const goldenFails = [];
for (const [raw, brand, expected] of GOLDEN) {
  let got;
  try { got = humanizeProductName(raw, brand); } catch (err) { got = `threw: ${err.message}`; }
  if (got !== expected) goldenFails.push({ raw, brand, expected, got });
}

/* ── TOKENS ─────────────────────────────────────────────────────────────────────────────────── */

/** Split on whitespace and peel the punctuation, the way `caseToken` does before it looks a token up. */
function cores(s) {
  const out = [];
  for (const t of s.split(/\s+/)) {
    const m = t.match(/^[^\p{L}\p{N}]*(.+?)[^\p{L}\p{N}]*$/u);
    if (m?.[1]) out.push(m[1]);
  }
  return out;
}

/** Letter runs only, for the capitals comparison in rule (d). */
function letterTokens(s) {
  return s.normalize('NFC').match(/\p{L}+/gu) || [];
}

/** The builder's own `needsRecasing`, duplicated (it is not exported) — see the header. */
function needsRecasing(name) {
  const upper = name.match(/\p{Lu}/gu)?.length ?? 0;
  const lower = name.match(/\p{Ll}/gu)?.length ?? 0;
  if (!upper && !lower) return false;
  return lower === 0 || upper > lower;
}

const isShouted = (t) => t.length >= 2 && t === t.toUpperCase() && /\p{Lu}/u.test(t);
const isTitlecased = (t) => /^\p{Lu}\p{Ll}+$/u.test(t);

/* ── THE CATALOGUE ──────────────────────────────────────────────────────────────────────────── */

async function getText(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

async function listingSlugs() {
  const xml = await getText(`${ORIGIN}/sitemaps/listings.xml`);
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(`${ORIGIN}/`, '').replace(/\/$/, ''))
    .filter((s) => s && !s.includes('/'));
  if (!all.length) throw new Error('listings.xml carried no <loc>');
  // Same daily seed as audit-live.mjs: re-runs today compare like with like, tomorrow walks elsewhere.
  let seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')) % 2147483647;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const rest = all.filter((s) => !MONEY.includes(s));
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [...MONEY.filter((s) => all.includes(s)), ...rest];
}

/**
 * Every product of one listing as {slug, name, brand}; brands resolved from the payload's own
 * table, so each name is humanized with the brand its page passes. Also returns the parent's
 * `sous_categories`, which is how the queue grows without probing 600 parent slugs for a 404.
 */
async function productsOf(slug) {
  const body = await getText(`${API}/productsBySubCategoryId/${encodeURIComponent(slug)}`);
  const json = JSON.parse(body);
  const list = Array.isArray(json.products) ? json.products : (json.products?.data ?? []);
  const brands = new Map((json.brands ?? []).map((b) => [b.id, (b.designation_fr ?? '').trim()]));
  const siblings = (json.sous_categories ?? []).map((c) => c?.slug).filter((c) => typeof c === 'string' && c);
  return {
    siblings,
    rows: list
      .filter((p) => p && typeof p.designation_fr === 'string' && p.designation_fr.trim())
      .map((p) => ({ slug: p.slug ?? '', name: p.designation_fr.trim(), brand: brands.get(p.brand_id) ?? '', listing: slug })),
  };
}

const products = new Map();
const brandForms = new Map();   // lowercased brand token -> the shop's own spelling
const unreachable = [];
let listingsRead = 0;
let notSubCategory = 0;
let probed = 0;

if (!offline) {
  let queue;
  try {
    queue = explicitSlugs.length ? [...explicitSlugs] : await listingSlugs();
  } catch (err) {
    die(2, `could not measure: ${ORIGIN}/sitemaps/listings.xml — ${err.message}`);
  }
  const want = explicitSlugs.length || listingsN;
  const seenSlug = new Set(queue);
  let discovered = 0;   // sub-category slugs learned from a parent's payload, appended after the draw
  while (queue.length && listingsRead < want) {
    const slug = queue.shift();
    probed += 1;
    try {
      const { rows, siblings } = await productsOf(slug);
      listingsRead += 1;
      for (const r of rows) {
        if (r.slug && !products.has(r.slug)) products.set(r.slug, r);
        for (const t of cores(r.brand)) if (!brandForms.has(t.toLowerCase())) brandForms.set(t.toLowerCase(), t);
      }
      for (const sib of siblings) {
        if (seenSlug.has(sib)) continue;
        seenSlug.add(sib);
        queue.splice(discovered++, 0, sib);   // known-good slugs jump the queue; the draw follows
      }
    } catch (err) {
      if (err.status === 404) notSubCategory += 1;   // a parent category, not an error
      else unreachable.push(`${slug}: ${err.message}`);
      if (discovered > 0) discovered -= 1;
    }
  }
  if (!products.size) {
    die(2, `could not measure: 0 products over ${probed} probed listing slug(s)` +
           (unreachable.length ? ` (first error — ${unreachable[0]})` : ''));
  }
}

/* ── THE FOUR RULES ─────────────────────────────────────────────────────────────────────────── */

const fails = { keepUpper: [], microSign: [], gluedUnit: [], capitalsChanged: [] };
const candidates = { brandFlattened: new Map(), gluedUncovered: new Map(), allLowercase: [] };
/*
 * A brand the shop's table spells with an interior capital ("OstroVit", "BioTRUST", "EVLution")
 * is an intentional spelling a shouting name flattens — a real candidate. A brand the table
 * spells ALL CAPS ("ALLMAX", "BIG RAMY LABS") may simply be shouting there too, so Titlecase may
 * well be the right rendering; those are counted, not listed, because deciding them needs the
 * brand's own site, not this catalogue.
 */
const shoutingBrandFlattened = new Set();
let threw = 0;

for (const p of products.values()) {
  let out;
  try {
    out = humanizeProductName(p.name, p.brand || null);
  } catch (err) {
    threw += 1;
    fails.keepUpper.push({ ...p, out: `threw: ${err.message}`, detail: 'builder threw' });
    continue;
  }
  if (!/\p{Lu}/u.test(p.name) && /\p{Ll}/u.test(p.name)) candidates.allLowercase.push({ ...p, out });
  const rawCores = cores(p.name);
  const outCores = cores(out);
  const outUpper = new Set(outCores.filter(isShouted).map((t) => t.toUpperCase()));

  // (a) a pinned token, shouted in the catalogue, must not come out Titlecased.
  for (const t of new Set(rawCores.filter(isShouted))) {
    const U = t.toUpperCase();
    if (FROZEN_KEEP_UPPER.has(U) && !outUpper.has(U) && outCores.some((o) => o.toUpperCase() === U)) {
      fails.keepUpper.push({ ...p, out, detail: `${t} → ${outCores.find((o) => o.toUpperCase() === U)}` });
    }
  }

  // (b) the micro sign must survive, and must never become Greek capital Mu.
  const rawHasMicro = /[µμ]/.test(p.name);
  if (/Μ/.test(out) && !/Μ/.test(p.name)) {
    fails.microSign.push({ ...p, out, detail: 'µ → Μ (Greek capital Mu)' });
  } else if (rawHasMicro && !/[µμ]/.test(out)) {
    fails.microSign.push({ ...p, out, detail: 'micro sign lost' });
  }

  // (c) no glued unit the builder normalises.
  const glued = [...out.matchAll(GLUED_COVERED)].map((m) => m[0]);
  if (glued.length) fails.gluedUnit.push({ ...p, out, detail: glued.join(', ') });
  for (const m of out.matchAll(GLUED_UNCOVERED)) {
    const key = m[2].toLowerCase();
    if (!candidates.gluedUncovered.has(key)) candidates.gluedUncovered.set(key, { unit: m[2], n: 0, example: `${p.slug}: ${m[0]}` });
    candidates.gluedUncovered.get(key).n += 1;
  }

  // (d) capitals the catalogue set on purpose must survive.
  if (!needsRecasing(p.name)) {
    const rawByLower = new Map();
    for (const t of letterTokens(p.name)) {
      const k = t.toLowerCase();
      if (!rawByLower.has(k)) rawByLower.set(k, new Set());
      rawByLower.get(k).add(t);
    }
    const changed = [];
    for (const t of letterTokens(out)) {
      const k = t.toLowerCase();
      if (UNIT_WORDS.has(k)) continue;
      const forms = rawByLower.get(k);
      if (forms && !forms.has(t)) changed.push(`${[...forms][0]} → ${t}`);
    }
    if (changed.length) fails.capitalsChanged.push({ ...p, out, detail: [...new Set(changed)].join(', ') });
  } else {
    // CANDIDATE: a shouting name flattens a brand the shop itself spells with capitals.
    for (const t of outCores) {
      if (!isTitlecased(t)) continue;
      const own = brandForms.get(t.toLowerCase());
      if (!own || own === t || !/\p{Lu}/u.test(own.slice(1))) continue;
      if (FROZEN_KEEP_UPPER.has(own.toUpperCase())) continue;
      if (!/\p{Ll}/u.test(own)) { shoutingBrandFlattened.add(own); continue; }
      const key = own;
      if (!candidates.brandFlattened.has(key)) candidates.brandFlattened.set(key, { own, got: t, n: 0, example: p.slug });
      candidates.brandFlattened.get(key).n += 1;
    }
  }
}

/* ── REPORT ─────────────────────────────────────────────────────────────────────────────────── */

const counts = {
  golden: { total: GOLDEN.length, failed: goldenFails.length },
  listingsRead,
  probed,
  notSubCategory,
  products: products.size,
  a_keepUpper: fails.keepUpper.length,
  b_microSign: fails.microSign.length,
  c_gluedUnit: fails.gluedUnit.length,
  d_capitalsChanged: fails.capitalsChanged.length,
};
const failed = goldenFails.length + fails.keepUpper.length + fails.microSign.length +
  fails.gluedUnit.length + fails.capitalsChanged.length;

if (asJson) {
  console.log(JSON.stringify({
    ok: failed === 0, counts, goldenFails, fails,
    candidates: {
      brandFlattened: [...candidates.brandFlattened.values()].sort((x, y) => y.n - x.n),
      shoutingBrandFlattened: [...shoutingBrandFlattened].sort(),
      gluedUncovered: [...candidates.gluedUncovered.values()].sort((x, y) => y.n - x.n),
      allLowercase: candidates.allLowercase,
    },
    unreachable,
  }, null, 2));
  process.exit(failed ? 1 : 0);
}

console.log('# Product-title casing contract — real builder over the real catalogue\n');
console.log(`Builder: frontend/src/util/productMetaDescription.ts · contract frozen 24/09/2026`);
console.log(offline
  ? 'Catalogue: skipped (--offline) — golden pairs only'
  : `Catalogue: ${products.size} product name(s) over ${listingsRead} sub-category listing(s)` +
    ` (${probed} slugs probed, ${notSubCategory} are parent categories)` +
    (unreachable.length ? ` · ${unreachable.length} unreachable` : ''));
console.log();
console.log('| rule | what it locks | result |');
console.log('| --- | --- | --- |');
console.log(`| e | golden pairs (humanizer still does its job) | ${goldenFails.length ? `**${goldenFails.length} of ${GOLDEN.length} FAIL**` : `${GOLDEN.length} ok`} |`);
console.log(`| a | pinned initialism not Titlecased (GSN ≠ Gsn) | ${fails.keepUpper.length ? `**${fails.keepUpper.length} FAIL**` : 'ok'} |`);
console.log(`| b | micro sign survives, never Greek Μ | ${fails.microSign.length ? `**${fails.microSign.length} FAIL**` : 'ok'} |`);
console.log(`| c | no glued unit (200g, 2.3KG, 60CAPS) | ${fails.gluedUnit.length ? `**${fails.gluedUnit.length} FAIL**` : 'ok'} |`);
console.log(`| d | intentional catalogue capitals survive | ${fails.capitalsChanged.length ? `**${fails.capitalsChanged.length} FAIL**` : 'ok'} |`);

for (const [rule, rows] of [['a', fails.keepUpper], ['b', fails.microSign], ['c', fails.gluedUnit], ['d', fails.capitalsChanged]]) {
  if (!rows.length) continue;
  console.log(`\n## FAIL (${rule}) — ${rows.length}\n`);
  for (const r of rows.slice(0, show)) {
    console.log(`- /${r.listing}/${r.slug}`);
    console.log(`    catalogue  ${r.name}`);
    console.log(`    builder    ${r.out}`);
    console.log(`    ${r.detail}`);
  }
  if (rows.length > show) console.log(`  … and ${rows.length - show} more (--show=${rows.length})`);
}
if (goldenFails.length) {
  console.log(`\n## FAIL (e) — golden pairs\n`);
  for (const g of goldenFails) {
    console.log(`- ${g.raw}  [brand: ${g.brand}]`);
    console.log(`    expected  ${g.expected}`);
    console.log(`    got       ${g.got}`);
  }
}

const bf = [...candidates.brandFlattened.values()].sort((x, y) => y.n - x.n);
const gu = [...candidates.gluedUncovered.values()].sort((x, y) => y.n - x.n);
const lc = candidates.allLowercase;
const sb = [...shoutingBrandFlattened].sort();
if (bf.length || gu.length || lc.length || sb.length) {
  console.log('\n## Candidates — context, not a finding\n');
  if (bf.length) {
    console.log(`Brands the shop's own table spells with an interior capital that a SHOUTING name flattens`);
    console.log(`(${bf.length}); each is a KEEP_UPPER row somebody has to decide on, not a regression against the`);
    console.log('24/09 contract:');
    for (const c of bf.slice(0, show)) console.log(`  ${c.own} → ${c.got}  ×${c.n}  (e.g. ${c.example})`);
    if (bf.length > show) console.log(`  … and ${bf.length - show} more`);
  }
  if (gu.length) {
    console.log(`\nGlued units the builder never normalised (${gu.length}):`);
    for (const c of gu.slice(0, show)) console.log(`  ${c.unit}  ×${c.n}  (e.g. ${c.example})`);
    if (gu.length > show) console.log(`  … and ${gu.length - show} more`);
  }
  if (sb.length) {
    console.log(`\n${sb.length} brand(s) the table itself spells ALL CAPS are Titlecased in a shouting name`);
    console.log(`(${sb.slice(0, 8).join(', ')}${sb.length > 8 ? ', …' : ''}). Titlecase may be correct there — the`);
    console.log("catalogue cannot say, so these are counted only; check the brand's own site to decide.");
  }
  if (lc.length) {
    console.log(`\nAll-lowercase catalogue names, which the builder passes through untouched (${lc.length}).`);
    console.log('Its comment says these should be re-cased; `needsRecasing` has no branch for them. 0 on');
    console.log('25/09/2026, so the disagreement is latent — if this number leaves 0, decide the branch:');
    for (const c of lc.slice(0, show)) console.log(`  /${c.listing}/${c.slug}  ${c.name}`);
    if (lc.length > show) console.log(`  … and ${lc.length - show} more`);
  }
}
if (unreachable.length) {
  console.log(`\n${unreachable.length} listing(s) unreachable (not a finding): ${unreachable.slice(0, 3).join(' · ')}`);
}
console.log(`\n${failed ? `${failed} failure(s) — the casing contract regressed; fix the builder.` : 'Contract holds.'}`);
if (threw) console.log(`${threw} name(s) made the builder throw — counted under rule (a).`);
process.exit(failed ? 1 : 0);
