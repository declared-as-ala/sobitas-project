/**
 * Prove the card hover actually swaps the packshot, in a real browser.
 *
 * Static HTML cannot answer this: the category grid hydrates client-side, so the second <Image>
 * does not exist in the SSR response even when the API is returning hover_image correctly. The
 * owner has reported this broken twice, so it gets measured rather than asserted.
 *
 * The check is deliberately about PIXELS, not classes: it reads the computed opacity of the hover
 * layer before and after a real mouse move. A class can be present and still never paint.
 */
import puppeteer from 'puppeteer';

const URLS = process.argv.slice(2);
if (URLS.length === 0) {
  console.error('usage: node verify-hover.mjs <url> [url...]');
  process.exit(2);
}

/*
 * Falls back to a system Chrome. Puppeteer's own download host is unreachable from this
 * environment, and an audit that cannot run is an audit nobody trusts — CHROME_PATH lets CI keep
 * using the bundled browser while a developer machine uses the one already installed.
 */
const executablePath = process.env.CHROME_PATH || undefined;

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

let anyFail = false;

for (const url of URLS) {
  const page = await browser.newPage();
  // A real desktop viewport. The hover layer is deliberately gated on `[@media(hover:hover)]`, so
  // a touch-emulating viewport would correctly show nothing and prove the opposite of what we want.
  await page.setViewport({ width: 1440, height: 900, hasTouch: false });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
    // Cards arrive after hydration on some of these routes.
    await page.waitForSelector('article', { timeout: 30_000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));

    /*
     * TWO THINGS THIS TEST GOT WRONG THE FIRST TIME, both of which produce a false BROKEN:
     *
     * 1. A dispatched MouseEvent DOES NOT TRIGGER CSS :hover. Only a real pointer position does, so
     *    the move has to go through page.hover() / the CDP mouse, not element.dispatchEvent().
     * 2. Headless Chrome can report `(hover: none)`, and the hover layer is deliberately gated on
     *    `@media (hover: hover)` so a phone's emulated tap-hover cannot swap the image. If the test
     *    browser claims no hover capability, the CSS is correct to do nothing and the run proves
     *    nothing — so it is reported rather than silently failed.
     */
    const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);

    const found = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('article')];
      let idx = -1;
      let total = 0;
      cards.forEach((c, i) => {
        const hov = [...c.querySelectorAll('img')].some((im) => im.getAttribute('aria-hidden') === 'true');
        if (hov) { total++; if (idx < 0) idx = i; }
      });
      return { cards: cards.length, withHoverLayer: total, idx };
    });

    let report = { ...found, canHover, tested: null };

    if (found.idx >= 0) {
      const sel = `article:nth-of-type(${found.idx + 1})`;
      const before = await page.evaluate((s) => {
        const el = document.querySelector(s)?.querySelector('img[aria-hidden="true"]');
        return el ? getComputedStyle(el).opacity : null;
      }, sel);

      // A REAL pointer move. This is the part element.dispatchEvent() cannot do.
      await page.hover(sel).catch(() => {});
      await new Promise((r) => setTimeout(r, 700));

      report.tested = await page.evaluate((s) => {
        const card = document.querySelector(s);
        const hover = card?.querySelector('img[aria-hidden="true"]');
        const front = [...(card?.querySelectorAll('img') || [])].find((i) => i !== hover);
        return {
          frontSrc: (front?.currentSrc || '').slice(-34),
          hoverSrc: (hover?.currentSrc || '').slice(-34),
          opacityAfter: hover ? getComputedStyle(hover).opacity : null,
        };
      }, sel);
      report.tested.opacityBefore = before;
    }

    const t = report.tested;
    const ok = t && Number(t.opacityBefore) < 0.05 && Number(t.opacityAfter) > 0.9 && t.frontSrc !== t.hoverSrc;
    if (!ok) anyFail = true;

    console.log(`\n${url}`);
    console.log(`  cards: ${report.cards} | with a hover layer: ${report.withHoverLayer} | browser reports hover:hover = ${report.canHover}`);
    if (!t) {
      console.log('  RESULT: no card on this page has a hover image yet (content not imported)');
    } else {
      console.log(`  front : ...${t.frontSrc}`);
      console.log(`  hover : ...${t.hoverSrc}`);
      console.log(`  opacity ${t.opacityBefore} -> ${t.opacityAfter}`);
      console.log(`  RESULT: ${ok ? 'HOVER WORKS' : 'BROKEN'}`);
    }
  } catch (e) {
    anyFail = true;
    console.log(`\n${url}\n  ERROR: ${e.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
process.exit(anyFail ? 1 : 0);
