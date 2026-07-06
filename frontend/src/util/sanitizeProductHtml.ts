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

  // Collapse the resulting empty wrappers and excess whitespace.
  out = out
    .replace(/<div>\s*<\/div>/gi, '')
    .replace(/(\r?\n){3,}/g, '\n\n')
    .trim();

  return out;
}

/** Plain-text version (tags stripped) capped at maxLen — for meta descriptions / previews. */
export function htmlToText(html: string | null | undefined, maxLen = 300): string {
  const cleaned = sanitizeProductHtml(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen).trim()}…` : cleaned;
}
