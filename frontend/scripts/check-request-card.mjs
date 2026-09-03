// Catalogue-card entry: simulate alternative availability; all writes blocked.
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.argv[2] || 'http://localhost:3010';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
await fs.mkdir('.snap/comparison-card', { recursive: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  let mode = 'error'; let requests = 0; let release;
  await page.setRequestInterception(true);
  page.on('request', async req => {
    if (new URL(req.url()).pathname.includes('/similar_products/')) {
      requests++;
      await new Promise(resolve => { release = resolve; });
      const product = { id: 987654, designation_fr: 'Alternative témoin', slug: 'fixture', prix: 200, qte: 10, cover: 'https://admin.protein.tn/logo.png', sous_categorie_id: 8 };
      return req.respond({ status: mode === 'error' ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ products: mode === 'empty' ? [] : [product, { ...product, id: 987655, pack: true, designation_fr: 'PACK TÉMOIN' }, { ...product, id: 987656, qte: 0, designation_fr: 'INDISPONIBLE TÉMOIN' }, { ...product, id: 987657, force_out_of_stock: true, designation_fr: 'FORCÉ TÉMOIN' }] }) });
    }
    if (!['GET', 'HEAD'].includes(req.method())) return req.respond({ status: 200, contentType: 'application/json', body: '{}' });
    return req.continue();
  });
  await page.goto(`${base}/whey-isolate`, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForFunction(() => [...document.querySelectorAll('main button')].some(el => el.textContent.trim() === 'Demander'));
  for (mode of ['error', 'empty', 'success']) {
    const before = requests;
    release = undefined;
    await page.evaluate(() => [...document.querySelectorAll('main button')].find(el => el.textContent.trim() === 'Demander').click());
    await page.waitForSelector('[data-slot=sheet-content]');
    await page.waitForSelector('[role=status][aria-label="Recherche des alternatives"]');
    await page.screenshot({ path: `.snap/comparison-card/${mode}-loading.png` });
    while (!release) await new Promise(resolve => setTimeout(resolve, 50));
    release();
    await page.waitForSelector('[role=status][aria-label="Recherche des alternatives"]', { hidden: true });
    const text = await page.$eval('[data-slot=sheet-content]', el => el.textContent);
    if (mode === 'success') {
      assert.ok(text.includes('Alternative témoin'));
      assert.equal(/PACK TÉMOIN|INDISPONIBLE TÉMOIN|FORCÉ TÉMOIN/.test(text), false);
    } else assert.ok(text.includes(mode === 'error' ? 'ne sont pas disponibles' : 'Aucune alternative'));
    assert.equal(requests - before, 1, 'One bounded request per opening');
    await page.screenshot({ path: `.snap/comparison-card/${mode}.png` });
    await page.evaluate(() => [...document.querySelectorAll('[data-slot=sheet-content] button')].find(el => /Je préfère demander/.test(el.textContent)).click());
    await page.waitForSelector('#product-request-form');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-slot=sheet-content]', { hidden: true });
    console.log(`Catalogue entry: ${mode}, loading, bypass and close passed`);
  }
} finally { await browser.close(); }
