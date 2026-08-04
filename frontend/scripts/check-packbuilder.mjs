#!/usr/bin/env node
/**
 * Behavioural gate for the pack builder — asserts the redesign's contract, and drives the flow the
 * way a customer does rather than checking that markup exists.
 *
 * Everything here is a claim that would otherwise be made in a PR description and believed. The
 * shelf peek in particular: "there is a visible peek" is the single load-bearing assumption of the
 * horizontal layout (it is the only signal on touch that the row scrolls at all), and it is a
 * number, so it gets measured on the narrowest phone in the matrix rather than eyeballed at 1440.
 *
 * Usage: node scripts/check-packbuilder.mjs [--base http://localhost:3111]
 */

import puppeteer from 'puppeteer';
import { existsSync } from 'node:fs';

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

const argv = process.argv.slice(2);
const bi = argv.indexOf('--base');
const BASE = bi !== -1 ? argv[bi + 1] : 'http://localhost:3111';
const URL = `${BASE}/pack-builder`;

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  → ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({
  ...(CHROME ? { executablePath: CHROME } : {}),
  headless: 'new',
  args: ['--no-sandbox'],
});

async function openPhone(width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
      '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  );
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 1200)));
  return { page, errors };
}

// ── 1 · the shelf actually reads as scrollable on the narrowest phone ────────────────────────
console.log('\n1 · shelf geometry at 360px — the peek is the whole layout\n');
{
  const { page } = await openPhone(360, 566);
  const geo = await page.evaluate(() => {
    const track = document.querySelector('#group-whey-proteine div[class*="overflow-x-auto"]');
    if (!track) return null;
    const tiles = [...track.querySelectorAll('article')];
    const t = track.getBoundingClientRect();
    // How much of the LAST fully-hidden card is visible past the right edge of the viewport.
    const partial = tiles.find((el) => {
      const r = el.getBoundingClientRect();
      return r.left < window.innerWidth && r.right > window.innerWidth;
    });
    return {
      tiles: tiles.length,
      tileWidth: tiles[0] ? Math.round(tiles[0].getBoundingClientRect().width) : 0,
      scrollable: track.scrollWidth > track.clientWidth + 4,
      snap: getComputedStyle(track).scrollSnapType,
      peek: partial ? Math.round(window.innerWidth - partial.getBoundingClientRect().left) : 0,
      trackH: Math.round(t.height),
    };
  });
  check('the whey shelf exists', geo !== null);
  if (geo) {
    check('it has products', geo.tiles > 0, `${geo.tiles} tiles`);
    check('the tile is the specified 144px', geo.tileWidth === 144, `${geo.tileWidth}px`);
    check('the track genuinely overflows (there is more to see)', geo.scrollable);
    check('scroll-snap is on the x axis', geo.snap.startsWith('x '), geo.snap);
    // The single most important assertion in this file. Below ~16px a cut card reads as a clipping
    // bug rather than an invitation, and the layout loses its only touch affordance.
    check('a next card peeks past the right edge', geo.peek >= 16, `${geo.peek}px visible`);
    check('one shelf is a fraction of a screen', geo.trackH < 300, `${geo.trackH}px`);
  }
  await page.close();
}

// ── 2 · the flow: add → tray → totals → tier ────────────────────────────────────────────────
console.log('\n2 · adding a product, as a customer does\n');
{
  const { page, errors } = await openPhone(390, 746);

  const trayBefore = await page.$('section[aria-label="Votre sélection"]');
  check('the tray is absent while the pack is empty', trayBefore === null);

  // Tap the first product's "Ajouter" three times across two shelves, so the completion nudge has
  // something to say and the tier bar has somewhere to move.
  const clickAdd = async (groupId) => {
    const ok = await page.evaluate((id) => {
      const btn = [...document.querySelectorAll(`#${id} article button`)].find((b) =>
        (b.textContent || '').trim().startsWith('Ajouter')
      );
      if (!btn) return false;
      btn.click();
      return true;
    }, groupId);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 450)));
    return ok;
  };

  check('tapped Ajouter on a whey', await clickAdd('group-whey-proteine'));
  check('tapped Ajouter on a créatine', await clickAdd('group-creatine'));

  // Past the 520ms flight before asserting the clone is gone. The first version of this check waited
  // 450ms and failed — it was catching the animation MID-FLIGHT and calling it a leak. Asserting
  // that a thing has been cleaned up before it has finished doing its job is a broken test, not a
  // broken feature; the fix belongs here, not in packMotion.ts.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 900)));

  const after = await page.evaluate(() => {
    const tray = document.querySelector('section[aria-label="Votre sélection"]');
    const bar = document.querySelector('.pt-packbar');
    const chips = tray ? [...tray.querySelectorAll('button')].map((b) => b.textContent.trim()) : [];
    const badge = document.querySelector('#group-whey-proteine article .pt-pop');
    return {
      trayVisible: !!tray,
      thumbs: tray ? tray.querySelectorAll('li').length : 0,
      suggestions: chips.filter((c) => c && !c.startsWith('Retirer')).length,
      barText: bar ? bar.textContent.replace(/\s+/g, ' ').trim().slice(0, 130) : '',
      barH: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
      popBadge: !!badge,
      // A tile that is in the pack must look different from one that is not.
      selectedTiles: document.querySelectorAll('article[data-selected="true"]').length,
      // Orphaned flight clones would be `position: fixed` and would sit over the page forever.
      orphanClones: [...document.body.children].filter(
        (el) => el.tagName === 'IMG' && getComputedStyle(el).position === 'fixed'
      ).length,
    };
  });

  check('the tray appears once something is in the pack', after.trayVisible);
  check('it shows one thumbnail per product', after.thumbs === 2, `${after.thumbs} thumbnails`);
  check('it suggests categories that are still missing', after.suggestions > 0, `${after.suggestions} chips`);
  check('both added tiles render their selected state', after.selectedTiles === 2, `${after.selectedTiles}`);
  check('the quantity badge is on the tile', after.popBadge);
  check('the sticky bar stays one row', after.barH > 0 && after.barH < 130, `${after.barH}px`);
  check('no flight clone was left behind in the DOM', after.orphanClones === 0, `${after.orphanClones}`);
  console.log(`        bar: ${after.barText}`);

  check('no console errors or exceptions', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

// ── 3 · the chrome the owner asked to be rid of ─────────────────────────────────────────────
console.log('\n3 · the floating buttons are gone from THIS route only\n');
{
  const { page } = await openPhone(390, 746);
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
  const chrome = await page.evaluate(() => ({
    whatsapp: !!document.querySelector('a[aria-label*="WhatsApp"][class*="fixed"]'),
    backToTop: !!document.querySelector('[aria-label="Retour en haut"]'),
  }));
  check('no floating WhatsApp bubble on /pack-builder', !chrome.whatsapp);
  check('no back-to-top button on /pack-builder', !chrome.backToTop);
  await page.close();

  // …and it is still reachable everywhere else. Removing the only mobile path to the dominant
  // ordering channel would be a conversion bug wearing a layout fix as a disguise.
  const { page: home } = await openPhone(390, 746);
  await home.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await home.evaluate(() => new Promise((r) => setTimeout(r, 800)));
  const stillThere = await home.evaluate(
    () => !!document.querySelector('a[aria-label*="WhatsApp"][class*="fixed"]')
  );
  check('the WhatsApp bubble still exists on the homepage', stillThere);

  // Exact selector. `button[aria-expanded][aria-label]` matched the first such button in document
  // order, which on the homepage is a nav dropdown — so the sheet never opened and the check
  // reported a missing link that was actually there.
  const inMenu = await home.evaluate(async () => {
    const burger = document.querySelector('button[aria-label="Menu"]');
    if (!burger) return 'no-burger';
    burger.click();
    await new Promise((r) => setTimeout(r, 900));
    const found = [...document.querySelectorAll('a')].some((a) =>
      (a.textContent || '').includes('Commander sur WhatsApp')
    );
    return found ? 'found' : 'sheet-open-but-no-link';
  });
  check('WhatsApp now has a row in the mobile menu', inMenu === 'found', inMenu);
  await home.close();
}

await browser.close();

console.log(`\n${failures === 0 ? 'OK — all checks passed' : `${failures} FAILURE(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
