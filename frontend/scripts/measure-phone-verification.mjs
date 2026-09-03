// Isolated browser fixtures: no account creation, paid SMS, or real points.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { AUDIT } from './lib/contrast-audit.mjs';

const base = process.argv[2] || 'http://localhost:3004';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
await fs.mkdir('.snap/phone-verification', { recursive: true });
let checked = 0;
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1024, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    let user = { id: 987654, name: 'Client test', email: 'fixture@example.test', phone: '+21620123456', phone_verified: false, email_verified: false, welcome_bonus_eligible: true, points_balance: 0 };
    let sends = 0;
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.evaluateOnNewDocument((user, theme) => {
      localStorage.setItem('token', 'phone-test-fixture');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('theme', theme);
    }, user, theme);
    await page.setRequestInterception(true);
    page.on('request', async req => {
      const pathname = new URL(req.url()).pathname;
      const respond = (data, status = 200) => req.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (pathname.endsWith('/profil')) return respond(user);
      if (pathname.endsWith('/phone-verification/send')) {
        sends++;
        return respond({ message: 'Code envoyé par SMS.', phone: '+21620123456', expires_in: 180, resend_after: 60 });
      }
      if (pathname.endsWith('/phone-verification/verify')) {
        const code = JSON.parse(req.postData()).code;
        if (code !== '123456') return respond({ errors: { code: ['Code incorrect. Vérifiez les 6 chiffres reçus.'] } }, 422);
        user = { ...user, phone_verified: true, welcome_bonus_eligible: false, welcome_bonus_awarded: true, points_balance: 300, points_value_dt: 15 };
        return respond({ message: '300 points ajoutés : 15 DT pour vos prochains achats.', phone_verified: true, bonus_awarded: true, bonus_points: 300, points_value_dt: 15 });
      }
      if (req.method() !== 'GET') return respond({}, 200);
      return req.continue();
    });
    const check = async state => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${state}: overflow at ${width}`);
      const short = await page.evaluate(() => [...document.querySelectorAll('main button, main a, main input')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5);
      }).map(el => el.textContent || el.getAttribute('aria-label')));
      assert.deepEqual(short, [], `undersized targets at ${width}`);
      const contrast = await page.evaluate(AUDIT);
      assert.deepEqual(contrast, [], `${state}: text contrast at ${theme}/${width}`);
      // The shared audit reports details; retain the evidence next to screenshots.
      await fs.writeFile(`.snap/phone-verification/${theme}-${width}-${state}.json`, JSON.stringify(contrast, null, 2));
      await page.screenshot({ path: `.snap/phone-verification/${theme}-${width}-${state}.png`, fullPage: true });
      checked++;
    };
    await page.goto(`${base}/verify-phone`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type=tel]');
    await check('phone');
    await page.click('button[type=submit]');
    await page.waitForSelector('input[autocomplete=one-time-code]');
    assert.equal(sends, 1);
    await check('code');
    // Reload must retain the in-progress challenge, without buying a second SMS.
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('input[autocomplete=one-time-code]');
    assert.equal(sends, 1);
    await page.type('input[autocomplete=one-time-code]', '000000');
    await page.click('button[type=submit]');
    await page.waitForSelector('[role=alert]');
    await check('invalid');
    await page.$eval('input[autocomplete=one-time-code]', el => el.select());
    await page.type('input[autocomplete=one-time-code]', '123456');
    await page.click('button[type=submit]');
    await page.waitForSelector('[data-phone-success]');
    assert.match(await page.$eval('main', el => el.innerText), /300 points/);
    await check('success');
    assert.deepEqual(errors, []);
    console.log(`PASS ${theme} ${width}: send, reload, invalid code, success; one SMS request`);
    await page.close();
  }
  console.log(`${checked} responsive state checks passed; all delivery calls mocked.`);
} finally { await browser.close(); }
