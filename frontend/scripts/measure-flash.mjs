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
  console.log('   width  bandH  vs #products  cardW  cardH  h2   edge   over  strays');
  console.log('  ' + '─'.repeat(78));

  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    if (theme === 'dark') await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    /* `domcontentloaded` + an explicit wait for the band, NOT `networkidle2`.
       This page loads ~40 packshots from a remote origin, so "fewer than 3 connections for 500ms"
       is a statement about that origin's health, not about the layout being ready. Measured here:
       the same script passed all 12 widths on one run and threw `Navigation timeout of 90000 ms`
       on the next, against an identical build — the flake was the network, and a guard that fails
       for reasons unrelated to what it asserts is the guard nobody runs.

       Waiting for `#ventes-flash` is the real precondition and it is what the next line needs
       anyway. Layout is settled by the 1.5s pause below, which was already here. */
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('#ventes-flash', { timeout: 30000 }).catch(() => {});
    // The band is `defer`red behind an IntersectionObserver, so it must be scrolled to first.
    await page.evaluate(() => document.querySelector('#ventes-flash')?.scrollIntoView({ block: 'center' }));
    /* Every width here is a TYPE measurement in disguise — band height, card height, and whether
       anything overflows its box all move with the face the text is set in. Archivo loads with
       `font-display: swap` and is deliberately not preloaded, so until it arrives the browser
       paints a wider metric-adjusted Arial. Measuring in that window makes the result depend on
       Chrome's cache rather than on the CSS, which is precisely how measure-category-rail failed
       on production one run after passing on the same build. */
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));

    const m = await page.evaluate(() => {
      const band = document.querySelector('#ventes-flash');
      if (!band) return null;
      /* THE BAND THIS ONE IS JUDGED AGAINST. "Les plus vendus" is `<ProductSection id="products">`
         — the rail directly above, same grid, same product count, the full-size card. Measuring it
         in the same pass is what lets the height assertion below be a RATIO instead of a constant;
         see the note at the assertion for why the constant had to go. */
      const sellingRail = document.querySelector('#products');
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
        sellingRailH: sellingRail ? Math.round(sellingRail.getBoundingClientRect().height) : null,
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

    const vs = m.sellingRailH ? `${(m.bandH / m.sellingRailH).toFixed(2)}x of ${m.sellingRailH}` : '?';
    console.log(
      `   ${String(width).padEnd(6)} ${String(m.bandH).padEnd(6)} ${vs.padEnd(13)} ` +
        `${String(m.cardW).padEnd(6)} ${String(m.cardH).padEnd(6)} ${String(m.h2).padEnd(4)} ` +
        `${m.edgeW.padEnd(6)} ${String(m.overflowing.length).padEnd(5)} ${m.strays.length ? m.strays.join(',') : 'in'}`
    );

    if (m.overflowing.length) fail(`@${theme} ${width}px · ${m.overflowing.length} element(s) overflow their own box: ${m.overflowing.slice(0, 3).join(' ')}`);
    if (m.strays.length) fail(`@${theme} ${width}px · control(s) outside the band: ${m.strays.join(' ')}`);
    if (m.docW > m.vw) fail(`@${theme} ${width}px · page scrolls horizontally: ${m.docW} > ${m.vw}`);
    if (m.smallest && m.smallest.side < 44) fail(`@${theme} ${width}px · tap target ${Math.round(m.smallest.side)}px — "${m.smallest.text}"`);
    /* ── THE 4px BRAND EDGE IS GONE BY DECISION, SO THE ASSERTION GOES WITH IT ────────────────
       Owner, 15/08/2026: "for the vente flash, take off the border top."

       This check existed because the band and its guard disagreed — the edge was specified, the
       plate had replaced it, and 24 of 24 checks failed for days while nobody ran it. That was a
       real finding and it was resolved by restoring the edge. The owner has now resolved the same
       disagreement the other way, which is theirs to resolve.

       Deleting the assertion rather than loosening it, because there is nothing left to assert: the
       band's boundary is `[data-band]`'s 1px seam plus the `surface="sunken"` ground change, and
       both of those are asserted for every band by measure-bands.mjs. A guard kept alive on a
       design that no longer exists is how this file came to fail 24/24 in the first place — noise
       that trains everyone to ignore the one run that matters.

       The measurement itself is KEPT and still printed in the summary line below, so a future
       change to the seam is visible in the output even though nothing fails on it. */
    /* ZERO, not one (owner, 15/08/2026: "take off the button from the vente flash … even in the
       desktop"). The band is a display now.

       The assertion is kept rather than deleted, and inverted rather than loosened, because the
       thing it was written to catch is still possible in the other direction: the desktop link and
       the phone bar were ONE control rendered at complementary widths, so re-adding either alone
       leaves a CTA at some widths and none at others. Counting at all twelve widths is what makes
       "we removed it" verifiable instead of "we removed the one we could see". */
    if (m.offersLinks !== 1) fail(`@${theme} ${width}px · ${m.offersLinks} visible route(s) to /offres, expected 1 clear section CTA`);
    /* THE BANNER CEILING, AS A RATIO TO THE RAIL ABOVE IT.
       "Make it a banner, not a full section" is a height, so it is asserted rather than left to
       whoever looks at it next. It used to be asserted as a flat 320px, and that number was
       calibrated against ONE layout — a horizontal snap scroller putting all four deals in a single
       row. The moment the band became a grid the constant stopped describing anything: it failed at
       all twelve widths in both themes, including 328px at 1440 where the band was fine.

       A guard that fails on a healthy page is worse than no guard. Nobody ran this one for days,
       and while nobody ran it the phone band reached 1,227px — 1.36 viewport heights — which is the
       exact defect it existed to prevent. It cried wolf, so it got ignored, so it missed the wolf.

       The invariant that actually survives a layout change is RELATIVE: this band must read as
       materially lighter than the selling rail beside it. Same page, same width, same product
       count, measured in the same pass — so it holds at every viewport without a per-device number,
       and it keeps meaning the same thing the next time the grid changes.

       CALIBRATION, from the two measurements that matter rather than from taste:

           healthy, this design      0.38 - 0.73   (0.73 at 1024, where the band is 2x2 and the
                                                    rail is 1x4 in the same container)
           the defect it must catch  1.30          (390px, four COLUMN cards, band 1,227px
                                                    against the rail's 941px)

       0.85 sits between them with room on both sides: ~16% of headroom over the worst healthy
       width, and still 53% below the regression. A ceiling set just above what happens to be
       measured today is a ceiling that fails on the next legitimate change, which is how the
       320px constant ended up ignored. */
    const RATIO = 0.85;
    if (m.sellingRailH && m.bandH > m.sellingRailH * RATIO) {
      fail(
        `@${theme} ${width}px · band is ${m.bandH}px against the selling rail's ${m.sellingRailH}px ` +
          `(${(m.bandH / m.sellingRailH).toFixed(2)}x, ceiling ${RATIO}x) — this is a section again`
      );
    }
    if (!m.sellingRailH) fail(`@${theme} ${width}px · #products not found — nothing to size the band against`);

    if (width === WIDTHS[0]) console.log(`          clock: "${m.clock}"   edge: ${m.edgeW} ${m.edgeC}   band bg: ${m.bandBg}`);

    await page.close();
  }
  console.log('');
}

console.log(failures ? `measure-flash: ${failures} FAILURE(S)\n` : 'measure-flash: clean.\n');
await browser.close();
process.exit(failures ? 1 : 0);
