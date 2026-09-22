/**
 * IN-CONTENT INTERNAL LINKS: turn the first mention of a category inside an article into a link.
 *
 * ── WHY THIS PARTICULAR LINK AND NOT ANOTHER ──────────────────────────────────────────────────
 * The site's own audit records the problem precisely: the blog OUTRANKS the pages that sell, on
 * their own head terms.
 *
 *     /blog/whey-protein-en-tunisie   position 11.2
 *     /proteines                      position 33.9
 *
 * That is not a content problem — Google already trusts the article. It is a plumbing problem: the
 * authority sits in the blog and there is no path from it to the page that takes the money. The blog
 * is 43,400 impressions a month, 38% of everything Google shows for this site.
 *
 * The article page already carries three kinds of link to the shop, and each is weaker than it
 * looks:
 *
 *   · BlogRecommendedProducts fetches on an IntersectionObserver, so its anchors are not in the
 *     HTML at all until something scrolls. Googlebot renders, but it does not scroll;
 *   · the "Catégories boutique liées" nav renders only when the CMS field is filled;
 *   · the taxonomy chips are empty, because /api/blog_categories and /api/blog_tags both return
 *     [] — 224 articles with no categories and no tags between them.
 *
 * An in-content link is the strongest of the four: it sits in the prose, its anchor text is the
 * writer's own words about the subject, and it is present in the initial HTML. This file makes that
 * link, and nothing else.
 *
 * ── THE RULES ARE WHAT KEEP IT FROM BECOMING SPAM ─────────────────────────────────────────────
 * Automatic interlinking earns a penalty when it is done without limits, so every limit here is
 * deliberate:
 *
 *   ONE link per destination      the second link to /proteines in the same article adds no signal
 *                                 and dilutes the anchor text of the first
 *   FIRST occurrence only         the earliest mention is the one in context
 *   A HARD CAP per article        default 6. An article stuffed with links to every category reads
 *                                 as a doorway page, which is the opposite of the goal
 *   NEVER inside an existing <a>  nested anchors are invalid HTML; browsers unnest them and the
 *                                 result is a link nobody chose
 *   NEVER inside a heading        a linked H2 breaks the document outline and looks generated
 *   NEVER inside code/pre/script  self-evident, and cheap to enforce
 *
 * ── AND WHY THE MATCHING IS FUSSIER THAN IT LOOKS ─────────────────────────────────────────────
 * The bodies are CMS HTML written by several people over two years. "Protéine", "proteine" and
 * "prot&eacute;ine" all appear, sometimes in the same article — decodeHtmlEntities in
 * ArticleDetailClient handles &nbsp; &amp; &lt; &gt; &quot; and the quote entities, and does not
 * touch &eacute;, so the named form survives into the DOM and a naive matcher misses every one of
 * them. Rather than decode first and shift every index, each accented letter is compiled into an
 * alternation that matches the bare letter, the accented letter and both entity spellings.
 */

export interface LinkTarget {
  /** Where the link points. Site-relative, e.g. "/proteines". */
  href: string;
  /**
   * Phrases that, when found in the prose, mean this page. Order is irrelevant — the compiler sorts
   * every phrase across every target by length, so "whey protéine" is always tried before "whey".
   */
  terms: string[];
}

export interface InjectOptions {
  /** Hard cap on links added to one article. */
  max?: number;
  /** Class applied to every injected anchor, so CSS and audits can both find them. */
  className?: string;
}

/** Elements whose text must never be linked. `a` first, because it is the one that matters. */
const SKIP_TAGS = new Set(['a', 'code', 'pre', 'script', 'style', 'button', 'textarea', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/**
 * Accented characters, mapped to every spelling the corpus actually contains.
 *
 * Only characters that occur in French supplement vocabulary are listed. An unlisted character is
 * escaped literally and simply matches itself, which is correct — it just will not also match its
 * unaccented twin.
 */
const CHAR_ALTERNATIVES: Record<string, string[]> = {
  a: ['a', 'à', 'â', 'ä', '&agrave;', '&acirc;', '&auml;'],
  c: ['c', 'ç', '&ccedil;'],
  e: ['e', 'é', 'è', 'ê', 'ë', '&eacute;', '&egrave;', '&ecirc;', '&euml;', '&#233;', '&#232;'],
  i: ['i', 'î', 'ï', '&icirc;', '&iuml;'],
  o: ['o', 'ô', 'ö', '&ocirc;', '&ouml;'],
  u: ['u', 'ù', 'û', 'ü', '&ugrave;', '&ucirc;', '&uuml;'],
  y: ['y', 'ÿ', '&yuml;'],
  n: ['n', 'ñ', '&ntilde;'],
};

/** Reverse index: any spelling of a letter resolves to its base, so terms may be written either way. */
const BASE_OF: Record<string, string> = {};
for (const [base, spellings] of Object.entries(CHAR_ALTERNATIVES)) {
  for (const s of spellings) if (s.length === 1) BASE_OF[s] = base;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whitespace as the CMS actually writes it between two words: space, entity, or hyphen. */
const GAP = '(?:\\s|&nbsp;|-|‑)+';

/**
 * Words that change what the term before them MEANS, and so must cancel the link.
 *
 * The boundary lookarounds in compileTerm already stop a term from being found inside a longer
 * word — "créatine" is not matched inside "créatinine" (a kidney marker) or "phosphocréatine",
 * which is the bug worth guarding first and which is guarded by construction. What they cannot
 * see is the word AFTER a complete, correctly-bounded match, and French has one case here that
 * matters: "créatine kinase" (CK, also written créatine phosphokinase) is a blood enzyme measured
 * in a lab, not a tub of powder. Linking it sends a reader researching a blood test to a shop
 * shelf, which is the definition of an irrelevant link.
 *
 * Keyed by the term with its accents stripped and case folded, so 'Créatine' — the category's own
 * name, whatever an editor renames it to in Filament — and 'créatine' resolve to the same entry.
 * A term with no entry compiles exactly as before, so this narrows nothing for any other category.
 */
const NOT_FOLLOWED_BY: Record<string, string[]> = {
  creatine: ['kinase', 'phosphokinase', 'kinases'],
};

const foldTerm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Compile one phrase into a pattern that matches every spelling of it.
 *
 * Whitespace in the phrase becomes `\s+`, because CMS HTML puts newlines and non-breaking spaces
 * between words as readily as it puts a space.
 */
function compileTerm(term: string): string {
  const chars = [...term.toLowerCase()];
  const parts = chars.map((ch) => {
    // A space in a search term also matches a hyphen (and non-breaking hyphen): supplement terms
    // are written both ways in the corpus — "oméga 3" / "oméga-3", "pre workout" / "pre-workout",
    // "mass gainer" / "mass-gainer" — so a space-spelled term must catch the hyphenated mention too.
    // Additive: it only widens what a multi-word term matches, never narrows it.
    if (/\s/.test(ch)) return GAP;
    const base = BASE_OF[ch] ?? ch;
    const alts = CHAR_ALTERNATIVES[base];
    if (!alts) return escapeRegex(ch);
    return `(?:${alts.map(escapeRegex).join('|')})`;
  });

  /*
   * Boundaries are hand-rolled rather than `\b`, and the reason is a real miss: `\b` is defined
   * against [A-Za-z0-9_], so in "les protéines" the `é` counts as a NON-word character and `\b`
   * matches happily in the middle of the word. A lookaround over an explicit letter class — one
   * that includes the accented forms and `&` for the entity spellings — is what actually stops
   * "créatine" from being found inside "créatinine".
   */
  const letter = '[\\p{L}\\p{M}\\p{N}&;#_]';

  /*
   * A disqualifying next word is checked AFTER the closing boundary, not inside the term, because
   * that is where the ambiguity lives: "créatine" is the right match and the right anchor in every
   * sentence except the one where "kinase" follows it.
   */
  const blocked = NOT_FOLLOWED_BY[foldTerm(term)] ?? [];
  const guard = blocked.length
    ? `(?!${GAP}(?:${blocked.map(escapeRegex).join('|')})(?!${letter}))`
    : '';

  // Trailing (?:s|es)? so a plural mention still matches its singular term, which is how these
  // words are actually written: "les protéines", "des créatines".
  return `(?<!${letter})${parts.join('')}(?:s|es)?(?!${letter})${guard}`;
}

interface CompiledTarget {
  href: string;
  regex: RegExp;
  /** Longest phrase this target compiled, used only to order targets against each other. */
  weight: number;
}

function compileTargets(targets: LinkTarget[]): CompiledTarget[] {
  const compiled: CompiledTarget[] = [];

  for (const t of targets) {
    const terms = [...new Set(t.terms.map((s) => s.trim()).filter((s) => s.length >= 4))]
      // Longest first WITHIN a target too, so the alternation prefers the most specific phrase.
      .sort((a, b) => b.length - a.length);
    if (terms.length === 0) continue;

    compiled.push({
      href: t.href,
      regex: new RegExp(`(${terms.map(compileTerm).join('|')})`, 'iu'),
      weight: terms[0].length,
    });
  }

  /*
   * Specific destinations get first refusal on the SAME words. "Whey protéine" and "protéine" both
   * start at the same offset in "la whey protéine"; linking the general category there would
   * consume the phrase that describes the specific one, and the specific page is the better landing
   * page for the reader. This order is the tie-break injectInternalLinks applies at equal offsets —
   * which mention comes first in the prose decides everything else.
   */
  return compiled.sort((a, b) => b.weight - a.weight);
}

/**
 * Add at most `max` in-content links to `html`, one per target, at each target's first mention.
 *
 * Pure and idempotent-ish: running it twice adds nothing the second time, because the text it would
 * have matched is by then inside an <a>, which is skipped.
 */
export function injectInternalLinks(
  html: string,
  targets: LinkTarget[],
  options: InjectOptions = {}
): string {
  const max = options.max ?? 6;
  const className = options.className ?? 'article-inline-link';

  if (!html || targets.length === 0 || max <= 0) return html;

  const compiled = compileTargets(targets);
  if (compiled.length === 0) return html;

  /*
   * Split on tags, keeping them: odd indices are markup, even indices are text. This is not a
   * general HTML parser and does not need to be — the only question asked of the markup is "which
   * element am I inside", which tag names answer on their own. Attribute values containing ">" would
   * confuse it; CMS bodies here do not contain any, and the failure mode if one appeared is a link
   * not being placed, never a broken document.
   */
  const tokens = html.split(/(<[^>]*>)/);

  const used = new Set<string>();
  let placed = 0;
  let skipDepth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;

    if (token.startsWith('<')) {
      const m = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(token);
      if (!m) continue;
      const closing = m[1] === '/';
      const tag = m[2].toLowerCase();
      if (!SKIP_TAGS.has(tag)) continue;
      // Self-closing never opens a region. None of SKIP_TAGS is void, so this is belt and braces.
      if (token.endsWith('/>')) continue;
      if (closing) skipDepth = Math.max(0, skipDepth - 1);
      else skipDepth++;
      continue;
    }

    if (skipDepth > 0 || placed >= max) continue;
    if (!/\p{L}/u.test(token)) continue;

    let text = token;

    /*
     * `cursor` is what makes several links per text node safe.
     *
     * The obvious implementation — insert, then `break` out of this node — was the first one here,
     * and it is wrong in a way the synthetic tests missed and the idempotence test caught: a CMS
     * body is not a tidy tree of short nodes. A whole paragraph mentioning protéine, whey and
     * créatine is very often ONE text node, so "one insertion per node" quietly capped a long
     * article at two or three links regardless of `max`.
     *
     * Scanning only `text.slice(cursor)` fixes that without reintroducing the hazard the `break`
     * was there for. Everything before the cursor contains the anchors already inserted, and no
     * later match can be found inside them because no later match is ever LOOKED for inside them.
     * Nesting is therefore impossible by construction rather than by care.
     */
    /*
     * Targets are taken in DOCUMENT order, not in target-weight order.
     *
     * Weight order was the first implementation and it loses links: `cursor` only moves forward, so
     * a heavy target whose mention sits LATE in the paragraph dragged the cursor past every earlier
     * mention, and the lighter targets that owned those mentions then found nothing. One paragraph
     * saying "la whey est une protéine rapide, la whey isolate encore plus" produced a single link,
     * to the isolate page, and lost both the whey and the protéine link that preceded it.
     *
     * Weight still breaks ties — `<` keeps the first target found at a given offset, and `compiled`
     * is sorted longest-phrase-first — so a specific destination still gets first refusal on the
     * same words: "whey protéine" beats "protéine" where both start at that offset.
     */
    let cursor = 0;
    while (placed < max) {
      let best: { target: CompiledTarget; index: number; matched: string } | null = null;

      for (const target of compiled) {
        if (used.has(target.href)) continue;
        const match = target.regex.exec(text.slice(cursor));
        if (!match) continue;
        if (!best || match.index < best.index) {
          best = { target, index: match.index, matched: match[0] };
        }
      }

      if (!best) break;

      const at = cursor + best.index;
      // The matched prose IS the anchor text. Rewriting it to "protéines en Tunisie" would be
      // keyword-stuffing a sentence somebody else wrote, and it would read as generated.
      const anchor = `<a href="${best.target.href}" class="${className}">${best.matched}</a>`;
      text = text.slice(0, at) + anchor + text.slice(at + best.matched.length);
      cursor = at + anchor.length;

      used.add(best.target.href);
      placed++;
    }
    tokens[i] = text;
  }

  return tokens.join('');
}

/**
 * Build link targets from the shop taxonomy.
 *
 * The terms are the category's own name, so this needs no hand-maintained keyword table that would
 * drift as categories are renamed. `extra` carries the synonyms a name cannot supply — "whey" for
 * Whey Protéine, "créatine monohydrate" for Créatine — keyed by slug.
 *
 * The current page is excluded by the caller, not here: a page must never link to itself.
 *
 * `options.allowSlugs` narrows the taxonomy to the destinations worth spending the per-article link
 * budget on. Without it, every lifestyle hub joins in and the widest, vaguest names win the budget:
 * "SANTÉ & VITALITÉ", "Glucides & Énergie" and "Sommeil & Stress" contributed the terms "santé",
 * "énergie" and "stress", so four of an article's six slots went to words that say nothing about
 * their destination ("énergie" in a créatine sentence pointed at a carbohydrate category) and the
 * pages that sell were left with the bare-word anchor or none at all (measured live 22/09/2026).
 * Omit it and nothing is filtered, which is what the test harness and any other caller rely on.
 */
export function targetsFromTaxonomy(
  categories: Array<{ slug?: string | null; designation_fr?: string | null; sous_categories?: Array<{ slug?: string | null; designation_fr?: string | null }> | null }>,
  extra: Record<string, string[]> = {},
  options: { allowSlugs?: readonly string[] } = {}
): LinkTarget[] {
  const targets: LinkTarget[] = [];
  const allow = options.allowSlugs ? new Set(options.allowSlugs) : null;

  const push = (slug?: string | null, name?: string | null) => {
    if (!slug || !name) return;
    if (allow && !allow.has(slug)) return;
    const clean = name.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const terms = [clean, ...(extra[slug] ?? [])];
    // "&" reads as two words to the matcher and never appears that way in prose. A name like
    // "Barres & Snacks Protéinés" contributes its halves instead, which are what an article
    // actually says — but only the halves long enough to still name the destination: a 6-letter
    // half like "Barres" matches prose that is not about the category at all.
    if (clean.includes('&')) {
      terms.push(...clean.split('&').map((s) => s.trim()).filter((s) => s.length >= 8));
    }
    targets.push({ href: `/${slug}`, terms });
  };

  for (const cat of categories ?? []) {
    push(cat?.slug, cat?.designation_fr);
    for (const sub of cat?.sous_categories ?? []) push(sub?.slug, sub?.designation_fr);
  }

  return targets;
}
