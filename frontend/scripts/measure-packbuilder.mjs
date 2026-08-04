#!/usr/bin/env node
/**
 * What the pack builder actually costs a visitor — measured, not guessed.
 *
 * The owner's complaint was specific: "why should I see all those intros from the up… I want to
 * directly start making my pack", "I keep scrolling, scrolling, scrolling to see just créatine",
 * and "the screen on the mobile looks so filled". Each of those is a NUMBER, and this script
 * produces it, so the redesign is aimed at a measurement rather than at an adjective.
 *
 * The four numbers that matter:
 *
 *   1. TIME-TO-FIRST-ADD   the scroll distance, in screens, before ANY "Ajouter" button is
 *                          reachable. This is the whole "get me straight into the feature" ask.
 *   2. CATEGORY REACH      the scroll distance from the top of the first category to the top of
 *                          the last one. This is the "scrolling to see just créatine" ask.
 *   3. OCCLUDED AREA       how much of the phone screen is covered by fixed chrome (tab bar, pack
 *                          bar, WhatsApp FAB, back-to-top). This is the "screen so filled" ask.
 *   4. DOCUMENT HEIGHT     total scrollable length, in screens.
 *
 * MEASURE AT THE REAL SMALL VIEWPORT. Headless Chrome has no retractable browser chrome, so
 * `100svh` there equals the full screen height and a phone measured at 390x844 is a phone that does
 * not exist. iPhone 13's Safari small viewport is 390x746. This is the same trap that made
 * measure-hero.mjs report "0px cropped" on its first run while the owner was looking at a visibly
 * cropped hero.
 *
 * Usage:
 *   node scripts/measure-packbuilder.mjs                     # live site
 *   node scripts/measure-packbuilder.mjs --base http://localhost:3000
 */

import puppeteer from 'puppeteer';
import { existsSync } from 'node:fs';

/** Puppeteer's own Chrome is not installed on this machine; use the system one, as the other
 *  measurement scripts in this folder do. `.find(Boolean)` alone would happily return a path that
 *  does not exist, so this checks. */
const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const BASE = baseIdx !== -1 ? args[baseIdx + 1] : 'https://protein.tn';
const URL = `${BASE}/pack-builder`;

const DEVICES = [
  // height = the real SMALL viewport (toolbars shown), not the screen height.
  { name: 'iPhone 13', width: 390, height: 746, mobile: true },
  { name: 'small Android', width: 360, height: 566, mobile: true },
  { name: 'Desktop', width: 1440, height: 820, mobile: false },
];

const fmt = (n) => (Number.isFinite(n) ? Math.round(n) : '—');

async function measure(browser, device) {
  const page = await browser.newPage();
  await page.setViewport({
    width: device.width,
    height: device.height,
    deviceScaleFactor: device.mobile ? 3 : 1,
    isMobile: device.mobile,
    hasTouch: device.mobile,
  });
  if (device.mobile) {
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
        '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
  }

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  // Product tiles arrive with the RSC payload; give hydration a beat before measuring positions.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));

  // Measure the occlusion AFTER scrolling. Back-to-top only appears past 500px, so a measurement
  // taken at the top of the page misses one of the floating buttons the owner is complaining about
  // — and misses it on exactly the part of the page where they are actually shopping.
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.evaluate(() => new Promise((r) => setTimeout(r, 700)));

  const result = await page.evaluate(() => {
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight;

    const absTop = (el) => el.getBoundingClientRect().top + window.scrollY;

    // 1 — first reachable "add" control ON A PRODUCT. Scoped to <article> deliberately: the sticky
    // bar's own "Ajouter le pack au panier" is `position: fixed`, so its absolute top is wherever
    // you happen to be standing. Counting it reported "first Ajouter at 0px" on a page where the
    // first product button is 1,100px down — a measurement that flatters the thing being measured.
    const addButtons = [...document.querySelectorAll('article button')].filter((b) => {
      const t = (b.textContent || '').trim().toLowerCase();
      return t.startsWith('ajouter');
    });
    const firstAdd = addButtons.length ? Math.min(...addButtons.map(absTop)) : NaN;

    // 2 — category reach: distance between the first and last category section.
    const groups = [...document.querySelectorAll('[id^="group-"]')].filter((el) => el.tagName === 'SECTION');
    const groupTops = groups.map((g) => ({ id: g.id, top: Math.round(absTop(g)) }));
    const reach = groupTops.length >= 2 ? groupTops[groupTops.length - 1].top - groupTops[0].top : NaN;

    // 3 — fixed chrome occluding the viewport. Walk every element whose used position is fixed and
    // that is actually painted, then union the parts of their rects that intersect the viewport.
    const fixed = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      // Skip a fixed element whose fixed parent already covers it (avoid double counting).
      if (fixed.some((f) => f.el.contains(el))) continue;
      const top = Math.max(0, r.top);
      const bottom = Math.min(window.innerHeight, r.bottom);
      const left = Math.max(0, r.left);
      const right = Math.min(window.innerWidth, r.right);
      if (bottom <= top || right <= left) continue;
      fixed.push({
        el,
        label:
          el.getAttribute('aria-label') ||
          el.id ||
          (el.className && String(el.className).split(' ').slice(0, 2).join('.')) ||
          el.tagName.toLowerCase(),
        area: (bottom - top) * (right - left),
        h: Math.round(r.height),
        w: Math.round(r.width),
      });
    }

    // 4 — how many taps/screens to see everything.
    return {
      vh,
      docH,
      firstAdd,
      groupTops,
      reach,
      productCount: document.querySelectorAll('article').length,
      fixed: fixed
        .map(({ label, area, h, w }) => ({ label, area: Math.round(area), h, w }))
        .sort((a, b) => b.area - a.area),
      occluded: Math.round(fixed.reduce((s, f) => s + f.area, 0)),
      screenArea: window.innerWidth * window.innerHeight,
      // Horizontal overflow check — a redesign that introduces one is a regression, full stop.
      bodyOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

  await page.close();
  return result;
}

const browser = await puppeteer.launch({
  ...(CHROME ? { executablePath: CHROME } : {}),
  headless: 'new',
  args: ['--no-sandbox'],
});

console.log(`\n  ${URL}\n`);

for (const device of DEVICES) {
  const r = await measure(browser, device);
  const screens = (v) => (Number.isFinite(v) ? (v / r.vh).toFixed(2) : '—');

  console.log(`  ${device.name}  ${device.width}x${device.height}`);
  console.log(`  ${'─'.repeat(62)}`);
  console.log(`    document              ${fmt(r.docH)}px   ${screens(r.docH)} screens`);
  console.log(`    first "Ajouter" at    ${fmt(r.firstAdd)}px   ${screens(r.firstAdd)} screens of scroll`);
  console.log(`    category reach        ${fmt(r.reach)}px   ${screens(r.reach)} screens`);
  console.log(`    products rendered     ${r.productCount}`);
  if (r.groupTops.length) {
    console.log(`    category tops         ${r.groupTops.map((g) => `${g.id.replace('group-', '')}@${g.top}`).join('  ')}`);
  }
  const pct = ((r.occluded / r.screenArea) * 100).toFixed(1);
  console.log(`    fixed chrome          ${pct}% of the screen (${r.fixed.length} elements)`);
  for (const f of r.fixed) {
    console.log(`        ${String(f.w).padStart(4)}x${String(f.h).padEnd(4)}  ${f.label}`);
  }
  console.log(`    horizontal overflow   ${r.bodyOverflowX ? 'YES — REGRESSION' : 'no'}`);
  console.log('');
}

await browser.close();
