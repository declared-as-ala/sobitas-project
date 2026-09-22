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
 *
 * ── WHY THE LIST GREW ON 22/09/2026 ────────────────────────────────────────────────────────────
 * Three slugs were labelled here and forty-eight were not, so every other category was linked
 * sitewide by its raw `designation_fr` — the shelf name from the catalogue database ("Équipements
 * et Accessoires Sportifs", "Santé & Vitalité"), which is not what anyone types. Anchor text is
 * the strongest signal we control about what a page is FOR, and with one owner now decided per
 * keyword family (src/config/commercialSeoMap.ts), the owner of each family is labelled with the
 * phrase it owns and nothing else. A child is never labelled with its parent's phrase, and a hub
 * is never labelled with a child's: that is the same fight the titles were just cleaned of, and it
 * would reappear here, multiplied by every navigation surface on the site.
 *
 * Only OWNERS are listed. A slug with no entry keeps its `designation_fr` fallback, which is the
 * correct behaviour for the long tail of brand and shelf pages that own no commercial term.
 */
export function categoryAnchor(slug: string, fallback: string): string {
  const labels: Record<string, string> = {
    // Protein family — unchanged, kept as authored.
    'whey-proteine': 'Whey protein en Tunisie',
    proteines: 'Protéines en Tunisie',
    creatine: 'Créatine monohydrate en Tunisie',

    // Amino family. The hub names the family; each child names only itself.
    'acides-amines': 'Acides aminés en Tunisie',
    bcaa: 'BCAA en Tunisie',
    eaa: 'EAA — acides aminés essentiels',
    glutamine: 'Glutamine en Tunisie',

    // Health & wellness. /sante-vitalite owns no head term (1 click on 405 impressions), so its
    // label stays a plain shelf name and the demand-carrying children get the searched phrases.
    'sante-vitalite': 'Santé et vitalité',
    vitamines: 'Vitamines en Tunisie',
    mineraux: 'Minéraux en Tunisie',
    magnesium: 'Magnésium en Tunisie',
    zinc: 'Zinc en Tunisie',
    zma: 'ZMA en Tunisie',
    collagene: 'Collagène en Tunisie',
    'omega-3': 'Oméga 3 en Tunisie',

    // Gear. Four live routes, one job each: the hub routes, and the three children split heavy
    // equipment / small accessories / cardio machines. None of them says "fitness" generically.
    equipement: 'Équipement de sport en Tunisie',
    'materiel-de-musculation': 'Matériel de musculation',
    accessoires: 'Accessoires de musculation',
    'cardio-fitness': 'Tapis roulants et vélos',
  };
  const key = slug
    .replace(/^https?:\/\/(?:www\.)?protein\.tn\//i, '')
    .replace(/^\//, '')
    .split(/[?#]/, 1)[0]
    .replace(/\/$/, '');
  return labels[key] ?? fallback;
}
