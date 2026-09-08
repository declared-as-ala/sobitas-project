/**
 * Two things no other guard on this repo can see, both of which only bite on a phone.
 *
 * ── 1. HIT AREAS UNDER 44px ────────────────────────────────────────────────────────────────
 * DESIGN_SYSTEM.md states ≥44×44px on every interactive control, with no breakpoint exemption.
 * `lint:design` cannot check it: the size of a control is the sum of its class string, its
 * responsive variants, its parent's flex rules and its icon — none of which is a substring.
 * Reading the class string is exactly how a control keeps a `h-11` that a `sm:h-9` later in the
 * same string overrides.
 *
 * So this measures the RENDERED box, and it measures it at the widths people browse at.
 *
 * A control smaller than 44 in ONE axis is still reported: a 200×32 button is as hard to hit on
 * the short axis as a 32×32 one. The measurement is the border box plus any `::after`/`::before`
 * expander that is positioned outside it — the sanctioned way to give a visually small control
 * its target back — so the idiom this codebase already uses does not read as a failure.
 *
 * ── 2. HORIZONTAL OVERFLOW ─────────────────────────────────────────────────────────────────
 * `document.scrollWidth > innerWidth` says the page scrolls sideways but not what did it. This
 * walks every element and reports the ones whose right edge is past the viewport, which is the
 * only form of the answer you can act on. Elements inside a deliberate horizontal scroller
 * (`overflow-x: auto/scroll`) are excluded — a carousel is supposed to be wider than its frame.
 *
 * Usage: node scripts/check-tap-targets.mjs [base] [--widths 320 390] [--routes / /cart]
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
const BASE = (argv.find((a) => /^https?:\/\//.test(a)) || 'http://localhost:3000').replace(/\/$/, '');
const WIDTHS = flag('widths', ['320', '390']).map(Number);
const ROUTES = flag('routes', ['/']);
const MIN = Number(flag('min', ['44'])[0]);

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => { try { return fs.existsSync(p); } catch { return false; } });

const browser = await puppeteer.launch({
  headless: 'new',
  ...(CHROME ? { executablePath: CHROME } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let totalSmall = 0;
let totalOverflow = 0;

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true });
    // `content-visibility: auto` skips layout for off-screen bands, so their controls measure 0.
    await page.evaluateOnNewDocument(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = '*{content-visibility:visible !important;contain-intrinsic-size:auto !important}';
        document.head.appendChild(s);
      });
    });
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 120_000 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));

    const found = await page.evaluate((MIN) => {
      const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, [role="button"], [role="tab"], [role="switch"], [tabindex]:not([tabindex="-1"])';
      const label = (el) =>
        (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || el.tagName)
          .replace(/\s+/g, ' ').trim().slice(0, 46);

      /* The border box, widened by a pseudo-element that sticks out past it. `::after {inset:-4px}`
         is the sanctioned way to keep a 36px pill and still be hittable, so a control using it must
         not be reported. `getComputedStyle(el, '::after')` gives the resolved inset values. */
      const effective = (el, r) => {
        let w = r.width, h = r.height;
        for (const pseudo of ['::after', '::before']) {
          const cs = getComputedStyle(el, pseudo);
          if (!cs || cs.content === 'none' || cs.position !== 'absolute') continue;
          const px = (v) => (v && v.endsWith('px') ? parseFloat(v) : NaN);
          const t = px(cs.top), b = px(cs.bottom), l = px(cs.left), rr = px(cs.right);
          if ([t, b, l, rr].some(Number.isNaN)) continue;
          w = Math.max(w, r.width - l - rr);
          h = Math.max(h, r.height - t - b);
        }
        return { w, h };
      };

      const small = [];
      const overflow = [];
      const seen = new Set();

      for (const el of document.querySelectorAll(SEL)) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
        if (el.disabled) continue;
        /* A CHECKBOX'S TARGET IS ITS LABEL, and reporting the input is how this guard lies.
           `FrequentlyBoughtTogether` deliberately keeps a 20px box — that is the size a checkbox
           should look — and wraps it in a `min-h-[44px] min-w-[44px]` <label>, which is the whole
           point of a label. Measuring the input reports a defect that was already fixed, on the
           file whose comment explains the fix. */
        const target = (el.tagName === 'INPUT' && el.closest('label')) || el;
        /* SC 2.5.8's INLINE exception, and it is not a loophole: a link inside a sentence cannot
           be given a 44px box without breaking the line box around it. The test is the spec's —
           the element flows inline AND its parent carries text of its own beside it. A standalone
           `display:inline` link that is the only thing in its parent is NOT exempt. */
        if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') {
          const p = el.parentElement;
          const around = p ? [...p.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) : false;
          if (around) continue;
        }
        const r = target.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        /* SC 2.5.8's EQUIVALENT-CONTROL exception. A product card carries TWO links to the same
           product: a full-packshot overlay (200×200) and the title (38px tall). The spec exempts
           a small control when the same function is available from another control on the page
           that does meet the floor — so enlarging the title would be work against a defect that
           does not exist. Reporting it is how this guard would send someone to change the one
           number in ProductCard.tsx that three separate comments explain. */
        if (el.tagName === 'A' && el.getAttribute('href')) {
          const href = el.getAttribute('href');
          let equivalent = false;
          for (const other of document.querySelectorAll('a[href]')) {
            if (other === el || other.getAttribute('href') !== href) continue;
            const o = other.getBoundingClientRect();
            if (o.width >= MIN && o.height >= MIN) { equivalent = true; break; }
          }
          if (equivalent) continue;
        }
        // A control inside an open-by-default <details> that is closed renders 0 and is skipped above.
        const { w, h } = effective(target, r);
        if (w >= MIN && h >= MIN) continue;
        const key = `${el.tagName}|${label(el)}|${Math.round(w)}x${Math.round(h)}`;
        if (seen.has(key)) { small.find((s) => s.key === key).count++; continue; }
        seen.add(key);
        small.push({ key, count: 1, w: Math.round(w), h: Math.round(h), label: label(el), tag: el.tagName.toLowerCase() });
      }

      /* Overflow: an element whose right edge is past the viewport AND that is not inside a
         deliberate horizontal scroller. */
      const scrollerCache = new Map();
      const inScroller = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          if (!scrollerCache.has(p)) {
            const s = getComputedStyle(p);
            scrollerCache.set(p, s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowX === 'hidden');
          }
          if (scrollerCache.get(p)) return true;
        }
        return false;
      };
      const seenOv = new Set();
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right <= window.innerWidth + 0.5 && r.left >= -0.5) continue;
        if (inScroller(el)) continue;
        const key = `${el.tagName}.${el.className}`.slice(0, 90);
        if (seenOv.has(key)) continue;
        seenOv.add(key);
        overflow.push({ key, right: Math.round(r.right), left: Math.round(r.left), text: label(el) });
      }

      return { small, overflow, scrollWidth: document.documentElement.scrollWidth, inner: window.innerWidth };
    }, MIN);

    const n = found.small.reduce((s, x) => s + x.count, 0);
    totalSmall += n;
    totalOverflow += found.overflow.length;

    console.log(`\n${route}  @${width}px   ${n} target(s) < ${MIN}px   ·   scrollWidth ${found.scrollWidth} / ${found.inner}   ·   ${found.overflow.length} overflowing element(s)`);
    for (const s of found.small.sort((a, b) => a.w * a.h - b.w * b.h)) {
      console.log(`    ${String(s.w + '×' + s.h).padEnd(9)} x${String(s.count).padEnd(3)} <${s.tag}>  "${s.label}"`);
    }
    for (const o of found.overflow.slice(0, 10)) {
      console.log(`    OVERFLOW  left ${o.left} right ${o.right}  ${o.key}  "${o.text}"`);
    }

    await page.close();
  }
}

await browser.close();
console.log(`\n=== ${totalSmall} undersized target(s), ${totalOverflow} overflowing element(s) ===\n`);
process.exit(totalSmall || totalOverflow ? 1 : 0);
