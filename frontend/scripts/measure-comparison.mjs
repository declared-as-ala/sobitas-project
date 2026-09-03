// Actual catalogue reads; every non-GET request intercepted. Never sends a client email.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { AUDIT } from './lib/contrast-audit.mjs';

const base = process.argv[2] || 'http://localhost:3010';
const widths = process.env.QA_WIDTHS ? process.env.QA_WIDTHS.split(',').map(Number) : [320, 390, 768, 1024, 1440];
const themes = process.env.QA_THEMES ? process.env.QA_THEMES.split(',') : ['light', 'dark'];
const out = '.snap/comparison-after';
await fs.mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
let checks = 0;
try {
  for (const theme of themes) for (const width of widths) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.evaluateOnNewDocument(theme => { localStorage.setItem('theme', theme); }, theme);
    let submissions = 0;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/contact')) {
        const data = JSON.parse(request.postData());
        assert.equal(data.product_id, 9549);
        assert.equal(data.phone, '20 000 000');
        submissions++;
        return request.respond({ status: submissions === 1 ? 503 : 200, contentType: 'application/json', body: JSON.stringify(submissions === 1 ? { message: 'Simulated temporary failure' } : { success: 'Demande reçue' }) });
      }
      if (!['GET', 'HEAD'].includes(request.method())) return request.respond({ status: 200, contentType: 'application/json', body: '{}' });
      return request.continue();
    });
    const check = async (state, scope) => {
      await page.evaluate(async scope => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const root = document.querySelector(scope);
        await Promise.all(root.getAnimations({ subtree: true }).filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
      }, scope);
      const geometry = await page.evaluate(scope => {
        const root = document.querySelector(scope);
        const r = root.getBoundingClientRect();
        const small = [...root.querySelectorAll('button, a, input, summary')].filter(el => {
          const b = el.getBoundingClientRect();
          return b.width > 1 && b.height > 1 && (b.width < 43.5 || b.height < 43.5);
        }).map(el => ({ text: el.textContent, aria: el.getAttribute('aria-label'), w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height, cls: el.className }));
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1 || r.right > innerWidth + 1 || r.left < -1 || root.scrollWidth > root.clientWidth + 1, small };
      }, scope);
      await page.screenshot({ path: `${out}/${theme}-${width}-${state}.png`, fullPage: false });
      assert.equal(geometry.overflow, false, `${theme}/${width}/${state}: overflow`);
      assert.deepEqual(geometry.small, [], `${theme}/${width}/${state}: tap targets`);
      const source = AUDIT.toString().replace("document.querySelectorAll('*')", `document.querySelectorAll('${scope}, ${scope} *')`);
      const contrast = await page.evaluate(`(${source})()`);
      assert.deepEqual(contrast, [], `${theme}/${width}/${state}: contrast`);
      await fs.writeFile(`${out}/${theme}-${width}-${state}.json`, JSON.stringify({ geometry, contrast }, null, 2));
      await page.screenshot({ path: `${out}/${theme}-${width}-${state}.png`, fullPage: false });
      checks++;
    };
    await page.goto(`${base}/whey-isolate/primaforce-whey-protein-isolate-vanilla-907-g`, { waitUntil: 'networkidle2', timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('[data-comparison]');
    for (const img of await page.$$('[data-comparison] img')) {
      await img.evaluate(el => el.scrollIntoView({ block: 'center' }));
      await page.waitForFunction(el => el.complete && el.naturalWidth > 0, {}, img);
    }
    await page.$eval('[data-comparison]', el => el.scrollIntoView({ block: 'start' }));
    await check('comparison', '[data-comparison]');
    await page.screenshot({ path: `${out}/${theme}-${width}-full.png`, fullPage: true });
    assert.equal(await page.$eval('[data-comparison]', el => /PACK MUSCLE SEC/.test(el.textContent)), false);
    assert.equal(await page.$$eval('[data-comparison] img', imgs => imgs.length >= 2), true);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(el => /Demander ce produit/i.test(el.textContent) && el.getBoundingClientRect().width > 0)?.click());
    await page.waitForSelector('[data-slot=sheet-content]');
    await page.waitForSelector('[data-request-alternatives]');
    await new Promise(resolve => setTimeout(resolve, 550)); // Radix entry transition.
    await check('alternatives', '[data-slot=sheet-content]');
    await page.evaluate(() => [...document.querySelectorAll('[data-slot=sheet-content] button')].find(el => /Je préfère demander/.test(el.textContent)).click());
    await page.waitForSelector('input[type=tel]');
    await check('form', '[data-slot=sheet-content]');
    await page.type('#product-request-form input[autocomplete=name]', 'Client Démonstration');
    await page.type('#product-request-form input[type=tel]', '20 000 000');
    await page.type('#product-request-form input[type=email]', 'client@example.test');
    await page.click('button[form=product-request-form]');
    await page.waitForSelector('[role=alert]');
    assert.equal(await page.$eval('input[type=tel]', el => el.value), '20 000 000');
    await check('error', '[data-slot=sheet-content]');
    await page.click('button[form=product-request-form]');
    await page.waitForFunction(() => document.querySelector('[data-slot=sheet-content]')?.textContent.includes('Merci Client Démonstration'));
    await check('success', '[data-slot=sheet-content]');
    assert.equal(submissions, 2);
    assert.deepEqual(errors, []);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-slot=sheet-content]', { hidden: true });
    console.log(`${theme}/${width}: comparison, alternatives, form, retry, success passed`);
    await page.close();
  }
} finally { await browser.close(); }
console.log(`${checks} responsive state checks passed. No real email sent.`);
