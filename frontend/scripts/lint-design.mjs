#!/usr/bin/env node
/**
 * lint:design — keep DESIGN_SYSTEM.md true.
 *
 * WHY THIS IS A SCRIPT AND NOT AN ESLINT RULE
 * `next.config.js` sets `eslint: { ignoreDuringBuilds: true }` and `npm run lint` passes
 * `--max-warnings 999`. An ESLint rule therefore cannot gate anything here, and flipping those
 * two settings surfaces hundreds of pre-existing warnings at once. A standalone script can be
 * wired to `prebuild` (which already runs check-reserved-routes.mjs) and actually block.
 *
 * WHY A BASELINE AND NOT A CLEAN RULE
 * There are ~4,700 violations today across ~85 files. A rule that fails on all of them gets
 * disabled within a day. The baseline records the current count per file per rule and enforces
 * only two things — both of which are the entire point:
 *
 *   1. A file may never EXCEED its recorded count.
 *   2. A file NOT in the baseline must have ZERO violations. New code is clean, always.
 *
 * Counts auto-lower as debt is paid, so progress is monotonic and cannot be silently undone.
 *
 * Usage:
 *   node scripts/lint-design.mjs              check (this is what CI runs)
 *   node scripts/lint-design.mjs --report     rank the worst files — the migration work queue
 *   node scripts/lint-design.mjs --report <f> itemise one file, with line numbers
 *   node scripts/lint-design.mjs --update     regenerate the baseline (review the diff in the PR)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(ROOT, 'design-baseline.json');

/**
 * Each rule cites the DESIGN_SYSTEM section it enforces, so a failure is self-explaining and
 * the fix is one lookup away rather than an argument.
 */
const RULES = [
  {
    id: 'DS001',
    re: /\b(?:bg|from|to|via)-(?:white\b|gray-\d{2,3}\b)/g,
    msg: 'hardcoded surface — use bg-canvas / bg-elevated / bg-sunken (§5, §8)',
  },
  {
    id: 'DS002',
    re: /\bdark:(?:bg|text|border|ring|from|to|via|placeholder|divide)-/g,
    msg: 'manual dark: pair — tokens are theme-aware and need none (§8)',
  },
  {
    id: 'DS003',
    re: /\btext-gray-\d{2,3}\b/g,
    msg: 'hardcoded ink — use text-ink-1 / -2 / -3 (§5, §8)',
  },
  {
    id: 'DS004',
    re: /\b(?:border|divide|ring)-gray-\d{2,3}\b/g,
    msg: 'hardcoded hairline — use border-hairline (§5, §8)',
  },
  {
    id: 'DS005',
    re: /\bshadow-\[/g,
    msg: 'arbitrary shadow — use shadow-card / shadow-card-hover (§9)',
  },
  {
    id: 'DS006',
    re: /\[#[0-9a-fA-F]{3,8}\]/g,
    msg: 'arbitrary hex — add a token in styles/tokens.css instead (§5)',
  },
  {
    id: 'DS007',
    re: /\bmax-w-7xl\b|\bmax-w-\[1400px\]/g,
    msg: 'inline page rail — use <Container> (§4, §6)',
  },
  {
    // PADDING only, not margin. The first run flagged `mb-9` in SectionHeader — which is the
    // rhythm DESIGN_SYSTEM §3 explicitly mandates for section headers. A rule that contradicts
    // the document it enforces destroys trust in both. Vertical band rhythm is expressed as
    // padding on the section; margins are component-level and out of scope here.
    //
    // Only values OFF the scale: p-1..p-6 are legitimate on small elements. These are the
    // "invented a rhythm" numbers, and py-7 is precisely what broke CategoryRail and forced
    // ProductSection to grow a compensating prop.
    id: 'DS008',
    re: /\bp[ytb]?-(?:7|9|11|13|14|17|18|19|21|22|23|26|27|28)\b/g,
    msg: 'off-scale padding — use <Section spacing=…> or the documented scale (§3)',
  },
  {
    id: 'DS009',
    re: /\bbackdrop-blur\b/g,
    msg: 'backdrop-blur is banned — one compositing layer per instance (§9, §10)',
  },
  {
    id: 'DS010',
    re: /[\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu,
    msg: 'emoji or dingbat in UI — use a lucide icon (§10)',
  },
  {
    id: 'DS011',
    re: /\b(?:bg|text|border|ring|divide|from|to)-red-\d{2,3}\b/g,
    msg: 'legacy red-* alias — prefer brand-* (§2)',
  },
];

/** Files the rules cannot meaningfully govern. */
const EXCLUDE = [
  /\/components\/ui\//,        // shadcn primitives: upstream vocabulary, updated by re-vendoring
  /\.test\.tsx?$/,
  /\.d\.ts$/,
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * Count violations, ignoring comments.
 *
 * This matters more than it sounds: DESIGN_SYSTEM-related code carries long explanatory
 * comments that quote the very class strings being banned. Counting those would make a file
 * look worse for documenting itself, which is precisely backwards.
 */
function stripComments(src) {
  return (
    src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
      // Console output is not UI. The first run flagged an arrow inside a `console.warn` for a
      // slug alias, which is a developer log line no customer will ever see — a false positive
      // that would have taught people to distrust the linter. DS010 governs rendered text.
      .replace(/console\.(?:log|warn|error|info|debug)\([\s\S]*?\);/g, '')
  );
}

function scan(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const code = stripComments(raw);
  const counts = {};
  const hits = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    const found = code.match(rule.re);
    if (found?.length) {
      counts[rule.id] = found.length;
      if (process.argv.includes('--report')) {
        raw.split('\n').forEach((line, i) => {
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
          rule.re.lastIndex = 0;
          const m = line.match(rule.re);
          if (m) hits.push({ rule: rule.id, line: i + 1, text: line.trim().slice(0, 110), n: m.length });
        });
      }
    }
  }
  return { counts, hits };
}

const files = walk(SRC)
  .filter((f) => !EXCLUDE.some((re) => re.test(f.replace(/\\/g, '/'))))
  .sort();

const current = {};
const details = {};
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const { counts, hits } = scan(f);
  if (Object.keys(counts).length) current[rel] = counts;
  if (hits.length) details[rel] = hits;
}

const args = process.argv.slice(2);

// ---- --update ---------------------------------------------------------------------------
if (args.includes('--update')) {
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  const total = Object.values(current).reduce((s, c) => s + Object.values(c).reduce((a, b) => a + b, 0), 0);
  console.log(`baseline written: ${Object.keys(current).length} files, ${total} violations`);
  process.exit(0);
}

// ---- --report ---------------------------------------------------------------------------
if (args.includes('--report')) {
  const target = args.find((a) => !a.startsWith('--'));
  if (target) {
    // Substring match, not endsWith: keys end in `.tsx`, so `--report CategoryRail` — the way
    // anyone actually types it — never matched and the tool cheerfully reported "no violations".
    // A linter that under-reports is worse than no linter.
    const needle = target.replace(/\\/g, '/');
    const matches = Object.keys(details).filter((k) => k.includes(needle));
    if (!matches.length) {
      const known = Object.keys(current).some((k) => k.includes(needle));
      console.log(known ? `no violations in ${target}` : `no file matching "${target}" (check the path)`);
      process.exit(0);
    }
    if (matches.length > 1) console.log(`${matches.length} files match "${target}":`);
    for (const key of matches) {
      console.log(`\n${key}\n`);
      for (const h of details[key]) console.log(`  ${String(h.line).padStart(5)}  ${h.rule} x${h.n}  ${h.text}`);
    }
    process.exit(0);
  }
  const ranked = Object.entries(current)
    .map(([f, c]) => [f, Object.values(c).reduce((a, b) => a + b, 0)])
    .sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((s, [, n]) => s + n, 0);
  console.log(`\n${total} violations across ${ranked.length} files — migration work queue:\n`);
  for (const [f, n] of ranked.slice(0, 25)) console.log(`  ${String(n).padStart(4)}  ${f}`);
  const byRule = {};
  for (const c of Object.values(current)) for (const [id, n] of Object.entries(c)) byRule[id] = (byRule[id] || 0) + n;
  console.log('\nby rule:');
  for (const [id, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${id}  ${String(n).padStart(5)}  ${RULES.find((r) => r.id === id).msg}`);
  }
  process.exit(0);
}

// ---- check ------------------------------------------------------------------------------
if (!fs.existsSync(BASELINE)) {
  console.error('design-baseline.json missing — run: npm run lint:design:update');
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

const regressions = [];
const newFiles = [];
const improvements = [];

for (const [file, counts] of Object.entries(current)) {
  const base = baseline[file];
  if (!base) {
    newFiles.push([file, counts]);
    continue;
  }
  for (const [id, n] of Object.entries(counts)) {
    const allowed = base[id] ?? 0;
    if (n > allowed) regressions.push({ file, id, was: allowed, now: n });
  }
}
for (const [file, base] of Object.entries(baseline)) {
  const now = current[file] || {};
  for (const [id, n] of Object.entries(base)) {
    const after = now[id] ?? 0;
    if (after < n) improvements.push({ file, id, was: n, now: after });
  }
}

if (improvements.length) {
  const fixed = improvements.reduce((s, i) => s + (i.was - i.now), 0);
  console.log(`lint:design — ${fixed} violation(s) fixed since the baseline. Lowering it.`);
  const next = { ...baseline };
  for (const [file, counts] of Object.entries(current)) next[file] = counts;
  for (const file of Object.keys(next)) if (!current[file]) delete next[file];
  fs.writeFileSync(BASELINE, JSON.stringify(next, null, 2) + '\n');
}

let failed = false;

if (newFiles.length) {
  failed = true;
  console.error('\nNEW FILES MUST BE CLEAN — these are not in the baseline and have violations:\n');
  for (const [file, counts] of newFiles) {
    console.error(`  ${file}`);
    for (const [id, n] of Object.entries(counts)) {
      console.error(`      ${id} x${n}  ${RULES.find((r) => r.id === id).msg}`);
    }
  }
}

if (regressions.length) {
  failed = true;
  console.error('\nREGRESSIONS — these files got worse:\n');
  for (const r of regressions) {
    console.error(`  ${r.file}`);
    console.error(`      ${r.id}  ${r.was} -> ${r.now}   ${RULES.find((x) => x.id === r.id).msg}`);
  }
}

if (failed) {
  console.error('\nSee frontend/DESIGN_SYSTEM.md. Run `npm run lint:design -- --report <file>` for line numbers.');
  console.error('If a violation is genuinely correct, say why in the PR and run `npm run lint:design:update`.\n');
  process.exit(1);
}

const total = Object.values(current).reduce((s, c) => s + Object.values(c).reduce((a, b) => a + b, 0), 0);
console.log(`lint:design — clean. ${total} known violations across ${Object.keys(current).length} files (baseline holding).`);
process.exit(0);
