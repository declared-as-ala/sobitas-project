#!/usr/bin/env node
/**
 * check-loyalty-copy — the storefront must not keep promising the 02/10/2026 Protinas rules.
 *
 * Protinas v3 retired three customer-facing statements that were hard-coded in a dozen components:
 *
 *   « hors articles en promo »          the pack discount now counts promo lines (promos comprises);
 *   « première commande livrée »        the 15 DT welcome gift is credited at phone verification,
 *   (and the older « crédités à la      not on the first delivered order;
 *    livraison de votre première commande »);
 *   a hard-coded « 10 % » ceiling       earned Protinas pay up to 100 % of the articles + delivery;
 *                                       the only ceiling left is a hidden per-order budget.
 *
 * Every number the copy needs now comes from GET /api/loyalty/rules or the checkout quote. A string
 * like « jusqu'à 10 % de vos articles » creeping back into one of these files would tell a customer
 * the opposite of what checkout does — so the prebuild fails on it.
 *
 * Comments are stripped before matching: these files document WHY the old copy went, and quoting it
 * in a comment is the opposite of a regression.
 *
 * The guard proves it can fail: each pattern is first run against a sample of the copy it exists to
 * catch, and a pattern that does not match its own sample fails the build. A file that disappears
 * from the list also fails it, so a rename cannot silently switch the check off.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The components that carry Protinas, pack, delivery or welcome copy (spec F11). */
const FILES = [
  'src/app/(shop)/checkout/CheckoutPage.tsx',
  'src/app/(shop)/checkout/CheckoutFooterCTA.tsx',
  'src/app/(shop)/checkout/CheckoutTotals.tsx',
  'src/app/components/loyalty/LoyaltyPointsRedeemer.tsx',
  'src/app/components/loyalty/LoyaltyEarnLine.tsx',
  'src/app/components/loyalty/OrderProtinaOutcome.tsx',
  'src/app/components/loyalty/ProtinaWalletPanel.tsx',
  'src/app/(shop)/cart/page.tsx',
  'src/app/(shop)/pack-builder/wizard/StepWelcome.tsx',
  'src/app/(shop)/pack-builder/wizard/PackSummary.tsx',
  'src/app/components/account/OrderReceipt.tsx',
  'src/app/components/order/OrderDocument.tsx',
  'src/app/verify-phone/VerifyPhonePage.tsx',
  'src/app/(shop)/account/AccountVerificationCard.tsx',
  'src/app/(shop)/account/FidelitySection.tsx',
  'src/app/(shop)/account/MemberDashboard.tsx',
  'src/app/register/RegisterPage.tsx',
  'src/app/verify-email/VerifyEmailPage.tsx',
  'src/app/components/VerificationArtwork.tsx',
  'src/util/loyaltyPoints.ts',
];

const RULES = [
  {
    id: 'promo-lines',
    re: /hors\s+articles\s+en\s+promo/i,
    sample: '(hors articles en promo, non cumulable avec un code promo)',
    why: 'the pack discount counts promo lines since Protinas v3 — write « promos comprises »',
  },
  {
    id: 'first-delivered-order',
    re: /premi(?:è|e|&egrave;)re\s+commande\s+livr(?:é|e)e/i,
    sample: 'Cadeau débloqué à votre première commande livrée.',
    why: 'the welcome gift is credited at phone verification — write « 15 DT offerts tout de suite »',
  },
  {
    id: 'welcome-on-delivery',
    re: /(?:cr(?:é|e)dit(?:é|e)e?s?|ajout(?:é|e)e?s?)\s+(?:à|a)\s+la\s+(?:livraison\s+de\s+votre\s+(?:premi(?:è|e)re|1re)\s+commande|premi(?:è|e)re\s+livraison)/i,
    sample: 'ils sont crédités à la livraison de votre première commande',
    why: 'the welcome gift is credited at phone verification, not on the first delivery',
  },
  {
    id: 'ten-percent-ceiling',
    // « 10 % », « 10% », « 10&nbsp;% », « 10 % » — but not « 100 % » or « 1.10 % ».
    re: /(?<![\d.,])10(?:\s|&nbsp;| | )*%/,
    sample: 'remise et Protinas se cumulent jusqu&apos;à 10 % du montant de vos articles',
    why: 'there is no visible percentage ceiling in v3 — every limit comes from the server quote',
  },
  {
    id: 'ceiling-constant',
    re: /\bMAX_TOTAL_DISCOUNT_PERCENT\b/,
    sample: 'export const MAX_TOTAL_DISCOUNT_PERCENT = 10;',
    why: 'the v2 ceiling constant was removed from util/loyaltyPoints.ts',
  },
];

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

const failures = [];

// 1. The guard must be able to fail.
for (const rule of RULES) {
  if (!rule.re.test(rule.sample)) failures.push(`self-test: pattern "${rule.id}" does not match its own sample — the guard cannot fail`);
}
if (/(?<![\d.,])10(?:\s|&nbsp;| | )*%/.test('jusqu’à 100 % de vos articles')) {
  failures.push('self-test: "ten-percent-ceiling" matches « 100 % » — it would block the v3 copy itself');
}

// 2. Every listed file exists and carries none of the retired copy.
let scanned = 0;
for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    failures.push(`${rel}: missing — update FILES in scripts/check-loyalty-copy.mjs if it moved`);
    continue;
  }
  scanned++;
  const raw = fs.readFileSync(file, 'utf8');
  const code = stripComments(raw);
  for (const rule of RULES) {
    if (!rule.re.test(code)) continue;
    const line = raw.split('\n').findIndex(l => rule.re.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l));
    failures.push(`${rel}${line >= 0 ? `:${line + 1}` : ''}: ${rule.id} — ${rule.why}`);
  }
}

if (failures.length) {
  console.error('check-loyalty-copy — retired Protinas copy found:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error('\nSee .claude/codex/briefs/protinas-v3-spec.md §D for the v3 copy.');
  process.exit(1);
}
console.log(`check-loyalty-copy — clean. ${scanned} files, ${RULES.length} retired phrasings, self-test passed.`);
