/**
 * The lead bullet list of a product description, pulled out so it can be shown as a panel.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 * Owner, 16/08/2026, holding a reference storefront beside our product page: the reference puts a
 * short highlighted list of benefits directly under the title, above the price, and it is the first
 * thing the eye lands on. Ours had the identical sentences — "24 g de protéines", "1 g de sucre",
 * "100 % des protéines sont issues de caséine micellaire" — rendered as grey bullets inside a
 * collapsed description accordion, under a `max-h-60` clamp, below a specification table, behind a
 * "Lire plus" button. Same words, roughly the worst possible placement.
 *
 * So this INVENTS NOTHING. It relocates. Every string it returns was already on the page; the panel
 * shows them where a buyer reads them and the description renders without them, so nothing is said
 * twice.
 *
 * ── WHY REGEX AND NOT A DOM PARSER ──────────────────────────────────────────────────────────
 * This runs during server render on every one of ~11,263 product pages. `DOMParser` does not exist
 * in Node and pulling a parser in for one list is a dependency and a bundle cost on the heaviest
 * route on the site. The trade is that the matching must be CONSERVATIVE — see the guards below.
 * Every guard fails CLOSED: when anything is ambiguous the function returns no highlights and the
 * original html untouched, and the page renders exactly as it did before.
 *
 * ── THE GUARDS, AND WHAT EACH ONE IS PROTECTING AGAINST ─────────────────────────────────────
 * A `<ul>` in a supplement description is not necessarily a benefit list. It is just as likely to be
 * an ingredient list, an allergen list, or a table of contents. Promoting one of those into a
 * highlighted panel under the price would be actively misleading, so:
 *
 *   · it must START within the first 800 characters — a benefit list leads the description; an
 *     ingredient list follows the prose
 *   · it must contain no nested `<ul>` — the naive `</ul>` match would close on the inner list and
 *     leave a dangling fragment in the description
 *   · at least 3 items, or it is a stray pair of lines and not a list worth a panel
 *   · at most half the items may exceed 140 characters — an ingredient list is one enormous item
 *     and a benefit list is a column of short ones, and that is the cheapest reliable separator
 *     between the two that does not require understanding French
 */

/** A benefit line: an optional emphasised lead, then the rest. */
export type ProductHighlight = {
  /** The `<strong>`/`<b>` run the item opens with, if it opens with one. */
  lead: string;
  /** Everything after that lead — or the whole line when there was no lead. */
  text: string;
};

export type HighlightSplit = {
  highlights: ProductHighlight[];
  /** The description with the promoted list removed, so the page never prints it twice. */
  rest: string;
};

/**
 * A benefit list leads the description. Past this offset it is something else.
 *
 * 1200, not 800, and the number is measured rather than chosen: across 48 product descriptions
 * sampled from eight categories the first `<ul>` sits at 0-200 for 18 of them and at 800-1200 for a
 * further 10. Every one of those ten is a real benefit list that opens after an H1 and one
 * introductory paragraph, which is simply how the newer descriptions are written. An 800 window
 * threw away a fifth of the catalogue's panels for no reason anyone had checked.
 */
const LEAD_WINDOW = 1200;
/*
 * Five, measured rather than chosen.
 *
 * The panel sits between the title and the price, so every line it adds pushes the price down the
 * buy column. On a 1366x768 laptop — with 176px of site chrome above the content — a six-bullet
 * panel put the price at y=689 and the CTA at y=880. Five is also what the reference storefront
 * shows. Item six onward is not discarded: splitHighlights writes the overflow back into the
 * description as a list of its own.
 */
const MAX_ITEMS = 5;
const MIN_ITEMS = 3;
/** An ingredient list is one enormous item; a benefit list is a column of short ones. */
const LONG_ITEM = 140;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  ecirc: 'ê',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  deg: '°',
  reg: '®',
  trade: '™',
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? whole);
}

/** Tags out, entities in, whitespace collapsed. The panel renders TEXT, never markup. */
function toText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split a description into its lead benefit list and everything else.
 *
 * Returns `{ highlights: [], rest: html }` unchanged whenever any guard above does not hold, which
 * is the common case for the 309 hand-written products and for every description that opens with
 * prose. Callers do not need to special-case that: an empty array renders no panel.
 */
export function splitHighlights(html: string | null | undefined): HighlightSplit {
  const source = (html ?? '').toString();
  if (!source) return { highlights: [], rest: '' };

  const open = source.search(/<ul\b[^>]*>/i);
  if (open < 0 || open > LEAD_WINDOW) return { highlights: [], rest: source };

  const openTag = source.slice(open).match(/<ul\b[^>]*>/i);
  if (!openTag) return { highlights: [], rest: source };

  const bodyStart = open + openTag[0].length;
  const close = source.toLowerCase().indexOf('</ul>', bodyStart);
  if (close < 0) return { highlights: [], rest: source };

  const body = source.slice(bodyStart, close);
  // A nested list means the `</ul>` found above closes the INNER one, and everything after it would
  // be left as a dangling fragment in the description. Refuse rather than mangle.
  if (/<ul\b/i.test(body)) return { highlights: [], rest: source };

  const items = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => match[1])
    .map((raw) => {
      // An item that opens bold reads as "claim — explanation", which is exactly the two-tone
      // treatment the panel wants. Anything else is one plain line, and that is fine too.
      const leadMatch = raw.match(/^\s*<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/i);
      const lead = leadMatch ? toText(leadMatch[2]) : '';
      const text = toText(leadMatch ? raw.slice(leadMatch[0].length) : raw);
      return { lead, text };
    })
    .filter((item) => item.lead !== '' || item.text !== '');

  if (items.length < MIN_ITEMS) return { highlights: [], rest: source };

  const flat = items.map((item) => `${item.lead} ${item.text}`.trim());

  const long = flat.filter((line) => line.length > LONG_ITEM).length;
  if (long * 2 > items.length) return { highlights: [], rest: source };

  /*
   * ── FRAGMENT LISTS ARE NOT BENEFIT LISTS ────────────────────────────────────────────────
   * Measured, on GOLD CREATINE - KEVIN LEVRONE: the description reads "recommandé pour :" and the
   * list that follows is "la musculation," / "le sprint," / "les sports explosifs," /
   * "les entraînements intensifs." Those are the tail of a sentence that was broken across <li>s.
   * Every guard above passes them — four items, all short — and lifting them into a highlighted
   * panel under the price produces four lowercase comma-terminated fragments with no verb, which
   * reads as a rendering bug rather than as a product benefit.
   *
   * Both tells are cheap and independent, and neither needs to understand French: a benefit is
   * written as a standalone line, so it starts with a capital and does not end mid-clause.
   */
  const trailingComma = flat.filter((line) => /[,;]$/.test(line)).length;
  if (trailingComma * 3 > items.length) return { highlights: [], rest: source };

  const lowercaseStart = flat.filter((line) => /^[a-zà-öø-ÿ]/.test(line)).length;
  if (lowercaseStart * 2 > items.length) return { highlights: [], rest: source };

  /*
   * ── THE OVERFLOW GOES BACK, IT IS NOT DROPPED ───────────────────────────────────────────
   * The panel caps at MAX_ITEMS to stay scannable, but this function REMOVES the whole <ul> from
   * the description — so a naive `.slice(0, MAX_ITEMS)` would delete items 7 onward from the page
   * entirely. On the Gold Standard Casein page that is four real sentences, including "Excellente
   * source de magnésium" and the Informed Choice testing claim.
   *
   * Whatever the panel does not show is written back into the description as a list of its own, in
   * its original order and its original markup. Relocating content is the whole point of this
   * file; losing it is not.
   */
  const shown = items.slice(0, MAX_ITEMS);
  const overflow = [...body.matchAll(/<li[^>]*>[\s\S]*?<\/li>/gi)]
    .map((match) => match[0])
    .slice(MAX_ITEMS)
    .join('');

  const rest =
    source.slice(0, open) +
    (overflow ? `<ul>${overflow}</ul>` : '') +
    source.slice(close + '</ul>'.length);

  return { highlights: shown, rest };
}
