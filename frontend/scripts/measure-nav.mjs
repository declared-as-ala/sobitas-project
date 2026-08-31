/**
 * How long a tap on BOUTIQUE takes to become /shop.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 * Owner, 20/08/2026: *"still when i click on boutique it's not instantly browsing to /shop — fix
 * it in the entire website."*
 *
 * The cause was `experimental.staleTimes = { dynamic: 0, static: 0 }` in next.config.js. With
 * `static: 0`, next/dist/client/components/router-reducer/prefetch-cache-utils.js returns
 * `expired` for EVERY prefetch entry — the reuse branches are all `Date.now() < prefetchTime + 0`
 * — and navigate-reducer.js prunes the cache at the top of every navigation, before it looks the
 * entry up. So every prefetch this codebase fires was deleted a few lines before the click that
 * wanted it, and the navigation blocked on a full origin round-trip with the OLD PAGE still on
 * screen.
 *
 * That is a claim about milliseconds, so it gets measured rather than asserted. This script also
 * guards the correctness half: the mobile drawer's BOUTIQUE row used to be a <button> that only
 * toggled an accordion, so on a phone it did not navigate AT ALL.
 *
 *   node scripts/measure-nav.mjs [base]
 *
 * Exit code is non-zero if any entry point fails to navigate. The timings are reported, not
 * gated: /shop renders against the live API, so the absolute numbers move with the backend and a
 * threshold here would be a flaky test rather than a guard.
 */
import puppeteer from 'puppeteer';

/**
 * ── THIS MUST BE MEASURED OVER A SLOW LINK OR IT MEASURES NOTHING ───────────────────────────
 * A prefetch does not make a page render faster. It moves the network cost EARLIER, off the
 * click. So on localhost — where the RSC round-trip is ~40ms — a warm cache and a cold one look
 * identical, and the first version of this script duly reported 72ms before the fix and 55ms
 * after: an entirely honest measurement of the wrong thing.
 *
 * The default here is a Tunisian mobile connection: 150ms RTT, 1.6 Mbps down, 4x CPU. That is
 * roughly the condition the field Core Web Vitals for this site are collected under, and the one
 * the owner is describing. Pass `--fast` to measure without throttling.
 */
const THROTTLE = !process.argv.includes('--fast');
const NETWORK = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};


const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

let failures = 0;

/**
 * Click something and report two numbers:
 *   nav    — click → the URL is actually /shop
 *   paint  — click → the shop's own content (skeleton or grid) is in the DOM
 *
 * `paint` is the one the owner is describing. Before the fix it could not happen until the server
 * answered, because with no reusable prefetch entry the router has nothing to render and React
 * keeps the previous page mounted for the whole transition.
 */
async function timeNavigation(page, label, clickFn) {
  await page.evaluate(() => {
    window.__navT0 = performance.now();
  });
  const t0 = Date.now();
  await clickFn();

  let navAt = null;
  let paintAt = null;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline && (navAt === null || paintAt === null)) {
    const state = await page.evaluate(() => ({
      path: location.pathname,
      // The skeleton and the real grid both live under <main>; either one means the shop's own
      // markup has replaced the page that was there.
      shopContent: !!document.querySelector('main [class*="grid-cols"]'),
    })).catch(() => null);
    if (!state) break;
    if (navAt === null && state.path === '/shop') navAt = Date.now() - t0;
    if (paintAt === null && state.path === '/shop' && state.shopContent) paintAt = Date.now() - t0;
    if (navAt !== null && paintAt !== null) break;
    await new Promise((r) => setTimeout(r, 25));
  }

  if (navAt === null) {
    console.log(`  FAIL  ${label} — never reached /shop (still ${await page.evaluate(() => location.pathname)})`);
    failures++;
    return null;
  }
  console.log(`  ok    ${label} — url ${navAt}ms, content ${paintAt === null ? '>20000' : paintAt}ms`);
  return { navAt, paintAt };
}

/* ── PHONE ──────────────────────────────────────────────────────────────────────────────── */
{
  console.log(`\nphone 390x844${THROTTLE ? ' — 150ms RTT / 1.6Mbps / 4x CPU' : ''}`);
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  if (THROTTLE) {
    const cdp = await page.createCDPSession();
    await cdp.send('Network.emulateNetworkConditions', NETWORK);
    // 4x CPU, the multiplier check-inp.mjs already uses — a phone is slow at parsing as well as
    // at fetching, and both costs land on the same interaction.
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }

  // 1 — the raised centre tile on the tab bar.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, THROTTLE ? 7000 : 2500));
  await timeNavigation(page, 'tab bar — Boutique tile', async () => {
    await page.evaluate(() => {
      const el = document.querySelector('nav[aria-label="Navigation rapide"] a[aria-label="Boutique"]');
      if (!el) throw new Error('tab bar Boutique not found');
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
      el.click();
    });
  });

  // 2 — the drawer row. THIS is the one that did not navigate at all.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, THROTTLE ? 7000 : 2500));
  const opened = await page.evaluate(() => {
    const burger = [...document.querySelectorAll('button')].find((b) =>
      /menu/i.test(b.getAttribute('aria-label') || '')
    );
    if (!burger) return false;
    burger.click();
    return true;
  });
  if (!opened) {
    console.log('  FAIL  drawer — no menu button');
    failures++;
  } else {
    await new Promise((r) => setTimeout(r, THROTTLE ? 2000 : 900));
    const found = await page.evaluate(() => {
      const row = [...document.querySelectorAll('a')].find(
        (a) => a.getAttribute('href') === '/shop' && /produit|boutique/i.test(a.textContent || '')
      );
      return !!row;
    });
    if (!found) {
      console.log('  FAIL  drawer — BOUTIQUE row is not a link to /shop');
      failures++;
    } else {
      await timeNavigation(page, 'drawer — NOS PRODUITS row', async () => {
        await page.evaluate(() => {
          const row = [...document.querySelectorAll('a')].find(
            (a) => a.getAttribute('href') === '/shop' && /produit|boutique/i.test(a.textContent || '')
          );
          row.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
          row.click();
        });
      });
    }
  }
  await page.close();
}

/* ── DESKTOP ────────────────────────────────────────────────────────────────────────────── */
{
  console.log(`\ndesktop 1536x864${THROTTLE ? ' — 150ms RTT / 1.6Mbps' : ''}`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });
  if (THROTTLE) {
    const cdp = await page.createCDPSession();
    await cdp.send('Network.emulateNetworkConditions', NETWORK);
  }
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, THROTTLE ? 7000 : 2500));

  // Hover first, exactly as a person does — that is what fires the intent prefetch, and what
  // staleTimes:0 used to make pointless.
  const box = await page.evaluate(() => {
    const el = [...document.querySelectorAll('header a')].find(
      (a) => a.getAttribute('href') === '/shop'
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!box) {
    console.log('  FAIL  header — no BOUTIQUE link');
    failures++;
  } else {
    await page.mouse.move(box.x, box.y);
    await new Promise((r) => setTimeout(r, 400)); // past the 90ms intent timer
    await timeNavigation(page, 'header — BOUTIQUE (after 400ms hover)', async () => {
      await page.mouse.click(box.x, box.y);
    });
  }
  await page.close();
}

await browser.close();

if (failures) {
  console.log(`\nmeasure-nav — ${failures} entry point(s) FAILED to navigate.`);
  process.exit(1);
}
console.log('\nmeasure-nav — every Boutique entry point navigates.');
