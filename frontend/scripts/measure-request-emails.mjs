import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { AUDIT } from './lib/contrast-audit.mjs';
const folder = process.argv[2] || '.snap/request-emails-final';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
try {
  for (const kind of ['client', 'admin']) for (const width of [320, 390, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.goto(pathToFileURL(path.resolve(folder, `${kind}.html`)).href, { waitUntil: 'networkidle2' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${kind}/${width}: overflow`);
    assert.equal(await page.$eval('img', img => img.complete && img.naturalWidth > 0), true, 'Logo loaded');
    const contrast = await page.evaluate(AUDIT);
    assert.deepEqual(contrast, [], `${kind}/${width}: contrast`);
    await page.screenshot({ path: `${folder}/${kind}-${width}.png`, fullPage: true });
    await fs.writeFile(`${folder}/${kind}-${width}.json`, JSON.stringify({ overflow: false, contrast }, null, 2));
    console.log(`${kind}/${width}: logo, layout and contrast passed`);
    await page.close();
  }
} finally { await browser.close(); }
