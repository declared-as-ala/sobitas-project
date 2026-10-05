// Isolated browser fixtures: no account creation, paid SMS, or real points.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { AUDIT } from './lib/contrast-audit.mjs';

const base = process.argv[2] || 'http://localhost:3004';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
await fs.mkdir('.snap/verification-polish', { recursive: true });
let checked = 0;
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1024, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    let user = { id: 987654, name: 'Client test', email: 'fixture@example.test', phone: '+21620123456', phone_verified: false, email_verified: false, welcome_bonus_eligible: true, welcome_bonus_status: 'phone_required', points_balance: 0 };
    let sends = 0;
    let claims = 0;
    let failProfileOnce = false;
    const errors = [];
    page.on('pageerror', e => errors.push(`${page.url()}: ${e.message}`));
    await page.evaluateOnNewDocument((user, theme) => {
      localStorage.setItem('token', 'phone-test-fixture');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('theme', theme);
    }, user, theme);
    await page.setRequestInterception(true);
    page.on('request', async req => {
      const pathname = new URL(req.url()).pathname;
      const respond = (data, status = 200) => req.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
      // A measurement run is not a visit: never send analytics hits to the shop's property.
      if (/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|google\.[a-z.]+\/ads/.test(req.url())) return req.respond({ status: 204, body: '' });
      if (pathname.endsWith('/profil')) {
        if (failProfileOnce) { failProfileOnce = false; return respond({ message: 'Temporary failure' }, 503); }
        return respond(user);
      }
      const award = () => {
        user = { ...user, phone_verified: true, welcome_bonus_eligible: false, welcome_bonus_status: 'awarded', welcome_bonus_awarded: true, points_balance: 300, points_value_dt: 15 };
        // Protinas v3 (02/10/2026): the gift is credited at verification, with an expiry and the
        // basket from which it applies whole — the two fields the success screen prints.
        const expires = new Date(Date.now() + 60 * 86400_000).toISOString();
        return { message: '300 Protinas cadeau ajoutées : 15 DT à utiliser avant le …, en entier dès 180 DT d’articles.', phone: user.phone, phone_verified: true, bonus_awarded: true, bonus_status: 'awarded', bonus_points: 300, points_balance: 300, points_value_dt: 15, bonus_expires_at: expires, gift_full_from_dt: 180 };
      };
      if (pathname.endsWith('/phone-verification/claim-bonus')) {
        claims++;
        failProfileOnce = true;
        return respond(award());
      }
      // The page restores an in-progress challenge from this on reload; unmocked, the GET reached
      // the real backend with a fixture token and the « reload keeps the challenge » step timed out.
      if (pathname.endsWith('/phone-verification/status')) {
        return respond(sends > 0 && !user.phone_verified
          ? { active: true, phone: '+21620123456', masked_phone: '+216 20 *** *56', expires_in: 170, resend_after: 50, attempts_remaining: 5 }
          : { active: false });
      }
      if (pathname.endsWith('/phone-verification/send')) {
        sends++;
        return respond({ message: 'Code envoyé par SMS.', phone: '+21620123456', expires_in: 180, resend_after: 60 });
      }
      if (pathname.endsWith('/phone-verification/verify')) {
        const code = JSON.parse(req.postData()).code;
        if (code !== '123456') return respond({ errors: { code: ['Code incorrect. Vérifiez les 6 chiffres reçus.'] } }, 422);
        return respond(award());
      }
      if (pathname.endsWith('/email-verification/verify')) {
        if (JSON.parse(req.postData()).code !== '123456') return respond({ errors: { code: ['Code incorrect.'] } }, 422);
        user = { ...user, email_verified: true };
        return respond({ message: 'Email confirmé.', email_verified: true });
      }
      if (pathname.endsWith('/client_commandes')) return respond({ data: [] });
      if (pathname.endsWith('/points/history')) return respond({ transactions: [] });
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
      await fs.writeFile(`.snap/verification-polish/${theme}-${width}-${state}.json`, JSON.stringify(contrast, null, 2));
      await page.screenshot({ path: `.snap/verification-polish/${theme}-${width}-${state}.png`, fullPage: true });
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
    // The gift is THERE now, not « en attente » until a first delivery: no pending state to test.
    assert.equal(await page.$eval('h1', el => el.textContent.includes('Vos 15 DT sont là')), true, 'v3 success title');
    assert.match(await page.$eval('main', el => el.innerText), /300 Protinas cadeau viennent d’être ajoutées/);
    assert.match(await page.$eval('main', el => el.innerText), /en entier dès 180 DT d’articles/);
    assert.equal(await page.$eval('main', el => /en attente|à la livraison de votre première commande/.test(el.innerText)), false, 'no pending-delivery copy');
    assert.equal(await page.$eval('main', el => el.innerText.includes('Faire mes achats')), true);
    await check('success');
    // An old, already verified account must never buy another SMS to catch up.
    user = { ...user, welcome_bonus_awarded: false, welcome_bonus_eligible: true, welcome_bonus_status: 'claimable', points_balance: 0, points_value_dt: 0 };
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('Recevoir mes 15 DT'));
    await check('legacy-claim');
    await page.click('button[type=button]');
    await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Vos 15 DT sont là'));
    assert.equal(claims, 1);
    assert.equal(sends, 1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('user')).points_balance), 300, 'accepted server result survives a failed profile GET');
    await check('legacy-awarded');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-phone-success]');
    assert.equal(await page.$eval('main', el => el.innerText.includes('Recevoir mes 15 DT')), false);
    assert.equal(claims, 1);
    await page.goto(`${base}/account?section=profile`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-account-verification]');
    assert.match(await page.$eval('[data-account-verification]', el => el.innerText), /Membre vérifié/i);
    await check('account-badge');
    await page.goto(`${base}/verify-email`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[autocomplete=one-time-code]');
    await check('email');
    await page.type('input[autocomplete=one-time-code]', '000000');
    await page.click('button[type=submit]');
    await page.waitForSelector('[role=alert]');
    await check('email-error');
    await page.$eval('input[autocomplete=one-time-code]', el => el.select());
    await page.type('input[autocomplete=one-time-code]', '123456');
    await page.click('button[type=submit]');
    await page.waitForSelector('[data-email-success]');
    await check('email-success');
    assert.deepEqual(errors, []);
    console.log(`PASS ${theme} ${width}: send, reload, invalid code, success; one SMS request`);
    await page.close();
  }
  console.log(`${checked} responsive state checks passed; all delivery calls mocked.`);
} finally { await browser.close(); }
