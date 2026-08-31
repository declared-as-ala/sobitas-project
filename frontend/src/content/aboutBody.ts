/**
 * The prose of /qui-sommes-nous, authored here rather than read from the CMS.
 *
 * ── WHY THE REPO OWNS THIS ONE FIELD ────────────────────────────────────────────────────────
 * Owner, 20/08/2026: *"for the qui sommes nous page, polish it and regenerate the texts that have
 * emojis and reformat them for better look and better SEO."*
 *
 * The CMS row (`/api/page/qui-sommes-nous`, 4,038 characters, read 20/08/2026) had six problems,
 * and only one of them was the emoji:
 *
 *   1. EIGHT `✅` dingbats used as list bullets, one of them orphaned on a line of its own. The
 *      repo bans them in UI text (DS010); the CMS had no such guard.
 *   2. **"Livraison rapide et gratuite dans toute la Tunisie", twice** — while the same rendered
 *      page says "gratuitement à partir de 300 DT" and the cart charges 10 DT below that. A false
 *      delivery promise, on the page whose entire job is credibility. This is the serious one.
 *   3. "16 ans d'expérience", hardcoded three times. True in 2026, wrong on 1 January 2027, and
 *      sitting next to a tile that says "2010" — two numbers that disagree by the time anyone
 *      notices. Replaced everywhere by "depuis 2010", which never expires.
 *   4. "nous sommes le leader en nutrition sportive en Tunisie" — an unverifiable superlative on a
 *      page a reader visits precisely to decide whether to believe the shop.
 *   5. An `<img>` pointing at a storage object that 404s.
 *   6. Everything under `<h3>`, so the page had no `<h2>` at all: a heading outline that starts at
 *      level 3 tells a crawler the whole body is a sub-section of nothing.
 *
 * A sanitiser in `cmsSections.ts` can fix (1) and (5) — and does, for any CMS body. It cannot fix
 * a false promise, an expiring number or a superlative, because those are editorial claims, not
 * markup. So the copy is authored here, where it is reviewable in a diff and covered by the same
 * lint the rest of the site is.
 *
 * ── EVERY CLAIM BELOW IS TRACEABLE ──────────────────────────────────────────────────────────
 * Company identity, founding year and city: `util/company.ts`, verified against
 * /api/coordonnees. Delivery terms: the same numbers the cart charges and the footer publishes.
 * The Ministry-of-Health wording is carried over from the CMS body in the hedged form the
 * commitments band already uses ("importés et distribués conformément aux autorisations"), which
 * is a statement about paperwork rather than a claim of endorsement. The Google rating is shown
 * elsewhere on the page, attributed and linked — never as `aggregateRating` schema.
 *
 * Nothing here asserts a certification, a staff count, a market position or a health effect.
 *
 * ── IF THE OWNER WANTS THE CMS BACK ─────────────────────────────────────────────────────────
 * Paste this string into the `body` field of the `qui-sommes-nous` page and set
 * `ABOUT_BODY_SOURCE` to 'cms'. The page then reads the CMS again and this file becomes the
 * fallback. That is a one-line change and it is deliberately left easy.
 */

/** 'repo' — render ABOUT_BODY_FR. 'cms' — render the CMS body and use this only as a fallback. */
export const ABOUT_BODY_SOURCE: 'repo' | 'cms' = 'repo';

/**
 * The H1. The CMS title is `"Qui sommes nous ?"` — no hyphen — which is what actually rendered at
 * 36-60px and what went into the AboutPage schema's `name`. The correctly-hyphenated string
 * existed only as an unreachable fallback.
 */
export const ABOUT_TITLE = 'Qui sommes-nous ?';

/**
 * `<h2>` for the sections, `<h3>` for what sits under them. The CMS body was all `<h3>`.
 *
 * The headings are written for the queries this page can realistically win — "sobitas",
 * "proteine tunisie", "magasin complément alimentaire sousse", "distributeur nutrition sportive
 * tunisie" — without any of them being a keyword line pretending to be a sentence.
 */
export const ABOUT_BODY_FR = `
<p>Protein.tn est le site de <strong>SOBITAS</strong>, une société tunisienne enregistrée à Sousse
et spécialisée depuis 2010 dans les compléments alimentaires sportifs et le matériel de
musculation. Une boutique physique, un entrepôt, une équipe qui répond au téléphone — et un
catalogue que vous pouvez commander depuis n’importe quel gouvernorat.</p>

<h2>Une boutique à Sousse, et la livraison partout en Tunisie</h2>
<p>Notre magasin se trouve Rue Ribat, à Sousse. Vous pouvez y voir les produits, poser vos
questions et repartir avec votre commande le jour même. C’est aussi là que part tout ce que nous
expédions.</p>
<p>Pour le reste du pays, nous livrons les 24 gouvernorats. La livraison est
<strong>gratuite à partir de 300 DT</strong> ; en dessous de ce montant, des frais de livraison
s’appliquent et vous les voyez dans le panier avant de valider. Le paiement se fait
<strong>à la livraison</strong> : vous ne réglez rien tant que le colis n’est pas entre vos mains,
et vous n’avez aucune carte à saisir pour commander.</p>

<h2>Ce que nous vendons</h2>
<p>Le catalogue couvre six rayons, de la nutrition sportive aux compléments de santé :</p>
<ul>
  <li><strong>Protéines</strong> — whey, isolate, caséine, protéines multi-sources, barres et
  snacks protéinés.</li>
  <li><strong>Prise de masse</strong> — gainers, glucides, formules hypercaloriques.</li>
  <li><strong>Performance</strong> — créatine, BCAA, EAA, citrulline, pre-workouts.</li>
  <li><strong>Perte de poids</strong> — L-carnitine, CLA, brûleurs de graisse.</li>
  <li><strong>Santé &amp; vitalité</strong> — vitamines, minéraux, oméga 3, probiotiques, plantes,
  sommeil et immunité.</li>
  <li><strong>Équipement</strong> — accessoires, matériel de musculation, cardio-fitness et
  vêtements.</li>
</ul>
<p>Les grandes marques de nutrition sportive y côtoient les laboratoires de compléments
vitaminés : Optimum Nutrition, BioTech USA, MuscleTech, Dymatize, Nutrex, Universal, OstroVit,
Real Pharm et beaucoup d’autres. Chaque marque a sa page, avec l’intégralité de ses références.</p>

<h2>Comment nous choisissons ce que nous vendons</h2>
<p>Trois règles, et elles expliquent aussi ce que vous ne trouverez pas chez nous.</p>
<h3>Une provenance qui se vérifie</h3>
<p>Nos compléments sont importés et distribués conformément aux autorisations du Ministère de la
Santé. Pas de circuit parallèle, pas de contrefaçon. Si vous voulez voir un lot ou une date de
péremption avant d’acheter, passez en boutique ou demandez-nous une photo.</p>
<h3>Des gammes que l’équipe connaît</h3>
<p>Nous ne référençons pas une marque que nous ne saurions pas expliquer. L’équipe est formée sur
ce qu’elle vend, ce qui veut dire aussi qu’elle vous dira quand un produit n’est pas fait pour
vous — c’est souvent le conseil le plus utile que nous ayons à donner.</p>
<h3>Des prix affichés en dinars, sans conversion surprise</h3>
<p>Le prix que vous voyez sur la fiche produit est le prix que vous payez. Les promotions ont une
date de fin, et le prix barré est un prix qui a réellement été pratiqué.</p>

<h2>Commander : le déroulé, sans surprise</h2>
<ol>
  <li>Vous ajoutez au panier et vous validez — aucun compte n’est obligatoire.</li>
  <li>Nous vous appelons pour confirmer la commande et l’adresse.</li>
  <li>Le colis part de Sousse et un numéro de suivi vous est transmis à l’expédition.</li>
  <li>Vous payez au livreur, à la réception.</li>
</ol>
<p>Un produit ne vous convient pas ou n’est pas conforme ? Contactez-nous : notre politique de
remboursement est publiée sur le site et nous l’appliquons.</p>

<h2>Nous parler</h2>
<p>Le téléphone reste le moyen le plus rapide de nous joindre, et WhatsApp vient juste après.
L’équipe répond du lundi au samedi, de 10 h à 19 h 30, et le dimanche de 14 h à 19 h. Pour tout ce
qui demande une trace écrite — un devis, une demande professionnelle, une réclamation — le
formulaire de contact est là pour ça, et vous recevez une copie de votre message par e-mail.</p>
<p>Que vous soyez à votre première boîte de whey ou que vous prépariez une compétition, la
question à nous poser est toujours la même : quel est votre objectif ? Le reste, c’est notre
travail.</p>
`.trim();
