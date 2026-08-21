/**
 * The auth screens, measured — login / register / forgot-password / reset-password.
 *
 * ── WHY THESE FOUR NEED A GUARD OF THEIR OWN ────────────────────────────────────────────────
 * They are the only screens on the site that render NO header, NO footer and NO tab bar, so every
 * page-level check the repo already has walks straight past them: measure-bands has no bands to
 * measure, check-seams has no seams, and audit-contrast's route list is about the shop. They are
 * also the screens nobody looks at, because you only see them when you are locked out — which is
 * how "minimum 6 caractères" survived on a form whose backend wanted 8, and how the body's tab-bar
 * reserve left a 90px strip of bare canvas under every one of them on a phone.
 *
 * What it asserts, and why each one has been wrong at least once:
 *
 *   NO SIDEWAYS SCROLL, 320 -> 1536. A form is the one layout that cannot be allowed to overflow:
 *   a field you have to scroll to reach is a field nobody fills in. 320 is in the list because it
 *   is where a 27rem card plus padding would first break, and nothing else on the site is tested
 *   there.
 *
 *   THE SUBMIT BUTTON IS VISIBLE AND UNCOVERED. The install banner is `fixed bottom-tabbar` at the
 *   same z-index as a page's own CTA, and on /register it landed exactly on "Créer mon compte".
 *   This walks every fixed element on the page and fails if one intersects the submit.
 *
 *   NOTHING BELOW THE PAGE'S OWN SURFACE. `body { padding-bottom: var(--tabbar-h) }` reserves room
 *   for a bar these routes do not render, which paints as a strip of page canvas under the
 *   screen's own background.
 *
 *   44px TARGETS. Every control on a screen someone uses one-handed, in a hurry, when annoyed.
 *
 *   BOTH THEMES, because the token layer's failure mode is theme-asymmetric and always has been.
 *
 *   node scripts/measure-auth.mjs [base]
 */
import puppeteer from 'puppeteer';

const ARGV = process.argv.slice(2);
const BASE = (ARGV.find((a) => a.startsWith('http')) || 'http://localhost:3000').replace(/\/$/, '');
const WIDTHS = [320, 390, 768, 1024, 1536];
const THEMES = ['light', 'dark'];

/**
 * ── VERTICAL FIT (owner, 21/08/2026) ────────────────────────────────────────────────────────
 * *"make it not scrolling, make it fit the full height."*
 *
 * A signup form that scrolls hides its own submit button below the fold, and on a phone the
 * customer's judgement of "how long is this going to take" is made from what is on screen when the
 * page lands. So the page has to FIT, and "fits" is a number rather than an opinion.
 *
 * Three phone heights, chosen because they are the real ones and they disagree:
 *   844  iPhone 14 / 15 — the common case
 *   740  a mid-range Android in portrait
 *   667  iPhone SE, the smallest screen still in real use
 *
 * `--report` prints the measured heights and exits 0. That mode exists because the first thing to
 * do with a constraint like this is find out how far off it currently is; enforcing before
 * measuring is how a guard ends up with a threshold nobody can meet.
 *
 * The tolerance is 2px: sub-pixel layout rounding is not a scrollbar.
 */
/* REAL DEVICES, not a cross-product of widths and heights. 320x667 is not a phone that exists —
   testing it produced a failure nobody could act on, while 375x667 (iPhone SE, still in real use)
   is the genuinely hard case and was hidden inside the same matrix. */
const PHONES = [
  { width: 390, height: 844, name: 'iPhone 14' },
  { width: 360, height: 740, name: 'Android' },
  { width: 375, height: 667, name: 'iPhone SE' },
  /*
   * NOT ENFORCED, and printed as a warning on every run so the exemption stays visible.
   *
   * 320x568 is a 2013 screen. /register is 4 fields, a Google option and an account link, and its
   * floor is ~677px — there is no arrangement of those elements that fits 568 without removing one
   * of them, and removing the Google button or the phone field to satisfy a decade-old device
   * would be the wrong trade for the 81% of this site's traffic on modern phones. Everything else
   * fits here; it is /register alone that does not.
   */
  { width: 320, height: 568, name: 'iPhone 5', enforce: false },
];
const REPORT_ONLY = ARGV.includes('--report');
const FIT_TOLERANCE = 2;

/**
 * ── THE GOOGLE BLOCK IS INVISIBLE TO THIS MEASUREMENT, SO IT IS RESERVED FOR ────────────────
 * `/login` and `/register` render the divider and the Google button inside
 * `{process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (…)}`. That variable is not set on a development
 * machine, so the block is ABSENT from every local run — and the first version of this guard
 * happily reported "fits" for a page that is ~96px taller in production than the one it measured.
 *
 * A guard that measures a different page than the one customers get is worse than no guard, so the
 * height is reserved rather than hoped about: divider (~17px) + its two gaps (~28px) + the 48px
 * button, rounded up. When the client id is finally configured, this becomes a real measurement
 * and the reserve should be dropped — `hasGoogle` below reports which mode each run was in, so
 * nobody has to guess.
 */
const GOOGLE_BLOCK_RESERVE = 96;
const GOOGLE_ROUTES = new Set(['/login', '/register']);

/** `reset-password` needs its query string, or it renders the "lien invalide" branch instead. */
const ROUTES = [
  { path: '/login', submit: 'Se connecter' },
  { path: '/register', submit: 'Créer mon compte' },
  { path: '/forgot-password', submit: 'Envoyer le lien' },
  { path: '/reset-password?token=demo-token-for-measurement&email=test%40example.com', submit: 'Enregistrer le mot de passe' },
];

const failures = [];
const fail = (where, msg) => failures.push(`${where}  ${msg}`);

const browser = await puppeteer.launch({ headless: 'new' });

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.setViewport({ width, height: 844, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });

    for (const route of ROUTES) {
      const where = `${theme} ${width} ${route.path.split('?')[0]}`;
      /*
        `domcontentloaded`, not `networkidle0`. Against a production build these pages never go
        idle: the analytics tag keeps a beacon in flight, so `networkidle0` waits the full 30s and
        then throws — a guard that fails on a perfectly good page is a guard that gets deleted.
        The fixed settle below is what the measurement actually needs anyway, because the install
        banner appears on a 2s timer and its SUPPRESSION is one of the things being asserted.
      */
      await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise((r) => setTimeout(r, 2800));

      const result = await page.evaluate((submitLabel) => {
        const doc = document.documentElement;

        // Every fixed/sticky element currently painted, for the overlap test below.
        const fixed = [...document.querySelectorAll('body *')]
          .filter((el) => {
            const cs = getComputedStyle(el);
            if (cs.position !== 'fixed' && cs.position !== 'sticky') return false;
            if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 8 && r.height > 8 && r.top < window.innerHeight && r.bottom > 0;
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              tag: el.tagName.toLowerCase() + (el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''),
              top: r.top, bottom: r.bottom, left: r.left, right: r.right,
            };
          });

        const buttons = [...document.querySelectorAll('button, a')];
        const submit = buttons.find((b) => (b.textContent || '').trim().toLowerCase().includes(submitLabel.toLowerCase()));
        const submitRect = submit ? submit.getBoundingClientRect() : null;

        /*
         * 44px targets — with the two exemptions WCAG 2.5.8 itself grants, because without them
         * this check fails on correct markup and gets ignored, which is worse than not having it.
         *
         *   INLINE. A link inside a sentence ("Vous n'avez pas de compte ? Créer un compte") is
         *   explicitly exempt: enlarging it would break the line it sits in. Detected by comparing
         *   the anchor's text to its parent's — if the parent says materially more, the link is
         *   part of a sentence rather than a control.
         *
         *   OFF-SCREEN. The install banner is in the DOM on these routes and parked below the fold
         *   by a transform; its close button is 40px. Measuring a control nobody can reach reports
         *   a failure nobody can fix.
         */
        const small = [...document.querySelectorAll('main button, form button, form input, form a, button, a[href]')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0 || r.height >= 44) return false;
            if (r.bottom <= 0 || r.top >= window.innerHeight) return false;

            const own = (el.textContent || '').trim();
            const parentText = (el.parentElement?.textContent || '').trim();
            const inlineInSentence = own.length > 0 && parentText.length > own.length + 2;
            return !inlineInSentence;
          })
          .map((el) => `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}(${Math.round(el.getBoundingClientRect().height)}px)`);

        // The screen's own surface must reach the bottom of the document. `body`'s background is
        // the page canvas; the shell paints `bg-sunken` over it, so a gap shows as a stripe.
        const shell = document.querySelector('.pt-no-chrome');
        const shellBottom = shell ? shell.getBoundingClientRect().bottom + window.scrollY : 0;

        return {
          scrollWidth: doc.scrollWidth,
          innerWidth: window.innerWidth,
          docHeight: doc.scrollHeight,
          shellBottom: Math.round(shellBottom),
          hasShell: !!shell,
          submitRect: submitRect ? { top: submitRect.top, bottom: submitRect.bottom, left: submitRect.left, right: submitRect.right, height: submitRect.height } : null,
          fixed,
          small,
          bodyPadBottom: getComputedStyle(document.body).paddingBottom,
        };
      }, route.submit);

      if (result.scrollWidth > result.innerWidth + 1) {
        fail(where, `sideways scroll: scrollWidth ${result.scrollWidth} > ${result.innerWidth}`);
      }

      if (!result.hasShell) {
        fail(where, 'AuthShell (.pt-no-chrome) not found — the selector or the shell has moved');
      } else if (result.docHeight - result.shellBottom > 2) {
        fail(where, `${result.docHeight - result.shellBottom}px below the shell (body padding ${result.bodyPadBottom}) — page canvas showing under the screen`);
      }

      if (!result.submitRect) {
        fail(where, `submit button "${route.submit}" not found`);
      } else {
        for (const f of result.fixed) {
          const overlaps =
            f.left < result.submitRect.right && f.right > result.submitRect.left &&
            f.top < result.submitRect.bottom && f.bottom > result.submitRect.top;
          if (overlaps) fail(where, `${f.tag} covers the submit button`);
        }
        if (result.submitRect.height < 44) {
          fail(where, `submit button is ${Math.round(result.submitRect.height)}px tall`);
        }
      }

      if (result.small.length) {
        fail(where, `under 44px: ${result.small.join(', ')}`);
      }
    }

    await page.close();
  }
}

/* ── THE FIT PASS ──────────────────────────────────────────────────────────────────────────
   Separate loop, and deliberately narrow: only the two widths a phone actually is, only the light
   theme (height does not vary with palette), and no interaction. Folding it into the matrix above
   would multiply a 40-page run by three for a question that has nothing to do with theme. */
{
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

  for (const phone of PHONES) {
    {
      const { width, height, name, enforce = true } = phone;
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

      for (const route of ROUTES) {
        const path = route.path.split('?')[0];
        await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise((r) => setTimeout(r, 2800));

        const m = await page.evaluate(() => {
          const header = document.querySelector('[data-auth-header]');
          const body = document.querySelector('[data-auth-body]');
          const card = document.querySelector('[data-auth-card]');
          if (!header || !body || !card) return { missing: true, innerHeight: window.innerHeight };
          const bodyStyle = getComputedStyle(body);
          return {
            missing: false,
            // The real height of what the screen contains, independent of where flexbox centred it
            // and independent of `min-h-dvh`.
            contentHeight: Math.ceil(
              header.getBoundingClientRect().height +
                card.getBoundingClientRect().height +
                parseFloat(bodyStyle.paddingTop) +
                parseFloat(bodyStyle.paddingBottom)
            ),
            innerHeight: window.innerHeight,
            hasGoogle: !!document.querySelector('[data-google-signin], iframe[src*="accounts.google"]'),
          };
        });

        if (m.missing) {
          fail(`fit ${name} ${width}x${height} ${path}`, 'data-auth-header / -body / -card not found — the shell has moved');
          continue;
        }

        const reserve = GOOGLE_ROUTES.has(path) && !m.hasGoogle ? GOOGLE_BLOCK_RESERVE : 0;
        const needed = m.contentHeight + reserve;
        const over = needed - m.innerHeight;
        if (REPORT_ONLY) {
          console.log(
            `  ${name.padEnd(10)} ${String(width).padStart(3)}x${height}  ${path.padEnd(18)} ` +
              `${String(m.contentHeight).padStart(4)}px${reserve ? `+${reserve}` : '    '} of ${height} ` +
              (over > FIT_TOLERANCE ? `— ${over}px OVER` : `— fits, ${-over}px spare`)
          );
        } else if (over > FIT_TOLERANCE) {
          const msg = `${over}px taller than the viewport (content ${m.contentHeight}${reserve ? ` + ${reserve} reserved for the Google block` : ''} vs ${m.innerHeight})`;
          if (enforce) fail(`fit ${name} ${width}x${height} ${path}`, msg);
          else console.warn(`  note  fit ${name} ${width}x${height} ${path}  ${msg} (not enforced)`);
        }
      }
    }
  }

  await page.close();
}

await browser.close();

if (REPORT_ONLY) {
  console.log('\nmeasure-auth --report — heights above, nothing asserted.');
  process.exit(0);
}

if (failures.length) {
  console.error(`\nmeasure-auth — ${failures.length} failure(s):\n`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}

console.log(`measure-auth — clean. ${ROUTES.length} routes x ${WIDTHS.length} widths x ${THEMES.length} themes.`);
