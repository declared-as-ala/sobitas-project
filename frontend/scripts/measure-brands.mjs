/**
 * /brands, measured: how tall it is, how wide its rail runs, how much of it is DOM, and how much
 * of the document is painted dark.
 *
 * ── WHY THIS PAGE GOT ITS OWN SCRIPT ────────────────────────────────────────────────────────
 * Owner, 19/08/2026: *"the brands page looks glorious, disgusting … there is a lot of white
 * space. We are not using any black things in it."*
 *
 * Two of those three are numbers, and both were worse than they looked:
 *
 *     document height     81,851px @390   ·   40,207px @1536
 *     content rail        1,024px inside a 1,536px viewport (67%)
 *     DOM nodes           11,952
 *     HTML, raw           1,622,455 bytes (live production, 19/08/2026)
 *
 * The cause was the pattern, not the padding: 589 aspect-square logo cards for a catalogue where
 * only 57 brands have a logo, so 90% of the grid was an empty cell with a placeholder glyph.
 * See BrandDirectory.tsx for the full reading.
 *
 * The third ask — "no black things" — is measured here too, because it has a ceiling. tokens.css
 * v6 caps dark surfaces at roughly 12% of painted area above the footer, and a redesign that
 * answers "use more black" by exceeding it recreates the v5 page the owner said hurt to look at.
 * `dark share` below is the number that keeps both halves of that honest.
 *
 * Cache OFF, for the reason measure-card.mjs documents: run against production right after a
 * deploy and a warm cache renders the new HTML with the previous build's CSS, which reads as a
 * regression that does not exist.
 *
 *   node scripts/measure-brands.mjs [base]
 */
import puppeteer from 'puppeteer';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const WIDTHS = [390, 1536];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

console.log(`\n  ${BASE}/brands\n`);

let failures = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });

  const response = await page.goto(`${BASE}/brands`, { waitUntil: 'networkidle0', timeout: 90000 });
  const html = await response.text();
  await new Promise((r) => setTimeout(r, 800));

  const m = await page.evaluate(() => {
    const doc = document.documentElement.scrollHeight;
    const viewport = document.documentElement.clientWidth;

    const bands = [...document.querySelectorAll('[data-band]')].map((band) => {
      const rail = band.querySelector(':scope > div');
      return {
        height: Math.round(band.getBoundingClientRect().height),
        rail: rail ? Math.round(rail.getBoundingClientRect().width) : 0,
        label:
          (band.querySelector('h1, h2, h3')?.textContent || '').trim().slice(0, 32) ||
          '(no heading)',
      };
    });

    // Every `.pt-slab` object on the page, as a share of the whole document's area. The footer is
    // excluded by the same rule tokens.css states — it is allowed to be dark and always is.
    const darkArea = [...document.querySelectorAll('.pt-slab')]
      .filter((el) => !el.closest('footer'))
      .reduce((sum, el) => {
        const r = el.getBoundingClientRect();
        return sum + r.width * r.height;
      }, 0);

    return {
      doc,
      viewport,
      bands,
      darkShare: (100 * darkArea) / (doc * viewport),
      nodes: document.querySelectorAll('*').length,
      links: document.querySelectorAll('a[href]').length,
      rows: document.querySelectorAll('a.pt-brand-row').length,
      stockDots: document.querySelectorAll('.pt-brand-row__dot').length,
      plates: document.querySelectorAll('.pt-plate').length,
      brokenImages: [...document.querySelectorAll('img')].filter(
        (i) => i.complete && i.naturalWidth === 0
      ).length,
      // A page that scrolls sideways on a phone is the one layout fault a height number hides.
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  console.log(`  @${width}`);
  console.log(`    document      ${m.doc.toLocaleString('en-US')}px`);
  console.log(`    HTML          ${(html.length / 1024).toFixed(0)} KB raw`);
  console.log(`    DOM           ${m.nodes.toLocaleString('en-US')} nodes · ${m.links} links`);
  console.log(
    `    directory     ${m.rows} rows · ${m.stockDots} in stock · ${m.plates} logo plates`
  );
  console.log(`    dark share    ${m.darkShare.toFixed(1)}%  (tokens.css v6 ceiling ~12%)`);
  for (const band of m.bands) {
    console.log(
      `      ${String(band.height).padStart(6)}px  rail ${String(band.rail).padStart(5)}  ${band.label}`
    );
  }

  if (m.overflow > 0) {
    console.log(`    FAIL          scrolls sideways by ${m.overflow}px`);
    failures += 1;
  }
  if (m.brokenImages > 0) {
    console.log(`    FAIL          ${m.brokenImages} broken image(s)`);
    failures += 1;
  }
  if (m.darkShare > 12) {
    console.log(`    FAIL          dark share ${m.darkShare.toFixed(1)}% over the 12% ceiling`);
    failures += 1;
  }
  console.log('');

  await page.close();
}

await browser.close();
if (failures > 0) {
  console.log(`  ${failures} failure(s)\n`);
  process.exit(1);
}
console.log('  clean\n');
