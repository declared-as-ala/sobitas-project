/**
 * /shop must settle on ONE url. It must not navigate itself.
 *
 * ── THE BUG THIS EXISTS TO CATCH ──────────────────────────────────────────────────────────────
 * The first server-side /shop shipped with a redirect loop, live, on the shop's front door:
 *
 *     /shop  ->  /shop?max_price=1000  ->  /shop  ->  /shop?max_price=1000  ->  …
 *
 * Nothing errored. Every response was 200, every render was correct for the URL it was given, and
 * the products were right each time. The page simply never stopped moving, so nobody could use it.
 *
 * The cause was an effect that pushed to the URL whenever the price slider's state disagreed with
 * the query string. `priceRange` initialises before the catalogue bounds are known (they are 11 to
 * 40000 DT; the placeholder was 0 to 1000), so on mount the effect read a max of 1000, correctly
 * observed 1000 < 40000, concluded the shopper had narrowed the price, and wrote ?max_price=1000.
 * The seeding effect then corrected the slider, which changed the state, which re-ran the push,
 * which now saw the full range and wrote the filter back off. Each write is a navigation and each
 * navigation re-runs the chain.
 *
 * ── WHY IT NEEDS A BROWSER ────────────────────────────────────────────────────────────────────
 * It is invisible to everything cheaper. curl sees 200. The build passes. Typecheck passes — the
 * types were all correct. It only exists once React has mounted, run its effects, and been allowed
 * to keep running for a couple of seconds. So this loads the page in a real browser and counts how
 * many times the URL changes after load.
 *
 * The rule is general, not specific to the price slider: a URL write must originate from a user
 * gesture. This asserts the consequence, so it catches the next control that gets this wrong too.
 *
 *   node scripts/check-shop-no-loop.mjs
 *   BASE_URL=https://protein.tn node scripts/check-shop-no-loop.mjs
 *   CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" node scripts/check-shop-no-loop.mjs
 */
import puppeteer from 'puppeteer';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
// How long to sit on the page after load. The loop's period was well under a second, so 6s is many
// cycles — long enough that a pass means settled, not merely slow.
const WATCH_MS = Number(process.env.WATCH_MS || 6000);
const executablePath = process.env.CHROME_PATH || undefined;

// Every route that renders ShopPageClient. The loop only affected /shop because only /shop runs in
// server mode, but the category and brand views share the component and must be proven unaffected.
const ROUTES = ['/shop', '/shop?page=2', '/shop?brand=72', '/proteines'];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

let failed = 0;

for (const route of ROUTES) {
  const page = await browser.newPage();
  const seen = [];

  // framenavigated on the MAIN frame catches both a full navigation and Next's client-side
  // router.push, which is what a loop is actually made of — a pushState the network never sees.
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) seen.push(frame.url());
  });

  const target = `${BASE}${route}`;
  try {
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 60_000 });
  } catch (e) {
    console.log(`  SKIP  ${route.padEnd(22)} ${e.message}`);
    await page.close();
    continue;
  }

  // Everything up to here is the initial load. Only what happens AFTER is the page moving by itself.
  const before = seen.length;
  await new Promise((r) => setTimeout(r, WATCH_MS));
  const after = seen.slice(before);
  const finalUrl = page.url();

  if (after.length === 0) {
    console.log(`  ok    ${route.padEnd(22)} settled on ${finalUrl.replace(BASE, '') || '/'}`);
  } else {
    failed++;
    console.log(`  FAIL  ${route.padEnd(22)} ${after.length} self-navigation(s) in ${WATCH_MS}ms:`);
    for (const url of after.slice(0, 8)) {
      console.log(`          -> ${url.replace(BASE, '') || '/'}`);
    }
    console.log(`        A control is writing the URL from an effect rather than from a gesture.`);
    console.log(`        Look for pushQuery() reached from a useEffect in ShopPageClient.`);
  }

  await page.close();
}

await browser.close();

console.log('');
if (failed > 0) {
  console.log(`${failed} route(s) navigate themselves after load.`);
  process.exit(1);
}
console.log('Every shop route settles on one URL.');
