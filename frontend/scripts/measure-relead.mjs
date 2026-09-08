/**
 * The sur-commande → in-stock redirection sheet, measured.
 *
 * ── WHY THIS SCRIPT EXISTS ──────────────────────────────────────────────────────────────────
 * 11,368 published products, 145 of them actually held. So a shopper who taps a product is, 98.7 %
 * of the time, looking at something we cannot ship — and `ProductRequestDialog` is the screen that
 * decides whether they leave with an equivalent we DO have or with nothing. It is not an edge case,
 * it is the majority path through the shop, and it is invisible to `lint:design` because the
 * failure it can have is geometric: the converting CTA falling below the fold on a phone.
 *
 * Two states have to be looked at, and only one of them occurs on live data:
 *
 *   ALTERNATIVES  `/similar_products/{sub}` returns 5-6 in-stock siblings for every subcategory
 *                 that has a sur-commande product in it (checked across 600 products / 35
 *                 subcategories, 08/09/2026). So the good case needs NO stub — it is the real page.
 *   NONE          reachable when the endpoint fails, when the product has no subcategory, or when
 *                 every sibling is a pack / out of stock. Not reproducible against production, so
 *                 `scripts/stub-relead.mjs --empty-similars` serves it: a read-only pass-through
 *                 that empties exactly one array on the way past.
 *
 * What it asserts, and why each one is a defect and not a preference:
 *
 *   CTA ABOVE THE FOLD   the first "Choisir celui-ci" must be fully visible at 390x844 with the
 *                        sheet body unscrolled. A shopper who has to scroll to find the action
 *                        that converts is back to the layout this sheet was rebuilt to fix.
 *   ESCAPE HATCH         the request path must be present, visible without scrolling, ≥44px and
 *                        never disabled. Burying it would convert better and is a dark pattern.
 *   NO INVENTED URGENCY  no countdown, no "x personnes regardent", no stock number that is not
 *                        the product's own `qte`. Asserted on rendered text, so it fails loudly if
 *                        anyone adds one later.
 *   44px / contrast / overflow / console — the usual, in both themes at both widths.
 *
 *   node scripts/measure-relead.mjs [base] [--shots] [--label before] [--expect none]
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import { AUDIT } from './lib/contrast-audit.mjs';

const ARGV = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = ARGV.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const out = [];
  for (let j = i + 1; j < ARGV.length && !ARGV[j].startsWith('--'); j++) out.push(ARGV[j]);
  return out.length ? out : fallback;
};

const BASE = (ARGV.find((a) => a.startsWith('http')) || 'http://localhost:3021').replace(/\/$/, '');
const WIDTHS = flag('widths', [390, 1440]).map(Number);
const THEMES = flag('themes', ['light', 'dark']);
const LABEL = flag('label', ['now'])[0];
/** 'alternatives' (default) or 'none' — which state the run is supposed to find. */
const EXPECT = flag('expect', ['alternatives'])[0];
const SHOTS = ARGV.includes('--shots') ? `.snap/relead-${LABEL}` : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

/**
 * A REAL sur-commande product, not a fixture: id 11225, `qte: 0`, `rupture: true`,
 * `force_out_of_stock: false` — i.e. `isBackOrder`, the state 10,535 products are in. Its
 * subcategory (7, whey) really does hold six in-stock siblings, so every number this script
 * prints comes from the catalogue.
 */
const ROUTE = flag(
  'route',
  ['/whey-proteine/optimum-nutrition-gold-standard-100-whey-protein-double-rich-chocolate-899-g']
)[0];

/** iPhone 14 at 390; a laptop at 1440. The fold claim is meaningless without a stated height. */
const HEIGHT = (w) => (w < 768 ? 844 : 900);

/** Anything that manufactures urgency. Present in rendered sheet text = fail, no exceptions. */
const FORBIDDEN = [
  { re: /\b\d+\s*(?:personnes?|clients?)\s+(?:regardent|consultent|viennent)/i, why: 'fabricated social proof' },
  { re: /\bplus que\s+\d+\b/i, why: 'invented scarcity ("plus que N")' },
  { re: /\bdernière[s]? (?:heure|minute)s?\b/i, why: 'countdown framing' },
  { re: /\b\d{1,2}\s*:\s*\d{2}\s*:\s*\d{2}\b/, why: 'a countdown timer' },
  { re: /\boffre expire\b/i, why: 'a fake expiry' },
];

let failures = 0;
const fail = (where, msg) => {
  console.log(`  FAIL  ${where}\n        ${msg}`);
  failures++;
};

const rows = [];
const browser = await puppeteer.launch({ headless: 'new' });

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    const where = `${theme} ${width}`;
    const height = HEIGHT(width);

    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });
    await page.evaluateOnNewDocument((t) => {
      try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.toggle('dark', t === 'dark');
      });
    }, theme);

    const consoleErrors = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      // `next dev` mirrors the Node process's own stderr into the browser console. A DEP0169
      // warning from `url.parse()` inside the dev server is not a page error, and counting it
      // would mean this script can never pass against a dev server — a guard that always fails is
      // ignored as fast as one that never does.
      if (/DeprecationWarning|\(node:\d+\)|trace-deprecation/.test(text)) return;
      consoleErrors.push(text.slice(0, 400));
    });

    try {
      await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle2', timeout: 120000 });

      /*
       * The page must actually be sur-commande, or everything below measures a different screen.
       * Asserted rather than assumed: if the catalogue is restocked, this run must say so instead
       * of quietly reporting a pass for a buy-box it never opened.
       */
      const isBackOrder = await page.evaluate(() =>
        [...document.querySelectorAll('button')].some((b) => /demander ce produit/i.test(b.textContent || ''))
      );
      if (!isBackOrder) {
        fail(where, `${ROUTE} is no longer sur-commande — no "Demander ce produit" button. Pick another route.`);
        await page.close();
        continue;
      }

      // NOT wrapped in a catch: a click that finds nothing is the failure this script is for.
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /demander ce produit/i.test(x.textContent || ''));
        b.scrollIntoView({ block: 'center' });
        b.click();
      });
      await page.waitForSelector('[data-slot="sheet-content"]', { timeout: 15000 });
      /*
       * The alternatives arrive with the server-rendered props on the PDP, but the thumbnails do
       * not: `next dev` optimises each (url, width) pair on first request, and 1.2s produced
       * screenshots with three empty image boxes while `naturalWidth` said 64 — i.e. a picture of
       * a bug that did not exist. Waiting for the images themselves rather than for a duration is
       * what makes the shot the page.
       */
      await new Promise((r) => setTimeout(r, 800));
      await page.waitForFunction(
        () => [...document.querySelectorAll('[data-slot="sheet-content"] img')].every((i) => i.complete && i.naturalWidth > 0),
        { timeout: 20000 }
      ).catch(() => { /* no images at all is a legitimate state — the empty pane has none */ });
      await new Promise((r) => setTimeout(r, 400));

      const m = await page.evaluate((forbidden) => {
        const sheet = document.querySelector('[data-slot="sheet-content"]');
        const r = sheet.getBoundingClientRect();
        const box = (el) => {
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height), w: Math.round(b.width) };
        };
        const body = sheet.querySelector('[data-request-body]');
        const ctas = [...sheet.querySelectorAll('[data-request-choose]')];
        const escape = [...sheet.querySelectorAll('button')].find((b) => /demander ce produit/i.test(b.textContent || ''));
        const text = sheet.innerText;

        // Every interactive control in the sheet, so a shrunken target cannot hide.
        const small = [...sheet.querySelectorAll('button, a[href], input, textarea, summary, [tabindex="0"]')]
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && b.height > 0 && b.height < 44;
          })
          .map((el) => `${el.tagName.toLowerCase()}"${(el.textContent || '').trim().slice(0, 22)}"(${Math.round(el.getBoundingClientRect().height)}px)`);

        return {
          sheet: box(sheet),
          viewport: { w: window.innerWidth, h: window.innerHeight },
          cta: box(ctas[0]),
          ctaCount: ctas.length,
          // Does the body need scrolling for the first CTA, and by how much is it over/under.
          bodyScroll: body ? { h: Math.round(body.clientHeight), scroll: Math.round(body.scrollHeight) } : null,
          escape: box(escape),
          escapeDisabled: escape ? escape.disabled : null,
          escapeText: escape ? escape.textContent.trim() : null,
          cards: sheet.querySelectorAll('[data-request-card]').length,
          hasEmptyState: !!sheet.querySelector('[data-request-empty]'),
          // The no-alternatives state has to lead somewhere. A pane saying only "rien" is the
          // reply this screen exists to not give.
          emptyRoutes: [...sheet.querySelectorAll('[data-request-empty] a[href]')].map((a) => a.getAttribute('href')),
          overflow: r.width > window.innerWidth + 1 ? `${Math.round(r.width)} > ${window.innerWidth}` : null,
          docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          forbidden: forbidden.filter((f) => new RegExp(f.re.source, f.re.flags).test(text)).map((f) => f.why),
          small,
          text: text.slice(0, 4000),
        };
      }, FORBIDDEN.map((f) => ({ re: { source: f.re.source, flags: f.re.flags }, why: f.why })));

      const state = m.cards > 0 ? 'alternatives' : 'none';
      if (state !== EXPECT) {
        fail(where, `expected the "${EXPECT}" state, rendered "${state}" (${m.cards} card(s)) — measuring the wrong screen`);
      }

      rows.push({
        where, state,
        sheetH: m.sheet.h,
        vh: m.viewport.h,
        ctaTop: m.cta ? m.cta.top : null,
        ctaBottom: m.cta ? m.cta.bottom : null,
        ctaCount: m.ctaCount,
        escapeTop: m.escape ? m.escape.top : null,
        cards: m.cards,
      });

      if (EXPECT === 'alternatives') {
        if (!m.cta) fail(where, 'no [data-request-choose] — the converting CTA does not exist');
        /*
         * THE FOLD CLAIM. `bottom <= viewport height` and not `top < height`: a button whose label
         * is cut off by the bottom edge is not on screen in any sense a shopper would recognise.
         */
        else if (m.cta.bottom > m.viewport.h) {
          fail(where, `first "Choisir celui-ci" is below the fold: bottom ${m.cta.bottom}px > viewport ${m.viewport.h}px (${m.cta.bottom - m.viewport.h}px over)`);
        }
      } else {
        if (!m.hasEmptyState) fail(where, 'no-alternatives state renders no [data-request-empty] explanation — an empty pane is not an answer');
        if (m.cta) fail(where, 'a "Choisir celui-ci" rendered in the no-alternatives state');
        if (!m.emptyRoutes.some((h) => /^tel:/.test(h || ''))) fail(where, 'the no-alternatives state offers no phone route');
        if (m.emptyRoutes.length < 1) fail(where, 'the no-alternatives state offers no onward route at all');
      }

      // ONE TAP AWAY, ALWAYS. Visible without scrolling anything, enabled, and a real target.
      if (!m.escape) fail(where, 'the request path is gone — no control offering "demander ce produit"');
      else {
        if (m.escapeDisabled) fail(where, 'the request path is disabled');
        if (m.escape.top < 0 || m.escape.bottom > m.viewport.h) {
          fail(where, `the request path is off screen (top ${m.escape.top}, bottom ${m.escape.bottom}, viewport ${m.viewport.h}) — it must be reachable without scrolling`);
        }
        if (m.escape.h < 44) fail(where, `the request path is ${m.escape.h}px tall, under the 44px minimum`);
      }

      if (m.forbidden.length) fail(where, `manufactured urgency in the sheet: ${m.forbidden.join(', ')}`);
      if (m.overflow) fail(where, `sheet wider than the viewport: ${m.overflow}`);
      if (m.docOverflow) fail(where, 'the open sheet causes horizontal document overflow');
      if (m.small.length) fail(where, `${m.small.length} control(s) under 44px: ${m.small.slice(0, 6).join(', ')}`);

      const contrast = (await page.evaluate(AUDIT)).filter((x) => x.status === 'FAIL');
      if (contrast.length) {
        const seen = new Map();
        for (const c of contrast) seen.set(`${c.fg}|${c.bg}|${c.min}`, c);
        fail(where, `${contrast.length} contrast failure(s): ` +
          [...seen.values()].map((c) => `${c.r}:1 (need ${c.min}) ${c.fg} on ${c.bg} "${String(c.text).slice(0, 28)}"`).join('; '));
      }

      if (SHOTS) {
        await page.screenshot({ path: `${SHOTS}/alternatives--${EXPECT}--${theme}--${width}.png` });
      }

      /*
       * The comparison reveal, then the form. Both are steps a shopper reaches in one tap and both
       * were previously only ever seen in a screenshot of the state before them.
       */
      if (EXPECT === 'alternatives') {
        const revealed = await page.evaluate(() => {
          const b = [...document.querySelectorAll('[data-slot="sheet-content"] button')]
            .find((x) => /^comparer/i.test((x.textContent || '').trim()));
          if (!b) return false;
          b.click();
          return true;
        });
        if (!revealed) fail(where, 'no "Comparer" control — the reason a swap is fair is unreachable');
        await new Promise((r) => setTimeout(r, 400));
        if (SHOTS && revealed) await page.screenshot({ path: `${SHOTS}/compare--${theme}--${width}.png` });
        /*
         * OPENING THE COMPARISON MUST NOT COST THE SALE. The reveal grows the card, so the CTA of
         * the very card being compared is the one that can be pushed off screen — and a shopper
         * who checks WHY a swap is fair and then cannot reach "Choisir celui-ci" has been talked
         * out of converting by the feature meant to convert them.
         */
        if (revealed) {
          const after = await page.evaluate(() => {
            const card = document.querySelector('[data-request-card][data-comparison-open="true"]');
            const cta = card?.querySelector('[data-request-choose]');
            if (!cta) return null;
            const b = cta.getBoundingClientRect();
            return { bottom: Math.round(b.bottom), vh: window.innerHeight };
          });
          if (!after) fail(where, 'no CTA inside the card whose comparison is open');
          else if (after.bottom > after.vh) {
            fail(where, `after opening "Comparer", that card's CTA is below the fold: ${after.bottom} > ${after.vh}`);
          } else {
            rows[rows.length - 1].ctaRevealed = after.bottom;
          }
        }
        if (revealed) {
          await page.evaluate(() => {
            const b = [...document.querySelectorAll('[data-slot="sheet-content"] button')]
              .find((x) => /revoir le produit/i.test((x.textContent || '').trim()));
            b?.click();
          });
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-slot="sheet-content"] button')]
          .find((x) => /demander ce produit/i.test(x.textContent || ''));
        b.click();
      });
      await new Promise((r) => setTimeout(r, 500));

      const form = await page.evaluate(() => {
        const sheet = document.querySelector('[data-slot="sheet-content"]');
        const submit = sheet.querySelector('button[type="submit"]');
        const back = [...sheet.querySelectorAll('button')].find((b) => /revoir les alternatives/i.test(b.textContent || ''));
        const r = sheet.getBoundingClientRect();
        return {
          fields: sheet.querySelectorAll('input:not([tabindex="-1"]), textarea').length,
          hasSubmit: !!submit,
          submitH: submit ? Math.round(submit.getBoundingClientRect().height) : 0,
          hasBack: !!back,
          sheetH: Math.round(r.height),
        };
      });
      if (!form.hasSubmit) fail(where, 'the request form has no submit control');
      if (form.submitH && form.submitH < 44) fail(where, `the submit control is ${form.submitH}px tall`);
      if (!form.hasBack) fail(where, 'no way back from the form to the alternatives');
      if (form.fields < 3) fail(where, `the request form shows ${form.fields} field(s); nom/téléphone/email are required`);
      const formContrast = (await page.evaluate(AUDIT)).filter((x) => x.status === 'FAIL');
      if (formContrast.length) fail(where, `${formContrast.length} contrast failure(s) on the request form`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/form--${EXPECT}--${theme}--${width}.png` });

      if (consoleErrors.length) fail(where, `console error(s): ${consoleErrors.slice(0, 2).join(' | ')}`);
    } catch (e) {
      fail(where, e.message);
    }

    await page.close();
  }
}

await browser.close();

console.log(`\nmeasure-relead — ${LABEL} · state "${EXPECT}" · ${ROUTE}\n`);
console.log('  theme/width   state          sheet h   viewport   1st CTA top/bottom   CTA w/ compare open   request-path top   cards');
for (const r of rows) {
  console.log(
    `  ${r.where.padEnd(13)} ${String(r.state).padEnd(14)} ${String(r.sheetH).padStart(7)}   ${String(r.vh).padStart(8)}   ` +
    `${String(r.ctaTop ?? '—').padStart(8)} / ${String(r.ctaBottom ?? '—').padEnd(8)}  ${String(r.ctaRevealed ?? '—').padStart(19)}   ${String(r.escapeTop ?? '—').padStart(15)}   ${String(r.cards).padStart(5)}`
  );
}
console.log(failures ? `\nmeasure-relead — ${failures} failure(s).` : `\nmeasure-relead — clean.`);
process.exit(failures ? 1 : 0);
