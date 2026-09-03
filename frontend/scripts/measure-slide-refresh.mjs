// Real storefront markup; optional local artwork interception. No external writes.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.QA_URL || 'https://protein.tn';
const mode = process.argv.includes('--before') ? 'before' : process.argv.includes('--local') ? 'local' : 'live';
const dir = path.resolve(`.snap/slide-refresh/${mode}`);
await fs.mkdir(dir, { recursive: true });
const release = path.resolve('../filament/resources/slide-assets/2026-09-03-natural');
const campaigns = [
  { name: 'returns', href: '/politique-de-remboursement', match: 'protein-returns-' },
  { name: 'pack-builder', href: '/pack-builder', match: 'protein-pack-builder-' },
  { name: 'welcome-bonus', href: '/register?offer=welcome-15', match: 'welcome-bonus-' },
];
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const results = [];
try {
  for (const theme of ['light', 'dark']) for (const width of (process.env.QA_WIDTHS || '390,1440').split(',').map(Number)) {
    const page = await browser.newPage();
    const errors = [];
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument(theme => localStorage.setItem('theme', theme), theme);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (!['GET', 'HEAD'].includes(request.method())) return request.abort();
      const url = decodeURIComponent(request.url());
      const campaign = campaigns.find(c => url.includes(c.match));
      if (mode === 'local' && campaign && request.resourceType() === 'image') {
        const format = url.includes('-mobile-') ? 'mobile' : 'desktop';
        return request.respond({ status: 200, contentType: 'image/webp', body: await fs.readFile(path.join(release, `${campaign.name}-${format}.webp`)) });
      }
      return request.continue();
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle2', timeout: 120000 });
    await page.waitForSelector('#hero-track');
    assert.equal(await page.$$eval('#hero-track > [role=group]', nodes => nodes.length), 3);
    for (let index = 0; index < campaigns.length; index++) {
      await page.click(`button[aria-label="Aller à la diapositive ${index + 1} sur 3"]`);
      await page.waitForFunction(index => {
        const track = document.getElementById('hero-track');
        return Math.abs(track.scrollLeft - index * track.clientWidth) < 2;
      }, {}, index);
      const selector = `#hero-slide-${index + 1}`;
      await page.waitForFunction(selector => {
        const img = document.querySelector(`${selector} img`);
        return img?.complete && img.naturalWidth > 0;
      }, { timeout: 120000 }, selector);
      await page.$eval(`${selector} img`, image => image.decode());
      await page.waitForSelector(`button[aria-label="Aller à la diapositive ${index + 1} sur 3"][aria-current="true"]`);
      assert.equal(await page.$eval(`${selector} a`, a => a.getAttribute('href')), campaigns[index].href);
      const geometry = await page.$eval(`${selector} img`, img => {
        const rect = img.getBoundingClientRect();
        const fit = getComputedStyle(img).objectFit;
        const scale = (fit === 'contain' ? Math.min : Math.max)(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
        return { width: rect.width, height: rect.height, sourceWidth: img.naturalWidth, sourceHeight: img.naturalHeight, fit, cropX: Math.max(0, img.naturalWidth * scale - rect.width), cropY: Math.max(0, img.naturalHeight * scale - rect.height), src: img.currentSrc };
      });
      assert.ok(geometry.src.includes(width < 768 ? 'mobile' : 'desktop'), 'dedicated responsive artwork');
      if (mode === 'live') assert.ok(geometry.src.includes('20260903-natural'), 'new artwork is actually live');
      if (index === 0) {
        const matchingPreload = await page.$$eval('link[rel=preload][as=image]', (links, src) => links.some(link => link.href === src && matchMedia(link.media || 'all').matches), geometry.src);
        assert.ok(matchingPreload, 'LCP preload must match the rendered image');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'page overflow');
      await page.screenshot({ path: path.join(dir, `${theme}-${width}-${campaigns[index].name}-page.png`) });
      // A clip screenshot temporarily resizes Chrome's viewport and resets scroll-snap.
      // Use only viewport captures, then assert the actual visible slide stayed selected.
      assert.equal(await page.$eval('#hero-track', (track, index) => Math.abs(track.scrollLeft - index * track.clientWidth) < 2, index), true, 'screenshot shows the requested slide');
      results.push({ theme, viewportWidth: width, campaign: campaigns[index].name, ...geometry });
    }
    assert.deepEqual(errors, [], 'page exceptions');
    console.log(`${mode} ${theme}/${width}: 3 slides, links, responsive sources, LCP preload and overflow verified`);
    await page.close();
  }
} finally { await browser.close(); }
await fs.writeFile(path.join(dir, 'measurements.json'), JSON.stringify(results, null, 2));
