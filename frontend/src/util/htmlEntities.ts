/**
 * Server-safe HTML entity decoder (no DOM dependency), for use in metadata, JSON-LD, and SSR
 * where `document`/`textarea`-based decoding isn't available. Covers the common named entities
 * (esp. French accents) plus numeric decimal/hex references. Backend `designation_fr`/titles
 * frequently arrive as e.g. "Whey &amp; Cr&eacute;atine" — decode before emitting into structured
 * data or <title>, otherwise Google (and users) see the literal entities.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  // French accents (lower + upper)
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
  agrave: 'à', acirc: 'â', aacute: 'á', auml: 'ä', atilde: 'ã', aring: 'å',
  ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü',
  igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
  ograve: 'ò', oacute: 'ó', ocirc: 'ô', ouml: 'ö', otilde: 'õ',
  ccedil: 'ç', ntilde: 'ñ',
  Eacute: 'É', Egrave: 'È', Ecirc: 'Ê',
  Agrave: 'À', Acirc: 'Â', Ccedil: 'Ç', Ocirc: 'Ô', Ucirc: 'Û', Icirc: 'Î',
  // punctuation / symbols
  laquo: '«', raquo: '»', hellip: '…', middot: '·', bull: '•',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  ndash: '–', mdash: '—', deg: '°', euro: '€', copy: '©', reg: '®', trade: '™',
};

function safeFromCodePoint(cp: number): string {
  try {
    return Number.isFinite(cp) && cp > 0 ? String.fromCodePoint(cp) : '';
  } catch {
    return '';
  }
}

/**
 * Drop headings that contain no text.
 *
 * Two blog articles ship an empty `<h1></h1>` inside their CMS body, so the rendered page has TWO
 * h1 elements: the real article title from the template, plus an empty one. An empty heading says
 * nothing to a reader or a screen reader, and a second h1 splits the page's topical signal for no
 * gain. Whitespace, &nbsp; and empty inline wrappers (<span>, <strong>, <br>) all count as empty.
 */
export function stripEmptyHeadings(html: string | null | undefined): string {
  if (!html) return '';
  return String(html).replace(
    /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (whole, _tag: string, inner: string) => {
      const text = inner
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
        .replace(/\s+/g, '')
        .trim();
      return text === '' ? '' : whole;
    },
  );
}

/** Decode HTML entities to plain Unicode text. Returns '' for null/undefined. */
export function decodeHtmlEntities(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name: string) =>
      Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : m,
    );
}
