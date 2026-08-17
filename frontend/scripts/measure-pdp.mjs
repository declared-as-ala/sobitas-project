/**
 * Geometry assertions for the product detail page.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 * The PDP redesign of 16/08/2026 collapsed two parallel render trees into one and moved the
 * gallery, the CTAs and the benefits list. Every one of those changes is the kind that looks right
 * in a screenshot at the width you happened to open and is broken at 320px — which is exactly how
 * the Ventes Flash countdown shipped a 321px run inside a 254px box, and how the category rail
 * shipped two clipped labels. Both were caught by a script like this one and neither was visible in
 * the browser the author had open.
 *
 * It asserts the things a screenshot cannot: that nothing overflows its container, that every
 * control clears the 44px tap floor, that the page emits exactly ONE preloaded image, and that the
 * elements the owner asked for are actually in the DOM at the width they were asked for.
 *
 * ── THE FONT RACE ───────────────────────────────────────────────────────────────────────────
 * `document.fonts.ready` before measuring, and `domcontentloaded` rather than `networkidle`. The
 * display face is metric-adjusted against Arial, and Arial is WIDER — so a run measured before the
 * webfont lands can be tens of pixels over its real width. Two guards have already failed in CI on
 * nothing but this race; the wait is what makes the numbers reproducible.
 *
 * Usage: node scripts/measure-pdp.mjs [url]
 */
import puppeteer from 'puppeteer';
import { existsSync } from 'node:fs';

/* Same resolution order as measure-flash.mjs: this repo does not ship a puppeteer-managed Chrome,
   it drives the one already installed. */
const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

/*
 * Defaults to PRODUCTION, not to a dev server. This runs six-hourly in health-watch, and a guard
 * whose default target is a laptop that is usually switched off reports nothing about the site.
 * Pass a base URL to point it at a local server: `node scripts/measure-pdp.mjs http://localhost:3141`.
 */
const BASE = process.argv[2] || 'https://protein.tn';

/*
 * TWO products, because half this page is conditional on stock.
 *
 * 10,535 of 10,669 published products are "sur commande" — the shop does not hold them — and their
 * CTA is a request form, not a basket. A run against only one of those would report the bundle
 * block and the add-to-cart button as absent and call it a pass. The second URL is a product the
 * shop physically stocks, which is the only state where those two render at all.
 */
const PRODUCTS = [
  { url: `${BASE}/caseine/optimum-nutrition-gold-standard-100-casein-chocolate-supreme-18-kg`, inStock: false, name: 'sur commande' },
  { url: `${BASE}/whey-proteine/tantor-whey-protein-2267-g-scenit-nutrition`, inStock: true, name: 'en stock' },
  /*
   * The shape that carried the bugs of 17/08. Its `description_fr` is 13,746 characters — the whole
   * source product page transcribed, with its own headings — and it has eight photographs, two of
   * them packshots and six of them label close-ups. Every other product in this list has a short
   * description and two images, so neither the section routing nor the label grid would be
   * exercised at all without it.
   */
  { url: `${BASE}/whey-isolate/now-foods-sports-whey-protein-isolate-creamy-vanilla-816-g`, inStock: false, name: 'full transcription' },
];

/** 320 is the narrowest phone still in the field; 1440 is the most common desktop. */
const WIDTHS = [
  { w: 320, h: 800, label: '320 (smallest phone)' },
  { w: 390, h: 844, label: '390 (iPhone 14)' },
  { w: 768, h: 1024, label: '768 (tablet)' },
  { w: 1280, h: 900, label: '1280 (laptop)' },
  { w: 1440, h: 900, label: '1440 (desktop)' },
];

const results = [];
let failures = 0;

function check(width, name, pass, detail) {
  results.push({ width, name, pass, detail });
  if (!pass) failures++;
}

const browser = await puppeteer.launch({
  ...(CHROME ? { executablePath: CHROME } : {}),
  headless: 'new',
  args: ['--no-sandbox'],
});

for (const product of PRODUCTS) {
console.log(`\n══════════ ${product.name} ══════════`);
for (const { w, h, label } of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('h1', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  /* The gallery frame must have real geometry before anything is measured off it. Without this the
     run is a coin flip: three of five widths reported the frame at 0x0 on the first pass purely
     because next/image had not laid the packshot in yet. */
  await page
    .waitForFunction(
      () => {
        const frame = document.querySelector('main button[aria-label="Agrandir la photo du produit"]');
        return frame && frame.getBoundingClientRect().width > 0;
      },
      { timeout: 30000 }
    )
    .catch(() => {});
  /*
   * ── WAIT FOR THE BAR TO STOP MOVING, DO NOT GUESS HOW LONG THAT TAKES ─────────────────────
   * The sticky bar slides 200ms under an IntersectionObserver's control. A fixed delay measured it
   * mid-transform and reported the mobile tab bar as covering "Demander ce produit" by 44px — on
   * one product, at one width, intermittently. At rest the button sits 720-764 and the tab bar
   * 787-844, so they never touch; the guard was reporting the animation.
   *
   * This is the same shape as the webfont race that made two other guards flap, and it takes the
   * same answer: wait for the thing to settle rather than for a number of milliseconds. Two
   * consecutive identical positions 120ms apart means the transition has finished.
   */
  await page
    .waitForFunction(
      () => {
        const bar = document.querySelector('[data-sticky-cta]');
        if (!bar) return true;
        const now = Math.round(bar.getBoundingClientRect().top);
        const settled = window.__barTop === now;
        window.__barTop = now;
        return settled;
      },
      { polling: 120, timeout: 8000 }
    )
    .catch(() => {});

  const m = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const qa = (sel) => [...document.querySelectorAll(sel)];
    const box = (el) => (el ? el.getBoundingClientRect() : null);

    const h1 = q('h1');
    /* By the zoom button's aria-label, not by `.aspect-square` — the thumbnails and the bundle
       tiles carry that class too, and which one `querySelector` returns is not something a
       measurement should depend on. */
    const galleryButton = q('main button[aria-label="Agrandir la photo du produit"]');
    const gallery = galleryButton?.parentElement || null;
    const buyBox = qa('main div').find((d) => d.querySelector(':scope > div > span')
      && /DT$/.test(d.querySelector('span')?.textContent?.trim() || ''));

    /* Every element wider than the document, ignoring the ones deliberately scrolled. */
    const docWidth = document.documentElement.clientWidth;
    const overflowing = qa('main *')
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0) return false;
        // A container that scrolls its own content horizontally is allowed to.
        let node = el;
        while (node && node !== document.body) {
          const style = getComputedStyle(node);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') return false;
          node = node.parentElement;
        }
        return r.right > docWidth + 1 || r.left < -1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} right=${Math.round(el.getBoundingClientRect().right)}`);

    /*
     * Tap targets: 44px is the WCAG 2.5.5 / iOS floor.
     *
     * TWO EXCLUSIONS, both principled rather than convenient:
     *
     *   · `display: inline` links. WCAG 2.5.5 exempts a target that is "in a sentence or block of
     *     text", because enlarging it would break the line box it sits in. The brand link and the
     *     category eyebrow are inline text, not controls.
     *   · The breadcrumb and the ProductCard carousel. Both are shared components rendered on many
     *     routes and neither is part of this redesign; failing this script on them would mean it
     *     can never go green and would therefore stop being read. They are real and tracked
     *     separately — ProductCard's 20px-wide add button is the worst of them.
     */
    const small = qa('main button, main a[href], main input[type=checkbox]')
      .filter((el) => {
        if (el.closest('nav[aria-label*="Ariane"]')) return false;
        if (el.closest('[data-product-card], article')) return false;
        /* A checkbox whose <label> is itself a large target is targeted BY that label — WCAG 2.5.5
           measures the target, not the widget. */
        const label = el.closest('label');
        if (label && label.getBoundingClientRect().height >= 44) return false;
        if (getComputedStyle(el).display === 'inline') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 24);
      })
      .map((el) => `${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}] ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);

    const priceEl = qa('main span').find((el) => /^\d[\d\s.,]*\s*DT$/.test(el.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) > 24);

    return {
      docWidth,
      h1Text: h1?.textContent?.trim().slice(0, 60) || null,
      h1Count: qa('h1').length,
      galleryW: Math.round(box(gallery)?.width || 0),
      galleryH: Math.round(box(gallery)?.height || 0),
      /* The packshot itself, inside its padding — the number the owner's complaint was about. */
      packshotW: Math.round(box(galleryButton?.querySelector("img"))?.width || 0),
      thumbs: qa('main [aria-label^="Voir la photo"]').length,
      highlightItems: qa('main ul.border-s-2 > li').length,
      priceFontPx: priceEl ? Math.round(parseFloat(getComputedStyle(priceEl).fontSize)) : 0,
      priceText: priceEl?.textContent?.trim() || null,
      identifiers: qa('main dl').filter((d) => /Réf\.|Code-barres/.test(d.textContent)).length,
      ctas: qa('main button, main a').filter((el) => /Ajouter au panier|Commander maintenant|Demander ce produit/.test(el.textContent || '')).length,
      /* By `data-sticky-cta`, not by the `z-sticky-cta` CLASS — the PWA install banner carries
         that class too, so a class-based lookup could measure the wrong element and report the
         bar as present while it was in fact covered by the banner. */
      stickyBar: (() => {
        const bar = document.querySelector('[data-sticky-cta]');
        if (!bar) return 'absent';
        return bar.getBoundingClientRect().top < window.innerHeight ? 'visible' : 'hidden';
      })(),

      /*
       * ── NOTHING MAY COVER THE PRIMARY CTA ─────────────────────────────────────────────────
       * The check that did not exist, and the defect it now catches was live in production: the
       * PWA install banner and this bar were both `fixed bottom-tabbar z-sticky-cta`, occupying
       * 707-788 and 711-788 on a 390px screen. Identical band, identical z-index — so the button
       * a visitor came to press was hidden behind a prompt to install an app.
       *
       * Geometry, not a class list: any future fixed element lands here regardless of how it is
       * styled or which component added it.
       */
      cover: (() => {
        const bar = document.querySelector('[data-sticky-cta]');
        if (!bar) return [];

        /*
         * Measured against the CTA's BUTTONS, not against the bar's box.
         *
         * The first version compared the whole bar and started failing the moment a third product
         * was added — reporting the mobile tab bar as a cover. That is wrong, and the tailwind
         * config says why: the tab bar is persistent APP chrome and deliberately outranks page
         * chrome (z 40 over 30), so that "the tile overlaps their surface, never their controls".
         * The sticky bar is anchored `bottom-tabbar` precisely so it sits ABOVE the tab bar, and
         * the one-pixel meeting of their edges — plus the 200ms slide-in, during which the bar
         * passes behind the tab bar on purpose — is the design working.
         *
         * The defect worth catching was never "something touches the bar". It was "a customer
         * cannot press Ajouter au panier", which is a statement about the button.
         */
        const targets = [...bar.querySelectorAll('a, button')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 40 && r.height > 20 && r.top < window.innerHeight;
        });
        if (targets.length === 0) return [];

        const hits = [];
        for (const el of document.querySelectorAll('body *')) {
          if (el === bar || bar.contains(el) || el.contains(bar)) continue;
          const style = getComputedStyle(el);
          if (style.position !== 'fixed' && style.position !== 'sticky') continue;
          if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') continue;
          const r = el.getBoundingClientRect();
          if (r.width < 40 || r.height < 20) continue;
          /* Only things painted ABOVE the bar can hide it. Below it in the stack is harmless. */
          const barZ = Number(getComputedStyle(bar).zIndex) || 0;
          const z = Number(style.zIndex) || 0;
          if (z < barZ) continue;

          for (const target of targets) {
            const t = target.getBoundingClientRect();
            const overlapX = Math.min(r.right, t.right) - Math.max(r.left, t.left);
            const overlapY = Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top);
            if (overlapX > 8 && overlapY > 8) {
              hits.push(
                `${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)} covers "${(target.textContent || '').trim().slice(0, 22)}" by ${Math.round(overlapY)}px`
              );
              break;
            }
          }
          if (hits.length >= 3) break;
        }
        return hits;
      })(),
      sections: qa('main details > summary').map((s) => s.textContent.trim().split('\n')[0].trim()),

      /*
       * ── NOTHING MAY BE ON THE PAGE TWICE ──────────────────────────────────────────────────
       * The defect this catches was live: `description_fr` on a transcribed product contains its
       * own "Autres ingrédients" and "Avertissements" blocks, and `source_facts.content.sections`
       * carries the same two separately — so the page rendered each of them, verbatim, in the
       * Description accordion AND again as its own section. All three nutrition tables likewise.
       * Roughly 4,500 characters of exact repetition on one page.
       *
       * Compares the first 60 characters of each named section against the Description body. That
       * is long enough that a shared stock phrase cannot trip it and short enough that a single
       * reworded sentence cannot hide a repeat.
       */
      duplicated: (() => {
        const description = document.querySelector('#pdp-description');
        if (!description) return [];
        const flat = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
        const body = flat(description);
        return qa('main details[id^="pdp-"]')
          .filter((el) => el.id !== 'pdp-description' && el.id !== 'pdp-label-photos')
          .map((el) => {
            const panel = el.querySelector('summary')?.nextElementSibling;
            const probe = panel ? flat(panel).slice(0, 60) : '';
            return probe.length >= 60 && body.includes(probe) ? el.id : null;
          })
          .filter(Boolean);
      })(),

      /*
       * ── "LIRE PLUS" MUST REVEAL SOMETHING, AND CLIPPED TEXT MUST HAVE A "LIRE PLUS" ────────
       * Two failures, one invariant. The clamp and the button used to be independent: the clamp
       * was unconditional and the button was unconditional, which was fine while the Description
       * panel held the entire source page. Once the blocks were routed into named sections most
       * descriptions became shorter than the 240px clamp, so the button revealed nothing — and a
       * control that does nothing teaches a reader to ignore it on the pages where it matters.
       *
       * The opposite failure is worse and is what this really guards: text clipped with no way to
       * open it. Asserting the BIRECTIONAL match means neither can be introduced, whatever future
       * threshold anyone picks.
       */
      descriptionClamp: (() => {
        const panel = document.querySelector('#pdp-description');
        const body = panel?.querySelector('.prose');
        if (!panel || !body) return null;
        const button = [...panel.querySelectorAll('button')].find((b) =>
          /Lire plus|Voir moins/.test(b.textContent || '')
        );
        return {
          clipped: body.scrollHeight > body.clientHeight + 2,
          hasButton: Boolean(button),
        };
      })(),

      /* Packshots stay in the carousel; label close-ups become a grid. */
      labelTiles: qa('main #pdp-label-photos [aria-label^="Agrandir la photo"]').length,
      galleryThumbs: qa('main [aria-label^="Voir la photo"]').length,
      /* The description body, in characters of rendered text. The routing is what keeps this from
         being the entire source page. */
      descriptionChars: (document.querySelector('#pdp-description')?.textContent || '').replace(/\s+/g, ' ').trim().length,
      comparisonCols: (() => {
        const head = qa('main thead th').filter((th) => getComputedStyle(th).display !== 'none');
        return head.map((th) => th.textContent.trim());
      })(),
      /* Scoped to the comparison table's own thead. `main tbody tr` counted every row of the three
         Supplement Facts tables as well and reported 48 comparison rows for a table that is capped
         at 7 by buildComparison. */
      comparisonRows: (() => {
        const head = qa('main thead th').find((th) => /Produit/i.test(th.textContent || ''));
        const table = head?.closest('table');
        return table ? table.querySelectorAll('tbody tr').length : 0;
      })(),
      bundle: !!qa('main button').find((b) => /Tout ajouter/.test(b.textContent || '')),
      /*
       * The site logo in the header is also preloaded, on every route, and it is not this page's
       * to count. What matters is that the PRODUCT image is preloaded exactly once: before this
       * rewrite there were two galleries, each with `priority`, and `display: none` does not cancel
       * a preload — so a phone fetched the desktop candidate and a desktop fetched the phone's.
       * Measured on production the same day: 3 preloads. Here: 2, of which 1 is the logo.
       */
      productPreloads: [...document.querySelectorAll('link[rel=preload][as=image]')].filter(
        (link) => !/logo/i.test(link.getAttribute('imageSrcSet') || link.getAttribute('href') || '')
      ).length,
      overflowing,
      small,
      bodyScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  const desktop = w >= 1024;
  /* The comparison table's own breakpoint is `md` (768px), not `lg`. It is the one component here
     that changes shape at a different width from the page layout, deliberately: six narrow columns
     fit a tablet and do not fit a phone. */
  const wideTable = w >= 768;

  check(w, 'no horizontal page scroll', !m.bodyScrollX, m.bodyScrollX ? 'document scrolls sideways' : 'ok');
  check(w, 'nothing overflows', m.overflowing.length === 0, m.overflowing.join(' | ') || 'ok');
  check(w, 'tap targets >= 44px', m.small.length === 0, m.small.join(' | ') || 'ok');
  check(w, 'exactly one h1', m.h1Count === 1, `h1 count = ${m.h1Count}`);
  check(w, 'exactly one product-image preload', m.productPreloads === 1, `${m.productPreloads} preload(s)`);
  check(w, 'price is the largest number', m.priceFontPx >= 30, `${m.priceText} @ ${m.priceFontPx}px`);
  check(w, 'identifiers rendered once', m.identifiers === 1, `${m.identifiers} block(s)`);
  check(w, 'benefits panel present', m.highlightItems >= 3, `${m.highlightItems} bullets`);
  check(w, 'CTA in the buy box', m.ctas >= 1, `${m.ctas} CTA element(s)`);
  /* Assert the bar EXISTS before asserting nothing covers it. Without this the cover check
     passes vacuously the moment the selector stops matching — which is exactly what happened the
     first time it was run against a production build that predated the attribute. */
  if (!desktop) {
    check(w, 'sticky CTA bar is present', m.stickyBar !== 'absent', m.stickyBar);
  }
  check(w, 'nothing covers the sticky CTA', m.cover.length === 0, m.cover.join(' | ') || 'ok');
  if (m.descriptionClamp) {
    check(
      w,
      'clipped description has a reveal, and vice versa',
      m.descriptionClamp.clipped === m.descriptionClamp.hasButton,
      `clipped=${m.descriptionClamp.clipped} button=${m.descriptionClamp.hasButton}`
    );
  }
  check(
    w,
    'no section repeats the description',
    m.duplicated.length === 0,
    m.duplicated.join(', ') || 'ok'
  );
  /* Two packshots and a grid, not eight thumbnails. Only asserted on the product that has label
     shots — the others legitimately have two photographs and no grid. */
  if (/transcription/.test(product.name)) {
    check(w, 'label shots are a grid, not thumbnails', m.labelTiles >= 4, `${m.labelTiles} tiles`);
    check(w, 'carousel keeps only the packshots', m.galleryThumbs === 2, `${m.galleryThumbs} thumbs`);
    check(w, 'description is routed, not dumped', m.descriptionChars < 6000, `${m.descriptionChars} chars`);
  }
  if (product.inStock) {
    check(w, 'bundle renders when in stock', m.bundle, m.bundle ? 'ok' : 'missing');
  } else {
    check(w, 'bundle absent when sur commande', !m.bundle, m.bundle ? 'rendered but unbuyable' : 'ok');
  }
  /* NOT a count. `productSourceSections` returns the blocks the backend transcribed, so a
     product with no source page legitimately has three sections and one with a full transcription
     has six. What must always hold is that the content is in NAMED collapsible sections rather
     than one undifferentiated column, and that Description is the first of them. */
  check(
    w,
    'content is in named sections',
    m.sections.length >= 3 && /description/i.test(m.sections[0] || ''),
    m.sections.join(' · ')
  );
  check(
    w,
    wideTable ? 'comparison shows 6 columns' : 'comparison shows 3 columns',
    m.comparisonCols.length === (wideTable ? 6 : 3),
    m.comparisonCols.join(', ')
  );
  check(
    w,
    'packshot uses the column',
    m.packshotW >= (desktop ? 420 : Math.round(m.docWidth * 0.75)),
    `${m.packshotW}px in a ${m.docWidth}px viewport`
  );

  console.log(`\n── ${label} ──`);
  console.log(`   gallery ${m.galleryW}x${m.galleryH}, packshot ${m.packshotW}px, ${m.thumbs} thumbs`);
  console.log(`   price ${m.priceText} @ ${m.priceFontPx}px · ${m.highlightItems} benefits · sticky bar ${m.stickyBar}`);
  console.log(`   comparison ${m.comparisonCols.length} cols x ${m.comparisonRows} rows [${m.comparisonCols.join(', ')}]`);
  console.log(`   bundle ${m.bundle ? 'rendered' : 'not rendered'} · ${m.productPreloads} product-image preload(s)`);
  console.log(`   sections: ${m.sections.join(' · ')}`);

  await page.close();
}
}

await browser.close();

console.log('\n──────────────────────────────────────────────────────────────');
for (const r of results.filter((r) => !r.pass)) {
  console.log(`  FAIL  ${r.width}px  ${r.name}: ${r.detail}`);
}
console.log(`${results.length - failures}/${results.length} checks passed`);
process.exit(failures === 0 ? 0 : 1);
