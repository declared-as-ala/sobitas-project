/**
 * Screenshot matrix for design work: routes x themes x widths, full-page PNGs.
 *
 * WHY THIS EXISTS
 * A redesign touches shared surfaces (Section rhythm, band colours, the type scale), so the thing
 * you actually need to check is not "does the page I edited still look right" but "did any OTHER
 * page change". Eyeballing that by hand across 10 routes x 2 themes x 2 widths is 40 loads; nobody
 * does it, so regressions ship. This makes it one command.
 *
 * Usage:
 *   node scripts/visual-snap.mjs                       # localhost:3000, all routes, both themes
 *   node scripts/visual-snap.mjs --base https://protein.tn --out .snap/before
 *   node scripts/visual-snap.mjs --routes / /shop --widths 390
 *
 * Then compare two runs:
 *   node scripts/visual-snap.mjs --out .snap/before   (on main)
 *   node scripts/visual-snap.mjs --out .snap/after    (on the branch)
 * and open them side by side. Deliberately NOT a pixel-diff: a redesign is SUPPOSED to change
 * pixels, so an automated diff would be red everywhere and tell you nothing. The value is the
 * complete, reproducible set.
 *
 * Output is written under frontend/.snap/, which is gitignored.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/** Routes that between them exercise every shared surface on the site. */
const DEFAULT_ROUTES = [
  '/',
  '/shop',
  '/proteine-whey',
  '/packs',
  '/blog',
  '/contact',
  '/cart',
  '/login',
];

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const values = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) values.push(argv[j]);
  return values.length ? values : fallback;
}
const one = (name, fallback) => {
  const v = flag(name, null);
  return v ? v[0] : fallback;
};

const BASE = (one('base', 'http://localhost:3000')).replace(/\/$/, '');
const OUT = path.resolve(ROOT, one('out', '.snap/current'));
const ROUTES = flag('routes', DEFAULT_ROUTES);
const WIDTHS = (flag('widths', ['390', '1440'])).map(Number);
const THEMES = flag('themes', ['light', 'dark']);

/**
 * puppeteer's bundled Chrome is not downloaded in this checkout (no postinstall on CI), so fall
 * back to a system install. Without this the script dies with "Could not find Chrome".
 */
const SYSTEM_CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean).find((p) => { try { return fs.existsSync(p); } catch { return false; } });

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  ...(SYSTEM_CHROME ? { executablePath: SYSTEM_CHROME } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let ok = 0;
let failed = 0;

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height: width < 768 ? 844 : 900,
      deviceScaleFactor: 1,
      isMobile: width < 768,
      hasTouch: width < 768,
    });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);

    // The app switches on a `dark` class, not on the media query alone — set both so the shot
    // matches what a user with that preference actually sees.
    await page.evaluateOnNewDocument((t) => {
      try {
        localStorage.setItem('theme', t);
      } catch {
        /* storage blocked — the class below still applies */
      }
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.toggle('dark', t === 'dark');

        /**
         * DISABLE `content-visibility` FOR THE CAPTURE.
         *
         * `.pt-defer` sets `content-visibility: auto`, which tells the browser not to paint
         * off-screen subtrees. In a `fullPage: true` screenshot that is exactly the wrong
         * behaviour: the capture stitches the whole document, but every band that is not near the
         * viewport comes out BLANK. The first dark-mobile shot taken with this script was ~60%
         * empty grey and looked like a catastrophic layout bug; the page was fine.
         *
         * Real users never see this — a deferred band paints as soon as it approaches the
         * viewport. But a review screenshot that cannot be trusted is worse than no screenshot,
         * so the capture opts out and measures the page as it actually renders when read.
         */
        const s = document.createElement('style');
        s.textContent =
          '*{content-visibility:visible !important;contain-intrinsic-size:auto !important}';
        document.head.appendChild(s);
      });
    }, theme);

    for (const route of ROUTES) {
      const url = `${BASE}${route}`;
      const name = `${(route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_'))}--${theme}--${width}.png`;
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });

        /**
         * Force every `content-visibility: auto` band to lay out, or the full-page shot captures
         * collapsed placeholders instead of the sections you are trying to review — AND then wait
         * for the lazy images that scrolling just triggered to actually decode.
         *
         * The second half is not belt-and-braces. With a flat 500ms wait this script produced a
         * homepage shot whose brand wall was twelve empty cells and whose blog rail was three grey
         * rectangles. Both were investigated as layout bugs; both were fine. Probing the live page
         * reported `complete: true` and `naturalWidth: 209` for the exact logos the PNG showed as
         * blank. Waiting on a CONDITION instead of a duration is the difference between a review
         * artefact you can trust and one you have to re-verify by hand.
         */
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 600) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);

          const deadline = Date.now() + 15_000;
          const pending = () =>
            Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0);
          while (pending().length > 0 && Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 200));
          }
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 300)));
        });

        await page.screenshot({ path: path.join(OUT, name), fullPage: true });
        console.log(`  ok   ${name}`);
        ok++;
      } catch (e) {
        console.log(`  FAIL ${name}  ${e.message}`);
        failed++;
      }
    }
    await page.close();
  }
}

await browser.close();
console.log(`\n${ok} captured, ${failed} failed  →  ${OUT}`);
process.exit(failed > 0 ? 1 : 0);
