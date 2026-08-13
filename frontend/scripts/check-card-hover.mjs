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

    const report = await page.evaluate(async () => {
      const cards = [...document.querySelectorAll('article')];
      const out = { cards: cards.length, withHoverLayer: 0, tested: null };

      for (const card of cards) {
        const imgs = [...card.querySelectorAll('img')];
        // The hover layer is the aria-hidden sibling stacked over the packshot.
        const hover = imgs.find((i) => i.getAttribute('aria-hidden') === 'true');
        if (!hover) continue;
        out.withHoverLayer++;

        if (out.tested) continue;

        const front = imgs.find((i) => i !== hover);
        const before = getComputedStyle(hover).opacity;

        card.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        // Let the 300ms transition run.
        await new Promise((r) => setTimeout(r, 600));

        out.tested = {
          frontSrc: (front?.currentSrc || front?.src || '').slice(-40),
          hoverSrc: (hover.currentSrc || hover.src || '').slice(-40),
          opacityBefore: before,
          opacityAfter: getComputedStyle(hover).opacity,
        };
      }
      return out;
    });

    const t = report.tested;
    const ok = t && Number(t.opacityBefore) < 0.05 && Number(t.opacityAfter) > 0.9 && t.frontSrc !== t.hoverSrc;
    if (!ok) anyFail = true;

    console.log(`\n${url}`);
    console.log(`  cards: ${report.cards} | with a hover layer: ${report.withHoverLayer}`);
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
