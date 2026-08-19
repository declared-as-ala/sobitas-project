/**
 * The height of /qui-sommes-nous, /contact and the footer, band by band.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────────────────────
 * Owner, 19/08/2026: *"redesign the qui sommes nous page entirely … same for the contact page …
 * and redesign the footer, polish it and upgrade it, make it not that height too much, use the
 * full width of the page."*
 *
 * Three of those four asks are numbers — height, and how much of the viewport the content rail
 * actually uses — and the fourth (polish) is the one a screenshot can judge. So this reports the
 * two numbers and leaves the taste to the eye:
 *
 *   - the document height, and the footer's share of it
 *   - the RAIL width of every band, against the viewport, because "use the full width" is a claim
 *     about `max-w-*` and the About page was on `max-w-4xl` (896px) inside a 1536px window
 *
 * Cache OFF for the same reason measure-card.mjs disables it: run against production right after
 * a deploy, a warm cache renders the new HTML with the previous build's CSS and the tool reports
 * a regression that does not exist.
 *
 *   node scripts/measure-pages.mjs [base]
 */
import puppeteer from 'puppeteer';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const ROUTES = ['/qui-sommes-nous', '/contact'];
const WIDTHS = [390, 1536];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

console.log(`\n  ${BASE}\n`);

for (const route of ROUTES) {
  for (const w of WIDTHS) {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width: w, height: 900, isMobile: w < 768 });
    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 180000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 900));

    const m = await page.evaluate(() => {
      const doc = Math.round(document.documentElement.scrollHeight);
      const footer = document.querySelector('footer');
      const bands = [...document.querySelectorAll('main [data-band], main section')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => {
          const r = el.getBoundingClientRect();
          // The RAIL is the widest block child that carries a max-width — what the reader sees as
          // the content edge, not the band's own full-bleed box.
          const rail = el.querySelector(':scope > div');
          const h2 = el.querySelector('h1, h2');
          return {
            h: Math.round(r.height),
            rail: rail ? Math.round(rail.getBoundingClientRect().width) : Math.round(r.width),
            label: (h2?.textContent || el.getAttribute('aria-label') || '—').trim().slice(0, 26),
          };
        })
        .filter((b) => b.h > 8);
      return {
        doc,
        footerH: footer ? Math.round(footer.getBoundingClientRect().height) : 0,
        bands,
      };
    });

    const pct = m.doc ? Math.round((m.footerH / m.doc) * 100) : 0;
    console.log(`  ${route}  @${w}`);
    console.log(`    document ${m.doc}px   ·   footer ${m.footerH}px (${pct}%)`);
    for (const b of m.bands) {
      console.log(`      ${String(b.h).padStart(5)}px  rail ${String(b.rail).padStart(5)}px  ${b.label}`);
    }
    console.log('');
    await page.close();
  }
}

await browser.close();
