/**
 * Proves `normalizeProse` on the real catalogue and on the edge cases that must NOT be touched.
 *
 * ── WHY A SCRIPT AND NOT A GLANCE AT ONE PRODUCT ───────────────────────────────────────────
 * This normaliser rewrites copy on 11,263 product pages, the category descriptions, the crawler
 * view and every meta description. The dangerous failure is not "it missed a bullet" — it is "it
 * converted a paragraph a human wrote". So the negative cases below matter more than the positive
 * ones, and they are asserted rather than eyeballed.
 *
 *   node scripts/check-prose-normalise.mjs            # fixtures only, no network
 *   node scripts/check-prose-normalise.mjs --live     # + a sample of live products
 */
import { normalizeProse } from '../src/util/normalizeProse.ts';

let failed = 0;
const ok = (name) => console.log(`  ok    ${name}`);
const bad = (name, detail) => {
  console.log(`  FAIL  ${name}\n        ${detail}`);
  failed++;
};

function expect(name, input, predicate, describe) {
  const out = normalizeProse(input);
  if (predicate(out)) ok(name);
  else bad(name, `${describe}\n        got: ${out}`);
}

console.log('\nCONVERTS — typed formatting that is unambiguously a list');

expect(
  'bullet chars + <br> become a real <ul>',
  '<p>• 30 g de protéines<br>• Enrichie en BCAA<br>• Favorise la récupération</p>',
  (o) => o === '<ul><li>30 g de protéines</li><li>Enrichie en BCAA</li><li>Favorise la récupération</li></ul>',
  'expected three <li> and no bullet characters'
);

expect(
  'an intro line before the bullets keeps its own <p>',
  '<p>Cette protéine est idéale pour :<br>• La prise de masse<br>• Le maintien de la masse maigre</p>',
  (o) =>
    o.startsWith('<p>Cette protéine est idéale pour :</p><ul>') &&
    (o.match(/<li>/g) || []).length === 2,
  'expected the intro as a <p> followed by a two-item <ul>'
);

expect(
  'numbered lines become an <ol>',
  '<p>1. Verser 300 ml d’eau<br>2. Ajouter une dose<br>3. Agiter 20 secondes</p>',
  (o) => o.startsWith('<ol>') && (o.match(/<li>/g) || []).length === 3 && !/1\./.test(o),
  'expected an <ol> with the numbers removed'
);

expect(
  'hyphen bullets convert',
  '<p>- Sans aspartame<br>- Sans gluten<br>- Sans OGM</p>',
  (o) => o.startsWith('<ul>') && (o.match(/<li>/g) || []).length === 3,
  'expected a three-item <ul>'
);

expect(
  '&bull; entities convert',
  '<p>&bull; Premier<br>&bull; Second</p>',
  (o) => o === '<ul><li>Premier</li><li>Second</li></ul>',
  'expected the entity form to be recognised'
);

expect(
  'markup inside a bullet survives',
  '<p>• <strong>30 g</strong> de protéines<br>• <em>Sans</em> sucres</p>',
  (o) => o.includes('<strong>30 g</strong>') && o.includes('<em>Sans</em>') && o.startsWith('<ul>'),
  'expected inline markup to be preserved'
);

console.log('\nSTRIPS — emoji as UI (DS010), which live in a data column the linter cannot see');

expect(
  'emoji leading a heading',
  '<h3>⭐ Points forts du produit</h3>',
  (o) => o === '<h3>Points forts du produit</h3>',
  'expected the star removed and the words kept'
);

expect(
  'emoji leading several headings',
  '<h3>💪 Pourquoi choisir cette whey ?</h3><h3>🥤 Conseils d’utilisation</h3>',
  (o) => !/\p{Extended_Pictographic}/u.test(o) && o.includes('Pourquoi choisir') && o.includes('Conseils'),
  'expected no pictographs to survive'
);

expect(
  'emoji leading a list item',
  '<ul><li>✅ Certifié</li><li>🚚 Livré en 24h</li></ul>',
  (o) => o === '<ul><li>Certifié</li><li>Livré en 24h</li></ul>',
  'expected both markers removed'
);

expect(
  'a heading that is ONLY emoji is left alone rather than emptied',
  '<h3>🔥🔥🔥</h3>',
  (o) => o.includes('🔥'),
  'expected the heading kept — deleting it would leave an empty <h3>'
);

expect(
  'emoji after markup inside a heading',
  '<h3>⭐ <strong>Points</strong> forts</h3>',
  (o) => o.includes('<strong>Points</strong>') && !/⭐/.test(o),
  'expected the star removed and the <strong> untouched'
);

expect(
  'a registered trademark in a heading survives',
  '<h3>NITRO-TECH® Whey Protein</h3>',
  (o) => o.includes('NITRO-TECH®'),
  'expected ® kept — it is a legal mark, not decoration'
);

expect(
  'a copyright leading a paragraph survives',
  '<p>© 2026 SOBITAS. Tous droits réservés.</p>',
  (o) => o.startsWith('<p>©'),
  'expected © kept'
);

expect(
  'a trademark standing alone between spaces survives',
  '<p>Gold Standard ™ Whey</p>',
  (o) => o.includes('™'),
  'expected ™ kept even when it stands alone'
);

expect(
  'an emoji beside a trademark still goes',
  '<h3>🔥 NITRO-TECH®</h3>',
  (o) => o === '<h3>NITRO-TECH®</h3>',
  'expected the flame removed and the ® kept'
);

console.log('\nFLATTENS — <li><p> and empty blocks');

expect(
  '<li><p>x</p></li> loses the paragraph',
  '<ul><li><p>La prise de masse</p></li><li><p>Le maintien</p></li></ul>',
  (o) => o === '<ul><li>La prise de masse</li><li>Le maintien</li></ul>',
  'expected the sole paragraph unwrapped'
);

expect(
  'an <li> with TWO paragraphs keeps them',
  '<ul><li><p>Premier</p><p>Second</p></li></ul>',
  (o) => (o.match(/<p>/g) || []).length === 2,
  'expected a genuine two-paragraph item to survive'
);

expect(
  'empty paragraphs are dropped',
  '<p>Réel</p><p>&nbsp;</p><p><br></p><p>   </p>',
  (o) => o === '<p>Réel</p>',
  'expected only the real paragraph to remain'
);

expect(
  'trailing <br> before a close tag is dropped',
  '<p>Une phrase<br><br></p>',
  (o) => o === '<p>Une phrase</p>',
  'expected the dangling breaks removed'
);

console.log('\nREFUSES — copy a human wrote, which must never be restructured');

expect(
  'a single dashed line is a sentence, not a list',
  '<p>- Le produit est expédié sous 24h</p>',
  (o) => o === '<p>- Le produit est expédié sous 24h</p>',
  'expected no conversion from one line'
);

expect(
  'mixed lines are left alone',
  '<p>• Un point<br>Une phrase ordinaire<br>• Un autre point</p>',
  (o) => !o.includes('<ul>'),
  'expected no conversion when the markers are inconsistent'
);

expect(
  'a paragraph broken across lines with no markers is untouched',
  '<p>Première ligne<br>Deuxième ligne<br>Troisième ligne</p>',
  (o) => !o.includes('<ul>') && !o.includes('<ol>'),
  'expected plain line breaks to stay line breaks'
);

expect(
  'an em dash mid-sentence is not a bullet',
  '<p>Whey — la protéine de référence<br>Créatine — pour la force</p>',
  (o) => !o.includes('<ul>'),
  'expected em dashes to be punctuation'
);

expect(
  'a year range is not an ordered list',
  '<p>2024 - Lancement<br>2025 - Expansion</p>',
  (o) => !o.includes('<ol>'),
  'expected four-digit years not to read as list numbers'
);

expect(
  'a real <ul> passes through unchanged',
  '<ul><li>Un</li><li>Deux</li></ul>',
  (o) => o === '<ul><li>Un</li><li>Deux</li></ul>',
  'expected an untouched list'
);

expect(
  'a table passes through unchanged',
  '<table><tr><td>Protéines</td><td>30 g</td></tr></table>',
  (o) => o === '<table><tr><td>Protéines</td><td>30 g</td></tr></table>',
  'expected the Supplement Facts panel to be untouched'
);

expect(
  'empty input',
  '',
  (o) => o === '',
  'expected an empty string'
);

console.log('\nIDEMPOTENT — sanitizeProductHtml runs on fields that are sometimes already clean');
{
  const src = '<h3>⭐ Points</h3><p>• Un<br>• Deux</p><ul><li><p>Trois</p></li></ul>';
  const once = normalizeProse(src);
  const twice = normalizeProse(once);
  if (once === twice) ok('running it twice changes nothing');
  else bad('running it twice changes nothing', `once: ${once}\n        twice: ${twice}`);
}

/* ── LIVE SAMPLE ─────────────────────────────────────────────────────────────────────────── */
if (process.argv.includes('--live')) {
  console.log('\nLIVE — a sample of the real catalogue');
  const API = 'https://admin.protein.tn/api';
  // The listing payload omits description_fr; the real copy only comes from product_details.
  const list = await fetch(`${API}/all_products?per_page=12&sort=popularity`).catch(() => null);
  const listJson = list ? await list.json().catch(() => null) : null;
  const slugs = (listJson?.data || listJson?.products || listJson || [])
    .map((p) => p.slug)
    .filter(Boolean)
    .slice(0, 12);

  let withBullets = 0;
  let withEmoji = 0;
  let converted = 0;
  let emojiCleared = 0;
  for (const slug of slugs) {
    const res = await fetch(`${API}/product_details/${encodeURIComponent(slug)}`).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    const p = json?.product || json;
    const src = p?.description_fr || p?.description || '';
    if (!src) continue;
    const hadBullets = /<p[^>]*>(?:(?!<\/p>)[\s\S])*?[•●-]\s(?:(?!<\/p>)[\s\S])*?<br/i.test(src);
    const hadEmoji = /\p{Extended_Pictographic}/u.test(src);
    const out = normalizeProse(src);
    if (hadBullets) withBullets++;
    if (hadEmoji) withEmoji++;
    // Compare list COUNTS, not presence: most descriptions already contain one real <ul>
    // alongside the typed ones, so `!src.includes('<ul>')` reported zero conversions on copy that
    // had in fact gained three lists.
    const listsBefore = (src.match(/<(ul|ol)>/gi) || []).length;
    const listsAfter = (out.match(/<(ul|ol)>/gi) || []).length;
    if (listsAfter > listsBefore) converted++;
    if (hadEmoji && !/\p{Extended_Pictographic}/u.test(out)) emojiCleared++;
  }
  console.log(`  ${slugs.length} products sampled`);
  console.log(`  ${withBullets} had typed bullets — ${converted} gained at least one real list`);
  console.log(`  ${withEmoji} of the sample had emoji — ${emojiCleared} fully cleared`);
}

console.log(failed ? `\ncheck-prose-normalise — ${failed} failure(s).` : '\ncheck-prose-normalise — clean.');
process.exit(failed ? 1 : 0);
