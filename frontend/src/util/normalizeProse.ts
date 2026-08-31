/**
 * Turn the catalogue's *typed* formatting into real markup.
 *
 * ── WHAT THIS IS FOR ────────────────────────────────────────────────────────────────────────
 * Owner, 20/08/2026: *"the formatting of the description — make it better and handle all edge
 * cases."*
 *
 * Product copy in this catalogue was pasted in by hand and by an LLM, and both authors format the
 * way a person formats a chat message rather than the way a document is structured. The live
 * `description_fr` for NITROTECH Whey is exactly representative:
 *
 *     <h3>⭐ Points forts du produit</h3>
 *     <p>• 30 g de protéines par dose<br>• Enrichie en BCAA<br>• Favorise la récupération…</p>
 *     <h3>💪 Pourquoi choisir cette whey ?</h3>
 *     <ul><li><p>La prise de masse musculaire</p></li>…</ul>
 *
 * Three separate defects in four lines, and every one of them is on thousands of products:
 *
 *   1. A LIST THAT IS NOT A LIST. `•` characters and `<br>` inside one `<p>`. It renders as a wall
 *      of text with no indent, no hanging indent and no marker alignment — a second line wraps back
 *      under the bullet instead of under the text. `.pdp-prose` already styles `<ul>` properly,
 *      with a brand-coloured `::marker`; none of it could ever apply. It is also invisible to a
 *      screen reader and to a crawler as a list.
 *   2. EMOJI AS HEADINGS. DESIGN_SYSTEM DS010 bans emoji as UI outright — lucide only. These sit
 *      in a data column rather than a className, so the linter cannot see them and they render on
 *      every product page, in the meta description, and in the crawler view.
 *   3. `<li><p>…</p></li>`. A paragraph inside a list item inherits the paragraph's bottom margin,
 *      so each bullet carries 14px of dead space it did not ask for.
 *
 * ── WHY THIS IS FIXED IN THE PRESENTATION LAYER AND NOT IN THE DATABASE ─────────────────────
 * Because the database is not the only author any more. `ProductContentGenerator` writes into these
 * same columns, and the day someone regenerates a description the emoji come straight back. A
 * migration fixes 11,263 rows once; a normaliser fixes every row that will ever exist, including
 * the ones a human types into Filament tomorrow.
 *
 * It runs inside `sanitizeProductHtml`, which is already documented as the NORMALISE half of the
 * pipeline (the SECURE half is DOMPurify, downstream). So it applies everywhere product copy is
 * rendered — the product page, the crawler view, the category descriptions and, via `htmlToText`,
 * the meta descriptions.
 *
 * ── THE RULE THIS FILE FOLLOWS ─────────────────────────────────────────────────────────────
 * **Never invent structure that is not evidently there.** Every transform below refuses unless the
 * pattern is unambiguous — a single ambiguous line is left exactly as the author wrote it. Copy
 * that is merely plain is not a defect; copy that is silently rearranged is.
 */

/**
 * Characters a person types when they mean "bullet".
 *
 * `-` and `*` are included and are the risky two, which is why the caller requires a following
 * space AND two or more consistent lines before it will convert anything. A single line beginning
 * with a dash is a sentence with a dash in it.
 *
 * Deliberately excluded: `–` U+2013 and `—` U+2014. French copy uses the em dash as punctuation
 * mid-sentence far more often than as a bullet, and this catalogue's own product names contain it
 * ("BIG WHEY 2KG - BIG RAMY LABS" arrives with both forms).
 */
const BULLET_CHARS =
  '\\u2022\\u25CF\\u25AA\\u25E6\\u2023\\u00B7\\u2043\\u2219\\u00BB\\u203A' + // • ● ▪ ◦ ‣ · ⁃ ∙ » ›
  '\\u2714\\u2713\\u2705\\u2611\\u2612\\u274C\\u2757' + // ✔ ✓ ✅ ☑ ☒ ❌ ❗ — a tick IS a bullet here
  '\\u27A4\\u27A1\\u2794\\u2192\\u25B6\\u25BA\\u25AB\\u25FE' + // ➤ ➡ ➔ → ▶ ► ▫ ◾
  '\\uD83D\\uDC49' + // 👉 (surrogate pair; harmless inside a character class for the lead unit)
  '>*-';
const BULLET_RE = new RegExp(`^[${BULLET_CHARS}]\\s+`);
/** `1. ` · `1) ` · `1 - ` — an ordered list a person typed. Two digits max: "2026 - " is a year. */
const ORDERED_RE = /^\d{1,2}\s*[.)]\s+/;

/**
 * An ornament: emoji, dingbats, arrows, variation selectors and the zero-width joiner.
 *
 * `\p{Extended_Pictographic}` is the correct property and is not the same as `\p{Emoji}` — the
 * latter also matches the ASCII digits and `#`, which would eat the first character of "30 g de
 * protéines". The explicit ranges beside it cover the dingbat block and the arrows, which are not
 * pictographic but are equally banned by DS010.
 *
 * ── THE CARVE-OUT, WHICH IS NOT OPTIONAL ───────────────────────────────────────────────────
 * `©` `®` `™` `℠` `℗` are all Extended_Pictographic, and this catalogue is full of them:
 * "NITRO-TECH®", "Gold Standard 100% Whey™", and a `<p>© …</p>` in any CMS page body. They are
 * legal marks, not decoration, and removing one from a brand name is a trademark problem before
 * it is a design problem. The lookahead excludes them everywhere the ornament pattern is used.
 */
const PRESERVED_MARKS = '\\u00A9\\u00AE\\u2122\\u2120\\u2117';
const ORNAMENT_ATOM =
  `(?![${PRESERVED_MARKS}])(?:\\p{Extended_Pictographic}|[\\u2190-\\u21FF\\u2600-\\u27BF\\u2B00-\\u2BFF\\uFE0F\\u200D\\u20E3])`;

const LEADING_ORNAMENT_RE = new RegExp(`^(?:\\s|${ORNAMENT_ATOM})+`, 'u');
const TRAILING_ORNAMENT_RE = new RegExp(`(?:\\s|${ORNAMENT_ATOM})+$`, 'u');
/** Standing alone between two real spaces — see stripStandaloneOrnaments. */
const STANDALONE_ORNAMENT_RE = new RegExp(`(\\s)(?:${ORNAMENT_ATOM})+(?=\\s)`, 'gu');

const BR_SPLIT_RE = /<br\s*\/?>/gi;
const HAS_BR_RE = /<br\s*\/?>/i;

/** True when a fragment has no visible text once tags and entity spaces are removed. */
function isBlank(fragment: string): boolean {
  return (
    fragment
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
      .replace(/[\s​-‍﻿]/g, '') === ''
  );
}

/**
 * Remove ornaments from the start and end of every heading and list item.
 *
 * ── THE TWO THINGS THIS HAS TO GET RIGHT, AND GOT WRONG FIRST ──────────────────────────────
 * `check-prose-normalise` caught both, on the one fixture with inline markup in it —
 * `<h3>⭐ <strong>Points</strong> forts</h3>`:
 *
 *   1. THE GUARD IS ABOUT THE BLOCK, NOT ABOUT A TEXT NODE. "Never empty a block" was applied to
 *      the FIRST text node, so `⭐ ` — a fragment that is entirely ornament — tripped the guard
 *      and was restored, leaving the star exactly where it started. The question is whether the
 *      block would lose all of its words, and that can only be asked of the whole block.
 *   2. STRIPPING MUST NOT EAT THE SPACE BEFORE THE NEXT TAG. Trimming the trailing text node
 *      turned `</strong> forts` into `</strong>forts`. So the trailing pass removes ornaments
 *      only, never surrounding whitespace it did not put there.
 *
 * Ornaments in the MIDDLE of a sentence are left alone. There an author may genuinely have meant
 * them, and this file does not rewrite prose — it removes decoration from the ends of a label.
 */
function stripBlockOrnaments(html: string): string {
  return html.replace(
    /(<(h2|h3|h4|h5|h6|li|dt|dd|p|td|th|figcaption)(?:\s[^>]*)?>)([\s\S]*?)(<\/\2\s*>)/gi,
    (match, open: string, _tag: string, inner: string, close: string) => {
      const visible = inner.replace(/<[^>]*>/g, '');
      // Would this leave a heading with no words in it? Then the ornament is carrying the whole
      // block — badly — and deleting it would leave an empty <h3> and a gap. Leave it alone.
      if (visible.replace(LEADING_ORNAMENT_RE, '').replace(TRAILING_ORNAMENT_RE, '').trim() === '') {
        return match;
      }

      // Leading: skip any opening tags, then strip the ornament prefix off the first text run.
      let next = inner.replace(
        /^((?:\s*<[^/][^>]*>\s*)*)([^<]*)/,
        (_m: string, tags: string, text: string) => tags + text.replace(LEADING_ORNAMENT_RE, '')
      );
      // Trailing: the last text run, before any closing tags.
      next = next.replace(
        /([^<>]*)((?:\s*<\/[^>]+>\s*)*)$/,
        (_m: string, text: string, tags: string) => text.replace(TRAILING_ORNAMENT_RE, '') + tags
      );
      return `${open}${next}${close}`;
    }
  );
}

/**
 * `<li><p>text</p></li>` → `<li>text</li>`.
 *
 * Only when the paragraph is the item's SOLE child. An item that genuinely holds two paragraphs
 * keeps them — that is a real structure, and flattening it would run two sentences together.
 */
function unwrapSoleParagraphInListItems(html: string): string {
  return html.replace(
    /(<li(?:\s[^>]*)?>)\s*<p(?:\s[^>]*)?>([\s\S]*?)<\/p\s*>\s*(<\/li\s*>)/gi,
    (match, open: string, inner: string, close: string) =>
      /<p[\s>]/i.test(inner) ? match : `${open}${inner.trim()}${close}`
  );
}

/** Drop paragraphs and headings that contain nothing but whitespace, `&nbsp;` or a `<br>`. */
function dropEmptyBlocks(html: string): string {
  return html
    .replace(/<(p|h2|h3|h4|h5|h6)(?:\s[^>]*)?>\s*(?:<br\s*\/?>|&nbsp;|&#160;|\s)*\s*<\/\1\s*>/gi, '')
    .replace(/(?:<br\s*\/?>\s*)+(?=<\/(?:p|li|td|th|h[2-6])\s*>)/gi, '');
}

/**
 * The main event: a `<p>` whose lines are hand-typed bullets becomes a real `<ul>` or `<ol>`.
 *
 * ── THE GUARD, WHICH IS THE WHOLE DESIGN ───────────────────────────────────────────────────
 * Splitting on `<br>` and converting is easy; converting the WRONG paragraph is the failure mode,
 * because it silently restructures copy a human wrote. So conversion requires all of:
 *
 *   · two or more non-blank lines (one "bullet" is a sentence with a dash);
 *   · every line after an optional unmarked FIRST line carries the same KIND of marker;
 *   · at least two marked lines.
 *
 * The optional unmarked first line is the common real shape — "Cette protéine est idéale pour :"
 * followed by the bullets — and it is emitted as its own `<p>` so the intro keeps its sentence and
 * the list keeps its semantics. Anything else is returned untouched.
 */
function paragraphBulletsToList(html: string): string {
  return html.replace(
    /<p(\s[^>]*)?>([\s\S]*?)<\/p\s*>/gi,
    (match, attrs: string | undefined, inner: string) => {
      if (!HAS_BR_RE.test(inner)) return match;

      const lines = inner
        .split(BR_SPLIT_RE)
        .map((l) => l.trim())
        .filter((l) => !isBlank(l));
      if (lines.length < 2) return match;

      /** Test the marker against the line's TEXT, so `<strong>• 30 g</strong>` still counts. */
      const markerOf = (line: string): 'ul' | 'ol' | null => {
        const text = line
          .replace(/^(?:<[^>]+>\s*)+/, '')
          .replace(/&bull;|&#8226;/gi, '•')
          .replace(/^&nbsp;|^&#160;/gi, '')
          .trimStart();
        if (BULLET_RE.test(text)) return 'ul';
        if (ORDERED_RE.test(text)) return 'ol';
        return null;
      };

      const markers = lines.map(markerOf);
      // An unmarked first line is allowed and becomes the intro paragraph.
      const introCount = markers[0] === null ? 1 : 0;
      const body = markers.slice(introCount);
      if (body.length < 2) return match;

      const kind = body[0];
      if (kind === null || body.some((m) => m !== kind)) return match;

      const strip = (line: string): string =>
        line
          .replace(/&bull;|&#8226;/gi, '•')
          .replace(/^((?:<[^>]+>\s*)*)/, (_m, tags: string) => tags)
          .replace(
            new RegExp(`^((?:<[^>]+>\\s*)*)(?:[${BULLET_CHARS}]\\s+|\\d{1,2}\\s*[.)]\\s+)`),
            '$1'
          )
          .trim();

      const items = lines
        .slice(introCount)
        .map((l) => `<li>${strip(l)}</li>`)
        .join('');
      const intro = introCount ? `<p${attrs ?? ''}>${lines[0]}</p>` : '';
      return `${intro}<${kind}>${items}</${kind}>`;
    }
  );
}

/**
 * An ornament standing ALONE between two spaces, anywhere in the copy.
 *
 * `<p>… booster leurs performances 💪 Grâce à sa formule …</p>` is real, live copy on this
 * catalogue. It is not structure and it is not punctuation — it is an emoji used as a full stop,
 * and DS010 bans emoji as UI whether it arrives from a className or from a database column.
 *
 * ── WHY "STANDING ALONE" IS THE WHOLE CONDITION ────────────────────────────────────────────
 * It cannot break a word, because it only matches an ornament run with REAL whitespace on both
 * sides — not the start or the end of the text run — and it puts one space back where it found
 * two. Anchoring to the ends as well looked equivalent and was not: it emptied a heading whose
 * only content was emoji, which the fixture for that case caught within a minute. The ENDS of a
 * block are stripBlockOrnaments' job, and that one carries the guard that refuses to leave a
 * heading with no words in it. An ornament glued to a word (`24h🚚`) is left
 * alone — that is a typo in the source, not a pattern, and guessing at it would be rewriting.
 *
 * Applied to TEXT NODES ONLY. Running it over raw HTML would let it reach inside an `alt=""` or a
 * `title=""`, which is somebody's actual sentence.
 */
function stripStandaloneOrnaments(html: string): string {
  return mapTextNodes(html, (text) =>
    text.replace(STANDALONE_ORNAMENT_RE, () => ' ')
  );
}

/**
 * Apply `fn` to every text run that sits OUTSIDE a tag.
 *
 * The split keeps the delimiters (the capture group in the pattern), so odd indices are tags and
 * even indices are text. Crude next to a real parser and exactly right here: this file's job is to
 * leave markup untouched, and the cheapest way to guarantee that is never to look inside `<…>`.
 */
function mapTextNodes(html: string, fn: (text: string) => string): string {
  return html
    .split(/(<[^>]*>)/g)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join('');
}

/**
 * Normalise typed formatting into markup. Idempotent — running it twice changes nothing, which
 * matters because `sanitizeProductHtml` is called on fields that are sometimes already clean.
 */
export function normalizeProse(html: string): string {
  if (!html) return '';
  let out = html;
  out = unwrapSoleParagraphInListItems(out);
  out = paragraphBulletsToList(out);
  out = stripBlockOrnaments(out);
  out = stripStandaloneOrnaments(out);
  out = dropEmptyBlocks(out);
  return out;
}
