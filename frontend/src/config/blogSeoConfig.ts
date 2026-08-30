/**
 * SEO overlay for target blog articles: FAQs + internal links with keyword anchors.
 * When an article slug matches, BlogSeoBlock renders FAQ section and "Lire aussi" links.
 * Create articles in CMS with these slugs to get full SEO benefit.
 */
///dd
export interface BlogSeoEntry {
  /** Optional visible H1/title refresh. The URL remains unchanged to preserve accumulated signals. */
  headline?: string;
  /** Optional search snippet aligned with the refreshed article. */
  metaDescription?: string;
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
  'mass-gainer-prix-tunisie-guide-complet-pour-2025': {
    headline: 'Mass Gainer Prix Tunisie : guide d’achat 2026',
    metaDescription:
      'Prix des mass gainers en Tunisie, formats, calories et marques : comparez les critères utiles pour choisir selon votre objectif et votre budget en 2026.',
    dateModified: '2026-08-30',
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
      { anchor: 'comparer les mass gainers en Tunisie', href: '/gainers-proteines' },
      { anchor: 'protéines et whey en Tunisie', href: '/proteines' },
      { anchor: 'créatine pour la prise de masse', href: '/creatine' },
      { anchor: 'produits Dymatize en Tunisie', href: '/dymatize' },
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
      { anchor: 'ماس غاينر لزيادة الوزن', href: '/gainers-proteines' },
    ],
  },
  'quest-ce-que-la-whey': {
    faqs: [
      { question: "Qu'est-ce que la whey protein ?", answer: "La whey (lactosérum) est la fraction protéique soluble du lait. Elle est absorbée rapidement et constitue une source de protéines complètes idéale pour la récupération et la prise de masse." },
      { question: "Whey ou isolate – quelle différence ?", answer: "La whey concentrée contient environ 70–80 % de protéines. L'isolat est plus filtré (90 %+ de protéines) et contient très peu de lactose, idéal pour la sèche ou les intolérants." },
      { question: "Où acheter de la whey en Tunisie ?", answer: "Proteine Tunisie propose une large gamme de whey protein en Tunisie avec livraison à Sousse, Tunis et Sfax. Consultez notre catégorie whey protein tunisie pour les prix et la livraison." },
    ],
    internalLinks: [
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
      { anchor: 'acheter whey en tunisie', href: '/whey-proteine' },
      { anchor: 'meilleure whey protein', href: '/whey-proteine' },
      { anchor: 'creatine tunisie', href: '/creatine' },
      { anchor: 'prix whey Tunisie', href: '/whey-proteine' },
    ],
  },
  'whey-ou-isolate': {
    faqs: [
      { question: "Whey ou isolate – lequel choisir ?", answer: "Choisissez la whey concentrée pour un rapport qualité/prix optimal et la prise de masse. Choisissez l'isolat pour la sèche, moins de glucides ou une intolérance au lactose." },
      { question: "Quel est le meilleur prix isolate whey Tunisie ?", answer: "Proteine Tunisie propose des isolats de whey à des prix compétitifs. Consultez notre catégorie whey protein tunisie pour comparer les prix et la livraison en Tunisie." },
    ],
    internalLinks: [
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
      { anchor: 'acheter whey en tunisie', href: '/whey-proteine' },
      { anchor: 'meilleure whey protein', href: '/whey-proteine' },
      { anchor: 'isolat whey tunisie', href: '/whey-proteine' },
      { anchor: 'creatine tunisie', href: '/creatine' },
    ],
  },
  'comment-prendre-creatine': {
    faqs: [
      { question: "Comment prendre la créatine ?", answer: "Prenez 3 à 5 g de créatine monohydrate par jour, de préférence après l'entraînement ou avec un repas. Une dose constante suffit ; la phase de charge n'est pas nécessaire." },
      { question: "Quand prendre la créatine ?", answer: "Après l'entraînement ou avec un repas est idéal. L'important est la régularité quotidienne plutôt que le moment précis." },
      { question: "Où acheter de la créatine en Tunisie ?", answer: "Proteine Tunisie propose de la créatine monohydrate aux meilleurs prix avec livraison à Tunis, Sousse et Sfax. Consultez notre catégorie creatine tunisie." },
    ],
    internalLinks: [
      { anchor: 'creatine tunisie', href: '/creatine' },
      { anchor: 'creatine monohydrate prix tunisie', href: '/creatine' },
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
    ],
  },
  'bcaa-utile-ou-pas': {
    faqs: [
      { question: "BCAA utile ou pas en musculation ?", answer: "Les BCAA peuvent aider à la récupération et limiter le catabolisme, surtout à jeun ou en déficit calorique. Pour une alimentation déjà riche en protéines, l'effet est plus limité." },
      { question: "Quand prendre les BCAA ?", answer: "Avant, pendant ou après l'entraînement. Beaucoup les prennent pendant la séance. Une dose de 5–10 g est courante." },
      { question: "Où acheter des BCAA en Tunisie ?", answer: "Proteine Tunisie propose des BCAA aux meilleurs prix avec livraison à Tunis, Sousse et Sfax. Consultez notre catégorie bcaa tunisie." },
    ],
    internalLinks: [
      { anchor: 'bcaa tunisie', href: '/bcaa' },
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
      { anchor: 'creatine tunisie', href: '/creatine' },
    ],
  },
  'creatine-musculation-avis': {
    faqs: [
      { question: "La créatine est-elle efficace en musculation ?", answer: "Oui. La créatine est l'un des compléments les plus étudiés. Elle améliore la force, la récupération et peut aider au gain de masse musculaire." },
      { question: "Créatine monohydrate prix Tunisie ?", answer: "Proteine Tunisie propose de la créatine monohydrate aux meilleurs prix en Tunisie. Livraison à Sousse, Tunis et Sfax. Consultez notre catégorie creatine tunisie." },
    ],
    internalLinks: [
      { anchor: 'créatine Tunisie', href: '/creatine' },
      { anchor: 'comment prendre creatine', href: '/blog/comment-prendre-creatine' },
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
    ],
  },

  // ── Creatine commercial intent blog posts ─────────────────────────────────

  'prix-de-la-creatine-en-tunisie': {
    faqs: [
      { question: "Quel est le prix moyen de la créatine en Tunisie ?", answer: "Le prix de la créatine monohydrate en Tunisie commence à environ 29 DT pour un format 300 g et monte jusqu'à 120–150 DT pour les formats 1 kg de marques premium comme Optimum Nutrition ou MuscleTech. Le format et la marque influencent fortement le prix au gramme." },
      { question: "Comment comparer les prix de la créatine selon le format ?", answer: "Calculez toujours le prix au gramme (prix total ÷ poids net en grammes). Un format 1 kg est généralement 30 à 40 % moins cher au gramme qu'un 300 g. Les formats Creapure® sont un peu plus chers mais garantissent une pureté maximale." },
    ],
    internalLinks: [
      { anchor: 'voir les prix de nos créatines', href: '/creatine' },
      { anchor: 'acheter créatine monohydrate en Tunisie', href: '/creatine' },
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
    ],
  },

  'ou-acheter-de-la-creatine-en-tunisie': {
    faqs: [
      { question: "Où acheter de la créatine fiable en Tunisie ?", answer: "Privilegiez les distributeurs officiels qui importent directement avec numéros de lot traçables. Protein.tn est une référence en Tunisie avec plus de 15 ans d'expérience, des produits 100 % originaux et une livraison dans tous les gouvernorats." },
      { question: "Comment éviter les contrefaçons de créatine en Tunisie ?", answer: "Achetez uniquement auprès de sites ou magasins agréés. Vérifiez la présence d'un sceau de sécurité, d'un numéro de lot et d'une date de péremption. Méfiez-vous des prix anormalement bas et des emballages sans mention d'importateur officiel." },
    ],
    internalLinks: [
      { anchor: 'consulter la sélection de créatine Protein.tn', href: '/creatine' },
      { anchor: 'acheter créatine originale en Tunisie', href: '/creatine' },
      { anchor: 'protéines whey Tunisie', href: '/whey-proteine' },
    ],
  },

  'creatine-tunisie': {
    faqs: [
      { question: "Quels sont les bienfaits prouvés de la créatine ?", answer: "La créatine augmente les réserves de phosphocréatine dans les muscles, ce qui améliore la production d'ATP lors des efforts courts et intenses. Résultat : plus de force, plus de répétitions, une meilleure récupération inter-séries et une volumisation cellulaire. Ces effets sont validés par des centaines d'études." },
      { question: "Quelle est la dose de créatine recommandée ?", answer: "3 à 5 g par jour en prise continue est la dose standard recommandée. La régularité prime sur le timing : peu importe si vous la prenez avant ou après l'entraînement, l'essentiel est de ne pas oublier les jours de repos." },
    ],
    internalLinks: [
      { anchor: 'découvrir toutes nos créatines', href: '/creatine' },
      { anchor: 'créatine monohydrate Tunisie', href: '/creatine' },
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
    ],
  },

  'creatine-tunisie-guide-complet-bienfaits-et-meilleures-marques-disponibles': {
    faqs: [
      { question: "Quelles marques de créatine sont disponibles en Tunisie ?", answer: "Optimum Nutrition, MuscleTech, BSN, Quamtrax, Kevin Levrone et d'autres marques internationales sont disponibles sur Protein.tn avec livraison rapide partout en Tunisie." },
      { question: "La créatine est-elle sûre ?", answer: "Oui, la créatine monohydrate est l'un des compléments les mieux étudiés et les plus sûrs quand elle est prise aux doses recommandées (3–5 g/j). Consultez votre médecin si vous avez des problèmes rénaux préexistants." },
    ],
    internalLinks: [
      { anchor: 'voir les créatines disponibles', href: '/creatine' },
      { anchor: 'acheter créatine en Tunisie', href: '/creatine' },
      { anchor: 'compléments alimentaires Tunisie', href: '/complements-alimentaires' },
    ],
  },

  'meilleure-creatine-2026-notre-guide-pour-bien-choisir': {
    faqs: [
      { question: "Quelle est la meilleure créatine en 2026 ?", answer: "La créatine monohydrate reste la référence en 2026 : la mieux documentée, la plus abordable et la plus efficace. Pour une pureté maximale, les produits Creapure® sont le choix des athlètes de compétition. La créatine micronisée est idéale pour une meilleure dissolution et tolérance digestive." },
      { question: "La créatine Creapure® est-elle disponible en Tunisie ?", answer: "Oui, plusieurs produits certifiés Creapure® sont disponibles sur Protein.tn avec livraison rapide partout en Tunisie et paiement à la livraison." },
    ],
    internalLinks: [
      { anchor: 'choisir votre créatine sur Protein.tn', href: '/creatine' },
      { anchor: 'créatine Creapure® Tunisie', href: '/creatine' },
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
    ],
  },

  'les-meilleures-marques-de-creatine-en-tunisie-comparatif-et-avis': {
    faqs: [
      { question: "Quelle est la meilleure marque de créatine disponible en Tunisie ?", answer: "Optimum Nutrition (Micronized Creatine), MuscleTech (Platinum Creatine), Quamtrax et BSN sont parmi les meilleures marques disponibles en Tunisie. Le choix dépend de votre budget et de vos préférences (poudre ou capsules, monohydrate ou Creapure®)." },
      { question: "Où comparer les marques de créatine en Tunisie ?", answer: "Protein.tn regroupe les meilleures marques disponibles avec des descriptions détaillées, les prix en dinars et la disponibilité en temps réel." },
    ],
    internalLinks: [
      { anchor: 'voir les prix de nos créatines', href: '/creatine' },
      { anchor: 'sélection créatine Protein.tn', href: '/creatine' },
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
    ],
  },

  'creatine-prix-en-tunisie-et-comment-choisir-le-meilleur-produit': {
    faqs: [
      { question: "Comment choisir la meilleure créatine selon son prix en Tunisie ?", answer: "Comparez le prix au gramme plutôt que le prix total. Une créatine monohydrate à 60 DT pour 1 kg est plus économique qu'un 300 g à 30 DT. Pour un maximum de qualité, choisissez un produit certifié Creapure® même à prix légèrement supérieur." },
    ],
    internalLinks: [
      { anchor: 'voir les créatines disponibles', href: '/creatine' },
      { anchor: 'acheter créatine monohydrate Tunisie', href: '/creatine' },
      { anchor: 'protéines whey', href: '/whey-proteine' },
    ],
  },

  'meilleur-creatine-pour-prise-de-masse': {
    faqs: [
      { question: "Quelle créatine prendre pour la prise de masse ?", answer: "La créatine monohydrate est la meilleure option pour la prise de masse : elle augmente la force pour des séances plus efficaces, favorise la volumisation musculaire et est abordable. Associez-la à une whey protein de qualité et un surplus calorique pour des résultats optimaux." },
      { question: "Créatine et whey protein : peut-on les combiner ?", answer: "Oui, c'est même recommandé. La créatine améliore la force pendant l'entraînement, la whey optimise la récupération et la synthèse protéique après. Prenez 3–5 g de créatine n'importe quand dans la journée et votre shaker de whey dans l'heure post-entraînement." },
    ],
    internalLinks: [
      { anchor: 'acheter créatine en Tunisie', href: '/creatine' },
      { anchor: 'whey protein tunisie', href: '/whey-proteine' },
      { anchor: 'gainers prise de masse Tunisie', href: '/gainers-proteines' },
    ],
  },

  'ou-acheter-de-la-creatine-originale-en-tunisie-le-guide-complet': {
    faqs: [
      { question: "Comment reconnaître une créatine originale en Tunisie ?", answer: "Une créatine originale porte un sceau de sécurité intact, un numéro de lot lisible et une date de péremption claire. Les produits Creapure® ont un logo distinctif sur l'emballage. Achetez toujours auprès d'un distributeur agréé comme Protein.tn." },
      { question: "Protein.tn vend-il de la créatine originale ?", answer: "Oui. Protein.tn importe directement ses créatines auprès des fabricants ou distributeurs officiels. Chaque produit a un numéro de lot traçable. Livraison partout en Tunisie avec paiement à la livraison." },
    ],
    internalLinks: [
      { anchor: 'consulter la sélection de créatine Protein.tn', href: '/creatine' },
      { anchor: 'acheter créatine originale Tunisie', href: '/creatine' },
      { anchor: 'whey protein originale tunisie', href: '/whey-proteine' },
    ],
  },

  'quelle-est-la-meilleure-creatine-monohydrate-en-tunisie': {
    faqs: [
      { question: "Quelle créatine monohydrate choisir en Tunisie ?", answer: "Optimum Nutrition Micronized Creatine et MuscleTech Platinum Creatine sont parmi les meilleures options disponibles en Tunisie. Pour la pureté maximale, choisissez un produit Creapure®. Comparez les prix et les formats sur Protein.tn." },
      { question: "La créatine monohydrate micronisée est-elle meilleure ?", answer: "La créatine micronisée est chimiquement identique à la monohydrate classique, mais ses particules ultra-fines améliorent la solubilité dans l'eau et la tolérance digestive. Elle est préférable si vous avez un estomac sensible ou si votre créatine ne se dissout pas bien." },
    ],
    internalLinks: [
      { anchor: 'acheter créatine monohydrate en Tunisie', href: '/creatine' },
      { anchor: 'voir les créatines disponibles', href: '/creatine' },
      { anchor: 'protéines whey Tunisie', href: '/whey-proteine' },
    ],
  },

  'meilleures-marques-de-creatine-en-tunisie': {
    faqs: [
      { question: "Quelles sont les meilleures marques de créatine en Tunisie en 2026 ?", answer: "Optimum Nutrition, MuscleTech, BSN, Quamtrax et Kevin Levrone sont les marques les plus populaires disponibles en Tunisie. Chacune propose des créatines monohydrate ou Creapure® adaptées à différents budgets et objectifs." },
      { question: "La créatine est-elle risquée pour les reins ?", answer: "Chez des personnes en bonne santé, la créatine monohydrate aux doses recommandées (3–5 g/j) est considérée comme sûre. Si vous avez des problèmes rénaux préexistants, consultez votre médecin avant de commencer une supplémentation." },
    ],
    internalLinks: [
      { anchor: 'découvrir toutes nos créatines', href: '/creatine' },
      { anchor: 'créatine Tunisie prix', href: '/creatine' },
      { anchor: 'whey protein Tunisie', href: '/whey-proteine' },
    ],
  },
};

/** Normalize slug for lookup (lowercase, trim). */
export function getBlogSeoEntry(slug: string | undefined): BlogSeoEntry | null {
  if (!slug?.trim()) return null;
  const key = slug.trim().toLowerCase();
  return BLOG_SEO_CONFIG[key] ?? null;
}
