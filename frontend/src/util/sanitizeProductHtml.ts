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

import { normalizeProse } from './normalizeProse';

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

  /* Typed formatting becomes real markup: hand-typed bullets become lists, emoji headings lose
     their emoji, <li><p> collapses. See normalizeProse for why this lives in the presentation
     layer rather than in a migration. */
  out = normalizeProse(out);

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
  return truncateAtWord(cleaned, maxLen);
}

/**
 * Cut to `maxLen` at a WORD boundary, never mid-word.
 *
 * A blunt `.slice(0, 160)` is what Google was actually showing searchers: the top Arabic article
 * (5,834 impressions, 0.29% CTR) ended its snippet on a dangling "م" — a single orphaned letter.
 * Google truncates long descriptions itself and appends its own ellipsis, so the damage here is
 * ours alone: we hand it a string already broken mid-word.
 *
 * Backs off to the last space before the limit. If there is no space in range — a very long
 * unbroken token, or a script this heuristic does not segment — it falls back to a hard cut,
 * because returning nothing would be worse than an imperfect one.
 */
export function truncateAtWord(text: string, maxLen: number): string {
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;

  const window = clean.slice(0, maxLen);

  /*
   * ── A WORD BOUNDARY IS NOT ENOUGH. MEASURED ON LIVE BLOG SNIPPETS, 09/09/2026 ─────────────
   * Backing off to the last space is word-safe and still hands Google a broken sentence:
   *
   *   /blog/creatine-monohydrate-tunisie-guide-d-achat
   *     "…le supplément le plus étudié et…"        ends on a conjunction
   *   /blog/meilleure-proteine-whey-2026
   *     "…la protéine en poudre la plus…"          a superlative with no adjective
   *   /blog/quelle-est-la-meilleure-creatine-monohydrate-en-tunisie
   *     "…booster vos muscles et…"                 ends on a conjunction
   *
   * Every word is whole and every one of those is nonsense — on creatine and whey queries, the
   * two the shop most wants to win. That is worse than a hard cut: it reads as a fault in the
   * writing rather than in the truncation.
   *
   * So prefer, in order:
   *   1. the last SENTENCE end in range — a finished sentence needs no ellipsis and gets none;
   *   2. the last COMMA or semicolon — not a sentence, so the ellipsis stays, but a whole idea;
   *   3. the last space, exactly as before.
   *
   * Arabic punctuation is included because the defect this helper was originally written for was
   * an Arabic article (5,834 impressions, 0.29% CTR) that ended on a single orphaned letter.
   * A boundary that follows a digit is refused so a dose ("1,5 g.") or a decimal cannot end the
   * snippet halfway through a fact.
   */
  const MIN_RATIO = 0.6;
  const deepEnough = (i: number) => i > maxLen * MIN_RATIO && !/\d\s*$/.test(window.slice(0, i));

  const hard = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? '),
    window.lastIndexOf('؟ ')
  );
  if (deepEnough(hard)) return window.slice(0, hard + 1).trim();

  const soft = Math.max(
    window.lastIndexOf(', '),
    window.lastIndexOf('; '),
    window.lastIndexOf('، ')
  );
  if (deepEnough(soft)) return `${window.slice(0, soft).replace(/[\s,;:.،؛-]+$/u, '')}…`;

  const lastSpace = window.lastIndexOf(' ');
  // Only honour the boundary if it keeps a reasonable amount of the text; a space at index 3 of a
  // 160-char budget would throw away the whole snippet.
  const cut = lastSpace > maxLen * MIN_RATIO ? window.slice(0, lastSpace) : window;

  return `${dropDanglingWords(cut).replace(/[\s,;:.،؛-]+$/u, '')}…`;
}

/*
 * ── THE ACTUAL DEFECT IS THE LAST WORD, NOT THE LAST BOUNDARY ────────────────────────────────
 * The tiers above fix a snippet when a sentence or clause ends deep enough to be worth using.
 * When neither does, the word cut still lands wherever the character budget ran out — and on live
 * blog snippets that was repeatedly a function word carrying no meaning on its own:
 *
 *   "…le supplément le plus étudié et…"     a conjunction with nothing conjoined
 *   "…la protéine en poudre la plus…"       a superlative with no adjective
 *   "…deux acides gras reconnus pour leurs…" a possessive with nothing possessed
 *
 * Those first two survived the tiered fix because their only sentence end sits at ~40% of the
 * budget, below MIN_RATIO — correctly rejected, since cutting there would throw away more than
 * half the snippet. Lowering the ratio to catch them would shorten every other snippet on the
 * site to fix two, so the narrower fix is right: drop trailing words that cannot end a phrase.
 *
 * Deliberately a SMALL closed list of French and Arabic function words. A stemmer or a
 * parts-of-speech guess would mangle real content; this only removes tokens that are never the
 * last word of a meaningful fragment. It stops as soon as it meets a real word, and it refuses to
 * eat more than three tokens or to leave fewer than half the characters — a snippet that has been
 * whittled away is a worse outcome than one ending awkwardly.
 */
const DANGLING_WORDS = new Set([
  'et', 'ou', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'au', 'aux', 'en', 'dans',
  'sur', 'sous', 'pour', 'par', 'avec', 'sans', 'plus', 'moins', 'tres', 'très', 'ce', 'cet',
  'cette', 'ces', 'son', 'sa', 'ses', 'leur', 'leurs', 'notre', 'nos', 'votre', 'vos', 'qui',
  'que', 'dont', 'est', 'sont', 'a', 'à', 'd', 'l', 'the', 'and', 'of', 'و', 'في', 'من', 'على',
]);

function dropDanglingWords(text: string): string {
  let out = text.trimEnd();
  const floor = Math.floor(text.length / 2);
  for (let i = 0; i < 3; i += 1) {
    const at = out.lastIndexOf(' ');
    if (at <= 0 || at < floor) break;
    const last = out
      .slice(at + 1)
      .replace(/[.,;:!?()«»"'’،؛…-]+$/u, '')
      .toLowerCase();
    if (!DANGLING_WORDS.has(last)) break;
    out = out.slice(0, at).trimEnd();
  }
  return out;
}

/**
 * Build a meta description from CMS HTML.
 *
 * Beyond decoding and word-safe truncation, this drops a leading repetition of the page title.
 * Blog bodies open with their own headline, so once tags are stripped the description began by
 * restating the title verbatim — costing ~40 of a 160-character snippet to say a thing the
 * searcher is already reading on the line above. Same on product pages, where the description
 * opened with the product name that is already the title.
 */
export function buildMetaDescription(
  raw: string | null | undefined,
  options: { title?: string | null; maxLen?: number } = {}
): string {
  const { title, maxLen = 160 } = options;

  let text = htmlToText(raw, maxLen * 4).replace(/…$/, '').trim();

  const heading = (title ?? '').trim();
  if (heading) {
    // Compare loosely: the title carries the brand suffix and punctuation the body does not.
    const bare = heading.split('|')[0].trim();
    if (bare && text.toLowerCase().startsWith(bare.toLowerCase())) {
      text = text.slice(bare.length).replace(/^[\s\-–—:،,.]+/u, '').trim();
    }
  }

  return truncateAtWord(text, maxLen);
}
