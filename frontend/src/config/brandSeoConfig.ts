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
});

export function getBrandSeoEntry(slug: string | undefined): BrandSeoEntry | null {
  if (!slug?.trim()) return null;
  return BRAND_SEO_CONFIG[slug.trim().toLowerCase()] ?? null;
}
