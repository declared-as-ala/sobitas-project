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

const starved = h.chain?.first_starved_stage;
console.log('');
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
  process.exit(1);
}

console.log('No stage is starved.');
