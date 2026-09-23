/**
 * THE COMMERCIAL TAXONOMY IS A CONTRACT. THIS FAILS THE BUILD WHEN IT DRIFTS.
 *
 * `src/config/catalogTaxonomy.ts` declares one tree — six rayons, fifty-six slugs — and the header,
 * the rayon pages, the breadcrumbs and the crawler views all draw their links from it. That makes it
 * the most load-bearing config on the site for internal linking, and the easiest one to break
 * silently: a back-office rename, a new shelf, a copy-pasted node, or a well-meant `nav: false` on a
 * page that is quietly earning clicks. None of those break a page. All of them break the link graph,
 * and a broken link graph surfaces months later as a category that will not rank.
 *
 * ── WHY EACH RULE EXISTS ─────────────────────────────────────────────────────────────────────────
 *
 *   T1  Every slug in the config is a LIVE slug.
 *       A slug that is not live is a 404 rendered in the global header on every page of the site.
 *       The tree is hand-written and the catalogue is not: the back office renamed `mass-gainer` to
 *       `mass-gainers` once already, and the only reason that did not ship as a dead nav link is
 *       that someone happened to notice.
 *
 *   T2  Every LIVE slug is in the config.
 *       This is the defect the whole pass exists to correct, in its future tense. A shelf that
 *       exists in the API and not in the tree is a URL that is sitemapped, crawlable, and linked
 *       from nowhere — which is how 37 of 56 category URLs came to be reachable only after landing
 *       on a rayon page (measured 23/09/2026, Googlebot UA, production).
 *
 *   T3  No slug appears twice in the tree.
 *       This one cannot be seen any other way. `catalogTaxonomy.ts` indexes the tree into a Map
 *       keyed by slug, so a duplicated node silently keeps only its LAST occurrence: `taxonomySlugs`
 *       still looks right, `taxonomyParent()` quietly answers with the wrong parent, and the
 *       breadcrumb on that page states a relationship the nav does not. The walk below reads the
 *       RAW tree, not the index, precisely so the duplicate is visible.
 *
 *   T4  A slug that earns traffic is never out of the global nav.
 *       `nav: false` is for a shelf where nothing is buyable. It is not a demotion tool. Rule 4 of
 *       `commercialSeoMap.ts` says a page that earns clicks is never 301'd or noindexed to tidy the
 *       site up; dropping it from the header that renders on every page is the same decision
 *       wearing a different hat, and `protectedByTraffic` is the same list that rule reads.
 *       Inherited hiding counts: a group marked `nav: false` takes its children with it, so this
 *       asks `inGlobalNav()` — the effective answer — rather than reading the flag on the node.
 *
 *   T5  Every rayon has at least one nav-visible child.
 *       A rayon that renders as a header entry with an empty panel is worse than no rayon: it costs
 *       a slot and states nothing. If every shelf under a rayon is unbuyable, the rayon is the thing
 *       to reconsider, not the children.
 *
 * ── FAILS OPEN ON THE NETWORK, NEVER ON THE FILE ─────────────────────────────────────────────────
 * T1 and T2 need the live catalogue. Same contract as `src/util/taxonomySlugs.ts`: a timeout, a 5xx,
 * unparseable JSON or a response that parsed to nothing is "I do not know" — printed as a warning,
 * exit 0. A backend hiccup must never fail a deploy, and unknown is not evidence of absence.
 *
 * A partial answer is handled the same way, for T1 only: if the API reports more than one page we
 * have seen SOME live slugs but cannot prove a config slug is absent from the rest, so T1 is skipped
 * and T2 still runs — every slug that was read is genuinely live.
 *
 * T3, T4 and T5 read only files. They run, and they fail, whatever the network did.
 *
 * Run:  node --experimental-strip-types --no-warnings scripts/check-taxonomy.mjs
 *       (importing a .ts specifier needs Node 22.6+; package.json pins engines.node >= 22.6 and
 *        .nvmrc / the Dockerfile / the deploy workflow are on Node 24 — see check-sitemap-crawl.mjs,
 *        which documents what happens when one of those three pins moves alone.)
 * Exit: 0 = the tree matches the catalogue and is navigable. 1 = one of the five rules is broken.
 */
import { catalogTaxonomy, inGlobalNav, taxonomySlugs } from '../src/config/catalogTaxonomy.ts';
import { protectedByTraffic } from '../src/config/commercialSeoMap.ts';

const failures = [];
const warnings = [];
const fail = (rule, msg) => failures.push({ rule, msg });
const warn = (msg) => warnings.push(msg);

/* ── the declared tree, read RAW so duplicates survive ───────────────────────────────────────── */

/**
 * Flatten the tree in reading order. Deliberately NOT `taxonomySlugs`: that is derived from the Map
 * index inside catalogTaxonomy.ts, which de-duplicates, which is the one thing T3 has to see.
 */
function walk(nodes, ancestors = []) {
  const out = [];
  for (const node of nodes) {
    out.push({
      slug: node.slug,
      node,
      ancestors,
      path: [...ancestors.map((a) => a.slug), node.slug].join(' / '),
    });
    if (Array.isArray(node.children)) out.push(...walk(node.children, [...ancestors, node]));
  }
  return out;
}

const declared = walk(catalogTaxonomy);
const declaredSlugs = new Set(declared.map((entry) => entry.slug));

/* ── T3: no slug twice ──────────────────────────────────────────────────────────────────────── */

const firstSeenAt = new Map();
for (const entry of declared) {
  const prior = firstSeenAt.get(entry.slug);
  if (prior) {
    fail(
      'T3',
      `slug "${entry.slug}" is declared twice: "${prior}" and "${entry.path}".\n` +
        `      The index in catalogTaxonomy.ts is a Map keyed by slug, so only the LAST occurrence\n` +
        `      survives: taxonomyParent(), taxonomyAncestors() and every breadcrumb built on them\n` +
        `      state the second parent while the nav renders the first. One slug, one place.`
    );
  } else {
    firstSeenAt.set(entry.slug, entry.path);
  }
}

/* ── T1 / T2: the config against the live catalogue ─────────────────────────────────────────── */

function apiBase() {
  return (
    process.env.API_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace('/api-proxy', '') ||
    'https://admin.protein.tn/api'
  );
}

/**
 * Live slugs = the category slugs plus `sous_categories[].slug`.
 *
 * LOWERCASED AT THE DOOR. `sous_categories` id 43 is stored as `Intra-Workout` — the one mixed-case
 * slug in the whole taxonomy, and the cause of a real two-hop redirect chain in middleware. The
 * config spells it `intra-workout`, which is what the URL actually is, so folding here is what stops
 * T1 and T2 from both firing on the same correct node.
 */
async function fetchLiveSlugs() {
  const url = `${apiBase()}/categories?per_page=200`;

  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { accept: 'application/json' },
    });
  } catch (err) {
    return { ok: false, reason: `${url} did not answer (${err?.message ?? String(err)})` };
  }
  if (!res.ok) return { ok: false, reason: `${url} answered HTTP ${res.status}` };

  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: `${url} answered 200 but the body was not JSON` };
  }

  const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : null;
  if (!rows) return { ok: false, reason: `${url} returned neither an array nor a { data: [...] }` };

  const slugs = new Map();
  const collect = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const slug = typeof node.slug === 'string' ? node.slug.trim().toLowerCase() : '';
      if (slug) slugs.set(slug, node.designation_fr || node.name || slug);
      collect(node.sous_categories);
    }
  };
  collect(rows);

  // Parsed, but empty. That is a backend problem and not a catalogue of zero categories — reading it
  // as fact would fail the build on all fifty-six slugs at once.
  if (slugs.size === 0) return { ok: false, reason: `${url} parsed but contained no slugs` };

  const lastPage = Number(body?.meta?.last_page ?? 1);
  return { ok: true, url, slugs, complete: Number.isFinite(lastPage) ? lastPage <= 1 : false };
}

const live = await fetchLiveSlugs();

if (!live.ok) {
  warn(
    `T1/T2 SKIPPED — ${live.reason}.\n` +
      `      Failing open on purpose: a backend hiccup must not fail a deploy. T3, T4 and T5 ran.`
  );
} else {
  for (const [slug, label] of live.slugs) {
    if (!declaredSlugs.has(slug)) {
      fail(
        'T2',
        `live slug "${slug}" (${label}) is not in catalogTaxonomy.ts.\n` +
          `      /${slug} is a real URL and it is in the sitemap, but nothing links to it: not the\n` +
          `      header, not a rayon page, not a breadcrumb. Add it under the rayon it belongs to —\n` +
          `      with nav:false and a note if nothing on that shelf is buyable yet.`
      );
    }
  }

  if (!live.complete) {
    warn(
      `T1 SKIPPED — ${live.url} reported more than one page, so the live set read here is partial.\n` +
        `      A partial set cannot prove a config slug is gone. T2 still ran: every slug read IS live.`
    );
  } else {
    for (const entry of declared) {
      if (!live.slugs.has(entry.slug)) {
        fail(
          'T1',
          `"${entry.slug}" (${entry.path}) is in catalogTaxonomy.ts but not in the live catalogue.\n` +
            `      /${entry.slug} is therefore a 404 rendered in the global header on every page of the\n` +
            `      site. Either the back office renamed it — point this node at the new slug and add a\n` +
            `      Redirections row for the old URL — or the shelf is gone and the node must go too.`
        );
      }
    }
  }
}

/* ── T4: earning traffic and hidden from the nav ────────────────────────────────────────────── */

for (const entry of declared) {
  const why = protectedByTraffic[`/${entry.slug}`];
  if (!why || inGlobalNav(entry.slug)) continue;

  const hiddenBy =
    entry.node.nav === false
      ? 'marked nav:false itself'
      : `hidden by its ancestor "${entry.ancestors.find((a) => a.nav === false)?.slug}", which is ` +
        'marked nav:false and takes its children with it';

  fail(
    'T4',
    `/${entry.slug} is out of the global nav (${hiddenBy}) but is protectedByTraffic:\n` +
      `      "${why}"\n` +
      `      Rule 4 of commercialSeoMap.ts: a page that earns clicks is never 301'd or noindexed to\n` +
      `      tidy the site up. Removing it from the header that renders on every page of the site is\n` +
      `      the same decision by another name. Either restore it to the nav, or delete it from\n` +
      `      protectedByTraffic with the measurement that shows the traffic is actually gone.`
  );
}

/* ── T5: every rayon has something to show ──────────────────────────────────────────────────── */

for (const rayon of catalogTaxonomy) {
  if (!inGlobalNav(rayon.slug)) {
    fail(
      'T5',
      `rayon "${rayon.slug}" is itself out of the global nav. A rayon is a top-level header entry:\n` +
        `      hiding one hides every shelf under it, and no other surface links a whole branch.`
    );
    continue;
  }
  const visible = (rayon.children ?? []).filter((child) => inGlobalNav(child.slug));
  if (visible.length === 0) {
    fail(
      'T5',
      `rayon "${rayon.slug}" has no nav-visible child, so it renders as a header entry with an empty\n` +
        `      panel. If every shelf under it is unbuyable, the rayon is what needs reconsidering —\n` +
        `      not one more nav:false.`
    );
  }
}

/* ── report ─────────────────────────────────────────────────────────────────────────────────── */

for (const message of warnings) console.warn(`  ! ${message}`);

/*
 * `process.exitCode`, not `process.exit()`.
 *
 * This script is the only prebuild guard that makes an HTTP call, and on Windows calling
 * process.exit() while undici still holds the keep-alive socket aborts the process with
 * `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c` and exit code 127.
 * A guard that reports a PASS and then hands the build a 127 is worse than no guard. Setting the
 * code and letting the loop drain exits in ~0.4s with the right status on every platform.
 */
if (failures.length === 0) {
  const navCount = declared.filter((entry) => inGlobalNav(entry.slug)).length;
  console.log(
    `✓ Taxonomy: ${taxonomySlugs.length} slugs across ${catalogTaxonomy.length} rayons, ` +
      `${navCount} in the global nav, ` +
      `${live.ok ? `matched against ${live.slugs.size} live slugs` : 'live catalogue not read'}, ` +
      `no duplicate slug, nothing that earns traffic is hidden.`
  );
  process.exitCode = 0;
} else {
  console.error(`\n✗ Taxonomy: ${failures.length} violation${failures.length > 1 ? 's' : ''}\n`);
  for (const f of failures) console.error(`  [${f.rule}] ${f.msg}\n`);
  console.error(
    `  The tree lives in src/config/catalogTaxonomy.ts and the reasoning for every node is written up\n` +
      `  in docs/commercial-taxonomy.md. Nothing in that file may change a URL — a slug IS the URL, and\n` +
      `  this whole pass is a no-URL-change refactor. Read the "why" on a rule before relaxing it.\n`
  );
  process.exitCode = 1;
}
