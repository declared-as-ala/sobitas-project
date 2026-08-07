/**
 * Sanitise product HTML before it reaches `dangerouslySetInnerHTML`.
 *
 * ── WHY THIS APPEARS NOW ──────────────────────────────────────────────────────────────────
 * `sanitizeProductHtml` says in its own docblock that it is NOT an XSS sanitizer — it strips
 * chat-export cruft and nothing else. That was defensible while every author was a trusted admin
 * typing into Filament. It stops being defensible the moment the enrichment pipeline writes into
 * these same columns: `nutrition_values` is now generated from a transcribed label, and web-sourced
 * facts are queued behind it. The trust boundary moved, so the sanitiser has to exist.
 *
 * The two steps do different jobs and both are needed:
 *   1. sanitizeProductHtml — NORMALISES. Unwraps chat-export divs, demotes stray <h1>s so the page
 *      keeps one top-level heading, collapses whitespace.
 *   2. DOMPurify — SECURES. Removes anything outside the allow-list below, including event handlers,
 *      <script>, <style>, javascript: URLs and data: URLs, whatever shape they arrive in.
 *
 * Order matters: normalise first so DOMPurify sees the markup that will actually render.
 *
 * ── THE ALLOW-LIST IS THE PRODUCT PAGE, NOT THE WEB ────────────────────────────────────────
 * Tags are listed because product copy uses them: tables for Supplement Facts, <dl> for the serving
 * block, <blockquote> for allergen statements quoted verbatim, <sup> for the panel's footnote marks.
 * Anything absent is dropped rather than escaped, so an unexpected tag degrades to its text content
 * instead of appearing as literal angle brackets on the page.
 */
import DOMPurify from 'isomorphic-dompurify';
import { sanitizeProductHtml } from './sanitizeProductHtml';

const ALLOWED_TAGS = [
  // Block structure
  'p', 'div', 'section', 'article', 'br', 'hr',
  'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'dl', 'dt', 'dd',
  'blockquote', 'figure', 'figcaption',
  // Tables — the Supplement Facts panel is one
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Inline
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sup', 'sub', 'span', 'a', 'abbr', 'time', 'mark',
  // Media the CMS legitimately embeds
  'img',
];

/**
 * `style` is deliberately absent.
 *
 * DOMPurify does not parse CSS: with `style` allowed, `style="background:url(javascript:alert(1))"`
 * comes through the sanitiser verbatim — measured, not assumed. Current browsers refuse to execute
 * that particular payload, so this is a latent hole rather than a live one, but "the browser will
 * probably save us" is not a security boundary. Presentation belongs in the stylesheet, which is why
 * the Supplement Facts panel expresses row nesting as `nf-depth-N` classes instead of inline padding.
 */
const ALLOWED_ATTR = [
  'class', 'lang', 'dir', 'title',
  'href', 'rel', 'target',
  'src', 'alt', 'width', 'height', 'loading', 'decoding',
  'scope', 'colspan', 'rowspan', 'headers', 'abbr',
  'datetime', 'id',
];

/**
 * `<iframe>` is deliberately NOT in ALLOWED_TAGS.
 *
 * Official brand videos are a planned feature, and the safe way to ship them is a known video id
 * rendered by our own component — not an arbitrary iframe smuggled through a description field from
 * whatever source wrote it. Allowing the tag here would let any writable column mount third-party
 * script-bearing content on a page that also takes payment.
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  // Block javascript:, vbscript: and data: URLs while keeping ordinary links and images.
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  // Drop the element but keep its text, so an unexpected tag loses its markup rather than its words.
  KEEP_CONTENT: true,
  // Forbid the two attribute families that turn markup into behaviour, belt-and-braces on top of
  // the allow-list above.
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'formaction', 'srcdoc'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'base'],
};

/**
 * Normalise, then sanitise. Use this for every product-owned HTML column.
 *
 * Returns '' for null/undefined/empty so callers can keep using a plain truthiness check to decide
 * whether to render the section at all.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return '';

  const normalised = sanitizeProductHtml(html);
  if (!normalised) return '';

  return DOMPurify.sanitize(normalised, SANITIZE_CONFIG);
}
