/**
 * Mobile Lighthouse, run properly: N runs, MEDIAN reported, same Chrome every time.
 *
 * ── WHY A SCRIPT AND NOT "JUST RUN PAGESPEED" ─────────────────────────────────────────────
 * A single Lighthouse run on a throttled mobile profile is NOISE. Measured on this project's own
 * build machine, five consecutive runs against a byte-identical build scored:
 *
 *     77 · 81 · 85 · 84 · 80        and TBT moved 155ms → 316ms between run sets
 *
 * That is an 8-point spread with nothing changed, because TBT depends on how the OS happened to
 * schedule the main thread. Two consequences, and ignoring either one produces false results:
 *
 *   1. NEVER compare single runs. Median of 5 minimum; the median is reported, and the raw runs
 *      are printed so the spread is visible rather than hidden behind one number.
 *   2. A CHANGE SMALLER THAN THE SPREAD CANNOT BE PROVEN HERE. Do not claim a 3-point
 *      improvement from this tool. For work whose whole point is "make it smaller", verify with
 *      the DETERMINISTIC counters instead — document bytes, DOM element count, request count,
 *      transferred JS — which are identical on every run and cannot be flattered by a quiet CPU.
 *      Lighthouse is for direction and for catching regressions, not for scoring a diff.
 *
 * Close everything else first — a dev server on another port competes for the same cores and is
 * worth several points on its own.
 *
 * It also prints the diagnostics that actually name the work — the byte weights, the long tasks,
 * the LCP sub-phases — because a score alone tells you nothing about what to do next.
 *
 *   node scripts/perf.mjs --url http://localhost:3000/ --runs 3
 *   node scripts/perf.mjs --url https://protein.tn/ --runs 3 --label live
 *   node scripts/perf.mjs --url http://localhost:3000/ --preset desktop
 *
 * Results are appended to .perf/history.jsonl so a claim of "we improved X" can be checked
 * against what was actually measured, not against memory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
const one = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const URL_UNDER_TEST = one('url', 'http://localhost:3000/');
const RUNS = Number(one('runs', '3'));
const PRESET = one('preset', 'mobile');
const LABEL = one('label', PRESET);
const OUT = path.resolve(ROOT, '.perf');

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
]
  .filter(Boolean)
  .find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

/**
 * Lighthouse's own mobile emulation: Moto G Power class device, 4x CPU slowdown, and the
 * "slow 4G" RTT/throughput pair PageSpeed Insights uses. Kept as the DEFAULT deliberately — the
 * owner's complaint and the client's complaint are both about phones, and an unthrottled run on
 * a desktop CPU is the single easiest way to prove a performance problem does not exist when it
 * very much does.
 */
const MOBILE = {
  formFactor: 'mobile',
  screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675 },
};
const DESKTOP = {
  formFactor: 'desktop',
  screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
  throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
};

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const ms = (n) => (n == null ? '—' : `${Math.round(n)} ms`);
const kb = (n) => (n == null ? '—' : `${Math.round(n / 1024)} kB`);

const browser = await puppeteer.launch({
  headless: 'new',
  ...(CHROME ? { executablePath: CHROME } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0'],
});
const port = Number(new URL(browser.wsEndpoint()).port);

const runs = [];
for (let i = 0; i < RUNS; i++) {
  const result = await lighthouse(
    URL_UNDER_TEST,
    { port, output: 'json', logLevel: 'error' },
    {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance'],
        ...(PRESET === 'desktop' ? DESKTOP : MOBILE),
      },
    }
  );
  runs.push(result.lhr);
  process.stdout.write(`  run ${i + 1}/${RUNS}: ${Math.round(result.lhr.categories.performance.score * 100)}\n`);
}

await browser.close();

const a = (lhr, id) => lhr.audits[id];
const num = (id) => median(runs.map((r) => a(r, id)?.numericValue).filter((v) => v != null));

const score = median(runs.map((r) => Math.round(r.categories.performance.score * 100)));
// The median run, so the diagnostics printed below belong to ONE coherent trace rather than being
// a mix of the best and worst runs.
const mid = runs.find((r) => Math.round(r.categories.performance.score * 100) === score) ?? runs[0];

const metrics = {
  score,
  fcp: num('first-contentful-paint'),
  lcp: num('largest-contentful-paint'),
  tbt: num('total-blocking-time'),
  cls: median(runs.map((r) => a(r, 'cumulative-layout-shift')?.numericValue ?? 0)),
  si: num('speed-index'),
  tti: num('interactive'),
  ttfb: num('server-response-time'),
};

console.log(`\n══ ${LABEL} · ${URL_UNDER_TEST} · median of ${RUNS} ══\n`);
console.log(`  PERFORMANCE   ${score}/100`);
console.log(`  LCP           ${ms(metrics.lcp)}     ${metrics.lcp <= 2500 ? 'good' : metrics.lcp <= 4000 ? 'needs work' : 'POOR'}`);
console.log(`  TBT           ${ms(metrics.tbt)}     ${metrics.tbt <= 200 ? 'good' : metrics.tbt <= 600 ? 'needs work' : 'POOR'}   (lab proxy for INP)`);
console.log(`  CLS           ${metrics.cls.toFixed(3)}      ${metrics.cls <= 0.1 ? 'good' : 'POOR'}`);
console.log(`  FCP           ${ms(metrics.fcp)}`);
console.log(`  Speed Index   ${ms(metrics.si)}`);
console.log(`  TTFB          ${ms(metrics.ttfb)}`);

// ── What is actually costing the score ────────────────────────────────────────────────────────
const lcpEl = a(mid, 'largest-contentful-paint-element');
const lcpNode = lcpEl?.details?.items?.[0]?.items?.[0]?.node;
if (lcpNode) console.log(`\n  LCP element   ${lcpNode.nodeLabel?.slice(0, 70) ?? lcpNode.selector}`);

const phases = a(mid, 'lcp-lazy-loaded') ?? null;
const insight = mid.audits['lcp-phases'] ?? null;
if (insight?.details?.items?.length) {
  console.log('  LCP phases    ' + insight.details.items.map((i) => `${i.phase} ${Math.round(i.timing)}ms`).join(' · '));
}

const OPPS = [
  'render-blocking-resources',
  'unused-javascript',
  'unused-css-rules',
  'unminified-javascript',
  'modern-image-formats',
  'uses-responsive-images',
  'efficient-animated-content',
  'legacy-javascript',
  'duplicated-javascript',
  'uses-text-compression',
  'uses-long-cache-ttl',
  'total-byte-weight',
  'third-party-summary',
  'bootup-time',
  'mainthread-work-breakdown',
  'dom-size',
  'prioritize-lcp-image',
  'uses-rel-preconnect',
];
console.log('\n  ── where the time goes ───────────────────────────────────────────');
for (const id of OPPS) {
  const audit = a(mid, id);
  if (!audit || audit.score === 1 || audit.scoreDisplayMode === 'notApplicable') continue;
  const saving = audit.details?.overallSavingsMs;
  const bytes = audit.details?.overallSavingsBytes;
  const bits = [];
  if (saving) bits.push(`${Math.round(saving)}ms`);
  if (bytes) bits.push(kb(bytes));
  if (!bits.length && audit.displayValue) bits.push(audit.displayValue);
  console.log(`  ${id.padEnd(32)} ${bits.join('  ')}`);
}

// The five heaviest scripts, by transfer size — the actual work list for a JS problem.
const network = a(mid, 'network-requests')?.details?.items ?? [];
const scripts = network
  .filter((r) => r.resourceType === 'Script')
  .sort((x, y) => (y.transferSize ?? 0) - (x.transferSize ?? 0))
  .slice(0, 8);
if (scripts.length) {
  console.log('\n  ── heaviest scripts ──────────────────────────────────────────────');
  let total = 0;
  for (const r of network.filter((n) => n.resourceType === 'Script')) total += r.transferSize ?? 0;
  console.log(`  ${String(network.filter((n) => n.resourceType === 'Script').length).padStart(3)} scripts, ${kb(total)} transferred`);
  for (const r of scripts) {
    console.log(`  ${kb(r.transferSize).padStart(8)}  ${r.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 72)}`);
  }
}

fs.mkdirSync(OUT, { recursive: true });
fs.appendFileSync(
  path.join(OUT, 'history.jsonl'),
  JSON.stringify({ label: LABEL, url: URL_UNDER_TEST, preset: PRESET, runs: RUNS, ...metrics }) + '\n'
);
fs.writeFileSync(path.join(OUT, `${LABEL}.json`), JSON.stringify(mid, null, 2));
console.log(`\n  full report: .perf/${LABEL}.json\n`);
