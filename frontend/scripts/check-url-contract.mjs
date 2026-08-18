/**
 * STATIC half of the URL contract. No network. Runs in `prebuild`, so a violation fails the BUILD.
 *
 * Three rules, each of which was a real, shipped, invisible defect before it was a rule:
 *
 *   C1  Every dynamic route in src/app is registered in scripts/urlContract.mjs.
 *       A new route family currently ships with NO stated answer for input it cannot serve, and
 *       the default in Next is whatever the route's try/catch happens to do — which produced five
 *       separate unbounded HTTP-200 "not found" spaces on this site.
 *
 *   C2  Every `catch` inside `generateMetadata` either RETHROWS or returns BOTH `robots` and a
 *       canonical. A catch that returns neither hands the layout defaults to a page that failed
 *       to load: `index, follow` with no rel=canonical. Measured on /blog/tag/* and
 *       /blog/category/*, where two fetches of the SAME url returned different robots values,
 *       because one hit the success path and one hit the catch.
 *
 *   C3  Machine prefixes are robots.txt-disallowed. A JSON endpoint that is crawlable is index
 *       bloat at best; /api-proxy/** answered 200 with no X-Robots-Tag while robots.txt disallowed
 *       only /api/.
 *
 * Run: node scripts/check-url-contract.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROUTE_CONTRACT, MACHINE_PREFIXES } from './urlContract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'src', 'app');

const failures = [];
const fail = (rule, msg) => failures.push({ rule, msg });

/* ── C1: every dynamic route is registered ──────────────────────────────────────────────────── */

/**
 * Every directory under src/app that serves a URL, as a route path with groups preserved.
 *
 * route.ts counts, not just page.tsx: /sitemaps/{file}.xml is a route handler and it is as
 * crawlable as any page — its contract (unknown name → 404, never an empty 200 <urlset>) is
 * exactly the kind this registry exists to pin down.
 *
 * `api/` is excluded. Those are POST/webhook endpoints behind a robots.txt Disallow, they have no
 * indexability contract to state, and registering forty of them would bury the ones that matter.
 */
function findPageRoutes(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const route = relative(appDir, full).split(sep).join('/');
    if (route === 'api' || route.startsWith('api/')) continue;
    if (readdirSync(full).some((f) => /^(page|route)\.tsx?$/.test(f))) acc.push(route);
    findPageRoutes(full, acc);
  }
  return acc;
}

const allRoutes = findPageRoutes(appDir).sort();
const dynamicRoutes = allRoutes.filter((r) => r.includes('['));
const registered = new Set(ROUTE_CONTRACT.map((c) => c.route));

for (const route of dynamicRoutes) {
  if (!registered.has(route)) {
    fail(
      'C1',
      `dynamic route "${route}" is not in ROUTE_CONTRACT.\n` +
        `      Add an entry to scripts/urlContract.mjs stating what this route answers for a\n` +
        `      dynamic segment that does not exist. If the answer is HTTP 200, it is wrong: that\n` +
        `      mints an unbounded family of near-duplicate pages Google will crawl forever.`
    );
  }
}
for (const route of registered) {
  if (!dynamicRoutes.includes(route)) {
    fail('C1', `ROUTE_CONTRACT has a stale entry "${route}" — no such route under src/app.`);
  }
}

/* ── C2: metadata catch blocks may not silently drop robots / canonical ─────────────────────── */

/** Slice out each `generateMetadata` body by brace depth. Cheap, and good enough for this shape. */
function metadataBodies(source) {
  const out = [];
  const re = /export\s+(?:async\s+)?function\s+generateMetadata\b/g;
  let m;
  while ((m = re.exec(source))) {
    let i = source.indexOf('{', m.index);
    if (i < 0) continue;
    let depth = 0;
    for (let j = i; j < source.length; j++) {
      if (source[j] === '{') depth++;
      else if (source[j] === '}') {
        depth--;
        if (depth === 0) {
          out.push(source.slice(i, j + 1));
          break;
        }
      }
    }
  }
  return out;
}

/** Each `catch (…) { … }` body inside a chunk of source. */
function catchBodies(source) {
  const out = [];
  const re = /catch\s*(?:\([^)]*\))?\s*\{/g;
  let m;
  while ((m = re.exec(source))) {
    const start = source.indexOf('{', m.index);
    let depth = 0;
    for (let j = start; j < source.length; j++) {
      if (source[j] === '{') depth++;
      else if (source[j] === '}') {
        depth--;
        if (depth === 0) {
          out.push(source.slice(start, j + 1));
          break;
        }
      }
    }
  }
  return out;
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkFiles(full, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

for (const file of walkFiles(appDir)) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes('generateMetadata')) continue;
  const rel = relative(root, file).split(sep).join('/');

  for (const body of metadataBodies(src)) {
    for (const cb of catchBodies(body)) {
      // A catch that rethrows has made the only correct choice for a transient failure: an
      // uncached 5xx the crawler retries, rather than a cacheable wrong answer.
      const rethrows = /\bthrow\b/.test(cb);
      // notFound()/permanentRedirect() also END the request rather than returning metadata.
      const terminates = /\b(notFound|permanentRedirect|redirect)\s*\(/.test(cb);
      if (rethrows || terminates) continue;

      const hasRobots = /\brobots\b/.test(cb);
      // `index: false` (or a bare noindex) makes the canonical moot — a page Google is told not to
      // index has no duplicate cluster to nominate a representative for. Only an INDEXABLE
      // fallback owes a canonical.
      const isNoindex = /index\s*:\s*false|['"]noindex/.test(cb);
      const hasCanonical = /\b(canonical|alternates)\b/.test(cb);

      if (!hasRobots) {
        fail(
          'C2',
          `${rel}: a catch inside generateMetadata returns metadata with no \`robots\`.\n` +
            `      The layout default then applies — "index, follow" — so a transient backend failure\n` +
            `      silently changes the page's indexability. Measured on /blog/tag/* and\n` +
            `      /blog/category/*: two fetches of the SAME url returned different robots values.\n` +
            `      Either return an explicit \`robots\`, or rethrow so Next serves an uncached 5xx.`
        );
      } else if (!isNoindex && !hasCanonical) {
        fail(
          'C2',
          `${rel}: a catch inside generateMetadata returns INDEXABLE metadata with no canonical.\n` +
            `      An indexable page with no rel=canonical is a duplicate with no nominated\n` +
            `      representative — the "Duplicate without user-selected canonical" bucket exactly.\n` +
            `      Either add alternates.canonical, make the fallback noindex, or rethrow.`
        );
      }
    }
  }
}

/* ── C3: machine prefixes are disallowed in robots.txt ──────────────────────────────────────── */

const robotsSrc = readFileSync(join(appDir, 'robots.ts'), 'utf8');
for (const prefix of MACHINE_PREFIXES) {
  // The disallow list is written as string literals; match the prefix with or without its slash.
  const bare = prefix.replace(/\/$/, '');
  const present =
    robotsSrc.includes(`'${prefix}'`) ||
    robotsSrc.includes(`'${bare}'`) ||
    robotsSrc.includes(`"${prefix}"`) ||
    robotsSrc.includes(`"${bare}"`);
  if (!present) {
    fail(
      'C3',
      `robots.ts does not Disallow "${prefix}". Machine endpoints must be both disallowed AND\n` +
        `      served with X-Robots-Tag: noindex — robots.txt alone cannot remove a URL that is\n` +
        `      already indexed from a link, which is the "Indexed, though blocked by robots.txt" bucket.`
    );
  }
}

/* ── report ─────────────────────────────────────────────────────────────────────────────────── */

const counts = { routes: allRoutes.length, dynamic: dynamicRoutes.length, registered: registered.size };
if (failures.length === 0) {
  console.log(
    `✓ URL contract: ${counts.dynamic} dynamic routes registered, ` +
      `metadata catches declare robots+canonical, machine prefixes disallowed.`
  );
  process.exit(0);
}

console.error(`\n✗ URL contract: ${failures.length} violation${failures.length > 1 ? 's' : ''}\n`);
for (const f of failures) console.error(`  [${f.rule}] ${f.msg}\n`);
console.error(
  `  The rules live in scripts/urlContract.mjs. They exist because each one was a shipped defect\n` +
    `  that no other check could see. Read the "why" on the route before relaxing one.\n`
);
process.exit(1);
