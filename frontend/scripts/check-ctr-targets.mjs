/**
 * EVERY CTR TARGET STILL POINTS AT A PAGE THAT EXISTS.
 *
 * ── WHAT THIS CATCHES, AND WHAT IT COST TO NOT CATCH IT ──────────────────────────────────────
 * `seo:ctr-pass` rewrites the meta title and description of the six category pages that already
 * rank on page one and take almost no clicks. It addresses them by SLUG, hard-coded in
 * SeoCtrPass::TARGETS — and a slug is a foreign key into a table an operator edits through a form.
 *
 * One of them, `gainers`, did not exist. The command therefore returned FAILURE on every run, and
 * it runs hourly. Discovered 14/08/2026, by which point it had been failing for at least three
 * days into `storage/logs/seo-ctr-pass.log` — a file inside a container whose `storage/logs` is not
 * a volume, so it needed a shell to read and did not survive a deploy.
 *
 * The five valid targets did keep updating. The cost was not the copy; it was that a real,
 * repeating error was indistinguishable from noise, so nobody looked at the one page that was
 * silently getting nothing. `serious mass tunisie` is 631 impressions at position 10.0.
 *
 * ── WHY IT READS THE PHP RATHER THAN A LIST OF ITS OWN ───────────────────────────────────────
 * A second copy of the slug list is a second thing to forget. Parsing TARGETS out of the command
 * means this guard follows the code automatically: add a target in PHP and it is checked here on
 * the next run, with nothing to keep in step.
 *
 *   node scripts/check-ctr-targets.mjs
 *   BASE_URL=https://protein.tn node scripts/check-ctr-targets.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BASE = (process.env.BASE_URL || 'https://protein.tn').replace(/\/$/, '');
const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, '../../filament/app/Console/Commands/SeoCtrPass.php');

// A human user agent. Cloudflare caches per UA-variant and middleware.ts rewrites bots to
// /x-crawler/*, so measuring with a default agent reads whichever variant happened to be cached.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

let php;
try {
  php = readFileSync(SOURCE, 'utf8');
} catch {
  console.log(`Cannot read ${SOURCE} — skipping (this guard only runs in a full checkout).`);
  process.exit(0);
}

/*
 * Slice to the TARGETS block first. The file's docblocks quote slugs in prose ("`omega-3` and
 * `whey-proteine` are rayons"), and a naive scan of the whole file would pick those up as targets.
 */
const start = php.indexOf('private const TARGETS');
const end = php.indexOf('public function handle', start);
const block = start >= 0 && end > start ? php.slice(start, end) : '';

if (!block) {
  console.log('Could not locate SeoCtrPass::TARGETS — the command was restructured.');
  process.exit(1);
}

// `'slug' => [` at the top level of the array. The fourth element, when present, is the fallback
// list the command tries before declaring a target missing; a target is healthy if ANY of them
// resolves, so they are all collected here.
const targets = [];
const entryRe = /'([a-z0-9-]+)'\s*=>\s*\[/g;
let m;
while ((m = entryRe.exec(block)) !== null) {
  const slug = m[1];
  const tail = block.slice(m.index, entryRe.lastIndex + 2000);
  const closing = tail.indexOf('\n        ],');
  const body = closing > 0 ? tail.slice(0, closing) : tail;
  const fallbackMatch = body.match(/\[\s*((?:'[a-z0-9-]+'\s*,?\s*)+)\]/);
  const fallbacks = fallbackMatch
    ? [...fallbackMatch[1].matchAll(/'([a-z0-9-]+)'/g)].map((f) => f[1])
    : [];
  targets.push({ slug, fallbacks });
}

if (targets.length === 0) {
  console.log('Parsed zero targets out of TARGETS — the guard cannot assert anything.');
  process.exit(1);
}

console.log(`CTR TARGETS — ${BASE}`);
console.log(`${targets.length} target(s) declared in SeoCtrPass::TARGETS\n`);

async function status(slug) {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(slug)}`, {
      headers: { 'user-agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
    return res.status;
  } catch {
    return 0;
  }
}

let failed = 0;
let drifting = 0;

for (const { slug, fallbacks } of targets) {
  const primary = await status(slug);

  if (primary === 200) {
    console.log(`  ok        ${slug.padEnd(22)} 200`);
    continue;
  }

  // The primary is gone. A fallback that answers means the pass still writes SOMETHING, so this is
  // drift rather than breakage — reported, but not a failure, because failing on it would make the
  // fallback mechanism pointless.
  let rescued = null;
  for (const f of fallbacks) {
    if ((await status(f)) === 200) {
      rescued = f;
      break;
    }
  }

  if (rescued) {
    drifting++;
    console.log(
      `  DRIFT     ${slug.padEnd(22)} ${primary} — resolved via fallback "${rescued}". Update TARGETS.`
    );
    continue;
  }

  failed++;
  console.log(
    `  MISSING   ${slug.padEnd(22)} ${primary || 'network error'}` +
      (fallbacks.length ? ` — and no fallback answered (${fallbacks.join(', ')})` : ' — no fallbacks declared')
  );
}

console.log('');

if (failed > 0) {
  console.log(`${failed} CTR target(s) point at a page that does not exist.`);
  console.log('');
  console.log('seo:ctr-pass returns FAILURE for each one, every hour, and the page it was meant to');
  console.log('rewrite gets nothing. Fix the slug in SeoCtrPass::TARGETS, or add the new name to');
  console.log('that target\'s fallback list.');
  process.exit(1);
}

if (drifting > 0) {
  console.log(`${drifting} target(s) resolved through a fallback — the primary slug was renamed.`);
  console.log('Not a failure: the copy still lands. Worth tidying so the primary is the real name.');
}

console.log(`All ${targets.length} CTR targets resolve.`);
