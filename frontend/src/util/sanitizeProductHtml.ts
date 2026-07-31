/**
 * Clean product/article description HTML before rendering.
 *
 * ~58 product descriptions were imported straight from an LLM chat export and still
 * contain the tool's UI scaffolding: `<div class="markdown-main-panel" …>`,
 * `data-sourcepos="…"` attributes, `attachment-container` wrappers, etc. Rendered
 * verbatim these leak junk markup into the page (and into the meta description /
 * JSON-LD derived from it), which reads as low-quality content to Google.
 *
 * This strips the known artifacts and normalises whitespace while preserving the
 * real, semantic HTML (headings, paragraphs, lists, bold). It is deliberately
 * conservative — it does not attempt to be a full HTML sanitizer for XSS (that is
 * handled elsewhere / by trusted admin input); it removes chat-export cruft only.
 */

const ARTIFACT_CLASS_WRAPPERS = [
  'markdown-main-panel',
  'attachment-container',
  'horizontal-scroll-wrapper',
  'code-block',
  'chat-turn-container',
  'response-container',
];

export function sanitizeProductHtml(html: string | null | undefined): string {
  if (!html) return '';
  let out = String(html);

  // Drop editor/export-only attributes that carry no meaning on the live site.
  out = out.replace(/\s(?:data-sourcepos|data-message-id|data-turn-id|data-testid|contenteditable|aria-hidden|data-start|data-end)="[^"]*"/gi, '');

  // Unwrap known artifact <div class="…"> containers but keep their inner content.
  for (const cls of ARTIFACT_CLASS_WRAPPERS) {
    const openTag = new RegExp(`<div[^>]*class="[^"]*${cls}[^"]*"[^>]*>`, 'gi');
    out = out.replace(openTag, '');
  }
  // Remove now-dangling class attributes that referenced only artifact classes.
  out = out.replace(/\sclass="(?:\s*(?:markdown-main-panel|attachment-container|horizontal-scroll-wrapper|ng-star-inserted|code-block-decoration|chat-turn-container)\s*)+"/gi, '');

  // Demote <h1> inside body copy to <h2>.
  //
  // A page gets ONE h1, and on a product page that is the product name. But these descriptions
  // were pasted in with their own headings, so the h1 in the CMS field renders as a second — or
  // fourteenth — top-level heading. Measured across 30 live product pages: 8 had a single h1, 19
  // had two, and three had 9, 10 and 13. /pre-workout/king-real-preworkout-500gr-real-pharm-tunisie
  // emits thirteen. When everything is the top heading, nothing is: the page's main topic signal
  // is split across a dozen competing claims, on exactly the pages meant to win product-name
  // searches.
  //
  // Demoting rather than stripping keeps the author's structure and the visible text — only the
  // level changes, so an h1 becomes a section heading under the product name, which is what it
  // always meant. Deeper levels are left alone; h2 siblings are normal and harmless.
  out = out.replace(/<h1(\s[^>]*)?>/gi, (_m, attrs) => `<h2${attrs ?? ''}>`).replace(/<\/h1\s*>/gi, '</h2>');

  // Collapse the resulting empty wrappers and excess whitespace.
  out = out
    .replace(/<div>\s*<\/div>/gi, '')
    .replace(/(\r?\n){3,}/g, '\n\n')
    .trim();

  return out;
}

/**
 * The entities that actually appear in this catalogue's CMS copy. Deliberately small — this is
 * not a general HTML entity table, and an unknown entity is left alone rather than guessed at.
 * `&amp;` is absent on purpose: it must be decoded LAST (see decodeEntities).
 */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  agrave: 'à',
  ccedil: 'ç',
  ugrave: 'ù',
  ocirc: 'ô',
  icirc: 'î',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  deg: '°',
};

/**
 * Turn entities back into the characters they stand for.
 *
 * `&amp;` is decoded last. Doing it first would turn "&amp;lt;" into "<" — re-animating text that
 * was deliberately escaped.
 */
function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name: string) => {
      const value = NAMED_ENTITIES[name.toLowerCase()];
      if (value === undefined) return m;
      // "&Eacute;" must give É, not é — the table is keyed lowercase, so restore the case the
      // author wrote. French headings are routinely title-cased, so this is not an edge case.
      const isUpper = name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase();
      return isUpper ? value.toUpperCase() : value;
    })
    .replace(/&amp;/gi, '&');
}

/**
 * Plain-text version (tags stripped) capped at maxLen — for meta descriptions / previews.
 *
 * Entities are DECODED, not deleted. This used to `.replace(/&[a-z]+;/gi, ' ')`, which turned
 * "MUSCULAIRE &amp; PERFORMANCE" into "MUSCULAIRE   PERFORMANCE" — silently dropping the word —
 * and any caller that skipped this helper and stripped tags by hand shipped the raw entity
 * instead: /whey-proteine's meta description reached Google reading "MUSCULAIRE &amp;amp;
 * PERFORMANCE", because plain text containing "&amp;" gets escaped a second time on its way into
 * the attribute. Both failures are invisible in code review and obvious in a search result.
 *
 * Zero-width characters are stripped too; they arrive with copy pasted out of word processors and
 * count toward the length budget while rendering as nothing.
 */
export function htmlToText(html: string | null | undefined, maxLen = 300): string {
  const cleaned = decodeEntities(sanitizeProductHtml(html).replace(/<[^>]*>/g, ' '))
    .replace(/[​-‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen).trim()}…` : cleaned;
}
