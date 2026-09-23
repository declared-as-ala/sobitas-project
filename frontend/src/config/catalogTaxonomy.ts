/**
 * THE CANONICAL COMMERCIAL TAXONOMY — ONE TREE, DECLARED IN ONE PLACE.
 *
 * ── WHY A CONFIG AND NOT THE DATABASE ────────────────────────────────────────────────────────
 * `GET /api/categories` returns the merchandising tree the back office happens to hold today:
 * six rayons, fifty sub-categories, and a `SANTÉ & VITALITÉ` bucket with twenty-one children
 * that includes Glutamine and HMB — two amino acids filed next to Ashwagandha and Zinc.
 * That tree is a stock-keeping convenience. It is not the shape a buyer, or a crawler, should be
 * handed.
 *
 * Google's ecommerce documentation is explicit that it learns a site's hierarchy from NAVIGATION
 * AND INTERNAL LINKS, not from URL folders. So the fix is not a migration — no URL in this file
 * changes — it is to declare the tree once and make every surface that draws a link read it:
 * the header, the rayon pages, the breadcrumbs, the related-category rails and the crawler views.
 *
 * ── THE MEASUREMENT THAT MADE THIS NECESSARY (23/09/2026, Googlebot UA, production) ──────────
 * Of the 56 live taxonomy URLs, the homepage linked 19. The mega-menu holds one rayon's children
 * in the DOM at a time (`activeSubs.map`), so 37 of 56 category URLs were reachable only by first
 * landing on a rayon page. A shopper never notices — they hover. A crawler sees a flat list of
 * nineteen sibling links with no stated relationship between any of them.
 *
 *     /                 97 links   19/56 taxonomy URLs
 *     /shop             61 links   10/56
 *     /proteines        72 links   16/56   (its own 8 children — the tree exists, one hop down)
 *     /performance      69 links   17/56   (9 of its 10 children; `Intra-Workout` 301s)
 *     /creatine         72 links   10/56   (none of its 6 amino siblings)
 *
 * That is the whole diagnosis. The catalogue is not too big and the content is not too thin —
 * the relationships are simply never stated where a crawler reads them.
 *
 * ── THE FOUR TAXONOMY DEFECTS THIS FILE CORRECTS ─────────────────────────────────────────────
 * 1. `acides-amines` was a SIBLING of bcaa / eaa / citrulline / l-arginine / beta-alanine.
 *    It is their parent. Declared as a group, it turns six unrelated links into one cluster.
 * 2. `glutamine` and `hmb` sat under SANTÉ & VITALITÉ. They are amino acids and now live under
 *    Acides Aminés, where their buyers and their siblings are.
 * 3. `glucides-energie` (24 products, none in stock) and `glucides` (7 products, 6 in stock) are
 *    the same shelf twice. `glucides` is the survivor; the other keeps its URL, stays
 *    `noindex, follow`, and is linked only from its twin.
 * 4. SANTÉ & VITALITÉ's twenty-one children are grouped into four readable themes. A
 *    twenty-one-item column states nothing; four themes state what the rayon contains.
 *
 * ── `nav: false` IS NOT A DELETION ───────────────────────────────────────────────────────────
 * Nine listings serve products of which NONE are purchasable. They keep their URLs, keep their
 * place under their rayon, and keep `noindex, follow` — stock returns, and a 301 or a 410 would
 * have thrown the URL and its products' breadcrumb parent away for nothing. What they lose is a
 * slot in a header that renders on every page of the site. They remain one click from their
 * rayon page.
 *
 * The inverse rule is stronger and is enforced in `check-taxonomy.mjs`: a slug that earns clicks
 * or impressions is never `nav: false` and never noindex, however empty its shelf is today.
 */

export interface TaxonomyNode {
  /** The live slug. Served at `/{slug}`. Nothing in this file may invent or rename one. */
  slug: string;
  /** The nav label. Sentence case, French — the API stores shouted values like "PROTÉINES ". */
  label: string;
  /** A group header that is also a real page, or a leaf. */
  children?: TaxonomyNode[];
  /**
   * Whether this node appears in the GLOBAL header. Default true.
   * `false` = nothing on the shelf is buyable today; still linked from its rayon page.
   */
  nav?: boolean;
  /** Why this node is where it is, when the API disagrees. Read by the guard script. */
  note?: string;
}

/**
 * The tree. Order is deliberate: within a rayon, the pages that carry commercial intent come
 * first, because this order is the order a crawler reads the links in.
 */
export const catalogTaxonomy: TaxonomyNode[] = [
  {
    slug: 'proteines',
    label: 'Protéines',
    children: [
      { slug: 'whey-proteine', label: 'Whey protéine' },
      { slug: 'whey-isolate', label: 'Whey isolate' },
      { slug: 'whey-hydrolysee', label: 'Whey hydrolysée' },
      { slug: 'caseine', label: 'Caséine', note: '5 clicks @13.4 (28 d) — protected by traffic' },
      { slug: 'proteines-vegetales', label: 'Protéines végétales' },
      { slug: 'proteine-de-boeuf', label: 'Protéine de bœuf' },
      { slug: 'proteines-multi-sources', label: 'Protéines multi-sources' },
      {
        slug: 'barres-proteinees',
        label: 'Barres & snacks protéinés',
        note: '157 impressions @10.3 — page one, protected by traffic',
      },
    ],
  },
  {
    slug: 'prise-de-masse',
    label: 'Prise de masse',
    children: [
      {
        slug: 'mass-gainers',
        label: 'Mass gainers',
        note: 'owner of the gainer cluster — pos 32.2 against /prise-de-masse at 58.4',
      },
      {
        slug: 'gainers-proteines',
        label: 'Gainers protéinés',
        note: 'never 301: its PDPs earn (thunder-gainer 12 clicks @5.1 over 3 m)',
      },
      { slug: 'glucides', label: 'Glucides & énergie' },
      {
        slug: 'glucides-energie',
        label: 'Glucides & énergie (ancien)',
        nav: false,
        note: 'duplicate shelf of /glucides, 24 products none in stock — linked only from its twin',
      },
    ],
  },
  {
    slug: 'performance',
    label: 'Performance',
    children: [
      { slug: 'creatine', label: 'Créatine' },
      { slug: 'pre-workout', label: 'Pré-workout' },
      {
        slug: 'acides-amines',
        label: 'Acides aminés',
        note: 'was a SIBLING of its own children in the API tree; declared their parent here',
        children: [
          { slug: 'bcaa', label: 'BCAA' },
          { slug: 'eaa', label: 'EAA' },
          {
            slug: 'glutamine',
            label: 'Glutamine',
            note: 'moved out of SANTÉ & VITALITÉ — it is an amino acid',
          },
          { slug: 'citrulline', label: 'Citrulline' },
          { slug: 'l-arginine', label: 'L-arginine' },
          { slug: 'beta-alanine', label: 'Bêta-alanine' },
          {
            slug: 'hmb',
            label: 'HMB',
            note: 'moved out of SANTÉ & VITALITÉ; 1 click @7.5 — protected by traffic',
          },
        ],
      },
      {
        slug: 'intra-workout',
        label: 'Intra-workout',
        nav: false,
        /*
         * The database stores this slug as `Intra-Workout`, with capitals — the only one of the 56
         * that does. `/Intra-Workout` answers 301 and `/intra-workout` answers 200, so the lowercase
         * form written here is the URL that actually serves, and the guard compares case-insensitively
         * rather than pretending the mismatch is not there. Renaming the row in the back office is an
         * owner action; until then this is the correct value and the guard must not be "fixed" to
         * match the database.
         */
        note: '12 products, none in stock; DB slug is capitalised, /Intra-Workout 301s to this one',
      },
      { slug: 'post-workout', label: 'Post-workout', nav: false, note: '9 products, none in stock' },
    ],
  },
  {
    slug: 'perte-de-poids',
    label: 'Perte de poids',
    children: [
      { slug: 'bruleurs-de-graisse', label: 'Brûleurs de graisse' },
      { slug: 'l-carnitine', label: 'L-carnitine' },
      { slug: 'cla', label: 'CLA', note: '1 click @22.0 — protected by traffic' },
    ],
  },
  {
    slug: 'sante-vitalite',
    label: 'Santé & vitalité',
    note: 'twenty-one flat children in the API; grouped into four themes here',
    children: [
      {
        slug: 'vitamines',
        label: 'Vitamines & minéraux',
        children: [
          { slug: 'mineraux', label: 'Minéraux', note: '2 clicks — protected by traffic' },
          { slug: 'magnesium', label: 'Magnésium' },
          { slug: 'zinc', label: 'Zinc' },
          { slug: 'zma', label: 'ZMA' },
        ],
      },
      {
        slug: 'collagene',
        label: 'Articulations & bien-être',
        note: 'the rayon best page (10 clicks @19.6) heads the theme it actually sells into',
        children: [
          { slug: 'omega-3', label: 'Oméga 3' },
          { slug: 'articulations', label: 'Articulations', note: '1 click — protected by traffic' },
          { slug: 'antioxydants', label: 'Antioxydants' },
          { slug: 'beaute-cheveux', label: 'Beauté & cheveux' },
        ],
      },
      {
        slug: 'immunite',
        label: 'Immunité & digestion',
        nav: false,
        note: 'every leaf of this theme is currently unbuyable; kept whole under the rayon page',
        children: [
          { slug: 'probiotiques', label: 'Probiotiques', nav: false },
          { slug: 'digestion', label: 'Digestion & transit', nav: false },
          { slug: 'sommeil-stress', label: 'Sommeil & stress', nav: false },
          { slug: 'enfants', label: 'Enfants', nav: false },
        ],
      },
      {
        slug: 'boosters-hormonaux',
        label: 'Plantes & boosters',
        children: [
          { slug: 'ashwagandha', label: 'Ashwagandha' },
          { slug: 'tribulus', label: 'Tribulus' },
          { slug: 'plantes-et-herbes', label: 'Plantes & herbes', nav: false },
        ],
      },
    ],
  },
  {
    slug: 'equipement',
    label: 'Équipement',
    children: [
      {
        slug: 'materiel-de-musculation',
        label: 'Matériel de musculation',
        note: 'the gear family best page — 5 clicks @10.1',
      },
      { slug: 'accessoires', label: 'Accessoires' },
      { slug: 'cardio-fitness', label: 'Cardio & fitness' },
      { slug: 'vetements', label: 'Vêtements', nav: false, note: 'nothing in stock' },
    ],
  },
];

/* ── Derived indexes. Built once at module load; every consumer reads these, never the tree. ── */

interface TaxonomyIndexEntry {
  node: TaxonomyNode;
  /** Rayon first, then each group, excluding the node itself. Empty for a rayon. */
  ancestors: TaxonomyNode[];
  /** Direct children, in declared order. */
  children: TaxonomyNode[];
  /** Nodes that share this node's immediate parent, excluding itself. */
  siblings: TaxonomyNode[];
  /** Depth from the rayon: 0 = rayon, 1 = its child, 2 = a grouped leaf. */
  depth: number;
}

const index = new Map<string, TaxonomyIndexEntry>();

(function buildIndex(nodes: TaxonomyNode[], ancestors: TaxonomyNode[] = []): void {
  for (const node of nodes) {
    const children = node.children ?? [];
    index.set(node.slug, {
      node,
      ancestors,
      children,
      siblings: nodes.filter((n) => n.slug !== node.slug),
      depth: ancestors.length,
    });
    if (children.length > 0) buildIndex(children, [...ancestors, node]);
  }
})(catalogTaxonomy);

/** Every slug in the tree, in reading order. */
export const taxonomySlugs: string[] = [...index.keys()];

/** The node for a slug, or null when the slug is not part of the commercial taxonomy. */
export function taxonomyNode(slug: string): TaxonomyNode | null {
  return index.get(slug)?.node ?? null;
}

/** The declared label, falling back to whatever the caller already had. */
export function taxonomyLabel(slug: string, fallback?: string): string {
  return index.get(slug)?.node.label ?? (fallback ?? slug);
}

/** Rayon → … → immediate parent. Empty for a rayon or an unknown slug. */
export function taxonomyAncestors(slug: string): TaxonomyNode[] {
  return index.get(slug)?.ancestors ?? [];
}

/** The rayon a slug belongs to — itself, when the slug IS a rayon. */
export function taxonomyRayon(slug: string): TaxonomyNode | null {
  const entry = index.get(slug);
  if (!entry) return null;
  return entry.ancestors[0] ?? entry.node;
}

/** The immediate parent, which is NOT always the API's parent — that is the point of this file. */
export function taxonomyParent(slug: string): TaxonomyNode | null {
  const ancestors = taxonomyAncestors(slug);
  return ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
}

export function taxonomyChildren(slug: string): TaxonomyNode[] {
  return index.get(slug)?.children ?? [];
}

/**
 * Siblings under the same immediate parent. This is the cluster a category page should link
 * across: `/creatine` reaching `/pre-workout` and `/acides-amines`, not twelve rayons.
 */
export function taxonomySiblings(slug: string): TaxonomyNode[] {
  return index.get(slug)?.siblings ?? [];
}

export function taxonomyDepth(slug: string): number {
  return index.get(slug)?.depth ?? -1;
}

/**
 * True when the node, and every ancestor of it, is allowed in the global header.
 * A group marked `nav: false` takes its children with it — half a theme is worse than none.
 */
export function inGlobalNav(slug: string): boolean {
  const entry = index.get(slug);
  if (!entry) return false;
  if (entry.node.nav === false) return false;
  return entry.ancestors.every((a) => a.nav !== false);
}

/**
 * Every node beneath this one — groups AND their leaves. Used for a rail's "N catégories" line.
 *
 * Lives here rather than in the two header components because both of them had their own copy of
 * the identical four-line recursion, which is the shape that drifts: the desktop rail and the
 * phone drawer would go on printing two different counts of the same tree and neither would look
 * wrong on its own.
 */
export function taxonomyDescendantCount(node: TaxonomyNode): number {
  return (node.children ?? []).reduce((n, c) => n + 1 + taxonomyDescendantCount(c), 0);
}

/**
 * Depth-first flatten in declared order — the reading order of the tree.
 *
 * Same reason as above: the crawler category route and the crawler shop route each held a
 * byte-identical copy, one of them with a docblock asking the next editor to "edit them together".
 */
export function taxonomyFlatten(nodes: TaxonomyNode[], out: TaxonomyNode[] = []): TaxonomyNode[] {
  for (const node of nodes) {
    out.push(node);
    if (node.children?.length) taxonomyFlatten(node.children, out);
  }
  return out;
}

/** The header's view of the tree: the same shape, with every `nav: false` branch pruned. */
export function navTaxonomy(): TaxonomyNode[] {
  const prune = (nodes: TaxonomyNode[]): TaxonomyNode[] =>
    nodes
      .filter((n) => n.nav !== false)
      .map((n) => (n.children ? { ...n, children: prune(n.children) } : n));
  return prune(catalogTaxonomy);
}
