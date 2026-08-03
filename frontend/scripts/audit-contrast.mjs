/**
 * WCAG 1.4.3 contrast audit of a rendered page, in both themes.
 *
 * ── WHY IT WALKS THE BACKGROUND STACK ─────────────────────────────────────────────────────
 * The naive version of this script — read `color`, read `backgroundColor`, divide — is worse than
 * no script, and it has already produced a false report on this codebase. Two reasons:
 *
 *   1. Most elements have `background-color: rgba(0,0,0,0)`. Reading that literally reports every
 *      label on the page as white-on-black or black-on-black. The real background is whichever
 *      ANCESTOR actually paints, so you have to walk up until you find one.
 *   2. Backgrounds are frequently SEMI-TRANSPARENT (`bg-brand/10`, the hero's 86% scrim). A tenth
 *      of #D03B04 over white is #FBEBE6, not #D03B04 — a 25x difference in the resulting ratio.
 *      Alpha has to be composited, in order, down the stack.
 *
 * A previous hand-audit that skipped step 2 reported six 1.00:1 "failures" that did not exist,
 * and missed a real one (`text-on-brand` was an undefined Tailwind colour, so it emitted nothing
 * and a CTA rendered at 1.37:1). Both classes of error come from guessing instead of compositing.
 *
 * ── WHAT COUNTS AS A FAILURE ──────────────────────────────────────────────────────────────
 * AA: 4.5:1 for body text, 3:1 for large text (>=24px, or >=18.66px when bold). Elements over an
 * IMAGE are reported separately as UNKNOWN rather than passed or failed — their background is a
 * photograph and no static number is honest. That is exactly why the hero caption sits on a solid
 * plate instead of a gradient.
 *
 * Usage: node scripts/audit-contrast.mjs [--route /] [--widths 1440 390]
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const out = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) out.push(argv[j]);
  return out.length ? out : fallback;
}
const one = (n, d) => flag(n, [d])[0];

const BASE = one('base', 'http://localhost:3000').replace(/\/$/, '');
const ROUTES = flag('routes', ['/']);
const WIDTHS = flag('widths', ['1440', '390']).map(Number);
const THEMES = flag('themes', ['light', 'dark']);

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => { try { return fs.existsSync(p); } catch { return false; } });

const AUDIT = () => {
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((v) => parseFloat(v.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  // src-over compositing: `fg` painted on top of `bg`, both premultiplied out to opaque.
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const hex = (c) =>
    '#' + [c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase();

  const results = [];

  for (const el of document.querySelectorAll('*')) {
    // Only elements with their OWN visible text, so a wrapper is not audited for its child's text.
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!text) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    // sr-only: 1px clipped box. Never rendered for sighted users, so contrast does not apply.
    if (rect.width <= 1 && rect.height <= 1) continue;

    const fg = parse(cs.color);
    if (!fg || fg.a === 0) continue;

    // Walk the ancestor chain collecting painted layers until something opaque is reached.
    const layers = [];
    let overImage = false;
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') overImage = true;
      const bg = parse(s.backgroundColor);
      if (bg && bg.a > 0) {
        layers.push(bg);
        if (bg.a >= 1) break;
      }
    }
    if (layers.length === 0) layers.push({ r: 255, g: 255, b: 255, a: 1 });

    // Composite bottom-up.
    let bg = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i--) bg = over(layers[i], bg);

    const resolvedFg = fg.a < 1 ? over(fg, bg) : fg;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const min = large ? 3 : 4.5;
    const r = ratio(resolvedFg, bg);

    if (overImage) {
      results.push({ status: 'UNKNOWN', text: text.slice(0, 40), r: null, min, fg: hex(resolvedFg), bg: hex(bg), size, cls: el.className?.toString().slice(0, 60) || '' });
    } else if (r < min) {
      results.push({ status: 'FAIL', text: text.slice(0, 40), r: Math.round(r * 100) / 100, min, fg: hex(resolvedFg), bg: hex(bg), size, cls: el.className?.toString().slice(0, 60) || '' });
    }
  }
  return results;
};

const browser = await puppeteer.launch({
  headless: 'new',
  ...(CHROME ? { executablePath: CHROME } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let totalFail = 0;
let totalUnknown = 0;

for (const route of ROUTES) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: width < 768 ? 844 : 900, isMobile: width < 768 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
      await page.evaluateOnNewDocument((t) => {
        try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.classList.toggle('dark', t === 'dark');
          const s = document.createElement('style');
          s.textContent = '*{content-visibility:visible !important;contain-intrinsic-size:auto !important}';
          document.head.appendChild(s);
        });
      }, theme);

      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 90_000 });
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 500));
      });

      const res = await page.evaluate(AUDIT);
      const fails = res.filter((x) => x.status === 'FAIL');
      const unknown = res.filter((x) => x.status === 'UNKNOWN');

      // Collapse identical (fg, bg, size) triples — one styling decision, not N defects.
      const grouped = new Map();
      for (const f of fails) {
        const k = `${f.fg}|${f.bg}|${Math.round(f.size)}|${f.min}`;
        if (!grouped.has(k)) grouped.set(k, { ...f, n: 0 });
        grouped.get(k).n++;
      }

      console.log(`\n${route}  ${theme}  @${width}px   ${fails.length} fail / ${unknown.length} over-image`);
      for (const g of [...grouped.values()].sort((a, b) => a.r - b.r)) {
        console.log(
          `   ${String(g.r).padStart(5)}:1  (need ${g.min})  ${g.fg} on ${g.bg}  ${Math.round(g.size)}px  x${g.n}  "${g.text}"`
        );
      }
      totalFail += fails.length;
      totalUnknown += unknown.length;
      await page.close();
    }
  }
}

await browser.close();
console.log(`\n=== ${totalFail} contrast failures, ${totalUnknown} elements over an image ===\n`);
process.exit(totalFail > 0 ? 1 : 0);
