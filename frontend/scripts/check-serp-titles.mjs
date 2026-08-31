/**
 * NO PAGE MAY SHOW GOOGLE A TITLE THAT ENDS ON A DANGLING SEPARATOR.
 *
 * ── WHAT THIS CAUGHT ─────────────────────────────────────────────────────────────────────────
 * Measured on production, 14/08/2026, on the two highest-impression zero-click pages on the site:
 *
 *     /omega-3    Oméga 3 Fish Oil Tunisie | EPA DHA - | Protéine Tunisie
 *     /creatine   Créatine Tunisie | Monohydrate Creapure - | Protéine Tunisie
 *                                                        ^^^
 *
 * `SeoCtrPass` stores those as "… | EPA DHA - Livraison 24h" and "… - Prix 2026". The tail is
 * gone by the time Google sees it and the brand suffix is appended after the orphaned hyphen, so
 * the SERP line reads as broken markup.
 *
 * These are not marginal pages. From the Search Console export for the same period:
 *
 *     omega 3 fish oil       2,827 impressions   position 7.5    0 clicks
 *     creatine monohydrate     651 impressions   position 11.4   0 clicks
 *
 * Position 7.5 with 2,827 impressions and zero clicks is not a ranking problem — the page is on
 * the first screen of results and nobody is choosing it. A title that appears to end mid-thought
 * is one of the few things that can do that at that position.
 *
 * ── WHY A GUARD RATHER THAN JUST A FIX ───────────────────────────────────────────────────────
 * The title a searcher sees is assembled from at least three places: the CTR pass writes one, the
 * SEO defaults synthesise one when it is blank, and the frontend appends the brand suffix. Nothing
 * asserted the RESULT, so a defect introduced by the interaction of two correct-looking components
 * was invisible to every check in the repo. This reads the rendered `<title>` of live URLs, which
 * is the only artefact that matters.
 *
 * It also catches the two other ways a title wastes the SERP line: a doubled brand suffix, and a
 * title so long Google truncates it anyway.
 *
 *   node scripts/check-serp-titles.mjs
 *   node scripts/check-serp-titles.mjs --base http://localhost:3123
 */
const bi = process.argv.indexOf('--base');
const BASE = (bi !== -1 ? process.argv[bi + 1] : 'https://protein.tn').replace(/\/$/, '');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

/**
 * The money pages, in Search Console impression order. Every one of these ranks TODAY — this file
 * is about what happens after the ranking, so a URL that nobody sees does not belong here.
 */
const PATHS = [
  '/',
  '/omega-3',
  '/creatine',
  '/whey-proteine',
  '/pre-workout',
  '/proteines',
  '/mass-gainers',
  '/bcaa',
  '/shop',
  '/packs',
  '/brands',
  '/blog',
  '/proteine-sousse',
  '/blog/whey-protein-en-tunisie',
];

/** Google renders roughly 60 characters before it truncates and appends its own ellipsis. */
const SERP_LIMIT = 60;

console.log(`SERP TITLES — ${BASE}\n`);

let failed = 0;
const rows = [];

for (const path of PATHS) {
  let title = null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'user-agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
    const html = await res.text();
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    title = m
      ? m[1]
          .replace(/&amp;/g, '&')
          .replace(/&#x27;|&apos;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim()
      : null;
  } catch (err) {
    console.log(`  ERROR      ${path}\n             ${err.message}`);
    failed++;
    continue;
  }

  if (!title) {
    console.log(`  NO TITLE   ${path}`);
    failed++;
    continue;
  }

  const problems = [];

  /* A separator with nothing after it but the brand — the defect this file was written for.
     Includes the case where the title simply ends on one. */
  if (/[-–—,:;]\s*(\|\s*Prot[ée]ine Tunisie)?\s*$/u.test(title)) {
    problems.push('ends on a dangling separator');
  }

  /* The suffix twice. `title: { absolute }` exists precisely to stop the root layout appending a
     brand the page already carries, and it is set per-route — so it can be missed per-route. */
  const suffixes = (title.match(/Prot[ée]ine Tunisie/gu) || []).length;
  if (suffixes > 1) problems.push(`brand suffix x${suffixes}`);

  if (title.length > SERP_LIMIT + 15) {
    problems.push(`${title.length} chars — Google will cut it`);
  }

  if (problems.length) failed++;

  rows.push({ path, title, problems });
}

const widest = Math.max(...rows.map((r) => r.path.length));
for (const { path, title, problems } of rows) {
  const flag = problems.length ? 'BAD ' : 'ok  ';
  console.log(`  ${flag} ${path.padEnd(widest)}  ${String(title.length).padStart(3)}  ${title}`);
  if (problems.length) console.log(`  ${' '.repeat(widest + 6)}  ^ ${problems.join('; ')}`);
}

console.log('');

if (failed > 0) {
  console.log(`${failed} of ${PATHS.length} title(s) waste the SERP line.`);
  console.log('');
  console.log('A dangling separator means something truncated the stored meta_title and the brand');
  console.log('suffix was appended after the orphan. Start at SeoCtrPass::TARGETS for the stored');
  console.log('value, then whatever clamps it — the rendered title is the only artefact that counts.');
  process.exit(1);
}

console.log(`All ${PATHS.length} titles are intact and inside the SERP line.`);
