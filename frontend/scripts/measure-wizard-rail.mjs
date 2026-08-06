#!/usr/bin/env node
/**
 * The wizard's geometry across the full width ladder — the evidence behind "responsive".
 *
 * `check-packbuilder.mjs` asserts the invariants at four widths and fails the build. This reports
 * the NUMBERS at ten, including every breakpoint boundary where a grid changes shape (640, 1024)
 * and the two the site's own gutters step at (640, 1024). A redesign that claims to work
 * everywhere should be able to show the table.
 *
 * It measures on a CATEGORY step, because that is the only state carrying the progress rail, the
 * product grid and the step bar at the same time — the three boxes whose edges have to agree.
 *
 * Usage: node scripts/measure-wizard-rail.mjs [--base http://localhost:3111]
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
const PAGE_URL = `${BASE}/pack-builder`;

const WIDTHS = [320, 360, 390, 430, 640, 768, 1024, 1280, 1440, 1920];
const THEMES = ['light', 'dark'];

let failures = 0;
const fail = (msg) => {
  console.log(`  FAIL  ${msg}`);
  failures += 1;
};

/** Findings outside `<main>` — counted and printed at the end, never failed. */
const chrome = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickText = (page, text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent || '').trim().toLowerCase().startsWith(t.toLowerCase())
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);

const browser = await puppeteer.launch({
  ...(CHROME ? { executablePath: CHROME } : {}),
  headless: 'new',
  args: ['--no-sandbox'],
});

console.log(`\n  ${PAGE_URL}\n`);

for (const theme of THEMES) {
  console.log(`  ═══ ${theme.toUpperCase()} ═══`);
  console.log('   width   rail  cols  tile   aligned  h2   overflow   smallest target');
  console.log(`  ${'─'.repeat(76)}`);

  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, isMobile: width < 768, hasTouch: width < 768 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.evaluateOnNewDocument((t) => {
      try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
      document.addEventListener('DOMContentLoaded', () =>
        document.documentElement.classList.toggle('dark', t === 'dark')
      );
    }, theme);
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 90000 });
    await sleep(1300);

    const started = await clickText(page, 'Commencer');
    await sleep(800);
    const chose = await clickText(page, 'Prise de masse');
    await sleep(1100);

    /* A state that was never entered must not be reported as measured — the same rule the contrast
       auditor learned the hard way. Without this, a renamed button would print a tidy row of
       dashes and a clean bill of health. */
    if (!started || !chose) {
      fail(`@${theme} ${width}px · never reached a category step (start=${started} goal=${chose})`);
      await page.close();
      continue;
    }

    const m = await page.evaluate(() => {
      const box = (el) => (el ? el.getBoundingClientRect() : null);
      const grid = document.querySelector('[data-pack-grid]');
      const nav = document.querySelector('nav[aria-label="Progression"]');
      const barRail = document.querySelector('.pt-packbar [data-packbar-rail]');
      const tile = document.querySelector('article[data-pack-tile]');
      const h2 = document.querySelector('h2');
      const g = box(grid);
      const n = box(nav);
      const b = box(barRail);
      const same = (a, c) => a && c && Math.abs(a.left - c.left) <= 1 && Math.abs(a.right - c.right) <= 1;

      /* SCOPED TO `main`, matching the behavioural gate.
         The first run of this script scanned the whole document and failed all twenty rows on the
         FOOTER — a 16px phone-number link and a 21px copyright line, present on every page of the
         site and untouched by this change. That is the mirror image of the bug this same run
         found in section 2d: an assertion that fails for a reason unrelated to what it claims to
         measure teaches people to ignore it just as fast as one that never fails at all.
         The step bar is `position: fixed` but still a DOM descendant of `main`, so it is covered. */
      const inMain = [...document.querySelectorAll('main button, main a[href], main input, main [role="button"]')]
        .filter((e) => e.offsetParent !== null && e.getClientRects().length > 0);
      let worst = null;
      for (const e of inMain) {
        const r = e.getBoundingClientRect();
        const side = Math.min(r.width, r.height);
        if (side > 0 && (!worst || side < worst.side)) {
          worst = {
            side: Math.round(side),
            text: (e.textContent || e.getAttribute('aria-label') || '?').trim().replace(/\s+/g, ' ').slice(0, 24),
          };
        }
      }

      /* Reported, never failed: the smallest control OUTSIDE the wizard. Site chrome is not this
         page's to fix, but silently dropping the finding would mean the first run's one genuine
         discovery — the footer's 16px phone link — disappears the moment the scope is corrected. */
      let worstChrome = null;
      for (const e of document.querySelectorAll('body button, body a[href]')) {
        if (e.closest('main')) continue;
        if (e.offsetParent === null || e.getClientRects().length === 0) continue;
        const r = e.getBoundingClientRect();
        const side = Math.min(r.width, r.height);
        if (side > 0 && (!worstChrome || side < worstChrome.side)) {
          worstChrome = {
            side: Math.round(side),
            text: (e.textContent || e.getAttribute('aria-label') || '?').trim().replace(/\s+/g, ' ').slice(0, 24),
          };
        }
      }

      return {
        doc: Math.round(document.documentElement.scrollWidth),
        vw: window.innerWidth,
        rail: g ? Math.round(g.width) : null,
        cols: grid ? getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length : null,
        tile: tile ? Math.round(box(tile).width) : null,
        navOk: same(g, n),
        barOk: same(g, b),
        h2: h2 ? Math.round(parseFloat(getComputedStyle(h2).fontSize)) : null,
        worst,
        worstChrome,
      };
    });

    const overflow = m.doc > m.vw;
    const aligned = m.navOk && m.barOk;
    console.log(
      `   ${String(width).padEnd(6)}  ${String(m.rail ?? '—').padEnd(5)} ${String(m.cols ?? '—').padEnd(5)} ` +
        `${String(m.tile ?? '—').padEnd(5)}  ${aligned ? 'yes    ' : 'NO     '} ${String(m.h2 ?? '—').padEnd(4)} ` +
        `${overflow ? `YES ${m.doc}>${m.vw}` : 'no       '}  ${m.worst ? `${m.worst.side}px · ${m.worst.text}` : '—'}`
    );

    if (overflow) fail(`@${theme} ${width}px · horizontal overflow: doc ${m.doc} > viewport ${m.vw}`);
    if (!aligned) fail(`@${theme} ${width}px · chrome off the content rail (nav=${m.navOk} bar=${m.barOk})`);
    if (m.worst && m.worst.side < 44) fail(`@${theme} ${width}px · tap target ${m.worst.side}px — "${m.worst.text}"`);
    if (m.worstChrome && m.worstChrome.side < 44) {
      chrome.set(`${m.worstChrome.side}px · ${m.worstChrome.text}`, (chrome.get(`${m.worstChrome.side}px · ${m.worstChrome.text}`) ?? 0) + 1);
    }

    await page.close();
  }
  console.log('');
}

if (chrome.size) {
  console.log('  NOTE — site chrome outside <main>, not this page\'s to fix, reported not failed:');
  for (const [what, n] of chrome) console.log(`    ${what}   (seen in ${n}/${WIDTHS.length * THEMES.length} runs)`);
  console.log('');
}

await browser.close();
console.log(failures === 0 ? 'measure-wizard-rail: clean.\n' : `measure-wizard-rail: ${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
