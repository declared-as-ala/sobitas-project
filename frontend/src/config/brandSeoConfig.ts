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
});

export function getBrandSeoEntry(slug: string | undefined): BrandSeoEntry | null {
  if (!slug?.trim()) return null;
  return BRAND_SEO_CONFIG[slug.trim().toLowerCase()] ?? null;
}
