import fs from 'node:fs';
import path from 'node:path';

// Node's native TypeScript loader requires the extension; the app compiler resolves it normally.
// @ts-expect-error -- allowImportingTsExtensions is intentionally not enabled for the Next app.
import { isSubstantivelyDuplicateHtml } from '../src/util/categorySeoDedup.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const curatedGuide = `
  <h2>Pourquoi choisir la créatine ?</h2>
  <p>La créatine monohydrate est la forme de référence pour les sportifs.</p>
  <h2>Quelle créatine choisir ?</h2>
  <p>Comparez la pureté, le format et le prix par dose avant votre achat.</p>
  <h2>Prix et livraison en Tunisie</h2>
  <p>Le prix dépend du format. La livraison est disponible partout en Tunisie.</p>
`;

const repeatedCmsGuide = `
  <h2>Pourquoi choisir la créatine ?</h2>
  <p>La créatine monohydrate accompagne les entraînements des sportifs.</p>
  <h2>Quelle créatine choisir ?</h2>
  <p>Vérifiez la pureté et comparez le prix par portion.</p>
  <h2>Prix et livraison en Tunisie</h2>
  <p>Les tarifs varient selon le format et la livraison couvre la Tunisie.</p>
`;

const complementaryGuide = `
  <h2>Comment lire une étiquette ?</h2>
  <p>Contrôlez la portion, la liste des ingrédients et le nombre de doses.</p>
  <h2>Conservation du produit</h2>
  <p>Gardez le pot fermé dans un endroit sec, à l'abri de la chaleur.</p>
`;

assert(
  isSubstantivelyDuplicateHtml(curatedGuide, repeatedCmsGuide),
  'A CMS block that repeats several guide sections must be suppressed.'
);
assert(
  !isSubstantivelyDuplicateHtml(curatedGuide, complementaryGuide),
  'A genuinely complementary guide must remain visible.'
);
assert(
  !isSubstantivelyDuplicateHtml('', repeatedCmsGuide),
  'A secondary guide must remain visible when there is no primary guide.'
);

console.log('Category SEO content deduplication checks passed.');

/*
 * ── content/categories/*.json: THE SERP FIELDS ARE PART OF THE BUILD CONTRACT ─────────────────
 *
 * Since 21/09/2026 every slug with a content file renders that file's h1, <title> and meta
 * description (resolveCategorySeo.ts), so a defect in one of these 51 files IS a live SERP defect.
 * Five of them shipped and none was caught by review:
 *   · a 🇹🇳 used as a separator, deleted at render time, leaving "BCAA Tunisie Acides Aminés dès
 *     70 DT" — a run-on keyword string on 18 live titles;
 *   · "| Protein.tn" pasted into an h1 on 25 files, which also leaked the brand into the
 *     CollectionPage name, the ItemList name and the last breadcrumb crumb;
 *   · five descriptions over 155 chars, which truncateAtWord cut back to the previous sentence —
 *     losing exactly the delivery/cash-on-delivery sentence that differentiates the shop;
 *   · a file named Intra-Workout.json, unreachable on the case-sensitive VPS filesystem;
 *   · 48 files declaring the 512px favicon (or nothing) as og:image on the commercial pages.
 * Cheap assertions, run in prebuild, so the next one fails here instead of in the index.
 */

const CATEGORY_CONTENT_DIR = path.join(process.cwd(), 'content', 'categories');
const PICTOGRAPH = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/u;
const MAX_META_TITLE = 65;
// Google renders ~155 chars; truncateAtWord(…, 155) backs off to the previous SENTENCE, so a
// description one char over does not lose one char — it loses its whole closing sentence.
const MAX_META_DESCRIPTION = 155;
const MIN_META_DESCRIPTION = 70;

const contentFiles = fs
  .readdirSync(CATEGORY_CONTENT_DIR)
  .filter((f) => f.endsWith('.json') && !f.startsWith('.') && !f.includes('.example.'));

assert(contentFiles.length > 0, 'content/categories holds no JSON file — the loader path is wrong.');

const titleOwner = new Map<string, string>();
const h1Owner = new Map<string, string>();

for (const file of contentFiles) {
  assert(
    file === file.toLowerCase(),
    `${file}: the route lowercases every slug before reading this directory, so an upper-case ` +
      `filename is invisible on the (case-sensitive) production filesystem. Rename it with git mv.`
  );

  const parsed = JSON.parse(fs.readFileSync(path.join(CATEGORY_CONTENT_DIR, file), 'utf-8')) as {
    h1?: string;
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };

  const h1 = parsed.h1?.trim() ?? '';
  const metaTitle = parsed.metaTitle?.trim() ?? '';
  const metaDescription = parsed.metaDescription?.trim() ?? '';
  const ogImage = parsed.ogImage?.trim() ?? '';

  assert(!PICTOGRAPH.test(metaTitle), `${file}: metaTitle contains a pictograph — write the separator out.`);
  assert(!PICTOGRAPH.test(h1), `${file}: h1 contains a pictograph — write the separator out.`);
  assert(
    !/\|\s*Protein\.tn\s*$/i.test(h1),
    `${file}: h1 ends with "| Protein.tn". The <title> carries the brand; the h1 also feeds the ` +
      `CollectionPage name, the ItemList name and the breadcrumb, where the brand does not belong.`
  );
  assert(
    metaTitle.length <= MAX_META_TITLE,
    `${file}: metaTitle is ${metaTitle.length} chars (max ${MAX_META_TITLE}) and will be truncated in the SERP.`
  );
  assert(
    !metaDescription ||
      (metaDescription.length >= MIN_META_DESCRIPTION && metaDescription.length <= MAX_META_DESCRIPTION),
    `${file}: metaDescription is ${metaDescription.length} chars — keep it between ` +
      `${MIN_META_DESCRIPTION} and ${MAX_META_DESCRIPTION} so the closing sentence survives.`
  );
  // 42 of these files declared the 512px favicon as og:image and six declared nothing, so every
  // share of a commercial category unfurled as a tiny icon — while the page announced 1200x630.
  // The value is artwork or it is absent; a favicon, an HTML page URL or a non-image path is not.
  assert(
    !ogImage || (/^https:\/\/[^\s]+\.(jpe?g|png|webp|avif)(\?[^\s]*)?$/i.test(ogImage) && !/\/favicon-/i.test(ogImage)),
    `${file}: ogImage "${ogImage}" is not a social image. Use an https image URL (jpg/png/webp/avif), ` +
      `not a favicon and not a page URL — https://protein.tn/og-banner.jpg is the 1200x630 default.`
  );

  if (metaTitle) {
    const previous = titleOwner.get(metaTitle);
    assert(!previous, `${file} and ${previous}: identical metaTitle. Two URLs, one SERP identity, Google keeps one.`);
    titleOwner.set(metaTitle, file);
  }
  if (h1) {
    const previous = h1Owner.get(h1);
    assert(!previous, `${file} and ${previous}: identical h1.`);
    h1Owner.set(h1, file);
  }
}

/*
 * An alias whose target file does not exist is silent: getCategorySeoContent swallows ENOENT as
 * "this category has no content file", exactly as it did for the twelve unparseable guides.
 */
const aliasSource = fs.readFileSync(path.join(process.cwd(), 'src', 'util', 'categorySeoContent.ts'), 'utf-8');
const aliasBlock = aliasSource.match(/CONTENT_SLUG_ALIASES: Record<string, string> = \{([\s\S]*?)\n\};/);
if (aliasBlock) {
  const targets = new Set([...aliasBlock[1].matchAll(/^\s*'[a-z0-9-]+':\s*'([a-z0-9-]+)',/gm)].map((m) => m[1]));
  for (const target of targets) {
    assert(
      contentFiles.includes(`${target}.json`),
      `CONTENT_SLUG_ALIASES points at "${target}", but content/categories/${target}.json does not exist.`
    );
  }
}

console.log(`Category SEO content file checks passed (${contentFiles.length} files).`);
