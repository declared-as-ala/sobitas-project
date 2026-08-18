/**
 * The homepage's vertical budget, band by band.
 *
 * Owner, 18/08/2026, having tightened the section spacing in DevTools and screenshotted the
 * result: *"this is how i want the website to look on desktop — measured sections spacings"*.
 *
 * A screenshot is a target, not a specification. This prints what each band actually costs — its
 * own height, and the GAP between it and the one before — so "tighter" becomes a number per band
 * instead of a feeling about the whole page, and so the next person can see which band regressed.
 *
 *   node scripts/measure-home.mjs http://localhost:3000
 */
import puppeteer from 'puppeteer';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const WIDTHS = [
  { w: 1920, h: 1000, label: '1920' },
  { w: 1536, h: 900, label: '1536 (1920 at 125% scaling — the owner’s screen)' },
  { w: 390, h: 844, label: '390 (phone)' },
];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

for (const { w, h, label } of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 180000 });
  /* Lazy sections mount on scroll; walk the page so every band exists before measuring. */
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 1200));

  const data = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const bands = [...main.children].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.height > 8;
    });
    const label = (el) => {
      const heading = el.querySelector('h1, h2');
      const t = heading ? heading.textContent.replace(/\s+/g, ' ').trim().slice(0, 34) : '';
      return t || `${el.tagName.toLowerCase()}.${(el.className || '').toString().trim().split(/\s+/)[0] || '?'}`;
    };
    const out = [];
    let prevBottom = null;
    for (const el of bands) {
      const r = el.getBoundingClientRect();
      const top = Math.round(r.top + window.scrollY);
      const bottom = Math.round(r.bottom + window.scrollY);
      const cs = getComputedStyle(el);
      out.push({
        name: label(el),
        h: Math.round(r.height),
        gap: prevBottom == null ? 0 : top - prevBottom,
        pt: Math.round(parseFloat(cs.paddingTop)),
        pb: Math.round(parseFloat(cs.paddingBottom)),
      });
      prevBottom = bottom;
    }
    return {
      page: Math.round(document.documentElement.scrollHeight),
      header: Math.round((document.querySelector('header')?.getBoundingClientRect().height) || 0),
      footer: Math.round((document.querySelector('footer')?.getBoundingClientRect().height) || 0),
      bands: out,
    };
  });

  console.log(`\n── ${label} ────────────────────────────────────────────────`);
  console.log(`   page ${data.page}px · header ${data.header}px · footer ${data.footer}px`);
  for (const b of data.bands) {
    console.log(
      `   ${String(b.h).padStart(5)}px  gap ${String(b.gap).padStart(3)}  pad ${String(b.pt).padStart(3)}/${String(b.pb).padEnd(3)}  ${b.name}`
    );
  }
  await page.close();
}

await browser.close();
