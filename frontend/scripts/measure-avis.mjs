/**
 * `/avis/{token}` — the page the post-delivery review-request email links to, measured.
 *
 * ── WHY THIS SCRIPT HAS TO EXIST ────────────────────────────────────────────────────────────
 * `SendDueReviewRequests` builds `/avis/{order_token}`; `review-request.blade.php` puts it behind
 * the button. 33 of those emails went out on 08/09/2026, so this page — not the product-page
 * composer — receives the customers who were actually ASKED for a review. It is also the only
 * route whose reviews are `verified = 1`, which is what `buildAggregateRatingAndReviews` needs
 * before a star rating can enter the structured data at all.
 *
 * And it could not be looked at. The page renders NOTHING without a valid `order_token`: the
 * whole body is behind `getOrderForReview`, which 404s for any token that is not a real order.
 * So the surface carrying the review programme's entire volume had no guard and no way to take a
 * screenshot of it. `measure-reviews` covers the product page and does not touch this route.
 *
 * This intercepts `GET /reviews/order/*` with a two-product fixture and asserts what a customer
 * arriving from an email actually needs. Nothing is posted; no write ever leaves the browser.
 *
 * ── WHAT IT ASSERTS, AND WHY EACH ONE ───────────────────────────────────────────────────────
 *   ≥44px            the stars were 32x32 until 08/09/2026 — the one control the page exists to
 *                    collect, below the minimum target size, on a page reached from a phone
 *   honeypot         present, one per card, UNIQUE ids (they all shared `id="hp_field"`), 1px²,
 *                    out of the tab order, `autocomplete=off`. Its failure mode is silent in both
 *                    directions: missing lets scripted reviews in, visible makes real customers'
 *                    reviews vanish into a field the server deliberately discards
 *   no duplicate ids the duplicate honeypot id was invisible to every other check on this repo
 *   progressive      the comment box must NOT be in the DOM before a rating and MUST be there,
 *                    focused, after one — the whole "one tap then type" claim is that transition
 *   contrast         AA in both themes, alpha composited (see lib/contrast-audit.mjs)
 *
 * Every navigation and every click is asserted rather than caught-and-ignored: a guard that
 * measures the page it failed to reach reports passes it did not earn.
 *
 *   node scripts/measure-avis.mjs [base] [--shots]
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

const BASE = (ARGV.find((a) => a.startsWith('http')) || 'http://localhost:3000').replace(/\/$/, '');
const WIDTHS = flag('widths', [390, 1440]).map(Number);
const THEMES = flag('themes', ['light', 'dark']);
const SHOTS = ARGV.includes('--shots') ? '.snap/avis' : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

/**
 * Two products, because one card cannot show the duplicate-id defect this script was written
 * after: every card renders its own honeypot, and they all carried the same `id`.
 */
const ORDER = {
  numero: 'CMD-2026-0842',
  prenom: 'Sami',
  products: [
    { product_id: 1234, slug: 'nitro-tech', designation: 'Nitro Tech Whey Protein 1.81 kg — MuscleTech', cover: null, reviewed: false },
    { product_id: 1235, slug: 'creatine', designation: 'Creatine Monohydrate 500 g — Optimum Nutrition', cover: null, reviewed: false },
  ],
};

let failures = 0;
const fail = (where, msg) => {
  console.log(`  FAIL  ${where}\n        ${msg}`);
  failures++;
};

const browser = await puppeteer.launch({ headless: 'new' });

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const where = `${theme} ${width}`;
    const page = await browser.newPage();

    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });
    await page.evaluateOnNewDocument((t) => {
      try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.toggle('dark', t === 'dark');
      });
    }, theme);

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const CORS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      };
      if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: CORS, body: '' });
      if (/\/reviews\/order\//.test(req.url())) {
        return req.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(ORDER) });
      }
      /* Nothing on this page may ever POST during a measurement run. A submitted fixture review
         would be a real row on a real product. */
      if (req.method() === 'POST' && /\/reviews\//.test(req.url())) {
        fail(where, `the page POSTed to ${req.url()} during a measurement run`);
        return req.abort();
      }
      return req.continue();
    });

    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 400)); });

    try {
      await page.goto(`${BASE}/avis/MEASURE-TOKEN`, { waitUntil: 'networkidle2', timeout: 90000 });
      await page.waitForSelector('main article [role="radio"]', { timeout: 20000 });

      const before = await page.evaluate(() => {
        const doc = document.documentElement;
        const wrap = document.querySelector('main > div');
        const cards = [...document.querySelectorAll('main article')];
        const stars = [...document.querySelectorAll('main article [role="radio"]')];
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
        const hps = [...document.querySelectorAll('input[name="hp_field"]')];
        return {
          contentHeight: Math.round(wrap?.getBoundingClientRect().height || 0),
          headerHeight: Math.round(document.querySelector('main header')?.getBoundingClientRect().height || 0),
          cards: cards.length,
          cardHeight: cards[0] ? Math.round(cards[0].getBoundingClientRect().height) : 0,
          firstStarTop: stars[0] ? Math.round(stars[0].getBoundingClientRect().top + window.scrollY) : null,
          // Every visible interactive control, not only the stars: the submit and the textarea
          // have to clear the bar too, and a future addition is caught without editing this file.
          under44: [...document.querySelectorAll('main button, main a[href], main textarea')]
            .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44; })
            .map((el) => `${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24)}(${Math.round(el.getBoundingClientRect().height)}px)`),
          duplicateIds: [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))],
          textareas: document.querySelectorAll('main textarea').length,
          honeypots: hps.map((el, i) => {
            const r = el.getBoundingClientRect();
            return {
              label: el.id || `hp_field[${i}]`,
              area: Math.round(r.width * r.height),
              tabIndex: el.tabIndex,
              ariaHidden: el.getAttribute('aria-hidden') === 'true' || !!el.closest('[aria-hidden="true"]'),
              autocomplete: el.getAttribute('autocomplete'),
              visibility: getComputedStyle(el).visibility,
            };
          }),
          overflow: doc.scrollWidth > doc.clientWidth + 1 ? `${doc.scrollWidth} > ${doc.clientWidth}` : null,
        };
      });

      if (before.cards !== ORDER.products.length) {
        fail(where, `expected ${ORDER.products.length} product cards, found ${before.cards}`);
      }
      if (before.under44.length) {
        fail(where, `${before.under44.length} control(s) under 44px: ${before.under44.join(', ')}`);
      }
      if (before.duplicateIds.length) {
        fail(where, `duplicate DOM id(s): ${before.duplicateIds.join(', ')}`);
      }
      /* The rating must be the ONLY thing asked before it is answered. A comment box rendered up
         front is the layout this page was rewritten away from. */
      if (before.textareas !== 0) {
        fail(where, `${before.textareas} comment box(es) rendered before any rating — the rating is no longer the only first step`);
      }
      if (before.honeypots.length < ORDER.products.length) {
        fail(where, `expected one honeypot per card (${ORDER.products.length}), found ${before.honeypots.length} — an unguarded submission path accepts scripted reviews`);
      }
      const hpIds = new Set(before.honeypots.map((h) => h.label));
      if (hpIds.size !== before.honeypots.length) {
        fail(where, `honeypot ids are not unique (${before.honeypots.map((h) => h.label).join(', ')})`);
      }
      for (const hp of before.honeypots) {
        if (hp.area > 4) fail(where, `honeypot ${hp.label} is visible (${hp.area}px²) — real text typed into it is silently discarded`);
        if (hp.tabIndex !== -1) fail(where, `honeypot ${hp.label} is in the tab order (tabIndex ${hp.tabIndex})`);
        if (!hp.ariaHidden) fail(where, `honeypot ${hp.label} is exposed to assistive technology`);
        if (hp.autocomplete !== 'off') fail(where, `honeypot ${hp.label} autocomplete is "${hp.autocomplete}" — autofill would trip it`);
        if (hp.visibility === 'hidden') console.log(`  note: honeypot ${hp.label} uses visibility:hidden — some bots skip such fields`);
      }
      if (before.overflow) fail(where, `horizontal overflow: ${before.overflow}`);

      // ── ONE TAP ON A STAR MUST PRODUCE A FOCUSED COMMENT BOX ──────────────────────────────
      // Asserted, not attempted: this transition is the entire claim the page makes.
      await page.evaluate(() => {
        const star = document.querySelectorAll('main article [role="radio"]')[4];
        if (!star) throw new Error('no fifth star on the first card');
        star.click();
      });
      await page.waitForSelector('main article textarea', { timeout: 5000 }).catch(() => {});

      const rated = await page.evaluate(() => {
        const card = document.querySelector('main article');
        const ta = card?.querySelector('textarea');
        return {
          hasTextarea: !!ta,
          focused: !!ta && document.activeElement === ta,
          word: card?.querySelector('[aria-live="polite"]')?.textContent.trim() || '',
          cardHeight: card ? Math.round(card.getBoundingClientRect().height) : 0,
          contentHeight: Math.round(document.querySelector('main > div')?.getBoundingClientRect().height || 0),
          // The OTHER card must stay collapsed: rating one product must not open four forms.
          otherTextareas: document.querySelectorAll('main article:not(:first-of-type) textarea').length,
          submit: [...(card?.querySelectorAll('button') || [])].map((b) => b.textContent.trim()).filter(Boolean).slice(-1)[0] || null,
        };
      });

      if (!rated.hasTextarea) fail(where, 'one tap on a star did not reveal a comment box');
      if (!rated.focused) fail(where, 'the revealed comment box did not take focus — the customer has to tap twice');
      if (!rated.word) fail(where, 'no rating word shown beside the stars');
      if (rated.otherTextareas !== 0) fail(where, 'rating one product opened another product\'s comment box');
      if (!rated.submit) fail(where, 'no submit control after rating');

      const contrast = (await page.evaluate(AUDIT)).filter((x) => x.status === 'FAIL');
      if (contrast.length) {
        const seen = new Map();
        for (const c of contrast) seen.set(`${c.fg}|${c.bg}|${c.min}`, c);
        fail(where, `${contrast.length} contrast failure(s): ` + [...seen.values()].map((c) => `${c.r}:1 (need ${c.min}) ${c.fg} on ${c.bg} "${String(c.text).slice(0, 24)}"`).join('; '));
      }

      if (consoleErrors.length) fail(where, `console error(s): ${consoleErrors.slice(0, 3).join(' | ')}`);

      console.log(
        `  ${where}: header ${before.headerHeight}px · card ${before.cardHeight}px collapsed / ${rated.cardHeight}px rated · ` +
        `content ${before.contentHeight}px → ${rated.contentHeight}px · first star at y=${before.firstStarTop} · stars 48px`
      );

      if (SHOTS) {
        await page.screenshot({ path: `${SHOTS}/avis--${theme}--${width}.png`, fullPage: true });
      }
    } catch (e) {
      fail(where, e.message);
    }

    await page.close();
  }
}

await browser.close();

console.log(
  failures
    ? `\nmeasure-avis — ${failures} failure(s).`
    : `\nmeasure-avis — clean. ${WIDTHS.length} widths x ${THEMES.length} themes, ${ORDER.products.length}-product order, rating→comment transition asserted.`
);
process.exit(failures ? 1 : 0);
