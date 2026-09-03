// Checkout fixtures only: ALL writes are intercepted; no orders, emails or SMS leave this test.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { AUDIT } from './lib/contrast-audit.mjs';
const base = process.argv[2] || 'http://localhost:3010';
const before = process.argv.includes('--before');
const out = `.snap/checkout-${before ? 'before' : 'after'}`;
await fs.mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
try {
  for (const theme of (process.env.QA_THEMES?.split(',') || ['light', 'dark'])) for (const width of (process.env.QA_WIDTHS?.split(',').map(Number) || (before ? [390, 1440] : [320, 390, 768, 1024, 1440]))) {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width, height: 844 });
    await page.evaluateOnNewDocument(theme => {
      localStorage.setItem('theme', theme);
      localStorage.setItem('cart', JSON.stringify([{ product: { id: 999999, designation_fr: 'Whey protéine — produit de démonstration', prix: 299, qte: 20, stock: 20 }, quantity: 1 }]));
    }, theme);
    await page.setRequestInterception(true);
    let writes = [], mode = 'network', release;
    let addressFails = false;
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', async request => {
      const path = new URL(request.url()).pathname;
      if (path === '/data.json' && addressFails) return request.respond({ status: 503, body: '{}' });
      if (path.endsWith('/commande/999999')) {
        assert.equal(new URL(request.url()).searchParams.get('token'), 'synthetic-guest-token');
        return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ facture: { id: 999999, numero: 'TEST-ONLY', livraison_nom: 'Client Test', livraison_phone: '20123456', prix_ht: 299, prix_ttc: 309, frais_livraison: 10, created_at: '2026-09-03' }, details_facture: [{ id: 1, product: { designation_fr: 'Produit confirmé par le serveur' }, qte: 1, prix_ttc: 299 }] }) });
      }
      if (path === '/api/orders') {
        writes.push({ body: JSON.parse(request.postData()), key: request.headers()['idempotency-key'] });
        if (mode === 'pending') await new Promise(resolve => { release = resolve; });
        const status = mode === 'validation' ? 422 : mode === 'stock' ? 409 : mode === 'success' ? 201 : 503;
        const body = mode === 'validation' ? { error: 'Invalid fields', errors: { 'commande.livraison_phone': ['Invalid'] } } : mode === 'stock' ? { error: 'Stock insuffisant pour ce produit.' } : mode === 'success' ? { id: 999999, numero: 'TEST-ONLY', order_token: 'synthetic-guest-token' } : { error: 'Service temporairement indisponible.' };
        return request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (!['GET', 'HEAD'].includes(request.method())) return request.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Service temporairement indisponible.' }) });
      return request.continue();
    });
    await page.goto(`${base}/checkout`, { waitUntil: 'networkidle2', timeout: 180000 });
    await page.waitForSelector('#gouvernorat');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${out}/${theme}-${width}.png`, fullPage: true });
    if (!before) {
      const check = async state => {
        await page.evaluate(async () => {
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          await Promise.all(document.querySelector('.checkout-viewport-root').getAnimations({ subtree: true }).filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
        });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'horizontal overflow');
        const small = await page.$$eval('.checkout-viewport-root button, .checkout-viewport-root input, .checkout-viewport-root select, .checkout-viewport-root a', els => els.filter(el => {
          const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && (r.width < 43.5 || r.height < 43.5);
        }).map(el => el.id || el.textContent));
        assert.deepEqual(small, [], 'tap targets');
        const source = AUDIT.toString().replace("document.querySelectorAll('*')", "document.querySelectorAll('.checkout-viewport-root, .checkout-viewport-root *')");
        assert.deepEqual(await page.evaluate(`(${source})()`), [], `contrast ${theme}/${width}/${state}`);
        await page.screenshot({ path: `${out}/${theme}-${width}-${state}.png`, fullPage: true });
      };
      const submit = () => page.click(width < 1024 ? '.checkout-cta-button' : '#checkout-form button[type=submit]');
      const focus = async id => {
        try {
          await page.waitForFunction(id => document.activeElement?.id === id, { timeout: 8000 }, id);
          await page.waitForFunction(id => { const r = document.getElementById(id).getBoundingClientRect(); return r.top >= 100 && r.bottom <= innerHeight - 75; }, { timeout: 8000 }, id);
        } catch (error) {
          console.log(await page.evaluate(id => ({ id, active: document.activeElement?.outerHTML, rect: document.getElementById(id)?.getBoundingClientRect().toJSON() }), id));
          await page.screenshot({ path: `${out}/${theme}-${width}-failed-focus.png` });
          throw error;
        }
        assert.equal(await page.$eval(`#${id}`, el => el.getAttribute('aria-invalid')), 'true');
      };
      const fill = async (id, text) => { await page.$eval(`#${id}`, el => el.value = ''); await page.type(`#${id}`, text); };
      await check('empty');
      if (width < 1024) {
        await page.click('.checkout-cta-footer [data-slot=sheet-trigger]');
        await page.waitForSelector('[data-slot=sheet-content]');
        await page.evaluate(async () => {
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          await Promise.all(document.querySelector('[data-slot=sheet-content]').getAnimations({ subtree: true }).map(a => a.finished.catch(() => {})));
        });
        const source = AUDIT.toString().replace("document.querySelectorAll('*')", "document.querySelectorAll('[data-slot=sheet-content], [data-slot=sheet-content] *')");
        assert.deepEqual(await page.evaluate(`(${source})()`), [], 'summary contrast');
        assert.equal(await page.$$eval('[data-slot=sheet-content] button', els => els.length), 1, 'one clear close control');
        await page.screenshot({ path: `${out}/${theme}-${width}-summary.png` });
        await page.click('[aria-label="Fermer le récapitulatif"]');
        await page.waitForSelector('[data-slot=sheet-content]', { hidden: true });
        await page.evaluate(() => { Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: innerHeight - 300 }); visualViewport.dispatchEvent(new Event('resize')); });
        await page.waitForFunction(() => document.querySelector('.checkout-cta-footer').inert === true);
        assert.equal(await page.$eval('#checkout-form button[type=submit]', el => el.getBoundingClientRect().height >= 44), true);
        await page.evaluate(() => { delete window.visualViewport.height; visualViewport.dispatchEvent(new Event('resize')); });
        await page.waitForFunction(() => document.querySelector('.checkout-cta-footer').inert === false);
      }
      await submit(); await focus('livraison_nom');
      assert.equal(writes.length, 0);
      await check('errors');
      await fill('livraison_nom', 'Client Test');
      await submit(); await focus('livraison_phone');
      await fill('livraison_phone', '123');
      await submit(); await focus('livraison_phone');
      await fill('livraison_phone', '+216 (20) 123-456');
      await fill('livraison_email', 'bad-email');
      await submit(); await focus('livraison_email');
      await page.click('#livraison_email'); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace');
      await submit(); await focus('gouvernorat');
      const chooseFirst = async id => {
        await page.waitForSelector(`#${id} option:nth-child(2)`);
        const value = await page.$eval(`#${id} option:nth-child(2)`, el => el.value);
        await page.select(`#${id}`, value);
      };
      await chooseFirst('gouvernorat'); await submit(); await focus('delegation');
      await chooseFirst('delegation'); await submit(); await focus('localite');
      await chooseFirst('localite'); await submit(); await focus('livraison_adresse1');
      await fill('livraison_adresse1', '12 rue Test');
      // Changing a parent must clear its dependent choices.
      const otherGov = await page.$eval('#gouvernorat option:nth-child(3)', el => el.value);
      await page.select('#gouvernorat', otherGov);
      assert.equal(await page.$eval('#delegation', el => el.value), '');
      assert.equal(await page.$('#localite'), null);
      await chooseFirst('delegation'); await chooseFirst('localite');
      await page.$eval('#livraison_adresse1', el => el.blur());
      await check('filled');
      mode = 'pending'; await submit();
      await page.waitForFunction(() => document.querySelector('#checkout-form').getAttribute('aria-busy') === 'true');
      await page.$eval('#checkout-form', el => { el.requestSubmit(); el.requestSubmit(); });
      assert.equal(writes.length, 1, 'duplicate submit blocked');
      assert.equal(await page.$eval('#livraison_phone', el => el.matches(':disabled')), true);
      mode = 'network'; release();
      await page.waitForSelector('#checkout-submit-error');
      await page.waitForFunction(() => document.activeElement.id === 'checkout-submit-error');
      await check('network-error');
      assert.equal(await page.$eval('#livraison_adresse1', el => el.value), '12 rue Test');
      assert.equal(writes[0].body.commande.livraison_phone, '+21620123456');
      assert.equal(writes[0].body.commande.livraison_email ?? '', '');
      mode = 'validation'; await submit(); await focus('livraison_phone');
      assert.equal(writes[0].key, writes[1].key, 'retry uses same idempotency key');
      await fill('livraison_phone', '20 123 456');
      mode = 'stock'; await submit();
      await page.waitForFunction(() => document.querySelector('#checkout-submit-error')?.textContent.includes('Stock insuffisant'));
      assert.notEqual(writes[2].key, writes[1].key, 'changed payload gets new key');
      mode = 'success'; await submit();
      await page.waitForFunction(() => document.body.textContent.includes('TEST-ONLY'));
      assert.equal(await page.evaluate(() => document.body.textContent.includes('Produit confirmé par le serveur')), true);
      assert.equal(writes.length, 4);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('cart')).length), 0);
      assert.deepEqual(pageErrors, []);
      // Reload with a saved fixture cart, fail address loading, then recover without losing typed fields.
      addressFails = true; await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#checkout-address-retry');
      await fill('livraison_nom', 'Client préservé');
      await fill('livraison_phone', '20123456');
      await submit();
      await page.waitForFunction(() => document.activeElement.id === 'checkout-address-retry');
      await page.waitForFunction(() => { const r = document.getElementById('checkout-address-retry').getBoundingClientRect(); return r.top >= 120 && r.bottom <= innerHeight - 90; });
      addressFails = false; await page.click('#checkout-address-retry');
      await page.waitForSelector('#gouvernorat');
      assert.equal(await page.$eval('#livraison_nom', el => el.value), 'Client préservé');
      assert.equal(writes.length, 4, 'address failure never submits an order');
      await check('address-recovered');
    }
    console.log(`${theme}/${width}: ${before ? 'captured' : 'validation, scroll, focus, retries, duplicate prevention, success, address recovery, contrast and targets passed'}`);
    await page.close();
  }
} finally { await browser.close(); }
