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
