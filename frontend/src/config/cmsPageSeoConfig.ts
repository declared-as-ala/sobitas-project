/**
 * Phase 2: the homepage owns the brand query, /proteines is the catalogue, and this CMS page
 * answers how to choose. Share the title across the root, legacy CMS and crawler metadata;
 * otherwise the older Filament title keeps claiming the homepage query on one render path.
 */
export function getCmsPageTitleOverride(slug: string): string | undefined {
  return slug === 'proteine-tunisie'
    ? 'Comment choisir sa protéine ? Guide Tunisie | Protein.tn'
    : undefined;
}
