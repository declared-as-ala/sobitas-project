/**
 * Assert the compact-on-scroll header actually works, in the browser, at both breakpoints.
 *
 * ── WHY THIS SCRIPT WAS REWRITTEN ─────────────────────────────────────────────────────────
 * Its first version reported 6/6 passing on a header that, in a real browser, flickered
 * open-closed-open-closed continuously — the owner filmed it. The reason is worth keeping in the
 * file, because it is a whole class of test that looks thorough and proves nothing:
 *
 *   IT MOVED THE PAGE IN TWO JUMPS. `scrollTo(0, 900)`, wait 450ms, read the attribute. A single
 *   discrete jump produces ONE scroll event, so a handler that oscillates on a stream of events
 *   has no stream to oscillate on. The test measured the END STATE of a transition and the bug
 *   lived entirely in the transitions.
 *
 * The real bug: the header is `position: sticky`, i.e. still in normal flow, so collapsing it
 * shortens the document. Chrome's scroll anchoring then adjusts `scrollY` by the same amount to
 * hold the content still — and delivers that adjustment as a scroll event pointing the other way,
 * which the handler read as "the user scrolled up". Expand, anchor, collapse, forever.
 *
 * So this version scrolls the way a person does — in 40px steps — and COUNTS state changes with a
 * MutationObserver. A monotonic scroll down must produce exactly one. It also holds the page
 * still after a collapse and asserts nothing moves, which catches a self-sustaining loop even in
 * a headless build where anchoring might behave differently.
 *
 * Usage: node scripts/check-header-compact.mjs [--widths 1440 390]
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const out = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) out.push(argv[j]);
  return out.length ? out : fallback;
}
const BASE = flag('base', ['http://localhost:3000'])[0].replace(/\/$/, '');
const WIDTHS = flag('widths', ['1440', '390']).map(Number);

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
]
  .filter(Boolean)
  .find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

const browser = await puppeteer.launch({
  headless: 'new',
  ...(CHROME ? { executablePath: CHROME } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: width < 768 ? 844 : 900, isMobile: width < 768 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 90_000 });
  await new Promise((r) => setTimeout(r, 800));

  // Count every flip of the attribute, from inside the page. This is the assertion the first
  // version was missing entirely — it only ever read the value, never how many times it changed.
  await page.evaluate(() => {
    const el = document.querySelector('header');
    window.__flips = 0;
    window.__log = [];
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.attributeName === 'data-compact') {
          window.__flips++;
          window.__log.push(`${Math.round(window.scrollY)}:${el.hasAttribute('data-compact') ? 'compact' : 'full'}`);
        }
      }
    }).observe(el, { attributes: true, attributeFilter: ['data-compact'] });
  });

  const flips = () => page.evaluate(() => window.__flips);
  const log = () => page.evaluate(() => window.__log.join(' → '));
  const resetFlips = () => page.evaluate(() => { window.__flips = 0; window.__log = []; });
  const headerH = () =>
    page.evaluate(() => Math.round(document.querySelector('header').getBoundingClientRect().height));
  const isCompact = () => page.evaluate(() => document.querySelector('header').hasAttribute('data-compact'));

  /**
   * Scroll with REAL WHEEL EVENTS, in small relative deltas.
   *
   * This is the second thing the first version got wrong, and it is subtler than the jump size.
   * It moved the page with `window.scrollTo(0, y)` — an ABSOLUTE position, re-asserted on every
   * step. Scroll anchoring works by adjusting `scrollY`; an absolute `scrollTo` on the next step
   * simply overwrites that adjustment, so the very mechanism under test was erased between
   * samples. Verified, not assumed: with the fix's parameters reverted to the broken ones, a
   * `scrollTo`-driven run still reported 0 failures — the same run driven by the wheel reported
   * SEVEN flips on one continuous downward scroll:
   *
   *     200:compact → 190:full → 239:compact → 228:full → 273:compact → 263:full → 307:compact
   *
   * Read the numbers: every collapse is followed by scrollY DROPPING ~10px and an immediate
   * re-expand. That is the anchoring compensation being mistaken for the user reversing, printed
   * out. With the fix in place the same run reports one flip. Do not "simplify" this back to
   * `scrollTo` — the test stops testing anything.
   *
   * A wheel or a finger sends RELATIVE deltas, so an anchoring adjustment persists and compounds.
   * `page.mouse.wheel` goes through Chrome's real input pipeline rather than the scripting one,
   * which is the only way the compositor-side behaviour shows up at all.
   */
  const wheelBy = async (total, step) => {
    await page.mouse.move(Math.round(width / 2), Math.round((width < 768 ? 844 : 900) / 2));
    const dir = Math.sign(total);
    for (let moved = 0; moved < Math.abs(total); moved += step) {
      await page.mouse.wheel({ deltaY: dir * step });
      await new Promise((r) => setTimeout(r, 32));
    }
  };

  const settle = () => new Promise((r) => setTimeout(r, 500));

  console.log(`\n@${width}px`);

  const restingH = await headerH();
  check('at rest, not compact', !(await isCompact()));

  // Under the 160px entry threshold: the nav must not vanish on the first nudge.
  await wheelBy(120, 20);
  await settle();
  check('scrolled to 120px (under threshold) — still not compact', !(await isCompact()));

  // ── THE REGRESSION TEST ────────────────────────────────────────────────────────────────────
  // One continuous downward scroll. Exactly ONE state change is correct; anything more is the
  // oscillation the owner reported.
  await resetFlips();
  await wheelBy(1280, 40);
  await settle();
  const downFlips = await flips();
  check('one continuous 1280px wheel-scroll down flips the state exactly once', downFlips === 1, `${downFlips} flip(s): ${await log()}`);
  check('…and the end state is compact', await isCompact());

  const compactH = await headerH();
  check('header is shorter when compact', compactH < restingH, `${restingH}px → ${compactH}px`);

  // Held still, it must STAY still. A feedback loop between the collapse and scroll anchoring
  // keeps firing with no user input at all, so this catches it without depending on how headless
  // Chrome happens to implement anchoring.
  await resetFlips();
  await new Promise((r) => setTimeout(r, 1200));
  const idleFlips = await flips();
  check('stationary for 1.2s — state does not change on its own', idleFlips === 0, `${idleFlips} flip(s)`);

  // NOTHING IS REMOVED BY THE COLLAPSE (owner: "keep all the things with it"). The desktop nav row
  // is the one that used to fold to zero.
  if (width >= 768) {
    const nav = await page.evaluate(() => {
      const n = document.querySelector('.pt-hdr-nav');
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { h: Math.round(r.height), visible: getComputedStyle(n).visibility !== 'hidden' };
    });
    check('nav row survives the collapse', !!nav && nav.h > 0 && nav.visible, nav ? `${nav.h}px` : 'not found');
  }

  // Scrolling up restores it — and also exactly once.
  await resetFlips();
  await wheelBy(-320, 40);
  await settle();
  const upFlips = await flips();
  check('scrolling up flips the state exactly once', upFlips === 1, `${upFlips} flip(s): ${await log()}`);
  check('…and the header is expanded again', !(await isCompact()));
  check('header height restored', (await headerH()) === restingH, `${await headerH()}px`);

  await page.close();
}

await browser.close();
console.log(`\n=== ${failures} failure(s) ===\n`);
process.exit(failures > 0 ? 1 : 0);
