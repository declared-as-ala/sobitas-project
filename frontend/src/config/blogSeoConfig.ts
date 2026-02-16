/**
 * SEO overlay for target blog articles: FAQs + internal links with keyword anchors.
 * When an article slug matches, BlogSeoBlock renders FAQ section and "Lire aussi" links.
 * Create articles in CMS with these slugs to get full SEO benefit.
 */

export interface BlogSeoEntry {
  /** FAQ for FAQPage schema and on-page accordion */
  faqs: Array<{ question: string; answer: string }>;
  /** Internal links to categories (anchor text = keyword for SEO) */
  internalLinks: Array<{ anchor: string; href: string }>;
}

/** Slug (from URL) → SEO config. Use normalized slug (lowercase, no accents). */
export const BLOG_SEO_CONFIG: Record<string, BlogSeoEntry> = {
  'quest-ce-que-la-whey': {
    faqs: [
      { question: "Qu'est-ce que la whey protein ?", answer: "La whey (lactosérum) est la fraction protéique soluble du lait. Elle est absorbée rapidement et constitue une source de protéines complètes idéale pour la récupération et la prise de masse." },
      { question: "Whey ou isolate – quelle différence ?", answer: "La whey concentrée contient environ 70–80 % de protéines. L'isolat est plus filtré (90 %+ de protéines) et contient très peu de lactose, idéal pour la sèche ou les intolérants." },
      { question: "Où acheter de la whey en Tunisie ?", answer: "SOBITAS propose une large gamme de whey protein en Tunisie avec livraison à Sousse, Tunis et Sfax. Consultez notre catégorie whey protein tunisie pour les prix et la livraison." },
    ],
    internalLinks: [
      { anchor: 'whey protein tunisie', href: '/category/whey-protein' },
      { anchor: 'creatine tunisie', href: '/category/creatine' },
      { anchor: 'prix whey Tunisie', href: '/category/proteines' },
    ],
  },
  'whey-ou-isolate': {
    faqs: [
      { question: "Whey ou isolate – lequel choisir ?", answer: "Choisissez la whey concentrée pour un rapport qualité/prix optimal et la prise de masse. Choisissez l'isolat pour la sèche, moins de glucides ou une intolérance au lactose." },
      { question: "Quel est le meilleur prix isolate whey Tunisie ?", answer: "SOBITAS propose des isolats de whey à des prix compétitifs. Consultez notre catégorie whey protein tunisie pour comparer les prix et la livraison en Tunisie." },
    ],
    internalLinks: [
      { anchor: 'whey protein tunisie', href: '/category/whey-protein' },
      { anchor: 'isolat whey tunisie', href: '/category/whey-protein' },
      { anchor: 'creatine tunisie', href: '/category/creatine' },
    ],
  },
  'comment-prendre-creatine': {
    faqs: [
      { question: "Comment prendre la créatine ?", answer: "Prenez 3 à 5 g de créatine monohydrate par jour, de préférence après l'entraînement ou avec un repas. Une dose constante suffit ; la phase de charge n'est pas nécessaire." },
      { question: "Quand prendre la créatine ?", answer: "Après l'entraînement ou avec un repas est idéal. L'important est la régularité quotidienne plutôt que le moment précis." },
      { question: "Où acheter de la créatine en Tunisie ?", answer: "SOBITAS propose de la créatine monohydrate aux meilleurs prix avec livraison à Tunis, Sousse et Sfax. Consultez notre catégorie creatine tunisie." },
    ],
    internalLinks: [
      { anchor: 'creatine tunisie', href: '/category/creatine' },
      { anchor: 'creatine monohydrate prix tunisie', href: '/category/creatine' },
      { anchor: 'whey protein tunisie', href: '/category/whey-protein' },
    ],
  },
  'bcaa-utile-ou-pas': {
    faqs: [
      { question: "BCAA utile ou pas en musculation ?", answer: "Les BCAA peuvent aider à la récupération et limiter le catabolisme, surtout à jeun ou en déficit calorique. Pour une alimentation déjà riche en protéines, l'effet est plus limité." },
      { question: "Quand prendre les BCAA ?", answer: "Avant, pendant ou après l'entraînement. Beaucoup les prennent pendant la séance. Une dose de 5–10 g est courante." },
      { question: "Où acheter des BCAA en Tunisie ?", answer: "SOBITAS propose des BCAA aux meilleurs prix avec livraison à Tunis, Sousse et Sfax. Consultez notre catégorie bcaa tunisie." },
    ],
    internalLinks: [
      { anchor: 'bcaa tunisie', href: '/category/bcaa' },
      { anchor: 'whey protein tunisie', href: '/category/whey-protein' },
      { anchor: 'creatine tunisie', href: '/category/creatine' },
    ],
  },
  'creatine-musculation-avis': {
    faqs: [
      { question: "La créatine est-elle efficace en musculation ?", answer: "Oui. La créatine est l'un des compléments les plus étudiés. Elle améliore la force, la récupération et peut aider au gain de masse musculaire." },
      { question: "Créatine monohydrate prix Tunisie ?", answer: "SOBITAS propose de la créatine monohydrate aux meilleurs prix en Tunisie. Livraison à Sousse, Tunis et Sfax. Consultez notre catégorie creatine tunisie." },
    ],
    internalLinks: [
      { anchor: 'creatine tunisie', href: '/category/creatine' },
      { anchor: 'comment prendre creatine', href: '/blog/comment-prendre-creatine' },
      { anchor: 'whey protein tunisie', href: '/category/whey-protein' },
    ],
  },
};

/** Normalize slug for lookup (lowercase, trim). */
export function getBlogSeoEntry(slug: string | undefined): BlogSeoEntry | null {
  if (!slug?.trim()) return null;
  const key = slug.trim().toLowerCase();
  return BLOG_SEO_CONFIG[key] ?? null;
}
