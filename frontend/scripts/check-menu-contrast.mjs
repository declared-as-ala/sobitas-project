/**
 * Contrast inside the BOUTIQUE mega-menu, which audit-contrast.mjs structurally cannot reach.
 *
 * ── WHY A SECOND CONTRAST SCRIPT ────────────────────────────────────────────────────────────
 * audit-contrast.mjs walks what is in the document when a page settles. This panel is not: it is
 * portalled into <body> only while the pointer is over the nav item, so every one of its ~50 text
 * nodes is invisible to that audit — on the single largest overlay on the site, present on every
 * page.
 *
 * That gap has already cost something. `.pt-slab` re-points every colour token, and inside it
 * `--slab-elevated` is WHITE — "cards on a slab are white plates, the punch-out moment". So
 * `bg-elevated text-ink-1`, which is correct everywhere else on the site, is white type on a white
 * card at 1.04:1 in here, and it fails in LIGHT theme ONLY because dark theme flips the surface
 * and makes the same two classes correct. That exact pair shipped in the footer on 17/08/2026 and
 * was found by a contrast audit rather than by looking at it. The mega-menu moved onto the same
 * scope on 18/08, so it needs the same net under it.
 *
 * ── WHAT IT MEASURES ────────────────────────────────────────────────────────────────────────
 * WCAG 2.1 AA: 4.5:1 for body text, 3:1 for large text (>=24px, or >=18.66px and bold). The
 * background is resolved by walking ancestors until an opaque fill is found, which is what makes
 * the white-plate trap detectable at all — the text's own element is transparent and the failure
 * lives two nodes up.
 *
 * BOTH THEMES, ALWAYS. A slab is dark in both, so it is tempting to test one. The footer bug is
 * the argument against: the whole point of that failure mode is that it is theme-asymmetric.
 *
 *   node scripts/check-menu-contrast.mjs http://localhost:3000
 */
import puppeteer from 'puppeteer';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const WIDTHS = [1920, 1440];
const THEMES = ['light', 'dark'];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

let failures = 0;

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 1100 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);

    /*
      THE THEME IS SET BEFORE THE APP BOOTS, not after the page settles.

      Setting it afterwards is what the first version did, and it silently produced a run that
      reported a LIGHT-theme failure under the heading "dark": next-themes reads localStorage on
      hydration and writes the class itself, so a `data-theme` stamped after load raced it and lost
      about half the time. A guard whose theme label is sometimes wrong is worse than no guard,
      because the failure it prints points at the wrong palette. `evaluateOnNewDocument` runs before
      any of the app's own script, so the store is already correct when next-themes first reads it.
    */
    await page.evaluateOnNewDocument((t) => {
      try { localStorage.setItem('theme', t); } catch { /* private mode */ }
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.classList.toggle('dark', t === 'dark');
    }, theme);

    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 180000 });

    /* Assert the theme actually took, rather than trusting that it did. */
    const applied = await page.evaluate(() =>
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
    if (applied !== theme) {
      console.log(`FAIL ${theme} @${width} — page rendered in ${applied}; the theme did not take`);
      failures++;
      await page.close();
      continue;
    }

    const trigger = (
      await page.evaluateHandle(() =>
        [...document.querySelectorAll('header a')].find((a) => /boutique/i.test(a.textContent || '')) || null
      )
    ).asElement();

    if (!trigger) {
      console.log(`FAIL ${theme} @${width} — no BOUTIQUE trigger in the header`);
      failures++;
      await page.close();
      continue;
    }

    await trigger.hover();
    /* The panel opens instantly; the promoted product is a fetch, and it is text too. */
    await new Promise((r) => setTimeout(r, 2500));

    const res = await page.evaluate(() => {
      const panel = document.querySelector('.pt-slab.fixed');
      if (!panel) return { error: 'panel did not open' };

      const lum = (c) => {
        const v = c.map((x) => {
          const s = x / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
      };
      const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

      /* Walk up to the first opaque fill. This is the step that catches the white-plate trap:
         the text node's own element has no background and the offending one is its parent. */
      const bgOf = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const c = getComputedStyle(n).backgroundColor;
          const rgb = parse(c);
          const alpha = (c.match(/[\d.]+/g) || [])[3];
          if (rgb.length === 3 && (alpha === undefined || Number(alpha) > 0.5)) return rgb;
          n = n.parentElement;
        }
        return [255, 255, 255];
      };

      const results = [];
      for (const node of panel.querySelectorAll('*')) {
        const txt = [...node.childNodes]
          .filter((n) => n.nodeType === 3 && n.nodeValue.trim())
          .map((n) => n.nodeValue.trim())
          .join(' ');
        if (!txt) continue;
        const cs = getComputedStyle(node);
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;

        const fg = parse(cs.color);
        const bg = bgOf(node);
        const L1 = lum(fg);
        const L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);

        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
        const min = large ? 3 : 4.5;
        results.push({
          txt: txt.slice(0, 40),
          ratio: Math.round(ratio * 100) / 100,
          min,
          size: Math.round(size),
          pass: ratio >= min,
        });
      }
      return {
        total: results.length,
        min: results.length ? Math.min(...results.map((r) => r.ratio)) : null,
        fails: results.filter((r) => !r.pass),
      };
    });

    if (res.error) {
      console.log(`FAIL ${theme} @${width} — ${res.error}`);
      failures++;
    } else if (res.total < 20) {
      /* The panel renders ~50 text nodes. A run that finds five has opened something else, or
         opened nothing, and reporting "0 failures" for it would be worse than reporting nothing. */
      console.log(`FAIL ${theme} @${width} — only ${res.total} text nodes; the panel did not populate`);
      failures++;
    } else if (res.fails.length) {
      failures += res.fails.length;
      console.log(`FAIL ${theme} @${width} — ${res.fails.length} of ${res.total} below AA`);
      for (const f of res.fails) console.log(`     ${f.ratio}:1 (needs ${f.min}) ${f.size}px  "${f.txt}"`);
    } else {
      console.log(`ok   ${theme} @${width} — ${res.total} text nodes, worst ${res.min}:1`);
    }

    await page.close();
  }
}

await browser.close();
console.log(`\n${failures === 0 ? 'clean' : failures + ' failure(s)'}`);
process.exit(failures === 0 ? 0 : 1);
