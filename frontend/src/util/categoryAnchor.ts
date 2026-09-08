/** Commercial intent labels shared by category navigation and editorial links. */
export function categoryAnchor(slug: string, fallback: string): string {
  const labels: Record<string, string> = {
    'whey-proteine': 'Whey protein en Tunisie',
    proteines: 'Catalogue de protéines',
    creatine: 'Créatine monohydrate en Tunisie',
  };
  const key = slug
    .replace(/^https?:\/\/(?:www\.)?protein\.tn\//i, '')
    .replace(/^\//, '')
    .split(/[?#]/, 1)[0]
    .replace(/\/$/, '');
  return labels[key] ?? fallback;
}
