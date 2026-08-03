/**
 * Assert the compact-on-scroll header actually works, in the browser, at both breakpoints.
 *
 * A collapsing header is easy to ship broken in a way no screenshot catches: the attribute
 * toggles but the CSS never matched, or it collapses at the top of the page, or it never comes
 * back on scroll up and the nav is gone for the rest of the session. Each of those is a
 * behaviour over TIME, so it needs a driven test rather than a picture.
 *
 * Usage: node scripts/check-header-compact.mjs [--widths 1440 390]
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const out = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) out.push(argv[j]);
  return out.length ? out : fallback;
}
const BASE = (flag('base', ['http://localhost:3000'])[0]).replace(/\/$/, '');
const WIDTHS = flag('widths', ['1440', '390']).map(Number);

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

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: width < 768 ? 844 : 900, isMobile: width < 768 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 90_000 });
  await new Promise((r) => setTimeout(r, 600));

  // The header's own measured height is the ground truth — it proves the CSS matched, not just
  // that the attribute flipped.
  const headerH = () => page.evaluate(() => Math.round(document.querySelector('header').getBoundingClientRect().height));
  const isCompact = () => page.evaluate(() => document.querySelector('header').hasAttribute('data-compact'));

  const scrollTo = async (y) => {
    await page.evaluate((target) => window.scrollTo(0, target), y);
    // Two frames for the rAF-coalesced handler, then the 220ms transition.
    await new Promise((r) => setTimeout(r, 450));
  };

  console.log(`\n@${width}px`);

  const restingH = await headerH();
  check('at rest, not compact', !(await isCompact()));

  // Below the 140px threshold: must NOT collapse, or the nav vanishes on the tiniest nudge.
  await scrollTo(90);
  check('scrolled 90px (under threshold) — still not compact', !(await isCompact()));

  await scrollTo(900);
  const compactOn = await isCompact();
  const compactH = await headerH();
  check('scrolled down past threshold — compact', compactOn);
  check('header is shorter when compact', compactH < restingH, `${restingH}px -> ${compactH}px`);

  // Scrolling UP must restore it immediately — that is what makes the pattern usable.
  await scrollTo(600);
  check('scrolled up — restored', !(await isCompact()));
  check('header height restored', (await headerH()) === restingH, `${await headerH()}px`);

  await page.close();
}

await browser.close();
console.log(`\n=== ${failures} failure(s) ===\n`);
process.exit(failures > 0 ? 1 : 0);
