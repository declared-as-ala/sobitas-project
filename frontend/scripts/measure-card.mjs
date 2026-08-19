/**
 * What the product card actually renders, at the widths that break it.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────────────────────
 * Owner, 18/08/2026: *"on my iPhone 13 the cards are super good, but on smaller screens the text
 * gets squeezed and trimmed — I don't want that."* An iPhone 13 is 390 CSS px; the phones below it
 * in real traffic are 375 (iPhone SE/8/12 mini), 360 (most Android) and 320 (small Android, and
 * any 360 phone at Android's largest display-size setting).
 *
 * Truncation is INVISIBLE to every other guard we have: `line-clamp` and `truncate` hide overflow
 * rather than reporting it, so a clipped name changes no status code, throws nothing, and looks
 * deliberate in a screenshot. The only way to see it is to compare scrollWidth against clientWidth
 * on the element itself, which is what this does.
 *
 *   node scripts/measure-card.mjs [base]
 */
import puppeteer from 'puppeteer';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const WIDTHS = [320, 360, 375, 390, 430, 640, 768, 1024, 1280, 1440, 1536, 1920];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

let bad = 0;
console.log(`\n  ${BASE}  ·  first card of #products\n`);
console.log('  width  cardW  cardH   imgW  imgH   name  price  cta      clipped');
console.log('  ' + '-'.repeat(78));

for (const w of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900, isMobile: w < 768 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 180000 });
  await page.evaluate(() => document.querySelector('#products')?.scrollIntoView({ block: 'center' }));
  await new Promise((r) => setTimeout(r, 900));

  const m = await page.evaluate(() => {
    const card = document.querySelector('#products article');
    if (!card) return null;
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const box = r(card);
    const img = card.querySelector('img');
    const imgWrap = img?.closest('div');
    const name = card.querySelector('h3');
    const brand = card.querySelector('span.truncate');
    const price = [...card.querySelectorAll('span')].find((s) => /DT\s*$/.test(s.textContent || '') && /text-xl|text-2xl/.test(s.className));
    const cta = card.querySelector('button:last-of-type, a[href*="panier"]');
    const clipped = [];
    /* scrollWidth > clientWidth is the ONLY signal a `truncate` gives. `line-clamp` needs the
       height comparison instead — an ellipsised second line is scrollHeight > clientHeight. */
    for (const el of card.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const t = (el.textContent || '').trim();
      if (!t) continue;
      if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) clipped.push(t.slice(0, 28));
      if (cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1) clipped.push('[clamp] ' + t.slice(0, 24));
    }
    const nameBox = r(name);
    return {
      cardW: Math.round(box.width), cardH: Math.round(box.height),
      imgW: imgWrap ? Math.round(r(imgWrap).width) : 0,
      imgH: imgWrap ? Math.round(r(imgWrap).height) : 0,
      nameSize: name ? Math.round(parseFloat(getComputedStyle(name).fontSize)) : 0,
      nameW: nameBox ? Math.round(nameBox.width) : 0,
      priceSize: price ? Math.round(parseFloat(getComputedStyle(price).fontSize)) : 0,
      ctaH: cta ? Math.round(r(cta).height) : 0,
      brandTxt: brand ? brand.textContent.trim().slice(0, 18) : '',
      clipped,
    };
  });

  if (!m) {
    console.log(`  ${String(w).padEnd(6)} NO CARD`);
    bad++;
    await page.close();
    continue;
  }
  const clip = m.clipped.length ? `${m.clipped.length}: ${m.clipped.join(' | ').slice(0, 44)}` : '—';
  if (m.clipped.length) bad++;
  console.log(
    `  ${String(w).padEnd(6)} ${String(m.cardW).padEnd(6)} ${String(m.cardH).padEnd(7)}` +
      ` ${String(m.imgW).padEnd(5)} ${String(m.imgH).padEnd(6)}` +
      ` ${String(m.nameSize + 'px').padEnd(6)} ${String(m.priceSize + 'px').padEnd(6)} ${String(m.ctaH).padEnd(8)} ${clip}`
  );
  await page.close();
}

await browser.close();
console.log(`\n  ${bad === 0 ? 'no clipped text' : bad + ' width(s) clip text'}\n`);
process.exit(bad === 0 ? 0 : 1);
