/** Phase 17: fixture-only checkout and order document. Assert the route/state before measuring
 * content boxes (never scrollHeight as a height claim). API matching is by PATH, including
 * same-origin /api-proxy. All mutations and external analytics are intercepted. */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { AUDIT } from './lib/contrast-audit.mjs';

const base = process.argv[2] || 'http://localhost:3017';
const phase = process.argv[3] || 'before';
const out = `.snap/p17/${phase}`;
fs.mkdirSync(out, { recursive: true });
const names = ['بروتين Whey (Vanille) 2 kg', 'Créatine micronisée 300 g'];
const cart = names.map((name, i) => ({ product: { id: 1701 + i, designation_fr: name, prix: i ? 49.75 : 89.5, prix_promo: null, slug: `test-p17-${i}`, cover: null, qte: 100 }, quantity: i ? 1 : 2 }));
const order = { id: 1701, numero: 'CMD-2026-1701', created_at: '2026-09-08T10:30:00', livraison: 1, payment_method: 'cod', livraison_nom: 'أحمد Ben Salah', livraison_phone: '+216 20 123 456', livraison_email: 'client@example.test', livraison_adresse1: 'شارع الحرية، bâtiment B (12)', livraison_ville: 'سوسة Sousse', livraison_region: 'Sousse', livraison_code_postale: '4000', pays: 'Tunisie', note: 'يرجى الاتصال قبل الوصول (après 14 h).', prix_ht: 228.75, frais_livraison: 7.5, discount_ht: 12.25, discount_ttc: 12.25, coupon_code_snapshot: 'TEST17', prix_ttc: 224, etat: 'nouvelle' };
const details = cart.map((item, i) => ({ id: i + 1, produit_id: item.product.id, produit: item.product, qte: item.quantity, prix_unitaire: item.product.prix, prix_ht: item.product.prix * item.quantity, prix_ttc: item.product.prix * item.quantity }));
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const results = [];
try {
  for (const width of (process.argv.includes('--extra-widths') ? [320, 768, 1024] : [390, 1440])) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(180000);
    let activeOrder = order;
    let activeDetails = details;
    let submitted = 0;
    await page.setViewport({ width, height: width === 390 ? 844 : 1000 });
    await page.evaluateOnNewDocument((cart, theme) => { localStorage.setItem('cart', JSON.stringify(cart)); localStorage.setItem('theme', theme); localStorage.setItem('ga4_purchase_CMD-2026-1701', '1'); }, cart, theme);
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/api/orders' && req.method() === 'POST') { submitted++; return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1701, numero: order.numero, order_token: 'fixture' }) }); }
      if (/\/commande\/1701$/.test(url.pathname)) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ facture: activeOrder, details_facture: activeDetails }) });
      if (url.pathname.startsWith('/api-proxy/') || /admin\.protein\.tn/.test(url.hostname)) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      if (req.method() !== 'GET' || (!url.origin.startsWith(base) && !['data:', 'about:'].includes(url.protocol))) return req.respond({ status: 200, body: '' });
      req.continue();
    });
    await page.goto(`${base}/checkout`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForSelector('#livraison_nom');
    await page.waitForSelector('#gouvernorat option:nth-child(2)');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(new URL(page.url()).pathname, '/checkout');
    await page.type('#livraison_nom', order.livraison_nom);
    await page.type('#livraison_phone', order.livraison_phone);
    await page.type('#livraison_adresse1', order.livraison_adresse1);
    await page.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); });
    const metrics = await page.evaluate(() => {
      const rect = sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { top: r.top, height: r.height, width: r.width }; };
      const field = document.querySelector('#livraison_adresse1');
      return { header: rect('.checkout-main header'), form: rect('.checkout-form'), layout: rect('.checkout-layout'), content: rect('.checkout-main > *'), addressDirection: getComputedStyle(field).direction, addressDir: field.getAttribute('dir'), nameDirection: getComputedStyle(document.querySelector('#livraison_nom')).direction, rootDir: document.documentElement.getAttribute('dir'), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    results.push({ width, theme, ...metrics });
    if (phase !== 'before') {
      assert.equal(metrics.addressDir, 'auto');
      assert.equal(metrics.addressDirection, 'rtl');
      assert.equal(metrics.nameDirection, 'rtl');
      assert.equal(metrics.rootDir, 'ltr');
      assert.equal(metrics.overflow, false);
      assert.equal(await page.$eval('#livraison_phone', el => getComputedStyle(el).direction), 'ltr');
      const contrast = await page.evaluate(AUDIT);
      results.at(-1).contrast = contrast;
      const targets = await page.$$eval('.checkout-main button, .checkout-main input:not([type="hidden"]), .checkout-main select, .checkout-main a, .checkout-cta-footer button', els => els.filter(el => el.getBoundingClientRect().height > 0).map(el => ({ text: el.textContent || el.id, h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width })).filter(el => el.h < 44 || el.w < 44));
      assert.deepEqual(targets, [], 'Checkout targets must be at least 44px');
      await page.$eval('#livraison_nom', el => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Jean أحمد Dupont'); el.dispatchEvent(new Event('input', { bubbles: true })); });
      assert.equal(await page.$eval('#livraison_nom', el => getComputedStyle(el).direction), 'ltr');
      await page.$eval('#livraison_nom', (el, value) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }, order.livraison_nom);
    }
    await page.screenshot({ path: `${out}/checkout-${width}-${theme}.png`, fullPage: true });
    if (width === 390) {
      // The Next dev indicator overlaps this control in the before build; invoke the actual
      // trigger and assert the dialog so a covered click can never measure the wrong state.
      await page.$eval('.checkout-cta-footer button', b => b.click());
      await page.waitForSelector('[role="dialog"]');
      assert.ok(await page.$eval('[role="dialog"]', el => el.textContent.includes('بروتين')));
      await page.screenshot({ path: `${out}/summary-${width}-${theme}.png` });
      if (phase !== 'before') {
        await page.$eval('[aria-label="Fermer le récapitulatif"]', el => el.click());
        await page.waitForSelector('[role="dialog"]', { hidden: true });
      }
    }
    if (phase !== 'before') {
      for (const id of ['gouvernorat', 'delegation', 'localite']) {
        await page.waitForSelector(`#${id} option:nth-child(2)`);
        const value = await page.$eval(`#${id} option:nth-child(2)`, el => el.value);
        await page.select(`#${id}`, value);
      }
      await page.$eval('#checkout-form button[aria-expanded]', el => el.click());
      await page.waitForSelector('#note');
      await page.type('#note', order.note);
      assert.equal(await page.$eval('#note', el => getComputedStyle(el).direction), 'rtl');
      results.at(-1).expandedFormHeight = await page.$eval('.checkout-form', el => el.getBoundingClientRect().height);
      await page.$eval('#checkout-form', el => el.requestSubmit());
      await page.waitForSelector('[data-order-document]');
      assert.equal(submitted, 1, 'Exactly one intercepted order submission');
      assert.equal(new URL(page.url()).pathname, '/checkout');
      await page.screenshot({ path: `${out}/checkout-complete-${width}-${theme}.png`, fullPage: true });
    }
    await page.goto(`${base}/order-confirmation/1701?token=fixture`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => document.body.textContent.includes('CMD-2026-1701'));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${out}/order-${width}-${theme}.png`, fullPage: true });
    if (phase !== 'before') {
      assert.equal(await page.$eval('[data-order-document] h1', el => el.textContent), 'Bon de commande');
      assert.equal(await page.$eval('[data-order-document]', el => el.scrollWidth > el.clientWidth), false);
      // Browser print (including a dark storefront) must remove all interactive chrome.
      await page.setViewport({ width: 794, height: 1123 });
      await page.emulateMediaType('print');
      const printState = await page.evaluate(() => ({
        buttons: [...document.querySelectorAll('button, nav, [data-sonner-toaster]')].filter(el => el.getBoundingClientRect().height > 0).length,
        bg: getComputedStyle(document.querySelector('[data-order-document]')).backgroundColor,
        paper: getComputedStyle(document.documentElement).backgroundColor,
        clipped: [...document.querySelectorAll('[data-order-document] td')].some(el => el.scrollWidth > el.clientWidth),
      }));
      assert.equal(printState.buttons, 0);
      assert.equal(printState.bg, 'rgb(255, 255, 255)');
      assert.equal(printState.paper, 'rgb(255, 255, 255)');
      assert.equal(printState.clipped, false);
      await page.screenshot({ path: `${out}/print-${width}-${theme}.png`, fullPage: true });
      if (width === 1440 && theme === 'light') await page.pdf({ path: `${out}/bon-de-commande.pdf`, format: 'A4', preferCSSPageSize: true, printBackground: true });
      await page.emulateMediaType('screen');
      await page.setViewport({ width, height: width === 390 ? 844 : 1000 });
      if (width === 1440 && theme === 'light') {
        const popupPromise = new Promise(resolve => page.once('popup', resolve));
        await page.evaluate(() => {
          const original = window.open;
          window.open = function (...args) { const popup = original.apply(this, args); popup.print = () => { popup.__printed = true; }; return popup; };
          [...document.querySelectorAll('button')].find(el => el.textContent.includes('Imprimer le bon')).click();
        });
        const popup = await popupPromise;
        await popup.waitForFunction(() => window.__printed === true);
        await popup.setViewport({ width: 794, height: 1123 });
        assert.equal(await popup.$eval('h1', el => el.textContent), 'Bon de commande');
        await popup.screenshot({ path: `${out}/popup-screen.png`, fullPage: true });
        await popup.emulateMediaType('print');
        await popup.screenshot({ path: `${out}/popup-print.png`, fullPage: true });
        await popup.pdf({ path: `${out}/popup-bon-de-commande.pdf`, preferCSSPageSize: true, printBackground: true });
        await popup.close();
        // Missing rows, explicit zero, numeric strings and long orders are different facts.
        activeOrder = { ...order, frais_livraison: null, prix_ht: null, prix_ttc: null, discount_ht: null, discount_ttc: null };
        activeDetails = [{ ...details[0], qte: null, prix_unitaire: null, prix_ttc: null, produit: { designation_fr: '<img src=x onerror=alert(1)> بروتين' } }];
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-order-document]');
        assert.deepEqual(await page.$$eval('[data-order-document] dl:last-of-type > div', els => els.map(el => el.textContent).filter(text => /DT/.test(text))), []);
        assert.equal(await page.$eval('[data-order-document] tbody', el => el.textContent.includes('—')), true);
        assert.equal(await page.$('[data-order-document] tbody img'), null);
        activeOrder = { ...order, frais_livraison: '0', prix_ttc: '224.125' };
        activeDetails = Array.from({ length: 65 }, (_, i) => ({ ...details[i % 2], id: i + 1, produit: { designation_fr: `${names[i % 2]} — format familial (${i + 1})` } }));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-order-document]');
        assert.equal(await page.$eval('[data-order-document]', el => el.textContent.includes('224,125 DT')), true);
        assert.equal(await page.$eval('[data-order-document]', el => el.textContent.includes('0,000 DT')), true);
        assert.equal(await page.$$eval('[data-order-document] tbody tr', rows => rows.length), 65);
        await page.emulateMediaType('print');
        await page.pdf({ path: `${out}/long-order.pdf`, preferCSSPageSize: true, printBackground: true });
        results.push({ scenario: 'missing-zero-numeric-strings-escaped-content-65-lines', passed: true });
      }
    }
    await page.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(`${out}/measurements.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
