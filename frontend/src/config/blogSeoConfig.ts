/**
 * SEO overlay for target blog articles: FAQs + internal links with keyword anchors.
 * When an article slug matches, BlogSeoBlock renders FAQ section and "Lire aussi" links.
 * Create articles in CMS with these slugs to get full SEO benefit.
 *
 * ── TWO INVARIANTS THIS FILE IS CHECKED AGAINST ──────────────────────────────────────────────
 * 1. NO TWO LINKS TO THE SAME URL MAY SHARE ANCHOR TEXT — counting `openingLinkHtml`,
 *    `bodyLinkHtml` and `internalLinks` together, across every entry. Counted on 23/09/2026 over
 *    the 73 entries of the last committed version (8ac1410e, 22/09/2026): 190 links, 20 distinct
 *    (destination, anchor) pairs used more than once, and 106 links repeating a pair already
 *    used. The worst was "whey protein en Tunisie" pointing at /whey-proteine from 19 different
 *    entries, 23 occurrences in all. That is a footprint, not a link profile. The same count over
 *    this file today gives 194 links and 0 repeats; if you add an entry, use a wording nobody
 *    else uses. (An earlier draft of this comment said "101 repeats" and "20 different articles";
 *    neither figure reproduces.)
 * 2. NO HEADLINE, metaDescription OR FAQ ANSWER MAY STATE A DINAR PRICE, and none may claim a
 *    brand or a label is available unless you have just read it from
 *    admin.protein.tn/api/productsBySubCategoryId/<slug>. FAQ answers ship as FAQPage structured
 *    data and a `headline` becomes both the <title> and the visible H1, so the rule covers all
 *    three fields. It was written for FAQ answers alone, and a Creapure® headline went on
 *    shipping through that gap after the FAQ answers had been cleaned — hence the wording here.
 *    Two false prices were removed on 22/09/2026 and four brand/label claims on 23/09/2026.
 *    RE-VERIFIED 23/09/2026 against admin.protein.tn/api/productsBySubCategoryId/creatine
 *    (221 products returned, 8 of them with qte > 0 and rupture false): "BSN" matches zero
 *    products and "Creapure" matches zero products, but "MuscleTech Platinum Creatine" IS listed
 *    — PLATINUM CREATINE 400G - MUSCLETECH, id 505 — with qte 0 and rupture true. It is LISTED
 *    BUT OUT OF STOCK. Out of stock is enough to pull a name out of an availability answer;
 *    "absent from the catalogue" is a different, stronger claim, and writing it when the product
 *    is merely out of stock is the exact defect this invariant exists to stop. Prices and stock
 *    move; a method does not. Say how to compare, and link to the page that has the number.
 *
 *    Where to check, and one trap. "Creapure matches zero PRODUCTS" is a statement about the
 *    `products` array of that payload, and it stays true even though a Googlebot fetch of
 *    https://protein.tn/creatine on 23/09/2026 returns the string "Creapure" 31 times: those
 *    come from the CATEGORY's editorial copy and FAQ, which live in the admin CMS `seo` block
 *    (`long_bottom_html` + `faq`) and not in this repo. Read the `products` array, not the page
 *    text. NOTE FOR WHOEVER OWNS THE CMS: that same seo block still ships, in live FAQPage
 *    schema on /creatine, "disponible à partir de 29 DT" and "Les formats Creapure® ou les
 *    grandes quantités (1 kg) offrent le meilleur rapport qualité/prix". Read 23/09/2026: the
 *    cheapest in-stock creatine of any size is 70 DT, no product carries Creapure, and all
 *    eleven 1 kg listings have qte 0. It is the same defect as the ones cleaned out of this
 *    file, one page up, and it cannot be fixed from here.
 */
export interface BlogSeoEntry {
  /** Optional visible H1/title refresh. The URL remains unchanged to preserve accumulated signals. */
  headline?: string;
  /** Optional search snippet aligned with the refreshed article. */
  metaDescription?: string;
  /**
   * Contextual link paragraph APPENDED at the end of the article body; trusted editorial HTML.
   * No entry uses it since 23/09/2026 — the first anchor to a URL is the one that is weighed, so
   * a pillar link belongs in `openingLinkHtml`. Kept because blog/[slug]/page.tsx still renders
   * it and an article whose link genuinely belongs at the end is a legitimate future case.
   * Never set both on one entry: that ships two links to the same URL out of one article.
   */
  bodyLinkHtml?: string;
  /** Commercial pillar paragraph at the opening of the body, before product recommendations. */
  openingLinkHtml?: string;
  /** ISO date for a substantive editorial refresh reflected in Article schema. */
  dateModified?: string;
  /** Localized labels for non-French articles. */
  faqHeading?: string;
  linksHeading?: string;
  lang?: 'fr' | 'ar';
  /** FAQ for FAQPage schema and on-page accordion */
  faqs: Array<{ question: string; answer: string }>;
  /** Internal links to categories (anchor text = keyword for SEO) */
  internalLinks: Array<{ anchor: string; href: string }>;
}

/** Slug (from URL) → SEO config. Use normalized slug (lowercase, no accents). */
export const BLOG_SEO_CONFIG: Record<string, BlogSeoEntry> = {
  'creatine-a-quoi-ca-sert-et-pourquoi-en-prendre': {
    headline: "Créatine : à quoi ça sert et pourquoi en prendre ?",
    openingLinkHtml: "<p>Pour comparer les produits, les formats et les prix actuels, vous pouvez <a href=\"/creatine\">voir nos créatines disponibles en Tunisie</a>.</p>",
    dateModified: '2026-09-08',
    lang: 'fr',
    faqs: [],
    internalLinks: [{ anchor: 'créatine monohydrate en Tunisie', href: '/creatine' }],
  },
  'proteines-tunisiennes-tout-ce-que-vous-devez-savoir': {
    headline: "Protéines : sources alimentaires et compléments, les différences",
    openingLinkHtml: "<p>Pour choisir un produit et comparer les formats et les prix actuels, retrouvez notre sélection de <a href=\"/whey-proteine\">whey protein en Tunisie</a>.</p>",
    dateModified: '2026-09-08',
    lang: 'fr',
    faqs: [],
    internalLinks: [{ anchor: 'les whey protéine de Protein.tn', href: '/whey-proteine' }],
  },
  'protein-the-essential-guide-to-its-benefits-sources-and-role-in-health': {
    headline: "Protéines : leur rôle dans la nutrition et les sources alimentaires",
    openingLinkHtml: "<p>Côté compléments, <a href=\"/whey-proteine\">notre sélection de whey</a> réunit les formats et les prix actuels.</p>",
    dateModified: '2026-09-23',
    lang: 'fr',
    faqs: [],
    internalLinks: [{ anchor: 'whey protéine : le rayon complet', href: '/whey-proteine' }],
  },
  'whey-protein-et-entrainement-strategies-pour-des-gains-musculaires-optimaux-protein-tn': {
    headline: "Whey et entraînement : comment organiser ses apports en protéines",
    openingLinkHtml: "<p>Avant de caler vos prises autour des séances, voyez <a href=\"/whey-proteine\">les whey protéine en stock</a> et leurs formats.</p>",
    dateModified: '2026-09-23',
    lang: 'fr',
    faqs: [],
    internalLinks: [{ anchor: 'whey pour l’entraînement', href: '/whey-proteine' }],
  },
  'creatine-monohydrate-tunisie-guide-d-achat-bienfaits-et-meilleures-marques': {
    headline: "Créatine monohydrate : critères de choix et lecture des étiquettes",
    /**
     * P1, 08/09/2026 — THE POST OUTRANKS ITS OWN PILLAR AND HAS TO HAND THE QUERY BACK.
     *
     * `creatine monohydrate tunisie` (480 vol, KD 4): this article sits at 16 and `/creatine`,
     * the only page on the site that can sell the product, sits at 54. That is the cleanest
     * commercial-intent inversion in the SemRush TN export of 08/09/2026.
     *
     * So the pillar link opens the body — openingLinkHtml is PREPENDED to the article body in
     * blog/[slug]/page.tsx, it is NOT the "Lire aussi" footer block — and its anchor is now the
     * EXACT query rather than the paraphrase "créatine monohydrate en Tunisie" it carried before.
     * Google weighs the first anchor to a URL on a page; on this page that is this one.
     */
    openingLinkHtml: "<p><strong>Acheter en ligne :</strong> tous les formats, les marques et les prix du jour sont sur notre page <a href=\"/creatine\">créatine monohydrate Tunisie</a> — livraison partout en Tunisie.</p>",
    dateModified: '2026-09-08',
    lang: 'fr',
    faqs: [],
    // The "Lire aussi" anchor is deliberately NOT the exact query: the opening paragraph above
    // already hands /creatine that exact anchor, and it is the one Google weighs. A second
    // identical anchor to the same URL from the same page adds a footprint, not a signal.
    internalLinks: [{ anchor: 'les créatines monohydrate du catalogue', href: '/creatine' }],
  },
  'impact-whey-protein-de-myprotein-avis-avantages-et-mode-d-emploi': {
    metaDescription:
      'Impact Whey MyProtein : ce que vaut sa teneur en protéines, comment la doser, et comment elle se situe face aux autres whey vendues en Tunisie.',
    dateModified: '2026-09-08',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'les autres whey du catalogue', href: '/whey-proteine' },
      { anchor: 'catalogue de protéines', href: '/proteines' },
    ],
  },
  'iso-100-de-dymatize-la-whey-isolate-ultime-pour-les-sportifs': {
    metaDescription:
      'ISO 100 de Dymatize : pourquoi l’hydrolyse change la digestion, quand la prendre, et ce qui la distingue d’une whey concentrée classique.',
    dateModified: '2026-09-08',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'whey isolate en Tunisie', href: '/whey-isolate' },
      { anchor: 'toutes les whey protéine', href: '/whey-proteine' },
    ],
  },
  'cosmetiques-bio-decouvrez-les-meilleurs-produits-naturels-pour-votre-peau': {
    metaDescription:
      'Cosmétiques bio : ce que le label garantit vraiment, comment lire une liste INCI et repérer un produit naturel de qualité avant de commander.',
    dateModified: '2026-09-08',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'nos compléments protéinés', href: '/proteines' },
    ],
  },
  'parapharmacie-moins-cher-en-tunisie-ou-trouver-les-meilleurs-prix': {
    metaDescription:
      'Parapharmacie moins chère en Tunisie : comment comparer les offres en ligne, ce qu’il faut vérifier avant de commander et les rayons les plus demandés.',
    dateModified: '2026-09-08',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'vitamines et minéraux', href: '/vitamines' },
      { anchor: 'le rayon protéines', href: '/proteines' },
    ],
  },
  'equipements-cardio-tunisie': {
    metaDescription:
      'Équipements cardio en Tunisie : tapis, vélos et rameurs comparés selon l’espace, l’objectif et l’usage réel, avec les critères à vérifier avant d’acheter.',
    dateModified: '2026-09-08',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'équipements de sport en Tunisie', href: '/equipement' },
    ],
  },

  /*
   * 23/09/2026 — the four Arabic creatine articles get the same opening link to /creatine the
   * French ones have. They are not a separate audience for this purpose: GSC 28 d shows
   * /blog/ما هو أفضل كرياتين في تونس؟ holding 11 impressions of the LATIN query `creatine tunisie`
   * at position 9.9, ahead of /creatine itself at 64. An Arabic article that ranks on the head
   * term the category must own belongs in the same link graph, so it links up like the rest.
   * Anchors differ from one another and from every French anchor to /creatine.
   */
  'ما هي الأطعمة التي تحتوي على الكرياتين؟': {
    headline: 'ما هي الأطعمة التي تحتوي على الكرياتين؟ المصادر والكميات',
    metaDescription:
      'تعرف على أهم مصادر الكرياتين الطبيعية مثل اللحوم والأسماك، والفرق بينها وبين مكمل الكرياتين، مع إجابات واضحة قبل اختيار المنتج.',
    openingLinkHtml:
      '<p>إذا لم يكفِ الطعام وحده، يمكنك الاطلاع على <a href="/creatine">مكمل كرياتين بودرة</a> بأحجامه وأسعاره الحالية.</p>',
    dateModified: '2026-09-23',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن الكرياتين في الطعام',
    linksHeading: 'اقرأ أيضًا عن الكرياتين والبروتين',
    faqs: [
      {
        question: 'ما أهم المصادر الطبيعية للكرياتين؟',
        answer: 'يوجد الكرياتين طبيعيًا بصورة أساسية في اللحوم والأسماك. تختلف الكمية حسب نوع الغذاء وطريقة الطهي، لذلك لا توجد حصة واحدة ثابتة تصلح لكل المنتجات والأطباق.',
      },
      {
        question: 'هل يحتوي الحليب أو البيض على كمية كبيرة من الكرياتين؟',
        answer: 'يحتويان على كميات أقل بكثير من اللحوم والأسماك، لذلك لا يعدان من المصادر الرئيسية للكرياتين الغذائي.',
      },
      {
        question: 'هل الغذاء يغني دائمًا عن مكمل الكرياتين؟',
        answer: 'يعتمد ذلك على نظامك وهدفك. المكمل ليس ضروريًا للجميع، والطعام المتوازن هو الأساس. إذا كنت تعاني من حالة صحية أو تتناول أدوية فاستشر مختصًا قبل أي مكمل.',
      },
    ],
    internalLinks: [
      { anchor: 'مقارنة منتجات الكرياتين في تونس', href: '/creatine' },
      { anchor: 'دليل البروتين في تونس', href: '/proteines' },
      { anchor: 'أفضل مكملات البروتين حسب الهدف', href: '/blog/أفضل مكملات البروتين في تونس: كيف تختار المنتج المناسب لهدفك الرياضي؟' },
    ],
  },
  'ما هي فوائد وأضرار الكرياتين؟': {
    headline: 'فوائد وأضرار الكرياتين: ما الذي تقوله الأدلة؟',
    metaDescription:
      'شرح متوازن لفوائد الكرياتين وآثاره الجانبية والاحتياطات المهمة، ومتى يجب استشارة الطبيب قبل استخدام مكمل الكرياتين.',
    openingLinkHtml:
      '<p>الأنواع المتوفرة وأحجام العبوات والأسعار الحالية على صفحة <a href="/creatine">الكرياتين وأحجام العبوات</a>.</p>',
    dateModified: '2026-09-23',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن فوائد وأضرار الكرياتين',
    linksHeading: 'معلومات تساعدك قبل الشراء',
    faqs: [
      {
        question: 'ما أكثر فائدة مدروسة للكرياتين؟',
        answer: 'أكثر الأدلة تتعلق بدعم الأداء في الجهود القصيرة والعالية الشدة عند استخدامه مع تدريب مناسب. النتائج تختلف بين الأشخاص ولا يعوض المكمل التدريب أو التغذية.',
      },
      {
        question: 'هل يسبب الكرياتين احتباس الماء؟',
        answer: 'قد يزيد الماء داخل العضلات ويظهر تغير في الوزن لدى بعض المستخدمين. هذا يختلف عن احتباس السوائل المرضي، لكن أي تورم غير معتاد يستدعي التوقف وطلب نصيحة طبية.',
      },
      {
        question: 'من يجب أن يستشير الطبيب قبل تناول الكرياتين؟',
        answer: 'من لديه مرض كلوي أو حالة مزمنة، والحامل أو المرضع، والقاصر، ومن يتناول أدوية قد تؤثر في الكلى أو توازن السوائل ينبغي أن يستشير طبيبًا أولًا.',
      },
    ],
    internalLinks: [
      { anchor: 'أنواع الكرياتين وأحجامه المتوفرة', href: '/creatine' },
      { anchor: 'مصادر الكرياتين في الطعام', href: '/blog/ما هي الأطعمة التي تحتوي على الكرياتين؟' },
      { anchor: 'مكملات غذائية في تونس', href: '/proteines' },
    ],
  },
  'ما هي المكملات الغذائية؟ الشرح الكامل للمبتدئين': {
    headline: 'ما هي المكملات الغذائية؟ دليل مبسط للمبتدئين',
    metaDescription:
      'دليل مبسط لفهم المكملات الغذائية: أنواعها، قراءة الملصق، اختيار المنتج حسب الهدف، ومتى تحتاج إلى نصيحة طبيب أو مختص تغذية.',
    dateModified: '2026-08-31',
    lang: 'ar',
    faqHeading: 'أسئلة المبتدئين عن المكملات الغذائية',
    linksHeading: 'قارن الأنواع المتوفرة',
    faqs: [
      {
        question: 'هل المكمل الغذائي بديل عن الطعام؟',
        answer: 'لا. المكمل يكمل الاحتياج عندما لا يكفي الغذاء أو توجد حاجة محددة، لكنه لا يعوض نظامًا متوازنًا أو تشخيصًا طبيًا.',
      },
      {
        question: 'كيف أقرأ ملصق المكمل؟',
        answer: 'ابدأ بحجم الحصة وعدد الحصص والمكونات والكمية في كل حصة، ثم راجع مسببات الحساسية والتحذيرات وتاريخ الصلاحية ورقم التشغيلة.',
      },
      {
        question: 'هل يحتاج كل رياضي إلى مكملات؟',
        answer: 'ليس بالضرورة. الاحتياج يعتمد على الغذاء والهدف والحالة الصحية. يمكن أن يساعد مختص تغذية في تحديد النقص الفعلي بدل شراء عدة منتجات دون حاجة.',
      },
    ],
    internalLinks: [
      { anchor: 'المكملات الغذائية المتوفرة في تونس', href: '/proteines' },
      { anchor: 'دليل الكرياتين', href: '/creatine' },
    ],
  },
  /*
   * ── The single most valuable gainer URL we own. Handle with the numbers in front of you. ──
   *
   * GSC 28 d (Pages.csv, 23/08→19/09): 23 clicks / 697 impressions / pos 5.86. Where they come
   * from matters more than the total: the click-earning gainer queries in that window are the
   * Serious Mass long tail — `serious mass 2.7 kg tunisie prix` 11 clicks @2.35,
   * `serious mass prix tunisie` 1/91/8.24, `optimum nutrition serious mass prix tunisie` 1/15/4.67
   * — i.e. PRICE + product, not the bare category term. On the category term itself this post
   * holds `mass gainer tunisie` 0/1/5.0 while /mass-gainers, the owner, sits at 0/12/51.4.
   *
   * 23/09/2026 — the headline was "Mass Gainer Prix Tunisie : guide d'achat 2026", which is
   * `mass gainer prix tunisie` verbatim: an owned term in the gainer cluster. Removing the single
   * word "Tunisie" removes the claim on all four owned terms (they all carry it) while leaving
   * "mass gainer", "prix", "guide d'achat" and the year in place, so the price long tail that
   * actually earns the 23 clicks still matches. That is the smallest edit that resolves the
   * conflict, and it is a real risk on a page at position 5.86 — measure it, do not assume it.
   *
   * The metaDescription is deliberately NOT touched in the same pass. Moving the title and the
   * snippet together makes the four-week read unattributable — the same reasoning the two
   * Serious Mass entries below are annotated with.
   *
   * The opening anchor stays the exact-match "mass gainer prix Tunisie": this is the first link
   * on our strongest gainer page and handing the owner the exact term is the point. It is the
   * only occurrence of that anchor in the file; the "Lire aussi" duplicate of it was split off.
   *
   * The delivery figure in the last FAQ ("sous 24–72h", "paiement à la livraison") is not an
   * invention: protein.tn's own footer reads "Paiement à la livraison, expédition sous 24–72h"
   * (Googlebot fetch of the homepage, 23/09/2026). No FAQ in this entry states a dinar price.
   */
  'mass-gainer-prix-tunisie-guide-complet-pour-2025': {
    openingLinkHtml:
      '<p>Les gainers disponibles, leurs formats et leurs prix du jour sont sur notre page <a href="/mass-gainers">mass gainer prix Tunisie</a>.</p>',
    headline: 'Mass gainer : guide d’achat 2026, calories, glucides et prix',
    metaDescription:
      'Prix des mass gainers en Tunisie, formats, calories et marques : comparez les critères utiles pour choisir selon votre objectif et votre budget en 2026.',
    dateModified: '2026-09-23',
    lang: 'fr',
    faqs: [
      {
        question: 'Quel est le prix d’un mass gainer en Tunisie en 2026 ?',
        answer: 'Le prix varie selon la marque, le poids du pot, le nombre de portions et les promotions. Pour comparer correctement, regardez le prix au kilogramme et le coût par portion sur les fiches des gainers actuellement disponibles.',
      },
      {
        question: 'Comment choisir un mass gainer sans payer seulement pour du sucre ?',
        answer: 'Comparez les calories, les protéines, les glucides et les sucres par portion. Vérifiez aussi la taille réelle d’une portion : deux pots de même poids peuvent fournir un nombre de prises très différent.',
      },
      {
        question: 'Mass gainer ou whey pour prendre de la masse ?',
        answer: 'La whey aide surtout à compléter l’apport en protéines. Un mass gainer ajoute aussi beaucoup de glucides et de calories. Choisissez le gainer si vous peinez à atteindre votre besoin calorique avec l’alimentation ; sinon une whey peut suffire.',
      },
      {
        question: 'Quand prendre un mass gainer ?',
        answer: 'Il peut être pris entre les repas ou après l’entraînement selon votre organisation alimentaire. La quantité totale de calories et de protéines sur la journée compte davantage que l’heure précise de la prise.',
      },
      {
        question: 'Peut-on commander un mass gainer avec livraison en Tunisie ?',
        answer: 'Oui. Protein.tn affiche les références disponibles et livre dans tous les gouvernorats, généralement sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    internalLinks: [
      { anchor: 'les gainers en stock', href: '/mass-gainers' },
      { anchor: 'toutes les protéines en poudre', href: '/proteines' },
      { anchor: 'la créatine en complément du gainer', href: '/creatine' },
      { anchor: 'produits Dymatize en Tunisie', href: '/dymatize' },
    ],
  },

  /*
   * ── Serious Mass: the two posts that earn the query and never linked the product ──────────
   *
   * GSC 22/09/2026, query `serious mass tunisie` (3 clicks / 89 impressions): the two articles
   * below hold 12 and 6 impressions of it, the homepage holds 37, and the PDP that can actually
   * sell the tub holds 1. Both bodies linked /prise-de-masse, /proteines and /vitamines and
   * neither linked the product they are named after.
   *
   * So the opening paragraph hands the FIRST anchor on each page to the PDP. The H1 and the
   * <title> are deliberately left alone: they are what earns the query today, and moving the
   * links and the title in the same week makes the four-week read unattributable.
   */
  'serious-mass-le-gainer-ultime-pour-une-prise-de-masse-rapide': {
    openingLinkHtml:
      '<p><strong>Fiche produit et prix du jour :</strong> <a href="/mass-gainers/serious-mass-5-45-kg-optimum-nutrition">Serious Mass 5,45 kg d’Optimum Nutrition</a>, aussi disponible en <a href="/mass-gainers/serious-mass-2-7-kg">format 2,7 kg</a>.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'mass gainer en Tunisie', href: '/mass-gainers' },
      { anchor: 'Optimum Nutrition en Tunisie', href: '/optimum-nutrition' },
    ],
  },
  'serious-mass-d-optimum-nutrition-le-gainer-ideal-pour-une-prise-de-masse-rapide': {
    openingLinkHtml:
      '<p><strong>Les deux formats :</strong> <a href="/mass-gainers/serious-mass-5-45-kg-optimum-nutrition">Serious Mass 5,45 kg</a> et <a href="/mass-gainers/serious-mass-2-7-kg">Serious Mass 2,7 kg</a> — fiche, composition et prix du jour.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'les mass gainers disponibles en Tunisie', href: '/mass-gainers' },
      { anchor: 'la gamme Optimum Nutrition', href: '/optimum-nutrition' },
    ],
  },

  /*
   * This post's CMS title IS the category's head term ("Mass Gainer Prix Tunisie") and it earned
   * 0 clicks in the 28 days to 19/09/2026 at position 42.9 — it costs nothing to reposition and
   * it stops two URLs claiming the same phrase. The headline keeps "gainer" so the alignment
   * guard in blog/[slug]/page.tsx does not fall back to the CMS H1.
   */
  'mass-gainer-prix-tunisie': {
    headline: 'Prix d’un mass gainer : lire le coût au kilo et par portion',
    metaDescription:
      'Comment comparer le prix d’un mass gainer : coût au kilo, taille réelle d’une portion, part des glucides et des protéines dans l’étiquette.',
    openingLinkHtml:
      '<p>Les formats en rayon et ce qu’ils coûtent au kilo : <a href="/mass-gainers">nos mass gainers, format par format</a>.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'comparer les mass gainers en stock', href: '/mass-gainers' },
      { anchor: 'les protéines en poudre du catalogue', href: '/proteines' },
    ],
  },

  'أفضل مكملات البروتين في تونس: كيف تختار المنتج المناسب لهدفك الرياضي؟': {
    metaDescription:
      'دليل اختيار أفضل مكمل بروتين في تونس حسب هدفك: زيادة الكتلة، التنشيف أو التغذية اليومية، مع مقارنة الواي، الأيزوليت والكازين والأسعار الحالية.',
    dateModified: '2026-08-30',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن مكملات البروتين في تونس',
    linksHeading: 'دليلك لاختيار وشراء البروتين',
    faqs: [
      {
        question: 'ما أفضل بروتين لزيادة الكتلة العضلية؟',
        answer: 'يمكن أن يكون الواي بروتين خيارًا عمليًا لإكمال احتياجك اليومي من البروتين. إذا كنت لا تحصل على سعرات كافية من الطعام، يمكن التفكير في ماس غاينر بعد مقارنة كمية البروتين والسكريات والسعرات في الحصة.',
      },
      {
        question: 'ما الفرق بين Whey Protein وWhey Isolate؟',
        answer: 'الواي المركز عادة أقل سعرًا ويحتوي على نسبة جيدة من البروتين. الأيزوليت يخضع لترشيح أكبر ويحتوي غالبًا على دهون وسكريات ولاكتوز أقل، لذلك يناسب فترة التنشيف أو من لديهم حساسية تجاه اللاكتوز.',
      },
      {
        question: 'كم سعر البروتين في تونس؟',
        answer: 'السعر يتغير حسب النوع والعلامة والوزن والعروض. قارن السعر لكل كيلو أو لكل حصة بدل الاعتماد على سعر العلبة فقط، وراجع السعر والمخزون الحاليين في صفحة البروتين.',
      },
      {
        question: 'كيف أتأكد أن مكمل البروتين أصلي؟',
        answer: 'اشترِ من متجر معروف، وتحقق من سلامة الغطاء ورقم التشغيلة وتاريخ الصلاحية وبيانات المستورد أو الموزع على العبوة. تجنب المنتجات المفتوحة أو ذات السعر المنخفض بشكل غير منطقي.',
      },
      {
        question: 'هل مكمل البروتين مناسب للجميع؟',
        answer: 'هو غذاء مكمل وليس بديلًا عن الوجبات. يحتاج الاختيار إلى مراعاة نظامك الغذائي وتحملك للاكتوز وأي حالة صحية. استشر طبيبًا أو مختص تغذية إذا كنت تعاني من مرض مزمن أو مشكلة كلوية أو لديك حساسية غذائية.',
      },
    ],
    internalLinks: [
      { anchor: 'أسعار البروتين في تونس', href: '/proteines' },
      { anchor: 'واي بروتين في تونس', href: '/whey-proteine' },
      { anchor: 'واي أيزوليت', href: '/whey-isolate' },
      { anchor: 'ماس غاينر لزيادة الوزن', href: '/mass-gainers' },
    ],
  },

  /*
   * ── Whey commercial intent blog posts ─────────────────────────────────────────────────────
   *
   * Nine articles carried a shop-page title on the whey head term while /whey-proteine, the only
   * URL that can sell a pot, sat behind all of them. GSC 28 d to 19/09/2026, query
   * `whey protein tunisie` (13 clicks / 346 impressions): /blog/whey-proteine-pas-cher-tunisie
   * 5/137/13.9 · /blog/whey-protein-en-tunisie 4/80/12.5 · home 2/88/11.6 · /whey-proteine
   * 1/25/34.4. The category is the fourth-best URL on its own term.
   *
   * Two rules split this list in half:
   *   • The two posts that EARN clicks (13 and 10 in the window) keep their title and H1. They
   *     are the site's whey result today; retitling them would trade a measured position for a
   *     hypothesis. They get the pillar anchor in the opening paragraph instead — additive.
   *     ── REVERSED 23/09/2026, deliberately. See the note on the two entries below. The rule
   *     above protected the URL and the ranking, but it also protected the one thing doing the
   *     damage: both titles are head terms another page of ours must own, and one of them is
   *     taking clicks off the HOMEPAGE. commercialSeoMap already records the opposite decision
   *     for /blog/whey-protein-en-tunisie ("retarget the title, keep the URL"), so this file was
   *     the one out of step. The URLs, the bodies and the FAQ blocks are untouched.
   *   • The seven that earned zero clicks get an informational headline, so their <title> stops
   *     repeating what /whey-proteine is titled for. Each headline keeps the word "whey", which
   *     topicAlignedArticleHeadline (blog/[slug]/page.tsx) requires or it falls back to the CMS H1.
   *
   * No openingLinkHtml on the seven: the in-content linker already gives each of them a first
   * "whey" anchor to /whey-proteine, and a seventh copy of the same paragraph across the cluster
   * is exactly the generated-looking pattern this config exists to avoid. Anchors are varied for
   * the same reason — recounted on 23/09/2026 from the last committed version (8ac1410e),
   * /whey-proteine took 45 links spread over only 7 distinct anchors, and the single phrase
   * "whey protein en Tunisie" accounted for 23 of them across 19 entries. (An earlier draft of
   * this line said "the identical phrase 26 times"; that figure does not reproduce.)
   */
  /*
   * 23/09/2026 — RETARGETED. This is the one entry in the file that was fighting the HOMEPAGE.
   *
   * It was claiming BOTH head terms at once, through two different fields. Read on 23/09/2026:
   *   CMS `seo_title`      "PROTÉINE en Tunisie : Guide Achat 2026, Prix & Performance Santé"
   *   CMS `designation_fr` "Whey Proteine en Tunisie : est-ce vraiment le secret …"
   *   rendered <title>     "Whey Proteine en Tunisie"
   * (api/article_details/whey-protein-en-tunisie, and a Googlebot fetch of the page.) The gap
   * between the stored title and the rendered one is topicAlignedArticleHeadline doing its job:
   * the CMS title drops "whey", so the guard rejects it and takes the first clause of the H1.
   * Net effect — the stored title claimed the HOMEPAGE's term and the rendered one claimed
   * /whey-proteine's. An overlay `headline` is the only field that beats both.
   *
   * Two head terms, neither of them this article's to hold. GSC 28 d (Pages.csv, 23/08→19/09):
   * the URL earns 10 clicks / 341 impressions @12.49, split
   *   `whey protein tunisie`  4/80/12.5  — while /whey-proteine, the only URL that sells a pot,
   *                                        is fourth on its own term at 1/25/34.4;
   *   `proteine tunisie`      3/85/11.7  — a query where the HOMEPAGE takes 22 of 28 clicks @9.9.
   * The second line is the reason this could not wait for a safer window: we are bidding against
   * our own best page, and "never build anything to compete with the homepage" is a decision.
   *
   * What changes: the <title> and the visible H1 only (`headline` feeds both — see displayArticle
   * in blog/[slug]/page.tsx). The headline is the question the body already answers (its own H1
   * asks "est-ce vraiment le secret pour une meilleure santé et performance ?", and its second H2
   * is "les réels bienfaits … sur la santé et la récupération musculaire"), keeps the word "whey"
   * so topicAlignedArticleHeadline does not fall back to the CMS H1, and names no geography — so
   * it claims neither `whey protein tunisie` nor `protein tunisie`.
   * What does not change: the URL, the body, the canonical, the robots directives.
   * Baseline to judge it against in four weeks: 10 clicks / 341 impressions / pos 12.49.
   */
  'whey-protein-en-tunisie': {
    headline: 'La whey est-elle vraiment utile pour la santé et la récupération ?',
    metaDescription:
      'Ce que contient une whey, la différence entre concentré et isolat, quand la prendre et les critères à vérifier sur une étiquette avant de choisir un pot.',
    openingLinkHtml:
      '<p>Pour comparer les pots en stock, les formats et les prix du jour, voir <a href="/whey-proteine">les pots de whey en stock</a>.</p>',
    dateModified: '2026-09-23',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'le rayon whey de Protein.tn', href: '/whey-proteine' },
      { anchor: 'les whey isolate en stock', href: '/whey-isolate' },
    ],
  },
  /*
   * 23/09/2026 — RETARGETED, same reversal as the entry above.
   *
   * Live <title> and H1 on 23/09/2026 were both the bare head term "Whey Protéine Pas Cher
   * Tunisie". GSC 28 d: 13 clicks / 495 impressions @14.09 — and the queries it earns them on are
   * the ones /whey-proteine must own, not "pas cher": `whey protein tunisie` 5/137/13.9 and
   * `whey tunisie` 0/61/14.0. So the price wording in the slug was never what ranked; the head
   * term in the title was, and it was ranking INSTEAD of the shelf.
   *
   * "pas cher" is buying intent, so the new headline reads as a price guide and hands the buyer
   * on: which format costs least for what you get, then the opening link to the shelf. It keeps
   * "whey" for the alignment guard and drops "Tunisie", which removes the claim on both terms.
   * Deliberately NOT "coût par portion" — that exact angle is already the headline of
   * whey-proteine-prix-en-tunisie-comparatif-et-meilleurs-offres, and two of our own posts
   * titled for one method is how this cluster got here.
   * Baseline to judge it against in four weeks: 13 clicks / 495 impressions / pos 14.09.
   */
  'whey-proteine-pas-cher-tunisie': {
    headline: 'Whey pas chère : quel format choisir sans perdre en qualité',
    metaDescription:
      // Carries "Tunisie" on purpose: localityHint (util/articleLanguage.ts) otherwise spends
      // 55 characters of the 160-character budget appending its own boilerplate locality line.
      // A description is not a ranking signal, so the geo word costs nothing here — unlike in
      // the headline above, where it is exactly what had to go.
      'Ce qu’un prix bas change et ne change pas sur une whey en Tunisie : teneur en protéines par dose, lactose, additifs et taille réelle du pot.',
    openingLinkHtml:
      '<p>Du plus petit format au plus économique à l’usage, voir <a href="/whey-proteine">whey protéine : tous les formats</a> en stock.</p>',
    dateModified: '2026-09-23',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'tous les formats de whey', href: '/whey-proteine' },
      { anchor: 'toutes nos protéines', href: '/proteines' },
    ],
  },
  'proteine-whey-tunisie-guide-complet-2025': {
    headline: 'Protéine whey : concentré, isolat, hydrolysat — les différences',
    metaDescription:
      'Concentré, isolat, hydrolysat : ce qui change dans la filtration, la teneur en protéines et le lactose, et à qui chaque type de whey convient.',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'whey protéine en Tunisie', href: '/whey-proteine' },
      { anchor: 'l’isolat de whey', href: '/whey-isolate' },
    ],
  },
  'whey-proteine-prix-en-tunisie-comparatif-et-meilleurs-offres': {
    headline: 'Prix de la whey : comparer le coût par portion, pas le prix du pot',
    metaDescription:
      'Comment comparer le prix d’une whey : coût par portion plutôt que prix du pot, grammes de protéines réellement apportés, et effet du format sur le total.',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'prix des whey chez Protein.tn', href: '/whey-proteine' },
      { anchor: 'le catalogue protéines complet', href: '/proteines' },
    ],
  },
  'whey-proteine-tunisie-guide-ultime-pour-choisir-la-meilleure-proteine': {
    headline: 'Choisir une whey : teneur en protéines, lactose et liste d’ingrédients',
    metaDescription:
      'Les critères qui séparent deux whey : grammes de protéines par dose, présence de lactose, édulcorants et ordre des ingrédients sur l’étiquette.',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'les whey disponibles en Tunisie', href: '/whey-proteine' },
      { anchor: 'nos whey isolate', href: '/whey-isolate' },
    ],
  },
  'proteine-whey-tunisie-tout-ce-que-vous-devez-savoir-avant-d-acheter': {
    headline: 'Avant d’acheter une whey : ce qu’il faut vérifier sur l’étiquette',
    metaDescription:
      'Teneur en protéines par dose, taille de la dose, lactose, provenance et date de péremption : les points à lire sur un pot de whey avant de l’acheter.',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'voir les whey en rayon', href: '/whey-proteine' },
      { anchor: 'les autres types de protéines', href: '/proteines' },
    ],
  },
  'proteine-whey-tunisie-le-guide-ultime-pour-musculation-et-recuperation': {
    headline: 'Whey et récupération : quelle dose et quand la prendre',
    metaDescription:
      'Quand placer une dose de whey autour d’une séance, quelle quantité de protéines viser sur la journée, et ce que la whey ne remplace pas dans l’assiette.',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'whey pour la récupération', href: '/whey-proteine' },
      { anchor: 'caséine en Tunisie', href: '/caseine' },
    ],
  },
  'proteine-whey-tunisie-le-guide-ultime-pour-choisir-la-proteine-qui-vous-convient-protein-tn': {
    headline: 'Quelle whey pour quel objectif : prise de masse, sèche, apport d’appoint',
    metaDescription:
      'Prise de masse, sèche ou simple complément d’apport : à quel objectif correspond une whey concentrée, un isolat ou un gainer, et comment doser.',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'les whey en stock', href: '/whey-proteine' },
      { anchor: 'les mass gainers du catalogue', href: '/mass-gainers' },
    ],
  },
  'meilleure-proteine-whey-2026': {
    headline: 'Comment juger une whey : profil d’acides aminés, lactose, étiquette',
    metaDescription:
      'Les critères objectifs pour juger une whey : profil d’acides aminés, teneur en protéines par dose, lactose, additifs et lisibilité de l’étiquette.',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'comparer les whey en stock', href: '/whey-proteine' },
      { anchor: 'whey isolate : la sélection', href: '/whey-isolate' },
    ],
  },

  // ── Creatine commercial intent blog posts ─────────────────────────────────

  /*
   * 22/09/2026 — TWO CHANGES, both structural.
   *
   * 1. The body link became the opening link. openingLinkHtml is PREPENDED to the body and
   *    bodyLinkHtml is APPENDED (blog/[slug]/page.tsx, lines 284-300), so an entry carrying
   *    both renders two links to the same URL out of one article. The first anchor is the one
   *    Google weighs, so only that one is kept.
   *
   * 2. The first FAQ asserted that creatine "commence à environ 29 DT pour un format 300 g"
   *    and "monte jusqu'à 120–150 DT" for 1 kg. These FAQs ship as FAQPage schema on the
   *    best-earning creatine URL we own — 14 clicks / 393 impressions @8.81 over 28 days and
   *    34 clicks / 1,274 impressions @8.73 over 3 months (protein.tn/2026-09-22-28d/Pages.csv
   *    and .../2026-09-22-3m/Pages.csv) — so the figure was a false structured-data price claim.
   *    It is replaced by the method — prix du pot ÷ poids net — which carries no number that can
   *    go stale, and the live prices are one click away on /creatine.
   *
   * ── 23/09/2026: THE SECOND FAQ WAS NOT SAFE EITHER, AND THE NOTE ABOVE IT WAS WRONG ──────────
   * The 22/09 note said "no 1 kg format is listed at all" and left the second FAQ alone because
   * "30 à 40 % moins cher au gramme" was a relationship, not a price. Both halves fail on a read
   * of admin.protein.tn/api/productsBySubCategoryId/creatine made on 23/09/2026 (221 products):
   *   • ELEVEN 1 kg listings exist — nine labelled "1 kg" and two "1000 g" (Sports Research,
   *     Force Factor, Micro Ingredients, Nutricost, California Gold Nutrition, NOW Foods x2,
   *     NutraBio, TypeZero, Metabolic Nutrition, Ronnie Coleman). "Not listed at all" was false.
   *   • Every one of the eleven has qte 0 and rupture true. Not one is buyable.
   *   • Only 8 of the 221 products are in stock at all. Cheapest of any size: 70 DT (Real Pharm
   *     150 g). Cheapest in-stock 300 g: 130 DT (Real Pharm). The 22/09 figures (59 DT / 99 DT)
   *     do not reproduce either, so they are not repeated here.
   * A percentage that only pays off on a format the reader cannot add to a basket is an
   * availability claim wearing a ratio's clothes, and "les formats Creapure® sont un peu plus
   * chers" named a label that zero of the 221 products carry. Both are gone. The replacement
   * answers a different question from the first FAQ — is the big pot always the better buy —
   * and states no number, no brand and no format the catalogue has to keep in stock.
   */
  'prix-de-la-creatine-en-tunisie': {
    openingLinkHtml:
      '<p>Pour appliquer ces critères aux produits réellement en rayon, vous pouvez <a href="/creatine">comparer nos créatines et leurs prix du jour</a>.</p>',
    dateModified: '2026-09-23',
    faqs: [
      { question: "Comment comparer le prix d'une créatine en Tunisie ?", answer: "Ne comparez pas le prix affiché mais le prix au gramme : divisez le prix du pot par son poids net en grammes. Deux pots vendus au même prix ne contiennent pas forcément la même quantité, et un format plus grand fait presque toujours baisser le coût au gramme. Les prix à jour de chaque référence sont affichés sur la page créatine de Protein.tn." },
      { question: "Le grand format est-il toujours le plus intéressant ?", answer: "Souvent, mais pas systématiquement : seul le prix au gramme le dit, et il faut aussi que le pot soit réellement disponible et que vous le terminiez avant sa date de péremption. Un grand format en rupture ou entamé trop longtemps ne fait économiser rien du tout. Le format et l'état du stock sont indiqués référence par référence sur la page créatine de Protein.tn." },
    ],
    internalLinks: [
      { anchor: 'créatine prix Tunisie', href: '/creatine' },
      { anchor: 'whey protéine : formats et prix', href: '/whey-proteine' },
    ],
  },

  /*
   * 23/09/2026 — bodyLinkHtml → openingLinkHtml. The link was APPENDED to the body, i.e. after
   * an article that is entirely about where to buy; the first anchor on the page went to
   * whichever category the in-content linker happened to match first. Same correction, and for
   * the same reason, as the one recorded on prix-de-la-creatine-en-tunisie above: the first
   * anchor to a URL is the one that is weighed. The sentence is rewritten so it reads as an
   * opening rather than a conclusion; the anchor text is unchanged.
   *
   * The "plus de 15 ans d'expérience" in the first FAQ is not an invented claim: protein.tn's
   * own /qui-sommes-nous states SOBITAS has been in Sousse "depuis 2010" (Googlebot fetch,
   * 23/09/2026), which is sixteen years. No answer here states a price.
   */
  'ou-acheter-de-la-creatine-en-tunisie': {
    openingLinkHtml: '<p>Avant de comparer les vendeurs, voici la <a href="/creatine">sélection de créatines disponibles chez Protein.tn</a>, avec leurs formats et leur disponibilité du jour.</p>',
    dateModified: '2026-09-23',
    faqs: [
      { question: "Où acheter de la créatine fiable en Tunisie ?", answer: "Privilegiez les distributeurs officiels qui importent directement avec numéros de lot traçables. Protein.tn est une référence en Tunisie avec plus de 15 ans d'expérience, des produits 100 % originaux et une livraison dans tous les gouvernorats." },
      { question: "Comment éviter les contrefaçons de créatine en Tunisie ?", answer: "Achetez uniquement auprès de sites ou magasins agréés. Vérifiez la présence d'un sceau de sécurité, d'un numéro de lot et d'une date de péremption. Méfiez-vous des prix anormalement bas et des emballages sans mention d'importateur officiel." },
    ],
    internalLinks: [
      { anchor: 'acheter de la créatine en Tunisie', href: '/creatine' },
      { anchor: 'acheter de la whey en Tunisie', href: '/whey-proteine' },
    ],
  },

  /*
   * PROTECTED BY TRAFFIC — 2 clicks @18.5 on `creatine tunisie` (28 d), and it is one of only
   * two URLs taking that query's nine clicks while /creatine sits at 64. Never 301'd, never
   * noindexed, never emptied. It is also listed as `leave-earns-clicks` in the creatine cluster.
   *
   * 23/09/2026 — the ONE thing it was missing: bodyLinkHtml → openingLinkHtml. The pillar link
   * was appended at the very bottom of an article that ranks above the pillar; moving it to the
   * opening paragraph is the whole "link UP in the first paragraph" rule, and it is additive —
   * nothing about the title, the H1, the URL or the body changes. The anchor is new because the
   * old wording only made sense as a closing sentence and because no two anchors to /creatine in
   * this file may read the same.
   */
  'creatine-tunisie': {
    openingLinkHtml: '<p>Les formats, les marques et les prix du jour sont réunis sur notre page <a href="/creatine">toutes nos créatines, format par format</a>.</p>',
    dateModified: '2026-09-23',
    faqs: [
      { question: "Quels sont les bienfaits prouvés de la créatine ?", answer: "La créatine augmente les réserves de phosphocréatine dans les muscles, ce qui améliore la production d'ATP lors des efforts courts et intenses. Résultat : plus de force, plus de répétitions, une meilleure récupération inter-séries et une volumisation cellulaire. Ces effets sont validés par des centaines d'études." },
      { question: "Quelle est la dose de créatine recommandée ?", answer: "3 à 5 g par jour en prise continue est la dose standard recommandée. La régularité prime sur le timing : peu importe si vous la prenez avant ou après l'entraînement, l'essentiel est de ne pas oublier les jours de repos." },
    ],
    internalLinks: [
      { anchor: 'créatine Tunisie', href: '/creatine' },
      { anchor: 'nos whey protéine', href: '/whey-proteine' },
    ],
  },

  // 23/09/2026 — third and last creatine post whose pillar link was appended instead of opening
  // the body. 0 clicks / 95 impressions @57.94 (28 d), so there is nothing to protect here and
  // nothing to lose by moving it. Every creatine entry in this file now carries openingLinkHtml.
  'creatine-tunisie-tout-ce-que-vous-devez-savoir': {
    openingLinkHtml: '<p>Les produits évoqués dans ce guide sont réunis dans notre <a href="/creatine">catalogue de créatines en Tunisie</a>.</p>',
    dateModified: '2026-09-23',
    faqs: [],
    internalLinks: [],
  },

  'creatine-tunisie-guide-complet-bienfaits-et-meilleures-marques-disponibles': {
    headline: 'Créatine : bienfaits prouvés et ce qu’il faut vérifier sur une marque',
    metaDescription:
      'Ce que la créatine fait réellement, à quelle dose, et les critères à vérifier sur une marque avant d’acheter : pureté, format, étiquette.',
    openingLinkHtml:
      '<p>Pour passer du principe au choix d’un pot, parcourez <a href="/creatine">notre sélection de créatine</a> en Tunisie.</p>',
    dateModified: '2026-09-22',
    faqs: [
      // 23/09/2026 — "BSN" removed: zero BSN references in the 221 products returned by
      // admin.protein.tn/api/productsBySubCategoryId/creatine. The five brands kept are each
      // present in that payload and each re-read the same day with qte > 0 and rupture false:
      // MICRONISED CREATINE OPTIMUM NUTRITION - 317G, 100% CREATINE MONOHYDRATE 300G - BIOTECH
      // USA, CREATINE MONOHYDRATE OSTROVIT- 500GR, CREATINE MONOHYDRATE - 500G -QUAMTRAX,
      // GOLD CREATINE - KEVIN LEVRONE | 300 g. They are 5 of the only 8 in-stock creatines.
      { question: "Quelles marques de créatine sont disponibles en Tunisie ?", answer: "Optimum Nutrition, Biotech USA, Ostrovit, Quamtrax et Kevin Levrone font partie des marques de créatine référencées sur Protein.tn. La disponibilité et les formats changent : la page créatine affiche l'état du stock référence par référence." },
      { question: "La créatine est-elle sûre ?", answer: "Oui, la créatine monohydrate est l'un des compléments les mieux étudiés et les plus sûrs quand elle est prise aux doses recommandées (3–5 g/j). Consultez votre médecin si vous avez des problèmes rénaux préexistants." },
    ],
    internalLinks: [
      { anchor: 'créatine en Tunisie : formats et prix', href: '/creatine' },
      { anchor: 'nos protéines en poudre', href: '/proteines' },
    ],
  },

  /*
   * Creatine cluster, supporting article 2 of 3 (see `supporting` in commercialSeoMap).
   *
   * 23/09/2026 — TITLE LEFT ALONE, on purpose. The live <title> is "Meilleure créatine 2026 :
   * guide pour bien choisir": it names no geography, so it claims none of the six terms in the
   * creatine cluster's `owns` (all of them carry "tunisie"), and it already reads informational.
   * Its subject — the FORMS of creatine, which its body actually lists (monohydrate, HCL,
   * MagnaPower, tamponnée, micronisée) — no longer collides with the monohydrate article above
   * now that the latter has moved to purity. GSC 28 d: 0 clicks / 15 impressions @6.73, so there
   * is no traffic argument either way; the argument is that there is nothing to fix.
   *
   * The second FAQ WAS fixed. It asserted "plusieurs produits certifiés Creapure® sont
   * disponibles sur Protein.tn" — checked on 23/09/2026 against
   * admin.protein.tn/api/productsBySubCategoryId/creatine: the word "Creapure" appears in ZERO
   * of the 221 products listed. That is a false availability claim, and it shipped as FAQPage
   * structured data on a page that sits at position 6.7. It is replaced by what the label means,
   * which stays true whatever the catalogue holds. Same class of defect as the two false dinar
   * prices removed on 22/09; no answer in this file states a price today.
   */
  'meilleure-creatine-2026-notre-guide-pour-bien-choisir': {
    openingLinkHtml:
      '<p>Les critères ci-dessous s’appliquent aux produits en rayon : <a href="/creatine">voir les créatines disponibles</a> chez Protein.tn.</p>',
    dateModified: '2026-09-23',
    faqs: [
      { question: "Quelle est la meilleure créatine en 2026 ?", answer: "La créatine monohydrate reste la référence en 2026 : la mieux documentée, la plus abordable et la plus efficace. La créatine micronisée est du monohydrate à particules plus fines, plus facile à dissoudre et souvent mieux tolérée. Les autres formes (HCL, tamponnée, chélatée) n'ont pas le même niveau de preuves." },
      { question: "Qu'est-ce que le label Creapure® change sur un pot de créatine ?", answer: "Creapure® est une marque de créatine monohydrate produite sur un site unique en Allemagne, avec des contrôles de pureté publiés. Le label atteste donc de la traçabilité et du procédé, pas d'une efficacité supérieure : la molécule reste la même. Vérifiez sur l'étiquette du produit qui vous intéresse s'il porte ce label, car toutes les créatines n'en disposent pas." },
    ],
    internalLinks: [
      { anchor: 'les créatines en stock chez Protein.tn', href: '/creatine' },
      { anchor: 'la whey disponible en Tunisie', href: '/whey-proteine' },
    ],
  },

  /*
   * Creatine cluster, supporting article 3 of 3. THE SECOND-BEST CREATINE URL WE OWN.
   *
   * GSC 28 d (Pages.csv, 23/08→19/09): 10 clicks / 193 impressions / pos 5.99 — behind only
   * /blog/prix-de-la-creatine-en-tunisie (14 clicks) and far ahead of /creatine itself
   * (2 clicks / 204 impressions @22.2). On the owned term `creatine tunisie` it holds 0/5/4.6
   * while /creatine sits at 0/8/64.0.
   *
   * 23/09/2026 — TITLE LEFT ALONE, and this one is a judgement call worth stating. The live
   * <title> "Meilleures marques de créatine en Tunisie : comparatif" does contain the string
   * "créatine en Tunisie", so a mechanical read of the owns-list would retarget it. Three things
   * say don't: (1) commercialSeoMap lists this URL under `supporting`, not `conflicts` — a brand
   * comparison is a different question from "buy creatine", which is exactly what rule 2 asks of
   * a supporting page; (2) it already links UP with its own distinct anchor; (3) ten measured
   * clicks at position 6 is the largest downside in this batch and the smallest argument for it.
   * The protected-by-traffic rule is not a title freeze, but "retarget" has to buy something,
   * and here it buys a wording change on a page that is already doing its job. It belongs in
   * `protectedByTraffic` in commercialSeoMap, which this pass does not own.
   *
   * The first FAQ WAS corrected, and the reason recorded for it was itself wrong. Re-checked on
   * 23/09/2026 against admin.protein.tn/api/productsBySubCategoryId/creatine (221 products):
   *   • "BSN" — zero products of any kind. Absent from the catalogue, as first written.
   *   • "MuscleTech Platinum Creatine" — LISTED BUT OUT OF STOCK. PLATINUM CREATINE 400G -
   *     MUSCLETECH (id 505) is in the payload with qte 0 and rupture true, as are the other
   *     three MuscleTech entries (Creatine Chews x2, Cell-Tech). An earlier draft of this note
   *     said there was "no Platinum Creatine among the 221 listed"; that is false.
   * The edit stands on the corrected reason: a FAQPage answer on the page literally titled
   * "meilleures marques" that names a product nobody can add to a basket sends the reader to an
   * out-of-stock shelf, which is reason enough. It is not the same as saying we never carried it.
   * The five replacement brands were re-read the same day and all five are in stock.
   */
  'les-meilleures-marques-de-creatine-en-tunisie-comparatif-et-avis': {
    openingLinkHtml:
      '<p>Toutes les marques comparées ici sont listées avec leur prix du jour sur notre page <a href="/creatine">créatine en Tunisie</a>.</p>',
    dateModified: '2026-09-23',
    faqs: [
      { question: "Quelle est la meilleure marque de créatine disponible en Tunisie ?", answer: "Il n'y a pas de marque supérieure en soi : la créatine monohydrate est la même molécule d'un fabricant à l'autre. Optimum Nutrition, Biotech USA, Ostrovit, Quamtrax et Kevin Levrone sont parmi les marques référencées sur Protein.tn ; départagez-les sur le format, la forme (poudre ou gélules), la lisibilité de l'étiquette et le prix au gramme." },
      { question: "Où comparer les marques de créatine en Tunisie ?", answer: "Protein.tn regroupe les marques référencées avec des descriptions détaillées, les prix en dinars et la disponibilité en temps réel." },
    ],
    internalLinks: [
      { anchor: 'comparer les créatines en stock', href: '/creatine' },
      { anchor: 'les marques de whey en stock', href: '/whey-proteine' },
    ],
  },

  /*
   * 22/09/2026 — RETARGETED. Live <title> was "Créatine Tunisie : prix comparatif et comment
   * choisir", i.e. both head terms /creatine is titled for, on an article that earned 0 clicks
   * for 5 impressions in the 28 days to 22/09/2026 (Pages.csv). No measured traffic to lose,
   * one claimant removed from "créatine tunisie" / "créatine prix tunisie". The headline now
   * names the choice question the body actually answers; the URL and the body are untouched.
   *
   * The old FAQ's "60 DT pour 1 kg … 30 DT pour un 300 g" went with it. It was written as an
   * illustration but shipped as FAQPage schema, where it reads as a price claim. Its replacement
   * states the ratio method and names no dinar figure. (The 22/09 note here also quoted "cheapest
   * 300 g in stock = 99 DT"; re-read on 23/09/2026 it is 130 DT, Real Pharm 300 g — which is why
   * a comment is the only place a dinar figure belongs, and only with the date it was read.)
   *
   * ── 23/09/2026: THE HEADLINE WAS THE LAST CREAPURE® CLAIM LEFT ───────────────────────────────
   * The pass that stripped Creapure® from the FAQ answers left it in the `headline`, which feeds
   * BOTH the <title> and the visible H1 (displayArticle + generateMetadata in
   * blog/[slug]/page.tsx). So the one field with the widest reach kept offering a three-way
   * choice — monohydrate / micronisée / Creapure® — between forms that are not all on the shelf.
   * Read on 23/09/2026 from admin.protein.tn/api/productsBySubCategoryId/creatine: of 221
   * products only 8 have qte > 0 and rupture false, and "Creapure" matches zero products in the
   * whole payload. Capsules are listed but every one is out of stock; all 8 in-stock references
   * are powders, of which exactly one is sold as micronised (MICRONISED CREATINE OPTIMUM
   * NUTRITION - 317G) and seven as plain monohydrate. Two forms, not three.
   * Invariant 2 at the top of this file was widened at the same time to cover `headline` and
   * `metaDescription`, not just FAQ answers, because this is precisely the gap it missed.
   * The headline is reworded to the two forms a reader can actually choose between, keeps
   * "créatine" for topicAlignedArticleHeadline, and still names no geography.
   */
  'creatine-prix-en-tunisie-et-comment-choisir-le-meilleur-produit': {
    headline: 'Créatine monohydrate ou micronisée : ce qui change vraiment',
    metaDescription:
      'Micronisée ou monohydrate classique : ce que la taille des particules change à la dissolution, à la digestion et au prix d’une créatine en Tunisie.',
    openingLinkHtml:
      '<p>Une fois le type choisi, <a href="/creatine">les prix des créatines disponibles en Tunisie</a> sont affichés format par format.</p>',
    dateModified: '2026-09-23',
    faqs: [
      { question: "Faut-il payer plus cher pour une créatine micronisée ?", answer: "La micronisation ne change pas la molécule : elle réduit la taille des particules, ce qui améliore la dissolution dans l'eau et la tolérance digestive. Elle n'augmente pas l'efficacité de la créatine et ne se justifie donc que par le confort d'utilisation : si votre poudre actuelle se dissout bien et passe bien, le monohydrate classique fait le même travail." },
      { question: "Comment comparer deux créatines dont les prix diffèrent ?", answer: "Ramenez chaque pot au prix au gramme : prix du pot ÷ poids net en grammes. C'est le seul calcul qui rend deux formats comparables, et il fait souvent apparaître qu'un pot affiché plus cher revient moins cher à l'usage." },
    ],
    internalLinks: [
      { anchor: 'prix de la créatine chez Protein.tn', href: '/creatine' },
      { anchor: 'prix des whey protéine', href: '/whey-proteine' },
    ],
  },

  'meilleur-creatine-pour-prise-de-masse': {
    openingLinkHtml:
      '<p>Pour choisir un produit, <a href="/creatine">nos créatines monohydrate en Tunisie</a> sont listées avec leurs formats et leurs prix.</p>',
    dateModified: '2026-09-22',
    faqs: [
      { question: "Quelle créatine prendre pour la prise de masse ?", answer: "La créatine monohydrate est la meilleure option pour la prise de masse : elle augmente la force pour des séances plus efficaces, favorise la volumisation musculaire et est abordable. Associez-la à une whey protein de qualité et un surplus calorique pour des résultats optimaux." },
      { question: "Créatine et whey protein : peut-on les combiner ?", answer: "Oui, c'est même recommandé. La créatine améliore la force pendant l'entraînement, la whey optimise la récupération et la synthèse protéique après. Prenez 3–5 g de créatine n'importe quand dans la journée et votre shaker de whey dans l'heure post-entraînement." },
    ],
    internalLinks: [
      { anchor: 'créatine et prise de masse', href: '/creatine' },
      { anchor: 'whey pour la prise de masse', href: '/whey-proteine' },
      { anchor: 'mass gainer pour la prise de masse en Tunisie', href: '/mass-gainers' },
    ],
  },

  /*
   * 22/09/2026 — RETARGETED. Live <title> was "Acheter créatine originale en Tunisie : le
   * guide complet" — a transactional title on an article with no row at all in the 28-day
   * Pages export (0 clicks, 0 recorded impressions), while a second post,
   * ou-acheter-de-la-creatine-en-tunisie, already holds the same "où acheter" intent at
   * pos 10.8. That one earns impressions and is left alone; this one now names the
   * authenticity check it genuinely documents, so the buying intent is left to /creatine.
   * URL and body unchanged.
   */
  'ou-acheter-de-la-creatine-originale-en-tunisie-le-guide-complet': {
    headline: 'Créatine authentique : les points à vérifier sur un pot',
    metaDescription:
      'Sceau de sécurité, numéro de lot, date de péremption, mention de l’importateur : ce qu’il faut contrôler sur un pot de créatine avant de l’ouvrir.',
    openingLinkHtml:
      '<p>Si vous préférez partir d’une référence déjà tracée, voici <a href="/creatine">notre sélection de créatines originales</a>.</p>',
    dateModified: '2026-09-23',
    faqs: [
      { question: "Comment reconnaître une créatine originale en Tunisie ?", answer: "Une créatine originale porte un sceau de sécurité intact, un numéro de lot lisible et une date de péremption claire. Certains pots affichent en plus un label de traçabilité : Creapure®, par exemple, atteste d'un site de production unique en Allemagne et de contrôles de pureté publiés. C'est une mention à chercher sur l'étiquette du produit qui vous intéresse, pas un critère que tous les pots portent. Achetez toujours auprès d'un distributeur agréé comme Protein.tn." },
      { question: "Protein.tn vend-il de la créatine originale ?", answer: "Oui. Protein.tn importe directement ses créatines auprès des fabricants ou distributeurs officiels. Chaque produit a un numéro de lot traçable. Livraison partout en Tunisie avec paiement à la livraison." },
    ],
    internalLinks: [
      { anchor: 'créatine originale en Tunisie', href: '/creatine' },
      { anchor: 'notre rayon whey protéine', href: '/whey-proteine' },
    ],
  },

  /*
   * Creatine cluster, supporting article 1 of 3 (see `supporting` in commercialSeoMap).
   *
   * 23/09/2026 — RETARGETED. Live <title> read with a Googlebot UA the same day: "Meilleure
   * créatine monohydrate en Tunisie : Guide & Top 2026". That is `créatine monohydrate tunisie`,
   * word for word one of the six terms in the creatine cluster's `owns` — and /creatine, the
   * owner, holds that query at 1/7/38.1 while this post averages position 8.03.
   *
   * It also duplicated the subject of meilleure-creatine-2026-notre-guide-pour-bien-choisir:
   * two supporting posts both titled "the best creatine, how to choose". The first fix aimed this
   * one at PURITY — and that just moved the duplication, because label-reading is already owned
   * twice over in this file: ou-acheter-de-la-creatine-originale-en-tunisie-le-guide-complet
   * ("Créatine authentique : les points à vérifier sur un pot") and
   * creatine-tunisie-la-meilleure-qualite-... ("Créatine : qualité, pureté et ce que valent les
   * labels"). Three of our own posts titled for "read the label" is the same defect in a new coat.
   *
   * Re-read the live body with a Googlebot UA on 23/09/2026 to find what only THIS article has.
   * Purity is not it — Creapure®/HACCP get two sentences. What no other creatine post in this
   * file covers is the renal section and absorption: "Est-il sécurisant de consommer de la
   * créatine pour les reins sur le long terme ?" runs several paragraphs, explains that
   * supplementing raises measured créatinine and that "un médecin non averti pourrait croire à un
   * problème rénal", tells the reader to speak to a nephrologist, and the body returns to
   * biodisponibilité four times (poudre vs gélules, micronisation, hydratation). The headline now
   * names that, which collides with nothing. It keeps "créatine" so topicAlignedArticleHeadline
   * (blog/[slug]/page.tsx) does not fall back to the CMS H1, and it names no geography, so it
   * claims none of the six `owns` terms. The forms stay with meilleure-creatine-2026 and
   * label-reading stays with the two posts above.
   *
   * The first FAQ moves with the headline, for the same reason: a purity FAQ under a renal title
   * would leave the incoherence in place. Its replacement is the one question this body answers
   * that no other entry does, and it carries the medical caveat the body carries.
   *
   * Risk stated plainly: this URL earns 2 clicks / 115 impressions / CTR 1.74% / pos 8.03 over
   * 28 days (protein.tn/2026-09-22-28d/Pages.csv, re-read 23/09/2026), and a title change can
   * cost them. Baseline recorded here so the next pass reads the result rather than re-deriving
   * the decision. URL, body, canonical and robots directives unchanged.
   *
   * The first FAQ named "MuscleTech Platinum Creatine" as an option available in Tunisia, and the
   * reason first recorded for removing it was wrong. Re-checked against
   * admin.protein.tn/api/productsBySubCategoryId/creatine on 23/09/2026: PLATINUM CREATINE 400G -
   * MUSCLETECH (id 505) IS among the 221 listed — with qte 0 and rupture true. So are the three
   * other MuscleTech entries (Creatine Chews x2, Cell-Tech). LISTED BUT OUT OF STOCK, not absent.
   * That is still reason enough to pull the name out of an availability answer — a FAQPage answer
   * naming a product with qte 0 points the reader at an empty shelf — but it is a different claim
   * from "we do not carry it", and the stronger one must not be written. Separately, and this one
   * does hold: zero of the 221 products carry "Creapure" anywhere in the payload.
   */
  'quelle-est-la-meilleure-creatine-monohydrate-en-tunisie': {
    headline: 'Créatine et reins : ce que montre vraiment un taux de créatinine',
    metaDescription:
      'Créatinine élevée sur une prise de sang, hydratation, digestion et absorption : ce que la créatine change réellement, en Tunisie comme ailleurs.',
    openingLinkHtml:
      '<p>Pour passer du comparatif au produit, vous pouvez <a href="/creatine">découvrir les créatines monohydrate</a> vendues en Tunisie, avec leurs formats et leurs prix.</p>',
    dateModified: '2026-09-23',
    faqs: [
      { question: "Pourquoi la créatine fait-elle monter la créatinine sur une prise de sang ?", answer: "La créatinine est un déchet issu du métabolisme de la créatine : en augmenter l'apport fait mécaniquement monter ce marqueur, et ce n'est pas en soi le signe d'une atteinte rénale. Comme le laboratoire s'en sert pour estimer la fonction rénale, un résultat élevé peut être mal interprété : signalez votre supplémentation au médecin qui lit le bilan. En cas de maladie rénale connue, de grossesse ou d'allaitement, demandez un avis médical avant de commencer." },
      { question: "La créatine monohydrate micronisée est-elle meilleure ?", answer: "La créatine micronisée est chimiquement identique à la monohydrate classique, mais ses particules ultra-fines améliorent la solubilité dans l'eau et la tolérance digestive. Elle est préférable si vous avez un estomac sensible ou si votre créatine ne se dissout pas bien." },
    ],
    internalLinks: [
      { anchor: 'comparer les créatines monohydrate', href: '/creatine' },
      { anchor: 'comparer les whey protéine', href: '/whey-proteine' },
    ],
  },

  /*
   * The CMS retitled this article: the slug still says "meilleures marques", the page is now
   * "Créatine chez la femme : effets, sécurité et dosage" (verified 22/09/2026, and that is
   * the anchor /creatine's own howToChooseBody uses for it). The brand FAQs that used to sit here
   * emitted FAQPage schema that answered a question the page does not ask; they live on
   * les-meilleures-marques-de-creatine-en-tunisie-comparatif-et-avis, which is still about brands.
   */
  'meilleures-marques-de-creatine-en-tunisie': {
    openingLinkHtml:
      '<p>Les produits évoqués ici sont regroupés dans <a href="/creatine">notre rayon créatine en Tunisie</a>, avec leurs formats et leurs prix.</p>',
    dateModified: '2026-09-22',
    faqs: [
      { question: "La créatine fait-elle gonfler ou prendre du poids chez la femme ?", answer: "La créatine retient de l'eau à l'intérieur du muscle, pas sous la peau. La variation observée sur la balance les premières semaines vient de cette eau intramusculaire, et elle n'est pas de la masse grasse." },
      { question: "Quelle dose de créatine pour une femme ?", answer: "La dose usuelle est la même que chez l'homme : 3 à 5 g de créatine monohydrate par jour, tous les jours, entraînement ou non. La phase de charge n'est pas nécessaire." },
      { question: "La créatine présente-t-elle un risque pour les reins ?", answer: "Chez des personnes en bonne santé, la créatine monohydrate aux doses recommandées (3–5 g/j) est considérée comme sûre. Si vous avez des problèmes rénaux préexistants, ou en cas de grossesse ou d'allaitement, demandez l'avis de votre médecin avant de commencer." },
    ],
    internalLinks: [
      { anchor: 'rayon créatine', href: '/creatine' },
      { anchor: 'whey protéine : notre sélection', href: '/whey-proteine' },
    ],
  },

  /*
   * Three more creatine posts whose CMS <title> IS the category head term ("Créatine Prix
   * Tunisie…", "Créatine Tunisie…"). All three earned 0 clicks in the 28 days to 19/09/2026,
   * so repositioning them costs no measured traffic and removes three claimants from the
   * `creatine prix tunisie` / `creatine tunisie` intent that /creatine is titled for.
   * Each headline keeps "créatine" for the alignment guard.
   */
  'creatine-prix-tunisie-guide-complet-des-meilleurs-produits-en-2025': {
    headline: 'Prix de la créatine : calculer le coût au gramme selon le format',
    metaDescription:
      'Comment ramener le prix d’une créatine au gramme, ce que change le passage d’un 300 g à un 1 kg, et pourquoi un label de pureté se paie un peu plus cher.',
    openingLinkHtml:
      '<p>Le calcul ci-dessous s’applique directement aux pots en rayon : <a href="/creatine">comparer le prix au gramme de nos créatines</a>.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'prix des créatines par format', href: '/creatine' },
      { anchor: 'les whey protéine disponibles', href: '/whey-proteine' },
    ],
  },
  'creatine-prix-tunisie-trouvez-la-meilleure-offre-pour-maximiser-vos-gains': {
    headline: 'Créatine : ce qui fait varier le prix d’un pot à l’autre',
    metaDescription:
      'Format, marque, pureté certifiée et micronisation : les quatre facteurs qui expliquent l’écart de prix entre deux pots de créatine monohydrate.',
    openingLinkHtml:
      '<p>Ces facteurs se lisent directement sur <a href="/creatine">les formats de créatine disponibles en Tunisie</a>.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'les créatines disponibles en Tunisie', href: '/creatine' },
      { anchor: 'le rayon protéines et compléments', href: '/proteines' },
    ],
  },
  'creatine-tunisie-la-meilleure-qualite-a-prix-imbattable-livraison-rapide-and-gratuite-sur-protein-tn': {
    headline: 'Créatine : qualité, pureté et ce que valent les labels',
    metaDescription:
      'Ce que recouvrent les mentions Creapure®, micronisée et monohydrate sur un pot de créatine, et comment vérifier la traçabilité d’un lot.',
    openingLinkHtml:
      '<p>Pour retrouver ces mentions sur des étiquettes réelles, parcourez <a href="/creatine">nos créatines monohydrate</a> vendues en Tunisie.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'créatine monohydrate : formats et marques', href: '/creatine' },
      { anchor: 'la whey protéine au catalogue', href: '/whey-proteine' },
    ],
  },

  /*
   * ── Compléments alimentaires ──────────────────────────────────────────────────────────────
   *
   * No commercial page owns the phrase: /complements-alimentaires 301s to /proteines and its
   * content file is dead, so the only page titled for it is /shop. These four articles carry
   * the phrase in their titles and compete with each other for it.
   *
   * Additive only — no `headline` on any of them. Which article holds the page-1 slot for
   * `complément alimentaire tunisie` has to come from a GSC query → Pages breakdown, and that is
   * an owner read; retitling before it would be guessing. What is safe now is giving each one a
   * first anchor to the hub that can sell, which none of them had.
   */
  'complements-alimentaires-tunisie': {
    openingLinkHtml:
      '<p>Le catalogue complet, rayon par rayon, est sur notre page <a href="/shop">compléments alimentaires en Tunisie</a>.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'la boutique, rayon par rayon', href: '/shop' },
      { anchor: 'protéines en Tunisie', href: '/proteines' },
    ],
  },
  'complement-alimentaire-en-tunisie-guide-complet-pour-une-meilleure-sante': {
    openingLinkHtml:
      '<p>Pour voir ce qui est réellement disponible et à quel prix, parcourez <a href="/shop">tous les compléments en stock</a>.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'tous les compléments alimentaires', href: '/shop' },
      { anchor: 'nos protéines et compléments protéinés', href: '/proteines' },
    ],
  },
  'les-10-meilleurs-complements-alimentaires-pour-sportifs-en-tunisie': {
    openingLinkHtml:
      '<p>Chacun des produits cités ci-dessous se retrouve dans <a href="/shop">le catalogue de compléments</a>, avec son format et son prix du jour.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'compléments alimentaires pour sportifs', href: '/shop' },
      { anchor: 'les protéines pour sportifs', href: '/proteines' },
    ],
  },
  'top-5-des-complements-alimentaires-essentiels-pour-la-musculation-en-tunisie': {
    openingLinkHtml:
      '<p>Les cinq familles citées ici sont toutes en rayon : voir <a href="/shop">les compléments disponibles en Tunisie</a>.</p>',
    dateModified: '2026-09-22',
    lang: 'fr',
    faqs: [],
    internalLinks: [
      { anchor: 'compléments alimentaires pour la musculation', href: '/shop' },
      { anchor: 'les protéines pour la musculation', href: '/proteines' },
    ],
  },

  // ── Arabic articles: commercial-intent + informational overlay ────────────
  // Meta descriptions written from each article's own content (no invented
  // prices, promises or statistics); Arabic anchors point at the commercial
  // pillars only where the article's subject genuinely matches them.

  'ما هو أفضل كرياتين في تونس؟': {
    openingLinkHtml:
      '<p>الأنواع المتوفرة والأحجام والأسعار الحالية على صفحة <a href="/creatine">كرياتين في تونس</a>.</p>',
    metaDescription:
      'مقارنة أنواع الكرياتين المتوفرة في تونس: مونوهيدرات، HCL، ميكرونيزد وماغنا باور، ولماذا يبقى المونوهيدرات الخيار الأول مع جرعة 3 إلى 5 غرامات في اليوم.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن أفضل كرياتين في تونس',
    linksHeading: 'قارن الكرياتين والبروتين قبل الشراء',
    faqs: [
      {
        question: 'ما هو أفضل نوع كرياتين في تونس؟',
        answer: 'كرياتين مونوهيدرات النقي هو الخيار الأول لمعظم الرياضيين: الأكثر دراسة، والأكثر فعالية في القوة والكتلة العضلية، والأقل تكلفة. أما HCL أو الميكرونيزد فقد يناسبان من يعاني من حساسية هضمية بسيطة.',
      },
      {
        question: 'ما الفرق بين كرياتين مونوهيدرات والكرياتين الميكروني؟',
        answer: 'الكرياتين الميكروني هو في الأصل مونوهيدرات بجزيئات أدق، فيتحسن ذوبانه وهضمه قليلًا، لكن فعاليته تبقى مماثلة للنوع الأصلي.',
      },
      {
        question: 'ما الجرعة اليومية من الكرياتين؟',
        answer: 'الجرعة الشائعة والفعّالة هي 3 إلى 5 غرامات يوميًا، دون حاجة إلى مرحلة تحميل إلزامية مع مونوهيدرات النقي. يُفضّل تناوله بعد التمرين مع مصدر قليل من الكربوهيدرات أو مع وجبة تحتوي على بروتين.',
      },
      {
        question: 'هل يجب التوقف عن الكرياتين بين فترة وأخرى؟',
        answer: 'يمكن استخدام الكرياتين بشكل مستمر دون فترات توقف طالما أنك بصحة جيدة وتلتزم بالتغذية السليمة والترطيب الكافي. استشر طبيبًا إذا كانت لديك حالة صحية أو تتناول أدوية.',
      },
    ],
    internalLinks: [
      { anchor: 'أشكال الكرياتين المتوفرة في المتجر', href: '/creatine' },
      { anchor: 'ما هو الكرياتين ودوره في الطاقة', href: '/blog/ما هو الكرياتين؟' },
      { anchor: 'مكملات البروتين المتوفرة', href: '/proteines' },
    ],
  },
  'كرياتين مونوهيدرات': {
    headline: 'كرياتين مونوهيدرات: كيف يعمل ولماذا يُعد المعيار الذهبي؟',
    metaDescription:
      'كرياتين مونوهيدرات هو الشكل الأنقى والأكثر دراسة: يدعم إنتاج ATP والقوة والاستشفاء والكتلة الخالية من الدهون. قارن الأنواع والأسعار المتوفرة في تونس قبل الشراء.',
    openingLinkHtml:
      '<p>لمقارنة المنتجات الفعلية، تصفّح <a href="/creatine">عبوات كرياتين مونوهيدرات</a> المتوفرة وأسعارها الحالية.</p>',
    dateModified: '2026-09-23',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن كرياتين مونوهيدرات',
    linksHeading: 'قارن المنتجات المتوفرة في تونس',
    faqs: [
      {
        question: 'لماذا يُعتبر كرياتين مونوهيدرات المعيار الذهبي؟',
        answer: 'لأنه الشكل الأكثر نقاءً وثباتًا وامتصاصًا بين أنواع الكرياتين، وهو الشكل المستخدم في أغلب الدراسات العلمية، ما يجعل فعاليته وسلامته الأكثر توثيقًا.',
      },
      {
        question: 'هل يبني كرياتين مونوهيدرات العضلات مباشرة؟',
        answer: 'لا. هو يهيّئ بيئة مناسبة للنمو عبر زيادة حجم التدريب وشدته، وتحسين ترطيب الخلايا العضلية، ودعم الإشارات الابتنائية وتسريع الاستشفاء. النتيجة تظهر عند دمجه مع تمارين المقاومة والتغذية المناسبة.',
      },
      {
        question: 'هل يحتاج الكرياتين إلى دورات استخدام وتوقف؟',
        answer: 'لا يحتاج إلى دورات أو فترات توقف، ويمكن تناوله يوميًا للحفاظ على تشبّع العضلات. عند وجود مشكلة صحية أو تناول أدوية، استشر طبيبًا قبل البدء.',
      },
    ],
    internalLinks: [
      { anchor: 'كرياتين مونوهيدرات في تونس', href: '/creatine' },
      { anchor: 'أفضل كرياتين في تونس', href: '/blog/ما هو أفضل كرياتين في تونس؟' },
      { anchor: 'مكملات البروتين في تونس', href: '/proteines' },
    ],
  },
  'ما هو الكرياتين؟': {
    metaDescription:
      'الكرياتين مركّب ينتجه الجسم ويُخزَّن بنحو 95% في العضلات لإعادة تصنيع الطاقة ATP. تعرّف على دوره في القوة والاستشفاء وكيف تختار كرياتين موثوقًا في تونس.',
    openingLinkHtml:
      '<p>بعد فهم آلية عمله، يمكنك الاطلاع على <a href="/creatine">صفحة الكرياتين في المتجر</a> لمعرفة الأنواع والأحجام المتوفرة.</p>',
    dateModified: '2026-09-23',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن الكرياتين',
    linksHeading: 'اقرأ أيضًا قبل اختيار مكملك',
    faqs: [
      {
        question: 'ما هو الكرياتين وكيف يعمل؟',
        answer: 'الكرياتين مركّب عضوي نيتروجيني يصنعه الجسم في الكبد والكلى والبنكرياس من الأرجينين والجلايسين والميثيونين. يُخزَّن نحو 95% منه في العضلات على شكل فوسفوكرياتين، حيث يساعد على إعادة تصنيع ATP خلال الجهود القصيرة والعنيفة.',
      },
      {
        question: 'لماذا قد لا يكفي الطعام لتشبع مخازن الكرياتين؟',
        answer: 'الكرياتين موجود بكميات صغيرة في اللحوم الحمراء والأسماك، وهذه الكميات غالبًا لا تكفي لتشبع العضلات لدى ممارسي كمال الأجسام ورفع الأثقال والرياضيين ذوي التدريب عالي الشدة والنباتيين.',
      },
      {
        question: 'هل الكرياتين آمن؟',
        answer: 'عند استخدامه بالجرعات الموصى بها يُعد الكرياتين من أكثر المكملات دراسةً وأمانًا، ولا توجد أدلة قوية على ضرره بالكلى أو الكبد لدى الأصحاء. يبقى شرب كمية كافية من الماء والالتزام بالجرعة ضروريًا، ومن لديه حالة صحية عليه استشارة طبيب.',
      },
    ],
    internalLinks: [
      { anchor: 'الكرياتين في تونس', href: '/creatine' },
      { anchor: 'فوائد وأضرار الكرياتين', href: '/blog/ما هي فوائد وأضرار الكرياتين؟' },
      { anchor: 'مكمل بروتين في تونس', href: '/proteines' },
    ],
  },
  'كيف تختار بروتين مصل اللبن في تونس؟ الدليل الشامل من protein.tn': {
    metaDescription:
      'دليل اختيار واي بروتين في تونس: الفرق بين المركّز والمعزول والمهدرس، ونسبة 20 إلى 30 غرامًا من البروتين في الحصة، وكيف تتحقق من أصالة المنتج قبل الشراء.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن بروتين مصل اللبن في تونس',
    linksHeading: 'تصفّح أنواع البروتين المتوفرة',
    faqs: [
      {
        question: 'ما الفرق بين Whey Concentrate وIsolate وHydrolysate؟',
        answer: 'المركّز يحتوي على 70 إلى 80% بروتين مع قليل من الدهون واللاكتوز وسعره أقل، والمعزول يتجاوز 90% بروتين وهو شبه خالٍ من اللاكتوز والدهون، أما المهدرس فيُهضم بسرعة فائقة ويستخدمه غالبًا المحترفون الباحثون عن تعافٍ أسرع.',
      },
      {
        question: 'كم غرامًا من البروتين يجب أن تحتوي الحصة الواحدة؟',
        answer: 'ابحث عن منتج يقدّم بين 20 و30 غرامًا من البروتين في الحصة مع أقل من 5 غرامات من السكر، وتجنّب المنتجات ذات السكريات المضافة والنكهات الصناعية الكثيرة.',
      },
      {
        question: 'أي نوع واي بروتين يناسب هدفي؟',
        answer: 'لزيادة الكتلة العضلية اختر مركّزًا أو معزولًا بنسبة بروتين عالية، ولخسارة الدهون اختر المعزول قليل السكر والدهون، وللتعافي السريع بعد التمارين القوية اختر المهدرس.',
      },
      {
        question: 'كيف أتأكد من جودة المنتج قبل الشراء؟',
        answer: 'تحقق من تاريخ الصلاحية وطريقة التخزين، واقرأ قائمة المكونات، وجرّب عبوة صغيرة قبل شراء الكمية الكبيرة. استشر مختص تغذية إذا كنت تعاني من مشاكل في الكلى أو الهضم.',
      },
    ],
    internalLinks: [
      { anchor: 'بروتين مصل اللبن المتوفر', href: '/whey-proteine' },
      { anchor: 'الواي أيزوليت المتوفر', href: '/whey-isolate' },
      { anchor: 'أنواع البروتين في المتجر', href: '/proteines' },
    ],
  },
  'ما هو أفضل نوع من بروتين مصل اللبن؟': {
    metaDescription:
      'مركّز أم معزول أم متحلّل؟ مقارنة أنواع بروتين مصل اللبن حسب نسبة البروتين والهدف والميزانية وتحمّل اللاكتوز، مع نصائح شراء الواي بروتين في تونس من مصدر موثوق.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن أنواع الواي بروتين',
    linksHeading: 'قارن أنواع البروتين المتوفرة',
    faqs: [
      {
        question: 'ما الفرق بين WPC وWPI وWPH؟',
        answer: 'المركّز (WPC) يحتوي عادة على 70 إلى 80% بروتين وسعره الأنسب للميزانية المحدودة، والمعزول (WPI) يتجاوز 90% بروتين ويكاد يخلو من الدهون واللاكتوز، والمتحلّل (WPH) مفكك جزئيًا فيمتص بسرعة كبيرة لكنه الأعلى سعرًا وطعمه قد يكون مرًّا قليلًا.',
      },
      {
        question: 'أي نوع أختار إذا كانت لدي حساسية من اللاكتوز؟',
        answer: 'تجنّب البروتين المركّز لأنه يحتوي على لاكتوز أكثر، واختر المعزول الذي يكاد يخلو من اللاكتوز، أو المتحلّل إذا كنت تعاني أيضًا من صعوبة في الهضم.',
      },
      {
        question: 'هل هناك نوع أفضل للجميع؟',
        answer: 'لا. المركّز مناسب لمعظم الأشخاص، والمعزول مثالي للتنشيف أو لحساسية اللاكتوز، والمتحلّل مخصص للمحترفين أو من يحتاج سرعة امتصاص عالية. الخيار يعتمد على هدفك وتحملك وميزانيتك.',
      },
    ],
    internalLinks: [
      { anchor: 'أنواع الواي بروتين في المتجر', href: '/whey-proteine' },
      { anchor: 'واي أيزوليت للتنشيف', href: '/whey-isolate' },
      { anchor: 'تصفّح منتجات البروتين', href: '/proteines' },
    ],
  },
  'الفرق بين بروتين whey و isolate و casein: أيهم الأفضل لك؟': {
    metaDescription:
      'مقارنة عملية بين Whey وIsolate وCasein: سرعة الامتصاص، أفضل وقت للاستعمال، والهدف المناسب لكل نوع، لتختار مكمل البروتين الأنسب لهدفك ولميزانيتك في تونس.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن الفرق بين أنواع البروتين',
    linksHeading: 'تصفّح أنواع البروتين',
    faqs: [
      {
        question: 'متى أستعمل كل نوع من هذه البروتينات؟',
        answer: 'الواي بعد التمرين لأنه سريع الامتصاص، والأيزوليت بعد التمرين أيضًا وهو سريع جدًا ومناسب للتنشيف، والكازين قبل النوم لأنه بطيء الهضم ويمدّ العضلات بالبروتين لفترة طويلة.',
      },
      {
        question: 'ما الفرق بين Whey Protein وWhey Isolate؟',
        answer: 'الأيزوليت شكل أنقى من الواي تُزال منه معظم الدهون واللاكتوز، فتكون نسبة البروتين أعلى والسكريات أقل وهضمه أسهل، وهو ما يجعله مناسبًا للتنشيف ولمن يعاني من حساسية اللاكتوز.',
      },
      {
        question: 'أي بروتين أختار لبناء العضلات؟',
        answer: 'الواي بروتين أو الواي أيزوليت مناسبان لزيادة الكتلة العضلية، والأيزوليت أفضل عند التركيز على خسارة الدهون، والكازين للحفاظ على العضلات خلال ساعات النوم. اختر البروتين المناسب لهدفك وليس الأغلى سعرًا.',
      },
    ],
    internalLinks: [
      { anchor: 'منتجات الواي بروتين', href: '/whey-proteine' },
      { anchor: 'منتجات الأيزوليت', href: '/whey-isolate' },
      { anchor: 'مقارنة أنواع البروتين المتوفرة', href: '/proteines' },
    ],
  },
  'كيف تختار أفضل مكمل بروتين ليناسب أهدافك الرياضية؟': {
    metaDescription:
      'حدّد هدفك أولًا ثم اختر مكمل البروتين: واي للامتصاص السريع، كازين قبل النوم، أو بروتين نباتي، مع 20 إلى 30 غرامًا في الحصة واعتماد NSF أو Informed-Sport.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن اختيار مكمل البروتين',
    linksHeading: 'اختر مكملك حسب هدفك',
    faqs: [
      {
        question: 'كيف أختار البروتين حسب هدفي الرياضي؟',
        answer: 'لزيادة الكتلة العضلية اختر بروتينًا سريع الامتصاص مثل Whey Protein Isolate، ولخسارة الدهون اختر بروتينًا منخفض السعرات والكربوهيدرات، ولتحسين التعافي ركّز على منتج يحتوي على الأحماض الأمينية BCAA.',
      },
      {
        question: 'ما الذي يجب التحقق منه في الملصق قبل الشراء؟',
        answer: 'كمية البروتين في كل حصة ويُفضّل أن تكون بين 20 و30 غرامًا، ونسبة السكريات والدهون المضافة، وخلو المنتج من الخلطات غير المعلومة، ووجود اعتماد من جهة مستقلة مثل Informed-Sport أو NSF Certified.',
      },
      {
        question: 'ما البديل إذا كنت أعاني من حساسية الألبان؟',
        answer: 'اختر بروتينًا نباتيًا مثل بروتين البازلاء أو الأرز أو الصويا، أو Whey Isolate الذي تُزال منه معظم مكونات الحليب. إذا كان هدفك زيادة الوزن فاختر منتجًا يحتوي على كربوهيدرات مثل الماس غاينر.',
      },
      {
        question: 'كم من الوقت أحتاج قبل الحكم على المنتج؟',
        answer: 'جرّب المنتج لمدة 3 إلى 4 أسابيع وراقب التغيرات في الأداء والطاقة والكتلة العضلية. إذا لم تلاحظ فرقًا، غيّر النوع أو توقيت الاستخدام.',
      },
    ],
    internalLinks: [
      { anchor: 'مكملات البروتين حسب الهدف', href: '/proteines' },
      { anchor: 'واي بروتين حسب الهدف', href: '/whey-proteine' },
      { anchor: 'واي أيزوليت في المتجر', href: '/whey-isolate' },
    ],
  },
  'كيف تختار المكمل الغذائي المناسب لهدفك الرياضي': {
    metaDescription:
      'اختر مكملك حسب هدفك: بروتين وكرياتين لبناء العضلات، أحماض أمينية وكافيين للأداء، وفيتامينات ومعادن للمناعة، مع نصائح عملية لشراء المكملات الغذائية في تونس.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن اختيار المكمل الغذائي',
    linksHeading: 'اختر مكملك حسب هدفك الرياضي',
    faqs: [
      {
        question: 'ما المكملات المناسبة لبناء الكتلة العضلية؟',
        answer: 'البروتين لبناء العضلات والحفاظ عليها، والكرياتين لزيادة القوة ودعم الأداء العالي، والأحماض الأمينية لتقليل الهدم العضلي وتسريع التعافي.',
      },
      {
        question: 'ما المكملات المناسبة لتحسين الأداء والطاقة؟',
        answer: 'الكافيين ومكملات ما قبل التمرين، والأحماض الأمينية المتفرعة BCAA، والكربوهيدرات السريعة لزيادة الطاقة أثناء التمارين.',
      },
      {
        question: 'ما أشهر الأخطاء عند استعمال المكملات؟',
        answer: 'استخدام عدة مكملات في نفس الوقت دون معرفة تداخلها، وتجاوز الجرعات الموصى بها، والاعتماد على المكمل وحده دون نظام غذائي وتمارين منتظمة، وشراء منتجات مجهولة المصدر.',
      },
    ],
    internalLinks: [
      { anchor: 'المكملات الغذائية في تونس', href: '/proteines' },
      { anchor: 'مكمل الكرياتين في تونس', href: '/creatine' },
      { anchor: 'الفيتامينات والمعادن', href: '/vitamines' },
    ],
  },
  'هل المكملات الغذائية مفيدة للجميع؟ نصائح مهمة قبل الشراء': {
    metaDescription:
      'المكملات الغذائية ليست مناسبة للجميع بنفس الشكل. تعرّف على من يستفيد منها فعلًا، ومن يجب أن يكون حذرًا، وأربع نصائح عملية قبل شراء أي مكمل غذائي في تونس.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة قبل شراء مكمل غذائي',
    linksHeading: 'تصفّح المكملات حسب هدفك',
    faqs: [
      {
        question: 'هل يحتاج كل شخص إلى مكملات غذائية؟',
        answer: 'لا. من يتبع نظامًا غذائيًا متوازنًا ولا يعاني من نقص غذائي قد لا يحتاج إلى أي مكمل. تصبح المكملات مفيدة للرياضيين ومرتادي قاعات الرياضة، ولمن يعاني من نقص في فيتامينات أو معادن، أو من نظام غذائي مقيّد أو إجهاد بدني عالٍ.',
      },
      {
        question: 'من يجب أن يكون حذرًا عند استعمال المكملات؟',
        answer: 'المصابون بأمراض مزمنة، ومن يتناولون أدوية بصفة منتظمة، والنساء الحوامل أو المرضعات، ومن يعانون من مشاكل في الكلى أو الكبد. في هذه الحالات لا يُستعمل أي مكمل دون معرفة دقيقة بملاءمته.',
      },
      {
        question: 'هل تضمن المكملات نتائج مؤكدة؟',
        answer: 'لا. النتائج تعتمد على التغذية السليمة والانتظام في التمارين والراحة والنوم إضافة إلى الاستخدام الصحيح للمكمل. المكملات لا تعطي نتائج سحرية.',
      },
    ],
    internalLinks: [
      { anchor: 'المكملات الغذائية والبروتين في تونس', href: '/proteines' },
      { anchor: 'قسم الفيتامينات والمعادن', href: '/vitamines' },
      { anchor: 'تصفّح منتجات الكرياتين', href: '/creatine' },
    ],
  },
  'فوائد المكملات الغذائية وأضرارها وكيف تستخدمها بحكمة': {
    metaDescription:
      'فوائد المكملات الغذائية الحقيقية وأضرارها عند الإفراط أو الخلط العشوائي بين عدة منتجات، وخمس قواعد عملية لاستخدامها بحكمة قبل شراء أي مكمل غذائي في تونس.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن فوائد المكملات وأضرارها',
    linksHeading: 'تصفّح المكملات حسب الهدف',
    faqs: [
      {
        question: 'ما أبرز فوائد المكملات الغذائية؟',
        answer: 'دعم بناء العضلات مع البروتين والكرياتين عند التمرين المنتظم، وتعويض نقص العناصر الغذائية، وتحسين الأداء والطاقة، وتسريع الاستشفاء العضلي، ودعم الصحة العامة والمناعة.',
      },
      {
        question: 'ما الأضرار المحتملة عند الاستخدام الخاطئ؟',
        answer: 'الإفراط في الجرعات قد يضغط على الكلى والكبد، والجمع العشوائي بين عدة مكملات قد يسبب مشاكل صحية، واستعمال منتجات مجهولة المصدر قد يؤدي إلى آثار جانبية، والاعتماد الكلي على المكملات بدل الطعام يسبب نقصًا في عناصر أساسية.',
      },
      {
        question: 'كيف أستعمل المكملات بحكمة؟',
        answer: 'حدّد هدفك بوضوح، واختر المنتج المناسب بناءً على تركيبته، والتزم بالجرعات الموصى بها، وحافظ على تغذية متوازنة لأن المكمل يكمّل الغذاء ولا يعوّضه، واشترِ من مصدر موثوق.',
      },
    ],
    internalLinks: [
      { anchor: 'المكملات والبروتين في المتجر', href: '/proteines' },
      { anchor: 'منتجات الكرياتين المتوفرة', href: '/creatine' },
      { anchor: 'منتجات الفيتامينات', href: '/vitamines' },
    ],
  },
  'كيف تختار مكمل غذائي آمن وفعال؟ دليل للمستهلك العربي': {
    metaDescription:
      'خمس خطوات لاختيار مكمل غذائي آمن وفعال: حدّد هدفك، اقرأ المكونات والجرعات، تحقّق من جودة الشركة المصنعة، تجنّب الوعود المبالغ فيها، وابدأ بجرعات معتدلة.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن اختيار مكمل غذائي آمن',
    linksHeading: 'تصفّح المكملات الموثوقة',
    faqs: [
      {
        question: 'ما أول خطوة قبل شراء أي مكمل غذائي؟',
        answer: 'تحديد الهدف: بناء العضلات، تحسين الصحة العامة، تعويض نقص فيتامينات، أو زيادة الطاقة والاستشفاء. كل مكمل له وظيفة محددة، والاختيار يجب أن يرتبط بهدف واضح.',
      },
      {
        question: 'كيف أعرف أن المنتج ذو جودة جيدة؟',
        answer: 'الشفافية في قائمة المكونات مؤشر قوي على الجودة. اختر منتجات من شركات معروفة، مختبرة، وذات معلومات واضحة عن الجرعات، وتجنّب المكونات غير المفهومة أو غير المعلنة.',
      },
      {
        question: 'كيف أميّز الوعود التسويقية المبالغ فيها؟',
        answer: 'أي مكمل يدّعي نتائج سريعة جدًا أو زيادة عضلية خيالية أو حرق دهون بدون مجهود غالبًا ما يكون غير موثوق. المكملات تدعم نمط الحياة الصحي ولا تصنع المعجزات.',
      },
      {
        question: 'ماذا لو كنت أعاني من مرض مزمن؟',
        answer: 'إذا كنت تعاني من أمراض مزمنة أو مشاكل في الكبد أو الكلى أو تتناول أدوية بانتظام، فاختر المكمل بحذر وتجنّب الاستخدام العشوائي، وابدأ بجرعات منخفضة مع مراقبة استجابة الجسم.',
      },
    ],
    internalLinks: [
      { anchor: 'تصفّح المكملات والبروتين', href: '/proteines' },
      { anchor: 'الفيتامينات المتوفرة', href: '/vitamines' },
      { anchor: 'الكرياتين: الأنواع والأحجام', href: '/creatine' },
    ],
  },
  'أكثر الأخطاء شيوعًا عند استخدام المكملات الغذائية': {
    metaDescription:
      'استعمال المكمل بلا هدف، تجاوز الجرعات، الخلط العشوائي، تجاهل التوقيت وشراء منتجات مجهولة المصدر: أشهر سبعة أخطاء في استعمال المكملات الغذائية وكيف تتجنبها.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن أخطاء استعمال المكملات',
    linksHeading: 'تصفّح المكملات حسب الهدف',
    faqs: [
      {
        question: 'هل زيادة الجرعة تعطي نتائج أفضل؟',
        answer: 'لا. الإفراط في استعمال المكملات، خاصة الفيتامينات والمعادن، قد يسبب آثارًا جانبية غير مرغوبة ويؤثر سلبًا على الجسم دون فائدة إضافية.',
      },
      {
        question: 'ما خطر الجمع بين عدة مكملات في نفس الوقت؟',
        answer: 'قد يؤدي إلى تكرار نفس المكونات وزيادة الجرعات اليومية وإجهاد الجسم دون فائدة حقيقية، خاصة إذا لم تكن تعرف كيف تتفاعل هذه المكملات فيما بينها.',
      },
      {
        question: 'لماذا يهم توقيت تناول المكمل؟',
        answer: 'توقيت التناول يؤثر مباشرة في الفعالية. تناول البروتين أو الفيتامينات في وقت غير مناسب قد يقلل من امتصاصها ومن الاستفادة منها.',
      },
    ],
    internalLinks: [
      { anchor: 'قسم المكملات والبروتين', href: '/proteines' },
      { anchor: 'اختيار كرياتين مناسب', href: '/creatine' },
      { anchor: 'تصفّح الفيتامينات والمعادن', href: '/vitamines' },
    ],
  },
  'الفرق بين المكملات الغذائية والأدوية: تفسير واضح وسهل': {
    metaDescription:
      'المكمل الغذائي يدعم التغذية ويعوّض النقص ولا يعالج مرضًا، بينما الدواء علاج بجرعة طبية محددة. شرح بسيط وواضح للفرق بينهما ومتى تحتاج فعلًا إلى مكمل غذائي.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن الفرق بين المكملات والأدوية',
    linksHeading: 'تصفّح المكملات الغذائية',
    faqs: [
      {
        question: 'ما الفرق الأساسي بين المكمل الغذائي والدواء؟',
        answer: 'المكمل الغذائي يهدف إلى الدعم والتحسين وتعويض النقص الغذائي، بينما الدواء يهدف إلى العلاج والتدخل الطبي. المكمل لا يعالج مرضًا، والدواء مصمم للتعامل مع حالة مرضية محددة ويخضع لاختبارات صارمة وجرعات دقيقة.',
      },
      {
        question: 'هل يمكن استعمال المكمل بديلًا عن الدواء؟',
        answer: 'لا. المكملات الغذائية لا تُغني عن العلاج الطبي ولا يجب استخدامها كبديل للأدوية، خاصة في الحالات المرضية المزمنة أو الخطيرة. دورها تكميلي فقط ضمن نمط حياة صحي.',
      },
      {
        question: 'متى أحتاج فعلًا إلى مكمل غذائي؟',
        answer: 'عند ممارسة الرياضة بانتظام وبشدة عالية، أو وجود نقص واضح في بعض العناصر الغذائية، أو صعوبة تلبية الاحتياجات الغذائية من الطعام وحده.',
      },
    ],
    internalLinks: [
      { anchor: 'مكملات وبروتينات متوفرة في تونس', href: '/proteines' },
      { anchor: 'مكملات الفيتامينات', href: '/vitamines' },
    ],
  },
  'المكملات الغذائية والنساء: ما تحتاج معرفته كل امرأة': {
    metaDescription:
      'الحديد وفيتامين D والكالسيوم والبروتين: ما تحتاج كل امرأة معرفته قبل استعمال المكملات الغذائية، والأخطاء الشائعة التي يجب تجنبها حسب المرحلة ونمط الحياة.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن المكملات الغذائية للنساء',
    linksHeading: 'تصفّح المكملات المناسبة',
    faqs: [
      {
        question: 'ما أهم المكملات التي قد تحتاجها النساء؟',
        answer: 'من أكثرها شيوعًا الحديد خاصة في حالات فقر الدم، وفيتامين D لدعم العظام، والكالسيوم للحفاظ على صحة العظام، والبروتين للنساء النشيطات والرياضيات. الاحتياج يختلف من امرأة لأخرى حسب العمر ونمط الحياة.',
      },
      {
        question: 'هل تؤثر المكملات على التوازن الهرموني؟',
        answer: 'الاستخدام العشوائي لبعض المكملات قد يؤثر على التوازن الهرموني، خاصة المنتجات التي تحتوي على مكونات منشطة أو جرعات عالية. لذلك يجب تجنّب المنتجات غير الموثوقة أو غير الواضحة المكونات.',
      },
      {
        question: 'ما الأخطاء الشائعة التي يجب تجنبها؟',
        answer: 'تقليد جرعات الرجال، والجمع بين عدة مكملات دون معرفة، والاعتماد على المكمل بدل الطعام، وتجاهل الحالة الصحية العامة.',
      },
    ],
    internalLinks: [
      { anchor: 'صفحة البروتين في المتجر', href: '/proteines' },
      { anchor: 'صفحة الفيتامينات والمعادن', href: '/vitamines' },
    ],
  },
  'هل المكملات تعوض الغذاء الطبيعي؟ رأي الخبراء': {
    metaDescription:
      'المكملات الغذائية لا تعوّض الغذاء الطبيعي بل تكمّله. تعرّف على الدور الحقيقي للمكمل، ومتى لا يكفي الطعام وحده، ومخاطر الاعتماد الكامل على المكملات بدل الطعام.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن المكملات والغذاء الطبيعي',
    linksHeading: 'تصفّح المكملات الداعمة',
    faqs: [
      {
        question: 'هل تعوّض المكملات الغذاء الطبيعي؟',
        answer: 'لا. الغذاء الطبيعي يوفّر مزيجًا متكاملًا من الفيتامينات والمعادن والألياف ومركبات طبيعية تدعم المناعة، وهذه العناصر تعمل معًا بطريقة لا يمكن تقليدها بالكامل داخل أي مكمل.',
      },
      {
        question: 'متى لا يكفي الغذاء وحده؟',
        answer: 'لدى الرياضيين ذوي المجهود العالي، ومن يتبعون أنظمة غذائية مقيدة، ومن لديهم نقص فيتامينات أو معادن مثبت. في هذه الحالات يكون المكمل خيارًا مساعدًا وليس أساسيًا.',
      },
      {
        question: 'ما مخاطر الاعتماد على المكملات بدل الطعام؟',
        answer: 'نقص الألياف الغذائية، وضعف التنوع الغذائي، ومشاكل في الهضم على المدى الطويل، إضافة إلى تصوّر خاطئ بأن الصحة يمكن شراؤها في علبة.',
      },
    ],
    internalLinks: [
      { anchor: 'البروتين والمكملات الداعمة', href: '/proteines' },
      { anchor: 'الفيتامينات والمعادن الداعمة', href: '/vitamines' },
    ],
  },
  'هل تُغني المكملات الغذائية عن الطعام؟': {
    metaDescription:
      'الطعام الطبيعي يوفّر ألياف وفيتامينات ومضادات أكسدة لا يقدمها أي مكمل بالكامل. تعرّف على متى لا يكفي الغذاء وحده، ودور المكملات الغذائية كدعم لا كبديل.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن المكملات والطعام',
    linksHeading: 'تصفّح المكملات الداعمة',
    faqs: [
      {
        question: 'هل تُغني المكملات الغذائية عن الطعام؟',
        answer: 'لا. الطعام الطبيعي منظومة متكاملة توفّر الفيتامينات والمعادن والألياف ومضادات الأكسدة ومركبات تدعم الهضم والمناعة، وهي تعمل معًا بشكل متوازن لا يقدّمه أي مكمل بالكامل.',
      },
      {
        question: 'ما الدور الحقيقي للمكمل الغذائي؟',
        answer: 'أن يكون دعمًا للنظام الغذائي، ووسيلة لتعويض نقص معين، وحلًا عمليًا في حالات خاصة. هدفه سدّ فجوة غذائية عندما لا يكون الطعام وحده كافيًا، لا استبدال الطعام.',
      },
      {
        question: 'ما مخاطر الاعتماد الكامل على المكملات؟',
        answer: 'نقص الألياف الغذائية، وضعف صحة الجهاز الهضمي، واختلال التوازن الغذائي، إضافة إلى أن بعض العناصر الغذائية تحتاج إلى الطعام الطبيعي ليتم امتصاصها بشكل صحيح.',
      },
    ],
    internalLinks: [
      { anchor: 'مكملات داعمة للنظام الغذائي', href: '/proteines' },
      { anchor: 'مكملات الفيتامينات والمعادن', href: '/vitamines' },
    ],
  },
  'أفضل المكملات للوقاية من نقص الفيتامينات في الشتاء': {
    metaDescription:
      'فيتامين D وC والزنك والحديد وB12: أهم المكملات للوقاية من نقص الفيتامينات في الشتاء في تونس، وأسباب هذا النقص وكيفية استعمال المكملات باعتدال وبجرعات موصى بها.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن نقص الفيتامينات في الشتاء',
    linksHeading: 'تصفّح الفيتامينات والمكملات',
    faqs: [
      {
        question: 'لماذا يزداد نقص الفيتامينات في الشتاء؟',
        answer: 'بسبب قلة التعرض لأشعة الشمس، وانخفاض استهلاك الخضروات والفواكه الطازجة، وضعف الشهية أو تغيّر نمط الأكل، والإرهاق وقلة الحركة.',
      },
      {
        question: 'ما أهم الفيتامينات التي ينقص مستواها شتاءً؟',
        answer: 'فيتامين D هو الأكثر تأثرًا بسبب قلة الشمس، وقد يؤثر نقصه على صحة العظام والمناعة والقوة العضلية. يليه فيتامين C لدعم المناعة وتقليل التعب، والزنك لدعم المناعة وتسريع التعافي، والحديد وفيتامين B12 خاصة لدى النساء.',
      },
      {
        question: 'هل المكملات بديل عن الغذاء المتوازن في الشتاء؟',
        answer: 'لا. المكملات الغذائية تُستخدم للوقاية والدعم وليس كبديل عن الغذاء المتوازن. الاعتدال والالتزام بالجرعات الموصى بها يضمن أفضل فائدة دون آثار جانبية.',
      },
    ],
    internalLinks: [
      { anchor: 'الفيتامينات والمعادن في تونس', href: '/vitamines' },
      { anchor: 'المكملات الغذائية والبروتين', href: '/proteines' },
    ],
  },
  'أفضل أنواع البروتين للعضلات': {
    metaDescription:
      'مقارنة بين مصادر البروتين الحيوانية والنباتية ومكملات الواي والكازين لبناء العضلات، وكيف تختار النوع المناسب لهدفك وتفضيلك الغذائي ونظامك اليومي في تونس.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن أفضل أنواع البروتين للعضلات',
    linksHeading: 'تصفّح مصادر البروتين والمكملات',
    faqs: [
      {
        question: 'ما أفضل نوع بروتين لبناء العضلات؟',
        answer: 'لا يوجد نوع واحد يناسب الجميع. الاختيار يعتمد على هدفك الشخصي، وتفضيلك الغذائي بين الحيواني والنباتي، وسهولة الهضم والامتصاص، وإمكانية دمجه ضمن نظامك الغذائي اليومي.',
      },
      {
        question: 'ما الفرق بين الواي والكازين والبروتين النباتي؟',
        answer: 'الواي بروتين سريع الامتصاص ومثالي بعد التمرين لتعافي العضلات، والكازين يمتص ببطء وهو مناسب قبل النوم لدعم العضلات أثناء الراحة، والبروتين النباتي مثل البازلاء أو الأرز خيار جيد للنباتيين.',
      },
      {
        question: 'لماذا قد يحتاج الرياضي إلى مكمل بروتين؟',
        answer: 'لأن تلبية الاحتياج اليومي من البروتين من الطعام وحده قد تكون صعبة أحيانًا، خاصة مع التمارين المنتظمة. المكمل أداة داعمة لضمان نمو العضلات واستشفائها، وليس بديلًا عن الغذاء.',
      },
    ],
    internalLinks: [
      { anchor: 'بروتين لبناء العضلات', href: '/proteines' },
      { anchor: 'واي بروتين لبناء العضلات', href: '/whey-proteine' },
    ],
  },
  'أفضل 10 مصادر للبروتين تعزز بناء العضلات و صحة': {
    metaDescription:
      'عشرة مصادر بروتين عالية الجودة لبناء العضلات: الدجاج، البيض، الأسماك، اللحوم، الألبان، العدس، الكينوا والواي بروتين، ودور المكملات في تغطية احتياجك اليومي.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن مصادر البروتين',
    linksHeading: 'تصفّح مصادر البروتين والمكملات',
    faqs: [
      {
        question: 'ما أفضل مصادر البروتين الحيواني؟',
        answer: 'صدر الدجاج لأنه غني بالبروتين عالي الجودة وقليل الدهون، والبيض لاحتوائه على بروتين متكامل، والأسماك مثل التونة والسلمون لجمعها بين البروتين والأحماض الدهنية المفيدة، واللحوم الحمراء الخالية من الدهون، والحليب ومشتقاته.',
      },
      {
        question: 'ما أفضل مصادر البروتين النباتي؟',
        answer: 'العدس لغناه بالبروتين والألياف، والحمص والفاصولياء لدعم الطاقة وتغذية العضلات، والكينوا لاحتوائها على بروتين متكامل، والمكسرات والبذور مثل اللوز وبذور الشيا.',
      },
      {
        question: 'متى أحتاج إلى مكمل بروتين؟',
        answer: 'الغذاء الطبيعي يبقى الأساس، لكن من يمارس الرياضة بانتظام أو يرتاد قاعات الجيم قد يجد صعوبة في بلوغ احتياجه اليومي من البروتين من الطعام وحده، فيصبح المكمل وسيلة عملية داعمة.',
      },
    ],
    internalLinks: [
      { anchor: 'مكمل بروتين لتغطية احتياجك', href: '/proteines' },
      { anchor: 'مكمل واي بروتين', href: '/whey-proteine' },
    ],
  },
  'أفضل مصادر البروتين النباتي وما أهميته': {
    metaDescription:
      'العدس والحمص والفول والكينوا والمكسرات والبذور: أفضل مصادر البروتين النباتي وأهميتها للعضلات والهضم، وهل تكفي الرياضيين أم يحتاجون إلى مكمل بروتين داعم؟',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن البروتين النباتي',
    linksHeading: 'اقرأ أيضًا عن مصادر البروتين',
    faqs: [
      {
        question: 'ما أفضل مصادر البروتين النباتي؟',
        answer: 'العدس من أغنى المصادر بالبروتين والحديد والألياف، والحمص والفاصولياء يدعمان صحة القلب وتنظيم الطاقة، والفول واللوبيا مصادر تقليدية في المطبخ العربي، والكينوا تحتوي على جميع الأحماض الأمينية الأساسية، إضافة إلى المكسرات والبذور.',
      },
      {
        question: 'هل يكفي البروتين النباتي للرياضيين؟',
        answer: 'يمكن أن يوفّر جزءًا مهمًا من الاحتياج، لكن الرياضيين ومرتادي قاعات الرياضة غالبًا ما يحتاجون إلى كميات أعلى من البروتين لدعم النمو والاستشفاء، فيكون الجمع بين التغذية الطبيعية والمكملات خيارًا عمليًا.',
      },
      {
        question: 'ما فوائد البروتين النباتي؟',
        answer: 'يساهم في بناء العضلات والحفاظ عليها، ويدعم صحة الجهاز الهضمي بفضل الألياف، ويساعد على التحكم في الوزن والشعور بالشبع، ويقلل من استهلاك الدهون الضارة الموجودة في بعض المصادر الحيوانية.',
      },
    ],
    internalLinks: [
      { anchor: 'قسم البروتين في المتجر', href: '/proteines' },
      { anchor: 'مصادر البروتين الطبيعية', href: '/blog/مصادر البروتين الطبيعية: ما هي؟' },
    ],
  },
  'مصادر البروتين الطبيعية: ما هي؟': {
    metaDescription:
      'البيض واللحوم البيضاء والأسماك والبقوليات والحبوب الكاملة: دليل مصادر البروتين الطبيعية الحيوانية والنباتية، ومتى يصبح مكمل البروتين خيارًا داعمًا للرياضيين.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن مصادر البروتين الطبيعية',
    linksHeading: 'اقرأ أيضًا وقارن المكملات',
    faqs: [
      {
        question: 'ما المقصود بالبروتين الطبيعي؟',
        answer: 'هو البروتين الذي نحصل عليه مباشرة من الأطعمة دون معالجة صناعية، ويتميز بأنه مصحوب بعناصر غذائية أخرى مفيدة مثل الفيتامينات والمعادن والدهون الصحية، ما يعزز قيمته الغذائية.',
      },
      {
        question: 'أيهما أفضل: البروتين الحيواني أم النباتي؟',
        answer: 'لكل نوع فوائده، والأفضل هو التنويع بين المصادر للحصول على بروتين عالي الجودة وعناصر غذائية متكاملة وتوازن صحي مستدام.',
      },
      {
        question: 'متى نحتاج إلى مكملات البروتين؟',
        answer: 'عندما يصعب تغطية الاحتياج اليومي من الطعام وحده، مثل حالات الرياضيين ذوي المجهود العالي، أو ضيق الوقت، أو الأنظمة الغذائية الخاصة. المكمل خيار داعم ولا يُستغنى معه عن الطعام الطبيعي.',
      },
    ],
    internalLinks: [
      { anchor: 'بروتين مكمّل من المتجر', href: '/proteines' },
      { anchor: 'الواي بروتين كمصدر مكمّل', href: '/whey-proteine' },
    ],
  },
  'ما هو أفضل بروتين طبيعي للجسم؟': {
    metaDescription:
      'البيض هو المرجع في جودة البروتين الطبيعي، تليه اللحوم البيضاء والأسماك والبقوليات. تعرّف على أفضل مصادر البروتين الطبيعي ومتى تحتاج إلى مكمل بروتين داعم.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن أفضل بروتين طبيعي',
    linksHeading: 'اقرأ أيضًا وقارن المكملات',
    faqs: [
      {
        question: 'لماذا يُعتبر البيض من أفضل مصادر البروتين الطبيعي؟',
        answer: 'لأنه يحتوي على جميع الأحماض الأمينية الأساسية، ويتميز بسهولة الهضم وقيمته البيولوجية العالية، وهو ما يجعله مرجعًا لقياس جودة البروتينات الأخرى.',
      },
      {
        question: 'ما أفضل بروتين طبيعي للرياضيين؟',
        answer: 'اللحوم البيضاء مثل الدجاج والديك الرومي تجمع بين نسبة بروتين عالية ودهون أقل وسهولة التحكم في السعرات، والأسماك مثل التونة والسردين والسلمون توفّر بروتينًا عالي الجودة مع أحماض دهنية مفيدة.',
      },
      {
        question: 'هل هناك مصدر بروتين واحد يناسب الجميع؟',
        answer: 'لا. أفضل بروتين طبيعي هو الذي يتناسب مع احتياجاتك، ويمكن دمجه بسهولة في نظامك الغذائي، ويُستهلك بتنوع وتوازن. عند صعوبة تلبية الاحتياج اليومي من الطعام فقط يمكن اللجوء إلى مكمل بروتين عالي الجودة.',
      },
    ],
    internalLinks: [
      { anchor: 'منتجات البروتين المتوفرة في تونس', href: '/proteines' },
      { anchor: 'تصفّح الواي بروتين', href: '/whey-proteine' },
    ],
  },
  'ما هي مصادر البروتين؟ دليل شامل لبناء العضلات وتحسين صحتك': {
    metaDescription:
      'دليل مصادر البروتين الحيوانية والنباتية مع الاحتياج اليومي: 0.8 غرام لكل كيلوغرام للبالغين و1.4 إلى 2 غرام للرياضيين، وكيف توزّعه على 3 إلى 5 وجبات يوميًا.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن مصادر البروتين والاحتياج اليومي',
    linksHeading: 'اقرأ أيضًا وقارن المكملات',
    faqs: [
      {
        question: 'كم غرامًا من البروتين أحتاج يوميًا؟',
        answer: 'البالغون العاديون يحتاجون نحو 0.8 غرام لكل كيلوغرام من وزن الجسم يوميًا، أما الرياضيون ومن يمارسون تمارين المقاومة بانتظام فيحتاجون بين 1.4 و2 غرام لكل كيلوغرام حسب شدة التمرين والهدف.',
      },
      {
        question: 'هل من الأفضل توزيع البروتين على عدة وجبات؟',
        answer: 'نعم. يُفضّل توزيع احتياجك اليومي من البروتين على 3 إلى 5 وجبات خلال اليوم بدلًا من تناوله دفعة واحدة في وجبة واحدة.',
      },
      {
        question: 'كيف أحصل على بروتين نباتي كامل؟',
        answer: 'الدمج بين الحبوب والبقوليات، مثل الأرز مع العدس أو الخبز الكامل مع الحمص، يوفّر بروتينًا كاملًا قريبًا من جودة البروتين الحيواني.',
      },
      {
        question: 'ما الذي أتحقق منه عند شراء مكمل بروتين؟',
        answer: 'اقرأ الملصق الغذائي جيدًا، واختر منتجات تحمل شهادات فحص من طرف ثالث مثل NSF أو Informed-Sport، ونوّع بين المصادر الحيوانية والنباتية للحصول على فيتامينات ومعادن وألياف أوسع.',
      },
    ],
    internalLinks: [
      { anchor: 'بروتين بودرة في تونس', href: '/proteines' },
      { anchor: 'واي بروتين بودرة', href: '/whey-proteine' },
    ],
  },
  'أفضل وقت لتناول البروتين: قبل التمرين أم بعده؟': {
    metaDescription:
      'قبل التمرين بـ60 إلى 90 دقيقة أم خلال الساعة التي تليه؟ دليل توقيت تناول البروتين قبل التمرين وبعده، ولماذا تبقى الكمية اليومية الإجمالية أهم من التوقيت.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن توقيت تناول البروتين',
    linksHeading: 'تصفّح مكملات البروتين',
    faqs: [
      {
        question: 'متى أتناول البروتين قبل التمرين؟',
        answer: 'يُفضّل تناوله قبل التمرين بحوالي 60 إلى 90 دقيقة، خاصة إذا كان التمرين قويًا أو طويل المدة، لتزويد الجسم بالأحماض الأمينية وتقليل تكسير العضلات وتحسين التحمل.',
      },
      {
        question: 'هل تناول البروتين بعد التمرين أهم؟',
        answer: 'الفترة التي تلي التمرين من أهم الأوقات، حيث يحتاج الجسم إلى إصلاح الألياف العضلية وتسريع الاستشفاء. تناول البروتين مباشرة بعد التمرين أو خلال ساعة خيار مثالي لمعظم الرياضيين.',
      },
      {
        question: 'ما الأهم: التوقيت أم الكمية اليومية؟',
        answer: 'الأهم من التوقيت هو الكمية اليومية الإجمالية من البروتين وجودته، إضافة إلى الالتزام بنظام غذائي متوازن. الجمع بين جرعة قبل التمرين وأخرى بعده هو الخيار الأمثل إذا كان ذلك ممكنًا.',
      },
    ],
    internalLinks: [
      { anchor: 'مكملات البروتين وأحجامها', href: '/proteines' },
      { anchor: 'واي بروتين سريع الامتصاص', href: '/whey-proteine' },
    ],
  },
  'نظام غذائي عالي البروتين لزيادة الكتلة العضلية بدون دهون': {
    metaDescription:
      'نظام غذائي عالي البروتين: 1.6 إلى 2.2 غرام لكل كيلوغرام من وزن الجسم، فائض حراري محسوب، ومصادر نظيفة، ونموذج وجبات يومي لزيادة الكتلة العضلية دون دهون زائدة.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن النظام الغذائي عالي البروتين',
    linksHeading: 'تصفّح مكملات البروتين',
    faqs: [
      {
        question: 'كم بروتينًا أحتاج لزيادة الكتلة العضلية؟',
        answer: 'المبتدئ يحتاج بين 1.6 و1.8 غرام من البروتين لكل كيلوغرام من وزن الجسم، أما المستوى المتوسط إلى المتقدم فيحتاج بين 1.8 و2.2 غرام لكل كيلوغرام.',
      },
      {
        question: 'كيف أزيد العضلات دون اكتساب دهون؟',
        answer: 'اعتمد فائضًا حراريًا محسوبًا أعلى قليلًا من احتياجك اليومي دون إفراط، واختر مصادر بروتين نظيفة مثل صدر الدجاج والبيض والتونة واللحم الخالي من الدهون، مع كربوهيدرات ذكية مثل الأرز والشوفان والبطاطا ودهون صحية.',
      },
      {
        question: 'ما دور مكملات البروتين في هذا النظام؟',
        answer: 'تسهّل تلبية الاحتياج اليومي من البروتين وتفيد بعد التمرين، لكنها ليست بديلًا عن الطعام الطبيعي.',
      },
    ],
    internalLinks: [
      { anchor: 'بروتين عالي الجودة في تونس', href: '/proteines' },
      { anchor: 'الواي بروتين وأحجامه', href: '/whey-proteine' },
    ],
  },
  'بناء العضلات للمبتدئين: برنامج تدريب وتغذية خطوة بخطوة': {
    metaDescription:
      'برنامج تدريب 3 أيام للمبتدئين بـ3 مجموعات و10 إلى 12 تكرارًا، مع نظام غذائي بسيط ونوم 7 إلى 9 ساعات، ودور مكمل البروتين في تغطية الاحتياج اليومي من البروتين.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن بناء العضلات للمبتدئين',
    linksHeading: 'تصفّح المكملات المناسبة للمبتدئين',
    faqs: [
      {
        question: 'كم يومًا في الأسبوع يتمرن المبتدئ؟',
        answer: 'من 3 إلى 4 أيام في الأسبوع مع يوم راحة بين التمارين. برنامج ثلاثة أيام بسيط يقسّم الصدر والترايسبس، ثم الظهر والبايسبس، ثم الأرجل والأكتاف، بمعدل 3 مجموعات في كل تمرين و10 إلى 12 تكرارًا.',
      },
      {
        question: 'ما أهم قواعد التغذية لبناء العضلات؟',
        answer: 'البروتين ضروري لبناء العضلات ومصادره اللحم والبيض والحليب والبروتين المكمل، والكربوهيدرات مصدر الطاقة مثل الأرز والبطاطا والشوفان، والدهون الصحية مهمة للهرمونات مثل زيت الزيتون والمكسرات.',
      },
      {
        question: 'لماذا تعتبر الراحة والنوم أساسية؟',
        answer: 'العضلات تنمو أثناء الراحة وليس أثناء التمرين، لذلك يُنصح بالنوم من 7 إلى 9 ساعات يوميًا وتجنّب التمرين كل يوم دون راحة.',
      },
    ],
    internalLinks: [
      { anchor: 'تسوّق مكملات البروتين', href: '/proteines' },
      { anchor: 'قسم الواي بروتين', href: '/whey-proteine' },
    ],
  },
  'أخطاء شائعة يرتكبها رواد قاعات الرياضة وتمنعهم من تحقيق نتائج حقيقية': {
    metaDescription:
      'التمرين بلا خطة، تقنية خاطئة، إهمال التغذية، سوء استعمال المكملات، نقص النوم وقلة الصبر: ستة أخطاء تمنع نتائجك في قاعة الرياضة وكيف تصححها خطوة بخطوة.',
    dateModified: '2026-09-08',
    lang: 'ar',
    faqHeading: 'أسئلة شائعة عن أخطاء الجيم',
    linksHeading: 'تصفّح المكملات حسب هدفك',
    faqs: [
      {
        question: 'لماذا لا ألاحظ نتائج رغم انتظامي في الجيم؟',
        answer: 'غالبًا لا يكون السبب ضعف التمارين، بل التمرين بدون خطة واضحة، أو استعمال أوزان ثقيلة دون إتقان التقنية، أو إهمال التغذية، أو سوء استعمال المكملات، أو قلة النوم والراحة.',
      },
      {
        question: 'كيف أستعمل المكملات الغذائية بشكل صحيح؟',
        answer: 'المكملات تُستخدم لدعم التغذية وليست سحرية. تجنّب الاعتماد الكلي عليها، واختر مكمل البروتين المناسب لهدفك، ولا تتجاوز الجرعات الموصى بها.',
      },
      {
        question: 'كم ساعة نوم أحتاج لبناء العضلات؟',
        answer: 'من 7 إلى 9 ساعات يوميًا مع منح الجسم أيام راحة كافية، لأن العضلات تنمو أثناء الراحة وقلة النوم تقلل الأداء وتؤثر على الهرمونات.',
      },
    ],
    internalLinks: [
      { anchor: 'قائمة مكملات البروتين', href: '/proteines' },
      { anchor: 'الواي بروتين في المتجر', href: '/whey-proteine' },
      { anchor: 'شراء الكرياتين من مصدر موثوق', href: '/creatine' },
    ],
  },
};

/** Normalize slug for lookup (decoded, Unicode-normalized, lowercase, trim). */
export function getBlogSeoEntry(slug: string | undefined): BlogSeoEntry | null {
  if (!slug?.trim()) return null;
  // Depending on how the route was reached, Next can expose a Unicode path segment either as
  // decoded text or as its percent-encoded representation. French slugs hide this distinction;
  // Arabic slugs do not. Decode defensively and normalize Unicode so the same article always
  // reaches its SEO overlay, FAQ schema and internal links.
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    // A malformed escape should not take the article page down; use the original value instead.
  }
  const key = decodedSlug.trim().normalize('NFC').toLowerCase();
  return BLOG_SEO_CONFIG[key] ?? null;
}
