/**
 * The reviews section, measured — with reviews in it.
 *
 * ── WHY THIS SCRIPT HAS TO EXIST ────────────────────────────────────────────────────────────
 * NOT ONE PRODUCT IN THIS CATALOGUE HAS A PUBLISHED REVIEW. A sample of the 300 most popular
 * returns `review_count: 0` for every one, because points and review requests both hang off an
 * order reaching `livree` and none ever has. So the entire reviews UI — the distribution bars, the
 * sort control, the rows, the verified badge, and now the reply threads and the guest form — is
 * unreachable on the real site. Every screenshot of a product page shows the empty state.
 *
 * Which means a reviews redesign is, by default, shipped unseen. This script is the only way to
 * look at it: it intercepts `product_details` and rewrites the `reviews` array on the way past,
 * then intercepts the replies endpoint too. Nothing is written anywhere and no request reaches
 * admin.protein.tn for the routes it fakes.
 *
 * It covers the three authorship cases that render differently and are easy to get wrong:
 *   a MEMBER review        links to /membres/{id}
 *   a GUEST review         `author_name`, no user, NO link (linking one would 404)
 *   a STAFF reply          renders as Protein.tn with a badge, never the admin's name
 *
 * plus the thread states: collapsed with a count, expanded, and a reply that answers another reply,
 * and the anti-abuse honeypot — which has to be present (or bots walk in) AND invisible (or real
 * customers' reviews are silently discarded).
 *
 *   node scripts/measure-reviews.mjs [base] [--shots]
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
const SHOTS = ARGV.includes('--shots') ? '.snap/reviews' : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const ROUTE = flag('route', ['/whey-proteine/nitrotech-whey-protein-1-81-kg-muscletech'])[0];

const NOW = '2026-08-19T10:00:00.000Z';

/** Three reviews, one of each authorship kind, with reply counts that must reach the UI. */
const REVIEWS = [
  {
    id: 9001,
    stars: 5,
    note: 5,
    comment: 'Excellent produit, goût chocolat très correct et se dissout bien au shaker.',
    publier: 1,
    verified: 1,
    commande_id: 4242,
    user: { id: 77, name: 'Yassine B.' },
    replies_count: 2,
    created_at: NOW,
  },
  {
    id: 9002,
    stars: 3,
    note: 3,
    comment: 'Correct mais la livraison a pris 4 jours au lieu de 48h.',
    publier: 1,
    verified: 0,
    commande_id: null,
    user: null,
    author_name: 'Sonia',
    replies_count: 1,
    created_at: NOW,
  },
  {
    id: 9003,
    stars: 4,
    note: 4,
    comment: 'Bon rapport qualité prix.',
    publier: 1,
    verified: 0,
    commande_id: null,
    user: null,
    author_name: null,
    replies_count: 0,
    created_at: NOW,
  },
];

const REPLIES = {
  9001: [
    { id: 1, review_id: 9001, parent_id: null, user_id: 88, name: 'Mehdi', body: 'Tu le prends avant ou après la séance ?', is_staff: false, created_at: NOW },
    { id: 2, review_id: 9001, parent_id: 1, user_id: 77, name: 'Yassine B.', body: 'Après, dans les 30 minutes.', is_staff: false, created_at: NOW },
  ],
  9002: [
    { id: 3, review_id: 9002, parent_id: null, user_id: null, name: 'Protein.tn', body: 'Bonjour Sonia, désolés pour ce retard — nous avons remonté le point au transporteur.', is_staff: true, created_at: NOW },
  ],
  9003: [],
};

let failures = 0;
const fail = (where, msg) => {
  console.log(`  FAIL  ${where}\n        ${msg}`);
  failures++;
};

const browser = await puppeteer.launch({ headless: 'new' });

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    const where = `${theme} ${width}`;

    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });
    await page.evaluateOnNewDocument((t) => {
      try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.toggle('dark', t === 'dark');
      });
    }, theme);

    await page.setRequestInterception(true);
    page.on('request', async (req) => {
      const url = req.url();
      const CORS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      };
      if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: CORS, body: '' });

      // The replies endpoint does not exist on the deployed backend yet, so it is answered here.
      const m = url.match(/\/reviews\/(\d+)\/replies/);
      if (m) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: CORS,
          body: JSON.stringify({ replies: REPLIES[m[1]] ?? [] }),
        });
      }

      /*
       * `product_details` is NOT faked wholesale — it is fetched for real and only the `reviews`
       * array is replaced. Inventing a product payload would mean measuring a page built from my
       * fixture rather than from the real one, and the layout around the reviews section (the
       * gallery, the buy box, the panels) is exactly what decides how the section reads.
       */
      if (/\/product_details\//.test(url) && req.method() === 'GET') {
        try {
          const upstream = await fetch(url, { headers: { accept: 'application/json' } });
          const json = await upstream.json();
          const target = json?.product ?? json;
          if (target && typeof target === 'object') target.reviews = REVIEWS;
          return req.respond({
            status: 200,
            contentType: 'application/json',
            headers: CORS,
            body: JSON.stringify(json),
          });
        } catch {
          return req.continue();
        }
      }

      return req.continue();
    });

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 600));
    });

    try {
      await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle2', timeout: 90000 });
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
      });
      await new Promise((r) => setTimeout(r, 600));

      // Expand every thread. `.catch` is NOT used here: a button that does not exist is the
      // failure this script is for.
      const opened = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')].filter((b) =>
          /r[ée]ponses?$/i.test((b.textContent || '').trim())
        );
        buttons.forEach((b) => b.click());
        return buttons.length;
      });
      if (opened === 0) fail(where, 'no reply-count button found — the thread never rendered');
      await new Promise((r) => setTimeout(r, 700));

      const report = await page.evaluate(() => {
        const text = document.body.innerText;
        const doc = document.documentElement;
        const memberLinks = [...document.querySelectorAll('a[href^="/membres/"]')].map((a) => a.getAttribute('href'));
        const small = [...document.querySelectorAll('section button, section a[href]')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0 || r.height >= 44) return false;
            return !(el.tagName === 'A' && el.closest('p'));
          })
          .map((el) => `${el.tagName.toLowerCase()}:${(el.textContent || '').trim().slice(0, 24)}(${Math.round(el.getBoundingClientRect().height)}px)`);
        return {
          overflow: doc.scrollWidth > doc.clientWidth + 1 ? `${doc.scrollWidth} > ${doc.clientWidth}` : null,
          hasMemberReview: text.includes('Yassine B.'),
          hasGuestReview: text.includes('Sonia'),
          hasStaffReply: text.includes('Protein.tn') && text.includes('Boutique'),
          hasNestedAttribution: text.includes('En réponse à'),
          memberLinks,
          small,
        };
      });

      if (report.overflow) fail(where, `horizontal overflow: ${report.overflow}`);
      if (!report.hasMemberReview) fail(where, 'member review not rendered');
      if (!report.hasGuestReview) fail(where, 'guest review (author_name) not rendered — would read as "Client"');
      if (!report.hasStaffReply) fail(where, 'staff reply badge not rendered');
      if (!report.hasNestedAttribution) fail(where, '"En réponse à" attribution missing');
      if (report.small.length) fail(where, `${report.small.length} control(s) under 44px: ${report.small.join(', ')}`);

      /*
       * A guest review must NOT be a member link. `/membres/{id}` 404s for anybody with nothing
       * published, and a guest has no id at all — so a link here would be a dead end on every
       * anonymous review on the site.
       */
      if (report.memberLinks.some((h) => h === '/membres/null' || h === '/membres/undefined')) {
        fail(where, `member link built from a missing id: ${report.memberLinks.join(', ')}`);
      }

      /*
        ── THE HONEYPOT MUST EXIST AND MUST BE UNREACHABLE ───────────────────────────────────
        Its failure mode is silent in BOTH directions and that is why it is asserted rather than
        trusted:

          missing   every scripted submission sails through, and reviews are worth 50 loyalty
                    points each, so the filter is the only thing between a bot and the till.
          VISIBLE   a real customer types in it and their review is discarded without a word —
                    the server accepts honeypot submissions and stores nothing, by design, so a
                    visible honeypot destroys genuine reviews and reports success while doing it.

        Also checks it is out of the tab order and hidden from assistive technology, since a
        keyboard or screen-reader user reaching it is the same disaster as a sighted one.
      */
      const honeypot = await page.evaluate(() => {
        const openBtn = [...document.querySelectorAll('button')].find((b) =>
          /écrire un avis/i.test((b.textContent || '').trim())
        );
        if (!openBtn) return { missing: 'no "Écrire un avis" button' };
        openBtn.click();
        return null;
      });
      if (honeypot?.missing) fail(where, honeypot.missing);
      await new Promise((r) => setTimeout(r, 500));

      const hp = await page.evaluate(() => {
        const el = document.querySelector('input[name="hp_field"]');
        if (!el) return { present: false };
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          present: true,
          area: Math.round(r.width * r.height),
          tabIndex: el.tabIndex,
          ariaHidden: !!el.closest('[aria-hidden="true"]'),
          autocomplete: el.getAttribute('autocomplete'),
          opacityVisible: cs.visibility !== 'hidden',
          docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      });

      if (!hp.present) {
        fail(where, 'honeypot input[name="hp_field"] is missing — scripted reviews would go straight through');
      } else {
        if (hp.area > 4) fail(where, `honeypot is visible (${hp.area}px²) — real reviews typed into it are silently discarded`);
        if (hp.tabIndex !== -1) fail(where, `honeypot is in the tab order (tabIndex ${hp.tabIndex})`);
        if (!hp.ariaHidden) fail(where, 'honeypot is exposed to assistive technology');
        if (hp.autocomplete !== 'off') fail(where, `honeypot autocomplete is "${hp.autocomplete}" — autofill would trip it`);
        if (hp.docOverflow) fail(where, 'the open review form causes horizontal overflow');
      }

      const contrast = (await page.evaluate(AUDIT)).filter((x) => x.status === 'FAIL');
      if (contrast.length) {
        const seen = new Map();
        for (const c of contrast) seen.set(`${c.fg}|${c.bg}|${c.min}`, c);
        fail(
          where,
          `${contrast.length} contrast failure(s): ` +
            [...seen.values()].map((c) => `${c.r}:1 (need ${c.min}) ${c.fg} on ${c.bg} "${String(c.text).slice(0, 24)}"`).join('; ')
        );
      }

      if (consoleErrors.length) fail(where, `console error(s): ${consoleErrors.slice(0, 3).join(' | ')}`);

      if (SHOTS) {
        const el = await page.$('#avis, [id*="avis"], section');
        if (el) await el.screenshot({ path: `${SHOTS}/reviews--${theme}--${width}.png` }).catch(() => {});
        await page.screenshot({ path: `${SHOTS}/page--${theme}--${width}.png`, fullPage: true });
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
    ? `\nmeasure-reviews — ${failures} failure(s).`
    : `\nmeasure-reviews — clean. ${WIDTHS.length} widths x ${THEMES.length} themes, 3 authorship kinds, threads expanded.`
);
process.exit(failures ? 1 : 0);
