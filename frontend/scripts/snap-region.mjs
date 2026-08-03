/**
 * Element-scoped screenshots, for reviewing ONE band at a time.
 *
 * visual-snap.mjs answers "did any other page change". This answers "is this specific band right",
 * which a 1440x8584 full-page PNG downscaled to fit a review pane genuinely cannot — at that
 * reduction a 13px caption is under two pixels tall and every spacing question is unanswerable.
 *
 *   node scripts/snap-region.mjs --sel "header" "#ventes-flash" --widths 1440 --themes light
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const values = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) values.push(argv[j]);
  return values.length ? values : fallback;
}
const one = (name, fallback) => (flag(name, null) ?? [fallback])[0];

const BASE = one('base', 'http://localhost:3000').replace(/\/$/, '');
const ROUTE = one('route', '/');
const OUT = path.resolve(ROOT, one('out', '.snap/region'));
const SELECTORS = flag('sel', ['header']);
const WIDTHS = flag('widths', ['1440']).map(Number);
const THEMES = flag('themes', ['light']);

const SYSTEM_CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => { try { return fs.existsSync(p); } catch { return false; } });

/**
 * Scroll the whole document to trigger every `loading="lazy"` image, then WAIT UNTIL THEY HAVE
 * ACTUALLY DECODED before returning.
 *
 * The fixed `setTimeout` this replaces is how a capture ends up lying. It produced a brand wall of
 * twelve empty cells and a blog rail of grey rectangles — both of which were then investigated as
 * layout bugs. They were not: probing the live page reported `complete: true`, `naturalWidth: 209`
 * and a rendered 157x34 for the very logos the screenshot showed as blank. The images simply had
 * not finished loading in the 400ms the script allowed after scrolling past them.
 *
 * A screenshot you have to second-guess is worth less than no screenshot, so the wait is now a
 * CONDITION (`every img complete`) with a timeout, not a guess.
 */
async function settle(page, timeoutMs = 15_000) {
  await page.evaluate(async (limit) => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);

    const deadline = Date.now() + limit;
    const pending = () =>
      Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0);
    while (pending().length > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200));
    }
    // One more frame so the last decode is painted.
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 300)));
  }, timeoutMs);
}

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
    await page.setViewport({ width, height: width < 768 ? 844 : 900, isMobile: width < 768 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.evaluateOnNewDocument((t) => {
      try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.toggle('dark', t === 'dark');
        const s = document.createElement('style');
        // Same reason as visual-snap.mjs: content-visibility makes an off-screen band report a
        // placeholder box, so both the screenshot AND any measurement taken here would be fiction.
        s.textContent = '*{content-visibility:visible !important;contain-intrinsic-size:auto !important}';
        document.head.appendChild(s);
      });
    }, theme);

    await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle2', timeout: 60_000 });
    await settle(page);

    for (const sel of SELECTORS) {
      const safe = sel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      const name = `${safe}--${theme}--${width}.png`;
      try {
        const el = await page.$(sel);
        if (!el) throw new Error('selector not found');
        await el.screenshot({ path: path.join(OUT, name) });
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
console.log(`\n${ok} captured, ${failed} failed  ->  ${OUT}`);
process.exit(failed > 0 ? 1 : 0);
