/**
 * Measure INP the way the field measures it: press things, and time each press to the next paint.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 * PageSpeed field data for protein.tn on 2026-08-03: INP 408 ms, Core Web Vitals FAILED.
 * Lighthouse lab in the same report: TBT 50 ms, "good". Both are correct — they measure different
 * things, and only one of them is what a shopper feels:
 *
 *   TBT  how long the main thread was blocked DURING PAGE LOAD. It never presses anything.
 *   INP  how long from a real tap to the next frame that shows a result.
 *
 * So a page can load fast and be miserable to use, and the lab score will not say a word about it.
 * That is precisely the case here, which is why this script drives actual input rather than
 * loading the page and reading a number.
 *
 * `PerformanceEventTiming.duration` is the browser's own measurement of tap → next paint, rounded
 * to 8 ms — the exact quantity CrUX aggregates into INP. Not a proxy.
 *
 * CPU THROTTLING IS NOT OPTIONAL. A desktop CPU hides a re-render storm completely; the same code
 * that answers in 12 ms here takes 400 ms on the mid-range Android most of this shop's traffic
 * uses. 4x via CDP matches Lighthouse's mobile profile.
 *
 *   node scripts/check-inp.mjs --url http://localhost:3001/ --taps 8
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const one = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const URL_UNDER_TEST = one('url', 'http://localhost:3001/');
const TAPS = Number(one('taps', '8'));
const CPU = Number(one('cpu', '4'));
const LABEL = one('label', 'inp');

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

const browser = await puppeteer.launch({
  headless: 'new',
  ...(CHROME ? { executablePath: CHROME } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 412, height: 823, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });

const client = await page.createCDPSession();
await client.send('Emulation.setCPUThrottlingRate', { rate: CPU });

await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 120_000 });

// Hydration has to be finished or the first tap measures React booting rather than the handler.
await page.waitForFunction(() => document.querySelectorAll('article').length > 0, { timeout: 60_000 });
/*
 * SETTLE LONG, and it is not padding.
 *
 * At a 3s wait the results showed a recurring ~390 ms handler spike on an otherwise 24-88 ms
 * interaction, at a different tap index on each run. That is not per-tap cost — it is this page's
 * DEFERRED CHUNKS (the cart drawer warm-up, the toaster, the install banner) being downloaded and
 * evaluated on the idle callback, landing on top of whichever tap happened to be in flight. Real
 * visitors read for a few seconds before touching anything, so measuring during that window
 * reports a load cost as an interaction cost and sends you optimising the wrong thing.
 *
 * `--settle` is exposed so the load-window case can still be measured deliberately.
 */
await new Promise((r) => setTimeout(r, Number(one('settle', '9000'))));

await page.evaluate(() => {
  window.__events = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      // `interactionId` is non-zero only for real user interactions — the same filter CrUX uses,
      // so hover/scroll noise cannot flatter the result.
      if (e.interactionId) {
        window.__events.push({ name: e.name, duration: e.duration, processing: e.processingEnd - e.processingStart });
      }
    }
  }).observe({ type: 'event', durationThreshold: 0, buffered: true });
});

/** Toggle one visible card N times — the cleanest isolated interaction: it mutates shared state
 *  without opening a drawer, while also showing whether repeated updates remain responsive. */
const HEART_SELECTOR = 'article button[aria-label*="favoris"]';
const CART_SELECTOR = 'article button[aria-label*="au panier"]';
const heartCount = await page.$$eval(HEART_SELECTOR, (buttons) => buttons.length);
const cartCount = await page.$$eval(CART_SELECTOR, (buttons) => buttons.length);
console.log(`\n  ${heartCount} favourite buttons, ${cartCount} add-to-cart buttons found`);

const tapped = Math.min(TAPS, heartCount);
for (let i = 0; i < tapped; i++) {
  // A favourite mutation intentionally rerenders the tapped card, and the flash countdown can
  // refresh the rail between pointer-down and click. Locator re-resolves and retries against the
  // live DOM; an ElementHandle can detach before Puppeteer scrolls it into view.
  await page.locator(HEART_SELECTOR).click();
  await new Promise((r) => setTimeout(r, 450));
}
// One add-to-cart as well: it is the money interaction and it also opens the drawer.
if (cartCount) {
  await page.locator(CART_SELECTOR).click();
  await new Promise((r) => setTimeout(r, 800));
}

const events = await page.evaluate(() => window.__events);
await browser.close();

if (!events.length) {
  console.log('\n  no interaction entries captured — the selectors probably did not match\n');
  process.exit(1);
}

const durations = events.map((e) => e.duration).sort((a, b) => a - b);
const pct = (p) => durations[Math.min(durations.length - 1, Math.floor((durations.length - 1) * p))];

console.log(`\n══ ${LABEL} · ${URL_UNDER_TEST} · ${CPU}x CPU throttle · ${events.length} interactions ══\n`);
for (const e of events) console.log(`   ${String(Math.round(e.duration)).padStart(5)} ms   (handler ${Math.round(e.processing)} ms)   ${e.name}`);

const worst = durations[durations.length - 1];
console.log(`\n   median      ${pct(0.5)} ms`);
console.log(`   p75         ${pct(0.75)} ms`);
console.log(`   WORST       ${worst} ms      ${worst <= 200 ? 'good' : worst <= 500 ? 'needs work' : 'POOR'}`);
console.log(`\n   INP is scored on roughly the worst interaction a visitor has, so the last line is`);
console.log(`   the one that matters. Good <= 200 ms, poor > 500 ms.\n`);
