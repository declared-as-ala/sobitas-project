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
 * ── ONLY BRANDS WHOSE PAGE ACTUALLY RESOLVES ─────────────────────────────────────────────────
 * A slug here only produces content if findBrandBySlug() resolves it, so entries exist only for
 * brands present in /all_brands. Checked on 08/09/2026 against all 582 rows: american-wolf,
 * impact-sport-nutrition, creapure, amino-complex and longevity(-plus) are not brands we carry —
 * their pages answer 404, and an entry for them would be dead config, not SEO.
 */
const BRAND_SEO_CONFIG: Readonly<Record<string, BrandSeoEntry>> = Object.freeze({
  dymatize: {
    metaTitle: 'Dymatize Tunisie | ISO100, Whey & Mass Gainer — Protein.tn',
    metaDescription:
      'Achetez Dymatize en Tunisie : ISO100 whey isolate, Elite Whey et Super Mass Gainer. Comparez les formats, prix et disponibilités, livraison 24–72h.',
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
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'gainers-proteines', name: 'Mass gainers en Tunisie', url: '/gainers-proteines' },
    ],
  },

  muscletech: {
    metaTitle: 'MuscleTech Tunisie | Nitro-Tech & Cell-Tech — Protein.tn',
    metaDescription:
      'MuscleTech en Tunisie : whey Nitro-Tech 1,81 kg, ISO Whey Clear, créatines Cell-Tech et Creatine Chews, EAA+ et pré-workout EuphoriQ. Formats et prix affichés.',
    h1: 'MuscleTech Tunisie : Nitro-Tech, Cell-Tech et acides aminés',
    introHtml:
      '<p>La gamme <strong>MuscleTech vendue en Tunisie</strong> se répartit en quatre familles. Les protéines d’abord : <strong>Nitro-Tech</strong> en 1,81 kg (Milk Chocolate, Cookies &amp; Cream, Vanilla Cream, Strawberry), <strong>ISO Whey Clear</strong> en 503 g et <strong>100% Grass-Fed Whey</strong> en 816 g. Les créatines ensuite, avec <strong>Cell-Tech</strong> 1,36 kg et les <strong>Creatine Chews</strong> à croquer. Puis les acides aminés, <strong>Amino Build</strong> et <strong>Platinum 100% EAA+</strong>, et le pré-workout <strong>EuphoriQ</strong>. S’y ajoutent Hydroxycut Hardcore Elite, Platinum MultiVitamin et Clear Muscle. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>',
    howToChooseTitle: 'Quel produit MuscleTech choisir ?',
    howToChooseBody:
      '<p><strong>Nitro-Tech</strong> est la protéine la plus complète de la gamme : sur le format 1,81 kg parfum Milk Chocolate, l’étiquette du fabricant déclare 30 g de protéines et 3 g de créatine monohydrate par portion de 45 g. C’est donc une poudre à la fois protéinée et créatinée, ce qui évite d’acheter les deux séparément. <strong>ISO Whey Clear</strong> (503 g) est un isolat qui se boit clair, plus proche d’un jus que d’une boisson lactée : le choix se joue surtout sur la texture. <strong>100% Grass-Fed Whey</strong> (816 g) répond, elle, à une exigence sur l’origine du lait.</p>' +
      '<p>Côté créatine, <strong>Cell-Tech</strong> (1,36 kg) est une poudre à diluer qui apporte aussi des glucides, tandis que les <strong>Creatine Chews</strong> sont des comprimés à croquer dosés à 1 g, sans eau ni shaker. <strong>Amino Build</strong> et <strong>Platinum 100% EAA+</strong> se placent autour de l’entraînement, une fois l’apport protéique de la journée déjà couvert par l’alimentation ou par une whey. Vérifiez toujours l’étiquette du parfum et du format retenus : les valeurs déclarées changent d’une saveur à l’autre.</p>',
    faqs: [
      {
        question: 'Quels produits MuscleTech sont disponibles en Tunisie ?',
        answer:
          'Protein.tn référence les protéines Nitro-Tech, ISO Whey Clear et 100% Grass-Fed Whey, les créatines Cell-Tech et Creatine Chews, les acides aminés Amino Build et Platinum 100% EAA+, le pré-workout EuphoriQ, ainsi que Hydroxycut Hardcore Elite, Platinum MultiVitamin et Clear Muscle. La grille de produits de cette page indique les références et les formats effectivement proposés.',
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
        question: 'Cell-Tech ou Creatine Chews : que choisir ?',
        answer:
          'Cell-Tech est une poudre de 1,36 kg à diluer qui apporte aussi des glucides. Les Creatine Chews sont des comprimés à croquer dosés à 1 g, qui ne demandent ni eau ni shaker et se transportent facilement. Le choix tient à votre routine et au format qui vous convient, pas à la créatine elle-même, qui est la même molécule dans les deux cas.',
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
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Créatine en Tunisie', url: '/creatine' },
      { slug: 'pre-workout', name: 'Pré-workout en Tunisie', url: '/pre-workout' },
    ],
  },

  ostrovit: {
    metaTitle: 'OstroVit Tunisie | Créatine, Whey & Vitamines — Protein.tn',
    metaDescription:
      'OstroVit en Tunisie : créatine monohydrate 300 g et 500 g, glutamine, EAA, 100% Whey Protein 2 kg, Delicious Gainer et vitamines. Formats et prix affichés.',
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
      { slug: 'creatine', name: 'Créatine en Tunisie', url: '/creatine' },
      { slug: 'glutamine', name: 'Glutamine en Tunisie', url: '/glutamine' },
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'vitamines', name: 'Vitamines en Tunisie', url: '/vitamines' },
    ],
  },

  'kevin-levrone': {
    metaTitle: 'Kevin Levrone Tunisie | Levro Mass, Gold Whey — Protein.tn',
    metaDescription:
      'Kevin Levrone en Tunisie : Levro Legendary Mass 6,8 kg et 3 kg, Gold Whey, Gold ISO, Gold Creatine, Shaaboom Pump et L-Carnitine 3000. Formats et prix affichés.',
    h1: 'Kevin Levrone Tunisie : Levro Legendary Mass et série Gold',
    introHtml:
      '<p>La gamme <strong>Kevin Levrone en Tunisie</strong> s’organise autour de la prise de masse et de la série Gold. Le gainer <strong>Levro Legendary Mass</strong> est proposé en 6,8 kg et en 3 kg. Les protéines de la série Gold suivent avec <strong>Gold Whey</strong> 2 kg et <strong>Gold ISO</strong> 2 kg. Complètent le catalogue la <strong>Gold Creatine</strong> 300 g, la <strong>Gold L-Arginine</strong> en 120 gélules, la <strong>Gold L-Carnitine 3000</strong> en flacon de 500 ml, le pré-workout <strong>Shaaboom Pump</strong> 385 g et le <strong>Gold Power Core Multivitamin</strong> en 120 comprimés. Un Pack Prise de Masse Pro regroupe plusieurs de ces références en une seule commande.</p>',
    howToChooseTitle: 'Quel produit Kevin Levrone choisir ?',
    howToChooseBody:
      '<p><strong>Levro Legendary Mass</strong> est le produit central de la marque, et c’est un gainer très calorique. Sur le sac de 6,8 kg, l’étiquette du fabricant déclare une portion de 200 g (4 doses) apportant 771 kcal, 42 g de protéines et 138 g de glucides, pour 34 portions par contenant. Il s’adresse donc aux personnes dont le point bloquant est la quantité de nourriture, pas à celles qui cherchent uniquement à compléter leurs protéines. Le format 3 kg reprend la même formule sur une durée plus courte.</p>' +
      '<p>Si votre alimentation couvre déjà les calories, <strong>Gold Whey</strong> 2 kg ou <strong>Gold ISO</strong> 2 kg sont les choix cohérents, le second étant construit sur un isolat. La <strong>Gold Creatine</strong> 300 g se prend indépendamment du reste et n’a pas à être associée à un parfum particulier. <strong>Shaaboom Pump</strong> 385 g est un pré-workout, à réserver aux séances où vous en ressentez le besoin plutôt qu’à un usage quotidien, et les <strong>L-Carnitine 3000</strong> en flacon de 500 ml sont des formats liquides prêts à doser. Vérifiez l’étiquette du format retenu avant de commander.</p>',
    faqs: [
      {
        question: 'Quels produits Kevin Levrone sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence le gainer Levro Legendary Mass en 6,8 kg et 3 kg, les protéines Gold Whey 2 kg et Gold ISO 2 kg, la Gold Creatine 300 g, la Gold L-Arginine 120 gélules, la Gold L-Carnitine 3000 en 500 ml, le pré-workout Shaaboom Pump 385 g et le Gold Power Core Multivitamin 120 comprimés, ainsi qu’un Pack Prise de Masse Pro.',
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
      { slug: 'mass-gainers', name: 'Mass gainers en Tunisie', url: '/mass-gainers' },
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Créatine en Tunisie', url: '/creatine' },
      { slug: 'pre-workout', name: 'Pré-workout en Tunisie', url: '/pre-workout' },
    ],
  },

  'optimum-nutrition': {
    metaTitle: 'Optimum Nutrition Tunisie | Whey Gold Standard — Protein.tn',
    metaDescription:
      'Optimum Nutrition en Tunisie : Gold Standard 100% Whey 2,27 kg, Platinum Hydro Whey, Serious Mass, Micronised Creatine, BCAA 5000 et Opti-Men. Prix affichés.',
    h1: 'Optimum Nutrition Tunisie : Gold Standard, Hydro Whey et Serious Mass',
    introHtml:
      '<p>La gamme <strong>Optimum Nutrition en Tunisie</strong> réunit les protéines <strong>Gold Standard 100% Whey</strong> en 2,27 kg (Double Rich Chocolate, Vanilla Ice Cream, Delicious Strawberry, Strawberry Banana, Rocky Road) et <strong>Platinum Hydro Whey</strong> en 820 g et 1,59 kg, le gainer <strong>Serious Mass</strong> 5,45 kg, la <strong>Micronised Creatine</strong> en 300 g et 317 g, les acides aminés <strong>Instantized BCAA 5000</strong> 345 g et <strong>Superior Amino 2222</strong> en 320 comprimés, ainsi que les multivitamines <strong>Opti-Men</strong> et <strong>Opti-Women</strong>. HMB et ZMA complètent le catalogue, aux côtés de packs qui regroupent plusieurs de ces références.</p>',
    howToChooseTitle: 'Quelle protéine Optimum Nutrition choisir ?',
    howToChooseBody:
      '<p><strong>Gold Standard 100% Whey</strong> est la référence de base de la marque : sur le format 2,27 kg parfum Double Rich Chocolate, l’étiquette du fabricant déclare 24 g de protéines, 1,6 g de glucides et 116 kcal par portion de 31 g. C’est une whey polyvalente, qui convient au complément protéique quotidien quel que soit l’objectif, et le choix se fait ensuite sur le parfum. <strong>Platinum Hydro Whey</strong> repose sur une whey hydrolysée et s’adresse aux sportifs qui privilégient une digestion rapide ; elle est proposée en 820 g et 1,59 kg.</p>' +
      '<p><strong>Serious Mass</strong> 5,45 kg est un gainer, pas une version renforcée de la whey : il apporte surtout des glucides et répond à une difficulté à atteindre l’apport calorique. La <strong>Micronised Creatine</strong> (300 g ou 317 g) est une créatine monohydrate sans arôme, à prendre indépendamment des protéines. <strong>Instantized BCAA 5000</strong> et <strong>Superior Amino 2222</strong> viennent après, une fois les protéines totales couvertes. Enfin, <strong>Opti-Men</strong> et <strong>Opti-Women</strong> sont des multivitamines quotidiennes et ne remplacent aucun des produits ci-dessus. Vérifiez l’étiquette du parfum et du format retenus.</p>',
    faqs: [
      {
        question: 'Quels produits Optimum Nutrition sont disponibles en Tunisie ?',
        answer:
          'Protein.tn référence la Gold Standard 100% Whey en 2,27 kg dans plusieurs parfums, la Platinum Hydro Whey en 820 g et 1,59 kg, le gainer Serious Mass 5,45 kg, la Micronised Creatine en 300 g et 317 g, l’Instantized BCAA 5000 345 g, le Superior Amino 2222 320 comprimés, les multivitamines Opti-Men et Opti-Women, ainsi que HMB et ZMA.',
      },
      {
        question: 'Combien de protéines dans une dose de Gold Standard 100% Whey ?',
        answer:
          'Sur le format 2,27 kg parfum Double Rich Chocolate, l’étiquette du fabricant déclare 24 g de protéines, 1,6 g de glucides dont 1 g de sucres, 1,4 g de matières grasses et 116 kcal pour une portion de 31 g. Le produit contient du lait et du soja. Les valeurs varient selon le parfum.',
      },
      {
        question: 'Quelle différence entre Gold Standard et Platinum Hydro Whey ?',
        answer:
          'Gold Standard 100% Whey est une whey polyvalente pour l’apport protéique quotidien. Platinum Hydro Whey est construite sur une whey hydrolysée, c’est-à-dire prédécoupée, et vise une digestion plus rapide. Elle est proposée en formats plus petits, 820 g et 1,59 kg, contre 2,27 kg pour la Gold Standard.',
      },
      {
        question: 'Gold Standard ou Serious Mass pour prendre du poids ?',
        answer:
          'Les deux ne répondent pas au même blocage. Si vous mangez assez mais manquez de protéines, la Gold Standard suffit. Si vous n’arrivez pas à atteindre votre apport calorique, Serious Mass apporte surtout des glucides en plus des protéines, dans un sac de 5,45 kg. Le point de départ reste votre alimentation.',
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
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'gainers-proteines', name: 'Mass gainers en Tunisie', url: '/gainers-proteines' },
      { slug: 'creatine', name: 'Créatine en Tunisie', url: '/creatine' },
      { slug: 'vitamines', name: 'Vitamines en Tunisie', url: '/vitamines' },
    ],
  },

  'biotech-usa': {
    metaTitle: 'BioTech USA Tunisie | Pure Whey & Iso Whey Zero — Protein.tn',
    metaDescription:
      'BioTech USA en Tunisie : 100% Pure Whey et Iso Whey Zero 2,27 kg, créatine 300 g, BCAA Zero, L-Arginine, Carbox et vitamines. Formats, prix et stock affichés.',
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
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Whey isolate en Tunisie', url: '/whey-isolate' },
      { slug: 'creatine', name: 'Créatine en Tunisie', url: '/creatine' },
      { slug: 'bcaa', name: 'BCAA en Tunisie', url: '/bcaa' },
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
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Whey isolate en Tunisie', url: '/whey-isolate' },
      { slug: 'creatine', name: 'Créatine en Tunisie', url: '/creatine' },
      { slug: 'mass-gainers', name: 'Mass gainers en Tunisie', url: '/mass-gainers' },
    ],
  },

  'real-pharm': {
    metaTitle: 'Real Pharm Tunisie | Whey, Isolate, Créatine — Protein.tn',
    metaDescription:
      'Real Pharm en Tunisie : Real Whey 100, Real Isolate 1,8 kg, Real Casein, Real Mass 6,8 kg, créatine 150 à 500 g, BCAA, EAA et pre-workout King Real 500 g.',
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
      { slug: 'whey-isolate', name: 'Whey isolate en Tunisie', url: '/whey-isolate' },
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Créatine en Tunisie', url: '/creatine' },
      { slug: 'pre-workout', name: 'Pre-workout en Tunisie', url: '/pre-workout' },
      { slug: 'bcaa', name: 'BCAA en Tunisie', url: '/bcaa' },
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
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Whey isolate en Tunisie', url: '/whey-isolate' },
      { slug: 'caseine', name: 'Caséine en Tunisie', url: '/caseine' },
      { slug: 'creatine', name: 'Créatine en Tunisie', url: '/creatine' },
      { slug: 'glutamine', name: 'Glutamine en Tunisie', url: '/glutamine' },
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
      { slug: 'vitamines', name: 'Vitamines en Tunisie', url: '/vitamines' },
    ],
  },

  'c4-cellucor': {
    metaTitle: 'C4 / Cellucor Tunisie | Pre-Workout, C4 Whey & Créatine',
    metaDescription:
      'C4 / Cellucor en Tunisie : C4 Original et C4 Ripped Sport, C4 Whey Protein en six versions, COR-Performance Creatine en cinq arômes, Max Test et brûleurs.',
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
      { slug: 'pre-workout', name: 'Pre-workout en Tunisie', url: '/pre-workout' },
      { slug: 'whey-proteine', name: 'Whey protéine en Tunisie', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Créatine en Tunisie', url: '/creatine' },
      { slug: 'bruleurs-de-graisse', name: 'Brûleurs de graisse en Tunisie', url: '/bruleurs-de-graisse' },
    ],
  },
});

export function getBrandSeoEntry(slug: string | undefined): BrandSeoEntry | null {
  if (!slug?.trim()) return null;
  return BRAND_SEO_CONFIG[slug.trim().toLowerCase()] ?? null;
}
