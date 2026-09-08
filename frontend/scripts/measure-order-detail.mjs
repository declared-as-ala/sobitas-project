/**
 * `/account/orders/[id]`, measured — the page that says what an order cost.
 *
 * ── WHY A SECOND LOGIN-GATED GUARD ──────────────────────────────────────────────────────────
 * `measure-account` covers the five tabs of `/account` and stops there: its VIEWS list is five
 * `/account?section=…` URLs, so the order DETAIL route — the only screen on this site that states
 * a money total — has never been measured by anything. It is behind the same login, so
 * `audit-contrast`, `check-console`, `measure-bands` and `check-seams` all walk past it too.
 *
 * The session is seeded exactly as `measure-account` seeds it (`localStorage.token` + `user` via
 * `evaluateOnNewDocument`), and every API call is answered from a fixture. Nothing reaches
 * admin.protein.tn. Read that script's header before changing this one — its three documented
 * ways for a guard to lie are all live here:
 *
 *   1. MATCH ON THE PATH, NOT THE HOST. In the browser these calls go to a same-origin
 *      `/api-proxy/*` rewrite. Matching `admin.protein.tn` matches nothing, the real backend
 *      answers 401 to the fake token, AuthContext wipes localStorage and pushes to /login — and
 *      the script cheerfully measures the login page.
 *   2. ANSWER THE PREFLIGHT. Axios sends an Authorization header, so every one of these is a CORS
 *      preflight first. Answering the POST but not the OPTIONS fails the same way.
 *   3. ASSERT THE PAGE YOU NAVIGATED TO. `data-order-numero` is checked on every run before any
 *      measurement is trusted. A navigation that quietly landed somewhere else must FAIL, not
 *      produce four identical passes.
 *
 * ── AND IT MEASURES THE RENDERED STRINGS, NOT THE PROPS ─────────────────────────────────────
 * The central claim of this page is that the receipt ADDS UP. So the check parses the amounts as
 * they are painted (`data-receipt-amount`), applies each row's sign, and asserts the sum equals
 * the painted total. Reading the fixture back would only prove the fixture is a fixture; this
 * fails if a row is dropped, mislabelled, given the wrong sign, or rounded inconsistently.
 *
 *   node scripts/measure-order-detail.mjs [base] [--widths 390 1440] [--themes light dark]
 *                                         [--scenarios remise plain delivered cancelled legacy]
 *                                         [--shots] [--out .snap/order-detail] [--shots-only]
 *
 * `--shots-only` skips the receipt assertions so the SAME script can photograph a build that
 * predates the receipt (the before/after artefact). It never skips the navigation assertion.
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
const one = (name, fallback) => {
  const v = flag(name, null);
  return v ? v[0] : fallback;
};

const BASE = (ARGV.find((a) => a.startsWith('http')) || 'http://localhost:3000').replace(/\/$/, '');
const WIDTHS = flag('widths', [390, 1440]).map(Number);
const THEMES = flag('themes', ['light', 'dark']);
const SHOTS_ONLY = ARGV.includes('--shots-only');
const OUT = ARGV.includes('--shots') || SHOTS_ONLY ? one('out', '.snap/order-detail') : null;
if (OUT) fs.mkdirSync(OUT, { recursive: true });

const USER = {
  id: 1,
  name: 'Test Client',
  email: 'test@protein.tn',
  phone: '+216 20 000 000',
  phone_verified: true,
  email_verified: true,
  contact_verified: true,
  verification_status: 'phone_verified',
  points_balance: 340,
  points_value_dt: 17,
};

const ADDRESS = {
  nom: 'Test Client',
  prenom: '',
  email: 'test@protein.tn',
  phone: '20000000',
  region: 'Tunis',
  ville: 'Tunis',
  code_postale: '1002',
  adresse1: '12 rue de la Liberté',
  livraison_nom: 'Test Client',
  livraison_email: 'test@protein.tn',
  livraison_phone: '20000000',
  livraison_region: 'Tunis',
  livraison_ville: 'Tunis',
  livraison_code_postale: '1002',
  livraison_adresse1: '12 rue de la Liberté',
};

const line = (id, produit_id, designation, qte, prix) => ({
  id,
  commande_id: 0,
  produit_id,
  qte,
  prix_unitaire: prix,
  prix_ht: qte * prix,
  prix_ttc: qte * prix,
  produit: { id: produit_id, designation_fr: designation, cover: null },
});

/*
 * ── THE FIXTURES ARE COMPUTED WITH THE SERVER'S OWN ARITHMETIC ──────────────────────────────
 * `prix_ttc = max(0, prix_ht − (coupon + pack + points)) + frais_livraison` (CommandeController),
 * `remise = pack + points`, `points_discount = redeemed / 20` (PointsService::pointsToDt), and
 * `pending = floor(min(prix_ht, (prix_ttc − frais) + points_discount))`
 * (PointsService::earnableSpend → earnForSpend). A fixture whose numbers do not obey those rules
 * would let this script pass a receipt that could never occur, which is the same failure as not
 * measuring at all.
 */
const SCENARIOS = {
  /* Coupon + pack remise + points, still in preparation: every row of the receipt at once. */
  remise: {
    commande: {
      id: 9001,
      numero: '2026/9001',
      etat: 'en_cours_de_preparation',
      created_at: '2026-08-11 15:40:00',
      prix_ht: 412,
      prix_ttc: 355.8,
      frais_livraison: 8,
      remise: 23,
      discount_ht: 41.2,
      discount_ttc: 41.2,
      coupon_code_snapshot: 'WELCOME10',
      note: null,
      tracking: null,
      protina: { spent: 300, earned: 0, pending: 362, redeemed: 300, refunded: 0, revoked: 0, state: 'pending_delivery' },
      totals: {
        goods: 412,
        shipping: 8,
        coupon_discount: 41.2,
        coupon_code: 'WELCOME10',
        points_discount: 15,
        other_discount: 8,
        total: 355.8,
        reconciled: true,
      },
      ...ADDRESS,
    },
    details: [line(1, 11, 'Nitrotech Whey Protein 1.81 kg', 2, 149), line(2, 12, 'Micronised Creatine 300 g', 1, 114)],
    expect: {
      receipt: 'itemised',
      rows: [
        ['goods', 'neutral', '412.00 DT'],
        ['coupon', 'subtract', '−41.20 DT'],
        ['other', 'subtract', '−8.00 DT'],
        ['points', 'subtract', '−15.00 DT'],
        ['shipping', 'add', '+8.00 DT'],
      ],
      totalLabel: 'Total à payer',
      total: '355.80 DT',
      protina: 'open',
      // An order still in preparation may promise — but only in the future tense.
      require: [/à créditer à la livraison/i, /créditées une fois la commande livrée/i],
      forbid: [/protinas créditées/i],
    },
  },

  /* No coupon, no points: the receipt must not invent rows that are not there. */
  plain: {
    commande: {
      id: 9002,
      numero: '2026/9002',
      etat: 'nouvelle_commande',
      created_at: '2026-08-30 09:15:00',
      prix_ht: 89,
      prix_ttc: 97,
      frais_livraison: 8,
      remise: 0,
      discount_ht: 0,
      discount_ttc: null,
      coupon_code_snapshot: null,
      note: 'Sonnez au 2e étage.',
      tracking: null,
      protina: { spent: 0, earned: 0, pending: 89, redeemed: 0, refunded: 0, revoked: 0, state: 'pending_delivery' },
      totals: {
        goods: 89,
        shipping: 8,
        coupon_discount: 0,
        coupon_code: null,
        points_discount: 0,
        other_discount: 0,
        total: 97,
        reconciled: true,
      },
      ...ADDRESS,
    },
    details: [line(1, 13, 'Shaker Protein.tn 700 ml', 1, 89)],
    expect: {
      receipt: 'itemised',
      rows: [
        ['goods', 'neutral', '89.00 DT'],
        ['shipping', 'add', '+8.00 DT'],
      ],
      totalLabel: 'Total à payer',
      total: '97.00 DT',
      protina: 'open',
      require: [/à créditer à la livraison/i],
    },
  },

  /* Delivered: the points are IN the balance. Free shipping, so the row prints a bare 0. */
  delivered: {
    commande: {
      id: 9003,
      numero: '2026/9003',
      etat: 'livree',
      created_at: '2026-07-02 10:12:00',
      prix_ht: 249,
      prix_ttc: 236.55,
      frais_livraison: 0,
      remise: 0,
      discount_ht: 12.45,
      discount_ttc: 12.45,
      coupon_code_snapshot: 'PROTEIN5',
      note: null,
      tracking: {
        carrier: 'Aramex',
        number: '1234567890',
        status: 'SH005',
        status_label: 'Colis livré',
        shipped_at: '2026-07-03T09:00:00+01:00',
        delivered_at: '2026-07-04T14:20:00+01:00',
        synced_at: '2026-07-04T15:00:00+01:00',
        url: 'https://www.aramex.com/tn/en/track/track-results-new?ShipmentNumber=1234567890',
      },
      protina: { spent: 0, earned: 236, pending: 0, redeemed: 0, refunded: 0, revoked: 0, state: 'credited' },
      totals: {
        goods: 249,
        shipping: 0,
        coupon_discount: 12.45,
        coupon_code: 'PROTEIN5',
        points_discount: 0,
        other_discount: 0,
        total: 236.55,
        reconciled: true,
      },
      ...ADDRESS,
    },
    details: [line(1, 14, 'Whey Isolate Zero 2 kg', 2, 124.5)],
    expect: {
      receipt: 'itemised',
      rows: [
        ['goods', 'neutral', '249.00 DT'],
        ['coupon', 'subtract', '−12.45 DT'],
        ['shipping', 'neutral', '0.00 DT'],
      ],
      totalLabel: 'Total payé',
      total: '236.55 DT',
      protina: 'delivered',
      require: [/créditées à la livraison/i, /dans votre solde/i],
      forbid: [/gagnerez/i, /à créditer/i],
    },
  },

  /* Cancelled: points refunded, nothing earned. The one case the page must never over-promise. */
  cancelled: {
    commande: {
      id: 9004,
      numero: '2026/9004',
      etat: 'annuler',
      created_at: '2026-08-14 09:05:00',
      prix_ht: 96.9,
      prix_ttc: 94.9,
      frais_livraison: 8,
      remise: 10,
      discount_ht: 0,
      discount_ttc: null,
      coupon_code_snapshot: null,
      note: null,
      tracking: null,
      protina: { spent: 0, earned: 0, pending: 0, redeemed: 200, refunded: 200, revoked: 0, state: 'cancelled' },
      totals: {
        goods: 96.9,
        shipping: 8,
        coupon_discount: 0,
        coupon_code: null,
        points_discount: 10,
        other_discount: 0,
        total: 94.9,
        reconciled: true,
      },
      ...ADDRESS,
    },
    details: [line(1, 15, 'BCAA 2:1:1 400 g', 1, 96.9)],
    expect: {
      receipt: 'itemised',
      rows: [
        ['goods', 'neutral', '96.90 DT'],
        ['points', 'subtract', '−10.00 DT'],
        ['shipping', 'add', '+8.00 DT'],
      ],
      totalLabel: 'Total de la commande',
      total: '94.90 DT',
      protina: 'cancelled',
      // The whole point of the cancelled branch: no promise, in any tense.
      require: [/aucune Protina n.a été gagnée/i, /remboursées après annulation/i],
      forbid: [/gagnerez/i, /à créditer/i, /créditées/i],
    },
  },

  /* A legacy order whose components do not reproduce the total. The receipt must stop itemising
     rather than paint a column that disagrees with what was paid. */
  legacy: {
    commande: {
      id: 9005,
      numero: '2024/0450',
      etat: 'livree',
      created_at: '2024-11-19 17:45:00',
      prix_ht: 150,
      prix_ttc: 140,
      frais_livraison: 8,
      remise: 0,
      discount_ht: 0,
      discount_ttc: null,
      coupon_code_snapshot: null,
      note: null,
      tracking: null,
      protina: { spent: 0, earned: 0, pending: 0, redeemed: 0, refunded: 0, revoked: 0, state: 'none' },
      totals: {
        goods: 150,
        shipping: 8,
        coupon_discount: 0,
        coupon_code: null,
        points_discount: 0,
        other_discount: 0,
        total: 140,
        reconciled: false,
      },
      ...ADDRESS,
    },
    details: [line(1, 16, 'Pack Prise de Masse', 1, 150)],
    expect: {
      receipt: 'residual',
      rows: [
        ['goods', 'neutral', '150.00 DT'],
        ['residual', 'subtract', '−18.00 DT'],
        ['shipping', 'add', '+8.00 DT'],
      ],
      totalLabel: 'Total payé',
      total: '140.00 DT',
      protina: null,
    },
  },
};

let failures = 0;
const fail = (where, msg) => {
  console.log(`  FAIL  ${where}\n        ${msg}`);
  failures++;
};

/** "−41.20 DT" → -41.2 ; "+8.00 DT" → 8 ; "412.00 DT" → 412. U+2212 and ASCII both. */
function parseAmount(text) {
  const t = String(text).replace(/ /g, ' ').trim();
  const m = t.match(/^([+\-−])?\s*([\d.,]+)\s*DT$/);
  if (!m) return null;
  const value = Number(m[2].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  return m[1] === '-' || m[1] === '−' ? -value : value;
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const ONLY = flag('scenarios', Object.keys(SCENARIOS));

for (const [name, data] of Object.entries(SCENARIOS)) {
  if (!ONLY.includes(name)) continue;
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      const where = `${name} ${theme} ${width}`;

      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });

      await page.evaluateOnNewDocument(
        (u, t) => {
          localStorage.setItem('token', 'test-token');
          localStorage.setItem('user', JSON.stringify(u));
          try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
          document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.classList.toggle('dark', t === 'dark');
          });
        },
        USER,
        theme
      );

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        const CORS = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: CORS, body: '' });
        const json = (body) =>
          req.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });

        if (/\/profil(\?|$)/.test(url)) return json(USER);
        // POST /detail_commande/{id} — the endpoint this page actually calls (services/api.ts).
        if (url.includes('detail_commande')) {
          return json({
            commande: data.commande,
            details: data.details.map((d) => ({ ...d, commande_id: data.commande.id })),
          });
        }
        if (url.includes('client_commandes')) return json([]);
        if (url.includes('points/history')) return json({ balance: USER.points_balance, value_dt: USER.points_value_dt, transactions: [] });
        if (url.includes('/api-proxy/')) return json([]);
        return req.continue();
      });

      const consoleErrors = [];
      page.on('console', (m) => {
        if (m.type() === 'error' && !m.text().includes('ERR_NETWORK_ACCESS_DENIED')) {
          consoleErrors.push(m.text().slice(0, 140));
        }
      });

      try {
        await page.goto(`${BASE}/account/orders/${data.commande.id}`, { waitUntil: 'networkidle0', timeout: 60000 });
        /* `h1`, not `main`: the build this script photographs with --shots-only predates the
           <main> landmark on this route, and waiting for an element that build never renders
           would time out and be reported as a page failure rather than as an old layout. */
        await page.waitForSelector('h1', { timeout: 20000 });

        // ── ASSERT THE PAGE WE LANDED ON, BEFORE TRUSTING ANYTHING ELSE ────────────────────
        const heading = await page.evaluate(() => (document.querySelector('h1')?.textContent || '').trim());
        if (!heading.includes(data.commande.numero)) {
          fail(where, `wrong page: <h1> is "${heading}", expected the order number ${data.commande.numero}`);
          await page.close();
          continue;
        }

        const report = await page.evaluate(() => {
          const main = document.querySelector('main');
          // Scope to the landmark when there is one (identical to measure-account), and to the
          // document when there is not, so the before-build is still measured rather than skipped.
          const root = main || document.body;
          const rows = [...document.querySelectorAll('[data-receipt-row]')].map((el) => ({
            key: el.getAttribute('data-receipt-row'),
            sign: el.getAttribute('data-receipt-sign'),
            label: (el.querySelector('dt')?.textContent || '').trim(),
            amount: (el.querySelector('[data-receipt-amount]')?.textContent || '').trim(),
          }));
          const small = [...root.querySelectorAll('button, a[href], input')]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              if (r.width <= 0 || r.height <= 0 || r.height >= 44) return false;
              return !(el.tagName === 'A' && el.closest('p'));
            })
            .map((el) => `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28)}(${Math.round(el.getBoundingClientRect().height)}px)`);
          const doc = document.documentElement;
          return {
            lifecycle: main?.getAttribute('data-order-lifecycle') || null,
            receipt: document.querySelector('[data-receipt]')?.getAttribute('data-receipt') || null,
            rows,
            totalLabel: (document.querySelector('[data-receipt-total-label]')?.textContent || '').trim(),
            total: (document.querySelector('[data-receipt-total]')?.textContent || '').trim(),
            protina: document.querySelector('[data-protina-outcome]')?.getAttribute('data-protina-outcome') || null,
            text: (root.innerText || '').replace(/\s+/g, ' '),
            small,
            overflow: doc.scrollWidth > doc.clientWidth + 1 ? `${doc.scrollWidth} > ${doc.clientWidth}` : null,
            rawStatus: [...root.querySelectorAll('[class*="uppercase"]')]
              .map((el) => (el.textContent || '').trim())
              .filter((t) => /^(livree|livre|nouvelle_commande|en_cours_de_[a-z]+|expidee|annuler|annulee|prete|retourner?|retournee)$/i.test(t)),
          };
        });

        if (OUT) {
          await page.screenshot({ path: `${OUT}/${name}--${theme}--${width}.png`, fullPage: true });
        }

        if (!SHOTS_ONLY) {
          const want = data.expect;

          if (report.receipt !== want.receipt) fail(where, `receipt mode is "${report.receipt}", expected "${want.receipt}"`);

          const got = report.rows.map((r) => [r.key, r.sign, r.amount]);
          const gotKeys = JSON.stringify(got);
          const wantKeys = JSON.stringify(want.rows);
          if (gotKeys !== wantKeys) fail(where, `receipt rows differ\n        got  ${gotKeys}\n        want ${wantKeys}`);

          if (report.totalLabel !== want.totalLabel) fail(where, `total label is "${report.totalLabel}", expected "${want.totalLabel}"`);
          if (report.total !== want.total) fail(where, `total is "${report.total}", expected "${want.total}"`);

          // ── THE RECEIPT MUST ADD UP, AS PAINTED ────────────────────────────────────────
          const parsed = report.rows.map((r) => ({ key: r.key, sign: r.sign, value: parseAmount(r.amount) }));
          const unparsed = parsed.filter((p) => p.value === null);
          const totalValue = parseAmount(report.total);
          if (unparsed.length || totalValue === null) {
            fail(where, `unreadable amount(s): ${[...unparsed.map((p) => p.key), totalValue === null ? 'total' : ''].filter(Boolean).join(', ')}`);
          } else {
            const sum = parsed.reduce((acc, p) => acc + (p.sign === 'subtract' ? -Math.abs(p.value) : Math.abs(p.value)), 0);
            if (Math.abs(sum - totalValue) > 0.005) {
              fail(where, `the receipt does not add up: rows sum to ${sum.toFixed(3)} but the total reads ${totalValue.toFixed(3)}`);
            }
          }

          if (report.protina !== want.protina) fail(where, `loyalty block is ${report.protina === null ? 'absent' : `"${report.protina}"`}, expected ${want.protina === null ? 'absent' : `"${want.protina}"`}`);

          for (const pattern of want.require || []) {
            if (!pattern.test(report.text)) fail(where, `missing required copy for a ${name} order: ${pattern} did not match`);
          }
          for (const pattern of want.forbid || []) {
            if (pattern.test(report.text)) fail(where, `forbidden copy for a ${name} order: ${pattern} matched`);
          }
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

        if (report.overflow) fail(where, `horizontal overflow: ${report.overflow}`);
        if (report.small.length) fail(where, `${report.small.length} control(s) under 44px: ${report.small.join(', ')}`);
        if (report.rawStatus.length) fail(where, `raw database status rendered: ${report.rawStatus.join(', ')}`);
        if (consoleErrors.length) fail(where, `console error(s): ${consoleErrors.slice(0, 3).join(' | ')}`);
      } catch (e) {
        fail(where, e.message);
      }

      await page.close();
    }
  }
}

await browser.close();

const scenarioCount = Object.keys(SCENARIOS).filter((n) => ONLY.includes(n)).length;
console.log(
  failures
    ? `\nmeasure-order-detail — ${failures} failure(s).`
    : `\nmeasure-order-detail — clean. ${scenarioCount} scenarios x ${WIDTHS.length} widths x ${THEMES.length} themes${SHOTS_ONLY ? ' (shots only — receipt assertions skipped)' : ''}.`
);
process.exit(failures ? 1 : 0);
