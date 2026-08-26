import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const buildRedirects = require('../redirects.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const redirects = buildRedirects();
const bySource = new Map(redirects.map((rule) => [rule.source, rule.destination]));

const expectedRedirects = new Map([
  ['/mass-gainer', '/mass-gainers'],
  ['/mass-gainer-zero-7kg-eric-favre', '/mass-gainers/mass-gainer-zero-7kg-eric-favre'],
  ['/serious-mass-5-45-kg-optimum-nutrition', '/mass-gainers/serious-mass-5-45-kg-optimum-nutrition'],
  ['/serious-mass-5-45kg', '/mass-gainers/serious-mass-5-45-kg-optimum-nutrition'],
  ['/product-category/prise-de-masse/mass-gainer', '/mass-gainers'],
]);

const failures = [];
for (const [source, destination] of expectedRedirects) {
  const actual = bySource.get(source);
  if (actual !== destination) {
    failures.push(`${source} must resolve to ${destination}, received ${actual ?? 'no redirect'}`);
  }
}

for (const file of ['whey-protein.json', 'proteines.json', 'pre-workout.json']) {
  const content = JSON.parse(readFileSync(join(root, 'content', 'categories', file), 'utf8'));
  const related = Array.isArray(content.relatedCategorySlugs) ? content.relatedCategorySlugs : [];
  if (related.includes('mass-gainer')) {
    failures.push(`${file} links to redirecting /mass-gainer instead of canonical /mass-gainers`);
  }
}

if (failures.length) {
  console.error(`check-commercial-intent-map: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('check-commercial-intent-map: mass-gainer intent and legacy equity resolve to /mass-gainers.');
