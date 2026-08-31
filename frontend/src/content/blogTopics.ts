export const BLOG_TOPICS = [
  {
    id: 'all',
    label: 'Tous les guides',
    shortLabel: 'Tous',
    description: 'Les derniers conseils de l’équipe Protein.tn.',
    keywords: [],
  },
  {
    id: 'complements',
    label: 'Whey & compléments',
    shortLabel: 'Compléments',
    description: 'Comprendre les formats, les étiquettes et les usages.',
    keywords: ['complément', 'compléments', 'whey', 'créatine', 'protéine', 'supplément'],
  },
  {
    id: 'nutrition',
    label: 'Nutrition & objectifs',
    shortLabel: 'Nutrition',
    description: 'Mieux organiser alimentation, masse et perte de poids.',
    keywords: ['nutrition', 'régime', 'alimentaire', 'protéines', 'keto', 'masse', 'perte de poids'],
  },
  {
    id: 'sport',
    label: 'Performance sportive',
    shortLabel: 'Performance',
    description: 'Entraînement, récupération et progression mesurée.',
    keywords: ['sport', 'musculation', 'performance', 'athlète', 'bodybuilding'],
  },
  {
    id: 'lifestyle',
    label: 'Forme au quotidien',
    shortLabel: 'Lifestyle',
    description: 'Des repères simples pour garder de bonnes habitudes.',
    keywords: ['salle', 'sport', 'entraînement', 'fitness', 'objectif'],
  },
  {
    id: 'recettes',
    label: 'Recettes pratiques',
    shortLabel: 'Recettes',
    description: 'Des idées simples adaptées à une routine sportive.',
    keywords: ['recette', 'recettes'],
  },
] as const;

export type BlogTopicId = (typeof BLOG_TOPICS)[number]['id'];
