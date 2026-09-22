/**
 * Commercial intent labels shared by category navigation and editorial links.
 *
 * Each label carries the query its target ranks for, because this helper supplies the anchor text
 * of the site's largest link sources: the mega menu, the shop sidebar, the PDP breadcrumb, the
 * CategoryRail tiles and the crawler views. `proteines` used to read "Catalogue de protéines" —
 * the destination's own <title>, but not the phrase anyone searches, and the tile it names is the
 * FIRST anchor to /proteines in the homepage document (the nav row below it comes second). It now
 * follows its two siblings and carries "protéines … Tunisie". The destination's title/H1 stay as
 * the category JSON authored them; the anchor and the title are allowed to differ.
 */
export function categoryAnchor(slug: string, fallback: string): string {
  const labels: Record<string, string> = {
    'whey-proteine': 'Whey protein en Tunisie',
    proteines: 'Protéines en Tunisie',
    creatine: 'Créatine monohydrate en Tunisie',
  };
  const key = slug
    .replace(/^https?:\/\/(?:www\.)?protein\.tn\//i, '')
    .replace(/^\//, '')
    .split(/[?#]/, 1)[0]
    .replace(/\/$/, '');
  return labels[key] ?? fallback;
}
