/**
 * Removing the SOURCE RETAILER's name and its legal boilerplate from imported product text.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────────────────────
 * Owner, 17/08/2026: *"for the texts in the products take off any iherb word"*.
 *
 * Measured on one product's API payload, the name appears in text in exactly three fields, and all
 * three carry the SAME 2,510-character block — the source site's accuracy-and-translation notice,
 * transcribed along with the product copy:
 *
 *   description_fr              4 occurrences   → rendered on the page
 *   seo_schema_description      4               → meta description
 *   json_ld_product.description 4               → the Product structured data Google reads
 *
 * The last one is the one that actually costs something. A competitor's brand name inside our own
 * `Product.description` is a rival's name sitting in the structured data for 21,273 pages, on the
 * exact field Google may quote in a rich result. The visible copy is a presentation problem; that
 * one is a distribution problem.
 *
 * ── WHY THE WHOLE BLOCK GOES, NOT JUST THE NAME ─────────────────────────────────────────────
 * Deleting the word alone leaves broken French — *"Bien qu'iHerb s'efforce"* becomes *"Bien qu'
 * s'efforce"* — and keeps 2,510 characters of somebody else's legal text on every page.
 *
 * It is also redundant. That notice says two things: the printed label governs if it disagrees
 * with the page, and the French is machine-translated. The product page already states both, in
 * its own words, in `productSourceAttribution` — *"Informations transcrites de la fiche d'origine
 * du fabricant. La version française provient d'une traduction automatique de la source et peut
 * comporter des erreurs. En cas de différence, l'étiquette imprimée sur l'emballage fait foi."*
 *
 * So the block is cut and the shop's own sentence carries the meaning. That is a strictly better
 * outcome than redacting it: same legal substance, in our voice, 2,500 characters lighter, with no
 * duplicated boilerplate across 21,273 pages for Google to weigh.
 *
 * ── THE REDACTION IS THE SECOND LINE, NOT THE FIRST ─────────────────────────────────────────
 * `redactRetailer` exists for text that survives the cut — a mention inside a paragraph we keep,
 * a differently-worded notice in a future import. It repairs French elision rather than leaving a
 * dangling apostrophe, because a half-deleted brand name reads worse than the brand name.
 *
 * ── WHAT THIS DOES NOT TOUCH ────────────────────────────────────────────────────────────────
 * IMAGE URLS. Every photograph on the imported catalogue is served from the source's CDN host, and
 * that host is in the `src` of ~23,000 images plus the `image` array of the structured data.
 * Rewriting those is a re-hosting job on the backend — the files have to exist somewhere else
 * first — and a find-and-replace here would produce 404s, not privacy. Flagged for the owner
 * rather than half-done.
 */

/**
 * Phrases that begin the source's notice. Matched case-insensitively against the plain text, and
 * everything from the earliest one to the end of the field is dropped — the notice is always last,
 * because it is the footer of the page it was transcribed from.
 */
const BOILERPLATE_OPENERS = [
  'clause de non-responsabilité',
  'clause de non responsabilité',
  'avis de non-responsabilité',
  "bien qu'iherb",
  'bien que iherb',
  'ce site web a été traduit automatiquement',
  'disclaimer:',
];

/** The source retailer, and the French elisions it appears inside. */
const ELISIONS: Array<[RegExp, string]> = [
  [/\bqu['’]\s*iherb\b/gi, 'que la source'],
  [/\bd['’]\s*iherb\b/gi, 'de la source'],
  [/\bl['’]\s*iherb\b/gi, 'la source'],
  [/\biherb\.com\b/gi, 'la source'],
  [/\biherb\b/gi, 'la source'],
];

/**
 * Cut the source's notice off the end of a string. Works on HTML and on plain text alike: the
 * opener is located in a tag-stripped projection, then the cut is applied to the ORIGINAL at the
 * nearest preceding block boundary, so an HTML field is never left with an unclosed element.
 */
export function dropSourceDisclaimer(value: string): string {
  if (!value) return value;

  const plain = value.replace(/<[^>]*>/g, ' ').toLowerCase();
  let earliest = -1;
  for (const opener of BOILERPLATE_OPENERS) {
    const at = plain.indexOf(opener);
    if (at >= 0 && (earliest < 0 || at < earliest)) earliest = at;
  }
  if (earliest < 0) return value;

  /*
   * Map the plain-text offset back onto the source by walking both in step. Tag-stripping replaces
   * each tag with a single space, so the two strings advance at different rates and an index from
   * one cannot be used on the other — this walk is what keeps the cut off the middle of a tag.
   */
  let plainAt = 0;
  let cut = value.length;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '<') {
      const close = value.indexOf('>', i);
      if (close < 0) break;
      i = close;
      plainAt += 1;
    } else {
      plainAt += 1;
    }
    if (plainAt > earliest) {
      cut = i;
      break;
    }
  }

  /* Back up to the last block boundary so the remainder is well-formed markup. */
  const head = value.slice(0, cut);
  const lastOpen = Math.max(
    head.lastIndexOf('<p'),
    head.lastIndexOf('<div'),
    head.lastIndexOf('<h1'),
    head.lastIndexOf('<h2'),
    head.lastIndexOf('<h3'),
    head.lastIndexOf('<h4'),
    head.lastIndexOf('<section')
  );
  return (lastOpen > 0 ? head.slice(0, lastOpen) : head).trim();
}

/** Replace any surviving mention, repairing French elision rather than leaving `qu'` dangling. */
export function redactRetailer(value: string): string {
  if (!value) return value;
  let out = value;
  for (const [pattern, replacement] of ELISIONS) out = out.replace(pattern, replacement);
  return out.replace(/[ \t]{2,}/g, ' ');
}

/** Both, in the order that matters: cut the block first, then redact whatever survived it. */
export function cleanSourceText(value: string): string {
  return redactRetailer(dropSourceDisclaimer(value));
}
