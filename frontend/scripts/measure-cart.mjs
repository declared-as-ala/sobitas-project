/**
 * How the cart drawer spends its vertical budget.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 * Owner, 18/08/2026: *"the bottom of it — why eating all of that height!"*. That is a measurable
 * claim and it was right: the footer was ~330px of a ~900px panel. The reason it got that way is
 * that nobody could see the number — every block in there looked reasonable on its own, and the
 * total only became obviously wrong in a screenshot.
 *
 * So this prints the split: header / scroller / footer, plus the height of one product row, at a
 * desktop and a phone width. Chrome is header+footer; the scroller is the only part that is
 * actually the shopper's basket.
 *
 *   node scripts/measure-cart.mjs [base]
 */
import puppeteer from 'puppeteer';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const VIEWPORTS = [
  { w: 1536, h: 864, label: 'desktop 1536x864' },
  { w: 390, h: 844, label: 'phone 390x844' },
];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

let bad = 0;

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h });
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 180000 });

  const added = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter((b) =>
      /ajouter au panier/i.test(b.textContent || '')
    );
    buttons.slice(0, 2).forEach((b) => b.click());
    return buttons.length;
  });
  if (!added) {
    console.log(`FAIL ${vp.label} — no add-to-cart button on the homepage`);
    bad++;
    await page.close();
    continue;
  }
  await new Promise((r) => setTimeout(r, 1200));

  const cart = (
    await page.evaluateHandle(
      () =>
        [...document.querySelectorAll('button')].find((b) =>
          /panier/i.test(b.getAttribute('aria-label') || '')
        ) || null
    )
  ).asElement();
  if (!cart) {
    console.log(`FAIL ${vp.label} — no cart trigger`);
    bad++;
    await page.close();
    continue;
  }
  /* In page context: the add-to-cart toast covers the header and puppeteer refuses a covered
     click. Same reason as check-overlay-contrast.mjs. */
  await page.evaluate((el) => el.click(), cart);
  await new Promise((r) => setTimeout(r, 1400));

  const m = await page.evaluate(() => {
    const panel = document.querySelector('[data-slot="drawer-content"]');
    if (!panel) return null;
    const h = (el) => (el ? Math.round(el.getBoundingClientRect().height) : 0);
    const header = panel.querySelector('[data-slot="drawer-header"]');
    const footer = panel.querySelector('[data-slot="drawer-footer"]');
    const scroller = panel.querySelector('.overflow-y-auto');
    const list = scroller?.firstElementChild;
    const row = list?.firstElementChild;
    const r = panel.getBoundingClientRect();
    return {
      panelH: Math.round(r.height),
      panelW: Math.round(r.width),
      bottomGap: Math.round(window.innerHeight - r.bottom),
      header: h(header),
      footer: h(footer),
      scroller: h(scroller),
      row: h(row),
      rows: list?.children.length || 0,
    };
  });

  if (!m) {
    console.log(`FAIL ${vp.label} — the drawer did not open`);
    bad++;
    await page.close();
    continue;
  }

  const chrome = m.header + m.footer;
  const pct = Math.round((chrome / m.panelH) * 100);
  console.log(
    `${vp.label}  panel ${m.panelW}x${m.panelH} (gap below: ${m.bottomGap})\n` +
      `    header ${m.header}  footer ${m.footer}  ->  chrome ${chrome} = ${pct}% of the panel\n` +
      `    scroller ${m.scroller}  row ${m.row}  (${Math.floor(m.scroller / Math.max(1, m.row))} rows visible)`
  );

  /* The drawer must fill the viewport — the `max-h` bug that left a transparent strip under it. */
  if (m.bottomGap > 1) {
    console.log(`    FAIL — ${m.bottomGap}px of page showing under the drawer`);
    bad++;
  }
  /* Chrome over 40% means the panel is mostly not the basket. */
  if (pct > 40) {
    console.log(`    FAIL — header+footer is ${pct}% of the drawer`);
    bad++;
  }
  await page.close();
}

await browser.close();
console.log(`\n${bad === 0 ? 'clean' : bad + ' failure(s)'}`);
process.exit(bad === 0 ? 0 : 1);
