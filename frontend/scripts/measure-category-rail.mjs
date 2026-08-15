/**
 * DOES EVERY CATEGORY LABEL ACTUALLY FIT IN ITS CARD?
 *
 * ── WHY A GUARD FOR ONE LINE OF TEXT ─────────────────────────────────────────────────────────
 * "Acheter par objectif" is six photographs and six words. The words are the only part a visitor
 * reads, and one of them has now been reported clipped twice:
 *
 *     owner, 14/08/2026   "more responsive so they don't have the text squeezed"
 *     owner, 15/08/2026   "make the text not squeezing"  — with a screenshot showing PERFORMANC
 *
 * Both times the fix was arithmetic — padding, arrow size, font size against column width — and
 * both times it was done by eye. Arithmetic done by eye is arithmetic that regresses the next time
 * anyone touches the padding, which is exactly what happened between those two dates.
 *
 * ── WHAT "SQUEEZED" IS, MEASURABLY ───────────────────────────────────────────────────────────
 * `line-clamp-2` hides overflow rather than reporting it, so nothing throws and no status code
 * changes — the label simply stops mid-word and the page looks fine to every other check. Two
 * things are therefore measured directly on the label element:
 *
 *   scrollWidth > clientWidth      a single word wider than its box. `line-clamp` cannot help a
 *                                  word with no break opportunity, which is why PERFORMANCE fails
 *                                  where SANTÉ & VITALITÉ wraps happily.
 *   rendered lines > 2             more than `line-clamp-2` will show, i.e. text is being hidden.
 *
 * Widths are the phone end of measure-flash's matrix plus the two desktop steps where the column
 * count changes (sm: 3-up, xl: 6-up) — a label fits or does not fit as a function of column width,
 * and those are the widths where column width changes discontinuously.
 *
 *   node scripts/measure-category-rail.mjs --base http://localhost:3123
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

const bi = process.argv.indexOf('--base');
const BASE = bi !== -1 ? process.argv[bi + 1] : 'https://protein.tn';

/* 280 is the narrowest viewport in real traffic (a 320px phone at Android's largest display-size
   setting reports ~280 CSS px). 640 and 1280 are where the grid steps 2 -> 3 -> 6. */
const WIDTHS = [280, 320, 360, 390, 430, 640, 768, 1024, 1280, 1440];

const browser = await puppeteer.launch({
  ...(CHROME ? { executablePath: CHROME } : {}),
  headless: 'new',
  args: ['--no-sandbox'],
});

let failures = 0;
const fail = (m) => {
  console.log(`  FAIL  ${m}`);
  failures += 1;
};

console.log(`\n  ${BASE}  ·  "Acheter par objectif"\n`);
console.log('   width  tiles  cardW  capH  padL/padR/padB  widest label            clipped');
console.log('  ' + '─'.repeat(88));

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('#category-rail-heading', { timeout: 30000 }).catch(() => {});
  await page.evaluate(() =>
    document.querySelector('#category-rail-heading')?.scrollIntoView({ block: 'center' })
  );
  await page.evaluate(() => new Promise((r) => setTimeout(r, 900)));

  const m = await page.evaluate(() => {
    const heading = document.querySelector('#category-rail-heading');
    const band = heading?.closest('section');
    if (!band) return null;

    const grid = band.querySelector('ul');
    const tiles = grid ? [...grid.children] : [];
    if (tiles.length === 0) return { tiles: 0 };

    const labels = tiles.map((li) => {
      // The caption plate is the last flex child of the tile's link; the label is its <span>.
      const span = li.querySelector('a > div:last-child > span');
      if (!span) return null;
      const cs = getComputedStyle(span);
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const lines = Math.round(span.getBoundingClientRect().height / lineHeight);
      return {
        text: (span.textContent || '').trim(),
        // +1: sub-pixel text metrics routinely report a 0.5px overhang on a label that fits.
        clipped: span.scrollWidth > span.clientWidth + 1 || lines > 2,
        lines,
        w: Math.round(span.getBoundingClientRect().width),
      };
    }).filter(Boolean);

    const plate = tiles[0]?.querySelector('a > div:last-child');
    const ps = plate ? getComputedStyle(plate) : null;

    return {
      tiles: tiles.length,
      cardW: Math.round(tiles[0].getBoundingClientRect().width),
      capH: plate ? Math.round(plate.getBoundingClientRect().height) : 0,
      padL: ps?.paddingLeft ?? '?',
      padR: ps?.paddingRight ?? '?',
      padB: ps?.paddingBottom ?? '?',
      labels,
    };
  });

  await page.close();

  if (!m || !m.tiles) {
    fail(`${width}px · the rail is not on the page`);
    continue;
  }

  const clipped = m.labels.filter((l) => l.clipped);
  const widest = m.labels.reduce((a, b) => (b.w > a.w ? b : a), m.labels[0]);

  console.log(
    `  ${String(width).padEnd(6)} ${String(m.tiles).padEnd(6)} ${String(m.cardW).padEnd(6)} ` +
      `${String(m.capH).padEnd(5)} ${`${m.padL}/${m.padR}/${m.padB}`.padEnd(15)} ` +
      `${(widest?.text ?? '').slice(0, 22).padEnd(23)} ${clipped.length ? clipped.map((c) => c.text).join(', ') : '—'}`
  );

  if (clipped.length) {
    fail(`${width}px · ${clipped.length} label(s) cut off: ${clipped.map((c) => `"${c.text}"`).join(', ')}`);
  }
}

await browser.close();

console.log('');
if (failures > 0) {
  console.log(`measure-category-rail: ${failures} FAILURE(S)`);
  console.log('');
  console.log('A clipped label is invisible to every other check: `line-clamp-2` hides the overflow');
  console.log('rather than reporting it. The width available to the label is');
  console.log('    card − 2×padding − arrow − gap');
  console.log('so the dials are, in order of effect: the caption padding, the arrow size, the gap,');
  console.log('and the font size. See the note on the caption plate in CategoryRail.tsx.');
  process.exit(1);
}
console.log('measure-category-rail: clean — every label fits its card at every width.');
