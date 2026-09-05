/**
 * `/account`, measured — the one signed-in surface on this site.
 *
 * ── WHY THIS SCRIPT HAD TO EXIST BEFORE THE REDESIGN COULD BE CALLED DONE ───────────────────
 * Every other guard in this repo walks past `/account`, and for one reason: it redirects to
 * `/login` without a session. `audit-contrast`, `check-console`, `measure-bands` and `check-seams`
 * have all been "clean" on this route for as long as they have existed, because all four of them
 * were measuring the login page.
 *
 * That is how five files — the whole account hub — sat on `bg-gray-50`, `bg-white`, hand-written
 * `dark:` twins and the legacy `red-600` while the rest of the storefront moved to tokens, and how
 * `OrdersSection` came to hold the worst violation density in the repository. Nothing that could
 * see it was ever pointed at it.
 *
 * ── HOW IT GETS A SESSION WITHOUT TOUCHING A REAL ONE ───────────────────────────────────────
 * `AuthContext` restores from `localStorage.token` + `localStorage.user` and then verifies by
 * calling `/profil`. So this seeds both keys with `evaluateOnNewDocument` and INTERCEPTS the three
 * API calls the page makes, answering them from fixtures:
 *
 *     GET /profil            the user, with points_balance / points_value_dt
 *     GET /client_commandes  the orders list
 *     GET /points/history    the ledger
 *
 * No request reaches admin.protein.tn, no account is created, and nothing is written anywhere.
 * The token is the literal string "test-token" — it is never sent to a server that would check it.
 *
 * ── TWO SCENARIOS, AND THE SECOND ONE IS THE REAL SITE ──────────────────────────────────────
 *   `full`  a customer with a balance and three orders in different states, which is what the
 *           layout is designed for and the only way to see the badge colours at all.
 *   `empty` zero points, zero orders — which is what EVERY customer of this shop currently sees,
 *           because points are credited on the transition to `livree` and no order has ever been
 *           marked delivered. The empty states are not an edge case here; they are production.
 *
 * It also runs the repo's own WCAG AA pass (`lib/contrast-audit.mjs`, shared verbatim with
 * `audit-contrast`) on every tab in both themes — the same reason: nothing else can get here.
 *
 *   node scripts/measure-account.mjs [base] [--widths ...] [--themes ...] [--scenarios ...] [--shots]
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import { AUDIT } from './lib/contrast-audit.mjs';

const ARGV = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = ARGV.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const out = [];
  for (let j = i + 1; j < ARGV.length && !ARGV[j].startsWith("--"); j++) out.push(ARGV[j]);
  return out.length ? out : fallback;
};
const BASE = (ARGV.find((a) => a.startsWith("http")) || "http://localhost:3000").replace(/\/$/, "");
const WIDTHS = flag("widths", [320, 390, 768, 1024, 1440]).map(Number);
const THEMES = flag("themes", ["light", "dark"]);
const VIEWS = [
  { key: 'dashboard', href: '/account' },
  { key: 'orders', href: '/account?section=orders' },
  { key: 'reviews', href: '/account?section=reviews' },
  { key: 'fidelite', href: '/account?section=fidelite' },
  { key: 'profile', href: '/account?section=profile' },
];
/* --shots writes a full-page PNG per scenario/theme/width/tab into .snap/account. The measurements
   below catch geometry and leakage; they cannot tell you whether the page reads well, and this
   surface has no other way to be looked at because it is behind a login. */
const SHOTS = ARGV.includes('--shots') ? '.snap/account' : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

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

const ORDERS = [
  { id: 101, numero: 'CMD-2026-0101', etat: 'livree', prix_ttc: 249.5, ville: 'Sousse', region: 'Sousse', created_at: '2026-08-02 10:12:00' },
  { id: 102, numero: 'CMD-2026-0102', etat: 'en_cours_de_livraison', prix_ttc: 180, ville: 'Tunis', region: 'Tunis', created_at: '2026-08-11 15:40:00' },
  { id: 103, numero: 'CMD-2026-0103', etat: 'annuler', prix_ttc: 96.9, ville: 'Sfax', region: 'Sfax', created_at: '2026-08-14 09:05:00' },
];

const HISTORY = {
  balance: 340,
  value_dt: 17,
  transactions: [
    { id: 1, type: 'earn', points: 249, balance_after: 340, description: 'Protinas gagnées (commande CMD-2026-0101 livrée)', commande_id: 101, created_at: '2026-08-05 12:00:00' },
    { id: 2, type: 'redeem', points: -60, balance_after: 91, description: 'Protinas utilisées sur commande CMD-2026-0102', commande_id: 102, created_at: '2026-08-11 15:40:00' },
    { id: 3, type: 'adjustment', points: 40, balance_after: 151, description: 'Geste commercial', commande_id: null, created_at: '2026-08-12 08:00:00' },
    { id: 4, type: 'expiry', points: -12, balance_after: 139, description: 'Protinas expirées', commande_id: null, created_at: '2026-08-13 08:00:00' },
  ],
};

const REVIEWS = [
  {
    id: 201,
    stars: 5,
    comment: 'Produit authentique, bien emballé et livré rapidement.',
    verified_purchase: true,
    status: 'published',
    created_at: '2026-08-07T12:00:00.000Z',
    product: { id: 11, slug: 'nitrotech-whey-protein', designation: 'Nitrotech Whey Protein 1.81 kg', cover: null },
  },
  {
    id: 202,
    stars: 4,
    comment: 'Bon goût et se mélange facilement.',
    verified_purchase: false,
    status: 'pending',
    created_at: '2026-08-18T09:30:00.000Z',
    product: { id: 12, slug: 'micronised-creatine', designation: 'Micronised Creatine Optimum Nutrition', cover: null },
  },
];

const SCENARIOS = {
  full: { user: USER, orders: ORDERS, history: HISTORY, reviews: REVIEWS },
  empty: {
    user: { ...USER, points_balance: 0, points_value_dt: 0 },
    orders: [],
    history: { balance: 0, value_dt: 0, transactions: [] },
    reviews: [],
  },
};

const memberDashboard = (data) => ({
  summary: { orders: data.orders.length, delivered_orders: data.orders.filter((order) => ['livree', 'livrée', 'livre'].includes(order.etat)).length, reviews: data.reviews.length, points_earned: 589 },
  review_access: { phone_verified: true, monthly_limit: 3, used_this_month: Math.min(3, data.reviews.length), remaining_this_month: Math.max(0, 3 - data.reviews.length) },
  missions: [
    { key: 'verify_phone', label: 'Vérifier mon téléphone', description: 'Sécurisez votre compte.', reward_points: 300, completed: true, href: '/verify-phone' },
    { key: 'first_order', label: 'Recevoir ma première commande', description: 'Protinas après livraison.', reward_points: null, completed: data.orders.length > 0, href: '/shop' },
    { key: 'monthly_review', label: 'Partager un avis ce mois-ci', description: '10 ou 50 Protinas.', reward_points: 10, completed: data.reviews.length > 0, href: '/account?section=reviews' },
    { key: 'photo_review', label: 'Illustrer mon expérience', description: 'Ajoutez une vraie photo.', reward_points: null, completed: false, href: '/account?section=reviews' },
  ],
  community: {
    members_rewarded: 128,
    points_awarded: 16450,
    published_reviews: data.reviews.length,
    reviews: data.reviews.map((review) => ({ ...review, name: 'Membre vérifié', author_status: review.verified_purchase ? 'verified_purchase' : 'verified_member', product: review.product })),
  },
});

let failures = 0;
const fail = (where, msg) => {
  console.log(`  FAIL  ${where}\n        ${msg}`);
  failures++;
};

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

const ONLY = flag("scenarios", Object.keys(SCENARIOS));
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
          /* Both mechanisms, because the site uses both: the media feature emulated above drives
             `prefers-color-scheme`, and this drives the `.dark` class the theme toggle writes.
             Setting only one produced a page whose tokens and whose class list disagreed. */
          try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
          document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.classList.toggle('dark', t === 'dark');
          });
        },
        data.user,
        theme
      );

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        /* Axios sends an Authorization header, which makes every one of these a CORS PREFLIGHT.
           Answering the GET but not the OPTIONS meant the browser rejected the response before
           the app ever saw it, AuthContext treated the failed /profil as an invalid token, wiped
           localStorage and redirected to /login — so the first run of this script measured the
           login page, which is precisely the blind spot it was written to close. */
        const CORS = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        };
        if (req.method() === 'OPTIONS') {
          return req.respond({ status: 204, headers: CORS, body: '' });
        }
        const json = (body) =>
          req.respond({
            status: 200,
            contentType: 'application/json',
            headers: CORS,
            body: JSON.stringify(body),
          });
        /* The path, not the host. In the browser these do NOT go to admin.protein.tn — next.config
           rewrites them onto a same-origin `/api-proxy/*` path, so matching on `/api/profil` matched
           nothing, every call reached the real backend, and the real backend answered 401 to the
           fake token. AuthContext read that as an expired session, cleared localStorage and pushed
           to /login: the script measured the login page and reported it as an account failure. */
        if (/\/profil(\?|$)/.test(url)) return json(data.user);
        if (url.includes('client_commandes')) return json(data.orders);
        if (url.includes('points/history')) return json(data.history);
        if (url.includes('member/dashboard')) return json(memberDashboard(data));
        if (url.includes('best_sellers')) return json([]);
        if (url.includes('my-reviews')) return json({ reviews: data.reviews, access: { phone_verified: true, monthly_limit: 3, used_this_month: Math.min(3, data.reviews.length), remaining_this_month: Math.max(0, 3 - data.reviews.length) } });
        if (url.includes('/api-proxy/')) return json([]);
        return req.continue();
      });

      const consoleErrors = [];
      page.on('console', (m) => {
        if (m.type() === 'error' && !m.text().includes('ERR_NETWORK_ACCESS_DENIED')) {
          consoleErrors.push(m.text().slice(0, 120));
        }
      });

      try {
        await page.goto(`${BASE}/account`, { waitUntil: 'networkidle0', timeout: 60000 });
        await page.waitForSelector('main', { timeout: 20000 });

        for (const view of VIEWS) {
          if (view.key !== 'dashboard') {
            await page.goto(`${BASE}${view.href}`, { waitUntil: 'networkidle0', timeout: 60000 });
            await page.waitForSelector('main', { timeout: 20000 });
          }
          await new Promise((r) => setTimeout(r, 250));

          const report = await page.evaluate(() => {
            const doc = document.documentElement;
            /* WCAG 2.5.8's own exemptions: an inline link inside a sentence, and a control whose
               spacing already gives it a 44px lane. Everything else on a page somebody opens
               one-handed to check where their order is has to be a real target. */
            const small = [...document.querySelectorAll('main button, main a[href], main input, main [role="tab"]')]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                if (r.width <= 0 || r.height <= 0 || r.height >= 44) return false;
                const inProse = el.tagName === 'A' && el.closest('p');
                return !inProse;
              })
              .map((el) => `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28)}(${Math.round(el.getBoundingClientRect().height)}px)`);

            /* A raw database status leaking into a badge. `livree` unaccented and lowercase in a
               display-face uppercase pill is what this page shipped, on the single status that
               matters most, because the map had no entry for it and fell through to `{ label: status }`. */
            const rawStatus = [...document.querySelectorAll('main [class*="uppercase"]')]
              .map((el) => (el.textContent || '').trim())
              .filter((t) => /^(livree|livre|nouvelle_commande|en_cours_de_[a-z]+|expidee|annuler|annulee|prete|retourner?|retournee)$/i.test(t));

            return {
              activeNavigation: document.querySelectorAll('[aria-current="page"]').length,
              overflow: doc.scrollWidth > doc.clientWidth + 1 ? `${doc.scrollWidth} > ${doc.clientWidth}` : null,
              small,
              rawStatus,
            };
          });

          if (SHOTS) {
            await page.screenshot({ path: `${SHOTS}/${name}--${theme}--${width}--${view.key}.png`, fullPage: true });
          }

          /*
            ── CONTRAST, ON THE ONE SURFACE audit-contrast CANNOT REACH ─────────────────────
            The status badges here are new colour maths — `text-ok` on `bg-ok/10`, and the same
            for warn and destructive — replacing four hand-written light/dark palettes whose
            contrast had never been measured in either theme. A tinted background made from the
            same hue as its text is exactly the construction that looks obviously fine and lands
            at 3.8:1, so it gets measured rather than assumed.
          */
          const contrast = (await page.evaluate(AUDIT)).filter((x) => x.status === 'FAIL');
          if (contrast.length) {
            const seen = new Map();
            for (const c of contrast) seen.set(`${c.fg}|${c.bg}|${c.min}`, c);
            fail(
              `${where} ${view.key}`,
              `${contrast.length} contrast failure(s): ` +
                [...seen.values()]
                  .map((c) => `${c.r}:1 (need ${c.min}) ${c.fg} on ${c.bg} "${String(c.text).slice(0, 24)}"`)
                  .join('; ')
            );
          }

          if (report.overflow) fail(`${where} ${view.key}`, `horizontal overflow: ${report.overflow}`);
          if (report.activeNavigation < 1) fail(`${where} ${view.key}`, 'no active member navigation item');
          if (report.small.length) fail(`${where} ${view.key}`, `${report.small.length} control(s) under 44px: ${report.small.join(', ')}`);
          if (report.rawStatus.length) fail(`${where} ${view.key}`, `raw database status rendered: ${report.rawStatus.join(', ')}`);
        }

        if (consoleErrors.length) fail(where, `console error(s): ${consoleErrors.slice(0, 3).join(' | ')}`);
      } catch (e) {
        fail(where, e.message);
      }

      await page.close();
    }
  }
}

await browser.close();

console.log(
  failures
    ? `\nmeasure-account — ${failures} failure(s).`
    : `\nmeasure-account — clean. ${Object.keys(SCENARIOS).filter((name) => ONLY.includes(name)).length} scenarios x ${WIDTHS.length} widths x ${THEMES.length} themes x ${VIEWS.length} views.`
);
process.exit(failures ? 1 : 0);
