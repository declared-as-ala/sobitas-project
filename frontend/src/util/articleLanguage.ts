import type { Article } from '@/types';

/**
 * Language of a blog article, from the CMS field when set and detected from the text when not.
 *
 * 31 of the 100 blog articles are written in Arabic — titles, slugs and bodies — and every one was
 * being served as French: `<html lang="fr">`, JSON-LD `inLanguage: "fr-TN"`, no `dir="rtl"`, no
 * `og:locale`. Declaring the wrong language on a third of the blog tells Google to evaluate Arabic
 * prose against French queries, and leaves RTL text laid out LTR for readers and screen readers.
 *
 * The CMS has a `content_lang` column for exactly this, but it is NULL on every article checked —
 * so the existing dir/lang logic in ArticleDetailClient could never fire. Detection fills the gap
 * without waiting for 31 rows to be edited by hand, and an explicit `content_lang` always wins so
 * the admin keeps the final say.
 *
 * Deliberately narrow: this distinguishes Arabic script from Latin script, which is the only
 * distinction this catalogue actually needs. It is not a general-purpose language identifier.
 */

/** Arabic block + Arabic Supplement + Arabic Extended-A + Arabic Presentation Forms. */
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;
const LATIN_RE = /[A-Za-zÀ-ÿ]/g;

export type ArticleLanguage = {
  /** BCP-47 tag for lang / inLanguage, e.g. "ar" or "fr-TN". */
  code: string;
  /** Writing direction for the rendered body. */
  dir: 'ltr' | 'rtl';
  /** Open Graph locale, e.g. "ar_TN" or "fr_TN". */
  ogLocale: string;
};

const FRENCH: ArticleLanguage = { code: 'fr-TN', dir: 'ltr', ogLocale: 'fr_TN' };
const ARABIC: ArticleLanguage = { code: 'ar', dir: 'rtl', ogLocale: 'ar_TN' };

function fromCode(raw: string): ArticleLanguage | null {
  const code = raw.trim().toLowerCase();
  if (!code) return null;
  if (code.startsWith('ar')) return { ...ARABIC, code: raw.trim() };
  if (code.startsWith('fr')) return { ...FRENCH, code: raw.trim() };
  // A configured language we do not have direction rules for: trust the code, assume LTR.
  return { code: raw.trim(), dir: 'ltr', ogLocale: raw.trim().replace('-', '_') };
}

/**
 * Detect from the visible text. Compares Arabic to Latin letter counts rather than looking for
 * "any Arabic character", because these articles routinely embed French product names
 * ("Whey hedhi من أحسن ما جربت") and a single Arabic word must not flip a French article.
 */
function detect(...samples: Array<string | null | undefined>): ArticleLanguage {
  const text = samples
    .map((s) => String(s ?? ''))
    .join(' ')
    .replace(/<[^>]*>/g, ' ');

  const arabic = (text.match(ARABIC_RE) ?? []).length;
  const latin = (text.match(LATIN_RE) ?? []).length;

  // Require a clear majority so mixed text stays French, which is the site default.
  return arabic > latin ? ARABIC : FRENCH;
}

export function resolveArticleLanguage(article: Article | null | undefined): ArticleLanguage {
  const explicit = fromCode(String(article?.content_lang ?? ''));
  if (explicit) return explicit;

  return detect(
    article?.designation_fr,
    (article as { description_fr?: string } | null | undefined)?.description_fr,
    article?.slug
  );
}

/**
 * THE BRAND SUFFIX, IN THE SCRIPT THE READER IS SEARCHING IN.
 *
 * ── WHAT THE ARABIC ARTICLES ACTUALLY EARN ───────────────────────────────────────────────────
 * They are the best-ranked pages on this property and the worst-performing, by a distance:
 *
 *     5,834 impressions   position  7.9   CTR 0.29%    ما هي الأطعمة التي تحتوي على الكرياتين؟
 *     1,437 impressions   position 10.8   CTR 0.49%    ما هي فوائد وأضرار الكرياتين؟
 *     1,252 impressions   position  9.1   CTR 0.32%    ما هي المكملات الغذائية؟
 *       938 impressions   position 11.6   CTR 0.21%    ما هو الكرياتين؟
 *       907 impressions   position  7.1   CTR 0.44%    أفضل وقت لتناول البروتين
 *
 * Position 8 on a normal SERP earns 3–6%. These earn a third of one percent. Ranking is not the
 * problem — being shown and skipped is, and that is decided entirely by the one line Google prints.
 *
 * ── WHY THE LINE READS BADLY ─────────────────────────────────────────────────────────────────
 * The root layout appends `%s | Protéine Tunisie` to every title on the site. Applied to an Arabic
 * headline it produces a bidirectional string, and the Unicode bidi algorithm reorders it for
 * display in an RTL context: the Latin run moves to the visual START. An Arabic searcher does not
 * see "<Arabic headline> | Protéine Tunisie" — they see the French brand first, then the pipe, then
 * the Arabic they actually searched for. The result reads as a French page in an Arabic result set.
 *
 * The Arabic name for the brand already exists in the codebase — i18n/legacy-ar.ts maps
 * 'Protéine Tunisie' to 'بروتين تونس' — it had simply never reached a <title>.
 *
 * A separator matters too: the pipe is a neutral character, so its placement is decided by the
 * runs on either side of it. An en dash between two Arabic runs is unambiguous.
 */
export const AR_BRAND_SUFFIX = 'بروتين تونس';

/** True when the article should be titled and described in Arabic rather than French. */
export function isArabicArticle(lang: ArticleLanguage): boolean {
  return lang.dir === 'rtl';
}

/**
 * The full <title> for an article, brand included, ready to be emitted as `title.absolute`.
 *
 * It must be `absolute` for Arabic: returning a bare string lets the root template append the
 * French suffix again, which is the exact defect this exists to remove.
 */
/**
 * What Google prints, near enough: it renders roughly 60 characters of a <title> and cuts the rest.
 *
 * A suffix that does not fit is not neutral — it is 19 characters of the reader's attention spent
 * on a word they already know, and it pushes the part they searched for off the end. Measured by
 * scripts/check-serp-titles.mjs on 15/08/2026:
 *
 *     /blog/whey-protein-en-tunisie   83 chars
 *     "PROTÉINE en Tunisie : Guide Achat 2026, Prix & Performance Santé | Protéine Tunisie"
 *
 * The stored title is 64 and already over budget; the template took it to 83. Dropping a suffix
 * Google was going to cut anyway costs nothing and buys back the whole headline.
 */
const TITLE_BUDGET = 60;

export function buildArticleTitle(headline: string, lang: ArticleLanguage): string {
  const clean = String(headline ?? '').trim();
  const arabic = isArabicArticle(lang);
  const suffix = arabic ? ` — ${AR_BRAND_SUFFIX}` : ' | Protéine Tunisie';
  const alreadyBranded = arabic
    ? clean.includes(AR_BRAND_SUFFIX)
    : /prot[ée]ine\s+tunisie|protein\.tn/i.test(clean);

  if (alreadyBranded) return clean;
  // Append only when the whole thing still fits. Otherwise the headline IS the title.
  if (clean.length + suffix.length > TITLE_BUDGET) return clean;
  return clean + suffix;
}

/**
 * The "and this is in Tunisia" reinforcement appended to a meta description that lacks it.
 *
 * The French version was appended UNCONDITIONALLY to Arabic articles, because the test asked
 * whether the description contained the Latin string "Tunisie" — which an Arabic description never
 * does. So every Arabic snippet was carrying a French sentence, in an RTL context, in the last
 * forty-five characters of the space Google gives it. `تونس` is the same claim in the same script.
 */
export function localityHint(description: string, lang: ArticleLanguage): string {
  const text = String(description ?? '').trim();
  if (isArabicArticle(lang)) {
    return /تونس/.test(text) ? text : `${text} نصائح التغذية الرياضية في تونس — ${AR_BRAND_SUFFIX}.`;
  }
  return text.includes('Tunisie')
    ? text
    : `${text} Conseils nutrition sportive Tunisie — Protéine Tunisie.`;
}
