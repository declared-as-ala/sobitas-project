#!/usr/bin/env node
/**
 * parity-check.mjs — bot vs human visible-text parity on the pages Googlebot is served
 * through the middleware rewrite (`x-crawler/*`).
 *
 * WHY THIS TOOL EXISTS
 * Dynamic rendering is only defensible while both renders say the same thing. On 22/09/2026 the
 * human category page clamped its editorial intro to 520 characters and dropped the remainder
 * whenever a buying guide existed, while `CrawlerCategoryView` printed the intro whole — 1,016
 * bot-only words on /mass-gainers, 725 on /pre-workout, 692 on /whey-proteine, 417 on /creatine.
 * Nothing in the repo could see that, because both files were individually correct. Only a live
 * diff of the two renders could.
 *
 * HOW IT MEASURES
 * Fetches each path twice — Googlebot UA and a desktop Chrome UA — strips script/style/svg/
 * noscript/comments, decodes entities, and compares 6-word shingles of the remaining visible
 * text. A run of >= MIN_RUN consecutive words whose shingles appear in ONE render only is
 * reported. Shingles, not word counts: a page that merely reorders its blocks must not be
 * flagged, and two renders with the same total word count can still say different things.
 *
 * WHICH DIRECTION IS THE FINDING
 * Only BOT-ONLY text is budgeted. Text a crawler is served and a visitor cannot reach is the
 * cloaking direction, and it is always a defect. Human-only text is the opposite: the crawler
 * route is a deliberately lean document with no header, no footer, no facets and no sort
 * controls, so several hundred human-only words are the design working. They are counted and
 * printed as context, never as a verdict.
 *
 * WHAT IT DOES NOT FLAG
 * - Navigation the two renders legitimately differ on: the crawler pager ("Page N sur M",
 *   prev/next/last) and breadcrumb wording. Both are link skeleton, not editorial content.
 * - Runs shorter than MIN_RUN words: entity/whitespace noise at tag seams.
 *
 * EXIT CODES
 *   0  every path within budget
 *   1  at least one path over budget (a parity finding — fix the BUILDER, both views)
 *   2  could not measure (network, non-200, empty render) — never a P0, re-run tomorrow
 *
 * Usage:
 *   node seo-agent/tools/parity-check.mjs                     # the four money categories
 *   node seo-agent/tools/parity-check.mjs /creatine /omega-3  # explicit paths
 *   node seo-agent/tools/parity-check.mjs --budget=40 --show=3
 */

const BASE = 'https://protein.tn';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const SHINGLE = 6;
const MIN_RUN = 12;
/** Words of BOT-ONLY editorial text a page may carry before it is a finding. */
const DEFAULT_BUDGET = 60;

/** The money categories the 22/09 diagnosis names; the default subject of this check. */
const DEFAULT_PATHS = ['/creatine', '/whey-proteine', '/mass-gainers', '/pre-workout', '/proteines'];

/** Crawler-pager and breadcrumb phrasing: link skeleton both renders are allowed to differ on. */
const IGNORE = [
  /^page \d+ sur \d+/i,
  /page (suivante|précédente)/i,
  /(première|dernière) page/i,
  /^accueil boutique/i,
];

const argv = process.argv.slice(2);
const budget = Number((argv.find((a) => a.startsWith('--budget=')) || '').split('=')[1]) || DEFAULT_BUDGET;
const show = Number((argv.find((a) => a.startsWith('--show=')) || '').split('=')[1]) || 3;
const paths = argv.filter((a) => a.startsWith('/'));
const targets = paths.length ? paths : DEFAULT_PATHS;

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»',
  hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—',
  eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ugrave: 'ù',
  ocirc: 'ô', icirc: 'î', iuml: 'ï', uuml: 'ü', deg: '°', euro: '€', times: '×',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(Number(d)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, n) => ENTITIES[n] ?? ' ');
}

function safeChar(code) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return ' ';
  }
}

function visibleText(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text) {
  return text.toLowerCase().normalize('NFC').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
}

function shingleSet(ws) {
  const set = new Set();
  for (let i = 0; i + SHINGLE <= ws.length; i++) set.add(ws.slice(i, i + SHINGLE).join(' '));
  return set;
}

/** Consecutive words of `ws` whose shingle is absent from `other`, as readable runs. */
function oneSidedRuns(ws, other) {
  const runs = [];
  let run = [];
  for (let i = 0; i + SHINGLE <= ws.length; i++) {
    if (!other.has(ws.slice(i, i + SHINGLE).join(' '))) run.push(ws[i]);
    else {
      if (run.length >= MIN_RUN) runs.push(run.join(' '));
      run = [];
    }
  }
  if (run.length >= MIN_RUN) runs.push(run.join(' '));
  return runs.filter((r) => !IGNORE.some((re) => re.test(r)));
}

async function fetchAs(url, ua) {
  const res = await fetch(url, { headers: { 'user-agent': ua, accept: 'text/html' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (html.length < 500) throw new Error('empty render');
  return html;
}

const rows = [];
let unmeasurable = 0;

for (const path of targets) {
  const url = `${BASE}${path}`;
  try {
    const [botHtml, humanHtml] = await Promise.all([fetchAs(url, GOOGLEBOT), fetchAs(url, CHROME)]);
    const bot = words(visibleText(botHtml));
    const human = words(visibleText(humanHtml));
    const botSh = shingleSet(bot);
    const humanSh = shingleSet(human);
    const botOnly = oneSidedRuns(bot, humanSh);
    const humanOnly = oneSidedRuns(human, botSh);
    const count = (runs) => runs.reduce((a, r) => a + r.split(' ').length, 0);
    rows.push({
      path,
      botWords: bot.length,
      humanWords: human.length,
      botOnly: count(botOnly),
      humanOnly: count(humanOnly),
      botRuns: botOnly,
    });
  } catch (err) {
    unmeasurable++;
    rows.push({ path, error: err.message });
  }
}

console.log(`# Bot/human render parity — ${BASE} — budget ${budget} BOT-ONLY words per page\n`);
console.log('| path | bot words | human words | bot-only | human-only (context) | verdict |');
console.log('| --- | --- | --- | --- | --- | --- |');
let over = 0;
for (const r of rows) {
  if (r.error) {
    console.log(`| ${r.path} | – | – | – | – | could not measure (${r.error}) |`);
    continue;
  }
  const ok = r.botOnly <= budget;
  if (!ok) over++;
  console.log(
    `| ${r.path} | ${r.botWords} | ${r.humanWords} | ${r.botOnly} | ${r.humanOnly} | ${ok ? 'ok' : `OVER by ${r.botOnly - budget}`} |`
  );
}

for (const r of rows) {
  if (r.error || r.botOnly <= budget || !r.botRuns.length) continue;
  console.log(`\n${r.path} — ${r.botRuns.length} bot-only run(s), longest first:`);
  for (const run of r.botRuns.slice().sort((a, b) => b.length - a.length).slice(0, show)) {
    console.log(`  (${run.split(' ').length}w) ${run.slice(0, 200)}${run.length > 200 ? '…' : ''}`);
  }
}

if (unmeasurable === rows.length) {
  console.log('\nCould not measure any path — network or origin problem, not a site defect.');
  process.exit(2);
}
console.log(
  `\n${over} of ${rows.length - unmeasurable} measured page(s) carry more than ${budget} bot-only words.`
);
console.log(
  'Human-only words are context, not a finding: the crawler route has no header, footer, facets or sort controls.'
);
process.exit(over > 0 ? 1 : 0);
