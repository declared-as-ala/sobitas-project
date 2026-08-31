/**
 * How much of a phone the footer costs.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 * Owner, 20/08/2026: *"polish the footer on mobile, make it more clean and simple and optimised
 * and minimalistic."*
 *
 * "Minimalistic" is a claim about a number, and the number nobody could see was the footer's own
 * height: on a 390px phone it ran past 1,100px — nearly three viewports of links under every page
 * on the site, on the 81% of traffic that is mobile. Each column looked reasonable on its own;
 * only the total was wrong, which is exactly the class of defect a screenshot hides and a
 * measurement catches.
 *
 * Prints the footer's height and the height of each block inside it, at a phone and a desktop
 * width, so a change to one block cannot quietly grow the whole.
 *
 *   node scripts/measure-footer.mjs [base]
 */
import puppeteer from 'puppeteer';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const VIEWPORTS = [
  { w: 390, h: 844, label: 'phone 390' },
  { w: 1440, h: 900, label: 'desktop 1440' },
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
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise((r) => setTimeout(r, 3500));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 1500));

  const data = await page.evaluate(() => {
    const footer = document.querySelector('footer#contact');
    if (!footer) return null;
    const rows = [...footer.children].map((el) => ({
      h: Math.round(el.getBoundingClientRect().height),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 42),
    }));
    // Every link the footer exposes, so a collapse can be proven not to have removed any.
    const links = footer.querySelectorAll('a[href^="/"]').length;
    // A collapsed accordion must still be tappable: nothing under 44px on a phone.
    const small = [...footer.querySelectorAll('a,button')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 44;
      })
      .map((el) => `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '?').trim().slice(0, 22)}(${Math.round(el.getBoundingClientRect().height)}px)`);
    return {
      total: Math.round(footer.getBoundingClientRect().height),
      rows,
      links,
      small,
    };
  });

  if (!data) {
    console.log(`FAIL ${vp.label} — no <footer id="contact">`);
    bad++;
    await page.close();
    continue;
  }

  const screens = (data.total / vp.h).toFixed(2);
  console.log(`\n${vp.label}  footer ${data.total}px  (${screens} screens)  ${data.links} internal links`);
  data.rows.forEach((r) => console.log(`   ${String(r.h).padStart(5)}px  ${r.text}`));
  if (vp.w < 640 && data.small.length) {
    console.log(`   under 44px: ${data.small.join(', ')}`);
    bad++;
  }
  await page.close();
}

await browser.close();
console.log(bad ? `\nmeasure-footer — ${bad} issue(s).` : '\nmeasure-footer — clean.');
process.exit(bad ? 1 : 0);
