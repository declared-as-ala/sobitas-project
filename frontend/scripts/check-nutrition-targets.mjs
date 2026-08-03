/**
 * Assert the published equations in util/nutritionTargets.ts against hand-computed reference
 * values. These are formulas people act on, so "it looks about right" is not a standard.
 *
 * Reference arithmetic is written out in full below so a reviewer can check it without running
 * anything. Mifflin-St Jeor (1990):  BMR = 10·kg + 6.25·cm − 5·age + (5 | −161)
 *
 *   node scripts/check-nutrition-targets.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../src/util/nutritionTargets.ts');

// Transpile with TypeScript's own compiler rather than stripping types by regex. A hand-rolled
// stripper silently mangles anything it does not anticipate, and a checker that quietly tests the
// wrong code is worse than no checker.
const { outputText } = ts.transpileModule(readFileSync(SRC, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const mod = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);


let fails = 0;
const eq = (label, actual, expected, tol = 0) => {
  const ok = Math.abs(actual - expected) <= tol;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}  → ${actual}${ok ? '' : `  (expected ${expected})`}`);
  if (!ok) fails++;
};

console.log('\n══ Mifflin-St Jeor ══');
// Man 30y 180cm 80kg: 800 + 1125 − 150 + 5 = 1780
eq('man 30y/180cm/80kg', mod.basalMetabolicRate({ sex: 'homme', age: 30, heightCm: 180, weightKg: 80 }), 1780);
// Woman 30y 165cm 60kg: 600 + 1031.25 − 150 − 161 = 1320.25
eq('woman 30y/165cm/60kg', mod.basalMetabolicRate({ sex: 'femme', age: 30, heightCm: 165, weightKg: 60 }), 1320.25);
// Man 45y 175cm 95kg: 950 + 1093.75 − 225 + 5 = 1823.75
eq('man 45y/175cm/95kg', mod.basalMetabolicRate({ sex: 'homme', age: 45, heightCm: 175, weightKg: 95 }), 1823.75);

console.log('\n══ maintenance = BMR × activity factor ══');
const t = mod.computeTargets({ sex: 'homme', age: 30, heightCm: 180, weightKg: 80, activity: 'modere', goal: 'entretien' });
// 1780 × 1.55 = 2759 → rounded to nearest 10 = 2760
eq('modere (×1.55)', t.maintenance, 2760);
eq('entretien leaves energy at maintenance (min)', t.energy.min, 2760);
eq('entretien leaves energy at maintenance (max)', t.energy.max, 2760);
// entretien protein 1.4–1.8 g/kg × 80 = 112–144
eq('entretien protein min', t.protein.min, 112);
eq('entretien protein max', t.protein.max, 144);

console.log('\n══ goal adjustments ══');
const mass = mod.computeTargets({ sex: 'homme', age: 30, heightCm: 180, weightKg: 80, activity: 'modere', goal: 'prise_de_masse' });
// Compounded from the UNROUNDED maintenance (1780 × 1.55 = 2759.0), not from the displayed 2760 —
// rounding once at the end rather than at every step. 2759 × 1.10 = 3034.9 → 3030.
// 2759 × 1.15 = 3172.85 → 3170.
eq('prise de masse +10%', mass.energy.min, 3030);
eq('prise de masse +15%', mass.energy.max, 3170);
eq('prise de masse protein 1.6×80', mass.protein.min, 128);
eq('prise de masse protein 2.2×80', mass.protein.max, 176);

const cut = mod.computeTargets({ sex: 'femme', age: 28, heightCm: 165, weightKg: 60, activity: 'leger', goal: 'perte_de_poids' });
console.log(`         (deficit range for the reference woman: ${cut.energy.min}–${cut.energy.max} kcal, protein ${cut.protein.min}–${cut.protein.max} g)`);
eq('deficit min is below max (range is ordered)', cut.energy.min <= cut.energy.max ? 1 : 0, 1);
eq('perte de poids protein 1.8×60', cut.protein.min, 108);
eq('perte de poids protein 2.4×60', cut.protein.max, 144);

console.log('\n══ every protein range sits inside the ISSN bounds (1.4–3.0 g/kg) ══');
for (const goal of ['prise_de_masse', 'perte_de_poids', 'force', 'entretien']) {
  const r = mod.computeTargets({ sex: 'homme', age: 30, heightCm: 180, weightKg: 80, activity: 'modere', goal });
  const lo = r.protein.min / 80;
  const hi = r.protein.max / 80;
  eq(`${goal}: ${lo.toFixed(2)}–${hi.toFixed(2)} g/kg within bounds`, lo >= 1.4 && hi <= 3.0 ? 1 : 0, 1);
}

console.log('\n══ input bounds are enforced, not extrapolated ══');
eq('age 16 rejected', mod.validateProfile({ age: 16 }).length, 1);
eq('age 18 accepted', mod.validateProfile({ age: 18 }).length, 0);
eq('height 250 rejected', mod.validateProfile({ heightCm: 250 }).length, 1);
eq('weight 20 rejected', mod.validateProfile({ weightKg: 20 }).length, 1);
eq('a normal adult passes', mod.validateProfile({ age: 30, heightCm: 180, weightKg: 80 }).length, 0);

console.log(`\n=== ${fails} failure(s) ===\n`);
process.exit(fails ? 1 : 0);
