/**
 * Remove document-head tags from CMS-authored body HTML.
 *
 * Some CMS bodies were pasted from a "self-contained" HTML export that carries its own head block in
 * a hidden div — measured on /creatine-monohydrate-tunisie 28/09/2026:
 *
 *     <div style="display:none;">
 *       <meta name="description" content="Créatine Monohydrate en Tunisie : guide expert 2026, … prix TND">
 *       <meta property="og:title" content="Créatine Monohydrate Tunisie | Guide Santé & Performance 2026">
 *
 * Rendered into the page, that is a SECOND meta description and a second og:title next to the ones
 * generateMetadata emits — and the pasted pair still sold the /creatine category's query after the
 * page's own description had been made informational. A body never owns the page's head: the route
 * does. So these tags are dropped wherever a CMS body is rendered, on both the shopper and crawler
 * views (they share the renderer).
 *
 * Only void/self-contained head tags are removed; visible content is never touched. JSON-LD blocks
 * are left alone — an author's structured data is a separate decision from a duplicated head.
 */
export function stripHeadOnlyTags(html: string): string {
  if (!html) return html;
  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<(?:meta|link|base)\b[^>]*>/gi, '');
}
