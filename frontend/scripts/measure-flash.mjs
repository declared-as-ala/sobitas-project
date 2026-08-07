#!/usr/bin/env node
/**
 * What the Ventes Flash band actually measures, at the widths a phone actually is.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────
 * The owner reported three things from screenshots — a clipped CTA, "bad background / isolation",
 * bad mobile responsiveness — and a screenshot cannot tell you WHICH box overflowed or by how many
 * pixels. Every number below is read off the live DOM.
 *
 * ── AND WHY ITS FIRST VERSION WAS PART OF THE PROBLEM ──────────────────────────────────────
 * v1 compared `headRow.scrollWidth` against its PARENT's border box, which is 32-40px wider than
 * the row's own content box. At 360px the row overflowed its 294px box by 27px and the check
 * evaluated `321 > 327` = false — it printed PASS while "Tout voir" was 10px past the edge and
 * being sliced off. A bound the defect satisfies is not a test.
 *
 * It also relied on `document.scrollWidth > innerWidth` as a backstop, which can never fire here:
 * the plate was `overflow-hidden`, so it ATE the spill rather than propagating it. That is the
 * general trap — a container that hides its overflow also hides it from the guard.
 *
 * v2 therefore asserts the thing that cannot be concealed: EVERY element inside the band must fit
 * its own scroll box, with the horizontal rail (which is legitimately scrollable) named as the one
 * allowed exception.
 */
import puppeteer from 'puppeteer';
import { existsSync } from 'node:fs';

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

const bi = process.argv.indexOf('--base');
const BASE = bi !== -1 ? process.argv[bi + 1] : 'https://protein.tn';
/* 280 is in the matrix because it is the narrowest viewport in real traffic (a 320px phone at
   Android's largest display-size setting reports ~280 CSS px), and because the clip this script
   was written for got 40px worse for every 40px of width removed. */
const WIDTHS = [280, 320, 360, 390, 430, 540, 640, 768, 1024, 1280, 1440, 1920];
const THEMES = ['light', 'dark'];

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

console.log(`\n  ${BASE}  ·  #ventes-flash\n`);

for (const theme of THEMES) {
  console.log(`  ═══ ${theme.toUpperCase()} ═══`);
  console.log('   width  bandH  screens  cardW  cardH  h2   edge   over  strays');
  console.log('  ' + '─'.repeat(74));

  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    if (theme === 'dark') await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 90000 });
    // The band is `defer`red behind an IntersectionObserver, so it must be scrolled to first.
    await page.evaluate(() => document.querySelector('#ventes-flash')?.scrollIntoView({ block: 'center' }));
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));

    const m = await page.evaluate(() => {
      const band = document.querySelector('#ventes-flash');
      if (!band) return null;
      const rail = band.querySelector('ul[role="list"]');
      const cards = rail ? [...rail.children] : [];
      const h2 = band.querySelector('h2');

      /* THE ASSERTION THAT CANNOT BE CONCEALED. Anything whose content is wider than its own box
         is either clipped or scrolling.
         TWO EXEMPTIONS, and both are the guard's own bug rather than the page's — v2 shipped
         without them and reported 38 failures against a band that was measuring correctly:
           - the RAIL is a horizontal scroller. Scrolling is its job.
           - `.sr-only` is `position:absolute` in a 1x1px box with `overflow:hidden`, so its content
             is ALWAYS wider than its box by construction. Flagging it is flagging the technique. */
      const overflowing = [...band.querySelectorAll('*')]
        .filter((el) => el !== rail && !rail?.contains(el))
        .filter((el) => !el.classList.contains('sr-only') && !el.closest('.sr-only'))
        .filter((el) => el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 1)
        .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}(+${el.scrollWidth - el.clientWidth})`);

      /* Every link/button OUTSIDE the rail must sit inside the band's own content box. This is the
         check that catches the reported bug — the old "Tout voir" lived in the header and sat 50px
         past the edge — and the rail is excluded because a card scrolled out of view is the whole
         point of a rail, not a defect. */
      const bandRect = band.getBoundingClientRect();
      const strays = [...band.querySelectorAll('a, button')]
        .filter((el) => !rail?.contains(el))
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.right > bandRect.right + 1 || r.left < bandRect.left - 1)
        .map(({ el, r }) => `${(el.textContent || '').trim().slice(0, 18)}(${Math.round(r.right - bandRect.right)})`);

      /* Tap targets: the rail's cards ARE measured, because a 36px add-to-cart is a defect wherever
         it lives — but only the ones currently laid out inside the rail's visible width, since a
         card scrolled out of view still reports its full box. */
      const smallest = [...band.querySelectorAll('a, button')]
        .filter((el) => el.offsetParent !== null && el.getClientRects().length > 0)
        .map((el) => ({
          side: Math.min(el.getBoundingClientRect().width, el.getBoundingClientRect().height),
          text: (el.textContent || el.getAttribute('aria-label') || '?').trim().replace(/\s+/g, ' ').slice(0, 22),
        }))
        .filter((t) => t.side > 0)
        .sort((a, b) => a.side - b.side)[0];

      const cs = getComputedStyle(band);
      /* HEIGHT IS THE OWNER'S ACTUAL COMPLAINT: "make it a banner, not a full section — just a
         small part of the landing page." That is a number, so it gets measured rather than judged.
         `screens` expresses it the way it is experienced: how much of the viewport this one
         promotion occupies. Anything at or above 1.0 IS a full section by definition. */
      return {
        bandH: Math.round(bandRect.height),
        screens: +(bandRect.height / window.innerHeight).toFixed(2),
        cardH: cards[0] ? Math.round(cards[0].getBoundingClientRect().height) : null,
        bandW: Math.round(bandRect.width),
        railW: rail ? Math.round(rail.getBoundingClientRect().width) : null,
        cards: cards.length,
        cardW: cards[0] ? Math.round(cards[0].getBoundingClientRect().width) : null,
        h2: h2 ? Math.round(parseFloat(getComputedStyle(h2).fontSize)) : null,
        edgeW: cs.borderTopWidth,
        edgeC: cs.borderTopColor,
        bandBg: cs.backgroundColor,
        overflowing,
        strays,
        smallest,
        /* THE ROUTE TO /offres MUST EXIST AT EVERY WIDTH, in exactly one place.
           SectionHeader hides its view-all below `sm` — that is what makes the clip impossible —
           so the phone's link is a separate `sm:hidden` bar at the foot of the band. Two controls
           that hide on opposite sides of one breakpoint is precisely the arrangement where a
           mistuned breakpoint leaves a width with NEITHER, and nothing else here would notice:
           every other assertion in this file is about things being too big, and a missing link is
           the one defect that makes them all pass. */
        offersLinks: [...band.querySelectorAll('a[href="/offres"]')].filter(
          (a) => a.getClientRects().length > 0 && a.offsetParent !== null
        ).length,
        // A "flash" clock that is really a date should not be ticking.
        clock: (band.querySelector('.pt-slab')?.textContent || '').replace(/\s+/g, ' ').trim(),
        docW: Math.round(document.documentElement.scrollWidth),
        vw: window.innerWidth,
      };
    });

    if (!m) {
      fail(`@${theme} ${width}px · #ventes-flash not found`);
      await page.close();
      continue;
    }

    console.log(
      `   ${String(width).padEnd(6)} ${String(m.bandH).padEnd(6)} ${String(m.screens).padEnd(8)} ` +
        `${String(m.cardW).padEnd(6)} ${String(m.cardH).padEnd(6)} ${String(m.h2).padEnd(4)} ` +
        `${m.edgeW.padEnd(6)} ${String(m.overflowing.length).padEnd(5)} ${m.strays.length ? m.strays.join(',') : 'in'}`
    );

    if (m.overflowing.length) fail(`@${theme} ${width}px · ${m.overflowing.length} element(s) overflow their own box: ${m.overflowing.slice(0, 3).join(' ')}`);
    if (m.strays.length) fail(`@${theme} ${width}px · control(s) outside the band: ${m.strays.join(' ')}`);
    if (m.docW > m.vw) fail(`@${theme} ${width}px · page scrolls horizontally: ${m.docW} > ${m.vw}`);
    if (m.smallest && m.smallest.side < 44) fail(`@${theme} ${width}px · tap target ${Math.round(m.smallest.side)}px — "${m.smallest.text}"`);
    if (m.edgeW !== '4px') fail(`@${theme} ${width}px · band edge is ${m.edgeW}, expected 4px (the brand rule lost to the [data-band] seam)`);
    if (m.offersLinks !== 1) fail(`@${theme} ${width}px · ${m.offersLinks} visible route(s) to /offres, expected exactly 1`);
    /* THE BANNER CEILING. "Make it a banner, not a full section" is a height, so it is asserted as
       one rather than left to whoever looks at it next.
       320px against a measured 224-262px: enough headroom for a product name wrapping to a third
       line or a fifth deal, nowhere near enough to let the vertical card back in (that measured
       453-458px band) or to re-add a row of chrome. Absolute pixels, not a fraction of the
       viewport, because the test viewport is 900px tall and a real phone is 700-850 — a ratio here
       would quietly mean something different on every device. */
    if (m.bandH > 320) fail(`@${theme} ${width}px · band is ${m.bandH}px — over the 320px banner ceiling, this is a section again`);

    if (width === WIDTHS[0]) console.log(`          clock: "${m.clock}"   edge: ${m.edgeW} ${m.edgeC}   band bg: ${m.bandBg}`);

    await page.close();
  }
  console.log('');
}

console.log(failures ? `measure-flash: ${failures} FAILURE(S)\n` : 'measure-flash: clean.\n');
await browser.close();
process.exit(failures ? 1 : 0);
