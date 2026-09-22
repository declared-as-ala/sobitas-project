/**
 * Freeze the last-change date of every editorial category guide into a module the sitemap can read
 * at RUNTIME.
 *
 * ── THE PROBLEM THIS EXISTS FOR ────────────────────────────────────────────────────────────────
 * A category page's body text does not live in the database. `content/categories/{slug}.json` holds
 * the H1, the intro, the "comment choisir" guide and the FAQ — that is the part of the page Google
 * reads and the part the SEO programme actually rewrites. But `<lastmod>` in /sitemaps/listings.xml
 * comes from the Categ/SousCategory ROW's updated_at, and rewriting a JSON file never touches a row.
 *
 * Measured 2026-09-22: listings.xml advertised /creatine as last modified 2026-08-14 while
 * creatine.json had been rewritten on 08/09 and 09/09, and /barres-proteinees as 2026-08-10 while
 * its file was written that same morning. lastmod is the one sitemap field Google uses to schedule a
 * recrawl, so the content work was announced as "nothing changed here" for five weeks.
 *
 * ── WHY A GENERATED MODULE AND NOT AN fs.readFile AT RUNTIME ───────────────────────────────────
 * /sitemap.xml is `force-dynamic`, so it runs inside the container — and the container is assembled
 * from `.next/standalone` + `public` only (frontend/Dockerfile). Whether `content/` reaches it at
 * all depends on Next's file tracing picking up a `path.join(process.cwd(), …)` read, which is not
 * something a <lastmod> should rest on. So the dates are BUNDLED instead: a module webpack can see,
 * src/generated/categoryContentDates.ts, which is there by construction.
 *
 * ── WHY git, AND WHY NEVER mtime ───────────────────────────────────────────────────────────────
 * The committer date of the commit that last touched the file is the date the page's text really
 * changed. `fs.stat().mtime` is not: in a CI checkout every file is stamped with the checkout time,
 * and in the Docker builder with the COPY time — so an mtime fallback would tell Google that all ~50
 * category guides were rewritten on every single deploy. Google discounts a lastmod it can show is
 * unreliable, sitewide, which would spend the signal rather than merely waste it. There is therefore
 * NO mtime fallback here, and there must never be one: when git cannot answer, this script writes
 * nothing and the sitemap keeps the DB date it has always used.
 *
 * ── THE THREE ENVIRONMENTS IT RUNS IN ──────────────────────────────────────────────────────────
 *   1. A developer's clone (full history)  → regenerates the file; the diff is committed.
 *   2. The GitHub runner                   → actions/checkout is depth 1 today, i.e. SHALLOW, so
 *                                            this leaves the committed file alone. Give the checkout
 *                                            step `fetch-depth: 0` and it starts self-updating.
 *   3. The Docker builder                  → `.dockerignore` excludes `.git`, so git is unusable;
 *                                            the file copied in from the context is kept as is.
 * In (2) and (3) "leave it alone" is the whole safety property: the generated file is COMMITTED, so
 * a missing or shallow history degrades to slightly stale dates, never to wrong ones and never to a
 * missing module (which would fail `tsc --noEmit`).
 *
 * Wired into `prebuild` in package.json. It must never fail a build — a sitemap hint is not worth a
 * deploy — so every failure path warns and exits 0.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = 'content/categories';
const OUT_FILE = join(root, 'src', 'generated', 'categoryContentDates.ts');

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

/** True when git can answer "when did this file last change?" for the whole tree. */
function historyIsUsable() {
  try {
    if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') return false;
    // A shallow clone knows one commit, so every file that was not touched by it answers "never".
    return git(['rev-parse', '--is-shallow-repository']) !== 'true';
  } catch {
    return false;
  }
}

function render(dates) {
  const body = Object.keys(dates)
    .sort()
    .map((slug) => `  ${JSON.stringify(slug)}: ${JSON.stringify(dates[slug])},`)
    .join('\n');

  return `/**
 * GENERATED FILE — run \`node scripts/gen-category-content-dates.mjs\` (or any \`npm run build\`) to
 * refresh it. Do not edit by hand.
 *
 * Content-file slug (the \`{slug}.json\` under content/categories/, lowercased) → the committer date
 * of the commit that last changed that file, ISO-8601. Read by src/util/sitemapSources.ts so a
 * category's <lastmod> reflects the editorial text Google actually reads, not just the DB row.
 *
 * It is committed on purpose: the CI checkout is shallow and the Docker builder has no \`.git\`, so
 * this is the copy that ships. See the docblock in scripts/gen-category-content-dates.mjs.
 */
export const CATEGORY_CONTENT_DATES: Record<string, string> = {
${body}
};
`;
}

try {
  const dir = join(root, CONTENT_DIR);
  if (!existsSync(dir)) {
    console.warn(`[gen-category-content-dates] ${CONTENT_DIR} not found — leaving the generated file untouched`);
    process.exit(0);
  }

  if (!historyIsUsable()) {
    if (existsSync(OUT_FILE)) {
      // The expected path in CI and in the Docker builder. The committed file is the answer.
      console.log('[gen-category-content-dates] no usable git history (shallow or absent) — keeping the committed dates');
      process.exit(0);
    }
    mkdirSync(dirname(OUT_FILE), { recursive: true });
    writeFileSync(OUT_FILE, render({}), 'utf8');
    console.warn('[gen-category-content-dates] no usable git history AND no committed file — wrote an empty map; category <lastmod> falls back to the DB row');
    process.exit(0);
  }

  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.json') && !f.startsWith('.') && !f.includes('.example.')
  );

  const dates = {};
  let missing = 0;
  for (const file of files) {
    const slug = file.replace(/\.json$/, '').toLowerCase();
    let iso = '';
    try {
      iso = git(['log', '-1', '--format=%cI', '--', `${CONTENT_DIR}/${file}`]);
    } catch {
      iso = '';
    }
    // Empty means the file has never been committed (a local draft). No date is better than a wrong
    // one: the sitemap simply keeps the DB row's date for that slug.
    if (!iso) {
      missing++;
      continue;
    }
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      missing++;
      continue;
    }
    dates[slug] = parsed.toISOString();
  }

  const next = render(dates);
  const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : null;
  if (current === next) {
    console.log(`[gen-category-content-dates] OK (${Object.keys(dates).length} dated, ${missing} uncommitted — unchanged)`);
    process.exit(0);
  }

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, next, 'utf8');
  console.log(`[gen-category-content-dates] wrote ${Object.keys(dates).length} date(s), ${missing} file(s) without a commit`);
} catch (error) {
  // A sitemap freshness hint is never worth failing a deploy over.
  console.warn(`[gen-category-content-dates] skipped: ${error?.message ?? error}`);
  process.exit(0);
}
