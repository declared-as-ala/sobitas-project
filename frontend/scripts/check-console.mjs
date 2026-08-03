/**
 * Fail on browser console errors/warnings and page exceptions.
 *
 * The dev overlay's "N Issues" pill is easy to look past in a screenshot, and hydration mismatches
 * in particular are invisible in a static capture — the page looks right and then silently
 * re-renders on the client. This turns them into a non-zero exit code.
 *
 * Usage: node scripts/check-console.mjs [--routes / /shop] [--width 1440] [--theme light]
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
const one = (n, d) => flag(n, [d])[0];

const BASE = one('base', 'http://localhost:3000').replace(/\/$/, '');
const ROUTES = flag('routes', ['/']);
const WIDTH = Number(one('width', '1440'));
const THEME = one('theme', 'light');

/**
 * Noise that is not ours and cannot be fixed from this codebase. Keep this list SHORT and
 * justified — an over-broad ignore list turns this script back into decoration.
 */
const IGNORE = [
  /ResizeObserver loop/i,             // benign browser-internal, fires from Radix measurements
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
];

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

let total = 0;

for (const route of ROUTES) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: WIDTH < 768 ? 844 : 900, isMobile: WIDTH < 768 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: THEME }]);

  const found = [];
  const record = (kind, text) => {
    if (IGNORE.some((re) => re.test(text))) return;
    found.push(`${kind}: ${text.replace(/\s+/g, ' ').slice(0, 300)}`);
  };
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') record(m.type(), m.text());
  });
  page.on('pageerror', (e) => record('exception', e.message));
  page.on('requestfailed', (r) => record('requestfailed', `${r.url().slice(0, 140)} ${r.failure()?.errorText ?? ''}`));

  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 90_000 });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 800));
  });

  console.log(`\n${route}  ${THEME}  @${WIDTH}px   ${found.length} issue(s)`);
  for (const f of found) console.log(`   ${f}`);
  total += found.length;
  await page.close();
}

await browser.close();
console.log(`\n=== ${total} console issue(s) ===\n`);
process.exit(total > 0 ? 1 : 0);
