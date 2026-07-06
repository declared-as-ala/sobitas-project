/**
 * Blog slug safety.
 *
 * Some blog articles were saved with their raw title as the slug — including Arabic text,
 * spaces, colons and newlines (e.g. "أفضل مكملات البروتين في تونس: كيف تختار المنتج").
 * When those slugs are interpolated into an href verbatim, the browser/crawler sees an
 * invalid URL with literal spaces, which Google records as broken, percent-encoded
 * "mojibake" URLs in Search Console.
 *
 * The real fix is backend-side (generate a clean transliterated slug on save). Until then,
 * every place that links to `/blog/{slug}` MUST run the slug through `blogHref()` so the
 * path segment is properly percent-encoded and internal whitespace is collapsed.
 */

/** Percent-encode a blog slug for use as a single URL path segment. */
export function encodeBlogSlug(slug: string): string {
  const cleaned = (slug ?? '')
    .replace(/[\r\n\t]+/g, ' ') // kill hard line breaks that leaked into slugs
    .replace(/\s+/g, ' ')
    .trim();
  try {
    // decode-then-encode guards against double-encoding already-encoded slugs
    return encodeURIComponent(decodeURIComponent(cleaned));
  } catch {
    return encodeURIComponent(cleaned);
  }
}

/** Build a safe, fully-encoded href for a blog article. */
export function blogHref(slug: string | null | undefined): string {
  return `/blog/${encodeBlogSlug(slug ?? '')}`;
}
