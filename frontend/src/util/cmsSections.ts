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

  let cleaned = body
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

  /*
   * ── A DINGBAT USED AS A BULLET BECOMES A REAL BULLET ───────────────────────────────────────
   * The live body writes its lists as one <p> of lines joined by <br>, each line opening with a
   * `✅`:
   *
   *     <p>✅ Qualité et authenticité – …<br>✅ Sécurité – …<br>✅ Service client – …</p>
   *
   * Eight of them, one orphaned on a line of its own. Three things are wrong with that and only
   * the first is visible: the repo bans emoji in UI text (DS010) and the CMS has no such guard; a
   * <br>-separated paragraph is not a list, so a screen reader announces no item count and Google
   * sees one blob; and a check mark rendered in the reader's emoji font is the one glyph on the
   * page whose colour and weight the design system does not control.
   *
   * Converting rather than deleting: the author's intent — "these are items" — is correct and
   * worth keeping. The markup they had available was not.
   *
   * Scoped to a paragraph that OPENS with the marker, so a stray dingbat mid-sentence is left
   * alone rather than silently restructuring somebody's prose. The class hands styling back to
   * `.pt-prose` where the rest of the body's lists already live.
   */
  cleaned = cleaned.replace(
    /<p>\s*(?:✅|✔️?|☑️?|•|●|▪️?)\s*([\s\S]*?)<\/p>/gi,
    (_match, inner: string) => {
      const items = String(inner)
        .split(/<br\s*\/?>/i)
        .map((line) => line.replace(/^\s*(?:✅|✔️?|☑️?|•|●|▪️?)\s*/, '').trim())
        // The orphaned marker in the live body produces an empty item; an empty <li> is a bullet
        // pointing at nothing.
        .filter((line) => line.length > 0 && line.replace(/<[^>]+>/g, '').trim().length > 0);
      if (items.length === 0) return '';
      return `<ul class="pt-cms-list">${items.map((li) => `<li>${li}</li>`).join('')}</ul>`;
    }
  );

  /*
   * CUT AT THE HIGHEST HEADING LEVEL PRESENT, not at "h2 or h3, whichever we meet".
   *
   * The original split on `<h([23])>` because the CMS body was written entirely in <h3> and
   * looking for <h2> alone had matched nothing — every paragraph fell into one bucket, which is
   * the wall of boxed text the owner screenshotted.
   *
   * That fix breaks the moment a body uses BOTH levels properly, which the repo-authored body now
   * does: <h2> for sections, <h3> for what sits under them. Splitting on either would promote
   * every sub-heading to a top-level section and put it in the table of contents, so a six-section
   * page would show nine entries, three of which are not sections.
   *
   * So: if the body contains any <h2>, cut on <h2> and let <h3> ride inside the section it belongs
   * to. Otherwise fall back to <h3> and keep the CMS body working exactly as before.
   */
  const level = /<h2[^>]*>/i.test(cleaned) ? '2' : '3';
  const parts = cleaned.split(new RegExp(`<h(${level})[^>]*>([\\s\\S]*?)</h\\1>`, 'i'));

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
