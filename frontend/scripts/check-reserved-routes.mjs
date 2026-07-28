/**
 * Fail the build when `isReservedRouteSlug` drifts away from the real route tree.
 *
 * WHY THIS EXISTS
 * Middleware rewrites crawler user-agents for single-segment paths:
 *     /{slug}  ->  /x-crawler/category/{slug}
 * unless `isReservedRouteSlug(slug)` says the path is a real app route. That list is
 * hand-maintained, so adding a top-level route without touching it is silent — until you check
 * with a Googlebot UA. It happened with /pack-builder: humans got 200, Googlebot got 404 +
 * noindex, because the crawler view resolves category -> brand -> CMS page and pack-builder is
 * none of those. Nothing in CI noticed, because every check ran with a default user-agent.
 *
 * A missing entry is an SEO outage that is invisible to normal browsing, so it is worth a build
 * failure rather than a warning.
 *
 * Run: node scripts/check-reserved-routes.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'src', 'app');

/** Top-level URL segments that actually resolve to a page, ignoring (route groups). */
function topLevelRouteSegments(dir, insideGroup = false) {
  const found = new Set();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const full = join(dir, name);

    // (group) folders do not appear in the URL — recurse and treat children as top-level.
    if (name.startsWith('(') && name.endsWith(')')) {
      for (const s of topLevelRouteSegments(full, true)) found.add(s);
      continue;
    }
    // Dynamic segments and private folders are not fixed route names.
    if (name.startsWith('[') || name.startsWith('_') || name.startsWith('@')) continue;
    // Route handlers under api/ are excluded from the middleware matcher entirely.
    if (name === 'api' || name === 'x-crawler') continue;

    const hasPage = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].some((f) => {
      try { return statSync(join(full, f)).isFile(); } catch { return false; }
    });
    if (hasPage) found.add(name);
    // A segment can hold only nested pages (e.g. /foo/[id]) and still own the /foo namespace,
    // but only a real page at the top level can collide with the /{slug} listing route.
  }
  return found;
}

const src = readFileSync(join(root, 'src', 'util', 'productUrl.ts'), 'utf8');
const block = src.match(/const reservedSlugs = \[([\s\S]*?)\];/);
if (!block) {
  console.error('check-reserved-routes: could not find reservedSlugs in src/util/productUrl.ts');
  process.exit(1);
}
const reserved = new Set([...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
const actual = topLevelRouteSegments(appDir);

const missing = [...actual].filter((s) => !reserved.has(s)).sort();

if (missing.length) {
  console.error('\ncheck-reserved-routes: FAIL\n');
  console.error('These top-level routes return 200 to a browser but would be rewritten to the');
  console.error('crawler category view — which cannot resolve them — and serve Googlebot a 404:\n');
  for (const m of missing) console.error(`   /${m}`);
  console.error('\nAdd them to reservedSlugs in src/util/productUrl.ts.\n');
  process.exit(1);
}

console.log(`check-reserved-routes: OK (${actual.size} routes, all reserved)`);
