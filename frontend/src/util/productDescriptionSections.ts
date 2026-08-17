/**
 * Break a transcribed product description into the same named sections the page already has.
 *
 * ── THE PROBLEM THIS SOLVES ─────────────────────────────────────────────────────────────────
 * Owner, 17/08/2026, with a reference storefront beside our page: *"the product page still the same
 * layout"*. On NOW Foods Whey Protein Isolate — Creamy Vanilla — 816 g, `description_fr` is 13,746
 * characters. It is the entire source product page, transcribed whole: an `<h2>` and then `<h3>`s
 * for Aperçu, Spécifications, Poids de l'article, Usage suggéré, Autres ingrédients,
 * Avertissements, Clause de non-responsabilité, plus three tables — wrapped in six levels of the
 * source site's layout `<div>`s.
 *
 * All of it rendered inside ONE accordion, open by default, under the heading "Description".
 *
 * Worse, two of those blocks were on the page TWICE. `source_facts.content.sections` carries
 * `other_ingredients` and `warnings` separately, and the page rendered those as their own sections
 * as well — so a customer scrolled past the ingredient list, read three more blocks, and met the
 * ingredient list again. Measured on that product: both duplicated, verbatim.
 *
 * ── WHY THE DIVS GO FIRST ───────────────────────────────────────────────────────────────────
 * Splitting raw markup at heading boundaries is only safe when the headings are siblings. Here they
 * sit at varying depths inside nested `<div class="row item-row">` wrappers, so cutting from one
 * `<h3>` to the next produces fragments with unbalanced `<div>`s — which a browser silently repairs
 * by swallowing whatever follows.
 *
 * The wrappers carry no meaning. They are the source site's grid, and every one of their classes is
 * stripped by the sanitiser anyway. Removing the div TAGS while keeping their children flattens the
 * document to a single level, after which every heading is a sibling of the content that belongs to
 * it and the split is exact. `sanitizeProductHtml` already unwraps divs for the same reason.
 *
 * ── WHAT IT REFUSES TO DO ───────────────────────────────────────────────────────────────────
 * It never invents a heading and never moves prose between blocks. A description with no headings
 * comes back as one `lead` and no sections, which is the correct answer for the 309 hand-written
 * products and for every short description — those render exactly as they did before.
 */

/** One block of the description, keyed so the page can merge it with the transcribed sections. */
export type DescriptionSection = {
  /** Canonical slot, or `other:<slug>` when the heading is not one we route. */
  key: string;
  /** The heading as the description wrote it. */
  heading: string;
  html: string;
};

export type DescriptionSplit = {
  /** Everything before the first heading. Usually empty on a transcribed page. */
  lead: string;
  sections: DescriptionSection[];
};

/**
 * Heading text -> canonical slot.
 *
 * Matched on a normalised, accent-free, lowercased heading, by SUBSTRING, because the same block is
 * written "Usage suggéré" by one source and "Mode d'emploi" or "Conseils d'utilisation" by another.
 * Order matters: the first entry whose needle appears wins, so the more specific needles come first.
 */
const ROUTES: Array<{ needles: string[]; key: string }> = [
  { needles: ['autres ingredients', 'other ingredients'], key: 'other_ingredients' },
  { needles: ['ingredients'], key: 'other_ingredients' },
  { needles: ['usage suggere', 'suggested use', 'mode d emploi', 'mode d', 'conseils d utilisation', 'utilisation'], key: 'suggested_use' },
  { needles: ['avertissement', 'mise en garde', 'precaution', 'warning'], key: 'warnings' },
  { needles: ['valeur nutritive', 'valeurs nutritionnelles', 'informations nutritionnelles', 'nutrition'], key: 'nutrition' },
  { needles: ['allergene', 'allergen'], key: 'allergens' },
  { needles: ['conservation', 'stockage', 'storage'], key: 'storage' },
  { needles: ['clause de non responsabilite', 'non-responsabilite', 'disclaimer', 'avis de non'], key: 'disclaimer' },
  { needles: ['apercu', 'overview', 'description'], key: 'overview' },
  { needles: ['specification', 'caracteristique'], key: 'specifications' },
  { needles: ['poids de l article', 'item weight', 'poids'], key: 'item_weight' },
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? whole);
}

/** Plain text of a markup fragment. */
function toText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Lowercased, accent-free, punctuation-free — so "Usage suggéré" and "usage suggere" are one key. */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function routeHeading(heading: string): string {
  const flat = normalise(heading);
  for (const route of ROUTES) {
    if (route.needles.some((needle) => flat.includes(needle))) return route.key;
  }
  return `other:${flat.replace(/\s+/g, '-').slice(0, 40)}`;
}

/**
 * Drop `<div>` and `<section>` TAGS, keep their children.
 *
 * See the note above: this is what makes a heading a sibling of its own content, and it is the
 * whole reason the split can be a string operation rather than a parser.
 */
function flattenWrappers(html: string): string {
  return html.replace(/<\/?(?:div|section|span)\b[^>]*>/gi, '');
}

/** Is there anything here a reader would see? */
function hasContent(html: string): boolean {
  return toText(html).length > 0 || /<(?:table|img|ul|ol)\b/i.test(html);
}

export function splitDescriptionSections(html: string | null | undefined): DescriptionSplit {
  const source = (html ?? '').toString().trim();
  if (!source) return { lead: '', sections: [] };

  const flat = flattenWrappers(source);

  /*
   * Headings at h2..h4. h1 is excluded on purpose: the sanitiser demotes stray `<h1>`s to `<h2>`
   * before this ever runs, and a description that still contains one is a document title rather
   * than a section boundary.
   */
  const headings = [...flat.matchAll(/<(h[2-4])\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  if (headings.length === 0) return { lead: source, sections: [] };

  const lead = flat.slice(0, headings[0].index ?? 0);

  const sections: DescriptionSection[] = [];
  for (let i = 0; i < headings.length; i += 1) {
    const match = headings[i];
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index ?? flat.length : flat.length;
    const heading = toText(match[2]);
    const body = flat.slice(start, end).trim();

    if (!heading || !hasContent(body)) continue;

    const key = routeHeading(heading);
    /*
     * A description that repeats a heading — "Avertissements" twice, which the transcriptions do —
     * appends rather than overwrites. Dropping the second copy would lose text; showing it as a
     * second identical section is the duplication this file exists to remove.
     */
    const existing = sections.find((section) => section.key === key);
    if (existing) existing.html += body;
    else sections.push({ key, heading, html: body });
  }

  if (sections.length === 0) return { lead: source, sections: [] };

  return { lead: hasContent(lead) ? lead : '', sections };
}

/**
 * Canonical French heading per slot.
 *
 * The backend already supplies these for the transcribed sections, so a description-derived block
 * must use the SAME words or the page would print "Usage suggéré" on one product and "Conseils
 * d'utilisation" on the next for identical content.
 */
export const SLOT_HEADINGS: Record<string, string> = {
  suggested_use: "Conseils d'utilisation",
  other_ingredients: 'Autres ingrédients',
  allergens: 'Allergènes',
  warnings: 'Avertissements',
  storage: 'Conservation',
};

/**
 * The order the page prints them in, after Description and before Valeurs nutritionnelles.
 * Matches the reference storefront: how to take it, what is in it, what to watch for.
 */
export const SLOT_ORDER = ['suggested_use', 'other_ingredients', 'allergens', 'warnings', 'storage'];

/** Blocks that stay inside the Description accordion rather than becoming sections of their own. */
const BODY_SLOTS = ['overview', 'specifications', 'item_weight'];

/** Every table in a fragment, and the fragment with those tables removed. */
function liftTables(html: string): { tables: string; rest: string } {
  const matches = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)];
  if (matches.length === 0) return { tables: '', rest: html };
  let rest = html;
  for (const match of matches) rest = rest.replace(match[0], '');
  return { tables: matches.map((match) => match[0]).join(''), rest };
}

export type MergedSection = {
  key: string;
  heading: string;
  html: string;
};

export type MergedProductContent = {
  /** What the Description accordion renders: the lead, the overview, the specs, the pack weight. */
  body: string;
  /** Legal small print, rendered under the body at small size rather than as its own section. */
  disclaimer: string;
  /** One section per slot, in SLOT_ORDER, already deduplicated against the transcription. */
  sections: MergedSection[];
  /** Nutrition tables found in the description — used ONLY when no canonical panel exists. */
  nutritionFallback: string;
};

/**
 * Decide, per slot, which of the two copies the page shows — and show only that one.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────────────────────
 * `source_facts.content` wins over the description, always. It is the backend's structured
 * transcription with our own French heading attached, it is what /x-crawler/product/[slug] renders,
 * and it is what the two routes are checked against each other on. The description's copy of the
 * same block is a second rendering of the same source page and adds nothing.
 *
 * Measured on NOW Foods Whey Protein Isolate — Creamy Vanilla — 816 g, which is the product the
 * owner screenshotted: `other_ingredients` and `warnings` were on the page twice, and all three
 * nutrition tables were on it twice — once inside the Description blob and once in Valeurs
 * nutritionnelles. Roughly 4,500 characters of exact repetition on one page.
 *
 * Nothing is invented and nothing is dropped: a slot the transcription does not carry falls back to
 * the description's block, under the canonical heading.
 */
export function mergeProductContent({
  descriptionHtml,
  sourceSections,
  hasCanonicalNutrition,
}: {
  descriptionHtml: string | null | undefined;
  /** From productSourceSections() — the backend's transcription. */
  sourceSections: Array<{ key: string; heading: string; html: string }>;
  /** True when nutrition_values or source nutrition_html already renders a panel. */
  hasCanonicalNutrition: boolean;
}): MergedProductContent {
  const { lead, sections: fromDescription } = splitDescriptionSections(descriptionHtml);

  const byKey = new Map(fromDescription.map((section) => [section.key, section]));
  const sourceByKey = new Map(sourceSections.map((section) => [section.key, section]));

  const bodyParts: string[] = [];
  if (lead.trim()) bodyParts.push(lead);
  for (const slot of BODY_SLOTS) {
    const block = byKey.get(slot);
    if (block) bodyParts.push(`<h3>${block.heading}</h3>${block.html}`);
  }
  // Headings the routing table did not recognise keep their own name and stay with the body,
  // because guessing a slot for them would be worse than leaving them where the source put them.
  for (const block of fromDescription) {
    if (block.key.startsWith('other:')) bodyParts.push(`<h3>${block.heading}</h3>${block.html}`);
  }

  /*
   * A description with no headings at all — every hand-written product, and every short imported
   * one — produces no body parts, so the body is the description verbatim. That is the pre-existing
   * behaviour and it must survive: this function is a router, not a filter.
   */
  const body = bodyParts.length > 0 ? bodyParts.join('') : (descriptionHtml ?? '');

  const disclaimerBlock = byKey.get('disclaimer');
  const disclaimerSplit = disclaimerBlock ? liftTables(disclaimerBlock.html) : { tables: '', rest: '' };

  const sections: MergedSection[] = [];
  for (const slot of SLOT_ORDER) {
    const preferred = sourceByKey.get(slot);
    const fallback = byKey.get(slot);
    const chosen = preferred ?? fallback;
    if (!chosen) continue;
    sections.push({ key: slot, heading: SLOT_HEADINGS[slot] ?? chosen.heading, html: chosen.html });
  }

  /*
   * Tables trail the last heading of a transcribed page, so they land in whichever block happens to
   * be last — on the screenshotted product that was "Clause de non-responsabilité", which put a
   * Supplement Facts panel and an amino-acid profile inside a legal notice. They are lifted out and
   * only used when no canonical panel exists, so they can never be the second copy.
   */
  const nutritionSlot = byKey.get('nutrition');
  const nutritionFallback = hasCanonicalNutrition
    ? ''
    : [disclaimerSplit.tables, nutritionSlot ? liftTables(nutritionSlot.html).tables : ''].join('');

  return {
    body,
    disclaimer: disclaimerSplit.rest.trim(),
    sections,
    nutritionFallback,
  };
}
