/**
 * Report the page's band architecture as NUMBERS: every `[data-band]` in order with its surface,
 * its padding, its height, and the gap to its neighbour.
 *
 * WHY THIS EXISTS
 * "The spacing is bad" and "the spacing is fine" are both unfalsifiable by eye, especially on a
 * 8,500px document that no screenshot shows at native size. This turns the two questions that
 * actually matter into assertions:
 *
 *   1. Is every band's padding one of the four values in Section.tsx's SPACING scale? Anything
 *      else means a call site hand-rolled a `py-*`, which is the drift the scale exists to stop.
 *   2. Do any two ADJACENT bands share a surface? If they do, the 1px seam between them is
 *      carrying the boundary alone and the band architecture has a hole in it.
 *
 * Usage: node scripts/measure-bands.mjs [--route /] [--width 1440] [--theme light]
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const one = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const BASE = one('base', 'http://localhost:3000').replace(/\/$/, '');
const ROUTE = one('route', '/');
const WIDTH = Number(one('width', '1440'));
const THEME = one('theme', 'light');

/**
 * The four legal band paddings at each breakpoint, from Section.tsx SPACING.
 * KEEP IN SYNC BY HAND — this file is the only thing that catches a call site inventing a fifth
 * value, so a drifted table silently stops enforcing the scale.
 */
const LEGAL = {
  /* Below `sm` the gap between two bands is essentially the lower band's `pt` — see the scale
     note in Section.tsx — so 0 is legal at 390 on its own merits and not as a hero special case.
     `mobileBottom` is the 8px every content step has carried at the bottom since 10/08/2026
     ("in mobile between the sections make a padding bottom of .5em or more little"), and
     `heroBottom` is the 4px the owner asked for under the slider on 18/08/2026 (0.3em).

     ── THIS TABLE WENT STALE AND THE GUARD WENT RED WITHOUT ANYBODY NOTICING ────────────────
     It mirrors Section.tsx's SPACING by hand, so it is wrong the moment that scale moves. It had
     been wrong since the 10/08 change: measured against PRODUCTION on 18/08 this run reported
     EIGHT off-scale paddings, all of them the same legitimate 8px bottom. Eight false failures is
     how a guard teaches people to stop reading it. Anyone touching SPACING must touch this. */
  390: { strip: 12, tight: 20, default: 16, feature: 24, stage: 0, zero: 0, mobileBottom: 8, heroBottom: 4 },
  /* Updated 18/08/2026 with the scale itself: `lg` came down one 8px notch across the board when
     the owner asked for tighter desktop bands. tight 32->24, default 40->32, feature 48->40. */
  1440: { strip: 16, tight: 24, default: 32, feature: 40, stage: 0 },
};

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => { try { return fs.existsSync(p); } catch { return false; } });

const browser = await puppeteer.launch({
  headless: 'new',
  ...(CHROME ? { executablePath: CHROME } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: WIDTH < 768 ? 844 : 900, isMobile: WIDTH < 768 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: THEME }]);
await page.evaluateOnNewDocument((t) => {
  try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    // Without this every off-screen band reports its `contain-intrinsic-size` placeholder rather
    // than its real height, and every number below would be fiction.
    const s = document.createElement('style');
    s.textContent = '*{content-visibility:visible !important;contain-intrinsic-size:auto !important}';
    document.head.appendChild(s);
  });
}, THEME);

await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle2', timeout: 90_000 });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 80));
  }
  window.scrollTo(0, 0);
  const deadline = Date.now() + 15_000;
  const pending = () => Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0);
  while (pending().length > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
  await new Promise((r) => setTimeout(r, 400));
});

const bands = await page.evaluate(() => {
  /**
   * A band with `surface="base"` paints nothing — it shows the page canvas through. Reporting
   * that as `#000000` (which a naive rgba parse does, because the alpha is dropped) would be a
   * lie in the one column of this table that matters, and would make the adjacent-surface check
   * compare a phantom black against a real colour. Resolve alpha-0 to the ancestor that actually
   * paints, so the column shows the colour a visitor SEES.
   */
  const hex = (r, g, b) =>
    '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  const painted = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([^)]+)\)/);
      if (!m) continue;
      const parts = m[1].split(',').map((v) => parseFloat(v.trim()));
      if (parts.length < 4 || parts[3] > 0) return hex(parts[0], parts[1], parts[2]);
    }
    return '#FFFFFF';
  };
  return Array.from(document.querySelectorAll('[data-band]')).map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      label:
        el.getAttribute('aria-label') ||
        el.id ||
        el.querySelector('h2')?.textContent?.trim().slice(0, 28) ||
        el.tagName.toLowerCase(),
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
      pt: Math.round(parseFloat(cs.paddingTop)),
      pb: Math.round(parseFloat(cs.paddingBottom)),
      bg: painted(el),
      borderTop: cs.borderTopWidth,
      first: el.hasAttribute('data-band-first'),
    };
  });
});

const legal = LEGAL[WIDTH] || LEGAL[1440];
const legalValues = new Set(Object.values(legal));

/**
 * The gap a VISITOR sees between two sections is not either band's padding — it is the sum of the
 * upper band's `pb` and the lower band's `pt`. That distinction is the whole reason this column
 * exists: the owner circled three boundaries on a screenshot as "white space that makes the page
 * look messy", and every individual padding involved was a defensible number from the scale. The
 * SUMS were 96, 112 and 144px. A scale can be perfectly consistent and still produce gaps that
 * are not, because gaps are sums — so the sums are what must be reported.
 *
 * GAP_WARN is the point at which a boundary starts reading as a mistake rather than as a break.
 */
const GAP_WARN = WIDTH < 768 ? 72 : 104;

/**
 * Boundaries where two bands are ALLOWED to share a surface, keyed by the LOWER band's label.
 *
 * The alternation rule exists because in dark theme a slab against canvas measures 1.39:1 — the
 * fill is not a boundary — so a page that separates by colour alone only separates for half its
 * users. That argument is about bands. It stops applying when the thing below is not presenting
 * itself as a band at all.
 *
 * Every entry needs a date, a reason, and the guarantee that SOMETHING still separates the two.
 *
 *   'Acheter par objectif'  owner, 18/08/2026, edited live in DevTools: white fill, no seam, no
 *                           top padding, and — in the same message — no heading and no "Tout
 *                           voir". With the whole band apparatus removed, six navigation tiles
 *                           are meant to read as the bottom of the hero rather than as the page's
 *                           second section, and a rule across a continuous white area was drawing
 *                           a boundary where the design no longer has one. What separates it from
 *                           the hero is the hero's 24px of bottom padding.
 *   'products'              consequence of the above, not a second decision: "Les plus vendus"
 *                           was white under a sand rail and is now white under a white one. It
 *                           KEEPS its 1px seam, so the boundary is still drawn — which is the
 *                           part of the invariant that actually protects dark theme.
 *
 * An exception that is not listed here still fails the run. That is the point: this file is the
 * record of which clashes somebody decided on, so a new one cannot arrive by accident.
 */
const SHARED_SURFACE_OK = new Set(['Acheter par objectif', 'products']);

console.log(`\n${ROUTE}  @${WIDTH}px  ${THEME}\n`);
console.log('  #  band                          top   height   pt   pb    gap   surface   seam');
console.log('  ' + '-'.repeat(84));

let offScale = 0;
let sharedSurface = 0;
let wideGaps = 0;
let prevBg = null;
let prevPb = null;

bands.forEach((b, i) => {
  const ptOk = legalValues.has(b.pt);
  const pbOk = legalValues.has(b.pb);
  if (!ptOk || !pbOk) offScale++;
  const clash = prevBg !== null && prevBg === b.bg;
  const sanctioned = clash && SHARED_SURFACE_OK.has(b.label);
  if (clash && !sanctioned) sharedSurface++;

  const gap = prevPb === null ? null : prevPb + b.pt;
  const gapWide = gap !== null && gap > GAP_WARN;
  if (gapWide) wideGaps++;

  prevBg = b.bg;
  prevPb = b.pb;

  console.log(
    `  ${String(i + 1).padStart(2)}  ${b.label.padEnd(28).slice(0, 28)}` +
      `${String(b.top).padStart(6)}${String(b.height).padStart(8)}` +
      `${String(b.pt).padStart(5)}${ptOk ? ' ' : '!'}${String(b.pb).padStart(4)}${pbOk ? ' ' : '!'}` +
      `${(gap === null ? '—' : String(gap)).padStart(6)}${gapWide ? '!' : ' '}` +
      ` ${b.bg.padEnd(9)} ${b.first ? 'first' : b.borderTop}` +
      (clash ? (sanctioned ? '   (shares surface — sanctioned)' : '   <-- SAME SURFACE AS ABOVE') : '')
  );
});

const doc = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('\n  ' + '-'.repeat(84));
console.log(`  ${bands.length} bands, document ${doc}px`);
console.log(`  off-scale paddings (marked !): ${offScale}`);
console.log(`  adjacent bands sharing a surface (unsanctioned): ${sharedSurface}`);
console.log(`  boundaries wider than ${GAP_WARN}px: ${wideGaps}`);
console.log(`  legal paddings @${WIDTH}: ${[...legalValues].sort((a, b) => a - b).join(' / ')}\n`);

await browser.close();
process.exit(offScale > 0 || sharedSurface > 0 || wideGaps > 0 ? 1 : 0);
