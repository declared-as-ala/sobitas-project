/**
 * Contrast inside the overlays audit-contrast.mjs structurally cannot reach.
 *
 * ── WHY A SECOND CONTRAST SCRIPT ────────────────────────────────────────────────────────────
 * audit-contrast.mjs walks what is in the document when a page settles. These surfaces are not:
 * the mega-menu is portalled in only while the pointer is over a nav item, and the cart drawer
 * only after something is added. Between them that is ~70 text nodes, on the two overlays that
 * appear on every page of the site, and every one of them was invisible to the page audit.
 *
 * ── IT HAS PAID FOR ITSELF TWICE, FOR THE SAME REASON BOTH TIMES ───────────────────────────
 * Both misses are the token layer's one genuine trap: an accent whose FOREGROUND is not a
 * constant.
 *
 *   17/08  `bg-elevated text-ink-1` inside `.pt-slab`. `--slab-elevated` is WHITE in light theme
 *          ("cards on a slab are white plates, the punch-out moment") while the slab's ink stays
 *          near-white, so it renders white-on-white at 1.04:1 — in LIGHT THEME ONLY, because dark
 *          flips the surface and makes the same two classes correct. It shipped in the footer.
 *
 *   18/08  `bg-brand text-white` on "PASSER COMMANDE". `--page-brand` is #D03B04 in light, where
 *          white measures 4.87:1, and #FF8A4C in dark, where white measures 2.34:1. tokens.css
 *          says so in as many words — "--page-on-brand: text/icon ON the accent — NOT a constant,
 *          see .dark" — and thirteen call sites across the app had hard-coded `text-white` anyway.
 *          The checkout button of a storefront, unreadable in dark mode, found by this script.
 *
 * BOTH THEMES, ALWAYS. It is tempting to test one, and both of the above are the argument against:
 * the entire failure mode is that it is theme-asymmetric.
 *
 * ── WHAT IT MEASURES ────────────────────────────────────────────────────────────────────────
 * WCAG 2.1 AA: 4.5:1 for body text, 3:1 for large text (>=24px, or >=18.66px and bold). The
 * background is resolved by walking ancestors to the first opaque fill, which is what makes the
 * white-plate trap detectable at all — the text's own element is transparent and the offending
 * surface is two nodes up.
 *
 *   node scripts/check-overlay-contrast.mjs [base]
 */
import puppeteer from 'puppeteer';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const WIDTHS = [1920, 1440];
const THEMES = ['light', 'dark'];

/**
 * Each overlay says how to open itself and how to find itself, and declares the number of text
 * nodes below which the run is a FAILURE rather than a pass.
 *
 * That floor is not padding. A selector that silently stops matching, or an interaction that
 * silently stops opening the thing, produces "0 failures" — the most dangerous output a guard can
 * print, because it is indistinguishable from success. The menu renders ~43 nodes and the cart
 * ~22; anything under half of that means the script measured something else.
 */
const OVERLAYS = [
  {
    name: 'mega-menu',
    minNodes: 20,
    /* `#boutique-megamenu`, not `.pt-slab.fixed`. The panel was restructured on 20/08/2026 so the
       `fixed` wrapper is a transparent 8px hover bridge and `.pt-slab` moved onto the card inside
       it — at which point this selector matched nothing and the guard reported four failures. It
       was right to: a structural selector on someone else's className is a hook that breaks
       silently the first time that element is refactored. The id is declared by the panel for its
       own `aria-controls`, so it is load-bearing markup rather than a styling coincidence. */
    selector: '#boutique-megamenu',
    open: async (page) => {
      const trigger = (
        await page.evaluateHandle(
          () => [...document.querySelectorAll('header a')].find((a) => /boutique/i.test(a.textContent || '')) || null
        )
      ).asElement();
      if (!trigger) return false;
      await trigger.hover();
      /* The panel opens instantly; its promoted product is a fetch, and that is text too. */
      await new Promise((r) => setTimeout(r, 2500));
      return true;
    },
  },
  {
    name: 'cart-drawer',
    minNodes: 12,
    selector: '[role="dialog"]',
    open: async (page) => {
      const added = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')].filter((b) =>
          /ajouter au panier/i.test(b.textContent || '')
        );
        buttons.slice(0, 2).forEach((b) => b.click());
        return buttons.length > 0;
      });
      if (!added) return false;
      await new Promise((r) => setTimeout(r, 1200));
      const cart = (
        await page.evaluateHandle(
          () => [...document.querySelectorAll('button')].find((b) => /panier/i.test(b.getAttribute('aria-label') || '')) || null
        )
      ).asElement();
      if (!cart) return false;
      /* `.click()` in page context, not puppeteer's: the toast that fires on add sits over the
         header and puppeteer refuses to click a covered element. */
      await page.evaluate((el) => el.click(), cart);
      await new Promise((r) => setTimeout(r, 1600));
      return true;
    },
  },
];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

let failures = 0;

for (const overlay of OVERLAYS) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const label = `${overlay.name} ${theme} @${width}`;
      const page = await browser.newPage();
      await page.setViewport({ width, height: 1000 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);

      /*
        THE THEME IS SET BEFORE THE APP BOOTS, not after the page settles.

        Setting it afterwards raced next-themes, which reads localStorage on hydration and writes
        the class itself — so an early version of this script reported a LIGHT-theme failure under
        the heading "dark" about half the time. A guard whose theme label is sometimes wrong is
        worse than no guard: the failure it prints points at the wrong palette.
      */
      await page.evaluateOnNewDocument((t) => {
        try { localStorage.setItem('theme', t); } catch { /* private mode */ }
        document.documentElement.setAttribute('data-theme', t);
        document.documentElement.classList.toggle('dark', t === 'dark');
      }, theme);

      await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 180000 });

      /* Assert the theme took, rather than trusting that it did. */
      const applied = await page.evaluate(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      );
      if (applied !== theme) {
        console.log(`FAIL ${label} — page rendered in ${applied}; the theme did not take`);
        failures++;
        await page.close();
        continue;
      }

      const opened = await overlay.open(page);
      if (!opened) {
        console.log(`FAIL ${label} — could not open it`);
        failures++;
        await page.close();
        continue;
      }

      const res = await page.evaluate((sel) => {
        const panel = document.querySelector(sel);
        if (!panel) return { error: `nothing matched ${sel}` };

        const lum = (c) => {
          const v = c.map((x) => {
            const s = x / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
        };
        const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

        /* Walk up to the first opaque fill — the step that catches the white-plate trap. */
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
      }, overlay.selector);

      if (res.error) {
        console.log(`FAIL ${label} — ${res.error}`);
        failures++;
      } else if (res.total < overlay.minNodes) {
        console.log(`FAIL ${label} — only ${res.total} text nodes (expected >= ${overlay.minNodes}); it did not populate`);
        failures++;
      } else if (res.fails.length) {
        failures += res.fails.length;
        console.log(`FAIL ${label} — ${res.fails.length} of ${res.total} below AA`);
        for (const f of res.fails) console.log(`     ${f.ratio}:1 (needs ${f.min}) ${f.size}px  "${f.txt}"`);
      } else {
        console.log(`ok   ${label} — ${res.total} text nodes, worst ${res.min}:1`);
      }

      await page.close();
    }
  }
}

await browser.close();
console.log(`\n${failures === 0 ? 'clean' : failures + ' failure(s)'}`);
process.exit(failures === 0 ? 0 : 1);
