/**
 * Finds DOUBLE SEPARATORS — two horizontal rules stacked with nothing but empty space between them.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 * Owner, 17/08/2026, on the phone view of the product page: *"why double separators between the
 * sections! read the separators and don't do double separators that make a big white space that no
 * needed"*.
 *
 * It is a defect that is almost impossible to catch by reading code, because neither rule is wrong
 * on its own. A full-bleed band draws `border-y` so it is closed at both ends; the band above it
 * does the same; the layout gap sits between them. Each component is correct in isolation and the
 * page grows a 33px seam with two lines in it. The only way to see it is to look at the RENDERED
 * geometry of every element at once, which is what this does.
 *
 * ── WHAT COUNTS AS A RULE, AND WHY THE BAR IS SO HIGH ──────────────────────────────────────
 * A visible top or bottom border on a FULL-BLEED element — one that spans the viewport edge to
 * edge. That narrowness is deliberate and was arrived at by running the loose version first, which
 * reported seventeen "defects" of which fourteen were a list of product cards: two stacked cards
 * with a 12px gap genuinely do put two borders 12px apart, and that is a card list, not a seam.
 *
 * The complaint is about BANDS. A band is the thing that reaches both screen edges and therefore
 * reads as a division of the page rather than as an object sitting on it, and two of those in a
 * row is the only arrangement where the reader sees a thick empty stripe with two lines in it.
 *
 * Three further exclusions, each for a false positive the loose version produced:
 *   - a pair drawn by the SAME element (a bordered input is a box, not two seams);
 *   - anything inside a `<table>` (a bordered table draws a rule per row, by design);
 *   - a pair with text rendering between them (a heading with a rule above and below is a design).
 *
 *   node scripts/check-seams.mjs http://localhost:3000 /whey-proteine/some-product
 */
import puppeteer from 'puppeteer';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const ROUTE = process.argv[3] || '/';
const WIDTHS = [390, 768];

/* 48px: two rules further apart than this read as two sections with air between them, which is a
   layout. Closer than this and the eye reads one thick seam. */
const GAP = 48;

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

let failures = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE + ROUTE, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => window.scrollTo(0, 0));

  const doubles = await page.evaluate((gap) => {
    const rules = [];
    const texts = [];

    const visible = (cs) => cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';

    let uid = 0;
    for (const el of document.querySelectorAll('main *, footer *')) {
      if (el.closest('table')) continue;
      const cs = getComputedStyle(el);
      if (!visible(cs)) continue;
      const r = el.getBoundingClientRect();
      /* FULL BLEED ONLY — see the docblock. 2px of slack for sub-pixel layout. */
      if (r.width < window.innerWidth - 2 || r.height === 0) continue;

      const id = ++uid;
      const label = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`;
      const top = parseFloat(cs.borderTopWidth);
      const bottom = parseFloat(cs.borderBottomWidth);
      const y = window.scrollY;
      if (top > 0 && cs.borderTopStyle !== 'none') rules.push({ y: Math.round(r.top + y), edge: 'top', label, id });
      if (bottom > 0 && cs.borderBottomStyle !== 'none') rules.push({ y: Math.round(r.bottom + y), edge: 'bottom', label, id });
    }

    /* Every text node's vertical extent, so a pair of rules with a heading between them is not
       reported. Range.getClientRects() is used rather than the parent element's box because the
       parent of a one-line heading is often a padded wrapper that spans the whole seam. */
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.height === 0 || r.width === 0) continue;
        texts.push({ top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) });
      }
    }

    rules.sort((a, b) => a.y - b.y);
    const out = [];
    for (let i = 1; i < rules.length; i++) {
      const a = rules[i - 1];
      const b = rules[i];
      const d = b.y - a.y;
      if (d <= 0 || d > gap) continue;
      /* A box is not two seams. */
      if (a.id === b.id) continue;
      const hasText = texts.some((t) => t.top >= a.y - 2 && t.bottom <= b.y + 2);
      if (hasText) continue;
      out.push({ gap: d, a: `${a.label} (${a.edge})`, b: `${b.label} (${b.edge})`, y: a.y });
    }
    return out;
  }, GAP);

  console.log(`\n── ${width}px ${ROUTE} ──`);
  if (doubles.length === 0) {
    console.log('   no double separators');
  } else {
    failures += doubles.length;
    for (const d of doubles) {
      console.log(`   FAIL y=${d.y} — ${d.gap}px of nothing between two rules`);
      console.log(`        ${d.a}`);
      console.log(`        ${d.b}`);
    }
  }
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'clean' : failures + ' double separator(s)'}`);
process.exit(failures === 0 ? 0 : 1);
