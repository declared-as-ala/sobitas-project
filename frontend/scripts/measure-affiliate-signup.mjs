/**
 * Walk the affiliate signup end to end, in both themes and both widths, and measure it.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 * /partenaires/inscription is a five-screen state machine behind a stub. `lint:design` reads
 * source and cannot see it; `visual-snap` loads a URL and only ever reaches screen one. Four of
 * the six screens in this flow are unreachable without clicking, which means they are unreachable
 * to every automated check the repo already has.
 *
 * ── THE THREE WAYS THIS KIND OF GUARD LIES, AND WHAT IS DONE ABOUT EACH ───────────────────
 *  1. It swallows its own navigation error. `measure-account`'s first version wrapped a tab click
 *     in `.catch(() => {})` against a selector Radix does not render, measured the default tab
 *     three times and reported three passes. So every transition here ends in `expectStep()`,
 *     which reads `data-signup-step` and THROWS when the screen did not change. A click that did
 *     nothing fails the run.
 *  2. It measures a quantity that cannot express failure. `document.scrollHeight` is never
 *     smaller than the viewport, so "does this fit" answers yes for every page that fits and says
 *     nothing about the slack. This measures the CARD (`[data-signup-card]`) and reports its real
 *     height plus the position of the primary action.
 *  3. It measures a different page than production. This one runs against the STUB by design —
 *     that is the point, the backend does not exist — so every report line says so, and the run
 *     asserts the "mode démonstration" notice is present. If that notice ever disappears while
 *     `isStub` is true, the flow is lying to a customer and this fails.
 *
 * Contrast is the shared `lib/contrast-audit.mjs` pass, run once per screen per theme, so the
 * six screens are held to the same WCAG AA bar as every other surface on the site.
 *
 * Usage:
 *   node scripts/measure-affiliate-signup.mjs --base http://127.0.0.1:3247
 *   node scripts/measure-affiliate-signup.mjs --base http://127.0.0.1:3247 --out .snap/affiliate
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { AUDIT } from './lib/contrast-audit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
const one = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || !argv[i + 1] ? fallback : argv[i + 1];
};

const BASE = one('base', 'http://127.0.0.1:3000').replace(/\/$/, '');
const OUT = path.resolve(ROOT, one('out', '.snap/affiliate'));
const WIDTHS = [390, 1440];
const THEMES = ['light', 'dark'];

/** The stub's fixed code. Kept in sync by the "mode démonstration" assertion below. */
const DEMO_CODE = '123456';

fs.mkdirSync(OUT, { recursive: true });

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * A real image to upload
 *
 * The tile refuses anything under 20 KB, so a 1x1 placeholder would be rejected and the run would
 * "pass" having never exercised the upload. Random noise defeats deflate, so a small PNG here is
 * comfortably over the floor and under the 8 MB ceiling — the same shape as a phone photo.
 * ──────────────────────────────────────────────────────────────────────────────────────────*/
function makePng(width, height) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < width * 3; x++) raw[p++] = Math.floor(Math.random() * 256);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

const CARD_PATH = path.join(OUT, '_id-card-sample.png');
fs.writeFileSync(CARD_PATH, makePng(360, 230));

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Browser
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

const SYSTEM_CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]
  .filter(Boolean)
  .find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

const browser = await puppeteer.launch({
  headless: 'new',
  ...(SYSTEM_CHROME ? { executablePath: SYSTEM_CHROME } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const failures = [];
const rows = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height: width < 768 ? 844 : 900,
      deviceScaleFactor: 1,
      isMobile: width < 768,
      hasTouch: width < 768,
    });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    // The app switches on a `dark` class, not on the media query alone. Both are set, and the
    // stub's own store is cleared so every run starts from a genuinely empty flow rather than
    // resuming whatever the previous run left behind.
    await page.evaluateOnNewDocument((t) => {
      try {
        localStorage.setItem('theme', t);
        localStorage.removeItem('pt_affilie_signup_v1');
        localStorage.removeItem('pt_affilie_stub_v1');
      } catch {
        /* storage blocked; the class below still applies */
      }
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.toggle('dark', t === 'dark');
      });
    }, theme);

    const consoleErrors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));

    const tag = `${theme}--${width}`;

    /** Read `data-signup-step` and fail loudly when the flow did not move. */
    const expectStep = async (expected, label) => {
      const deadline = Date.now() + 20_000;
      let seen = null;
      while (Date.now() < deadline) {
        seen = await page.$eval('[data-signup-step]', (el) => el.getAttribute('data-signup-step')).catch(() => null);
        if (seen === expected) return;
        await sleep(150);
      }
      throw new Error(`[${tag}] ${label}: expected step "${expected}", saw "${seen}"`);
    };

    /**
     * Click the first control INSIDE THE FLOW whose visible text contains `text`.
     *
     * Case-insensitive, and that is not laziness: `font-display` headings and `AuthSubmit`
     * labels carry `text-transform: uppercase`, and `innerText` returns the TRANSFORMED text.
     * The first version of this script matched "Salle de sport" against "SALLE DE SPORT" and
     * died on the first click — which is the behaviour I want from a guard, but the fix belongs
     * here rather than in twenty hand-uppercased needles.
     *
     * Scoped to `[data-signup-step]` so the footer's own buttons can never satisfy a match.
     */
    const clickText = async (text) => {
      const handle = await page.evaluateHandle((needle) => {
        const scope = document.querySelector('[data-signup-step]') ?? document.body;
        const want = needle.toLocaleLowerCase();
        return (
          Array.from(scope.querySelectorAll('button, a')).find(
            (el) =>
              el.offsetParent !== null &&
              el.innerText.replace(/\s+/g, ' ').toLocaleLowerCase().includes(want),
          ) ?? null
        );
      }, text);
      const element = handle.asElement();
      if (!element) throw new Error(`[${tag}] no visible control containing "${text}"`);
      await element.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await element.click();
      await handle.dispose();
    };

    /** Case-insensitive `body.innerText` wait, for the same `text-transform` reason. */
    const waitForText = (needle, timeout = 30_000) =>
      page.waitForFunction(
        (n) => document.body.innerText.toLocaleLowerCase().includes(n.toLocaleLowerCase()),
        { timeout },
        needle,
      );

    const fill = async (labelText, value) => {
      const handle = await page.evaluateHandle((needle) => {
        const label = Array.from(document.querySelectorAll('label')).find((l) =>
          l.innerText.replace(/\s+/g, ' ').includes(needle),
        );
        if (!label) return null;
        return label.htmlFor ? document.getElementById(label.htmlFor) : label.querySelector('input, select');
      }, labelText);
      const element = handle.asElement();
      if (!element) throw new Error(`[${tag}] no field labelled "${labelText}"`);
      const isSelect = await element.evaluate((el) => el.tagName === 'SELECT');
      if (isSelect) await element.select(value);
      else {
        await element.click({ clickCount: 3 });
        await element.type(value, { delay: 5 });
      }
      await handle.dispose();
    };

    /** Screenshot + contrast + geometry for the screen currently showing. */
    const capture = async (name) => {
      await sleep(250);
      await page.screenshot({ path: path.join(OUT, `${name}--${tag}.png`), fullPage: true });
      const audit = await page.evaluate(AUDIT);
      const fails = audit.filter((r) => r.status === 'FAIL');
      const geometry = await page.evaluate(() => {
        const card = document.querySelector('[data-signup-card]');
        const primary = card?.querySelector('button[type="submit"], button:not([type="button"])');
        const cta = Array.from(card?.querySelectorAll('button, a') ?? []).find((el) =>
          /continuer|recevoir|confirmer|envoyer|retour à la boutique/i.test(el.innerText),
        );
        const target = primary ?? cta ?? null;
        const small = Array.from(card?.querySelectorAll('button, a, select, input') ?? []).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.height < 44 && el.type !== 'file';
        });
        return {
          cardHeight: Math.round(card?.getBoundingClientRect().height ?? 0),
          ctaBottom: target ? Math.round(target.getBoundingClientRect().bottom + window.scrollY) : null,
          viewport: window.innerHeight,
          undersized: small.map((el) => `${el.tagName.toLowerCase()}:${el.innerText.slice(0, 24) || el.type}`),
        };
      });
      rows.push({ screen: name, theme, width, ...geometry, contrastFails: fails.length });
      if (fails.length) {
        failures.push(
          `[${tag}] ${name}: ${fails.length} contrast failure(s)\n` +
            fails
              .slice(0, 6)
              .map((f) => `      "${f.text}" ${f.r}:1 (min ${f.min}) ${f.fg} on ${f.bg} @${f.size}px`)
              .join('\n'),
        );
      }
      if (geometry.undersized.length) {
        failures.push(`[${tag}] ${name}: control(s) under 44px — ${geometry.undersized.join(', ')}`);
      }
    };

    /* ── The walk ─────────────────────────────────────────────────────────────────────── */

    await page.goto(`${BASE}/partenaires`, { waitUntil: 'networkidle2', timeout: 60_000 });
    await page.screenshot({ path: path.join(OUT, `landing--${tag}.png`), fullPage: true });
    {
      const audit = await page.evaluate(AUDIT);
      const fails = audit.filter((r) => r.status === 'FAIL');
      rows.push({ screen: 'landing', theme, width, cardHeight: null, ctaBottom: null, viewport: null, undersized: [], contrastFails: fails.length });
      if (fails.length) {
        failures.push(
          `[${tag}] landing: ${fails.length} contrast failure(s)\n` +
            fails.slice(0, 6).map((f) => `      "${f.text}" ${f.r}:1 (min ${f.min}) ${f.fg} on ${f.bg} @${f.size}px`).join('\n'),
        );
      }
      // Both doors must exist, and the primary one must be reachable without scrolling on a phone.
      const doors = await page.evaluate(() => {
        const signup = document.querySelector('a[href="/partenaires/inscription"]');
        const login = Array.from(document.querySelectorAll('a')).find((a) => /\/affilie/.test(a.href));
        return {
          signupTop: signup ? Math.round(signup.getBoundingClientRect().top) : null,
          signupBottom: signup ? Math.round(signup.getBoundingClientRect().bottom) : null,
          loginBottom: login ? Math.round(login.getBoundingClientRect().bottom) : null,
          viewport: window.innerHeight,
        };
      });
      rows.push({ screen: 'landing-doors', theme, width, cardHeight: null, ctaBottom: doors.loginBottom, viewport: doors.viewport, undersized: [], contrastFails: 0 });
      if (doors.signupBottom === null || doors.loginBottom === null) {
        failures.push(`[${tag}] landing: expected both doors, saw ${JSON.stringify(doors)}`);
      } else if (doors.loginBottom > doors.viewport) {
        failures.push(
          `[${tag}] landing: the second door ends at ${doors.loginBottom}px, below a ${doors.viewport}px fold`,
        );
      }
    }

    await page.goto(`${BASE}/partenaires/inscription`, { waitUntil: 'networkidle2', timeout: 60_000 });
    await expectStep('type', 'initial load');

    // The stub must announce itself. If this ever stops rendering while the flow is stubbed, a
    // customer could believe they applied.
    const hasDemoNotice = await page.evaluate(() =>
      document.body.innerText.toLocaleLowerCase().includes('mode démonstration'),
    );
    if (!hasDemoNotice) failures.push(`[${tag}] the "mode démonstration" notice is missing while the stub is active`);

    await capture('01-type');

    await clickText('Salle de sport');
    await expectStep('identity', 'choosing a profile');
    await capture('02-identity-empty');

    // Submit an empty form: the five messages must appear and the flow must NOT advance.
    await clickText('Continuer');
    await sleep(400);
    await expectStep('identity', 'submitting an empty form');
    const errorCount = await page.evaluate(
      () => document.querySelectorAll('[aria-invalid="true"]').length,
    );
    if (errorCount < 4) failures.push(`[${tag}] empty submit flagged only ${errorCount} field(s)`);
    await capture('03-identity-errors');

    await fill('Nom et prénom du responsable', 'Ali Ben Salah');
    await fill('Nom de la salle', 'Iron Gym Sousse');
    await fill('Numéro de téléphone', '20123456');
    await fill('Adresse e-mail', 'ali@example.tn');
    await fill('Gouvernorat', 'Sousse');
    await capture('04-identity-filled');

    await clickText('Continuer');
    await expectStep('kyc', 'submitting the identity form');
    await capture('05-kyc-empty');

    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length !== 2) failures.push(`[${tag}] expected 2 file inputs, found ${fileInputs.length}`);
    for (const input of fileInputs) await input.uploadFile(CARD_PATH);
    await page.waitForFunction(() => (document.body.innerText.match(/reçue/gi) ?? []).length >= 2, {
      timeout: 30_000,
    });
    await capture('06-kyc-filled');

    await clickText('Continuer');
    await expectStep('phone', 'leaving the ID step');
    await capture('07-phone-send');

    await clickText('Recevoir mon code');
    await waitForText('Entrez votre code');
    await capture('08-phone-code');

    // A wrong code must burn an attempt and keep the visitor on the same screen.
    await fill('Code à 6 chiffres', '000000');
    await clickText('Confirmer');
    await page.waitForFunction(() => document.querySelector('[role="alert"]') !== null, { timeout: 30_000 });
    await expectStep('phone', 'entering a wrong code');
    await capture('09-phone-wrong-code');

    await fill('Code à 6 chiffres', DEMO_CODE);
    await clickText('Confirmer');
    await waitForText('Téléphone confirmé');
    await capture('10-phone-confirmed');

    await clickText('Continuer');
    await expectStep('email', 'leaving the phone step');
    await capture('11-email-send');

    await clickText('Recevoir mon code');
    await waitForText('Entrez votre code');
    await fill('Code à 6 chiffres', DEMO_CODE);
    await clickText('Confirmer');
    await waitForText('E-mail confirmé');
    await capture('12-email-confirmed');

    await clickText('Envoyer ma demande');
    await expectStep('done', 'submitting the application');
    await capture('13-done');

    // The draft must be gone once the application is submitted, or a returning visitor is shown a
    // "demande en cours" that no longer exists.
    const draftLeft = await page.evaluate(() => localStorage.getItem('pt_affilie_signup_v1'));
    if (draftLeft) failures.push(`[${tag}] the local draft survived submission`);

    // ── Resume: reload mid-flow and land on the right screen ─────────────────────────────
    await page.evaluate(() => {
      localStorage.removeItem('pt_affilie_signup_v1');
      localStorage.removeItem('pt_affilie_stub_v1');
    });

    if (consoleErrors.length) {
      failures.push(`[${tag}] console errors:\n      ${consoleErrors.slice(0, 5).join('\n      ')}`);
    }

    await page.close();
  }
}

/* ── Resume check, once, at 390 ───────────────────────────────────────────────────────────── */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  /*
   * The storage is cleared ONCE, on a throwaway load — NOT in `evaluateOnNewDocument`.
   *
   * The first version cleared it on every document, which meant the reload this test exists to
   * exercise also wiped the stub's record. The flow then correctly reported "votre demande a
   * expiré" and dropped back to the identity step, and the assertion below failed for a reason
   * that had nothing to do with the code under test. A resume test that destroys the thing it is
   * resuming measures its own setup.
   */
  await page.goto(`${BASE}/partenaires`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('pt_affilie_signup_v1');
    localStorage.removeItem('pt_affilie_stub_v1');
  });
  await page.goto(`${BASE}/partenaires/inscription?type=coach`, { waitUntil: 'networkidle2' });

  const step = await page
    .$eval('[data-signup-step]', (el) => el.getAttribute('data-signup-step'))
    .catch(() => null);
  if (step !== 'identity') {
    failures.push(`[resume] ?type=coach should open on "identity", opened on "${step}"`);
  }

  const label = await page.evaluate(() =>
    document.body.innerText.toLocaleLowerCase().includes('nom de votre activité'),
  );
  if (!label) failures.push('[resume] ?type=coach did not apply the coach field labels');

  // Fill, advance to the ID step, then RELOAD. The draft plus the server record must put the
  // visitor back on the ID step, not at the beginning.
  const fillOne = async (needle, value) => {
    const handle = await page.evaluateHandle((n) => {
      const l = Array.from(document.querySelectorAll('label')).find((x) => x.innerText.includes(n));
      return l ? (l.htmlFor ? document.getElementById(l.htmlFor) : l.querySelector('input, select')) : null;
    }, needle);
    const el = handle.asElement();
    if (!el) throw new Error(`[resume] no field labelled "${needle}"`);
    if (await el.evaluate((n) => n.tagName === 'SELECT')) await el.select(value);
    else await el.type(value, { delay: 5 });
    await handle.dispose();
  };
  await fillOne('Votre nom et prénom', 'Ali Ben Salah');
  await fillOne('Numéro de téléphone', '20123456');
  await fillOne('Adresse e-mail', 'ali@example.tn');
  await fillOne('Gouvernorat', 'Sousse');
  const cont = await page.evaluateHandle(() =>
    Array.from(document.querySelectorAll('[data-signup-step] button')).find((b) =>
      /continuer/i.test(b.innerText),
    ),
  );
  await cont.asElement().click();
  await page.waitForFunction(
    () => document.querySelector('[data-signup-step]')?.getAttribute('data-signup-step') === 'kyc',
    { timeout: 30_000 },
  );

  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(
    () => document.querySelector('[data-signup-step]')?.getAttribute('data-signup-step') !== 'loading',
    { timeout: 30_000 },
  );
  const after = await page
    .$eval('[data-signup-step]', (el) => el.getAttribute('data-signup-step'))
    .catch(() => null);
  if (after !== 'kyc') failures.push(`[resume] a reload on the ID step landed on "${after}"`);
  const banner = await page.evaluate(() =>
    document.body.innerText.toLocaleLowerCase().includes('demande en cours'),
  );
  if (!banner) failures.push('[resume] the "demande en cours" banner did not appear after a reload');

  await page.screenshot({ path: path.join(OUT, 'resume--light--390.png'), fullPage: true });
  await page.close();
}

await browser.close();

/* ── Report ───────────────────────────────────────────────────────────────────────────────── */

console.log('\nmeasure-affiliate-signup — running against the STUB (NEXT_PUBLIC_AFFILIATE_API unset)\n');
console.log('screen                 theme  width  card    cta_bottom  viewport  contrast');
for (const r of rows) {
  console.log(
    `${r.screen.padEnd(22)} ${r.theme.padEnd(6)} ${String(r.width).padEnd(6)} ` +
      `${String(r.cardHeight ?? '-').padEnd(7)} ${String(r.ctaBottom ?? '-').padEnd(11)} ` +
      `${String(r.viewport ?? '-').padEnd(9)} ${r.contrastFails === 0 ? 'ok' : `${r.contrastFails} FAIL`}`,
  );
}
console.log(`\nscreenshots: ${path.relative(ROOT, OUT)}`);

if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\naffiliate signup: 6 screens x 2 themes x 2 widths walked, every transition asserted. clean.');
