/**
 * Short, attributed excerpts from the public Google Business Profile.
 *
 * Checked in the public Google Maps UI on 02/09/2026; multilingual set re-checked 08/09/2026
 * with `?hl=fr`, where a review that offers "Voir la traduction" is shown in its ORIGINAL
 * language and one that does not is already original. That is how `language` below is decided —
 * reading the default English UI translates reviews silently and mislabels every one of them. These are intentionally short
 * excerpts rather than edited testimonials: the profile link beside them lets a visitor inspect
 * the source and the full context. Do not feed these into Organization/LocalBusiness review
 * schema — they are third-party reviews and this site is the reviewed business.
 */
export const GOOGLE_BUSINESS_REVIEWS = [
  {
    author: 'Yosri Beltaifa',
    excerpt: 'ahsen boutique fi tunis — Proteine tunisie sobitas',
    dateLabel: 'Il y a 4 mois',
    language: 'ar-Latn-TN',
  },
  {
    author: 'Ladjimi Syrine',
    excerpt: 'Sobitas meilleure protéine Tunisie. Mr Walid meilleur conseiller.',
    dateLabel: 'Il y a 3 mois',
    language: 'fr',
  },
  {
    author: 'Hassine Boubaker',
    excerpt: 'C’est très bonne produit, je serai bdan dans 2 jours.',
    dateLabel: 'Il y a 2 mois',
    language: 'fr',
  },
  {
    author: 'Ahmed Arraki',
    excerpt: 'Best shop in Tunisie, proteine Tunisie the best one.',
    dateLabel: 'Il y a 4 mois',
    language: 'en',
  },
  {
    author: 'Adam Ladjimi',
    excerpt: 'Protéine Tunisie sobitas the best.',
    dateLabel: 'Il y a 4 mois',
    language: 'fr',
  },
  {
    author: 'Koussay Jebali',
    excerpt: 'I got a pack from them. It is super clean and the service is great. Thank you!',
    dateLabel: 'Il y a une semaine',
    language: 'en',
  },
  {
    author: 'Hanine Ladjimi',
    excerpt: 'One of the best protein shops out there, with the best products and service.',
    dateLabel: 'Il y a 2 mois',
    language: 'en',
  },
  {
    author: 'Jocker Set',
    excerpt: 'Excellent sports supplies, quality products and very good customer care.',
    dateLabel: 'Il y a 11 mois',
    language: 'en',
  },
  {
    author: 'Sarra Issaoui',
    excerpt: 'I am happy with your service and the product. Well done, keep going.',
    dateLabel: 'Il y a 7 mois',
    language: 'en',
  },
  {
    author: 'Nermine Toumi',
    excerpt: 'Best quality in Sousse, guaranteed.',
    dateLabel: 'Il y a 2 mois',
    language: 'en',
  },
  {
    author: 'Marouene Dakhlaoui',
    excerpt: 'Really good customer service. They are flexible and do their best to make sure you are satisfied.',
    dateLabel: 'Il y a 2 ans',
    language: 'en',
  },
  {
    author: 'Slim Slim',
    excerpt: 'Excellent service and top-quality products.',
    dateLabel: 'Il y a 10 mois',
    language: 'en',
  },
  {
    author: 'Finding Me',
    excerpt: 'A very nice place with great customer service and a wide choice of products.',
    dateLabel: 'Il y a un an',
    language: 'en',
  },
  {
    author: 'Walid Zaouali',
    excerpt: 'High quality and great service!',
    dateLabel: 'Il y a 10 mois',
    language: 'en',
  },
  {
    author: 'Med Firas Methamem',
    excerpt: 'Amazing experience.',
    dateLabel: 'Il y a 2 mois',
    language: 'en',
  },
  {
    author: 'Olfa Chourabi',
    excerpt: 'Thank you for your service.',
    dateLabel: 'Il y a 2 mois',
    language: 'en',
  },
  {
    author: 'Feriel El Aroui',
    excerpt: 'Impeccable product quality, amazing customer service and fast replies.',
    dateLabel: 'Il y a un an',
    language: 'en',
  },
  {
    author: 'Mohamed Amine Boufares',
    excerpt: 'The best supplements store in the Sahel.',
    dateLabel: 'Il y a 10 mois',
    language: 'en',
  },
  {
    author: 'Elyess Zarrad',
    excerpt: 'The number one protein shop in Tunisia.',
    dateLabel: 'Il y a 10 mois',
    language: 'en',
  },
  {
    author: 'Bacem Dachraoui',
    excerpt: 'The best quality.',
    dateLabel: 'Il y a 10 mois',
    language: 'en',
  },
] as const;
