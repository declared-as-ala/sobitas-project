/**
 * Short, attributed excerpts from the public Google Business Profile.
 *
 * Checked in the signed-in public Google Maps UI on 31/08/2026. These are intentionally short
 * excerpts rather than edited testimonials: the profile link beside them lets a visitor inspect
 * the source and the full context. Do not feed these into Organization/LocalBusiness review
 * schema — they are third-party reviews and this site is the reviewed business.
 */
export const GOOGLE_BUSINESS_REVIEWS = [
  {
    author: 'Hanine Ladjimi',
    excerpt: 'It has the best products and the best service!',
    dateLabel: 'Il y a 2 mois',
    language: 'en',
  },
  {
    author: 'Sarra Issaoui',
    excerpt: 'I am happy with your service and the product. Well done, keep going.',
    dateLabel: 'Il y a 7 mois',
    language: 'en',
  },
  {
    author: 'Jocker Set',
    excerpt: 'Good treatment of customers. Thank you to all the staff working in this company.',
    dateLabel: 'Il y a 11 mois',
    language: 'en',
  },
] as const;
