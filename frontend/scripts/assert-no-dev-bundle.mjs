/**
 * Fail the build if Next.js's development-only code has leaked into the production client bundle.
 *
 * WHY THIS EXISTS
 * next@15.5.9 shipped `next/dist/compiled/next-devtools` — the dev error overlay, its syntax
 * highlighter and a vendored zod — into the production bundle: 820 kB, listed in rootMainFiles,
 * so downloaded, parsed and compiled on all 74 routes and never executed. Alongside it went the
 * webpack-hmr client, which opens a WebSocket that can never connect on a production server.
 *
 * The trigger was .browserslistrc. Targets newer than SWC's bundled compat data made SWC apply
 * async-to-generator, which lifts a require() out of the `process.env.NODE_ENV !== 'production'`
 * branch that guards it; webpack can then no longer prove the call dead. Upstream:
 * vercel/next.js#89844, still open — the fix (PR #89244) is unmerged, so a Next upgrade will not
 * save us and could just as easily reintroduce it.
 *
 * That is the point of this file. The bug is SILENT: nothing errors, nothing warns, the site works
 * perfectly, and mobile just quietly gets half a megabyte heavier. It went unnoticed here across
 * many deploys. A regression — a Next bump, someone "helpfully" restoring `last 2 versions`, or
 * running update-browserslist-db — must break the build loudly rather than cost another quarter of
 * mobile performance.
 *
 * Deliberately fingerprints STRINGS rather than chunk filenames: the hashed chunk name is not
 * stable across builds or projects, but this dev-only copy is.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CHUNKS = join(process.cwd(), '.next', 'static', 'chunks');

/** Strings that exist only in dev-only Next.js code. Each is independently damning. */
const FORBIDDEN = [
  ['nextjs-container-errors', 'dev error-overlay markup/CSS'],
  ['__nextjs_original-stack-frame', 'dev stack-frame symbolication endpoint'],
  ['Failed to compile', 'dev build-error overlay copy'],
  ['/_next/webpack-hmr', 'dev hot-reload websocket client'],
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (entry.endsWith('.js')) out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(CHUNKS);
} catch {
  // No build output — nothing to assert against. Don't fail a non-build invocation.
  console.log('assert-no-dev-bundle: no .next/static/chunks, skipping.');
  process.exit(0);
}

const hits = [];
let totalBytes = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  totalBytes += Buffer.byteLength(text);
  for (const [needle, what] of FORBIDDEN) {
    if (text.includes(needle)) hits.push({ file: f.slice(CHUNKS.length + 1), needle, what, kb: Buffer.byteLength(text) / 1024 });
  }
}

console.log(`assert-no-dev-bundle: scanned ${files.length} chunks, ${(totalBytes / 1024).toFixed(0)} kB total.`);

if (hits.length === 0) {
  console.log('assert-no-dev-bundle: clean — no dev-only code in the production bundle.');
  process.exit(0);
}

console.error('\n  BUILD FAILED — development-only Next.js code is in the production bundle.\n');
for (const h of hits) {
  console.error(`  ${h.file}  (${h.kb.toFixed(0)} kB)`);
  console.error(`    contains "${h.needle}" — ${h.what}`);
}
console.error(`
  This is vercel/next.js#89844. It is almost always .browserslistrc: targets newer than the
  compat data inside this Next version's SWC trigger the async-to-generator transform that
  defeats webpack's dead-code elimination.

  Check first:  npx browserslist          (the LOWEST version listed is what matters)
  Expected:     chrome 64 / safari 12 era floor, per frontend/.browserslistrc

  If browserslist is already correct, the Next version has moved the dev modules and the
  upstream bug has resurfaced. The fallback is the NormalModuleReplacementPlugin from
  vercel/next.js#89244 — see the note in .browserslistrc before reaching for it.

  Do NOT silence this check. It is guarding ~820 kB on every route.
`);
process.exit(1);
