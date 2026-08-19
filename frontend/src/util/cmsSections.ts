/**
 * Split a CMS body into an intro plus one block per heading — ON THE SERVER.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────
 * The About page used to do this with `DOMParser`, which is browser-only, so the whole thing was
 * gated behind a `mounted` flag: the server and the first client render fell through to a raw
 * `dangerouslySetInnerHTML` dump, and the structured layout appeared only after hydration. Two
 * costs, both real:
 *
 *   1. Google reads the SSR HTML. The version it read was the unstructured dump, so the page's
 *      own section headings were the only structure it ever saw — while the visible page showed
 *      something else entirely.
 *   2. The layout changed shape after hydration, on the page's largest block of content.
 *
 * And it looked for `<h2>`. The live body is written with `<h3>` (verified against
 * https://admin.protein.tn/api/page/qui-sommes-nous, 19/08/2026), so it matched nothing and every
 * paragraph fell into one bucket — which is exactly the wall of boxed text the owner screenshotted.
 * The enhanced layout had never rendered, for anyone, since it was written.
 *
 * A regex is the right tool here precisely because it is not a parser: it must run identically on
 * the server and in the browser, it operates on a trusted, admin-authored field, and it does not
 * need to understand the HTML — only to cut it at the headings. The fragments are re-inserted with
 * `dangerouslySetInnerHTML` exactly as they were, so nothing is re-serialised or "fixed".
 */

export interface CmsSection {
  /** Slug for the in-page anchor and the table of contents. */
  id: string;
  /** Heading text, tags stripped. */
  title: string;
  /** The HTML that followed the heading, up to the next one. */
  html: string;
}

export interface SplitCmsBody {
  /** Everything before the first heading — usually the lead paragraph. */
  intro: string;
  sections: CmsSection[];
}

const ENTITIES: Array<[RegExp, string]> = [
  [/&nbsp;/g, ' '],
  [/&amp;/g, '&'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&quot;/g, '"'],
  [/&#0?39;/g, '’'],
  [/&rsquo;/g, '’'],
];

function toText(html: string): string {
  let out = html.replace(/<[^>]+>/g, '');
  for (const [re, to] of ENTITIES) out = out.replace(re, to);
  return out.replace(/\s+/g, ' ').trim();
}

/** Accent-folded, punctuation-stripped slug — stable enough to be an anchor target. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    // `\p{Diacritic}` rather than the U+0300–U+036F range: the range has to be written with the
    // literal combining characters, which are invisible in an editor and turn into a silent no-op
    // if the file is ever saved in the wrong encoding. This says the same thing in ASCII.
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function splitCmsBody(body: string | null | undefined): SplitCmsBody {
  if (!body) return { intro: '', sections: [] };

  const cleaned = body
    /* The rules are the CMS author's way of separating sections. Once each section is its own
       block with its own heading, they are a second separator doing the same job — and they are
       what made the original render read as a stack of receipts. */
    .replace(/<hr\s*\/?>/gi, '')
    /*
     * IMAGES ARE DROPPED FROM THE PROSE, and this is a decision worth knowing about.
     *
     * The live body carries exactly one <img>, a storefront photo, and its src
     * (admin.protein.tn/storage/JGMNhqBvqNdmLow2cOE5hBt56UYbLNrj5KpNCfv9.webp) returns 404 —
     * verified 19/08/2026. So the page has been rendering a broken image and its alt text as a
     * paragraph of stray words, which is visible in the owner's own screenshot.
     *
     * Stripping is the smaller of two wrongs rather than a preference: a photograph of the shop
     * is a genuinely valuable thing on this page, but it belongs in a deliberate slot with a
     * chosen aspect ratio and a caption, not inline in the middle of SEO prose at whatever size
     * the editor pasted it. When a working photo exists, wire it into the hero — do not undo
     * this line.
     */
    .replace(/<img[^>]*>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '');

  /* Capture groups are included in the result, so the array is
     [intro, level, heading, body, level, heading, body, …]. The backreference keeps <h3> from
     being closed by a </h2>. */
  const parts = cleaned.split(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/i);

  const intro = (parts[0] || '').trim();
  const sections: CmsSection[] = [];
  const seen = new Set<string>();

  for (let i = 1; i + 2 <= parts.length - 1; i += 3) {
    const title = toText(parts[i + 1] || '');
    const html = (parts[i + 2] || '').trim();
    if (!title) continue;
    let id = slugify(title) || `section-${sections.length + 1}`;
    // Two identical headings would produce two identical anchors, and every ToC link would jump
    // to the first of them.
    while (seen.has(id)) id = `${id}-${sections.length + 1}`;
    seen.add(id);
    sections.push({ id, title, html });
  }

  return { intro, sections };
}
