/**
 * Tunisia-specific keyword mapping for categories.
 * Used to auto-generate SEO metadata when admin content is not filled.
 */

export interface TunisiaCategoryKeywords {
  primary: string;
  variations: string[];
  description: string;
  faqQuestions: { question: string; answer: string }[];
}

export const tunisiaCategoryKeywords: Record<string, TunisiaCategoryKeywords> = {
  // Main protein category
  'proteine-whey': {
    primary: 'Whey Protéine Tunisie',
    variations: ['whey protein tunisie', 'proteine whey tunisie', 'whey pas cher tunisie', 'whey isolate tunisie', 'whey concentre tunisie'],
    description: 'Découvrez notre sélection de whey protein en Tunisie. Whey isolé, concentré, hydrolysé - livraison rapide partout en Tunisie.',
    faqQuestions: [
      { question: 'Quelle whey choisir en Tunisie ?', answer: 'Pour une absorption rapide et un dosage optimal en protéines, la whey isolate est recommandée. La whey concentré offre un meilleur rapport qualité-prix.' },
      { question: 'La whey protein est-elle disponible en livraison en Tunisie ?', answer: 'Oui, nous livrons dans tout le pays - Tunis, Sousse, Sfax, etc. Livraison gratuite dès 200 DT.' },
    ],
  },
  'proteine': {
    primary: 'Protéine Tunisie',
    variations: ['proteine tunisie', 'protein tunisie', 'protéine musculation tunisie', 'compléments protéiques tunisie'],
    description: 'Achètez votre protéine en Tunisie. Large choix de whey, caséine, protéines végétales. Produits authentiques avec livraison rapide.',
    faqQuestions: [
      { question: 'Où acheter des protéines en Tunisie ?', answer: 'Vous pouvez acheter des protéines directement sur protein.tn avec livraison dans tout le pays.' },
      { question: 'Quelle protéine pour la musculation en Tunisie ?', answer: 'La whey protein est la plus populaire pour la musculation. La caséine est idéale pour la nuit.' },
    ],
  },
  'isolate-whey': {
    primary: 'Isolate Whey Tunisie',
    variations: ['isolate whey tunisie', 'whey isolate tunisie', 'protein isolate tunisie', 'iso whey tunisie'],
    description: 'Isolate whey protein de qualité premium en Tunisie. Faible en lactose, haute absorption - livraison rapide.',
    faqQuestions: [
      { question: 'Quelle est la différence entre whey isolate et concentré ?', answer: 'L\'isolate contient plus de 90% de protéines contre 80% pour le concentré. L\'isolate a moins de lactose.' },
    ],
  },
  'proteine-caseine': {
    primary: 'Caséine Tunisie',
    variations: ['caseine tunisie', 'proteine caseine tunisie', 'micellar casein tunisie'],
    description: 'Caseine protein pour la musculation en Tunisie. Idéale pour la récupération nocturne.',
    faqQuestions: [
      { question: 'Quand prendre la caséine ?', answer: 'La caséine est recommandée avant le coucher pour une libération progressive des protéines pendant la nuit.' },
    ],
  },
  'proteine-boeuf': {
    primary: 'Protéine Boeuf Tunisie',
    variations: ['beef protein tunisie', 'proteine boeuf tunisie'],
    description: 'Protéine de boeuf de qualité pour la musculation en Tunisie.',
  },

  // Creatine
  creatine: {
    primary: 'Creatine Tunisie',
    variations: ['crétine tunisie', 'créatine monohydrate tunisie', 'creatine monohydrate tunisie', 'creatine HCL tunisie', 'creatine capsules tunisie'],
    description: 'Creatine de qualité professionnelle en Tunisie. Monohydrate, HCL, Effervescente - améliorez vos performances.',
    faqQuestions: [
      { question: 'Quelle creatine choisir en Tunisie ?', answer: 'La creatine monohydrate est le format le plus étudié et le plus efficace. Elle est aussi la plus économique.' },
      { question: 'La creatine est-elle légale en Tunisie ?', answer: 'Oui, la creatine est légale et disponible sans ordonnance en Tunisie.' },
      { question: 'Comment prendre la creatine ?', answer: 'Prendre 3-5g par jour, de préférence après l\'entraînement. Un cycle de 8-12 semaines est recommandé.' },
    ],
  },

  // BCAA & Amino Acids
  bcaa: {
    primary: 'BCAA Tunisie',
    variations: ['bcaa tunisie', 'acides aminés tunisie', 'amino acids tunisie', 'branche chain amino acids tunisie'],
    description: 'BCAA et acides aminés pour la musculation en Tunisie. Améliorez votre récupération et préservez votre masse musculaire.',
    faqQuestions: [
      { question: 'Quand prendre les BCAA ?', answer: 'Les BCAA peuvent être pris avant, pendant ou après l\'entraînement pour limiter la dégradation musculaire.' },
      { question: 'Les BCAA sont-ils nécessaires ?', answer: 'Pour une alimentation riche en protéines, les BCAA ne sont pas essentiels mais ils aident à la récupération.' },
    ],
  },
  'acides-amines': {
    primary: 'Acides Aminés Tunisie',
    variations: ['amino acids tunisie', 'acides aminés musculation tunisie', 'eaas tunisie'],
    description: 'Compléments d\'acides aminés en Tunisie. BCAA, EAA, Glutamine - pour la performance et la récupération.',
    faqQuestions: [
      { question: 'Quelle différence entre BCAA et EAA ?', answer: 'Les EAA contiennent les 9 acides aminés essentiels contre seulement les 3 branchés pour les BCAA.' },
    ],
  },
  glutamine: {
    primary: 'Glutamine Tunisie',
    variations: ['glutamine tunisie', 'l-glutamine tunisie'],
    description: 'L-Glutamine pour la récupération intestinale et musculaire en Tunisie.',
    faqQuestions: [
      { question: 'À quoi sert la glutamine ?', answer: 'La glutamine soutient le système immunitaire et la récupération musculaire après l\'effort.' },
    ],
  },
  'beta-alanine': {
    primary: 'Beta Alanine Tunisie',
    variations: ['beta alanine tunisie', 'beta-alanine tunisie'],
    description: 'Beta alanine pour améliorer l\'endurance et la performance en musculation en Tunisie.',
    faqQuestions: [
      { question: 'La beta alanine cause des picotements ?', answer: 'Oui, les picotements (paresthésies) sont normaux et sans danger. Ils apparaissent à fortes doses.' },
    ],
  },
  citrulline: {
    primary: 'Citrulline Tunisie',
    variations: ['citrulline tunisie', 'l-citrulline tunisie', 'citrulline malate tunisie'],
    description: 'L-Citrulline pour améliorer la泵 et l\'endurance en Tunisie.',
    faqQuestions: [
      { question: 'Citrulline ou Arginine ?', answer: 'La citrulline est plus efficace pour augment le taux d\'oxyde nitrique que l\'arginine directement.' },
    ],
  },
  'l-arginine': {
    primary: 'L-Arginine Tunisie',
    variations: ['arginine tunisie', 'l-arginine tunisie'],
    description: 'L-Arginine pour la泵 musculaire et la circulation en Tunisie.',
  },

  // Pre-workout & Boosters
  'pre-workout': {
    primary: 'Pre Workout Tunisie',
    variations: ['pre workout tunisie', 'pre-workout tunisie', 'pré-entraînement tunisie', 'booster musculation tunisie'],
    description: 'Pré-workout et boosters d\'énergie pour la musculation en Tunisie. Maximisez vos séances.',
    faqQuestions: [
      { question: 'Quel pre-workout choisir en Tunisie ?', answer: 'Choisir un pre-workout avec caféine, créatine et bêta-alanine pour des effets complets.' },
      { question: 'Le pre-workout est-il dangereux ?', answer: 'Utilisé selon les recommandations, il est sans danger. Éviter la prise le soir pour ne pas perturber le sommeil.' },
    ],
  },
  'pre-entrainement': {
    primary: 'Pré-Entraînement Tunisie',
    variations: ['pre workout tunisie', 'booster entraînement tunisie'],
    description: 'Compléments pré-entraînement en Tunisie pour plus d\'énergie et de concentration.',
  },

  // Gainers & Mass
  'gainers-haute-energie': {
    primary: 'Gainer Haute Energie Tunisie',
    variations: ['gainer tunisie', 'high calorie gainer tunisie', 'gainer prise de masse tunisie'],
    description: 'Gainer haute calorie pour la prise de masse rapide en Tunisie. Apports élevés en protéines et glucides.',
    faqQuestions: [
      { question: 'Quel gainer choisir pour prendre du muscle ?', answer: 'Choisir un gainer avec au moins 50g de protéines et 600+ kcal par dose.' },
      { question: 'Le gainer fait-il grossir ?', answer: 'Le gainer apporte des calories supplémentaires. Utilisé avec entraînement, il aide à la prise de masse.' },
    ],
  },
  'gainers-riches-en-proteines': {
    primary: 'Gainer Protéiné Tunisie',
    variations: ['gainer proteine tunisie', 'lean gainer tunisie'],
    description: 'Gainer riche en protéines pour une prise de masse sèche en Tunisie.',
  },
  'gainers': {
    primary: 'Gainer Tunisie',
    variations: ['gainer tunisie', 'masse gainer tunisie', 'prise de masse tunisie', 'mass gainer tunisie'],
    description: 'Gainer et supplements de prise de masse en Tunisie. Calories, protéines et glucides pour la croissance musculaire.',
    faqQuestions: [
      { question: 'Combien de gainer par jour en Tunisie ?', answer: '1 à 2 doses par jour selon vos besoins caloriques. Toujours combiner avec un entraînement.' },
      { question: 'Gainer ou whey pour la prise de masse ?', answer: 'Le gainer apporte plus de calories. La whey complète les protéines sans les glucides du gainer.' },
    ],
  },
  'carbohydrates': {
    primary: 'Carbohydrates Sportifs Tunisie',
    variations: ['carb tunisie', 'glucides musculation tunisie', 'dextrin tunisie'],
    description: 'Supplements de glucides pour l\'énergie et la récupération en Tunisie.',
  },

  // Fat burners & Weight loss
  'fat-burner': {
    primary: 'Fat Burner Tunisie',
    variations: ['fat burner tunisie', 'brûleur de graisse tunisie', 'thermogénique tunisie'],
    description: 'Fat burners et brûleurs de graisse pour la perte de poids en Tunisie. Stimulants et brûleurs naturels.',
    faqQuestions: [
      { question: 'Le fat burner fonctionne-t-il vraiment ?', answer: 'Les fat burners aident à brûler plus de calories mais doivent être combinés avec régime et exercice.' },
      { question: 'Effets secondaires des fat burners ?', answer: 'Les fat burners peuvent causer nervosité,.insomnie, palpitation. Respecter les dosages.' },
    ],
  },
  'bruleurs-de-graisse': {
    primary: 'Brûleurs de Graisse Tunisie',
    variations: ['brûleur graisse tunisie', 'thermogenic tunisie', 'fat burner tunisie'],
    description: 'Brûleurs de graisse efficaces pour la sèche en Tunisie.',
  },
  'l-carnitine': {
    primary: 'L-Carnitine Tunisie',
    variations: ['l-carnitine tunisie', 'carnitine tunisie', 'l-carnitine lipo tunisie'],
    description: 'L-Carnitine pour la perte de poids et l\'endurance en Tunisie.',
    faqQuestions: [
      { question: 'La L-Carnitine aide-t-elle à perdre du poids ?', answer: 'La L-Carnitine aide le corps à utiliser les graisses comme énergie. Résultats optimaux avec exercice.' },
      { question: 'Quand prendre la L-Carnitine ?', answer: 'Prendre 30 min avant l\'entraînement pour une meilleure utilisation des graisses.' },
    ],
  },
  cla: {
    primary: 'CLA Tunisie',
    variations: ['cla tunisie', 'acide linoléique conjugué tunisie'],
    description: 'CLA pour la perte de poids et le maintien musculaire en Tunisie.',
  },

  // Vitamins & Minerals
  vitamins: {
    primary: 'Vitamines Tunisie',
    variations: ['vitamines tunisie', 'multivitamines tunisie', 'complements vitaminiques tunisie'],
    description: 'Vitamines et minéraux pour la santé et la performance sportive en Tunisie.',
    faqQuestions: [
      { question: 'Quelles vitamines pour les sportifs en Tunisie ?', answer: 'La vitamine D, le zinc, le magnesium et les vitamines B sont essentiels pour les sportifs.' },
    ],
  },
  mineraux: {
    primary: 'Minéraux Tunisie',
    variations: ['mineraux tunisie', 'complements mineraux tunisie', 'zinc tunisie', 'magnesium tunisie'],
    description: 'Minéraux et oligo-éléments pour les sportifs en Tunisie. Zinc, Magnésium, Sélénium.',
  },
  zinc: {
    primary: 'Zinc Tunisie',
    variations: ['zinc tunisie', 'zinc complément tunisie', 'zinc musculation tunisie'],
    description: 'Zinc pour le système immunitaire et la-testostérone en Tunisie.',
    faqQuestions: [
      { question: 'Le zinc aide-t-il à la musculation ?', answer: 'Le zinc est essentiel pour la production de testostérone et la récupération.' },
    ],
  },
  magnesium: {
    primary: 'Magnésium Tunisie',
    variations: ['magnesium tunisie', 'magnesium musculation tunisie', 'magnesium glycinate tunisie'],
    description: 'Magnésium pour la récupération musculaire et le sommeil en Tunisie.',
    faqQuestions: [
      { question: 'Quel magnesium pour les sportifs ?', answer: 'Le magnesium glycinate ou citrate est mieux absorbé. Important pour les cramps et le sommeil.' },
    ],
  },
  omega3: {
    primary: 'Omega 3 Tunisie',
    variations: ['omega 3 tunisie', 'omega-3 tunisie', 'poisson gras tunisie', 'dha epa tunisie'],
    description: 'Oméga 3 pour la santé cardiovasculaire et inflammatoire en Tunisie.',
    faqQuestions: [
      { question: 'Oméga 3 pour les sportifs ?', answer: 'Les oméga 3 réduisent l\'inflammation et aident à la récupération après l\'entraînement.' },
    ],
  },

  // Other supplements
  'boosters-hormonaux': {
    primary: 'Boosters Hormonaux Tunisie',
    variations: ['booster testostérone tunisie', 'testosterone booster tunisie', 'tribulus tunisie'],
    description: 'Boosters de testostérone et suppléments hormonaux en Tunisie.',
  },
  tribulus: {
    primary: 'Tribulus Tunisie',
    variations: ['tribulus tunisie', 'tribulus terrestris tunisie'],
    description: 'Tribulus pour la production naturelle de testostérone en Tunisie.',
  },
  ashwagandha: {
    primary: 'Ashwagandha Tunisie',
    variations: ['ashwagandha tunisie', 'withania somnifera tunisie'],
    description: 'Ashwagandha pour le stress et la récupération en Tunisie.',
    faqQuestions: [
      { question: 'L\'ashwagandha aide-t-elle à la musculation ?', answer: 'Elle réduit le stress et peut améliorer la récupération et la force.' },
    ],
  },
  collagene: {
    primary: 'Collagène Tunisie',
    variations: ['collagène tunisie', 'collagen tunisie', 'peptide collagène tunisie'],
    description: 'Collagène pour les articulations et la peau en Tunisie.',
  },
  hmb: {
    primary: 'HMB Tunisie',
    variations: ['hmb tunisie', 'beta-hydroxy beta-methylbutyrate tunisie'],
    description: 'HMB pour préserver la masse musculaire en Tunisie.',
  },
  eaa: {
    primary: 'EAA Tunisie',
    variations: ['eaa tunisie', 'acides aminés essentiels tunisie'],
    description: 'Acides aminés essentiels (EAA) pour la musculation en Tunisie.',
  },
  zma: {
    primary: 'ZMA Tunisie',
    variations: ['zma tunisie', 'zinc magnesium aspartate tunisie'],
    description: 'ZMA (Zinc + Magnésium + Vitamine B6) pour la récupération en Tunisie.',
  },

  // Accessories
  'shakers-bouteilles-sportives': {
    primary: 'Shaker Tunisie',
    variations: ['shaker tunisie', 'bouteille sport tunisie', ' shaker Bottle tunisie', 'shaker gym tunisie'],
    description: 'Shakers et bouteilles sportives pour préparer vos boissons en Tunisie.',
    faqQuestions: [
      { question: 'Où acheter un shaker en Tunisie ?', answer: 'Available sur protein.tn avec votre commande de supplements.' },
    ],
  },
  shaker: {
    primary: 'Shaker Tunisie',
    variations: ['shaker tunisie', 'bouteille mélangeuse tunisie'],
    description: 'Shakers pour préparer vos protéines et gainers en Tunisie.',
  },
  'gants-de-musculation': {
    primary: 'Gants Musculation Tunisie',
    variations: ['gants musculation tunisie', 'gym gloves tunisie', 'gants fitness tunisie'],
    description: 'Gants de musculation et fitness pour protéger vos mains en Tunisie.',
  },
  'ceinture-de-musculation': {
    primary: 'Ceinture Musculation Tunisie',
    variations: ['ceinture musculation tunisie', 'ceinture gym tunisie', 'ceinture weightlifting tunisie'],
    description: 'Ceintures de musculation pour le soutien lombaire en Tunisie.',
  },
  'bandes-de-soutien-musculaire': {
    primary: 'Bandes de Soutien Musculaire Tunisie',
    variations: ['bandes soutien tunisie', 'support bandage tunisie', 'muscle support tunisie', 'bandes de compression tunisie'],
    description: 'Bandes de soutien et compression pour la récupération et le soutien articulaire en Tunisie.',
    faqQuestions: [
      { question: 'Comment utiliser les bandes de soutien musculaire ?', answer: 'Enrouler autour de l\'articulation ou du muscle à soutenir. Ne pas trop serrer.' },
    ],
  },
  'materiel-de-musculation': {
    primary: 'Matériel Musculation Tunisie',
    variations: ['equipement gym tunisie', 'materiel fitness tunisie', 'accessoires musculation tunisie'],
    description: 'Matériel de musculation et accessoires de fitness en Tunisie.',
  },
  'equipement-cardio-fitness': {
    primary: 'Equipement Cardio Fitness Tunisie',
    variations: ['equipement cardio tunisie', 'tapis course tunisie', 'velo appartement tunisie'],
    description: 'Équipements de cardio training et fitness en Tunisie.',
  },
  't-shirts-de-sport': {
    primary: 'T-Shirts Sport Tunisie',
    variations: ['t-shirt fitness tunisie', 't-shirt musculation tunisie', 'vetement sport tunisie'],
    description: 'T-shirts de sport et vêtements de fitness en Tunisie.',
  },
};

export function getTunisiaKeywordsForCategory(slug: string): TunisiaCategoryKeywords | null {
  const normalizedSlug = slug.toLowerCase().replace(/[-\s]+/g, '-');
  
  // Direct match
  if (tunisiaCategoryKeywords[normalizedSlug]) {
    return tunisiaCategoryKeywords[normalizedSlug];
  }
  
  // Partial match
  for (const key of Object.keys(tunisiaCategoryKeywords)) {
    if (normalizedSlug.includes(key) || key.includes(normalizedSlug)) {
      return tunisiaCategoryKeywords[key];
    }
  }
  
  return null;
}

export function generateTunisiaMetaTitle(categoryName: string, keywords: TunisiaCategoryKeywords | null): string {
  if (keywords) {
    return `${keywords.primary} | Protéine Tunisie`;
  }
  return `${categoryName} en Tunisie | Protéine Tunisie`;
}

export function generateTunisiaMetaDescription(categoryName: string, keywords: TunisiaCategoryKeywords | null): string {
  if (keywords && keywords.description) {
    return keywords.description.slice(0, 160);
  }
  return `Achetez ${categoryName.toLowerCase()} en Tunisie sur protein.tn. Large choix, livraison rapide, produits authentiques.`;
}

export function generateTunisiaH1(categoryName: string, keywords: TunisiaCategoryKeywords | null): string {
  if (keywords) {
    return keywords.primary;
  }
  return `${categoryName} Tunisie`;
}