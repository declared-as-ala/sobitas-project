#!/usr/bin/env node
/**
 * Behavioural gate for the pack-builder wizard.
 *
 * It drives the flow the way a customer does — start, pick a goal, add products, finish — and
 * asserts the things a PR description would otherwise merely claim. Three of these checks exist
 * because the claim behind them was wrong at least once during development:
 *
 *   - the SEO section, because a client-rendered wizard can silently move the H1 and every
 *     internal link behind a click, and nothing visible breaks when it does;
 *   - the transferred-JS measurement, because `LazyMotion features={domAnimation}` is not lazy and
 *     the component's own name says otherwise;
 *   - the reduced-motion pass, because animation code paths are the ones nobody re-tests.
 *
 * Usage: node scripts/check-packbuilder.mjs [--base http://localhost:3111]
 */

import puppeteer from 'puppeteer';
import { existsSync } from 'node:fs';

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

const argv = process.argv.slice(2);
const bi = argv.indexOf('--base');
const BASE = bi !== -1 ? argv[bi + 1] : 'http://localhost:3111';
const URL = `${BASE}/pack-builder`;

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  → ${detail}` : ''}`);
  if (!ok) failures++;
};
const section = (t) => console.log(`\n${t}\n`);

const browser = await puppeteer.launch({
  ...(CHROME ? { executablePath: CHROME } : {}),
  headless: 'new',
  args: ['--no-sandbox'],
});

async function phone({ width = 390, height = 746, reducedMotion = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
      '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  );
  if (reducedMotion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return { page, errors };
}

/** Click the first button whose visible text starts with `text`. Returns false if there isn't one. */
const clickText = (page, text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent || '').trim().toLowerCase().startsWith(t.toLowerCase())
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);

const settle = (page, ms = 700) => page.evaluate((d) => new Promise((r) => setTimeout(r, d)), ms);

// ── 1 · what a crawler sees ─────────────────────────────────────────────────────────────────
section('1 · the server-rendered step 0 — this is the page, for SEO');
{
  // JS disabled: whatever survives here is what the initial HTML actually contains.
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const seo = await page.evaluate(() => {
    const h1s = [...document.querySelectorAll('h1')];
    const links = [...document.querySelectorAll('main a[href^="/"]')].map((a) => a.getAttribute('href'));
    return {
      h1Count: h1s.length,
      h1Text: h1s[0]?.textContent?.trim() ?? '',
      h1Visible: h1s[0] ? !h1s[0].className.includes('sr-only') : false,
      internalLinks: [...new Set(links)],
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().length,
      title: document.title,
    };
  });
  check('exactly one <h1>', seo.h1Count === 1, `${seo.h1Count}`);
  check('the <h1> is the page title', /composez votre pack/i.test(seo.h1Text), seo.h1Text);
  check('it is visible, not sr-only, in the initial HTML', seo.h1Visible);
  check('the <title> survived', /composez votre pack/i.test(seo.title), seo.title);
  check('the intro prose is in the HTML', seo.bodyText > 200, `${seo.bodyText} chars`);
  // The old layout emitted category "Voir tout" anchors. A wizard that hides them behind step 2
  // silently deletes this page's internal links.
  const catLinks = seo.internalLinks.filter((h) => /^\/[a-z0-9-]+$/.test(h) && h !== '/partenaires');
  check('category links are crawlable without JS', catLinks.length >= 3, catLinks.join(' '));
  await page.close();
}

// ── 2 · the flow ────────────────────────────────────────────────────────────────────────────
section('2 · walking the wizard as a customer');
{
  const { page, errors } = await phone();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(page, 1400);

  const atWelcome = await page.evaluate(() => ({
    hasStart: [...document.querySelectorAll('button')].some((b) => /commencer/i.test(b.textContent || '')),
    hasRail: !!document.querySelector('nav[aria-label="Progression"]'),
    tiers: document.querySelectorAll('li p.text-brand, li p').length,
  }));
  check('step 0 offers a single start action', atWelcome.hasStart);
  check('no progress rail before anything has happened', !atWelcome.hasRail);

  check('tapped Commencer', await clickText(page, 'Commencer'));
  await settle(page);

  const atGoal = await page.evaluate(() => ({
    heading: document.querySelector('h2')?.textContent?.trim() ?? '',
    goals: [...document.querySelectorAll('button[aria-pressed]')].length,
    rail: document.querySelectorAll('nav[aria-label="Progression"] li').length,
  }));
  check('step 1 asks the goal', /objectif/i.test(atGoal.heading), atGoal.heading);
  check('four goals are offered', atGoal.goals === 4, `${atGoal.goals}`);
  check('the rail now exists and counts the steps', atGoal.rail >= 4, `${atGoal.rail} segments`);

  check('chose "Prise de masse"', await clickText(page, 'Prise de masse'));
  await settle(page, 900);

  const firstCat = await page.evaluate(() => ({
    heading: document.querySelector('h2')?.textContent?.trim() ?? '',
    // Case-insensitive: the label carries `uppercase`, and `innerText` reflects text-transform —
    // so the DOM says "Catégorie 1 sur 5" and this reads "CATÉGORIE 1 SUR 5".
    position: document.body.innerText.match(/Cat[ée]gorie (\d+) sur (\d+)/i)?.slice(1, 3) ?? [],
    tiles: document.querySelectorAll('article[data-pack-tile]').length,
    rationale: /gainers apportent les calories|facteur limitant/i.test(document.body.innerText),
    footer: !!document.querySelector('.pt-packbar'),
  }));
  // GOAL_CATEGORY_EMPHASIS puts gainers first for prise_de_masse — the reorder is the whole point
  // of asking the question, so assert it landed rather than assuming.
  check('the goal reordered the steps (gainers first)', /gainers/i.test(firstCat.heading), firstCat.heading);
  check('the step states its position', firstCat.position[0] === '1', firstCat.position.join('/'));
  check('only ONE category is on screen', firstCat.tiles > 0 && firstCat.tiles <= 12, `${firstCat.tiles} tiles`);
  check('the goal is explained once, on the first category', firstCat.rationale);
  check('no footer bar while the pack is empty', !firstCat.footer);

  check('added a product', await clickText(page, 'Ajouter'));
  await settle(page, 1100);

  const afterAdd = await page.evaluate(() => {
    const bar = document.querySelector('.pt-packbar');
    return {
      footer: !!bar,
      barText: bar ? bar.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : '',
      barH: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
      selected: document.querySelectorAll('article[data-selected="true"]').length,
      orphanClones: [...document.body.children].filter(
        (el) => el.tagName === 'IMG' && getComputedStyle(el).position === 'fixed'
      ).length,
    };
  });
  check('the footer appears once something is in the pack', afterAdd.footer);
  check('the tile shows its selected state', afterAdd.selected === 1, `${afterAdd.selected}`);
  check('the footer stays compact', afterAdd.barH > 0 && afterAdd.barH < 140, `${afterAdd.barH}px`);
  check('no flight clone left behind', afterAdd.orphanClones === 0, `${afterAdd.orphanClones}`);
  console.log(`        footer: ${afterAdd.barText}`);

  check('finished early via the footer', await clickText(page, 'Terminer'));
  await settle(page, 1100);

  const recap = await page.evaluate(() => ({
    heading: document.querySelector('h2')?.textContent?.trim() ?? '',
    verdictPoints: document.querySelectorAll('ul li span.text-xs, ul li span.sm\\:text-sm').length,
    hasCta: [...document.querySelectorAll('button')].some((b) => /ajouter le pack au panier/i.test(b.textContent || '')),
    hasCoach: !!document.querySelector('svg[viewBox="0 0 120 120"]'),
    hasNeeds: [...document.querySelectorAll('button')].some((b) => /besoins quotidiens/i.test(b.textContent || '')),
    needsFormVisible: !!document.querySelector('#nc-age'),
    text: (document.body.innerText || '').replace(/\s+/g, ' '),
  }));
  check('the recap gives a verdict', /votre pack/i.test(recap.heading), recap.heading);
  check('it lists concrete points about the pack', recap.verdictPoints > 0, `${recap.verdictPoints}`);
  check('the add-to-cart is present', recap.hasCta);
  check('the coach figure renders', recap.hasCoach);
  check('the needs check is offered', recap.hasNeeds);
  check('…and is COLLAPSED, not blocking the CTA', !recap.needsFormVisible);
  // The standing constraint: category-level guidance only, never a dose or a per-pack nutrient sum.
  const doseLanguage = /\d+\s*(scoop|dose|portion)s?\s+par\s+jour|votre pack (apporte|fournit|contient)\s+\d+\s*g/i;
  check('no dosing or per-pack nutrient claim anywhere', !doseLanguage.test(recap.text));

  // Opening it, and computing a real result, is the half that was never asserted — a disclosure
  // that expands to nothing looks identical to one that is simply closed.
  check('opened the needs check', await clickText(page, 'Vos besoins'));
  await settle(page, 900);
  const opened = await page.evaluate(() => !!document.querySelector('#nc-age'));
  check('…the form is now there', opened);

  if (opened) {
    await page.type('#nc-age', '30');
    await page.type('#nc-height', '178');
    await page.type('#nc-weight', '80');
    await clickText(page, 'Calculer');
    await settle(page, 900);
    const targets = await page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\s+/g, ' ');
      return {
        text: t,
        // Mifflin-St Jeor for a 30y 178cm 80kg male: 10*80 + 6.25*178 - 5*30 + 5 = 1767.5 → 1770.
        bmr: /1\s?770/.test(t),
        // ISSN 1.6–2.2 g/kg for prise de masse at 80kg → 128–176 g.
        protein: /128\s*[–-]\s*176/.test(t),
        cites: /Mifflin/.test(t) && /ISSN/.test(t),
        // Match the phrase, not my paraphrase of it — the copy reads "pas d'un avis médical", and
        // the apostrophe is typographic once rendered.
        disclaims: /avis m[ée]dical/i.test(t),
      };
    });
    // Asserting the ARITHMETIC, not just that numbers appeared. A calculator that renders a
    // plausible wrong figure is worse than one that renders nothing, because people act on it.
    check('BMR matches Mifflin-St Jeor by hand (1770 kcal)', targets.bmr);
    check('protein range matches the ISSN band by hand (128–176 g)', targets.protein);
    check('both sources are named on screen', targets.cites);
    check('the not-medical-advice disclaimer is present', targets.disclaims);
  }

  check('no console errors across the whole flow', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

// ── 2b · the defects an adversarial review found, as regressions ────────────────────────────
section('2b · regressions from the review — each of these shipped once');
{
  const { page } = await phone();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(page, 1400);

  // (i) Focus and heading structure across steps. AnimatePresence unmounts the control that was
  // just activated, so without an explicit move focus resets to <body>.
  await clickText(page, 'Commencer');
  await settle(page, 900);
  const afterStep = await page.evaluate(() => ({
    focusIsBody: document.activeElement === document.body,
    h1s: document.querySelectorAll('h1').length,
    h1Text: document.querySelector('h1')?.textContent?.trim() ?? '',
    announced: document.querySelector('[role="status"][aria-live="polite"]')?.textContent?.trim() ?? '',
  }));
  check('focus is NOT dumped on <body> after a step change', !afterStep.focusIsBody);
  check('exactly one <h1> survives past step 0', afterStep.h1s === 1, `${afterStep.h1s}`);
  check('…and it still names the page', /composez votre pack/i.test(afterStep.h1Text), afterStep.h1Text);
  check('the new step is announced', /Étape 2 sur/i.test(afterStep.announced), afterStep.announced);

  // (ii) Every tap target on the progress rail meets the site's own 44px rule.
  const small = await page.evaluate(() => {
    const rail = document.querySelector('nav[aria-label="Progression"]');
    if (!rail) return -1;
    return [...rail.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.height < 44 || r.width < 44;
    }).length;
  });
  check('no progress-rail control is under 44px', small === 0, `${small} too small`);

  // (iii) The calculator used to do nothing at all when a field was blank.
  await clickText(page, 'Prise de masse');
  await settle(page, 900);
  await clickText(page, 'Ajouter');
  await settle(page, 900);
  await clickText(page, 'Terminer');
  await settle(page, 1100);
  await clickText(page, 'Vos besoins');
  await settle(page, 800);
  await page.type('#nc-age', '30');
  await clickText(page, 'Calculer');
  await settle(page, 600);
  const blank = await page.evaluate(() => ({
    invalid: document.querySelectorAll('#nc-height[aria-invalid="true"], #nc-weight[aria-invalid="true"]').length,
    focusedId: document.activeElement?.id ?? '',
  }));
  check('a blank field produces a visible error', blank.invalid > 0, `${blank.invalid} marked invalid`);
  check('…and focus moves to the field that needs it', /^nc-/.test(blank.focusedId), blank.focusedId);

  await page.close();
}

// ── 3 · reduced motion ──────────────────────────────────────────────────────────────────────
section('3 · prefers-reduced-motion: the flow still works');
{
  const { page, errors } = await phone({ reducedMotion: true });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(page, 1200);
  await clickText(page, 'Commencer');
  await settle(page);
  const ok = await page.evaluate(() => /objectif/i.test(document.querySelector('h2')?.textContent ?? ''));
  check('stepping works with reduced motion', ok);
  check('no errors under reduced motion', errors.length === 0, errors.slice(0, 1).join(''));
  await page.close();
}

// ── 4 · what actually transfers ─────────────────────────────────────────────────────────────
section('4 · real transferred JavaScript (not the build table)');
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 746, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  /* Cache OFF, and every byte read from the body rather than from content-length.
     Without this the number is not reproducible: successive runs reported 246.7, 189.4 and
     362.5 kB for identical code, because a cached response carries no body and a 304 carries no
     content-length, so whichever scripts happened to be warm silently counted as zero. A gate whose
     value depends on how recently you last ran it is worse than no gate — it will eventually
     "prove" a regression is fine. */
  await page.setCacheEnabled(false);
  let jsBytes = 0;
  const seen = new Set();
  const pending = [];
  page.on('response', (res) => {
    const url = res.url();
    if (!/\.js(\?|$)/.test(url) || seen.has(url)) return;
    seen.add(url);
    pending.push(
      res
        .buffer()
        .then((b) => {
          jsBytes += b.length;
        })
        .catch(() => {
          /* a redirect or a cancelled request has no body — not a measurement */
        })
    );
  });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(page, 1500);
  // Bodies resolve asynchronously; totalling before they land under-reports by whatever was still
  // in flight — which is exactly the chunk we care about, since the motion features load last.
  await Promise.all(pending);
  console.log(`        ${seen.size} scripts, ${(jsBytes / 1024).toFixed(1)} kB uncompressed on first paint`);
  // A ceiling, not a target. It exists so a future import lands as a failing check rather than as
  // a slow page nobody attributes to a commit.
  check('first-load JS stays under the 1,400 kB ceiling', jsBytes / 1024 < 1400, `${(jsBytes / 1024).toFixed(1)} kB`);
  await page.close();
}

// ── 5 · Accès Pro moved to the chrome ───────────────────────────────────────────────────────
section('5 · Accès Pro belongs to the header, not to this page');
{
  const { page } = await phone();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(page, 1200);
  const onPage = await page.evaluate(() =>
    [...document.querySelectorAll('main a[href="/partenaires"]')].length
  );
  check('no Accès Pro inside the builder', onPage === 0, `${onPage} found`);

  const inMenu = await page.evaluate(async () => {
    document.querySelector('button[aria-label="Menu"]')?.click();
    await new Promise((r) => setTimeout(r, 900));
    return [...document.querySelectorAll('a[href="/partenaires"]')].length > 0;
  });
  check('it is in the mobile sidebar', inMenu);
  await page.close();

  const desk = await browser.newPage();
  await desk.setViewport({ width: 1440, height: 900 });
  await desk.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(desk, 1000);
  const inHeader = await desk.evaluate(() => {
    const a = [...document.querySelectorAll('header a[href="/partenaires"]')];
    const pack = document.querySelector('header a[href="/pack-builder"]');
    if (!a.length || !pack) return { present: false, gap: null };
    const gap = Math.round(pack.getBoundingClientRect().left - a[0].getBoundingClientRect().right);
    return { present: true, gap };
  });
  check('it sits in the desktop header', inHeader.present);
  check('…beside the pack CTA', inHeader.gap !== null && inHeader.gap >= 0 && inHeader.gap < 40, `${inHeader.gap}px apart`);
  await desk.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'OK — all checks passed' : `${failures} FAILURE(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
