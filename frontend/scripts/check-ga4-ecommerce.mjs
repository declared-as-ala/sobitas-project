#!/usr/bin/env node
/**
 * check-ga4-ecommerce — the GA4 `purchase` is sent where an order is created, once, by one helper.
 *
 * Until 05/10/2026 the only `purchase` lived on /order-confirmation/[id], a page nothing in the app
 * navigates to: customers reached it from the confirmation e-mail, days later or never, so GA4 saw
 * ~10 % of the orders, and named their items "Produit 506" because it read `produit` where the API
 * sends `product`. Now:
 *
 *   - the checkout and the quick-order drawer call `trackPurchaseOnce(` (src/lib/analytics/ga4.ts),
 *     which de-duplicates per transaction id; the backend covers ad-blocked browsers;
 *   - nothing else in src/ sends a `purchase` event by hand (gtag / gaEvent / a dataLayer push);
 *   - the e-mailed confirmation page sends none;
 *   - the analytics helpers never fall back to a "Produit ${id}" item name;
 *   - item_name is the squished designation on both sides (never the humanised H1 in the browser).
 *
 * Text-based on purpose: prebuild guards that load src .ts in Node break on extensionless imports.
 * Comments are stripped before matching, so documenting the old event is not a regression. Every
 * pattern is first run against a sample it must catch, so the guard cannot silently stop failing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const ANALYTICS_DIR = path.join(SRC, 'lib', 'analytics');
const CHECKOUT = path.join(SRC, 'app', '(shop)', 'checkout', 'CheckoutPage.tsx');
const DRAWER = path.join(SRC, 'app', 'components', 'QuickOrderDrawer.tsx');
const CONFIRMATION = path.join(SRC, 'app', '(shop)', 'order-confirmation', '[id]', 'page.tsx');

/** A call whose event name is 'purchase': gtag('event', 'purchase'…), gaEvent('purchase'…), any wrapper. */
const PURCHASE_CALL = /\b[\w$]+\s*(?:\?\.)?\s*\(\s*(?:['"`]event['"`]\s*,\s*)?['"`]purchase['"`]/;
/** A raw dataLayer push: { event: 'purchase' }. */
const PURCHASE_PUSH = /\bevent\s*:\s*['"`]purchase['"`]/;
const PLACEHOLDER_NAME = /Produit \$\{/;

const SAMPLES = [
  [PURCHASE_CALL, "window.gtag?.('event', 'purchase', { value: 1 })"],
  [PURCHASE_CALL, 'gtag("event", "purchase", params)'],
  [PURCHASE_CALL, "gaEvent('purchase', { transaction_id: '1' })"],
  [PURCHASE_CALL, "trackEvent( 'purchase' )"],
  [PURCHASE_PUSH, "dataLayer.push({ event: 'purchase', ecommerce: {} })"],
  [PLACEHOLDER_NAME, 'item_name: `Produit ${detail.produit_id}`'],
];
const NOT_MATCHED = [
  [PURCHASE_CALL, "trackPurchaseOnce({ transactionId: '1', value: 2, items: [] })"],
  [PURCHASE_CALL, "const label = 'purchase order';"],
];

const failures = [];

for (const [pattern, sample] of SAMPLES) {
  if (!pattern.test(sample)) failures.push(`self-test: ${pattern} does not catch its sample: ${sample}`);
}
for (const [pattern, sample] of NOT_MATCHED) {
  if (pattern.test(sample)) failures.push(`self-test: ${pattern} wrongly matches: ${sample}`);
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    failures.push(`missing file: ${path.relative(ROOT, file)}`);
    return '';
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

// 1. Both order paths send the purchase through the de-duplicating helper.
for (const file of [CHECKOUT, DRAWER]) {
  if (!stripComments(read(file)).includes('trackPurchaseOnce(')) {
    failures.push(`${rel(file)} must send the GA4 purchase with trackPurchaseOnce(`);
  }
}

// 2. Nobody outside src/lib/analytics/ sends a purchase by hand.
const analyticsPrefix = ANALYTICS_DIR + path.sep;
const files = walk(SRC);
for (const file of files) {
  if (file.startsWith(analyticsPrefix)) continue;
  const code = stripComments(read(file));
  if (PURCHASE_CALL.test(code) || PURCHASE_PUSH.test(code)) {
    failures.push(`${rel(file)} sends a GA4 'purchase' event directly; use trackPurchaseOnce from @/lib/analytics/ga4`);
  }
}

// 3. The e-mailed confirmation page sends no purchase at all.
{
  const code = stripComments(read(CONFIRMATION));
  if (PURCHASE_CALL.test(code) || PURCHASE_PUSH.test(code) || /trackPurchaseOnce|ga4_purchase_/.test(code)) {
    failures.push(`${rel(CONFIRMATION)} must not send a purchase: it is reached from the e-mail, not at checkout`);
  }
}

// 4. The analytics helpers never name an item "Produit N".
if (fs.existsSync(ANALYTICS_DIR)) {
  for (const file of walk(ANALYTICS_DIR)) {
    if (PLACEHOLDER_NAME.test(read(file))) {
      failures.push(`${rel(file)} builds a "Produit \${…}" item name; use the product name, slug or id`);
    }
  }
} else {
  failures.push('missing directory: src/lib/analytics');
}

// 5. One product, one item_name: the browser sends the squished designation, as the backend's
//    Measurement Protocol send does (Ga4MeasurementProtocol::item()). A humanised name in the
//    browser splits every product in GA4's item reports.
{
  const code = stripComments(read(path.join(ANALYTICS_DIR, 'ga4Items.ts')));
  if (/humanizeProductName/.test(code)) {
    failures.push('src/lib/analytics/ga4Items.ts humanises item_name; the server sends the squished designation — keep them identical');
  }
}

if (failures.length > 0) {
  console.error('check-ga4-ecommerce FAILED:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`check-ga4-ecommerce OK — purchase sent via trackPurchaseOnce from checkout + quick order, ${files.length} src files scanned.`);
