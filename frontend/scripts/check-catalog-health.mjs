/**
 * READ THE CONTENT PIPELINE'S STATE AND NAME THE FIRST STARVED STAGE.
 *
 * The pipeline is seven stages deep and each one feeds the next:
 *
 *   discovered -> hydrated -> page_fetched -> page_prose -> gtin -> label_facts -> body_over_gate
 *                                                                                      -> indexable
 *
 * A stage reading zero starves everything after it, which is why "10,259 products are noindexed"
 * is almost never the bug — it is the last symptom in a chain whose FIRST zero is the bug. Reading
 * eight numbers and working that out by hand is what took most of 14/08; this prints the answer.
 *
 * Exits non-zero when a stage is starved, so it can run unattended after a deploy. It deliberately
 * does NOT fail on "lots of products are noindexed": that is the gate working as designed while the
 * bodies are thin, and a guard that cries about a correct state gets switched off.
 *
 *   node scripts/check-catalog-health.mjs
 *   API_BASE=http://localhost:8000 node scripts/check-catalog-health.mjs
 */
const API = (process.env.API_BASE || 'https://admin.protein.tn').replace(/\/$/, '');

const res = await fetch(`${API}/api/catalog_health`, { signal: AbortSignal.timeout(60_000) });
if (!res.ok) {
  console.log(`catalog_health -> ${res.status}. The endpoint is not deployed yet, or the API is down.`);
  process.exit(res.status === 404 ? 0 : 1);
}
const h = await res.json();

const n = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US'));
const pad = (s, w) => String(s).padEnd(w);

console.log(`\nCATALOGUE CONTENT PIPELINE   ${h.generated_at}`);
console.log(`indexability gate: ${h.min_body_words} body words\n`);

const stages = h.chain?.stages ?? {};
const names = Object.keys(stages);
let prev = null;
for (const name of names) {
  const v = stages[name];
  // The share of the PREVIOUS stage that survived into this one. That ratio is what makes a
  // starved stage obvious — an absolute count cannot, because every stage is smaller than the last.
  let carry = '';
  if (prev !== null && prev > 0 && v !== null) {
    const pctv = (v / prev) * 100;
    carry = `${pctv.toFixed(1)}% of previous`;
  }
  const flag = h.chain?.first_starved_stage === name ? '  <-- STARVED' : '';
  console.log(`  ${pad(name, 18)} ${n(v).padStart(9)}   ${pad(carry, 20)}${flag}`);
  if (v !== null) prev = v;
}

const p = h.products ?? {};
const s = h.staging ?? {};

console.log('\nSTOREFRONT');
console.log(`  published            ${n(p.published)}`);
console.log(`  indexable            ${n(p.indexable)}`);
console.log(`  noindex              ${n(p.noindex)}`);
console.log(`  nofollow             ${n(p.nofollow)}   <- never right on a product page`);
console.log(`  average body words   ${n(p.avg_body_words)}   (gate is ${h.min_body_words})`);
console.log(`  bodies over the gate ${n(p.body_over_gate)}`);
console.log(`  with FAQ             ${n(p.with_faq)}`);
console.log(`  with nutrition       ${n(p.with_nutrition)}`);
console.log(`  with official video  ${n(p.with_video)}`);
console.log(`  with GTIN            ${n(p.with_gtin)}`);
console.log(`  with schema desc     ${n(p.with_schema_description)}   <- written ONLY by promote --recompose`);

if (s.available) {
  console.log('\nACQUISITION (external_catalog_products)');
  console.log(`  rows                 ${n(s.total)}`);
  if (s.promoted) {
    /*
     * The promoted subset is the only one that can affect a page. 21,273 rows carrying an overview
     * is compatible with every published product having none, because only ~10,359 of 47,537 rows
     * are promoted at all. Read beside products.with_gtin and products.with_schema_description,
     * these three lines separate "the data is not there" from "the data is there and promotion is
     * not copying it" — two different bugs with two different fixes.
     */
    console.log(`  PROMOTED rows        ${n(s.promoted.total)}`);
    console.log(`    with prose         ${n(s.promoted.with_prose)}   <- vs products avg body words above`);
    console.log(`    with gtin          ${n(s.promoted.with_gtin)}   <- vs products with GTIN above`);
  }
  for (const [k, v] of Object.entries(s.by_status ?? {})) console.log(`    status ${pad(k, 14)} ${n(v)}`);
  for (const [k, v] of Object.entries(s.by_content_status ?? {})) console.log(`    content ${pad(k, 13)} ${n(v)}`);
  if (s.prose) {
    console.log(`  pages yielding prose ${n(s.prose.any)}`);
    console.log(`    overview           ${n(s.prose.overview)}`);
    console.log(`    suggested use      ${n(s.prose.suggested_use)}`);
    console.log(`    warnings           ${n(s.prose.warnings)}`);
  }
  console.log(`  gtin captured        ${n(s.gtin)}`);
  console.log(`  unmapped sections    ${n(s.unmapped_sections)}   <- non-zero means the source page changed shape`);
  console.log(`  last page fetch      ${s.last_content_fetch ?? '—'}`);
}

/*
 * What the scheduled passes actually decided, last time each ran.
 *
 * `--recompose` is the code that copies the manufacturer overview and the barcode from a staging
 * row onto the product. Both are missing from the storefront and present in staging, so its
 * `skipped` breakdown is the single most diagnostic thing on this page: a large `hand_edited` means
 * the pass ran and declined the rows, which is a different bug from the pass not running at all.
 */
const runs = h.runs ?? {};
if (runs.available) {
  const kinds = Object.keys(runs).filter((k) => k !== 'available');
  if (kinds.length) {
    console.log('\nLAST RUN OF EACH SCHEDULED PASS');
    for (const k of kinds) {
      const r = runs[k];
      console.log(
        `  ${pad(k, 12)} ${pad(r.status, 11)} processed ${n(r.processed).padStart(8)}` +
          `  updated ${n(r.updated).padStart(7)}  skipped ${n(r.skipped).padStart(7)}` +
          `  failed ${n(r.failed).padStart(6)}   ${r.completed_at ?? ''}`
      );
      if (r.detail) {
        const parts = Object.entries(r.detail)
          .filter(([, v]) => v !== null && v !== false && v !== 0)
          .map(([kk, v]) => `${kk}=${typeof v === 'number' ? n(v) : v}`);
        if (parts.length) console.log(`               ${parts.join('  ')}`);
      }
    }
  } else {
    console.log('\nLAST RUN OF EACH SCHEDULED PASS');
    console.log('  (no run recorded yet — the passes record themselves from the next deploy on)');
  }
}

/*
 * ── A FAILED PASS USED TO BE PRINTED AND IGNORED ────────────────────────────────────────────
 * Everything above prints. The only thing this script ever ASSERTED on was
 * `chain.first_starved_stage`, a ratio between adjacent stages. A scheduled pass whose last run
 * ended `failed` therefore appeared in the listing and changed the exit code not at all.
 *
 * On 08/09/2026 this script printed `discover  failed  processed 0 ... 2026-09-06 02:00:00` and
 * then, four lines later, `No stage is starved.` — and exited 0. `discover` is the stage that
 * ACQUIRES the prose every later stage composes from, and it had been dead for two days.
 *
 * That failure is the reason the catalogue does not grow: catalog_health reports 11,048 promoted
 * staging rows but only 4,792 `with_prose`, 4,598 products over the 250-word gate, and 6,566
 * products held at noindex. The ratio between stages looked fine precisely BECAUSE nothing new
 * was arriving — a chain that has stopped moving is perfectly balanced.
 *
 * So the ratio check cannot see this class of failure, by construction, and needs this beside it.
 */
/*
 * ── THE FAILURE THAT REPORTS SUCCESS, QUICKLY, FOREVER ──────────────────────────────────────
 * The status check below catches a pass that ends `failed`. It cannot catch the worse shape,
 * which ran for 28 days under a green board:
 *
 *   catalog:iherb:content dispatches 900 jobs every 5 minutes against fr.iherb.com. Every job
 *   returns in ~1ms at the `isPaused()` guard, before anything reaches the wire, because the
 *   circuit breaker opened on 11/08/2026 and the dispatch cadence re-opens it at every cooldown
 *   expiry (900 jobs per 5 minutes against a 10-minute drain: a backlog is always waiting to
 *   stampede the host the moment the breaker lifts).
 *
 * The scheduler printed DONE. The command printed "Dispatched 900". Every job printed DONE. This
 * script printed "No stage is starved." and exited 0. Nothing was `failed`, nothing was starved,
 * and nothing had been fetched for four weeks. See docs/catalog-content-breaker.md.
 *
 * `last_content_fetch` is the one honest signal: it is written only when a page actually comes
 * back. A pass scheduled every five minutes that has not moved it in 24 hours is dead, whatever
 * every status column says. 24h is deliberately loose — this must fire on a dead pipeline, not
 * on a slow afternoon.
 */
const lastFetch = h.staging?.last_content_fetch ? new Date(String(h.staging.last_content_fetch).replace(' ', 'T') + 'Z') : null;
const fetchAgeHours = lastFetch && !Number.isNaN(lastFetch.getTime())
  ? (Date.now() - lastFetch.getTime()) / 3_600_000
  : null;
const STALE_AFTER_HOURS = 24;

const failedRuns = runs.available
  ? Object.keys(runs)
      .filter((k) => k !== 'available')
      .filter((k) => String(runs[k]?.status ?? '').toLowerCase() === 'failed')
  : [];

const starved = h.chain?.first_starved_stage;
console.log('');

if (fetchAgeHours !== null && fetchAgeHours > STALE_AFTER_HOURS) {
  const days = Math.floor(fetchAgeHours / 24);
  console.log(
    `CONTENT PIPELINE STALE: last page fetch was ${h.staging.last_content_fetch} — ` +
      `${fetchAgeHours.toFixed(0)}h ago${days >= 1 ? ` (${days} day${days === 1 ? '' : 's'})` : ''}.`
  );
  console.log('');
  console.log('catalog:iherb:content is scheduled every five minutes, so this value should never');
  console.log('be more than minutes old. If it is hours or days old the jobs are returning without');
  console.log('fetching — almost always the PoliteFetcher circuit breaker being re-opened by the');
  console.log('next stampede as fast as its 1800s cooldown clears it.');
  console.log('');
  console.log('Do NOT just clear the breaker: the dispatch cadence re-opens it. Read');
  console.log('docs/catalog-content-breaker.md before changing anything.');
  console.log('');
  process.exitCode = 1;
}

if (failedRuns.length) {
  for (const k of failedRuns) {
    const r = runs[k];
    console.log(`FAILED PASS: ${k} — last run ended "failed" at ${r.completed_at ?? 'unknown'}`);
    if (Number(r.processed ?? 0) === 0) {
      console.log(`  It processed 0 rows, so it failed at STARTUP, before touching any data.`);
      console.log(`  Look for a credential, a network egress rule or a schema change — not a`);
      console.log(`  data bug, because it never reached the data.`);
    }
  }
  console.log('');
  console.log('A pass that is not running starves every stage after it, and the ratio check below');
  console.log('CANNOT see that: when nothing new arrives, the stages stay in proportion.');
  /*
   * `process.exitCode` rather than `process.exit()`: this script's fetch handle is still open at
   * this point, and on Windows exiting hard through it trips a libuv assertion
   * (`!(handle->flags & UV_HANDLE_CLOSING)`) that reports 127 instead of 1 — a guard that fails
   * with the wrong code is a guard whose result nobody can branch on. Setting the code and
   * letting the module end returns 1 on every platform.
   */
  process.exitCode = 1;
}

if (!failedRuns.length) {
  if (starved) {
    console.log(`FIRST STARVED STAGE: ${starved}`);
    console.log('');
    console.log('Everything after this stage is a symptom, not a bug. Fix this one and the rest');
    console.log('recover on their own schedule — the passes downstream are already running.');
    if (starved === 'page_prose') {
      console.log('');
      console.log('page_prose starved means the pages ARE being fetched and the extractor is not');
      console.log('understanding them. Check `unmapped_sections` above: a non-zero count names the');
      console.log('headings it met and could not place. A ZERO count with zero prose is worse — it');
      console.log('means the section blocks are not being found at all, so nothing was even offered');
      console.log('to the heading map. IHerbPageExtractor::sections() is the code to read.');
    }
    process.exitCode = 1;
  } else {
    console.log('No stage is starved.');
  }
}
