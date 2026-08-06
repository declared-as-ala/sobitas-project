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
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

/**
 * Wait for a condition IN THE PAGE, and report false instead of throwing when it never arrives.
 *
 * ── WHY THIS EXISTS, AND WHY IT MATTERS MORE THAN IT LOOKS ─────────────────────────────────
 * Section 2d used to wait for the quote with `settle(page, 3000)`, on the reasoning — written in
 * its own comment — that "on localhost the quote returns in ~30ms". That is only true when the
 * backend is also local. It is not: `/api-proxy` forwards to admin.protein.tn, and from a
 * developer machine the round trip measured 3.1s cold, on top of the 400ms debounce and the 1.8s
 * the test itself deliberately holds the response for. So three assertions failed against code
 * that was working perfectly — the gate was reporting a pricing bug that did not exist.
 *
 * A fixed sleep against a remote API is a coin flip wearing a number, and the failure mode is the
 * expensive one: it cries wolf, somebody learns to re-run it until it is green, and the day it
 * catches something real nobody believes it. Waiting for the CONDITION is both correct and faster
 * on a fast link.
 *
 * `.catch(() => false)` rather than letting the timeout throw, so a genuine failure still prints
 * as one FAIL line among the others instead of aborting the whole run.
 */
const waitFor = (page, fn, timeout = 25000) =>
  page.waitForFunction(fn, { timeout, polling: 200 }).then(() => true).catch(() => false);

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

  const firstCat = await page.evaluate(() => {
    const bar = document.querySelector('.pt-packbar');
    return {
      heading: document.querySelector('h2')?.textContent?.trim() ?? '',
      tiles: document.querySelectorAll('article[data-pack-tile]').length,
      /* THE STEP IS A HEADING AND A GRID, AND NOTHING ELSE.
         This assertion replaces its own opposite. It used to require the goal-rationale paragraph
         ("les gainers apportent les calories…") to be present; that paragraph has since been cut,
         along with the "Choisissez" kicker, on the owner's "take off the texts that aren't
         needed". Deleting the assertion with the prose would have left the simplification
         unguarded — nothing would stop the next person reintroducing a paragraph here.
         So it is inverted: count the prose nodes between the heading and the grid. The step
         column's only children are the optional cover banner, the SectionHeader and the grid, so
         a <p> that is not inside a product tile is by definition something new. */
      strayProse: [...document.querySelectorAll('main p')].filter(
        (p) =>
          !p.closest('.pt-packbar') &&
          !p.closest('article[data-pack-tile]') &&
          !p.className.includes('sr-only') &&
          (p.textContent || '').trim().length > 0 &&
          p.getClientRects().length > 0
      ).map((p) => (p.textContent || '').trim().slice(0, 40)),
      bar: !!bar,
      barText: bar ? bar.textContent.replace(/\s+/g, ' ').trim() : '',
      // The in-flow "Continuer" the owner had to scroll ~1,900px to reach. It must be GONE — the
      // bar owns advancing now, and two forward controls on one screen is the confusion this
      // redesign exists to remove.
      inFlowAdvance: [...document.querySelectorAll('main button')].filter(
        (b) => !b.closest('.pt-packbar') && /^(continuer|passer)/i.test((b.textContent || '').trim())
      ).length,
    };
  });
  // GOAL_CATEGORY_EMPHASIS puts gainers first for prise_de_masse — the reorder is the whole point
  // of asking the question, so assert it landed rather than assuming.
  check('the goal reordered the steps (gainers first)', /gainers/i.test(firstCat.heading), firstCat.heading);
  check('only ONE category is on screen', firstCat.tiles > 0 && firstCat.tiles <= 12, `${firstCat.tiles} tiles`);
  check(
    'the category step is a heading and a grid — no prose',
    firstCat.strayProse.length === 0,
    firstCat.strayProse.join(' | ')
  );

  /* THE OWNER'S COMPLAINT, AS THREE ASSERTIONS.
     "You show a button of DONE in the sticky bar. When I have to scroll all the way down to
     continue, that is bad. The user should CONTINUE, not directly finish the pack."
     So: the bar exists before anything is added, its action moves forward one step, and the word
     "Terminer" is nowhere near it. */
  check('the step bar is present BEFORE anything is added', firstCat.bar);
  check('…its action is Passer/Continuer, never Terminer', !/terminer/i.test(firstCat.barText), firstCat.barText.slice(0, 70));
  check('…and it carries no money row while the pack is empty', !/\d+[.,]\d\d DT/.test(firstCat.barText));
  check('the duplicate in-flow advance button is gone', firstCat.inFlowAdvance === 0, `${firstCat.inFlowAdvance} found`);

  check('added a product', await clickText(page, 'Ajouter'));
  await settle(page, 1100);

  const afterAdd = await page.evaluate(() => {
    const bar = document.querySelector('.pt-packbar');
    return {
      barText: bar ? bar.textContent.replace(/\s+/g, ' ').trim().slice(0, 110) : '',
      barH: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
      selected: document.querySelectorAll('article[data-selected="true"]').length,
      orphanClones: [...document.body.children].filter(
        (el) => el.tagName === 'IMG' && getComputedStyle(el).position === 'fixed'
      ).length,
      // The escape hatch to the recap, now that the primary action advances instead.
      hasRecapJump: !!bar && /voir mon pack/i.test(bar.textContent || ''),
    };
  });
  check('the tile shows its selected state', afterAdd.selected === 1, `${afterAdd.selected}`);
  check('the bar stays compact', afterAdd.barH > 0 && afterAdd.barH < 150, `${afterAdd.barH}px`);
  check('no flight clone left behind', afterAdd.orphanClones === 0, `${afterAdd.orphanClones}`);
  check('the summary is a labelled jump to the recap', afterAdd.hasRecapJump, afterAdd.barText.slice(0, 60));
  console.log(`        bar: ${afterAdd.barText}`);

  /* CONTINUER ADVANCES ONE STEP — it does not finish. This is the regression that would silently
     restore the old behaviour, so it asserts the DESTINATION, not the label. */
  const headingBefore = firstCat.heading;
  check('tapped Continuer in the bar', await clickText(page, 'Continuer'));
  await settle(page, 1100);
  const afterContinue = await page.evaluate(() => ({
    heading: document.querySelector('h2')?.textContent?.trim() ?? '',
    onRecap: [...document.querySelectorAll('button')].some((b) =>
      /ajouter le pack au panier/i.test(b.textContent || '')
    ),
  }));
  check('…it moved to the NEXT category', afterContinue.heading !== headingBefore, `${headingBefore} → ${afterContinue.heading}`);
  check('…and did NOT jump to the recap', !afterContinue.onRecap);

  check('reached the recap via "Voir mon pack"', await clickText(page, 'Voir mon pack'));
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

  // (ii) EVERY tap target, not just the progress rail. Widened after a review found three 36px
  // controls the rail-only gate could never see — including the recap's destructive remove button.
  // `offsetParent` skips anything display:none (a collapsed disclosure's contents).
  const small = await page.evaluate(() => {
    return [...document.querySelectorAll('main button, main a')]
      .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height > 0)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height < 44 || r.width < 44;
      })
      .map((el) => `${el.tagName}:${(el.textContent || '').trim().slice(0, 24)}`);
  });
  check('no control in the builder is under 44px', small.length === 0, small.slice(0, 4).join(' | '));

  /* (iii) Every spinner opts out of the mobile animation clamp. Without `data-motion`, globals.css
     forces its duration to 0.2s under 768px — five revolutions a second, which reads as a fault.

     CHECKED AGAINST THE SOURCE, NOT THE DOM. A spinner only exists while something is pending, so
     a DOM query almost always finds zero and reports "0/0 unmarked" — a check that passes because
     it looked at nothing. Reading the files is the only version of this assertion that cannot be
     vacuous. */
  const spinnerSrc = await (async () => {
    // NOT `new URL(...)`: this file shadows the global with `const URL = ${BASE}/pack-builder` at
    // the top, so `new URL` throws "URL is not a constructor" here. Resolve from this module's own
    // path instead, which is also correct regardless of the caller's working directory.
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/app/(shop)/pack-builder');
    const files = ['wizard/PackWizard.tsx', 'wizard/StepRecap.tsx', 'wizard/NeedsCheck.tsx', 'PackBuilderClient.tsx'];
    let total = 0;
    const bad = [];
    for (const f of files) {
      let src = '';
      try {
        src = await readFile(path.join(dir, f), 'utf8');
      } catch {
        continue;
      }
      for (const m of src.matchAll(/<Loader2[^>]*\/>|<Loader2[^>]*>/g)) {
        total += 1;
        if (!/data-motion/.test(m[0])) bad.push(`${f}: ${m[0].slice(0, 50)}`);
      }
    }
    return { total, bad };
  })();
  check(
    'every Loader2 in the source carries data-motion',
    spinnerSrc.total > 0 && spinnerSrc.bad.length === 0,
    `${spinnerSrc.total} found, ${spinnerSrc.bad.length} unmarked ${spinnerSrc.bad[0] ?? ''}`
  );

  // (iii) The calculator used to do nothing at all when a field was blank.
  await clickText(page, 'Prise de masse');
  await settle(page, 900);
  await clickText(page, 'Ajouter');
  await settle(page, 900);
  await clickText(page, 'Voir mon pack');
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

// ── 2d · the stale-quote bug, reproduced deliberately ───────────────────────────────────────
section('2d · a quote may only describe the pack it was asked about');
{
  /* THE BUG: `quote` was never cleared while the next one was in flight, so for the 400ms debounce
     plus a round trip the page applied the PREVIOUS basket's discount to the CURRENT basket's
     contents — a total LOWER than the sum of the lines above it, which is the one direction the
     pricing rule in PackBuilderClient forbids.

     A naive "add an item and look quickly" test cannot catch this: on localhost the quote returns
     in ~30ms, so the window it lives in does not exist. SLOWING THE QUOTE IS THE TEST. With the
     response held for 1.8s the window is real and deterministic, and the assertion below fails
     loudly against the old code and passes against the new. */
  const { page } = await phone();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (/pack\/quote/i.test(req.url())) {
      setTimeout(() => req.continue().catch(() => {}), 1800);
    } else {
      req.continue().catch(() => {});
    }
  });

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(page, 1400);
  await clickText(page, 'Commencer');
  await settle(page, 900);
  await clickText(page, 'Prise de masse');
  await settle(page, 900);

  // First product, and WAIT for its quote to land so a real discount is on screen to go stale.
  // On the CONDITION, not on a stopwatch — see `waitFor`.
  await clickText(page, 'Ajouter');
  await waitFor(page, () => {
    const bar = document.querySelector('.pt-packbar');
    return !!bar && /−\s*\d+\s*%/.test(bar.textContent || '') && !bar.querySelector('.animate-spin');
  });
  const settled = await page.evaluate(() => {
    const bar = document.querySelector('.pt-packbar');
    const t = bar ? bar.textContent.replace(/\s+/g, ' ') : '';
    const m = t.match(/([\d.,]+)\s*DT/);
    return { text: t, total: m ? parseFloat(m[1].replace(',', '.')) : null, hasDiscount: /−\s*\d+\s*%/.test(t) };
  });
  check('a discount is showing before the second add', settled.hasDiscount, settled.text.slice(0, 70));

  // Second product, read DURING the held request.
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('article[data-pack-tile] button')].filter((b) =>
      /^ajouter$/i.test((b.textContent || '').trim())
    );
    btns[0]?.click();
  });
  await settle(page, 900); // inside the 400ms debounce + 1800ms hold
  const inFlight = await page.evaluate(() => {
    const bar = document.querySelector('.pt-packbar');
    const t = bar ? bar.textContent.replace(/\s+/g, ' ') : '';
    const m = t.match(/([\d.,]+)\s*DT/);
    const spin = bar?.querySelector('.animate-spin') ?? null;
    return {
      text: t,
      total: m ? parseFloat(m[1].replace(',', '.')) : null,
      showsDiscount: /−\s*\d+\s*%/.test(t),
      spinner: !!spin,
      spinnerMarked: !!spin && spin.hasAttribute('data-motion'),
    };
  });

  check('the pending state is visible while the quote is in flight', inFlight.spinner);
  check('…and its spinner is exempt from the mobile 0.2s clamp', inFlight.spinnerMarked);
  check(
    'no stale discount is applied to the new basket',
    !inFlight.showsDiscount,
    inFlight.text.slice(0, 70)
  );
  /* The decisive one. Old code: the previous basket's DISCOUNTED total, which is lower than the new
     basket's raw subtotal. New code: the raw subtotal, which is strictly higher. */
  check(
    'the shown total goes UP when a product is added, never down',
    settled.total !== null && inFlight.total !== null && inFlight.total > settled.total,
    `${settled.total} → ${inFlight.total}`
  );

  await waitFor(page, () => {
    const bar = document.querySelector('.pt-packbar');
    return !!bar && !bar.querySelector('.animate-spin');
  });
  const resolved = await page.evaluate(() => {
    const bar = document.querySelector('.pt-packbar');
    const t = bar ? bar.textContent.replace(/\s+/g, ' ') : '';
    return { text: t, hasDiscount: /−\s*\d+\s*%/.test(t), spinner: !!bar?.querySelector('.animate-spin') };
  });
  check('the real discount arrives once the quote lands', resolved.hasDiscount, resolved.text.slice(0, 70));
  check('…and the pending state clears', !resolved.spinner);

  await page.close();
}

// ── 2c · the goal can be skipped and the flow still works ───────────────────────────────────
section('2c · "Passer cette étape" — the shopper who skips the question');
{
  const { page } = await phone();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(page, 1400);
  await clickText(page, 'Commencer');
  await settle(page, 900);

  /* Matched on the ESCAPE, not on one wording of it. The label has been "Je sais déjà ce que je
     veux" and is now "Passer cette étape"; what the test actually cares about is that the goal
     step offers a way past itself at all. Pinning the assertion to prose means a copy edit reads
     as a broken feature. */
  const skipped = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      /passer|je sais d[ée]j[àa]/i.test(x.textContent || '')
    );
    if (!b) return false;
    b.click();
    return true;
  });
  check('the skip link exists and is tappable', skipped);
  await settle(page, 1000);

  // Walk to the end without answering the goal.
  for (let i = 0; i < 8; i += 1) {
    const done = await page.evaluate(() =>
      [...document.querySelectorAll('button')].some((b) => /ajouter le pack au panier/i.test(b.textContent || ''))
    );
    if (done) break;
    const moved = (await clickText(page, 'Passer')) || (await clickText(page, 'Voir mon pack'));
    if (!moved) break;
    await settle(page, 700);
  }

  /* The needs check used to be wrapped in `{goal && …}`, so skipping the question removed it
     entirely — with nothing on screen to explain the absence. It is now always offered and asks
     for the goal in place. */
  const noGoalRecap = await page.evaluate(() => ({
    onRecap: [...document.querySelectorAll('button')].some((b) => /ajouter le pack au panier/i.test(b.textContent || '')),
    hasNeeds: [...document.querySelectorAll('button')].some((b) => /besoins quotidiens/i.test(b.textContent || '')),
  }));
  check('the recap is reachable without answering the goal', noGoalRecap.onRecap);
  check('…and the needs check is still offered', noGoalRecap.hasNeeds);

  if (noGoalRecap.hasNeeds) {
    await clickText(page, 'Vos besoins');
    await settle(page, 800);
    const asks = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
    check('…asking for the goal in place rather than sending you back', /d[ée]pend de votre objectif/i.test(asks));
  }
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

// ── 6 · geometry at the widths that are not a phone ─────────────────────────────────────────
section('6 · the step bar must not sit on top of the page it belongs to');
{
  /* The bar has NO breakpoint gate — only MobileTabBar is `md:hidden`. The bottom reserve used to
     drop to 64px at `md` against a ~93px bar, so from 768px up the last row of products sat behind
     it. It was survivable while the bar was optional; now that the bar IS the way forward and the
     grid runs right up to it, the bottom row would be clipped on every laptop. 800px is the width
     that used to fail hardest — just past `md`, with the tab bar gone and the reserve at its
     smallest.

     320 is in the matrix because it is the narrowest viewport the site supports and the one where
     every "it fits" claim is actually decided — the three-column needs-check fields were unusable
     there and no audit had ever entered the state to find out. */
  for (const width of [320, 800, 1440, 1920]) {
    const p = await browser.newPage();
    await p.setViewport({ width, height: 900 });
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await settle(p, 1200);
    await clickText(p, 'Commencer');
    await settle(p, 800);
    await clickText(p, 'Prise de masse');
    await settle(p, 900);
    await clickText(p, 'Ajouter');
    await settle(p, 1100);

    const geo = await p.evaluate(() => {
      const bar = document.querySelector('.pt-packbar');
      const main = document.querySelector('main');
      if (!bar || !main) return null;
      return {
        barH: Math.round(bar.getBoundingClientRect().height),
        /* THE REAL INVARIANT, and the reason this is not measured by scrolling to the bottom of
           the document: the site Footer renders below `<main>`, so "scroll to the end and check
           the last tile" always passes — the tiles end up hundreds of pixels above the viewport
           and the assertion never bites. What actually has to hold is that MAIN reserves at least
           the bar's height, so the last row of the grid can be scrolled clear of it. */
        mainPadBottom: Math.round(parseFloat(getComputedStyle(main).paddingBottom)),
        /* ALIGNMENT, not width. The old assertion measured the bar's outer box and checked it was
           `<= 1600` — which passed the entire time the bar was 1,536px wide above a 672px column,
           because 1536 is indeed <= 1600. A bound that the defect satisfies is not a test.
           What has to hold is that the bar's content row and the product grid share both edges. */
        rail: (() => {
          const r = bar.querySelector('[data-packbar-rail]');
          const g = document.querySelector('[data-pack-grid]');
          if (!r || !g) return null;
          const rb = r.getBoundingClientRect();
          const gb = g.getBoundingClientRect();
          return {
            dLeft: Math.round(Math.abs(rb.left - gb.left)),
            dRight: Math.round(Math.abs(rb.right - gb.right)),
            width: Math.round(rb.width),
          };
        })(),
        /* The other half of the same defect: the progress rail is rendered by the shell too, so it
           inherited `main`'s 1600px rail and spanned the whole monitor above a narrow column. */
        progress: (() => {
          const n = document.querySelector('nav[aria-label="Progression"]');
          const g = document.querySelector('[data-pack-grid]');
          if (!n || !g) return null;
          const nb = n.getBoundingClientRect();
          const gb = g.getBoundingClientRect();
          return {
            dLeft: Math.round(Math.abs(nb.left - gb.left)),
            dRight: Math.round(Math.abs(nb.right - gb.right)),
            width: Math.round(nb.width),
          };
        })(),
        docWidth: Math.round(document.documentElement.scrollWidth),
        viewport: window.innerWidth,
      };
    });

    if (geo) {
      check(
        `@${width}px · main reserves at least the bar's height`,
        geo.mainPadBottom >= geo.barH,
        `reserve ${geo.mainPadBottom}px vs bar ${geo.barH}px`
      );
      check(
        `@${width}px · the bar's row shares both edges with the product grid`,
        !!geo.rail && geo.rail.dLeft <= 1 && geo.rail.dRight <= 1,
        geo.rail ? `Δleft ${geo.rail.dLeft}px · Δright ${geo.rail.dRight}px · ${geo.rail.width}px wide` : 'rail or grid missing'
      );
      check(
        `@${width}px · the progress rail shares both edges with the product grid`,
        !!geo.progress && geo.progress.dLeft <= 1 && geo.progress.dRight <= 1,
        geo.progress
          ? `Δleft ${geo.progress.dLeft}px · Δright ${geo.progress.dRight}px · ${geo.progress.width}px wide`
          : 'progress rail or grid missing'
      );
      check(
        `@${width}px · no horizontal overflow`,
        geo.docWidth <= geo.viewport,
        `doc ${geo.docWidth} / viewport ${geo.viewport}`
      );
    } else {
      check(`@${width}px · geometry measurable`, false, 'bar or main missing');
    }
    await p.close();
  }
}

// ── 7 · the landing page's photography actually renders ─────────────────────────────────────
section('7 · the goal step carries the landing page\'s own category photographs');
{
  const { page } = await phone();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await settle(page, 1400);
  await clickText(page, 'Commencer');
  await settle(page, 1200);

  const covers = await page.evaluate(async () => {
    // Force the lazy images to decode before measuring.
    window.scrollTo(0, 400);
    await new Promise((r) => setTimeout(r, 900));
    const cards = [...document.querySelectorAll('button[aria-pressed]')];
    const imgs = cards.map((c) => c.querySelector('img')).filter(Boolean);
    return {
      cards: cards.length,
      withImage: imgs.length,
      // Distinct sources: the whole reason the goal→category map is hand-written rather than a
      // parent lookup is that a parent walk hands the same photograph to two different cards.
      distinct: new Set(imgs.map((i) => (i.currentSrc || i.src).replace(/[?&]w=\d+/, ''))).size,
      broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    };
  });
  check('all four goals are photographed', covers.withImage === covers.cards && covers.cards === 4, `${covers.withImage}/${covers.cards}`);
  check('…with four DIFFERENT photographs', covers.distinct === covers.withImage, `${covers.distinct} distinct`);
  check('…and none of them is broken', covers.broken === 0, `${covers.broken} broken`);
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'OK — all checks passed' : `${failures} FAILURE(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
