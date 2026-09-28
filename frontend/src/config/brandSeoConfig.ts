export interface BrandSeoEntry {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  introHtml: string;
  howToChooseTitle: string;
  howToChooseBody: string;
  faqs: Array<{ question: string; answer: string }>;
  relatedCategories: Array<{ slug: string; name: string; url: string }>;
}

/**
 * Hand-written overlays are deliberately limited to brands with measured search demand.
 * Every statement must either describe the live catalogue or explain a product-family choice;
 * no invented awards, distributor status, or blanket medical claims belong here.
 *
 * ── WHERE THE NUMBERS IN THESE ENTRIES COME FROM ─────────────────────────────────────────────
 * Product families, formats and flavour counts were read off /api/productsByBrandId/{id} on
 * 08/09/2026; every per-portion figure quoted below comes from the `nutrition_values` block of
 * /api/product_details/{slug} for the exact reference named, which is itself the manufacturer's
 * label transcribed by the Protein.tn team. That is why each figure is attributed to a format AND
 * a flavour: the same product declares different values per flavour, so an unqualified "30 g de
 * protéines" would be wrong for four of the five Nitro-Tech SKUs we list.
 *
 * Four brands added on 08/09/2026 — gsn-great-sport-nutrition, real-pharm, ultimate-nutrition,
 * c4-cellucor — have a thinner data floor, and the copy says so instead of papering over it. Only
 * Real Pharm publishes a transcribed label on our own fiches: /product_details/real-isolate-1-8-kg
 * and /product_details/real-mass-6-8-kg-real-pharm carry a populated `nutrition_facts`, and those
 * are the ONLY two per-portion figures quoted in those four entries. GSN, Ultimate Nutrition and
 * C4 / Cellucor return `nutrition_values: null` and empty `nutrition_facts.rows` on all 36 of
 * their SKUs, so their entries quote no gram figure at all and say plainly that the pot's own
 * label is the reference. Everything else in them — family, format, net weight, arôme — is read
 * off /api/productsByBrandId/{53,21,24,342}, which is what the product grid on the same screen
 * renders. Two traps worth writing down: "Animal Pak" belongs to brand 25 (Universal Nutrition),
 * NOT to brand 168 (Animal), so it is absent from /animal; and "C4 / Cellucor" (342, 17 SKUs) and
 * "CELLUCOR" (11, 1 SKU) are two separate brand rows serving two separate 200 pages, so the C4
 * Original label figures that exist on /cellucor may not be reused on /c4-cellucor.
 *
 * No entry states a price, a discount, a stock level or an availability promise. Those change
 * daily and the product grid above the copy already renders the live values — a number frozen
 * into this file would be a contradiction on the same screen within a week.
 *
 * ── ONE ANCHOR, ONE DESTINATION ──────────────────────────────────────────────────────────────
 * `relatedCategories` is the only internal-link surface a brand page has, so the same anchor text
 * must always point at the same URL. "Mass gainers en Tunisie" pointed at /gainers-proteines in
 * two entries (dymatize, ostrovit) and at /mass-gainers in two others (muscletech, biotech-usa) —
 * four brand pages splitting the exact anchor Google reads for `mass gainer tunisie` across two
 * self-canonical 200s, which is the cannibalisation the audit found on that query (GSC 22/09:
 * /mass-gainers 0/12/51.4 AND /gainers-proteines 0/10/53.3 on the same query). All four now say
 * /mass-gainers. /gainers-proteines keeps its own distinct anchor, "Gainers protéinés en Tunisie".
 *
 * The rule is one-way, and /creatine is where the difference shows. One anchor may not serve two
 * URLs; one URL may perfectly well be reached by twelve different anchors, and where twelve pages
 * link to the same destination it SHOULD be. Until 22/09/2026 all twelve brand entries carrying a
 * creatine link wrote the identical string "Créatine en Tunisie" — twelve exact-match repetitions
 * of the head term, which is the pattern the owner named as the one to avoid. Each now says what
 * that brand's own reader is about to find: the flavoured-creatine brand offers "Créatines
 * aromatisées et neutres", the brand whose whey already contains 5 g of it offers "Créatines
 * vendues seules", the brand stocking three pot sizes offers "Comparer les formats de créatine".
 * Every one of the twelve still resolves to /creatine, and no other destination uses any of them.
 *
 * ── 23/09/2026: THE CREATINE SPLIT WAS ONLY EVER APPLIED TO CREATINE ─────────────────────────
 * That pass fixed the destination that was NOT the measured problem and left the one that was.
 * Counted across the whole file on 23/09/2026, before this change:
 *
 *     /creatine        12 links, 12 distinct anchors   (already split)
 *     /whey-proteine   15 links,  1 distinct anchor    "Whey protéine en Tunisie" x15
 *     /whey-isolate     8 links,  1 distinct anchor    "Whey isolate en Tunisie"  x8
 *     /pre-workout      6 links,  2 distinct anchors   "Pre-workout" x4 / "Pré-workout" x2
 *     /mass-gainers     4 links,  1 · /glutamine 3, 1 · /vitamines 3, 1 · /bcaa 2, 1
 *     /proteine-de-boeuf 2, 1 · /gainers-proteines 2, 1
 *
 * /whey-proteine is where it hurt: GSC 22/09, `whey protein tunisie` 13 clicks / 346 impressions,
 * of which /blog/whey-proteine-pas-cher-tunisie takes 5 at 13.9 and /blog/whey-protein-en-tunisie
 * 4 at 12.5, while the category itself sits at 34.4 with 1 click. Fifteen brand pages were handing
 * it the same exact-match string, which is the repetition pattern — not the destination — that the
 * creatine note above already identified as the thing to avoid.
 *
 * ── WHAT "ONE DISTINCT ANCHOR" MEANS, AND IN WHICH FILE (re-measured 23/09/2026) ─────────────
 * Counted across this file today: 128 `relatedCategories` links over 28 distinct destinations,
 * and not one destination receives the same anchor string twice. The inverse guard holds too —
 * no anchor string here resolves to two different URLs.
 *
 * That sentence was only half true until today, and the missing half lived in another file. Both
 * renders of a brand page read `relatedCategories[].name`: the human one,
 * app/(shop)/brand/BrandSeoLanding.tsx, which has always printed `{link.name}` unchanged, and the
 * crawler one, app/components/crawler/CrawlerCategoryView.tsx, which used to pass every name
 * through `categoryAnchor()` first. That helper (src/util/categoryAnchor.ts) maps a slug to ONE
 * fixed label and declares 19 of them today; 13 of the 28 destinations linked from this file are
 * among those 19 — /whey-proteine, /creatine, /bcaa, /eaa, /glutamine, /vitamines, /mineraux,
 * /magnesium, /zinc, /zma, /collagene, /omega-3 and /sante-vitalite. On the render that ranks,
 * those 13 collapsed back to one string apiece whatever was written here, while the other 15 —
 * /whey-isolate, /mass-gainers, /brands, /pre-workout, /caseine, /bruleurs-de-graisse,
 * /proteines-multi-sources, /proteine-de-boeuf, /whey-hydrolysee, /gainers-proteines,
 * /articulations, /antioxydants, /citrulline, /boosters-hormonaux and /glucides — kept their
 * curated wording only because the helper has no entry for them.
 *
 * CrawlerCategoryView's related-category rail no longer calls `categoryAnchor()`: it renders
 * `{c.name}`, which is what BrandSeoLanding already did. So the distinct anchors written here are
 * the anchors both renders emit, for all 28 destinations and not just the 15 the helper ignores.
 * The sub-categories rail in that same component still calls the helper on purpose, and that is
 * not this file's concern: the brand branch of app/x-crawler/category/[slug]/page.tsx passes no
 * `subCategories`, so on a brand page that rail renders nothing.
 *
 * The /pre-workout pair was a spelling drift rather than a duplicate: four entries wrote
 * "Pre-workout" and two "Pré-workout" for the same shelf. `catalogTaxonomy.ts` declares the label
 * "Pré-workout", so all six now carry the accent.
 *
 * ── EVERY BRAND PAGE LINKS UP TO /brands ─────────────────────────────────────────────────────
 * Before 23/09/2026, none did — 0 of 16 entries, and the breadcrumb both routes build is
 * `Accueil > Boutique > {marque}`, so /shop was the only thing above a brand page and the brand
 * index was reachable from it only through the global header. /brands is a real indexed page that
 * already earns (GSC 22/09, 28 d: 3 clicks / 235 impressions / pos 26.9) and titles itself "570+
 * marques", so it is the natural parent of 570 brand URLs. Each entry now ends with a /brands
 * chip whose anchor names its own brand — "Comparer Dymatize aux autres marques" — which keeps
 * the 24 anchors distinct without inventing 24 synonyms for "toutes les marques".
 *
 * ── THE SUBJECT OF A BRAND PAGE IS THE BRAND ─────────────────────────────────────────────────
 * Checked on 23/09/2026 across every entry: none leads its metaTitle or its h1 with a category
 * head term — all 24 open with the brand name, then the brand's OWN product names.
 * The generic fallback in util/brandMeta.ts does the same ("{Marque} Tunisie | …"). Keep it that
 * way. A brand page titled "Créatine en Tunisie" would be a second self-canonical 200 bidding
 * against /creatine on the query /creatine is already losing (0 clicks / 8 impressions / pos 64.0
 * on `creatine tunisie`), which is the cannibalisation this whole file exists to avoid.
 *
 * ── A CREATINE LINK REQUIRES A CREATINE PRODUCT ──────────────────────────────────────────────
 * `relatedCategories` is editorial, not a taxonomy dump: a brand links to /creatine only when its
 * own entry above names the creatine reference it sells (Micronised Creatine, Gold Creatine,
 * COR-Performance Creatine, Cell-Tech…). Checked 22/09/2026 against both this file's transcribed
 * catalogues and the live /creatine grid: dymatize, weightworld, william-bonac and victor-martinez
 * list no creatine SKU anywhere, so they get no creatine link. ProActive is the one deliberate
 * exception and it is not a loophole — its entry states outright that it sells no standalone
 * creatine, and then tells the reader the 5 g inside Anabolic Whey 80 counts toward their daily
 * total. "Créatines vendues seules" is the answer to the question that copy provokes.
 *
 * ── ONLY BRANDS WHOSE PAGE ACTUALLY RESOLVES ─────────────────────────────────────────────────
 * A slug here only produces content if findBrandBySlug() resolves it, so entries exist only for
 * brands present in /all_brands. Checked on 08/09/2026 against all 582 rows: american-wolf,
 * impact-sport-nutrition, creapure, amino-complex and longevity(-plus) are not brands we carry —
 * their pages answer 404, and an entry for them would be dead config, not SEO.
 *
 * ── WHICH BRANDS GET AN ENTRY: THE MEASURED ONES, IN ORDER ───────────────────────────────────
 * /all_brands returned 582 rows on 23/09/2026 and the sitemap advertises a URL for each, so the
 * question is never "which brand deserves copy" in the abstract — it is "which brand URL is
 * already being shown to someone". Crossing the 28-day GSC Pages export (protein.tn/2026-09-22-28d
 * /Pages.csv, 23/08 → 19/09) against /all_brands gives 104 brand URLs with at least one
 * impression. Ranked by clicks, the top of that list was:
 *
 *     /optimum-nutrition 47/1614/13.5   /dymatize 44/200/4.5     /biotech-usa 19/214/7.9
 *     /weightworld 14/144/5.5           /muscletech 12/154/7.7   /ostrovit 12/146/7.1
 *     /now-foods 12/58/3.1              /vital-proteins 11/52/3.4  /william-bonac 10/108/6.1
 *     /doctor-s-best 9/19/3.3           /big-ramy-labs 8/164/6.7  /rule-one-proteins 8/50/6.7
 *     /proactive 7/164/25.6             /mr-x-v-shape-supps 7/69/7.7  /victor-martinez 5/30/9.0
 *     /gsn-great-sport-nutrition 4/381/8.5  /nutricost 4/25/3.6   /universal-nutrition 3/19/7.3
 *     /olimp-sport-nutrition 2/51/7.2   /kevin-levrone 2/54/11.9  /challenger-nutrition 1/71/9.2
 *     /ultimate-nutrition 3/54/7.9      /c4-cellucor 1/30/8.9     /real-pharm 0/19/21.2
 *
 * The eight added on 23/09/2026 — now-foods, vital-proteins, doctor-s-best, rule-one-proteins,
 * mr-x-v-shape-supps, nutricost, universal-nutrition, olimp-sport-nutrition — take the file from
 * 16 brands to 24. All eight answered 200 with `index, follow` under a Googlebot UA on 23/09/2026
 * before a line was written for them, and all eight were falling through to the generic default
 * title "{Marque} Tunisie | Compléments alimentaires — Protein.tn" — the same string on 566 of
 * the 582 brand URLs, 558 of them after this change. Two were also shouting the database value at
 * Google: "OLIMP SPORT NUTRITION Tunisie" and "MR.X  V-Shape Supps Tunisie", double space
 * included; the curated entry is what fixes the casing on the one view that ranks.
 *
 * Four earning brands in that band were deliberately NOT given an entry, and the reason is the
 * same for all four: their listing is one to four SKUs (neurogum 9 clicks / 1 product;
 * fond-bone-broth 7 / 2; true-sea-moss 5 / 4; bpi-sports 4 / 2). A "quel produit choisir ?"
 * section needs at least two products that differ on something; with one reference the honest
 * output is the product page, not a brand guide. They also already rank at 1.9 to 6.7 — there is
 * nothing here to win. If their catalogue grows, they are the next entries to write.
 *
 * Their product families, formats and net weights come from /api/productsByBrandId/{66,310,63,
 * 454,36,389,25,1} read on 23/09/2026 — the same listing the grid above the copy renders. They
 * quote NO per-portion figure at all: unlike the flagship entries there is no transcribed
 * `nutrition_facts` behind them, so each says plainly that the pot's own label is the reference.
 * That is also why none of them claims a benefit for a substance. Nothing here states a price, a
 * stock level, a founding year, an award or a distributor status, because nothing on protein.tn
 * sources any of those.
 *
 * ── A LINK REQUIRES A PRODUCT — RE-VERIFIED, ALL 24 ──────────────────────────────────────────
 * Re-checked 23/09/2026 by fetching every entry's own /api/productsByBrandId listing and
 * intersecting the `sous_categorie.slug` set with its `relatedCategories`. Every link in the file
 * resolves to a category the brand genuinely sells into, with exactly two deliberate exceptions,
 * both stated in the copy that surrounds them:
 *   · proactive → /creatine — the entry says outright it sells no standalone creatine (its
 *     listing holds only proteines-multi-sources and whey-proteine) and the anchor "Créatines
 *     vendues seules" answers the question its own copy provokes. See the section above.
 *   · vital-proteins → /sante-vitalite — a RAYON, not a leaf. Its five references are all
 *     `collagene`, and catalogTaxonomy.ts declares `collagene` a child of `sante-vitalite`, so
 *     this is the up-the-tree link, not a claim that the brand sells the whole rayon.
 * Every non-/brands destination in the file is a slug declared in catalogTaxonomy.ts, so the
 * names these anchors use and the parents they imply come from the one canonical tree.
 */
const BRAND_SEO_CONFIG: Readonly<Record<string, BrandSeoEntry>> = Object.freeze({
  dymatize: {
    metaTitle: 'Dymatize Tunisie | ISO100, Whey & Mass Gainer — Protein.tn',
    metaDescription:
      'Achetez Dymatize en Tunisie : ISO100 whey isolate, Elite Whey et Super Mass Gainer. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'Dymatize Tunisie : ISO100, whey et mass gainer',
    introHtml:
      '<p>Retrouvez la gamme <strong>Dymatize en Tunisie</strong> : ISO100 hydrolysée, Elite 100% Whey, Super Mass Gainer et pré-workout. Comparez les formats, les saveurs, le prix affiché et la disponibilité avant de commander.</p>',
    howToChooseTitle: 'Quelle protéine Dymatize choisir ?',
    howToChooseBody:
      '<p><strong>ISO100</strong> convient surtout aux sportifs qui recherchent une whey isolate hydrolysée, facile à mélanger et pauvre en sucres selon les références du fabricant. <strong>Elite 100% Whey</strong> est une whey polyvalente pour compléter l’apport quotidien. <strong>Super Mass Gainer</strong> vise plutôt les personnes qui ont du mal à atteindre un apport calorique suffisant. Vérifiez toujours l’étiquette du parfum et du format choisi : les valeurs nutritionnelles peuvent varier.</p>',
    faqs: [
      {
        question: 'Quel est le prix de Dymatize ISO100 en Tunisie ?',
        answer:
          'Le prix dépend du format, du parfum et des promotions en cours. La grille de produits ci-dessus affiche le prix et la disponibilité actuels de chaque référence Dymatize vendue sur Protein.tn.',
      },
      {
        question: 'Quelle différence entre Dymatize ISO100 et Elite 100% Whey ?',
        answer:
          'ISO100 utilise principalement de la whey isolate hydrolysée et cible une digestion rapide avec peu de sucres. Elite 100% Whey est une formule whey plus polyvalente pour l’apport protéique quotidien. Le meilleur choix dépend de votre tolérance, de votre alimentation et de votre budget.',
      },
      {
        question: 'Dymatize convient-il à la prise de masse ?',
        answer:
          'Oui, mais le produit dépend de votre besoin. Une whey complète les protéines d’une alimentation déjà assez calorique ; un mass gainer apporte davantage de glucides et de calories lorsque l’alimentation seule ne suffit pas.',
      },
      {
        question: 'Comment commander Dymatize en Tunisie ?',
        answer:
          'Choisissez le produit et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-isolate', name: 'Whey isolate en Tunisie', url: '/whey-isolate' },
      { slug: 'whey-proteine', name: 'Toutes les whey protéines en Tunisie', url: '/whey-proteine' },
      { slug: 'mass-gainers', name: 'Mass gainers en Tunisie', url: '/mass-gainers' },
      { slug: 'brands', name: 'Comparer Dymatize aux autres marques', url: '/brands' },
    ],
  },

  muscletech: {
    metaTitle: 'MuscleTech Tunisie | Nitro-Tech & Cell-Tech — Protein.tn',
    metaDescription:
      'MuscleTech en Tunisie : whey Nitro-Tech 1,81 kg, ISO Whey Clear, quatre créatines dont Cell-Tech. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'MuscleTech Tunisie : Nitro-Tech, Cell-Tech et acides aminés',
    introHtml:
      '<p>La gamme <strong>MuscleTech vendue en Tunisie</strong> se répartit en quatre familles. Les protéines d’abord : <strong>Nitro-Tech</strong> en 1,81 kg (Milk Chocolate, Cookies &amp; Cream, Vanilla Cream, Strawberry), <strong>ISO Whey Clear</strong> en 503 g et <strong>100% Grass-Fed Whey</strong> en 816 g. Les créatines ensuite, quatre références : <strong>Cell-Tech</strong> 1,36 kg, <strong>Platinum Creatine</strong> en pot de 400 g et deux <strong>Creatine Chews</strong> à croquer. Puis les acides aminés, <strong>Amino Build</strong> et <strong>Platinum 100% EAA+</strong>, et le pré-workout <strong>EuphoriQ</strong>. S’y ajoutent Hydroxycut Hardcore Elite, Platinum MultiVitamin et Clear Muscle. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>',
    howToChooseTitle: 'Quel produit MuscleTech choisir ?',
    howToChooseBody:
      '<p><strong>Nitro-Tech</strong> est la protéine la plus complète de la gamme : sur le format 1,81 kg parfum Milk Chocolate, l’étiquette du fabricant déclare 30 g de protéines et 3 g de créatine monohydrate par portion de 45 g. C’est donc une poudre à la fois protéinée et créatinée, ce qui évite d’acheter les deux séparément. <strong>ISO Whey Clear</strong> (503 g) est un isolat qui se boit clair, plus proche d’un jus que d’une boisson lactée : le choix se joue surtout sur la texture. <strong>100% Grass-Fed Whey</strong> (816 g) répond, elle, à une exigence sur l’origine du lait.</p>' +
      '<p>Côté créatine, il y a quatre références et non deux. <strong>Cell-Tech</strong> (1,36 kg) est une poudre à diluer qui apporte aussi des glucides ; <strong>Platinum Creatine</strong> est un pot de 400 g ; les deux <strong>Creatine Chews</strong> sont des comprimés à croquer dosés à 1 g, sans eau ni shaker. <strong>Amino Build</strong> et <strong>Platinum 100% EAA+</strong> se placent autour de l’entraînement, une fois l’apport protéique de la journée déjà couvert par l’alimentation ou par une whey. Vérifiez toujours l’étiquette du parfum et du format retenus : les valeurs déclarées changent d’une saveur à l’autre.</p>',
    faqs: [
      {
        question: 'Quels produits MuscleTech sont disponibles en Tunisie ?',
        answer:
          'Protein.tn référence les protéines Nitro-Tech, ISO Whey Clear et 100% Grass-Fed Whey, les créatines Cell-Tech, Platinum Creatine 400 g et Creatine Chews, les acides aminés Amino Build et Platinum 100% EAA+, le pré-workout EuphoriQ, ainsi que Hydroxycut Hardcore Elite, Platinum MultiVitamin et Clear Muscle. La grille de produits de cette page indique les références et les formats effectivement proposés.',
      },
      {
        question: 'Combien de protéines contient une portion de Nitro-Tech ?',
        answer:
          'Sur le format 1,81 kg parfum Milk Chocolate, l’étiquette du fabricant déclare 30 g de protéines, 4 g de glucides, 3 g de créatine monohydrate et 160 kcal pour une portion de 45 g. Ces valeurs varient selon le parfum et le format : l’étiquette de la référence que vous commandez fait foi.',
      },
      {
        question: 'Quelle différence entre Nitro-Tech et ISO Whey Clear ?',
        answer:
          'Nitro-Tech est une whey en poudre classique, qui se mélange en boisson lactée et contient de la créatine ajoutée. ISO Whey Clear est un isolat de lactosérum qui donne une boisson claire, sans créatine. La différence porte donc sur la texture obtenue au shaker et sur la présence ou non de créatine dans le même produit.',
      },
      {
        question: 'Quelles créatines MuscleTech sont référencées ?',
        answer:
          'Quatre, et pas seulement les deux les plus connues. Cell-Tech est une poudre de 1,36 kg à diluer qui apporte aussi des glucides. Platinum Creatine est un pot de 400 g. Les deux Creatine Chews sont des comprimés à croquer dosés à 1 g, qui ne demandent ni eau ni shaker et se transportent facilement. Le choix tient à votre routine et au format qui vous convient ; la composition exacte de chaque référence est imprimée sur son pot.',
      },
      {
        question: 'Quel est le prix des produits MuscleTech en Tunisie ?',
        answer:
          'Le prix dépend du format, du parfum et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence MuscleTech vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander MuscleTech en Tunisie ?',
        answer:
          'Choisissez le produit et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Le rayon whey protéine', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Créatines en poudre et à croquer', url: '/creatine' },
      { slug: 'pre-workout', name: 'Pré-workout en Tunisie', url: '/pre-workout' },
      { slug: 'brands', name: 'Comparer MuscleTech aux autres marques', url: '/brands' },
    ],
  },

  ostrovit: {
    metaTitle: 'OstroVit Tunisie | Créatine, Whey & Vitamines — Protein.tn',
    metaDescription:
      'OstroVit en Tunisie : créatine monohydrate 300 g et 500 g, glutamine, EAA, 100% Whey Protein 2 kg. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'OstroVit Tunisie : créatine, acides aminés et vitamines',
    introHtml:
      '<p>La gamme <strong>OstroVit en Tunisie</strong> repose surtout sur des poudres sans arôme et des gélules à dose simple. Côté poudres : <strong>Creatine Monohydrate</strong> en 300 g et 500 g, <strong>Glutamine</strong> 300 g, <strong>EAA</strong> 400 g, <strong>Citrulline Malate</strong> 210 g et <strong>Arginine</strong> 210 g. Côté calories : <strong>100% Whey Protein</strong> 2 kg, <strong>Carbo</strong> 1000 g et <strong>Delicious Gainer</strong> 4,5 kg. Le catalogue comprend enfin une série de vitamines et minéraux — Vitamin C, Vitamin D3 4000 UI, Vitamin Forte, Omega 3, ZMA Advanced, L-Carnitina 1250, Tribulus Terrestris, Collagen + Vitamin C et Ashwagandha.</p>',
    howToChooseTitle: 'Quel produit OstroVit choisir ?',
    howToChooseBody:
      '<p><strong>Creatine Monohydrate</strong> est la référence la plus simple de la marque : l’étiquette du format 500 g déclare une portion de 3,4 g de créatine monohydrate, soit 3 g de créatine, en poudre sans arôme. Le format 300 g contient exactement le même ingrédient ; seule la durée couverte par le pot change, ce qui en fait une question de budget et non de qualité. <strong>Glutamine</strong> 300 g et <strong>EAA</strong> 400 g se prennent autour de l’entraînement, en complément d’un apport protéique déjà assuré par l’alimentation ou par une whey — ils ne la remplacent pas.</p>' +
      '<p>Sur la partie calorique, les trois produits ne jouent pas le même rôle : <strong>100% Whey Protein</strong> 2 kg complète les protéines, <strong>Carbo</strong> 1000 g n’apporte que des glucides, et <strong>Delicious Gainer</strong> 4,5 kg combine les deux pour les personnes qui n’atteignent pas leur apport calorique en mangeant. Les gélules et comprimés (Vitamin C, Vitamin D3 4000 UI, Omega 3, ZMA Advanced, Collagen + Vitamin C) relèvent d’un usage quotidien et non de la performance à l’entraînement. Reportez-vous à l’étiquette de chaque référence pour les doses et les allergènes.</p>',
    faqs: [
      {
        question: 'Quels produits OstroVit trouve-t-on en Tunisie ?',
        answer:
          'Protein.tn référence la Creatine Monohydrate en 300 g et 500 g, la Glutamine 300 g, les EAA 400 g, la Citrulline Malate 210 g, l’Arginine 210 g, la 100% Whey Protein 2 kg, le Carbo 1000 g et le Delicious Gainer 4,5 kg, ainsi que les vitamines et minéraux de la marque : Vitamin C, Vitamin D3 4000 UI, Vitamin Forte, Omega 3, ZMA Advanced, L-Carnitina 1250, Tribulus Terrestris, Collagen + Vitamin C et Ashwagandha.',
      },
      {
        question: 'Combien de créatine dans une portion de Creatine Monohydrate OstroVit ?',
        answer:
          'Sur le format 500 g, l’étiquette du fabricant indique une portion de 3,4 g de créatine monohydrate, correspondant à 3 g de créatine. La poudre est proposée sans arôme. Le produit est fabriqué dans une usine qui utilise aussi des ingrédients issus du lait, du soja et du poisson, ce qui est à vérifier en cas d’allergie.',
      },
      {
        question: 'Faut-il choisir le format 300 g ou 500 g de créatine OstroVit ?',
        answer:
          'Les deux formats contiennent la même créatine monohydrate en poudre. Le 500 g couvre simplement une période plus longue à dose journalière égale. Comparez le prix affiché des deux formats sur cette page pour décider : rien ne distingue les deux produits sur le plan de la composition.',
      },
      {
        question: 'OstroVit propose-t-il une whey et un gainer ?',
        answer:
          'Oui. La 100% Whey Protein est proposée en 2 kg et le Delicious Gainer en 4,5 kg. La whey sert à compléter l’apport en protéines d’une alimentation déjà suffisamment calorique ; le gainer ajoute des glucides et des calories lorsque manger davantage est le point bloquant.',
      },
      {
        question: 'Quel est le prix des produits OstroVit en Tunisie ?',
        answer:
          'Le prix dépend du format, du parfum et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence OstroVit vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander OstroVit en Tunisie ?',
        answer:
          'Choisissez le produit et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'creatine', name: 'Découvrir les créatines monohydrate', url: '/creatine' },
      { slug: 'glutamine', name: 'Glutamine en Tunisie', url: '/glutamine' },
      { slug: 'whey-proteine', name: 'Comparer les whey protéines', url: '/whey-proteine' },
      { slug: 'vitamines', name: 'Vitamines en Tunisie', url: '/vitamines' },
      { slug: 'brands', name: 'Comparer OstroVit aux autres marques', url: '/brands' },
    ],
  },

  'kevin-levrone': {
    metaTitle: 'Kevin Levrone Tunisie | Levro Mass, Gold Whey — Protein.tn',
    metaDescription:
      'Kevin Levrone en Tunisie : Levro Legendary Mass 6,8 kg et 3 kg, Gold Whey, Gold ISO et Gold Creatine. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'Kevin Levrone Tunisie : Levro Legendary Mass et série Gold',
    introHtml:
      '<p>La gamme <strong>Kevin Levrone en Tunisie</strong> s’organise autour de la prise de masse et de la série Gold. Le gainer <strong>Levro Legendary Mass</strong> est proposé en 6,8 kg et en 3 kg. Les protéines de la série Gold suivent avec <strong>Gold Whey</strong> 2 kg et <strong>Gold ISO</strong> 2 kg. Complètent le catalogue la <strong>Gold Creatine</strong> 300 g, la <strong>Gold L-Arginine</strong> en 120 gélules, deux L-carnitines liquides — <strong>Gold L-Carnitine 3000</strong> et <strong>Anabolic L-Carnitine 3000</strong>, toutes deux en flacon de 500 ml —, le pré-workout <strong>Shaaboom Pump</strong> 385 g et le <strong>Gold Power Core Multivitamin</strong> en 120 comprimés. Un Pack Prise de Masse Pro regroupe plusieurs de ces références en une seule commande.</p>',
    howToChooseTitle: 'Quel produit Kevin Levrone choisir ?',
    howToChooseBody:
      '<p><strong>Levro Legendary Mass</strong> est le produit central de la marque, et c’est un gainer très calorique. Sur le sac de 6,8 kg, l’étiquette du fabricant déclare une portion de 200 g (4 doses) apportant 771 kcal, 42 g de protéines et 138 g de glucides, pour 34 portions par contenant. Il s’adresse donc aux personnes dont le point bloquant est la quantité de nourriture, pas à celles qui cherchent uniquement à compléter leurs protéines. Le format 3 kg reprend la même formule sur une durée plus courte.</p>' +
      '<p>Si votre alimentation couvre déjà les calories, <strong>Gold Whey</strong> 2 kg ou <strong>Gold ISO</strong> 2 kg sont les choix cohérents, le second étant construit sur un isolat. La <strong>Gold Creatine</strong> 300 g se prend indépendamment du reste et n’a pas à être associée à un parfum particulier. <strong>Shaaboom Pump</strong> 385 g est un pré-workout, à réserver aux séances où vous en ressentez le besoin plutôt qu’à un usage quotidien, et les <strong>L-Carnitine 3000</strong> en flacon de 500 ml sont des formats liquides prêts à doser. Vérifiez l’étiquette du format retenu avant de commander.</p>',
    faqs: [
      {
        question: 'Quels produits Kevin Levrone sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence le gainer Levro Legendary Mass en 6,8 kg et 3 kg, les protéines Gold Whey 2 kg et Gold ISO 2 kg, la Gold Creatine 300 g, la Gold L-Arginine 120 gélules, la Gold L-Carnitine 3000 et l’Anabolic L-Carnitine 3000 en 500 ml, le pré-workout Shaaboom Pump 385 g et le Gold Power Core Multivitamin 120 comprimés, ainsi qu’un Pack Prise de Masse Pro.',
      },
      {
        question: 'Combien de calories dans une portion de Levro Legendary Mass ?',
        answer:
          'Sur le format 6,8 kg, l’étiquette du fabricant déclare une portion de 200 g, soit 4 doses, apportant 771 kcal, 42 g de protéines, 138 g de glucides dont 20 g de sucres et 5,2 g de lipides. Le sac contient 34 portions. La déclaration est également imprimée pour 100 g et pour 400 g sur l’emballage.',
      },
      {
        question: 'Quelle différence entre Gold Whey et Gold ISO ?',
        answer:
          'Gold Whey est une whey polyvalente destinée à compléter l’apport protéique quotidien. Gold ISO est construite sur un isolat, plus filtré. Les deux sont proposées en 2 kg. Le choix dépend de votre tolérance et de votre budget ; l’étiquette de chaque référence donne la composition exacte du parfum concerné.',
      },
      {
        question: 'Levro Legendary Mass existe-t-il en petit format ?',
        answer:
          'Oui, la même formule est référencée en 3 kg à côté du sac de 6,8 kg. Le 3 kg permet de tester le produit sur une durée plus courte. Comparez le prix affiché des deux formats sur cette page avant de choisir.',
      },
      {
        question: 'Quel est le prix des produits Kevin Levrone en Tunisie ?',
        answer:
          'Le prix dépend du format, du parfum et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence Kevin Levrone vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander Kevin Levrone en Tunisie ?',
        answer:
          'Choisissez le produit et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'mass-gainers', name: 'Comparer les mass gainers', url: '/mass-gainers' },
      { slug: 'whey-proteine', name: 'Whey protéines : tous les formats', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Voir nos créatines en Tunisie', url: '/creatine' },
      { slug: 'pre-workout', name: 'Comparer les pré-workouts', url: '/pre-workout' },
      { slug: 'brands', name: 'Comparer Kevin Levrone aux autres marques', url: '/brands' },
    ],
  },

  'optimum-nutrition': {
    metaTitle: 'Optimum Nutrition Tunisie | Whey Gold Standard — Protein.tn',
    metaDescription:
      'Optimum Nutrition en Tunisie : Gold Standard 100% Whey 2,27 kg, Serious Mass 5,45 kg et Micronised Creatine. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'Optimum Nutrition Tunisie : Gold Standard, Hydro Whey et Serious Mass',
    introHtml:
      '<p>La gamme <strong>Optimum Nutrition en Tunisie</strong> réunit les protéines <strong>Gold Standard 100% Whey</strong>, de 837 g à 4,5 kg selon le parfum (Double Rich Chocolate, Vanilla Ice Cream, Delicious Strawberry, Strawberry Banana, Rocky Road, Banana Cream, Chocolate Malt, Chocolate Mint, Cookies &amp; Cream, Extreme Milk Chocolate, French Vanilla Creme), et <strong>Platinum Hydro Whey</strong> en 820 g, 1,59 kg, 1,6 kg et 1,64 kg, le gainer <strong>Serious Mass</strong> en 2,7 kg et 5,45 kg, la <strong>Micronised Creatine</strong> en 300 g et 317 g, les acides aminés <strong>Instantized BCAA 5000</strong> 345 g et <strong>Superior Amino 2222</strong> en 320 comprimés, ainsi que les multivitamines <strong>Opti-Men</strong> et <strong>Opti-Women</strong>. HMB et ZMA complètent le catalogue, aux côtés de packs qui regroupent plusieurs de ces références.</p>',
    howToChooseTitle: 'Quelle protéine Optimum Nutrition choisir ?',
    howToChooseBody:
      '<p><strong>Gold Standard 100% Whey</strong> est la référence de base de la marque : sur le format 2,27 kg parfum Double Rich Chocolate, l’étiquette du fabricant déclare 24 g de protéines, 1,6 g de glucides et 116 kcal par portion de 31 g. C’est une whey polyvalente, qui convient au complément protéique quotidien quel que soit l’objectif, et le choix se fait ensuite sur le parfum. <strong>Platinum Hydro Whey</strong> repose sur une whey hydrolysée et s’adresse aux sportifs qui privilégient une digestion rapide ; elle est proposée en 820 g, 1,59 kg, 1,6 kg et 1,64 kg.</p>' +
      '<p><strong>Serious Mass</strong>, en 2,7 kg et 5,45 kg, est un gainer, pas une version renforcée de la whey : il apporte surtout des glucides et répond à une difficulté à atteindre l’apport calorique. La <strong>Micronised Creatine</strong> (300 g ou 317 g) est une créatine monohydrate sans arôme, à prendre indépendamment des protéines. <strong>Instantized BCAA 5000</strong> et <strong>Superior Amino 2222</strong> viennent après, une fois les protéines totales couvertes. Enfin, <strong>Opti-Men</strong> et <strong>Opti-Women</strong> sont des multivitamines quotidiennes et ne remplacent aucun des produits ci-dessus. Vérifiez l’étiquette du parfum et du format retenus.</p>',
    faqs: [
      {
        question: 'Quels produits Optimum Nutrition sont disponibles en Tunisie ?',
        answer:
          'Protein.tn référence la Gold Standard 100% Whey de 837 g à 4,5 kg dans plusieurs parfums, la Platinum Hydro Whey en 820 g, 1,59 kg, 1,6 kg et 1,64 kg, le gainer Serious Mass en 2,7 kg et 5,45 kg, la Micronised Creatine en 300 g et 317 g, l’Instantized BCAA 5000 345 g, le Superior Amino 2222 320 comprimés, les multivitamines Opti-Men et Opti-Women, ainsi que HMB et ZMA.',
      },
      {
        question: 'Combien de protéines dans une dose de Gold Standard 100% Whey ?',
        answer:
          'Sur le format 2,27 kg parfum Double Rich Chocolate, l’étiquette du fabricant déclare 24 g de protéines, 1,6 g de glucides dont 1 g de sucres, 1,4 g de matières grasses et 116 kcal pour une portion de 31 g. Le produit contient du lait et du soja. Les valeurs varient selon le parfum.',
      },
      {
        question: 'Quelle différence entre Gold Standard et Platinum Hydro Whey ?',
        answer:
          'Gold Standard 100% Whey est une whey polyvalente pour l’apport protéique quotidien. Platinum Hydro Whey est construite sur une whey hydrolysée, c’est-à-dire prédécoupée, et vise une digestion plus rapide. Elle est proposée en 820 g, 1,59 kg, 1,6 kg et 1,64 kg, quand la Gold Standard s’étend de 837 g à 4,5 kg.',
      },
      {
        question: 'Gold Standard ou Serious Mass pour prendre du poids ?',
        answer:
          'Les deux ne répondent pas au même blocage. Si vous mangez assez mais manquez de protéines, la Gold Standard suffit. Si vous n’arrivez pas à atteindre votre apport calorique, Serious Mass apporte surtout des glucides en plus des protéines, en sac de 2,7 kg ou de 5,45 kg. Le point de départ reste votre alimentation.',
      },
      {
        question: 'Quel est le prix des produits Optimum Nutrition en Tunisie ?',
        answer:
          'Le prix dépend du format, du parfum et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence Optimum Nutrition vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander Optimum Nutrition en Tunisie ?',
        answer:
          'Choisissez le produit et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Notre sélection de whey protéines', url: '/whey-proteine' },
      { slug: 'mass-gainers', name: 'Le rayon mass gainer', url: '/mass-gainers' },
      { slug: 'creatine', name: 'Comparer nos créatines', url: '/creatine' },
      { slug: 'vitamines', name: 'Le rayon vitamines et minéraux', url: '/vitamines' },
      { slug: 'brands', name: 'Comparer Optimum Nutrition aux autres marques', url: '/brands' },
    ],
  },

  'biotech-usa': {
    metaTitle: 'BioTech USA Tunisie | Pure Whey & Iso Whey Zero — Protein.tn',
    metaDescription:
      'BioTech USA en Tunisie : 100% Pure Whey et Iso Whey Zero 2,27 kg, créatine 300 g, BCAA Zero et vitamines. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'BioTech USA Tunisie : 100% Pure Whey, Iso Whey Zero et créatine',
    introHtml:
      '<p>La gamme <strong>BioTech USA en Tunisie</strong> couvre d’abord les protéines, avec <strong>100% Pure Whey</strong> en 2,27 kg et <strong>Iso Whey Zero</strong> en 2,27 kg. Viennent ensuite la <strong>100% Creatine Monohydrate</strong> 300 g, les <strong>BCAA Zero</strong> 360 g, la <strong>L-Arginine</strong> 300 g et les glucides <strong>Carbox</strong> 1 kg. Le catalogue comprend également une série de gélules et comprimés à usage quotidien : Multivitamin for Men, One-A-Day, Mega Omega 3, ZMA, Zinc Duo, Zinc + Chelate, Tribulus Maximus, Ashwagandha et L-Carnitine Chrome. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>',
    howToChooseTitle: 'Quel produit BioTech USA choisir ?',
    howToChooseBody:
      '<p><strong>100% Pure Whey</strong> est la protéine polyvalente de la marque : sur le format 2,27 kg version Natural, l’étiquette du fabricant déclare 22 g de protéines, 2,2 g de glucides, 1,7 g de matières grasses et 114 kcal par portion de 28 g, et signale la présence de lait. <strong>Iso Whey Zero</strong>, également en 2,27 kg, est construite autour d’un isolat et vise une teneur en glucides plus basse : c’est la référence à examiner si vous surveillez les sucres ou tolérez mal le lactose. Dans les deux cas les valeurs exactes dépendent du parfum choisi.</p>' +
      '<p>La <strong>100% Creatine Monohydrate</strong> 300 g se prend séparément des protéines et n’a pas à être associée à un moment précis de la journée. <strong>BCAA Zero</strong> 360 g et <strong>L-Arginine</strong> 300 g se placent autour de l’entraînement, une fois l’apport protéique total déjà couvert. <strong>Carbox</strong> 1 kg n’apporte que des glucides : il sert à compléter les calories, seul ou ajouté à un shake, plutôt qu’à tenir le rôle d’un gainer complet. Les gélules et comprimés de la gamme relèvent d’un usage quotidien ; reportez-vous à l’étiquette pour les doses et les allergènes.</p>',
    faqs: [
      {
        question: 'Quels produits BioTech USA sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence les protéines 100% Pure Whey et Iso Whey Zero en 2,27 kg, la 100% Creatine Monohydrate 300 g, les BCAA Zero 360 g, la L-Arginine 300 g, le Carbox 1 kg, ainsi que Multivitamin for Men, One-A-Day, Mega Omega 3, ZMA, Zinc Duo, Zinc + Chelate, Tribulus Maximus, Ashwagandha et L-Carnitine Chrome.',
      },
      {
        question: 'Combien de protéines dans une portion de 100% Pure Whey ?',
        answer:
          'Sur le format 2,27 kg version Natural, l’étiquette du fabricant déclare 22 g de protéines, 2,2 g de glucides dont 2,2 g de sucres, 1,7 g de matières grasses et 114 kcal pour une portion de 28 g. Le produit contient du lait et est fabriqué dans une usine qui utilise aussi œuf, soja et fruits à coque. Les valeurs varient selon le parfum.',
      },
      {
        question: 'Quelle différence entre 100% Pure Whey et Iso Whey Zero ?',
        answer:
          '100% Pure Whey associe whey concentrée et whey isolate : c’est la formule polyvalente, pour l’apport protéique de tous les jours. Iso Whey Zero est bâtie autour d’un isolat et vise une teneur plus basse en glucides et en lactose. Les deux sont proposées en 2,27 kg ; comparez les étiquettes des parfums qui vous intéressent.',
      },
      {
        question: 'À quoi sert le Carbox de BioTech USA ?',
        answer:
          'Carbox est une poudre de glucides en 1 kg, sans protéines. Elle sert à augmenter l’apport calorique autour de l’entraînement ou à compléter un shake protéiné. Si vous cherchez protéines et glucides dans un seul produit, un gainer complet est plus adapté qu’une poudre de glucides seule.',
      },
      {
        question: 'Quel est le prix des produits BioTech USA en Tunisie ?',
        answer:
          'Le prix dépend du format, du parfum et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence BioTech USA vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander BioTech USA en Tunisie ?',
        answer:
          'Choisissez le produit et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Voir les whey protéines disponibles', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Comparer les whey isolate', url: '/whey-isolate' },
      { slug: 'creatine', name: 'Le rayon créatine en Tunisie', url: '/creatine' },
      { slug: 'bcaa', name: 'BCAA en Tunisie', url: '/bcaa' },
      { slug: 'brands', name: 'Comparer BioTech USA aux autres marques', url: '/brands' },
    ],
  },

  'gsn-great-sport-nutrition': {
    metaTitle: 'GSN Tunisie | Whey, Isolate, Créatine & Gainer — Protein.tn',
    metaDescription:
      'GSN Great Sport Nutrition en Tunisie : Pure Whey et Nitro Whey 2 kg, Isolate Pro 2 kg, Creatine Monohydrate 200 g et 500 g, Big Mass Gainer 3 kg et 6 kg.',
    h1: 'GSN Great Sport Nutrition Tunisie : whey, créatine et gainer',
    introHtml:
      '<p>La gamme <strong>GSN Great Sport Nutrition en Tunisie</strong> tient en sept références réparties sur trois usages. Côté protéines : <strong>Pure Whey</strong> 2 kg et <strong>Nitro Whey</strong> 2 kg, rangées en whey protéine sur le site, et <strong>Isolate Pro</strong> 2 kg, rangée en whey isolate. Côté performance : <strong>Creatine Monohydrate</strong> en 200 g et en 500 g. Côté calories : <strong>Big Mass Gainer</strong> en 3 kg et en 6 kg, le format 6 kg étant référencé en arôme Banane. Les trois poudres protéinées de la marque sont toutes vendues en 2 kg : GSN ne décline pas ses whey en petit pot, si bien que le choix porte sur le type de protéine et non sur la contenance.</p>',
    howToChooseTitle: 'Quel produit GSN choisir ?',
    howToChooseBody:
      '<p>Les trois poudres protéinées de GSN ne sont pas classées dans le même rayon, et c’est le point de départ du choix. <strong>Pure Whey</strong> et <strong>Nitro Whey</strong> figurent en whey protéine : ce sont les références polyvalentes, faites pour compléter l’apport quotidien en protéines quand l’alimentation seule n’y suffit pas. <strong>Isolate Pro</strong> figure en whey isolate, une famille où la poudre subit une filtration supplémentaire et vise donc davantage de protéines par portion pour moins de glucides et de lipides. Nos fiches produit GSN ne publient pas de tableau de valeurs nutritionnelles : aucune valeur par portion n’est donc annoncée ici, et l’étiquette du pot reçu reste la seule référence pour calculer votre apport.</p>' +
      '<p><strong>Creatine Monohydrate</strong> répond à une autre question. Les pots de 200 g et de 500 g contiennent le même ingrédient ; à dose journalière égale, seule la durée couverte change, ce qui en fait un arbitrage de budget et non de qualité. La créatine n’apporte pas de protéines : elle se prend en complément d’une whey, pas à sa place. <strong>Big Mass Gainer</strong>, enfin, ne s’adresse pas au même profil que les whey. Un gainer ajoute des glucides et des calories, et sert quand le point bloquant est d’atteindre l’apport calorique quotidien plutôt que l’apport protéique. Ses deux contenances sont classées dans deux rayons distincts du site — mass gainers pour le 3 kg, gainers protéinés pour le 6 kg — mais elles portent le même nom de produit. Vérifiez l’arôme affiché sur la fiche avant de commander : seul le 6 kg est référencé avec un arôme, Banane.</p>',
    faqs: [
      {
        question: 'Quels produits GSN sont vendus en Tunisie sur Protein.tn ?',
        answer:
          'Sept références : Pure Whey 2 kg, Nitro Whey 2 kg, Isolate Pro 2 kg, Creatine Monohydrate 200 g, Creatine Monohydrate 500 g, Big Mass Gainer 3 kg et Big Mass Gainer 6 kg. Le Big Mass Gainer 6 kg est le seul référencé avec un arôme, Banane. La grille de produits de cette page affiche l’état réel de chaque référence.',
      },
      {
        question: 'Quelle différence entre GSN Pure Whey, Nitro Whey et Isolate Pro ?',
        answer:
          'Pure Whey et Nitro Whey sont classées en whey protéine sur Protein.tn, Isolate Pro en whey isolate. Une whey isolate est plus filtrée qu’une whey classique et vise plus de protéines par portion pour moins de glucides et de lipides, généralement à un prix au kilo plus élevé. Les trois existent uniquement en 2 kg. Nos fiches GSN ne publient pas de valeurs nutritionnelles par portion : reportez-vous à l’étiquette du pot.',
      },
      {
        question: 'Faut-il prendre la créatine GSN en 200 g ou en 500 g ?',
        answer:
          'Les deux pots contiennent la même Creatine Monohydrate. À dose journalière identique, le 500 g couvre simplement une période plus longue. Comparez le prix affiché des deux formats sur cette page : rien ne les distingue sur le plan de la composition.',
      },
      {
        question: 'GSN Big Mass Gainer ou une whey GSN pour prendre du poids ?',
        answer:
          'Cela dépend de ce qui bloque. Si vous mangez assez de calories mais pas assez de protéines, une whey suffit. Si vous n’arrivez pas à atteindre votre apport calorique quotidien en mangeant, le Big Mass Gainer apporte en plus des glucides et des calories. Il existe en 3 kg et en 6 kg, deux contenances du même produit rangées dans deux rayons différents du site.',
      },
      {
        question: 'Quel est le prix des produits GSN en Tunisie ?',
        answer:
          'Le prix dépend du format et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence GSN vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander GSN en Tunisie ?',
        answer:
          'Choisissez le produit et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Whey protéines en poudre', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Le rayon whey isolate', url: '/whey-isolate' },
      { slug: 'creatine', name: 'Créatines disponibles en Tunisie', url: '/creatine' },
      { slug: 'mass-gainers', name: 'Mass gainers : tous les formats', url: '/mass-gainers' },
      { slug: 'brands', name: 'Comparer GSN aux autres marques', url: '/brands' },
    ],
  },

  'real-pharm': {
    metaTitle: 'Real Pharm Tunisie | Whey, Isolate, Créatine — Protein.tn',
    metaDescription:
      'Real Pharm en Tunisie : Real Whey 100, Real Isolate 1,8 kg, Real Casein et Real Mass 6,8 kg. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'Real Pharm Tunisie : Real Whey, Real Isolate et créatine',
    introHtml:
      '<p>La gamme <strong>Real Pharm en Tunisie</strong> est l’une des plus larges du catalogue et couvre quatre usages. Les protéines d’abord : <strong>Real Whey 100</strong> 2,250 kg (Chocolat), <strong>Real Isolate</strong> 1,8 kg (Vanille), <strong>Real Casein 100</strong> 700 g (Fraise) et <strong>Muscle On</strong> en 1 kg (Cookies) et 2,27 kg (Chocolat), une protéine multi-sources. Les calories ensuite : <strong>Real Mass</strong> 6,8 kg (Cookies) et <strong>Carbo One</strong> 1 kg (Watermelon), une poudre de glucides seule. Les poudres de performance : <strong>Creatine Monohydrate</strong> en 150 g, 300 g et 500 g, <strong>BCAA 8:1:1</strong> 400 g (Fraise), <strong>EAA</strong> 420 g (Ananas), <strong>Beta Alanine</strong> 300 g (Fruit Punch), <strong>Citrulline</strong> 200 g et <strong>CitruArgin</strong> 300 g (Fruit de la passion), plus deux pre-workouts, <strong>King Real</strong> 500 g (Watermelon) et <strong>Behemoth</strong> 500 g. Enfin les gélules et comprimés du quotidien : Collagen Marine 300 g, Vitamin D3 + K2, Vitamax Men, Zinc, ZMA, Biotyna, Tribulus, Ashwagandha et Omega 3-6-9.</p>',
    howToChooseTitle: 'Quel produit Real Pharm choisir ?',
    howToChooseBody:
      '<p>Sur la partie protéines, les trois références principales ne visent pas le même usage. <strong>Real Isolate</strong> est la plus concentrée : sur le format 1,8 kg en arôme Vanille, l’étiquette du fabricant transcrite sur notre fiche déclare une portion de 30 g apportant 25,8 g de protéines, 106 kcal, 0,3 g de glucides dont 0,3 g de sucres et 0,09 g de lipides, pour 60 portions par pot. Ces valeurs sont annoncées pour les arômes hors chocolat, et le produit contient du lait. <strong>Real Whey 100</strong> est la whey polyvalente, <strong>Real Casein 100</strong> une caséine à digestion plus lente que l’on place plutôt en dehors de l’entraînement, et <strong>Muscle On</strong> une protéine multi-sources, dont le format 1 kg est d’ailleurs classé en gainers protéinés sur le site.</p>' +
      '<p>Si le problème est calorique et non protéique, la logique change. <strong>Real Mass</strong> 6,8 kg en arôme Cookies déclare une portion de 75 g apportant 283 kcal, 51 g de glucides dont 7,5 g de sucres et 15 g de protéines, pour 90 portions par pot ; les ingrédients aromatiques varient selon la saveur du pot, donc vérifiez l’étiquette reçue. <strong>Carbo One</strong> 1 kg, à l’inverse, n’apporte que des glucides et sert à compléter un shake ou une séance, pas à remplacer une protéine. Côté performance, la <strong>créatine</strong> en 150 g, 300 g et 500 g est le même ingrédient dans trois contenances : c’est un arbitrage de durée et de budget. <strong>BCAA 8:1:1</strong> et <strong>EAA</strong> se prennent autour de l’entraînement en complément d’un apport protéique déjà couvert, et <strong>King Real</strong> comme <strong>Behemoth</strong> sont des pre-workouts en 500 g, à réserver aux séances où vous en avez réellement besoin. Reportez-vous à l’étiquette de chaque référence pour les doses, la caféine éventuelle et les allergènes.</p>',
    faqs: [
      {
        question: 'Combien de protéines dans une portion de Real Isolate 1,8 kg ?',
        answer:
          'Sur le format 1,8 kg en arôme Vanille, l’étiquette du fabricant transcrite sur notre fiche indique une portion de 30 g apportant 25,8 g de protéines, 106 kcal, 0,3 g de glucides dont 0,3 g de sucres et 0,09 g de lipides, soit 60 portions par pot. Ces valeurs sont données pour les arômes hors chocolat. Le produit contient du lait.',
      },
      {
        question: 'Quelle différence entre Real Whey 100, Real Isolate et Real Casein ?',
        answer:
          'Real Whey 100 est la whey polyvalente de la marque, proposée en 2,250 kg arôme Chocolat. Real Isolate est une whey isolate 1,8 kg, plus filtrée, qui vise plus de protéines par portion pour très peu de glucides et de lipides. Real Casein 100 est une caséine 700 g arôme Fraise, à digestion plus lente, que l’on place plutôt en dehors de la fenêtre d’entraînement.',
      },
      {
        question: 'Que contient une portion de Real Mass 6,8 kg ?',
        answer:
          'Sur le format 6,8 kg en arôme Cookies, l’étiquette indique une portion de 75 g apportant 283 kcal, 51 g de glucides dont 7,5 g de sucres et 15 g de protéines, soit 90 portions par pot. Les ingrédients aromatiques varient selon la saveur du pot, et le produit contient du lait.',
      },
      {
        question: 'Quels formats de créatine Real Pharm existent en Tunisie ?',
        answer:
          'Trois contenances de Creatine Monohydrate sont référencées : 150 g, 300 g et 500 g. Il s’agit du même ingrédient ; à dose journalière égale, seule la durée couverte par le pot change. Le choix se fait donc sur le prix affiché et sur la durée que vous voulez couvrir.',
      },
      {
        question: 'Real Pharm propose-t-il un pre-workout ?',
        answer:
          'Oui, deux références en 500 g : King Real Preworkout, référencé en arôme Watermelon, et Behemoth Preworkout. Ce sont des poudres à prendre avant la séance. Vérifiez la teneur en caféine sur l’étiquette et évitez de les cumuler avec d’autres sources de caféine dans la journée.',
      },
      {
        question: 'Comment commander Real Pharm en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-isolate', name: 'Isolats de whey en Tunisie', url: '/whey-isolate' },
      { slug: 'whey-proteine', name: 'Découvrir le rayon whey', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Comparer les formats de créatine', url: '/creatine' },
      { slug: 'pre-workout', name: 'Le rayon pré-workout', url: '/pre-workout' },
      { slug: 'bcaa', name: 'Le rayon BCAA', url: '/bcaa' },
      { slug: 'brands', name: 'Comparer Real Pharm aux autres marques', url: '/brands' },
    ],
  },

  'ultimate-nutrition': {
    metaTitle: 'Ultimate Nutrition Tunisie | Prostar & ISO Sensation 93',
    metaDescription:
      'Ultimate Nutrition en Tunisie : Prostar 100% Whey 907 g et 2,4 kg, ISO Sensation 93 en 910 g, Prostar Casein, créatine 300 g, glutamine 400 g et Oméga 3.',
    h1: 'Ultimate Nutrition Tunisie : Prostar et ISO Sensation 93',
    introHtml:
      '<p>La gamme <strong>Ultimate Nutrition en Tunisie</strong> se lit en trois blocs. Les protéines en poudre : <strong>Prostar 100% Whey</strong> en 907 g (Vanille) et en 2,4 kg (Cookies, Double chocolat), <strong>ISO Sensation 93</strong> en 910 g (Cookies, Chocolat) et en 2,27 kg (Chocolate Fudge), et <strong>Prostar 100% Casein</strong> 907 g (Chocolat). Les poudres et gélules de performance : <strong>Creatine Monohydrate</strong> 300 g, <strong>L-Glutamine Gluta Pure</strong> 400 g et <strong>Arginine &amp; Pyroglutamate &amp; Lysine</strong> 100 gélules. Enfin les compléments du quotidien : <strong>Omega 3</strong> 90 softgels, <strong>Pure CLA 1000</strong> 90 softgels, <strong>Tribulus Bulgarian</strong> 90 gélules et <strong>L-Carnitine 2000</strong> en flacon de 355 ml, la seule forme liquide de la sélection.</p>',
    howToChooseTitle: 'Quelle protéine Ultimate Nutrition choisir ?',
    howToChooseBody:
      '<p>Le choix se joue d’abord entre <strong>Prostar 100% Whey</strong> et <strong>ISO Sensation 93</strong>. Prostar est rangée en whey protéine sur le site : c’est la référence polyvalente, celle qui complète l’apport quotidien en protéines quand l’alimentation seule n’y suffit pas, et elle existe en deux contenances, 907 g et 2,4 kg. ISO Sensation 93 est rangée en whey isolate, une famille davantage filtrée qui vise plus de protéines par portion pour moins de glucides et de lipides, en général à un prix au kilo supérieur ; elle existe en 910 g et 2,27 kg. <strong>Prostar 100% Casein</strong> ne remplace ni l’une ni l’autre : une caséine se digère plus lentement et se place plutôt en dehors de la fenêtre d’entraînement. Nos fiches Ultimate Nutrition ne publient pas de tableau de valeurs nutritionnelles, donc aucune valeur par portion n’est avancée ici — l’étiquette du pot reçu fait foi, d’autant que le même produit déclare des valeurs différentes d’un arôme à l’autre.</p>' +
      '<p>Les arômes disponibles diffèrent d’un format à l’autre, ce qui est souvent le vrai critère : Prostar est référencée en Vanille sur le 907 g, en Cookies et Double chocolat sur le 2,4 kg ; ISO Sensation 93 en Cookies et Chocolat sur le 910 g, en Chocolate Fudge sur le 2,27 kg. Vérifiez donc l’arôme sur la fiche avant de choisir la contenance. Sur le reste de la gamme, <strong>Creatine Monohydrate</strong> 300 g et <strong>L-Glutamine Gluta Pure</strong> 400 g sont des poudres à dose simple qui se prennent en complément d’une protéine, pas à sa place. <strong>Pure CLA 1000</strong>, <strong>Omega 3</strong>, <strong>Tribulus Bulgarian</strong> et <strong>L-Carnitine 2000</strong> relèvent d’un usage quotidien en gélules ou en liquide et non de la performance à l’entraînement ; reportez-vous à l’étiquette de chaque flacon pour les doses et les allergènes.</p>',
    faqs: [
      {
        question: 'Quelle différence entre Prostar 100% Whey et ISO Sensation 93 ?',
        answer:
          'Prostar 100% Whey est classée en whey protéine sur Protein.tn et ISO Sensation 93 en whey isolate. Une whey isolate est plus filtrée et vise davantage de protéines par portion pour moins de glucides et de lipides, généralement à un prix au kilo plus élevé. Prostar existe en 907 g et 2,4 kg, ISO Sensation 93 en 910 g et 2,27 kg.',
      },
      {
        question: 'Quels arômes Ultimate Nutrition sont référencés en Tunisie ?',
        answer:
          'Prostar 100% Whey est référencée en Vanille sur le format 907 g, et en Cookies et Double chocolat sur le 2,4 kg. ISO Sensation 93 est référencée en Cookies et Chocolat sur le 910 g, et en Chocolate Fudge sur le 2,27 kg. Prostar 100% Casein 907 g est référencée en Chocolat. Les arômes réellement disponibles s’affichent sur chaque fiche produit.',
      },
      {
        question: 'À quoi sert Prostar 100% Casein par rapport à une whey ?',
        answer:
          'La caséine se digère plus lentement que la whey. Elle sert donc plutôt à couvrir un intervalle long sans apport protéique, par exemple en fin de journée, alors qu’une whey est habituellement placée autour de l’entraînement. Elle ne remplace pas une whey : les deux couvrent des moments différents de la journée.',
      },
      {
        question: 'Quels autres produits Ultimate Nutrition trouve-t-on sur Protein.tn ?',
        answer:
          'En dehors des protéines : Creatine Monohydrate 300 g, L-Glutamine Gluta Pure 400 g, Arginine & Pyroglutamate & Lysine 100 gélules, Omega 3 90 softgels, Pure CLA 1000 90 softgels, Tribulus Bulgarian 90 gélules et L-Carnitine 2000 en flacon liquide de 355 ml.',
      },
      {
        question: 'Quel est le prix des produits Ultimate Nutrition en Tunisie ?',
        answer:
          'Le prix dépend du format, de l’arôme et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence Ultimate Nutrition vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander Ultimate Nutrition en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Whey protéines, toutes marques', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Voir les whey isolate disponibles', url: '/whey-isolate' },
      { slug: 'caseine', name: 'Caséine en Tunisie', url: '/caseine' },
      { slug: 'creatine', name: 'Voir nos créatines disponibles', url: '/creatine' },
      { slug: 'glutamine', name: 'Le rayon glutamine', url: '/glutamine' },
      { slug: 'brands', name: 'Comparer Ultimate Nutrition aux autres marques', url: '/brands' },
    ],
  },

  /**
   * WeightWorld — the brand page with the widest gap between what it ranks for and what its
   * title says, measured in Search Console (last 3 months, Web):
   *
   *     /weightworld                    432 impr,  43 clicks,  9.95%,  pos 6.3
   *     "weightworld tunisie"           346 impr,  39 clicks, 11.27%,  pos 6.5
   *     "omega 3 weightworld"           109 impr,   0 clicks,  0.00%,  pos 8.8
   *     "weightworld omega 3"           100 impr,   0 clicks,  0.00%,  pos 8.9
   *     "weightworld omega 3 tunisie"    94 impr,   6 clicks,  6.38%,  pos 7.1
   *     "zinc weightworld"               72 impr,   0 clicks,  0.00%,  pos 9.4
   *     "magnesium bisglycinate ww"      56 impr,   1 click,   1.79%,  pos 6.7
   *     "weightworld magnesium glycinate"52 impr,   0 clicks,  0.00%,  pos 9.5
   *
   * Fifteen WeightWorld-named queries carry ~1,127 impressions at positions 4.6–9.5 and return
   * 50 clicks between them. Without an entry here the page falls through to buildBrandMetaTitle's
   * generic string and served, verbatim, on 08/09/2026:
   *
   *     title  weightworld — Protéines & Compléments en Tunisie | Protéine Tunisie
   *     desc   Découvrez tous les produits weightworld en Tunisie : qualité premium,
   *            produits 100% authentiques, livraison rapide.
   *
   * Two things wrong with that at once. The brand name is lower-cased because it comes straight
   * from `brand.designation_fr`, and the title promises "Protéines" — which WeightWorld does not
   * sell here. The six references on /weightworld are a fish oil, a magnesium, a zinc, a
   * vitamin D3+K2, a multivitamin and an ashwagandha. The searcher typing "omega 3 weightworld"
   * is shown a line about protein powder, and 0 of 109 click.
   *
   * ── DATA FLOOR ───────────────────────────────────────────────────────────────────────────────
   * Like GSN, Ultimate Nutrition and C4 above, every WeightWorld SKU returns no transcribed
   * label: /product_details for the fish oil, the magnesium and the zinc all carry a Product
   * schema with price and availability and no `nutrition_values`. So NO per-portion figure — no
   * EPA/DHA split, no elemental magnesium — is quoted anywhere below. Family, format and unit
   * count are read off the product grid this page renders, and the copy says the pot's own label
   * is the reference.
   */
  weightworld: {
    metaTitle: 'WeightWorld Tunisie | Omega 3, Magnésium & Zinc — Protein.tn',
    metaDescription:
      'WeightWorld en Tunisie : omega 3 fish oil 240 softgels, magnésium bisglycinate + B6, zinc bisglycinate 400 comprimés et vitamine D3 + K2. Livraison 24–72h.',
    h1: 'WeightWorld en Tunisie : oméga 3, magnésium, zinc et vitamines',
    introHtml:
      '<p><strong>WeightWorld en Tunisie</strong> est une gamme de micronutriments, pas de protéines en poudre. Six références sont référencées sur Protein.tn : <strong>Omega 3 Fish Oil</strong> en 240 capsules molles, <strong>Magnesium Bisglycinate + Vitamine B6</strong> dosé à 1422 mg par prise annoncée sur l’étiquette, <strong>Zinc Bisglycinate</strong> en 400 comprimés, <strong>Vegan Vitamin D3 + K2</strong> en 365 comprimés, <strong>Multivitamines et Minéraux</strong> en 400 comprimés et <strong>Ashwagandha KSM-66</strong> en 180 comprimés à 1500 mg. Les grands conditionnements — 240, 365, 400 comprimés — correspondent à des cures longues plutôt qu’à un essai. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>',
    howToChooseTitle: 'Quel produit WeightWorld choisir ?',
    howToChooseBody:
      '<p>Le choix se fait par besoin, pas par gamme. L’<strong>Omega 3 Fish Oil</strong> (240 softgels) est une huile de poisson en capsule molle, à prendre au cours d’un repas ; c’est la référence la plus recherchée de la marque en Tunisie. Le <strong>Magnesium Bisglycinate + Vitamine B6</strong> retient une forme chélatée, généralement choisie pour sa tolérance digestive par rapport à l’oxyde ; le <strong>Zinc Bisglycinate</strong> (400 comprimés) suit la même logique de forme.</p>' +
      '<p>La <strong>Vegan Vitamin D3 + K2</strong> associe les deux vitamines dans un même comprimé et convient à un régime végétalien, ce que ne permet pas une D3 d’origine lanoline. Les <strong>Multivitamines et Minéraux</strong> (400 comprimés) couvrent un socle large plutôt qu’un besoin isolé : elles font double emploi avec un zinc ou une D3 pris à côté, donc l’un ou l’autre. L’<strong>Ashwagandha KSM-66</strong> (180 comprimés, 1500 mg) sort du champ des minéraux et se choisit indépendamment. Vérifiez toujours l’étiquette du format retenu : les valeurs déclarées y figurent référence par référence.</p>',
    faqs: [
      {
        question: 'Quels produits WeightWorld sont disponibles en Tunisie ?',
        answer:
          'Protein.tn référence six produits WeightWorld : Omega 3 Fish Oil 240 softgels, Magnesium Bisglycinate + Vitamine B6 1422 mg, Zinc Bisglycinate 400 comprimés, Vegan Vitamin D3 + K2 365 comprimés, Multivitamines et Minéraux 400 comprimés et Ashwagandha KSM-66 180 comprimés. La grille de produits de cette page indique les références effectivement proposées.',
      },
      {
        question: 'WeightWorld vend-il de la whey ou des protéines en poudre ?',
        answer:
          'Non. La gamme WeightWorld référencée sur Protein.tn ne contient aucune protéine en poudre : ce sont des vitamines, des minéraux, une huile de poisson et une plante. Pour une whey ou un gainer, passez par les catégories protéines du site.',
      },
      {
        question: 'Quelle est la différence entre le magnésium bisglycinate et les autres formes ?',
        answer:
          'Le bisglycinate est une forme chélatée, c’est-à-dire liée à la glycine. C’est le critère sur lequel se joue le choix entre les magnésiums de notre catalogue — bisglycinate, glycinate, citrate ou L-thréonate — davantage que la marque. La quantité de magnésium apportée par comprimé figure sur l’étiquette de chaque référence.',
      },
      {
        question: 'Quel est le prix des produits WeightWorld en Tunisie ?',
        answer:
          'Le prix dépend du produit, du format et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence WeightWorld vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander WeightWorld en Tunisie ?',
        answer:
          'Choisissez le produit et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'omega-3', name: 'Oméga 3 en Tunisie', url: '/omega-3' },
      { slug: 'magnesium', name: 'Magnésium en Tunisie', url: '/magnesium' },
      { slug: 'zinc', name: 'Zinc en Tunisie', url: '/zinc' },
      { slug: 'vitamines', name: 'Comparer les vitamines', url: '/vitamines' },
      { slug: 'brands', name: 'Comparer WeightWorld aux autres marques', url: '/brands' },
    ],
  },

  'c4-cellucor': {
    metaTitle: 'C4 / Cellucor Tunisie | Pre-Workout, C4 Whey & Créatine',
    metaDescription:
      'C4 / Cellucor en Tunisie : C4 Original et C4 Ripped Sport, C4 Whey Protein en six versions. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'C4 / Cellucor Tunisie : pre-workout, whey et créatine',
    introHtml:
      '<p>La gamme <strong>C4 / Cellucor en Tunisie</strong> compte dix-sept références organisées en quatre familles. Les pre-workouts : <strong>C4 Original</strong> 246 g (Grape Popsicle) et <strong>C4 Ripped Sport</strong> en 213 g (Fruit Punch) et 210 g (Arctic Snow Cone). Les protéines : <strong>C4 Whey Protein</strong> en six versions — Vanilla Bean en 966 g et 2,28 kg, Hershey’s Milk Chocolate en 1,01 kg et 2,38 kg, Reese’s Peanut Butter &amp; Chocolate en 1,13 kg et 2,65 kg. La créatine : <strong>COR-Performance Creatine</strong> en cinq arômes, Jolly Rancher Green Apple 316 g, Jolly Rancher Cherry 321 g, Watermelon 315 g, Blue Raspberry 315 g et Fruit Punch 325 g. Enfin trois produits en gélules : <strong>Max Test</strong> 120 gélules, <strong>Super Shred</strong> et <strong>Super Thermo Stim-Free</strong> en 60 gélules chacun.</p>',
    howToChooseTitle: 'Quel produit C4 / Cellucor choisir ?',
    howToChooseBody:
      '<p>C’est le pre-workout qui fait connaître la marque, et le catalogue en propose deux. <strong>C4 Original</strong> 246 g est la version historique, référencée ici en arôme Grape Popsicle. <strong>C4 Ripped Sport</strong>, en 213 g et 210 g, est une formule distincte présentée sous un autre nom par le fabricant ; elle est proposée en Fruit Punch et Arctic Snow Cone. Ces poudres contiennent de la caféine : lisez l’étiquette du pot reçu pour la dose exacte, évitez de les cumuler avec d’autres sources de caféine dans la même journée, et ne les prenez pas trop tard si vous êtes sensible au sommeil. Aucune valeur par portion n’est publiée sur nos fiches C4 / Cellucor, donc aucun chiffre n’est avancé ici.</p>' +
      '<p>Le reste de la gamme couvre des besoins différents. <strong>C4 Whey Protein</strong> est une whey protéine classique : chacun de ses trois arômes existe en un petit et un grand format, ce qui permet de tester une saveur sur environ 1 kg avant de passer au pot de 2,28 à 2,65 kg. Le choix se fait donc sur l’arôme puis sur la contenance, et non sur la formule. <strong>COR-Performance Creatine</strong> est la créatine aromatisée de la marque, déclinée en cinq saveurs pour des pots de 315 à 325 g ; c’est le même produit d’un arôme à l’autre, le poids net variant simplement avec le système d’arôme. Les trois références en gélules — <strong>Max Test</strong>, classée en boosters hormonaux sur le site, <strong>Super Shred</strong> et <strong>Super Thermo Stim-Free</strong>, classées en brûleurs de graisse — relèvent d’un usage ponctuel et encadré : lisez la posologie du fabricant et demandez un avis médical en cas de traitement en cours.</p>',
    faqs: [
      {
        question: 'Quels pre-workouts C4 sont disponibles en Tunisie ?',
        answer:
          'Deux formules. C4 Original en 246 g, référencé en arôme Grape Popsicle, et C4 Ripped Sport en 213 g arôme Fruit Punch et en 210 g arôme Arctic Snow Cone. Les deux sont des poudres à prendre avant la séance et contiennent de la caféine : la dose exacte figure sur l’étiquette du pot.',
      },
      {
        question: 'En quels formats et arômes existe C4 Whey Protein ?',
        answer:
          'En six versions : Vanilla Bean en 966 g et 2,28 kg, Hershey’s Milk Chocolate en 1,01 kg et 2,38 kg, Reese’s Peanut Butter & Chocolate en 1,13 kg et 2,65 kg. Chaque arôme existe donc en un petit et un grand format, ce qui permet d’essayer une saveur avant de prendre le grand pot.',
      },
      {
        question: 'Combien d’arômes pour la COR-Performance Creatine ?',
        answer:
          'Cinq : Jolly Rancher Green Apple 316 g, Jolly Rancher Cherry 321 g, Watermelon 315 g, Blue Raspberry 315 g et Fruit Punch 325 g. Il s’agit de la même créatine aromatisée ; le poids net varie légèrement d’un arôme à l’autre parce que le système d’arôme change, pas la dose de créatine par mesure.',
      },
      {
        question: 'Faut-il un pre-workout C4 ou une créatine COR-Performance ?',
        answer:
          'Les deux ne servent pas au même moment. Un pre-workout se prend avant la séance et contient notamment de la caféine ; la créatine se prend tous les jours, séance ou non, et ne dépend pas de l’horaire. Les deux peuvent se cumuler, mais la créatine est le complément le plus étudié des deux et ne pose pas de question de tolérance à la caféine.',
      },
      {
        question: 'Quel est le prix des produits C4 / Cellucor en Tunisie ?',
        answer:
          'Le prix dépend du produit, du format, de l’arôme et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence C4 / Cellucor vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander C4 / Cellucor en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'pre-workout', name: 'Voir tous les pré-workouts', url: '/pre-workout' },
      { slug: 'whey-proteine', name: 'Autres whey protéines du catalogue', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Créatines aromatisées et neutres', url: '/creatine' },
      { slug: 'bruleurs-de-graisse', name: 'Brûleurs de graisse en Tunisie', url: '/bruleurs-de-graisse' },
      { slug: 'brands', name: 'Comparer C4 / Cellucor aux autres marques', url: '/brands' },
    ],
  },

  /**
   * ── BATCH OF 09/09/2026: THE FIVE BARE BRAND PAGES THAT HAVE MEASURED DEMAND ────────────────
   *
   * Search Console (repo exports, Web, last 3 months) for the brand pages that still had no
   * entry, i.e. still served buildBrandMetaTitle's generic "<brand> — Protéines & Compléments en
   * Tunisie | Protéine Tunisie":
   *
   *     /proactive              121 impr,  4 clicks,  3.31%,  pos 13.4
   *     /big-ramy-labs          118 impr,  2 clicks,  1.69%,  pos 11.7
   *     /william-bonac           62 impr,  1 click,   1.61%,  pos  6.6
   *     /victor-martinez         54 impr,  0 clicks,     —,   pos 11.0
   *     /challenger-nutrition    49 impr,  0 clicks,  0.00%,  pos 10.0
   *
   * /challenger-nutrition (already at position 10 and converting nothing) and /william-bonac
   * (position 6.6) are the two where only the SERP line is failing — the rank is already there.
   *
   * ── DATA FLOOR, BRAND BY BRAND ───────────────────────────────────────────────────────────────
   * Family, format, net weight, arôme and unit count below are read off
   * /api/productsByBrandId/{29,54,59,55,12} on 09/09/2026 — the same rows the product grid on
   * each page renders. Per-portion figures are quoted ONLY where /api/product_details/{slug}
   * returns a populated `nutrition_facts.rows`, and each one is tied to the exact format AND
   * arôme it was transcribed for, because the same product declares different values per arôme:
   *
   *     /product_details/anabolic-whey-80-2-25kg-proactive     35 g → 25 g prot + 5 g créatine
   *     /product_details/big-whey-2kg-big-ramy-labs            34 g → 24 g prot (Cookies)
   *     /product_details/whey-iso-regime-2kg-william-bonac     30 g → 26 g prot (Vanilla)
   *     /product_details/whey-regime-2kg-william-bonac         30 g → 25 g prot (Vanilla)
   *     /product_details/whey-ultimate-2kg-william-bonac       30 g → 23 g prot (Chocolat)
   *     /product_details/100-whey-protein-2-27kg-challenger…   34 g → 24 g prot (Chocolat)
   *
   * Everything else returns `nutrition_facts: null` or `rows: []`, so no gram figure is stated
   * for it anywhere below and the copy says the pot's own label is the reference. That is true of
   * ALL FIVE Victor Martinez SKUs, so that entry quotes no per-portion number at all — as with
   * GSN, Ultimate Nutrition and C4 above, that is the honest outcome, not a gap to fill.
   *
   * The Challenger whey figures carry one extra caveat worth recording: its `serving_note` says
   * the row came from the packaging column of the product's Open Food Facts page, not from a
   * team transcription of a pot in the warehouse, and the same block's `claims` field holds three
   * paragraphs of reseller marketing. The numeric packaging column is quoted; not one word of
   * `claims` is, because it is exactly the kind of health claim this file forbids.
   *
   * ── SKIPPED, WITH REASONS (as of 09/09/2026 — two were reversed on 23/09) ───────────────────
   * Five of the ten bare pages got no entry that day. All five had no measured demand in the
   * exports, and each also failed on the catalogue. Two of the five — /olimp-sport-nutrition and
   * /mr-x-v-shape-supps — were written on 23/09/2026 all the same and have entries at the bottom
   * of this file; the reasons below are why they waited, not why they are still missing. Their
   * stock state is unchanged, re-read 23/09/2026: Olimp is still 5 SKUs with all 5 `rupture:
   * true`, MR.X still 8 SKUs with 6 `rupture: true`, so neither entry states availability.
   *
   *   /monster              NO BRAND ROW. All 582 rows of /all_brands were searched for the
   *                         substring "monster" on 09/09/2026: zero hits. The slug resolves to no
   *                         brand, so an entry here would be dead config — the same reason
   *                         american-wolf and impact-sport-nutrition are absent (see header).
   *   /myprotein            brand 28 exists, `products_meta.total` = 0. The page renders an empty
   *                         grid; copy describing a catalogue would describe nothing.
   *   /activlab             brand 32 returns exactly 1 SKU, and that SKU is
   *                         "VITAMIN C 1000 MG 90 TABS - GYMBEAM" — a GymBeam product filed under
   *                         ACTIVLAB, out of stock. The single product on the page is not even the
   *                         brand's. This is a catalogue defect to fix in the admin, not a page to
   *                         write copy for.
   *   /olimp-sport-nutrition  5 SKUs, all 5 `rupture: true`.
   *   /mr-x-v-shape-supps     8 SKUs, 6 of them `rupture: true`, and the brand row itself is
   *                         "MR.X  V-Shape Supps" (double space) while the SKUs split across two
   *                         names, "MR.X" and "V-Shape Supps" — the brand identity a title would
   *                         have to lead with is not settled in the data.
   *
   * /proactive is the borderline case that WAS written: only 2 SKUs, which is thinner than the
   * 3-SKU /applied-nutrition skipped on 08/09/2026. The difference is that honest copy here needs
   * no health claim — the catalogue is one whey and one pack — and that whey is the only SKU in
   * this whole batch with BOTH a transcribed label and a specific fact worth a title (25 g of
   * protéines and 5 g de créatine in the same 35 g portion). The entry says in its first sentence
   * that the range is two references, rather than implying a gamme that does not exist.
   */
  proactive: {
    metaTitle: 'ProActive Tunisie | Anabolic Whey 80 2,25 kg — Protein.tn',
    metaDescription:
      'ProActive en Tunisie : Anabolic Whey 80 2,25 kg, une whey qui déclare 25 g de protéines et 5 g de créatine par portion, arôme Double chocolat. Livraison 24–72h.',
    h1: 'ProActive Tunisie : Anabolic Whey 80, whey et créatine dans le même pot',
    introHtml:
      '<p><strong>ProActive en Tunisie</strong> tient en deux références sur Protein.tn, et autant le dire d’emblée plutôt que de laisser croire à une gamme complète : la whey <strong>Anabolic Whey 80</strong> en 2,25 kg, référencée en arôme Double chocolat et rangée en whey protéine, et le <strong>Pack Sèche Extrême</strong>, un pack rangé en protéines multi-sources. Il n’y a pas de créatine vendue seule, pas de gainer et pas d’acides aminés ProActive au catalogue. La grille ci-dessus affiche le prix et la disponibilité de ces deux références.</p>',
    howToChooseTitle: 'Anabolic Whey 80 : ce que déclare l’étiquette',
    howToChooseBody:
      '<p><strong>Anabolic Whey 80</strong> n’est pas une whey ordinaire, et c’est le seul point qui compte vraiment pour choisir. Sur le format 2,25 kg en arôme Double chocolat, l’étiquette transcrite sur notre fiche produit déclare une portion de 35 g apportant <strong>25 g de protéines et 5 g de créatine monohydrate</strong>, avec 64 portions annoncées pour le pot. C’est donc une poudre à la fois protéinée et créatinée : elle occupe la place d’une whey dans la journée tout en apportant une créatine que vous n’avez pas à acheter à côté. Si vous prenez déjà une créatine par ailleurs, ces 5 g entrent dans votre total quotidien et doivent y être comptés.</p>' +
      '<p>Le <strong>Pack Sèche Extrême</strong> est l’autre entrée de cette page. C’est un pack, c’est-à-dire un regroupement de plusieurs produits en une seule commande, classé en protéines multi-sources ; sa composition exacte est détaillée sur sa propre fiche et aucune valeur nutritionnelle par portion n’y est publiée. Avec deux références seulement, la marque ne se compare pas sur l’étendue de sa gamme : regardez la catégorie whey protéine dans son ensemble et laissez l’étiquette du pot que vous recevez trancher, car les valeurs déclarées changent d’un arôme et d’un format à l’autre.</p>',
    faqs: [
      {
        question: 'Quels produits ProActive sont vendus en Tunisie ?',
        answer:
          'Deux références sur Protein.tn : Anabolic Whey 80 en 2,25 kg, arôme Double chocolat, classée en whey protéine, et le Pack Sèche Extrême, classé en protéines multi-sources. La grille de produits de cette page indique celles qui sont effectivement proposées.',
      },
      {
        question: 'Combien de protéines dans une portion d’Anabolic Whey 80 ?',
        answer:
          'Sur le format 2,25 kg en arôme Double chocolat, l’étiquette transcrite sur notre fiche produit indique une portion de 35 g apportant 25 g de protéines et 5 g de créatine monohydrate, pour 64 portions annoncées par pot. Ces valeurs valent pour cet arôme et ce format : l’étiquette de la référence que vous recevez fait foi.',
      },
      {
        question: 'Pourquoi Anabolic Whey 80 contient-elle de la créatine ?',
        answer:
          'Parce que la formule associe les deux dans la même poudre : la portion de 35 g déclare 25 g de protéines et 5 g de créatine monohydrate. L’intérêt pratique est de ne pas avoir à doser deux produits. La conséquence à retenir est arithmétique : si vous ajoutez une créatine séparée, comptez ces 5 g dans votre apport quotidien total.',
      },
      {
        question: 'En quel format et quel arôme Anabolic Whey 80 est-elle référencée ?',
        answer:
          'En un seul format, 2,25 kg, et un seul arôme référencé, Double chocolat. ProActive ne décline pas cette whey en petit pot sur Protein.tn, donc il n’y a pas d’arbitrage de contenance à faire ici.',
      },
      {
        question: 'Comment commander ProActive en Tunisie ?',
        answer:
          'Choisissez la référence disponible, ajoutez-la au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Comparer avec les autres whey', url: '/whey-proteine' },
      { slug: 'proteines-multi-sources', name: 'Protéines multi-sources', url: '/proteines-multi-sources' },
      { slug: 'creatine', name: 'Créatines vendues seules', url: '/creatine' },
      { slug: 'brands', name: 'Comparer ProActive aux autres marques', url: '/brands' },
    ],
  },

  'big-ramy-labs': {
    metaTitle: 'Big Ramy Labs Tunisie | Big Whey, Iso Big & Beef Mass',
    metaDescription:
      'Big Ramy Labs en Tunisie : Big Whey 2 kg, Iso Big 2,1 kg, All In Isolate 2,04 kg, Beef Mass Plus 2,7 kg, Carbo Big 1,5 kg, Red Rex Glutamine et créatine 300 g.',
    h1: 'Big Ramy Labs Tunisie : Big Whey, Iso Big et protéine de bœuf',
    introHtml:
      '<p>La gamme <strong>Big Ramy Labs en Tunisie</strong> compte neuf références réparties sur cinq rayons. Les poudres de lactosérum d’abord : <strong>Big Whey</strong> 2 kg (arôme Cookies), classée en whey protéine, puis <strong>Iso Big</strong> 2,1 kg (arôme Chocolat) et <strong>All In Isolate</strong> 2,04 kg, toutes deux classées en whey isolate. La marque est ensuite l’une des rares du catalogue à proposer de la <strong>protéine de bœuf</strong>, avec <strong>Beef Mass Plus</strong> 2,7 kg et <strong>Beef Mass Gainer</strong> 4,9 kg, le plus grand format de la gamme. Viennent enfin trois poudres à dose simple — <strong>Red Rex Glutamine</strong> 300 g, <strong>BCAA</strong> 300 g et <strong>Creatine</strong> 300 g — et <strong>Carbo Big</strong> 1,5 kg, une poudre de glucides seule. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>',
    howToChooseTitle: 'Quel produit Big Ramy Labs choisir ?',
    howToChooseBody:
      '<p>Le premier tri se fait entre les trois poudres de lactosérum, et il porte sur le rayon dans lequel elles sont classées. <strong>Big Whey</strong> 2 kg est la référence polyvalente, celle qui complète l’apport quotidien en protéines quand l’alimentation seule n’y suffit pas : sur l’arôme Cookies, l’étiquette transcrite sur notre fiche déclare une portion de 34 g apportant 24 g de protéines, 5 g de glucides, 1,5 g de matières grasses et 130 kcal. <strong>Iso Big</strong> 2,1 kg et <strong>All In Isolate</strong> 2,04 kg sont classées en whey isolate, une famille davantage filtrée qui vise plus de protéines par portion pour moins de glucides et de lipides, en général à un prix au kilo supérieur. Nos fiches ne publient pas de tableau de valeurs pour ces deux isolats : aucun chiffre n’est donc avancé ici pour eux, et l’étiquette du pot reçu reste la seule référence — d’autant que le même produit déclare des valeurs différentes d’un arôme à l’autre.</p>' +
      '<p>La <strong>protéine de bœuf</strong> est ce qui distingue réellement Big Ramy Labs sur ce catalogue. <strong>Beef Mass Plus</strong> 2,7 kg et <strong>Beef Mass Gainer</strong> 4,9 kg sont rangés dans ce rayon et non parmi les whey : la source de protéines y est bovine et non laitière, ce qui est le vrai critère quand vous voulez changer de source plutôt que de marque. <strong>Carbo Big</strong> 1,5 kg répond à l’inverse à une question calorique et non protéique : c’est une poudre de glucides seule, qui complète un shake ou une séance et ne remplace aucune protéine. Restent les trois pots de 300 g — <strong>Red Rex Glutamine</strong>, <strong>BCAA</strong> et <strong>Creatine</strong> — qui se prennent en complément d’un apport protéique déjà couvert, jamais à sa place. Aucune fiche Big Ramy Labs autre que celle de Big Whey ne publie de valeurs par portion ; reportez-vous à l’étiquette pour les doses et les allergènes.</p>',
    faqs: [
      {
        question: 'Quels produits Big Ramy Labs sont vendus en Tunisie ?',
        answer:
          'Neuf références sur Protein.tn : Big Whey 2 kg, Iso Big 2,1 kg, All In Isolate 2,04 kg, Beef Mass Plus 2,7 kg, Beef Mass Gainer 4,9 kg, Carbo Big 1,5 kg, Red Rex Glutamine 300 g, BCAA 300 g et Creatine 300 g. La grille de produits de cette page affiche l’état réel de chacune.',
      },
      {
        question: 'Combien de protéines dans une portion de Big Whey 2 kg ?',
        answer:
          'Sur l’arôme Cookies, l’étiquette transcrite sur notre fiche produit indique une portion de 34 g apportant 24 g de protéines, 5 g de glucides, 1,5 g de matières grasses et 130 kcal. Ces valeurs valent pour cet arôme : celles de la référence que vous recevez sont imprimées sur son pot.',
      },
      {
        question: 'Quelle différence entre Big Whey, Iso Big et All In Isolate ?',
        answer:
          'Big Whey 2 kg est classée en whey protéine sur Protein.tn ; Iso Big 2,1 kg et All In Isolate 2,04 kg sont classées en whey isolate. Une whey isolate est plus filtrée qu’une whey classique et vise davantage de protéines par portion pour moins de glucides et de lipides, généralement à un prix au kilo plus élevé. Nos fiches Iso Big et All In Isolate ne publient pas de valeurs par portion : l’étiquette du pot fait foi.',
      },
      {
        question: 'Qu’apporte la protéine de bœuf Big Ramy Labs par rapport à une whey ?',
        answer:
          'Beef Mass Plus 2,7 kg et Beef Mass Gainer 4,9 kg sont classés en protéine de bœuf, un rayon distinct des whey : la source de protéines y est bovine et non laitière. C’est le critère sur lequel se joue ce choix. Nos fiches de ces deux références ne publient pas de valeurs par portion, donc comparez les étiquettes des pots.',
      },
      {
        question: 'À quoi sert Carbo Big 1,5 kg ?',
        answer:
          'Carbo Big est une poudre de glucides de 1,5 kg, sans protéines. Elle sert à augmenter l’apport calorique autour de l’entraînement ou à compléter un shake protéiné. Si vous cherchez protéines et glucides dans un seul produit, un gainer complet répond mieux qu’une poudre de glucides seule.',
      },
      {
        question: 'Comment commander Big Ramy Labs en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Whey protéines de toutes les marques', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Whey isolate : tous les formats', url: '/whey-isolate' },
      { slug: 'proteine-de-boeuf', name: 'Protéine de bœuf en Tunisie', url: '/proteine-de-boeuf' },
      { slug: 'creatine', name: 'Toutes nos créatines', url: '/creatine' },
      { slug: 'glutamine', name: 'Comparer les glutamines', url: '/glutamine' },
      { slug: 'brands', name: 'Comparer Big Ramy Labs aux autres marques', url: '/brands' },
    ],
  },

  'william-bonac': {
    metaTitle: 'William Bonac Tunisie | Whey Regime & Iso Hydro Zero',
    metaDescription:
      'William Bonac en Tunisie : Whey Regime 2 kg, Whey Iso Regime 2 kg, Whey Ultimate 2 kg, Iso Hydro Zero 1,8 kg et Clear Beef 1,8 kg. Formats et arômes affichés.',
    h1: 'William Bonac Tunisie : Whey Regime, Whey Ultimate et Iso Hydro Zero',
    introHtml:
      '<p>La gamme <strong>William Bonac en Tunisie</strong> est entièrement construite autour des protéines, sans créatine, sans acides aminés et sans vitamines. Six références sont proposées : <strong>Whey Regime</strong> 2 kg (arôme Vanilla) et <strong>Whey Ultimate</strong> 2 kg (arôme Chocolat), classées en whey protéine ; <strong>Whey Iso Regime</strong> 2 kg (arôme Vanilla), classée en whey isolate ; <strong>Iso Hydro Zero</strong> 1,8 kg (arôme Chocolat), la seule whey hydrolysée de la marque ; <strong>Clear Beef</strong> 1,8 kg (arôme PinaColada), classée en protéine de bœuf ; et le <strong>Pack Ultimate Muscle</strong>, un pack. Toutes les poudres sont vendues en 2 kg ou 1,8 kg : le choix ne porte donc pas sur la contenance mais sur le type de protéine.</p>',
    howToChooseTitle: 'Quelle protéine William Bonac choisir ?',
    howToChooseBody:
      '<p>Trois références de la gamme publient un tableau de valeurs sur nos fiches, et elles se départagent très proprement sur une portion identique de 30 g. <strong>Whey Iso Regime</strong> 2 kg, en arôme Vanilla, déclare 26 g de protéines, 1,5 g de glucides dont 0 g de sucres, 0,84 g de matières grasses et 140 kcal. <strong>Whey Regime</strong> 2 kg, également en Vanilla, déclare 25 g de protéines, 1,5 g de glucides dont 0,87 g de sucres, 0,86 g de matières grasses et 133,74 kcal. <strong>Whey Ultimate</strong> 2 kg, cette fois en arôme Chocolat, déclare 23 g de protéines, 1,44 g de glucides dont 1,44 g de sucres, 1,5 g de matières grasses et 111 kcal. Ces trois lignes ne sont comparables que sous cette réserve : l’arôme n’est pas le même pour la troisième, et les valeurs déclarées changent d’un arôme à l’autre.</p>' +
      '<p>Les deux autres poudres relèvent de rayons différents. <strong>Iso Hydro Zero</strong> 1,8 kg est la seule référence de la marque classée en whey hydrolysée, c’est-à-dire une protéine prédécoupée ; <strong>Clear Beef</strong> 1,8 kg est classée en protéine de bœuf, où la source est bovine et non laitière, et elle est référencée en arôme PinaColada plutôt qu’en saveur lactée. Nos fiches ne publient aucune valeur par portion pour ces deux-là ni pour le <strong>Pack Ultimate Muscle</strong> : aucun chiffre n’est donc avancé ici les concernant, et l’étiquette du pot reçu est la seule référence. Vérifiez-y aussi les allergènes avant de commander.</p>',
    faqs: [
      {
        question: 'Quels produits William Bonac sont vendus en Tunisie ?',
        answer:
          'Six références sur Protein.tn : Whey Regime 2 kg, Whey Iso Regime 2 kg, Whey Ultimate 2 kg, Iso Hydro Zero 1,8 kg, Clear Beef 1,8 kg et le Pack Ultimate Muscle. La gamme ne comporte ni créatine, ni acides aminés, ni vitamines. La grille de produits de cette page affiche l’état réel de chaque référence.',
      },
      {
        question: 'Combien de protéines dans une portion de Whey Iso Regime 2 kg ?',
        answer:
          'Sur l’arôme Vanilla, l’étiquette transcrite sur notre fiche produit indique une portion de 30 g apportant 26 g de protéines, 1,5 g de glucides dont 0 g de sucres, 0,84 g de matières grasses et 140 kcal. Ces valeurs valent pour cet arôme et ce format.',
      },
      {
        question: 'Quelle différence entre Whey Regime, Whey Iso Regime et Whey Ultimate ?',
        answer:
          'Whey Regime et Whey Ultimate sont classées en whey protéine, Whey Iso Regime en whey isolate, plus filtrée. Pour une même portion de 30 g, nos fiches déclarent 26 g de protéines pour Whey Iso Regime (Vanilla), 25 g pour Whey Regime (Vanilla) et 23 g pour Whey Ultimate (Chocolat). L’arôme diffère sur la troisième, et les valeurs déclarées varient d’un arôme à l’autre.',
      },
      {
        question: 'Qu’est-ce que Iso Hydro Zero 1800 g ?',
        answer:
          'C’est la seule référence William Bonac classée en whey hydrolysée sur Protein.tn, proposée en 1,8 kg et référencée en arôme Chocolat. Une whey hydrolysée est une protéine prédécoupée, distincte d’une whey concentrée ou d’un isolat. Notre fiche ne publie pas de valeurs par portion pour cette référence : l’étiquette du pot fait foi.',
      },
      {
        question: 'Clear Beef est-elle une whey ?',
        answer:
          'Non. Clear Beef 1,8 kg est classée en protéine de bœuf : la source de protéines y est bovine et non laitière. Elle est référencée en arôme PinaColada. C’est la référence à regarder si vous voulez changer de source de protéines plutôt que de marque. Aucune valeur par portion n’est publiée sur notre fiche pour ce produit.',
      },
      {
        question: 'Comment commander William Bonac en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Le rayon whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Notre sélection de whey isolate', url: '/whey-isolate' },
      { slug: 'whey-hydrolysee', name: 'Whey hydrolysée en Tunisie', url: '/whey-hydrolysee' },
      { slug: 'proteine-de-boeuf', name: 'Le rayon protéine de bœuf', url: '/proteine-de-boeuf' },
      { slug: 'brands', name: 'Comparer William Bonac aux autres marques', url: '/brands' },
    ],
  },

  'victor-martinez': {
    metaTitle: 'Victor Martinez Tunisie | V-Bulk, Whey Gold & Break-Out',
    metaDescription:
      'Victor Martinez en Tunisie : Premium V-Bulk 2,7 kg et 5,5 kg, Premium Whey Gold 2 kg, Premium Isolate Protein Matrix 2 kg et le pre-workout Break-Out.',
    h1: 'Victor Martinez Tunisie : Premium V-Bulk, Whey Gold et Break-Out',
    introHtml:
      '<p>La gamme <strong>Victor Martinez en Tunisie</strong> tient en cinq références réparties sur quatre rayons, toutes préfixées « Premium » sauf le pre-workout. Les calories d’abord, avec <strong>Premium V-Bulk</strong> en 2,7 kg et en 5,5 kg (arôme Chocolat sur le grand format), classé en gainers protéinés. Les protéines ensuite : <strong>Premium Whey Gold</strong> 2 kg (arôme Cookies) en whey protéine et <strong>Premium Isolate Protein Matrix</strong> 2 kg (arôme Cookies) en whey isolate. Enfin le pre-workout <strong>Break-Out</strong>, seule référence de la marque à ne pas être une poudre protéinée ou calorique. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>',
    howToChooseTitle: 'Quel produit Victor Martinez choisir ?',
    howToChooseBody:
      '<p>La question à trancher en premier n’est pas la marque mais le blocage. Si vous mangez assez de calories et manquez seulement de protéines, ce sont <strong>Premium Whey Gold</strong> 2 kg ou <strong>Premium Isolate Protein Matrix</strong> 2 kg qu’il faut regarder : la première est classée en whey protéine, la polyvalente ; la seconde en whey isolate, une famille davantage filtrée qui vise plus de protéines par portion pour moins de glucides et de lipides, en général à un prix au kilo supérieur. Les deux sont référencées en arôme Cookies et en 2 kg, donc ni la contenance ni la saveur ne départagent ici — seul le type de protéine le fait.</p>' +
      '<p>Si le point bloquant est au contraire d’atteindre l’apport calorique quotidien en mangeant, <strong>Premium V-Bulk</strong> est le produit correspondant : c’est un gainer, il ajoute des glucides et des calories, et il existe en 2,7 kg et en 5,5 kg. Ces deux contenances portent le même nom de produit ; à dose journalière égale, seule la durée couverte change, ce qui en fait un arbitrage de prix et non de formule. <strong>Break-Out</strong>, enfin, est un pre-workout : il se prend avant la séance et ne remplace ni une protéine ni un gainer. Aucune fiche Victor Martinez de notre catalogue ne publie de tableau de valeurs nutritionnelles — les cinq références renvoient un bloc vide — donc aucune valeur par portion n’est avancée ici, ni en protéines, ni en calories, ni en caféine. L’étiquette du pot que vous recevez est la seule référence, et c’est là qu’il faut lire la dose de caféine du Break-Out avant de le cumuler avec du café.</p>',
    faqs: [
      {
        question: 'Quels produits Victor Martinez sont vendus en Tunisie ?',
        answer:
          'Cinq références sur Protein.tn : Premium V-Bulk 2,7 kg et Premium V-Bulk 5,5 kg en gainers protéinés, Premium Whey Gold 2 kg en whey protéine, Premium Isolate Protein Matrix 2 kg en whey isolate, et le pre-workout Break-Out. La grille de produits de cette page affiche l’état réel de chacune.',
      },
      {
        question: 'Quelle différence entre Premium Whey Gold et Premium Isolate Protein Matrix ?',
        answer:
          'Premium Whey Gold 2 kg est classée en whey protéine sur Protein.tn, Premium Isolate Protein Matrix 2 kg en whey isolate. Une whey isolate est plus filtrée et vise davantage de protéines par portion pour moins de glucides et de lipides, généralement à un prix au kilo plus élevé. Les deux sont référencées en arôme Cookies et en 2 kg.',
      },
      {
        question: 'Faut-il prendre Premium V-Bulk en 2,7 kg ou en 5,5 kg ?',
        answer:
          'Les deux sacs portent le même nom de produit et le même rayon, gainers protéinés. À dose journalière égale, le 5,5 kg couvre simplement une période plus longue. Comparez le prix affiché des deux formats sur cette page : la décision est budgétaire, pas nutritionnelle.',
      },
      {
        question: 'Combien de protéines dans une portion de whey Victor Martinez ?',
        answer:
          'Aucune fiche produit Victor Martinez de notre catalogue ne publie de tableau de valeurs nutritionnelles : les cinq références renvoient un bloc vide. Nous ne citons donc aucun chiffre par portion sur cette page. Les valeurs déclarées figurent sur l’étiquette du pot que vous recevez, et elles varient selon l’arôme et le format.',
      },
      {
        question: 'À quoi sert le pre-workout Break-Out ?',
        answer:
          'C’est une poudre à prendre avant la séance, la seule référence Victor Martinez qui ne soit ni une protéine ni un gainer. Elle ne remplace aucun des deux. Lisez la composition et la teneur en stimulants sur l’étiquette du pot, et évitez de la cumuler avec d’autres sources de caféine dans la même journée.',
      },
      {
        question: 'Comment commander Victor Martinez en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'gainers-proteines', name: 'Gainers protéinés en Tunisie', url: '/gainers-proteines' },
      { slug: 'whey-proteine', name: 'Parcourir les whey protéines', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Parcourir les whey isolate', url: '/whey-isolate' },
      { slug: 'pre-workout', name: 'Pré-workouts disponibles en Tunisie', url: '/pre-workout' },
      { slug: 'brands', name: 'Comparer Victor Martinez aux autres marques', url: '/brands' },
    ],
  },

  'challenger-nutrition': {
    metaTitle: 'Challenger Nutrition Tunisie | 100% Whey & Thunder Gainer',
    metaDescription:
      'Challenger Nutrition en Tunisie : 100% Whey Protein 2,27 kg, Thunder Gainer 5,4 kg, EAA + BCAA 390 g, Creatine 300 g et Pump Extreme Pre-Workout 30 portions.',
    h1: 'Challenger Nutrition Tunisie : 100% Whey, Thunder Gainer et Pump Extreme',
    introHtml:
      '<p>La gamme <strong>Challenger Nutrition en Tunisie</strong> tient en cinq références, une par rayon, ce qui rend le choix inhabituellement simple : <strong>100% Whey Protein</strong> 2,27 kg (arôme Chocolat) en whey protéine, <strong>Thunder Gainer</strong> 5,4 kg (arôme Chocolat) en gainers protéinés, <strong>EAA + BCAA</strong> 390 g en EAA, <strong>Creatine</strong> 300 g en créatine, et <strong>Pump Extreme Pre-Workout</strong>, annoncé pour 30 portions, en pré-workout. Il n’y a ni doublon de format ni deuxième arôme à départager : chaque besoin correspond à un seul produit. La grille ci-dessus affiche le prix et la disponibilité de chacun.</p>',
    howToChooseTitle: 'Quel produit Challenger Nutrition choisir ?',
    howToChooseBody:
      '<p>Commencez par la seule référence dont l’étiquette est transcrite sur nos fiches. Sur <strong>100% Whey Protein</strong> 2,27 kg en arôme Chocolat, les valeurs relevées sur l’emballage déclarent une portion de 34 g apportant 24 g de protéines, 5 g de glucides dont 1,5 g de sucres, 2 g de matières grasses dont 1 g de saturés, 0,5 g de fibres et 135 kcal, pour 66 portions annoncées sur un pot de 2,267 kg net. C’est la référence à prendre si votre alimentation couvre déjà les calories et qu’il vous manque seulement des protéines. Ces valeurs valent pour cet arôme : celles de la référence que vous recevez sont imprimées sur son pot.</p>' +
      '<p>Si à l’inverse c’est l’apport calorique quotidien qui ne suit pas, <strong>Thunder Gainer</strong> 5,4 kg est le produit correspondant : un gainer ajoute des glucides et des calories en plus des protéines, dans un sac nettement plus grand. Les trois autres références se placent autour de l’entraînement et ne remplacent aucune des deux premières. <strong>Creatine</strong> 300 g se prend tous les jours, séance ou non, et n’apporte pas de protéines. <strong>EAA + BCAA</strong> 390 g complète un apport protéique déjà couvert, il ne le constitue pas. <strong>Pump Extreme Pre-Workout</strong>, annoncé pour 30 portions, se prend avant la séance uniquement. Nos fiches ne publient pas de tableau de valeurs pour ces quatre-là : aucun chiffre n’est avancé ici les concernant, et l’étiquette du pot reçu — teneur en stimulants du pre-workout comprise — est la seule référence.</p>',
    faqs: [
      {
        question: 'Quels produits Challenger Nutrition sont vendus en Tunisie ?',
        answer:
          'Cinq références sur Protein.tn : 100% Whey Protein 2,27 kg, Thunder Gainer 5,4 kg, EAA + BCAA 390 g, Creatine 300 g et Pump Extreme Pre-Workout annoncé pour 30 portions. Chaque rayon n’est couvert que par un seul produit. La grille de produits de cette page affiche l’état réel de chacun.',
      },
      {
        question: 'Combien de protéines dans une portion de 100% Whey Protein 2,27 kg ?',
        answer:
          'Sur l’arôme Chocolat, les valeurs de l’emballage transcrites sur notre fiche produit indiquent une portion de 34 g apportant 24 g de protéines, 5 g de glucides dont 1,5 g de sucres, 2 g de matières grasses dont 1 g de saturés, 0,5 g de fibres et 135 kcal, pour 66 portions annoncées sur un pot de 2,267 kg net. Ces valeurs valent pour cet arôme.',
      },
      {
        question: '100% Whey Protein ou Thunder Gainer pour prendre du poids ?',
        answer:
          'Cela dépend de ce qui bloque. Si vous mangez assez de calories mais pas assez de protéines, la 100% Whey Protein 2,27 kg suffit. Si vous n’arrivez pas à atteindre votre apport calorique quotidien en mangeant, Thunder Gainer 5,4 kg ajoute des glucides et des calories en plus des protéines. Le point de départ reste votre alimentation, pas la poudre.',
      },
      {
        question: 'Faut-il prendre la créatine ou les EAA + BCAA Challenger Nutrition ?',
        answer:
          'Ils ne répondent pas à la même question. La Creatine 300 g se prend tous les jours, séance ou non, et n’apporte pas de protéines. Les EAA + BCAA 390 g se placent autour de l’entraînement et viennent en complément d’un apport protéique déjà couvert par l’alimentation ou par une whey. Ni l’un ni l’autre ne remplace une protéine.',
      },
      {
        question: 'Le Pump Extreme Pre-Workout contient-il de la caféine ?',
        answer:
          'Notre fiche produit ne publie pas de tableau de composition pour cette référence, donc nous n’avançons aucune valeur ici. Le produit est annoncé pour 30 portions et se prend avant la séance. Lisez la liste des ingrédients et la teneur en stimulants sur l’étiquette du pot, et évitez de le cumuler avec d’autres sources de caféine dans la même journée.',
      },
      {
        question: 'Comment commander Challenger Nutrition en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Whey protéines : comparer les marques', url: '/whey-proteine' },
      { slug: 'gainers-proteines', name: 'Le rayon gainers protéinés', url: '/gainers-proteines' },
      { slug: 'creatine', name: 'Notre sélection de créatines', url: '/creatine' },
      { slug: 'eaa', name: 'EAA en Tunisie', url: '/eaa' },
      { slug: 'pre-workout', name: 'Notre sélection de pré-workouts', url: '/pre-workout' },
      { slug: 'brands', name: 'Comparer Challenger Nutrition aux autres marques', url: '/brands' },
    ],
  },

  'now-foods': {
    metaTitle: 'NOW Foods Tunisie | Vitamines, Oméga 3 & Articulations',
    metaDescription:
      'NOW Foods en Tunisie : vitamines, minéraux, antioxydants, articulations, oméga 3, et 60 références NOW Foods Sports (whey, créatine, BCAA, végétales).',
    h1: 'NOW Foods Tunisie : vitamines, articulations et gamme NOW Foods Sports',
    introHtml:
      '<p><strong>NOW Foods en Tunisie</strong> est d’abord un catalogue de santé quotidienne, et la répartition de ses références le montre : plantes et extraits, <strong>vitamines</strong>, <strong>antioxydants</strong>, <strong>minéraux</strong>, <strong>articulations</strong>, sommeil, digestion et <strong>oméga 3</strong> en forment l’essentiel. Les formats suivent la même logique — gélules végétales, capsules molles, comprimés, poudres, gommes et extraits liquides — plutôt que les gros pots de poudre. À côté, 60 références portent le nom <strong>NOW Foods Sports</strong> et couvrent la partie entraînement sur 18 rayons : <strong>Whey Protein Isolate</strong> de 544 g à 4,54 kg, <strong>Whey Protein Powder</strong> 907 g, <strong>Organic Whey Protein</strong> 454 g, <strong>Organic Plant Protein</strong> en 454 g et 544 g, <strong>Pea Protein</strong> et <strong>Soy Protein Isolate</strong>, huit créatines (<strong>Creatine Monohydrate</strong>, <strong>Micronized Creatine Monohydrate</strong>, <strong>Kre-Alkalyn Creatine</strong>), mais aussi des <strong>BCAA</strong>, des acides aminés, de la <strong>L-glutamine</strong>, de la <strong>L-carnitine</strong> liquide, de la bêta-alanine, du ZMA, du tribulus et <strong>Advanced Joint Support</strong>.</p>',
    howToChooseTitle: 'Quel produit NOW Foods choisir ?',
    howToChooseBody:
      '<p>Chez cette marque, la question n’est pas « quelle whey » mais « quel rayon ». Les références les plus nombreuses relèvent du quotidien : <strong>vitamines</strong> (ADAM et EVE multivitamines, Vitamin D-3, MK-7 Vitamin K-2, Vitamin C), <strong>minéraux</strong> (Calcium Citrate, Iron Complex, Selenium, Full Spectrum Mineral Caps), <strong>magnésium</strong> (Citrate, Glycinate with BioPerine, Magtein), <strong>antioxydants</strong> (CoQ10, Alpha Lipoic Acid, Astaxanthin, Resveratrol) et <strong>articulations</strong> (Glucosamine &amp; Chondroitin, MSM Powder 227 g, Turmeric Curcumin). Ces produits se choisissent par besoin, pas par objectif sportif.</p>' +
      '<p>Le second critère est la forme, parce que la marque décline souvent la même substance en plusieurs présentations : le magnésium existe en gélules végétales et en poudre, la vitamine D-3 en capsules molles, en comprimés à croquer et en gommes, le curcuma en gélules et en extrait liquide. Une poudre se dose librement, une gélule se transporte. Enfin, la partie entraînement se reconnaît au nom : 60 des références de cette page s’appellent <strong>NOW Foods Sports</strong>, et elles ne s’arrêtent pas aux protéines et à la créatine. Elles se répartissent sur 18 rayons du site — protéines végétales (9 références), créatine (8), whey isolate (6), BCAA (4), acides aminés (4), glucides et énergie (4), L-carnitine (4), L-arginine, tribulus et glutamine (3 chacun), whey protéine, protéines multi-sources, ZMA et bêta-alanine (2 chacun), puis articulations, vitamines, citrulline et CLA. Aucune valeur par portion n’est reprise ici : la dose, la forme et les allergènes sont imprimés sur le flacon de la référence choisie, et c’est cette étiquette qui fait foi.</p>',
    faqs: [
      {
        question: 'Que vend NOW Foods en Tunisie ?',
        answer:
          'Le catalogue couvre surtout la santé quotidienne : plantes et extraits, vitamines, antioxydants, minéraux, magnésium, zinc, articulations, sommeil, digestion, probiotiques et oméga 3. Les 60 références nommées NOW Foods Sports ajoutent la partie entraînement, et elles touchent 18 rayons du site : protéines végétales, créatine, whey isolate, BCAA, acides aminés, glucides et énergie, L-carnitine, L-arginine, tribulus, glutamine, whey protéine, protéines multi-sources, ZMA, bêta-alanine, articulations, vitamines, citrulline et CLA. La grille de produits de cette page indique les références et les formats effectivement proposés.',
      },
      {
        question: 'NOW Foods propose-t-il de la whey et de la créatine ?',
        answer:
          'Oui, sous le nom NOW Foods Sports. Côté protéines : Whey Protein Isolate de 544 g à 4,54 kg, Whey Protein Powder 907 g, Organic Whey Protein 454 g et, pour une version végétale, Organic Plant Protein en 454 g et 544 g, Pea Protein et Soy Protein Isolate. Côté créatine, huit références et non deux : Creatine Monohydrate en poudre de 227 g et de 1 kg comme en gélules végétales de 120 et 240, Micronized Creatine Monohydrate en 500 g et 1 kg, et Kre-Alkalyn Creatine en 120 et 240 gélules végétales.',
      },
      {
        question: 'Gélules, poudre ou capsules molles : quelle différence ?',
        answer:
          'La même substance est souvent déclinée en plusieurs formes chez NOW Foods. La poudre permet d’ajuster la dose et revient généralement moins cher au gramme ; la gélule ou le comprimé se transportent et évitent de peser ; la capsule molle est réservée aux formes huileuses comme la vitamine D-3 ou les oméga 3. Le choix est pratique, pas qualitatif.',
      },
      {
        question: 'Quelles doses pour les compléments NOW Foods ?',
        answer:
          'Nous n’avançons aucune valeur ici. La dose par prise, le nombre de prises par jour, la forme et les allergènes sont imprimés sur l’étiquette de chaque flacon, et varient d’une référence à l’autre au sein de la même famille. Lisez cette étiquette, et demandez l’avis d’un professionnel de santé en cas de traitement en cours.',
      },
      {
        question: 'Comment commander NOW Foods en Tunisie ?',
        answer:
          'Choisissez la référence et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'vitamines', name: 'Vitamines et minéraux en Tunisie', url: '/vitamines' },
      { slug: 'mineraux', name: 'Minéraux en Tunisie', url: '/mineraux' },
      { slug: 'magnesium', name: 'Comparer les magnésiums', url: '/magnesium' },
      { slug: 'omega-3', name: 'Le rayon oméga 3', url: '/omega-3' },
      { slug: 'articulations', name: 'Compléments pour les articulations', url: '/articulations' },
      { slug: 'antioxydants', name: 'Antioxydants en Tunisie', url: '/antioxydants' },
      { slug: 'brands', name: 'Comparer NOW Foods aux autres marques', url: '/brands' },
    ],
  },

  'doctor-s-best': {
    metaTitle: 'Doctor’s Best Tunisie | Articulations, CoQ10 & Collagène',
    metaDescription:
      'Doctor’s Best en Tunisie : glucosamine-chondroïtine-MSM, High Absorption CoQ10 et Curcumin, magnésium, collagène types 1 et 3, vitamine D3 et biotine.',
    h1: 'Doctor’s Best Tunisie : articulations, CoQ10 et collagène',
    introHtml:
      '<p>Le catalogue <strong>Doctor’s Best en Tunisie</strong> est concentré sur trois familles, et cela se voit dans la grille ci-dessus. Les <strong>articulations</strong> d’abord, avec Glucosamine Chondroitin MSM + Hyaluronic Acid en 150 gélules végétales, Vegan Glucosamine Chondroitin MSM, Boswellia + UC-II et High Absorption Curcumin en 120 comprimés. Les <strong>antioxydants</strong> ensuite : High Absorption CoQ10 en capsules molles, CoQ10 + Nattokinase, Alpha-Lipoic Acid 300 et 600 en 180 gélules végétales. Les <strong>vitamines</strong> enfin, dont Vitamin D3 en 180 et 360 capsules molles et Vitamin D3 + K2 MK-7. S’y ajoutent le <strong>collagène</strong> (Types 1 &amp; 3 &amp; Vitamin C, Pure Collagen Peptides 417 g), le <strong>magnésium</strong> en poudre et en gélules, la digestion, le sommeil et la beauté des cheveux.</p>',
    howToChooseTitle: 'Quel produit Doctor’s Best choisir ?',
    howToChooseBody:
      '<p>La marque revient souvent sur la même substance en faisant varier un seul paramètre, et c’est là que se joue le choix. Le <strong>collagène</strong> existe en comprimés (Types 1 and 3 &amp; Vitamin C, 180 ou 540 comprimés), en gélules (240) et en poudre (Pure Collagen Types 1 and 3, 200 g ; Pure Collagen Peptides, 417 g) : la poudre se mélange à une boisson, le comprimé ne demande rien. Le <strong>magnésium</strong> suit la même logique, entre High Absorption Magnesium en 120 gélules végétales ou comprimés, la version 240 comprimés et une poudre aromatisée de 350 g.</p>' +
      '<p>Sur les <strong>articulations</strong>, les formules se distinguent par ce qu’elles associent : glucosamine et chondroïtine seules, avec MSM, avec acide hyaluronique, avec UC-II, ou en version végane. Lisez la composition plutôt que le nom. Même remarque pour la <strong>CoQ10</strong>, proposée seule, avec PQQ, avec nattokinase ou avec NMN. Les dosages exacts, la forme et les allergènes figurent sur l’étiquette de la référence choisie ; aucune valeur n’est reprise ici, et ces produits ne remplacent ni une alimentation équilibrée ni un avis médical.</p>',
    faqs: [
      {
        question: 'Quels produits Doctor’s Best sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence surtout les formules articulations (Glucosamine Chondroitin MSM + Hyaluronic Acid, Vegan Glucosamine Chondroitin MSM, Boswellia + UC-II, High Absorption Curcumin), les antioxydants (High Absorption CoQ10, CoQ10 + Nattokinase, Alpha-Lipoic Acid 300 et 600), les vitamines (Vitamin C, Vitamin D3, Vitamin D3 + K2 MK-7, Fully Active Folate), le collagène, le magnésium, la digestion, le sommeil et la biotine.',
      },
      {
        question: 'Collagène en poudre ou en comprimés chez Doctor’s Best ?',
        answer:
          'Les deux existent. Pure Collagen Types 1 and 3 est proposé en poudre de 200 g et Pure Collagen Peptides en 417 g, tandis que Collagen Types 1 and 3 & Vitamin C existe en 180 ou 540 comprimés et en 240 gélules. La poudre se dose librement et se mélange à une boisson ; le comprimé se prend sans préparation. La composition annoncée diffère d’une référence à l’autre : comparez les étiquettes.',
      },
      {
        question: 'Quelle différence entre les formules articulations de la marque ?',
        answer:
          'Elles combinent des ingrédients différents autour du même besoin : glucosamine et chondroïtine seules, avec MSM, avec acide hyaluronique, avec UC-II, en version végane, ou sous forme de curcuma et de boswellia. Le nom commercial ne suffit pas à les distinguer ; la liste des ingrédients imprimée sur le flacon, elle, le fait.',
      },
      {
        question: 'Comment commander Doctor’s Best en Tunisie ?',
        answer:
          'Choisissez la référence et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'articulations', name: 'Articulations et mobilité', url: '/articulations' },
      { slug: 'antioxydants', name: 'Le rayon antioxydants', url: '/antioxydants' },
      { slug: 'vitamines', name: 'Vitamines en gélules et comprimés', url: '/vitamines' },
      { slug: 'collagene', name: 'Le rayon collagène', url: '/collagene' },
      { slug: 'magnesium', name: 'Magnésium : tous les formats', url: '/magnesium' },
      { slug: 'brands', name: 'Comparer Doctor’s Best aux autres marques', url: '/brands' },
    ],
  },

  nutricost: {
    metaTitle: 'Nutricost Tunisie | Créatine, BCAA, Whey & Vitamines',
    metaDescription:
      'Nutricost en Tunisie : créatine monohydrate et HCl, BCAA, EAA, citrulline, whey concentrate et isolate, caséine, pré-workout, vitamines et minéraux.',
    h1: 'Nutricost Tunisie : créatine, acides aminés, whey et vitamines',
    introHtml:
      '<p><strong>Nutricost en Tunisie</strong> couvre les deux moitiés du catalogue à la fois, ce qui est rare. Côté entraînement : <strong>créatine</strong> monohydrate en quatorze références — aromatisée en 207 g, 300 g, 500 g, 520 g et 570 g, sans arôme en 454 g, 500 g et 1 kg, plus une version en 180 gélules et un Variety Pack de 6,7 g — et <strong>Creatine HCl</strong> 225 g sans arôme, <strong>BCAA</strong> en poudre et en gélules, <strong>EAA</strong> 249 g et 330 g, <strong>L-Citrulline</strong> et Citrulline Malate 2:1 de 250 g à 1,2 kg, <strong>bêta-alanine</strong>, <strong>L-Glutamine</strong> jusqu’au format 1 kg, <strong>HMB</strong>, le pré-workout <strong>PRE-X</strong>, <strong>Whey Protein Concentrate</strong> et <strong>Grass-Fed Whey</strong>, <strong>Whey Protein Isolate</strong> en 907 g et 2 268 g, et <strong>Casein Protein</strong>. Côté quotidien : plantes et extraits, vitamines, minéraux, magnésium, zinc, immunité, sommeil et collagène. La plupart des poudres existent aussi en version sans arôme.</p>',
    howToChooseTitle: 'Quel produit Nutricost choisir ?',
    howToChooseBody:
      '<p>Deux décisions structurent le catalogue. La première est <strong>arôme ou sans arôme</strong> : la marque publie presque systématiquement les deux, et la version neutre se mélange à n’importe quelle boisson ou à un shake déjà parfumé, ce qui évite d’empiler deux goûts. La seconde est le <strong>format</strong> : la Citrulline Malate 2:1 va de 300 g à 1,2 kg, la L-Glutamine de 250 g à 1 kg, la Whey Protein Isolate de 907 g à 2 268 g. À dose journalière égale, seule la durée couverte par le pot change.</p>' +
      '<p>Sur la créatine, deux formes coexistent : la <strong>monohydrate</strong>, la plus courante, et la <strong>Creatine HCl</strong> en 225 g sans arôme. Sur les protéines, <strong>Whey Protein Concentrate</strong>, <strong>Grass-Fed Whey</strong>, <strong>Whey Protein Isolate</strong> et <strong>Casein Protein</strong> ne se substituent pas l’une à l’autre : l’isolat est plus filtré, la caséine est une protéine lente, la mention grass-fed porte sur l’origine du lait. Les acides aminés — BCAA, EAA, citrulline, bêta-alanine, glutamine — viennent après, une fois l’apport protéique total couvert par l’alimentation ou par une poudre. Les valeurs par portion sont imprimées sur l’étiquette de chaque référence et ne sont pas reprises ici.</p>',
    faqs: [
      {
        question: 'Quels produits Nutricost trouve-t-on en Tunisie ?',
        answer:
          'Protein.tn référence côté sport la créatine monohydrate et la Creatine HCl, les BCAA en poudre et en gélules, les EAA, la L-Citrulline et la Citrulline Malate 2:1, la bêta-alanine, la L-Glutamine, le HMB, le pré-workout PRE-X, la Whey Protein Concentrate, la Grass-Fed Whey, la Whey Protein Isolate et la Casein Protein ; côté quotidien, des plantes et extraits, des vitamines, des minéraux, du magnésium, du zinc, des produits immunité, sommeil et collagène.',
      },
      {
        question: 'Créatine monohydrate ou Creatine HCl chez Nutricost ?',
        answer:
          'Les deux formes sont référencées : la monohydrate en quatorze références — des poudres de 207 g à 1 kg, aromatisées comme sans arôme, une version en 180 gélules et un Variety Pack de 6,7 g — et la Creatine HCl en 225 g sans arôme. Ce sont deux formes différentes de la même molécule ; la dose indiquée et la solubilité annoncée diffèrent de l’une à l’autre, et ces informations figurent sur l’étiquette du pot que vous commandez.',
      },
      {
        question: 'Pourquoi autant de versions « sans arôme » ?',
        answer:
          'La marque décline la plupart de ses poudres en version neutre et en versions aromatisées. Le sans arôme se mélange à un jus, à un shake déjà parfumé ou à de l’eau sans superposer deux goûts, et c’est utile quand vous prenez plusieurs poudres dans la même journée. L’ingrédient actif est le même ; seul l’arôme change.',
      },
      {
        question: 'Quel format de Whey Protein Isolate choisir ?',
        answer:
          'La Whey Protein Isolate est proposée en 907 g et en 2 268 g, dans plusieurs parfums et en version sans arôme. À consommation égale, le grand format couvre simplement une période plus longue. Comparez le prix affiché des deux formats sur cette page : c’est une question de budget et de rotation, pas de qualité.',
      },
      {
        question: 'Comment commander Nutricost en Tunisie ?',
        answer:
          'Choisissez la référence, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'creatine', name: 'Créatines : voir tout le rayon', url: '/creatine' },
      { slug: 'whey-proteine', name: 'Parcourir tout le rayon whey', url: '/whey-proteine' },
      { slug: 'bcaa', name: 'BCAA : tous les formats', url: '/bcaa' },
      { slug: 'citrulline', name: 'Citrulline en Tunisie', url: '/citrulline' },
      { slug: 'vitamines', name: 'Vitamines : comparer les marques', url: '/vitamines' },
      { slug: 'mineraux', name: 'Le rayon minéraux', url: '/mineraux' },
      { slug: 'brands', name: 'Comparer Nutricost aux autres marques', url: '/brands' },
    ],
  },

  'rule-one-proteins': {
    metaTitle: 'Rule One Proteins Tunisie | R1 Whey, BCAA & Créatine',
    metaDescription:
      'Rule One Proteins en Tunisie : Whey Protein, Clear Whey Isolate, R1 Protein Whey Isolate, Essential Amino 9, BCAA, Charged Creatine, preLIFT, Roar et Clean Gainer.',
    h1: 'Rule One Proteins Tunisie : R1 Whey, acides aminés et créatine',
    introHtml:
      '<p>La gamme <strong>Rule One Proteins en Tunisie</strong> est une gamme d’entraînement complète, organisée autour de six familles. Les protéines : <strong>Whey Protein</strong> de 888 g à 2,28 kg, <strong>Clear Whey Isolate</strong> 689 g qui se boit clair, <strong>R1 Protein Whey Isolate</strong> 763 g et 780 g, <strong>Casein Protein</strong> 910 g, <strong>Plant Protein</strong> 620 g et 670 g et <strong>Source7</strong>, une multi-sources en 897 g et 902 g. Les acides aminés ensuite : <strong>Essential Amino 9</strong> 330 g et 345 g, <strong>BCAA</strong> et <strong>Active BCAA</strong> de 174 g à 405 g, <strong>Energized Amino</strong> 270 g. Puis la <strong>créatine</strong>, six pots répartis sur deux produits et non sur un choix neutre/aromatisé : <strong>Creatine</strong> sans arôme en 156 g et aromatisée en 210 g (Blue Raspberry, Fruit Punch), <strong>Charged Creatine</strong> aromatisée en 240 g (Mandarin Mango, Snow Cone) et 270 g (Blue Razz Lemonade), les pré-workouts <strong>preLIFT</strong> et <strong>Roar</strong>, un <strong>Clean Gainer</strong> 2,18 kg, du collagène et deux multivitamines.</p>',
    howToChooseTitle: 'Quel produit Rule One Proteins choisir ?',
    howToChooseBody:
      '<p>Sur les protéines, la marque propose trois textures pour le même besoin. <strong>Whey Protein</strong> est la poudre polyvalente, celle qui couvre l’apport quotidien, et c’est aussi la seule proposée jusqu’en 2,28 kg. <strong>R1 Protein Whey Isolate</strong> repose sur un isolat, plus filtré. <strong>Clear Whey Isolate</strong> 689 g donne une boisson claire, proche d’un jus plutôt que d’un lait : le choix se joue sur ce que vous accepterez de boire tous les jours. <strong>Casein Protein</strong> est une protéine lente, <strong>Plant Protein</strong> la version végétale, et <strong>Source7</strong> combine plusieurs sources.</p>' +
      '<p>Côté acides aminés, <strong>Essential Amino 9</strong> couvre les neuf acides aminés essentiels tandis que les <strong>BCAA</strong> n’en apportent que trois ; <strong>Energized Amino</strong> ajoute une composante stimulante et se rapproche donc d’un pré-workout léger. Les deux pré-workouts assumés sont <strong>preLIFT</strong> (420 g à 450 g) et <strong>Roar</strong> (285 g à 315 g). Sur la créatine, la marque référence six pots et le partage n’est pas « neutre contre Charged » : <strong>Creatine</strong> existe sans arôme en 156 g, mais aussi aromatisée en 210 g (Blue Raspberry, Fruit Punch) ; <strong>Charged Creatine</strong> n’existe qu’aromatisée, en 240 g (Mandarin Mango, Snow Cone) et 270 g (Blue Razz Lemonade). Le <strong>Clean Gainer</strong> 2,18 kg, enfin, ne remplace pas une whey : il vise les apports caloriques difficiles à atteindre. Les valeurs par portion figurent sur l’étiquette du parfum et du format retenus.</p>',
    faqs: [
      {
        question: 'Quels produits Rule One Proteins sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence les protéines Whey Protein, R1 Protein Whey Isolate, Clear Whey Isolate, Casein Protein, Plant Protein et Source7, les acides aminés Essential Amino 9, BCAA, Active BCAA et Energized Amino, la Creatine et la Charged Creatine, les pré-workouts preLIFT et Roar, le Clean Gainer, du collagène et les multivitamines Men’s Multi et Women’s Multi.',
      },
      {
        question: 'Quelle différence entre Clear Whey Isolate et R1 Protein Whey Isolate ?',
        answer:
          'Les deux sont construites sur un isolat de lactosérum. Clear Whey Isolate, en 689 g, donne une boisson claire et légère, plus proche d’un jus que d’un lait. R1 Protein Whey Isolate, en 763 g et 780 g, se prépare en boisson lactée classique. La différence porte sur la texture obtenue au shaker, pas sur la source de protéine.',
      },
      {
        question: 'Essential Amino 9 ou BCAA : que choisir ?',
        answer:
          'Essential Amino 9 apporte les neuf acides aminés essentiels, tandis qu’un BCAA n’en apporte que trois. Si votre apport protéique quotidien est déjà couvert par l’alimentation ou par une poudre, aucun des deux n’est indispensable ; si vous en ajoutez un, l’EAA est le plus complet des deux. La composition exacte est imprimée sur le pot.',
      },
      {
        question: 'Quelles créatines Rule One Proteins sont référencées ?',
        answer:
          'Six pots, répartis sur deux produits — ce n’est donc pas un choix entre « sans arôme » et « Charged ». Creatine est proposée sans arôme en 156 g, mais aussi aromatisée en 210 g, en Blue Raspberry et Fruit Punch. Charged Creatine n’existe qu’aromatisée, en 240 g (Mandarin Mango, Snow Cone) et 270 g (Blue Razz Lemonade). La dose par portion figure sur l’étiquette du pot retenu.',
      },
      {
        question: 'Comment commander Rule One Proteins en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Whey protéines : voir le rayon', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Whey isolate : voir le rayon', url: '/whey-isolate' },
      { slug: 'eaa', name: 'Le rayon EAA', url: '/eaa' },
      { slug: 'bcaa', name: 'Comparer les BCAA', url: '/bcaa' },
      { slug: 'creatine', name: 'Créatines : comparer les marques', url: '/creatine' },
      { slug: 'pre-workout', name: 'Pré-workouts en Tunisie', url: '/pre-workout' },
      { slug: 'brands', name: 'Comparer Rule One Proteins aux autres marques', url: '/brands' },
    ],
  },

  'vital-proteins': {
    metaTitle: 'Vital Proteins Tunisie | Collagen Peptides & Matcha',
    metaDescription:
      'Vital Proteins en Tunisie : Collagen Peptides 299 g, Matcha Collagen 299 g, Collagen Gummies 120 gommes et Cartilage Collagen 120 gélules. Formats affichés.',
    h1: 'Vital Proteins Tunisie : Collagen Peptides et Matcha Collagen',
    introHtml:
      '<p><strong>Vital Proteins en Tunisie</strong> est une gamme mono-sujet : toutes les références proposées sur Protein.tn relèvent du <strong>collagène</strong>, et ce qui change d’une à l’autre, c’est la forme sous laquelle vous le prenez. En poudre : <strong>Collagen Peptides</strong> 299 g, en Pumpkin Spice et Salted Caramel, et <strong>Matcha Collagen</strong> 299 g, qui associe le collagène à du thé matcha. À croquer : <strong>Collagen Gummies</strong> en 120 gommes, parfum framboise. En gélules : <strong>Cartilage Collagen</strong> en 120 gélules.</p>',
    howToChooseTitle: 'Quelle forme de collagène Vital Proteins choisir ?',
    howToChooseBody:
      '<p>Le choix est entièrement une question d’usage. La <strong>poudre</strong> (Collagen Peptides 299 g) se mélange dans un café, un yaourt ou une boisson et permet d’ajuster la dose ; c’est la forme la plus souple, mais elle demande une préparation. <strong>Matcha Collagen</strong> part de la même idée en y ajoutant du matcha, donc une boisson déjà constituée plutôt qu’un ingrédient neutre. Les <strong>gommes</strong> se prennent sans eau et sans shaker, ce qui compte si la contrainte est d’y penser tous les jours plutôt que de doser. Les <strong>gélules</strong> de Cartilage Collagen, enfin, sont la forme la plus discrète à transporter.</p>' +
      '<p>Un point mérite d’être dit clairement : ces produits ne sont pas des protéines d’entraînement et ne remplacent pas une whey. Le collagène ne couvre pas le même profil d’acides aminés qu’une protéine de lactosérum ; si votre objectif est l’apport protéique quotidien, c’est vers le rayon protéines qu’il faut regarder. La dose par portion et la liste des ingrédients sont imprimées sur l’étiquette de chaque référence, et nous n’en reprenons aucune valeur ici.</p>',
    faqs: [
      {
        question: 'Quels produits Vital Proteins sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence Collagen Peptides en 299 g (Pumpkin Spice et Salted Caramel), Matcha Collagen en 299 g, Collagen Gummies en 120 gommes parfum framboise et Cartilage Collagen en 120 gélules. La grille de produits de cette page indique les références et les formats effectivement proposés.',
      },
      {
        question: 'Poudre, gommes ou gélules : quelle différence ?',
        answer:
          'La poudre se mélange à une boisson chaude ou froide et laisse ajuster la dose. Les gommes se prennent telles quelles, sans eau ni shaker. Les gélules sont la forme la plus discrète à transporter. La différence est pratique : c’est la régularité de la prise qui compte, et elle dépend de la forme qui s’intègre le mieux à votre journée.',
      },
      {
        question: 'Le collagène remplace-t-il une whey protéine ?',
        answer:
          'Non. Le collagène n’apporte pas le même profil d’acides aminés qu’une protéine de lactosérum et n’est pas destiné à couvrir un apport protéique d’entraînement. Si votre objectif est le total protéique quotidien, regardez le rayon protéines ; le collagène répond à un autre besoin.',
      },
      {
        question: 'Comment commander Vital Proteins en Tunisie ?',
        answer:
          'Choisissez la référence, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'collagene', name: 'Collagène en Tunisie', url: '/collagene' },
      { slug: 'sante-vitalite', name: 'Rayon santé et vitalité', url: '/sante-vitalite' },
      { slug: 'brands', name: 'Comparer Vital Proteins aux autres marques', url: '/brands' },
    ],
  },

  'universal-nutrition': {
    metaTitle: 'Universal Nutrition Tunisie | Animal Pak & Animal Cuts',
    metaDescription:
      'Universal Nutrition en Tunisie : Animal Pak 30 et 44 packs, Animal Pak Powder, Animal Cuts, Animal Stak, Animal Omega, Carbo Plus 1 kg et ZMA Pro.',
    h1: 'Universal Nutrition Tunisie : la gamme Animal, Carbo Plus et ZMA',
    introHtml:
      '<p><strong>Universal Nutrition en Tunisie</strong> se lit presque entièrement à travers sa gamme <strong>Animal</strong>, vendue en sachets journaliers plutôt qu’en gélules à compter. Le <strong>Animal Pak</strong> est le complexe multivitaminé de référence de la marque, proposé en 30 packs, en 44 packs et en version poudre de 44 doses. Autour : <strong>Animal Cuts</strong> en 42 doses, décliné en version poudre sans stimulant, <strong>Animal Stak</strong> en 23 packs, <strong>Animal Omega</strong> en 30 packs et <strong>Animal Whey Isolate Loaded</strong> 2,27 kg. Le catalogue comprend également <strong>Carbo Plus</strong> 1 kg, <strong>ZMA Pro</strong> 90 capsules, <strong>Natural Sterol</strong>, <strong>GH Max</strong>, <strong>Beef Aminos</strong> 200 comprimés et un shaker de 700 ml.</p>',
    howToChooseTitle: 'Quel produit Universal Nutrition choisir ?',
    howToChooseBody:
      '<p>Une précision utile avant de choisir : <strong>Animal Pak appartient bien à Universal Nutrition</strong>. « Animal » existe aussi comme marque distincte dans notre catalogue, et les packs ne s’y trouvent pas — c’est sur cette page qu’il faut les chercher.</p>' +
      '<p>Le <strong>Animal Pak</strong> est un complexe quotidien : il se place à côté de l’alimentation, pas à la place d’une protéine ou d’une créatine. Le choix entre 30 packs, 44 packs et la version poudre tient à la durée couverte et au format — un sachet à avaler contre une dose à diluer. <strong>Animal Cuts</strong> relève des brûleurs de graisse et existe en version sans stimulant, ce qui est le vrai critère si vous êtes sensible à la caféine ou si vous le prenez en fin de journée. <strong>Carbo Plus</strong> 1 kg n’apporte que des glucides : il complète les calories autour de l’entraînement, seul ou ajouté à un shake, et ne fait pas le travail d’un gainer complet. <strong>ZMA Pro</strong> et <strong>Animal Omega</strong> relèvent, eux, d’un usage quotidien. Les dosages sont imprimés sur l’emballage de la référence choisie.</p>',
    faqs: [
      {
        question: 'Animal Pak est-il vendu sur Protein.tn ?',
        answer:
          'Oui, sur cette page. Animal Pak est un produit Universal Nutrition : il est référencé en 30 packs, en 44 packs et en version poudre de 44 doses. La marque « Animal » existe séparément dans notre catalogue et ne contient pas ces packs, c’est donc ici qu’il faut les chercher.',
      },
      {
        question: 'Quels produits Universal Nutrition sont disponibles en Tunisie ?',
        answer:
          'Protein.tn référence Animal Pak en 30 packs, 44 packs et poudre, Animal Cuts en 42 doses ainsi qu’en version poudre sans stimulant, Animal Stak en 23 packs, Animal Omega en 30 packs, Animal Whey Isolate Loaded 2,27 kg, Carbo Plus 1 kg, ZMA Pro 90 capsules, Natural Sterol, GH Max, Beef Aminos 200 comprimés et un shaker de 700 ml.',
      },
      {
        question: 'Quelle différence entre Animal Cuts et Animal Cuts No-Stim ?',
        answer:
          'Les deux relèvent du même produit, en 42 doses. La version No-Stim, proposée en poudre, est annoncée sans stimulant. C’est le critère à regarder si vous êtes sensible à la caféine ou si la prise tombe en fin de journée. La composition complète est imprimée sur l’emballage.',
      },
      {
        question: 'À quoi sert Carbo Plus ?',
        answer:
          'Carbo Plus est une poudre de glucides en 1 kg, sans protéines. Elle sert à augmenter l’apport calorique autour de l’entraînement ou à compléter un shake protéiné. Si vous cherchez protéines et glucides dans un seul produit, un gainer complet est plus adapté qu’une poudre de glucides seule.',
      },
      {
        question: 'Comment commander Universal Nutrition en Tunisie ?',
        answer:
          'Choisissez le produit et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'vitamines', name: 'Multivitamines en Tunisie', url: '/vitamines' },
      { slug: 'bruleurs-de-graisse', name: 'Le rayon brûleurs de graisse', url: '/bruleurs-de-graisse' },
      { slug: 'boosters-hormonaux', name: 'Plantes et boosters', url: '/boosters-hormonaux' },
      { slug: 'glucides', name: 'Glucides et énergie', url: '/glucides' },
      { slug: 'zma', name: 'ZMA en Tunisie', url: '/zma' },
      { slug: 'brands', name: 'Comparer Universal Nutrition aux autres marques', url: '/brands' },
    ],
  },

  'olimp-sport-nutrition': {
    metaTitle: 'Olimp Sport Nutrition Tunisie | Gain Bolic 6000',
    metaDescription:
      'Olimp Sport Nutrition en Tunisie : Gain Bolic 6000 6,8 kg, Max Mass 3XL 6 kg, Whey Protein Complex 100% 2,27 kg, Pure Whey Isolate 95 2,2 kg et Platinum Multivitamin.',
    h1: 'Olimp Sport Nutrition Tunisie : Gain Bolic 6000 et Pure Whey Isolate 95',
    introHtml:
      '<p>La sélection <strong>Olimp Sport Nutrition en Tunisie</strong> est courte et orientée prise de masse. Deux gainers d’abord, en très grands formats : <strong>Gain Bolic 6000</strong> en sac de 6,8 kg et <strong>Max Mass 3XL</strong> en 6 kg. Deux protéines ensuite : <strong>Whey Protein Complex 100%</strong> en 2,27 kg, une formule multi-sources, et <strong>Pure Whey Isolate 95</strong> en 2,2 kg, construite sur un isolat. Enfin <strong>Platinum Multivitamin</strong> en 90 comprimés, pour la partie quotidienne. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>',
    howToChooseTitle: 'Quel produit Olimp Sport Nutrition choisir ?',
    howToChooseBody:
      '<p>La première question est celle du blocage que vous cherchez à lever. Si vous n’arrivez pas à atteindre votre apport calorique en mangeant, les gainers <strong>Gain Bolic 6000</strong> (6,8 kg) et <strong>Max Mass 3XL</strong> (6 kg) sont faits pour cela : ils apportent des glucides en plus des protéines, et les formats annoncés couvrent une longue période. Si au contraire vous mangez assez mais manquez de protéines, un gainer est une réponse inutilement calorique.</p>' +
      '<p>Dans ce second cas, le choix se fait entre <strong>Whey Protein Complex 100%</strong> 2,27 kg, une formule multi-sources destinée à l’apport protéique quotidien, et <strong>Pure Whey Isolate 95</strong> 2,2 kg, bâtie sur un isolat donc plus filtrée. <strong>Platinum Multivitamin</strong>, en 90 comprimés, ne remplace aucun des deux : c’est un complexe quotidien. Les valeurs par portion dépendent du parfum et du format et sont imprimées sur l’emballage de la référence commandée.</p>',
    faqs: [
      {
        question: 'Quels produits Olimp Sport Nutrition sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence les gainers Gain Bolic 6000 en 6,8 kg et Max Mass 3XL en 6 kg, la Whey Protein Complex 100% en 2,27 kg, la Pure Whey Isolate 95 en 2,2 kg et la Platinum Multivitamin en 90 comprimés. La grille de produits de cette page indique les références et les formats effectivement proposés.',
      },
      {
        question: 'Gain Bolic 6000 ou Max Mass 3XL ?',
        answer:
          'Les deux sont des gainers en très grand format, 6,8 kg pour Gain Bolic 6000 et 6 kg pour Max Mass 3XL. Ils répondent au même besoin : atteindre un apport calorique que l’alimentation seule ne couvre pas. Comparez la composition annoncée sur les emballages et le prix affiché des deux sacs sur cette page.',
      },
      {
        question: 'Quelle différence entre Whey Protein Complex 100% et Pure Whey Isolate 95 ?',
        answer:
          'Whey Protein Complex 100%, en 2,27 kg, est une formule multi-sources destinée à compléter l’apport protéique quotidien. Pure Whey Isolate 95, en 2,2 kg, est construite sur un isolat, plus filtré. Le choix dépend de votre tolérance et de votre budget ; l’étiquette de chaque référence donne la composition exacte du parfum concerné.',
      },
      {
        question: 'Comment commander Olimp Sport Nutrition en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'mass-gainers', name: 'Mass gainers : voir le rayon', url: '/mass-gainers' },
      { slug: 'whey-isolate', name: 'Whey isolate : comparer les marques', url: '/whey-isolate' },
      { slug: 'proteines-multi-sources', name: 'Protéines multi-sources en Tunisie', url: '/proteines-multi-sources' },
      { slug: 'vitamines', name: 'Le rayon vitamines', url: '/vitamines' },
      { slug: 'brands', name: 'Comparer Olimp Sport Nutrition aux autres marques', url: '/brands' },
    ],
  },

  'mr-x-v-shape-supps': {
    metaTitle: 'MR.X V-Shape Supps Tunisie | Gold Whey & Gold Isolate',
    metaDescription:
      'MR.X V-Shape Supps en Tunisie : Gold Whey 2 kg, Gold Isolate 2 kg, V-Zero Isopro 1,8 kg, Whey Testo et Iso Testo 1,8 kg, Creatine Monohydrate 500 g et EAA 360 g.',
    h1: 'MR.X V-Shape Supps Tunisie : Gold Whey, Gold Isolate et Iso Testo',
    introHtml:
      '<p>La gamme <strong>MR.X V-Shape Supps en Tunisie</strong> tient en quelques références, toutes construites autour de la protéine. Côté isolats : <strong>Gold Isolate</strong> 2 kg, <strong>V-Zero Isopro</strong> 1,8 kg et <strong>Iso Testo</strong> 1,8 kg. Côté whey concentrée : <strong>Gold Whey</strong> 2 kg et <strong>Whey Testo</strong> 1,8 kg. Le reste du catalogue complète l’entraînement : <strong>MR X IGF-1 Anabolic Mass</strong> pour la prise de masse, <strong>Creatine Monohydrate</strong> en 500 g et <strong>MR X EAA</strong> en 360 g.</p>',
    howToChooseTitle: 'Quel produit MR.X V-Shape Supps choisir ?',
    howToChooseBody:
      '<p>Le premier tri se fait entre <strong>whey concentrée</strong> et <strong>isolat</strong>. Gold Whey 2 kg et Whey Testo 1,8 kg relèvent de la première famille : ce sont les poudres polyvalentes, pour l’apport protéique de tous les jours. Gold Isolate 2 kg, V-Zero Isopro 1,8 kg et Iso Testo 1,8 kg reposent sur un isolat, plus filtré, que l’on choisit généralement pour une teneur plus basse en glucides ou en lactose. Les formats sont proches, 1,8 kg ou 2 kg, donc la décision porte sur la formule et non sur la durée couverte.</p>' +
      '<p>Les trois autres références répondent à des besoins distincts et ne se cumulent pas par défaut. <strong>MR X IGF-1 Anabolic Mass</strong> est un gainer protéiné : il ajoute des calories quand manger davantage est le point bloquant. <strong>Creatine Monohydrate</strong> 500 g se prend indépendamment des protéines et n’a pas à être associée à un moment précis de la journée. <strong>MR X EAA</strong> 360 g se place autour de l’entraînement, une fois l’apport protéique total déjà couvert. Les valeurs par portion sont celles imprimées sur l’étiquette du format et de l’arôme commandés.</p>',
    faqs: [
      {
        question: 'Quels produits MR.X V-Shape Supps sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence les isolats Gold Isolate 2 kg, V-Zero Isopro 1,8 kg et Iso Testo 1,8 kg, les whey Gold Whey 2 kg et Whey Testo 1,8 kg, le gainer MR X IGF-1 Anabolic Mass, la Creatine Monohydrate 500 g et les MR X EAA 360 g. La grille de produits de cette page indique les références et les formats effectivement proposés.',
      },
      {
        question: 'Gold Whey ou Gold Isolate : quelle différence ?',
        answer:
          'Gold Whey 2 kg est une whey polyvalente, destinée à compléter l’apport protéique quotidien. Gold Isolate 2 kg est construite sur un isolat, plus filtré, que l’on retient généralement pour une teneur plus basse en glucides ou en lactose. Les deux sont proposées au même format ; comparez les compositions imprimées sur les pots.',
      },
      {
        question: 'La créatine MR.X est-elle aromatisée ?',
        answer:
          'La référence proposée est une Creatine Monohydrate en 500 g. La présence ou non d’un arôme, la dose par portion et le nombre de portions par pot sont indiqués sur l’étiquette du produit ; nous n’avançons aucune valeur ici. Elle se prend indépendamment des protéines.',
      },
      {
        question: 'Comment commander MR.X V-Shape Supps en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-isolate', name: 'Whey isolate : tout le rayon', url: '/whey-isolate' },
      { slug: 'whey-proteine', name: 'Whey protéines du catalogue', url: '/whey-proteine' },
      { slug: 'gainers-proteines', name: 'Gainers protéinés : voir le rayon', url: '/gainers-proteines' },
      { slug: 'creatine', name: 'Créatine monohydrate en Tunisie', url: '/creatine' },
      { slug: 'eaa', name: 'EAA : comparer les formats', url: '/eaa' },
      { slug: 'brands', name: 'Comparer MR.X V-Shape Supps aux autres marques', url: '/brands' },
    ],
  },
  /*
   * ── 28/09/2026: 14 BRANDS WITH IN-STOCK PRODUCTS AND NO CURATED PAGE ─────────────────────
   * Measured the same day: 56–284 words of prose and no FAQ on these brand pages (JX Fitness: 30
   * products in stock). Written from /api/productsByBrandId and our own fiches under the rules in
   * this file's header; per-portion figures only where a label is transcribed on our fiche.
   * Deliberately NOT curated: action-labs (only in-stock item is MK-677), invictus (its one product
   * is an Insane Labz item filed under the wrong brand), scitec-nutrition (its main product, Best ZMA,
   * is named Scenit Nutrition) — fix the brand assignment first.
   */
  'jx-fitness': {
    metaTitle: "JX Fitness Tunisie | Presse cuisse, hack squat & cardio",
    metaDescription:
      "JX Fitness en Tunisie : presse cuisse, hack squat, machines sélectives, bancs réglables, barre olympique 2,20 m, tapis roulant, spin bike et vélo elliptique.",
    h1: "JX Fitness Tunisie : machines de musculation, bancs et cardio",
    introHtml:
      "<p>La marque <strong>JX Fitness</strong> réunit 56 références sur Protein.tn, dont 51 classées en <strong>matériel de musculation</strong> et 5 en <strong>cardio &amp; fitness</strong>. Les machines guidées forment le cœur de la gamme, rangées par zone travaillée. Pour les jambes : la <strong>presse cuisse</strong>, deux <strong>hack squats</strong>, la machine d’extension des jambes, la machine à mollets assis/debout et la poussée de hanche. Pour le haut du corps : la machine de traction latérale sélective, la station de traction et de trempage sélective, des machines à biceps, l’appareil de musculation des épaules, une poulie et l’abdominal machine. Viennent ensuite les <strong>bancs</strong> (utilitaire, multi-réglable, abdominal, latéral, épaule olympique, pupitre à biceps), les charges libres et le rangement (barre olympique 2,20 m, barre zigzag, supports de disques et d’haltères, accessoires de rack) et le <strong>cardio</strong> : tapis roulant, spin bike, vélo elliptique, vélo semi-allongé, plus un ring de boxe. Le catalogue liste aussi une smith machine, une leg press, un multi-gym 8 stations, des rameurs et même une barrière de tourniquet à contrôle d’accès pour l’entrée d’une salle. Sur chaque fiche, regardez d’abord deux choses : le mode de charge (pile de poids intégrée ou disques) et les dimensions, quand elles sont publiées.</p>",
    howToChooseTitle: "Quel équipement JX Fitness choisir ?",
    howToChooseBody:
      "<p>Partez de la zone à travailler, puis vérifiez la place. Pour les <strong>jambes</strong>, la presse cuisse (1453 × 1310 × 1440 mm, charge maximale de 150 kg selon sa fiche) fait pousser un plateau, tandis que le hack squat garde le dos calé contre un dossier sur une trajectoire proche du squat : les deux se complètent. L’extension des jambes isole les quadriceps ; la machine à mollets travaille assis ou debout.</p><p>Le deuxième critère est le <strong>mode de charge</strong>. Une machine <strong>sélective</strong> embarque sa pile de poids : la machine de curl biceps sélective annonce 60 kg réglables au sélecteur, et la station de traction et de trempage s’en sert pour assister tractions et dips. Une machine <strong>à chargement par plaques</strong>, comme la machine de flexion des biceps, se charge avec des disques achetés à part.</p><p>Côté <strong>encombrement</strong>, les écarts sont nets. Le banc multi-réglable (1380 × 540 × 500 mm, 47 kg, 7 positions : plat, incliné de 15 à 90° et décliné à -15°) se replie. La Hack Squat Machine Trainer occupe 2065 × 1526 × 1571 mm pour 235 kg net, et l’appareil de musculation des épaules pèse 232 kg : vérifiez l’accès et le sol avant de commander. La barre olympique de 2,20 m (30 kg, disques à alésage de 51 mm, 250 kg maximum) demande un dégagement plus large qu’elle.</p><p>En <strong>cardio</strong>, le tapis roulant va de la marche à la course, le vélo elliptique mobilise le haut et le bas du corps sans choc au sol, le spin bike se prête aux séances intenses et le vélo semi-allongé se pratique assis, dos calé contre un dossier. Leurs dimensions ne figurent pas sur nos fiches : demandez-les à l’équipe.</p>",
    faqs: [
      {
        question: "Quels équipements JX Fitness sont proposés sur Protein.tn ?",
        answer:
          "56 références : 51 en matériel de musculation — machines guidées pour les jambes, le dos, les bras, les épaules et les abdominaux, bancs, barre olympique 2,20 m, barre zigzag et supports de rangement — et 5 en cardio & fitness : tapis roulant, spin bike, vélo elliptique, vélo semi-allongé et ring de boxe. La grille de cette page indique la disponibilité de chaque référence.",
      },
      {
        question: "Machine sélective ou à chargement par plaques : quelle différence ?",
        answer:
          "Une machine sélective intègre sa pile de poids : la charge se règle au sélecteur entre deux séries, sans manipuler de disques. La machine de curl biceps sélective annonce ainsi une pile de 60 kg. Une machine à chargement par plaques, comme la machine de flexion des biceps, se charge avec des disques achetés à part : vérifiez leur compatibilité avec les supports avant de commander.",
      },
      {
        question: "Quel banc JX Fitness choisir ?",
        answer:
          "Le banc utilitaire est un banc plat fixe, pour le développé à plat, les curls et les extensions triceps. Le banc multi-réglable offre 7 positions, du décliné à -15° jusqu’à 90°, se replie et pèse 47 kg. Le banc d’épaule olympique a un angle fixe annoncé entre 75 et 90° et des supports pour barre olympique : il est dédié à la presse militaire. Le banc abdominal réglable et le banc latéral servent au travail des abdominaux et des obliques.",
      },
      {
        question: "Quel appareil cardio JX Fitness choisir ?",
        answer:
          "Le tapis roulant, à vitesses réglables et surface amortie, couvre la marche, le jogging et la course. Le vélo elliptique fait travailler le haut et le bas du corps sans choc au sol. Le spin bike, à résistance réglable, se prête aux séances intenses. Le vélo semi-allongé se pratique assis avec un dossier, et sa console affiche le temps, la vitesse, la distance et les calories. En cas de problème de santé, demandez d’abord l’avis d’un professionnel.",
      },
      {
        question: "Les dimensions des machines JX Fitness sont-elles publiées ?",
        answer:
          "Pour une partie d’entre elles, oui : presse cuisse 1453 × 1310 × 1440 mm, Hack Squat Machine Trainer 2065 × 1526 × 1571 mm, machine de curl biceps sélective 935 × 1372 × 1527 mm, banc multi-réglable 1380 × 540 × 500 mm, support d’haltères 2345 × 585 × 738 mm. Pour les autres, dont les appareils cardio, les mesures ne figurent pas sur la fiche : demandez-les à l’équipe Protein.tn avant de réserver l’emplacement.",
      },
      {
        question: "Comment commander un équipement JX Fitness ?",
        answer:
          "Choisissez la référence, ajoutez-la au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Pour une machine volumineuse, l’équipe organise avec vous le transport et la mise en place ; le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande.",
      },
    ],
    relatedCategories: [
      { slug: "materiel-de-musculation", name: "Voir tout le matériel de musculation", url: "/materiel-de-musculation" },
      { slug: "cardio-fitness", name: "Le rayon cardio et fitness", url: "/cardio-fitness" },
      { slug: "equipement", name: "Équipement : voir tout le rayon", url: "/equipement" },
      { slug: "brands", name: "Comparer JX Fitness aux autres marques", url: "/brands" },
    ],
  },
  'kong-sport-nutrition': {
    metaTitle: "Kong Sport Nutrition Tunisie | Gants, straps & shaker",
    metaDescription:
      "Kong Sport Nutrition en Tunisie : gants de musculation et de fitness, lifting straps, bandes de poignet et de genou, ceinture, shaker 450 ml, bouteille 2,2 L.",
    h1: "Kong Sport Nutrition Tunisie : accessoires d’entraînement et shakers",
    introHtml:
      "<p>Malgré son nom, <strong>Kong Sport Nutrition</strong> ne référence aucun complément alimentaire sur Protein.tn : ses 13 références sont toutes classées en <strong>accessoires</strong>, et elles se répartissent en trois usages. La <strong>prise</strong> d’abord : des <strong>lifting straps</strong> à fermeture velcro, des <strong>bandes de tirage</strong> à enrouler autour du poignet et de la barre, des <strong>gants de musculation</strong> et un <strong>gant de fitness</strong> à bande de maintien ajustable. Le <strong>maintien</strong> ensuite : des <strong>bandes de poignet</strong>, une <strong>bande genoux</strong> élastique que l’on serre soi-même et une <strong>ceinture dos de musculation</strong> à boucle ajustable. L’<strong>hydratation</strong> enfin : le <strong>Protein Shaker 450 ml Sport Life</strong>, le Shaker Kong 700 ml et deux bouteilles d’eau, de 2,2 L et de 1,8 L. Le catalogue liste aussi une Dip Belt pour lester dips et tractions, et des sangles abdominales Gut Blaster Ab Slings. Aucune de ces fiches ne publie de grille de tailles : pour les gants et la ceinture, c’est la question à poser avant de commander. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel accessoire Kong Sport Nutrition choisir ?",
    howToChooseBody:
      "<p>Partez de ce qui vous limite pendant la séance, pas de l’accessoire. Si la <strong>prise lâche</strong> avant le dos sur un soulevé de terre, un rowing ou des tractions, ce sont les <strong>lifting straps</strong> ou les <strong>bandes de tirage</strong> : les premières se ferment au poignet par velcro et s’ouvrent d’un geste entre deux séries, les secondes s’enroulent autour du poignet puis de la barre. Si c’est la <strong>paume</strong> qui frotte, les <strong>gants</strong> protègent la peau et améliorent l’adhérence ; le gant de fitness se règle par une bande autour du poignet.</p><p>Pour le <strong>maintien</strong>, chaque produit vise une articulation. Les <strong>bandes de poignet</strong> servent quand le poignet se casse vers l’arrière au développé couché ou aux dips ; nos fiches rappellent qu’elles ne remplacent pas des sangles, qui aident la prise. La <strong>bande genoux</strong> s’enroule en partant de sous la rotule et se réserve aux séries lourdes de squat, de presse ou de fentes. La <strong>ceinture</strong> se porte sur les séries exigeantes de squat et de soulevé de terre, puis se desserre entre les séries. Aucun de ces accessoires ne corrige une technique approximative, et en cas de douleur, l’avis d’un professionnel de santé passe avant.</p><p>Côté <strong>shaker</strong>, les 450 ml du Sport Life sont une contenance totale, pas un volume de liquide : pour un gainer qui demande beaucoup d’eau, notre fiche conseille de préparer la portion en deux fois. La bouteille de 2,2 L, à goulot large, couvre une longue séance sans remplissage.</p>",
    faqs: [
      {
        question: "Kong Sport Nutrition vend-il des compléments alimentaires sur Protein.tn ?",
        answer:
          "Non. Les 13 références de la marque sur Protein.tn sont des accessoires : gants, sangles, bandes de maintien, ceinture, shakers et bouteilles d’eau. Pour les protéines, la créatine ou les acides aminés, ce sont les pages des autres marques qu’il faut consulter.",
      },
      {
        question: "Lifting straps ou bandes de tirage : que choisir ?",
        answer:
          "Les deux sécurisent la prise sur les tirages lourds — soulevé de terre, rowing, tractions — quand les avant-bras fatiguent avant le dos. Les lifting straps se ferment au poignet par velcro, ce qui les rend rapides à mettre et à retirer entre les séries ; les bandes de tirage s’enroulent autour du poignet puis de la barre. Gardez l’échauffement et les séries légères à mains nues pour continuer à travailler la poigne.",
      },
      {
        question: "Bandes de poignet ou sangles : quelle différence ?",
        answer:
          "Elles ne rendent pas le même service. Les bandes de poignet stabilisent l’articulation quand elle porte la charge, au développé couché ou aux dips. Les sangles aident la prise sur les tirages lourds, quand l’avant-bras lâche avant le dos. Les deux se complètent dans un même sac de sport.",
      },
      {
        question: "Quelle taille choisir pour les gants et la ceinture ?",
        answer:
          "Les fiches ne publient pas de grille de tailles. Un gant doit épouser la paume sans former de plis ; pour la ceinture, mesurez votre tour de taille à l’endroit où vous la porterez. Dans les deux cas, demandez la correspondance à l’équipe Protein.tn avant de commander.",
      },
      {
        question: "Le shaker 450 ml convient-il pour un gainer ?",
        answer:
          "Les 450 ml correspondent à la contenance totale du shaker. Si le volume de liquide conseillé sur l’étiquette de votre gainer en approche ou le dépasse, préparez la portion en deux fois. Pour une whey, une créatine ou des BCAA, la dose de poudre est plus petite et la contenance convient.",
      },
      {
        question: "Comment commander Kong Sport Nutrition en Tunisie ?",
        answer:
          "Choisissez l’accessoire, ajoutez-le au panier avec le reste de votre commande puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "accessoires", name: "Gants, sangles et shakers", url: "/accessoires" },
      { slug: "equipement", name: "Le rayon équipement sportif", url: "/equipement" },
      { slug: "brands", name: "Comparer Kong Sport Nutrition aux autres marques", url: "/brands" },
    ],
  },
  'nutrex-research': {
    metaTitle: "Nutrex Research Tunisie | Lipo 6 Black, Lipo 6 Intense",
    metaDescription:
      "Nutrex Research en Tunisie : Lipo 6 Black Ultra Concentrate 60 capsules, Lipo 6 Intense, CLA 1000, L-Carnitine 3000 465 ml, EAA+ Hydration 390 g et créatine.",
    h1: "Nutrex Research Tunisie : la gamme Lipo 6, acides aminés et créatine",
    introHtml:
      "<p>Le catalogue <strong>Nutrex Research</strong> compte 40 références, et près d’un tiers d’entre elles porte le nom <strong>Lipo 6</strong> : 13 produits classés en brûleurs de graisse, dont <strong>Lipo 6 Black Ultra Concentrate</strong> en 60 capsules et en 60 Liqui-Caps, <strong>Lipo 6 Intense Ultra Concentrate</strong>, Lipo 6 Black en 120 Liqui-Caps, Lipo 6 Hers, Lipo-6 Hardcore, Lipo 6 Nighttime et Lipo-6 Diuretic, plus un gel Lipo-6 Defining de 120 ml et une ceinture Lipo 6 Waist Trimmer. Autour de cette famille : le <strong>CLA 1000</strong> en 90 et 180 capsules molles et la <strong>L-Carnitine 3000</strong> en flacon de 465 ml, en trois arômes. La partie performance réunit <strong>EAA+ Hydration</strong> 390 g en six arômes, <strong>BCAA 6000 Recovery</strong>, la <strong>Creatine Monohydrate</strong> en 390 g aromatisée et en 300 g sans arôme, la <strong>Creatine For Women</strong>, le pré-workout <strong>Outrage</strong>, L-Arginine 1000, HMB 1000 et Tribulus 1400. Restent les protéines : <strong>100% Whey Protein</strong> en 913 g, 923 g et 2265 g, <strong>100% Premium Whey Protein</strong> 2272 g et l’isolat <strong>IsoFit</strong> 1050 g. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit Nutrex Research choisir ?",
    howToChooseBody:
      "<p>Dans la famille <strong>Lipo 6</strong>, nos deux fiches les plus détaillées permettent de comparer la composition, pas les doses. <strong>Lipo 6 Black Ultra Concentrate</strong> (60 capsules) cite de la caféine anhydre, de la N-acétyl L-tyrosine, du guarana, des extraits de citrus aurantium et de capsicum, et de la BioPerine. <strong>Lipo 6 Intense Ultra Concentrate</strong> associe caféine, théobromine, N-acétyl-L-tyrosine et Paradoxine®, et y ajoute de la Rauwolfia vomitoria et de la yohimbine HCl, que sa fiche signale comme pouvant avoir des effets indésirables cardiovasculaires. Les deux fiches les destinent à des adultes déjà habitués aux brûleurs à base de stimulants. Posologie indiquée : une capsule le matin et une l’après-midi, aucune prise dans les six heures avant le coucher, sans cumuler café, boissons énergisantes ou pré-workout. Un avis médical s’impose en cas de tension, de problème cardiaque ou de traitement en cours, et nos fiches le rappellent : ces produits ne garantissent pas une perte de graisse, qui dépend d’abord de l’alimentation et de l’activité physique.</p><p>Hors Lipo 6, le choix est plus classique. La <strong>Creatine Monohydrate</strong> se prend aromatisée en 390 g (Strawberry Watermelon, Fruit Punch) ou sans arôme en 300 g, selon que vous la buvez seule ou dans un shake. <strong>EAA+ Hydration</strong> apporte les neuf acides aminés essentiels, quand <strong>BCAA 6000 Recovery</strong> n’en apporte que trois. <strong>IsoFit</strong> est l’isolat de la marque, face aux 100% Whey Protein. Aucune fiche Nutrex Research ne publie de tableau de valeurs transcrit par notre équipe : l’étiquette du produit reçu fait foi.</p>",
    faqs: [
      {
        question: "Quels produits Nutrex Research sont référencés sur Protein.tn ?",
        answer:
          "40 références : 13 brûleurs de graisse de la gamme Lipo 6 (Black Ultra Concentrate, Intense Ultra Concentrate, Black, Hers, Hardcore, Nighttime, Diuretic, un gel et une ceinture), le CLA 1000, la L-Carnitine 3000 465 ml, les EAA+ Hydration 390 g, les BCAA 6000 Recovery, la Creatine Monohydrate, la Creatine For Women, le pré-workout Outrage, L-Arginine 1000, HMB 1000, Tribulus 1400, les 100% Whey Protein et 100% Premium Whey Protein, et l’isolat IsoFit. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Lipo 6 Black Ultra Concentrate ou Lipo 6 Intense : quelle différence ?",
        answer:
          "Leur composition. Notre fiche Lipo 6 Black Ultra Concentrate cite caféine anhydre, N-acétyl L-tyrosine, guarana, citrus aurantium, capsicum et BioPerine. Lipo 6 Intense Ultra Concentrate cite caféine, théobromine, N-acétyl-L-tyrosine, Paradoxine®, Rauwolfia vomitoria et yohimbine HCl. Les quantités exactes figurent sur l’étiquette du flacon. Les deux s’adressent à des adultes déjà habitués aux brûleurs à base de stimulants.",
      },
      {
        question: "Comment prendre un Lipo 6 ?",
        answer:
          "Nos fiches indiquent une capsule le matin et une l’après-midi, sans dépasser deux capsules sur 24 heures pour Lipo 6 Intense, et aucune prise dans les six heures qui précèdent le coucher. Limitez les autres sources de caféine : café, boissons énergisantes, pré-workout. En cas de palpitations ou de vertiges, arrêtez la prise et consultez. L’étiquette de votre flacon reste la référence.",
      },
      {
        question: "Nutrex Research propose-t-il de la créatine et des acides aminés ?",
        answer:
          "Oui. La Creatine Monohydrate est référencée en 390 g, en Strawberry Watermelon et Fruit Punch, et en 300 g sans arôme ; la Creatine For Women existe en Pink Lemonade et Peach Mango. Côté acides aminés : EAA+ Hydration 390 g en six arômes, BCAA 6000 Recovery en Fruit Punch et Green Apple, L-Arginine 1000 et HMB 1000 en 120 gélules.",
      },
      {
        question: "Comment commander Nutrex Research en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "bruleurs-de-graisse", name: "Comparer les brûleurs de graisse", url: "/bruleurs-de-graisse" },
      { slug: "l-carnitine", name: "L-carnitine : le rayon", url: "/l-carnitine" },
      { slug: "cla", name: "Le rayon CLA", url: "/cla" },
      { slug: "eaa", name: "Acides aminés essentiels (EAA)", url: "/eaa" },
      { slug: "creatine", name: "Voir les créatines des autres marques", url: "/creatine" },
      { slug: "brands", name: "Comparer Nutrex Research aux autres marques", url: "/brands" },
    ],
  },
  'redcon1': {
    metaTitle: "Redcon1 Tunisie | Total War, C-Burn & Isotope",
    metaDescription:
      "Redcon1 en Tunisie : pré-workout Total War en 465 g et en dix arômes de 441 à 453 g, C-Burn, Double Tap, créatine 300 g, MRE Lite 945 g et Isotope 2,2 kg.",
    h1: "Redcon1 Tunisie : le pré-workout Total War et ses déclinaisons",
    introHtml:
      "<p>La gamme <strong>Redcon1</strong> sur Protein.tn compte 16 références, et 11 d’entre elles sont le même produit : le pré-workout <strong>Total War</strong>. Il est proposé en pot de <strong>465 g</strong> et en dix déclinaisons aromatisées de 441 g à 453 g — Strawberry Kiwi, Blue Raspberry, Green Apple, Orange Crush, Sour Gummy Bear, Rainbow Candy, Blue Lemonade, Strawberry Mango, Tiger’s Blood Cherry &amp; Coconut et Vice City Strawberry Pina Colada. Les cinq autres références couvrent chacune un autre usage : deux brûleurs de graisse en gélules, <strong>C-Burn</strong> (90 gélules) et <strong>Double Tap</strong> (120 gélules), une <strong>Creatine Monohydrate</strong> sans arôme de 300 g, <strong>MRE Lite</strong>, une protéine multi-sources de 945 g en Peanut Butter Cookie, et <strong>Isotope 100% Whey Isolate</strong> en 2,2 kg arôme Chocolat. Sur cette page, la question porte donc surtout sur le format et l’arôme de Total War, puis sur ce qui peut l’accompagner. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit Redcon1 choisir ?",
    howToChooseBody:
      "<p><strong>Total War</strong> est un pré-workout, et notre fiche du pot de 465 g en décrit la formule : citrulline malate, bêta-alanine, caféine, taurine et sulfate d’agmatine. Elle précise aussi ce qu’il ne contient pas — ni créatine, ni whey — : il ne remplace donc ni l’une ni l’autre. La fiche conseille de mélanger une portion dans 120 à 180 ml d’eau environ 30 minutes avant la séance, et de commencer par une demi-portion si vous êtes sensible à la caféine. Sa teneur en caféine est le premier critère : faites le compte du café, des boissons énergisantes et des autres compléments de la journée, et évitez-le trop près du coucher. La bêta-alanine peut provoquer chez certaines personnes des picotements passagers, appelés paresthésie.</p><p>Entre le pot de 465 g et les versions de 441 à 453 g, la différence tient à l’arôme et à la contenance ; les fiches des versions aromatisées ne transcrivent pas encore leur étiquette, qui reste la référence pour la formule et le nombre de portions. <strong>C-Burn</strong> et <strong>Double Tap</strong> relèvent d’un autre rayon, les brûleurs de graisse : lisez leur étiquette avant de les associer à Total War le même jour. La <strong>Creatine Monohydrate</strong> 300 g sans arôme se prend à part, puisque Total War n’en contient pas. Pour les protéines, <strong>Isotope</strong> est classé en whey isolate et <strong>MRE Lite</strong> en protéines multi-sources.</p>",
    faqs: [
      {
        question: "Quels produits Redcon1 sont référencés sur Protein.tn ?",
        answer:
          "16 références : le pré-workout Total War en 465 g et en dix arômes de 441 g à 453 g, les brûleurs de graisse C-Burn (90 gélules) et Double Tap (120 gélules), la Creatine Monohydrate sans arôme 300 g, la protéine multi-sources MRE Lite 945 g et Isotope 100% Whey Isolate 2,2 kg. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Total War 465 g ou une version aromatisée ?",
        answer:
          "Le pot de 465 g est la référence dont notre fiche détaille la formule. Les dix autres, de 441 g à 453 g, se distinguent par leur arôme, de Blue Raspberry à Tiger’s Blood Cherry & Coconut. Leur étiquette n’est pas encore transcrite sur nos fiches : le nombre de portions et la composition exacte figurent sur le pot reçu, et peuvent varier selon l’arôme et la version de la formule.",
      },
      {
        question: "Total War contient-il de la créatine ou des protéines ?",
        answer:
          "Non. D’après notre fiche, Total War est un pré-workout construit autour de la citrulline malate, de la bêta-alanine, de la caféine, de la taurine et du sulfate d’agmatine ; il ne contient ni créatine ni whey. Si vous prenez de la créatine, la Creatine Monohydrate 300 g sans arôme de la marque se prend séparément.",
      },
      {
        question: "Pourquoi Total War peut-il provoquer des picotements ?",
        answer:
          "La bêta-alanine de la formule peut provoquer chez certaines personnes une sensation passagère de picotement ou de fourmillement, appelée paresthésie. Son intensité varie d’une personne à l’autre. Commencer par une demi-portion permet aussi d’évaluer votre tolérance à la caféine.",
      },
      {
        question: "Comment commander Redcon1 en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "pre-workout", name: "Pré-workout : les autres formules", url: "/pre-workout" },
      { slug: "bruleurs-de-graisse", name: "Brûleurs de graisse en gélules", url: "/bruleurs-de-graisse" },
      { slug: "creatine", name: "Créatines à prendre à part", url: "/creatine" },
      { slug: "whey-isolate", name: "Whey isolate : autres marques", url: "/whey-isolate" },
      { slug: "proteines-multi-sources", name: "Le rayon protéines multi-sources", url: "/proteines-multi-sources" },
      { slug: "brands", name: "Comparer Redcon1 aux autres marques", url: "/brands" },
    ],
  },
  'hx-nutrition': {
    metaTitle: "HX Nutrition Tunisie | Big Monster 7 kg, whey & isolate",
    metaDescription:
      "HX Nutrition en Tunisie : gainers Big Monster et Massive Gainer 7 kg, Real Whey, Zero Isolate et Iso Whey 2 kg, créatine 500 g, ZMA 60 capsules et Vita X.",
    h1: "HX Nutrition Tunisie : gainers 7 kg, whey et isolats 2 kg",
    introHtml:
      "<p>La gamme <strong>HX Nutrition</strong> compte neuf références, organisées autour de la prise de masse et des protéines. Deux gainers en sac de <strong>7 kg</strong> d’abord : <strong>Big Monster</strong>, référencé en arôme Fraise, et <strong>Massive Gainer</strong>. Trois protéines en <strong>2 kg</strong> ensuite : <strong>Real Whey</strong> (arôme Biscuit), classée en whey protéine, puis <strong>Zero Isolate</strong> (Biscuit) et <strong>Iso Whey</strong> (Cookies), toutes deux classées en whey isolate. Le reste du catalogue complète l’entraînement et le quotidien : <strong>Creatine Monohydrate</strong> en 500 g, <strong>ZMA</strong> en 60 capsules, les multivitamines <strong>Vita X</strong> en 90 comprimés et <strong>TXT10</strong>, classé au rayon plantes et boosters. Les formats sont peu nombreux — 7 kg pour les gainers, 2 kg pour les protéines — si bien que le choix porte sur la formule et non sur la contenance. Aucune de ces fiches ne publie de tableau de valeurs transcrit par notre équipe : calories, protéines et créatine par portion se lisent sur l’étiquette du sac ou du pot. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit HX Nutrition choisir ?",
    howToChooseBody:
      "<p>La première question est celle du blocage. Si vous n’arrivez pas à manger assez pour prendre du poids, un gainer de 7 kg répond à ce besoin. <strong>Big Monster</strong> associe glucides, protéines et créatine selon sa fiche, et la quantité de créatine par portion est imprimée sur le sac : si vous prenez déjà une créatine à part, comptez celle du gainer. Sa fiche conseille de commencer par une demi-portion pour tester la tolérance digestive, puis de répartir l’apport en plusieurs shakers dans la journée. <strong>Massive Gainer</strong>, également en 7 kg, décrit un mélange de protéines de lactosérum, de caséine et d’isolat de soja, un point à vérifier en cas d’allergie.</p><p>Si vous mangez assez mais manquez de protéines, un gainer apporte des calories dont vous n’avez pas besoin : regardez plutôt les pots de 2 kg. <strong>Real Whey</strong> est la whey polyvalente de la marque ; <strong>Zero Isolate</strong> et <strong>Iso Whey</strong> sont classées en whey isolate, plus filtrée, et se distinguent surtout par leur arôme, Biscuit ou Cookies. La <strong>Creatine Monohydrate</strong> 500 g se prend indépendamment des protéines. <strong>ZMA</strong> en 60 capsules et <strong>Vita X</strong> en 90 comprimés relèvent d’un usage quotidien et ne remplacent aucun des produits ci-dessus. Pour <strong>TXT10</strong>, la fiche ne détaille pas la composition : l’étiquette est la seule référence. Dans tous les cas, les valeurs par portion sont celles du sac ou du pot reçu.</p>",
    faqs: [
      {
        question: "Quels produits HX Nutrition sont référencés sur Protein.tn ?",
        answer:
          "Neuf références : les gainers Big Monster et Massive Gainer en 7 kg, Real Whey, Zero Isolate et Iso Whey en 2 kg, la Creatine Monohydrate 500 g, le ZMA 60 capsules, les multivitamines Vita X 90 comprimés et TXT10. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Big Monster ou Massive Gainer ?",
        answer:
          "Les deux sont des gainers en sac de 7 kg, destinés à augmenter l’apport calorique quand l’alimentation ne suffit pas. Big Monster, référencé en arôme Fraise, associe glucides, protéines et créatine. La fiche de Massive Gainer décrit un mélange de protéines de lactosérum, de caséine et d’isolat de soja. Comparez les étiquettes pour les calories et les protéines par portion.",
      },
      {
        question: "Big Monster contient-il de la créatine ?",
        answer:
          "Oui, sa formule associe glucides, protéines et créatine. La quantité de créatine par portion n’est pas transcrite sur notre fiche : elle figure sur l’étiquette du sac. Si vous prenez déjà une créatine seule, tenez-en compte dans votre total de la journée.",
      },
      {
        question: "Real Whey, Zero Isolate ou Iso Whey ?",
        answer:
          "Les trois sont proposées en 2 kg. Real Whey, en arôme Biscuit, est classée en whey protéine : c’est la poudre polyvalente. Zero Isolate (Biscuit) et Iso Whey (Cookies) sont classées en whey isolate, une protéine plus filtrée que l’on choisit généralement pour une teneur plus basse en glucides ou en lactose. Les valeurs exactes figurent sur l’étiquette du pot.",
      },
      {
        question: "Comment commander HX Nutrition en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "mass-gainers", name: "Autres mass gainers du catalogue", url: "/mass-gainers" },
      { slug: "whey-isolate", name: "Whey isolate : le rayon complet", url: "/whey-isolate" },
      { slug: "whey-proteine", name: "Whey protéine : autres marques", url: "/whey-proteine" },
      { slug: "creatine", name: "Créatine monohydrate : autres marques", url: "/creatine" },
      { slug: "zma", name: "ZMA : comparer les formules", url: "/zma" },
      { slug: "brands", name: "Comparer HX Nutrition aux autres marques", url: "/brands" },
    ],
  },
  'mnd-fitness': {
    metaTitle: "MND Fitness Tunisie | Bancs, machines guidées et cardio",
    metaDescription:
      "MND Fitness sur Protein.tn : Flat Bench, bancs réglables et olympique, machines de tirage à pile de poids, rack à haltères F72, tapis roulant, rameur et vélo.",
    h1: "MND Fitness Tunisie : bancs, machines de tirage et appareils cardio",
    introHtml:
      "<p>La marque <strong>MND Fitness en Tunisie</strong>, c’est uniquement du matériel : 14 références sur Protein.tn, dont 11 au rayon <strong>matériel de musculation</strong> et 3 au rayon <strong>cardio &amp; fitness</strong>. Cinq bancs d’abord, qui se distinguent par leurs réglages : le <strong>Flat Bench</strong>, un banc plat fixe ; trois bancs multi-positions, le <strong>Banc réglable</strong>, le <strong>Multi Réglable Bench</strong> et le <strong>Multi Degree Olympic Bench</strong> ; et un <strong>banc de développé incliné</strong>. Viennent ensuite les machines guidées : <strong>Traction longue machine</strong> et <strong>Pulldown machine</strong>, deux postes de tirage à pile de poids intégrée, la <strong>Chest presse inclinée machine</strong>, la <strong>Multi-Functional Smith Machine</strong> et le <strong>Seated Preacher Curl</strong> pour les biceps, auxquels s’ajoute le <strong>Layers Dumbbell Rack</strong>, un rack à haltères sur 3 niveaux. Côté cardio : un <strong>tapis roulant professionnel</strong>, un <strong>rameur professionnel</strong> et un <strong>vélo à résistance magnétique</strong>. Certaines fiches publient dimensions et poids, d’autres non : c’est le premier point à vérifier avant de réserver un emplacement. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel équipement MND Fitness choisir ?",
    howToChooseBody:
      "<p><strong>Pour les pectoraux et le travail aux haltères</strong>, tout part du banc. Le <strong>Flat Bench</strong> ne s’incline pas, et c’est son intérêt : aucun mécanisme de réglage sous le dos quand la charge monte. Sa fiche annonce 1280 × 736 × 380 mm, 40 kg, une capacité de plus de 200 kg et une poignée avec roues pour le ranger. Si vous voulez aussi l’incliné et le décliné, un banc multi-positions évite d’empiler les postes : le <strong>Multi Degree Olympic Bench</strong> (1121 × 749 × 757 mm, 58 kg net selon sa fiche) se règle sans outils complexes, et le <strong>Banc réglable</strong> ajoute la position assise pour les épaules. Pour les bancs multi-positions, nos fiches ne publient pas de charge maximale certifiée : demandez-la avant l’achat si vous travaillez lourd.</p><p><strong>Pour le dos</strong>, les deux postes de tirage n’ont ni le même encombrement ni la même pile. La <strong>Traction longue machine</strong> mesure 1610 × 1280 × 2145 mm pour une pile réglable de 20 à 120 kg ; la <strong>Pulldown machine</strong>, un tirage vertical avec rouleaux de maintien des cuisses, annonce une pile d’environ 10 à 100 kg et plus. Dans les deux cas, comparez la hauteur de la machine à celle de votre plafond. Le <strong>Layers Dumbbell Rack</strong> (modèle F72, 1420 × 700 × 1010 mm, 71 kg) range jusqu’à 15 paires d’haltères.</p><p><strong>Pour le cardio</strong>, le choix dépend du geste : le <strong>tapis roulant</strong> pour la marche et la course, le <strong>rameur</strong> qui sollicite bras, dos, jambes et abdominaux dans un seul mouvement, le <strong>vélo à résistance magnétique</strong> pour un pédalage discret et sans impact. Leurs fiches ne publient ni dimensions ni poids maximal de l’utilisateur : demandez-les à l’équipe avant de commander.</p>",
    faqs: [
      {
        question: "Quels équipements MND Fitness sont vendus sur Protein.tn ?",
        answer:
          "Quatorze références. En musculation : Flat Bench, Banc réglable, Multi Réglable Bench, Multi Degree Olympic Bench, banc de développé incliné, Traction longue machine, Pulldown machine, Chest presse inclinée machine, Multi-Functional Smith Machine, Seated Preacher Curl et Layers Dumbbell Rack. En cardio : tapis roulant professionnel, rameur professionnel et vélo à résistance magnétique. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Banc plat ou banc réglable MND Fitness : lequel choisir ?",
        answer:
          "Le Flat Bench est un banc plat fixe : seuls ses repose-pieds se règlent, et cette assise sans mécanisme convient au développé couché lourd, au rowing et au travail aux haltères. Si vous voulez aussi travailler en incliné et en décliné, le Banc réglable, le Multi Réglable Bench et le Multi Degree Olympic Bench passent d’une position à l’autre ; le Banc réglable propose en plus une position assise.",
      },
      {
        question: "Quelle différence entre la Traction longue machine et la Pulldown machine ?",
        answer:
          "Ce sont deux postes de tirage pour le dos avec une pile de poids intégrée, donc sans disques à acheter. La Pulldown machine est un tirage vertical : rouleaux qui bloquent les cuisses, barre multi-prises (large, neutre ou étroite) et pile d’environ 10 à 100 kg et plus. La Traction longue machine associe siège réglable, appui poitrine et barre longue en prise large ou neutre, avec une pile de 20 à 120 kg et un encombrement annoncé de 1610 × 1280 × 2145 mm.",
      },
      {
        question: "Quelles dimensions prévoir pour le matériel MND Fitness ?",
        answer:
          "Nos fiches en publient cinq : Flat Bench 1280 × 736 × 380 mm (40 kg), Multi Degree Olympic Bench 1121 × 749 × 757 mm (58 kg net), Seated Preacher Curl 924 × 934 × 900 mm (49 kg), Layers Dumbbell Rack F72 1420 × 700 × 1010 mm (71 kg) et Traction longue machine 1610 × 1280 × 2145 mm. Pour les autres références, les dimensions ne figurent pas sur la fiche : demandez-les à l’équipe Protein.tn avant de commander.",
      },
      {
        question: "Tapis roulant, rameur ou vélo MND Fitness ?",
        answer:
          "Le tapis roulant sert à la marche, au jogging et à la course, avec des vitesses réglables et une surface amortie. Le rameur fait travailler bras, dos, jambes et abdominaux dans un seul geste, avec une résistance modulable. Le vélo à résistance magnétique offre un pédalage discret et sans impact, adapté à une chambre ou un salon. Le tapis et le vélo affichent vitesse, distance, temps et calories estimées.",
      },
      {
        question: "Comment commander MND Fitness en Tunisie ?",
        answer:
          "Choisissez l’équipement disponible, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles. Pour une machine encombrante, vérifiez avant la commande l’accès à la pièce où elle sera installée.",
      },
    ],
    relatedCategories: [
      { slug: "materiel-de-musculation", name: "Bancs et machines de musculation", url: "/materiel-de-musculation" },
      { slug: "cardio-fitness", name: "Tapis roulants, rameurs et vélos", url: "/cardio-fitness" },
      { slug: "equipement", name: "Tout le rayon équipement", url: "/equipement" },
      { slug: "brands", name: "Comparer MND Fitness aux autres marques", url: "/brands" },
    ],
  },
  'eric-favre': {
    metaTitle: "Eric Favre Tunisie | Mass Gainer, Protein Vegan, Born Rage",
    metaDescription:
      "Eric Favre : Mass Gainer Créatine 7 kg, Mass Gainer Zero 7 kg, Protein Vegan 1,5 kg et Iso Fusion 2 kg. Dès {prixMin} DT, {nbEnStock} produits en stock.",
    h1: "Eric Favre Tunisie : gainers 7 kg, protéine végétale et pré-workout",
    introHtml:
      "<p>La gamme <strong>Eric Favre en Tunisie</strong> compte six références sur Protein.tn, et trois d’entre elles tournent autour de la prise de poids. Deux gainers en sac de 7 kg d’abord : <strong>Mass Gainer Créatine</strong>, référencé en arôme Cookies et rangé au rayon glucides, et <strong>Mass Gainer Zero</strong>, en Vanilla et Pistache. Puis le <strong>Pack Prise de Masse</strong>, qui réunit un Hard Mass Gainer 7 kg, une Gold Creatine et un Shaker Kong de 700 ml. Côté protéines, deux poudres qui n’ont pas la même source : <strong>Protein Vegan</strong> 1,5 kg en Vanilla, une protéine végétale présentée comme associant pois, riz et spiruline, et <strong>Iso Fusion</strong> 2 kg, une whey isolate listée en Cookies et Vanilla. Enfin, un pré-workout : <strong>Born Rage Original</strong>. Une seule de ces fiches publie aujourd’hui un tableau nutritionnel transcrit de l’étiquette, celle du Mass Gainer Créatine ; pour les cinq autres, c’est l’emballage qui fait foi. La grille ci-dessus indique le prix et la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit Eric Favre choisir ?",
    howToChooseBody:
      "<p>La première question est calorique. <strong>Mass Gainer Créatine</strong> 7 kg est la référence la mieux documentée : en arôme Cookie, l’étiquette transcrite sur notre fiche déclare une portion de 140 g apportant 549 kcal, 98 g de glucides dont 64 g de sucres, 31 g de protéines, 3,8 g de lipides et 2,5 g de créatine, pour 50 portions par sac. C’est un produit fait pour augmenter l’apport calorique, pas seulement pour compléter les protéines ; si vous prenez déjà une créatine à part, comptez ces 2,5 g dans votre total. <strong>Mass Gainer Zero</strong> 7 kg vise le même objectif, en Vanilla ou Pistache, mais sa fiche ne publie pas de tableau : les valeurs sont celles du sac. Le <strong>Pack Prise de Masse</strong> ajoute une créatine et un shaker à un gainer que sa fiche dit déjà enrichi en créatine, sans en donner la quantité : lisez les deux étiquettes avant de cumuler.</p><p>Si votre alimentation couvre déjà les calories, le choix se fait entre les deux protéines. <strong>Protein Vegan</strong> 1,5 kg est l’option sans protéines laitières, présentée comme tri-source et annoncée sans lactose ni gluten ; <strong>Iso Fusion</strong> 2 kg est une whey isolate, donc issue du lait. Aucune des deux n’a de tableau transcrit sur notre fiche : l’étiquette du pot est la référence pour les grammes par dose. <strong>Born Rage Original</strong>, enfin, est un pré-workout à prendre 20 à 30 minutes avant la séance, les jours d’entraînement ; sa composition n’est pas reprise sur la fiche, vérifiez donc la caféine et les stimulants sur l’étiquette avant la première prise.</p>",
    faqs: [
      {
        question: "Quels produits Eric Favre sont vendus sur Protein.tn ?",
        answer:
          "Six références : les gainers Mass Gainer Créatine 7 kg (Cookies) et Mass Gainer Zero 7 kg (Vanilla, Pistache), le Pack Prise de Masse, la protéine végétale Protein Vegan 1,5 kg (Vanilla), la whey isolate Iso Fusion 2 kg (Cookies, Vanilla) et le pré-workout Born Rage Original. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Que contient une portion de Mass Gainer Créatine 7 kg ?",
        answer:
          "Sur le sac de 7 kg en arôme Cookie, l’étiquette transcrite sur notre fiche déclare une portion de 140 g apportant 549 kcal, 98 g de glucides dont 64 g de sucres, 31 g de protéines, 3,8 g de lipides dont 2,2 g d’acides gras saturés, 0,3 g de sel et 2,5 g de créatine, soit 50 portions par sac. Le produit contient du lait et peut contenir des traces de gluten, œufs, sésame, fruits à coque, céleri et sulfites.",
      },
      {
        question: "Quelle différence entre Mass Gainer Créatine et Mass Gainer Zero ?",
        answer:
          "Les deux sont des gainers en sac de 7 kg. Mass Gainer Créatine, référencé en arôme Cookies, contient 2,5 g de créatine par portion de 140 g selon son étiquette et publie son tableau complet sur notre fiche. Mass Gainer Zero est proposé en Vanilla et Pistache ; sa fiche décrit un mélange de glucides et de protéines laitières mais ne publie pas encore de tableau : l’étiquette du sac fait foi.",
      },
      {
        question: "Protein Vegan ou Iso Fusion : laquelle choisir ?",
        answer:
          "Elles ne partent pas de la même source. Protein Vegan 1,5 kg est une protéine végétale, présentée comme associant pois, riz et spiruline et annoncée sans lactose ni gluten. Iso Fusion 2 kg est une whey isolate, issue du lait. Si vous évitez les produits laitiers, la première est la seule des deux à regarder ; les valeurs par dose figurent sur l’étiquette de chaque pot.",
      },
      {
        question: "Que contient le Pack Prise de Masse ?",
        answer:
          "Trois produits : un Hard Mass Gainer 7 kg, une Gold Creatine (créatine monohydrate micronisée) et un Shaker Kong de 700 ml avec grille anti-grumeaux. Selon la fiche, la matrice protéique du gainer associe lactosérum, caséine et œuf : il contient donc du lait et de l’œuf. Le gainer étant déjà enrichi en créatine, additionnez les deux étiquettes avant de prendre la Gold Creatine en plus.",
      },
      {
        question: "Comment commander Eric Favre en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "mass-gainers", name: "Mass gainers : comparer les marques", url: "/mass-gainers" },
      { slug: "glucides", name: "Le rayon glucides", url: "/glucides" },
      { slug: "proteines-vegetales", name: "Protéines végétales : voir le rayon", url: "/proteines-vegetales" },
      { slug: "pre-workout", name: "Autres pré-workouts du catalogue", url: "/pre-workout" },
      { slug: "brands", name: "Comparer Eric Favre aux autres marques", url: "/brands" },
    ],
  },
  'zumub': {
    metaTitle: "Zumub Tunisie | Zinc 100 comprimés et Omega 3 90 caps",
    metaDescription:
      "Zumub sur Protein.tn : Zinc en boîte de 100 comprimés, à 17,5 mg de zinc (citrate) par comprimé selon l’étiquette, et Omega 3 en boîte de 90 capsules.",
    h1: "Zumub Tunisie : zinc en comprimés et oméga 3 en capsules",
    introHtml:
      "<p>La sélection <strong>Zumub</strong> de Protein.tn tient en deux références, toutes deux rangées dans le rayon santé et vitalité et toutes deux à prise quotidienne. Le <strong>Zinc</strong> est vendu en boîte de <strong>100 comprimés</strong> et classé au rayon zinc. C’est la référence la mieux documentée, puisque l’étiquette du fabricant est transcrite sur notre fiche : une portion d’un comprimé par jour, de préférence au cours d’un repas, et 100 portions par boîte. L’<strong>Omega 3</strong> est proposé en boîte de <strong>90 capsules</strong> et classé au rayon oméga 3 ; sa fiche met en avant l’EPA et le DHA, mais n’en publie pas encore les quantités. La marque ne propose chez nous ni protéine, ni créatine, ni produit d’entraînement : cette page sert donc surtout à situer ces deux compléments du quotidien, puis à les comparer avec les références d’autres marques dans les rayons zinc et oméga 3. La grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Quel complément Zumub choisir ?",
    howToChooseBody:
      "<p>Les deux références ne répondent pas au même besoin, et ne s’opposent donc pas. Le <strong>Zinc 100 comprimés</strong> apporte, selon l’étiquette transcrite sur notre fiche, 17,5 mg de zinc sous forme de citrate par comprimé, soit 175 % des apports de référence pour un adulte, à raison d’un comprimé par jour. Ce chiffre compte si vous prenez déjà un multivitaminé ou un ZMA : additionnez le zinc des deux étiquettes avant de cumuler, et ne dépassez pas la dose journalière recommandée. L’étiquette signale des traces possibles de fruits à coque, gluten, lait, poisson, crustacés et soja, et le produit est déconseillé aux femmes enceintes ou allaitantes sauf avis d’un professionnel de santé.</p><p>L’<strong>Omega 3 90 caps</strong> relève d’une autre logique : ce sont des acides gras, pas un minéral. Sa fiche ne publie ni la quantité d’EPA et de DHA par capsule, ni le nombre de capsules par jour : c’est l’étiquette de la boîte qui fait foi. C’est aussi elle qui permet de comparer avec les autres oméga 3 du rayon, en ramenant l’EPA et le DHA à la dose journalière plutôt qu’à la capsule. La durée couverte par une boîte de 90 dépend de ce nombre de capsules par jour. En cas de traitement en cours, demandez l’avis d’un professionnel de santé avant de commencer.</p>",
    faqs: [
      {
        question: "Quels produits Zumub sont vendus sur Protein.tn ?",
        answer:
          "Deux références : le Zinc en boîte de 100 comprimés, au rayon zinc, et l’Omega 3 en boîte de 90 capsules, au rayon oméga 3. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Combien de zinc contient un comprimé Zumub ?",
        answer:
          "Selon l’étiquette transcrite sur notre fiche, un comprimé apporte 17,5 mg de zinc sous forme de citrate, soit 175 % des apports de référence pour un adulte. La dose indiquée est d’un comprimé par jour, de préférence au cours d’un repas ; la boîte contient 100 portions.",
      },
      {
        question: "Le zinc Zumub se cumule-t-il avec un multivitaminé ?",
        answer:
          "Vérifiez d’abord si votre multivitaminé ou votre ZMA contient déjà du zinc : un seul comprimé Zumub couvre 175 % des apports de référence. Additionnez les deux étiquettes et ne dépassez pas la dose journalière recommandée.",
      },
      {
        question: "Combien d’EPA et de DHA dans l’Omega 3 Zumub ?",
        answer:
          "Notre fiche met en avant l’EPA et le DHA sans en publier les quantités. Le tableau nutritionnel imprimé sur la boîte donne l’apport par capsule et par dose journalière : c’est lui qui fait foi, et c’est sur cette base qu’il faut le comparer à d’autres oméga 3.",
      },
      {
        question: "Comment commander Zumub en Tunisie ?",
        answer:
          "Choisissez la référence disponible, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "zinc", name: "Comparer les compléments de zinc", url: "/zinc" },
      { slug: "omega-3", name: "Oméga 3 : comparer les marques", url: "/omega-3" },
      { slug: "vitamines", name: "Vitamines et minéraux : tout le rayon", url: "/vitamines" },
      { slug: "brands", name: "Comparer Zumub aux autres marques", url: "/brands" },
    ],
  },
  'quamtrax': {
    metaTitle: "Quamtrax Tunisie | Creatine Monohydrate & Pure Creatine",
    metaDescription:
      "Quamtrax sur Protein.tn : Creatine Monohydrate en pot de 500 g et Pure Creatine en 300 g, deux créatines monohydrate présentées sans additifs sur leurs fiches.",
    h1: "Quamtrax Tunisie : créatine monohydrate en 500 g et 300 g",
    introHtml:
      "<p>La marque <strong>Quamtrax</strong> est présente sur Protein.tn avec deux références, toutes deux au rayon créatine. <strong>Creatine Monohydrate</strong> en pot de <strong>500 g</strong> est présentée sur sa fiche comme une créatine 100 % monohydrate, sans additifs ni conservateurs. <strong>Pure Creatine</strong> en <strong>300 g</strong> est décrite, elle aussi, comme une créatine monohydrate pure, sans additifs. Aucune protéine, aucun gainer, aucun pré-workout : la page se résume à un seul ingrédient en deux contenances, sans arôme mentionné sur l’une ou l’autre fiche. Aucune des deux ne publie encore de tableau transcrit de l’étiquette — ni la portion, ni le nombre de doses par pot — et c’est donc l’étiquette Quamtrax qui fait foi pour la dose journalière. La grille ci-dessus affiche le prix et la disponibilité de chacune des deux références ; pour comparer avec d’autres marques de créatine, en poudre neutre ou aromatisée, en pot plus petit ou plus grand, le rayon créatine reste le bon point de départ.</p>",
    howToChooseTitle: "Quelle créatine Quamtrax choisir ?",
    howToChooseBody:
      "<p>Les deux références contiennent le même ingrédient selon leurs fiches : de la créatine monohydrate, présentée sans additifs. Le choix entre <strong>500 g</strong> et <strong>300 g</strong> n’est donc pas une question de formule mais de durée : à dose journalière égale, le grand pot couvre simplement une période plus longue. Pour connaître cette durée, divisez le poids net par la portion indiquée sur l’étiquette ; nos fiches ne transcrivent pas encore cette portion, et nous n’avançons aucun chiffre à sa place. Comparez ensuite le prix affiché des deux pots sur cette page.</p><p>Côté usage, la fiche du pot de 500 g renvoie au mode d’emploi de l’étiquette et rappelle de ne pas dépasser la dose journalière ; la prendre chaque jour au même moment aide surtout à ne pas l’oublier. La créatine se prend indépendamment des protéines : si vous utilisez déjà un gainer ou un pré-workout qui en contient, additionnez les quantités des deux étiquettes. En cas de grossesse, de problème de santé ou de prise de médicaments, demandez l’avis d’un professionnel de santé avant de commencer.</p>",
    faqs: [
      {
        question: "Quels produits Quamtrax sont vendus sur Protein.tn ?",
        answer:
          "Deux créatines : Creatine Monohydrate en pot de 500 g et Pure Creatine en 300 g, toutes deux au rayon créatine. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Que contient la créatine Quamtrax ?",
        answer:
          "Selon sa fiche, la Creatine Monohydrate 500 g est une créatine 100 % monohydrate, présentée sans additifs ni conservateurs. La Pure Creatine 300 g est décrite comme une créatine monohydrate pure, sans additifs. La liste d’ingrédients exacte est imprimée sur l’étiquette de chaque pot.",
      },
      {
        question: "Pot de 500 g ou de 300 g : quelle différence ?",
        answer:
          "Sur le plan de la composition annoncée, aucune : les deux fiches décrivent une créatine monohydrate sans additifs. À dose journalière égale, le pot de 500 g couvre une période plus longue. Comparez le prix affiché des deux formats sur cette page pour décider.",
      },
      {
        question: "Quelle dose de créatine Quamtrax prendre chaque jour ?",
        answer:
          "La portion n’est pas transcrite sur notre fiche : suivez la dose journalière indiquée sur l’étiquette Quamtrax et ne la dépassez pas. Pour savoir combien de temps dure le pot, divisez son poids net par cette portion.",
      },
      {
        question: "Comment commander Quamtrax en Tunisie ?",
        answer:
          "Choisissez le format disponible, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "creatine", name: "Autres créatines monohydrate du catalogue", url: "/creatine" },
      { slug: "performance", name: "Compléments performance : tout le rayon", url: "/performance" },
      { slug: "brands", name: "Comparer Quamtrax aux autres marques", url: "/brands" },
    ],
  },
  'scenit-nutrition': {
    metaTitle: "Scenit Nutrition Tunisie | Tantor Whey, Instant Mass, EAA",
    metaDescription:
      "Scenit Nutrition en Tunisie : Tantor Whey 908 g et 2,267 kg, gainers Instant Real Mass 2,72 kg et Instant Mass 7 kg. Dès {prixMin} DT, {nbEnStock} produits en stock.",
    h1: "Scenit Nutrition Tunisie : whey Tantor, gainers Instant Mass et EAA",
    introHtml:
      "<p>La gamme <strong>Scenit Nutrition en Tunisie</strong> compte 14 références sur Protein.tn, réparties sur douze rayons : c’est l’une des plus dispersées du catalogue, et elle se lit mieux par usage. Les protéines : <strong>Tantor Whey Protein</strong> en 908 g (arôme Fraise) et en 2,267 kg. La prise de masse : deux gainers, <strong>Instant Real Mass</strong> 2,72 kg (arôme Chocolat), classé en mass gainers, et <strong>Instant Mass</strong> 7 kg, classé en gainers protéinés. Les acides aminés : <strong>EAA Master Amino</strong> 390 g (arôme Fruit Punch), <strong>Elite Arginine</strong> en 120 capsules, deux BCAA — <strong>BCAA Gluta</strong> 500 g et <strong>BCAA 12.000</strong> 457 g — et une <strong>Beta Alanine</strong> 300 g (arôme Fraise). S’y ajoutent <strong>Best Creatine</strong> 500 g, <strong>Best Collagen Premium</strong> 350 g, le multivitamines <strong>Multi Vita+</strong> en 120 capsules, un <strong>Omega 3</strong> et le <strong>T9 Testo Booster</strong> en 120 gélules. Chaque format est une fiche distincte : la grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Quel produit Scenit Nutrition choisir ?",
    howToChooseBody:
      "<p>Aucune des 14 fiches Scenit Nutrition de notre catalogue ne publie de tableau de valeurs transcrit. Aucun chiffre par portion n’est donc avancé ici : pour la dose, les protéines et les calories, l’étiquette du pot reçu est la seule référence. Le choix se fait par besoin.</p><ul><li><strong>Il vous manque des protéines, pas des calories</strong> : <strong>Tantor Whey Protein</strong>, une protéine de lactosérum, donc issue du lait. Le 908 g et le 2,267 kg portent le même nom ; à dose égale, seule la durée couverte change, et la décision est budgétaire.</li><li><strong>Vous n’arrivez pas à manger assez</strong> : un gainer. <strong>Instant Real Mass</strong> 2,72 kg se prête à un premier essai, <strong>Instant Mass</strong> 7 kg couvre une longue période. Nos fiches décrivent les deux comme enrichis en créatine : tenez-en compte avant d’y ajouter <strong>Best Creatine</strong> 500 g. Celle du 7 kg mentionne aussi des protéines d’œuf et de la gelée royale, à vérifier en cas d’allergie.</li><li><strong>Autour de la séance</strong> : <strong>EAA Master Amino</strong> 390 g réunit les neuf acides aminés essentiels, quand les BCAA n’en contiennent que trois. Ni l’un ni l’autre ne remplace une whey, et la fiche des EAA ne mentionne pas de caféine : ce n’est pas un pré-workout.</li><li><strong>Au quotidien</strong> : <strong>Multi Vita+</strong>, <strong>Best Collagen Premium</strong> et <strong>Omega 3</strong> relèvent d’un usage régulier, sans lien avec l’objectif de la séance. Le <strong>T9 Testo Booster</strong> associe notamment acide D-aspartique, tribulus, maca et ginseng ; sa fiche précise qu’il n’est destiné ni aux femmes ni aux enfants.</li></ul>",
    faqs: [
      {
        question: "Quels produits Scenit Nutrition sont vendus sur Protein.tn ?",
        answer:
          "Quatorze références : Tantor Whey Protein en 908 g et 2,267 kg, les gainers Instant Real Mass 2,72 kg et Instant Mass 7 kg, EAA Master Amino 390 g, Elite Arginine 120 capsules, BCAA Gluta 500 g, BCAA 12.000 457 g, Beta Alanine 300 g, Best Creatine 500 g, Best Collagen Premium 350 g, Multi Vita+ 120 capsules, Omega 3 et T9 Testo Booster 120 gélules. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Quelle différence entre Instant Real Mass et Instant Mass ?",
        answer:
          "Ce sont deux gainers, rangés dans deux rayons différents du site : Instant Real Mass 2,72 kg, référencé en arôme Chocolat, est classé en mass gainers ; Instant Mass 7 kg est classé en gainers protéinés. Nos fiches décrivent l’un et l’autre comme enrichis en créatine, et celle du 7 kg mentionne en plus des protéines d’œuf et de la gelée royale. Aucune des deux ne publie de tableau de valeurs transcrit : comparez les étiquettes des sacs pour les calories et les protéines par portion.",
      },
      {
        question: "Tantor Whey Protein : 908 g ou 2,267 kg ?",
        answer:
          "Les deux formats portent le même nom de produit et sont classés en whey protéine ; le 908 g est référencé en arôme Fraise. À dose journalière égale, le 2,267 kg couvre simplement une période plus longue. Comparez le prix affiché des deux formats sur cette page : la décision est budgétaire. Il s’agit d’une protéine de lactosérum, donc issue du lait.",
      },
      {
        question: "Combien de protéines dans une dose de Tantor Whey Protein ?",
        answer:
          "Notre fiche ne publie pas encore de tableau de valeurs transcrit pour cette référence, et nous n’avançons donc aucun chiffre ici. La taille de la dose et sa teneur en protéines figurent sur l’étiquette du pot que vous recevez, et elles peuvent varier d’un arôme à l’autre.",
      },
      {
        question: "EAA Master Amino ou BCAA Scenit : que choisir ?",
        answer:
          "Les EAA réunissent les neuf acides aminés essentiels, les BCAA trois d’entre eux seulement : leucine, isoleucine et valine. EAA Master Amino est proposé en 390 g, arôme Fruit Punch ; côté BCAA, la marque est référencée avec BCAA Gluta 500 g, qui associe BCAA et glutamine, et BCAA 12.000 457 g. Tous se boivent autour de l’entraînement et complètent un apport protéique déjà couvert ; aucun ne remplace une whey.",
      },
      {
        question: "Comment commander Scenit Nutrition en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "whey-proteine", name: "Whey protéines, autres formats et arômes", url: "/whey-proteine" },
      { slug: "mass-gainers", name: "Mass gainers d’autres marques", url: "/mass-gainers" },
      { slug: "gainers-proteines", name: "Gainers protéinés d’autres marques", url: "/gainers-proteines" },
      { slug: "eaa", name: "Le rayon EAA et ses formats", url: "/eaa" },
      { slug: "collagene", name: "Collagène et bien-être", url: "/collagene" },
      { slug: "brands", name: "Comparer Scenit Nutrition aux autres marques", url: "/brands" },
    ],
  },
  'muscle-care': {
    metaTitle: "Muscle Care Tunisie | Pro Vitamin, NAC & Magnésium",
    metaDescription:
      "Muscle Care en Tunisie : Pro Vitamin (vitamines et minéraux), NAC à la N-acétyl-cystéine et Magnesium + Calcium + Vitamin B6, trois boîtes de 90 comprimés.",
    h1: "Muscle Care Tunisie : multivitamines, NAC et magnésium-calcium",
    introHtml:
      "<p>La gamme <strong>Muscle Care en Tunisie</strong> tient en trois références, toutes en boîte de 90 comprimés et toutes tournées vers le quotidien plutôt que vers la séance : ni protéine, ni créatine, ni pré-workout. <strong>Pro Vitamin</strong> est un complexe de vitamines et de minéraux, classé en vitamines ; c’est la seule des trois dont l’étiquette est transcrite sur notre fiche. <strong>NAC</strong> apporte de la N-acétyl-cystéine, une forme dérivée de la cystéine, et se range en antioxydants. <strong>Magnesium + Calcium + Vitamin B6</strong> associe les trois nutriments de son nom et se trouve au rayon magnésium. Comme les trois boîtes contiennent le même nombre de comprimés, le choix ne porte pas sur le format mais sur la composition — et, si vous en combinez plusieurs, sur ce qu’elles apportent en double. La grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Quel complément Muscle Care choisir ?",
    howToChooseBody:
      "<p><strong>Pro Vitamin</strong> est la base la plus large. Sur la boîte de 90 comprimés, l’étiquette transcrite sur notre fiche déclare une portion de 2 comprimés, soit 45 portions par boîte, apportant notamment 80 mg de vitamine C, 10 µg de vitamine D, 2,5 µg de vitamine B12, 240 mg de calcium, 140 mg de magnésium, 14 mg de fer, 10 mg de zinc, 150 µg d’iode et 55 µg de sélénium, aux côtés des vitamines A, E et du groupe B. La présence d’iode est à signaler à votre médecin si vous suivez un traitement pour la thyroïde.</p><p>C’est ce tableau qui doit guider une association. <strong>Magnesium + Calcium + Vitamin B6</strong> apporte des minéraux que Pro Vitamin contient déjà : si vous prenez les deux, additionnez les étiquettes avant de fixer la dose. Notre fiche ne transcrit pas les teneurs par comprimé de ce produit, ni celles de la <strong>NAC</strong> : l’étiquette de la boîte est la référence pour ces deux-là. La NAC répond à une autre logique — c’est une source de cystéine, que l’organisme utilise pour fabriquer le glutathion — et elle ne se compare ni à une créatine ni à un pré-workout. En cas de grossesse, d’allaitement ou de traitement en cours, demandez l’avis d’un professionnel de santé avant de commencer.</p>",
    faqs: [
      {
        question: "Quels produits Muscle Care sont vendus sur Protein.tn ?",
        answer:
          "Trois références, toutes en boîte de 90 comprimés : Pro Vitamin, un complexe de vitamines et minéraux ; NAC, à base de N-acétyl-cystéine ; et Magnesium + Calcium + Vitamin B6. La marque n’est référencée ni en protéines, ni en créatine, ni en pré-workout. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Que contient une portion de Pro Vitamin ?",
        answer:
          "L’étiquette transcrite sur notre fiche indique une portion de 2 comprimés, soit 45 portions par boîte de 90. Elle apporte notamment 800 µg de vitamine A, 10 µg de vitamine D, 12 mg de vitamine E, 80 mg de vitamine C, 2,5 µg de vitamine B12, 240 mg de calcium, 140 mg de magnésium, 14 mg de fer, 10 mg de zinc, 150 µg d’iode et 55 µg de sélénium. En cas de différence, l’étiquette de votre boîte fait foi.",
      },
      {
        question: "Peut-on prendre Pro Vitamin avec Magnesium + Calcium + Vitamin B6 ?",
        answer:
          "Oui, mais en additionnant les apports. D’après l’étiquette transcrite sur notre fiche, la portion de 2 comprimés de Pro Vitamin contient déjà 140 mg de magnésium, 240 mg de calcium et 1,4 mg de vitamine B6. Les teneurs du second produit ne sont pas transcrites : lisez sa boîte avant de décider, et demandez conseil à un professionnel de santé en cas de doute.",
      },
      {
        question: "À quoi correspond la NAC Muscle Care ?",
        answer:
          "C’est de la N-acétyl-cystéine en boîte de 90 comprimés, classée en antioxydants sur Protein.tn. La NAC n’est pas du glutathion : elle fournit de la cystéine, que l’organisme peut utiliser pour le fabriquer. Notre fiche ne transcrit pas la teneur par comprimé ; la dose journalière, et donc la durée d’une boîte, se lisent sur l’étiquette.",
      },
      {
        question: "Comment commander Muscle Care en Tunisie ?",
        answer:
          "Choisissez la ou les références disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "vitamines", name: "Multivitamines et minéraux du quotidien", url: "/vitamines" },
      { slug: "magnesium", name: "Magnésium seul ou associé", url: "/magnesium" },
      { slug: "antioxydants", name: "NAC et autres antioxydants", url: "/antioxydants" },
      { slug: "brands", name: "Comparer Muscle Care aux autres marques", url: "/brands" },
    ],
  },
  'applied-nutrition': {
    metaTitle: "Applied Nutrition Tunisie | Amino Fuel EAA & Fat Burner",
    metaDescription:
      "Applied Nutrition sur Protein.tn : Amino Fuel EAA 390 g, Green Tea Fat Burner 90 capsules molles, Triple Fat Burner 30 capsules et Weekend Colon Flush.",
    h1: "Applied Nutrition Tunisie : Amino Fuel EAA et brûleurs au thé vert",
    introHtml:
      "<p>La gamme <strong>Applied Nutrition</strong> vendue en Tunisie par Protein.tn réunit quatre références qui ne répondent pas au même besoin. Une seule relève de l’entraînement : <strong>Amino Fuel EAA</strong>, une poudre d’acides aminés essentiels en pot de 390 g, classée en acides aminés. Les trois autres sont des capsules et des comprimés : <strong>Green Tea Fat Burner</strong> en 90 capsules molles et <strong>Maximum Strength Green Tea Triple Fat Burner</strong> en 30 capsules molles, tous deux classés en brûleurs de graisse, puis <strong>Weekend Colon Flush</strong> en 16 comprimés, classé en digestion et transit. La marque n’est référencée ni en whey, ni en créatine, ni en gainer : si vous cherchez une protéine, c’est dans un autre rayon qu’il faut regarder. Les deux brûleurs contiennent de la caféine selon leurs fiches, ce qui compte si vous prenez déjà du café ou un pré-workout. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit Applied Nutrition choisir ?",
    howToChooseBody:
      "<p>Chaque référence occupe un rayon différent : le choix se fait donc d’abord par besoin. <strong>Amino Fuel EAA</strong> 390 g se boit autour de la séance ; les EAA réunissent les neuf acides aminés essentiels, là où des BCAA n’en apportent que trois. Il complète un apport protéique déjà couvert par l’alimentation ou par une whey, il ne le remplace pas. Notre fiche publie un tableau de valeurs, mais il ne contient à ce jour qu’une ligne « Acides aminés » sans quantité : la dose et le nombre de portions sont à lire sur l’étiquette du pot.</p><p>Les deux brûleurs se distinguent par leur formule et leur contenance. D’après nos fiches, <strong>Green Tea Fat Burner</strong> (90 capsules molles) associe un extrait de thé vert concentré à de la caféine, tandis que <strong>Maximum Strength Green Tea Triple Fat Burner</strong> (30 capsules molles) combine trois extraits de thé — vert, blanc et noir — avec de la caféine également. Leurs fiches les présentent en complément d’un régime hypocalorique et d’une activité physique, pas à leur place ; elles déconseillent la prise du soir si la caféine gêne le sommeil et indiquent la présence de soja dans les ingrédients. <strong>Weekend Colon Flush</strong> (16 comprimés) est une formule de plantes classée en digestion et transit, dont le mode d’emploi s’étale sur trois jours : suivez strictement l’étiquette. Aucune valeur par portion n’est reprise ici pour ces trois références. En cas de traitement, de grossesse ou de problème de santé, demandez l’avis d’un professionnel avant de commencer.</p>",
    faqs: [
      {
        question: "Quels produits Applied Nutrition sont vendus sur Protein.tn ?",
        answer:
          "Quatre références : Amino Fuel EAA en pot de 390 g, Green Tea Fat Burner en 90 capsules molles, Maximum Strength Green Tea Triple Fat Burner en 30 capsules molles et Weekend Colon Flush en 16 comprimés. La marque n’est référencée ni en protéines, ni en créatine, ni en gainer. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Amino Fuel EAA remplace-t-il une whey ?",
        answer:
          "Non. Les EAA apportent les neuf acides aminés essentiels et se boivent autour de l’entraînement ; une whey sert à compléter les protéines de la journée. Les deux peuvent s’utiliser ensemble, chacun à son moment. Notre fiche ne mentionne pas de caféine pour Amino Fuel EAA : ce n’est pas un pré-workout.",
      },
      {
        question: "Combien de portions contient le pot d’Amino Fuel EAA 390 g ?",
        answer:
          "Notre fiche ne le précise pas encore : son tableau de valeurs ne comporte qu’une ligne « Acides aminés » sans quantité. Le nombre de portions et la dose par prise sont imprimés sur l’emballage Applied Nutrition, qui fait foi.",
      },
      {
        question: "Quelle différence entre Green Tea Fat Burner et Green Tea Triple Fat Burner ?",
        answer:
          "Green Tea Fat Burner, en 90 capsules molles, repose sur un extrait de thé vert associé à de la caféine. Maximum Strength Green Tea Triple Fat Burner, en 30 capsules molles, combine trois extraits de thé — vert, blanc et noir — avec de la caféine, et sa fiche précise qu’il n’est pas destiné aux moins de 18 ans. Les deux se prennent pendant les repas selon leur mode d’emploi, en complément d’une alimentation adaptée et d’une activité physique.",
      },
      {
        question: "Ces brûleurs de graisse contiennent-ils de la caféine ?",
        answer:
          "Oui, d’après leurs fiches. Leur mode d’emploi recommande de ne pas les prendre le soir si la caféine vous empêche de dormir, et de limiter les autres sources de caféine pendant leur utilisation — café, thé, pré-workout. Lisez l’étiquette pour la teneur exacte avant la première prise.",
      },
      {
        question: "Comment commander Applied Nutrition en Tunisie ?",
        answer:
          "Choisissez la ou les références disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "acides-amines", name: "Acides aminés : EAA, BCAA et glutamine", url: "/acides-amines" },
      { slug: "bruleurs-de-graisse", name: "Brûleurs de graisse : comparer les formules", url: "/bruleurs-de-graisse" },
      { slug: "perte-de-poids", name: "Le rayon perte de poids", url: "/perte-de-poids" },
      { slug: "brands", name: "Comparer Applied Nutrition aux autres marques", url: "/brands" },
    ],
  },
  'musclepharm': {
    metaTitle: "MusclePharm Tunisie | Combat Whey, Assault & Wreckage",
    metaDescription:
      "MusclePharm en Tunisie : Combat 100% Whey 2,24 et 2,27 kg, Combat Protein 1,84 et 1,9 kg, Clear-ISO, pré-workouts Assault 344 g et Wreckage 440 g.",
    h1: "MusclePharm Tunisie : protéines Combat, Clear-ISO et pré-workouts",
    introHtml:
      "<p>Dix-sept références portent le nom <strong>MusclePharm</strong> sur Protein.tn, et elles se répartissent en quatre blocs. Les protéines d’abord, en trois gammes distinctes : <strong>Combat 100% Whey</strong> en Strawberry 2,24 kg, Chocolate Milk 2,27 kg et Vanilla Ice Cream 2,24 kg, classée en whey protéine ; <strong>Combat Protein</strong> en Chocolate Milk 1,9 kg, Vanilla Ice Cream 1,84 kg et Horchata 1,84 kg ; et <strong>Pro Series Clear-ISO</strong> en Sour Peach Rings et Cherry Slush, 1,14 lb chacun — ces deux dernières gammes étant classées en protéines multi-sources. Les pré-workouts ensuite : <strong>Assault</strong> en 344 g (Blue Raspberry, Watermelon) et <strong>Pro Series Wreckage</strong> en 440 g (Sour Berry, Sour Peach Rings, Cherry Slush). Puis <strong>Select L-Carnitine 3000</strong> en flacon de 480 ml (Blue Raspberry) et la barre <strong>Combat Ready Protein Bar</strong> de 54 g (Chocolate Peanut Butter Cup). Enfin deux compléments du quotidien, <strong>Essentials Multi-V+</strong> en 90 comprimés et <strong>Essentials Fish Oil</strong> en 60 capsules molles. Chaque arôme est une fiche à part : la grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Quel produit MusclePharm choisir ?",
    howToChooseBody:
      "<p>Sur la partie protéines, les trois gammes ne sont pas interchangeables. D’après nos fiches, <strong>Combat 100% Whey</strong> associe isolat et concentré de lactosérum : c’est la whey polyvalente de la marque. <strong>Combat Protein</strong> est un mélange de cinq protéines — hydrolysat, isolat et concentré de lactosérum, albumine d’œuf et concentré de protéines de lait —, d’où son classement en protéines multi-sources ; la présence d’œuf compte en cas d’allergie. <strong>Pro Series Clear-ISO</strong> est décrite comme un isolat de lactosérum à préparer en boisson, et son nom annonce une boisson claire plutôt qu’un shake lacté : le choix se joue sur la texture et sur des arômes fruités. Aucune de ces fiches ne publie de tableau de valeurs transcrit : les teneurs par portion sont à lire sur l’étiquette du pot, et elles changent d’un arôme à l’autre.</p><p>Côté séance, <strong>Assault</strong> (344 g) et <strong>Pro Series Wreckage</strong> (440 g) sont deux pré-workouts ; nos fiches ne reprennent aucun chiffre de composition pour eux et renvoient à l’emballage d’origine, où figurent les ingrédients et la teneur en stimulants. Ils se prennent avant l’entraînement et ne se cumulent pas avec d’autres sources de caféine sans avoir lu cette étiquette. <strong>Select L-Carnitine 3000</strong> est un format liquide de 480 ml, <strong>Combat Ready Protein Bar</strong> une barre de 54 g à emporter, et les deux <strong>Essentials</strong> — multivitamines et huile de poisson — relèvent de l’usage quotidien, sans lien avec l’objectif de la séance.</p>",
    faqs: [
      {
        question: "Quels produits MusclePharm sont référencés sur Protein.tn ?",
        answer:
          "Dix-sept références portent le nom MusclePharm : Combat 100% Whey en trois arômes (2,24 et 2,27 kg), Combat Protein en trois arômes (1,84 et 1,9 kg), Pro Series Clear-ISO en deux arômes (1,14 lb), les pré-workouts Assault 344 g en deux arômes et Pro Series Wreckage 440 g en trois arômes, Select L-Carnitine 3000 en 480 ml, la Combat Ready Protein Bar de 54 g, Essentials Multi-V+ en 90 comprimés et Essentials Fish Oil en 60 capsules molles. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Quelle différence entre Combat 100% Whey et Combat Protein ?",
        answer:
          "D’après nos fiches, Combat 100% Whey associe isolat et concentré de lactosérum et se trouve en whey protéine. Combat Protein mélange cinq protéines — hydrolysat, isolat et concentré de lactosérum, albumine d’œuf et concentré de protéines de lait — et se trouve en protéines multi-sources ; elle contient donc de l’œuf, ce qui compte en cas d’allergie. Les formats diffèrent aussi : 2,24 et 2,27 kg pour la première, 1,84 et 1,9 kg pour la seconde.",
      },
      {
        question: "Qu’est-ce que Pro Series Clear-ISO ?",
        answer:
          "Une protéine à préparer en boisson (« Drink Mix »), décrite sur sa fiche comme un isolat de protéines de lactosérum et référencée en Sour Peach Rings et Cherry Slush, en 1,14 lb chacun. Son nom annonce une boisson claire plutôt qu’un shake lacté. Sur Protein.tn, elle est classée en protéines multi-sources.",
      },
      {
        question: "Assault ou Wreckage : quel pré-workout MusclePharm ?",
        answer:
          "Assault est référencé en 344 g (Blue Raspberry, Watermelon), Pro Series Wreckage en 440 g (Sour Berry, Sour Peach Rings, Cherry Slush). Nos fiches ne reprennent aucun chiffre de composition pour ces deux produits et renvoient à l’emballage d’origine. Comparez-y la liste des ingrédients et la teneur en stimulants, et évitez de les cumuler avec d’autres sources de caféine dans la journée.",
      },
      {
        question: "Combien de protéines dans une dose de Combat 100% Whey ?",
        answer:
          "Aucune fiche MusclePharm de notre catalogue ne publie de tableau de valeurs transcrit : nous ne citons donc aucun chiffre par portion ici. Les valeurs déclarées figurent sur l’étiquette du pot que vous recevez, et elles varient selon l’arôme et le format.",
      },
      {
        question: "Comment commander MusclePharm en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "whey-proteine", name: "Voir d’autres whey protéines", url: "/whey-proteine" },
      { slug: "proteines-multi-sources", name: "Mélanges de protéines multi-sources", url: "/proteines-multi-sources" },
      { slug: "pre-workout", name: "Pré-workouts : comparer les formules", url: "/pre-workout" },
      { slug: "barres-proteinees", name: "Barres protéinées à emporter", url: "/barres-proteinees" },
      { slug: "brands", name: "Comparer MusclePharm aux autres marques", url: "/brands" },
    ],
  },
  // Was 'scivation' until 28/09/2026: XTEND BCAA 420G (the only in-stock product of the line) moved from the
  // Scivation brand to XTEND, the name people search ("bcaa xtend tunisie"; House Nutrition ranks /brand/xtend
  // at #5 on "bcaa tunisie"). Scivation is XTEND's maker; the emptied Scivation page goes noindex on its own.
  'xtend': {
    metaTitle: "XTEND Tunisie | BCAA Xtend 420 g — Protein.tn",
    metaDescription:
      "XTEND (Scivation) sur Protein.tn : Xtend BCAA en pot de 420 g, arôme fruit de la passion, une poudre de BCAA au ratio 2:1:1 à boire pendant l’entraînement.",
    h1: "XTEND Tunisie : Xtend BCAA 420 g, une boisson de séance",
    introHtml:
      "<p>La marque <strong>XTEND</strong>, conçue par Scivation, compte une référence en stock sur Protein.tn : <strong>Xtend BCAA</strong>, en pot de 420 g, référencé en arôme fruit de la passion et classé au rayon BCAA. Il n’y a donc pas de gamme à départager ici — ni protéine, ni créatine, ni pré-workout de la marque au catalogue —, et cette page sert surtout à situer ce produit par rapport aux autres acides aminés du site. Notre fiche décrit Xtend comme une poudre de BCAA au ratio 2:1:1, c’est-à-dire deux parts de leucine pour une part d’isoleucine et une de valine, pensée comme une boisson à siroter pendant l’entraînement plutôt qu’à avaler en une fois. C’est ce qui le distingue d’une whey ou d’un gainer : il n’a pas vocation à couvrir les protéines de la journée. La grille ci-dessus affiche le prix et la disponibilité actuels de la référence ; les autres BCAA du catalogue se trouvent dans les rayons liés en bas de page.</p>",
    howToChooseTitle: "Xtend BCAA, EAA ou whey : que choisir ?",
    howToChooseBody:
      "<p>Avec une seule référence, la vraie question n’est pas « quel produit XTEND » mais « des BCAA répondent-ils à mon besoin ». Les <strong>BCAA</strong> regroupent trois acides aminés essentiels seulement — leucine, isoleucine et valine —, là où une <strong>whey</strong> ou des <strong>EAA</strong> apportent l’ensemble des acides aminés essentiels. <strong>Xtend BCAA</strong> se place donc en complément d’un apport protéique déjà couvert par l’alimentation ou par une whey, pas à sa place.</p><ul><li><strong>Vous manquez de protéines dans la journée</strong> : une whey est le choix cohérent ; Xtend ne la remplace pas.</li><li><strong>Vous cherchez une boisson de séance</strong> : c’est l’usage décrit sur notre fiche — une dose mélangée à de l’eau, bue par petites gorgées du début à la fin de l’entraînement.</li><li><strong>Vous hésitez avec des EAA</strong> : ils se boivent au même moment mais couvrent tous les acides aminés essentiels, pas seulement les trois ramifiés.</li></ul><p>Notre fiche ne publie pas de tableau de valeurs transcrit pour Xtend BCAA 420 g. La dose, la teneur en BCAA par portion, les édulcorants et les allergènes sont donc à lire sur l’étiquette du pot, qui fait foi ; les chiffres de gamme parfois cités pour Xtend varient selon les versions et les marchés, et nous n’en reprenons aucun ici.</p>",
    faqs: [
      {
        question: "Quels produits XTEND sont vendus sur Protein.tn ?",
        answer:
          "Xtend BCAA en pot de 420 g, référencé en arôme fruit de la passion et classé au rayon BCAA, est la référence en stock ; deux parfums de la gamme XTEND 7G sont disponibles sur commande. La grille de produits de cette page affiche son état réel.",
      },
      {
        question: "Que signifie le ratio 2:1:1 de Xtend BCAA ?",
        answer:
          "Il décrit la proportion des trois acides aminés ramifiés dans la poudre : deux parts de leucine pour une part d’isoleucine et une part de valine. C’est le ratio que notre fiche indique pour Xtend BCAA 420 g. D’autres BCAA du catalogue utilisent des ratios différents, que le rayon BCAA permet de comparer.",
      },
      {
        question: "Combien de BCAA dans une portion de Xtend ?",
        answer:
          "Notre fiche ne publie pas de tableau de valeurs transcrit pour ce pot, et nous n’avançons donc aucun chiffre ici. La taille de la dose et sa teneur en BCAA figurent sur l’étiquette du pot que vous recevez, qui fait foi.",
      },
      {
        question: "Xtend BCAA remplace-t-il une whey ?",
        answer:
          "Non. Les BCAA ne regroupent que la leucine, l’isoleucine et la valine, alors qu’une whey ou des EAA apportent l’ensemble des acides aminés essentiels. Xtend sert de boisson de séance et complète un apport protéique déjà couvert ; il ne le constitue pas.",
      },
      {
        question: "Comment commander XTEND en Tunisie ?",
        answer:
          "Ajoutez la référence au panier si elle est disponible, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "bcaa", name: "BCAA : comparer les ratios", url: "/bcaa" },
      { slug: "acides-amines", name: "Tous les acides aminés", url: "/acides-amines" },
      { slug: "performance", name: "Le rayon performance", url: "/performance" },
      { slug: "brands", name: "Comparer XTEND aux autres marques", url: "/brands" },
    ],
  },
});

export function getBrandSeoEntry(slug: string | undefined): BrandSeoEntry | null {
  if (!slug?.trim()) return null;
  return BRAND_SEO_CONFIG[slug.trim().toLowerCase()] ?? null;
}
