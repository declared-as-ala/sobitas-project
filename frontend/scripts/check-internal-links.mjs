/**
 * PROVE THE IN-CONTENT LINKER'S RULES, because the failure modes are all silent.
 *
 * Every rule in util/internalLinks.ts exists to stop a specific bad outcome, and none of those
 * outcomes throws: a nested anchor renders, a linked heading renders, twelve links to the same
 * category render. They just quietly make the page worse, which is exactly the kind of bug that
 * ships. So each rule gets a case that fails loudly if the rule stops holding.
 *
 * Also runs the linker over the LIVE article bodies when reachable, because a matcher that passes
 * every synthetic case and finds nothing in the real corpus is a matcher that does nothing. The
 * corpus is CMS HTML written by several people over two years; it is the only honest test of the
 * accent and entity handling.
 *
 *   node scripts/check-internal-links.mjs
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/*
 * Imported straight from the .ts source — Node 22.6+ strips type annotations natively and 23+ does
 * it without a flag, and internalLinks.ts uses only erasable syntax (annotations and interfaces, no
 * enums or namespaces).
 *
 * This matters more than convenience: the alternative was regex-stripping the types into a data:
 * module, which means the thing under test is a TRANSFORM of the shipped code rather than the
 * shipped code. A test that passes against a mangled copy proves nothing about what runs.
 */
const { injectInternalLinks, targetsFromTaxonomy } =
  await import(pathToFileURL(join(here, '../src/util/internalLinks.ts')).href);

const TARGETS = [
  { href: '/proteines', terms: ['protéine', 'protéines'] },
  { href: '/whey-proteine', terms: ['whey protéine', 'whey'] },
  { href: '/creatine', terms: ['créatine', 'créatine monohydrate'] },
  { href: '/bcaa', terms: ['bcaa'] },
];

let failed = 0;
const check = (name, got, want) => {
  const ok = typeof want === 'function' ? want(got) : got === want;
  if (!ok) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        got:  ${got}`);
    if (typeof want !== 'function') console.log(`        want: ${want}`);
  } else {
    console.log(`  ok    ${name}`);
  }
};

const countLinks = (h) => (h.match(/<a /g) || []).length;

console.log('\nRULES\n');

check(
  'links the first mention',
  injectInternalLinks('<p>La créatine est utile.</p>', TARGETS),
  '<p>La <a href="/creatine" class="article-inline-link">créatine</a> est utile.</p>'
);

check(
  'one link per destination — the second mention is left alone',
  countLinks(injectInternalLinks('<p>La créatine agit.</p><p>La créatine encore.</p>', TARGETS)),
  1
);

check(
  'never nests inside an existing anchor',
  injectInternalLinks('<p>Voir <a href="/x">la créatine ici</a>.</p>', TARGETS),
  (h) => !/<a[^>]*>[^<]*<a /.test(h) && countLinks(h) === 1
);

check(
  'never links inside a heading',
  injectInternalLinks('<h2>La créatine</h2><p>rien</p>', TARGETS),
  (h) => !/<h2>[^<]*<a /.test(h)
);

check(
  'never links inside <code>',
  injectInternalLinks('<pre><code>creatine = 5</code></pre>', TARGETS),
  (h) => countLinks(h) === 0
);

check(
  'respects the cap',
  countLinks(injectInternalLinks('<p>protéine</p><p>whey</p><p>créatine</p><p>bcaa</p>', TARGETS, { max: 2 })),
  2
);

check(
  'the more specific destination wins the sentence',
  injectInternalLinks('<p>La whey protéine est une protéine.</p>', TARGETS, { max: 1 }),
  (h) => h.includes('href="/whey-proteine"')
);

console.log('\nSPELLINGS THE CORPUS ACTUALLY CONTAINS\n');

check('accented', countLinks(injectInternalLinks('<p>une protéine</p>', TARGETS)), 1);
check('unaccented', countLinks(injectInternalLinks('<p>une proteine</p>', TARGETS)), 1);
check('named entity', countLinks(injectInternalLinks('<p>une prot&eacute;ine</p>', TARGETS)), 1);
check('numeric entity', countLinks(injectInternalLinks('<p>une prot&#233;ine</p>', TARGETS)), 1);
check('plural', countLinks(injectInternalLinks('<p>les protéines</p>', TARGETS)), 1);
check('uppercase', countLinks(injectInternalLinks('<p>PROTÉINE</p>', TARGETS)), 1);

check(
  'does not match inside a longer word — créatinine is not créatine',
  countLinks(injectInternalLinks('<p>la créatinine sanguine</p>', TARGETS)),
  0
);
check(
  'does not match a fragment — protéinurie is not protéine',
  countLinks(injectInternalLinks('<p>protéinurie</p>', TARGETS)),
  0
);

console.log('\nIDEMPOTENCE\n');
const once = injectInternalLinks('<p>La créatine et la whey.</p>', TARGETS);
check('running twice adds nothing', countLinks(injectInternalLinks(once, TARGETS)), countLinks(once));

// ── The real corpus ────────────────────────────────────────────────────────────────────────────
console.log('\nLIVE ARTICLE BODIES\n');
const API = (process.env.API_BASE || 'https://admin.protein.tn').replace(/\/$/, '');
try {
  const cats = await (await fetch(`${API}/api/categories?per_page=50`, { signal: AbortSignal.timeout(30_000) })).json();
  const catRows = Array.isArray(cats) ? cats : (cats.data ?? cats.categories ?? []);
  const targets = targetsFromTaxonomy(catRows, {
    'whey-proteine': ['whey'],
    creatine: ['créatine monohydrate', 'monohydrate de créatine'],
  });

  const list = await (await fetch(`${API}/api/all_articles?per_page=12`, { signal: AbortSignal.timeout(30_000) })).json();
  const arts = (list.articles ?? list.data ?? []).filter((a) => a.slug);

  let linked = 0;
  let sampled = 0;
  const zero = [];
  for (const a of arts.slice(0, 8)) {
    const res = await fetch(`${API}/api/article_details/${a.slug}`, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) { console.log(`  (skipped ${a.slug}: API ${res.status})`); continue; }
    const d = await res.json();
    const a2 = d.article ?? d;
    const body = a2?.description_fr || a2?.description || '';
    if (!body) continue;
    sampled++;
    const n = countLinks(injectInternalLinks(body, targets)) - countLinks(body);
    linked += n;
    if (n === 0) zero.push(a.slug);
    console.log(`  ${String(n).padStart(2)} link(s)  ${a.slug}`);
    await new Promise((r) => setTimeout(r, 120));
  }

  if (sampled > 0) {
    console.log(`\n  ${targets.length} link targets built from the live taxonomy`);
    console.log(`  ${linked} links across ${sampled} articles — ${(linked / sampled).toFixed(1)} per article`);
    if (zero.length > sampled / 2) {
      failed++;
      console.log(`  FAIL  ${zero.length}/${sampled} articles got NO link. The matcher is not finding the corpus.`);
    }
  } else {
    console.log('  (no article bodies reachable — live portion skipped)');
  }
} catch (e) {
  console.log(`  (live portion skipped: ${e.message})`);
}

/*
 * ── AND FINALLY: ARE THE LINKS IN THE HTML GOOGLE RECEIVES? ───────────────────────────────────
 *
 * Everything above proves the FUNCTION works. This proves the PAGE does, and they are different
 * claims — the whole reason this work exists is that BlogRecommendedProducts also "works" and
 * contributes nothing, because it fetches on an IntersectionObserver and Googlebot does not scroll.
 * A unit test could never have caught that.
 *
 * So: fetch the article the way a crawler does, once, with no JavaScript, and count the anchors.
 * Measured before this shipped, on three articles: 0 links to any product and 0 in-content links to
 * any category — every category anchor on the page came from the header and footer, which is why
 * the raw per-page link count looked healthy while the article contributed nothing of its own.
 */
console.log('\nRENDERED PAGE\n');
const BASE = (process.env.BASE_URL || 'https://protein.tn').replace(/\/$/, '');
try {
  const list = await (await fetch(`${API}/api/all_articles?per_page=4`, { signal: AbortSignal.timeout(30_000) })).json();
  const arts = (list.articles ?? list.data ?? []).filter((a) => a.slug).slice(0, 3);

  let withLinks = 0;
  let checked = 0;
  for (const a of arts) {
    const res = await fetch(`${BASE}/blog/${a.slug}`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) { console.log(`  (skipped ${a.slug}: page ${res.status})`); continue; }
    const html = await res.text();
    checked++;
    const n = (html.match(/class="article-inline-link"/g) || []).length;
    if (n > 0) withLinks++;
    console.log(`  ${String(n).padStart(2)} in-content link(s)  /blog/${a.slug}`);
    await new Promise((r) => setTimeout(r, 150));
  }

  if (checked > 0 && withLinks === 0) {
    failed++;
    console.log(`\n  FAIL  ${checked} article page(s) rendered and NONE carries an in-content link.`);
    console.log('        The linker runs in ArticleDetailClient, which is a client component that');
    console.log('        Next still renders on the server — so its anchors belong in this HTML.');
    console.log('        Zero here means either linkTargets arrived empty (getCategories failed) or');
    console.log('        the injection moved into an effect, where a crawler will never see it.');
  } else if (checked > 0) {
    console.log(`\n  ${withLinks}/${checked} article pages carry in-content links in the raw HTML.`);
  } else {
    console.log('  (no article page reachable — rendered check skipped)');
  }
} catch (e) {
  console.log(`  (rendered check skipped: ${e.message})`);
}

console.log('');
if (failed) {
  console.log(`${failed} check(s) FAILED`);
  process.exit(1);
}
console.log('All internal-link rules hold.');
